const { promisify } = require("util");
const { resolve } = require("path");
const fs = require("fs");
const fsx = require("fs-extra");
const readdir = promisify(fs.readdir);
const stat = promisify(fs.stat);
const jsonfile = require("jsonfile");
const GD = require("./google-drive");

// var whatsappMessagesParser = require("./wa-parser");
const whatsapp = require("whatsapp-chat-parser");

async function getJSON(file) {
  const fileContents = fs.readFileSync(file, "utf8");
  whatsapp
    .parseString(fileContents)
    .then((messages) => {
      // Do whatever you want with messages
      const jsonString = JSON.stringify(messages);
      if (jsonString !== []) {
        const fileName = "./JSON/" + file;
        if (fs.existsSync(fileName)) {
          // file already exists in JSON dir
          console.log("file exists");
          return true;
        } else {
          let f = fileName
            .replace(fileName.substring(0, fileName.lastIndexOf("/")), "")
            .replace("/", "")
            .replace(".txt", ".json");
          console.log(">>", f, "\n");

          let jsonFileName = "./JSON/" + f;

          fsx
            .outputFile(jsonFileName, jsonString)
            .then(() => {
              console.log("The file was saved!");
            })
            .catch((err) => {
              console.error(err);
            });
        }
      }
    })
    .catch((err) => {
      // Something went wrong
      console.error(err);
    });
}
async function getFiles(dir) {
  const subdirs = await readdir(dir);
  const files = await Promise.all(
    subdirs.map(async (subdir) => {
      const res = resolve(dir, subdir);
      return (await stat(res)).isDirectory() ? getFiles(res) : res;
    })
  );
  return files.reduce((a, f) => a.concat(f), []);
}

exports.getFiles = getFiles;
exports.getJSON = getJSON;
