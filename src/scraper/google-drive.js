const AdmZip = require("adm-zip");
const md5File = require("md5-file");
const { resolve } = require("path");
const fsx = require("fs-extra");
const fs = require("fs");
const path = require("path");
const { google } = require("googleapis");

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
    .list({
      pageSize: 1000,
      fields: "nextPageToken, files(id, name, trashed, explicitlyTrashed)",
      spaces: "drive",
      q: "name contains 'Whatsapp'",
    })

    .then((files) => files.data)
    .catch((err) => console.log("error : ", err));
}

async function downloadFiles(file, drive, verbose) {
  // TODO : Skip if already downloaded
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
            verbose && console.log(`\nDone downloading ${file.name}`);
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
              verbose && process.stdout.write(`Downloaded ${progress} bytes`);
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
        return new Promise((resolve, reject) => {
          downloadFiles(file, drive, true).then((r) => {
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
                console.log(`extracted ${unzipDirPath}`);
                resolve(unzipDirPath);
              })
              .catch((err) => console.error(err));
          });
        });
      }
    })
  );
}

async function moveTxtFilesToFolder(src, dest) {
  // console.log("mtf", src, dest);
  fsx
    .move(src, dest, { overwrite: true })
    .then(() => console.log("moved .txt file to its own folder"))
    .catch((err) => console.error(err));
}

async function processTxtFiles(fileNames, drive) {
  return Promise.all(
    fileNames.files.map(function (file) {
      if (file.name.includes(".txt")) {
        //do something with txt files ie exported messages without media
        return new Promise((resolve, reject) => {
          downloadFiles(file, drive, true).then((fileName) => {
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
                moveTxtFilesToFolder(src, dest);
              }
            } catch (err) {
              console.error(err);
            }
            resolve("ok");
          });
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

function cleanUp(path) {
  console.log("cleaning Up");

  if (fs.existsSync(path)) {
    return fsx.remove(path);
  }
}

exports.getFileNames = getFileNames;
exports.processZipFiles = processZipFiles;
exports.processTxtFiles = processTxtFiles;
exports.cleanUp = cleanUp;
exports.ensureDirectoryExistence = ensureDirectoryExistence;
