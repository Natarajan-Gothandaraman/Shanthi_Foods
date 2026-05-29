const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

// Use environment variable for data directory to support persistent volumes
const dataDir = process.env.DATA_DIR || path.join(__dirname, '..', 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, 'restaurant.db');
const db = new Database(dbPath);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// Backup and restore functions
function backupDatabase() {
  const backupPath = path.join(dataDir, `restaurant-backup-${Date.now()}.db`);
  fs.copyFileSync(dbPath, backupPath);
  return backupPath;
}

function restoreDatabase(backupPath) {
  if (!fs.existsSync(backupPath)) {
    throw new Error('Backup file not found');
  }
  fs.copyFileSync(backupPath, dbPath);
}

const SEED_ITEMS = [
  { name: 'Idly', price: 30, image_url: '/images/idly.jpg' },
  { name: 'Puttu', price: 40, image_url: '/images/puttu.jpg' },
  { name: 'Poori', price: 45, image_url: '/images/poori.jpg' },
  { name: 'Coffee', price: 20, image_url: '/images/coffee.jpg' },
  { name: 'Dosai', price: 50, image_url: '/images/dosai.jpg' },
  { name: 'Vada', price: 25, image_url: '/images/vada.jpg' },
];

const MENU_IMAGE_MAP = {
  Idly: '/images/idly.jpg',
  Puttu: '/images/puttu.jpg',
  Poori: '/images/poori.jpg',
  Coffee: '/images/coffee.jpg',
  Dosai: '/images/dosai.jpg',
  Vada: '/images/vada.jpg',
};

function initDb() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS menu_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      price REAL NOT NULL,
      image_url TEXT DEFAULT '',
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now','+5 hours','30 minutes'))
    );

    CREATE TABLE IF NOT EXISTS orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      total REAL NOT NULL,
      payment_status TEXT NOT NULL DEFAULT 'pending',
      payment_mode TEXT,
      paid_at TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now','+5 hours','30 minutes'))
    );

    CREATE TABLE IF NOT EXISTS order_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id INTEGER NOT NULL,
      menu_item_id INTEGER,
      name TEXT NOT NULL,
      price REAL NOT NULL,
      qty INTEGER NOT NULL,
      line_total REAL NOT NULL,
      FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS settings (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      restaurant_name TEXT NOT NULL DEFAULT 'Shanthi Foods',
      upi_id TEXT NOT NULL DEFAULT 'yourname@upi',
      upi_payee_name TEXT NOT NULL DEFAULT 'Shanthi Foods'
    );
  `);

  const settingsCount = db.prepare('SELECT COUNT(*) AS c FROM settings').get();
  if (settingsCount.c === 0) {
    db.prepare(
      `INSERT INTO settings (id, restaurant_name, upi_id, upi_payee_name)
       VALUES (1, 'Shanthi Foods', '9342938927@ptsbi', 'Shanthi Foods')`
    ).run();
  } else {
    db.prepare(
      `UPDATE settings SET
         restaurant_name = 'Shanthi Foods',
         upi_payee_name = CASE WHEN upi_payee_name IN ('South Kitchen', 'Restaurant', 'My Restaurant')
           THEN 'Shanthi Foods' ELSE upi_payee_name END
       WHERE restaurant_name IN ('South Kitchen', 'My Restaurant')`
    ).run();
  }

  for (const [name, imageUrl] of Object.entries(MENU_IMAGE_MAP)) {
    db.prepare(
      `UPDATE menu_items SET image_url = ? WHERE name = ?`
    ).run(imageUrl, name);
  }

  const menuCount = db.prepare('SELECT COUNT(*) AS c FROM menu_items').get();
  if (menuCount.c === 0) {
    const insert = db.prepare(
      `INSERT INTO menu_items (name, price, image_url, is_active) VALUES (?, ?, ?, 1)`
    );
    for (const item of SEED_ITEMS) {
      insert.run(item.name, item.price, item.image_url);
    }
  }
}

initDb();

module.exports = db;
module.exports.backupDatabase = backupDatabase;
module.exports.restoreDatabase = restoreDatabase;
