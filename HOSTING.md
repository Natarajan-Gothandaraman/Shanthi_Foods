# Hosting Shanthi Foods Billing

## Option 1: Render (free tier, easy)

1. Push this folder to **GitHub** (create a repo, upload files).
2. Go to [render.com](https://render.com) → **New** → **Web Service**.
3. Connect your repo. Settings:
   - **Build command:** `npm install`
   - **Start command:** `npm start`
   - **Environment:** add `PORT` = `10000` (Render sets this automatically on many plans).
4. Add a **Persistent Disk** mounted at `data` so orders are not lost on redeploy (paid feature on Render), **or** use the app only for testing on free tier.
5. Deploy. Your URL will be like `https://shanthi-foods-billing.onrender.com`.

You can also click **Blueprint** and use the included `render.yaml`.

## Option 2: Railway

1. Push to GitHub.
2. [railway.app](https://railway.app) → **New Project** → **Deploy from GitHub**.
3. Railway detects Node.js. Set start command: `npm start`.
4. Add a **Volume** mounted to `/data` and set env `DATA_PATH` if you customize paths (default uses `./data` in project).

## Option 3: Your PC / shop LAN (no cloud)

```powershell
cd c:\Users\Speed\Desktop\billing
npm install
npm start
```

- On this PC: http://localhost:3000  
- On phones/tablets same Wi‑Fi: http://YOUR-PC-IP:3000 (find IP with `ipconfig`)

Allow port **3000** in Windows Firewall if other devices cannot connect.

## Option 4: VPS (DigitalOcean, AWS, etc.)

```bash
git clone <your-repo>
cd billing
npm install
npm install -g pm2
pm2 start server/index.js --name shanthi-billing
pm2 save
pm2 startup
```

Use **nginx** as reverse proxy with HTTPS (Let's Encrypt) for secure access.

## Production checklist

- [ ] Set real **UPI ID** in Manage Menu → Restaurant settings  
- [ ] Upload menu photos if needed  
- [ ] Use persistent storage for `data/restaurant.db`  
- [ ] Set `NODE_ENV=production`  
- [ ] Keep Node.js 18+

## Environment variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3000` | Server port |
