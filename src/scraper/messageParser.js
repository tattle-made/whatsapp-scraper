//requiring path and fs modules
const path = require("path");
const fs = require("fs");
//joining path of directory

function initMessageParser() {
  const directoryPath = path.join(__dirname, "extracted");
  //passsing directoryPath and callback \  +"0"
  fs.readdir(directoryPath, function (err, files) {
    //handling error
    if (err) {
      return console.log("Unable to scan directory: " + err);
    }
    //listing all files using forEach
    files.forEach(function (file) {
      // Do whatever you want to do with the file
      console.log(file);
    });
  });
}

module.exports = initMessageParser;
