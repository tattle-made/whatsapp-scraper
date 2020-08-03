const fsp = require("fs").promises;
const fs = require("fs");
const fsx = require("fs-extra");
const path = require("path");

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
  } catch (err) {
    console.error(err);
  }
}

async function getFiles(dir, files = []) {
  const listing = await fsp.readdir(dir, { withFileTypes: true });
  let dirs = [];
  for (let f of listing) {
    const fullName = path.join(dir, f.name);
    if (f.isFile()) {
      files.push(fullName);
    } else if (f.isDirectory()) {
      dirs.push(fullName);
    }
  }
  for (let d of dirs) {
    await getFiles(d, files);
  }
  return files;
}

exports.getFiles = getFiles;
exports.getJSON = getJSON;
exports.getFormattedDate = getFormattedDate;
exports.writeToJsonFile = writeToJsonFile;
exports.ensureDir = ensureDir;
