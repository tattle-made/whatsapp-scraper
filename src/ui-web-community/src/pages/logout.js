import React from "react"
import Logout from "../components/app/Logout"
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
      <h1>Logging out</h1>
      <div>
        <Logout redirect={redirect} />
      </div>
    </DefaultLayout>
  )
}

export default LoginPage
