# Shanthi Foods — Restaurant Billing POS

Billing website for **Shanthi Foods** with menu CRUD, click-to-cart billing, UPI QR payment, bill printing, and date-wise sales reports (PDF download).

## Features

- **Billing (POS):** Tap menu items to add to cart; adjust quantities; pay, print, or clear cart
- **UPI QR pay:** Static QR with bill amount; mark as paid after customer pays
- **Print bill:** Browser print for thermal/A4 receipt
- **Manage menu:** Create, edit, delete menu items with image upload
- **Sales reports:** Summary, **sales by date**, **orders list date-wise**, item breakdown; download PDF
- **Responsive:** Works on mobile phones and desktop (touch-friendly menu, collapsible nav)

## Default menu (seeded on first run)

Idly, Puttu, Poori, Coffee, Dosai, Vada — with food photos from Wikimedia Commons.

## Requirements

- [Node.js](https://nodejs.org/) 18 or newer

## Setup & run (local)

```bash
cd c:\Users\Speed\Desktop\billing
npm install
npm run dev
```

Open **http://localhost:3000**

Production:

```bash
npm start
```

`npm install` also downloads menu food images into `public/images/`.

## Configure UPI

1. Go to **Manage Menu**
2. Under **Restaurant settings**, set **Shanthi Foods**, your **UPI ID**, and payee name
3. Save — QR codes on the billing page will use these details

## Reports

After **Run report** you will see:

1. Summary (total orders, gross sales)
2. **Sales by date** — one row per day
3. **Orders list (date-wise)** — each order grouped under its date
4. Item-wise breakdown
5. **Download PDF** — includes all sections above

## Hosting on the web

See **[HOSTING.md](HOSTING.md)** for Render, Railway, LAN, and VPS steps.

Quick LAN (shop Wi‑Fi): run `npm start`, open `http://YOUR-PC-IP:3000` on phones/tablets.

## Pages

| URL | Purpose |
|-----|---------|
| `/` | Billing / POS |
| `/admin.html` | Menu CRUD + settings |
| `/reports.html` | Sales reports + PDF |

## Data

SQLite database: `data/restaurant.db` (created automatically)

Uploaded images: `public/uploads/`

Logo: `public/images/logo.svg`
