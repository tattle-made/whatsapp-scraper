#!/usr/bin/env python

import copy
import io

from whatsapp_scraper import (update_msg_order_from_existing, process_text_file,
                              encrypt_string, filter_superfluous_media_files)

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
28/07/20, 7:51 pm - +91 12345 54321: OK
28/07/20, 8:31 pm - +91 12345 12345 left
"""


def test_update_msg_order_from_existing_0():
    existing_msgs = [
        {'group_id': 'b', 'order': 1, 'uhash': 'ab'},
        {'group_id': 'c', 'order': 2, 'uhash': 'cd'}
    ]

    msgs = [
        {'group_id': 'a', 'order': 0, 'uhash': 'cd'},
        {'group_id': 'a', 'order': 1, 'uhash': 'de'}
    ]
    original_msgs = copy.deepcopy(msgs)

    update_msg_order_from_existing(msgs, existing_msgs)

    assert msgs == original_msgs


def test_update_msg_order_from_existing_1():
    existing_msgs = [
        {'group_id': 'a', 'order': 1, 'uhash': 'ab'},
        {'group_id': 'a', 'order': 2, 'uhash': 'cd'}
    ]

    msgs = [
        {'group_id': 'a', 'order': 0, 'uhash': 'cd'},
        {'group_id': 'a', 'order': 1, 'uhash': 'de'}
    ]

    update_msg_order_from_existing(msgs, existing_msgs)

    assert msgs[0] == {'group_id': 'a', 'order': 2, 'uhash': 'cd'}
    assert msgs[1] == {'group_id': 'a', 'order': 3, 'uhash': 'de'}


def test_update_msg_order_from_existing_2():

    existing_msgs = [
        {'group_id': 'a', 'order': 1, 'uhash': 'ab'},
        {'group_id': 'a', 'order': 2, 'uhash': 'cd'}
    ]

    msgs = [
        {'group_id': 'a', 'order': 0, 'uhash': 'ef'},
        {'group_id': 'a', 'order': 1, 'uhash': 'gh'}
    ]

    update_msg_order_from_existing(msgs, existing_msgs)

    assert msgs[0] == {'group_id': 'a', 'order': 3, 'uhash': 'ef'}
    assert msgs[1] == {'group_id': 'a', 'order': 4, 'uhash': 'gh'}


def test_filter_superfluous():

    media_files = []
    media_msgs = []
    pass


def test_process_text_file():
    fake_file = io.BytesIO(TEST_TEXT_CONTENT.encode())

    text_file = {
        'name': "WhatsApp Chat with test",
        'content': fake_file
    }
    media_files_by_name = {
        'IMG-W0.jpg': {
            'uuid': 'uuid0',
            'mimeType': 'jpg'
        },
        'IMG-W2.jpg': {
            'uuid': 'uuid2',
            'mimeType': 'jpg'
        },
    }
    media_files = list(media_files_by_name.values())
    group_id = encrypt_string(text_file['name'])
    user_id_1 = encrypt_string("+91 12345 12345", group_id)
    user_id_2 = encrypt_string("+91 12345 54321", group_id)

    msgs = process_text_file(text_file, media_files_by_name)

    # test uhashes have no dupes. Otherwise, just delete
    uhashes = set()
    for msg in msgs:
        assert msg['uhash'] not in uhashes
        uhashes.add(msg['uhash'])
        msg['uhash'] = ''

    assert msgs == [
        {'type': 'text', 'datetime': '2020-07-28T19:35:00',
         'sender_id': user_id_2, 'group_id': group_id,
         'content': 'Hi', 'uhash': '', 'order': 0},
        {'type': 'media', 'datetime': '2020-07-28T19:35:00',
         'sender_id': user_id_2, 'group_id': group_id,
         'content': 'uuid0', 'uhash': '', 'order': 1, 'mime_type': 'jpg'},
        {'type': 'text', 'datetime': '2020-07-28T19:35:00',
         'sender_id': user_id_2, 'group_id': group_id,
         'content': 'IMG-W1.jpg (file attached)', 'uhash': '', 'order': 2},
        {'type': 'text', 'datetime': '2020-07-28T19:35:00',
         'sender_id': user_id_1, 'group_id': group_id,
         'content': 'Neat photo', 'uhash': '', 'order': 3},
        {'type': 'text', 'datetime': '2020-07-28T19:50:00',
         'sender_id': user_id_2, 'group_id': group_id,
         'content': 'Yea\nLet me write\nThree lines', 'uhash': '', 'order': 4},
        {'type': 'text', 'datetime': '2020-07-28T19:51:00',
         'sender_id': user_id_1, 'group_id': group_id,
         'content': 'Call me', 'uhash': '', 'order': 5},
        {'type': 'text', 'datetime': '2020-07-28T19:51:00',
         'sender_id': user_id_2, 'group_id': group_id, 'content': 'OK',
         'uhash': '', 'order': 6}]

    media_msgs = [m for m in msgs if m['type'] == 'media']
    remaining_media = filter_superfluous_media_files(media_files, media_msgs)

    assert set(r['uuid'] for r in remaining_media) == set(('uuid0',))
