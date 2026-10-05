/* Dans la Lucarne : données, synchronisation avec le Google Sheet, outils communs */
'use strict';
const VERSION_APP = '1.0';
const API_URL = ((window.PFT_CONFIG || {}).apiUrl || '').trim();
const TABLES = ['Reglages', 'Saisons', 'Joueurs', 'Rencontres', 'Matchs', 'Buts', 'Images'];

const LS = {
  get(k, d) { try { const v = localStorage.getItem('pft:' + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem('pft:' + k, JSON.stringify(v)); return true; } catch (e) { return false; } },
  del(k) { try { localStorage.removeItem('pft:' + k); } catch (e) {} }
};
const $ = (q, r) => (r || document).querySelector(q);
const $$ = (q, r) => Array.from((r || document).querySelectorAll(q));
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const uid = p => (p || '') + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
const nowIso = () => new Date().toISOString();
const todayIso = () => { const d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };
const num = v => { const n = parseFloat(v); return isNaN(n) ? 0 : n; };
const truthy = v => v === true || v === 'oui' || v === 'true';

/* ---------- base locale (copie du Google Sheet + opérations en attente) ---------- */
let DB = emptyDb();
let SERVER = LS.get('server', null);   // dernière copie reçue du serveur
let OUTBOX = LS.get('outbox', []);
let CODE = LS.get('code', '');
let SYNC = { busy: false, last: LS.get('lastSync', 0), error: '', sheetUrl: LS.get('sheetUrl', '') };

function emptyDb() { const d = {}; TABLES.forEach(t => d[t] = {}); return d; }
function rebuildDb() {
  DB = emptyDb();
  if (SERVER) TABLES.forEach(t => (SERVER[t] || []).forEach(r => { DB[t][r.id] = r; }));
  OUTBOX.forEach(op => applyOp(op));
}
function applyOp(op) {
  if (op.op === 'put') { const cur = DB[op.t][op.row.id] || {}; DB[op.t][op.row.id] = Object.assign({}, cur, op.row); }
  else if (op.op === 'del') delete DB[op.t][op.id];
  else if (op.op === 'img') { DB.Images[op.id] = { id: op.id, type: op.type || '' }; IMG.mem[op.id] = op.data; }
}
/* enregistre des modifications : appliquées tout de suite sur le téléphone, envoyées au Sheet dès que possible */
function commit(ops) {
  ops.forEach(op => {
    applyOp(op);
    if (op.op === 'put') {
      const prev = OUTBOX.find(o => !o.sending && o.op === 'put' && o.t === op.t && o.row.id === op.row.id);
      if (prev) { Object.assign(prev.row, op.row); return; }
      OUTBOX.push({ op: 'put', t: op.t, row: Object.assign({}, op.row) });
    } else if (op.op === 'img') {
      OUTBOX.push({ op: 'img', id: op.id, data: op.data, type: op.type });
      saveImg(op.id, op.data);
    } else OUTBOX.push(op);
  });
  saveOutbox();
  flushSoon(300);
}
const put = (t, row) => ({ op: 'put', t, row });
const del = (t, id) => ({ op: 'del', t, id });
function saveOutbox() { if (!LS.set('outbox', OUTBOX.map(o => Object.assign({}, o, { sending: undefined })))) toast('Mémoire du téléphone pleine : synchronise dès que possible.'); }

async function api(fn, args) {
  if (!API_URL) throw Object.assign(new Error('Adresse du serveur manquante (config.js).'), { noApi: true });
  let r;
  try {
    r = await fetch(API_URL, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify({ fn, args }), redirect: 'follow' });
  } catch (e) { throw Object.assign(new Error('Pas de réseau.'), { offline: true }); }
  let j;
  try { j = await r.json(); } catch (e) { throw new Error('Réponse illisible du serveur.'); }
  if (!j.ok) throw Object.assign(new Error(j.error || 'Erreur du serveur.'), { badCode: j.code === 'CODE' });
  return j.result;
}

