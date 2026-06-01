const { Pool } = require('pg');
const path = require('path');
const fs = require('fs');

// Use PostgreSQL if DATABASE_URL is set (for Render), otherwise use SQLite
const usePostgres = process.env.DATABASE_URL ? true : false;

let db;
let pool;

if (usePostgres) {
  // PostgreSQL (Render) connection
  pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL.includes('localhost') ? false : { rejectUnauthorized: false }
  });
  
  // Create a simple wrapper that mimics SQLite's prepare/run/get/all API
  db = {
    prepare: (sql) => {
      return {
        run: async (...params) => {
          const client = await pool.connect();
          try {
            // Convert SQLite INSERT to PostgreSQL
            let pgSql = sql.replace(/AUTOINCREMENT/g, '').replace(/INTEGER PRIMARY KEY/g, 'SERIAL PRIMARY KEY');
            // Convert datetime function
            pgSql = pgSql.replace(/datetime\('now','\+5 hours','30 minutes'\)/g, "NOW() + INTERVAL '5 hours 30 minutes'");
            
            const result = await client.query(pgSql, params);
            return { lastInsertRowid: result.rows[0]?.id || result.insertId };
          } finally {
            client.release();
          }
        },
        get: async (...params) => {
          const client = await pool.connect();
          try {
            let pgSql = sql.replace(/datetime\('now','\+5 hours','30 minutes'\)/g, "NOW() + INTERVAL '5 hours 30 minutes'");
            const result = await client.query(pgSql, params);
            return result.rows[0];
          } finally {
            client.release();
          }
        },
        all: async (...params) => {
          const client = await pool.connect();
          try {
            let pgSql = sql.replace(/datetime\('now','\+5 hours','30 minutes'\)/g, "NOW() + INTERVAL '5 hours 30 minutes'");
            const result = await client.query(pgSql, params);
            return result.rows;
          } finally {
            client.release();
          }
        }
      };
    },
    exec: async (sql) => {
      const client = await pool.connect();
      try {
        let pgSql = sql
          .replace(/AUTOINCREMENT/g, '')
          .replace(/INTEGER PRIMARY KEY/g, 'SERIAL PRIMARY KEY')
          .replace(/datetime\('now','\+5 hours','30 minutes'\)/g, "NOW() + INTERVAL '5 hours 30 minutes'")
          .replace(/CHECK \(id = 1\)/g, '');
        
        // Split by semicolon and execute each statement
        const statements = pgSql.split(';').filter(s => s.trim());
        for (const stmt of statements) {
          await client.query(stmt);
        }
      } finally {
        client.release();
      }
    }
  };
} else {
  // SQLite (local development)
  const Database = require('better-sqlite3');
  const dataDir = process.env.DATA_DIR || path.join(__dirname, '..', 'data');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  const dbPath = path.join(dataDir, 'restaurant.db');
  db = new Database(dbPath);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
}

// Backup and restore functions
function backupDatabase() {
  if (usePostgres) {
    throw new Error('Backup not supported for PostgreSQL. Use Supabase backup features.');
  }
  const dataDir = process.env.DATA_DIR || path.join(__dirname, '..', 'data');
  const dbPath = path.join(dataDir, 'restaurant.db');
  const backupPath = path.join(dataDir, `restaurant-backup-${Date.now()}.db`);
  fs.copyFileSync(dbPath, backupPath);
  return backupPath;
}

function restoreDatabase(backupPath) {
  if (usePostgres) {
    throw new Error('Restore not supported for PostgreSQL. Use Supabase restore features.');
  }
  if (!fs.existsSync(backupPath)) {
    throw new Error('Backup file not found');
  }
  const dataDir = process.env.DATA_DIR || path.join(__dirname, '..', 'data');
  const dbPath = path.join(dataDir, 'restaurant.db');
  fs.copyFileSync(backupPath, dbPath);
}

const SEED_ITEMS = [
  { name: 'Idly', price: 30, image_url: '/images/idly.jpg' },
  { name: 'Puttu', price: 40, image_url: '/images/PUTTU.jpg' },
  { name: 'Poori', price: 45, image_url: '/images/poori.jpg' },
  { name: 'Coffee', price: 20, image_url: '/images/coffee.jpg' },
  { name: 'Dosai', price: 50, image_url: '/images/dosai.jpg' },
  { name: 'Vada', price: 10, image_url: '/images/vada.jpg' },
  { name: 'Tea', price: 15, image_url: '/images/tea.jpg' },
  { name: 'Bread Omelette', price: 50, image_url: '/images/bread_omelette.jpg' },
  { name: 'Chily Gobi', price: 90, image_url: '/images/chily_gobi.jpg' },
  { name: 'Mushroom Fried Rice', price: 100, image_url: '/images/mushroom_fried_rice.jpg' },
  { name: 'Egg Noodles', price: 120, image_url: '/images/egg_noodles.jpg' },
  { name: 'Pongal', price: 50, image_url: '/images/pongal.jpg' },
  { name: 'Samosa', price: 15, image_url: '/images/samosa.jpg' },
  { name: 'Rava Kesari', price: 40, image_url: '/images/RavaKesari.jpg' },
];

