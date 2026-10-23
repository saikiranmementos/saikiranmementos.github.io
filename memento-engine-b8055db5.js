// all libraries ship with the app (vendor/) so it runs fully offline and from the single-file build
const vurl = p => { const r = res(p); return r !== p ? r : new URL('./' + p, import.meta.url).href; };
const { THREE, OrbitControls, GLTFLoader, OBJLoader, STLLoader, GLTFExporter, RoomEnvironment } = await import(vurl('vendor/three-all.js'));

let occtP;
function getOcct() {
  if (!occtP) occtP = (async () => {
    const wasmBinary = await (await fetch(vurl('vendor/occt-import-js.wasm'))).arrayBuffer();
    if (!window.occtimportjs) await new Promise((ok, no) => {
      const s = document.createElement('script');
      s.src = vurl('vendor/occt-import-js.js'); s.onload = ok; s.onerror = () => no(new Error('Could not load STEP reader'));
      document.head.appendChild(s);
    });
    return window.occtimportjs({ wasmBinary });
  })();
  occtP.catch(() => { occtP = null; });
  return occtP;
}

// standalone bundles expose inlined assets as blob URLs keyed by path
export function res(p) { const r = window.__resources; return (r && r['r_' + p.replace(/[^a-z0-9]/gi, '_')]) || p; }

// ───────── backgrounds ─────────
export const BACKGROUNDS = [
  { id: 'studio', name: 'Studio white', at: [0.5, 0.4], stops: [[0, '#ffffff'], [0.55, '#efefef'], [1, '#d2d2d2']], lum: 0.95, warm: 0, busy: 0 },
  { id: 'sweep', name: 'Grey sweep', linear: true, stops: [[0, '#b7b7b7'], [0.5, '#dddddd'], [0.72, '#f2f2f2'], [1, '#cfcfcf']], lum: 0.85, warm: 0, busy: 0 },
  { id: 'charcoal', name: 'Charcoal spot', at: [0.5, 0.35], stops: [[0, '#606060'], [0.5, '#2b2b2b'], [1, '#0d0d0d']], lum: 0.2, warm: 0, busy: 0 },
  { id: 'transparent', name: 'Transparent', none: true },
  // photo backdrops: mm = real-world width the photo represents (drives auto-fit), fx/fy = zoom anchor
  ...[
    // id, name, mm, fx, fy, lum, warm, busy
    ['09', 'Shadow wall', 700, 0.5, 0.5, 0.85, 0.1, 0.2], ['01', 'Plaster grey', 600, 0.5, 0.6, 0.75, 0, 0.1], ['04', 'Dark plaster', 600, 0.5, 0.55, 0.2, 0, 0.1],
    ['02', 'Dusk haze', 700, 0.5, 0.6, 0.7, 0.3, 0.1], ['03', 'White satin', 500, 0.5, 0.5, 0.92, 0, 0.4], ['08', 'Paper layers', 500, 0.5, 0.5, 0.85, -0.1, 0.5],
    ['11', 'Watercolour', 500, 0.5, 0.5, 0.9, 0.5, 0.4], ['06', 'Cream blocks', 600, 0.5, 0.6, 0.85, 0.3, 0.5], ['05', 'Oak + leaves', 700, 0.4, 0.6, 0.8, 0.3, 0.6],
    ['12', 'Ranunculus', 700, 0.5, 0.5, 0.88, -0.2, 0.8], ['07', 'Palm podium', 650, 0.5, 0.85, 0.55, 0, 0.8], ['17', 'Sage podium', 650, 0.5, 0.8, 0.55, 0.1, 0.6],
    ['18', 'Gold fern', 700, 0.5, 0.8, 0.9, 0.5, 0.5], ['20', 'Gold podium', 700, 0.5, 0.75, 0.92, 0.5, 0.4], ['21', 'Cream podium', 700, 0.5, 0.8, 0.94, 0.4, 0.4],
    ['19', 'Peach arch', 800, 0.5, 0.75, 0.75, 0.5, 0.4],
    ['22', 'Light oak', 600, 0.5, 0.5, 0.85, 0.5, 0.3], ['23', 'Walnut', 600, 0.5, 0.5, 0.3, 0.4, 0.3], ['24', 'Barn planks', 700, 0.5, 0.5, 0.35, 0.5, 0.5],
    ['25', 'Carrara marble', 600, 0.5, 0.5, 0.9, 0, 0.4], ['26', 'Grey marble', 600, 0.5, 0.5, 0.82, 0, 0.5], ['27', 'Swirl plaster', 600, 0.5, 0.5, 0.9, 0, 0.3],
    ['28', 'Natural linen', 500, 0.5, 0.5, 0.72, 0.2, 0.1], ['29', 'Cream linen', 500, 0.5, 0.5, 0.82, 0.4, 0.1], ['30', 'Blush linen', 500, 0.5, 0.5, 0.7, 0.5, 0.1],
    ['31', 'Charcoal weave', 500, 0.5, 0.5, 0.25, 0, 0.2], ['32', 'Ivory silk', 500, 0.5, 0.5, 0.9, 0, 0.5], ['33', 'Desk lamp', 800, 0.5, 0.85, 0.85, 0.3, 0.3],
  ].map(([n, name, mm, fx, fy, lum, warm, busy]) => ({ id: 'p' + n, name, mm, fx, fy, lum, warm, busy, photo: res(`assets/backdrops/bd_${n}.jpg`), thumb: res(`assets/backdrops/th_${n}.jpg`) })),
];
// tabletop / floor surfaces the memento stands on: mm = real-world width of one photo tile, rough = surface sheen
export const FLOORS = [
  { id: 'none', name: 'No floor' },
  ...[
    ['oak', 'Light oak', '22', 700, 0.6], ['walnut', 'Walnut', '23', 700, 0.45], ['planks', 'Barn planks', '24', 900, 0.75],
    ['carrara', 'Carrara marble', '25', 800, 0.18], ['greymarble', 'Grey marble', '26', 800, 0.2], ['plaster', 'White stone', '27', 700, 0.85],
    ['linen', 'Linen cloth', '28', 450, 0.95], ['cream', 'Cream cloth', '29', 450, 0.95], ['charcoal', 'Charcoal cloth', '31', 450, 0.95],
  ].map(([id, name, n, mm, rough]) => ({ id, name, mm, rough, photo: res(`assets/backdrops/bd_${n}.jpg`), thumb: res(`assets/backdrops/th_${n}.jpg`) })),
];
// rank backdrops for a plate: contrast in lightness, calmer scenes for busy/saturated prints, matching warmth
export function suggestBackdrops(st, n = 4) {
  if (!st) return [];
  return BACKGROUNDS.filter(b => b.lum != null).map(b => ({ id: b.id,
    s: Math.abs(b.lum - st.lum) * 1.5 + (1 - b.busy) * (0.4 + st.sat * 1.2) + (1 - Math.min(1, Math.abs(b.warm - st.warm))) * 0.4 + (b.photo ? 0.15 : 0) }))
    .sort((x, y) => y.s - x.s).slice(0, n).map(x => x.id);
}
export const CHECKER = 'repeating-conic-gradient(#d9d9d9 0% 25%, #f5f5f5 0% 50%) 50% / 16px 16px';
export function bgCss(b) {
  if (b.none) return CHECKER;
  if (b.photo) return `url("${b.thumb}") center / cover`;
  const st = b.stops.map(([o, c]) => `${c} ${Math.round(o * 100)}%`).join(', ');
  return b.linear ? `linear-gradient(180deg, ${st})` : `radial-gradient(circle at ${b.at[0] * 100}% ${b.at[1] * 100}%, ${st})`;
}

// ───────── tiny IndexedDB library ─────────
function db() {
  return new Promise((res, rej) => {
    const r = indexedDB.open('memento3d', 1);
    r.onupgradeneeded = () => { r.result.createObjectStore('bases', { keyPath: 'id' }); r.result.createObjectStore('kv'); };
    r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error);
  });
}
async function tx(store, mode, fn) {
  const d = await db();
  return new Promise((res, rej) => {
    const t = d.transaction(store, mode); const s = t.objectStore(store); const r = fn(s);
    t.oncomplete = () => res(r && r.result); t.onerror = () => rej(t.error);
  });
}
export const lib = {
  async list() { const all = (await tx('bases', 'readonly', s => s.getAll())) || []; return all.map(({ id, name, size, added }) => ({ id, name, size, added })).sort((a, b) => a.added - b.added); },
  async add(file) { const id = 'b' + Date.now().toString(36); await tx('bases', 'readwrite', s => s.put({ id, name: file.name, size: file.size, added: Date.now(), blob: file })); return id; },
  async get(id) { return tx('bases', 'readonly', s => s.get(id)); },
  async remove(id) { return tx('bases', 'readwrite', s => s.delete(id)); },
  async setKV(k, v) { return tx('kv', 'readwrite', s => s.put(v, k)); },
  async getKV(k) { return tx('kv', 'readonly', s => s.get(k)); },
};

