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
from typing import List, Dict

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
MSG_DELETED = "This message was deleted"
MEDIA_OMITTED = "<Media omitted>"
SKIP_MSGS = (MSG_DELETED, MEDIA_OMITTED)
ACTION_HEADER = re.compile(r"(?P<day>[0-9]+/[0-9]+/[0-9]+), (?P<tm>[0-9]+:[0-9]+ (am|pm)) - (?P<pn>\+?[0-9 ]+) .*?$")
MESSAGE_HEADER = re.compile(r"(?P<day>[0-9]+/[0-9]+/[0-9]+), (?P<tm>[0-9]+:[0-9]+ (am|pm)) - (?P<pn>\+?[0-9 ]+): (?P<tail>.*?)$")
FILE_ATTACHED_RE = re.compile(r"(?P<fn>.*?) \(file attached\)$")
GDRIVE_RE = re.compile(r"(?:https://|)drive\.google\.com/.*?/folders/(?P<drive_id>[a-zA-Z0-9_-]+)")
DAY_FMT = "%d/%m/%y"
MINUTES = datetime.timedelta(seconds=60)

# Silence unneccesary google api warnings
# https://github.com/googleapis/google-api-python-client/issues/299
logging.getLogger('googleapiclient.discovery_cache').setLevel(logging.ERROR)


class Msg():
    __slots__ = [
        'dt',
        'msg_type',
        'sender_id',
        'group_id',
        'content',
        'order',
        'file_idx',
        'file_modified',
        'mime_type',
    ]

    def __init__(self, **kwargs):
        self.dt = kwargs.pop('dt', None)
        self.msg_type = kwargs.pop('msg_type', "")
        self.sender_id = kwargs.pop('sender_id', "")
        self.group_id = kwargs.pop('group_id', "")
        self.content = kwargs.pop('content', "")
        self.order = kwargs.pop('order', None)
        self.file_idx = kwargs.pop('file_idx', None)
        self.file_modified = None
        self.mime_type = None
        assert not kwargs

    def __repr__(self):
        return "%s: %s %s: %s" % (self.order, self.dt, self.sender_id[:5],
                                  self.content[:50].replace('\n', '\\n'))

    def __eq__(self, other):
        return (self.dt == other.dt
                and self.sender_id == other.sender_id
                and self.group_id == other.group_id
                and self.content == other.content)

    @staticmethod
    def from_match(match: re.Match, group_id: str, file_idx: int):
        day_raw = match['day']
        day = datetime.datetime.strptime(day_raw, DAY_FMT).date()
        tm_raw = match['tm']
        tm = dt_parser.parse(tm_raw).time()
        return Msg(
            dt=datetime.datetime.combine(day, tm),
            msg_type='text',
            sender_id=encrypt_string(match['pn'].strip(), group_id),
            group_id=group_id,
            content=match['tail'],
            file_idx=file_idx,
        )

    def as_dict(self):
        return {
            'msg_type': self.msg_type,
            'datetime': self.dt.isoformat(),
            'sender_id': self.sender_id,
            'group_id': self.group_id,
            'content': self.content,
            'order': self.order,
            'mime_type': self.mime_type,
        }

    def is_original(self):
        return self.content not in SKIP_MSGS

    def add_content_line(self, content_line: str):
        self.content += '\n' + content_line

    def set_order(self, order: int):
        self.order = order

    def set_file_modified(self, file_modified: datetime.datetime):
        self.file_modified = file_modified

    def make_media_msg(self, media_file: dict):
        """
        Media messages have:
        - a different msg_type
        - content points to the uuid of the actual media in the s3
        - a mime_type
        """
        self.msg_type = 'media'
        self.content = media_file['uuid']
        self.mime_type = media_file['mimeType']

    def merge(self, other):
        """
        Given two Msg objects, merge the best of both
        """
        assert self.sender_id == other.sender_id
        assert self.group_id == other.group_id

        content_msg = sorted([self, other], key=content_sort)[0]
        latest_dt = max((self, other), key=lambda m: m.file_modified).dt

        return Msg(
            dt=latest_dt,
            msg_type=content_msg.msg_type,
            sender_id=self.sender_id,
            group_id=self.group_id,
            content=content_msg.content,
        )


