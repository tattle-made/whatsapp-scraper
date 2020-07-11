import React, { useEffect } from "react"
import { navigate } from "gatsby"
import useAuth from "../components/hooks/useAuth"
import Layout from "../components/layout"

const IndexPage = ({ location }) => {
  const { state, isAuthenticated } = useAuth()
  const redirect = location.pathname.split("/").pop()

  useEffect(() => {
    if (!isAuthenticated) {
      console.log(state)
      // redirect to login if not logged in
      navigate("/login", { state: { redirect } })
    }
  }, [isAuthenticated, redirect, state])

  return <Layout></Layout>
}

export default IndexPage
