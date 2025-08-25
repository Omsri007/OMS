const { downloadAmazonExchangeCsv } = require("./cron/amazonExchangeDownloader");

(async () => {
  const accountId = "bestiamtech";
  const downloadedFiles = await downloadAmazonExchangeCsv(accountId);
  console.log("📁 Files downloaded:", downloadedFiles);
})();
