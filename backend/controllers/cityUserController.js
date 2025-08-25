const bcrypt = require('bcryptjs');
const { getAuthDB } = require('../config/db');
const createAuthModels = require('../models/AuthModels');
const jwt = require('jsonwebtoken');   // ✅ added
const config = require('../config/config'); // ✅ added

let models;
function getModels() {
  if (!models) {
    const authConn = getAuthDB();
    models = createAuthModels(authConn);
  }
  return models;
}

// helper to sign token
function signToken(payload) {
  return jwt.sign(payload, config.jwtSecret, { expiresIn: config.jwtExpiresIn });
}

// Admin-only creation of City users (as per your CityPincodeCreate.js)
exports.createCityUser = async (req, res) => {
  try {
    const { email, password, cityPincode } = req.body;
    if (!email || !password || !cityPincode) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    const { getCityModel } = getModels();
    const City = getCityModel();

    const exists = await City.findOne({ email });
    if (exists) {
      return res.status(409).json({ message: 'A city user with this Gmail already exists' });
    }

    const hashed = await bcrypt.hash(password, 10);
    const doc = await City.create({ email, password: hashed, cityPincode });

    // ✅ issue token immediately after creation
    const token = signToken({ id: doc._id, email: doc.email, role: 'city', cityPincode: doc.cityPincode });

    // ✅ store lastLoginToken in DB
    doc.lastLoginToken = token;
    await doc.save();

    return res.status(201).json({
      message: 'City user created successfully and logged in',
      token,
      user: { id: doc._id, email: doc.email, role: 'city', cityPincode: doc.cityPincode },
    });
  } catch (err) {
    console.error('createCityUser error:', err);
    if (err.code === 11000) {
      return res.status(409).json({ message: 'A city user with this Gmail already exists' });
    }
    return res.status(500).json({ message: 'Server error' });
  }
};
























// const bcrypt = require('bcryptjs');
// const { getAuthDB } = require('../config/db');
// const createAuthModels = require('../models/AuthModels');
// const jwt = require('jsonwebtoken');   // ✅ added
// const config = require('../config/config'); // ✅ added

// let models;
// function getModels() {
//   if (!models) {
//     const authConn = getAuthDB();
//     models = createAuthModels(authConn);
//   }
//   return models;
// }

// // helper to sign token
// function signToken(payload) {
//   return jwt.sign(payload, config.jwtSecret, { expiresIn: config.jwtExpiresIn });
// }

// // Admin-only creation of City users (as per your CityPincodeCreate.js)
// exports.createCityUser = async (req, res) => {
//   try {
//     const { email, password, cityPincode } = req.body;
//     if (!email || !password || !cityPincode) {
//       return res.status(400).json({ message: 'All fields are required' });
//     }

//     const { getCityModel } = getModels();
//     const City = getCityModel();

//     const exists = await City.findOne({ email });
//     if (exists) {
//       return res.status(409).json({ message: 'A city user with this Gmail already exists' });
//     }

//     const hashed = await bcrypt.hash(password, 10);
//     const doc = await City.create({ email, password: hashed, cityPincode });

//     // ✅ issue token immediately after creation
//     const token = signToken({ id: doc._id, email: doc.email, role: 'city', cityPincode: doc.cityPincode });

//     return res.status(201).json({
//       message: 'City user created successfully and logged in',
//       token,
//       user: { id: doc._id, email: doc.email, role: 'city', cityPincode: doc.cityPincode },
//     });
//   } catch (err) {
//     console.error('createCityUser error:', err);
//     if (err.code === 11000) {
//       return res.status(409).json({ message: 'A city user with this Gmail already exists' });
//     }
//     return res.status(500).json({ message: 'Server error' });
//   }
// };