let flushTimer = 0;
function flushSoon(ms) { clearTimeout(flushTimer); flushTimer = setTimeout(flush, ms || 0); }
async function flush() {
  if (SYNC.busy || !API_URL || !CODE) return;
  SYNC.busy = true;
  /* lot limité à ~3 Mo pour ne pas dépasser les limites de Google */
  const batch = []; let size = 0;
  for (const o of OUTBOX) { const s = JSON.stringify(o).length; if (batch.length && size + s > 3e6) break; batch.push(o); size += s; }
  batch.forEach(o => o.sending = true);
  try {
    const res = await api('sync', [CODE, batch.map(o => Object.assign({}, o, { sending: undefined }))]);
    OUTBOX = OUTBOX.filter(o => !batch.includes(o));
    SERVER = res.tables; if (res.sheetUrl) { SYNC.sheetUrl = res.sheetUrl; LS.set('sheetUrl', res.sheetUrl); }
    LS.set('server', SERVER); saveOutbox();
    SYNC.last = Date.now(); LS.set('lastSync', SYNC.last); SYNC.error = '';
    rebuildDb();
    SYNC.busy = false;
    if (OUTBOX.length) flushSoon(50); else refresh();
  } catch (e) {
    batch.forEach(o => o.sending = false);
    SYNC.busy = false;
    SYNC.error = e.badCode ? 'Code d\'accès refusé par le serveur.' : e.message;
    refresh();
    if (!e.badCode) flushSoon(20000);
  }
}
/* rafraîchit l'écran sans casser une saisie en cours */
function refresh() {
  const a = document.activeElement;
  if (a && (a.tagName === 'INPUT' || a.tagName === 'SELECT' || a.tagName === 'TEXTAREA')) return;
  if (!$('#sheet').hidden) return;
  render();
}

/* ---------- images : logo et photo, gardées sur le téléphone après le premier chargement ---------- */
const IMG = { mem: {}, el: {}, asking: {} };
function saveImg(id, data) { IMG.mem[id] = data; if (!LS.set('img:' + id, data)) { /* mémoire pleine : on garde en mémoire vive */ } }
function imgData(id) {
  if (!id) return '';
  if (IMG.mem[id]) return IMG.mem[id];
  const d = LS.get('img:' + id, '');
  if (d) { IMG.mem[id] = d; return d; }
  fetchImg(id);
  return '';
}
async function fetchImg(id) {
  if (IMG.asking[id] || !API_URL || !CODE) return;
  IMG.asking[id] = true;
  try { const d = await api('image', [CODE, id]); if (d) { saveImg(id, d); refresh(); } } catch (e) {}
  setTimeout(() => { delete IMG.asking[id]; }, 30000);
}
/* élément <img> chargé (pour dessiner sur les cartes) ; null tant qu'il n'est pas prêt */
function imgEl(id) {
  const d = imgData(id); if (!d) return null;
  const k = id + ':' + d.length;
  let e = IMG.el[k];
  if (!e) { e = IMG.el[k] = new Image(); e.onload = () => paintCards(); e.src = d; }
  return e.complete && e.naturalWidth ? e : null;
}
function loadImage(src) { return new Promise((ok, ko) => { const i = new Image(); i.onload = () => ok(i); i.onerror = ko; i.src = src; }); }
function readFile(file) { return new Promise((ok, ko) => { const r = new FileReader(); r.onload = () => ok(r.result); r.onerror = ko; r.readAsDataURL(file); }); }
function pickFile() {
  return new Promise(ok => {
    const f = $('#filePick'); f.value = '';
    f.onchange = () => ok(f.files && f.files[0] ? f.files[0] : null);
    f.click();
  });
}
/* réduit une photo (JPEG) avant l'envoi */
async function shrinkPhoto(dataUrl, max) {
  const im = await loadImage(dataUrl);
  const k = Math.min(1, max / Math.max(im.naturalWidth, im.naturalHeight));
  const c = document.createElement('canvas'); c.width = Math.round(im.naturalWidth * k); c.height = Math.round(im.naturalHeight * k);
  c.getContext('2d').drawImage(im, 0, 0, c.width, c.height);
  return c.toDataURL('image/jpeg', .86);
}

