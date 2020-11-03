#!/usr/bin/env python3

import argparse
import collections
import datetime
import hashlib
import io
import json
import logging
import os
import pickle
import re
import secrets
import shutil
import uuid

from dateutil import parser as dt_parser
from googleapiclient.discovery import build, Resource
from googleapiclient.http import MediaIoBaseDownload
from google_auth_oauthlib.flow import InstalledAppFlow
from google.auth.transport.requests import Request
from google.oauth2 import service_account

from s3_mongo_helper import initialize_s3, initialize_mongo, upload_to_s3

# If modifying these scopes, delete the file token.pickle.
SCOPES = ('https://www.googleapis.com/auth/drive.readonly',)
SCRAPER_SALT = os.environ.get('SCRAPER_SALT', '')

ACTION_HEADER = re.compile(r"(?P<dt>[0-9]+/[0-9]+/[0-9]+, [0-9]+:[0-9]+ (am|pm)) - (?P<pn>\+?[0-9 ]+) .*?$")
MESSAGE_HEADER = re.compile(r"(?P<dt>[0-9]+/[0-9]+/[0-9]+, [0-9]+:[0-9]+ (am|pm)) - (?P<pn>\+?[0-9 ]+): (?P<tail>.*?)$")
FILE_ATTACHED_RE = re.compile(r"(?P<fn>.*?) \(file attached\)$")
GDRIVE_RE = re.compile(r"(?:https://|)drive\.google\.com/.*?/folders/(?P<drive_id>[a-zA-Z0-9-]+)")

# Silence unneccesary google api warnings
# https://github.com/googleapis/google-api-python-client/issues/299
logging.getLogger('googleapiclient.discovery_cache').setLevel(logging.ERROR)


def get_gdrive_service(creds_path: str) -> Resource:
    """
    Get the google drive service client (aka the 'Resource')

    Primarily copied from Google Drive tutorial:
    https://developers.google.com/drive/api/v3/quickstart/python
    """

    assert os.path.exists(creds_path)
    with open(creds_path) as f:
        jobj = json.loads(f.read())
        is_service_account = jobj.get('type') == 'service_account'

    if is_service_account:
        creds = service_account.Credentials.from_service_account_file(
            creds_path, scopes=SCOPES)
        return build('drive', 'v3', credentials=creds)

    creds = None
    if os.path.exists('token.pickle'):
        with open('token.pickle', 'rb') as token:
            creds = pickle.load(token)

    # If there are no (valid) credentials available, let the user log in.
    if not creds or not creds.valid:
        if creds and creds.expired and creds.refresh_token:
            creds.refresh(Request())
        else:
            logging.info("Logging in via oauth")
            flow = InstalledAppFlow.from_client_secrets_file(
                'credentials.json', SCOPES)
            creds = flow.run_local_server(port=0)
        # Save the credentials for the next run
        with open('token.pickle', 'wb') as token:
            pickle.dump(creds, token)

    return build('drive', 'v3', credentials=creds)


def get_files_from_drive(drive_id: str, gdrive_service: Resource) -> list:
    """

    """

    files = []
    page_token = None
    while True:
        try:
            param = {'q': f'"{drive_id}" in parents'}
            if page_token:
                param['pageToken'] = page_token
            gdrive_resp = gdrive_service.files().list(**param).execute()
            files += gdrive_resp['files']
            page_token = gdrive_resp.get('nextPageToken')
            if not page_token:
                break
        except Exception as ex:
            logging.error('An error occurred: %s', ex)
            break
    return files


def separate_text_and_media_files(files: list) -> (list, list):
    """
    Text and media files are processed differently so separate them.
    """
    text_files = []
    media_files = []
    for fl in files:
        if fl['mimeType'] == 'text/plain' and \
           fl['name'].startswith("WhatsApp Chat with "):
            text_files.append(fl)
        else:
            media_files.append(fl)
    return text_files, media_files


def download_content_to_file(file_dict: dict, gdrive_service: Resource,
                             verbose=False) -> None:
    """
    Download the file content from S3. This modifies the file dict in-place.
    """

    file_id = file_dict['id']

    request = gdrive_service.files().get_media(fileId=file_id)

    fh = io.BytesIO()
    downloader = MediaIoBaseDownload(fh, request)
    done = False
    while done is False:
        _, done = downloader.next_chunk()
    fh.seek(0)
    file_dict['content'] = fh
    if verbose:
        logging.info("Downloaded %r", file_dict['uuid'])


