const express = require("express");
const router = express.Router();
const { getOrdersDB } = require("../config/db"); // Use OrdersDB

// GET /api/reviews/filter?reason=returned_accepted&page=1&limit=50&otherFilters
router.get("/filter", async (req, res) => {
  try {
    const reason = req.query.reason;
    const page = parseInt(req.query.page || "1", 10);
    const limit = parseInt(req.query.limit || "50", 10);

    const ordersDB = getOrdersDB();
    const Review = ordersDB.collection("reviews");
    const Orders = ordersDB.collection("orders");

    // 1️⃣ Build dynamic filter excluding pagination params
    const otherFilters = { ...req.query };
    delete otherFilters.reason;
    delete otherFilters.page;
    delete otherFilters.limit;

    // Convert empty strings to undefined
    Object.keys(otherFilters).forEach((key) => {
      if (!otherFilters[key]) delete otherFilters[key];
    });

   // 2️⃣ Find reviews matching reason (if provided) OR all
const reviewQuery = reason ? { reason } : {};
const reviews = await Review.find(reviewQuery).toArray();

if (!reviews.length) return res.json({ orders: [], hasMore: false });

const orderIds = reviews.map((r) => r.orderId);

    // 3️⃣ Find orders matching these orderIds and other filters
    const filterQuery = { 
  orderId: { $in: orderIds }, 
  actionStatus: "review",   // ✅ Only review orders
  ...otherFilters 
};

    const totalOrders = await Orders.countDocuments(filterQuery);

    const orders = await Orders.find(filterQuery)
      .skip((page - 1) * limit)
      .limit(limit)
      .toArray();

    // 4️⃣ Merge reviews into orders
    const result = orders.map((order) => {
      const review = reviews.find((r) => r.orderId === order.orderId);
      return {
        ...order,
        review: review || null,
      };
    });

    res.json({ orders: result, hasMore: totalOrders > page * limit });
  } catch (err) {
    console.error("❌ Error filtering reviews:", err);
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;
