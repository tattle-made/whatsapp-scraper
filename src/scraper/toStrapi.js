const fsx = require("fs-extra");
const MessageParser = require("./messageParser");
const axios = require("axios");
require("dotenv").config();

let token = null;

async function createMessage(token, payload) {
  // MESSAGE SCHEMA
  // {
  //     "content":"this is some 4 content",
  //     "tags":[1],
  //     "whatsapp_group":2
  // }

  const { data } = await axios({
    method: "POST",
    url: process.env.STRAPI_URL + "/messages/",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    data: payload,
  });
  console.log(data);
}

async function createTag(token, payload) {
  // TAG SCHEMA
  //   {
  //     "name": "tag"
  //   }

  const { data } = await axios({
    method: "POST",
    url: process.env.STRAPI_URL + "/whatsapp-groups/",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    data: payload,
  });
  console.log(data);
}

async function updateGroupWithMessages(id, token, payload) {
  const { data } = await axios({
    method: "PUT",
    url: process.env.STRAPI_URL + `/whatsapp-groups/${id}`,
    headers: {
      Authorization: `Bearer ${token}`,
    },
    data: { messages: payload },
  });

  return data;
}

async function createGroup(token, payload) {
  // GROUP SCHEMA
  // {
  //     "name":"testGroup2",
  //     "messages":[3,4]
  // }

  const { data } = await axios({
    method: "POST",
    url: process.env.STRAPI_URL + "/whatsapp-groups/",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    data: payload,
  });

  return data;
}

async function createMessage(token, payload) {
  //  {
  //     date: '2020-02-01T15:12:00.000Z',
  //     author: '+91 80088 86380',
  //     message: '<Media omitted>'
  //   }

  const { data } = await axios({
    method: "POST",
    url: process.env.STRAPI_URL + "/messages/",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    data: payload,
  });

  return data;
}

async function getGroups(token) {
  axios
    .get(process.env.STRAPI_URL + "/whatsapp-groups/", {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
    .then((response) => {
      // Handle success.
      console.log("Data: ", response.data);
    })
    .catch((error) => {
      // Handle error.
      console.log("An error occurred:", error.response);
    });
}

async function getAuthToken() {
  try {
    return axios
      .post(`${process.env.STRAPI_URL}/auth/local`, {
        identifier: process.env.STRAPI_USER,
        password: process.env.STRAPI_PASSWORD,
      })
      .then((response) => {
        // Handle success.
        console.log("Authorised!");
        // console.log("User profile", response.data.user);
        // console.log("User token", response.data.jwt);
        return response.data.jwt;
      })
      .catch((error) => {
        // Handle error.
        console.log("An error occurred:", error.response);
      });
  } catch (error) {
    console.error(error);
  }
}

async function deleteAllMessages(token) {
  axios
    .get(process.env.STRAPI_URL + "/messages/?_start=0&_limit=-1", {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
    .then((response) => {
      // Handle success.
      //   console.log("Data: ", response.data);
      response.data.forEach((r) => {
        axios({
          method: "DELETE",
          url: process.env.STRAPI_URL + `/messages/${r.id}`,
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        console.log(`Deleted message ${response.id}`);
      });
    })
    .catch((error) => {
      // Handle error.
      console.log("An error occurred:", error.response);
    });
}

async function del() {
  token = await getAuthToken();
  deleteAllMessages(token);
}

async function main() {
  console.log("Uploading JSON to strapi");
  if (fsx.pathExistsSync("./JSON")) {
    console.log("JSON folder exists");
    token = await getAuthToken();

    MessageParser.getFiles("./JSON").then(async (files) => {
      if (files.length && token) {
        // ADD GROUPS

        // const groups = await getGroups(token);
        files.forEach(async (file) => {
          const messages = fsx.readJsonSync(file);

          //Check if group exists already

          // if (groups) {
          //   groups.forEach((group) => console.log(group.name));
          // }
          // [
          //   {
          //     "id": 17,
          //     "name": "Against NRC CAA NPR",
          //     "created_at": "2020-07-20T11:28:50.918Z",
          //     "updated_at": "2020-07-20T11:28:50.918Z",
          //     "messages": []
          //   },
          //   {
          //     "id": 18,
          //     "name": "AutoProctor UI",
          //     "created_at": "2020-07-20T11:28:51.056Z",
          //     "updated_at": "2020-07-20T11:28:51.056Z",
          //     "messages": []
          //   },
          //   {
          //     "id": 19,
          //     "name": "Covid Updates",
          //     "created_at": "2020-07-20T11:28:51.097Z",
          //     "updated_at": "2020-07-20T11:28:51.097Z",
          //     "messages": []
          //   },
          //   {
          //     "id": 20,
          //     "name": "Srisindia Live AsandraBBK",
          //     "created_at": "2020-07-20T11:28:51.127Z",
          //     "updated_at": "2020-07-20T11:28:51.127Z",
          //     "messages": []
          //   }
          // ]

          // CREATE NEW GROUP

          let front = "json/whatsapp chat with ".length;

          let group = {
            name: file.substring(front, file.length - 25),
          };

          const newGroup = await createGroup(token, group);
          console.log(newGroup);

          // // CREATE MESSAGES
          if (newGroup.id !== null) {
            messages.forEach(async (message) => {
              const payloadMessage = {
                content: message.message,
                date: message.date,
                author: message.author,
                whatsapp_group: newGroup.id,
                tags: [],
              };

              const newMessage = await createMessage(token, payloadMessage);
              console.log(newMessage);
            });
          }
        });
      }
    });
  } else {
    console.log(
      "Could not find extracted data in the current directory. Please run the scraper again."
    );
  }
}

main();
// del();
