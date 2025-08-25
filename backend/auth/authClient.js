// const fs = require('fs').promises;
// const path = require('path');
// const { google } = require('googleapis');
// const config = require('../config/config');

// const TOKENS_DIR = path.join(__dirname, '..', 'tokens');
// const GMAIL_CONFIG_PATH = path.join(__dirname, '..', 'gmailConfig.json');
// fs.mkdir(TOKENS_DIR, { recursive: true });

// function getTokenPath(accountId) {
//   const sanitizedId = accountId.replace(/[^a-zA-Z0-9]/g, '_');
// return path.join(TOKENS_DIR, `${sanitizedId}_token.json`);
// }

// async function saveToken(accountId, token) {
//   const tokenPath = getTokenPath(accountId);
//   await fs.writeFile(tokenPath, JSON.stringify(token, null, 2));
// }

// async function loadSavedToken(accountId) {
//   try {
//     const content = await fs.readFile(getTokenPath(accountId), 'utf8');
//     return JSON.parse(content);
//   } catch {
//     return null;
//   }
// }

// function createOAuthClient() {
//   const oAuth2Client = new google.auth.OAuth2(
//     config.google.client_id,
//     config.google.client_secret,
//     config.google.redirect_uri
//   );

//   oAuth2Client.on('tokens', async (tokens) => {
//     if (tokens.refresh_token) {
//       console.log('🔁 Refresh token received and saved.');
//     } else {
//       console.log('🔄 Access token refreshed.');
//     }

//     try {
//       const gmailConfig = require(GMAIL_CONFIG_PATH);
//       const accountId = gmailConfig.email;
//       const oldToken = await loadSavedToken(accountId);
//       const updatedToken = { ...oldToken, ...tokens };
//       await saveToken(accountId, updatedToken);
//     } catch (err) {
//       console.error('⚠️ Failed to update token:', err.message);
//     }
//   });

//   return oAuth2Client;
// }

// async function saveGmailAccountInfo(email) {
//   await fs.writeFile(GMAIL_CONFIG_PATH, JSON.stringify({ email }, null, 2));
// }

// module.exports = {
//   createOAuthClient,
//   saveToken,
//   loadSavedToken,
//   saveGmailAccountInfo
// };
