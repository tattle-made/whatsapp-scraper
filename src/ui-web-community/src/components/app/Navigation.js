import React from "react"
import { Link } from "gatsby"
import { Nav } from "grommet"
import { Home, Services, Logout } from "grommet-icons"

export default () => (
  <Nav direction="row" pad="medium">
    <Link to="/app">
      <Home color="brand" />
    </Link>
    <Link to="/app/account">
      <Services color="brand" />
    </Link>
    <Link to="/app/logout">
      <Logout color="brand" />
    </Link>
  </Nav>
)