// ───────── image helpers ─────────
function readDpi(buf) {
  try {
    const b = new DataView(buf);
    if (b.getUint32(0) === 0x89504E47) {
      let o = 8;
      while (o < b.byteLength - 12) {
        const len = b.getUint32(o), type = b.getUint32(o + 4);
        if (type === 0x70485973 && b.getUint8(o + 16) === 1) return Math.round(b.getUint32(o + 8) * 0.0254);
        o += 12 + len;
      }
      return 0;
    }
    if (b.getUint16(0) !== 0xFFD8) return 0;
    let o = 2, jfif = 0;
    while (o < b.byteLength - 4) {
      if (b.getUint8(o) !== 0xFF) break;
      const m = b.getUint8(o + 1), len = b.getUint16(o + 2);
      if (m === 0xE0 && b.getUint32(o + 4) === 0x4A464946) {
        const u = b.getUint8(o + 11), x = b.getUint16(o + 12);
        if (u === 1) jfif = x; else if (u === 2) jfif = Math.round(x * 2.54);
      }
      if (m === 0xE1 && b.getUint32(o + 4) === 0x45786966) {
        const t = o + 10, le = b.getUint16(t) === 0x4949;
        const g16 = p => b.getUint16(p, le), g32 = p => b.getUint32(p, le);
        const ifd = t + g32(t + 4), n = g16(ifd); let xr = 0, unit = 2;
        for (let i = 0; i < n; i++) {
          const e = ifd + 2 + i * 12, tag = g16(e);
          if (tag === 0x011A) { const off = t + g32(e + 8); xr = g32(off) / g32(off + 4); }
          if (tag === 0x0128) unit = g16(e + 8);
        }
        if (xr > 1) return Math.round(unit === 3 ? xr * 2.54 : xr);
      }
      if (m === 0xDA) break;
      o += 2 + len;
    }
    return jfif;
  } catch (e) { return 0; }
}
function loadImg(src) {
  return new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = () => rej(new Error('Could not read image')); i.src = src; });
}

// ───────── cutout: flood the background from the edges, keep the plate ─────────
function morph(m, w, h, n, dilate) {
  let a = m;
  for (let it = 0; it < n; it++) {
    const b = new Uint8Array(w * h);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const i = y * w + x; let v = a[i];
      const L = x > 0 ? a[i - 1] : 0, R = x < w - 1 ? a[i + 1] : 0, U = y > 0 ? a[i - w] : 0, D = y < h - 1 ? a[i + w] : 0;
      if (dilate) { if (!v) v = L | R | U | D; } else if (v) v = L & R & U & D;
      b[i] = v;
    }
    a = b;
  }
  return a;
}
function largest(m, w, h) {
  const lab = new Int32Array(w * h), q = new Int32Array(w * h); let best = 0, bestN = 0, cur = 0;
  for (let s = 0; s < w * h; s++) {
    if (!m[s] || lab[s]) continue;
    cur++; let qh = 0, qt = 0, n = 0; q[qt++] = s; lab[s] = cur;
    while (qh < qt) {
      const i = q[qh++]; n++; const x = i % w;
      const nb = [x > 0 ? i - 1 : -1, x < w - 1 ? i + 1 : -1, i - w, i + w];
      for (const j of nb) if (j >= 0 && j < w * h && m[j] && !lab[j]) { lab[j] = cur; q[qt++] = j; }
    }
    if (n > bestN) { bestN = n; best = cur; }
  }
  const out = new Uint8Array(w * h); for (let i = 0; i < w * h; i++) out[i] = lab[i] === best ? 1 : 0;
  return { mask: out, count: bestN };
}
function fillHoles(m, w, h) {
  const seen = new Uint8Array(w * h), q = new Int32Array(w * h); let qh = 0, qt = 0;
  const seed = i => { if (!m[i] && !seen[i]) { seen[i] = 1; q[qt++] = i; } };
  for (let x = 0; x < w; x++) { seed(x); seed((h - 1) * w + x); }
  for (let y = 0; y < h; y++) { seed(y * w); seed(y * w + w - 1); }
  while (qh < qt) {
    const i = q[qh++], x = i % w;
    if (x > 0) seed(i - 1); if (x < w - 1) seed(i + 1); if (i >= w) seed(i - w); if (i < w * (h - 1)) seed(i + w);
  }
  const out = new Uint8Array(w * h); for (let i = 0; i < w * h; i++) out[i] = seen[i] ? 0 : 1;
  return out;
}
const DIRS = [[-1, 0], [-1, -1], [0, -1], [1, -1], [1, 0], [1, 1], [0, 1], [-1, 1]];
const DIDX = {}; DIRS.forEach(([dx, dy], i) => DIDX[(dx + 1) * 3 + dy + 1] = i);
function trace(m, w, h) {
  const fg = (x, y) => x >= 0 && y >= 0 && x < w && y < h && m[y * w + x];
  let sx = -1, sy = -1;
  outer: for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (m[y * w + x]) { sx = x; sy = y; break outer; }
  if (sx < 0) return [];
  const pts = [[sx, sy]]; let px = sx, py = sy, bDir = 0, startHits = 0;
  for (let it = 0; it < 4 * (w + h) * 8; it++) {
    let found = -1;
    for (let k = 1; k <= 8; k++) { const d = (bDir + k) % 8; if (fg(px + DIRS[d][0], py + DIRS[d][1])) { found = d; break; } }
    if (found < 0) break;
    const pd = (found + 7) % 8, bx = px + DIRS[pd][0], by = py + DIRS[pd][1];
    const qx = px + DIRS[found][0], qy = py + DIRS[found][1];
    bDir = DIDX[(bx - qx + 1) * 3 + (by - qy + 1)];
    px = qx; py = qy;
    if (px === sx && py === sy) { if (bDir === 0 || ++startHits > 1) break; }
    pts.push([px, py]);
  }
  return pts;
}
function smooth(pts, r) {
  if (r < 1) return pts; const n = pts.length, out = [];
  for (let i = 0; i < n; i++) { let x = 0, y = 0; for (let k = -r; k <= r; k++) { const p = pts[(i + k + n) % n]; x += p[0]; y += p[1]; } out.push([x / (2 * r + 1), y / (2 * r + 1)]); }
  return out;
}
function simplify(pts, eps) {
  if (pts.length < 8) return pts;
  const a = pts.concat([pts[0]]), keep = new Uint8Array(a.length); keep[0] = keep[a.length - 1] = 1;
  let far = 0, fd = 0;
  for (let i = 1; i < a.length - 1; i++) { const d = (a[i][0] - a[0][0]) ** 2 + (a[i][1] - a[0][1]) ** 2; if (d > fd) { fd = d; far = i; } }
  keep[far] = 1; const st = [[0, far], [far, a.length - 1]], e2 = eps * eps;
  while (st.length) {
    const [i0, i1] = st.pop(); const [x0, y0] = a[i0], [x1, y1] = a[i1]; const dx = x1 - x0, dy = y1 - y0, L = dx * dx + dy * dy || 1;
    let md = 0, mi = -1;
    for (let i = i0 + 1; i < i1; i++) { const c = (dx * (a[i][1] - y0) - dy * (a[i][0] - x0)); const d = c * c / L; if (d > md) { md = d; mi = i; } }
    if (mi > 0 && md > e2) { keep[mi] = 1; st.push([i0, mi], [mi, i1]); }
  }
  const out = []; for (let i = 0; i < a.length - 1; i++) if (keep[i]) out.push(a[i]);
  return out;
}

