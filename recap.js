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
  function card(x, R, px, py, s, rot) {
    if (!R.me || !R.me.card) return;
    const c = R.me.card; x.save(); x.translate(px + c.width * s / 2, py + c.height * s / 2); x.rotate(rot || 0);
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
  function goalsList(x, R, y, maxRows, title) {
    const gs = R.goals || [];
    if (!gs.length) return y;
    x.fillStyle = 'rgba(255,255,255,.65)'; x.font = '800 26px ' + FS; x.textAlign = 'left'; x.fillText(title || 'LES BUTS', 90, y); y += 22;
    gs.slice(0, maxRows).forEach(g => {
      y += 56;
      ballIcon(x, 108, y - 12, 17, '#0D1118');
      x.fillStyle = g.me ? R.club.c2 : '#FFFFFF'; x.font = '800 38px ' + FS; x.textAlign = 'left';
      x.fillText(g.who, 140, y);
      const w = x.measureText(g.who).width;
      x.fillStyle = 'rgba(255,255,255,.6)'; x.font = '600 30px ' + FS;
      if (g.pass) x.fillText('  passe de ' + g.pass, 140 + w, y);
      x.textAlign = 'right'; x.fillStyle = 'rgba(255,255,255,.85)'; x.font = '800 36px ' + F9; x.fillText(g.min + '\'', W - 90, y);
    });
    return y;
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
  function meBox(x, R, px, py, w, ribbon, ribbonBg, ribbonFg) {
    const me = R.me; if (!me) return;
    if (ribbon) pill(x, ribbon, px, py, ribbonBg || goldFill(x, py, py + 40), ribbonFg || '#2A1C00', 30);
    x.fillStyle = '#FFFFFF'; x.textAlign = 'left'; x.font = '900 92px ' + F9; x.fillText(me.name.toUpperCase(), px, py + 140);
    x.font = '700 40px ' + FS; x.fillStyle = R.club.c2;
    x.fillText(me.line, px, py + 196);
  }
  const RES_COL = { V: '#4CD08A', N: '#E6E9EF', D: '#FF7A70' };
  function matchRows(x, R, px, py, w, rowH, max) {
    (R.matches || []).slice(-max).forEach((m, i) => {
      const y = py + i * (rowH + 10);
      x.fillStyle = 'rgba(255,255,255,.08)'; rr(x, px, y, w, rowH, 16); x.fill();
      x.fillStyle = RES_COL[m.res]; rr(x, px, y, 10, rowH, 5); x.fill();
      x.textAlign = 'left'; x.textBaseline = 'middle';
      let tx = px + 28;
      if (m.phase) { x.font = '800 22px ' + FS; const pw = x.measureText(m.phase.toUpperCase()).width + 22; x.fillStyle = 'rgba(255,255,255,.14)'; rr(x, tx, y + rowH / 2 - 17, pw, 34, 17); x.fill(); x.fillStyle = '#FFFFFF'; x.fillText(m.phase.toUpperCase(), tx + 11, y + rowH / 2 + 1); tx += pw + 14; }
      x.fillStyle = '#FFFFFF'; fit(x, 'vs ' + m.opp, px + w - tx - 150, 32, '700', FS); x.fillText('vs ' + m.opp, tx, y + rowH / 2 + 1);
      x.textAlign = 'right'; x.fillStyle = RES_COL[m.res]; x.font = '900 44px ' + F9; x.fillText(m.p + '-' + m.c + (m.tab ? '*' : ''), px + w - 24, y + rowH / 2 + 3);
      x.textBaseline = 'alphabetic';
    });
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
    card(x, R, 58, 668, .48, -.05);
    if (R.me) meBox(x, R, 360, 676, 660, R.me.ribbon || (R.me.b ? 'BUTEUR' : 'CHAMPION'));
    matchRows(x, R, 360, 900, 660, 50, 3);
    statTiles(x, [[R.stats.mj, 'matchs'], [R.stats.v, 'victoires', '#4CD08A'], [R.stats.bp, 'buts marqués'], [R.stats.bc, 'encaissés']], 1090, 140);
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
    let y = goalsList(x, R, 760, 4, 'LES BUTEURS');
    if (R.me && (R.me.b || R.me.pd)) {
      card(x, R, 770, 985, .42, .07);
      meBox(x, R, 90, Math.max(y + 40, 1000), 560, R.me.b >= 4 ? 'QUADRUPLÉ' : R.me.b === 3 ? 'TRIPLÉ' : R.me.b === 2 ? 'DOUBLÉ' : R.me.b ? 'BUTEUR' : 'PASSEUR DÉCISIF');
    }
    footer(x, R);
  };
  /* match nul */
  T.draw = (x, R) => {
    background(x, R, 'draw');
    header(x, R, R.label);
    bigTitle(x, 'MATCH NUL', 320, 160, '#FFFFFF');
    x.fillStyle = 'rgba(255,255,255,.75)'; x.font = '600 38px ' + FB; x.textAlign = 'center'; x.fillText(R.quote, W / 2, 390);
    scoreRow(x, R, R.matches[0], 560);
    goalsList(x, R, 800, 4, 'LES BUTS');
    if (R.me && (R.me.b || R.me.pd)) { card(x, R, 770, 985, .42, .06); meBox(x, R, 90, 1040, 560, 'DANS LE COUP', '#FFFFFF', '#0D1118'); }
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
    let y = goalsList(x, R, 850, 3, 'NOS BUTS');
    if (R.me && (R.me.b || R.me.pd)) {
      card(x, R, 770, 985, .42, .06);
      meBox(x, R, 90, Math.max(y + 40, 1010), 560, 'LE POINT POSITIF', '#FFFFFF', '#0D1118');
    } else {
      x.fillStyle = 'rgba(255,255,255,.08)'; rr(x, 90, 1040, W - 180, 150, 24); x.fill();
      x.fillStyle = '#FFFFFF'; x.font = '800 40px ' + FS; x.textAlign = 'center'; x.fillText('PROCHAIN MATCH : ON REMET ÇA !', W / 2, 1130);
    }
    footer(x, R);
  };
  /* bilan d'un plateau (ou d'un tournoi sans titre) */
  T.series = (x, R) => {
    background(x, R, R.stats.v >= R.stats.d ? 'win' : 'loss');
    header(x, R, R.label);
    bigTitle(x, R.headline, 300, 130, '#FFFFFF');
    x.fillStyle = 'rgba(255,255,255,.8)'; x.textAlign = 'center'; x.font = '700 40px ' + FS; x.fillText(R.title, W / 2, 362);
    /* trois grosses pastilles V / N / D */
    [['V', R.stats.v, 'VICTOIRES', '#4CD08A'], ['N', R.stats.n, 'NULS', '#E6E9EF'], ['D', R.stats.d, 'DÉFAITES', '#FF7A70']].forEach((it, i) => {
      const cx = 220 + i * 320;
      x.fillStyle = hexA(it[3], .14); x.beginPath(); x.arc(cx, 500, 92, 0, 7); x.fill();
      x.lineWidth = 6; x.strokeStyle = it[3]; x.stroke();
      x.fillStyle = it[3]; x.font = '900 110px ' + F9; x.textBaseline = 'middle'; x.fillText(String(it[1]), cx, 506); x.textBaseline = 'alphabetic';
      x.fillStyle = 'rgba(255,255,255,.75)'; x.font = '800 26px ' + FS; x.fillText(it[2], cx, 630);
    });
    matchRows(x, R, 60, 680, W - 120, 66, 5);
    const yy = 680 + Math.min(5, R.matches.length) * 76 + 30;
    if (R.me && (R.me.b || R.me.pd)) { card(x, R, 760, yy - 10, .4, .06); meBox(x, R, 90, yy, 600, R.me.ribbon || (R.me.b ? 'BUTEUR' : 'PASSEUR DÉCISIF')); }
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
