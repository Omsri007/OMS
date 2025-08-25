// models/orderModel.js
const mongoose = require('mongoose');
const { getordersDB } = require('../config/db');

const orderSchema = new mongoose.Schema({
  orderId: {
    type: String,
    required: true,
    unique: true,
  },
  orderDate: {
    type: Date,
    required: false,
  },
  orderTimeStamp: {
    type: String,
  },
  oldItemStatus: {
    type: String,
    default: '',
  },
  buybackCategory: {
    type: String,
  },
  partnerId: {
    type: Number,
    required: true,
  },
  partnerEmail: {
    type: String,
    lowercase: true,
    trim: true,
    match: [/.+\@.+\..+/, 'Please fill a valid email address'],
  },
  partnerShop: {
    type: String,
  },
  oldItemDetails: {
    type: String,
  },
  baseDiscount: {
    type: Number,
    default: 0,
  },
  deliveryFee: {
    type: Number,
    default: 0,
  },
  trackingId: {
    type: String,
  },
  deliveryDate: {
    type: Date,
    required: false,
  },
  deliveredWithOTP: {
    type: Boolean,
    default: false,
  },

  // ✅ Action status fields
  actionStatus: {
    type: String,
    enum: ["received", "not_received", "review", null],
    default: null,
  },
  locked: {
    type: Boolean,
    default: false,
  },

}, { timestamps: true });

// Export a function to bind model to a DB connection
module.exports = (ordersDB) => {
  return ordersDB.model('Order', orderSchema);
};  
