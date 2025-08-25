// routes/cityUserRoutes.js
const express = require('express');
const router = express.Router();

const { createCityUser } = require('../controllers/cityUserController');
const { authRequired, adminOnly } = require('../middleware/auth');

// Admin-only endpoint used by CityPincodeCreate.js
router.post('/', authRequired, adminOnly, createCityUser);

module.exports = router;
