const mongoose = require('mongoose');

const balanceSchema = new mongoose.Schema({
  to: { type: String, required: true, unique: true },
  subject: String,
  balance: String,
  lastUpdated: { type: Date, default: Date.now }
});

module.exports = (connection) => connection.model('Balance', balanceSchema);
