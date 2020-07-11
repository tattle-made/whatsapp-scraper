import React, { useEffect } from "react"
import useAuth from "../hooks/useAuth"

const Logout = ({ redirect }) => {
  const { logout } = useAuth()
  useEffect(() => {
    console.log("Logging out...")
    logout()
  })

  return <p>Logged out</p>
}
export default Logout
