const fs = require("fs");
const path = require("path");
const axios = require("axios");
const cheerio = require("cheerio");
const { google } = require("googleapis");
const getGmailClient = require("./gmailClient"); // Adjust path to your getGmailClient.js

async function getGmail(accountId) {
  const authClient = await getGmailClient(accountId, true);
  const gmail = google.gmail({ version: "v1", auth: authClient });
  return gmail;
}

async function getFullThreadHtmlBodies(gmail) {
  const res = await gmail.users.messages.list({
    userId: "me",
    q: 'subject:"Amazon Exchange Offer: Daily Order Report"',
    maxResults: 1,
  });

  const latestMessage = res.data.messages?.[0];
  if (!latestMessage) return [];

  const threadRes = await gmail.users.threads.get({
    userId: "me",
    id: latestMessage.threadId,
    format: "full",
  });

  const htmlBodies = [];

  function findHtmlParts(part) {
    if (part.mimeType === "text/html" && part.body?.data) {
      const decoded = Buffer.from(part.body.data, "base64").toString("utf8");
      htmlBodies.push(decoded);
    }

    if (part.parts) {
      part.parts.forEach(findHtmlParts);
    }
  }

  for (const msg of threadRes.data.messages) {
    findHtmlParts(msg.payload);
  }

  return htmlBodies;
}

function extractCsvLinksFromHtml(html) {
  const $ = cheerio.load(html);
  const csvLinks = [];

  $("a").each((_, el) => {
    const rawHref = $(el).attr("href");
    if (!rawHref) return;

    try {
      const outerUrl = new URL(rawHref);
      const encodedInnerUrl = outerUrl.searchParams.get("U");
      if (!encodedInnerUrl) return;

      let decodedU = encodedInnerUrl;
      for (let i = 0; i < 5; i++) {
        const next = decodeURIComponent(decodedU);
        if (next === decodedU) break;
        decodedU = next;
      }

      const finalUrl = new URL(decodedU);
      if (
        finalUrl.hostname.includes("s3") &&
        finalUrl.pathname.endsWith(".csv") &&
        finalUrl.searchParams.has("X-Amz-Signature") &&
        !finalUrl.href.includes("CP")
      ) {
        csvLinks.push(decodedU);
      }
    } catch (err) {
      // Ignore malformed URLs
    }
  });

  return csvLinks;
}

async function downloadFile(url, destinationPath) {
  const response = await axios.get(url, { responseType: "stream" });

  const writer = fs.createWriteStream(destinationPath);
  response.data.pipe(writer);

  return new Promise((resolve, reject) => {
    writer.on("finish", resolve);
    writer.on("error", reject);
  });
}

async function downloadAmazonExchangeCsv(accountId) {
  try {
    const gmail = await getGmailClient(accountId);
    if (!gmail) {
      console.log("Gmail client not initialized. Waiting for login...");
      return [];
    }

    const htmlBodies = await getFullThreadHtmlBodies(gmail);

    const allLinks = [];

    for (const html of htmlBodies) {
      const links = extractCsvLinksFromHtml(html);
      if (links.length > 0) {
        console.log("🔗 Extracted CSV links from part:", links);
        allLinks.push(...links);
      }
    }

    if (allLinks.length === 0) {
      console.warn("⚠️ No valid CSV links found.");
      return [];
    }

    const uploadDir = path.join(__dirname, "..", "uploads");
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    const downloadedFiles = [];

    for (const link of allLinks) {
      const safeName = path.basename(link.split("?")[0]).replace(/[^a-z0-9_.-]/gi, "_");
      const downloadPath = path.join(uploadDir, safeName);
      await downloadFile(link, downloadPath);
      console.log(`✅ CSV downloaded: ${safeName}`);
      downloadedFiles.push(safeName);
    }

    console.log("📁 Files downloaded:", downloadedFiles);
    return downloadedFiles;
  } catch (err) {
    console.error("❌ Amazon Exchange download failed:", err.message);
    return [];
  }
}

module.exports = { downloadAmazonExchangeCsv };
