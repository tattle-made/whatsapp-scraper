import React from "react"
import { navigate } from "gatsby"
import useAuth from "../hooks/useAuth"
const Dashboard = () => {
  const { state, logout } = useAuth()

  console.log(state.jwt)
  return (
    <>
      <h1>Dashboard</h1>
      <p>This is a protected Dashboard</p>
    </>
  )
}

export default Dashboard
