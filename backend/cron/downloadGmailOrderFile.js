// ✅ FULL UPDATED FILE

const fs = require("fs");
const path = require("path");
const axios = require("axios");
const cheerio = require("cheerio");
const { google } = require("googleapis");
const getGmailClient = require("../cron/gmailClient");
const { downloadAmazonExchangeCsv } = require("./amazonExchangeDownloader"); // ✅ Added

function isSpreadsheetUrl(url) {
  const result = url.includes("docs.google.com/spreadsheets");
  console.log(`🔍 Checking if URL is Google Spreadsheet: ${url} -> ${result}`);
  return result;
}

function isAmazonS3Url(url) {
  const result = url.includes("amazonaws.com");
  console.log(`🔍 Checking if URL is Amazon S3: ${url} -> ${result}`);
  return result;
}

function getGoogleSheetId(url) {
  const match = url.match(/\/d\/([a-zA-Z0-9-_]+)/);
  const sheetId = match ? match[1] : null;
  console.log(`🔎 Extracted Google Sheet ID from URL: ${url} -> ${sheetId}`);
  return sheetId;
}

async function getGoogleDriveFilename(fileId) {
  console.log(`📛 Fetching Drive filename for fileId: ${fileId}`);
  try {
    const res = await drive.files.get({ fileId, fields: "name" });
    console.log(`✅ Got Drive filename: ${res.data.name}`);
    return res.data.name;
  } catch (err) {
    console.error(`❌ Drive filename error for ${fileId}:`, err.message);
    return `GoogleSheet_${fileId}`;
  }
}

