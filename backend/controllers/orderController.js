const { getOrdersDB } = require("../config/db"); // Ensure proper path to db.js
const xlsx = require("xlsx");
const fs = require("fs");
const path = require("path");

// 🔧 Utility function to parse Excel or ISO-like dates, including custom formats like DD-MM-YYYY
const parseExcelDate = (input) => {
  if (!input) return null;

  // Handle numeric string with dot as thousands separator (e.g., "44.031")
  if (typeof input === "string" && /^\d{1,3}(\.\d{3})*$/.test(input)) {
    input = parseFloat(input.replace(/\./g, ""));
  }

  if (typeof input === "string") {
    // DD-MM-YYYY
    if (/^\d{2}-\d{2}-\d{4}$/.test(input)) {
      const [day, month, year] = input.split("-");
      const parsed = new Date(`${year}-${month}-${day}`);
      return isNaN(parsed.getTime()) ? null : parsed;
    }

    // DD/MM/YYYY
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(input)) {
      const [day, month, year] = input.split("/");
      const parsed = new Date(`${year}-${month}-${day}`);
      return isNaN(parsed.getTime()) ? null : parsed;
    }

    // MM-DD-YYYY
    if (/^\d{2}-\d{2}-\d{4}$/.test(input)) {
      const [month, day, year] = input.split("-");
      const parsed = new Date(`${year}-${month}-${day}`);
      return isNaN(parsed.getTime()) ? null : parsed;
    }
  }

  // Default string or Date input
  if (typeof input === "string" || input instanceof Date) {
    const parsed = new Date(input);
    return isNaN(parsed.getTime()) ? null : parsed;
  }

  if (typeof input === "number") {
    const excelEpoch = new Date(Date.UTC(1899, 11, 30));
    const parsed = new Date(excelEpoch.getTime() + input * 86400000);
    return parsed;
  }

  return null;
};

// 🔧 Custom function to parse order timestamps, considering different formats (e.g., 'DD-MM-YYYY HH:MM:SS', 'MM/DD/YYYY HH:MM:SS AM/PM')
const parseDateTimeFromString = (input) => {
  if (!input) return null;

  if (typeof input === "string") {
    // DD-MM-YYYY HH:MM:SS
    if (/^\d{2}-\d{2}-\d{4} \d{2}:\d{2}:\d{2}$/.test(input)) {
      const [day, month, year, hour, minute, second] = input.split(/[- :]/);
      const parsed = new Date(
        `${year}-${month}-${day}T${hour}:${minute}:${second}`
      );
      return isNaN(parsed.getTime()) ? null : parsed;
    }

    // MM/DD/YYYY HH:MM:SS AM/PM
    if (/^\d{2}\/\d{2}\/\d{4} \d{2}:\d{2}:\d{2} (AM|PM)$/.test(input)) {
      const [datePart, timePart, period] = input.split(" ");
      const [month, day, year] = datePart.split("/");
      let [hour, minute, second] = timePart.split(":");

      if (period === "PM" && parseInt(hour, 10) < 12) {
        hour = (parseInt(hour, 10) + 12).toString();
      }

      if (period === "AM" && parseInt(hour, 10) === 12) {
        hour = "00";
      }

      const parsed = new Date(
        `${year}-${month}-${day}T${hour}:${minute}:${second}`
      );
      return isNaN(parsed.getTime()) ? null : parsed;
    }

    // DD/MM/YYYY
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(input)) {
      const [day, month, year] = input.split("/");
      const parsed = new Date(`${year}-${month}-${day}`);
      return isNaN(parsed.getTime()) ? null : parsed;
    }

    // MM-DD-YYYY
    if (/^\d{2}-\d{2}-\d{4}$/.test(input)) {
      const [month, day, year] = input.split("-");
      const parsed = new Date(`${year}-${month}-${day}`);
      return isNaN(parsed.getTime()) ? null : parsed;
    }
  }

  // Fallback
  return parseExcelDate(input);
};