/* ---------- couleurs ---------- */
const hex2rgb = h => { h = String(h || '').replace('#', ''); if (h.length === 3) h = h.split('').map(x => x + x).join(''); const n = parseInt(h || '0', 16); return [n >> 16 & 255, n >> 8 & 255, n & 255]; };
const rgb2hex = (r, g, b) => '#' + [r, g, b].map(v => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('').toUpperCase();
function lum(h) { const [r, g, b] = hex2rgb(h).map(v => { v /= 255; return v <= .03928 ? v / 12.92 : Math.pow((v + .055) / 1.055, 2.4); }); return .2126 * r + .7152 * g + .0722 * b; }
const onColor = h => lum(h) > .36 ? '#0D1118' : '#FFFFFF';
function applyTheme() {
  const s = curSeason();
  const c1 = (s && s.couleur1) || '#2A4B71', c2 = (s && s.couleur2) || '#E5D52B';
  const st = document.documentElement.style;
  st.setProperty('--c1', c1); st.setProperty('--c2', c2);
  st.setProperty('--on1', onColor(c1)); st.setProperty('--on2', onColor(c2));
  const m = $('meta[name=theme-color]'); if (m) m.content = document.body.classList.contains('neutral') ? '#121315' : c1;
}

/* ---------- accès aux données ---------- */
const rows = t => Object.values(DB[t]);
const reg = k => (DB.Reglages[k] || {}).valeur || '';
const curSeason = () => DB.Saisons[reg('saison')] || null;
const suiviId = () => reg('suivi');
const player = id => DB.Joueurs[id] || null;
const seasons = () => rows('Saisons').sort((a, b) => String(b.debut || '').localeCompare(String(a.debut || '')) || String(b.libelle).localeCompare(String(a.libelle)));
const eventsOf = sid => rows('Rencontres').filter(e => e.saison === sid).sort((a, b) => String(b.date + (b.heure || '')).localeCompare(String(a.date + (a.heure || ''))) || String(b.creeLe).localeCompare(String(a.creeLe)));
const matchesOf = eid => rows('Matchs').filter(m => m.rencontre === eid).sort((a, b) => num(a.ordre) - num(b.ordre));
const goalsOf = mid => rows('Buts').filter(g => g.match === mid).sort((a, b) => num(a.minute) - num(b.minute) || String(a.creeLe).localeCompare(String(b.creeLe)));
const isDone = m => m && m.statut === 'termine';
function roster(sid) {
  const s = DB.Saisons[sid || reg('saison')]; const ids = (s && s.effectif) || [];
  const list = ids.map(player).filter(Boolean);
  const order = { GB: 0, DEF: 1, MIL: 2, ATT: 3 };
  return list.sort((a, b) => (a.id === suiviId() ? -1 : b.id === suiviId() ? 1 : 0) || (order[a.poste] ?? 9) - (order[b.poste] ?? 9) || num(a.numero) - num(b.numero) || String(a.nom).localeCompare(b.nom));
}
function score(m) {
  let p = 0, c = 0; goalsOf(m.id).forEach(g => g.camp === 'eux' ? c++ : p++);
  return { p, c };
}
function result(m) { const s = score(m); return s.p > s.c ? 'V' : s.p < s.c ? 'D' : 'N'; }
function wonKO(m) { const s = score(m); if (s.p !== s.c) return s.p > s.c; return !!(m.tab && num(m.tab.nous) > num(m.tab.eux)); }
const RCLS = { V: 'win', N: 'draw', D: 'loss' };
const inMatch = (m, pid) => !!(m.compo && (m.compo.joueurs || []).includes(pid));

const PHASES = ['Poule', '32e de finale', '16e de finale', '8e de finale', 'Quart de finale', 'Demi-finale', 'Match de classement', 'Finale'];
const PHASE_RANK = { 'Poule': 0, '32e de finale': 1, '16e de finale': 2, '8e de finale': 3, 'Quart de finale': 4, 'Demi-finale': 5, 'Match de classement': 5, 'Finale': 6 };
const isKO = ph => !!ph && ph !== 'Poule';
const phaseBase = ph => String(ph || '').split(' · ')[0];

function eventResult(e) {
  const ms = matchesOf(e.id).filter(isDone);
  if (!ms.length) return { txt: e.statut === 'termine' ? '—' : 'À jouer', cls: '' };
  if (e.type === 'amical') { const m = ms[0], s = score(m); return { txt: s.p + '-' + s.c, cls: RCLS[result(m)], big: true }; }
  if (e.type === 'plateau') {
    const c = { V: 0, N: 0, D: 0 }; ms.forEach(m => c[result(m)]++);
    return { txt: c.V + 'V ' + c.N + 'N ' + c.D + 'D', cls: '', v: c };
  }
  const fin = ms.find(m => phaseBase(m.phase) === 'Finale');
  if (fin) return wonKO(fin) ? { txt: 'Vainqueur', cls: 'gold', rank: 9 } : { txt: 'Finaliste', cls: 'gold', rank: 8 };
  let best = -1, ph = '', bm = null;
  ms.forEach(m => { const b = phaseBase(m.phase); const r = PHASE_RANK[b] ?? 0; if (r > best && b !== 'Match de classement') { best = r; ph = b; bm = m; } });
  if (best <= 0) return { txt: 'Phase de poules', cls: 'gold', rank: 0 };
  /* match à élimination gagné : l'équipe a atteint le tour suivant */
  const NEXT = ['Poule', '16e de finale', '8e de finale', 'Quart de finale', 'Demi-finale', 'Finale', 'Finale'];
  if (bm && wonKO(bm)) return { txt: NEXT[best], cls: 'gold', rank: best + .5 };
  return { txt: ph, cls: 'gold', rank: best };
}

/* statistiques d'une saison (ou de toutes si sid = '*') ; pid = joueur (facultatif) */
function stats(sid, pid) {
  const evs = sid === '*' ? rows('Rencontres') : eventsOf(sid);
  const o = { mj: 0, v: 0, n: 0, d: 0, bp: 0, bc: 0, b: 0, pd: 0, ev: 0, type: { amical: z(), plateau: z(), tournoi: z() } };
  function z() { return { ev: 0, mj: 0, b: 0, pd: 0 }; }
  evs.forEach(e => {
    let counted = false;
    matchesOf(e.id).filter(isDone).forEach(m => {
      if (pid && !inMatch(m, pid)) return;
      const s = score(m), r = result(m), T = o.type[e.type] || o.type.amical;
      o.mj++; T.mj++; o[r.toLowerCase()]++; o.bp += s.p; o.bc += s.c;
      if (!counted) { counted = true; o.ev++; T.ev++; }
      if (pid) goalsOf(m.id).forEach(g => {
        if (g.camp !== 'nous') return;
        if (g.buteur === pid) { o.b++; T.b++; }
        if (g.passeur === pid) { o.pd++; T.pd++; }
      });
    });
  });
  return o;
}
function playerLine(m, pid) {
  let b = 0, pd = 0; goalsOf(m.id).forEach(g => { if (g.camp === 'nous') { if (g.buteur === pid) b++; if (g.passeur === pid) pd++; } });
  return { b, pd };
}
function eventPlayerLine(e, pid) {
  let b = 0, pd = 0; matchesOf(e.id).forEach(m => { const x = playerLine(m, pid); b += x.b; pd += x.pd; }); return { b, pd };
}
function bestTournament(sid) {
  let best = null;
  eventsOf(sid).filter(e => e.type === 'tournoi').forEach(e => { const r = eventResult(e); if (r.rank != null && (!best || r.rank > best.r.rank)) best = { e, r }; });
  return best;
}

/* ---------- textes ---------- */
const TYPE_LBL = { amical: 'Amical', plateau: 'Plateau', tournoi: 'Tournoi' };
const LIEU_LBL = { dom: 'Domicile', ext: 'Extérieur', neutre: 'Terrain neutre' };
function fdate(d, long) {
  if (!d) return '';
  const x = new Date(String(d).slice(0, 10) + 'T12:00:00');
  if (isNaN(x)) return d;
  return x.toLocaleDateString('fr-FR', long ? { weekday: 'short', day: 'numeric', month: 'short' } : { day: 'numeric', month: 'short' });
}
function monthLbl(d) { const x = new Date(String(d).slice(0, 10) + 'T12:00:00'); return isNaN(x) ? '' : x.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' }); }
const pname = id => (player(id) || {}).nom || '?';
const initials = s => String(s || '?').replace(/[^A-Za-zÀ-ÿ0-9 ]/g, '').split(/\s+/).filter(Boolean).map(w => w[0]).join('').slice(0, 3).toUpperCase() || '?';
function evTitle(e) { return e.type === 'amical' ? 'vs ' + (e.titre || '?') : (e.titre || TYPE_LBL[e.type]); }
function matchTitle(m) { const e = DB.Rencontres[m.rencontre] || {}; return 'vs ' + (m.adversaire || e.titre || '?'); }

/* ---------- petites interfaces ---------- */
let toastT = 0;
function toast(msg) { const t = $('#toast'); t.textContent = msg; t.hidden = false; clearTimeout(toastT); toastT = setTimeout(() => t.hidden = true, 2600); }
function openSheet(html) { const s = $('#sheet'); s.innerHTML = '<div class="pan" role="dialog" aria-modal="true"><div class="grab"></div>' + html + '</div>'; s.hidden = false; }
function closeSheet() { const s = $('#sheet'); s.hidden = true; s.innerHTML = ''; render(); }
function confirmBox(title, text, okLbl, danger) {
  return new Promise(ok => {
    openSheet('<h2>' + esc(title) + '</h2><p class="mu" style="font-size:15px">' + esc(text) + '</p><div class="row"><button type="button" class="btn2" id="cfNo">Annuler</button><button type="button" class="' + (danger ? 'btn2 danger' : 'btn') + '" id="cfOk">' + esc(okLbl || 'OK') + '</button></div>');
    $('#cfNo').onclick = () => { $('#sheet').hidden = true; ok(false); render(); };
    $('#cfOk').onclick = () => { $('#sheet').hidden = true; ok(true); };
  });
}

/* icônes (traits) */
const ICON = {
  back: '<svg viewBox="0 0 24 24" class="ic"><path d="M15 5l-7 7 7 7"/></svg>',
  plus: '<svg viewBox="0 0 24 24" class="ic"><path d="M12 5v14M5 12h14"/></svg>',
  edit: '<svg viewBox="0 0 24 24" class="ic"><path d="M4 20h4L19 9l-4-4L4 16z"/></svg>',
  undo: '<svg viewBox="0 0 24 24" class="ic"><path d="M9 14 4 9l5-5"/><path d="M4 9h10a6 6 0 0 1 0 12h-3"/></svg>',
  pause: '<svg viewBox="0 0 24 24" class="ic"><path d="M9 6v12M15 6v12"/></svg>',
  play: '<svg viewBox="0 0 24 24" class="ic"><path d="M8 5l11 7-11 7z"/></svg>',
  share: '<svg viewBox="0 0 24 24" class="ic"><path d="M12 15V3M7 8l5-5 5 5"/><path d="M5 13v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6"/></svg>',
  cam: '<svg viewBox="0 0 24 24" class="ic"><path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/></svg>',
  trash: '<svg viewBox="0 0 24 24" class="ic"><path d="M5 7h14M10 7V4h4v3M7 7l1 13h8l1-13"/></svg>',
  chev: '<svg viewBox="0 0 24 24" class="ic"><path d="M9 6l6 6-6 6"/></svg>',
  dl: '<svg viewBox="0 0 24 24" class="ic"><path d="M12 3v12M7 10l5 5 5-5M5 20h14"/></svg>',
  amical: '<svg viewBox="0 0 24 24" class="ic"><circle cx="12" cy="12" r="9"/><path d="M12 7.5l4 3-1.5 4.5h-5L8 10.5z"/></svg>',
  plateau: '<svg viewBox="0 0 24 24" class="ic"><rect x="4" y="4" width="7" height="7" rx="1.5"/><rect x="13" y="4" width="7" height="7" rx="1.5"/><rect x="4" y="13" width="7" height="7" rx="1.5"/><rect x="13" y="13" width="7" height="7" rx="1.5"/></svg>',
  tournoi: '<svg viewBox="0 0 24 24" class="ic"><path d="M3 5h5v5h5M3 19h5v-5M13 10v4M13 12h8"/></svg>',
  trophy: '<svg viewBox="0 0 24 24" class="ic"><path d="M8 4h8v5a4 4 0 0 1-8 0zM12 13v4M9.5 17h5v4h-5z"/></svg>'
};
