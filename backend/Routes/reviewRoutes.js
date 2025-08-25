// routes/orderRoutes.js
const express = require("express");
const multer = require("multer");
const reviewController = require("../controllers/reviewController");

const router = express.Router();

// Multer setup
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, "ReviewUploads/"),
  filename: (req, file, cb) => cb(null, Date.now() + "-" + file.originalname),
});
const upload = multer({ storage });

router.post(
  "/:orderId/review",
  upload.fields([
    { name: "labelImage", maxCount: 1 },
    { name: "orderImages", maxCount: 2 },
  ]),
  reviewController.saveReview
);

router.get("/:orderId/review", reviewController.getReviewByOrderId);

module.exports = router;
