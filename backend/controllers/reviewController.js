// controllers/reviewController.js
const getReviewModel = require("../models/reviewModel");

exports.saveReview = async (req, res) => {
  try {
    const Review = getReviewModel();  // ✅ get model at runtime
    const { orderId } = req.params;
    const { reason, remarks } = req.body;

    const labelImage = req.files["labelImage"]
      ? `/ReviewUploads/${req.files["labelImage"][0].filename}`
      : null;

    const orderImages = req.files["orderImages"]
      ? req.files["orderImages"].map(f => `/ReviewUploads/${f.filename}`)
      : [];

    const review = new Review({
      orderId,
      reason,
      remarks,
      labelImage,
      orderImages,
    });

    await review.save();
    res.json({ success: true, review });
  } catch (err) {
    console.error("Error saving review:", err);
    res.status(500).json({ error: "Server error" });
  }
};

exports.getReviewByOrderId = async (req, res) => {
  try {
    const Review = getReviewModel();  // ✅
    const { orderId } = req.params;
    const review = await Review.findOne({ orderId });
    if (!review) return res.status(404).json({ error: "No review found" });
    res.json(review);
  } catch (err) {
    console.error("Error fetching review:", err);
    res.status(500).json({ error: "Server error" });
  }
};
