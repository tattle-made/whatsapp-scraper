import React, { useState, useEffect } from "react"
import { Box } from "grommet"
import MessageViewer from "./MessageViewer/MessageViewer"
import axios from "axios"

const Account = () => {
  const [messages, setMessages] = useState([])
  let search = window.location.search
  let params = new URLSearchParams(search)
  let foo = params.get("gid")
  const apiURL = process.env.GATSBY_API_URL
  let url = `${apiURL}/messages/?whatsapp_group.id=${foo}&_limit=100`
  const token = sessionStorage.getItem("jwt")

  useEffect(() => {
    setMessages(getMessagesFromGroup(url, token))
  }, [setMessages])

  const getMessagesFromGroup = (url, token) => {
    return axios
      .get(url, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
      .then(response => {
        setMessages(response.data)
      })
      .catch(error => {
        // Handle error.
        console.log("An error occurred:", error.response)
      })
  }

  const update = () => {
    setMessages(getMessagesFromGroup(url, token))
  }

  return (
    <Box pad="medium">
      <h4>Messages</h4>

      {messages ? (
        <MessageViewer messages={messages} update={update} />
      ) : (
        <p>Loading Messages...</p>
      )}
    </Box>
  )
}

export default Account