async function getOriginalFilename(url) {
  console.log(`🏷️ Getting original filename for URL: ${url}`);

  if (isSpreadsheetUrl(url)) {
    const sheetId = getGoogleSheetId(url);
    if (sheetId) {
      const name = await getGoogleDriveFilename(sheetId);
      const filename = `${name}.xlsx`;
      console.log(`🏷️ Filename from Google Sheet: ${filename}`);
      return filename;
    }
  }

  try {
    const cleanUrl = new URL(url);
    cleanUrl.searchParams.forEach((v, k) => {
      if (k.toLowerCase().includes("allgorithm")) {
        cleanUrl.searchParams.delete(k);
        cleanUrl.searchParams.set("X-Amz-Algorithm", v);
      }
    });

    console.log("🏷️ Attempting HEAD request to get filename from headers...");
    const head = await axios.head(cleanUrl.toString());
    const disposition = head.headers["content-disposition"];
    if (disposition) {
      const match = disposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
      if (match) {
        const filename = match[1].replace(/['"]/g, "");
        console.log(`🏷️ Filename from content-disposition header: ${filename}`);
        return filename;
      }
    }
  } catch (e) {
    console.warn(`⚠️ HEAD request failed for ${url}: ${e.message}`);
  }

  try {
    const parsed = path.basename(new URL(url).pathname);
    const decoded = decodeURIComponent(parsed);
    const safeName = decoded.replace(/[^a-zA-Z0-9._-]/g, "_");
    console.log(`🏷️ Filename parsed and sanitized: ${safeName}`);
    return safeName;
  } catch (e) {
    console.warn(`⚠️ Parsing filename from URL failed: ${e.message}`);
    const fallbackName = `file_${Date.now()}`;
    console.log(`🏷️ Using fallback filename: ${fallbackName}`);
    return fallbackName;
  }
}

async function exportGoogleSheet(sheetId, filename) {
  const finalName = filename.endsWith(".xlsx") ? filename : `${filename}.xlsx`;
  const savePath = path.join(__dirname, "..", "uploads", finalName);
  const dest = fs.createWriteStream(savePath);

  console.log(`🧾 Exporting Google Sheet (${sheetId}) as file: ${finalName}`);

  try {
    const res = await drive.files.export(
      {
        fileId: sheetId,
        mimeType:
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      },
      { responseType: "stream" }
    );

    await new Promise((resolve, reject) => {
      res.data.pipe(dest);
      res.data.on("end", () => {
        console.log(`✅ Exported Google Sheet successfully: ${finalName}`);
        resolve();
      });
      res.data.on("error", (err) => {
        console.error(`❌ Error streaming Google Sheet export: ${err.message}`);
        reject(err);
      });
    });

    return finalName;
  } catch (err) {
    console.error(`❌ Failed to export Google Sheet ${sheetId}:`, err.message);
    return null;
  }
}

async function downloadFile(url, filename) {
  console.log(`🔗 [downloadFile] Will download from URL: ${url}`);
  const ext = path.extname(filename).toLowerCase();
  const finalName = [".csv", ".xlsx"].includes(ext)
    ? filename
    : `${filename}.xlsx`;

  console.log(`🧲 Downloading file from URL: ${url} as ${finalName}`);

  try {
    const response = await axios.get(url, { responseType: "stream" });
    const savePath = path.join(__dirname, "..", "uploads", finalName);
    const writer = fs.createWriteStream(savePath);

    return await new Promise((resolve, reject) => {
      response.data.pipe(writer);
      writer.on("finish", () => {
        console.log(`✅ Downloaded: ${finalName}`);
        resolve(finalName);
      });
      writer.on("error", (err) => {
        console.error(`❌ Download error for ${finalName}: ${err.message}`);
        reject(err);
      });
    });
  } catch (err) {
    console.error(`❌ Failed to download file from ${url}: ${err.message}`);
    throw err;
  }
}

async function getFullThreadHtmlBodies(gmail) {
  const res = await gmail.users.messages.list({
    userId: "me",
    q: 'subject:"On-Demand Consolidated Exchange Orders Report"',
    maxResults: 1,
  });

  const latestMessage = res.data.messages?.[0];
  if (!latestMessage) return [];

  const threadRes = await gmail.users.threads.get({
    userId: "me",
    id: latestMessage.threadId,
    format: "full",
  });

  const htmlData = [];

  function findHtmlParts(part, msgTo) {
    if (part.mimeType === "text/html" && part.body?.data) {
      const decoded = Buffer.from(part.body.data, "base64").toString("utf8");
      htmlData.push({ html: decoded, to: msgTo });
    }

    if (part.parts) {
      part.parts.forEach((p) => findHtmlParts(p, msgTo));
    }
  }

  for (const msg of threadRes.data.messages) {
    const headers = msg.payload.headers || [];
    const toHeader = headers.find((h) => h.name.toLowerCase() === "to");
    const toEmail = toHeader ? toHeader.value.toLowerCase() : "";

    findHtmlParts(msg.payload, toEmail);
  }

  return htmlData; // Array of { html, to }
}

function extractCsvLinksFromHtmlBodies(htmlBodies) {
  const links = [];
  const regex = /https?:\/\/[^\s"'>]+/g;

  for (const html of htmlBodies) {
    const matches = html.match(regex) || [];
    for (let url of matches) {
      url = url.replace(/&amp;/g, "&");
      if (url.endsWith(".csv") || url.includes(".csv?")) {
        console.log(`🔗 Found .csv link in thread HTML: ${url}`);
        links.push(url);
      }
    }
  }

  return links;
}

async function downloadGmailOrderFile(accountId) {
  console.log(`🚀 Starting downloadGmailOrderFile for account: ${accountId}`);
  const gmail = await getGmailClient(accountId);
  const uploadDir = path.join(__dirname, "..", "uploads");
  if (!fs.existsSync(uploadDir)) {
    console.log(`📁 Upload directory does not exist. Creating: ${uploadDir}`);
    fs.mkdirSync(uploadDir, { recursive: true });
  } else {
    console.log(`📁 Upload directory exists: ${uploadDir}`);
  }

  const attachments = [];

  try {
    console.log(
      '📩 Searching for latest "On-Demand Consolidated Exchange Orders Report" emails...'
    );
    const res = await gmail.users.messages.list({
      userId: "me",
      q: 'subject:"On-Demand Consolidated Exchange Orders Report"',
      maxResults: 1,
    });

    const messages = res.data.messages || [];
    console.log(`🔎 Found ${messages.length} emails with matching subject.`);

    if (messages.length) {
      const detailedMessages = await Promise.all(
        messages.map(async (msg) => {
          const data = await gmail.users.messages.get({
            userId: "me",
            id: msg.id,
          });
          return {
            id: msg.id,
            internalDate: parseInt(data.data.internalDate, 10),
            payload: data.data.payload,
          };
        })
      );

      for (const msg of detailedMessages) {
        const emailDate = new Date(msg.internalDate).toLocaleString();
        console.log(`📬 Processing email ID: ${msg.id} (Date: ${emailDate})`);

        const parts = msg.payload.parts || [];

        for (const part of parts) {
          if (part.filename && part.body?.attachmentId) {
            console.log(
              `📎 Found attachment: ${part.filename}, downloading...`
            );
            const att = await gmail.users.messages.attachments.get({
              userId: "me",
              messageId: msg.id,
              id: part.body.attachmentId,
            });
            const buffer = Buffer.from(att.data.data, "base64");
            const savePath = path.join(
              __dirname,
              "..",
              "uploads",
              part.filename
            );
            fs.writeFileSync(savePath, buffer);
            attachments.push(part.filename);
            console.log(`✅ Attachment saved: ${part.filename}`);
          }
        }

        const htmlDataArray = await getFullThreadHtmlBodies(gmail);
        for (const { html, to } of htmlDataArray) {
          const prefix = to.includes("peak@")
            ? "peak"
            : to.includes("best@")
            ? "best"
            : to.includes("top@")
            ? "top"
            : "file";

          const csvLinks = extractCsvLinksFromHtmlBodies([html]);

          for (const link of csvLinks) {
            try {
              console.log(`🔗 Handling link: ${link}`);
              let originalName = await getOriginalFilename(link);
              originalName = `${prefix}_${originalName}`; // 💡 Add prefix to filename

              if (
                originalName.endsWith(".html") ||
                originalName.endsWith(".html.xlsx")
              ) {
                console.log(`⚠️ Skipping HTML-derived file: ${originalName}`);
                continue;
              }

              if (isSpreadsheetUrl(link)) {
                const sheetId = getGoogleSheetId(link);
                if (sheetId) {
                  console.log(`📊 Exporting Google Sheet with ID: ${sheetId}`);
                  const filename = await exportGoogleSheet(
                    sheetId,
                    originalName
                  );
                  if (filename) attachments.push(filename);
                }
              } else {
                const filename = await downloadFile(link, originalName);
                if (filename) attachments.push(filename);
              }
            } catch (err) {
              console.error(
                `❌ Failed to handle link: ${link} - ${err.message}`
              );
            }
          }
        }
      }
    } else {
      console.log(
        '❌ No "On-Demand Consolidated Exchange Orders Report" emails found.'
      );
    }

    console.log("📦 Now downloading Amazon Exchange file after Gmail...");
    const amazonFiles = await downloadAmazonExchangeCsv(accountId, uploadDir);
    console.log("✅ Amazon Exchange files downloaded:", amazonFiles);
    attachments.push(...amazonFiles);
  } catch (err) {
    console.error("❌ Error in Gmail processing:", err.message);
    return null;
  }
}

module.exports = {
  downloadGmailOrderFile,
};
