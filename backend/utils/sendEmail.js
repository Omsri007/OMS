const nodemailer = require('nodemailer');
const { google } = require('googleapis');

// ✅ Correct environment variables from .env
const CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const REDIRECT_URI = 'https://developers.google.com/oauthplayground'; // Google OAuth2 Playground
const REFRESH_TOKEN = process.env.GOOGLE_REFRESH_TOKEN;
const SENDER_EMAIL = process.env.EMAIL_SENDER; // Your sender email from .env

// Create an OAuth2 client with the credentials provided
const oAuth2Client = new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI);
oAuth2Client.setCredentials({ refresh_token: REFRESH_TOKEN });

// Function to send email using Nodemailer and Gmail's OAuth2 service
async function sendEmail(to, subject, text) {
  try {
    // Get access token from OAuth2 client
    const accessToken = await oAuth2Client.getAccessToken();

    // Create Nodemailer transport using Gmail with OAuth2
    const transport = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        type: 'OAuth2',
        user: SENDER_EMAIL, // Sender email (your Gmail address)
        clientId: CLIENT_ID,
        clientSecret: CLIENT_SECRET,
        refreshToken: REFRESH_TOKEN,
        accessToken: accessToken.token,
      },
    });

    // Set the mail options for the email
    const mailOptions = {
      from: `Your App Name <${SENDER_EMAIL}>`, // Sender email
      to: to, // Recipient email
      subject: subject, // Email subject
      text: text, // Email body
    };

    // Send the email
    const result = await transport.sendMail(mailOptions);
    console.log('Email sent:', result);
    return result;
  } catch (error) {
    console.error('Error sending email:', error.message);
    throw new Error('Email sending failed');
  }
}

module.exports = { sendEmail };  
