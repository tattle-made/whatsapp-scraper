import React, { useState, useEffect } from "react"
import Swal from "sweetalert2"
import axios from "axios"

import ContextActionBar from "../ContextActionsBar/ContextActionBar"
import Message from "../Message/Message"

import * as S from "./style"
import { authorColors } from "../../utils/colors"

const MessageViewer = ({ media, messages, limit, deleteMessages, update }) => {
  // is tagging window visible? (or, are any messages selected?)
  const [showTaggingWindow, setShowTaggingWindow] = useState(false)

  // all the tags from selectedMessages
  const [allCurrentTags, setCurrentTags] = useState([])

  // all currently loaded messages
  const [displayedMessages, setDisplayedMessages] = useState([])

  // messages currently selected
  const [selectedMessages, setSelectedMessages] = useState([])

  const token = sessionStorage.getItem("jwt")
  const apiURL = process.env.GATSBY_API_URL

  const participants = Array.from(
    new Set(displayedMessages.map(({ author }) => author))
  ).filter(author => author !== "System")

  // console.log(participants)

  const activeUser = participants[1]

  const colorMap = participants.reduce((obj, participant, i) => {
    return { ...obj, [participant]: authorColors[i % authorColors.length] }
  }, {})

  const renderedMessages = displayedMessages.slice(0, limit)
  const isLimited = renderedMessages.length !== displayedMessages.length

  useEffect(() => {
    // Needed for first render
    let setDisplayedMessagesFlag = false
    // console.log("ue", messages.length, colorMap)
    if (messages.length && !setDisplayedMessagesFlag) {
      // console.log("here")
      setDisplayedMessagesFlag = true
      setDisplayedMessages(messages)
    }
  }, [messages])

  const updateSelectedMessages = (m, check) => {
    // Triggers each time selected messages change
    // code largely deals with updating the tags in the tagging window
    // console.log(m, check, "updateSelectedMessages")

    let newMessages = selectedMessages
    let newDisplayedMessages = displayedMessages

    if (check) {
      // user selects a message
      if (selectedMessages.indexOf(m) === -1) {
        // selectedmessage is found in the list of selected messages
        newMessages = newMessages.concat(m)
        //add selected message
        displayedMessages.forEach(msg => {
          //go over all displayed messages
          if (msg.id === m) {
            //find the currently selected message and toggle 'selected'
            msg.selected = !check

            //set current tags to INCLUDE tags in the current message
            let newCurrentTags = allCurrentTags.concat([
              ...msg.tags.map(tag => tag.name),
            ])

            setCurrentTags([...new Set(newCurrentTags)])
            // 'Set' because we don't want repetition
          }
        })
      }
    }

    if (!check) {
      //user unselects a message

      if (newMessages.indexOf(m) !== -1) {
        // selectedmessage is found in the list of selected messages
        // here we ensure that tags simiar across messages are
        // not removed from the tagging window while only tags unique
        // to the unselected message are removed

        let newTags = []
        displayedMessages.forEach(dm => {
          if (dm.tags.length) {
            newTags.push([...dm.tags.map(t => t.name)])
          }
        })

        displayedMessages.forEach(dm => {
          if (dm.id === m) {
            if (dm.tags.length) {
              newTags = newTags.flat()
              const tagsToRemove = dm.tags.map(t => t.name)
              tagsToRemove.forEach(ttr => {
                if (newTags.includes(ttr)) {
                  newTags.splice(newTags.indexOf(ttr), 1)
                }
              })
              setCurrentTags(newTags)
            }
          }
        })

        newMessages.splice(newMessages.indexOf(m), 1)
        // remove message from selected
      }

      if (newMessages.length === 0) {
        setShowTaggingWindow(false)
        setCurrentTags(allCurrentTags => [])
      }
    }
    setDisplayedMessages(newDisplayedMessages)
    setSelectedMessages(selectedMessages => [...newMessages])
  }

  const uploadHandler = e => {
    // console.log(e)
    if (selectedMessages.length > 0) {
      Swal.fire("Uploading messages...")
    } else {
      Swal.fire("Please select some messages to upload")
    }
  }

  const linkHandler = e => {
    let newMessages = selectedMessages
    let newDisplayedMessages = displayedMessages

    // console.log(e)
    if (newMessages.length <= 1) {
      Swal.fire("Please select more than one messages to link")
    } else {
      newMessages.forEach(sm => {
        let linkedMessages = []

        newMessages.forEach(sm2 => {
          linkedMessages.push(sm2.id)
        })
        sm.links = { links: linkedMessages }
        updateMessage(sm.id, sm)
        // update()
      })
      setDisplayedMessages(newDisplayedMessages)
      Swal.fire("Messages Linked")
    }
  }

  const deleteHandler = e => {
    let newMessages = displayedMessages
    selectedMessages.forEach(selectedMsg => {
      displayedMessages.forEach(msg => {
        if (msg.id === selectedMsg) {
          newMessages.splice(newMessages.indexOf(msg), 1)
          axios({
            method: "DELETE",
            url: apiURL + `/messages/${msg.id}`,
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }).catch(error => {
            // Handle error.
            console.log(
              "An error occurred while deleting a message:",
              error.response
            )
          })
        }
      })
    })
    setDisplayedMessages(newMessages)
    setSelectedMessages(selectedMessages => [])
    setCurrentTags(allCurrentTags => [])
    Swal.fire("Messages Deleted")
  }

  const tagHandler = e => {
    if (selectedMessages.length !== 0) {
      setShowTaggingWindow(!showTaggingWindow)
    }
  }

  const getTagFromName = tagName => {
    let URL = apiURL + `/tags?name=${tagName}&`
    return axios
      .get(URL, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
      .then(response => {
        return response.data
      })
      .catch(error => {
        // Handle error.
        console.log(
          "An error occurred while deleting a message:",
          error.response
        )
      })
  }

  const getMessageFromID = id => {
    let URL = `${apiURL}/messages/?id=${id}`
    return axios
      .get(URL, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
      .then(response => {
        return response.data
      })
      .catch(error => {
        // Handle error.
        console.log(
          "An error occurred while deleting a message:",
          error.response
        )
      })
  }

  const updateMessage = (id, message) => {
    console.log("updating", id)
    let URL = `${apiURL}/messages/${id}`
    return axios
      .put(URL, message, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
      .then(response => {
        return response.data
      })
      .catch(error => {
        // Handle error.
        console.log(
          "An error occurred while deleting a message:",
          error.response
        )
      })
  }

  const deleteTagFromMessage = async (message, tag) => {
    const tagToDelete = await getTagFromName(tag)
    const newTags = message.tags
      .map(t => t.id)
      .filter(x => x !== tagToDelete[0].id)

    message.tags = newTags
    const updatedMsg = await updateMessage(message.id, message)
    // console.log(updatedMsg)
  }

  const applyTagToMessage = async (message, tag) => {
    const tagToAdd = await getTagFromName(tag)
    message.tags = [tagToAdd[0].id, ...message.tags]
    const updatedMsg = await updateMessage(message.id, message)
    // console.log(updatedMsg)
  }

  const createTagFromName = async tagName => {
    let URL = `${apiURL}/tags/`
    return axios
      .post(
        URL,
        { name: tagName },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      )
      .then(response => {
        return response.data
      })
      .catch(error => {
        // Handle error.
        console.log(
          "An error occurred while deleting a message:",
          error.response
        )
      })
  }

  const changeTags = async tags => {
    // important to remember that the incoming arg "tags" is an array
    // of "resulting" tag names after the add/del operation

    if (tags.length < allCurrentTags.length) {
      const deletedTagName = allCurrentTags.filter(x => !tags.includes(x))[0]
      selectedMessages.forEach(selectedMsg => {
        displayedMessages.forEach(async displayedMsg => {
          if (displayedMsg.id === selectedMsg) {
            const dmTagNames = displayedMsg.tags.map(tag => tag.name)
            if (dmTagNames.includes(deletedTagName)) {
              // console.log(`Deleting ${deletedTagName} from ${selectedMsg}`)
              let message = await getMessageFromID(selectedMsg)
              await deleteTagFromMessage(message[0], deletedTagName)
              update()
              Swal.fire(`Tag deleted: ${deletedTagName}`)
            }
          }
        })
      })
    } else {
      // console.log(`Added A Tag`, tags, allCurrentTags)
      const addedTagName = tags.filter(x => !allCurrentTags.includes(x))[0]
      if (!addedTagName) {
        return
      }
      const tagExists = await getTagFromName(addedTagName)

      if (tagExists.length) {
        // console.log("Tag Exists")
        selectedMessages.forEach(selectedMsg => {
          displayedMessages.forEach(async displayedMsg => {
            if (displayedMsg.id === selectedMsg) {
              // console.log("add tag", displayedMsg)
              let message = await getMessageFromID(selectedMsg)
              await applyTagToMessage(message[0], addedTagName)
              update()
            }
          })
        })
        Swal.fire(`Tag added: ${addedTagName}`)
      } else {
        // console.log("Tag does not exist")
        await createTagFromName(addedTagName)
        selectedMessages.forEach(selectedMsg => {
          displayedMessages.forEach(async displayedMsg => {
            if (displayedMsg.id === selectedMsg) {
              // console.log("add tag", displayedMsg)
              let message = await getMessageFromID(selectedMsg)
              await applyTagToMessage(message[0], addedTagName)
              update()
            }
          })
        })
        Swal.fire(`Tag added: ${addedTagName}`)
      }
    }
    // update tags in the tagging window
    setCurrentTags(tags)
  }

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
        changeTags={changeTags}
      />

      {displayedMessages.length > 0 && (
        <S.P>
          <S.Info>
            Showing {isLimited ? "first" : "all"} {renderedMessages.length}{" "}
            messages{" "}
            {isLimited && <span>(out of {displayedMessages.length})</span>}
          </S.Info>
        </S.P>
      )}

      <S.List>
        {renderedMessages.map((message, i, arr) => {
          const prevMessage = arr[i - 1]
          // let attachedMedia = null

          // if (media.length) {
          //   media.forEach(jpeg => {
          //     if (message.message.includes(jpeg.name)) {
          //       attachedMedia = jpeg
          //     }
          //   })
          // }

          return (
            <Message
              key={message.id}
              // eslint-disable-line react/no-array-index-key
              tags={message.tags.map(tag => tag.name)}
              //only displaying tag names in the frontend
              selectedMessages={selectedMessages}
              selected={message.selected}
              onselect={updateSelectedMessages}
              message={message}
              color={colorMap[message.author]}
              isActiveUser={activeUser === message.author}
              sameAuthorAsPrevious={
                prevMessage && prevMessage.author === message.author
              }
            />
          )
        })}
      </S.List>
    </S.Container>
  )
}
export default React.memo(MessageViewer)
