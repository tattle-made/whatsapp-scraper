#!/usr/bin/env python

import copy
import io
from datetime import datetime, timedelta

from whatsapp_scraper import (merge_msgs_from_server, process_text_file,
                              encrypt_string, filter_superfluous_media_files,
                              merge_all_msgs, Msg, set_media_hash)

TEST_TEXT_CONTENT = """
28/07/20, 7:18 pm - Messages to this group are now secured with end-to-end encryption. Tap for more info.
14/07/20, 11:14 pm - +91 12345 12345 created group "test group"
28/07/20, 7:18 pm - You joined using this group's invite link
28/07/20, 7:30 pm - +91 12345 54321 joined using this group's invite link
28/07/20, 7:35 pm - +91 12345 54321: Hi
28/07/20, 7:35 pm - +91 12345 54321: IMG-W0.jpg (file attached)
28/07/20, 7:35 pm - +91 12345 54321: IMG-W1.jpg (file attached)
28/07/20, 7:35 pm - +91 12345 12345: Neat photo
28/07/20, 7:50 pm - +91 12345 54321: Yea
Let me write
Three lines
28/07/20, 7:51 pm - +91 12345 12345: Call me
28/07/20, 7:52 pm - +91 12345 54321: OK
"""

TEST_TEXT_CONTENT_1 = """
28/07/20, 7:50 pm - +91 12345 54321: Yea
Let me write
Three lines
28/07/20, 7:51 pm - +91 12345 12345: Call me
28/07/20, 7:52 pm - +91 12345 54321: OK
28/07/20, 8:31 pm - +91 12345 12345 left
28/07/20, 8:51 pm - +91 12345 54321: Where did you go?
"""


TEST_TEXT_CONTENT_2 = """
28/07/20, 8:51 pm - +91 12345 54321: Where did you go?
28/07/20, 8:52 pm - +91 12345 54321 left
28/07/20, 9:30 pm - +91 12345 12345 joined using this group's invite link
28/07/20, 9:30 pm - +91 12345 12345: Back
"""

TEST_DT = datetime.now()
MINUTES = timedelta(seconds=60)


def set_file_mod(msgs):
    max_dt = max(msgs, key=lambda m: m.dt).dt
    for m in msgs:
        m.file_datetime = max_dt


def fill_out(msgs):
    for m in msgs:
        if not m.dt:
            m.dt = TEST_DT
    return msgs


def unfill_out(msgs):
    for m in msgs:
        del m.dt
    return msgs


def test_merge_msgs_from_server_0():
    # There should be no overlap because they are in different groups

    existing_msgs = [
        Msg(group_id='b', order=1, content='ab', sender_id='xy'),
        Msg(group_id='c', order=2, content='cd', sender_id='yz')
    ]
    fill_out(existing_msgs)
    existing_msgs = [m.as_dict() for m in existing_msgs]

    msgs = [
        Msg(group_id='a', order=0, content='cd', sender_id='yz'),
        Msg(group_id='a', order=1, content='de', sender_id='zy')
    ]
    fill_out(msgs)
    original_msgs = copy.deepcopy(msgs)

    merge_msgs_from_server(msgs, existing_msgs)

    assert [m.as_dict() for m in msgs] == [m.as_dict() for m in original_msgs]


def test_merge_msgs_from_server_1():
    # Simple overlap of one message

    existing_msgs = [
        Msg(group_id='a', order=1, content='ab', sender_id='xy', dt=TEST_DT),
        Msg(group_id='a', order=2, content='cd', sender_id='yz', dt=TEST_DT + MINUTES * 1)
    ]
    set_file_mod(existing_msgs)

    msgs = [
        Msg(group_id='a', order=0, content='cd', sender_id='yz', dt=TEST_DT + MINUTES * 1),
        Msg(group_id='a', order=1, content='de', sender_id='zz', dt=TEST_DT + MINUTES * 2)
    ]
    set_file_mod(msgs)

    merge_msgs_from_server(msgs, [m.as_dict() for m in existing_msgs])

    assert msgs[0] == Msg(group_id='a', order=2, content='cd', sender_id='yz', dt=TEST_DT + MINUTES * 1)
    assert msgs[1] == Msg(group_id='a', order=3, content='de', sender_id='zz', dt=TEST_DT + MINUTES * 2)


def test_merge_msgs_from_server_2():
    # Same group but no overlap. Should still update order

    existing_msgs = [
        Msg(group_id='a', order=1, content='ab', sender_id='zz', dt=TEST_DT),
        Msg(group_id='a', order=2, content='cd', sender_id='zz', dt=TEST_DT + MINUTES * 1)
    ]

    msgs = [
        Msg(group_id='a', order=0, content='ef', sender_id='zy', dt=TEST_DT + MINUTES * 2),
        Msg(group_id='a', order=1, content='gh', sender_id='zz', dt=TEST_DT + MINUTES * 2)
    ]

    merge_msgs_from_server(msgs, [m.as_dict() for m in existing_msgs])

    assert msgs[0] == Msg(group_id='a', order=3, content='ef', sender_id='zy', dt=TEST_DT + MINUTES * 2)
    assert msgs[1] == Msg(group_id='a', order=4, content='gh', sender_id='zz', dt=TEST_DT + MINUTES * 2)


def make_text_file(content, group_name="test"):
    fake_file = io.BytesIO(content.encode())
    return {
        'name': "WhatsApp Chat with " + group_name,
        'content': fake_file
    }


