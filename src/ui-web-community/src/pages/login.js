import React from "react"
import Login from "../components/app/Login"
import DefaultLayout from "../components/default-layout"

const LoginPage = ({ location }) => {
  const { state: routeState } = location
  const redirect = !routeState
    ? "/app"
    : routeState.redirect === "app"
    ? "/app"
    : `/app/${routeState.redirect}`

  return (
    <DefaultLayout>
      <h1>Login</h1>
      <p>Please use your credentials to login</p>
      <div>
        <Login redirect={redirect} />
      </div>
    </DefaultLayout>
  )
}

export default LoginPage
