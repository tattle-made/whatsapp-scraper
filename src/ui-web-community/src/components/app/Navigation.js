import React from "react"
import { Link } from "gatsby"

export default () => (
  <ul class="flex">
    <li class="mx-2 px-2">
      <Link to="/app">Dashboard</Link>
    </li>
    <li class="mx-2 px-2">
      <Link to="/app/account">Account</Link>
    </li>
  </ul>
)
