import React from "react"
import Logout from "../components/app/Logout"
import Layout from "../components/layout"

const LoginPage = ({ location }) => {
  const { state: routeState } = location
  const redirect = !routeState
    ? "/app"
    : routeState.redirect === "app"
    ? "/app"
    : `/app/${routeState.redirect}`

  return (
    <Layout>
      <h1>Logging out</h1>
      <div>
        <Logout redirect={redirect} />
      </div>
    </Layout>
  )
}

export default LoginPage
