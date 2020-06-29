const fs = require("fs");
const readline = require("readline");
const { google } = require("googleapis");
const fsx = require("fs-extra");
const GD = require("./google-drive");
const MessageParser = require("./messageParser");

// If modifying these scopes, delete token.json.
const SCOPES = ["https://www.googleapis.com/auth/drive"];
// The file token.json stores the user's access and refresh tokens, and is
// created automatically when the authorization flow completes for the first
// time.
const TOKEN_PATH = "token.json";

// Load client secrets from a local file.
fs.readFile("credentials.json", (err, content) => {
  if (err) return console.log("Error loading client secret file:", err);
  // Authorize a client with credentials, then call the Google Drive API.
  authorize(JSON.parse(content), main);
});

/**
 * Create an OAuth2 client with the given credentials, and then execute the
 * given callback function.
 * @param {Object} credentials The authorization client credentials.
 * @param {function} callback The callback to call with the authorized client.
 */
function authorize(credentials, callback) {
  const { client_secret, client_id, redirect_uris } = credentials.installed;

  const oAuth2Client = new google.auth.OAuth2(
    client_id,
    client_secret,
    redirect_uris[0]
  );

  // Check if we have previously stored a token.
  fs.readFile(TOKEN_PATH, (err, token) => {
    if (err) return getAccessToken(oAuth2Client, callback);
    oAuth2Client.setCredentials(JSON.parse(token));
    callback(oAuth2Client);
  });
}

/**
 * Get and store new token after prompting for user authorization, and then
 * execute the given callback with the authorized OAuth2 client.
 * @param {google.auth.OAuth2} oAuth2Client The OAuth2 client to get token for.
 * @param {getEventsCallback} callback The callback for the authorized client.
 */

function getAccessToken(oAuth2Client, callback) {
  const authUrl = oAuth2Client.generateAuthUrl({
    access_type: "offline",
    scope: SCOPES,
  });
  console.log("Authorize this app by visiting this url:", authUrl);
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  rl.question("Enter the code from that page here: ", (code) => {
    rl.close();
    oAuth2Client.getToken(code, (err, token) => {
      if (err) return console.error("Error retrieving access token", err);
      oAuth2Client.setCredentials(token);
      // Store the token to disk for later program executions
      fs.writeFile(TOKEN_PATH, JSON.stringify(token), (err) => {
        if (err) return console.error(err);
        console.log("Token stored to", TOKEN_PATH);
      });
      callback(oAuth2Client);
    });
  });
}

/**
 * Lists the names and IDs of up to 10 files.
 * @param {google.auth.OAuth2} auth An authorized OAuth2 client.
 *
 *  open readStream to .zip
 *  download all files
 *  extract all files
 *  https://developers.google.com/drive/api/v2/manage-revisions
 */

async function main(auth) {
  console.log("main");
  const drive = google.drive({ version: "v3", auth });
  GD.getFileNames(drive).then((fileNames) => {
    Promise.all([
      GD.processZipFiles(fileNames, drive),
      GD.processTxtFiles(fileNames, drive),
    ]).then((result) => {
      MessageParser.getFiles("./extracted").then((files) => {
        let textFiles = files.filter(
          (file) => file.includes(".txt") && !file.includes("/__MACOSX")
        );

        console.log(textFiles);
        textFiles.forEach((file, index) => {
          // console.log(`current: ${file}, \nnext: ${textFiles[index + 1]}\n\n`);
          //if text file found
          MessageParser.getJSON(file).then((messages) => {
            // get messages from txt file
            const jsonString = JSON.stringify(messages);
            // make it JSON
            if (jsonString !== []) {
              const fileName = "./JSON/" + file;
              let f = fileName
                .replace(fileName.substring(0, fileName.lastIndexOf("/")), "")
                .replace("/", "");

              let jsonFileName =
                "./JSON/" +
                f.replace(
                  ".txt",
                  "-" + MessageParser.getFormattedDate() + ".json"
                );

              // give the JSON file a timestamp
              // let jsonFileNameWithoutTimeStamp = f.replace(".txt", "");
              if (
                jsonFileName.startsWith("./JSON/._") ||
                jsonString === [] ||
                jsonString.length === 0
              ) {
                return;
              } else {
                MessageParser.ensureDir("./JSON/").then(() =>
                  MessageParser.getFiles("./JSON").then((files) => {
                    if (files.length) {
                      files.forEach((file) => {
                        fsx.remove(file).then(() => {
                          console.log(`Writing JSON to ${file}`);
                          MessageParser.writeToJsonFile(
                            jsonFileName,
                            jsonString,
                            false
                          );
                        });
                      });
                    } else {
                      // no files inside JSON folder, create some
                      console.log(`Writing JSON to ${jsonFileName}`);
                      MessageParser.writeToJsonFile(
                        jsonFileName,
                        jsonString,
                        false
                      );
                    }
                  })
                );
              }
            }
          });
        });
      });
    });
  });
}
