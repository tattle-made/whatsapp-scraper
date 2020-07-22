import React from "react"
import { Box, Button } from "grommet"
import Swal from "sweetalert2"

const Account = () => (
  <Box pad="medium">
    <h4>Run Scraper to get latest data</h4>
    <Button
      primary
      style={{ width: "20%", padding: "5px", textAlign: "center" }}
      onClick={() => Swal.fire("Scraping...")}
    >
      Run Scraper
    </Button>
    <br />
    <Button
      primary
      style={{ width: "20%", padding: "5px", textAlign: "center" }}
      onClick={() => Swal.fire("Updating CMS...")}
    >
      Update CMS
    </Button>
  </Box>
)

export default Account
