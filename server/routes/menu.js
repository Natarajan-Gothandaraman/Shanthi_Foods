const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const db = require('../db');

const router = express.Router();

const uploadsDir = path.join(__dirname, '..', '..', 'public', 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadsDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname) || '.jpg';
    cb(null, `menu-${Date.now()}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (/^image\//.test(file.mimetype)) cb(null, true);
    else cb(new Error('Only image files are allowed'));
  },
});

router.get('/', async (req, res) => {
  const activeOnly = req.query.active === '1';
  let sql = 'SELECT * FROM menu_items';
  if (activeOnly) sql += ' WHERE is_active = 1';
  sql += ' ORDER BY name ASC';
  const items = await db.prepare(sql).all();
  res.json(items);
});

router.get('/:id', async (req, res) => {
  const item = await db.prepare('SELECT * FROM menu_items WHERE id = ?').get(req.params.id);
  if (!item) return res.status(404).json({ error: 'Menu item not found' });
  res.json(item);
});

router.post('/', upload.single('image'), async (req, res) => {
  const { name, price, is_active } = req.body;
  if (!name || price === undefined) {
    return res.status(400).json({ error: 'Name and price are required' });
  }
  const imageUrl = req.file ? `/uploads/${req.file.filename}` : req.body.image_url || '';
  const active = is_active === '0' || is_active === 'false' ? 0 : 1;
  try {
    const result = await db
      .prepare(
        `INSERT INTO menu_items (name, price, image_url, is_active) VALUES (?, ?, ?, ?)`
      )
      .run(name.trim(), parseFloat(price), imageUrl, active);
    const item = await db.prepare('SELECT * FROM menu_items WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json(item);
  } catch (err) {
    console.error('Error saving menu item:', err);
    res.status(500).json({ error: 'Failed to save menu item' });
  }
});

router.put('/:id', upload.single('image'), async (req, res) => {
  try {
    const existing = await db.prepare('SELECT * FROM menu_items WHERE id = ?').get(req.params.id);
    if (!existing) return res.status(404).json({ error: 'Menu item not found' });

    const name = req.body.name !== undefined ? req.body.name.trim() : existing.name;
    const price = req.body.price !== undefined ? parseFloat(req.body.price) : existing.price;
    const active =
      req.body.is_active !== undefined
        ? req.body.is_active === '0' || req.body.is_active === 'false'
          ? 0
          : 1
        : existing.is_active;
    let imageUrl = existing.image_url;
    if (req.file) {
      imageUrl = `/uploads/${req.file.filename}`;
      if (existing.image_url && existing.image_url.startsWith('/uploads/')) {
        const oldPath = path.join(__dirname, '..', '..', 'public', existing.image_url);
        if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
      }
    } else if (req.body.image_url !== undefined) {
      imageUrl = req.body.image_url;
    }

    await db.prepare(
      `UPDATE menu_items SET name = ?, price = ?, image_url = ?, is_active = ? WHERE id = ?`
    ).run(name, price, imageUrl, active, req.params.id);

    const item = await db.prepare('SELECT * FROM menu_items WHERE id = ?').get(req.params.id);
    res.json(item);
  } catch (err) {
    console.error('Error updating menu item:', err);
    res.status(500).json({ error: 'Failed to update menu item' });
  }
});

router.delete('/:id', async (req, res) => {
  const existing = await db.prepare('SELECT * FROM menu_items WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Menu item not found' });

  if (existing.image_url && existing.image_url.startsWith('/uploads/')) {
    const filePath = path.join(__dirname, '..', '..', 'public', existing.image_url);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  }

  await db.prepare('DELETE FROM menu_items WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

router.post('/backup', (req, res) => {
  try {
    const backupPath = db.backupDatabase();
    res.json({ success: true, backupPath });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/restore', (req, res) => {
  const { backupPath } = req.body;
  if (!backupPath) {
    return res.status(400).json({ error: 'backupPath is required' });
  }
  try {
    db.restoreDatabase(backupPath);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
