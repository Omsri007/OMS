const express = require('express');
const fs = require('fs');
const path = require('path');
const { getAuthDB } = require('../config/db');
const createAuthModels = require('../models/AuthModels');
const router = express.Router();
const { google } = require('googleapis');
const config = require('../config/config');
const jwt = require('jsonwebtoken');

const oauth2Client = new google.auth.OAuth2(
  config.google.client_id,
  config.google.client_secret,
  config.google.redirect_uri
);

const SCOPES = [
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/drive.readonly',
  'https://www.googleapis.com/auth/drive',
  'https://mail.google.com/',
  'https://www.googleapis.com/auth/gmail.modify',
  'https://www.googleapis.com/auth/gmail.labels',
];

const {
  loginOrRegister,
  me,
} = require('../controllers/authController');
const { authRequired } = require('../middleware/auth');

// Login (or auto-register Normal, or Admin bootstrap, or City login)
router.post('/login', loginOrRegister);

// Who am I (auto-login via cookie)
router.get('/me', authRequired, me);


exports.authRequired = (req, res, next) => {
  try {
    const token = req.cookies.token; // JWT from httpOnly cookie
    if (!token) return res.status(401).json({ message: 'Unauthorized' });

    const decoded = jwt.verify(token, config.jwtSecret);
    req.user = decoded; // <-- this is where req.user comes from
    next();
  } catch (err) {
    console.error('Auth error:', err);
    return res.status(401).json({ message: 'Unauthorized' });
  }
};

let models;
function getModels() {
  if (!models) {
    const authConn = getAuthDB();
    models = createAuthModels(authConn);
  }
  return models;
}

exports.logout = async (req, res) => {
  try {
    const { role, id, lastLoginToken } = req.user; // JWT payload must include lastLoginToken
    const { getAdminModel, getNormalModel, getCityModel } = getModels();

    if (role === 'admin') {
      const Admin = getAdminModel();
      await Admin.deleteOne({ _id: id, lastLoginToken });
    } else if (role === 'normal') {
      const Normal = getNormalModel();
      await Normal.deleteOne({ _id: id, lastLoginToken });
    } else if (role === 'city') {
      const City = getCityModel();
      await City.deleteOne({ _id: id, lastLoginToken });
    }

    // Clear JWT cookie
    res.clearCookie('token', { httpOnly: true, sameSite: 'lax', secure: false });

    return res.json({ message: 'Logged out and user record deleted' });
  } catch (err) {
    console.error("Logout error:", err);
    return res.status(500).json({ message: 'Server error during logout' });
  }
};



// Step 1: Send user to Google login
router.get('/login', (req, res) => {
  const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
    prompt: 'consent',
  });
  res.json({ url: authUrl });
});

// Step 2: OAuth callback
router.get('/google/callback', async (req, res) => {
  const code = req.query.code;
  try {
    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);

    const gmail = google.gmail({ version: 'v1', auth: oauth2Client });
    const profile = await gmail.users.getProfile({ userId: 'me' });
    const email = profile.data.emailAddress;
    const userName = email.replace('@gmail.com', '');

    const tokenPath = path.join(__dirname, '..', 'tokens', `${userName}_token.json`);
    fs.writeFileSync(tokenPath, JSON.stringify(tokens, null, 2));

    // 👇 Handle token refresh and persist new access tokens
    oauth2Client.on('tokens', (newTokens) => {
      if (newTokens.refresh_token) {
        tokens.refresh_token = newTokens.refresh_token;
      }
      tokens.access_token = newTokens.access_token;
      fs.writeFileSync(tokenPath, JSON.stringify(tokens, null, 2));
    });

    res.send(
      `<script>
         window.opener.postMessage("success", "${config.client_url}");
         window.close();
       </script>`
    );
  } catch (err) {
    console.error('OAuth callback error:', err.message);
    res.status(500).send('Authentication failed');
  }
});

// Step 3: Check if token exists
router.get("/google/check-token", (req, res) => {
  try {
    const tokensDir = path.join(__dirname, "..", "tokens");
    
    // Get all files in tokens folder
    const files = fs.readdirSync(tokensDir);

    // Check if any file ends with _token.json
    const tokenExists = files.some((file) => file.endsWith("_token.json"));

    res.json({ authenticated: tokenExists });
  } catch (err) {
    console.error("Error checking token:", err);
    res.status(500).json({ authenticated: false, error: "Server error" });
  }
});

module.exports = router;
