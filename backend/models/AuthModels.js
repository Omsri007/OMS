// models/AuthModels.js
const mongoose = require('mongoose');

// Admin Schema
const adminSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  lastLoginToken: { type: String }, // Added field
  createdAt: { type: Date, default: Date.now }
});

// Normal User Schema
const normalSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  lastLoginToken: { type: String }, // Added field
  createdAt: { type: Date, default: Date.now }
});

// City User Schema
const citySchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  cityPincode: { type: String, required: true },
  lastLoginToken: { type: String }, // Added field
  createdAt: { type: Date, default: Date.now }
});

function createAuthModels(authConnection) {
  if (!authConnection) {
    throw new Error('Auth DB connection is not initialized.');
  }

  const AdminModel = authConnection.model('Admin', adminSchema);
  const NormalModel = authConnection.model('Normal', normalSchema);
  const CityModel = authConnection.model('City', citySchema);

  function getAdminModel() {
    return AdminModel;
  }

  function getNormalModel() {
    return NormalModel;
  }

  function getCityModel() {
    return CityModel;
  }

  return {
    getAdminModel,
    getNormalModel,
    getCityModel
  };
}

module.exports = createAuthModels;
