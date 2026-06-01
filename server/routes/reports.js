const express = require('express');
const db = require('../db');
const { buildSalesPdf } = require('../services/pdfReport');

const router = express.Router();

function parseDateRange(from, to) {
  if (!from || !to) return null;
  // Convert to ISO format for PostgreSQL
  const fromDate = new Date(from + 'T00:00:00').toISOString();
  const toDate = new Date(to + 'T23:59:59').toISOString();
  return { fromDate, toDate, from, to };
}

async function getSalesData(fromDate, toDate) {
  try {
    const summary = await db
      .prepare(
        `SELECT COUNT(*) AS totalOrders, COALESCE(SUM(total), 0) AS grossSales
         FROM orders
         WHERE payment_status = 'paid'
           AND created_at >= ?
           AND created_at <= ?`
      )
      .get(fromDate, toDate);

    const itemBreakdown = await db
      .prepare(
        `SELECT oi.name AS name,
                SUM(oi.qty) AS qty,
                SUM(oi.line_total) AS revenue
         FROM order_items oi
         JOIN orders o ON o.id = oi.order_id
         WHERE o.payment_status = 'paid'
           AND o.created_at >= ?
           AND o.created_at <= ?
         GROUP BY oi.name
         ORDER BY revenue DESC`
      )
      .all(fromDate, toDate);

    const dailyBreakdown = await db
      .prepare(
        `SELECT DATE(created_at) AS saleDate,
                COUNT(*) AS orderCount,
                COALESCE(SUM(total), 0) AS revenue
         FROM orders
         WHERE payment_status = 'paid'
           AND created_at >= ?
           AND created_at <= ?
         GROUP BY DATE(created_at)
         ORDER BY saleDate DESC`
      )
      .all(fromDate, toDate);

    const orders = await db
      .prepare(
        `SELECT id, total, created_at, payment_mode
         FROM orders
         WHERE payment_status = 'paid'
           AND created_at >= ?
           AND created_at <= ?
         ORDER BY created_at DESC`
      )
      .all(fromDate, toDate);

    const getOrderItems = db.prepare(
      `SELECT name, qty, line_total FROM order_items WHERE order_id = ?`
    );

    const ordersList = await Promise.all(orders.map(async (order) => {
      const createdAt = order.created_at instanceof Date ? order.created_at.toISOString() : order.created_at;
      return {
        id: order.id,
        total: order.total,
        createdAt: createdAt,
        saleDate: createdAt.slice(0, 10),
        time: createdAt.slice(11, 16),
        paymentMode: order.payment_mode || 'cash',
        items: (await getOrderItems.all(order.id)).map((i) => ({
          name: i.name,
          qty: i.qty,
          lineTotal: i.line_total,
        })),
      };
    }));

    return {
      summary: {
        totalOrders: summary.totalOrders,
        grossSales: summary.grossSales,
      },
      itemBreakdown: itemBreakdown.map((r) => ({
        name: r.name,
        qty: r.qty,
        revenue: r.revenue,
      })),
      dailyBreakdown: dailyBreakdown.map((r) => ({
        date: r.saleDate,
        orderCount: r.orderCount,
        revenue: r.revenue,
      })),
      ordersList,
    };
  } catch (err) {
    console.error('Error getting sales data:', err);
    throw err;
  }
}

function monthRange(year, month) {
  const from = `${year}-${String(month).padStart(2, '0')}-01`;
  const lastDay = new Date(year, month, 0).getDate();
  const to = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
  return parseDateRange(from, to);
}

function resolveRange(req) {
  let range = parseDateRange(req.query.from, req.query.to);

  if (!range && req.query.preset === 'this-month') {
    const now = new Date();
    range = monthRange(now.getFullYear(), now.getMonth() + 1);
  } else if (!range && req.query.preset === 'last-month') {
    const now = new Date();
    const m = now.getMonth() === 0 ? 12 : now.getMonth();
    const y = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();
    range = monthRange(y, m);
  }

  return range;
}

router.get('/sales', async (req, res) => {
  const range = resolveRange(req);
  if (!range) {
    return res.status(400).json({ error: 'Provide from & to dates or a preset' });
  }

  const data = await getSalesData(range.fromDate, range.toDate);
  res.json({
    from: range.from,
    to: range.to,
    ...data,
  });
});

router.get('/sales.pdf', async (req, res) => {
  try {
    const range = resolveRange(req);
    if (!range) {
      return res.status(400).json({ error: 'Provide from & to dates or a preset' });
    }

    const settings = await db.prepare('SELECT * FROM settings WHERE id = 1').get();
    if (!settings) {
      return res.status(500).json({ error: 'Settings not found' });
    }
    
    const data = await getSalesData(range.fromDate, range.toDate);

    try {
      const pdfBuffer = await buildSalesPdf({
        restaurantName: settings.restaurant_name || 'Restaurant',
        from: range.from,
        to: range.to,
        summary: data.summary,
        itemBreakdown: data.itemBreakdown,
        dailyBreakdown: data.dailyBreakdown,
        ordersList: data.ordersList,
      });
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="sales-report-${range.from}-to-${range.to}.pdf"`
      );
      res.send(pdfBuffer);
    } catch (err) {
      console.error('Error generating PDF:', err);
      res.status(500).json({ error: 'Failed to generate PDF: ' + err.message });
    }
  } catch (err) {
    console.error('Error in sales PDF route:', err);
    res.status(500).json({ error: 'Failed to generate sales report: ' + err.message });
  }
});

module.exports = router;
