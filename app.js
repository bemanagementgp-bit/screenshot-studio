/* Screenshot Studio – turn screenshots into beautiful mockups. Vanilla JS, renders on <canvas>. */
(function () {
  'use strict';
  const C = window.APP_CONFIG || {};
  const $ = id => document.getElementById(id);
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const FONT = 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  const STATE_KEY = 'shot_state_v1', PRESETS_KEY = 'shot_presets_v1';
  const MAX_SIDE = 4096;

  // ---------- backgrounds ----------
  const BG = [
    { id: 'sunset', name: 'Sunset', type: 'linear', colors: ['#ff7e5f', '#feb47b'], angle: 135 },
    { id: 'ocean', name: 'Ocean', type: 'linear', colors: ['#2193b0', '#6dd5ed'], angle: 135 },
    { id: 'aurora', name: 'Aurora', type: 'linear', colors: ['#00f2a8', '#6a5cff'], angle: 160 },
    { id: 'peach', name: 'Peach', type: 'linear', colors: ['#ffecd2', '#fcb69f'], angle: 135 },
    { id: 'midnight', name: 'Midnight', type: 'linear', colors: ['#0f2027', '#2c5364'], angle: 135 },
    { id: 'lime', name: 'Lime', type: 'linear', colors: ['#a8ff78', '#78ffd6'], angle: 135 },
    { id: 'candy', name: 'Candy', type: 'linear', colors: ['#ff9a9e', '#fad0c4'], angle: 135 },
    { id: 'slate', name: 'Slate', type: 'linear', colors: ['#3a3f4b', '#1e2128'], angle: 160 },
    { id: 'mono', name: 'Mono', type: 'linear', colors: ['#f5f5f7', '#d9d9de'], angle: 180 },
    { id: 'solid', name: 'Solid', type: 'solid', colors: ['#4f46e5', '#4f46e5'], angle: 0 },
    { id: 'transparent', name: 'Transparent', type: 'transparent', colors: ['#000000', '#000000'], angle: 0 },
    { id: 'mesh', name: 'Mesh', type: 'mesh', base: '#1a1b4b', colors: ['#ff6ec7', '#4facfe', '#f9f871'], angle: 135 },
    // premium
    { id: 'nebula', name: 'Nebula', type: 'mesh', base: '#120a2a', colors: ['#8e2de2', '#ff0080', '#00d4ff'], angle: 135, pro: true },
    { id: 'prism', name: 'Prism', type: 'linear', colors: ['#ff512f', '#f09819', '#1fa2ff', '#a6ffcb'], angle: 120, pro: true },
    { id: 'holo', name: 'Holo', type: 'linear', colors: ['#a18cd1', '#fbc2eb', '#8fd3f4', '#fcb69f'], angle: 120, pro: true },
    { id: 'ember', name: 'Ember', type: 'linear', colors: ['#1f0a0a', '#8b0000', '#ff6a00'], angle: 160, pro: true },
    { id: 'glacier', name: 'Glacier', type: 'linear', colors: ['#e0f7ff', '#9fd8ff', '#5aa9ff'], angle: 180, pro: true },
    { id: 'velvet', name: 'Velvet', type: 'mesh', base: '#2a0845', colors: ['#6441a5', '#ff3cac', '#2b86c5'], angle: 135, pro: true },
    { id: 'custom', name: 'Custom', type: 'linear', colors: ['#ff7e5f', '#feb47b'], angle: 135 }
  ];
  const bgById = id => BG.find(b => b.id === id) || BG[0];
  const RATIOS = { '16:9': 16 / 9, '4:3': 4 / 3, '1:1': 1, '4:5': 4 / 5, '9:16': 9 / 16 };

  const DEF = {
    bg: 'sunset', bgA: '#ff7e5f', bgB: '#feb47b', bgAngle: 135, noise: false,
    frame: 'browser', frameTheme: 'auto', url: 'https://yourapp.com',
    pad: 64, radius: 14, shadow: 55, shadowY: 24, ratio: 'auto', scale: 100, tilt: 0, inset: 0, insetColor: '#ffffff',
    captionOn: false, title: '', subtitle: '', captionPos: 'above', fontSize: 36, textColor: '#ffffff', align: 'center'
  };
  const S = Studio.restore(STATE_KEY, DEF);
  // sanitize restored values
  Object.keys(DEF).forEach(k => { if (typeof S[k] !== typeof DEF[k]) S[k] = DEF[k]; });
  if (!bgById(S.bg) || (bgById(S.bg).pro && !isPro())) S.bg = 'sunset';

  // ---------- images ----------
  let sampleImg = null;      // canvas with a fake app window
  let items = [];            // [{img, name, lum}] user images (batch)
  let current = 0;           // index into items
  const preview = $('preview'), pctx = preview.getContext('2d');
  const stage = $('stage'), drop = $('drop');

  function makeSample() {
    const w = 1280, h = 800, c = document.createElement('canvas'); c.width = w; c.height = h;
    const x = c.getContext('2d');
    x.fillStyle = '#f6f7fb'; x.fillRect(0, 0, w, h);
    // sidebar
    x.fillStyle = '#111827'; x.fillRect(0, 0, 232, h);
    x.fillStyle = '#f97316'; Studio.roundRect(x, 24, 26, 30, 30, 8); x.fill();
    x.fillStyle = '#fff'; x.font = `700 17px ${FONT}`; x.fillText('Northwind', 64, 47);
    const nav = ['Overview', 'Customers', 'Orders', 'Invoices', 'Reports', 'Settings'];
    nav.forEach((n, i) => {
      const y = 100 + i * 44;
      if (i === 0) { x.fillStyle = 'rgba(255,255,255,.1)'; Studio.roundRect(x, 16, y - 26, 200, 38, 10); x.fill(); }
      x.fillStyle = i === 0 ? '#fff' : 'rgba(255,255,255,.62)'; x.font = `500 14px ${FONT}`; x.fillText(n, 48, y);
      x.fillStyle = i === 0 ? '#f97316' : 'rgba(255,255,255,.35)'; Studio.roundRect(x, 28, y - 12, 12, 12, 3); x.fill();
    });
    // top bar
    x.fillStyle = '#fff'; x.fillRect(232, 0, w - 232, 64);
    x.fillStyle = '#e5e7eb'; x.fillRect(232, 64, w - 232, 1);
    x.fillStyle = '#111827'; x.font = `700 20px ${FONT}`; x.fillText('Overview', 264, 40);
    x.fillStyle = '#f3f4f6'; Studio.roundRect(x, 760, 18, 260, 30, 15); x.fill();
    x.fillStyle = '#9ca3af'; x.font = `400 13px ${FONT}`; x.fillText('Search customers, orders…', 780, 38);
    x.fillStyle = '#f97316'; Studio.roundRect(x, 1040, 18, 110, 30, 15); x.fill();
    x.fillStyle = '#fff'; x.font = `600 13px ${FONT}`; x.fillText('+ New order', 1058, 38);
    x.fillStyle = '#d1d5db'; x.beginPath(); x.arc(1200, 33, 16, 0, Math.PI * 2); x.fill();
    // stat cards
    const stats = [['Revenue', '$48,210', '+12.4%', '#16a34a'], ['Orders', '1,284', '+3.1%', '#16a34a'], ['Customers', '9,431', '+8.0%', '#16a34a'], ['Refunds', '$1,120', '-2.2%', '#dc2626']];
    stats.forEach((s, i) => {
      const cx = 264 + i * 250, cy = 96;
      x.fillStyle = '#fff'; Studio.roundRect(x, cx, cy, 230, 104, 14); x.fill();
      x.strokeStyle = '#e5e7eb'; x.lineWidth = 1; x.stroke();
      x.fillStyle = '#6b7280'; x.font = `500 13px ${FONT}`; x.fillText(s[0], cx + 18, cy + 30);
      x.fillStyle = '#111827'; x.font = `700 26px ${FONT}`; x.fillText(s[1], cx + 18, cy + 64);
      x.fillStyle = s[3]; x.font = `600 12px ${FONT}`; x.fillText(s[2], cx + 18, cy + 88);
    });
    // chart card
    x.fillStyle = '#fff'; Studio.roundRect(x, 264, 224, 620, 320, 14); x.fill(); x.strokeStyle = '#e5e7eb'; x.stroke();
    x.fillStyle = '#111827'; x.font = `600 15px ${FONT}`; x.fillText('Revenue, last 12 months', 288, 256);
    const bars = [32, 48, 40, 62, 55, 70, 66, 84, 78, 92, 88, 110];
    bars.forEach((b, i) => {
      const bx = 296 + i * 48, bh = b * 2.2;
      x.fillStyle = i === bars.length - 1 ? '#f97316' : '#fed7aa'; Studio.roundRect(x, bx, 514 - bh, 30, bh, 6); x.fill();
    });
    x.strokeStyle = '#f3f4f6'; [300, 380, 460].forEach(gy => { x.beginPath(); x.moveTo(288, gy); x.lineTo(864, gy); x.stroke(); });
    // right list card
    x.fillStyle = '#fff'; Studio.roundRect(x, 904, 224, 340, 320, 14); x.fill(); x.strokeStyle = '#e5e7eb'; x.stroke();
    x.fillStyle = '#111827'; x.font = `600 15px ${FONT}`; x.fillText('Recent orders', 928, 256);
    const rows = [['Acme Corp', '$2,400', '#dcfce7', '#166534', 'Paid'], ['Globex', '$980', '#fef3c7', '#92400e', 'Pending'], ['Initech', '$4,120', '#dcfce7', '#166534', 'Paid'], ['Umbrella', '$640', '#fee2e2', '#991b1b', 'Failed'], ['Hooli', '$1,750', '#dcfce7', '#166534', 'Paid']];
    rows.forEach((r, i) => {
      const ry = 290 + i * 48;
      x.fillStyle = '#e5e7eb'; x.beginPath(); x.arc(944, ry, 14, 0, Math.PI * 2); x.fill();
      x.fillStyle = '#111827'; x.font = `500 14px ${FONT}`; x.fillText(r[0], 968, ry + 5);
      x.fillStyle = '#6b7280'; x.font = `400 13px ${FONT}`; x.fillText(r[1], 1090, ry + 5);
      x.fillStyle = r[2]; Studio.roundRect(x, 1160, ry - 11, 64, 22, 11); x.fill();
      x.fillStyle = r[3]; x.font = `600 11px ${FONT}`; x.fillText(r[4], 1172, ry + 4);
    });
    // bottom table
    x.fillStyle = '#fff'; Studio.roundRect(x, 264, 568, 980, 210, 14); x.fill(); x.strokeStyle = '#e5e7eb'; x.stroke();
    x.fillStyle = '#111827'; x.font = `600 15px ${FONT}`; x.fillText('Top customers', 288, 600);
    for (let i = 0; i < 4; i++) {
      const ty = 630 + i * 36;
      x.fillStyle = '#f3f4f6'; x.fillRect(288, ty + 14, 932, 1);
      x.fillStyle = '#e5e7eb'; Studio.roundRect(x, 288, ty - 6, 160 + (i % 2) * 40, 12, 6); x.fill();
      Studio.roundRect(x, 620, ty - 6, 90, 12, 6); x.fill();
      Studio.roundRect(x, 800, ty - 6, 120, 12, 6); x.fill();
      x.fillStyle = '#fed7aa'; Studio.roundRect(x, 1040, ty - 6, 180 - i * 30, 12, 6); x.fill();
    }
    return c;
  }
  function luminance(img) {
    try {
      const c = document.createElement('canvas'); c.width = 24; c.height = 8; const x = c.getContext('2d');
      x.drawImage(img, 0, 0, img.width, Math.max(1, Math.round(img.height * 0.12)), 0, 0, 24, 8);
      const d = x.getImageData(0, 0, 24, 8).data; let s = 0, n = 0;
      for (let i = 0; i < d.length; i += 4) { if (d[i + 3] < 10) continue; s += 0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2]; n++; }
      return n ? s / n : 255;
    } catch (e) { return 255; }
  }
  function currentImage() { return items.length ? items[current] : { img: sampleImg, name: 'sample', lum: 246 }; }

  // ---------- layout ----------
  const mctx = document.createElement('canvas').getContext('2d');
  function frameMetrics(frame, k) {
    switch (frame) {
      case 'mac': return { top: Math.round(40 * k), left: 0, right: 0, bottom: 0 };
      case 'win': return { top: Math.round(36 * k), left: 0, right: 0, bottom: 0 };
      case 'browser': return { top: Math.round(76 * k), left: 0, right: 0, bottom: 0 };
      case 'phone': { const b = Math.round(22 * k); return { top: b, left: b, right: b, bottom: b }; }
      default: return { top: 0, left: 0, right: 0, bottom: 0 };
    }
  }
  function captionMetrics(maxW) {
    if (!S.captionOn || !(S.title.trim() || S.subtitle.trim())) return null;
    const fs = S.fontSize, sub = Math.round(fs * 0.55);
    const out = { lines: [], subLines: [], fs, sub, h: 0, lh: Math.round(fs * 1.2), slh: Math.round(sub * 1.4) };
    if (S.title.trim()) { mctx.font = `800 ${fs}px ${FONT}`; out.lines = Studio.wrapText(mctx, S.title.trim(), maxW); out.h += out.lines.length * out.lh; }
    if (S.subtitle.trim()) { mctx.font = `500 ${sub}px ${FONT}`; out.subLines = Studio.wrapText(mctx, S.subtitle.trim(), maxW); out.h += out.subLines.length * out.slh + (out.lines.length ? Math.round(fs * 0.25) : 0); }
    out.gap = Math.round(fs * 0.9);
    return out;
  }
  function computeLayout(img) {
    const sc = S.scale / 100;
    const iw = Math.max(1, Math.round(img.width * sc)), ih = Math.max(1, Math.round(img.height * sc));
    const k = clamp(iw / 1200, 0.5, 2.4);
    const fr = frameMetrics(S.frame, k);
    const cw = iw + fr.left + fr.right, ch = ih + fr.top + fr.bottom;
    const t = S.tilt * Math.PI / 180;
    const bw = Math.abs(cw * Math.cos(t)) + Math.abs(ch * Math.sin(t)), bh = Math.abs(cw * Math.sin(t)) + Math.abs(ch * Math.cos(t));
    const pad = S.pad;
    const cap = captionMetrics(Math.max(bw, 360));
    const capH = cap ? cap.h + cap.gap : 0;
    let W = Math.ceil(bw + 2 * pad), H = Math.ceil(bh + 2 * pad + capH);
    const r = RATIOS[S.ratio];
    if (r) { if (W / H < r) W = Math.ceil(H * r); else H = Math.ceil(W / r); }
    let f = 1; const mx = Math.max(W, H); if (mx > MAX_SIDE) f = MAX_SIDE / mx;
    return { iw, ih, k, fr, cw, ch, bw, bh, W, H, f, outW: Math.max(1, Math.round(W * f)), outH: Math.max(1, Math.round(H * f)), cap, capH, pad, t };
  }

  // ---------- drawing ----------
  let noisePattern = null;
  function getNoise(ctx) {
    if (noisePattern) return noisePattern;
    const c = document.createElement('canvas'); c.width = c.height = 256; const x = c.getContext('2d');
    const id = x.createImageData(256, 256), d = id.data;
    for (let i = 0; i < d.length; i += 4) { const v = Math.random() * 255 | 0; d[i] = d[i + 1] = d[i + 2] = v; d[i + 3] = Math.random() * 110 | 0; }
    x.putImageData(id, 0, 0);
    noisePattern = ctx.createPattern(c, 'repeat');
    return noisePattern;
  }
  function linearGradient(ctx, w, h, angle, colors) {
    const rad = (angle - 90) * Math.PI / 180, dx = Math.cos(rad), dy = Math.sin(rad);
    const L = (Math.abs(w * dx) + Math.abs(h * dy)) / 2, cx = w / 2, cy = h / 2;
    const g = ctx.createLinearGradient(cx - dx * L, cy - dy * L, cx + dx * L, cy + dy * L);
    colors.forEach((c, i) => g.addColorStop(colors.length === 1 ? 0 : i / (colors.length - 1), c));
    return g;
  }
  function bgSpec() {
    const b = bgById(S.bg);
    if (b.id === 'custom') return { type: 'linear', colors: [S.bgA, S.bgB], angle: S.bgAngle };
    if (b.id === 'solid') return { type: 'solid', colors: [S.bgA] };
    return b;
  }
  function drawBackground(ctx, w, h, opaque) {
    const b = bgSpec();
    if (b.type === 'transparent') { if (opaque) { ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, w, h); } return; }
    if (b.type === 'solid') { ctx.fillStyle = b.colors[0]; ctx.fillRect(0, 0, w, h); }
    else if (b.type === 'linear') { ctx.fillStyle = linearGradient(ctx, w, h, b.angle, b.colors); ctx.fillRect(0, 0, w, h); }
    else if (b.type === 'mesh') {
      ctx.fillStyle = b.base; ctx.fillRect(0, 0, w, h);
      const spots = [[0.15, 0.2], [0.85, 0.3], [0.5, 0.95]];
      const R = Math.max(w, h) * 0.7;
      b.colors.forEach((c, i) => {
        const [px, py] = spots[i % spots.length];
        const g = ctx.createRadialGradient(px * w, py * h, 0, px * w, py * h, R);
        g.addColorStop(0, c); g.addColorStop(1, Studio.hexToRgba(c, 0));
        ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
      });
    }
    if (S.noise) { ctx.save(); ctx.globalAlpha = 0.09; ctx.fillStyle = getNoise(ctx); ctx.fillRect(0, 0, w, h); ctx.restore(); }
  }
  function frameTheme(item) {
    if (S.frameTheme !== 'auto') return S.frameTheme;
    return item.lum < 128 ? 'dark' : 'light';
  }
  function chromeColors(theme) {
    return theme === 'dark'
      ? { bar: '#2b2b2e', bar2: '#1f1f22', text: 'rgba(255,255,255,.8)', muted: 'rgba(255,255,255,.45)', field: 'rgba(255,255,255,.08)', line: 'rgba(255,255,255,.08)', bezel: '#141416', bezel2: '#2a2a2e' }
      : { bar: '#ececef', bar2: '#f7f7f8', text: 'rgba(0,0,0,.78)', muted: 'rgba(0,0,0,.45)', field: 'rgba(0,0,0,.06)', line: 'rgba(0,0,0,.08)', bezel: '#f2f2f4', bezel2: '#d9d9de' };
  }
  function trafficLights(ctx, x, y, r) {
    ['#ff5f57', '#febc2e', '#28c840'].forEach((c, i) => { ctx.fillStyle = c; ctx.beginPath(); ctx.arc(x + i * r * 3.2, y, r, 0, Math.PI * 2); ctx.fill(); });
  }
  function drawContent(ctx, L, item) {
    const { cw, ch, iw, ih, fr, k } = L; const img = item.img;
    const theme = frameTheme(item), col = chromeColors(theme);
    const outerR = S.frame === 'phone' ? S.radius + fr.left : S.radius;
    // shadow
    if (S.shadow > 0) {
      ctx.save();
      ctx.shadowColor = `rgba(0,0,0,${(S.shadow / 100) * 0.75})`;
      ctx.shadowBlur = S.shadow * 1.6 * k; ctx.shadowOffsetY = S.shadowY * k;
      ctx.fillStyle = S.frame === 'phone' ? col.bezel : (S.frame === 'none' ? '#000' : col.bar);
      Studio.roundRect(ctx, 0, 0, cw, ch, outerR); ctx.fill();
      ctx.restore();
    }
    ctx.save();
    Studio.roundRect(ctx, 0, 0, cw, ch, outerR); ctx.clip();
    if (S.frame === 'none') {
      ctx.drawImage(img, 0, 0, iw, ih);
    } else if (S.frame === 'phone') {
      ctx.fillStyle = col.bezel; ctx.fillRect(0, 0, cw, ch);
      ctx.save(); Studio.roundRect(ctx, fr.left, fr.top, iw, ih, S.radius); ctx.clip(); ctx.drawImage(img, fr.left, fr.top, iw, ih); ctx.restore();
      // dynamic island
      const pw = Math.round(iw * 0.3), ph = Math.round(24 * k);
      ctx.fillStyle = '#000'; Studio.roundRect(ctx, (cw - pw) / 2, fr.top + Math.round(10 * k), pw, ph, ph / 2); ctx.fill();
      // bezel highlight
      ctx.strokeStyle = col.bezel2; ctx.lineWidth = Math.max(1, 2 * k); Studio.roundRect(ctx, 1, 1, cw - 2, ch - 2, outerR - 1); ctx.stroke();
    } else {
      ctx.fillStyle = col.bar; ctx.fillRect(0, 0, cw, ch);
      ctx.drawImage(img, 0, fr.top, iw, ih);
      ctx.fillStyle = col.line; ctx.fillRect(0, fr.top - 1, cw, 1);
      const fs = Math.round(13 * k);
      if (S.frame === 'mac') {
        trafficLights(ctx, 20 * k, fr.top / 2, 6 * k);
        ctx.fillStyle = col.muted; ctx.font = `600 ${fs}px ${FONT}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(S.url.replace(/^https?:\/\//, '') || 'Untitled', cw / 2, fr.top / 2); ctx.textAlign = 'left';
      } else if (S.frame === 'win') {
        ctx.fillStyle = col.text; ctx.font = `400 ${fs}px ${FONT}`; ctx.textBaseline = 'middle';
        ctx.fillText(S.url.replace(/^https?:\/\//, '') || 'Untitled', 16 * k, fr.top / 2);
        ctx.textAlign = 'center'; ctx.font = `400 ${Math.round(13 * k)}px ${FONT}`;
        ctx.fillText('—', cw - 92 * k, fr.top / 2); ctx.fillText('▢', cw - 56 * k, fr.top / 2); ctx.fillText('✕', cw - 20 * k, fr.top / 2); ctx.textAlign = 'left';
      } else if (S.frame === 'browser') {
        const tabH = Math.round(38 * k), urlH = fr.top - tabH;
        ctx.fillStyle = col.bar2; ctx.fillRect(0, tabH, cw, urlH);
        trafficLights(ctx, 20 * k, tabH / 2, 6 * k);
        // tab
        const tx = 84 * k, tw = Math.min(220 * k, cw * 0.4);
        ctx.fillStyle = col.bar2; Studio.roundRect(ctx, tx, 8 * k, tw, tabH - 8 * k + 2, 8 * k); ctx.fill();
        ctx.fillStyle = col.text; ctx.font = `500 ${fs}px ${FONT}`; ctx.textBaseline = 'middle';
        const host = (S.url.replace(/^https?:\/\//, '').split('/')[0]) || 'New tab';
        ctx.fillText(host, tx + 14 * k, tabH / 2 + 3 * k);
        ctx.fillStyle = col.muted; ctx.font = `400 ${Math.round(16 * k)}px ${FONT}`; ctx.fillText('+', tx + tw + 14 * k, tabH / 2 + 3 * k);
        // nav glyphs + url field
        ctx.fillStyle = col.muted; ctx.font = `500 ${Math.round(15 * k)}px ${FONT}`;
        ctx.fillText('‹', 18 * k, tabH + urlH / 2); ctx.fillText('›', 40 * k, tabH + urlH / 2); ctx.fillText('↻', 60 * k, tabH + urlH / 2);
        const fx = 86 * k, fy = tabH + Math.round(6 * k), fh = urlH - Math.round(12 * k), fw = cw - fx - 24 * k;
        ctx.fillStyle = col.field; Studio.roundRect(ctx, fx, fy, fw, fh, fh / 2); ctx.fill();
        ctx.fillStyle = col.text; ctx.font = `400 ${fs}px ${FONT}`;
        ctx.fillText('🔒 ' + (S.url || ''), fx + 14 * k, fy + fh / 2 + 1);
      }
      ctx.textBaseline = 'alphabetic';
    }
    ctx.restore();
    // inset border
    if (S.inset > 0) {
      ctx.save(); Studio.roundRect(ctx, 0, 0, cw, ch, outerR); ctx.clip();
      ctx.strokeStyle = S.insetColor; ctx.lineWidth = S.inset * 2; Studio.roundRect(ctx, 0, 0, cw, ch, outerR); ctx.stroke();
      ctx.restore();
    }
  }
  function drawCaption(ctx, L, cx, contentTop, contentBottom) {
    const cap = L.cap; if (!cap) return;
    const maxW = L.W - 2 * L.pad;
    const x = S.align === 'left' ? Math.max(L.pad, cx - Math.max(L.bw, 360) / 2) : S.align === 'right' ? Math.min(L.W - L.pad, cx + Math.max(L.bw, 360) / 2) : cx;
    let y = S.captionPos === 'above' ? contentTop - cap.gap - cap.h : contentBottom + cap.gap;
    ctx.save();
    ctx.textAlign = S.align; ctx.textBaseline = 'top'; ctx.fillStyle = S.textColor;
    ctx.shadowColor = 'rgba(0,0,0,.25)'; ctx.shadowBlur = Math.round(cap.fs * 0.3); ctx.shadowOffsetY = 2;
    ctx.font = `800 ${cap.fs}px ${FONT}`;
    cap.lines.forEach(l => { ctx.fillText(l, x, y, maxW); y += cap.lh; });
    if (cap.subLines.length) {
      if (cap.lines.length) y += Math.round(cap.fs * 0.25);
      ctx.globalAlpha = 0.82; ctx.font = `500 ${cap.sub}px ${FONT}`;
      cap.subLines.forEach(l => { ctx.fillText(l, x, y, maxW); y += cap.slh; });
    }
    ctx.restore();
  }
  // Full scene in design coordinates (L.W x L.H), scaled by L.f to fit the output canvas.
  function drawScene(ctx, L, item, opaque) {
    ctx.save(); ctx.scale(L.f, L.f);
    drawBackground(ctx, L.W, L.H, opaque);
    const capTop = S.captionPos === 'above';
    const cx = L.W / 2, cy = (L.H - L.capH) / 2 + (capTop ? L.capH : 0);
    ctx.save(); ctx.translate(cx, cy); ctx.rotate(L.t); ctx.translate(-L.cw / 2, -L.ch / 2);
    drawContent(ctx, L, item);
    ctx.restore();
    drawCaption(ctx, L, cx, cy - L.bh / 2, cy + L.bh / 2);
    ctx.restore();
  }

  // ---------- preview ----------
  let lastL = null;
  function renderPreview() {
    const item = currentImage(); if (!item.img) return;
    const L = computeLayout(item.img); lastL = L;
    if (preview.width !== L.outW || preview.height !== L.outH) { preview.width = L.outW; preview.height = L.outH; }
    pctx.setTransform(1, 0, 0, 1, 0, 0); pctx.clearRect(0, 0, L.outW, L.outH);
    drawScene(pctx, L, item, false);
    if (!isPro()) { pctx.save(); pctx.globalAlpha = 0.6; Studio.watermark(pctx, L.outW, L.outH); pctx.restore(); }
    $('sizeInfo').innerHTML = `Output: <b>${L.outW} × ${L.outH}</b>${L.f < 1 ? ' (capped at 4096)' : ''} · ${items.length ? items.length + ' screenshot' + (items.length > 1 ? 's' : '') : 'sample'}`;
  }
  const render = Studio.raf(renderPreview);
  function update() { Studio.persist(STATE_KEY, S); render(); }

  // ---------- export ----------
  function exportCurrent(opts) {
    const item = currentImage(); const L = computeLayout(item.img);
    let scale = opts.scale || 1;
    if (Math.max(L.outW, L.outH) * scale > 12000) { scale = Math.max(1, Math.floor(12000 / Math.max(L.outW, L.outH))); toast('Scaled down to ' + scale + 'x to stay inside browser canvas limits'); }
    const jpeg = opts.type === 'image/jpeg';
    const base = Studio.safeName((item.name || 'screenshot').replace(/\.[a-z0-9]+$/i, '')) + '-mockup' + (scale > 1 ? '@' + scale + 'x' : '');
    return Studio.exportPNG((ctx, w, h) => drawScene(ctx, L, item, jpeg), L.outW, L.outH, Object.assign({ scale, name: base }, opts));
  }
  async function exportBatch() {
    if (items.length < 2) { toast(isPro() ? 'Drop two or more screenshots to batch-export' : 'Batch export is a Pro feature'); if (!isPro()) openPro('batch'); return; }
    if (!Studio.gate('batch')) return;
    toast('Rendering ' + items.length + ' images…');
    const files = [];
    for (let i = 0; i < items.length; i++) {
      const item = items[i], L = computeLayout(item.img);
      const name = Studio.safeName((item.name || 'screenshot-' + (i + 1)).replace(/\.[a-z0-9]+$/i, '')) + '-mockup.png';
      const blob = await Studio.exportPNG((ctx) => drawScene(ctx, L, item, false), L.outW, L.outH, { download: false, name });
      files.push({ name: files.some(f => f.name === name) ? name.replace(/\.png$/, '-' + (i + 1) + '.png') : name, blob });
    }
    try { await Studio.zip(files, 'screenshot-studio-batch'); track('download_zip', { count: files.length }); toast('ZIP downloaded'); }
    catch (e) { toast('Could not build the ZIP (library failed to load)'); }
  }

  // ---------- UI: tiles ----------
  function swatchCSS(b) {
    if (b.id === 'custom') return `linear-gradient(${S.bgAngle}deg, ${S.bgA}, ${S.bgB})`;
    if (b.id === 'solid') return S.bgA;
    if (b.type === 'linear') return `linear-gradient(${b.angle}deg, ${b.colors.join(', ')})`;
    if (b.type === 'mesh') return `radial-gradient(at 15% 20%, ${b.colors[0]}, transparent 60%), radial-gradient(at 85% 30%, ${b.colors[1]}, transparent 60%), radial-gradient(at 50% 95%, ${b.colors[2]}, transparent 60%), ${b.base}`;
    return '';
  }
  function buildTiles() {
    const box = $('bgTiles'); box.innerHTML = '';
    BG.forEach(b => {
      const t = document.createElement('button'); t.type = 'button'; t.className = 'tile'; t.dataset.id = b.id; t.setAttribute('role', 'option');
      const sw = document.createElement('div'); sw.className = 'sw' + (b.type === 'transparent' ? ' checker' : ''); sw.style.background = swatchCSS(b); t.appendChild(sw);
      const lab = document.createElement('span'); lab.textContent = b.name; t.appendChild(lab);
      if (b.pro) { const pb = document.createElement('span'); pb.className = 'pro-badge'; pb.textContent = 'PRO'; t.appendChild(pb); }
      t.addEventListener('click', () => {
        if (b.pro && !isPro()) { openPro('bg-premium'); return; }
        S.bg = b.id;
        if (b.type === 'linear' && b.id !== 'custom') { S.bgA = b.colors[0]; S.bgB = b.colors[b.colors.length - 1]; S.bgAngle = b.angle; syncBgInputs(); }
        track('bg_select', { id: b.id }); syncTiles(); update();
      });
      box.appendChild(t);
    });
    syncTiles();
  }
  function syncTiles() {
    $('bgTiles').querySelectorAll('.tile').forEach(t => {
      const b = bgById(t.dataset.id);
      t.classList.toggle('active', t.dataset.id === S.bg); t.classList.toggle('locked', !!b.pro && !isPro());
      t.setAttribute('aria-selected', t.dataset.id === S.bg ? 'true' : 'false');
      const pb = t.querySelector('.pro-badge'); if (pb) pb.classList.toggle('hidden', isPro());
      if (b.id === 'custom' || b.id === 'solid') t.querySelector('.sw').style.background = swatchCSS(b);
    });
  }
  function syncBgInputs() { $('bgA').value = S.bgA; $('bgB').value = S.bgB; $('bgAngle').value = S.bgAngle; $('bgAngleV').textContent = S.bgAngle + '°'; }

  // ---------- UI: controls ----------
  function range(id, key, fmt, numeric) {
    const el = $(id), out = $(id + 'V');
    el.value = S[key];
    Studio.bindRange(el, out, fmt);
    el.addEventListener('input', () => { S[key] = numeric === false ? el.value : Number(el.value); update(); });
  }
  function segCtl(id, key, onChange) {
    const sg = Studio.seg($(id), v => { S[key] = v; if (onChange) onChange(v); update(); });
    sg.set(S[key]); return sg;
  }
  function syncFrameUI() { $('urlRow').classList.toggle('hidden', !(S.frame === 'browser' || S.frame === 'mac' || S.frame === 'win')); }
  function setRatio(v) { S.ratio = v; $('ratioChips').querySelectorAll('.chip').forEach(c => c.classList.toggle('active', c.dataset.value === v)); }

  // ---------- presets ----------
  const STYLE_KEYS = Object.keys(DEF).filter(k => !['title', 'subtitle', 'url'].includes(k));
  function loadPresets() { try { return JSON.parse(localStorage.getItem(PRESETS_KEY) || '[]'); } catch (e) { return []; } }
  function savePresets(p) { try { localStorage.setItem(PRESETS_KEY, JSON.stringify(p)); } catch (e) {} }
  function renderPresets() {
    const list = $('presetList'), ps = loadPresets(); list.innerHTML = '';
    if (!ps.length) { const p = document.createElement('p'); p.className = 'preset-empty'; p.textContent = 'No saved presets yet. Dial in a look and save it to reuse later.'; list.appendChild(p); }
    ps.forEach((p, i) => {
      const row = document.createElement('div'); row.className = 'preset-item';
      const sw = document.createElement('span'); sw.className = 'swatch'; sw.style.background = swatchCSS(Object.assign({}, bgById(p.style.bg), p.style.bg === 'custom' ? { colors: [p.style.bgA, p.style.bgB], angle: p.style.bgAngle } : {})); sw.style.cursor = 'default';
      if (p.style.bg === 'custom') sw.style.background = `linear-gradient(${p.style.bgAngle}deg, ${p.style.bgA}, ${p.style.bgB})`;
      if (p.style.bg === 'solid') sw.style.background = p.style.bgA;
      const name = document.createElement('span'); name.className = 'name'; name.textContent = p.name; name.title = 'Apply preset'; name.tabIndex = 0;
      const apply = () => { applyPreset(p.style); toast('Preset "' + p.name + '" applied'); track('preset_apply', {}); };
      name.addEventListener('click', apply); name.addEventListener('keydown', e => { if (e.key === 'Enter') apply(); });
      const del = document.createElement('button'); del.type = 'button'; del.className = 'btn btn-ghost btn-sm'; del.textContent = '✕'; del.setAttribute('aria-label', 'Delete preset ' + p.name);
      del.addEventListener('click', () => { const all = loadPresets(); all.splice(i, 1); savePresets(all); renderPresets(); });
      row.append(sw, name, del); list.appendChild(row);
    });
    $('presetHint').textContent = isPro() ? ps.length + ' saved preset' + (ps.length === 1 ? '' : 's') + ' · unlimited with Pro' : 'Free: 1 saved preset · Pro: unlimited';
  }
  function applyPreset(style) {
    STYLE_KEYS.forEach(k => { if (k in style && typeof style[k] === typeof DEF[k]) S[k] = style[k]; });
    if (bgById(S.bg).pro && !isPro()) S.bg = 'sunset';
    syncAll(); update();
  }
  function savePreset() {
    const ps = loadPresets();
    if (!isPro() && ps.length >= 1) { openPro('presets'); return; }
    let name = $('presetName').value.trim() || ('Style ' + (ps.length + 1));
    const style = {}; STYLE_KEYS.forEach(k => style[k] = S[k]);
    ps.push({ name, style }); savePresets(ps); $('presetName').value = ''; renderPresets(); toast('Preset saved'); track('preset_save', {});
  }

  // ---------- sync all controls from state ----------
  let segs = {};
  function syncAll() {
    syncBgInputs(); syncTiles(); $('noise').checked = S.noise;
    segs.frame.set(S.frame); segs.theme.set(S.frameTheme); syncFrameUI(); $('urlText').value = S.url;
    ['pad', 'radius', 'shadow', 'shadowY', 'scale', 'tilt', 'inset', 'fontSize'].forEach(k => { $(k).value = S[k]; $(k).dispatchEvent(new Event('input', { bubbles: false })); });
    $('insetColor').value = S.insetColor; setRatio(S.ratio);
    $('captionOn').checked = S.captionOn; $('title').value = S.title; $('subtitle').value = S.subtitle;
    segs.cap.set(S.captionPos); $('textColor').value = S.textColor; segs.align.set(S.align);
  }

  // ---------- files ----------
  let dz;
  async function onFiles(fileList) {
    const files = [...fileList].filter(f => /^image\//.test(f.type));
    if (!files.length) { toast('Please drop an image file (PNG, JPG, WebP)'); return; }
    if (files.length > 1 && !isPro()) { toast('Batch mode is a Pro feature – loading the first screenshot'); openPro('batch'); }
    const take = isPro() ? files.slice(0, 50) : files.slice(0, 1);
    const loaded = [];
    for (const f of take) {
      try { const img = await Studio.readImage(f); loaded.push({ img, name: f.name, lum: luminance(img) }); }
      catch (e) { toast('Could not read ' + f.name + (/heic|heif/i.test(f.name) ? ' (HEIC is not supported by browsers)' : '')); }
    }
    if (!loaded.length) return;
    if (isPro() && items.length && take.length > 1) items = items.concat(loaded); else items = loaded;
    current = items.length - loaded.length;
    track('add_files', { count: loaded.length });
    syncSource(); render();
  }
  function syncSource() {
    const has = items.length > 0;
    drop.classList.toggle('has-image', has);
    $('srcInfo').innerHTML = has
      ? `<b>${items[current].name}</b> · ${items[current].img.width} × ${items[current].img.height}px${items.length > 1 ? ' · ' + items.length + ' loaded' : ''}`
      : 'Showing the <b>built-in sample</b>. Drop your own screenshot to replace it.';
    const list = $('batchList'); list.innerHTML = '';
    if (items.length > 1) items.forEach((it, i) => {
      const b = document.createElement('button'); b.type = 'button'; b.className = i === current ? 'active' : ''; b.title = it.name; b.setAttribute('aria-label', 'Show ' + it.name);
      const c = document.createElement('canvas'); c.width = 56; c.height = 40; const x = c.getContext('2d');
      const cv = Studio.cover(it.img.width, it.img.height, 56, 40); x.drawImage(it.img, cv.sx, cv.sy, cv.sw, cv.sh, 0, 0, 56, 40);
      b.appendChild(c); b.addEventListener('click', () => { current = i; syncSource(); render(); }); list.appendChild(b);
    });
  }
  function useSample() { items = []; current = 0; syncSource(); render(); track('sample', {}); }

  // ---------- init ----------
  function init() {
    sampleImg = makeSample();
    document.querySelectorAll('[data-pro-price]').forEach(el => el.textContent = C.PRO_PRICE || '$9');
    const pp = $('proPrice'); if (pp) pp.textContent = C.PRO_PRICE || '$9';

    buildTiles();
    $('bgA').addEventListener('input', () => { S.bgA = $('bgA').value; if (S.bg !== 'solid') S.bg = 'custom'; syncTiles(); update(); });
    $('bgB').addEventListener('input', () => { S.bgB = $('bgB').value; S.bg = 'custom'; syncTiles(); update(); });
    $('bgAngle').addEventListener('input', () => { S.bgAngle = Number($('bgAngle').value); $('bgAngleV').textContent = S.bgAngle + '°'; if (S.bg !== 'solid') S.bg = 'custom'; syncTiles(); update(); });
    $('noise').addEventListener('change', () => { S.noise = $('noise').checked; update(); });

    segs.frame = segCtl('frameSeg', 'frame', syncFrameUI);
    segs.theme = segCtl('frameTheme', 'frameTheme');
    $('urlText').addEventListener('input', () => { S.url = $('urlText').value; update(); });

    range('pad', 'pad'); range('radius', 'radius'); range('shadow', 'shadow'); range('shadowY', 'shadowY');
    range('scale', 'scale', v => v + '%'); range('tilt', 'tilt', v => v + '°'); range('inset', 'inset');
    $('insetColor').addEventListener('input', () => { S.insetColor = $('insetColor').value; update(); });
    $('ratioChips').querySelectorAll('.chip').forEach(c => c.addEventListener('click', () => { setRatio(c.dataset.value); update(); }));

    $('captionOn').addEventListener('change', () => { S.captionOn = $('captionOn').checked; if (S.captionOn && !S.title && !S.subtitle) { S.title = 'Introducing the new dashboard'; S.subtitle = 'Real-time analytics for your whole team'; $('title').value = S.title; $('subtitle').value = S.subtitle; } update(); });
    $('title').addEventListener('input', () => { S.title = $('title').value; if (!S.captionOn) { S.captionOn = true; $('captionOn').checked = true; } update(); });
    $('subtitle').addEventListener('input', () => { S.subtitle = $('subtitle').value; if (!S.captionOn) { S.captionOn = true; $('captionOn').checked = true; } update(); });
    segs.cap = segCtl('captionPos', 'captionPos');
    range('fontSize', 'fontSize');
    $('textColor').addEventListener('input', () => { S.textColor = $('textColor').value; update(); });
    segs.align = segCtl('align', 'align');

    $('savePreset').addEventListener('click', savePreset);
    $('presetName').addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); savePreset(); } });
    renderPresets();

    // source
    dz = Studio.dropzone(stage, onFiles, { accept: 'image/*', multiple: true, clickTarget: '#drop' });
    $('uploadBtn').addEventListener('click', () => dz.open());
    $('useSample').addEventListener('click', useSample);
    preview.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') e.stopPropagation(); });

    // actions
    $('dlPng').addEventListener('click', () => exportCurrent({ scale: 1 }));
    $('dlJpg').addEventListener('click', () => exportCurrent({ scale: 1, type: 'image/jpeg', quality: 0.92 }));
    $('dl2x').addEventListener('click', () => { if (Studio.gate('hires')) exportCurrent({ scale: 2 }); });
    $('dl4x').addEventListener('click', () => { if (Studio.gate('hires')) exportCurrent({ scale: 4 }); });
    $('copyBtn').addEventListener('click', () => Studio.copyCanvas(preview));
    $('zipBtn').addEventListener('click', exportBatch);
    $('resetBtn').addEventListener('click', () => { Object.assign(S, DEF); syncAll(); update(); toast('Style reset'); });

    document.addEventListener('keydown', e => {
      const mod = e.ctrlKey || e.metaKey; if (!mod) return;
      const tag = (document.activeElement && document.activeElement.tagName) || '';
      if (e.key.toLowerCase() === 's' && !/INPUT|TEXTAREA/.test(tag)) { e.preventDefault(); exportCurrent({ scale: 1 }); }
      if (e.key.toLowerCase() === 'c' && document.activeElement === preview) { e.preventDefault(); Studio.copyCanvas(preview); }
    });

    const refreshPro = () => {
      const pro = isPro();
      document.querySelectorAll('.studio-actions .pro-badge').forEach(b => b.classList.toggle('hidden', pro));
      if (!pro && bgById(S.bg).pro) { S.bg = 'sunset'; }
      syncTiles(); renderPresets(); render();
    };
    document.addEventListener('pro:changed', refreshPro);
    refreshPro();

    syncAll(); syncSource(); render();
    // re-render once web font is ready so canvas text uses Inter
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(render);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
