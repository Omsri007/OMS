const fs = require('fs');
const path = require('path');
const express = require('express');
const router = express.Router();

router.get('/check-token', (req, res) => {
  const tokensDir = path.join(__dirname, '../tokens');

  try {
    // Check if the directory exists first
    if (!fs.existsSync(tokensDir)) {
      return res.json({ tokenExists: false });
    }

    // Read all files in the tokens folder
    const files = fs.readdirSync(tokensDir);

    // Filter to JSON token files (you can make this more specific if needed)
    const tokenFiles = files.filter(file => file.endsWith('_token.json'));

    const tokenExists = tokenFiles.length > 0;

    res.json({ tokenExists });
  } catch (error) {
    console.error('❌ Error checking tokens:', error);
    res.status(500).json({ error: 'Failed to check tokens' });
  }
});

module.exports = router;
