import React from "react"
import useAuth from "../hooks/useAuth"

const Logout = ({ redirect }) => {
  const { state, logout } = useAuth()

  if (state.jwt) {
    console.log(state)
    logout()
  }

  return <p>Logged out</p>
}
export default Logout
