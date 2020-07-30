import styled from "styled-components"

const Container = styled.div`
  padding: 2%;
  font-size: 0.8em;
  width: 90%;
  margin: 0 auto;
  @media (min-width: 700px) {
    padding: 2% 10%;
    position: -webkit-sticky; /* Safari */
    position: sticky;
  }
`

export { Container }
