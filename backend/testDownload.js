const { downloadGmailOrderFile } = require('./cron/downloadGmailOrderFile'); // adjust the path

(async () => {
  try {
    console.log("🚀 Starting Gmail order file download test...");
    
    const attachments = await downloadGmailOrderFile('bestiamtech'); // Replace 'default' if you're using a specific account ID
    
    if (attachments && attachments.length > 0) {
      console.log("✅ Files downloaded successfully:");
      attachments.forEach((file, i) => {
        console.log(`  ${i + 1}. ${file}`);
      });
    } else {
      console.log("⚠️ No files downloaded.");
    }
  } catch (err) {
    console.error("❌ Error running downloadGmailOrderFile test:", err.message);
  }
})();
