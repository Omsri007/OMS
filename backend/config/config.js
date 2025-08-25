require("dotenv").config();

module.exports = {
  port: process.env.PORT || 5000,
  jwtSecret: process.env.JWT_SECRET || "dev_super_secret_change_me",
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || "30d",
  frontendUrl: process.env.FRONTEND_URL || "http://localhost:3000",
  mongo: {
    auth: process.env.MONGO_AUTH_URI || "mongodb://localhost:27017/authDB",
    orders: process.env.MONGO_ORDERS_URI || "mongodb://localhost:27017/ordersDB",
  },
  google: {
    client_id: process.env.GOOGLE_CLIENT_ID,
    client_secret: process.env.GOOGLE_CLIENT_SECRET,
    redirect_uri: process.env.REDIRECT_URI,
  },
  client_url: process.env.FRONTEND_URL || "http://localhost:3000",
};