// ✅ NEW: Split combined datetime string into date and timestamp parts
const formatDateTime = (date) => {
  if (!(date instanceof Date) || isNaN(date)) return "";
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  const hour = String(date.getHours()).padStart(2, "0");
  const minute = String(date.getMinutes()).padStart(2, "0");
  const second = String(date.getSeconds()).padStart(2, "0");
  return `${day}-${month}-${year} ${hour}:${minute}:${second}`;
};

const splitDateTimeIfCombined = (value) => {
  let dateObj = null;
  let originalString = "";

  if (typeof value === "string") {
    originalString = value;
    dateObj = parseDateTimeFromString(value);
  } else if (value instanceof Date) {
    dateObj = value;
    originalString = formatDateTime(value);
  } else if (typeof value === "number") {
    dateObj = parseExcelDate(value);
    originalString = formatDateTime(dateObj);
  }

  let dateOnly = null;

  if (dateObj && !isNaN(dateObj)) {
    // Extract date parts and build a clean local Date object with no time
    dateOnly = new Date(
      dateObj.getFullYear(),
      dateObj.getMonth(),
      dateObj.getDate()
    );
  }

  return {
    orderDate: dateOnly,
    orderTimeStamp: originalString,
  };
};

// ----------- Helper to initialize the Order model (only after DB is connected) -----------
let Order;
const initOrderModel = () => {
  const ordersDB = getOrdersDB(); // Make sure DB connection is successful
  if (ordersDB && !Order) {
    Order = require("../models/orderModel")(ordersDB); // Bind model only when DB is available
  }
};

// ------------------- CRUD handlers -------------------

exports.getAllOrders = async (req, res) => {
  try {
    initOrderModel(); // Ensure model is initialized before using it
    console.log("Fetching all orders from the database...");
    const orders = await Order.find();
    res.json(orders);
  } catch (error) {
    console.error("Error fetching all orders:", error.message);
    res.status(500).json({ message: error.message });
  }
};

