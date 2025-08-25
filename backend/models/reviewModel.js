// models/reviewModel.js
const { getOrdersDB } = require("../config/db");
const mongoose = require("mongoose");

const reviewSchema = new mongoose.Schema({
  orderId: { type: String, required: true },
  reason: { type: String, required: true },
  remarks: { type: String },
  labelImage: { type: String },
  orderImages: [{ type: String }],
  createdAt: { type: Date, default: Date.now },
});

// ✅ Lazy model getter
let ReviewModel;

function getReviewModel() {
  if (!ReviewModel) {
    ReviewModel = getOrdersDB().model("Review", reviewSchema, "reviews");
  }
  return ReviewModel;
}

module.exports = getReviewModel;
