// Generates pixel-art PNG icons for the PQ Parser add-in.
// No external deps — hand-rolled PNG encoder using node:zlib.

const fs = require("fs");
const path = require("path");
const zlib = require("zlib");

// ---------- palette ----------
const PAL = {
  ".": [0, 0, 0, 0],           // transparent
  "g": [16, 124, 16, 255],     // PQ green (dark)
  "G": [34, 170, 34, 255],     // PQ green (mid)
  "L": [90, 210, 90, 255],     // PQ green (light / highlight)
  "W": [255, 255, 255, 255],   // white
  "K": [20, 40, 20, 255],      // near-black outline
  "Y": [255, 214, 64, 255],    // magnifier rim highlight
  "S": [180, 220, 180, 255],   // soft shadow inside lens
};

// ---------- PNG encoder ----------
const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, "ascii");
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([len, typeBuf, data, crcBuf]);
}

function encodePNG(pixels, w, h) {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8;   // bit depth
  ihdr[9] = 6;   // RGBA
  ihdr[10] = 0;  // compression
  ihdr[11] = 0;  // filter
  ihdr[12] = 0;  // interlace

  // Raw scanlines with filter byte 0 per row.
  const raw = Buffer.alloc((w * 4 + 1) * h);
  let o = 0;
  for (let y = 0; y < h; y++) {
    raw[o++] = 0;
    for (let x = 0; x < w; x++) {
      const p = pixels[y * w + x];
      raw[o++] = p[0];
      raw[o++] = p[1];
      raw[o++] = p[2];
      raw[o++] = p[3];
    }
  }
  const idat = zlib.deflateSync(raw, { level: 9 });

  return Buffer.concat([
    sig,
    chunk("IHDR", ihdr),
    chunk("IDAT", idat),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

// ---------- grid helpers ----------
function gridFromRows(rows) {
  const h = rows.length;
  const w = rows[0].length;
  const pixels = new Array(w * h);
  for (let y = 0; y < h; y++) {
    const row = rows[y];
    if (row.length !== w) throw new Error(`row ${y} width ${row.length} != ${w}`);
    for (let x = 0; x < w; x++) {
      const ch = row[x];
      const col = PAL[ch];
      if (!col) throw new Error(`unknown color char "${ch}" at ${x},${y}`);
      pixels[y * w + x] = col;
    }
  }
  return { pixels, w, h };
}

// ---------- icon art ----------
// Design: rounded green tile + white "PQ" letters + magnifying glass badge.
// Each size is hand-pixeled for crispness.

// 16x16 — tiny, so: green tile + white magnifying glass (no text, unreadable at this size).
const art16 = [
  "................",
  "..ggGGGGGGGGgg..",
  ".gGGGGGGGGGGGGg.",
  "gGGGGKKKKKGGGGGg",
  "gGGGKWWWWWKGGGGg",
  "gGGKWWWSSWWKGGGg",
  "gGGKWWSSSSWKGGGg",
  "gGGKWWSSSSWKGGGg",
  "gGGKWWSSSSWKGGGg",
  "gGGGKWWWWWKKGGGg",
  "gGGGGKKKKKKKGGGg",
  "gGGGGGGGGGGGKGGg",
  "gGGGGGGGGGGGGKGg",
  ".gGGGGGGGGGGGGg.",
  "..ggGGGGGGGGgg..",
  "................",
];

// 32x32 — green tile + readable "PQ" using 10x12 thick pixel letters + small magnifier badge.
// Built programmatically below in build32().
let art32;

// 32x32 — programmatic: tile + 10x12 "PQ" + mini magnifier.
function build32() {
  const size = 32;
  const g = Array.from({ length: size }, () => Array(size).fill("."));
  // Rounded tile (corner radius 3)
  const r = 3;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let inside = true;
      const inCorner = (x < r && y < r) || (x >= size-r && y < r) ||
                       (x < r && y >= size-r) || (x >= size-r && y >= size-r);
      if (inCorner) {
        const cx = x < r ? r-1 : size-r;
        const cy = y < r ? r-1 : size-r;
        const dx = x - cx, dy = y - cy;
        inside = dx*dx + dy*dy <= (r-1)*(r-1) + 1;
      }
      if (inside) g[y][x] = "G";
    }
  }
  // Edge darken
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      if (g[y][x] !== "G") continue;
      const onEdge =
        x === 0 || y === 0 || x === size-1 || y === size-1 ||
        g[y-1]?.[x] === "." || g[y+1]?.[x] === "." ||
        g[y]?.[x-1] === "." || g[y]?.[x+1] === ".";
      if (onEdge) g[y][x] = "g";
    }
  }
  drawSmallLetter(g, "P", 4, 6);
  drawSmallLetter(g, "Q", 18, 6);
  drawMagnifier(g, 23, 24, 4);
  return g.map(row => row.join(""));
}

