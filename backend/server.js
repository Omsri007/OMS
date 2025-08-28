require("dotenv").config();
require("./cronScheduler");
require("./FileWatcher"); // This will start watching the uploads folder
const express = require("express");
const session = require("express-session");
// const passport = require('passport');
const helmet = require("helmet");
const cors = require("cors");
const fetch = require("node-fetch"); // Proxy fetch
const axios = require("axios");
const { v4: uuidv4 } = require("uuid"); // to generate unique filenames
const mime = require("mime-types"); // for detecting file extensions from content type
const path = require("path");
const fs = require("fs");

const { connectDBs, getAuthDB } = require("./config/db");
// const { setPassportDB } = require('./config/passport');
const authRoutes = require("./Routes/authRoutes");
const orderRoutes = require("./Routes/OrderRoutes");
const googleClientRoute = require("./Routes/googleClient");
const uploadRoutes = require("./Routes/uploadRoutes");
const googleRoute = require("./Routes/googleRoutes");
const { router: balanceFetcherRouter } = require("./Routes/balanceFetcher");
const cityUserRoutes = require("./Routes/cityUserRoutes");
const reviewRoutes = require("./Routes/reviewRoutes")
const actionReviewRoutes = require("./Routes/actionReviewRoutes");

const app = express();

// Middleware setup
app.use(express.json({ limit: "400mb" }));
app.use(express.urlencoded({ extended: true, limit: "400mb" }));
app.use(helmet());
app.use(cors({ origin: 'https://oms-coral.vercel.app', credentials: true }));

app.use(
  session({
    secret: process.env.JWT_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false },
  })
);

// app.use(passport.initialize());
// app.use(passport.session());

app.use("/uploads", express.static(path.join(__dirname, "uploads")));
// Serve ReviewUploads publicly
app.use(
  "/ReviewUploads",
  (req, res, next) => {
    res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
    next();
  },
  express.static(path.join(__dirname, "ReviewUploads"))
);

// Proxy route for downloading files (S3, Google Sheets, etc.)
app.get("/proxy", async (req, res) => {
  const { url } = req.query;

  if (!url) {
    return res.status(400).json({ error: "URL query param is required" });
  }

  try {
    const remoteRes = await fetch(url);

    if (!remoteRes.ok) {
      return res
        .status(remoteRes.status)
        .json({ error: "Failed to fetch the file" });
    }

    const contentType =
      remoteRes.headers.get("content-type") || "application/octet-stream";
    res.set("Content-Type", contentType);

    const buffer = await remoteRes.buffer();
    res.send(buffer);
  } catch (error) {
    console.error("Proxy error:", error);
    res.status(500).json({ error: "Failed to proxy request" });
  }
});

// ✅ Route to download file from URL and save it to uploads folder
app.post("/api/upload-url", async (req, res) => {
  const { url } = req.body;

  if (!url) {
    return res.status(400).json({ error: "No URL provided" });
  }

  try {
    let cleanUrl = url;

    // ✅ Step 1: Unwrap Amazon-style redirect (extract & decode 'U' param)
    const urlObj = new URL(url);
    if (urlObj.searchParams.has("U")) {
      cleanUrl = decodeURIComponent(urlObj.searchParams.get("U"));
    }

    // ✅ Step 2: Parse the clean/real URL
    const parsedUrl = new URL(cleanUrl);
    let filename = path.basename(parsedUrl.pathname); // e.g. 1744716729102.csv or best@bestiam.in_PartnerPurchaseReport_14-04-2025.csv

    // ✅ Step 3: Remove extension for saving just base name (optional)
    const baseName = path.parse(filename).name;

    if (!baseName || baseName.toLowerCase() === "null") {
      filename = `${uuidv4()}.csv`;
    } else {
      filename = `${baseName}.csv`; // ensure clean csv extension
    }

    const filePath = path.join(__dirname, "uploads", filename);

    // ✅ Step 4: Download and save the file
    const response = await axios.get(cleanUrl, { responseType: "stream" });
    const writer = fs.createWriteStream(filePath);
    response.data.pipe(writer);

    writer.on("finish", () => {
      console.log(`✅ File saved: ${filename}`);
      res.status(200).json({ message: "File downloaded and saved", filename });
    });

    writer.on("error", (err) => {
      console.error("❌ File write error:", err);
      res.status(500).json({ error: "Failed to write file" });
    });
  } catch (err) {
    console.error("❌ Error downloading file:", err.message);
    res.status(500).json({ error: "Failed to download file" });
  }
});

// Connect DBs and start server
(async () => {
  await connectDBs();
  // setPassportDB(getAuthDB());
  // ✅ Ensure auth DB is initialized
  await getAuthDB();

  app.use("/api/city-users", cityUserRoutes);
  app.use("/api/auth", authRoutes);
  app.use("/api/orders", orderRoutes);
  app.use("/api/google", googleClientRoute);
  app.use("/api/uploads", uploadRoutes);
  app.use("/api/google", googleRoute);
  app.use("/api", balanceFetcherRouter);
  app.use("/api/orders", reviewRoutes);
  app.use("/api/reviews", actionReviewRoutes);

  const PORT = process.env.PORT || 5000 ;
  app.listen(PORT, () =>
    console.log(`🚀 Server running on http://localhost:${PORT}`)
  );
})();