function computeCutout(img, p) {
  const iw = img.naturalWidth, ih = img.naturalHeight;
  const sx = Math.round(iw * p.cropL / 100), sy = Math.round(ih * p.cropT / 100);
  const sw = Math.max(16, Math.round(iw * (1 - (p.cropL + p.cropR) / 100))), sh = Math.max(16, Math.round(ih * (1 - (p.cropT + p.cropB) / 100)));
  const k = Math.min(1, 1100 / Math.max(sw, sh)), w = Math.round(sw * k), h = Math.round(sh * k), N = w * h;
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const ctx = c.getContext('2d', { willReadFrequently: true }); ctx.drawImage(img, sx, sy, sw, sh, 0, 0, w, h);
  const d = ctx.getImageData(0, 0, w, h).data;

  let bgc;
  if (p.bgMode === 'white') bgc = [255, 255, 255];
  else if (p.bgMode === 'black') bgc = [0, 0, 0];
  else {
    const ch = [[], [], []]; const push = i => { ch[0].push(d[i * 4]); ch[1].push(d[i * 4 + 1]); ch[2].push(d[i * 4 + 2]); };
    for (let x = 0; x < w; x += 2) { push(x); push((h - 1) * w + x); }
    for (let y = 0; y < h; y += 2) { push(y * w); push(y * w + w - 1); }
    bgc = ch.map(a => a.sort((m, n) => m - n)[a.length >> 1]);
  }
  const tol2 = p.tolerance * p.tolerance, bgL = bgc[0] + bgc[1] + bgc[2] + 1;
  const dist2 = i => { const o = i * 4, a = d[o] - bgc[0], b = d[o + 1] - bgc[1], e = d[o + 2] - bgc[2]; return a * a + b * b + e * e; };
  const shadowOK = (i, from) => {
    const o = i * 4, f = (d[o] + d[o + 1] + d[o + 2]) / bgL;
    if (f < 0.45 || f > 1.04) return false;
    const a = d[o] - bgc[0] * f, b = d[o + 1] - bgc[1] * f, e = d[o + 2] - bgc[2] * f;
    if (a * a + b * b + e * e > tol2 * 0.35) return false;
    const o2 = from * 4, g = d[o] - d[o2], hh = d[o + 1] - d[o2 + 1], j = d[o + 2] - d[o2 + 2];
    return g * g + hh * hh + j * j < 190;
  };
  const bg = new Uint8Array(N), q = new Int32Array(N); let qh = 0, qt = 0;
  const seed = i => { if (!bg[i] && dist2(i) < tol2) { bg[i] = 1; q[qt++] = i; } };
  for (let x = 0; x < w; x++) { seed(x); seed((h - 1) * w + x); }
  for (let y = 0; y < h; y++) { seed(y * w); seed(y * w + w - 1); }
  while (qh < qt) {
    const i = q[qh++], x = i % w;
    const nb = [x > 0 ? i - 1 : -1, x < w - 1 ? i + 1 : -1, i >= w ? i - w : -1, i < N - w ? i + w : -1];
    for (const j of nb) if (j >= 0 && !bg[j] && (dist2(j) < tol2 || (p.softShadow && shadowOK(j, i)))) { bg[j] = 1; q[qt++] = j; }
  }
  let m = new Uint8Array(N); for (let i = 0; i < N; i++) m[i] = bg[i] ? 0 : 1;
  m = morph(morph(m, w, h, 1, false), w, h, 1, true);
  const sh2 = Math.round(p.edgeShift);
  if (sh2 > 0) m = morph(m, w, h, sh2, false); else if (sh2 < 0) m = morph(m, w, h, -sh2, true);
  const L = largest(m, w, h);
  if (L.count < N * 0.01) throw new Error('No plate outline found — try a lower tolerance or crop the image edges.');
  m = fillHoles(L.mask, w, h);

  let pts = trace(m, w, h);
  pts = simplify(smooth(pts, Math.round(p.smoothing)), 0.6);

  // stroke colour = ring just inside the cut line
  const e1 = morph(m, w, h, 1, false), e5 = morph(e1, w, h, 4, false);
  let r = 0, g = 0, b = 0, n = 0;
  for (let i = 0; i < N; i += 1) if (e1[i] && !e5[i]) { r += d[i * 4]; g += d[i * 4 + 1]; b += d[i * 4 + 2]; n++; }
  const hex = v => Math.round(v / Math.max(1, n)).toString(16).padStart(2, '0');
  const edgeColor = '#' + hex(r) + hex(g) + hex(b);

  const mc = document.createElement('canvas'); mc.width = w; mc.height = h;
  const mctx = mc.getContext('2d'); const id = ctx.getImageData(0, 0, w, h);
  for (let i = 0; i < N; i++) if (!m[i]) id.data[i * 4 + 3] = 0;
  mctx.putImageData(id, 0, 0);

  // texture at higher resolution
  const tk = Math.min(1, 2048 / Math.max(sw, sh));
  // CPU-backed canvas: GPU canvases can upload to WebGL as solid black on some browsers / low-memory devices
  const tc = document.createElement('canvas'); tc.width = Math.round(sw * tk); tc.height = Math.round(sh * tk);
  tc.getContext('2d', { willReadFrequently: true }).drawImage(img, sx, sy, sw, sh, 0, 0, tc.width, tc.height);

  let sl = 0, ss = 0, sw2 = 0, sn = 0;
  for (let i = 0; i < N; i += 3) if (m[i]) { const o = i * 4, r = d[o], gg = d[o + 1], bb = d[o + 2]; sl += (0.2126 * r + 0.7152 * gg + 0.0722 * bb) / 255; ss += (Math.max(r, gg, bb) - Math.min(r, gg, bb)) / 255; sw2 += (r - bb) / 255; sn++; }
  const stats = { lum: sl / Math.max(1, sn), sat: ss / Math.max(1, sn), warm: Math.max(-1, Math.min(1, sw2 / Math.max(1, sn) * 2)) };
  return { w, h, k, pts, edgeColor, mask: mc, raw: tc, tex: tc, bgColor: bgc, stats, crop: [sx / iw, sy / ih, sw / iw, sh / ih], iw, ih };
}
function makePreview(c) {
  const pk = Math.min(1, 520 / Math.max(c.w, c.h)), pw = Math.round(c.w * pk), ph = Math.round(c.h * pk);
  const pc = document.createElement('canvas'); pc.width = pw; pc.height = ph; const g = pc.getContext('2d');
  g.drawImage(c.tex, 0, 0, pw, ph); g.globalCompositeOperation = 'destination-in'; g.drawImage(c.mask, 0, 0, pw, ph); g.globalCompositeOperation = 'source-over';
  g.strokeStyle = '#ec3013'; g.lineWidth = 1.5; g.beginPath();
  c.pts.forEach(([x, y], i) => i ? g.lineTo(x * pk, y * pk) : g.moveTo(x * pk, y * pk)); g.closePath(); g.stroke();
  return pc;
}
// ───────── privacy: blur / pixelate the whole print or user-drawn areas ─────────
const FILTER_OK = (() => { try { const g = document.createElement('canvas').getContext('2d'); g.filter = 'blur(2px)'; return g.filter === 'blur(2px)'; } catch (e) { return false; } })();
const PRIV_KEYS = ['privOn', 'privArea', 'privStyle', 'privAmount', 'privRegions'];
function privatize(src, p) {
  if (!p.privOn) return src;
  const regs = p.privArea === 'areas' ? (p.privRegions || []) : [[0, 0, 1, 1]];
  if (!regs.length) return src;
  const W = src.width, H = src.height, M = Math.max(W, H), amt = Math.max(5, p.privAmount || 60) / 100;
  const c = document.createElement('canvas'); c.width = W; c.height = H; const g = c.getContext('2d', { willReadFrequently: true }); g.drawImage(src, 0, 0);
  for (const r of regs) {
    const pts = Array.isArray(r) ? [[r[0], r[1]], [r[0] + r[2], r[1]], [r[0] + r[2], r[1] + r[3]], [r[0], r[1] + r[3]]] : (r.pts || []);
    if (pts.length < 3) continue;
    let x0 = 1, y0 = 1, x1 = 0, y1 = 0; pts.forEach(([x, y]) => { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); });
    const rx = Math.max(0, Math.floor(x0 * W)), ry = Math.max(0, Math.floor(y0 * H)), rw = Math.max(1, Math.ceil(x1 * W) - rx), rh = Math.max(1, Math.ceil(y1 * H) - ry);
    g.save(); g.beginPath(); pts.forEach(([x, y], i) => i ? g.lineTo(x * W, y * H) : g.moveTo(x * W, y * H)); g.closePath(); g.clip();
    if (p.privStyle === 'pixel' || !FILTER_OK) {
      const b = Math.max(3, Math.round(M * (p.privStyle === 'pixel' ? 0.05 : 0.03) * amt)), sw = Math.max(1, Math.ceil(rw / b)), sh = Math.max(1, Math.ceil(rh / b));
      const t = document.createElement('canvas'); t.width = sw; t.height = sh; t.getContext('2d').drawImage(src, rx, ry, rw, rh, 0, 0, sw, sh);
      g.imageSmoothingEnabled = p.privStyle !== 'pixel'; g.imageSmoothingQuality = 'high';
      g.drawImage(t, 0, 0, sw, sh, rx, ry, sw * b, sh * b);
    } else { g.filter = `blur(${Math.max(2, M * 0.028 * amt)}px)`; g.drawImage(src, 0, 0); g.drawImage(src, 0, 0); g.filter = 'none'; }
    g.restore();
  }
  return c;
}

// ───────── materials ─────────
// Painted-wood + glitter maps, generated once per glitter density. G = roughness, B = metalness (flakes).
function makeWoodMaps(glitter) {
  const S = 512, g = document.createElement('canvas'); g.width = g.height = S;
  const gc = g.getContext('2d'); gc.fillStyle = '#808080'; gc.fillRect(0, 0, S, S);
  let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  for (let i = 0; i < 420; i++) {
    const y0 = rnd() * S, amp = 1 + rnd() * 3, ph = rnd() * 6.28, fq = 0.002 + rnd() * 0.006;
    gc.strokeStyle = `rgba(${rnd() < 0.5 ? '0,0,0' : '255,255,255'},${0.025 + rnd() * 0.06})`; gc.lineWidth = 0.5 + rnd() * 1.2;
    gc.beginPath();
    for (let x = -4; x <= S + 4; x += 8) { const y = y0 + Math.sin(x * fq * 6.28 + ph) * amp; x < 0 ? gc.moveTo(x, y) : gc.lineTo(x, y); }
    gc.stroke();
    for (const dy of [-S, S]) { gc.save(); gc.translate(0, dy); gc.stroke(); gc.restore(); }
  }
  const grain = gc.getImageData(0, 0, S, S).data;
  const col = document.createElement('canvas'), rm = document.createElement('canvas'); col.width = col.height = rm.width = rm.height = S;
  const ci = col.getContext('2d').createImageData(S, S), ri = rm.getContext('2d').createImageData(S, S);
  const density = glitter / 100 * 0.07;
  for (let i = 0; i < S * S; i++) {
    const gv = grain[i * 4], o = i * 4, flake = rnd() < density;
    const c = flake ? 255 : 218 + (gv - 128) * 0.12;
    ci.data[o] = ci.data[o + 1] = ci.data[o + 2] = c; ci.data[o + 3] = 255;
    ri.data[o] = 0; ri.data[o + 1] = flake ? 38 : 150 + (gv - 128) * 0.3; ri.data[o + 2] = flake ? 255 : 0; ri.data[o + 3] = 255;
  }
  col.getContext('2d').putImageData(ci, 0, 0); rm.getContext('2d').putImageData(ri, 0, 0);
  const tex = (c, srgb) => { const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8; if (srgb) t.colorSpace = THREE.SRGBColorSpace; return t; };
  return { map: tex(col, true), rm: tex(rm), bump: tex(g) };
}
const BASE_LOOKS = {
  paint: { roughness: 1, metalness: 1, clearcoat: 0.3, clearcoatRoughness: 0.45, bumpScale: 0.45, flakes: true },
  gloss: { roughness: 0.16, metalness: 1, clearcoat: 1, clearcoatRoughness: 0.06, bumpScale: 0.15, flakes: true, noRough: true },
  metal: { roughness: 0.35, metalness: 0.9, clearcoat: 0.4, clearcoatRoughness: 0.2, bumpScale: 0.3, flakes: true, noMetalMap: true },
};
function boxUV(mesh) {
  const g = mesh.geometry, p = g.attributes.position, n = g.attributes.normal; if (!p || !n) return;
  if (g.attributes.uv && !g.userData.boxUV) return;
  mesh.updateMatrixWorld(true);
  const m = mesh.matrixWorld, nm = new THREE.Matrix3().getNormalMatrix(m), v = new THREE.Vector3(), w = new THREE.Vector3();
  const uv = new Float32Array(p.count * 2), k = 1 / 120;
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i).applyMatrix4(m); w.fromBufferAttribute(n, i).applyMatrix3(nm);
    const ax = Math.abs(w.x), ay = Math.abs(w.y), az = Math.abs(w.z);
    let u, t; if (ay >= ax && ay >= az) { u = v.x; t = v.z; } else if (az >= ax) { u = v.x; t = v.y; } else { u = v.z; t = v.y; }
    uv[i * 2] = u * k; uv[i * 2 + 1] = t * k;
  }
  g.setAttribute('uv', new THREE.BufferAttribute(uv, 2)); g.userData.boxUV = true;
}
const TRIM_RE = /gold|beed|bead|pole|pillar|post|trim|prt0001/i;
const TRIM_LOOKS = { gold: ['#d6ac52', 0.2], antique: ['#a8843e', 0.38], rose: ['#d49a83', 0.24], silver: ['#cfd1d4', 0.18] };
const FINISH = { gloss: [0.22, 0.6, 0.12], satin: [0.45, 0.2, 0.35], matte: [0.82, 0, 0.5] };
const EDGE = { grey: '#3b3b3b', white: '#f3f2ee', black: '#151515', gold: '#c9a24d' };