function drawSmallLetter(g, ch, x0, y0) {
  // 10 wide × 14 tall
  const P_ROWS = [
    "WWWWWWWWW.",
    "WWWWWWWWWW",
    "WW......WW",
    "WW......WW",
    "WW......WW",
    "WWWWWWWWWW",
    "WWWWWWWWW.",
    "WW........",
    "WW........",
    "WW........",
    "WW........",
    "WW........",
    "WW........",
    "WW........",
  ];
  const Q_ROWS = [
    ".WWWWWWWW.",
    "WWWWWWWWWW",
    "WW......WW",
    "WW......WW",
    "WW......WW",
    "WW......WW",
    "WW......WW",
    "WW......WW",
    "WW....WW.W",
    "WW.....WWW",
    "WWWWWWWWWW",
    ".WWWWWWWWW",
    "........WW",
    ".........W",
  ];
  const rows = ch === "P" ? P_ROWS : Q_ROWS;
  for (let ry = 0; ry < rows.length; ry++) {
    for (let rx = 0; rx < rows[ry].length; rx++) {
      const c = rows[ry][rx];
      if (c === ".") continue;
      const gx = x0 + rx, gy = y0 + ry;
      if (gy < 0 || gy >= g.length || gx < 0 || gx >= g[0].length) continue;
      g[gy][gx] = c;
    }
  }
}

// 64x64
function build64() {
  const size = 64;
  const g = Array.from({ length: size }, () => Array(size).fill("."));

  // Rounded-square background.
  const cornerSkip = [[0,0,6],[0,size-1,6],[size-1,0,6],[size-1,size-1,6]];
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const inRounded = !cornerSkip.some(([cy, cx, r]) => {
        const dy = y - cy, dx = x - cx;
        return dy*dy + dx*dx > r*r && // outside the arc center-radius
          ((cy === 0 && y < r) || (cy === size-1 && y > size-1-r)) &&
          ((cx === 0 && x < r) || (cx === size-1 && x > size-1-r));
      });
      if (inRounded) g[y][x] = "G";
    }
  }
  // Edge darkening on the rounded ring.
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      if (g[y][x] !== "G") continue;
      const onEdge =
        x === 0 || y === 0 || x === size-1 || y === size-1 ||
        g[y-1]?.[x] === "." || g[y+1]?.[x] === "." ||
        g[y]?.[x-1] === "." || g[y]?.[x+1] === ".";
      if (onEdge) g[y][x] = "g";
    }
  }
  // Top-left highlight
  for (let y = 4; y < 10; y++)
    for (let x = 4; x < size - 4; x++)
      if (g[y][x] === "G" && (y === 4 || x === 4)) g[y][x] = "L";

  // "PQ" letters, big — 20px tall, centered upper.
  drawLetter(g, "P", 10, 10);
  drawLetter(g, "Q", 34, 10);

  // Magnifying glass, bottom-right area.
  drawMagnifier(g, 42, 42, 10);

  return g.map(r => r.join(""));
}

function drawLetter(g, ch, x0, y0) {
  // Each letter: 18 wide × 22 tall pixel font, drawn in "W".
  const P_ROWS = [
    "WWWWWWWWWWWWWWW...",
    "WWWWWWWWWWWWWWWW..",
    "WWW..........WWWW.",
    "WWW...........WWW.",
    "WWW...........WWW.",
    "WWW...........WWW.",
    "WWW...........WWW.",
    "WWW..........WWWW.",
    "WWWWWWWWWWWWWWWW..",
    "WWWWWWWWWWWWWWW...",
    "WWW...............",
    "WWW...............",
    "WWW...............",
    "WWW...............",
    "WWW...............",
    "WWW...............",
    "WWW...............",
    "WWW...............",
    "WWW...............",
    "WWW...............",
    "WWW...............",
    "WWW...............",
  ];
  const Q_ROWS = [
    "....WWWWWWWWWW....",
    "..WWWWWWWWWWWWWW..",
    ".WWWW........WWWW.",
    "WWW............WWW",
    "WWW............WWW",
    "WWW............WWW",
    "WWW............WWW",
    "WWW............WWW",
    "WWW............WWW",
    "WWW............WWW",
    "WWW............WWW",
    "WWW............WWW",
    "WWW............WWW",
    "WWW.......WW...WWW",
    "WWW........WW..WWW",
    "WWW.........WW.WWW",
    "WWW..........WWWWW",
    "WWW...........WWWW",
    ".WWWW........WWWWW",
    "..WWWWWWWWWWWWWKWW",
    "....WWWWWWWWWW.WKW",
    "................KK",
  ];
  const rows = ch === "P" ? P_ROWS : Q_ROWS;
  for (let ry = 0; ry < rows.length; ry++) {
    for (let rx = 0; rx < rows[ry].length; rx++) {
      const c = rows[ry][rx];
      if (c === "." ) continue;
      const gx = x0 + rx, gy = y0 + ry;
      if (gy < 0 || gy >= g.length || gx < 0 || gx >= g[0].length) continue;
      g[gy][gx] = c;
    }
  }
}

