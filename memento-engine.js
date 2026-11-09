// all libraries ship with the app (vendor/) so it runs fully offline and from the single-file build
const vurl = p => { const r = res(p); return r !== p ? r : new URL('./' + p, import.meta.url).href; };
const { THREE, OrbitControls, GLTFLoader, OBJLoader, STLLoader, GLTFExporter, RoomEnvironment } = await import(vurl('vendor/three-all.js'));

let occtP;
function getOcct() {
  if (!occtP) occtP = (async () => {
    const [wasmBinary] = await Promise.all([
      fetch(vurl('vendor/occt-import-js.wasm')).then(r => { if (!r.ok) throw new Error('Could not load STEP reader (' + r.status + ')'); return r.arrayBuffer(); }),
      window.occtimportjs ? 0 : new Promise((ok, no) => {
        const s = document.createElement('script');
        s.src = vurl('vendor/occt-import-js.js'); s.onload = ok; s.onerror = () => no(new Error('Could not load STEP reader'));
        document.head.appendChild(s);
      }),
    ]);
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
  ].map(([n, name, mm, fx, fy, lum, warm, busy]) => ({ id: 'p' + n, name, mm, fx, fy, lum, warm, busy, photo: res(`assets/studio/backdrops/bd_${n}.jpg`), thumb: res(`assets/studio/backdrops/th_${n}.jpg`) })),
];
// tabletop / floor surfaces the memento stands on: mm = real-world width of one photo tile, rough = surface sheen
export const FLOORS = [
  { id: 'none', name: 'No floor' },
  ...[
    ['oak', 'Light oak', '22', 700, 0.6], ['walnut', 'Walnut', '23', 700, 0.45], ['planks', 'Barn planks', '24', 900, 0.75],
    ['carrara', 'Carrara marble', '25', 800, 0.18], ['greymarble', 'Grey marble', '26', 800, 0.2], ['plaster', 'White stone', '27', 700, 0.85],
    ['linen', 'Linen cloth', '28', 450, 0.95], ['cream', 'Cream cloth', '29', 450, 0.95], ['charcoal', 'Charcoal cloth', '31', 450, 0.95],
  ].map(([id, name, n, mm, rough]) => ({ id, name, mm, rough, photo: res(`assets/studio/backdrops/bd_${n}.jpg`), thumb: res(`assets/studio/backdrops/th_${n}.jpg`) })),
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
// parsed STEP meshes are cached by file content, so a base is only read with the (large) STEP reader once per device
export function meshKey(buf, name) { const u = new Uint8Array(buf), n = u.length, st = Math.max(1, Math.floor(n / 8192)); let h = 2166136261; for (let i = 0; i < n; i += st) { h ^= u[i]; h = Math.imul(h, 16777619); } return 'mesh1:' + name + ':' + n + ':' + (h >>> 0).toString(36); }
export const lib = {
  async list() { const all = (await tx('bases', 'readonly', s => s.getAll())) || []; return all.map(({ id, name, size, added, gid }) => ({ id, name, size, added, gid: gid || '' })).sort((a, b) => a.added - b.added); },
  async add(file, o = {}) { const id = o.id || 'b' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5); await tx('bases', 'readwrite', s => s.put({ id, name: o.name || file.name, size: file.size, added: o.added || Date.now(), blob: file, gid: o.gid || '' })); return id; },
  async get(id) { return tx('bases', 'readonly', s => s.get(id)); },
  async patch(id, f) { const r = await this.get(id); if (r) await tx('bases', 'readwrite', s => s.put({ ...r, ...f })); },
  async remove(id) {
    const r = await this.get(id).catch(() => null);
    if (r && r.blob) { try { const k = meshKey(await r.blob.arrayBuffer(), r.name); await tx('kv', 'readwrite', s => s.delete(k)); } catch (e) {} }
    return tx('bases', 'readwrite', s => s.delete(id));
  },
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

// flood the background in from the image border; returns the plate mask (1 = plate)
function floodMask(d, w, h, bgc, tol, soft) {
  const N = w * h;
  const tol2 = tol * tol, bgL = bgc[0] + bgc[1] + bgc[2] + 1;
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
    for (const j of nb) if (j >= 0 && !bg[j] && (dist2(j) < tol2 || (soft && shadowOK(j, i)))) { bg[j] = 1; q[qt++] = j; }
  }
  let m = new Uint8Array(N); for (let i = 0; i < N; i++) m[i] = bg[i] ? 0 : 1;
  m = morph(morph(m, w, h, 1, false), w, h, 1, true);
  return m;
}
// backing sheet outline: own tolerance / trim / smoothing, then grown outward by the offset (round corners)
// chamfer distance (px) from every pixel to the nearest set pixel
function distMap(m, W, H) {
  const D = new Float32Array(W * H), R2 = Math.SQRT2;
  for (let i = 0; i < W * H; i++) D[i] = m[i] ? 0 : 1e9;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const i = y * W + x; let v = D[i]; if (x > 0) v = Math.min(v, D[i - 1] + 1); if (y > 0) { v = Math.min(v, D[i - W] + 1); if (x > 0) v = Math.min(v, D[i - W - 1] + R2); if (x < W - 1) v = Math.min(v, D[i - W + 1] + R2); } D[i] = v; }
  for (let y = H - 1; y >= 0; y--) for (let x = W - 1; x >= 0; x--) { const i = y * W + x; let v = D[i]; if (x < W - 1) v = Math.min(v, D[i + 1] + 1); if (y < H - 1) { v = Math.min(v, D[i + W] + 1); if (x < W - 1) v = Math.min(v, D[i + W + 1] + R2); if (x > 0) v = Math.min(v, D[i + W - 1] + R2); } D[i] = v; }
  return D;
}
function grow(m, W, H, r) { const D = distMap(m, W, H), o = new Uint8Array(W * H); for (let i = 0; i < W * H; i++) o[i] = D[i] <= r ? 1 : 0; return o; }
function shrink(m, W, H, r) { const inv = new Uint8Array(W * H); for (let i = 0; i < W * H; i++) inv[i] = m[i] ? 0 : 1; const g = grow(inv, W, H, r); for (let i = 0; i < W * H; i++) g[i] = g[i] ? 0 : 1; return g; }
// backing sheet outline: own tolerance / trim / smoothing, grown outward by the offset (round corners);
// optional foot: a straight-sided bottom as wide as the base, blended into the outline with a rounded join
function computeSheet(c, p, foot) {
  const { w, h, d } = c, bgc = c.bgColor, s = 25.4 / (p.dpi || 300) / c.k;
  let m = floodMask(d, w, h, bgc, p.sheetTol ?? 45, p.softShadow);
  const sh = Math.round(p.sheetShift || 0);
  if (sh > 0) m = morph(m, w, h, sh, false); else if (sh < 0) m = morph(m, w, h, -sh, true);
  const L = largest(m, w, h); if (L.count < w * h * 0.01) return null;
  m = fillHoles(L.mask, w, h);
  if (foot && ![foot.x0, foot.x1, foot.h, foot.fillet, foot.shoulder || 0].every(Number.isFinite)) foot = null;
  if (foot) { foot = { ...foot, x0: Math.max(-w * 1.5, foot.x0), x1: Math.min(w * 2.5, foot.x1) }; if (foot.x1 - foot.x0 < 4) foot = null; }
  // work on a coarser grid when the padded canvas would be big (keeps every rebuild well under ~100 ms)
  const r0 = Math.max(0, (p.sheetOffset ?? 0.5) * 25.4 / s), fr0 = foot ? Math.max(0, foot.fillet) : 0;
  const pad0 = Math.ceil(r0 + fr0) + 2, estW = foot ? Math.max(w + 2 * pad0, foot.x1 - foot.x0 + 2 * pad0) : w + 2 * pad0;
  const q = Math.max(1, Math.ceil(Math.sqrt(estW * (h + 2 * pad0) / 9e5)));
  let mw = w, mh = h;
  if (q > 1) {
    mw = Math.ceil(w / q); mh = Math.ceil(h / q); const sm2 = new Uint8Array(mw * mh);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (m[y * w + x]) sm2[((y / q) | 0) * mw + ((x / q) | 0)] = 1;
    m = sm2;
    if (foot) foot = { x0: foot.x0 / q, x1: foot.x1 / q, h: foot.h / q, fillet: foot.fillet / q, shoulder: (foot.shoulder || 0) / q };
  }
  const r = r0 / q, fr = foot ? Math.max(0, foot.fillet) : 0;
  let padX = Math.ceil(r + fr) + 2; const padY = padX;
  if (foot) padX = Math.max(padX, Math.ceil(-foot.x0 + fr) + 2, Math.ceil(foot.x1 - mw + fr) + 2);
  const W = mw + 2 * padX, H = mh + 2 * padY, base = new Uint8Array(W * H);
  for (let y = 0; y < mh; y++) for (let x = 0; x < mw; x++) if (m[y * mw + x]) base[(y + padY) * W + x + padX] = 1;
  let om = grow(base, W, H, r);
  if (foot) {
    let yb = -1; for (let y = H - 1; y >= 0 && yb < 0; y--) for (let x = 0; x < W; x++) if (om[y * W + x]) { yb = y; break; }
    if (yb >= 0) {
      const xa = Math.max(0, Math.round(foot.x0 + padX)), xb = Math.min(W - 1, Math.round(foot.x1 + padX)), ya = Math.max(0, Math.round(yb - foot.h));
      // straight foot with rounded top (shoulder) corners
      const rr = Math.max(0, Math.min(foot.shoulder || 0, (xb - xa) / 2, yb - ya));
      const fill = () => { for (let y = ya; y <= yb; y++) for (let x = xa; x <= xb; x++) {
        if (rr >= 1 && y < ya + rr) { const cx = x < xa + rr ? xa + rr : x > xb - rr ? xb - rr : x; if (cx !== x && (x - cx) ** 2 + (y - ya - rr) ** 2 > rr * rr) continue; }
        om[y * W + x] = 1; } };
      fill();
      if (fr >= 1) { om = shrink(grow(om, W, H, fr), W, H, fr); fill(); }
    }
  }
  const sm = Math.round(((p.sheetSmooth ?? 2) + Math.min(6, r0 / 8)) / q);
  let tp = trace(om, W, H); if (tp.length > 6000) { const st = Math.ceil(tp.length / 6000); tp = tp.filter((_, i) => i % st === 0); }
  return simplify(smooth(tp, sm), 0.6 / q).map(([x, y]) => [(x - padX + 0.5) * q - 0.5, (y - padY + 0.5) * q - 0.5]);
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
  let m = floodMask(d, w, h, bgc, p.tolerance, p.softShadow);
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
  return { w, h, k, pts, d, edgeColor, mask: mc, raw: tc, tex: tc, bgColor: bgc, stats, crop: [sx / iw, sy / ih, sw / iw, sh / ih], iw, ih };
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
const goldMat = m => { if (!m) return false; if (TRIM_RE.test(m.name || '') || (m.metalness || 0) > 0.5) return true; if (!m.color) return false; const h = {}; m.color.getHSL(h); return h.h > 0.08 && h.h < 0.17 && h.s > 0.35 && h.l > 0.3; };
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
  // turntable: camera, lights and shadow stay fixed; horizontal drag spins the memento about its own centre
  let spin = 0, pivot = null;
  const lockAz = () => { const a = controls.getAzimuthalAngle(); controls.minAzimuthAngle = controls.maxAzimuthAngle = a; };
  const freeAz = () => { controls.minAzimuthAngle = -Infinity; controls.maxAzimuthAngle = Infinity; };
  function setSpin(a) {
    if (!pivot) {
      content.rotation.y = 0; content.position.set(0, 0, 0); content.updateMatrixWorld(true);
      let b = new THREE.Box3().setFromObject(baseRoot); if (b.isEmpty()) b = new THREE.Box3().setFromObject(content);
      pivot = b.isEmpty() ? new THREE.Vector3() : b.getCenter(new THREE.Vector3());
    }
    spin = a; const co = Math.cos(a), si = Math.sin(a);
    content.rotation.y = a;
    content.position.set(pivot.x - (pivot.x * co + pivot.z * si), 0, pivot.z - (-pivot.x * si + pivot.z * co));
    content.updateMatrixWorld(true);
  }
  {
    const el = renderer.domElement, pts = new Map(); let lastX = 0;
    el.addEventListener('pointerdown', e => { pts.set(e.pointerId, e.clientX); if (pts.size === 1) lastX = e.clientX; });
    el.addEventListener('pointermove', e => {
      if (!pts.has(e.pointerId)) return; pts.set(e.pointerId, e.clientX);
      if (pts.size !== 1 || (e.pointerType === 'mouse' && (e.buttons !== 1 || e.shiftKey || e.ctrlKey || e.metaKey))) { lastX = e.clientX; return; }
      const dx = e.clientX - lastX; lastX = e.clientX;
      if (dx) setSpin(spin + dx * 2 * Math.PI / (el.clientHeight || 600));
    });
    const up = e => { pts.delete(e.pointerId); if (pts.size === 1) lastX = [...pts.values()][0]; };
    ['pointerup', 'pointercancel', 'pointerleave'].forEach(t => el.addEventListener(t, up));
  }

  const bgCanvas = document.createElement('canvas');
  const bgTex = new THREE.CanvasTexture(bgCanvas); bgTex.colorSpace = THREE.SRGBColorSpace;
  let bgImg = null;

  let P = null, base = null, baseInfo = null, plate = null, cut = null, plateMesh = null, cutTimer = 0, cutSeq = 0;
  let sheetMesh = null, sheetDy = 0, sheetTimer = 0, sheetCache = null, plateFrame = null, sheetMats = null;
  let baseMat = null, woodMaps = null, woodGlitter = -1;
  const photoCache = {}; let bgInfo = null, drawnZ = 1, bgRedrawT = 0;
  let size = [1, 1], prevURL = null, prevSeq = 0, grid = null, gridDark = null;

  function bgZoom() {
    let a = 1;
    if (P && P.bgAuto && bgInfo && bgInfo.coverW) {
      const dist = camera.position.distanceTo(controls.target);
      const ppm = bgCanvas.height / (2 * dist * Math.tan(camera.fov * Math.PI / 360));
      a = Math.min(6, Math.max(1, (bgInfo.mm * ppm) / bgInfo.coverW));
    }
    // auto fit first (never below full cover), then the user's Size on top so every step is visible
    return Math.min(16, a * Math.max(100, P ? P.bgScale : 100) / 100);
  }
  // full photo loads in the background; the tiny strip thumbnail (already cached) stands in instantly so the pick shows at once
  function photoFor(b) {
    if (b.id === 'custom') return bgImg;
    let c = photoCache[b.id];
    if (!c || (c.failed && Date.now() - c.failed > 4000)) {
      c = photoCache[b.id] = { img: null, th: (c && c.th) || null };
      const redraw = () => { if (P && P.bg === b.id) drawBg(); };
      if (b.thumb && !c.th) loadImg(b.thumb).then(i => { c.th = i; if (!c.img) redraw(); }).catch(() => {});
      c.p = loadImg(b.photo).then(i => { c.img = i; c.failed = 0; redraw(); }, () => { c.failed = Date.now(); });
    }
    return c.img || c.th;
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
    if (!img && (b.photo || b.id === 'custom') && scene.background === bgTex) return; // keep the current backdrop until the new one arrives
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
    const fit = (f1, maxW) => { g.font = `800 ${f1}px Archivo, system-ui, sans-serif`; const a = l1 ? g.measureText(l1.toUpperCase()).width * 1.06 : 0; g.font = `400 ${f1 * 0.5}px Archivo, system-ui, sans-serif`; const b = l2 ? g.measureText(l2).width * 1.03 : 0; const w = Math.max(a, b); return w > maxW ? f1 * maxW / w : f1; };
    if (P.wmStyle === 'corner') {
      const m = base * 0.045, f1 = fit(base * 0.045, W * 0.6);
      block(W - m, H - m - f1 * 0.72, f1, 'right');
    } else if (P.wmStyle === 'center') {
      const f1 = fit(base * 0.1, W * 0.85);
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
      const ck = meshKey(buf, name);
      let ms = await lib.getKV(ck).catch(() => null);
      if (!Array.isArray(ms) || !ms.length) {
        status('Reading STEP geometry… (first time only)');
        const occt = await getOcct();
        const prm = { linearUnit: 'millimeter', linearDeflectionType: 'bounding_box_ratio', linearDeflection: 0.0006, angularDeflection: 0.12 };
        const r = ext.startsWith('ig') ? occt.ReadIgesFile(new Uint8Array(buf), prm) : occt.ReadStepFile(new Uint8Array(buf), prm);
        if (!r.success || !r.meshes.length) throw new Error('STEP file could not be read');
        const walk = n => { if (!n) return; (n.meshes || []).forEach(i => { const m = r.meshes[i]; if (m && !m.name && n.name) m.name = n.name; }); (n.children || []).forEach(walk); };
        walk(r.root);
        ms = r.meshes.map(m => ({ name: m.name || '', color: m.color || null, pos: Float32Array.from(m.attributes.position.array), nrm: m.attributes.normal ? Float32Array.from(m.attributes.normal.array) : null, idx: Uint32Array.from(m.index.array) }));
        lib.setKV(ck, ms).catch(() => {});
      }
      const g = new THREE.Group();
      ms.forEach((m, i) => {
        const geo = new THREE.BufferGeometry();
        geo.setAttribute('position', new THREE.BufferAttribute(m.pos, 3));
        if (m.nrm) geo.setAttribute('normal', new THREE.BufferAttribute(m.nrm, 3));
        geo.setIndex(new THREE.BufferAttribute(m.idx, 1));
        if (!m.nrm) geo.computeVertexNormals();
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
    // trim (poles, beading, chain) = named trim, gold/metal original colour, or a small part next to the big body slabs
    baseRoot.updateMatrixWorld(true);
    const _fa = bx => { const s = bx.getSize(new THREE.Vector3()); return Math.max(s.x * s.y, s.x * s.z, s.y * s.z); };
    const _all = _fa(new THREE.Box3().setFromObject(baseRoot)) || 1;
    let _nm = 0; baseRoot.traverse(o => { if (o.isMesh) _nm++; });
    baseRoot.traverse(o => { if (o.isMesh) {
      o.castShadow = o.receiveShadow = true; if (!o.userData.orig) o.userData.orig = o.material;
      if (o.userData.trim == null) { let t = false; for (let p = o; p && p !== baseRoot; p = p.parent) if (TRIM_RE.test(p.name || '')) t = true; [].concat(o.material).forEach(m => { if (TRIM_RE.test(m.name || '')) t = true; }); o.userData.trim = t; }
      if (o.userData.trim === false && Array.isArray(o.userData.orig) && o.userData.orig.some(goldMat) && !o.userData.orig.every(goldMat)) o.userData.mix = true;
      if (o.userData.trim === false && !o.userData.mix && !o.userData.trimChk && _nm > 1) { o.userData.trimChk = true; if ([].concat(o.userData.orig).some(goldMat) || _fa(new THREE.Box3().setFromObject(o)) < _all * 0.18) o.userData.trim = true; }
    } });
    applyBaseFinish();
    analyzeBase();
    buildSticker();
    buildName();
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
    baseInfo = { size: { x: sz.x, y: sz.y, z: sz.z }, top: T, refZ, slot, trim: body.length ? trimCount : 0, band: findBand(), plaque: findPlaque() };
  }
  // sticker band: a thin trim strip wrapping most of the base (the gold band between the slabs), in baseRoot space
  function findBand() {
    if (hasBeading()) return null;
    baseRoot.updateMatrixWorld(true);
    const inv = new THREE.Matrix4().copy(baseRoot.matrixWorld).invert(), mm = new THREE.Matrix4();
    const boxOf = o => { if (!o.geometry.boundingBox) o.geometry.computeBoundingBox(); return o.geometry.boundingBox.clone().applyMatrix4(mm.multiplyMatrices(inv, o.matrixWorld)); };
    const all = new THREE.Box3(); const parts = [];
    baseRoot.traverse(o => { if (o.isMesh) { const b = boxOf(o); all.union(b); parts.push([o, b]); } });
    if (!parts.length) return null;
    const S = all.getSize(new THREE.Vector3()); let best = null, bs = 0;
    parts.forEach(([o, b]) => {
      if (!o.userData.trim) return;
      const s = b.getSize(new THREE.Vector3());
      if (s.x < S.x * 0.45 || s.z < S.z * 0.45 || s.y > S.y * 0.35 || s.y < 1.5 || b.min.y < all.min.y + 0.5) return;
      const sc = s.x * s.z; if (sc > bs) { bs = sc; best = b; }
    });
    return best ? { min: best.min.toArray(), max: best.max.toArray(), h: best.max.y - best.min.y } : null;
  }
  // gold beading bases (bead strip between poles) carry no design sticker: named bead/pole parts, tall thin trim posts, or a "_b_" token in the file name
  function hasBeading() {
    if (base && /(^|[_\-\s])b([_\-\s.]|$)/i.test(base.name || '')) return true;
    let hit = false; baseRoot.updateMatrixWorld(true);
    baseRoot.traverse(o => {
      if (hit || !o.isMesh) return;
      for (let p = o; p && p !== baseRoot; p = p.parent) if (/beed|bead|pole|pillar|post/i.test(p.name || '')) hit = true;
      [].concat(o.userData.orig || o.material).forEach(m => { if (m && /beed|bead/i.test(m.name || '')) hit = true; });
      if (!hit && o.userData.trim) { const s = new THREE.Box3().setFromObject(o).getSize(new THREE.Vector3()); if (s.y > 10 && s.y > 2.5 * Math.max(s.x, s.z)) hit = true; }
    });
    return hit;
  }
  let stickerGrp = null, stickerTex = null, stickerSrc = null, stickerDef = null, stickerMat = null;
  const loadAsset = p => loadImg(vurl(p)).catch(() => loadImg(vurl(p) + (vurl(p).includes('?') ? '&' : '?') + 'r=' + Date.now())).catch(() => null);
  async function defaultSticker() { if (!stickerDef) stickerDef = loadAsset('assets/studio/sticker-fleur.jpg').then(i => (i || (stickerDef = null), i)); return stickerDef; }
  function stickerTexture(img) {
    if (stickerTex && stickerSrc === img) return stickerTex;
    if (stickerTex) stickerTex.dispose();
    // power-of-two canvas on a white ground: NPOT repeat textures render black on some GPUs and in GLB viewers
    const p2 = v => Math.min(4096, 2 ** Math.round(Math.log2(Math.max(2, v)))), k = Math.min(1, 4096 / img.naturalWidth), c = document.createElement('canvas');
    c.width = p2(img.naturalWidth * k); c.height = p2(img.naturalHeight * k);
    const g = c.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height); g.drawImage(img, 0, 0, c.width, c.height);
    stickerTex = new THREE.CanvasTexture(c); stickerTex.colorSpace = THREE.SRGBColorSpace; stickerTex.wrapS = THREE.RepeatWrapping;
    stickerTex.anisotropy = renderer.capabilities.getMaxAnisotropy(); stickerTex.userData.aspect = img.naturalWidth / img.naturalHeight;
    stickerSrc = img; return stickerTex;
  }
  // exports wait for sticker/name rebuilds in flight, so a shot never catches the bare (dark) panel underneath
  const pendingB = new Set();
  const track = fn => function () { const p = fn.apply(this, arguments); pendingB.add(p); p.catch(() => {}).finally(() => pendingB.delete(p)); return p; };
  async function settled() { for (let i = 0; i < 20 && pendingB.size; i++) await Promise.allSettled([...pendingB]); }
  // every texture image must be fully decoded before GLB export, or the exporter bakes a black image
  async function texReady(root, ms = 10000) {
    const texs = new Set(); root.traverse(o => { (o.material ? (Array.isArray(o.material) ? o.material : [o.material]) : []).forEach(m => { for (const k in m) { const v = m[k]; if (v && v.isTexture) texs.add(v); } }); });
    const ok = t => { const im = t.image; if (!im) return false; if (typeof HTMLImageElement !== 'undefined' && im instanceof HTMLImageElement) return im.complete && im.naturalWidth > 0; return (im.width || 0) > 0 && (im.height || 0) > 0; };
    const dec = [...texs].map(t => t.image && t.image.decode ? t.image.decode().catch(() => {}) : null).filter(Boolean);
    await Promise.race([Promise.allSettled(dec), new Promise(r => setTimeout(r, ms))]);
    const t0 = performance.now(); while (performance.now() - t0 < ms && ![...texs].every(ok)) await new Promise(r => setTimeout(r, 100));
    await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
    return [...texs].filter(t => !ok(t)).length;
  }
  async function glbSafe() {
    await settled(); const bad = await texReady(content); if (bad) await new Promise(r => setTimeout(r, 1500));
    // copy each texture image to its own canvas so a shared/reused canvas can't change mid-export
    const swaps = []; const texs = new Set(); content.traverse(o => { (o.material ? (Array.isArray(o.material) ? o.material : [o.material]) : []).forEach(m => { for (const k in m) { const v = m[k]; if (v && v.isTexture) texs.add(v); } }); });
    texs.forEach(t => { const im = t.image; if (!im || t.isDataTexture || t.isCompressedTexture || !(im.width > 0)) return; try { const w = im.naturalWidth || im.width, hh = im.naturalHeight || im.height, c = document.createElement('canvas'); c.width = w; c.height = hh; c.getContext('2d').drawImage(im, 0, 0, w, hh); swaps.push([t, im]); t.image = c; } catch (e) {} });
    try { return await new GLTFExporter().parseAsync(content, { binary: true, maxTextureSize: Math.min(4096, renderer.capabilities.maxTextureSize || 4096) }); }
    finally { swaps.forEach(([t, im]) => { t.image = im; }); }
  }
  let stickerCustom = null, stickerSeq = 0;
  const buildSticker = track(buildStickerRaw);
  async function buildStickerRaw() {
    const seq = ++stickerSeq;
    const img = stickerCustom || (P && P.stickerOn && baseInfo && baseInfo.band ? await defaultSticker() : null);
    if (seq !== stickerSeq) return;
    if (stickerGrp) { stickerGrp.parent && stickerGrp.parent.remove(stickerGrp); stickerGrp.children.forEach(m => m.geometry.dispose()); stickerGrp = null; }
    const band = baseInfo && baseInfo.band;
    if (!P || !P.stickerOn || !band || !img) return;
    const tex = stickerTexture(img), A = tex.userData.aspect || 50;
    if (!stickerMat) stickerMat = new THREE.MeshPhysicalMaterial({ name: 'BaseSticker', roughness: 0.32, metalness: 0, clearcoat: 0.6, clearcoatRoughness: 0.15, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
    stickerMat.map = tex; stickerMat.needsUpdate = true;
    const [x0, y0, z0] = band.min, [x1, y1, z1] = band.max, h = (y1 - y0) * (P.stickerFill ?? 100) / 100, cy = (y0 + y1) / 2, e = 0.12;
    // back carries only a 30 mm piece at each end; the middle stays bare
    const BL = Math.min(30, (x1 - x0) / 2), bx = [x0 + BL / 2, x1 - BL / 2];
    const sides = P.stickerSides === 'front' ? [['f']] : [['f'], ['b', bx[0]], ['b', bx[1]], ['l'], ['r']];
    stickerGrp = new THREE.Group(); stickerGrp.name = 'BaseSticker';
    sides.forEach(([s, bxc]) => {
      const len = s === 'b' ? BL : s === 'f' ? x1 - x0 : z1 - z0, geo = new THREE.PlaneGeometry(len, h);
      const uv = geo.attributes.uv, rep = len / (h * A); for (let i = 0; i < uv.count; i++) uv.setX(i, uv.getX(i) * rep);
      const m = new THREE.Mesh(geo, stickerMat); m.name = 'Sticker_' + s; m.receiveShadow = true;
      if (s === 'f') m.position.set((x0 + x1) / 2, cy, z1 + e);
      if (s === 'b') { m.position.set(bxc, cy, z0 - e); m.rotation.y = Math.PI; }
      if (s === 'r') { m.position.set(x1 + e, cy, (z0 + z1) / 2); m.rotation.y = Math.PI / 2; }
      if (s === 'l') { m.position.set(x0 - e, cy, (z0 + z1) / 2); m.rotation.y = -Math.PI / 2; }
      stickerGrp.add(m);
    });
    baseRoot.add(stickerGrp);
  }
  // name plaque: a flat trim panel on the front of the base, wide and tall enough to carry a name
  function findPlaque() {
    baseRoot.updateMatrixWorld(true);
    const inv = new THREE.Matrix4().copy(baseRoot.matrixWorld).invert(), mm = new THREE.Matrix4();
    const all = new THREE.Box3(), parts = [];
    baseRoot.traverse(o => { if (o.isMesh) { if (!o.geometry.boundingBox) o.geometry.computeBoundingBox(); const b = o.geometry.boundingBox.clone().applyMatrix4(mm.multiplyMatrices(inv, o.matrixWorld)); all.union(b); parts.push([o, b]); } });
    if (!parts.length) return null;
    const S = all.getSize(new THREE.Vector3()), C = all.getCenter(new THREE.Vector3()); let best = null, bs = 0;
    parts.forEach(([o, b]) => {
      if (!o.userData.trim) return;
      const s = b.getSize(new THREE.Vector3()), c = b.getCenter(new THREE.Vector3());
      if (s.z > S.z * 0.25 || s.x < S.x * 0.3 || s.y < 4 || s.y < s.z * 2 || c.z < C.z) return;
      const sc = s.x * s.y; if (sc > bs) { bs = sc; best = b; }
    });
    return best ? { min: best.min.toArray(), max: best.max.toArray(), w: best.max.x - best.min.x, h: best.max.y - best.min.y } : null;
  }
  const NAME_FONTS = { serif: '"Noto Serif", "Noto Serif Telugu", Georgia, serif', sans: '"Noto Sans", "Noto Sans Telugu", system-ui, sans-serif', script: '"Great Vibes", "Noto Serif Telugu", cursive' };
  const NAME_INKS = { maroon: '#4a0f17', black: '#141414', red: '#a3121c', white: '#fbfaf6', blue: '#14245e' };
  let nameMesh = null, nameSeq = 0, nameDef = null, nameCustom = null;
  const buildName = track(buildNameRaw);
  async function buildNameRaw() {
    const seq = ++nameSeq, pq = baseInfo && baseInfo.plaque, txt = (P && P.nameText || '').trim();
    const on = P && P.nameOn !== false;
    const bgI = on && pq ? (nameCustom || await (nameDef || (nameDef = loadAsset('assets/studio/sticker-name.jpg').then(i => (i || (nameDef = null), i))))) : null;
    const lines = txt ? txt.split(/\n/).map(l => l.trim()).filter(Boolean).slice(0, 3) : [];
    const fam = NAME_FONTS[P && P.nameFont] || NAME_FONTS.serif, wt = P && P.nameFont === 'script' ? 400 : 700;
    if (lines.length && document.fonts) { try { await Promise.race([document.fonts.load(`${wt} 40px ${fam}`, txt), new Promise(r => setTimeout(r, 2500))]); } catch (e) {} }
    if (seq !== nameSeq) return;
    if (nameMesh) { nameMesh.parent && nameMesh.parent.remove(nameMesh); nameMesh.geometry.dispose(); nameMesh.material.map && nameMesh.material.map.dispose(); nameMesh.material.dispose(); nameMesh = null; }
    if (!pq || !on || (!lines.length && !bgI)) return;
    const fill = (P.nameSize ?? 100) / 100, w = pq.w - 0.2, h = pq.h - 0.2, k = Math.min(24, 2048 / w), W = Math.round(w * k), H = Math.round(h * k);
    // power-of-two texture (GLB viewers show NPOT textures black) on a white ground (transparent PNG stickers turned black)
    const p2 = v => Math.min(4096, 2 ** Math.ceil(Math.log2(Math.max(2, v))));
    const c = document.createElement('canvas'); c.width = p2(W); c.height = p2(H); const g = c.getContext('2d'); g.scale(c.width / W, c.height / H);
    if (bgI) { g.fillStyle = '#ffffff'; g.fillRect(0, 0, W, H); g.drawImage(bgI, 0, 0, W, H); }
    // writing area: the cream panel inside the printed border and corner florals
    const ax = bgI ? W * 0.15 : W * 0.04, ay = bgI ? H * 0.18 : H * 0.08, AW = W - ax * 2, AH = H - ay * 2;
    g.fillStyle = NAME_INKS[P.nameInk] || NAME_INKS.maroon; g.textAlign = 'center'; g.textBaseline = 'middle';
    const n = lines.length, lh = AH / Math.max(1, n); let f = lh * 0.78;
    if (n) {
      g.font = `${wt} ${f}px ${fam}`;
      const widest = Math.max(...lines.map(l => g.measureText(l).width)); if (widest > AW) f *= AW / widest;
      f *= fill; g.font = `${wt} ${f}px ${fam}`;
      const lead = f * 1.12, y0 = H / 2 - lead * (n - 1) / 2;
      lines.forEach((l, i) => g.fillText(l, W / 2, y0 + i * lead));
    }
    const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
    const mat = new THREE.MeshPhysicalMaterial({ name: 'NameSticker', map: tex, transparent: !bgI, alphaTest: bgI ? 0 : 0.04, roughness: 0.4, metalness: 0, clearcoat: 0.4, polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3 });
    nameMesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat); nameMesh.name = 'NameSticker';
    nameMesh.position.set((pq.min[0] + pq.max[0]) / 2, (pq.min[1] + pq.max[1]) / 2, pq.max[2] + 0.15);
    baseRoot.add(nameMesh);
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
    let any = false; baseRoot.traverse(o => { if (o.isMesh && o.userData.trim) { o.material = trimMat; any = true; } else if (o.isMesh && o.userData.mix && Array.isArray(o.material)) { o.material = o.material.map((m, i) => goldMat(o.userData.orig[i]) ? trimMat : m); any = true; } });
    return any;
  }
  function applyBaseFinish() {
    const look = BASE_LOOKS[P.baseFinish];
    let hasBody = false; baseRoot.traverse(o => { if (o.isMesh && !o.userData.trim) hasBody = true; if (o.isMesh && o.userData.mix) hasBody = true; });
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
    baseRoot.traverse(o => { if (o.isMesh && !isTrim(o)) { boxUV(o); o.material = o.userData.mix ? o.userData.orig.map(() => baseMat) : baseMat; } });
    if (hasBody) applyTrim();
  }

  // ── plate ──
  function buildPlate() {
    if (plateMesh) { plateRoot.remove(plateMesh); plateMesh.geometry.dispose(); [].concat(plateMesh.material).forEach(m => { if (m.map && m.map !== mdfTex) m.map.dispose(); m.dispose(); }); plateMesh = null; }
    if (!cut || cut.pts.length < 3) { plateFrame = null; buildSheet(); return; }
    const s = 25.4 / (P.dpi || 300) / cut.k;
    const W = cut.w * s, H = cut.h * s;
    const v = cut.pts.map(([x, y]) => new THREE.Vector2((x + 0.5) * s, (cut.h - (y + 0.5)) * s));
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    v.forEach(p => { minX = Math.min(minX, p.x); maxX = Math.max(maxX, p.x); minY = Math.min(minY, p.y); maxY = Math.max(maxY, p.y); });
    const bev = Math.min(P.bevel, P.thickness * 0.4), depth = Math.max(0.2, P.thickness - 2 * bev);
    const uvGen = {
      generateTopUV: (g, vt, a, b, c) => [a, b, c].map(i => new THREE.Vector2(vt[i * 3] / W, vt[i * 3 + 1] / H)),
      // real-size UVs (1 unit = 1 mm) so the MDF fibre texture wraps evenly around the cut edge
      generateSideWallUV: (g, vt, a, b, c, d) => { const X = i => vt[i * 3], Y = i => vt[i * 3 + 1], Z = i => vt[i * 3 + 2], ux = Math.abs(Y(a) - Y(b)) < Math.abs(X(a) - X(b)); return [a, b, c, d].map(i => new THREE.Vector2(ux ? X(i) : Y(i), Z(i))); },
    };
    const geo = new THREE.ExtrudeGeometry(new THREE.Shape(v), {
      depth, curveSegments: 1, steps: 1, UVGenerator: uvGen,
      bevelEnabled: bev > 0.02, bevelThickness: bev, bevelSize: bev, bevelOffset: -bev, bevelSegments: 3,
    });
    const g0 = geo.groups.find(g => g.materialIndex === 0), g1 = geo.groups.find(g => g.materialIndex === 1);
    geo.clearGroups(); const half = g0.count / 2;
    geo.addGroup(g0.start, half, 2); geo.addGroup(g0.start + half, half, 0); if (g1) geo.addGroup(g1.start, g1.count, 1);
    geo.translate(-(minX + maxX) / 2, -minY, -depth / 2);
    plateFrame = { s, cx: (minX + maxX) / 2, minY, back: -(depth / 2 + (bev > 0.02 ? bev : 0)) };
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
    applyPlateFinish(); queueSheet();
    cb.onPlate && cb.onPlate({ w: maxX - minX, h: maxY - minY });
  }
  let mdfTex = null;
  // MDF cut edge: dense fibre speckle with short random fibres, dark grey
  function mdfEdge() {
    if (mdfTex) return mdfTex;
    const S = 512, c = document.createElement('canvas'); c.width = c.height = S; const g = c.getContext('2d'), d = g.createImageData(S, S);
    let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    for (let i = 0; i < S * S; i++) { const n = (rnd() - 0.5); const v = 1 + n * 0.55; d.data[i * 4] = 64 * v; d.data[i * 4 + 1] = 64 * v; d.data[i * 4 + 2] = 66 * v; d.data[i * 4 + 3] = 255; }
    g.putImageData(d, 0, 0);
    for (let k = 0; k < 5200; k++) {
      const x = rnd() * S, y = rnd() * S, a = rnd() * Math.PI, l = 2 + rnd() * 7, dark = rnd() < 0.6;
      g.strokeStyle = dark ? 'rgba(22,22,24,' + (0.25 + rnd() * 0.4) + ')' : 'rgba(120,120,124,' + (0.2 + rnd() * 0.35) + ')';
      g.lineWidth = 0.6 + rnd() * 0.9; g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l); g.stroke();
    }
    for (let k = 0; k < 900; k++) { g.fillStyle = 'rgba(14,14,15,' + (0.3 + rnd() * 0.4) + ')'; g.beginPath(); g.arc(rnd() * S, rnd() * S, 0.5 + rnd() * 1.3, 0, 7); g.fill(); }
    mdfTex = new THREE.CanvasTexture(c); mdfTex.wrapS = mdfTex.wrapT = THREE.RepeatWrapping; mdfTex.repeat.set(1 / 24, 1 / 24); mdfTex.colorSpace = THREE.SRGBColorSpace;
    mdfTex.anisotropy = renderer.capabilities.getMaxAnisotropy();
    return mdfTex;
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
    // raw cut MDF edge: fibrous, rough, matte
    const m = mdfEdge();
    if (edge.map !== m) { edge.map = m; edge.bumpMap = m; edge.roughnessMap = m; edge.needsUpdate = true; }
    edge.color.set('#ffffff'); edge.metalness = 0; edge.roughness = 0.95; edge.bumpScale = 1.4;
    // back is always black with a fine grain
    if (back.map || back.bumpMap !== backGrain()) { back.map = null; back.bumpMap = backGrain(); back.roughnessMap = backGrain(); back.needsUpdate = true; }
    back.color.set('#111111'); back.metalness = 0; back.roughness = 0.75; back.bumpScale = 0.6; back.clearcoat = 0.25; back.clearcoatRoughness = 0.5;
  }
  // background sheet: silver front + edges, black grained back, sits directly behind the top plate
  function buildSheet() {
    if (sheetMesh) { plateRoot.remove(sheetMesh); sheetMesh.geometry.dispose(); sheetMesh = null; }
    sheetDy = 0;
    if (!P || !P.sheetOn || !cut || !plateFrame || !cut.d) return;
    let foot = null;
    if (P.sheetBottom !== 'plate' && baseInfo) {
      const sp = plateFrame.s, bw = +baseInfo.size.x || 0, ins = (P.sheetInset || 0) * 25.4, ox = +P.offX || 0, X0 = -ox - bw / 2 + ins, X1 = -ox + bw / 2 - ins;
      if (X1 - X0 > 2) foot = { x0: (X0 + plateFrame.cx) / sp - 0.5, x1: (X1 + plateFrame.cx) / sp - 0.5, h: (P.sheetFoot ?? 1) * 25.4 / sp, fillet: (P.sheetRound ?? 0.25) * 25.4 / sp, shoulder: (P.sheetShoulder ?? 0.25) * 25.4 / sp };
    }
    const key = [P.sheetTol, P.sheetShift, P.sheetSmooth, P.sheetOffset, P.dpi, P.softShadow, foot && [foot.x0, foot.x1, foot.h, foot.fillet, foot.shoulder].map(v => v.toFixed(1)).join(',')].join('|');
    if (!sheetCache || sheetCache.cut !== cut || sheetCache.key !== key) { let pts = null; try { pts = computeSheet(cut, P, foot); } catch (e) { console.warn(e); } sheetCache = { cut, key, pts }; }
    const pts = sheetCache.pts; if (!pts || pts.length < 3) return;
    const s = plateFrame.s, v = pts.map(([x, y]) => new THREE.Vector2((x + 0.5) * s - plateFrame.cx, (cut.h - (y + 0.5)) * s - plateFrame.minY));
    let minY = Infinity; v.forEach(p => { minY = Math.min(minY, p.y); });
    const T = Math.max(0.5, P.sheetThick || 3), bev = Math.min(0.3, T * 0.12), depth = Math.max(0.2, T - 2 * bev);
    const geo = new THREE.ExtrudeGeometry(new THREE.Shape(v), { depth, curveSegments: 1, steps: 1, bevelEnabled: true, bevelThickness: bev, bevelSize: bev, bevelOffset: -bev, bevelSegments: 2 });
    const g0 = geo.groups.find(g => g.materialIndex === 0), g1 = geo.groups.find(g => g.materialIndex === 1);
    geo.clearGroups(); const half = g0.count / 2;
    geo.addGroup(g0.start, half, 2); geo.addGroup(g0.start + half, half, 0); if (g1) geo.addGroup(g1.start, g1.count, 1);
    geo.translate(0, 0, plateFrame.back - 0.05 - depth - bev);
    if (!sheetMats) {
      const silver = new THREE.MeshPhysicalMaterial({ name: 'SheetSilver', color: '#c9cbce', metalness: 0.9, roughness: 0.3, clearcoat: 0.3, clearcoatRoughness: 0.25 });
      const back = new THREE.MeshPhysicalMaterial({ name: 'SheetBack', color: '#111111', metalness: 0, roughness: 0.75, bumpMap: backGrain(), roughnessMap: backGrain(), bumpScale: 0.6, clearcoat: 0.25, clearcoatRoughness: 0.5 });
      sheetMats = [silver, silver, back];
    }
    sheetMesh = new THREE.Mesh(geo, sheetMats); sheetMesh.name = 'BackgroundSheet';
    sheetMesh.castShadow = sheetMesh.receiveShadow = true;
    plateRoot.add(sheetMesh);
    sheetDy = -minY;
  }
  function queueSheet() { clearTimeout(sheetTimer); sheetTimer = setTimeout(() => { buildSheet(); applyPlacement(); updateRig(); }, 80); }
  function applyPlacement() {
    const top = baseInfo ? baseInfo.top : 0, z = baseInfo ? baseInfo.refZ : 0;
    // with a sheet, the sheet is what sits in the base: its bottom goes sheetInsert deep, the plate rides on it
    const ins = P.sheetOn && sheetMesh ? (P.sheetInsert ?? 0.25) * 25.4 - sheetDy : P.insert;
    plateRoot.position.set(P.offX, top - ins, z + P.offZ);
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
    front: [0, 3, 1, 0.5], hero34: [-28, 12, 1, 0.5], low: [-12, 1.5, 1.04, 0.56], desk: [-18, 32, 0.98, 0.45],
    profile: [-88, 6, 1, 0.5], detail: [-32, 16, 2.1, 0.16], back: [180, 3, 1, 0.5],
    left: [-35, 14, 1, 0.5], right: [35, 14, 1, 0.5], top: [12, 48, 1, 0.5],
    sideL: [-90, 3, 1, 0.5], sideR: [90, 3, 1, 0.5], topdown: [0, 89.5, 1, 0.5], bottom: [0, -89.5, 1, 0.5],
    isoL: [-45, 35.26, 1, 0.5], isoR: [45, 35.26, 1, 0.5],
  };
  function view(name = 'front') {
    const [az, el2, zm = 1, ty = 0.5] = VIEWS[name] || VIEWS.front;
    setSpin(-az * Math.PI / 180); const b = contentBox();
    const c = b.getCenter(new THREE.Vector3()), sz = b.getSize(new THREE.Vector3());
    c.y = b.min.y + sz.y * ty;
    const v = camera.fov * Math.PI / 180, hf = 2 * Math.atan(Math.tan(v / 2) * camera.aspect);
    const dist = (Math.max((sz.y / 2) / Math.tan(v / 2), (Math.max(sz.x, sz.z) / 2) / Math.tan(hf / 2)) * 1.12 + sz.z / 2) / zm;
    const a = 0, e = el2 * Math.PI / 180;
    const dir = new THREE.Vector3(Math.sin(a) * Math.cos(e), Math.sin(e), Math.cos(a) * Math.cos(e));
    camera.position.copy(c).addScaledVector(dir, dist); camera.lookAt(c);
    lastView = name; lastSaved = null;
    if (zm <= 1.05 && P) fitToFrame(b, c, dir, dist);
    controls.maxPolarAngle = el2 < 0 ? Math.PI : Math.PI * 0.495;
    freeAz(); controls.target.copy(c); controls.update(); lockAz(); updateRig();
    // underside shots: bring the fill light below so the bottom is evenly lit
    if (el2 < 0) { const r = sz.length() / 2 || 100; fill.position.set(c.x, b.min.y - r * 3, c.z); fill.intensity = 1.6; } else fill.intensity = 0.5;
  }
  // centre the memento inside the selected output frame with an equal margin on all sides
  // real geometry points (sampled), not the bounding-box corners: a turned model's box corners project lopsided
  function silhouettePts(b) {
    content.updateMatrixWorld(true);
    const meshes = []; let total = 0;
    content.traverse(o => { if (o.isMesh && o.visible && o.geometry && o.geometry.attributes.position) { meshes.push(o); total += o.geometry.attributes.position.count; } });
    const out = [], step = Math.max(1, Math.floor(total / 12000));
    for (const o of meshes) {
      const p = o.geometry.attributes.position, m = o.matrixWorld;
      for (let i = 0, st = p.count < 400 ? 1 : step; i < p.count; i += st) out.push(new THREE.Vector3(p.getX(i), p.getY(i), p.getZ(i)).applyMatrix4(m));
    }
    if (out.length < 8) for (let i = 0; i < 8; i++) out.push(new THREE.Vector3(i & 1 ? b.max.x : b.min.x, i & 2 ? b.max.y : b.min.y, i & 4 ? b.max.z : b.min.z));
    return out;
  }
  let lastView = 'front', lastSaved = null;
  function fitToFrame(b, c, dir, dist) {
    const vw = size[0], vh = size[1], f = frameRect(P.outW, P.outH), m = Math.min(f.w, f.h) * 0.08;
    const aw = f.w - 2 * m, ah = f.h - 2 * m, fcx = f.x + f.w / 2 - vw / 2, fcy = vh / 2 - (f.y + f.h / 2);
    const pts = silhouettePts(b);
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
  // centred framing for a camera direction: where the target and distance land when fitted to the output frame
  function fitFor(dir) {
    const b = contentBox(), c = b.getCenter(new THREE.Vector3()), sz = b.getSize(new THREE.Vector3());
    const v = camera.fov * Math.PI / 180, hf = 2 * Math.atan(Math.tan(v / 2) * camera.aspect);
    let dist = Math.max((sz.y / 2) / Math.tan(v / 2), (Math.max(sz.x, sz.z) / 2) / Math.tan(hf / 2)) * 1.12 + sz.z / 2;
    if (!P) return { b, c, dist };
    const kp = camera.position.clone(), kq = camera.quaternion.clone();
    fitToFrame(b, c, dir, dist); dist = camera.position.distanceTo(c);
    camera.position.copy(kp); camera.quaternion.copy(kq); camera.updateMatrixWorld();
    return { b, c, dist };
  }
  // saved views keep their angle (turntable spin + camera direction) and zoom; the memento is always re-centred
  function applySaved(v) {
    let dir = v.dir ? new THREE.Vector3().fromArray(v.dir) : new THREE.Vector3().fromArray(v.o).sub(new THREE.Vector3().fromArray(v.t || [0, 0, 0]));
    if (dir.lengthSq() < 1e-9) dir.set(0, 0, 1); dir.normalize();
    if (typeof v.spin === 'number') setSpin(v.spin);
    const f = fitFor(dir), zoom = Math.max(0.2, Math.min(6, v.zoom || 1)), dist = f.dist / zoom;
    camera.position.copy(f.c).addScaledVector(dir, dist); camera.lookAt(f.c);
    controls.maxPolarAngle = dir.y < -0.05 ? Math.PI : Math.PI * 0.495;
    freeAz(); controls.target.copy(f.c); controls.update(); lockAz(); updateRig();
    if (dir.y < -0.05) { const sz = f.b.getSize(new THREE.Vector3()), r = sz.length() / 2 || 100; fill.position.set(f.c.x, f.b.min.y - r * 3, f.c.z); fill.intensity = 1.6; } else fill.intensity = 0.5;
    lastView = null; lastSaved = v;
  }

  const changed = (prev, keys) => !prev || keys.some(k => prev[k] !== P[k]);
  function download(href, name) { const a = document.createElement('a'); a.href = href; a.download = name; document.body.appendChild(a); a.click(); a.remove(); }

  return {
    update(next) {
      const prev = P; P = { ...next };
      if (base && changed(prev, ['upAxis', 'units', 'baseYaw'])) { normalizeBase(); prev && cb.onBase && cb.onBase(baseInfo, suggestion()); }
      if (prev && changed(prev, ['baseFinish', 'baseColor', 'glitter', 'trimColor'])) applyBaseFinish();
      if (prev && base && changed(prev, ['stickerOn', 'stickerSides', 'stickerFill'])) buildSticker();
      if (prev && base && changed(prev, ['nameOn', 'nameText', 'nameFont', 'nameInk', 'nameSize'])) buildName();
      if (plate && changed(prev, ['bgMode', 'tolerance', 'softShadow', 'edgeShift', 'smoothing', 'cropT', 'cropB', 'cropL', 'cropR'])) runCutout(false);
      else if (cut) {
        const pv = changed(prev, PRIV_KEYS);
        if (pv) { cut.tex = privatize(cut.raw, P); emitPreview(); }
        if (pv || changed(prev, ['dpi', 'thickness', 'bevel'])) buildPlate();
      }
      if (prev && cut && changed(prev, ['sheetOn', 'sheetOffset', 'sheetThick', 'sheetTol', 'sheetShift', 'sheetSmooth', 'sheetBottom', 'sheetInset', 'sheetFoot', 'sheetRound', 'sheetShoulder', 'offX'])) queueSheet();
      if (changed(prev, ['bg', 'bgScale', 'bgAuto', 'bgX', 'bgY', 'bgBlur', 'bgFlip', 'viewMode', 'uiTheme'])) drawBg();
      if (prev && changed(prev, ['outW', 'outH'])) setTimeout(() => lastView ? view(lastView) : lastSaved ? applySaved(lastSaved) : view('front'), 0);
      if (changed(prev, ['outW', 'outH', 'wmOn', 'wmLine1', 'wmLine2', 'wmStyle', 'wmTone', 'wmOpacity', 'wmSize'])) updateOverlay();
      applyPlacement(); applyPlateFinish(); applyScene();
    },
    async loadBase(buf, name) {
      status('Loading base…');
      try {
        base = await parseBase(buf, name); base.name = name; pivot = null;
        normalizeBase(); applyPlacement(); updateRig(); view('front'); queueSheet();
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
    // remove the top plate entirely (no blank stand-in): base only
    clearPlate() {
      clearTimeout(cutTimer); cutSeq++; prevSeq++;
      const old = cut; plate = null; cut = null;
      try { buildPlate(); applyPlacement(); updateRig(); } catch (er) { console.warn(er); }
      if (old) for (const c of [old.raw, old.tex, old.mask]) if (c) { c.width = c.height = 0; }
      cb.onPlate && cb.onPlate(null); cb.onPlateMeta && cb.onPlateMeta({ name: '', dpi: 0, px: null }); status('');
    },
    async setBgImage(blob) { bgImg = await loadImg(URL.createObjectURL(blob)); drawBg(); },
    async setSticker(blob) { stickerCustom = blob ? await loadImg(URL.createObjectURL(blob)) : null; await buildSticker(); },
    async setNameSticker(blob) { nameCustom = blob ? await loadImg(URL.createObjectURL(blob)) : null; await buildName(); },
    suggestion, view,
    // camera relative to the memento's centre and size, so saved views survive base/plate changes
    getView() {
      const b = contentBox(), c = b.getCenter(new THREE.Vector3()), s = b.getSize(new THREE.Vector3()).length() || 1;
      const o = camera.position.clone().sub(c).divideScalar(s), t = controls.target.clone().sub(c).divideScalar(s);
      const d = camera.position.clone().sub(controls.target), dist = d.length() || 1, dir = d.clone().divideScalar(dist);
      const zoom = +(fitFor(dir).dist / dist).toFixed(4);
      return { o: o.toArray(), t: t.toArray(), dir: dir.toArray(), spin, zoom };
    },
    setView(v, exact) {
      if (!v || !(v.o || v.dir)) return;
      if (!exact) return applySaved(v);
      if (typeof v.spin === 'number') setSpin(v.spin);
      const b = contentBox(), c = b.getCenter(new THREE.Vector3()), s = b.getSize(new THREE.Vector3()).length() || 1;
      controls.target.copy(c).addScaledVector(new THREE.Vector3().fromArray(v.t), s);
      camera.position.copy(c).addScaledVector(new THREE.Vector3().fromArray(v.o), s);
      freeAz(); controls.update(); lockAz();
    },
    snapshot(name = 'memento', onBlob) {
      if (pendingB.size) return settled().then(() => this.snapshot(name, onBlob));
      const sb = P && P.viewMode !== 'cad' ? bgDef() : null;
      if (sb && sb.photo) { photoFor(sb); const c = photoCache[sb.id]; if (c && !c.img && !c.failed && c.p) return c.p.then(() => this.snapshot(name, onBlob)); }
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
      out.toBlob(bl => { if (!bl) { status('Export failed \u2014 image too large for this device. Try a smaller size.'); if (onBlob) onBlob(null, name + '.' + ext); return; } if (onBlob) onBlob(bl, name + '.' + ext); else download(URL.createObjectURL(bl), name + '.' + ext); }, 'image/' + fmt, 0.92);
    },
    // clean studio shots from several fixed angles; restores the user's view afterwards
    async multiShot(list, base = 'memento', opts = null) {
      const keep = this.getView(), kSpin = spin, kLast = lastView, out = [], kP = P ? { outW: P.outW, outH: P.outH, exportFormat: P.exportFormat } : null;
      if (opts && P) Object.assign(P, opts);
      const tick = () => new Promise(r => { const ch = new MessageChannel(); ch.port1.onmessage = () => r(); ch.port2.postMessage(0); }); // yield without timers/rAF (both stall in background tabs); rendering itself is synchronous
      try {
        for (const [i, [key, suffix]] of list.entries()) {
          status('Rendering ' + suffix + ' (' + (i + 1) + ' of ' + list.length + ')…'); if (key) { if (typeof key === 'object') this.setView(key); else view(key); } await tick();
          await settled(); out.push(await new Promise(r => this.snapshot(base + '-' + suffix, (blob, file) => r({ blob, file }))));
          if (!out[out.length - 1].blob) throw new Error('Could not render ' + suffix + ' \u2014 try a smaller size');
        }
      } finally {
        if (kP) Object.assign(P, kP); lastView = kLast;
        setSpin(kSpin); controls.maxPolarAngle = Math.PI * 0.495; fill.intensity = 0.5; this.setView(keep, true); updateRig(); status('');
      }
      return out;
    },
    async glbBlob() {
      const k = spin; setSpin(0);
      try { const out = await glbSafe(); return new Blob([out], { type: 'model/gltf-binary' }); }
      finally { setSpin(k); }
    },
    async exportGLB(name = 'memento') {
      status('Exporting GLB…'); const k = spin; setSpin(0); let out; try { out = await glbSafe(); } finally { setSpin(k); }
      download(URL.createObjectURL(new Blob([out], { type: 'model/gltf-binary' })), name + '.glb'); status('');
    },
    dispose() { cancelAnimationFrame(raf); ro.disconnect(); controls.dispose(); renderer.dispose(); renderer.domElement.remove(); },
  };
}
