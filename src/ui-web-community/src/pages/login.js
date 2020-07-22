import React from "react"
import Login from "../components/app/Login"
// import DefaultLayout from "../components/default-layout"
import { primaryNav, footerItems } from "../config/options"
import { AppShellUnauthenticated } from "@bit/tattle-tech.core-ui.app-shell"

const LoginPage = ({ location }) => {
  const { state: routeState } = location
  const redirect = !routeState
    ? "/app"
    : routeState.redirect === "app"
    ? "/app"
    : `/app/${routeState.redirect}`

  return (
    <AppShellUnauthenticated
      headerLabel={"Whatsapp Scraper"}
      headerTarget={"/"}
      footerItems={footerItems}
      primaryNav={primaryNav}
      expandCenter={true}
      showNav={false}
    >
      <Login redirect={redirect} />
    </AppShellUnauthenticated>
  )
}

export default LoginPage
