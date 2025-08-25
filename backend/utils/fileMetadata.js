// utils/fileMetadata.js
const fs = require("fs");
const path = require("path");

const metadataPath = path.join(__dirname, "../fileMetadata.json");

function readMetadata() {
  if (!fs.existsSync(metadataPath)) return {};
  return JSON.parse(fs.readFileSync(metadataPath, "utf8"));
}

function writeMetadata(data) {
  fs.writeFileSync(metadataPath, JSON.stringify(data, null, 2));
}

function setDownloadTimestamp(filename) {
    console.log("⏱️ Saving timestamp for:", filename);
  const metadata = readMetadata();
  if (!metadata[filename]) {
    metadata[filename] = new Date().toISOString();
    writeMetadata(metadata);
  }
}

function deleteMetadata(filename) {
  const metadata = readMetadata();
  if (metadata[filename]) {
    delete metadata[filename];
    writeMetadata(metadata);
  }
}

module.exports = {
  setDownloadTimestamp,
  deleteMetadata,
  readMetadata,
};
