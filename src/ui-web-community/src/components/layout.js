import React from "react"

import NavBar from "./nav-bar"

const Layout = ({ children }) => (
  <>
    <NavBar />
    {children}
  </>
)

export default Layout
