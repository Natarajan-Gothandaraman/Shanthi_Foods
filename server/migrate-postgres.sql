-- PostgreSQL Migration Script for Render Hosting
-- Run this script on your Render PostgreSQL database to set up the schema

-- Create menu_items table
CREATE TABLE IF NOT EXISTS menu_items (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  price REAL NOT NULL,
  image_url TEXT DEFAULT '',
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (NOW() + INTERVAL '5 hours 30 minutes')
);

-- Create orders table
CREATE TABLE IF NOT EXISTS orders (
  id SERIAL PRIMARY KEY,
  total REAL NOT NULL,
  payment_status TEXT NOT NULL DEFAULT 'pending',
  payment_mode TEXT,
  paid_at TEXT,
  created_at TEXT NOT NULL DEFAULT (NOW() + INTERVAL '5 hours 30 minutes')
);

-- Create order_items table
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

-- Create settings table
CREATE TABLE IF NOT EXISTS settings (
  id INTEGER PRIMARY KEY DEFAULT 1,
  restaurant_name TEXT NOT NULL DEFAULT 'Shanthi Foods',
  upi_id TEXT NOT NULL DEFAULT 'yourname@upi',
  upi_payee_name TEXT NOT NULL DEFAULT 'Shanthi Foods'
);

-- Insert default settings if not exists
INSERT INTO settings (id, restaurant_name, upi_id, upi_payee_name)
VALUES (1, 'Shanthi Foods', '9342938927@ptsbi', 'Shanthi Foods')
ON CONFLICT (id) DO NOTHING;

-- Insert default menu items if table is empty
INSERT INTO menu_items (name, price, image_url, is_active)
VALUES 
  ('Idly', 30, '/images/idly.jpg', 1),
  ('Puttu', 40, '/images/PUTTU.jpg', 1),
  ('Poori', 45, '/images/poori.jpg', 1),
  ('Coffee', 20, '/images/coffee.jpg', 1),
  ('Dosai', 50, '/images/dosai.jpg', 1),
  ('Vada', 10, '/images/vada.jpg', 1),
  ('Tea', 15, '/images/tea.jpg', 1),
  ('Bread Omelette', 50, '/images/bread_omelette.jpg', 1),
  ('Chily Gobi', 90, '/images/chily_gobi.jpg', 1),
  ('Mushroom Fried Rice', 100, '/images/mushroom_fried_rice.jpg', 1),
  ('Egg Noodles', 120, '/images/egg_noodles.jpg', 1),
  ('Pongal', 50, '/images/pongal.jpg', 1),
  ('Samosa', 15, '/images/samosa.jpg', 1),
  ('Rava Kesari', 40, '/images/RavaKesari.jpg', 1)
ON CONFLICT DO NOTHING;
