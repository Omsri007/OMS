const express = require('express');
const router = express.Router();
const axios = require('axios');
const csv = require('csvtojson');
const fs = require('fs');
const multer = require("multer");
const path = require('path');
const orderController = require('../controllers/orderController');
const { getOrdersDB } = require('../config/db');
const { downloadGmailOrderFile } = require("../cron/downloadGmailOrderFile");

// Middleware to attach DB
router.use((req, res, next) => {
  const ordersDB = getOrdersDB();
  if (!ordersDB) {
    return res.status(500).json({ message: 'Orders database not connected' });
  }
  req.dbConnection = ordersDB;
  next();
});

// Save files to 'uploads' folder
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadsDir = path.join(__dirname, "..", "uploads");
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir);
    }
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueName = `${Date.now()}-${file.originalname}`;
    cb(null, uniqueName);
  },
});

const upload = multer({ storage });

// Route to accept file upload
router.post("/upload-file", upload.single("file"), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "No file uploaded." });
  }

  console.log("File saved:", req.file.filename);
  res.json({ message: "File uploaded successfully", filename: req.file.filename });
});

// Routes
router.route('/')
  .get(async (req, res) => {
    try {
      const db = req.dbConnection;
      const collection = db.collection('orders');

      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 50;
      const skip = (page - 1) * limit;

      // 🔍 FILTERS
      const {
        orderDate,
        oldItemStatus,
        buybackCategory,
        partnerId,
        partnerShop,
        trackingId,
        deliveryDate
      } = req.query;

      const query = {};

      if (orderDate) query.orderDate = new Date(orderDate);

      // ✅ Multiple status filter support
      if (oldItemStatus) {
        const statuses = oldItemStatus.split(",");
        query.oldItemStatus = { $in: statuses };
      }

      if (buybackCategory) query.buybackCategory = buybackCategory;
      if (partnerId) query.partnerId = parseInt(partnerId);
      if (partnerShop) query.partnerShop = partnerShop;
      if (trackingId) query.trackingId = trackingId;
      if (deliveryDate) query.deliveryDate = new Date(deliveryDate);

      const [orders, total] = await Promise.all([
        collection.find(query)
          .sort({ createdAt: -1 }) // Optional: sort newest first
          .skip(skip)
          .limit(limit)
          .toArray(),
        collection.countDocuments(query)
      ]);

      return res.status(200).json({
        orders,
        total,
        hasMore: skip + orders.length < total
      });
    } catch (error) {
      console.error('❌ Error fetching paginated orders:', error.message);
      return res.status(500).json({
        orders: [],
        total: 0,
        hasMore: false,
        message: 'Failed to fetch orders',
        error: error.message
      });
    }
  })
  .post(orderController.createOrder);


    // ✅ Status counts endpoint
router.get('/status-counts', async (req, res) => {
  try {
    const db = req.dbConnection;
    const collection = db.collection('orders');

    // 🔹 First, group by oldItemStatus
    const results = await collection.aggregate([
      {
        $group: {
          _id: "$oldItemStatus", // uppercase values in DB
          count: { $sum: 1 }
        }
      }
    ]).toArray();

    // 🔹 Then, get RECEIVED count from actionStatus
    const receivedCount = await collection.countDocuments({ actionStatus: "received" });

    // All possible statuses in uppercase
    const allStatuses = [
      "DELIVERED",
      "IN TRANSIT",
      "RECEIVED",       // this one will be overridden from actionStatus
      "ARRIVAL_SCAN",
      "TAT BREACH",
      "DNR",
      "FLAT-REFUND",
      "DECLINED",
      "CANCELLED",
      "STATUS NOT ASSIGNED",
      "PLACED"
    ];

    const counts = {};
    allStatuses.forEach(status => {
      if (status === "RECEIVED") {
        counts[status] = receivedCount; // ✅ From actionStatus
      } else {
        const found = results.find(r => r._id === status);
        counts[status] = found ? found.count : 0;
      }
    });

    res.status(200).json(counts);
  } catch (error) {
    console.error("❌ Error fetching status counts:", error.message);
    res.status(500).json({ error: "Failed to fetch status counts" });
  }
});