def test_process_text_file():
    text_file = make_text_file(TEST_TEXT_CONTENT)

    media_files = [
        {
            'name': 'IMG-W0.jpg',
            'content': io.BytesIO(b'abase64encodedimage'),
            'uuid': 'uuid0',
            'mimeType': 'jpg',
        },
        {
            'name': 'IMG-W2.jpg',
            'content': io.BytesIO(b'abase64encodedimage2'),
            'uuid': 'uuid2',
            'mimeType': 'jpg'
        },
    ]
    media_files_by_name = {afd['name']: afd for afd in media_files}
    group_id = encrypt_string(text_file['name'])
    user_id_1 = encrypt_string("+91 12345 12345", group_id)
    user_id_2 = encrypt_string("+91 12345 54321", group_id)
    file_idx = 0

    msgs = process_text_file(text_file, media_files_by_name, file_idx, "/g/drive/url")
    assert len(msgs) == 7

    # test no dupes and file_idx is always 0
    uids = set()
    for msg in msgs:
        assert (msg.order, msg.dt) not in uids
        uids.add((msg.order, msg.dt))
        assert msg.file_idx == 0

    # final bits of media file processing
    media_msgs = [m for m in msgs if m.has_media]
    remaining_media = filter_superfluous_media_files(media_files, media_msgs)
    for media_file in media_files:
        set_media_hash(media_file)
    for media_msg in media_msgs:
        media_msg.process_media_msg()

    msgs_as_dict = [m.as_dict() for m in msgs]
    assert msgs_as_dict == [
        {'has_media': False, 'datetime': '2020-07-28T19:35:00',
         'sender_id': user_id_2, 'group_id': group_id,
         'content': 'Hi', 'order': 0,
         'source_loc': '/g/drive/url', 'source_type': 'GOOGLE_DRIVE',
         'media_mime_type': None, 'media_upload_loc': None},
        {'has_media': True, 'datetime': '2020-07-28T19:35:00',
         'sender_id': user_id_2, 'group_id': group_id,
         'content': 'IMG-W0.jpg (file attached)', 'order': 1,
         'source_loc': '/g/drive/url', 'source_type': 'GOOGLE_DRIVE',
         'media_mime_type': 'jpg', 'media_upload_loc': '7acb2c8524b364c3192c5ce86ae29a6a289fb98e843c6a637e710a96e535011a'},
        {'has_media': True, 'datetime': '2020-07-28T19:35:00',
         'sender_id': user_id_2, 'group_id': group_id,
         'content': 'IMG-W1.jpg (file attached)', 'order': 2,
         'source_loc': '/g/drive/url', 'source_type': 'GOOGLE_DRIVE',
         'media_mime_type': None, 'media_upload_loc': None},
        {'has_media': False, 'datetime': '2020-07-28T19:35:00',
         'sender_id': user_id_1, 'group_id': group_id,
         'content': 'Neat photo', 'order': 3,
         'source_loc': '/g/drive/url', 'source_type': 'GOOGLE_DRIVE',
         'media_mime_type': None, 'media_upload_loc': None},
        {'has_media': False, 'datetime': '2020-07-28T19:50:00',
         'sender_id': user_id_2, 'group_id': group_id,
         'content': 'Yea\nLet me write\nThree lines', 'order': 4,
         'source_loc': '/g/drive/url', 'source_type': 'GOOGLE_DRIVE',
         'media_mime_type': None, 'media_upload_loc': None},
        {'has_media': False, 'datetime': '2020-07-28T19:51:00',
         'sender_id': user_id_1, 'group_id': group_id,
         'content': 'Call me', 'order': 5,
         'source_loc': '/g/drive/url', 'source_type': 'GOOGLE_DRIVE',
         'media_mime_type': None, 'media_upload_loc': None},
        {'has_media': False, 'datetime': '2020-07-28T19:52:00',
         'sender_id': user_id_2, 'group_id': group_id, 'content': 'OK',
         'order': 6,
         'source_loc': '/g/drive/url', 'source_type': 'GOOGLE_DRIVE',
         'media_mime_type': None, 'media_upload_loc': None}]

    assert set(r['uuid'] for r in remaining_media) == set(('uuid0',))


def test_merge_msgs():
    text_file_0 = make_text_file(TEST_TEXT_CONTENT)
    msgs0 = process_text_file(text_file_0, {}, 0, "g/drive/dir")
    assert merge_all_msgs(msgs0) == msgs0

    msgs0dup = process_text_file(text_file_0, {}, 1, "g/drive/dir")
    all_msgs = msgs0 + msgs0dup
    assert merge_all_msgs(all_msgs) == msgs0

    assert merge_all_msgs(msgs0 + msgs0dup[:-1]) == msgs0

    text_file_1 = make_text_file(TEST_TEXT_CONTENT_1)
    msgs1 = process_text_file(text_file_1, {}, 1, "g/drive/dir")

    all_msgs = msgs1 + msgs0
    merged = merge_all_msgs(all_msgs)
    assert len(merged) == 8
    assert merged[0].order == 0
    assert merged[0].content == 'Hi'
    assert merged[-1].order == 7
    assert merged[-1].content == 'Where did you go?'

    text_file_2 = make_text_file(TEST_TEXT_CONTENT_2)
    msgs2 = process_text_file(text_file_2, {}, 1, "g/drive/dir")
    all_msgs = msgs2 + msgs0
    merged = merge_all_msgs(all_msgs)
    assert len(merged) == 9
    assert merged[0].order == 0
    assert merged[0].content == 'Hi'
    assert merged[-2].order == 7
    assert merged[-2].content == 'Where did you go?'
    assert merged[-1].order == 8
    assert merged[-1].content == 'Back'

    # assert  == msgs0
