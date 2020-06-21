const fs = require("fs");
const fsx = require("fs-extra");
const path = require("path");
const readline = require("readline");
const { google } = require("googleapis");
const AdmZip = require("adm-zip");
const md5File = require("md5-file");
const { resolve } = require("path");

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

function ensureDirectoryExistence(filePath) {
  var dirname = path.dirname(filePath);

  if (fs.existsSync(dirname)) {
    return true;
  }

  ensureDirectoryExistence(dirname);
  fs.mkdirSync(dirname);
}

function getFileNames(drive) {
  return drive.files
    .list({ pageSize: 10, fields: "nextPageToken, files(id, name)" })
    .then((files) => files.data)
    .catch((err) => console.log("error : ", err));
}

async function downloadFiles(file, drive) {
  return new Promise((resolve, reject) => {
    const filePath = `./downloaded/${file.name}`;
    ensureDirectoryExistence(filePath);
    const dest = fs.createWriteStream(filePath);
    let progress = 0;
    drive.files
      .get(
        {
          fileId: file.id,
          alt: "media",
        },
        { responseType: "stream" }
      )
      .then((res) => {
        res.data
          .on("end", () => {
            console.log(`\nDone downloading ${file.name}`);
            resolve(filePath);
          })
          .on("error", (err) => {
            console.error("Error downloading file.");
            reject(err);
          })
          .on("data", (d) => {
            progress += d.length;
            if (process.stdout.isTTY) {
              process.stdout.clearLine();
              process.stdout.cursorTo(0);
              process.stdout.write(`Downloaded ${progress} bytes`);
            }
          })
          .pipe(dest);
      })
      .then(() => resolve);
  });
}

async function processZipFiles(fileNames, drive) {
  return Promise.all(
    fileNames.files.map(function (file) {
      if (file.name.includes(".zip")) {
        downloadFiles(file, drive).then((r) => {
          md5File(r)
            .then((hash) => {
              return { fileName: r, hash: hash };
              // getting the checksum here, for version control
            })
            .then((res) => {
              const zip = new AdmZip(res.fileName);
              const unzipDirPath = `./extracted/${file.name}`;
              ensureDirectoryExistence(unzipDirPath);
              zip.extractAllTo(unzipDirPath, /*overwrite*/ true);
            })
            .then(() => resolve())
            .catch((err) => console.error(err));
        });
      }
    })
  );
}

async function processTxtFiles(fileNames, drive) {
  return Promise.all(
    fileNames.files.map(function (file) {
      if (file.name.includes(".txt")) {
        //do something with txt files ie exported messages without media
        downloadFiles(file, drive).then((fileName) => {
          try {
            if (fs.existsSync(fileName)) {
              //file exists
              let src = fileName;
              let folder = `${src.replace("./downloaded/", "")}`;
              folder = folder.replace(".txt", "");
              let dest = `./extracted/${folder}/${src.replace(
                "./downloaded/",
                ""
              )}`;

              fsx
                .move(src, dest)
                .then(() => console.log("moved .txt file to its own folder"))
                .catch((err) => console.error(err));
            }
          } catch (err) {
            console.error(err);
          }
        });
      }
    })
  );
}

function processFiles(auth) {
  const drive = google.drive({ version: "v3", auth });
  return new Promise((res, rej) => {
    getFileNames(drive).then(async (fileNames) => {
      processZipFiles(fileNames, drive);
      processTxtFiles(fileNames, drive);
    });
  });
}

function cleanUp() {
  console.log("cleanup");
}

async function main(auth) {
  console.log("main");
  processFiles(auth).then(() => console.log("cu"));
}
