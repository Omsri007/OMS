const chokidar = require('chokidar');
const path = require('path');
const fs = require('fs');
const { convertXlsxToJsonAndSave } = require('./controllers/orderController');
const { setDownloadTimestamp } = require('./utils/fileMetadata');

const uploadsDir = path.join(__dirname, 'uploads');

let processingQueue = [];
let isProcessing = false;
let batchFiles = new Set();
let batchTimer = null;

function enqueueFiles(filenames) {
  processingQueue.push(...filenames);
  processNext();
}

function processNext() {
  if (isProcessing || processingQueue.length === 0) return;

  const filename = processingQueue.shift();
  isProcessing = true;

  console.log(`🚀 Starting processing for: ${filename}`);
  setDownloadTimestamp(filename); // ✅ timestamp saved when processing starts

  const req = { body: { filename } };
  const res = {
    status: (statusCode) => ({
      json: (message) => {
        console.log(`Status ${statusCode}:`, message);
        console.log(`✅ Finished processing: ${filename}`);

        isProcessing = false;
        processNext(); // Move to next in queue
      }
    })
  };

  convertXlsxToJsonAndSave(req, res, true);
}

// ✅ Check file size stops changing
function waitForFileComplete(filePath, callback) {
  let lastSize = -1;

  const interval = setInterval(() => {
    try {
      const { size } = fs.statSync(filePath);

      if (size === lastSize) {
        clearInterval(interval);
        callback();
      } else {
        lastSize = size;
      }
    } catch (err) {
      console.error(`❌ Error checking file size for ${filePath}:`, err.message);
    }
  }, 500);
}

// ✅ Handle batch logic
function scheduleBatchProcessing() {
  if (batchTimer) clearTimeout(batchTimer);

  // Wait 5 seconds after last file arrives to assume batch complete
  batchTimer = setTimeout(() => {
    const filesToProcess = Array.from(batchFiles);
    batchFiles.clear();

    if (filesToProcess.length > 0) {
      console.log(`📦 Batch complete. Enqueuing ${filesToProcess.length} files...`);
      enqueueFiles(filesToProcess);
    }
  }, 5000);
}

// ✅ Watch uploads directory
const watcher = chokidar.watch(uploadsDir, {
  ignored: /^\./,
  persistent: true
});

watcher.on('add', (filePath) => {
  console.log(`📥 File added: ${filePath}`);

  const ext = path.extname(filePath).toLowerCase();
  if (ext === '.xlsx' || ext === '.csv') {
    waitForFileComplete(filePath, () => {
      const filename = path.basename(filePath);
      console.log(`✅ File ready: ${filename}`);
      batchFiles.add(filename);  // add to batch
      scheduleBatchProcessing(); // reset batch timer
    });
  }
});

console.log('👀 Watching for new files in the uploads directory...');

module.exports = {};
