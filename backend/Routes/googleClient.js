const express = require('express');
const router = express.Router();
const config = require('../config/config');

router.get('/client-id', (req, res) => {
  res.json({ clientId: config.google.client_id });
});

module.exports = router;
