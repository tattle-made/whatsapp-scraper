import React, { useEffect, useState } from "react"
import { Box, Grommet, Button } from "grommet"
import axios from "axios"
import styled from "styled-components"
import TattleTheme from "../atomic/theme"
import { Link } from "gatsby"

async function getGroups(token) {
  return axios
    .get("http://localhost:1337/whatsapp-groups/", {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
    .then(response => {
      // Handle success.
      // console.log("Data: ", response.data)
      return response.data
    })
    .catch(error => {
      // Handle error.
      console.log("An error occurred:", error.response)
    })
}

const Dashboard = () => {
  const token = sessionStorage.getItem("jwt")
  const [groups, setGroups] = useState([])
  useEffect(() => {
    async function getWAGroups() {
      const groups = await getGroups(token)
      setGroups(groups)
    }
    getWAGroups()
  }, [token])

  const Group = styled.div`
    border: 2px solid;
    border-radius: 10px;
    padding: 10px;
  `

  const GroupContainer = styled.div`
    display: flex;
    flex-direction: row;
    flex-wrap: wrap;
    height: 80%;
  `

  return (
    <Grommet theme={TattleTheme}>
      <Box pad="medium">
        <h4>WhatsApp Scraper Dashboard</h4>
        {groups ? (
          <GroupContainer>
            {Object.keys(groups).map(group => (
              <Box pad="small" key={groups[group].id}>
                <Group>
                  <>{groups[group].name}</>
                  <br />
                  <>ID: {groups[group].id}</>
                  <br />
                  <>Created: {groups[group].created_at}</>
                  <br />
                  <>Updated: {groups[group].updated_at}</>
                  <br />
                  <>Messages: {groups[group].messages.length}</>
                  <br />
                  <Button>
                    <Link to={`/app/messages/?gid=${groups[group].id}`}>
                      Edit Messages
                    </Link>
                  </Button>
                </Group>
              </Box>
            ))}
          </GroupContainer>
        ) : null}
      </Box>
    </Grommet>
  )
}

export default Dashboard
