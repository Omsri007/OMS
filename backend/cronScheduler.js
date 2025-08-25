const cron = require("node-cron");
const fs = require("fs");
const path = require("path");

const { downloadGmailOrderFile } = require("./cron/downloadGmailOrderFile");
const { fetchAndSaveBalances } = require("./Routes/balanceFetcher");

// 📁 Folder where tokens are stored
const TOKENS_DIR = path.join(__dirname, "tokens");

// 🔁 Get all accountIds dynamically from token filenames
function getAccountIdsFromTokenFiles() {
  const files = fs.readdirSync(TOKENS_DIR);
  return files
    .filter(file => file.endsWith("_token.json"))
    .map(file => file.replace("_token.json", ""));
}

// 📩 Every day at 3:50 PM – file download per account
cron.schedule("50 15 * * *", async () => {
  console.log("⏰ (Cron) Starting Gmail file downloads for all accounts...");

  const accountIds = getAccountIdsFromTokenFiles();

  for (const accountId of accountIds) {
    try {
      console.log(`📥 Downloading Gmail file for account: ${accountId}`);
      await downloadGmailOrderFile(accountId);
      console.log(`✅ File downloaded for account: ${accountId}`);
    } catch (err) {
      console.error(`❌ Error downloading file for ${accountId}:`, err);
    }
  }

  console.log("🎉 All downloads finished.");
},
  {
    timezone: "Asia/Kolkata", // ✅ Indian timezone
  });

// 💰 Every 30 minutes – fetch balances for all accountIds with tokens
cron.schedule("*/30 * * * *", async () => {
  const accountIds = getAccountIdsFromTokenFiles();

  console.log(`⏰ (Cron) Found ${accountIds.length} account(s) for balance fetch:`, accountIds);

  for (const accountId of accountIds) {
    try {
      console.log(`🔄 Fetching balances for: ${accountId}`);
      await fetchAndSaveBalances(accountId);
      console.log(`✅ Done for: ${accountId}`);
    } catch (err) {
      console.error(`❌ Error fetching balances for ${accountId}:`, err);
    }
  }
},{ timezone: "Asia/Kolkata" });