def content_sort(msg: Msg) -> tuple:
    """
    Which content is best?
    content_sort[0] will be content which is NOT deleted first
    a.k.a True > False
    """
    return (not msg.is_original(),
            msg.msg_type != "media")


def get_gdrive_service(creds_path: str) -> Resource:
    """
    Get the google drive service client (aka the 'Resource')

    Primarily copied from Google Drive tutorial:
    https://developers.google.com/drive/api/v3/quickstart/python
    """

    assert os.path.exists(creds_path)
    with open(creds_path) as f:
        jobj = json.loads(f.read())
        is_service_account = jobj.get('msg_type') == 'service_account'

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
    Pull files from a specific google drive file
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


def process_text_file(text_file: dict, media_files_by_name: dict,
                      file_idx: int) -> list:
    """
    Given a whatsapp message thread text file, break that file into individual
    messages which are suitable for upload to mongo.
    """

    # 1. Build up the messages line-by-line
    group_id = encrypt_string(text_file['name'])
    msgs = []
    content_lines = text_file['content'].read().decode().split('\n')
    current_msg = None
    for content_line in content_lines:
        if ACTION_HEADER.match(content_line):
            # action header is a subset of message header but if we get it,
            # it means the message is over and we should save the message
            if current_msg:
                msgs.append(current_msg)
                current_msg = None
        if match := MESSAGE_HEADER.match(content_line):
            current_msg = Msg.from_match(match, group_id, file_idx)
            continue
        if current_msg:
            current_msg.add_content_line(content_line)
    if current_msg:
        msgs.append(current_msg)

    # 2. With all the messages, do some processing on each
    if msgs:
        file_modified = msgs[-1].dt
        for i, msg in enumerate(msgs):
            msg.set_order(i)
            msg.content = msg.content.strip()
            msg.set_file_modified(file_modified)
            if match := FILE_ATTACHED_RE.match(msg.content):
                if match['fn'] in media_files_by_name:
                    media_file = media_files_by_name[match['fn']]
                    msg.make_media_msg(media_file)

    logging.info("Processed WhatsApp group %r", group_id)
    return msgs


def filter_superfluous_media_files(media_files: list, media_msgs: list) -> list:
    """
    Some media files are not referenced in any messages. I don't know why.
    Filter these.
    """

    filtered_media_files = []
    for media_file in media_files:
        if any(media_file['uuid'] == m.content for m in media_msgs):
            filtered_media_files.append(media_file)
    return filtered_media_files


def save_to_local(drive_id: str, msgs: List[Msg], media_files: list,
                  skip_media: bool) -> None:
    """
    Save messages and media to the filesystem.
    """
    today = datetime.date.today().isoformat().replace('-', '_')
    json_fn = f"scrape_{today}_{drive_id}.json"
    with open(json_fn, 'w') as f:
        f.write(json.dumps([m.as_dict() for m in msgs]))
        logging.info("Wrote messages to %r", json_fn)

    if skip_media:
        return

    media_dir = f"scrape_media_{today}_{drive_id}"
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


def save_to_server(new_msgs: List[Msg], media_files: list) -> None:
    """
    Save msgs and media to the Tattle server.
    This requires setting environment variables
    """

    msg_gids = [msg.group_id for msg in new_msgs]

    aws, bucket, s3 = initialize_s3()
    coll = initialize_mongo(var_prefix="whatsapp")

    existing_msgs = coll.find({"group_id": {"$in": msg_gids}})
    if existing_msgs:
        logging.warning("Not overwriting %d msgs already in server.",
                        len(existing_msgs))
        merge_msgs_from_server(new_msgs, existing_msgs)
    coll.insert_many(new_msgs)

    for fl in media_files:
        logging.info("Uploading %r", fl['uuid'])
        upload_to_s3(s3, fl['content'], fl['uuid'], bucket, fl['mime_type'])
    logging.info("Wrote %d files to S3. Done", len(media_files))


