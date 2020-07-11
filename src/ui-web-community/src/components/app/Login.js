import React, { useState } from "react"
import { navigate } from "gatsby"
import useAuth from "../hooks/useAuth"
import { TextInput, Box, Image, Button } from "grommet"
import { useStaticQuery, graphql } from "gatsby"

const Login = ({ redirect }) => {
  const { login } = useAuth()
  const [password, setPassword] = useState("admin@tattle")
  const [identifier, setIdentifier] = React.useState("admin")
  const [error, setError] = useState("")
  const logoFile = useStaticQuery(
    graphql`
      query {
        allFile(filter: { name: { eq: "project-logo" } }) {
          edges {
            node {
              publicURL
            }
          }
        }
      }
    `
  )

  const logoURL = logoFile.allFile.edges[0].node.publicURL

  const handleSubmit = async event => {
    event.preventDefault()
    try {
      const r = await login({ identifier, password })
      sessionStorage.setItem("jwt", r.jwt)
      navigate("/app/dashboard")
    } catch (e) {
      console.log("Error occurred during authentication")
      const {
        response: {
          data: {
            message: [
              {
                messages: [error],
              },
            ],
          },
        },
      } = e
      const { message: msg } = error
      setError(msg)
    }
  }

  return (
    <Box direction="row" pad="medium">
      <Box pad="medium">
        <h1>Login</h1>
        <p>Please use your credentials to login</p>
        <form
          onSubmit={handleSubmit}
          className="bg-white shadow-md rounded px-8 pt-6 pb-8 mb-4"
        >
          <div>
            <label htmlFor="username">Username</label>
            <TextInput
              placeholder="type here"
              value={identifier}
              onChange={event => setIdentifier(event.target.value)}
            />
          </div>
          <div>
            <label htmlFor="password">Password</label>
            <TextInput
              type="password"
              placeholder="type here"
              value={password}
              onChange={event => setPassword(event.target.value)}
            />
          </div>
          <Box pad="medium">
            <Button primary type="submit" label="Sign-In" />
          </Box>
        </form>
        {error.length > 1 && (
          <p className="text-center text-red-500 bg-red-200 border p-2">
            {error}
          </p>
        )}
      </Box>
      <Box width="medium">
        <Image fit="cover" src={logoURL} />
      </Box>
    </Box>
  )
}

export default Login
