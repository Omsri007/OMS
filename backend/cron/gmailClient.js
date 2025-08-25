const fs = require('fs');
const path = require('path');
const { google } = require('googleapis');
const config = require('../config/config');

const SCOPES = [
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/drive.readonly',
  'https://www.googleapis.com/auth/drive',
  'https://mail.google.com/',
  'https://www.googleapis.com/auth/gmail.modify',
  'https://www.googleapis.com/auth/gmail.labels',
];

function getOAuth2Client() {
  return new google.auth.OAuth2(
    config.google.client_id,
    config.google.client_secret,
    config.google.redirect_uri
  );
}

async function getGmailClient(accountId, includeDrive = false) {
  if (!accountId) {
    console.error("❌ No accountId provided to getGmailClient.");
    return null;
  }

  const tokenPath = path.join(__dirname, '..', 'tokens', `${accountId}_token.json`);

  if (!fs.existsSync(tokenPath)) {
    console.error(`❌ Token file not found for ${accountId}`);
    console.error(`👉 Authenticate this account by visiting: ${config.server_url}/auth/login?accountId=${accountId}`);
    return null;
  }

  let tokens;
  try {
    tokens = JSON.parse(fs.readFileSync(tokenPath));
  } catch (err) {
    console.error(`❌ Failed to read token file for ${accountId}:`, err);
    return null;
  }

  const oAuth2Client = getOAuth2Client();
  oAuth2Client.setCredentials(tokens);

  // 🔁 Auto-save new tokens
  oAuth2Client.on('tokens', (newTokens) => {
    if (newTokens.refresh_token) {
      tokens.refresh_token = newTokens.refresh_token;
    }
    if (newTokens.access_token) {
      tokens.access_token = newTokens.access_token;
    }
    fs.writeFileSync(tokenPath, JSON.stringify(tokens, null, 2));
    console.log(`🔁 Tokens updated for ${accountId}`);
  });

  // ✅ Test token validity
  try {
    const gmail = google.gmail({ version: 'v1', auth: oAuth2Client });
    await gmail.users.getProfile({ userId: 'me' }); // Simple test request
  } catch (err) {
    if (err.response?.data?.error === 'invalid_grant') {
      console.error(`🚨 Token for ${accountId} is expired or revoked.`);
      console.error(`👉 Re-authenticate here: ${config.server_url}/auth/login?accountId=${accountId}`);
      console.error(`⚠ Make sure your OAuth flow includes these SCOPES:`);
      console.error(SCOPES.join('\n'));
      return null;
    } else {
      console.error(`❌ Gmail API error for ${accountId}:`, err.message);
    }
  }

  if (includeDrive) return oAuth2Client;
  return google.gmail({ version: 'v1', auth: oAuth2Client });
}

module.exports = getGmailClient;