def group_msgs(msgs: List[Msg]) -> Dict[str, List[Msg]]:
    """
    Group messages by their group_id and return correctly sorted by order
    """
    msgs_by_group = collections.defaultdict(list)
    for msg in msgs:
        msgs_by_group[msg.group_id].append(msg)
    for msgs_in_group in msgs_by_group.values():
        msgs_in_group.sort(key=msg_sort)
    return dict(msgs_by_group)


def merge_msgs_from_server(msgs: List[Msg],
                           existing_msgs: List[Msg]) -> None:
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
        assert msgs_in_old_group[0].dt <= msgs_in_new_group[0].dt

        merged_msgs = merge_two_msg_lists(msgs_in_old_group,
                                          msgs_in_new_group)
        assert msgs_in_old_group == merged_msgs[:len(msgs_in_old_group)]

        # messages we actually need to write are after all the old messages
        # limit them and write the new messages
        msgs_not_on_mongo = merged_msgs[len(msgs_in_old_group):]
        msgs_by_group[group_id] = msgs_not_on_mongo


def msg_sort(msg: Msg) -> tuple:
    """
    When sorting messages, the lowest datetime always comes first.
    In the case of the tie, we rely on the fact that we have calculated the order.
    In the case of another tie, prefer the message that was NOT deleted
    """
    return (msg.dt, msg.order, msg.content == MSG_DELETED)


def merge_msgs_given_offset(msgs_a: List[Msg], msgs_b: List[Msg],
                            offset: int) -> List[Msg]:
    """
    Given an offset, merge the two lists of messages into one list with no dups
    """
    assert msgs_a[0].dt <= msgs_b[0].dt
    ret = []
    i = -1 * offset - 1
    while True:
        i += 1
        msg_a, msg_b = None, None
        try:
            msg_a = msgs_a[i + offset]
        except IndexError:
            pass
        try:
            if i >= 0:
                msg_b = msgs_b[i]
        except IndexError:
            pass
        if msg_a and msg_b:
            ret.append(msg_a.merge(msg_b))
            continue
        if msg_a:
            ret.append(msg_a)
            continue
        if msg_b:
            ret.append(msg_b)
            continue
        return ret


def check_match(msgs_a: List[Msg], msgs_b: List[Msg], offset: int):
    """
    Determine whether the overlap (offset) is correct for these two lists.
    Returns True when 20 things match in a row
    Returns the number of matches if between 3-20 matches
    Everything else is return False - not a match
    """
    matches = 0
    for i in range(-1 * offset, len(msgs_a) + len(msgs_b)):
        try:
            msg_a = msgs_a[i + offset]
        except IndexError:
            continue
        try:
            if i < 0:
                continue
            msg_b = msgs_b[i]
        except IndexError:
            continue

        if msg_a.sender_id != msg_b.sender_id:
            return False
        if abs((msg_a.dt - msg_b.dt).total_seconds()) > 61:
            return False

        if not msg_a.is_original() or not msg_b.is_original():
            continue

        if msg_a.content != msg_b.content:
            return False

        matches += 1
        if matches > 20:
            return True

    alt_min_match_len = min(len(msgs_a), len(msgs_b)) // 2
    if matches >= 3 or matches >= alt_min_match_len:
        return matches
    return False


def find_offset(msg_set_a: List[Msg], msg_set_b: List[Msg]) -> int:
    """
    Find the offset for the two lists of messages that makes them
    overlap. Raise an assertion error if it can't be done
    """
    checked_offsets = set()
    possible_matches = {}
    for msg_a in msg_set_a:
        if msg_set_b[0].dt - msg_a.dt > 1 * MINUTES:
            continue
        for msg_b in msg_set_b:
            if msg_b.dt - msg_a.dt > 1 * MINUTES:
                continue
            if msg_a.dt - msg_b.dt > 1 * MINUTES:
                break
            offset = msg_a.order - msg_b.order
            if offset in checked_offsets:
                continue
            match_score = check_match(msg_set_a, msg_set_b, offset)
            if match_score is True:
                return offset
            if match_score and isinstance(match_score, int):
                possible_matches[offset] = match_score
            checked_offsets.add(offset)
    if possible_matches:
        return max(possible_matches.keys(),
                   key=lambda o: possible_matches[o])
    raise AssertionError("Files do not overlap")