// ───────── engine ─────────
export async function createEngine(el, cb = {}) {
  const status = s => cb.onStatus && cb.onStatus(s);
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.NeutralToneMapping;
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  Object.assign(renderer.domElement.style, { position: 'absolute', inset: '0', width: '100%', height: '100%', display: 'block' });
  el.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(28, 1, 1, 20000);
  camera.position.set(0, 80, 600);
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true; controls.maxPolarAngle = Math.PI * 0.495; controls.minDistance = 40; controls.maxDistance = 4000;

  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.85;

  const key = new THREE.DirectionalLight('#ffffff', 2.4);
  key.castShadow = true; key.shadow.mapSize.set(2048, 2048); key.shadow.bias = -0.0004; key.shadow.normalBias = 0.3; key.shadow.radius = 4;
  const fill = new THREE.DirectionalLight('#ffffff', 0.5);
  scene.add(key, key.target, fill);

  const floor = new THREE.Mesh(new THREE.PlaneGeometry(8000, 8000), new THREE.ShadowMaterial({ opacity: 0.3 }));
  floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; floor.name = 'Floor';
  scene.add(floor);
  // textured surface under the shadow catcher; radial alpha fade melts its far edge into the backdrop
  // floor stays crisp and solid; only the far back edge (and the outer sides) fade into the backdrop
  const fadeCache = {};
  const fadeTex = (soft) => {
    const k = Math.round(soft * 10); if (fadeCache[k]) return fadeCache[k];
    // pixel data built in JS (no 2D canvas): canvas-backed alpha maps upload as solid black/white on some browsers,
    // which made Edge softness do nothing in the offline app
    const S = 512, e = Math.max(0.002, soft / 100), s = Math.min(0.45, e * 0.5), d = new Uint8Array(S * S * 4);
    const ss = t => { t = Math.max(0, Math.min(1, t)); return t * t * (3 - 2 * t); };
    const col = new Float32Array(S); for (let x = 0; x < S; x++) { const u = (x + 0.5) / S; col[x] = ss(Math.min(u, 1 - u) / s); }
    for (let y = 0; y < S; y++) {
      const fy = ss(((y + 0.5) / S) / e);
      for (let x = 0; x < S; x++) { const v = Math.round(255 * fy * col[x]), o = (y * S + x) * 4; d[o] = d[o + 1] = d[o + 2] = v; d[o + 3] = 255; }
    }
    const t = new THREE.DataTexture(d, S, S, THREE.RGBAFormat); t.flipY = true; t.magFilter = t.minFilter = THREE.LinearFilter; t.needsUpdate = true;
    return (fadeCache[k] = t);
  };
  const surface = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshStandardMaterial({ name: 'FloorSurface', transparent: true, alphaMap: fadeTex(4), depthWrite: false, metalness: 0 }));
  surface.rotation.x = -Math.PI / 2; surface.position.y = -0.05; surface.renderOrder = -1; surface.visible = false; surface.name = 'FloorSurface';
  scene.add(surface);
  const floorTex = {};
  // polished floor: the memento is re-rendered mirrored about y=0 into a screen-sized target and mixed into the floor shader
  const reflRT = new THREE.WebGLRenderTarget(2, 2, { type: THREE.HalfFloatType });
  const mirrorRoot = new THREE.Group(); mirrorRoot.matrixAutoUpdate = false; mirrorRoot.matrix.makeScale(1, -1, 1); scene.add(mirrorRoot);
  const reflU = { tRefl: { value: reflRT.texture }, uReflRes: { value: new THREE.Vector2(2, 2) }, uReflStr: { value: 0 }, uReflBlur: { value: 0 } };
  surface.material.onBeforeCompile = sh => {
    Object.assign(sh.uniforms, reflU);
    sh.fragmentShader = 'uniform sampler2D tRefl; uniform vec2 uReflRes; uniform float uReflStr; uniform float uReflBlur;\n' + sh.fragmentShader.replace('#include <opaque_fragment>', `
      if (uReflStr > 0.0) {
        vec2 ruv = gl_FragCoord.xy / uReflRes, rpx = uReflBlur / uReflRes;
        vec4 rf = texture2D(tRefl, ruv) * 0.2;
        for (int i = 0; i < 8; i++) { float ra = float(i) * 0.785398; rf += texture2D(tRefl, ruv + vec2(cos(ra), sin(ra)) * rpx) * 0.06; rf += texture2D(tRefl, ruv + vec2(cos(ra + 0.39), sin(ra + 0.39)) * rpx * 2.0) * 0.04; }
        vec3 rc = rf.a > 0.001 ? rf.rgb / rf.a : vec3(0.0);
        float rfr = pow(1.0 - clamp(dot(normalize(vViewPosition), normal), 0.0, 1.0), 4.0);
        outgoingLight = mix(outgoingLight, rc, clamp(rf.a * uReflStr * (0.65 + 0.35 * rfr), 0.0, 1.0));
      }
      #include <opaque_fragment>`);
  };
  surface.material.customProgramCacheKey = () => 'floor-refl';
  const _rs = new THREE.Vector2(), _cc = new THREE.Color();
  function drawRefl() {
    const on = surface.visible && P && P.floorReflOn && (P.floorRefl ?? 35) > 0;
    reflU.uReflStr.value = on ? (P.floorRefl ?? 35) / 100 : 0;
    if (!on) return;
    renderer.getDrawingBufferSize(_rs);
    // mirror pass at half resolution: it is blurred anyway, and full-res made exports with reflection freeze on slower GPUs
    const rw = Math.max(2, Math.round(_rs.x / 2)), rh = Math.max(2, Math.round(_rs.y / 2));
    if (reflRT.width !== rw || reflRT.height !== rh) reflRT.setSize(rw, rh);
    reflU.uReflRes.value.copy(_rs); reflU.uReflBlur.value = (P.floorReflBlur ?? 3) * _rs.y / 1000;
    const bg = scene.background, hidden = [], lights = [key, key.target, fill], lp = lights.map(o => o.position.y);
    for (const o of scene.children) if (o !== content && o !== mirrorRoot && !o.isLight && o !== key.target && o.visible) { o.visible = false; hidden.push(o); }
    lights.forEach(o => { o.position.y = -o.position.y; o.updateMatrixWorld(); });
    mirrorRoot.add(content); scene.background = null; key.castShadow = false;
    renderer.getClearColor(_cc); const ca = renderer.getClearAlpha();
    renderer.setClearColor(0x000000, 0); renderer.setRenderTarget(reflRT); renderer.clear(); renderer.render(scene, camera); renderer.setRenderTarget(null);
    renderer.setClearColor(_cc, ca);
    scene.add(content); scene.background = bg; key.castShadow = true;
    lights.forEach((o, i) => { o.position.y = lp[i]; o.updateMatrixWorld(); });
    hidden.forEach(o => { o.visible = true; });
  }

  const content = new THREE.Group(); content.name = 'Memento';
  const baseRoot = new THREE.Group(); baseRoot.name = 'Base';
  const plateRoot = new THREE.Group(); plateRoot.name = 'TopPlate';
  content.add(baseRoot, plateRoot); scene.add(content);

  const bgCanvas = document.createElement('canvas');
  const bgTex = new THREE.CanvasTexture(bgCanvas); bgTex.colorSpace = THREE.SRGBColorSpace;
  let bgImg = null;

  let P = null, base = null, baseInfo = null, plate = null, cut = null, plateMesh = null, cutTimer = 0, cutSeq = 0;
  let baseMat = null, woodMaps = null, woodGlitter = -1;
  const photoCache = {}; let bgInfo = null, drawnZ = 1, bgRedrawT = 0;
  let size = [1, 1], prevURL = null, prevSeq = 0, grid = null, gridDark = null;

  function bgZoom() {
    let z = (P ? P.bgScale : 100) / 100;
    if (P && P.bgAuto && bgInfo && bgInfo.coverW) {
      const dist = camera.position.distanceTo(controls.target);
      const ppm = bgCanvas.height / (2 * dist * Math.tan(camera.fov * Math.PI / 360));
      z *= (bgInfo.mm * ppm) / bgInfo.coverW;
    }
    return Math.min(6, Math.max(1, z));
  }
  function photoFor(b) {
    if (b.id === 'custom') return bgImg;
    let c = photoCache[b.id];
    if (!c) { c = photoCache[b.id] = { img: null }; loadImg(b.photo).then(i => { c.img = i; if (P && P.bg === b.id) drawBg(); }).catch(() => {}); }
    return c.img;
  }
  const avgCache = new WeakMap();
  function avgColor(img) {
    let c = avgCache.get(img); if (c) return c;
    const cv = document.createElement('canvas'); cv.width = cv.height = 1; const g = cv.getContext('2d');
    g.drawImage(img, 0, 0, 1, 1); const d = g.getImageData(0, 0, 1, 1).data; c = `rgb(${d[0]},${d[1]},${d[2]})`; avgCache.set(img, c); return c;
  }
  function bgDef() {
    const id = P ? P.bg : 'studio';
    return id === 'custom' ? { id: 'custom', mm: 600, fx: 0.5, fy: 0.5 } : (BACKGROUNDS.find(x => x.id === id) || BACKGROUNDS[0]);
  }
  // paints the backdrop as it appears over a viewport of VW×VH target pixels
  function paintBg(g, VW, VH, z) {
    const b = bgDef(), img = (b.photo || b.id === 'custom') ? photoFor(b) : null, unit = VW / size[0];
    if (img) {
      const s0 = Math.max(VW / img.naturalWidth, VH / img.naturalHeight);
      const dw = img.naturalWidth * s0 * z, dh = img.naturalHeight * s0 * z;
      const dx = (VW - dw) * b.fx + (P.bgX || 0) / 100 * VW, dy = (VH - dh) * b.fy + (P.bgY || 0) / 100 * VH;
      g.fillStyle = avgColor(img); g.fillRect(0, 0, VW, VH);
      g.save();
      if (P.bgBlur > 0) g.filter = `blur(${P.bgBlur * unit}px)`;
      if (P.bgFlip) { g.translate(dx + dw / 2, 0); g.scale(-1, 1); g.translate(-(dx + dw / 2), 0); }
      g.drawImage(img, dx, dy, dw, dh); g.restore();
      return { mm: b.mm, coverW: img.naturalWidth * s0, fx: b.fx, fy: b.fy };
    }
    const gb = b.stops ? b : BACKGROUNDS[0];
    let gr;
    if (gb.linear) gr = g.createLinearGradient(0, 0, 0, VH);
    else { const cx = gb.at[0] * VW, cy = gb.at[1] * VH; const r = Math.hypot(Math.max(cx, VW - cx), Math.max(cy, VH - cy)); gr = g.createRadialGradient(cx, cy, 0, cx, cy, r); }
    gb.stops.forEach(([o, c]) => gr.addColorStop(o, c));
    g.fillStyle = gr; g.fillRect(0, 0, VW, VH);
    return { mm: 0, coverW: 0, fx: 0.5, fy: 0.5 };
  }
  function setGrid(on, dark) {
    if (on && gridDark !== dark) {
      if (grid) { scene.remove(grid); grid.geometry.dispose(); grid.material.dispose(); }
      grid = new THREE.GridHelper(1000, 100, dark ? 0x6f737a : 0x8a8e94, dark ? 0x323438 : 0xc6c8cc); grid.position.y = 0.02; grid.name = 'CADGrid'; scene.add(grid); gridDark = dark;
    }
    if (grid) grid.visible = on;
  }
  function drawBg() {
    const cad = !!P && P.viewMode === 'cad', dark = !!P && P.uiTheme === 'cad';
    setGrid(cad, dark);
    if (cad) { scene.background = new THREE.Color(dark ? '#1c1d20' : '#e3e4e6'); bgInfo = null; return; }
    if ((P ? P.bg : 'studio') === 'transparent') { scene.background = null; bgInfo = null; return; }
    const pr = renderer.getPixelRatio(), w = Math.max(2, Math.round(size[0] * pr)), h = Math.max(2, Math.round(size[1] * pr));
    bgCanvas.width = w; bgCanvas.height = h; const g = bgCanvas.getContext('2d');
    const b = bgDef(), img = (b.photo || b.id === 'custom') ? photoFor(b) : null;
    bgInfo = img ? { mm: b.mm, coverW: img.naturalWidth * Math.max(w / img.naturalWidth, h / img.naturalHeight), fx: b.fx, fy: b.fy } : { mm: 0, coverW: 0, fx: 0.5, fy: 0.5 };
    const z = bgZoom(); paintBg(g, w, h, z); drawnZ = z;
    bgTex.repeat.set(1, 1); bgTex.offset.set(0, 0);
    bgTex.needsUpdate = true; scene.background = bgTex;
  }

  // ── export frame + watermark ──
  function frameRect(W, H) {
    const vw = size[0], vh = size[1];
    if (!W || !H) return { x: 0, y: 0, w: vw, h: vh, full: true };
    const A = W / H; let fw, fh;
    if (A < vw / vh) { fh = vh; fw = vh * A; } else { fw = vw; fh = vw / A; }
    return { x: (vw - fw) / 2, y: (vh - fh) / 2, w: fw, h: fh, full: false };
  }
  function makeWatermark(W, H) {
    const c = document.createElement('canvas'); c.width = Math.max(1, Math.round(W)); c.height = Math.max(1, Math.round(H));
    const g = c.getContext('2d'), l1 = (P.wmLine1 || '').trim(), l2 = (P.wmLine2 || '').trim();
    if (!l1 && !l2) return c;
    const base = Math.min(W, H) * (P.wmSize || 100) / 100, light = P.wmTone !== 'dark';
    g.globalAlpha = (P.wmOpacity || 28) / 100;
    g.fillStyle = light ? '#ffffff' : '#1c1a19';
    g.shadowColor = light ? 'rgba(0,0,0,0.35)' : 'rgba(255,255,255,0.25)'; g.shadowBlur = base * 0.006;
    const block = (x, y, f1, align) => {
      g.textAlign = align; g.textBaseline = 'alphabetic';
      g.font = `800 ${f1}px Archivo, system-ui, sans-serif`; try { g.letterSpacing = (f1 * 0.06) + 'px'; } catch (e) {}
      if (l1) g.fillText(l1.toUpperCase(), x, y);
      g.font = `400 ${f1 * 0.5}px Archivo, system-ui, sans-serif`; try { g.letterSpacing = (f1 * 0.03) + 'px'; } catch (e) {}
      if (l2) g.fillText(l2, x, y + f1 * 0.72);
    };
    if (P.wmStyle === 'corner') {
      const f1 = base * 0.045, m = base * 0.045;
      block(W - m, H - m - f1 * 0.72, f1, 'right');
    } else if (P.wmStyle === 'center') {
      const f1 = base * 0.1;
      g.translate(W / 2, H / 2); g.rotate(-Math.PI / 7); block(0, 0, f1, 'center');
    } else {
      const f1 = base * 0.042;
      g.font = `800 ${f1}px Archivo, system-ui, sans-serif`;
      const tw = Math.max(g.measureText(l1.toUpperCase()).width * 1.1, f1 * 6) + f1 * 3.5, th = f1 * 4.2, R = Math.hypot(W, H);
      g.translate(W / 2, H / 2); g.rotate(-Math.PI / 7);
      for (let row = -Math.ceil(R / th); row <= Math.ceil(R / th); row++)
        for (let col = -Math.ceil(R / tw) - 1; col <= Math.ceil(R / tw) + 1; col++)
          block(col * tw + (row % 2 ? tw / 2 : 0), row * th, f1, 'center');
    }
    return c;
  }
  const frameEl = document.createElement('div');
  Object.assign(frameEl.style, { position: 'absolute', pointerEvents: 'none', boxSizing: 'border-box' });
  const wmEl = document.createElement('canvas');
  Object.assign(wmEl.style, { position: 'absolute', inset: '0', width: '100%', height: '100%', pointerEvents: 'none' });
  const frameTag = document.createElement('div');
  Object.assign(frameTag.style, { position: 'absolute', right: '0', top: '0', transform: 'translateY(-100%)', font: '600 11px Archivo, system-ui, sans-serif', padding: '3px 6px', background: '#201e1d', color: '#f3f2f2', whiteSpace: 'nowrap' });
  frameEl.append(wmEl, frameTag); el.appendChild(frameEl);
  function updateOverlay() {
    if (!P) return;
    const f = frameRect(P.outW, P.outH);
    Object.assign(frameEl.style, { left: f.x + 'px', top: f.y + 'px', width: f.w + 'px', height: f.h + 'px',
      boxShadow: f.full ? 'none' : '0 0 0 9999px rgba(32,30,29,0.42)', outline: f.full ? 'none' : '1px solid rgba(255,255,255,0.9)' });
    el.style.overflow = 'hidden';
    frameTag.style.display = f.full ? 'none' : 'block'; frameTag.textContent = P.outW + ' × ' + P.outH + ' px';
    wmEl.style.display = P.wmOn ? 'block' : 'none';
    if (P.wmOn) {
      const pr = Math.min(window.devicePixelRatio || 1, 2), src = makeWatermark(f.w * pr, f.h * pr);
      wmEl.width = src.width; wmEl.height = src.height; wmEl.getContext('2d').drawImage(src, 0, 0);
    }
  }
  function updateBgZoom() {
    if (!scene.background || !bgInfo) return;
    const rel = bgZoom() / drawnZ;
    if (Math.abs(rel - 1) < 0.004) return;
    const r = 1 / rel; bgTex.repeat.set(r, r); bgTex.offset.set((1 - r) * bgInfo.fx, (1 - r) * (1 - bgInfo.fy));
    if (!bgRedrawT) bgRedrawT = setTimeout(() => { bgRedrawT = 0; drawBg(); }, 140);
  }

  function resize() {
    const r = el.getBoundingClientRect(); size = [Math.max(1, r.width), Math.max(1, r.height)];
    renderer.setSize(size[0], size[1], false); camera.aspect = size[0] / size[1]; camera.updateProjectionMatrix(); drawBg(); updateOverlay();
  }
  const ro = new ResizeObserver(resize); ro.observe(el); resize();

  let raf = 0;
  // the floor turns with the camera so it stays put against the backdrop while the memento orbits
  const floorAnchor = { x: 0, z: 0, d: 0 };
  function orientFloor() {
    if (!surface.visible) return;
    const az = Math.atan2(camera.position.x - controls.target.x, camera.position.z - controls.target.z);
    surface.rotation.set(-Math.PI / 2, 0, az);
    surface.position.x = floorAnchor.x - Math.sin(az) * floorAnchor.d;
    surface.position.z = floorAnchor.z - Math.cos(az) * floorAnchor.d;
  }
  const loop = () => { controls.update(); updateBgZoom(); orientFloor(); drawRefl(); renderer.render(scene, camera); raf = requestAnimationFrame(loop); };
  loop();

  // ── base ──
  async function parseBase(buf, name) {
    const ext = name.split('.').pop().toLowerCase();
    if (['stp', 'step', 'igs', 'iges'].includes(ext)) {
      status('Reading STEP geometry…');
      const occt = await getOcct();
      const prm = { linearUnit: 'millimeter', linearDeflectionType: 'bounding_box_ratio', linearDeflection: 0.0006, angularDeflection: 0.12 };
      const r = ext.startsWith('ig') ? occt.ReadIgesFile(new Uint8Array(buf), prm) : occt.ReadStepFile(new Uint8Array(buf), prm);
      if (!r.success || !r.meshes.length) throw new Error('STEP file could not be read');
      const g = new THREE.Group();
      const walk = n => { if (!n) return; (n.meshes || []).forEach(i => { const m = r.meshes[i]; if (m && !m.name && n.name) m.name = n.name; }); (n.children || []).forEach(walk); };
      walk(r.root);
      r.meshes.forEach((m, i) => {
        const geo = new THREE.BufferGeometry();
        geo.setAttribute('position', new THREE.Float32BufferAttribute(m.attributes.position.array, 3));
        if (m.attributes.normal) geo.setAttribute('normal', new THREE.Float32BufferAttribute(m.attributes.normal.array, 3));
        geo.setIndex(new THREE.Uint32BufferAttribute(Uint32Array.from(m.index.array), 1));
        if (!m.attributes.normal) geo.computeVertexNormals();
        const col = m.color ? new THREE.Color(m.color[0], m.color[1], m.color[2]) : new THREE.Color('#8a8a8a');
        const mesh = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ name: 'BaseOriginal', color: col, roughness: 0.5, metalness: 0.1 }));
        mesh.name = m.name || 'BasePart' + (i + 1); g.add(mesh);
      });
      return { obj: g, unit: 'mm' };
    }
    if (ext === 'glb' || ext === 'gltf') { const gl = await new GLTFLoader().parseAsync(buf, ''); return { obj: gl.scene, unit: 'm?' }; }
    if (ext === 'obj') return { obj: new OBJLoader().parse(new TextDecoder().decode(buf)), unit: 'mm?' };
    if (ext === 'stl') {
      const geo = new STLLoader().parse(buf); geo.computeVertexNormals();
      return { obj: new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ name: 'BaseOriginal', color: '#8a8a8a', roughness: 0.5 })), unit: 'mm?' };
    }
    throw new Error('Unsupported base format .' + ext + ' — use STEP, GLB, OBJ or STL');
  }

  function normalizeBase() {
    baseRoot.clear(); if (!base) return;
    const yawG = new THREE.Group(), upG = new THREE.Group(); upG.add(base.obj); yawG.add(upG); baseRoot.add(yawG);
    base.obj.position.set(0, 0, 0); base.obj.rotation.set(0, 0, 0); base.obj.scale.set(1, 1, 1);
    base.obj.updateMatrixWorld(true);
    const raw = new THREE.Box3().setFromObject(base.obj).getSize(new THREE.Vector3());
    const mx = Math.max(raw.x, raw.y, raw.z);
    const unitScale = { mm: 1, cm: 10, m: 1000, in: 25.4 };
    let s = unitScale[P.units];
    if (!s) s = base.unit.startsWith('m?') ? (mx < 5 ? 1000 : 1) : base.unit === 'mm?' ? (mx < 5 ? 1000 : 1) : 1;
    let up = P.upAxis;
    if (up === 'auto') up = raw.y <= raw.z && raw.y <= raw.x ? 'y' : raw.z <= raw.x ? 'z' : 'x';
    upG.scale.setScalar(s);
    upG.rotation.set(up === 'z' ? -Math.PI / 2 : 0, 0, up === 'x' ? Math.PI / 2 : 0);
    yawG.updateMatrixWorld(true);
    let b = new THREE.Box3().setFromObject(upG), sz = b.getSize(new THREE.Vector3());
    yawG.rotation.y = (sz.z > sz.x ? Math.PI / 2 : 0) + (P.baseYaw || 0) * Math.PI / 180;
    yawG.updateMatrixWorld(true);
    b = new THREE.Box3().setFromObject(yawG);
    const c = b.getCenter(new THREE.Vector3());
    yawG.position.set(-c.x, -b.min.y, -c.z);
    baseRoot.traverse(o => { if (o.isMesh) {
      o.castShadow = o.receiveShadow = true; if (!o.userData.orig) o.userData.orig = o.material;
      if (o.userData.trim == null) { let t = false; for (let p = o; p && p !== baseRoot; p = p.parent) if (TRIM_RE.test(p.name || '')) t = true; [].concat(o.material).forEach(m => { if (TRIM_RE.test(m.name || '')) t = true; }); o.userData.trim = t; }
    } });
    applyBaseFinish();
    analyzeBase();
  }

  function analyzeBase() {
    baseRoot.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(baseRoot), sz = box.getSize(new THREE.Vector3());
    const ray = new THREE.Raycaster(), down = new THREE.Vector3(0, -1, 0), top = box.max.y + 10;
    const meshes = [], body = []; baseRoot.traverse(o => { if (o.isMesh) { meshes.push(o); if (!o.userData.trim) body.push(o); } });
    const hit = body.length ? body : meshes, trimCount = meshes.length - body.length;
    const hy = (x, z) => { ray.set(new THREE.Vector3(x, top, z), down); const h = ray.intersectObjects(hit, false)[0]; return h ? h.point.y : 0; };
    const N = 260, zs = [], hz = [];
    for (let i = 0; i < N; i++) { const z = box.min.z + 0.3 + (sz.z - 0.6) * i / (N - 1); zs.push(z); hz.push(hy(0, z)); }
    const T = Math.max(...hz), lo = T - 1.0;
    let slot = null, bestD = Infinity;
    for (let i = 1; i < N - 1; i++) {
      if (hz[i] < lo && hz[i - 1] >= lo) {
        let j = i; while (j < N - 1 && hz[j + 1] < lo) j++;
        if (j < N - 1) {
          const width = zs[j] - zs[i] + (zs[1] - zs[0]), zc = (zs[i] + zs[j]) / 2;
          if (width < 45 && Math.abs(zc) < bestD) {
            bestD = Math.abs(zc); let fl = Infinity; for (let k = i; k <= j; k++) fl = Math.min(fl, hz[k]);
            slot = { z: zc, width, floor: fl, depth: T - fl };
          }
        }
        i = j;
      }
    }
    let refZ = 0;
    if (slot) {
      refZ = slot.z; const xs = [], hx = [];
      for (let i = 0; i < N; i++) { const x = box.min.x + 0.3 + (sz.x - 0.6) * i / (N - 1); xs.push(x); hx.push(hy(x, slot.z)); }
      let c = N >> 1; let a = c, b2 = c; while (a > 0 && hx[a - 1] < lo) a--; while (b2 < N - 1 && hx[b2 + 1] < lo) b2++;
      slot.length = xs[b2] - xs[a] + (xs[1] - xs[0]);
    } else {
      const idx = hz.map((h, i) => h >= T - 0.5 ? i : -1).filter(i => i >= 0);
      refZ = (zs[idx[0]] + zs[idx[idx.length - 1]]) / 2;
    }
    baseInfo = { size: { x: sz.x, y: sz.y, z: sz.z }, top: T, refZ, slot, trim: body.length ? trimCount : 0 };
  }
  function suggestion() {
    if (!baseInfo) return {};
    const s = { insert: baseInfo.slot ? +baseInfo.slot.depth.toFixed(1) : 0, offX: 0, offZ: 0, tilt: 0, yaw: 0 };
    if (baseInfo.slot && baseInfo.slot.width <= 12) s.thickness = Math.max(1, +(baseInfo.slot.width - 0.3).toFixed(1));
    return s;
  }

  let trimMat = null;
  function applyTrim() {
    if (!trimMat) trimMat = new THREE.MeshPhysicalMaterial({ name: 'BaseTrimGold', side: THREE.DoubleSide, metalness: 1, clearcoat: 0.5, clearcoatRoughness: 0.12 });
    const [hex, r] = TRIM_LOOKS[P.trimColor] || TRIM_LOOKS.gold;
    trimMat.color.set(hex); trimMat.roughness = r; trimMat.needsUpdate = true;
    let any = false; baseRoot.traverse(o => { if (o.isMesh && o.userData.trim) { o.material = trimMat; any = true; } });
    return any;
  }
  function applyBaseFinish() {
    const look = BASE_LOOKS[P.baseFinish];
    let hasBody = false; baseRoot.traverse(o => { if (o.isMesh && !o.userData.trim) hasBody = true; });
    const isTrim = o => hasBody && o.userData.trim;
    if (!look) {
      baseRoot.traverse(o => { if (o.isMesh && !isTrim(o)) { o.material = o.userData.orig; [].concat(o.material).forEach(m => m.side = THREE.DoubleSide); } });
      if (hasBody) applyTrim();
      return;
    }
    if (!woodMaps || woodGlitter !== P.glitter) { if (woodMaps) Object.values(woodMaps).forEach(t => t.dispose()); woodMaps = makeWoodMaps(P.glitter); woodGlitter = P.glitter; }
    if (!baseMat) baseMat = new THREE.MeshPhysicalMaterial({ name: 'BasePaintedWood', side: THREE.DoubleSide });
    Object.assign(baseMat, { roughness: look.roughness, metalness: look.metalness, clearcoat: look.clearcoat, clearcoatRoughness: look.clearcoatRoughness, bumpScale: look.bumpScale });
    baseMat.map = woodMaps.map; baseMat.bumpMap = woodMaps.bump;
    baseMat.roughnessMap = look.noRough ? null : woodMaps.rm;
    baseMat.metalnessMap = look.noMetalMap ? null : woodMaps.rm;
    if (look.noMetalMap) baseMat.metalness = look.metalness;
    baseMat.color.set(P.baseColor || '#5b1c25');
    baseMat.needsUpdate = true;
    baseRoot.traverse(o => { if (o.isMesh && !isTrim(o)) { boxUV(o); o.material = baseMat; } });
    if (hasBody) applyTrim();
  }

  // ── plate ──
  function buildPlate() {
    if (plateMesh) { plateRoot.remove(plateMesh); plateMesh.geometry.dispose(); [].concat(plateMesh.material).forEach(m => { if (m.map) m.map.dispose(); m.dispose(); }); plateMesh = null; }
    if (!cut || cut.pts.length < 3) return;
    const s = 25.4 / (P.dpi || 300) / cut.k;
    const W = cut.w * s, H = cut.h * s;
    const v = cut.pts.map(([x, y]) => new THREE.Vector2((x + 0.5) * s, (cut.h - (y + 0.5)) * s));
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    v.forEach(p => { minX = Math.min(minX, p.x); maxX = Math.max(maxX, p.x); minY = Math.min(minY, p.y); maxY = Math.max(maxY, p.y); });
    const bev = Math.min(P.bevel, P.thickness * 0.4), depth = Math.max(0.2, P.thickness - 2 * bev);
    const uvGen = {
      generateTopUV: (g, vt, a, b, c) => [a, b, c].map(i => new THREE.Vector2(vt[i * 3] / W, vt[i * 3 + 1] / H)),
      generateSideWallUV: () => [new THREE.Vector2(0, 0), new THREE.Vector2(1, 0), new THREE.Vector2(1, 1), new THREE.Vector2(0, 1)],
    };
    const geo = new THREE.ExtrudeGeometry(new THREE.Shape(v), {
      depth, curveSegments: 1, steps: 1, UVGenerator: uvGen,
      bevelEnabled: bev > 0.02, bevelThickness: bev, bevelSize: bev, bevelOffset: -bev, bevelSegments: 3,
    });
    const g0 = geo.groups.find(g => g.materialIndex === 0), g1 = geo.groups.find(g => g.materialIndex === 1);
    geo.clearGroups(); const half = g0.count / 2;
    geo.addGroup(g0.start, half, 2); geo.addGroup(g0.start + half, half, 0); if (g1) geo.addGroup(g1.start, g1.count, 1);
    geo.translate(-(minX + maxX) / 2, -minY, -depth / 2);
    // print straight from the decoded photo when possible (no canvas in between); canvas only for privacy blur or huge files
    let tex;
    const lim = Math.min(4096, renderer.capabilities.maxTextureSize || 4096);
    if (cut.tex === cut.raw && plate && plate.img && Math.max(cut.iw, cut.ih) <= lim) {
      const [cx, cy, cw, ch] = cut.crop;
      tex = new THREE.Texture(plate.img); tex.repeat.set(cw, ch); tex.offset.set(cx, 1 - cy - ch); tex.needsUpdate = true;
    } else tex = new THREE.CanvasTexture(cut.tex);
    tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
    const front = new THREE.MeshPhysicalMaterial({ name: 'PlatePrint', map: tex });
    const edge = new THREE.MeshStandardMaterial({ name: 'PlateEdge' });
    const btex = tex.clone(); btex.wrapS = THREE.RepeatWrapping; btex.repeat.set(-1, 1); btex.offset.set(1, 0); btex.needsUpdate = true;
    const back = new THREE.MeshPhysicalMaterial({ name: 'PlateBack' }); back.userData.printMap = btex;
    plateMesh = new THREE.Mesh(geo, [front, edge, back]); plateMesh.name = 'TopPlatePrint';
    plateMesh.castShadow = plateMesh.receiveShadow = true;
    plateRoot.add(plateMesh);
    applyPlateFinish();
    cb.onPlate && cb.onPlate({ w: maxX - minX, h: maxY - minY });
  }
  let grainTex = null;
  function backGrain() {
    if (grainTex) return grainTex;
    const S = 256, c = document.createElement('canvas'); c.width = c.height = S; const g = c.getContext('2d'), d = g.createImageData(S, S);
    let seed = 11; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    for (let i = 0; i < S * S; i++) { const v = 150 + (rnd() - 0.5) * 110; d.data[i * 4] = d.data[i * 4 + 1] = d.data[i * 4 + 2] = v; d.data[i * 4 + 3] = 255; }
    g.putImageData(d, 0, 0);
    grainTex = new THREE.CanvasTexture(c); grainTex.wrapS = grainTex.wrapT = THREE.RepeatWrapping; grainTex.repeat.set(6, 9);
    return grainTex;
  }
  function applyPlateFinish() {
    if (!plateMesh) return;
    const [front, edge, back] = plateMesh.material, f = FINISH[P.finish] || FINISH.gloss;
    front.roughness = f[0]; front.clearcoat = f[1]; front.clearcoatRoughness = f[2]; front.metalness = 0;
    const col = '#2e2e2e';
    edge.color.set(col);
    const gold = false;
    edge.metalness = gold ? 0.9 : 0.05; edge.roughness = gold ? 0.3 : 0.5;
    // back is always black with a fine grain
    if (back.map || back.bumpMap !== backGrain()) { back.map = null; back.bumpMap = backGrain(); back.roughnessMap = backGrain(); back.needsUpdate = true; }
    back.color.set('#111111'); back.metalness = 0; back.roughness = 0.75; back.bumpScale = 0.6; back.clearcoat = 0.25; back.clearcoatRoughness = 0.5;
  }
  function applyPlacement() {
    const top = baseInfo ? baseInfo.top : 0, z = baseInfo ? baseInfo.refZ : 0;
    plateRoot.position.set(P.offX, top - P.insert, z + P.offZ);
    plateRoot.rotation.set(-P.tilt * Math.PI / 180, P.yaw * Math.PI / 180, 0, 'YXZ');
  }
  function emitPreview() {
    const c0 = cut, seq = ++prevSeq;
    makePreview(c0).toBlob(b => { if (c0 !== cut || seq !== prevSeq || !b) return; if (prevURL) URL.revokeObjectURL(prevURL); prevURL = URL.createObjectURL(b); cb.onCutout && cb.onCutout({ stats: c0.stats, preview: prevURL, edgeColor: c0.edgeColor, bgColor: c0.bgColor, aspect: c0.w / c0.h }); }, 'image/png');
  }
  function runCutout(immediate) {
    clearTimeout(cutTimer);
    const go = () => {
      if (!plate) return; const seq = ++cutSeq;
      status('Cutting out plate…');
      setTimeout(() => {
        if (seq !== cutSeq) return;
        try {
          const old = cut;
          cut = computeCutout(plate.img, P); cut.tex = privatize(cut.raw, P); emitPreview();
          buildPlate(); applyPlacement(); updateRig(); status('');
          // free the previous cutout's canvases (Safari caps total canvas memory and then draws them black)
          if (old) for (const c of [old.raw, old.tex, old.mask]) if (c && c !== cut.raw && c !== cut.tex && c !== cut.mask) { c.width = c.height = 0; }
        }
        catch (e) { status(e.message); }
      }, 16);
    };
    immediate ? go() : (cutTimer = setTimeout(go, 140));
  }

  // ── scene / camera ──
  function contentBox() {
    content.updateMatrixWorld(true);
    const b = new THREE.Box3().setFromObject(content);
    if (b.isEmpty()) b.set(new THREE.Vector3(-50, 0, -50), new THREE.Vector3(50, 100, 50));
    return b;
  }
  function updateRig() {
    const b = contentBox(), c = b.getCenter(new THREE.Vector3()), r = b.getSize(new THREE.Vector3()).length() / 2 || 100;
    const az = (P ? P.light : -30) * Math.PI / 180;
    key.position.set(c.x + Math.sin(az) * r * 2.2, c.y + r * 3, c.z + Math.cos(az) * r * 2.2);
    key.target.position.copy(c);
    fill.position.set(c.x - Math.sin(az) * r * 2, c.y + r, c.z + Math.cos(az) * r * 1.5);
    const sc = key.shadow.camera; sc.left = sc.bottom = -r * 1.6; sc.right = sc.top = r * 1.6; sc.near = 1; sc.far = r * 10; sc.updateProjectionMatrix();
  }
  function applyScene() {
    renderer.toneMappingExposure = P.exposure; floor.material.opacity = P.shadow; updateRig(); applyFloor();
  }
  function applyFloor() {
    const f = FLOORS.find(x => x.id === P.floor);
    if (!f || !f.photo || P.viewMode === 'cad') { surface.visible = false; return; }
    let t = floorTex[f.id];
    if (!t) {
      t = floorTex[f.id] = new THREE.TextureLoader().load(f.photo);
      t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.MirroredRepeatWrapping; t.anisotropy = renderer.capabilities.getMaxAnisotropy();
      t.minFilter = THREE.LinearMipmapLinearFilter; t.generateMipmaps = true;
    }
    // anchored to the base only, so moving / sinking / resizing the plate never shifts or rescales the floor
    baseRoot.updateMatrixWorld(true);
    let b = new THREE.Box3().setFromObject(baseRoot); if (b.isEmpty()) b = contentBox();
    const c = b.getCenter(new THREE.Vector3()), sz = b.getSize(new THREE.Vector3());
    const L = Math.max(600, Math.max(sz.x, sz.y, sz.z) * Math.max(6, P.floorDepth || 12));
    // up/down pushes the far edge (horizon) back or forward; left/right slides the grain sideways
    surface.scale.set(L, L, 1); floorAnchor.x = c.x; floorAnchor.z = c.z; floorAnchor.d = L * 0.8 * (P.floorY || 0) / 100;
    const tile = f.mm * (P.floorScale || 100) / 100;
    t.repeat.set(L / tile, L / (tile * 1.5));
    t.offset.set(-(P.floorX || 0) / 100 * t.repeat.x * 0.5, (P.floorY || 0) / 100 * t.repeat.y * 0.8);
    const m = surface.material, a = fadeTex(P.floorFade ?? 4);
    if (m.alphaMap !== a) { m.alphaMap = a; m.needsUpdate = true; }
    if (m.map !== t) { m.map = t; m.needsUpdate = true; }
    m.roughness = f.rough; m.color.setScalar((P.floorTone ?? 100) / 100);
    surface.visible = true; orientFloor();
  }
  // [azimuth°, elevation°, zoom, target height as fraction of the memento]
  const VIEWS = {
    front: [0, 6, 1, 0.5], hero34: [-28, 12, 1, 0.5], low: [-12, 1.5, 1.04, 0.56], desk: [-18, 32, 0.98, 0.45],
    profile: [-88, 6, 1, 0.5], detail: [-32, 16, 2.1, 0.16], back: [180, 8, 1, 0.5],
    left: [-35, 14, 1, 0.5], right: [35, 14, 1, 0.5], top: [12, 48, 1, 0.5],
  };
  function view(name = 'front') {
    const [az, el2, zm = 1, ty = 0.5] = VIEWS[name] || VIEWS.front, b = contentBox();
    const c = b.getCenter(new THREE.Vector3()), sz = b.getSize(new THREE.Vector3());
    c.y = b.min.y + sz.y * ty;
    const v = camera.fov * Math.PI / 180, hf = 2 * Math.atan(Math.tan(v / 2) * camera.aspect);
    const dist = (Math.max((sz.y / 2) / Math.tan(v / 2), (Math.max(sz.x, sz.z) / 2) / Math.tan(hf / 2)) * 1.12 + sz.z / 2) / zm;
    const a = az * Math.PI / 180, e = el2 * Math.PI / 180;
    const dir = new THREE.Vector3(Math.sin(a) * Math.cos(e), Math.sin(e), Math.cos(a) * Math.cos(e));
    camera.position.copy(c).addScaledVector(dir, dist); camera.lookAt(c);
    lastView = name;
    if (zm <= 1.05 && P) fitToFrame(b, c, dir, dist);
    controls.target.copy(c); controls.update();
  }
  // centre the memento inside the selected output frame with an equal margin on all sides
  let lastView = 'front';
  function fitToFrame(b, c, dir, dist) {
    const vw = size[0], vh = size[1], f = frameRect(P.outW, P.outH), m = Math.min(f.w, f.h) * 0.08;
    const aw = f.w - 2 * m, ah = f.h - 2 * m, fcx = f.x + f.w / 2 - vw / 2, fcy = vh / 2 - (f.y + f.h / 2);
    const pts = []; for (let i = 0; i < 8; i++) pts.push(new THREE.Vector3(i & 1 ? b.max.x : b.min.x, i & 2 ? b.max.y : b.min.y, i & 4 ? b.max.z : b.min.z));
    const right = new THREE.Vector3(), up = new THREE.Vector3(), p = new THREE.Vector3();
    for (let it = 0; it < 6; it++) {
      camera.position.copy(c).addScaledVector(dir, dist); camera.lookAt(c); camera.updateMatrixWorld();
      let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
      for (const q of pts) { p.copy(q).project(camera); const px = p.x * vw / 2, py = p.y * vh / 2; x0 = Math.min(x0, px); x1 = Math.max(x1, px); y0 = Math.min(y0, py); y1 = Math.max(y1, py); }
      const k = 2 * dist * Math.tan(camera.fov * Math.PI / 360) / vh;
      right.setFromMatrixColumn(camera.matrixWorld, 0); up.setFromMatrixColumn(camera.matrixWorld, 1);
      c.addScaledVector(right, ((x0 + x1) / 2 - fcx) * k).addScaledVector(up, ((y0 + y1) / 2 - fcy) * k);
      dist *= Math.max((x1 - x0) / aw, (y1 - y0) / ah);
    }
    camera.position.copy(c).addScaledVector(dir, dist);
  }

  const changed = (prev, keys) => !prev || keys.some(k => prev[k] !== P[k]);
  function download(href, name) { const a = document.createElement('a'); a.href = href; a.download = name; document.body.appendChild(a); a.click(); a.remove(); }

  return {
    update(next) {
      const prev = P; P = { ...next };
      if (base && changed(prev, ['upAxis', 'units', 'baseYaw'])) { normalizeBase(); prev && cb.onBase && cb.onBase(baseInfo, suggestion()); }
      if (prev && changed(prev, ['baseFinish', 'baseColor', 'glitter', 'trimColor'])) applyBaseFinish();
      if (plate && changed(prev, ['bgMode', 'tolerance', 'softShadow', 'edgeShift', 'smoothing', 'cropT', 'cropB', 'cropL', 'cropR'])) runCutout(false);
      else if (cut) {
        const pv = changed(prev, PRIV_KEYS);
        if (pv) { cut.tex = privatize(cut.raw, P); emitPreview(); }
        if (pv || changed(prev, ['dpi', 'thickness', 'bevel'])) buildPlate();
      }
      if (changed(prev, ['bg', 'bgScale', 'bgAuto', 'bgX', 'bgY', 'bgBlur', 'bgFlip', 'viewMode', 'uiTheme'])) drawBg();
      if (prev && changed(prev, ['outW', 'outH'])) setTimeout(() => view(lastView), 0);
      if (changed(prev, ['outW', 'outH', 'wmOn', 'wmLine1', 'wmLine2', 'wmStyle', 'wmTone', 'wmOpacity', 'wmSize'])) updateOverlay();
      applyPlacement(); applyPlateFinish(); applyScene();
    },
    async loadBase(buf, name) {
      status('Loading base…');
      try {
        base = await parseBase(buf, name); base.name = name;
        normalizeBase(); applyPlacement(); updateRig(); view('front');
        cb.onBase && cb.onBase(baseInfo, suggestion()); status('');
      } catch (e) { console.error(e); status(e.message); }
    },
    async loadPlate(src, name) {
      status('Loading plate…');
      let blob = src;
      if (typeof src === 'string') blob = await (await fetch(src)).blob();
      const buf = await blob.arrayBuffer(); const url = URL.createObjectURL(blob);
      const img = await loadImg(url);
      plate = { img, name, dpi: readDpi(buf) };
      cb.onPlateMeta && cb.onPlateMeta({ name, dpi: plate.dpi, px: [img.naturalWidth, img.naturalHeight] });
      runCutout(true);
      setTimeout(() => view('front'), 60);
    },
    async setBgImage(blob) { bgImg = await loadImg(URL.createObjectURL(blob)); drawBg(); },
    suggestion, view,
    // camera relative to the memento's centre and size, so saved views survive base/plate changes
    getView() {
      const b = contentBox(), c = b.getCenter(new THREE.Vector3()), s = b.getSize(new THREE.Vector3()).length() || 1;
      const o = camera.position.clone().sub(c).divideScalar(s), t = controls.target.clone().sub(c).divideScalar(s);
      return { o: o.toArray(), t: t.toArray() };
    },
    setView(v) {
      if (!v || !v.o) return;
      const b = contentBox(), c = b.getCenter(new THREE.Vector3()), s = b.getSize(new THREE.Vector3()).length() || 1;
      controls.target.copy(c).addScaledVector(new THREE.Vector3().fromArray(v.t), s);
      camera.position.copy(c).addScaledVector(new THREE.Vector3().fromArray(v.o), s);
      controls.update();
    },
    snapshot(name = 'memento', onBlob) {
      const vw = size[0], vh = size[1], fmt = P.exportFormat || 'png';
      let W = P.outW, H = P.outH;
      if (!W || !H) { W = Math.round(vw * 2); H = Math.round(vh * 2); }
      const maxS = renderer.getContext().getParameter(renderer.getContext().MAX_RENDERBUFFER_SIZE) || 4096;
      const lim = Math.min(maxS, 8000); if (W > lim || H > lim) { const k = lim / Math.max(W, H); W = Math.round(W * k); H = Math.round(H * k); }
      const f = frameRect(W, H), z = bgZoom();
      const fov0 = camera.fov, asp0 = camera.aspect, pr = renderer.getPixelRatio();
      let bgT = null;
      if (P.bg !== 'transparent' && P.viewMode !== 'cad') {
        const c = document.createElement('canvas'); c.width = W; c.height = H; const g = c.getContext('2d'), k = W / f.w;
        g.translate(-f.x * k, -f.y * k); paintBg(g, vw * k, vh * k, z);
        bgT = new THREE.CanvasTexture(c); bgT.colorSpace = THREE.SRGBColorSpace; scene.background = bgT;
      }
      camera.fov = 2 * Math.atan(Math.tan(fov0 * Math.PI / 360) * f.h / vh) * 180 / Math.PI; camera.aspect = W / H; camera.updateProjectionMatrix();
      renderer.setPixelRatio(1); renderer.setSize(W, H, false);
      drawRefl(); renderer.render(scene, camera);
      const out = document.createElement('canvas'); out.width = W; out.height = H; const og = out.getContext('2d');
      if (fmt === 'jpeg' && P.bg === 'transparent') { og.fillStyle = '#ffffff'; og.fillRect(0, 0, W, H); }
      og.drawImage(renderer.domElement, 0, 0, W, H);
      if (P.wmOn) og.drawImage(makeWatermark(W, H), 0, 0);
      camera.fov = fov0; camera.aspect = asp0; camera.updateProjectionMatrix();
      renderer.setPixelRatio(pr); renderer.setSize(vw, vh, false); drawBg(); if (bgT) bgT.dispose();
      const ext = fmt === 'jpeg' ? 'jpg' : fmt;
      out.toBlob(bl => { if (!bl) return; if (onBlob) onBlob(bl, name + '.' + ext); else download(URL.createObjectURL(bl), name + '.' + ext); }, 'image/' + fmt, 0.92);
    },
    async exportGLB(name = 'memento') {
      status('Exporting GLB…');
      const out = await new GLTFExporter().parseAsync(content, { binary: true });
      download(URL.createObjectURL(new Blob([out], { type: 'model/gltf-binary' })), name + '.glb'); status('');
    },
    dispose() { cancelAnimationFrame(raf); ro.disconnect(); controls.dispose(); renderer.dispose(); renderer.domElement.remove(); },
  };
}
