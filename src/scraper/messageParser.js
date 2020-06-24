const { promisify } = require("util");
const { resolve } = require("path");
const fs = require("fs");
const readdir = promisify(fs.readdir);
const stat = promisify(fs.stat);

// var whatsappMessagesParser = require("./wa-parser");
const whatsapp = require("whatsapp-chat-parser");

async function getJSON(file) {
  const fileContents = fs.readFileSync(file, "utf8");
  whatsapp
    .parseString(fileContents)
    .then((messages) => {
      // Do whatever you want with messages
      console.log(messages);
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
