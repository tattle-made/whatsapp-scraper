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

function getFormattedDate() {
  var date = new Date();

  var month = date.getMonth() + 1;
  var day = date.getDate();
  var hour = date.getHours();
  var min = date.getMinutes();
  var sec = date.getSeconds();

  month = (month < 10 ? "0" : "") + month;
  day = (day < 10 ? "0" : "") + day;
  hour = (hour < 10 ? "0" : "") + hour;
  min = (min < 10 ? "0" : "") + min;
  sec = (sec < 10 ? "0" : "") + sec;

  var str =
    date.getFullYear() +
    "-" +
    month +
    "-" +
    day +
    "_" +
    hour +
    ":" +
    min +
    ":" +
    sec;

  /*alert(str);*/

  return str;
}

async function getJSON(file) {
  const fileContents = fs.readFileSync(file, "utf8");

  return whatsapp.parseString(fileContents).catch((err) => {
    // Something went wrong
    console.error(err);
  });
}

async function writeToJsonFile(file, data, del) {
  if (del) {
    try {
      fsx.remove(file).then(() => {
        fsx.outputFile(file, data);
      });
    } catch (err) {
      console.error(err);
    }
  } else {
    try {
      await fsx.outputFile(file, data);
    } catch (err) {
      console.error(err);
    }
  }
}

async function ensureDir(directory) {
  try {
    await fsx.ensureDir(directory);
    console.log("success!");
  } catch (err) {
    console.error(err);
  }
}

async function getFiles(dir) {
  const subdirs = await readdir(dir);
  const files = await Promise.all(
    subdirs.map(async (subdir) => {
      const res = resolve(dir, subdir);
      return (await stat(res)).isDirectory() && !subdir.startsWith("__")
        ? getFiles(res)
        : res;
    })
  );
  return files.reduce((a, f) => a.concat(f), []);
}

exports.getFiles = getFiles;
exports.getJSON = getJSON;
exports.getFormattedDate = getFormattedDate;
exports.writeToJsonFile = writeToJsonFile;
exports.ensureDir = ensureDir;