// 📊 Monthly summary (last 13 months)
router.get("/monthly-summary", async (req, res) => {
  try {
    const db = req.dbConnection;
    const collection = db.collection("orders");

    // =========================
    // 1. oldItemStatus summary
    // =========================
    const rawOldItemStatus = await collection.aggregate([
      {
        $match: {
          oldItemStatus: { $nin: ["DECLINED", "CANCELLED"] },
          orderDate: { $exists: true }
        }
      },
      {
        $group: {
          _id: {
            year: { $year: "$orderDate" },
            month: { $month: "$orderDate" },
            status: "$oldItemStatus"
          },
          count: { $sum: 1 }
        }
      }
    ]).toArray();

    const monthlyStatusMap = {};
    rawOldItemStatus.forEach(r => {
      const key = `${r._id.year}-${String(r._id.month).padStart(2, "0")}`;
      if (!monthlyStatusMap[key]) monthlyStatusMap[key] = {};
      monthlyStatusMap[key][r._id.status] = r.count;
    });

    // =========================
    // 2. actionStatus "received" summary
    // =========================
    const rawActionStatus = await collection.aggregate([
      {
        $match: {
          actionStatus: "received",
          orderDate: { $exists: true }
        }
      },
      {
        $group: {
          _id: {
            year: { $year: "$orderDate" },
            month: { $month: "$orderDate" }
          },
          count: { $sum: 1 }
        }
      }
    ]).toArray();

    const monthlyActionMap = {};
    rawActionStatus.forEach(r => {
      const key = `${r._id.year}-${String(r._id.month).padStart(2, "0")}`;
      monthlyActionMap[key] = r.count;
    });

    // =========================
    // 3. Generate last 13 months
    // =========================
    const now = new Date();
    const monthNames = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

    const summary = [];
    for (let i = 0; i < 13; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;

      const statusCounts = monthlyStatusMap[key] || {};
      const total = Object.values(statusCounts).reduce((sum, c) => sum + c, 0);

      const receivedCount = monthlyActionMap[key] || 0;

      summary.push({
        month: `${monthNames[d.getMonth()]} ${d.getFullYear()}`,
        total,                     // ✅ oldItemStatus total
        statuses: statusCounts,    // breakdown
        received: receivedCount    // ✅ actionStatus=received
      });
    }

    summary.reverse(); // oldest → newest
    res.json(summary);

  } catch (error) {
    console.error("❌ Error fetching monthly summary:", error);
    res.status(500).json({ error: "Failed to fetch monthly summary" });
  }
});


  router.route('/searchByIds')
  .get(async (req, res) => {
    try {
      const idsString = req.query.ids || "";
      const orderIds = idsString.split(" ").filter(Boolean);

      if (orderIds.length === 0) {
        return res.status(400).json({ message: "No valid order IDs provided" });
      }

      const db = req.dbConnection;
      const collection = db.collection('orders');

      const query = { orderId: { $in: orderIds } };

      console.log("🔍 Searching for Order IDs:", orderIds);

      const orders = await collection.find(query).toArray();

      if (!orders.length) {
        return res.status(404).json({ message: "No matching orders found" });
      }

      res.status(200).json({ orders });
    } catch (error) {
      console.error("❌ Error in GET /searchByIds:", error.message);
      res.status(500).json({ message: "Failed to fetch orders", error: error.message });
    }
  });

router.get("/download-gmail-order-file", async (req, res) => {
  try {
    const tokensDir = path.join(__dirname, "..", "tokens");

    // List all *_token.json files
    const tokenFiles = fs.readdirSync(tokensDir).filter(file => file.endsWith("_token.json"));

    if (tokenFiles.length === 0) {
      return res.status(400).json({ error: "No token files found. Please log in first." });
    }

    // ✅ Use the first token (or loop through all if needed)
    const firstToken = tokenFiles[0]; // example: ombestiam_token.json
    const accountId = firstToken.replace("_token.json", "");

    await downloadGmailOrderFile(accountId);

    res.status(200).json({ message: `Downloaded Gmail order file for: ${accountId}` });
  } catch (error) {
    console.error("Error in /download-gmail-order-file route:", error);
    res.status(500).json({ error: "Failed to download Gmail order file." });
  }
});

router.route('/bulk')
  .post(orderController.bulkCreateOrders);

router.route('/:orderId')
  .get(async (req, res) => {
    try {
      const orderIdParam = req.params.orderId;
      console.log('📥 Incoming request for Order ID:', orderIdParam);

      const db = req.dbConnection;
      console.log('🔗 Connected to DB:', !!db); // true/false

      const collection = db.collection('orders');
      const query = { orderId: orderIdParam.toString() };

      console.log('🔍 MongoDB query object:', query);

      const order = await collection.findOne(query);

      if (!order) {
        console.warn('⚠️ Order not found for ID:', orderIdParam);
        return res.status(404).json({ message: 'Order not found' });
      }

      console.log('✅ Order found:', order);
      res.status(200).json(order);
    } catch (error) {
      console.error('❌ Error in GET /:orderId:', error.message);
      res.status(500).json({ message: 'Failed to fetch order', error: error.message });
    }
  })
  .put(orderController.updateOrder)
  .delete(orderController.deleteOrder);


  router.post("/logout", async (req, res) => {
  const tokensDir = path.join(__dirname, "../tokens");

  try {
    const files = fs.readdirSync(tokensDir);

    const jsonTokens = files.filter((file) => file.endsWith(".json"));

    if (jsonTokens.length === 0) {
      return res.status(404).json({ error: "No token file found." });
    }

    // Delete all .json files (or only the first/matching one if needed)
    for (const tokenFile of jsonTokens) {
      const filePath = path.join(tokensDir, tokenFile);
      fs.unlinkSync(filePath);
    }

    res.clearCookie("token"); // optional
    res.status(200).json({ message: "Logged out successfully and token deleted." });
  } catch (error) {
    console.error("Logout error:", error);
    res.status(500).json({ error: "Failed to logout." });
  }
});