def encrypt_string(string: str, salt2="") -> str:
    """
    Returns an encrypted string for anonymization of groups and phones
    """
    salt = SCRAPER_SALT + salt2
    return hashlib.pbkdf2_hmac('sha256', string.encode(),
                               salt.encode(), 1).hex()


def process_text_file(text_file: dict, media_files_by_name: dict) -> list:
    """
    Given a whatsapp message thread text file, break that file into individual
    messages which are suitable for upload to mongo.
    """

    group_id = encrypt_string(text_file['name'])
    msgs = []
    content_lines = text_file['content'].read().decode().split('\n')
    current_msg = None
    for content_line in content_lines:
        if match := ACTION_HEADER.match(content_line):
            if current_msg:
                msgs.append(current_msg)
            current_msg = None
        if match := MESSAGE_HEADER.match(content_line):
            if current_msg:
                msgs.append(current_msg)
            current_msg = {}
            dt_raw = match['dt']
            dt = dt_parser.parse(dt_raw)
            phone = match['pn'].strip()

            current_msg['type'] = 'text'
            current_msg['datetime'] = dt.isoformat()
            current_msg['sender_id'] = encrypt_string(phone, group_id)
            current_msg['group_id'] = group_id
            current_msg['content'] = match['tail']
            continue
        if current_msg:
            current_msg['content'] += '\n' + content_line

    for i, msg in enumerate(msgs):
        uhash_raw = json.dumps(sorted(msg.items()))
        msg['uhash'] = encrypt_string(uhash_raw)
        msg['order'] = i
        if match := FILE_ATTACHED_RE.match(msg['content']):
            if match['fn'] in media_files_by_name:
                media_file = media_files_by_name[match['fn']]
                msg['type'] = 'media'
                msg['content'] = media_file['uuid']
                msg['mime_type'] = media_file['mimeType']

    logging.info("Processed WhatsApp group %r", group_id)
    return msgs


def filter_superfluous_media_files(media_files: list, media_msgs: list) -> list:
    """
    Some media files are not referenced in any messages. I don't know why.
    Filter these.
    """

    filtered_media_files = []
    for media_file in media_files:
        if any(media_file['uuid'] == m['content'] for m in media_msgs):
            filtered_media_files.append(media_file)
    return filtered_media_files


def save_to_local(drive_id: str, messages: list, media_files: list) -> None:
    """
    Save messages and media to the filesystem.
    """
    today = datetime.date.today().isoformat().replace('-', '_')
    json_fn = f"scrape_{today}_{drive_id}.json"
    media_dir = f"scrape_media_{today}_{drive_id}"
    with open(json_fn, 'w') as f:
        f.write(json.dumps(messages))
        logging.info("Wrote messages to %r", json_fn)
    if os.path.exists(media_dir):
        if input("Overwrite media directory %r? " % media_dir)[0] == 'y':
            shutil.rmtree(media_dir)
        else:
            logging.warning("Media files will not be saved. Done.")
            return
    os.makedirs(media_dir)
    for media_file in media_files:
        path = os.path.join(media_dir, media_file['uuid'])
        with open(path, 'wb') as f:
            f.write(media_file['content'].read())
    logging.info("Wrote %d media files to %r. Done", len(media_files), media_dir)


def group_msgs(msgs: list) -> dict:
    """
    Group messages by their group_id and return correctly sorted by order
    """
    msgs_by_group = collections.defaultdict(list)
    for msg in msgs:
        msgs_by_group[msg['group_id']].append(msg)
    for msgs_in_group in msgs_by_group.values():
        msgs_in_group.sort(key=lambda m: m['order'])
    return dict(msgs_by_group)


def adjust_order(msgs: list, order_diff: int) -> None:
    """
    Adjust the order for every message by the same amount
    """
    for msg in msgs:
        msg['order'] += order_diff


def update_msg_order_from_existing(msgs: list, existing_msgs: list) -> None:
    """
    Whatsapp has a 10k message limit per group. It's likely therefore that
    we will get overlapping messages and the order on the new message will be
    wrong. This detects the overlap and updates the original msgs order
    """

    msgs_by_group = group_msgs(msgs)
    existing_msgs_by_group = group_msgs(existing_msgs)

    for group_id, msgs_in_new_group in msgs_by_group.items():
        msgs_in_old_group = existing_msgs_by_group.get(group_id)
        if not msgs_in_old_group:
            continue

        existing_uhashes = {m['uhash']: m['order'] for m in msgs_in_old_group}
        for new_msg in msgs_in_new_group:
            if new_msg['uhash'] in existing_uhashes:
                old_order = existing_uhashes[new_msg['uhash']]
                order_diff = old_order - new_msg['order']
                adjust_order(msgs_in_new_group, order_diff)
                break
        else:
            order_diff = msgs_in_old_group[-1]['order'] + 1
            adjust_order(msgs_in_new_group, order_diff)


