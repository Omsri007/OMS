const express = require('express');
const router = express.Router();
const getGmailClient = require('../cron/gmailClient');
const getBalanceModel = require('../models/balanceModel');
const { getOrdersDB } = require('../config/db');
const mongoose = require("mongoose");

const SUBJECTS = [
  {
    subject: "Notification :BUYBACKAMZ_NEW_BUYBACK_BESTIAM CONSULTING_LA(7014851010000482)",
    toContains: "top",
  },
  {
    subject: "Notification :BUYBACKAMZ_NEW_BUYBACK_BESTIAM CONSULTING_MOBILE(7014851010000483)",
    toContains: "peak",
  },
  {
    subject: "Notification :BUYBACKAMZ_NEW_BUYBACK_BESTIAM CONSULTING(7014851010000466)",
    toContains: "best",
  },
];

function getBalanceModelFromOrdersDB() {
  const ordersDB = getOrdersDB();
  if (!ordersDB) throw new Error("OrdersDB is not connected yet.");

  return ordersDB.model("Balance", balanceSchema);
}

router.get('/fetch-balances/:accountId', async (req, res) => {
  const { accountId } = req.params;
  const Balance = getBalanceModelFromOrdersDB();

  try {
    const gmail = await getGmailClient(accountId);
    if (!gmail) return res.status(400).json({ error: 'Gmail client not available.' });

    const results = [];

    for (const item of SUBJECTS) {
      const query = `subject:"${item.subject}" newer_than:30d`;
      console.log(`📩 Querying Gmail with: ${query}`);

      const { data } = await gmail.users.messages.list({
        userId: 'me',
        q: query,
        maxResults: 1, // Only latest
      });

      if (!data.messages) {
        console.log(`❌ No messages found for subject: ${item.subject}`);
        continue;
      }

      for (const msg of data.messages) {
        const message = await gmail.users.messages.get({
          userId: 'me',
          id: msg.id,
          format: 'full',
        });

        const headers = message.data.payload.headers;
        const toHeader = headers.find(h => h.name === 'To')?.value || '';
        console.log(`✉️ To Header: ${toHeader}`);

        const bodyData = getBodyText(message.data.payload);
        console.log(`📝 Extracted text/plain body:\n${bodyData}`);
        console.log(bodyData.slice(0, 2000));

        if (toHeader.toLowerCase().includes(item.toContains)) {
          const balanceMatch = bodyData.match(/Rs\.?\s?[\d,]+/);
          console.log(`💰 Balance match:`, balanceMatch);

          if (balanceMatch) {
            const balanceObj = {
              subject: item.subject,
              to: toHeader,
              balance: balanceMatch[0],
              lastUpdated: new Date(),
            };

            results.push(balanceObj);

            const saved = await Balance.findOneAndUpdate(
              { to: toHeader },
              balanceObj,
              { upsert: true, new: true }
            );

            console.log(`✅ Saved balance to DB for: ${toHeader}`);
          } else {
            console.log(`❌ No balance match in body for: ${item.subject}`);
          }
        } else {
          console.log(`🚫 Skipped: 'To' header does not match '${item.toContains}'`);
        }
      }
    }

    return res.json({ accountId, count: results.length, balances: results });
  } catch (err) {
    console.error('❌ Error fetching balances:', err);
    return res.status(500).json({ error: 'Failed to fetch balances' });
  }
});

// Utility: recursively extract body text from Gmail payload
function getBodyText(payload) {
  if (!payload) return '';

  // Case 1: If multipart
  if (payload.parts) {
    let text = '';
    for (const part of payload.parts) {
      text += getBodyText(part);
    }
    return text;
  }

  // Case 2: text/plain
  if (payload.mimeType === 'text/plain' && payload.body?.data) {
    const buffer = Buffer.from(payload.body.data, 'base64');
    return buffer.toString('utf8');
  }

  // ✅ Case 3: fallback to text/html
  if (payload.mimeType === 'text/html' && payload.body?.data) {
    const buffer = Buffer.from(payload.body.data, 'base64');
    const html = buffer.toString('utf8');

    // Strip HTML tags and decode entities (basic)
    return html
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<[^>]*>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/\s+/g, ' ')
      .trim();
  }

  return '';
}

const balanceSchema = new mongoose.Schema({
  to: { type: String, required: true, unique: true },
  subject: String,
  balance: String,
  lastUpdated: { type: Date, default: Date.now },
});

// GET all balances for frontend
router.get("/balances", async (req, res) => {
  try {
    const Balance = getBalanceModelFromOrdersDB(); // ✅ Use lazy getter
    const balances = await Balance.find({}, { _id: 0, to: 1, balance: 1 });
    res.status(200).json({ balances });
  } catch (error) {
    console.error("❌ Error fetching balances:", error.message);
    res.status(500).json({ error: "Failed to fetch balances" });
  }
});

// ✅ Export only the fetch function for cron use
async function fetchAndSaveBalances(accountId) {
  const Balance = getBalanceModelFromOrdersDB();
  const gmail = await getGmailClient(accountId);
  if (!gmail) {
    console.error(`[${accountId}] ❌ Gmail client not available.`);
    return;
  }

  const results = [];

  for (const item of SUBJECTS) {
    const query = `subject:"${item.subject}" newer_than:30d`;
    const { data } = await gmail.users.messages.list({
      userId: 'me',
      q: query,
      maxResults: 1,
    });

    if (!data.messages) continue;

    for (const msg of data.messages) {
      const message = await gmail.users.messages.get({
        userId: 'me',
        id: msg.id,
        format: 'full',
      });

      const headers = message.data.payload.headers;
      const toHeader = headers.find(h => h.name === 'To')?.value || '';
      const bodyData = getBodyText(message.data.payload);

      if (toHeader.toLowerCase().includes(item.toContains)) {
        const balanceMatch = bodyData.match(/Rs\.?\s?[\d,]+/);
        if (balanceMatch) {
          const balanceObj = {
            subject: item.subject,
            to: toHeader,
            balance: balanceMatch[0],
            lastUpdated: new Date(),
          };

          results.push(balanceObj);

          await Balance.findOneAndUpdate(
            { to: toHeader },
            balanceObj,
            { upsert: true, new: true }
          );
        }
      }
    }
  }

  console.log(`⏱️ [Cron] Saved ${results.length} balance(s)`);
  return results;
}

module.exports = {
  router,
  fetchAndSaveBalances // ✅ Exported for use in cron
};