const MENU_IMAGE_MAP = {
  Idly: '/images/idly.jpg',
  Puttu: '/images/PUTTU.jpg',
  Poori: '/images/poori.jpg',
  Coffee: '/images/coffee.jpg',
  Dosai: '/images/dosai.jpg',
  Vada: '/images/vada.jpg',
  Tea: '/images/tea.jpg',
  'Bread Omelette': '/images/bread_omelette.jpg',
  'Chily Gobi': '/images/chily_gobi.jpg',
  'Mushroom Fried Rice': '/images/mushroom_fried_rice.jpg',
  'Egg Noodles': '/images/egg_noodles.jpg',
  Pongal: '/images/pongal.jpg',
  Samosa: '/images/samosa.jpg',
  'Rava Kesari': '/images/RavaKesari.jpg',
};

async function initDb() {
  if (usePostgres) {
    // PostgreSQL schema
    await db.exec(`
      CREATE TABLE IF NOT EXISTS menu_items (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        price REAL NOT NULL,
        image_url TEXT DEFAULT '',
        is_active INTEGER NOT NULL DEFAULT 1,
        created_at TEXT NOT NULL DEFAULT (NOW() + INTERVAL '5 hours 30 minutes')
      );

      CREATE TABLE IF NOT EXISTS orders (
        id SERIAL PRIMARY KEY,
        total REAL NOT NULL,
        payment_status TEXT NOT NULL DEFAULT 'pending',
        payment_mode TEXT,
        paid_at TEXT,
        created_at TEXT NOT NULL DEFAULT (NOW() + INTERVAL '5 hours 30 minutes')
      );

      CREATE TABLE IF NOT EXISTS order_items (
        id SERIAL PRIMARY KEY,
        order_id INTEGER NOT NULL,
        menu_item_id INTEGER,
        name TEXT NOT NULL,
        price REAL NOT NULL,
        qty INTEGER NOT NULL,
        line_total REAL NOT NULL,
        FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS settings (
        id INTEGER PRIMARY KEY DEFAULT 1,
        restaurant_name TEXT NOT NULL DEFAULT 'Shanthi Foods',
        upi_id TEXT NOT NULL DEFAULT 'yourname@upi',
        upi_payee_name TEXT NOT NULL DEFAULT 'Shanthi Foods'
      );
    `);
  } else {
    // SQLite schema
    await db.exec(`
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
  }

  const settingsCount = await db.prepare('SELECT COUNT(*) AS c FROM settings').get();
  if (settingsCount.c === 0) {
    await db.prepare(
      `INSERT INTO settings (id, restaurant_name, upi_id, upi_payee_name)
       VALUES (1, 'Shanthi Foods', '9342938927@ptsbi', 'Shanthi Foods')`
    ).run();
  } else {
    await db.prepare(
      `UPDATE settings SET
         restaurant_name = 'Shanthi Foods',
         upi_payee_name = CASE WHEN upi_payee_name IN ('South Kitchen', 'Restaurant', 'My Restaurant')
           THEN 'Shanthi Foods' ELSE upi_payee_name END
       WHERE restaurant_name IN ('South Kitchen', 'My Restaurant')`
    ).run();
  }

  for (const [name, imageUrl] of Object.entries(MENU_IMAGE_MAP)) {
    await db.prepare(
      `UPDATE menu_items SET image_url = ? WHERE name = ?`
    ).run(imageUrl, name);
  }

  const menuCount = await db.prepare('SELECT COUNT(*) AS c FROM menu_items').get();
  if (menuCount.c === 0) {
    const insert = db.prepare(
      `INSERT INTO menu_items (name, price, image_url, is_active) VALUES (?, ?, ?, 1)`
    );
    for (const item of SEED_ITEMS) {
      await insert.run(item.name, item.price, item.image_url);
    }
  }
}

initDb();

module.exports = db;
module.exports.backupDatabase = backupDatabase;
module.exports.restoreDatabase = restoreDatabase;
