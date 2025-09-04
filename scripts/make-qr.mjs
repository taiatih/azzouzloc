import QRCode from 'qrcode';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import { writeFile } from 'fs/promises';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const argUrl = process.argv.find(a => a.startsWith('--url='))?.split('=')[1] || process.env.URL;
if (!argUrl) {
  console.error('Usage: node scripts/make-qr.mjs --url=https://votre-domaine');
  process.exit(1);
}
const out = process.argv.find(a => a.startsWith('--out='))?.split('=')[1] || 'public/qr-install.png';
const path = resolve(__dirname, '..', out);

const png = await QRCode.toBuffer(argUrl, { scale: 8, margin: 1, color: { dark: '#000000', light: '#ffffff' } });
await writeFile(path, png);
console.log('QR généré:', path, '→', argUrl);
