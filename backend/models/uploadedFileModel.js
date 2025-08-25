const mongoose = require('mongoose');

const uploadedFileSchema = new mongoose.Schema({
  filename: { type: String, required: true, unique: true },
  downloadedAt: { type: Date, default: null }, // initially null
});

module.exports = mongoose.model('UploadedFile', uploadedFileSchema);