function drawMagnifier(g, cx, cy, r) {
  // Dark outer ring, white lens with soft shade, yellow rim highlight, dark handle.
  const outer = r, inner = r - 2;
  for (let y = -r - 1; y <= r + 1; y++) {
    for (let x = -r - 1; x <= r + 1; x++) {
      const d2 = x*x + y*y;
      const gx = cx + x, gy = cy + y;
      if (gy < 0 || gy >= g.length || gx < 0 || gx >= g[0].length) continue;
      if (d2 <= inner*inner) {
        // Inside lens
        g[gy][gx] = (x + y < -r/2) ? "W" : "S";
      } else if (d2 <= outer*outer) {
        g[gy][gx] = "K";
      } else if (d2 <= (outer+1)*(outer+1)) {
        // rim highlight top-left
        if (x + y < 0) g[gy][gx] = "Y";
      }
    }
  }
  // Handle — diagonal from (cx+r*0.7, cy+r*0.7) outward.
  const hx0 = cx + Math.round(r * 0.72);
  const hy0 = cy + Math.round(r * 0.72);
  for (let i = 0; i < r + 2; i++) {
    for (let t = 0; t < 3; t++) {
      const gx = hx0 + i, gy = hy0 + i + t - 1;
      if (gy < 0 || gy >= g.length || gx < 0 || gx >= g[0].length) continue;
      g[gy][gx] = "K";
    }
  }
}

// 80x80 — same generator, bigger radius.
function build80() {
  const size = 80;
  const g = Array.from({ length: size }, () => Array(size).fill("."));

  // Rounded square background (corner radius 8).
  const r = 8;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let inside = true;
      const corners = [[r-1,r-1],[size-r,r-1],[r-1,size-r],[size-r,size-r]];
      const inCorner = (x < r && y < r) || (x >= size-r && y < r) ||
                       (x < r && y >= size-r) || (x >= size-r && y >= size-r);
      if (inCorner) {
        const cx = x < r ? r-1 : size-r;
        const cy = y < r ? r-1 : size-r;
        const dx = x - cx, dy = y - cy;
        inside = dx*dx + dy*dy <= (r-1)*(r-1);
      }
      if (inside) g[y][x] = "G";
    }
  }
  // Edge darken
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      if (g[y][x] !== "G") continue;
      const onEdge =
        x === 0 || y === 0 || x === size-1 || y === size-1 ||
        g[y-1]?.[x] === "." || g[y+1]?.[x] === "." ||
        g[y]?.[x-1] === "." || g[y]?.[x+1] === ".";
      if (onEdge) g[y][x] = "g";
    }
  }
  // Top highlight band
  for (let y = 6; y < 12; y++)
    for (let x = 6; x < size - 6; x++)
      if (g[y][x] === "G" && (y === 6 || x === 6)) g[y][x] = "L";

  drawLetter(g, "P", 15, 14);
  drawLetter(g, "Q", 41, 14);
  drawMagnifier(g, 54, 54, 12);

  return g.map(r => r.join(""));
}

// ---------- write files ----------
const outDir = path.resolve(__dirname, "..", "src", "assets");
fs.mkdirSync(outDir, { recursive: true });

function emit(name, rows) {
  const { pixels, w, h } = gridFromRows(rows);
  const png = encodePNG(pixels, w, h);
  const p = path.join(outDir, name);
  fs.writeFileSync(p, png);
  console.log(`wrote ${p}  (${w}x${h}, ${png.length} bytes)`);
}

emit("icon-16.png", art16);
emit("icon-32.png", build32());
emit("icon-64.png", build64());
emit("icon-80.png", build80());