def save_to_server(msgs: list, media_files: list) -> None:
    """
    Save msgs and media to the Tattle server.
    This requires setting environment variables
    """

    msg_uhashes = [msg['uhash'] for msg in msgs]

    aws, bucket, s3 = initialize_s3()
    coll = initialize_mongo(var_prefix="whatsapp")

    existing_msgs = coll.find({"uhash": {"$in": msg_uhashes}},
                              {"uhash": 1, "order": 1, "group_id": 1, "_id": 0})
    if existing_msgs:
        logging.warning("Not overwriting %d msgs already in server.",
                        len(existing_msgs))

        update_msg_order_from_existing(msgs, existing_msgs)

        existing_uhashes = [m['uhash'] for m in existing_msgs]
        msgs = [m for m in msgs if m['uhash'] not in existing_uhashes]

    coll.insert_many(msgs)

    for fl in media_files:
        logging.info("Uploading %r", fl['uuid'])
        upload_to_s3(s3, fl['content'], fl['uuid'], bucket, fl['mime_type'])
    logging.info("Wrote %d files to S3. Done", len(media_files))


def main(creds_path: str, google_drive_url: str, local: bool,
         skip_media: bool) -> None:
    """
    Six steps to download a WhatsApp dump, extract messages, and save messages
    and media.
    """

    # 0. Validate salt
    global SCRAPER_SALT
    if not SCRAPER_SALT:
        logging.warning("The SCRAPER_SALT env is not set. "
                        "Anonymization will not be deterministic")
        SCRAPER_SALT = secrets.token_hex()

    # 1. Setup google drive
    drive_url_match = GDRIVE_RE.match(google_drive_url)
    if not drive_url_match:
        logging.error("Invalid google drive url %r", google_drive_url)
        exit(1)
    drive_id = drive_url_match['drive_id']
    gdrive_service = get_gdrive_service(creds_path)

    # 2. Download file dictionaries from google drive
    files = get_files_from_drive(drive_id, gdrive_service)
    if not files:
        logging.warning("Found 0 files at %r. Check your url/credentials.",
                        drive_id)
        exit(1)
    text_files, media_files = separate_text_and_media_files(files)
    logging.info("Retrieved %d files (%d groups %d media) files from %r",
                 len(files), len(text_files), len(media_files), drive_id)

    # 3. Prepare media file dicts
    for media_file in media_files:
        media_file['uuid'] = str(uuid.uuid4())
    media_files_by_name = {afd['name']: afd for afd in media_files}

    # 4. Download whatsapp text contents and extract individual messages
    msgs = []
    for text_file in text_files:
        download_content_to_file(text_file, gdrive_service)
        msgs += process_text_file(text_file, media_files_by_name)
    media_msgs = [m for m in msgs if m['type'] == 'media']
    logging.info("Processed %d msgs (%d text, %d media)",
                 len(msgs), len(msgs) - len(media_msgs), len(media_msgs))

    # 5. Download media files that are referenced in a message
    media_files = filter_superfluous_media_files(media_files, media_msgs)
    if skip_media:
        logging.warning("Skipping download of %d media files", len(media_files))
        media_files = []
    else:
        logging.info("Downloading %d media files", len(media_files))
        for media_file in media_files:
            download_content_to_file(media_file, gdrive_service, verbose=True)

    # 6. Save
    if local:
        save_to_local(drive_id, msgs, media_files)
        return
    save_to_server(msgs, media_files)


if __name__ == '__main__':
    parser = argparse.ArgumentParser("Tattle WhatsApp scraper. See README.md")
    parser.add_argument('credentials',
                        help='Either drive_api or service account credentials')
    parser.add_argument('google_drive_url',
                        help='Google Drive directory of WhatsApp dump')
    parser.add_argument('--local', action='store_true',
                        help='Save data/media locally instead of uploading')
    parser.add_argument('--skip-media', action='store_true',
                        help="Skip downloading / uploading media files")
    parser.add_argument('--verbose', action='store_true')
    args = parser.parse_args()

    if args.verbose:
        logging.basicConfig(level=logging.INFO)

    main(args.credentials, args.google_drive_url, args.local, args.skip_media)
