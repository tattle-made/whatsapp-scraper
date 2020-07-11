import React, { useEffect } from "react"
import { navigate } from "gatsby"
import { Router } from "@reach/router"
import Layout from "../components/layout"
import Navigation from "../components/app/Navigation"
import Dashboard from "../components/app/Dashboard"
import Account from "../components/app/Account"
import useAuth from "../components/hooks/useAuth"
import Logout from "../components/app/Logout"
const App = ({ location }) => {
  const { state, isAuthenticated } = useAuth()
  const redirect = location.pathname.split("/").pop()
  //is everything after the last / in URL

  useEffect(() => {
    if (!isAuthenticated) {
      console.log(state)
      // redirect to login if not logged in
      navigate("/login", { state: { redirect } })
    }
  }, [isAuthenticated, redirect])

  return (
    <Layout>
      <Navigation />
      <Router basepath="/app">
        <Dashboard default />
        <Account path="/account" />
        <Logout path="/logout" />
      </Router>
    </Layout>
  )
}
export default App
