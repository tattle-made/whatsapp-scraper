import React from "react"
import { Link } from "gatsby"
import { Nav } from "grommet"
<<<<<<< HEAD
import { Home, Services, Logout, ChatOption } from "grommet-icons"
=======
import { Home, Services, Logout } from "grommet-icons"
>>>>>>> upstream/master

export default () => (
  <Nav direction="row" pad="medium">
    <Link to="/app">
      <Home color="brand" />
    </Link>
<<<<<<< HEAD
    <Link to="/app/messages">
      <ChatOption color="brand" />
    </Link>
=======
>>>>>>> upstream/master
    <Link to="/app/account">
      <Services color="brand" />
    </Link>
    <Link to="/app/logout">
      <Logout color="brand" />
    </Link>
  </Nav>
)
