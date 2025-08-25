const express = require("express");
const router = express.Router();
const path = require("path");
const fs = require("fs");

const {
  deleteMetadata,
  readMetadata,
} = require("../utils/fileMetadata");

// GET all uploaded files + timestamps
router.get('/', (req, res) => {
  const uploadsDir = path.join(__dirname, '..', 'uploads'); // adjust if needed
  const metadataPath = path.join(__dirname, '..', 'fileMetadata.json');

  try {
    const files = fs.readdirSync(uploadsDir).filter(f => f !== '.DS_Store'); // skip unwanted files
    const metadata = fs.existsSync(metadataPath)
      ? JSON.parse(fs.readFileSync(metadataPath, 'utf-8'))
      : {};

    res.json({
      files,
      timestamps: metadata, // key: filename, value: ISO string or timestamp
    });
  } catch (error) {
    console.error("Error reading uploads:", error);
    res.status(500).json({ error: "Could not read uploaded files" });
  }
});

// // 👇 Preview endpoint only (not downloading)
// router.get('/preview/:filename', (req, res) => {
//   const filename = req.params.filename;
//   const filePath = path.join(__dirname, "../uploads", filename);

//   if (fs.existsSync(filePath)) {
//     res.sendFile(filePath); // 📄 Just sends file without marking as "downloaded"
//   } else {
//     res.status(404).send("File not found");
//   }
// });

// Delete file
router.delete('/:filename', (req, res) => {
  const filename = req.params.filename;
  const filePath = path.join(__dirname, "../uploads", filename);

  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
    deleteMetadata(filename);
    res.sendStatus(200);
  } else {
    res.status(404).send("File not found");
  }
});

module.exports = router;
