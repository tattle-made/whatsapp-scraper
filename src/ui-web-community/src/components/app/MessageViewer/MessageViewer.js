import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import Swal from 'sweetalert2';

import Message from '../Message/Message';
import * as S from './style';

import { authorColors } from '../../utils/colors';
import ContextActionBar from '../ContextActionsBar/ContextActionBar';

let setDisplayedMessagesFlag = false;

const MessageViewer = ({ media, messages, limit, deleteMessages }) => {
  const [selectedMessages, setSelectedMessages] = useState([]);
  const [showTaggingWindow, setShowTaggingWindow] = useState(false);
  const [allCurrentTags, setCurrentTags] = useState([]);
  const [displayedMessages, setDisplayedMessages] = useState([]);

  if (messages.length && !setDisplayedMessagesFlag) {
    setDisplayedMessagesFlag = true;
    setDisplayedMessages(messages);
  }

  const participants = Array.from(
    new Set(displayedMessages.map(({ author }) => author)),
  ).filter(author => author !== 'System');

  const activeUser = participants[1];

  const colorMap = participants.reduce((obj, participant, i) => {
    return { ...obj, [participant]: authorColors[i % authorColors.length] };
  }, {});

  const renderedMessages = displayedMessages.slice(0, limit);
  const isLimited = renderedMessages.length !== displayedMessages.length;

  const getAllSelectedTags = selectedMessages => {
    let allTags = [];
    selectedMessages.forEach(msg => {
      displayedMessages.forEach(m => {
        if (m.id === msg) {
          if (m.tags.length) {
            m.tags.forEach(tag => {
              if (!allTags.includes(tag)) {
                allTags.push(tag);
              }
            });
          }
        }
      });
    });
    return allTags;
  };

  useEffect(() => {
    setCurrentTags(allCurrentTags => getAllSelectedTags(selectedMessages));
  }, [allCurrentTags, selectedMessages, setCurrentTags, getAllSelectedTags]);

  const updateSelectedMessages = (m, check) => {
    let newMessages = selectedMessages;
    let newDisplayedMessages = displayedMessages;

    if (check) {
      if (selectedMessages.indexOf(m) === -1) {
        newMessages = newMessages.concat(m);
        displayedMessages.forEach(msg => {
          if (msg.id === m) {
            msg.selected = !check;
          }
        });
      }
    }

    if (!check) {
      if (newMessages.indexOf(m) !== -1) {
        newMessages.splice(newMessages.indexOf(m), 1);
        displayedMessages.forEach(msg => {
          if (msg.id === m) {
            msg.selected = !check;
          }
        });
      }
      if (newMessages.length === 0) {
        setShowTaggingWindow(false);
        setCurrentTags(allCurrentTags => []);
      }
    }
    setDisplayedMessages(newDisplayedMessages);
    setSelectedMessages(selectedMessages => [...newMessages]);
  };

  const uploadHandler = e => {
    console.log(e);
    if (selectedMessages.length > 0) {
      Swal.fire('Uploading messages...');
    } else {
      Swal.fire('Please select some messages to upload');
    }
  };

  const linkHandler = e => {
    let newMessages = selectedMessages;
    let newDisplayedMessages = displayedMessages;

    console.log(e);
    if (newMessages.length <= 1) {
      Swal.fire('Please select more than one messages to link');
    } else {
      newDisplayedMessages.forEach(sm => {
        let linkedMessages = [];
        newDisplayedMessages.forEach(sm2 => {
          linkedMessages.push(sm2.id);
        });
        sm.linksTo = linkedMessages;
      });
      setDisplayedMessages(newDisplayedMessages);
      Swal.fire('Messages Linked');
    }
  };

  const deleteHandler = e => {
    let newMessages = displayedMessages;
    selectedMessages.forEach(selectedMsg => {
      displayedMessages.forEach(msg => {
        if (msg.id === selectedMsg) {
          newMessages.splice(newMessages.indexOf(msg), 1);
        }
      });
    });
    setDisplayedMessages(newMessages);
    setSelectedMessages(selectedMessages => []);
    setCurrentTags(allCurrentTags => []);
    Swal.fire('Messages Deleted');
  };

  const tagHandler = e => {
    if (selectedMessages.length !== 0) {
      setShowTaggingWindow(!showTaggingWindow);
    }
  };

  const addTags = tag => {
    // add tags to all currently selected messages
    // setSelectedMessages(selectedMessages => [...newMessages]);
    let newTags = allCurrentTags;
    selectedMessages.forEach(selectedMsg => {
      displayedMessages.forEach(msg => {
        if (msg.id === selectedMsg) {
          msg.tags = tag;
          newTags = msg.tags;
        }
      });
    });

    setCurrentTags(allCurrentTags => [...newTags]);
  };

  return (
    <S.Container>
      <ContextActionBar
        uploadHandler={uploadHandler}
        linkHandler={linkHandler}
        deleteHandler={deleteHandler}
        tagHandler={tagHandler}
        visible={selectedMessages.length <= 0 ? false : true}
        taggingVisible={showTaggingWindow && selectedMessages.length !== 0}
        tags={allCurrentTags}
        addTags={addTags}
      />

      {displayedMessages.length > 0 && (
        <S.P>
          <S.Info>
            Showing {isLimited ? 'first' : 'all'} {renderedMessages.length}{' '}
            messages{' '}
            {isLimited && <span>(out of {displayedMessages.length})</span>}
          </S.Info>
        </S.P>
      )}

      <S.List>
        {renderedMessages.map((message, i, arr) => {
          const prevMessage = arr[i - 1];
          let attachedMedia = null;
          if (media.length) {
            media.forEach(jpeg => {
              if (message.message.includes(jpeg.name)) {
                attachedMedia = jpeg;
              }
            });
          }

          return (
            <Message
              key={message.id} // eslint-disable-line react/no-array-index-key
              tags={message.tags}
              selectedMessages={selectedMessages}
              selected={message.selected}
              onselect={updateSelectedMessages}
              message={message}
              media={attachedMedia}
              color={colorMap[message.author]}
              isActiveUser={activeUser === message.author}
              sameAuthorAsPrevious={
                prevMessage && prevMessage.author === message.author
              }
            />
          );
        })}
      </S.List>
    </S.Container>
  );
};

MessageViewer.propTypes = {
  messages: PropTypes.arrayOf(
    PropTypes.shape({
      date: PropTypes.instanceOf(Date),
      author: PropTypes.string,
      message: PropTypes.string,
    }),
  ).isRequired,
  media: PropTypes.arrayOf(PropTypes.object),
  limit: PropTypes.number,
};

MessageViewer.defaultProps = {
  limit: Infinity,
  media: null,
};

export default React.memo(MessageViewer);