exports.createOrder = async (req, res) => {
  try {
    const orderData = req.body;
    let orderDateValue = orderData.orderDate;
    let orderDate, orderTimeStamp;

    if (
      orderDateValue &&
      typeof orderDateValue === "string" &&
      /\d{2}[:]\d{2}/.test(orderDateValue)
    ) {
      ({ orderDate, orderTimeStamp } = splitDateTimeIfCombined(orderDateValue));
    } else {
      orderDate = parseExcelDate(orderDateValue);
      orderTimeStamp = formatDateTime(parseDateTimeFromString(orderDateValue));
    }

    orderData.orderDate = orderDate;
    orderData.orderTimeStamp = orderTimeStamp;
    orderData.deliveryDate = parseExcelDate(orderData.deliveryDate);

    initOrderModel();
    const order = new Order(orderData);
    await order.save();
    res.status(201).json(order);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

exports.getOrderById = async (req, res) => {
  try {
    const { orderId } = req.params;
    initOrderModel();
    const order = await Order.findOne({ orderId });

    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    res.json(order);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.updateOrder = async (req, res) => {
  try {
    const { orderId } = req.params;
    const updates = req.body;
    let orderDateValue = updates.orderDate;
    let orderDate, orderTimeStamp;

    if (
      orderDateValue &&
      typeof orderDateValue === "string" &&
      /\d{2}[:]\d{2}/.test(orderDateValue)
    ) {
      ({ orderDate, orderTimeStamp } = splitDateTimeIfCombined(orderDateValue));
    } else {
      orderDate = parseExcelDate(orderDateValue);
      orderTimeStamp = formatDateTime(parseDateTimeFromString(orderDateValue));
    }

    updates.orderDate = orderDate;
    updates.orderTimeStamp = orderTimeStamp;
    updates.deliveryDate = parseExcelDate(updates.deliveryDate);

    initOrderModel();
    const updatedOrder = await Order.findOneAndUpdate({ orderId }, updates, {
      new: true,
    });

    if (!updatedOrder) {
      return res.status(404).json({ message: "Order not found" });
    }

    res.json(updatedOrder);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

exports.deleteOrder = async (req, res) => {
  try {
    const { orderId } = req.params;
    initOrderModel();

    const deletedOrder = await Order.findOneAndDelete({ orderId });

    if (!deletedOrder) {
      return res.status(404).json({ message: "Order not found" });
    }

    res.json({ message: "Order deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ------------------- Bulk Upload Handlers -------------------

exports.bulkCreateOrders = async (req, res) => {
  try {
    const ordersData = req.body;

    const formattedOrders = ordersData.map((order) => {
      let orderDateVal = order.orderDate || order["Order Date"];
      let orderTimeVal = order.orderTimeStamp || order["Order Timestamp"];
      let orderDate, orderTimeStamp;

      if (
        orderDateVal &&
        typeof orderDateVal === "string" &&
        /\d{2}[:]\d{2}/.test(orderDateVal)
      ) {
        ({ orderDate, orderTimeStamp } = splitDateTimeIfCombined(orderDateVal));
      } else {
        orderDate = parseExcelDate(orderDateVal);

        // Try to get time from Order Timestamp, or fallback to Order Date
        const timestampSource = orderTimeVal || orderDateVal;
        const parsedTime = parseDateTimeFromString(timestampSource);
        orderTimeStamp = parsedTime ? formatDateTime(parsedTime) : "";
      }

      return {
        orderId: order.orderId || order["Order ID"] || order["Order Id"],
        orderDate,
        orderTimeStamp,
        oldItemStatus:
          order.oldItemStatus ||
          order["Old Item Status"] ||
          order["Order Status"] ||
          "",
        buybackCategory:
          order.buybackCategory ||
          order["Buyback Category"] ||
          order["BuyBack Category"],
        partnerId: order.partnerId || order["Partner ID"],
        partnerEmail: order.partnerEmail || order["Partner Email"],
        partnerShop:
          order.partnerShop || order["Partner Shop"] || order["City"],
        oldItemDetails:
          order.oldItemDetails ||
          order["Old Item Details"] ||
          order["Used Item Info"],
        baseDiscount:
          order.baseDiscount ||
          order["Base Discount"] ||
          order["Base Exchange Value"] ||
          0,
        deliveryFee: order.deliveryFee || order["Delivery Fee"] || 0,
        trackingId: order.trackingId || order["Tracking ID"],
        deliveryDate: parseExcelDate(
          order.deliveryDate || order["Delivery Date"]
        ),
        deliveredWithOTP: Boolean(
          order.deliveredWithOTP || order["Delivered With OTP"]
        ),
      };
    });

    initOrderModel();
    const createdOrders = await Order.insertMany(formattedOrders);
    res.status(201).json(createdOrders);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

exports.convertXlsxToJsonAndSave = async (req, res, update = false) => {
  try {
    const uploadsDir = path.join(__dirname, "..", "uploads");

    const waitForLatestFiles = async (
      dir,
      count = 2,
      extensions = [".csv", ".xlsx"],
      timeout = 20000,
      checkInterval = 1000
    ) => {
      const start = Date.now();

      const getValidFiles = () => {
        return fs
          .readdirSync(dir)
          .filter((file) =>
            extensions.includes(path.extname(file).toLowerCase())
          )
          .map((file) => ({
            name: file,
            path: path.join(dir, file),
            size: fs.statSync(path.join(dir, file)).size,
            time: fs.statSync(path.join(dir, file)).mtime.getTime(),
          }))
          .sort((a, b) => b.time - a.time)
          .slice(0, count);
      };

      let lastSizes = [];

      return new Promise((resolve, reject) => {
        const interval = setInterval(() => {
          if (Date.now() - start > timeout) {
            clearInterval(interval);
            return reject(
              new Error("Timeout: Not enough files downloaded in time")
            );
          }

          const files = getValidFiles();

          if (files.length < count) return;

          const sizes = files.map((f) => f.size);
          if (
            lastSizes.length > 0 &&
            sizes.every((size, i) => size === lastSizes[i])
          ) {
            clearInterval(interval);
            return resolve(files.map((f) => f.name));
          }

          lastSizes = sizes;
        }, checkInterval);
      });
    };

    let latestTwoFiles = [];

    try {
      latestTwoFiles = await waitForLatestFiles(uploadsDir);
    } catch (err) {
      // If timeout or fewer files are present, process only the latest available one
      const allFiles = fs
        .readdirSync(uploadsDir)
        .filter((file) =>
          [".csv", ".xlsx"].includes(path.extname(file).toLowerCase())
        )
        .map((file) => ({
          name: file,
          time: fs.statSync(path.join(uploadsDir, file)).mtime.getTime(),
        }))
        .sort((a, b) => b.time - a.time);

      if (allFiles.length > 0) {
        console.warn("Only one file available. Proceeding with a single file.");
        latestTwoFiles = [allFiles[0].name];
      } else {
        // No files to process at all
        return res
          .status(400)
          .json({ error: "No valid files found to process." });
      }
    }

    const allFormattedOrders = [];

    for (const filename of latestTwoFiles) {
      const filePath = path.join(uploadsDir, filename);
      const isCSV = path.extname(filename).toLowerCase() === ".csv";
      const workbook = xlsx.readFile(
        filePath,
        isCSV ? { type: "file", raw: false } : undefined
      );
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = xlsx.utils.sheet_to_json(sheet);

      const formattedOrders = jsonData.map((order) => {
        let orderDateVal = order.orderDate || order["Order Date"];
        let orderTimeVal = order.orderTimeStamp || order["Order Timestamp"];
        let orderDate, orderTimeStamp;

        if (
          orderDateVal &&
          typeof orderDateVal === "string" &&
          /\d{2}[:]\d{2}/.test(orderDateVal)
        ) {
          ({ orderDate, orderTimeStamp } =
            splitDateTimeIfCombined(orderDateVal));
        } else {
          orderDate = parseExcelDate(orderDateVal);

          // Try to get time from Order Timestamp, or fallback to Order Date
          const timestampSource = orderTimeVal || orderDateVal;
          const parsedTime = parseDateTimeFromString(timestampSource);
          orderTimeStamp = parsedTime ? formatDateTime(parsedTime) : "";
        }

        return {
          orderId: order.orderId || order["Order ID"] || order["Order Id"],
          orderDate,
          orderTimeStamp,
          oldItemStatus:
            order.oldItemStatus ||
            order["Old Item Status"] ||
            order["Order Status"] ||
            "",
          buybackCategory:
            order.buybackCategory ||
            order["Buyback Category"] ||
            order["BuyBack Category"],
          partnerId: order.partnerId || order["Partner ID"],
          partnerEmail: order.partnerEmail || order["Partner Email"],
          partnerShop:
            order.partnerShop || order["Partner Shop"] || order["City"],
          oldItemDetails:
            order.oldItemDetails ||
            order["Old Item Details"] ||
            order["Used Item Info"],
          baseDiscount:
            order.baseDiscount ||
            order["Base Discount"] ||
            order["Base Exchange Value"] ||
            0,
          deliveryFee: order.deliveryFee || order["Delivery Fee"] || 0,
          trackingId: order.trackingId || order["Tracking ID"],
          deliveryDate: parseExcelDate(
            order.deliveryDate || order["Delivery Date"]
          ),
          deliveredWithOTP: Boolean(
            order.deliveredWithOTP || order["Delivered With OTP"]
          ),
        };
      });

      allFormattedOrders.push(...formattedOrders);
    }

    initOrderModel();

    if (update) {
      const updatedOrders = [];
      for (const order of allFormattedOrders) {
        const updated = await Order.findOneAndUpdate(
          { orderId: order.orderId },
          order,
          { new: true, upsert: true }
        );
        updatedOrders.push(updated);
      }

      res.status(200).json({
        message: `${updatedOrders.length} orders updated successfully`,
        data: updatedOrders,
      });
    } else {
      const createdOrders = await Order.insertMany(allFormattedOrders);
      res.status(201).json({
        message: `${createdOrders.length} orders created successfully`,
        data: createdOrders,
      });
    }
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error processing the file", error: error.message });
  }
};
