const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const config = require('../config/config');
const { getAuthDB } = require('../config/db');
const createAuthModels = require('../models/AuthModels');

let models; // singleton-ish per process

function getModels() {
  if (!models) {
    const authConn = getAuthDB();
    models = createAuthModels(authConn);
  }
  return models;
}

function signToken(payload) {
  return jwt.sign(payload, config.jwtSecret, { expiresIn: config.jwtExpiresIn });
}

function setAuthCookie(res, token) {
  // httpOnly cookie for auto-login via credentials: 'include'
  res.cookie('token', token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: false, // set true if behind HTTPS
    maxAge: 1000 * 60 * 60 * 24 * 30, // 30 days
  });
}

exports.loginOrRegister = async (req, res) => {
  try {
    const { email, password, cityPincode } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: 'Gmail and password are required' });
    }

    const { getAdminModel, getNormalModel, getCityModel } = getModels();
    const Admin = getAdminModel();
    const Normal = getNormalModel();
    const City = getCityModel();

    // 1) Bootstrap: if no admin exists yet, the first login becomes Admin
    const adminCount = await Admin.countDocuments();
    if (adminCount === 0) {
      const hashed = await bcrypt.hash(password, 10);
      const admin = await Admin.create({ email, password: hashed });
      const token = signToken({ id: admin._id, email: admin.email, role: 'admin' });

      // ✅ Save token in lastLoginToken for first Admin
      admin.lastLoginToken = token;
      await admin.save();

      setAuthCookie(res, token);
      return res.status(201).json({
        message: 'First login — Admin created and logged in',
        token,
        user: { id: admin._id, email: admin.email, role: 'admin' },
      });
    }

    // 2) If Admin exists already, check if this login is admin (no cityPincode expected)
    const existingAdmin = await Admin.findOne({ email });
    if (existingAdmin && !cityPincode) {
      const ok = await bcrypt.compare(password, existingAdmin.password);
      if (!ok) return res.status(401).json({ message: 'Invalid credentials' });
      const token = signToken({ id: existingAdmin._id, email, role: 'admin' });
      setAuthCookie(res, token);
      return res.json({
        message: 'Admin login successful',
        token,
        user: { id: existingAdmin._id, email, role: 'admin' },
      });
    }

    // 3) City user login path (requires cityPincode to decide City user)
    if (cityPincode) {
      const cityUser = await City.findOne({ email });
      if (!cityUser) {
        return res.status(404).json({ message: 'City user not found. Ask admin to create it.' });
      }
      const ok = await bcrypt.compare(password, cityUser.password);
      if (!ok) return res.status(401).json({ message: 'Invalid credentials' });

      // enforce cityPincode match
      if (cityUser.cityPincode !== cityPincode) {
        return res.status(401).json({ message: 'City-Pincode mismatch' });
      }

      const token = signToken({ id: cityUser._id, email, role: 'city', cityPincode });
      setAuthCookie(res, token);
      return res.json({
        message: 'City user login successful',
        token,
        user: { id: cityUser._id, email, role: 'city', cityPincode },
      });
    }

    // 4) Normal user login path (auto-register first time; no signup page)
    let normal = await Normal.findOne({ email });
    if (!normal) {
      // create new normal user
      const hashed = await bcrypt.hash(password, 10);
      normal = await Normal.create({ email, password: hashed });
    } else {
      // auto-login if password matches
      const ok = await bcrypt.compare(password, normal.password);
      if (!ok) return res.status(401).json({ message: 'Invalid credentials' });
    }

    const token = signToken({ id: normal._id, email, role: 'normal' });

    // ✅ Save token in lastLoginToken for Normal users
    normal.lastLoginToken = token;
    await normal.save();

    setAuthCookie(res, token);
    return res.json({
      message: normal ? 'Login successful' : 'Registered and logged in',
      token,
      user: { id: normal._id, email, role: 'normal' },
    });
  } catch (err) {
    console.error('loginOrRegister error:', err);
    // Handle unique email race conditions nicely
    if (err.code === 11000) {
      return res.status(409).json({ message: 'Email already exists in this user type' });
    }
    return res.status(500).json({ message: 'Server error' });
  }
};

exports.me = async (req, res) => {
  // reflect user from JWT
  return res.json({ user: req.user || null });
};




















// const jwt = require('jsonwebtoken');
// const bcrypt = require('bcryptjs');
// const config = require('../config/config');
// const { getAuthDB } = require('../config/db');
// const createAuthModels = require('../models/AuthModels');

