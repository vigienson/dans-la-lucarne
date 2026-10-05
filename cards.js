/* Dans la Lucarne : dessin des cartes joueurs.
   Même forme, mêmes fonds (« Or » et « En forme ») et même cadre que l'appli FUT 5V5.
   Contenu propre à Dans la Lucarne : numéro, poste, logo du club, photo, nom, et une ligne de statistiques. */
(function () {
  const W = 380, H = 534, OX = 10, OY = 8;
  const PHOTO = { x: 80, y: 30, w: 250, h: 330 };
  const FONT = '"Barlow Condensed","Arial Narrow",sans-serif';

  function cardPath(c) {
    c.beginPath();
    c.moveTo(0, 52);
    c.bezierCurveTo(22, 48, 40, 34, 44, 12);
    c.quadraticCurveTo(180, 4, 316, 12);
    c.bezierCurveTo(320, 34, 338, 48, 360, 52);
    c.lineTo(360, 408);
    c.bezierCurveTo(360, 438, 334, 452, 292, 462);
    c.bezierCurveTo(238, 474, 200, 482, 180, 506);
    c.bezierCurveTo(160, 482, 122, 474, 68, 462);
    c.bezierCurveTo(26, 452, 0, 438, 0, 408);
    c.closePath();
  }
  const THEMES = {
    or: { shadow: '#caa24c', ink: '#21180a', name: '#120d04', lab: '#3d2e0c', val: '#1a1307', sep: 'rgba(95,68,18,.32)', q: 'rgba(92,92,98,.42)' },
    forme: { shadow: '#1a1b1f', ink: '#ffffff', name: '#ffffff', lab: '#d3d8de', val: '#ffffff', sep: 'rgba(255,255,255,.3)', q: 'rgba(205,210,218,.4)' }
  };
  function mulberry(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  function paintGold(c) {
    const g = c.createLinearGradient(0, 0, 360, 510);
    g.addColorStop(0, '#f7e6a6'); g.addColorStop(.35, '#eed383');
    g.addColorStop(.7, '#dfbd63'); g.addColorStop(1, '#c89c43');
    c.fillStyle = g; c.fillRect(0, 0, 360, 510);
    const r = c.createRadialGradient(250, 90, 10, 250, 90, 270);
    r.addColorStop(0, 'rgba(255,249,224,.6)'); r.addColorStop(1, 'rgba(255,249,224,0)');
    c.fillStyle = r; c.fillRect(0, 0, 360, 510);
    [[196, 24, .22], [240, 12, .32], [268, 42, .15], [326, 18, .26], [366, 30, .18]].forEach(function (b) {
      const bx = b[0], bw = b[1], a = b[2];
      const lg = c.createLinearGradient(0, 0, 0, 430);
      lg.addColorStop(0, 'rgba(255,255,255,' + a + ')'); lg.addColorStop(1, 'rgba(255,255,255,0)');
      c.fillStyle = lg; c.beginPath();
      c.moveTo(bx, 0); c.lineTo(bx + bw, 0); c.lineTo(bx + bw - 220, 430); c.lineTo(bx - 220, 430); c.closePath(); c.fill();
    });
  }
  function brush(c, rnd, x0, y0, x1, y1, w, rgb) {
    const dx = x1 - x0, dy = y1 - y0, L = Math.hypot(dx, dy) || 1, nx = -dy / L, ny = dx / L;
    c.lineCap = 'round';
    for (let i = 0; i < 34; i++) {
      const o = (rnd() - .5) * w, s = rnd() * .18, e = .78 + rnd() * .22, bend = (rnd() - .5) * w * .5;
      const ax = x0 + dx * s + nx * o, ay = y0 + dy * s + ny * o, bx = x0 + dx * e + nx * o, by = y0 + dy * e + ny * o;
      c.strokeStyle = 'rgba(' + rgb + ',' + (.25 + rnd() * .65).toFixed(2) + ')'; c.lineWidth = .8 + rnd() * 4;
      c.beginPath(); c.moveTo(ax, ay); c.quadraticCurveTo((ax + bx) / 2 + nx * bend, (ay + by) / 2 + ny * bend, bx, by); c.stroke();
    }
    for (let i = 0; i < 12; i++) {
      const t = rnd(), o = (rnd() - .5) * w * 1.7;
      c.fillStyle = 'rgba(' + rgb + ',' + (.3 + rnd() * .5).toFixed(2) + ')';
      c.beginPath(); c.arc(x0 + dx * t + nx * o, y0 + dy * t + ny * o, .6 + rnd() * 2.4, 0, Math.PI * 2); c.fill();
    }
  }
  function paintForme(c) {
    const g = c.createLinearGradient(0, 0, 360, 510);
    g.addColorStop(0, '#3a3c43'); g.addColorStop(.45, '#222429'); g.addColorStop(1, '#111215');
    c.fillStyle = g; c.fillRect(0, 0, 360, 510);
    const r = c.createRadialGradient(210, 150, 10, 210, 150, 280);
    r.addColorStop(0, 'rgba(120,126,138,.35)'); r.addColorStop(1, 'rgba(120,126,138,0)');
    c.fillStyle = r; c.fillRect(0, 0, 360, 510);
    const rnd = mulberry(11);
    [[[250, 95], [340, 60], [305, 190]], [[285, 205], [372, 165], [372, 300]], [[215, 40], [275, 20], [250, 120]], [[300, 120], [372, 100], [330, 215]], [[-5, 150], [60, 120], [30, 230]]].forEach(function (pts) {
      c.beginPath(); pts.forEach(function (p, i) { i ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1]); }); c.closePath();
      c.fillStyle = 'rgba(215,224,232,' + (.07 + rnd() * .14).toFixed(2) + ')'; c.fill();
      c.strokeStyle = 'rgba(255,255,255,.28)'; c.lineWidth = .8; c.stroke();
    });
    brush(c, rnd, 10, 95, 175, 20, 38, '200,24,44');
    brush(c, rnd, 230, 40, 372, 190, 46, '200,24,44');
    brush(c, rnd, 215, 8, 335, 112, 22, '240,240,242');
    brush(c, rnd, -10, 330, 120, 262, 34, '200,24,44');
    brush(c, rnd, -10, 292, 62, 256, 14, '240,240,242');
    brush(c, rnd, 272, 302, 372, 250, 26, '150,16,30');
    for (let i = 0; i < 70; i++) {
      c.fillStyle = (rnd() < .5 ? 'rgba(255,255,255,' : 'rgba(220,40,60,') + (rnd() * .55).toFixed(2) + ')';
      c.beginPath(); c.arc(rnd() * 360, rnd() * 360, .4 + rnd() * 1.6, 0, Math.PI * 2); c.fill();
    }
    const v = c.createLinearGradient(0, 330, 0, 510);
    v.addColorStop(0, 'rgba(8,8,10,0)'); v.addColorStop(1, 'rgba(8,8,10,.6)');
    c.fillStyle = v; c.fillRect(0, 330, 360, 180);
  }
  function iceFrame(c) {
    const fg = c.createLinearGradient(0, 0, 360, 510);
    fg.addColorStop(0, '#ffffff'); fg.addColorStop(.3, '#aeb8c2'); fg.addColorStop(.5, '#eef3f7'); fg.addColorStop(.75, '#8e99a4'); fg.addColorStop(1, '#f4f7fa');
    const spikes = [];
    for (let y = 78; y <= 392; y += 52) { spikes.push([[0, y], [-7, y + 9], [0, y + 19]]); spikes.push([[360, y + 14], [367, y + 23], [360, y + 33]]); }
    for (let x = 74; x <= 270; x += 64) spikes.push([[x, 10], [x + 9, 1], [x + 20, 9]]);
    spikes.push([[36, 20], [30, 4], [50, 12]], [[324, 20], [330, 4], [310, 12]], [[20, 40], [4, 36], [16, 52]], [[340, 40], [356, 36], [344, 52]]);
    spikes.push([[150, 478], [160, 492], [168, 480]], [[210, 480], [200, 492], [192, 478]]);
    spikes.forEach(function (pts) {
      c.beginPath(); pts.forEach(function (p, i) { i ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1]); }); c.closePath();
      c.fillStyle = fg; c.fill(); c.strokeStyle = 'rgba(255,255,255,.85)'; c.lineWidth = .8; c.stroke();
    });
    cardPath(c); c.lineWidth = 5.5; c.strokeStyle = fg; c.stroke();
    cardPath(c); c.lineWidth = 1.2; c.strokeStyle = 'rgba(60,70,80,.6)'; c.stroke();
  }
  function silhouette(c, T) {
    c.save(); c.fillStyle = T.q;
    c.beginPath(); c.arc(205, 140, 58, 0, Math.PI * 2); c.fill();
    c.beginPath(); c.moveTo(95, 372); c.bezierCurveTo(100, 268, 150, 214, 205, 214); c.bezierCurveTo(260, 214, 310, 268, 315, 372); c.closePath(); c.fill();
    c.restore();
  }
  function drawPhoto(c, p, s) {
    const im = p.photoImg;
    if (!im) { silhouette(c, THEMES[p.fond] || THEMES.or); return; }
    const x = PHOTO.x, y = PHOTO.y, w = PHOTO.w, h = PHOTO.h;
    const oc = document.createElement('canvas');
    oc.width = Math.max(1, Math.ceil(w * s)); oc.height = Math.max(1, Math.ceil(h * s));
    const o = oc.getContext('2d'); o.scale(s, s);
    const iw = im.naturalWidth || im.width, ih = im.naturalHeight || im.height;
    const cad = p.cadre || {};
    const zoom = +cad.zoom || 1, ox = +cad.ox || 0, oy = +cad.oy || 0;
    const sc = Math.max(w / iw, h / ih) * zoom;
    const dw = iw * sc, dh = ih * sc;
    o.imageSmoothingQuality = 'high';
    o.drawImage(im, (w - dw) / 2 + ox, (h - dh) / 2 + oy, dw, dh);
    o.globalCompositeOperation = 'destination-in';
    const v = o.createLinearGradient(0, 0, 0, h);
    v.addColorStop(0, 'rgba(0,0,0,.2)'); v.addColorStop(.1, 'rgba(0,0,0,1)');
    v.addColorStop(.72, 'rgba(0,0,0,1)'); v.addColorStop(1, 'rgba(0,0,0,0)');
    o.fillStyle = v; o.fillRect(0, 0, w, h);
    const hz = o.createLinearGradient(0, 0, w, 0);
    hz.addColorStop(0, 'rgba(0,0,0,0)'); hz.addColorStop(.17, 'rgba(0,0,0,1)');
    hz.addColorStop(.83, 'rgba(0,0,0,1)'); hz.addColorStop(1, 'rgba(0,0,0,0)');
    o.fillStyle = hz; o.fillRect(0, 0, w, h);
    c.drawImage(oc, x, y, w, h);
  }

  /* réduction d'image de bonne qualité (par moitiés successives), gardée en mémoire par taille */
  const HQ = new Map();
  function hq(img, px) {
    px = Math.max(8, Math.round(px));
    const k = (img.src || '').length + ':' + (img.src || '').slice(-32) + ':' + px;
    let out = HQ.get(k); if (out) return out;
    let src = img, w = img.naturalWidth || img.width, h = img.naturalHeight || img.height;
    const ratio = h / w;
    while (w / 2 >= px) {
      const t = document.createElement('canvas'); t.width = Math.round(w / 2); t.height = Math.round(w / 2 * ratio);
      const x = t.getContext('2d'); x.imageSmoothingEnabled = true; x.imageSmoothingQuality = 'high'; x.drawImage(src, 0, 0, t.width, t.height);
      src = t; w = t.width;
    }
    out = document.createElement('canvas'); out.width = px; out.height = Math.round(px * ratio);
    const o = out.getContext('2d'); o.imageSmoothingEnabled = true; o.imageSmoothingQuality = 'high'; o.drawImage(src, 0, 0, out.width, out.height);
    HQ.set(k, out); if (HQ.size > 40) HQ.delete(HQ.keys().next().value);
    return out;
  }
  /* p = { nom, numero, poste, fond:'or'|'forme', photoImg, cadre:{zoom,ox,oy}, logoImg, stats:[[libellé, valeur],…] } */
  function drawCard(canvas, p, s) {
    const T = THEMES[p.fond] || THEMES.or;
    canvas.width = Math.round(W * s); canvas.height = Math.round(H * s);
    const c = canvas.getContext('2d');
    c.setTransform(s, 0, 0, s, 0, 0); c.clearRect(0, 0, W, H); c.translate(OX, OY);

    c.save(); cardPath(c);
    c.shadowColor = 'rgba(8,14,40,.38)'; c.shadowBlur = 16; c.shadowOffsetY = 6;
    c.fillStyle = T.shadow; c.fill(); c.restore();

    c.save(); cardPath(c); c.clip();
    if (p.fond === 'forme') paintForme(c); else paintGold(c);
    drawPhoto(c, p, s);
    c.strokeStyle = T.sep; c.lineWidth = 1;
    c.beginPath(); c.moveTo(60, 383); c.lineTo(300, 383); c.stroke();
    c.restore();

    c.save(); c.translate(180, 258); c.scale(.955, .965); c.translate(-180, -258); cardPath(c); c.restore();
    if (p.fond === 'forme') {
      c.lineWidth = 1.2; c.strokeStyle = 'rgba(255,255,255,.35)'; c.stroke();
      iceFrame(c);
    } else {
      c.lineWidth = 1.5; c.strokeStyle = 'rgba(122,88,22,.55)'; c.stroke();
      cardPath(c); c.lineWidth = 2; c.strokeStyle = 'rgba(150,110,36,.85)'; c.stroke();
    }

    /* colonne de gauche : numéro, poste, logo du club */
    c.fillStyle = T.ink; c.textAlign = 'center'; c.textBaseline = 'alphabetic';
    const num = String(p.numero == null ? '' : p.numero);
    c.font = '800 ' + (num.length > 2 ? 64 : 84) + 'px ' + FONT; c.fillText(num, 74, 116);
    c.font = '700 28px ' + FONT; c.fillText(String(p.poste || '').toUpperCase(), 74, 150);
    if (p.logoImg) {
      try { c.drawImage(hq(p.logoImg, 54 * s), 47, 164, 54, 54); } catch (e) {}
    }

    const name = (p.nom || '').trim() || 'Joueur';
    let size = 40; c.textAlign = 'center'; c.font = '700 ' + size + 'px ' + FONT;
    while (c.measureText(name).width > 290 && size > 16) { size--; c.font = '700 ' + size + 'px ' + FONT; }
    c.fillStyle = T.name; c.fillText(name, 180, 371);

    const row = p.stats || [];
    if (row.length) {
      const cw = 270 / row.length;
      row.forEach(function (it, i) {
        const cx = 45 + cw * (i + .5);
        c.font = '600 19px ' + FONT; c.fillStyle = T.lab; c.fillText(String(it[0]), cx, 408);
        c.font = '800 33px ' + FONT; c.fillStyle = T.val; c.fillText(String(it[1]), cx, 442);
      });
    }
  }

  window.PFT_CARDS = { drawCard: drawCard, W: W, H: H, PHOTO: PHOTO, OX: OX, OY: OY };
})();