def merge_two_msg_lists(msgs_a: List[Msg], msgs_b: List[Msg]) -> List[Msg]:
    """
    Given two groups of messages, which are from the same group, merge into one
    list of messages
    """

    # The code ahead assumes msgs_a is always < msgs_b. If they aren't, swap them
    if msgs_a[0].dt > msgs_b[0].dt:
        msgs_a, msgs_b = msgs_b, msgs_a

    if msgs_a[-1].dt < msgs_b[0].dt:
        # If the messages don't overlap in dates, return them concatenated
        merged = msgs_a + msgs_b
    else:
        # Else, do a more complicated thing
        offset = find_offset(msgs_a, msgs_b)
        merged = merge_msgs_given_offset(msgs_a, msgs_b, offset)
    for i, msg in enumerate(merged):
        msg.set_order(i)
    return merged


def merge_msgs_in_group(msgs_in_grp: list) -> list:
    """
    We often get multiple sets of messages from the same group.
    For example, if two text files are in one dump or if we need to update
    the mongo file.
    Merge these.
    This function is complicated so there are plenty of comments.
    """

    # 0. Assert only one group came in
    assert len(set(m.group_id for m in msgs_in_grp)) == 1

    # 1. Sort messages and bucket them by file_idx
    msgs_in_grp.sort(key=msg_sort)
    msgs_by_file = collections.defaultdict(list)
    for msg in msgs_in_grp:
        msgs_by_file[msg.file_idx].append(msg)
    msgs_by_file = list(msgs_by_file.values())
    num_files = len(msgs_by_file)

    # 2. Return if only one file came in
    if num_files == 1:
        assert set(m.order for m in msgs_in_grp) == set(range(len(msgs_in_grp)))
        return msgs_in_grp

    # 3. Iteratively merge different files
    logging.info("Merging %d files...", num_files)
    ret = msgs_by_file.pop()
    while msgs_by_file:
        other_msgs = msgs_by_file.pop()
        ret = merge_two_msg_lists(ret, other_msgs)

    # 4. Final asserts
    unique_content_in = set(m.content for m in msgs_in_grp if m.is_original())
    unique_content_out = set(m.content for m in ret if m.is_original())
    missed = unique_content_in - unique_content_out
    if missed:
        raise AssertionError("Missed content %r" % missed)

    assert set(m.order for m in ret) == set(range(len(ret)))

    logging.info("Merged %d files with an avg of %d messages to %d messages",
                 num_files, len(msgs_in_grp) / num_files, len(ret))
    return ret


def merge_all_msgs(msgs: list) -> list:
    """
    We could easily get multiple files from the same group. Merge these.
    """

    msgs_by_group = group_msgs(msgs)
    ret = []
    for msgs_in_group in msgs_by_group.values():
        ret += merge_msgs_in_group(msgs_in_group)
    return ret


def main(creds_path: str, google_drive_url: str, local: bool,
         skip_media: bool) -> None:
    """
    Seven steps to download a WhatsApp dump, extract messages,
    and save messages and media.
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
    for file_idx, text_file in enumerate(text_files):
        download_content_to_file(text_file, gdrive_service)
        msgs += process_text_file(text_file, media_files_by_name, file_idx)
    media_msgs = [m for m in msgs if m.msg_type == 'media']
    logging.info("Processed %d msgs (%d text, %d media)",
                 len(msgs), len(msgs) - len(media_msgs), len(media_msgs))

    # 5. Merge messages from identical files together
    msgs = merge_all_msgs(msgs)

    # 6. Download media files that are referenced in a message
    media_files = filter_superfluous_media_files(media_files, media_msgs)
    if skip_media:
        logging.warning("Skipping download of %d media files", len(media_files))
        media_files = []
    else:
        logging.info("Downloading %d media files", len(media_files))
        for media_file in media_files:
            download_content_to_file(media_file, gdrive_service, verbose=True)

    # 7. Save
    if local:
        save_to_local(drive_id, msgs, media_files, skip_media)
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
