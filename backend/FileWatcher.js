const chokidar = require("chokidar");
const path = require("path");
const { convertXlsxToJsonAndSave } = require("./controllers/orderController");
const { setDownloadTimestamp } = require("./utils/fileMetadata");

const uploadsDir = path.join(__dirname, "uploads");

let processingQueue = [];
let isProcessing = false;

function enqueueFile(filename) {
  processingQueue.push(filename);
  processNext();
}

function processNext() {
  if (isProcessing || processingQueue.length === 0) return;

  const filename = processingQueue.shift();
  isProcessing = true;

  console.log(`🚀 Starting processing for: ${filename}`);

  try {
    setDownloadTimestamp(filename);
  } catch (err) {
    console.error(`❌ Failed to set timestamp for ${filename}:`, err);
  }

  const req = { body: { filename } };

  // Mock a minimal Express-like response object
  const res = {
    status: (statusCode) => ({
      json: (message) => {
        console.log(`Status ${statusCode}:`, message);
        isProcessing = false;
        processNext();
      },
    }),
    send: (message) => {
      console.log(`Send:`, message);
      isProcessing = false;
      processNext();
    },
    end: () => {
      console.log(`End response for ${filename}`);
      isProcessing = false;
      processNext();
    },
  };

  try {
    convertXlsxToJsonAndSave(req, res, true);
  } catch (err) {
    console.error(`❌ Error processing ${filename}:`, err);
    isProcessing = false;
    processNext();
  }
}

// Watch the 'uploads' directory for new files
const watcher = chokidar.watch(uploadsDir, {
  ignored: /^\./, // ignore hidden files (like .DS_Store)
  persistent: true,
  ignoreInitial: false, // process existing files on startup too
});

watcher
  .on("add", (filePath) => {
    const filename = path.basename(filePath);

    // ⛔ Skip unwanted files like .gitkeep
    if (filename === ".gitkeep") {
      console.log("⚠️ Skipping .gitkeep file");
      return;
    }

    console.log(`📥 File added: ${filePath}`);
    const ext = path.extname(filePath).toLowerCase();
    if (ext === ".xlsx" || ext === ".csv") {
      enqueueFile(filename);
    } else {
      console.log(`⚠️ Ignored non-data file: ${filename}`);
    }
  })
  .on("ready", () => {
    console.log("✅ File watcher is ready and monitoring uploads...");
  })
  .on("error", (err) => {
    console.error("❌ Watcher error:", err);
  });

console.log("👀 Watching for new files in the uploads directory...");

module.exports = {};
