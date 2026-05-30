const express = require('express');
const db = require('../db');

const router = express.Router();

router.get('/', async (_req, res) => {
  const settings = await db.prepare('SELECT * FROM settings WHERE id = 1').get();
  res.json(settings);
});

router.put('/', async (req, res) => {
  const { restaurant_name, upi_id, upi_payee_name } = req.body;
  const current = await db.prepare('SELECT * FROM settings WHERE id = 1').get();

  await db.prepare(
    `UPDATE settings SET restaurant_name = ?, upi_id = ?, upi_payee_name = ? WHERE id = 1`
  ).run(
    restaurant_name?.trim() || current.restaurant_name,
    upi_id?.trim() || current.upi_id,
    upi_payee_name?.trim() || current.upi_payee_name
  );

  const settings = await db.prepare('SELECT * FROM settings WHERE id = 1').get();
  res.json(settings);
});

module.exports = router;
