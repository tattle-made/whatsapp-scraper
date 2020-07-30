import React, { useState, useEffect } from "react"
import { Box } from "grommet"
import MessageViewer from "./MessageViewer/MessageViewer"
import axios from "axios"

//media, messages, limit, deleteMessages
const Account = () => {
  const [messages, setMessages] = useState([])

  useEffect(() => {
    let search = window.location.search
    let params = new URLSearchParams(search)
    let foo = params.get("gid")
    let url = `http://localhost:1337/messages/?whatsapp_group.id=${foo}&_limit=100`
    const token = sessionStorage.getItem("jwt")
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
        // Handle success.
        // console.log("Data: ", response.data)
        // let search = window.location.search
        // let params = new URLSearchParams(search)
        // let foo = params.get("gid")
        // let url = `http://localhost:1337/messages/?whatsapp_group.id=${foo}&_limit=100`
        // const token = sessionStorage.getItem("jwt")
        setMessages(response.data)
      })
      .catch(error => {
        // Handle error.
        console.log("An error occurred:", error.response)
      })
  }
  return (
    <Box pad="medium">
      <h4>Messages</h4>

      {messages ? (
        <MessageViewer messages={messages} />
      ) : (
        <p>Loading Messages...</p>
      )}
    </Box>
  )
}

export default Account
