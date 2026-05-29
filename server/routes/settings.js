const express = require('express');
const db = require('../db');

const router = express.Router();

router.get('/', (_req, res) => {
  const settings = db.prepare('SELECT * FROM settings WHERE id = 1').get();
  res.json(settings);
});

router.put('/', (req, res) => {
  const { restaurant_name, upi_id, upi_payee_name } = req.body;
  const current = db.prepare('SELECT * FROM settings WHERE id = 1').get();

  db.prepare(
    `UPDATE settings SET restaurant_name = ?, upi_id = ?, upi_payee_name = ? WHERE id = 1`
  ).run(
    restaurant_name?.trim() || current.restaurant_name,
    upi_id?.trim() || current.upi_id,
    upi_payee_name?.trim() || current.upi_payee_name
  );

  const settings = db.prepare('SELECT * FROM settings WHERE id = 1').get();
  res.json(settings);
});

module.exports = router;
