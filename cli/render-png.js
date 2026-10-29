
import zlib from 'node:zlib';

function hex(c) {
  let h = c.slice(1);
  if (h.length === 3) h = [...h].map((x) => x + x).join('');
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}

// Minimal rasterizer: thick lines (stamped squares along Bresenham), no antialiasing.
export function renderPng(objects, w, h) {
  const px = Buffer.alloc(w * h * 4, 255);
  const dot = (x, y, rad, rgb) => {
    for (let yy = y - rad; yy <= y + rad; yy++) {
      if (yy < 0 || yy >= h) continue;
      for (let xx = x - rad; xx <= x + rad; xx++) {
        if (xx < 0 || xx >= w) continue;
        const i = (yy * w + xx) * 4;
        px[i] = rgb[0]; px[i + 1] = rgb[1]; px[i + 2] = rgb[2];
      }
    }
  };
  const line = (a, b, rad, rgb) => {
    let x0 = Math.round(a[0]), y0 = Math.round(a[1]);
    const x1 = Math.round(b[0]), y1 = Math.round(b[1]);
    const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0);
    const sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
    let err = dx + dy;
    for (;;) {
      dot(x0, y0, rad, rgb);
      if (x0 === x1 && y0 === y1) break;
      const e2 = 2 * err;
      if (e2 >= dy) { err += dy; x0 += sx; }
      if (e2 <= dx) { err += dx; y0 += sy; }
    }
  };
  for (const o of objects) {
    const rgb = hex(o.color), rad = Math.max(0, Math.floor(o.size / 2));
    for (const p of o.paths) {
      if (p.length === 1) dot(Math.round(p[0][0]), Math.round(p[0][1]), rad, rgb);
      for (let i = 1; i < p.length; i++) line(p[i - 1], p[i], rad, rgb);
    }
  }
  const raw = Buffer.alloc((w * 4 + 1) * h);
  for (let y = 0; y < h; y++) px.copy(raw, y * (w * 4 + 1) + 1, y * w * 4, (y + 1) * w * 4);
  const chunk = (type, data) => {
    const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
    const td = Buffer.concat([Buffer.from(type), data]);
    const crc = Buffer.alloc(4); crc.writeUInt32BE(zlib.crc32(td));
    return Buffer.concat([len, td, crc]);
  };
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = 6;
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw)), chunk('IEND', Buffer.alloc(0)),
  ]);
}
