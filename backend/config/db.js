// config/db.js
const mongoose = require('mongoose');
const config = require('./config'); // Import your config.js

let authDB = null;
let ordersDB = null;

const connectDBs = () => {
  try {
    // Orders DB connection
    ordersDB = mongoose.createConnection(config.mongo.orders, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      bufferCommands: true,
      bufferTimeoutMS: 30000,
      serverSelectionTimeoutMS: 30000,
    });

    ordersDB.on('connected', () => console.log('✅ Connected to OrdersDB'));
    ordersDB.on('error', (err) =>
      console.error('❌ OrdersDB connection error:', err)
    );

    // Auth DB connection
    authDB = mongoose.createConnection(config.mongo.auth, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      bufferCommands: true,
      bufferTimeoutMS: 30000,
      serverSelectionTimeoutMS: 30000,
    });

    authDB.on('connected', () => console.log('✅ Connected to AuthDB'));
    authDB.on('error', (err) =>
      console.error('❌ AuthDB connection error:', err)
    );

    console.log('🚀 All MongoDB connections initiated!');
  } catch (error) {
    console.error('❌ Error connecting to MongoDB:', error.message);
    process.exit(1);
  }
};

// Accessor functions
const getAuthDB = () => {
  if (!authDB) throw new Error('AuthDB is not connected yet.');
  return authDB;
};

const getOrdersDB = () => {
  if (!ordersDB) throw new Error('OrdersDB is not connected yet.');
  return ordersDB;
};

module.exports = {
  connectDBs,
  getAuthDB,
  getOrdersDB,
};
