const chokidar = require('chokidar');
const path = require('path');
const fs = require('fs');
const https = require('https');
const http = require('http');
const { convertXlsxToJsonAndSave } = require('./controllers/orderController');
const { downloadGmailOrderFile } = require("./cron/downloadGmailOrderFile");
const { setDownloadTimestamp } = require('./utils/fileMetadata');

const uploadsDir = path.join(__dirname, 'uploads');

let processingQueue = [];
let isProcessing = false;

function enqueueFile(filename) {
  processingQueue.push(filename);
  processNext(); // Trigger queue processing
}

function processNext() {
  if (isProcessing || processingQueue.length === 0) return;

  const filename = processingQueue.shift();
  isProcessing = true;

  console.log(`🚀 Starting processing for: ${filename}`);
  setDownloadTimestamp(filename);

  const req = { body: { filename } };
  const res = {
    status: (statusCode) => ({
      json: (message) => {
        console.log(`Status ${statusCode}:`, message);

        // ✅ Done processing this file, move to the next
        isProcessing = false;
        processNext();
      }
    })
  };

  convertXlsxToJsonAndSave(req, res, true);
}

// Watch the 'uploads' directory for new files
const watcher = chokidar.watch(uploadsDir, {
  ignored: /^\./,
  persistent: true
});

watcher.on('add', (filePath) => {
  console.log(`📥 File added: ${filePath}`);

  const ext = path.extname(filePath).toLowerCase();
  if (ext === '.xlsx' || ext === '.csv') {
    const filename = path.basename(filePath);
    enqueueFile(filename); // 👈 Enqueue instead of direct call
  }
});

console.log('👀 Watching for new files in the uploads directory...');

module.exports = {
};
