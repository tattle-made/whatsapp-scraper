import React, { useState, useRef, useEffect } from "react"
import { uuid } from "uuidv4"
import MessageViewer from "../MessageViewer/MessageViewer"
import * as S from "./style"
import useDebounce from "../../hooks/useDebounce"

const showError = (message, err) => {
  console.error(err || message) // eslint-disable-line no-console
  alert(message) // eslint-disable-line no-alert
}

let messagesHaveIds = false

const MessageEditor = () => {
  const [messages, setMessages] = useState([])
  const [media, setMedia] = useState([])

  const [messagesLimit, setMessagesLimit] = useState(100)
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  const closeButtonRef = useRef(null)
  const openButtonRef = useRef(null)
  const isFirstRender = useRef(true)

  const closeMenu = () => {
    setIsMenuOpen(false)
  }

  useEffect(() => {
    if (messages.length && !messagesHaveIds) {
      messages.forEach(message => {
        message.tags = []
        message.linksTo = []
        message.selected = false
        message.id = uuid()
      })

      messagesHaveIds = true
    }
  })

  useEffect(() => {
    if (isFirstRender.current) return
    if (isMenuOpen) closeButtonRef.current.focus()
    else openButtonRef.current.focus()
  }, [isMenuOpen])

  useEffect(() => {
    isFirstRender.current = false
  }, [])

  useEffect(() => {
    const keyDownHandler = e => {
      if (e.keyCode === 27) closeMenu()
    }

    document.addEventListener("keydown", keyDownHandler)
    return () => document.removeEventListener("keydown", keyDownHandler)
  }, [])

  return (
    <>
      <S.GlobalStyles />
      <S.Container>
        <MessageViewer
          media={media}
          messages={messages}
          limit={useDebounce(messagesLimit, 500)}
        />
        <S.MenuOpenButton type="button" onClick={openMenu} ref={openButtonRef}>
          Open menu
        </S.MenuOpenButton>
        <S.Overlay
          type="button"
          isActive={isMenuOpen}
          onClick={closeMenu}
          tabIndex="-1"
        />
        <S.Sidebar isOpen={isMenuOpen}>
          <S.MenuCloseButton
            type="button"
            onClick={closeMenu}
            ref={closeButtonRef}
          >
            Close menu
          </S.MenuCloseButton>
          <S.SidebarContainer>
            <S.Field>
              <S.Label htmlFor="limit">Messages limit</S.Label>
              <S.Input
                id="limit"
                type="number"
                min="0"
                max={messages.length}
                value={messagesLimit}
                onChange={e =>
                  setMessagesLimit(parseInt(e.currentTarget.value, 10))
                }
              />
              <S.InputDescription>
                A high number may freeze the page for a while, change this with
                caution
              </S.InputDescription>
            </S.Field>
          </S.SidebarContainer>
        </S.Sidebar>
      </S.Container>
    </>
  )
}

export default App