// let models; // singleton-ish per process

// function getModels() {
//   if (!models) {
//     const authConn = getAuthDB();
//     models = createAuthModels(authConn);
//   }
//   return models;
// }

// function signToken(payload) {
//   return jwt.sign(payload, config.jwtSecret, { expiresIn: config.jwtExpiresIn });
// }

// function setAuthCookie(res, token) {
//   // httpOnly cookie for auto-login via credentials: 'include'
//   res.cookie('token', token, {
//     httpOnly: true,
//     sameSite: 'lax',
//     secure: false, // set true if behind HTTPS
//     maxAge: 1000 * 60 * 60 * 24 * 30, // 30 days
//   });
// }

// exports.loginOrRegister = async (req, res) => {
//   try {
//     const { email, password, cityPincode } = req.body;
//     if (!email || !password) {
//       return res.status(400).json({ message: 'Gmail and password are required' });
//     }

//     const { getAdminModel, getNormalModel, getCityModel } = getModels();
//     const Admin = getAdminModel();
//     const Normal = getNormalModel();
//     const City = getCityModel();

//     // 1) Bootstrap: if no admin exists yet, the first login becomes Admin
//     const adminCount = await Admin.countDocuments();
//     if (adminCount === 0) {
//       const hashed = await bcrypt.hash(password, 10);
//       const admin = await Admin.create({ email, password: hashed });
//       const token = signToken({ id: admin._id, email: admin.email, role: 'admin' });
//       setAuthCookie(res, token);
//       return res.status(201).json({
//         message: 'First login — Admin created and logged in',
//         token,
//         user: { id: admin._id, email: admin.email, role: 'admin' },
//       });
//     }

//     // 2) If Admin exists already, check if this login is admin (no cityPincode expected)
//     const existingAdmin = await Admin.findOne({ email });
//     if (existingAdmin && !cityPincode) {
//       const ok = await bcrypt.compare(password, existingAdmin.password);
//       if (!ok) return res.status(401).json({ message: 'Invalid credentials' });
//       const token = signToken({ id: existingAdmin._id, email, role: 'admin' });
//       setAuthCookie(res, token);
//       return res.json({
//         message: 'Admin login successful',
//         token,
//         user: { id: existingAdmin._id, email, role: 'admin' },
//       });
//     }

//     // 3) City user login path (requires cityPincode to decide City user)
//     if (cityPincode) {
//       const cityUser = await City.findOne({ email });
//       if (!cityUser) {
//         return res.status(404).json({ message: 'City user not found. Ask admin to create it.' });
//       }
//       const ok = await bcrypt.compare(password, cityUser.password);
//       if (!ok) return res.status(401).json({ message: 'Invalid credentials' });

//       // enforce cityPincode match
//       if (cityUser.cityPincode !== cityPincode) {
//         return res.status(401).json({ message: 'City-Pincode mismatch' });
//       }

//       const token = signToken({ id: cityUser._id, email, role: 'city', cityPincode });
//       setAuthCookie(res, token);
//       return res.json({
//         message: 'City user login successful',
//         token,
//         user: { id: cityUser._id, email, role: 'city', cityPincode },
//       });
//     }

//     // 4) Normal user login path (auto-register first time; no signup page)
//     let normal = await Normal.findOne({ email });
//     if (!normal) {
//       // create new normal user
//       const hashed = await bcrypt.hash(password, 10);
//       normal = await Normal.create({ email, password: hashed });
//     } else {
//       // auto-login if password matches
//       const ok = await bcrypt.compare(password, normal.password);
//       if (!ok) return res.status(401).json({ message: 'Invalid credentials' });
//     }

//     const token = signToken({ id: normal._id, email, role: 'normal' });
//     setAuthCookie(res, token);
//     return res.json({
//       message: normal ? 'Login successful' : 'Registered and logged in',
//       token,
//       user: { id: normal._id, email, role: 'normal' },
//     });
//   } catch (err) {
//     console.error('loginOrRegister error:', err);
//     // Handle unique email race conditions nicely
//     if (err.code === 11000) {
//       return res.status(409).json({ message: 'Email already exists in this user type' });
//     }
//     return res.status(500).json({ message: 'Server error' });
//   }
// };

// exports.me = async (req, res) => {
//   // reflect user from JWT
//   return res.json({ user: req.user || null });
// };