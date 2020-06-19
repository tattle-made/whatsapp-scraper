const fs = require("fs");
const readline = require("readline");
const jszip = require("jszip");
const { google } = require("googleapis");

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
  authorize(JSON.parse(content), listFiles);
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

// get a folderId
// service.files.list({auth: auth,
//     resource: { parents: [ folderId ] },
//     q: "tattle-wa-scraper",
//     fields: '*',
//     spaces: 'drive',
//     pageToken: pageToken,
//     auth: auth
//   }

function getZipFileNames(drive) {
  return drive.files
    .list({ pageSize: 10, fields: "nextPageToken, files(id, name)" })
    .then((files) => files.data.files)
    .catch((err) => console.log("error : ", err));
}

function listFiles(auth) {
  const drive = google.drive({ version: "v3", auth });
  const fileId = "1_tCKjPYcjIfnloGiF318bbwUl7yI7u6U";
  var dest = fs.createWriteStream("/tmp/whatsapp_dump.zip");

  getZipFileNames(drive).then((fileNames) => {
    console.log("do something with filenames");
    console.log(fileNames);
  });

  // drive.files
  //   .get({
  //     fileId: fileId,
  //     alt: "media",
  //   })
  //   .then((res) => {
  //     console.log(">", res);
  //   });
}

//   if (zipFileNames.length > 0) {
//     console.log("here");
//     console.log(zipFileNames);
//   }

//   console.log(res.data);
// is the file

// .on("end", function () {
//     console.log("Done");
// })
// .on("error", function (err) {
//     console.log("Error during download", err);
// })
// .pipe(dest);
