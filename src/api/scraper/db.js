#!/usr/bin/env node

const fsx = require("fs-extra");
const MessageParser = require("./messageParser");
const axios = require("axios");
const chalk = require("chalk");
require("dotenv").config();

let token = null;

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

async function getGroups(token) {
  return axios
    .get(process.env.STRAPI_URL + "/whatsapp-groups/", {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
    .then((response) => {
      // Handle success.
      return response.data;
    })
    .catch((error) => {
      // Handle error.
      console.log("An error occurred:", error.response);
    });
}

async function getGroupByName(groupName) {
  console.log("Trying to get group", groupName);
  return axios
    .get(process.env.STRAPI_URL + `/whatsapp-groups/?name=${groupName}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
    .then((response) => {
      // Handle success.
      return response.data;
    })
    .catch((error) => {
      // Handle error.
      console.log("An error occurred:", error.response);
    });
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
  }).catch((error) => {
    // Handle error.
    console.log("An error occurred:", error.response);
  });
  return data;
}

async function updateGroup(token, id, payload) {
  return axios({
    method: "put",
    url: process.env.STRAPI_URL + `/whatsapp-groups/${id}`,
    headers: {
      Authorization: `Bearer ${token}`,
    },
    data: payload,
  }).catch((error) => {
    // Handle error.
    console.log("An error occurred:", error.response);
  });
}

async function deleteGroup(id, token) {
  return axios({
    method: "DELETE",
    url: `${process.env.STRAPI_URL}/whatsapp-groups/${id}`,
    headers: {
      Authorization: `Bearer ${token}`,
    },
  }).catch((error) => {
    // Handle error.
    console.log("An error occurred:", error.response);
  });
}

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
  return data;
}

async function get500Messages(token) {
  const { data } = await axios({
    method: "GET",
    url: process.env.STRAPI_URL + "/messages?_start=0&_limit=500",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  return data;
}

async function deleteMessage(id, token) {
  return axios({
    method: "DELETE",
    url: process.env.STRAPI_URL + `/messages/${id}`,
    headers: {
      Authorization: `Bearer ${token}`,
    },
  }).catch((error) => {
    // Handle error.
    console.log("An error occurred:", error.response);
  });
}

async function deleteAllMessages(token) {
  console.log(chalk.blue("Delete Messages"));
  const messagesToDelete = await get500Messages(token);
  messagesToDelete.reduce((accumulatorPromise, r) => {
    return accumulatorPromise.then(() => {
      console.log(`Tattle Whatsapp Parser: Deleted message ${r.id}\r`);
      return deleteMessage(r.id, token);
    });
  }, Promise.resolve());
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

async function deleteAllGroups(token) {
  console.log(chalk.blue("Deleting the following groups: "));
  const groups = await getGroups(token);
  groups.reduce((accumulatorPromise, group) => {
    return accumulatorPromise.then(() => {
      return deleteGroup(group.id, token);
    });
  }, Promise.resolve());
}

async function uploadGroups() {
  console.log("Uploading found groups");
  if (fsx.pathExistsSync("./JSON")) {
    console.log("JSON folder exists");
    token = await getAuthToken();
    groups = await getGroups(token);
    groupNames = groups.map((g) => g.name);
    MessageParser.getFiles("./JSON").then(async (files) => {
      if (files.length && token) {
        // ADD GROUPS
        files.forEach(async (file) => {
          // Check if group exists already
          let front = "json/whatsapp chat with ".length;
          let group = {
            name: file.substring(front, file.length - 25),
          };
          if (groups.length) {
            if (!groupNames.includes(group.name)) {
              const newGroup = await createGroup(token, group);
              console.log(newGroup);
            } else {
              console.log(
                `A group by the name`,
                chalk.red(`${group.name}`),
                `already exists. ID = ${group.id}`
              );
            }
          } else {
            const newGroup = await createGroup(token, group);
            console.log(newGroup);
          }
        });
      }
    });
  }
}

async function uploadMessages() {
  console.log("Uploading all Messages");
  if (fsx.pathExistsSync("./JSON")) {
    console.log("JSON folder exists");
    token = await getAuthToken();
    groups = await getGroups(token);
    MessageParser.getFiles("./JSON").then(async (files) => {
      if (files.length && token) {
        // ADD GROUPS
        files.reduce((accumulatorPromise, file) => {
          return accumulatorPromise.then(async () => {
            const messages = fsx.readJsonSync(file);
            let front = "json/whatsapp chat with ".length;
            let groupName = file.substring(front, file.length - 25);
            const group = await getGroupByName(groupName);
            if (group[0].id !== undefined) {
              messages.reduce((accumulatorPromise, message) => {
                const payloadMessage = {
                  "content": message.message,
                  "date": message.date,
                  "author": message.author,
                  "whatsapp_group": group[0].id,
                  "tags": [],
                  "links": {
                    "links": [],
                  },
                  "hasLinks": false,
                  "media": null,
                };
                return accumulatorPromise
                  .then(async () => {
                    console.log(payloadMessage);
                    return createMessage(token, payloadMessage);
                  })
                  .catch((error) => {
                    // Handle error.
                    console.log("An error occurred:", error.response);
                  });
              }, Promise.resolve());
            }
          });
        }, Promise.resolve(groups));
      }
    });
  }
}

async function del() {
  token = await getAuthToken();
  deleteAllMessages(token);
}

async function main() {
  if (fsx.pathExistsSync("./JSON")) {
    console.log("JSON folder exists");
    token = await getAuthToken();

    MessageParser.getFiles("./JSON").then(async (files) => {
      if (files.length && token) {
        // ADD GROUPS
        // const groups = await getGroups(token);
        files.forEach(async (file) => {
          const messages = fsx.readJsonSync(file);
          // Check if group exists already
          // CREATE NEW GROUP

          let front = "json/whatsapp chat with ".length;

          let group = {
            name: file.substring(front, file.length - 25),
          };

          const newGroup = await createGroup(token, group);
          console.log(newGroup);

          if (newGroup.id !== null) {
            messages.reduce((accumulatorPromise, message) => {
              const payloadMessage = {
                content: message.message,
                date: message.date,
                author: message.author,
                whatsapp_group: newGroup.id,
                tags: [],
                links: { links: [] },
                hasLinks: false,
                media: null,
              };
              return accumulatorPromise.then(() => {
                return createMessage(token, payloadMessage);
              });
            }, Promise.resolve());
          }
        });
      }
    });
  } else {
    console.log(
      chalk.redBright(
        "Could not find extracted data in the current directory. Please run the scraper again."
      )
    );
  }
}

// Command Line Options
require("yargs")
  .command("$0", "default", (argv) => {
    console.log(
      "add args",
      chalk.greenBright(`u[pload] [--what?]`),
      "or",
      chalk.redBright(`d[elete] [--what?]`),

      chalk.blue(
        "\neg `node db.js d[elete] -msgs` OR `node db.js --help` for help on all commands."
      )
    );
  })
  .command(
    "upload [--what?]",
    "creates groups [-g], uploads msgs [-m]",
    {
      groups: {
        describe: "upload/create groups",
        alias: "g",
        demandOption: false,
      },
      msgs: {
        describe: "upload/create messages",
        alias: "m",
        demandOption: false,
      },
      all: {
        describe: "upload/create messages and groups",
        alias: "a",
        demandOption: false,
      },
    },
    async (argv) => {
      if (argv.msgs) {
        console.log(
          chalk.red(`Tattle Whatsapp Parser: `),
          chalk.green(`Uploading Messages!`)
        );
        uploadMessages();
      }

      if (argv.g) {
        console.log(
          chalk.red(`Tattle Whatsapp Parser: `),
          chalk.green(`Uploading Groups!`)
        );
        uploadGroups();
      }

      if (argv.a) {
        console.log(chalk.blue("Upload Groups"));
        uploadGroups();
        console.log(chalk.blue("Upload Messages"));
        uploadMessages();
      }
    }
  )
  .command(
    "delete [--what?]",
    "Delete all msgs [-m] and/or groups [-g] from db",
    {
      groups: {
        describe: "delete groups",
        alias: "g",
        demandOption: false,
      },
      msgs: {
        describe: "delete messages",
        alias: "m",
        demandOption: false,
      },
      all: {
        describe: "delete messages and groups",
        alias: "a",
        demandOption: false,
      },
    },
    async (argv) => {
      console.log(
        chalk.red(`Tattle Whatsapp Parser: `),
        chalk.blueBright(`Deleting Stored Data from Db!`),
        chalk.bgBlue.yellowBright(
          "\nYou might want to run this command a few times to delete all of the data."
        )
      );

      if (argv.msgs) {
        token = await getAuthToken();
        deleteAllMessages(token);
      }

      if (argv.g) {
        token = await getAuthToken();
        deleteAllGroups(token);
      }
      if (argv.a) {
        // default deletes everything
        token = await getAuthToken();
        deleteAllMessages(token);
        deleteAllGroups(token);
      }
    }
  )
  .help().argv;

module.exports = { main, del };