// XLSX to JSON
router.post('/convert-xlsx-to-json', orderController.convertXlsxToJsonAndSave);


// ✅ Fix: Use the DB connection instead of undefined Order
router.post("/:orderId/action-status", async (req, res) => {
  try {
    const { status, lock } = req.body;
    const { orderId } = req.params;

    console.log("📩 Hit /:orderId/action-status route with:", orderId, "status:", status, "lock:", lock);

    const db = req.dbConnection;
    const collection = db.collection("orders");

    // Find the order by orderId (not _id)
    const order = await collection.findOne({ orderId: orderId });
    if (!order) return res.status(404).json({ error: "Order not found" });

    if (order.locked) {
      return res.status(400).json({ error: "Action already locked" });
    }

    // ✅ Lock logic:
    // - received → lock
    // - review   → lock
    // - not_received → remain unlocked
    let shouldLock = false;
    if (status === "received" || status === "review") {
      shouldLock = true;
    } else if (status === "not_received") {
      shouldLock = false;
    }

    // Allow explicit override via `lock` param if provided
    if (typeof lock === "boolean") {
      shouldLock = lock;
    }

    // Update fields
    const updatedOrder = {
      ...order,
      actionStatus: status,
      locked: shouldLock,
    };

    // Save the update in MongoDB
    await collection.updateOne(
      { orderId: orderId },
      { $set: { actionStatus: status, locked: updatedOrder.locked } }
    );

    res.json({ success: true, order: updatedOrder });
  } catch (err) {
    console.error("❌ Error in POST /:orderId/action-status:", err);
    res.status(500).json({ error: "Server error" });
  }
}); 


// CSV from URL (direct)
router.post('/download-csv', async (req, res) => {
  try {
    const { url } = req.body;
    if (!url) return res.status(400).json({ message: 'CSV URL is required' });

    const response = await axios.get(url, { responseType: 'text' });
    const jsonArray = await csv().fromString(response.data);

    const db = req.dbConnection;
    const collection = db.collection('orders');
    const result = await collection.insertMany(jsonArray);

    res.status(200).json({
      message: 'Orders uploaded successfully from CSV URL',
      insertedCount: result.insertedCount,
    });
  } catch (error) {
    console.error('Error downloading or saving CSV:', error.message);
    res.status(500).json({ message: 'Failed to process CSV file', error: error.message });
  }
});

// ✅ FIXED: Handle Amazon-style redirects & download actual S3 file
router.post('/download-s3', async (req, res) => {
  try {
    let { url } = req.body;
    if (!url) return res.status(400).json({ message: 'Signed S3 URL is required' });

    // If Amazon-style redirect link
    const redirectMatch = url.match(/amazon\.in\/gp\/f\.html.*[?&]U=([^&]+)/);
    if (redirectMatch && redirectMatch[1]) {
      const decodedUrl = decodeURIComponent(redirectMatch[1]);
      console.log('✅ Extracted real S3 URL from redirect:', decodedUrl);
      url = decodedUrl;
    }

    const response = await axios.get(url, { responseType: 'stream' });

    // Get filename
    let originalFilename = 'downloaded_file';
    const contentDisposition = response.headers['content-disposition'];
    if (contentDisposition) {
      const match = contentDisposition.match(/filename="?([^"]+)"?/);
      if (match && match[1]) {
        originalFilename = match[1];
      }
    } else {
      originalFilename = path.basename(new URL(url).pathname);
    }

    // Get extension
    const extension = path.extname(originalFilename) || '.csv';
    const filename = originalFilename;
    const savePath = path.join(__dirname, '..', 'uploads', filename);

    // Save file with Promise so we wait for the write to finish
    await new Promise((resolve, reject) => {
      const writer = fs.createWriteStream(savePath);
      response.data.pipe(writer);
      writer.on('finish', resolve);
      writer.on('error', reject);
    });

    console.log(`✅ File saved as: ${filename}`);
    res.status(200).json({ message: 'File downloaded and saved', filename });
  } catch (error) {
    console.error('❌ Error downloading or saving file:', error.message);
    res.status(500).json({ message: 'Failed to download file', error: error.message });
  }
});

module.exports = router;
