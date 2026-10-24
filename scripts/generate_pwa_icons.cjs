const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

function crc32(buf) {
  let crc = -1;
  for (let i = 0; i < buf.length; i++) {
    crc ^= buf[i];
    for (let j = 0; j < 8; j++) {
      crc = (crc >>> 1) ^ (0xEDB88320 & -(crc & 1));
    }
  }
  return (crc ^ -1) >>> 0;
}

function createChunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, 'ascii');
  const typeAndData = Buffer.concat([typeBuf, data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(typeAndData), 0);
  return Buffer.concat([len, typeAndData, crc]);
}

function generatePNG(width, height, isMaskable) {
  const sig = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData[8] = 8; // bit depth
  ihdrData[9] = 6; // RGBA
  ihdrData[10] = 0; // compression
  ihdrData[11] = 0; // filter
  ihdrData[12] = 0; // interlace
  const ihdr = createChunk('IHDR', ihdrData);

  // Crown polygon definition on 512x512 grid:
  // Points: (144, 320) -> (112, 160) -> (192, 240) -> (256, 112) -> (320, 240) -> (400, 160) -> (368, 320)
  const poly = [
    [144, 320],
    [112, 160],
    [192, 240],
    [256, 112],
    [320, 240],
    [400, 160],
    [368, 320]
  ];

  function pointInPoly(px, py) {
    let inside = false;
    for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
      const xi = poly[i][0], yi = poly[i][1];
      const xj = poly[j][0], yj = poly[j][1];
      const intersect = ((yi > py) !== (yj > py)) &&
        (px < (xj - xi) * (py - yi) / (yj - yi) + xi);
      if (intersect) inside = !inside;
    }
    return inside;
  }

  const rawRows = [];
  const radius = width * (128 / 512);

  for (let y = 0; y < height; y++) {
    const row = Buffer.alloc(1 + width * 4);
    row[0] = 0; // filter type 0
    for (let x = 0; x < width; x++) {
      const idx = 1 + x * 4;

      // Check corner rounding if not maskable
      if (!isMaskable) {
        let outsideCorner = false;
        if (x < radius && y < radius) {
          const dx = radius - x, dy = radius - y;
          if (dx * dx + dy * dy > radius * radius) outsideCorner = true;
        } else if (x > width - radius && y < radius) {
          const dx = x - (width - radius), dy = radius - y;
          if (dx * dx + dy * dy > radius * radius) outsideCorner = true;
        } else if (x < radius && y > height - radius) {
          const dx = radius - x, dy = y - (height - radius);
          if (dx * dx + dy * dy > radius * radius) outsideCorner = true;
        } else if (x > width - radius && y > height - radius) {
          const dx = x - (width - radius), dy = y - (height - radius);
          if (dx * dx + dy * dy > radius * radius) outsideCorner = true;
        }
        if (outsideCorner) {
          row[idx] = 0;
          row[idx + 1] = 0;
          row[idx + 2] = 0;
          row[idx + 3] = 0;
          continue;
        }
      }

      // Background gradient from #0F172A (15, 23, 42) to #0284C7 (2, 132, 199)
      const t = (x + y) / (width + height);
      let r = Math.round(15 + (2 - 15) * t);
      let g = Math.round(23 + (132 - 23) * t);
      let b = Math.round(42 + (199 - 42) * t);
      let a = 255;

      // Coordinate mapped to 512x512 space
      // For maskable icon, scale slightly (safe zone is 80%, so scale crown by 0.85 around center 256)
      let sx = (x / width) * 512;
      let sy = (y / height) * 512;
      if (isMaskable) {
        sx = 256 + (sx - 256) / 0.82;
        sy = 256 + (sy - 256) / 0.82;
      }

      const goldT = (sy - 112) / (384 - 112);
      const goldR = Math.round(245 + (217 - 245) * Math.max(0, Math.min(1, goldT)));
      const goldG = Math.round(158 + (119 - 158) * Math.max(0, Math.min(1, goldT)));
      const goldB = Math.round(11 + (6 - 11) * Math.max(0, Math.min(1, goldT)));

      // Base bar: rect from (128, 352) to (384, 384) with rounded ends
      let isBase = false;
      if (sx >= 128 && sx <= 384 && sy >= 352 && sy <= 384) {
        isBase = true;
      }

      // Crown body polygon
      const isCrown = pointInPoly(sx, sy);

      // 3 Jewels / Circles:
      // (112, 160, r=16), (256, 112, r=20), (400, 160, r=16)
      const d1 = (sx - 112) ** 2 + (sy - 160) ** 2;
      const d2 = (sx - 256) ** 2 + (sy - 112) ** 2;
      const d3 = (sx - 400) ** 2 + (sy - 160) ** 2;
      const isJewel = (d1 <= 16 * 16) || (d2 <= 20 * 20) || (d3 <= 16 * 16);

      if (isJewel) {
        r = 251; // #FBBF24
        g = 191;
        b = 36;
      } else if (isBase || isCrown) {
        r = goldR;
        g = goldG;
        b = goldB;
      }

      row[idx] = r;
      row[idx + 1] = g;
      row[idx + 2] = b;
      row[idx + 3] = a;
    }
    rawRows.push(row);
  }

  const compressed = zlib.deflateSync(Buffer.concat(rawRows));
  const idat = createChunk('IDAT', compressed);
  const iend = createChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([sig, ihdr, idat, iend]);
}

const publicDir = path.join(__dirname, '..', 'public');

console.log('Generating PNG assets in:', publicDir);

const icon192 = generatePNG(192, 192, false);
fs.writeFileSync(path.join(publicDir, 'icon-192.png'), icon192);

const icon512 = generatePNG(512, 512, false);
fs.writeFileSync(path.join(publicDir, 'icon-512.png'), icon512);

const icon192Maskable = generatePNG(192, 192, true);
fs.writeFileSync(path.join(publicDir, 'icon-192-maskable.png'), icon192Maskable);

const icon512Maskable = generatePNG(512, 512, true);
fs.writeFileSync(path.join(publicDir, 'icon-512-maskable.png'), icon512Maskable);

const appleIcon = generatePNG(180, 180, false);
fs.writeFileSync(path.join(publicDir, 'apple-touch-icon.png'), appleIcon);

console.log('Successfully generated all PWA PNG icons!');
