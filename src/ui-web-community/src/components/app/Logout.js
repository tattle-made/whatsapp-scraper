import React from "react"
import useAuth from "../hooks/useAuth"
import { navigate } from "gatsby"

const Logout = ({ redirect }) => {
  const { state, logout } = useAuth()
  if (state.jwt) {
    logout()
  }
  return <p>Logged out</p>
}
export default Logout
