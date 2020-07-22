import React, { useEffect } from "react"
import { navigate } from "gatsby"
import { Router } from "@reach/router"

import Navigation from "../components/app/Navigation"
import Dashboard from "../components/app/Dashboard"
import Account from "../components/app/Account"
import useAuth from "../components/hooks/useAuth"
import Logout from "../components/app/Logout"
import DefaultLayout from "../components/default-layout"
<<<<<<< HEAD
import Messages from "../components/app/Messages"
=======
>>>>>>> upstream/master

const App = ({ location }) => {
  const { state, isAuthenticated } = useAuth()
  const redirect = location.pathname.split("/").pop()
  //is everything after the last / in URL

  useEffect(() => {
    const token = sessionStorage.getItem("jwt")

    if (!token) {
      if (!isAuthenticated) {
        // redirect to login if not logged in
        navigate("/login", { state: { redirect } })
      }
    }
  }, [isAuthenticated, redirect, state])

  return (
    <DefaultLayout>
      <Navigation />
      <Router basepath="/app">
        <Dashboard default />
        <Account path="/account" />
        <Logout path="/logout" />
<<<<<<< HEAD
        <Messages path="/messages" />
=======
>>>>>>> upstream/master
      </Router>
    </DefaultLayout>
  )
}
export default App
