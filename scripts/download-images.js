/**
 * Downloads real South Indian food photos (Unsplash / Pexels / Wikimedia).
 * Run: node scripts/download-images.js
 */
const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');

const outDir = path.join(__dirname, '..', 'public', 'images');
const UA = 'Mozilla/5.0 (compatible; ShanthiFoodsBilling/1.0)';

const images = {
  'idly.jpg': [
    'https://images.unsplash.com/photo-1741376509253-221ac18fac0f?w=640&q=85&auto=format&fit=crop',
    'https://upload.wikimedia.org/wikipedia/commons/thumb/8/86/Idli_-_A_Traditional_Indian_Food.JPG/640px-Idli_-_A_Traditional_Indian_Food.JPG',
  ],
  'puttu.jpg': [
    'https://images.pexels.com/photos/5560763/pexels-photo-5560763.jpeg?auto=compress&cs=tinysrgb&w=640',
  ],
  'poori.jpg': [
    'https://images.unsplash.com/photo-1565557623262-b51c2513a641?w=640&q=85&auto=format&fit=crop',
    'https://upload.wikimedia.org/wikipedia/commons/thumb/5/5a/Puri_Bhaji.jpg/640px-Puri_Bhaji.jpg',
  ],
  'coffee.jpg': [
    'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=640&q=85&auto=format&fit=crop',
    'https://upload.wikimedia.org/wikipedia/commons/thumb/5/5f/Kaapi_Closeup.jpg/640px-Kaapi_Closeup.jpg',
  ],
  'dosai.jpg': [
    'https://images.unsplash.com/photo-1743615467204-8fdaa85ff2db?w=640&q=85&auto=format&fit=crop',
    'https://upload.wikimedia.org/wikipedia/commons/thumb/8/8f/Masala_Dosa.jpg/640px-Masala_Dosa.jpg',
  ],
  'vada.jpg': [
    'https://images.unsplash.com/photo-1756757077703-26dc3ba7e853?w=640&q=85&auto=format&fit=crop',
    'https://upload.wikimedia.org/wikipedia/commons/thumb/7/7e/Medu_Vada.JPG/640px-Medu_Vada.JPG',
  ],
};

function download(url, redirects = 0) {
  return new Promise((resolve, reject) => {
    if (redirects > 10) return reject(new Error('Too many redirects'));
    const lib = url.startsWith('https') ? https : http;
    lib.get(url, { headers: { 'User-Agent': UA, Accept: 'image/*' } }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        const next = res.headers.location.startsWith('http')
          ? res.headers.location
          : new URL(res.headers.location, url).href;
        return download(next, redirects + 1).then(resolve).catch(reject);
      }
      if (res.statusCode !== 200) return reject(new Error(`HTTP ${res.statusCode}`));
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => resolve(Buffer.concat(chunks)));
    }).on('error', reject);
  });
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

(async () => {
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
  let ok = 0;
  for (const [name, urls] of Object.entries(images)) {
    const dest = path.join(outDir, name);
    let saved = false;
    for (const url of urls) {
      try {
        await sleep(2000);
        const buf = await download(url);
        if (buf.length < 4000) throw new Error('too small');
        if (buf[0] !== 0xff && buf[0] !== 0x89) throw new Error('not image');
        fs.writeFileSync(dest, buf);
        console.log('OK', name, `(${(buf.length / 1024).toFixed(0)} KB)`);
        ok++;
        saved = true;
        break;
      } catch (e) {
        console.warn('  skip', name, e.message);
      }
    }
    if (!saved) console.error('FAIL', name);
  }
  console.log(`\nDone: ${ok}/6`);
  process.exit(ok === 6 ? 0 : 1);
})();
