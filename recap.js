/* Dans la Lucarne (v1.2) : image de compte rendu à partager (1080 × 1350, format WhatsApp / Instagram).
   Proposition v1.2 : un visuel différent selon le résultat (titre en tournoi, victoire, nul, défaite, bilan de plateau). */
(function () {
  const W = 1080, H = 1350;
  const F9 = '"Barlow Condensed","Arial Narrow",sans-serif';
  const FS = '"Barlow Semi Condensed","Arial Narrow",sans-serif';
  const FB = '"Barlow",sans-serif';
  const GOLD = ['#FFF3B0', '#F5C542', '#C9920E'];

  function rr(x, a, b, w, h, r) { x.beginPath(); x.moveTo(a + r, b); x.arcTo(a + w, b, a + w, b + h, r); x.arcTo(a + w, b + h, a, b + h, r); x.arcTo(a, b + h, a, b, r); x.arcTo(a, b, a + w, b, r); x.closePath(); }
  function rnd(seed) { let a = seed | 0; return () => { a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  function fit(x, t, max, size, weight, fam) { let s = size; x.font = weight + ' ' + s + 'px ' + fam; while (x.measureText(t).width > max && s > 18) { s -= 2; x.font = weight + ' ' + s + 'px ' + fam; } return s; }
  function goldFill(x, y0, y1) { const g = x.createLinearGradient(0, y0, 0, y1); g.addColorStop(0, GOLD[0]); g.addColorStop(.5, GOLD[1]); g.addColorStop(1, GOLD[2]); return g; }
  function hexA(h, a) { h = h.replace('#', ''); const n = parseInt(h, 16); return 'rgba(' + (n >> 16 & 255) + ',' + (n >> 8 & 255) + ',' + (n & 255) + ',' + a + ')'; }
  function shade(h, k) { h = h.replace('#', ''); const n = parseInt(h, 16); const f = v => Math.max(0, Math.min(255, Math.round(v * k))); return 'rgb(' + f(n >> 16 & 255) + ',' + f(n >> 8 & 255) + ',' + f(n & 255) + ')'; }

  /* ---------- décors ---------- */
  function background(x, R, mood) {
    const c1 = R.club.c1;
    const g = x.createLinearGradient(0, 0, 0, H);
    if (mood === 'loss') { g.addColorStop(0, shade(c1, .55)); g.addColorStop(1, '#070A10'); }
    else { g.addColorStop(0, shade(c1, 1.05)); g.addColorStop(.55, shade(c1, .5)); g.addColorStop(1, '#060B16'); }
    x.fillStyle = g; x.fillRect(0, 0, W, H);
    /* bandes diagonales discrètes (style maillot) */
    x.save(); x.globalAlpha = mood === 'loss' ? .03 : .05; x.fillStyle = '#FFFFFF';
    for (let i = -H; i < W; i += 90) { x.beginPath(); x.moveTo(i, 0); x.lineTo(i + 40, 0); x.lineTo(i + 40 + H * .6, H); x.lineTo(i + H * .6, H); x.closePath(); x.fill(); }
    x.restore();
  }
  function rays(x, cx, cy, col, n, alpha) {
    x.save(); x.translate(cx, cy);
    for (let i = 0; i < n; i++) {
      const a = i * Math.PI * 2 / n;
      const g = x.createLinearGradient(0, 0, Math.cos(a) * 900, Math.sin(a) * 900);
      g.addColorStop(0, hexA(col, alpha)); g.addColorStop(1, hexA(col, 0));
      x.fillStyle = g; x.beginPath(); x.moveTo(0, 0); x.arc(0, 0, 900, a - .045, a + .045); x.closePath(); x.fill();
    }
    x.restore();
  }
  function glow(x, cx, cy, r, col, a) { const g = x.createRadialGradient(cx, cy, 0, cx, cy, r); g.addColorStop(0, hexA(col, a)); g.addColorStop(1, hexA(col, 0)); x.fillStyle = g; x.fillRect(cx - r, cy - r, r * 2, r * 2); }
  function confetti(x, cols, n, seed, yMax) {
    const r = rnd(seed);
    for (let i = 0; i < n; i++) {
      const px = r() * W, py = r() * (yMax || H), s = 8 + r() * 14;
      x.save(); x.translate(px, py); x.rotate(r() * Math.PI); x.globalAlpha = .55 + r() * .45;
      x.fillStyle = cols[Math.floor(r() * cols.length)];
      if (r() < .3) { x.beginPath(); x.arc(0, 0, s * .35, 0, 7); x.fill(); } else x.fillRect(-s / 2, -s / 5, s, s * .4);
      x.restore();
    }
  }
  function trophy(x, cx, cy, s) {
    x.save(); x.translate(cx, cy); x.scale(s / 100, s / 100);
    const gf = goldFill(x, -60, 70);
    x.lineJoin = 'round';
    /* anses */
    x.strokeStyle = GOLD[2]; x.lineWidth = 9;
    x.beginPath(); x.moveTo(-40, -42); x.bezierCurveTo(-78, -44, -80, 4, -36, 8); x.stroke();
    x.beginPath(); x.moveTo(40, -42); x.bezierCurveTo(78, -44, 80, 4, 36, 8); x.stroke();
    /* coupe */
    x.fillStyle = gf; x.beginPath(); x.moveTo(-46, -58); x.lineTo(46, -58); x.bezierCurveTo(46, 0, 22, 22, 8, 26); x.lineTo(8, 44); x.lineTo(-8, 44); x.lineTo(-8, 26); x.bezierCurveTo(-22, 22, -46, 0, -46, -58); x.closePath(); x.fill();
    x.fillStyle = 'rgba(255,255,255,.45)'; x.beginPath(); x.moveTo(-34, -52); x.lineTo(-22, -52); x.bezierCurveTo(-22, -16, -14, 6, -6, 14); x.bezierCurveTo(-22, 8, -34, -14, -34, -52); x.fill();
    /* socle */
    x.fillStyle = gf; rr(x, -30, 44, 60, 12, 3); x.fill();
    x.fillStyle = '#1B2234'; rr(x, -40, 56, 80, 22, 4); x.fill();
    x.fillStyle = gf; rr(x, -40, 56, 80, 5, 2); x.fill();
    /* étoile */
    x.fillStyle = '#FFFFFF'; star(x, 0, -24, 15);
    x.restore();
  }
  function star(x, cx, cy, R) { x.beginPath(); for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, r = i % 2 ? R * .44 : R; x.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r); } x.closePath(); x.fill(); }
  function ballIcon(x, cx, cy, r, ink) {
    x.save(); x.beginPath(); x.arc(cx, cy, r, 0, 7); x.fillStyle = '#FFFFFF'; x.fill(); x.lineWidth = r * .12; x.strokeStyle = ink || '#0D1118'; x.stroke();
    x.fillStyle = ink || '#0D1118'; x.beginPath(); for (let i = 0; i < 5; i++) { const a = -Math.PI / 2 + i * 2 * Math.PI / 5; x.lineTo(cx + Math.cos(a) * r * .38, cy + Math.sin(a) * r * .38); } x.closePath(); x.fill();
    x.restore();
  }
  /* v1.3 : ballon et chaussure dessinés exactement comme dans FUT 5V5 */
  function drawBall(c, x, y, r) {
    const dark = '#1ed760';
    const pent = (cx, cy, R0) => { c.beginPath(); for (let i = 0; i < 5; i++) { const a = -Math.PI / 2 + i * 2 * Math.PI / 5; i ? c.lineTo(cx + Math.cos(a) * R0, cy + Math.sin(a) * R0) : c.moveTo(cx + Math.cos(a) * R0, cy + Math.sin(a) * R0); } c.closePath(); c.fill(); };
    c.save();
    c.shadowColor = 'rgba(0,0,0,.35)'; c.shadowBlur = r * .4; c.shadowOffsetY = r * .12;
    c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); c.fillStyle = '#ffffff'; c.fill();
    c.shadowColor = 'transparent'; c.lineWidth = r * .13; c.strokeStyle = dark; c.stroke();
    c.beginPath(); c.arc(x, y, r * .94, 0, Math.PI * 2); c.clip();
    c.fillStyle = dark; pent(x, y, r * .36);
    for (let k = 0; k < 5; k++) { const a = -Math.PI / 2 + k * 2 * Math.PI / 5; pent(x + Math.cos(a) * r * .98, y + Math.sin(a) * r * .98, r * .3); }
    c.restore();
  }
  function drawBoot(c, x, y, r) {
    c.save();
    c.shadowColor = 'rgba(0,0,0,.35)'; c.shadowBlur = r * .4; c.shadowOffsetY = r * .12;
    c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); c.fillStyle = '#ffffff'; c.fill();
    c.shadowColor = 'transparent'; c.lineWidth = r * .08; c.strokeStyle = 'rgba(0,0,0,.25)'; c.stroke();
    const k = r / 16.5; c.translate(x, y); c.rotate(.55); c.scale(k, k); c.translate(0, -1);
    c.fillStyle = '#1f8bff'; c.beginPath();
    c.moveTo(-11, -8); c.lineTo(-5.5, -9.5);
    c.quadraticCurveTo(-3.5, -4, 2.5, -3.2); c.quadraticCurveTo(10, -2.6, 12.6, 1.2); c.quadraticCurveTo(13.6, 4.2, 10.8, 4.6);
    c.lineTo(-10, 4.6); c.quadraticCurveTo(-13.2, 4, -12.6, -.5);
    c.closePath(); c.fill();
    c.fillRect(-11, 4.6, 22.5, 2);
    [[-9.2, 2.6], [-4.6, 2.4], [2.2, 2.4], [7.4, 2.4]].forEach(([sx, w]) => { c.beginPath(); c.moveTo(sx, 6.5); c.lineTo(sx + w, 6.5); c.lineTo(sx + w * .5, 9.6); c.closePath(); c.fill(); });
    c.strokeStyle = '#ffffff'; c.lineWidth = 1.1; c.lineCap = 'round';
    [[-3.6, -6.2], [-.9, -4.6], [1.9, -3.6]].forEach(([a, b]) => { c.beginPath(); c.moveTo(a - 1.3, b - 1.5); c.lineTo(a + 1.3, b + 1.5); c.stroke(); });
    c.beginPath(); c.moveTo(-11.5, -1.2); c.quadraticCurveTo(-4, -.4, 4, .4); c.lineWidth = .9; c.strokeStyle = 'rgba(255,255,255,.55)'; c.stroke();
    c.restore();
  }
  /* icônes + « ×N » (à partir de 2) alignées à gauche à partir de px ; renvoie la position x atteinte */
  function iconCount(x, px, cy, r, b, pd, col) {
    x.save(); x.textAlign = 'left'; x.textBaseline = 'middle'; x.font = '800 ' + Math.round(r * 1.5) + 'px ' + FS; x.fillStyle = col || '#FFFFFF';
    [[b, drawBall], [pd, drawBoot]].forEach(([n, f]) => {
      if (!n) return;
      f(x, px + r, cy, r); px += r * 2 + 4;
      if (n > 1) { const t = '×' + n; x.fillText(t, px, cy + r * .06); px += x.measureText(t).width; }
      px += r * .9;
    });
    x.restore(); return px;
  }
  function vsBadge(x, cx, cy, r) {
    x.save(); x.beginPath(); x.arc(cx, cy, r, 0, 7); x.fillStyle = '#2A3242'; x.fill(); x.lineWidth = r * .08; x.strokeStyle = 'rgba(255,255,255,.8)'; x.stroke();
    x.fillStyle = '#FFFFFF'; x.font = '900 ' + Math.round(r * .8) + 'px ' + F9; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText('VS', cx, cy + r * .05); x.restore();
  }
  function pill(x, txt, px, py, bg, fg, size, align) {
    x.save(); x.font = '800 ' + size + 'px ' + FS; const w = x.measureText(txt).width + size * 1.1, h = size * 1.55;
    const left = align === 'right' ? px - w : align === 'center' ? px - w / 2 : px;
    x.fillStyle = bg; rr(x, left, py, w, h, h / 2); x.fill();
    x.fillStyle = fg; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(txt, left + w / 2, py + h / 2 + 1); x.restore();
    return w;
  }
  function header(x, R, label) {
    if (R.club.logoImg) x.drawImage(R.club.logoImg, 56, 52, 104, 104);
    x.fillStyle = '#FFFFFF'; x.textAlign = 'left'; x.textBaseline = 'alphabetic';
    fit(x, R.club.name.toUpperCase(), 560, 46, '800', FS); x.fillText(R.club.name.toUpperCase(), 180, 100);
    x.globalAlpha = .78; x.font = '600 28px ' + FS; x.fillText([R.club.cat, R.date].filter(Boolean).join(' · '), 180, 140); x.globalAlpha = 1;
    pill(x, label, W - 56, 72, 'rgba(255,255,255,.14)', '#FFFFFF', 26, 'right');
  }
  function footer(x, R) {
    x.save(); x.globalAlpha = .7; x.fillStyle = '#FFFFFF'; x.font = '700 26px ' + FS; x.textAlign = 'center';
    if (R.appIcon) x.drawImage(R.appIcon, W / 2 - 150, H - 74, 40, 40);
    x.fillText('DANS LA LUCARNE', W / 2 + 24, H - 44); x.restore();
  }
  function bigTitle(x, txt, cy, size, fill, stroke) {
    x.save(); x.textAlign = 'center'; x.textBaseline = 'alphabetic';
    const s = fit(x, txt, W - 120, size, '900', F9);
    x.shadowColor = 'rgba(0,0,0,.45)'; x.shadowBlur = 24; x.shadowOffsetY = 8;
    if (stroke) { x.lineWidth = s * .06; x.strokeStyle = stroke; x.strokeText(txt, W / 2, cy); }
    x.fillStyle = fill; x.fillText(txt, W / 2, cy); x.restore();
  }
  function card(x, R, px, py, s, rot, cv) {
    const c = cv || (R.me && R.me.card); if (!c) return;
    x.save(); x.translate(px + c.width * s / 2, py + c.height * s / 2); x.rotate(rot || 0);
    x.shadowColor = 'rgba(0,0,0,.55)'; x.shadowBlur = 30; x.shadowOffsetY = 14;
    x.drawImage(c, -c.width * s / 2, -c.height * s / 2, c.width * s, c.height * s); x.restore();
  }
  function scoreRow(x, R, m, cy) {
    if (R.club.logoImg) x.drawImage(R.club.logoImg, 90, cy - 95, 190, 190); else { x.fillStyle = R.club.c1; x.beginPath(); x.arc(185, cy, 95, 0, 7); x.fill(); }
    vsBadge(x, W - 185, cy, 88);
    x.fillStyle = '#FFFFFF'; x.textAlign = 'center'; x.textBaseline = 'middle';
    x.font = '900 210px ' + F9; x.fillText(m.p + '–' + m.c, W / 2, cy + 12);
    x.textBaseline = 'alphabetic'; x.font = '700 32px ' + FS; x.globalAlpha = .9;
    x.fillText(R.club.abbr, 185, cy + 140); fit(x, m.opp.toUpperCase(), 300, 32, '700', FS); x.fillText(m.opp.toUpperCase(), W - 185, cy + 140); x.globalAlpha = 1;
    if (m.tab) { x.font = '700 30px ' + FS; x.fillStyle = '#FFC46B'; x.fillText('tirs au but ' + m.tab, W / 2, cy + 140); }
  }
  /* v1.4 : TOUS les buts du match (1 ou 2 colonnes, lignes plus serrées s'il y en a beaucoup) jusqu'à yMax */
  function goalsList(x, R, y, yMax, title) {
    const gs = R.goals || [];
    if (!gs.length) return y;
    x.fillStyle = 'rgba(255,255,255,.65)'; x.font = '800 26px ' + FS; x.textAlign = 'left'; x.textBaseline = 'alphabetic'; x.fillText(title || 'LES BUTS', 90, y); y += 14;
    const cols = gs.length > 5 ? 2 : 1, rows = Math.ceil(gs.length / cols), colW = cols === 2 ? 440 : 640;
    const rowH = Math.min(56, (yMax - y) / rows), k = Math.max(.55, rowH / 56);
    gs.forEach((g, i) => {
      const c = Math.floor(i / rows), r = i % rows, cx = 90 + c * (colW + 20), by = y + (r + 1) * rowH - rowH * .22;
      drawBall(x, cx + 18 * k, by - 13 * k, 18 * k);
      const minW = 70 * k, nx = cx + 44 * k, avail = colW - (nx - cx) - minW;
      x.textAlign = 'left'; x.fillStyle = g.me ? R.club.c2 : '#FFFFFF';
      fit(x, g.who, g.pass ? avail * .58 : avail, Math.round(38 * k), '800', FS); x.fillText(g.who, nx, by);
      const w = x.measureText(g.who).width;
      if (g.pass) {
        const bx = nx + w + 26 * k; drawBoot(x, bx, by - 12 * k, 15 * k);
        x.fillStyle = 'rgba(255,255,255,.72)'; fit(x, g.pass, cx + colW - minW - (bx + 22 * k), Math.round(30 * k), '600', FS); x.fillText(g.pass, bx + 22 * k, by);
      }
      x.textAlign = 'right'; x.fillStyle = 'rgba(255,255,255,.85)'; x.font = '800 ' + Math.round(36 * k) + 'px ' + F9; x.fillText(g.min + '\'', cx + colW, by);
    });
    return y + rows * rowH;
  }
  function statTiles(x, items, y, h) {
    const n = items.length, gap = 18, w = (W - 120 - gap * (n - 1)) / n;
    items.forEach((it, i) => {
      const px = 60 + i * (w + gap);
      x.fillStyle = 'rgba(255,255,255,.08)'; rr(x, px, y, w, h, 22); x.fill();
      x.textAlign = 'center'; x.fillStyle = it[2] || '#FFFFFF'; x.font = '900 70px ' + F9; x.fillText(String(it[0]), px + w / 2, y + h * .58);
      x.fillStyle = 'rgba(255,255,255,.7)'; x.font = '700 24px ' + FS; x.fillText(it[1].toUpperCase(), px + w / 2, y + h * .86);
    });
  }
  function meBox(x, R, px, py, w, ribbon, ribbonBg, ribbonFg, who) {
    const me = who || R.me; if (!me) return;
    if (ribbon) pill(x, ribbon, px, py, ribbonBg || goldFill(x, py, py + 40), ribbonFg || '#2A1C00', 30);
    x.fillStyle = '#FFFFFF'; x.textAlign = 'left'; fit(x, me.name.toUpperCase(), w, 92, '900', F9); x.fillText(me.name.toUpperCase(), px, py + 140);
    x.font = '700 40px ' + FS; x.fillStyle = R.club.c2;
    if (!me.b && !me.pd) { x.fillText(me.line, px, py + 196); return; }
    /* v1.3 : buts et passes D en icônes (ballon, chaussure, ×N) */
    const end = iconCount(x, px, py + 182, 26, me.b, me.pd, R.club.c2);
    if (me.honneur) { x.textAlign = 'left'; x.font = '700 36px ' + FS; x.fillText('le but de l\'honneur', end + 4, py + 196); }
  }
  const RES_COL = { V: '#4CD08A', N: '#E6E9EF', D: '#FF7A70' };
  /* matchs d'un plateau / tournoi : 1 colonne, ou 2 au-delà de 4 matchs ; hauteur max hMax ; renvoie le bas */
  function matchRows(x, R, px, py, w, rowH, hMax) {
    const ms = R.matches || [], cols = ms.length > 4 ? 2 : 1, rows = Math.ceil(ms.length / cols), gap = 8;
    rowH = Math.min(rowH, (hMax - gap * (rows - 1)) / rows);
    const k = Math.max(.6, rowH / 66), cw = cols === 2 ? (w - 16) / 2 : w;
    ms.forEach((m, i) => {
      const c = Math.floor(i / rows), r = i % rows, X = px + c * (cw + 16), y = py + r * (rowH + gap);
      x.fillStyle = 'rgba(255,255,255,.08)'; rr(x, X, y, cw, rowH, 14 * k); x.fill();
      x.fillStyle = RES_COL[m.res]; rr(x, X, y, 9, rowH, 4); x.fill();
      x.textAlign = 'left'; x.textBaseline = 'middle';
      let tx = X + 24;
      if (m.phase) { x.font = '800 ' + Math.round(22 * k) + 'px ' + FS; const pw = x.measureText(m.phase.toUpperCase()).width + 20 * k; x.fillStyle = 'rgba(255,255,255,.14)'; rr(x, tx, y + rowH / 2 - 16 * k, pw, 32 * k, 16 * k); x.fill(); x.fillStyle = '#FFFFFF'; x.fillText(m.phase.toUpperCase(), tx + 10 * k, y + rowH / 2 + 1); tx += pw + 12; }
      x.fillStyle = '#FFFFFF'; fit(x, 'vs ' + m.opp, X + cw - tx - 110 * k, Math.round(32 * k), '700', FS); x.fillText('vs ' + m.opp, tx, y + rowH / 2 + 1);
      x.textAlign = 'right'; x.fillStyle = RES_COL[m.res]; x.font = '900 ' + Math.round(44 * k) + 'px ' + F9; x.fillText(m.p + '-' + m.c + (m.tab ? '*' : ''), X + cw - 20, y + rowH / 2 + 3);
      x.textBaseline = 'alphabetic';
    });
    return py + rows * rowH + gap * (rows - 1);
  }
  /* v1.4 : buts marqués / encaissés du plateau ou du tournoi */
  function goalsStrip(x, R, y) {
    const w = (W - 140) / 2, h = 66;
    [[R.stats.bp, R.stats.bp > 1 ? 'BUTS MARQUÉS' : 'BUT MARQUÉ', '#4CD08A'], [R.stats.bc, R.stats.bc > 1 ? 'BUTS ENCAISSÉS' : 'BUT ENCAISSÉ', '#FF7A70']].forEach((it, i) => {
      const px = 60 + i * (w + 20);
      x.fillStyle = 'rgba(255,255,255,.08)'; rr(x, px, y, w, h, 18); x.fill();
      x.font = '900 52px ' + F9; const nw = x.measureText(String(it[0])).width; x.font = '800 26px ' + FS; const lw = x.measureText(it[1]).width;
      let cx = px + (w - (44 + nw + 14 + lw)) / 2;
      drawBall(x, cx + 18, y + h / 2, 18); cx += 44;
      x.textAlign = 'left'; x.textBaseline = 'middle'; x.fillStyle = it[2]; x.font = '900 52px ' + F9; x.fillText(String(it[0]), cx, y + h / 2 + 3); cx += nw + 14;
      x.fillStyle = 'rgba(255,255,255,.8)'; x.font = '800 26px ' + FS; x.fillText(it[1], cx, y + h / 2 + 2); x.textBaseline = 'alphabetic';
    });
    return y + h;
  }
  /* largeur des icônes « ballon ×N  chaussure ×N » */
  function iconsWidth(x, r, b, pd) {
    x.font = '800 ' + Math.round(r * 1.5) + 'px ' + FS; let w = 0;
    [b, pd].forEach(n => { if (!n) return; w += r * 2 + 4 + (n > 1 ? x.measureText('×' + n).width : 0) + r * .9; });
    return Math.max(0, w - r * .9);
  }
  /* v1.4 : toute l'équipe, cartes alignées, buts / passes D en dessous (aucun joueur mis plus en avant) */
  function teamRow(x, R, y0, y1) {
    const t = R.team || []; if (!t.length) return;
    const cols = t.length <= 10 ? t.length : Math.ceil(t.length / 2), rows = Math.ceil(t.length / cols), gap = 12;
    const iconH = 40, ratio = 534 / 380;
    let cw = Math.min(150, (W - 100 - gap * (cols - 1)) / cols);
    cw = Math.min(cw, ((y1 - y0 - 40) / rows - iconH) / ratio);
    const ch = cw * ratio;
    y0 += Math.max(0, (y1 - y0 - 40 - rows * (ch + iconH)) / 2);   // bloc centré dans la place libre
    x.fillStyle = 'rgba(255,255,255,.65)'; x.font = '800 26px ' + FS; x.textAlign = 'center'; x.textBaseline = 'alphabetic'; x.fillText('L\'ÉQUIPE', W / 2, y0 + 24);
    y0 += 40;
    t.forEach((p, i) => {
      const r = Math.floor(i / cols), inRow = Math.min(cols, t.length - r * cols), c = i % cols;
      const rowW = inRow * cw + (inRow - 1) * gap, px = (W - rowW) / 2 + c * (cw + gap), py = y0 + r * (ch + iconH);
      x.save(); x.shadowColor = 'rgba(0,0,0,.5)'; x.shadowBlur = 16; x.shadowOffsetY = 6;
      if (p.card && p.card.width) x.drawImage(p.card, px, py, cw, ch); x.restore();
      if (p.star) { x.fillStyle = goldFill(x, py - 14, py + 14); x.beginPath(); x.arc(px + cw - 8, py + 10, 17, 0, 7); x.fill(); x.fillStyle = '#2A1C00'; star(x, px + cw - 8, py + 10, 11); }
      const ir = Math.max(11, Math.min(17, cw * .12)), iw = iconsWidth(x, ir, p.b, p.pd);
      if (iw) iconCount(x, px + (cw - iw) / 2, py + ch + iconH / 2 + 2, ir, p.b, p.pd, '#FFFFFF');
    });
  }
  /* v1.4 : meilleur contributeur du match (le plus de buts + passes D) avec sa carte */
  function bestBox(x, R, py, bg, fg) {
    const b = R.best; if (!b) return;
    card(x, R, 800, py - 40, 1, .06, b.card);
    meBox(x, R, 90, py, 640, 'MEILLEUR CONTRIBUTEUR', bg, fg, b);
  }
  /* ---------- les modèles ---------- */
  const T = {};
  /* titre en tournoi */
  T.champion = (x, R) => {
    background(x, R, 'win');
    rays(x, W / 2, 330, '#F5C542', 28, .10);
    glow(x, W / 2, 330, 360, '#F5C542', .35);
    confetti(x, [R.club.c2, '#F5C542', '#FFFFFF', R.club.c1], 140, 7, 640);
    header(x, R, 'TOURNOI');
    trophy(x, W / 2, 330, 190);
    bigTitle(x, 'VAINQUEUR', 575, 150, goldFill(x, 460, 575), '#3A2800');
    x.fillStyle = '#FFFFFF'; x.textAlign = 'center'; x.font = '700 42px ' + FS; x.fillText(R.title, W / 2, 632);
    statTiles(x, [[R.stats.mj, 'matchs'], [R.stats.v, 'victoires', '#4CD08A'], [R.stats.bp, 'buts marqués', '#4CD08A'], [R.stats.bc, 'encaissés', '#FF7A70']], 662, 116);
    const yb = matchRows(x, R, 60, 796, W - 120, 52, 150);
    teamRow(x, R, yb + 14, 1262);
    footer(x, R);
  };
  /* victoire (match amical, ou match d'un plateau / tournoi partagé seul) */
  T.win = (x, R) => {
    background(x, R, 'win');
    glow(x, W / 2, 480, 460, R.club.c2, .22);
    confetti(x, [R.club.c2, '#FFFFFF', '#4CD08A'], 70, 11, 360);
    header(x, R, R.label);
    bigTitle(x, 'VICTOIRE', 330, 180, R.club.c2, 'rgba(0,0,0,.35)');
    scoreRow(x, R, R.matches[0], 520);
    goalsList(x, R, 750, 1000, 'LES BUTS');
    bestBox(x, R, 1020);
    footer(x, R);
  };
  /* match nul */
  T.draw = (x, R) => {
    background(x, R, 'draw');
    header(x, R, R.label);
    bigTitle(x, 'MATCH NUL', 320, 160, '#FFFFFF');
    x.fillStyle = 'rgba(255,255,255,.75)'; x.font = '600 38px ' + FB; x.textAlign = 'center'; x.fillText(R.quote, W / 2, 390);
    scoreRow(x, R, R.matches[0], 560);
    goalsList(x, R, 790, 1010, 'LES BUTS');
    bestBox(x, R, 1030);
    footer(x, R);
  };
  /* défaite : sobre et encourageant */
  T.loss = (x, R) => {
    background(x, R, 'loss');
    header(x, R, R.label);
    x.textAlign = 'center'; x.fillStyle = 'rgba(255,255,255,.55)'; x.font = '800 40px ' + FS; x.fillText('DÉFAITE', W / 2, 260);
    bigTitle(x, R.quoteTitle, 370, 120, '#FFFFFF');
    x.fillStyle = 'rgba(255,255,255,.72)'; x.font = '600 36px ' + FB; x.fillText(R.quote, W / 2, 435);
    scoreRow(x, R, R.matches[0], 610);
    goalsList(x, R, 840, 1020, 'NOS BUTS');
    if (R.best) bestBox(x, R, 1040, '#FFFFFF', '#0D1118');
    else {
      x.fillStyle = 'rgba(255,255,255,.08)'; rr(x, 90, 1040, W - 180, 150, 24); x.fill();
      x.fillStyle = '#FFFFFF'; x.font = '800 40px ' + FS; x.textAlign = 'center'; x.fillText('PROCHAIN MATCH : ON REMET ÇA !', W / 2, 1130);
    }
    footer(x, R);
  };
  /* bilan d'un plateau (ou d'un tournoi sans titre) */
  T.series = (x, R) => {
    background(x, R, R.stats.v >= R.stats.d ? 'win' : 'loss');
    header(x, R, R.label);
    bigTitle(x, R.headline, 290, 124, '#FFFFFF');
    x.fillStyle = 'rgba(255,255,255,.8)'; x.textAlign = 'center'; x.font = '700 38px ' + FS; x.fillText(R.title, W / 2, 346);
    /* trois pastilles V / N / D */
    [['V', R.stats.v, 'VICTOIRES', '#4CD08A'], ['N', R.stats.n, 'NULS', '#E6E9EF'], ['D', R.stats.d, 'DÉFAITES', '#FF7A70']].forEach((it, i) => {
      const cx = 220 + i * 320;
      x.fillStyle = hexA(it[3], .14); x.beginPath(); x.arc(cx, 448, 74, 0, 7); x.fill();
      x.lineWidth = 6; x.strokeStyle = it[3]; x.stroke();
      x.fillStyle = it[3]; x.font = '900 92px ' + F9; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(String(it[1]), cx, 453); x.textBaseline = 'alphabetic';
      x.fillStyle = 'rgba(255,255,255,.75)'; x.font = '800 24px ' + FS; x.fillText(it[2], cx, 552);
    });
    goalsStrip(x, R, 576);
    const yb = matchRows(x, R, 60, 662, W - 120, 56, 290);
    teamRow(x, R, yb + 14, 1262);
    footer(x, R);
  };

  /* choisit le modèle selon le résultat */
  function pick(R) {
    if (R.kind === 'tournoi' && R.outcome === 'champion') return 'champion';
    if (R.kind !== 'amical') return 'series';
    return R.outcome === 'V' ? 'win' : R.outcome === 'N' ? 'draw' : 'loss';
  }
  function drawRecap(canvas, R) {
    canvas.width = W; canvas.height = H;
    const x = canvas.getContext('2d');
    T[R.template || pick(R)](x, R);
    return canvas;
  }
  window.DLL_RECAP = { drawRecap, pick, W, H };
})();
