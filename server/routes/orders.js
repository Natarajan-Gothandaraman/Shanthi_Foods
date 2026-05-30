const express = require('express');
const QRCode = require('qrcode');
const db = require('../db');

const router = express.Router();

router.post('/', async (req, res) => {
  const { items, markPaid, paymentMode } = req.body;
  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'Cart is empty' });
  }

  const getMenuItem = db.prepare('SELECT * FROM menu_items WHERE id = ? AND is_active = 1');
  const orderLines = [];
  let total = 0;

  for (const line of items) {
    const menuItem = await getMenuItem.get(line.menuItemId);
    if (!menuItem) {
      return res.status(400).json({ error: `Invalid menu item: ${line.menuItemId}` });
    }
    const qty = Math.max(1, parseInt(line.qty, 10) || 1);
    const lineTotal = menuItem.price * qty;
    total += lineTotal;
    orderLines.push({
      menu_item_id: menuItem.id,
      name: menuItem.name,
      price: menuItem.price,
      qty,
      line_total: lineTotal,
    });
  }

  const paid = markPaid === true || markPaid === 'true';
  const paymentStatus = paid ? 'paid' : 'pending';
  const paidAt = paid ? new Date().toISOString() : null;
  const mode = paymentMode || (paid ? 'cash' : null);

  const createOrder = async () => {
    const orderResult = await db
      .prepare(`INSERT INTO orders (total, payment_status, payment_mode, paid_at) VALUES (?, ?, ?, ?)`)
      .run(total, paymentStatus, mode, paidAt);
    const orderId = orderResult.lastInsertRowid;
    const insertLine = db.prepare(
      `INSERT INTO order_items (order_id, menu_item_id, name, price, qty, line_total)
       VALUES (?, ?, ?, ?, ?, ?)`
    );
    for (const line of orderLines) {
      await insertLine.run(
        orderId,
        line.menu_item_id,
        line.name,
        line.price,
        line.qty,
        line.line_total
      );
    }
    return orderId;
  };

  const orderId = await createOrder();
  const order = await db.prepare('SELECT * FROM orders WHERE id = ?').get(orderId);
  const orderItems = await db
    .prepare('SELECT * FROM order_items WHERE order_id = ?')
    .all(orderId);

  res.status(201).json({ order, items: orderItems });
});

router.get('/count/today', async (req, res) => {
  const today = new Date().toISOString().slice(0, 10);
  const count = await db
    .prepare('SELECT COUNT(*) AS count FROM orders WHERE DATE(created_at) = ?')
    .get(today);
  res.json({ count: count.count });
});

router.post('/qr', async (req, res) => {
  const { amount } = req.body;
  const total = parseFloat(amount);
  if (!total || total <= 0) {
    return res.status(400).json({ error: 'Invalid amount' });
  }

  const settings = await db.prepare('SELECT * FROM settings WHERE id = 1').get();
  const upiString = `upi://pay?pa=${encodeURIComponent(settings.upi_id)}&pn=${encodeURIComponent(settings.upi_payee_name)}&am=${total.toFixed(2)}&cu=INR`;

  try {
    const qrDataUrl = await QRCode.toDataURL(upiString, { width: 280, margin: 2 });
    res.json({
      qrDataUrl,
      upiString,
      amount: total,
      upiId: settings.upi_id,
      payeeName: settings.upi_payee_name,
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to generate QR code' });
  }
});

module.exports = router;
