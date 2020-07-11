import React, { useEffect } from "react"
import { navigate } from "gatsby"
import useAuth from "../components/hooks/useAuth"
import DefaultLayout from "../components/default-layout"

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

  return <DefaultLayout></DefaultLayout>
}

export default IndexPage
