/* Dans la Lucarne : navigation, accueil, rencontres, matchs, composition, direct */
'use strict';
let NAV = [{ s: 'home', p: {} }];
const cur = () => NAV[NAV.length - 1];
function go(s, p, opt) {
  opt = opt || {};
  if (opt.replace) NAV[NAV.length - 1] = { s, p: p || {} };
  else { NAV.push({ s, p: p || {} }); try { history.pushState({ n: NAV.length }, ''); } catch (e) {} }
  render(); window.scrollTo(0, 0);
}
function back() { if (NAV.length > 1) history.back(); else go('home', {}, { replace: true }); }
function tab(s) { NAV = [{ s, p: {} }]; render(); window.scrollTo(0, 0); }
window.addEventListener('popstate', () => {
  const sh = $('#sheet'); if (!sh.hidden) { sh.hidden = true; sh.innerHTML = ''; }
  if (NAV.length > 1) { NAV.pop(); render(); }
});

const SCREENS = {}, ACT = {};
let LIVE_T = 0;
function isConfigured() { return !!curSeason() && (!!CODE || !API_URL); }
function render() {
  clearInterval(LIVE_T);
  if (!isConfigured() && cur().s !== 'setup') NAV = [{ s: 'setup', p: {} }];
  const c = cur();
  const fn = SCREENS[c.s] || SCREENS.home;
  let r;
  try { r = fn(c.p || {}); } catch (e) { console.error(e); r = { html: '<div class="main"><div class="empty">Écran indisponible : ' + esc(e.message) + '</div><button class="btn2" data-a="home">Retour à l\'accueil</button></div>', tab: 'home' }; }
  document.body.classList.toggle('neutral', !!r.neutral);
  document.body.classList.toggle('notabs', !r.tab);
  applyTheme();
  $('#view').innerHTML = (r.neutral ? '' : netBanner()) + r.html;
  $$('#tabs [data-tab]').forEach(b => b.classList.toggle('on', b.dataset.tab === r.tab));
  paintCards();
  if (typeof paintRecaps === 'function') paintRecaps();
  if (r.after) r.after();
}
function netBanner() {
  if (!API_URL) return '<div class="netbar" id="netbar">Mode local : l\'adresse du serveur n\'est pas renseignée dans config.js.</div>';
  if (SYNC.error && OUTBOX.length) return '<div class="netbar" id="netbar">' + OUTBOX.length + ' modification(s) en attente · envoi automatique dès que le réseau revient</div>';
  return '<div id="netbar" hidden></div>';
}
document.addEventListener('click', e => {
  const t = e.target.closest('[data-tab]'); if (t) { tab(t.dataset.tab); return; }
  const a = e.target.closest('[data-a]'); if (!a) return;
  const f = ACT[a.dataset.a]; if (f) { e.preventDefault(); f(a, a.dataset); }
});
ACT.back = () => back();
ACT.home = () => tab('home');
ACT.go = (el, d) => go(d.s, JSON.parse(d.p || '{}'));

/* ---------- cartes ---------- */
function cardCv(pid, s, withStats, extra) {
  return '<canvas class="card-cv" data-pid="' + esc(pid) + '" data-s="' + s + '"' + (withStats ? ' data-st="1"' : '') + ' style="width:' + Math.round(PFT_CARDS.W * s) + 'px;height:' + Math.round(PFT_CARDS.H * s) + 'px' + (extra || '') + '" aria-label="Carte de ' + esc(pname(pid)) + '"></canvas>';
}
function cardData(pid, withStats, sid) {
  const p = player(pid) || {}, me = pid === suiviId(), S = curSeason() || {};
  const d = { nom: p.nom, numero: p.numero, poste: p.poste, fond: me ? 'forme' : 'or', photoImg: me ? imgEl(p.photo) : null, cadre: p.photoCadre, logoImg: imgEl(S.logo) };
  if (withStats) { const st = stats(sid || S.id, pid); d.stats = [['MJ', st.mj], ['BUTS', st.b], ['PASSES D', st.pd]]; }
  d._k = JSON.stringify([d.nom, d.numero, d.poste, d.fond, me && p.photo, !!d.photoImg, d.cadre, S.logo, !!d.logoImg, d.stats]);
  return d;
}
/* les cartes déjà dessinées sont gardées en mémoire : on ne les redessine que si leur contenu change */
const CARD_CACHE = new Map();
function paintCards() {
  const dpr = Math.min(3, Math.max(1, window.devicePixelRatio || 1));
  $$('canvas.card-cv').forEach(cv => {
    const s = +cv.dataset.s, d = cardData(cv.dataset.pid, !!cv.dataset.st), k = d._k + '|' + s * dpr;
    let c = CARD_CACHE.get(k);
    try {
      if (!c) { c = document.createElement('canvas'); PFT_CARDS.drawCard(c, d, s * dpr); CARD_CACHE.set(k, c); if (CARD_CACHE.size > 80) CARD_CACHE.delete(CARD_CACHE.keys().next().value); }
      if (cv._k === k) return;
      cv.width = c.width; cv.height = c.height; cv.getContext('2d').drawImage(c, 0, 0); cv._k = k;
    } catch (e) {}
  });
}
if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => paintCards());

/* ---------- morceaux communs ---------- */
function topBar(title, sub, opt) {
  opt = opt || {};
  const S = curSeason() || {}, logo = imgData(S.logo);
  return '<header class="top">' + (opt.back ? '<button type="button" class="ib" data-a="back" aria-label="Retour">' + ICON.back + '</button>' : (logo && opt.logo !== false ? '<img class="logo" src="' + logo + '" alt="">' : '')) +
    '<div class="grow"><h1>' + esc(title) + '</h1>' + (sub ? '<p class="sub">' + esc(sub) + '</p>' : '') + '</div>' + (opt.right || '') + '</header>';
}
const typeBadge = t => '<span class="badge t-' + t + '">' + TYPE_LBL[t] + '</span>';
const typeIcon = t => '<span class="bi t-' + t + '">' + ICON[t] + '</span>';
function evItem(e) {
  const r = eventResult(e), ms = matchesOf(e.id), pid = suiviId(), pl = eventPlayerLine(e, pid);
  const live = e.statut !== 'termine';
  const sub = fdate(e.date) + ' · à ' + (e.format || '8') + (e.type === 'amical' ? '' : ' · ' + ms.length + ' match' + (ms.length > 1 ? 's' : ''));
  const right = live ? '<span style="font-weight:700;font-size:13px;color:var(--c2)">En cours</span>' :
    r.big ? '<span class="cd ' + r.cls + '" style="font-size:20px">' + r.txt + '</span>' :
      r.v ? '<span class="cd" style="font-size:17px">' + vnd(r.v.V, r.v.N, r.v.D) + '</span>' :
        '<span style="font-weight:700;font-size:14px;color:#FFC46B">' + esc(r.txt) + '</span>';
  const pls = pl.b || pl.pd ? esc(pname(pid)) + ' : ' + bpLine(pl.b, pl.pd) : '';
  return '<button type="button" class="it' + (live ? ' live' : '') + '" data-a="openEvent" data-id="' + e.id + '">' + typeIcon(e.type) +
    '<div class="grow"><div class="t1">' + esc(evTitle(e)) + '</div><p class="mu">' + esc(sub) + '</p></div><div class="res">' + right + (pls ? '<span class="mu">' + pls + '</span>' : '') + '</div></button>';
}
ACT.openEvent = (el, d) => {
  const e = DB.Rencontres[d.id]; if (!e) return;
  if (e.type === 'amical') {
    const m = matchesOf(e.id)[0];
    if (!m) return go('event', { eid: e.id });
    if (m.statut === 'prevu') return go('compo', { mid: m.id });
    if (m.statut === 'en_cours') return go('live', { mid: m.id });
    return go('match', { mid: m.id });
  }
  go('event', { eid: e.id });
};

/* ---------- accueil ---------- */
SCREENS.home = () => {
  const S = curSeason(), pid = suiviId(), p = player(pid) || {};
  const st = stats(S.id, pid);
  const evs = eventsOf(S.id), live = evs.filter(e => e.statut !== 'termine');
  let h = topBar(S.club || 'Mon club', [S.categorie, 'Saison ' + (S.libelle || '')].filter(Boolean).join(' · '));
  h += '<div class="main">';
  h += '<button type="button" class="card" data-a="go" data-s="fiche" data-p=\'{"pid":"' + esc(pid) + '"}\' style="flex-direction:row;align-items:center;gap:14px;border:0;text-align:left;color:inherit">' + cardCv(pid, .19) +
    '<div style="flex:1"><p class="lbl">Ma saison</p><div class="cd" style="font-size:24px">' + esc(p.nom || '') + (p.numero ? ' · n°' + esc(p.numero) : '') + '</div><p class="mu">' + esc(posteLbl(p.poste)) + ' · voir sa fiche</p></div></button>';
  h += statBoard('Saison ' + (S.libelle || '') + ' de ' + (p.nom || ''), [['pitch', st.mj, plural(st.mj, 'match', 'matchs').replace(/^\d+ /, '')], ['ball', st.b, 'buts', 'var(--c2)'], ['boot', st.pd, 'passes D'], ['star', st.v, 'victoires', 'var(--win)']]);
  h += '<button type="button" class="newbig" data-a="newPick"><span class="plus">' + ICON.plus + '</span><span><b>Nouvelle rencontre</b><small>Match amical · Plateau · Tournoi</small></span></button>';
  live.forEach(e => {
    const ms = matchesOf(e.id), r = eventResult(e), lm = ms.find(m => m.statut === 'en_cours');
    const txt = e.type === 'amical' ? (lm ? 'Match en cours' : 'À jouer') : 'En cours · ' + ms.length + ' match' + (ms.length > 1 ? 's' : '') + (r.v ? ' · ' + r.txt : r.rank != null ? ' · ' + r.txt : '');
    h += '<button type="button" class="card" data-a="openEvent" data-id="' + e.id + '" style="flex-direction:row;align-items:center;border:1px solid var(--c2);color:inherit;text-align:left"><span class="dot"></span><div style="flex:1"><div style="font-weight:700">' + esc(evTitle(e)) + '</div><p class="mu">' + (r.v ? esc(txt.split(' · ').slice(0, 2).join(' · ')) + ' · ' + vnd(r.v.V, r.v.N, r.v.D) : esc(txt)) + '</p></div><span style="color:var(--c2);font-weight:700">Reprendre</span></button>';
  });
  const recent = evs.filter(e => e.statut === 'termine').slice(0, 3);
  if (recent.length) h += '<p class="lbl">Dernières rencontres</p>' + recent.map(evItem).join('');
  else if (!live.length) h += '<div class="empty">Aucune rencontre pour l\'instant.<br>Crée la première avec le bouton « Nouvelle rencontre ».</div>';
  h += '</div>';
  return { html: h, tab: 'home' };
};
/* bilan d'une série de matchs : matchs, buts marqués, buts encaissés, puis V / N / D en couleurs */
function summaryBoard(o) {
  return '<div class="sboard">' + '<div class="sgrid" style="grid-template-columns:repeat(3,minmax(0,1fr))">' +
    '<div class="si"><span class="sic">' + ICON.pitch + '</span><b>' + o.mj + '</b><span>match' + (o.mj > 1 ? 's' : '') + '</span></div>' +
    '<div class="si"><span class="sic" style="color:var(--win)">' + ICON.ball + '</span><b style="color:var(--win)">' + o.bp + '</b><span>buts marqués</span></div>' +
    '<div class="si"><span class="sic" style="color:var(--loss)">' + ICON.ball + '</span><b style="color:var(--loss)">' + o.bc + '</b><span>buts encaissés</span></div></div>' +
    '<div class="vndrow"><div><b class="win">' + o.v + '</b><span>victoire' + (o.v > 1 ? 's' : '') + '</span></div><div><b class="draw">' + o.n + '</b><span>nul' + (o.n > 1 ? 's' : '') + '</span></div><div><b class="loss">' + o.d + '</b><span>défaite' + (o.d > 1 ? 's' : '') + '</span></div></div></div>';
}
/* tableau de statistiques avec icônes : items = [[icône, valeur, libellé, couleur], …] */
function statBoard(title, items) {
  return '<div class="sboard">' + (title ? '<p class="lbl">' + esc(title) + '</p>' : '') + '<div class="sgrid" style="grid-template-columns:repeat(' + items.length + ',minmax(0,1fr))">' +
    items.map(x => '<div class="si"><span class="sic"' + (x[3] ? ' style="color:' + x[3] + '"' : '') + '>' + ICON[x[0]] + '</span><b' + (x[3] ? ' style="color:' + x[3] + '"' : '') + '>' + x[1] + '</b><span>' + x[2] + '</span></div>').join('') + '</div></div>';
}
ACT.newPick = () => {
  openSheet('<h2>Nouvelle rencontre</h2><p class="mu">Quel type de rencontre ?</p><div class="pick3">' +
    [['amical', 'Match amical', 'Un seul match contre un adversaire'], ['plateau', 'Plateau', 'Plusieurs matchs dans la journée'], ['tournoi', 'Tournoi', 'Poules puis phases finales']].map(x =>
      '<button type="button" data-a="newGo" data-t="' + x[0] + '"><span class="bi t-' + x[0] + '">' + ICON[x[0]] + '</span><span style="flex:1;text-align:left"><b>' + x[1] + '</b><small>' + x[2] + '</small></span>' + ICON.chev + '</button>').join('') +
    '</div><button type="button" class="btn2" data-a="sheetClose">Annuler</button>');
};
ACT.newGo = (el, d) => { const s = $('#sheet'); s.hidden = true; s.innerHTML = ''; go('new', { type: d.t }); };
const POSTES = { GB: 'Gardien', DEF: 'Défenseur', MIL: 'Milieu', ATT: 'Attaquant' };
const posteLbl = p => POSTES[p] || p || '';

/* ---------- liste des rencontres ---------- */
SCREENS.list = p => {
  const ss = seasons(), sid = p.sid || reg('saison'), f = p.f || 'all', S = DB.Saisons[sid] || curSeason();
  const evs = eventsOf(sid).filter(e => f === 'all' || e.type === f);
  let h = topBar('Rencontres', 'Saison ' + (S.libelle || ''));
  h += '<div class="main">';
  if (ss.length > 1) h += '<div class="scroll-x">' + ss.map(s => '<button type="button" class="chip' + (s.id === sid ? ' on' : '') + '" data-a="listSeason" data-id="' + s.id + '">' + esc(s.libelle) + '</button>').join('') + '</div>';
  h += '<div class="scroll-x" role="group" aria-label="Filtrer">' + [['all', 'Tous'], ['amical', 'Amicaux'], ['plateau', 'Plateaux'], ['tournoi', 'Tournois']].map(x =>
    '<button type="button" class="chip' + (f === x[0] ? ' on' : '') + '" data-a="listFilter" data-f="' + x[0] + '">' + (x[0] !== 'all' ? ICON[x[0]] : '') + x[1] + '</button>').join('') + '</div>';
  let o = { v: 0, n: 0, d: 0, bp: 0, bc: 0, mj: 0 };
  evs.forEach(e => matchesOf(e.id).filter(isDone).forEach(m => { const s = score(m); o.mj++; o[result(m).toLowerCase()]++; o.bp += s.p; o.bc += s.c; }));
  h += summaryBoard(o);
  if (!evs.length) h += '<div class="empty">Aucune rencontre' + (f !== 'all' ? ' de ce type' : '') + ' sur cette saison.</div>';
  let month = '';
  evs.forEach(e => { const mo = monthLbl(e.date); if (mo !== month) { month = mo; h += '<p class="lbl">' + esc(mo) + '</p>'; } h += evItem(e); });
  h += '</div>';
  return { html: h, tab: 'list' };
};
ACT.listSeason = (el, d) => { cur().p.sid = d.id; render(); };
ACT.listFilter = (el, d) => { cur().p.f = d.f; render(); };

/* ---------- nouvelle rencontre ---------- */
SCREENS.new = p => {
  const f = p.f || (p.f = { date: todayIso(), heure: '', lieu: 'dom', format: LS.get('lastFormat', '8'), mtMin: LS.get('lastMtMin', ''), mtN: LS.get('lastMtN', '2'), titre: '', tab: true });
  const t = p.type || 'amical';
  let h = topBar('Nouvelle rencontre', TYPE_LBL[t], { back: true });
  h += '<div class="main">';
  h += '<div class="seg" role="group" aria-label="Type de rencontre">' + ['amical', 'plateau', 'tournoi'].map(x => '<button type="button" class="' + (x === t ? 'on' : '') + '" data-a="newType" data-t="' + x + '">' + TYPE_LBL[x] + '</button>').join('') + '</div>';
  h += '<div class="field"><label for="nTitre">' + (t === 'amical' ? 'Équipe adverse' : t === 'plateau' ? 'Titre du plateau' : 'Titre du tournoi') + '</label><input id="nTitre" class="inp" name="titre" value="' + esc(f.titre) + '" placeholder="' + (t === 'amical' ? 'ex. US Plaine' : t === 'plateau' ? 'ex. Plateau de Rivière' : 'ex. Tournoi d\'automne') + '" autocomplete="off"></div>';
  h += '<div class="row"><div class="field" style="flex:1"><label for="nDate">Date</label><input id="nDate" type="date" class="inp" name="date" value="' + esc(f.date) + '"></div><div class="field" style="flex:1"><label for="nHeure">Heure</label><input id="nHeure" type="time" class="inp" name="heure" value="' + esc(f.heure) + '"></div></div>';
  h += '<div class="field"><span class="flab">Lieu</span><div class="chips">' + Object.keys(LIEU_LBL).map(k => '<button type="button" class="chip' + (f.lieu === k ? ' on' : '') + '" data-a="newLieu" data-k="' + k + '">' + LIEU_LBL[k] + '</button>').join('') + '</div></div>';
  h += '<div class="field"><span class="flab">Format de jeu</span><div class="row">' + [['5', 'futsal, U7-U9'], ['8', 'U10-U13'], ['11', 'grand terrain']].map(x => '<button type="button" class="fmt' + (f.format === x[0] ? ' on' : '') + '" data-a="newFmt" data-k="' + x[0] + '"><b>à ' + x[0] + '</b><span>' + x[1] + '</span></button>').join('') + '</div></div>';
  h += '<div class="row" style="align-items:flex-end"><div class="field" style="flex:1"><label for="nMt">Durée d\'une mi-temps</label><div class="row" style="gap:8px"><input id="nMt" class="inp" name="mtMin" type="number" inputmode="numeric" min="1" max="60" value="' + esc(f.mtMin) + '" placeholder="ex. 25" style="width:90px"><span class="mu">minutes</span></div></div>' +
    '<div class="field"><span class="flab">Mi-temps</span><div class="seg" style="padding:3px">' + ['1', '2'].map(n => '<button type="button" class="' + (String(f.mtN) === n ? 'on' : '') + '" data-a="newMtN" data-k="' + n + '" style="min-height:40px;padding:0 14px">' + n + '</button>').join('') + '</div></div></div>' +
    '<p class="mu" style="margin-top:-6px">Le chronomètre du match suit ces durées (laisser vide pour un chrono libre).</p>';
  if (t === 'tournoi') h += '<label class="row" style="font-weight:600"><input type="checkbox" name="tab" ' + (f.tab ? 'checked' : '') + ' style="width:22px;height:22px;accent-color:var(--c2)">Tirs au but en cas d\'égalité (phases finales)</label>';
  h += '<button type="button" class="btn" data-a="newCreate">' + (t === 'amical' ? 'Choisir les joueurs' : 'Créer le ' + TYPE_LBL[t].toLowerCase()) + '</button>';
  h += '</div>';
  return { html: h };
};
function readNewForm() {
  const f = cur().p.f;
  $$('#view [name]').forEach(i => { f[i.name] = i.type === 'checkbox' ? i.checked : i.value.trim(); });
  return f;
}
ACT.newType = (el, d) => { readNewForm(); cur().p.type = d.t; render(); };
ACT.newLieu = (el, d) => { readNewForm().lieu = d.k; render(); };
ACT.newFmt = (el, d) => { readNewForm().format = d.k; render(); };
ACT.newMtN = (el, d) => { readNewForm().mtN = d.k; render(); };
ACT.newCreate = () => {
  const f = readNewForm(), t = cur().p.type || 'amical';
  if (!f.titre) { toast(t === 'amical' ? 'Indique l\'équipe adverse.' : 'Indique un titre.'); $('#nTitre').focus(); return; }
  LS.set('lastFormat', f.format);
  const mtMin = Math.max(0, Math.min(60, parseInt(f.mtMin, 10) || 0)), mtN = f.mtN === '1' ? 1 : 2;
  LS.set('lastMtMin', mtMin ? String(mtMin) : ''); LS.set('lastMtN', String(mtN));
  const e = { id: uid('R'), saison: reg('saison'), type: t, titre: f.titre, date: f.date || todayIso(), heure: f.heure, lieu: f.lieu, format: f.format, duree: mtMin ? (mtN === 2 ? '2 × ' + mtMin + ' min' : mtMin + ' min') : (mtN === 1 ? '1 mi-temps' : ''), mitemps: mtN + 'x' + (mtMin || ''), tab: t === 'tournoi' ? !!f.tab : false, statut: 'en_cours', creeLe: nowIso() };
  const ops = [put('Rencontres', e)];
  if (t === 'amical') {
    const m = newMatch(e, f.titre, '');
    ops.push(put('Matchs', m)); commit(ops);
    go('compo', { mid: m.id }, { replace: true });
  } else { commit(ops); go('event', { eid: e.id }, { replace: true }); }
};
function newMatch(e, adv, phase, format) {
  const prev = lastCompo(e.id);
  return { id: uid('M'), rencontre: e.id, ordre: matchesOf(e.id).length + 1, adversaire: adv, phase: phase || '', format: format || e.format || '8', statut: 'prevu', chrono: null, butsPour: 0, butsContre: 0, tab: null, compo: prev, creeLe: nowIso() };
}
function lastCompo(eid) {
  const ids = new Set(((curSeason() || {}).effectif) || []);
  let list = eid ? matchesOf(eid).filter(m => m.compo).reverse() : [];
  if (!list.length) list = rows('Matchs').filter(m => m.compo && (m.compo.joueurs || []).length).sort((a, b) => String(b.creeLe).localeCompare(String(a.creeLe)));
  const c = list[0] && list[0].compo;
  if (!c) return { joueurs: [], places: {} };
  const places = {}; Object.keys(c.places || {}).forEach(k => { if (ids.has(c.places[k])) places[k] = c.places[k]; });
  return { joueurs: (c.joueurs || []).filter(x => ids.has(x)), places };
}

/* ---------- plateau / tournoi ---------- */
SCREENS.event = p => {
  const e = DB.Rencontres[p.eid]; if (!e) return SCREENS.home({});
  const ms = matchesOf(e.id), done = ms.filter(isDone), live = e.statut !== 'termine';
  const pid = suiviId();
  let o = { v: 0, n: 0, d: 0, bp: 0, bc: 0 };
  done.forEach(m => { const s = score(m); o[result(m).toLowerCase()]++; o.bp += s.p; o.bc += s.c; });
  let h = topBar(evTitle(e), [fdate(e.date, true), 'à ' + (e.format || 8), LIEU_LBL[e.lieu]].filter(Boolean).join(' · '), { back: true, right: typeBadge(e.type) });
  h += '<div class="main">';
  if (!live && done.length) h += recapPreview(e.id);
  if (e.type === 'tournoi') {
    const r = eventResult(e);
    h += '<div class="card" style="flex-direction:row;align-items:center;gap:12px"><span style="color:#FFC46B;width:30px;height:30px;flex:none">' + ICON.trophy.replace('class="ic"', 'class="ic" style="width:30px;height:30px"') + '</span><span class="cd" style="font-size:26px;color:#FFC46B">' + esc(live && !done.length ? 'À jouer' : r.txt) + '</span></div>';
  }
  o.mj = done.length;
  h += summaryBoard(o);
  h += '<p class="lbl">Matchs</p>';
  if (!ms.length) h += '<div class="empty">Aucun match pour l\'instant.</div>';
  let ph = '';
  ms.forEach((m, i) => {
    if (e.type === 'tournoi' && m.phase !== ph) { ph = m.phase; h += '<p class="ph-sep">' + esc(m.phase || 'Match') + '</p>'; }
    const s = score(m), sc = goalsOf(m.id).filter(g => g.camp === 'nous' && g.buteur && g.special !== 'inconnu');
    const cnt = {}; sc.forEach(g => cnt[g.buteur] = (cnt[g.buteur] || 0) + 1);
    const scorers = Object.keys(cnt).map(k => pname(k) + (cnt[k] > 1 ? ' ×' + cnt[k] : '')).join(' · ');
    const st = m.statut === 'en_cours' ? '<span class="mu" style="display:flex;align-items:center;gap:6px"><span class="dot"></span>En cours</span>' : m.statut === 'prevu' ? '<span class="mu">À jouer</span>' : '';
    const tab = m.tab && m.tab.nous != null ? ' <small class="mu">(' + m.tab.nous + '-' + m.tab.eux + ' tab)</small>' : '';
    h += '<button type="button" class="it' + (m.statut === 'en_cours' ? ' live' : '') + '" data-a="openMatch" data-id="' + m.id + '"><span class="bi" style="background:var(--s2);font-family:var(--cd);font-weight:800;color:var(--mu);width:32px;height:32px">' + (i + 1) + '</span><div class="grow"><div class="t1">vs ' + esc(m.adversaire) + '</div>' + (st || '<p class="mu">' + esc(scorers || '—') + '</p>') + '</div><span class="cd ' + (isDone(m) ? RCLS[result(m)] : '') + '" style="font-size:22px">' + s.p + '-' + s.c + tab + '</span></button>';
  });
  if (live) h += '<button type="button" class="btn2 dash" data-a="addMatch">' + ICON.plus + 'Ajouter un match</button>';
  /* buteurs et passeurs */
  const tally = {};
  ms.forEach(m => goalsOf(m.id).forEach(g => { if (g.camp !== 'nous') return; if (g.buteur) (tally[g.buteur] = tally[g.buteur] || { b: 0, pd: 0 }).b++; if (g.passeur) (tally[g.passeur] = tally[g.passeur] || { b: 0, pd: 0 }).pd++; }));
  const ks = Object.keys(tally).filter(k => player(k)).sort((a, b) => tally[b].b - tally[a].b || tally[b].pd - tally[a].pd);
  if (ks.length) {
    h += '<div class="card" style="gap:0"><div class="tbl"><div class="tr th"><span style="flex:1">Buteurs et passeurs</span><span class="c">Buts</span><span class="c">Passes</span></div>' +
      ks.map(k => '<div class="tr"' + (k === pid ? ' style="background:var(--s2);border-radius:10px;margin:0 -8px;padding:0 8px"' : '') + '><span style="flex:1;font-weight:' + (k === pid ? 800 : 500) + (k === pid ? ';color:var(--c2)' : '') + '">' + esc(pname(k)) + '</span><span class="c">' + tally[k].b + '</span><span class="c">' + tally[k].pd + '</span></div>').join('') + '</div></div>';
  }
  if (live) h += '<button type="button" class="btn" data-a="finishEvent">Terminer le ' + TYPE_LBL[e.type].toLowerCase() + '</button>';
  else if (e.type === 'tournoi') h += '<button type="button" class="btn2" data-a="distinctions">' + ICON.trophy + 'Distinctions (meilleur buteur du tournoi)</button>';
  if (live && done.length) h += '<p class="lbl">Compte rendu provisoire</p>' + recapPreview(e.id);
  h += '<div class="row"><button type="button" class="btn2" data-a="editEvent">' + ICON.edit + 'Modifier</button>' + (live ? '' : '<button type="button" class="btn2" data-a="reopenEvent">Rouvrir</button>') + '<button type="button" class="btn2 danger" data-a="deleteEvent">' + ICON.trash + 'Supprimer</button></div>';
  h += '</div>';
  return { html: h };
};
ACT.openMatch = (el, d) => { const m = DB.Matchs[d.id]; if (!m) return; go(m.statut === 'prevu' ? 'compo' : m.statut === 'en_cours' ? 'live' : 'match', { mid: m.id }); };
ACT.addMatch = () => {
  const e = DB.Rencontres[cur().p.eid]; const last = matchesOf(e.id).slice(-1)[0];
  const lastPh = last ? phaseBase(last.phase) : 'Poule', grp = last && last.phase && last.phase.includes(' · ') ? last.phase.split(' · ')[1] : '';
  let h = '<h2>Nouveau match</h2><div class="field"><label for="amAdv">Adversaire</label><input id="amAdv" class="inp" autocomplete="off" placeholder="ex. AS Colline"></div>';
  if (e.type === 'tournoi') h += '<div class="row"><div class="field" style="flex:2"><label for="amPh">Phase du tournoi</label><select id="amPh" class="inp">' + PHASES.map(x => '<option' + (x === lastPh ? ' selected' : '') + '>' + x + '</option>').join('') + '</select></div><div class="field" style="flex:1"><label for="amGr">Groupe</label><input id="amGr" class="inp" value="' + esc(grp) + '" placeholder="ex. A"></div></div>';
  h += '<div class="field"><span class="flab">Format</span><div class="chips" id="amFmt">' + ['5', '8', '11'].map(x => '<button type="button" class="chip' + (x === String(last ? last.format : e.format) ? ' on' : '') + '" data-k="' + x + '">à ' + x + '</button>').join('') + '</div></div>';
  h += '<div class="row"><button type="button" class="btn2" data-a="sheetClose">Annuler</button><button type="button" class="btn" id="amOk">Choisir les joueurs</button></div>';
  openSheet(h);
  $$('#amFmt .chip').forEach(b => b.onclick = () => { $$('#amFmt .chip').forEach(x => x.classList.remove('on')); b.classList.add('on'); });
  $('#amOk').onclick = () => {
    const adv = $('#amAdv').value.trim(); if (!adv) { toast('Indique l\'adversaire.'); return; }
    let ph = '';
    if (e.type === 'tournoi') { ph = $('#amPh').value; const g = $('#amGr').value.trim(); if (ph === 'Poule' && g) ph += ' · ' + g.toUpperCase(); }
    const fmt = ($('#amFmt .chip.on') || {}).dataset ? $('#amFmt .chip.on').dataset.k : e.format;
    const m = newMatch(e, adv, ph, fmt);
    commit([put('Matchs', m)]);
    $('#sheet').hidden = true; go('compo', { mid: m.id });
  };
};
ACT.sheetClose = () => closeSheet();
ACT.distinctions = () => distinctionSheet(DB.Rencontres[cur().p.eid]);
ACT.finishEvent = async () => {
  const e = DB.Rencontres[cur().p.eid];
  const open = matchesOf(e.id).filter(m => !isDone(m));
  if (open.length && !await confirmBox('Terminer ?', open.length + ' match(s) ne sont pas terminés : ils seront retirés du résumé.', 'Terminer quand même')) return;
  const ops = [put('Rencontres', { id: e.id, statut: 'termine' })];
  open.filter(m => !goalsOf(m.id).length).forEach(m => ops.push(del('Matchs', m.id)));
  open.filter(m => goalsOf(m.id).length).forEach(m => ops.push(put('Matchs', finishFields(m))));
  commit(ops); render();
  if (e.type === 'tournoi') distinctionSheet(DB.Rencontres[e.id]);
};
ACT.reopenEvent = () => { commit([put('Rencontres', { id: cur().p.eid, statut: 'en_cours' })]); render(); };
ACT.deleteEvent = async () => {
  const e = DB.Rencontres[cur().p.eid];
  if (!await confirmBox('Supprimer ?', '« ' + evTitle(e) + ' » et tous ses matchs seront supprimés.', 'Supprimer', true)) return;
  const ops = [];
  matchesOf(e.id).forEach(m => { goalsOf(m.id).forEach(g => ops.push(del('Buts', g.id))); ops.push(del('Matchs', m.id)); });
  ops.push(del('Rencontres', e.id)); commit(ops); tab('list');
};
ACT.editEvent = () => {
  const e = DB.Rencontres[cur().p.eid] || DB.Rencontres[(DB.Matchs[cur().p.mid] || {}).rencontre];
  let h = '<h2>Modifier</h2><div class="field"><label for="eeT">' + (e.type === 'amical' ? 'Équipe adverse' : 'Titre') + '</label><input id="eeT" class="inp" value="' + esc(e.titre) + '"></div>' +
    '<div class="row"><div class="field" style="flex:1"><label for="eeD">Date</label><input id="eeD" type="date" class="inp" value="' + esc(e.date) + '"></div><div class="field" style="flex:1"><label for="eeH">Heure</label><input id="eeH" type="time" class="inp" value="' + esc(e.heure) + '"></div></div>' +
    '<div class="field"><label for="eeL">Lieu</label><select id="eeL" class="inp">' + Object.keys(LIEU_LBL).map(k => '<option value="' + k + '"' + (k === e.lieu ? ' selected' : '') + '>' + LIEU_LBL[k] + '</option>').join('') + '</select></div>' +
    '<div class="row"><button type="button" class="btn2" data-a="sheetClose">Annuler</button><button type="button" class="btn" id="eeOk">Enregistrer</button></div>';
  openSheet(h);
  $('#eeOk').onclick = () => {
    const t = $('#eeT').value.trim(); if (!t) return toast('Le titre est vide.');
    const ops = [put('Rencontres', { id: e.id, titre: t, date: $('#eeD').value, heure: $('#eeH').value, lieu: $('#eeL').value })];
    if (e.type === 'amical') matchesOf(e.id).forEach(m => ops.push(put('Matchs', { id: m.id, adversaire: t })));
    commit(ops); closeSheet();
  };
};

/* ---------- composition ---------- */
const FORM = {
  '5': [['GB', 50, 90], ['DEF', 50, 70], ['MIL', 20, 48], ['MIL', 80, 48], ['ATT', 50, 24]],
  '8': [['GB', 50, 91], ['DEF', 20, 71], ['DEF', 50, 74], ['DEF', 80, 71], ['MIL', 18, 48], ['MIL', 50, 51], ['MIL', 82, 48], ['ATT', 50, 25]],
  '11': [['GB', 50, 92], ['DEF', 13, 73], ['DEF', 37, 76], ['DEF', 63, 76], ['DEF', 87, 73], ['MIL', 13, 50], ['MIL', 37, 53], ['MIL', 63, 53], ['MIL', 87, 50], ['ATT', 36, 26], ['ATT', 64, 26]]
};
let CSEL = null; // joueur sélectionné dans la composition {pid, slot}
const PITCH_SVG = '<svg class="lines" viewBox="0 0 350 430" preserveAspectRatio="none" aria-hidden="true"><g fill="none" stroke="rgba(255,255,255,.55)" stroke-width="2"><rect x="10" y="10" width="330" height="410"/><path d="M10 215h330"/><circle cx="175" cy="215" r="40"/><rect x="85" y="10" width="180" height="62"/><rect x="85" y="358" width="180" height="62"/><rect x="145" y="2" width="60" height="8"/><rect x="145" y="420" width="60" height="8"/></g><text x="175" y="42" text-anchor="middle" font-family="Barlow" font-weight="700" font-size="11" fill="rgba(255,255,255,.6)">ADVERSAIRE</text></svg>';
function pitchHtml(m, interactive) {
  const c = m.compo || { joueurs: [], places: {} }, F = FORM[m.format] || FORM['8'];
  let h = '<div class="pitch">' + PITCH_SVG;
  F.forEach((sl, i) => {
    const pid = (c.places || {})[i];
    const sel = interactive && CSEL && CSEL.slot === i;
    const cls = 'tok' + (pid ? (pid === suiviId() ? ' me' : sl[0] === 'GB' ? ' gk' : '') : ' empty');
    const inner = pid ? esc((player(pid) || {}).numero || initials(pname(pid))) : sl[0];
    h += '<' + (interactive ? 'button type="button" data-a="cSlot" data-i="' + i + '"' + (pid ? ' data-drag="' + pid + '" data-from="' + i + '"' : '') : 'div') + ' class="slot' + (sel ? ' sel' : '') + '" style="left:' + sl[1] + '%;top:' + sl[2] + '%"><span class="' + cls + '">' + inner + '</span>' + (pid ? '<span class="nm">' + esc(pname(pid)) + '</span>' : '') + '</' + (interactive ? 'button' : 'div') + '>';
  });
  return h + '</div>';
}
SCREENS.compo = p => {
  const m = DB.Matchs[p.mid]; if (!m) return SCREENS.home({});
  const e = DB.Rencontres[m.rencontre] || {};
  const c = m.compo || { joueurs: [], places: {} };
  const placed = new Set(Object.values(c.places || {}));
  const bench = (c.joueurs || []).filter(x => !placed.has(x) && player(x));
  const R = roster();
  let h = topBar('Composition', TYPE_LBL[e.type] + ' · vs ' + (m.adversaire || ''), { back: true });
  h += '<div class="main">';
  h += '<div class="row">' + ['5', '8', '11'].map(x => '<button type="button" class="chip' + (String(m.format) === x ? ' on' : '') + '" data-a="cFmt" data-k="' + x + '">à ' + x + '</button>').join('') + '<span class="mu" style="flex:1;text-align:right">' + placed.size + ' titulaire' + (placed.size > 1 ? 's' : '') + '<br>' + bench.length + ' remplaçant' + (bench.length > 1 ? 's' : '') + '</span></div>';
  h += pitchHtml(m, true);
  h += '<p class="mu" style="text-align:center">' + (CSEL ? (CSEL.slot != null ? 'Touche une autre place pour échanger, ou ' : 'Touche une place sur le terrain pour placer ' + esc(pname(CSEL.pid)) + '.') : 'Fais glisser un joueur sur le terrain pour le placer ou l\'échanger (ou touche-le puis touche une place).') + '</p>';
  if (CSEL && CSEL.slot != null) h += '<button type="button" class="btn2" data-a="cBench">Mettre ' + esc(pname(CSEL.pid)) + ' sur le banc</button>';
  h += '<div class="card" id="benchZone"><p class="lbl">Remplaçants · glisser ici pour sortir un joueur</p><div class="chips">' + (bench.length ? bench.map(x => '<button type="button" class="pchip' + (CSEL && CSEL.pid === x && CSEL.slot == null ? ' sel' : '') + '" data-a="cPick" data-id="' + x + '" data-drag="' + x + '"><span class="tok' + (x === suiviId() ? ' me' : '') + '">' + esc((player(x) || {}).numero || initials(pname(x))) + '</span>' + esc(pname(x)) + '</button>').join('') : '<span class="mu">Personne sur le banc.</span>') + '</div></div>';
  h += '<div class="card"><p class="lbl">Joueurs convoqués (' + (c.joueurs || []).length + ' / ' + R.length + ')</p><div class="chips">' + R.map(pl => { const on = (c.joueurs || []).includes(pl.id); return '<button type="button" class="pchip' + (on ? '' : ' off') + '" data-a="cToggle" data-id="' + pl.id + '"><span class="tok' + (pl.id === suiviId() ? ' me' : '') + '">' + esc(pl.numero || initials(pl.nom)) + '</span>' + esc(pl.nom) + (on ? ' ✓' : '') + '</button>'; }).join('') + '</div>' + (R.length ? '' : '<p class="mu">L\'effectif est vide : ajoute les joueurs dans l\'onglet Effectif.</p>') + '</div>';
  if (m.statut === 'prevu') h += '<button type="button" class="btn" data-a="kickoff">Coup d\'envoi</button>';
  else h += '<button type="button" class="btn" data-a="back">Valider la composition</button>';
  h += '</div>';
  return { html: h };
};
function saveCompo(m, c) { commit([put('Matchs', { id: m.id, compo: c })]); }
function compoOf(m) { const c = m.compo || {}; return { joueurs: (c.joueurs || []).slice(), places: Object.assign({}, c.places || {}) }; }
ACT.cFmt = (el, d) => { const m = DB.Matchs[cur().p.mid]; const c = compoOf(m); c.places = {}; CSEL = null; commit([put('Matchs', { id: m.id, format: d.k, compo: c })]); render(); };
ACT.cToggle = (el, d) => {
  const m = DB.Matchs[cur().p.mid], c = compoOf(m);
  if (c.joueurs.includes(d.id)) { c.joueurs = c.joueurs.filter(x => x !== d.id); Object.keys(c.places).forEach(k => { if (c.places[k] === d.id) delete c.places[k]; }); }
  else {
    c.joueurs.push(d.id);
    /* placé automatiquement à la première place libre de son poste, sinon sur le banc */
    const F = FORM[m.format] || FORM['8'], pl = player(d.id) || {};
    const free = F.findIndex((s, i) => !c.places[i] && s[0] === pl.poste);
    if (free >= 0) c.places[free] = d.id;
  }
  CSEL = null; saveCompo(m, c); render();
};
ACT.cPick = (el, d) => { CSEL = CSEL && CSEL.pid === d.id && CSEL.slot == null ? null : { pid: d.id }; render(); };
ACT.cSlot = (el, d) => {
  const m = DB.Matchs[cur().p.mid], c = compoOf(m), i = +d.i, occ = c.places[i];
  if (!CSEL) { if (occ) { CSEL = { pid: occ, slot: i }; render(); } else toast('Touche d\'abord un remplaçant.'); return; }
  if (CSEL.slot === i) { CSEL = null; render(); return; }
  if (CSEL.slot != null) { if (occ) c.places[CSEL.slot] = occ; else delete c.places[CSEL.slot]; }
  c.places[i] = CSEL.pid;
  if (!c.joueurs.includes(CSEL.pid)) c.joueurs.push(CSEL.pid);
  CSEL = null; saveCompo(m, c); render();
};
/* glisser-déposer sur le terrain (doigt ou souris) */
function compoMove(pid, from, to) {
  const m = DB.Matchs[cur().p.mid], c = compoOf(m);
  if (from != null && from !== '') delete c.places[from];
  if (to == null) { CSEL = null; saveCompo(m, c); render(); return; }
  const occ = c.places[to];
  if (occ && occ !== pid && from != null && from !== '') c.places[from] = occ;
  c.places[to] = pid;
  if (!c.joueurs.includes(pid)) c.joueurs.push(pid);
  CSEL = null; saveCompo(m, c); render();
}
let DRAG = null, DRAG_CLICK = 0;
document.addEventListener('pointerdown', e => {
  const t = e.target.closest('[data-drag]'); if (!t || cur().s !== 'compo') return;
  DRAG = { pid: t.dataset.drag, from: t.dataset.from, x: e.clientX, y: e.clientY, on: false, el: t };
});
document.addEventListener('pointermove', e => {
  if (!DRAG) return;
  if (!DRAG.on) {
    if (Math.hypot(e.clientX - DRAG.x, e.clientY - DRAG.y) < 8) return;
    DRAG.on = true;
    const tok = DRAG.el.querySelector('.tok');
    const g = DRAG.ghost = document.createElement('div'); g.className = 'drag-ghost';
    g.innerHTML = (tok ? tok.outerHTML : '') + '<span class="nm">' + esc(pname(DRAG.pid)) + '</span>';
    document.body.appendChild(g); DRAG.el.style.opacity = '.35';
  }
  e.preventDefault();
  DRAG.ghost.style.left = e.clientX + 'px'; DRAG.ghost.style.top = e.clientY + 'px';
  $$('.slot.over').forEach(x => x.classList.remove('over'));
  const under = document.elementFromPoint(e.clientX, e.clientY), sl = under && under.closest('[data-i]');
  if (sl) sl.classList.add('over');
}, { passive: false });
function endDrag(e) {
  if (!DRAG) return;
  const d = DRAG; DRAG = null;
  if (!d.on) return;
  d.ghost.remove(); d.el.style.opacity = '';
  DRAG_CLICK = Date.now();
  const under = document.elementFromPoint(e.clientX, e.clientY);
  const sl = under && under.closest('[data-i]'), bz = under && under.closest('#benchZone');
  if (sl) compoMove(d.pid, d.from, sl.dataset.i);
  else if (bz && d.from != null) compoMove(d.pid, d.from, null);
  else render();
}
document.addEventListener('pointerup', endDrag);
document.addEventListener('pointercancel', e => { if (DRAG && DRAG.ghost) { DRAG.ghost.remove(); DRAG.el.style.opacity = ''; } DRAG = null; });
document.addEventListener('click', e => { if (Date.now() - DRAG_CLICK < 400) { e.stopPropagation(); e.preventDefault(); } }, true);
ACT.cBench = () => { const m = DB.Matchs[cur().p.mid], c = compoOf(m); delete c.places[CSEL.slot]; CSEL = null; saveCompo(m, c); render(); };
ACT.kickoff = () => {
  const m = DB.Matchs[cur().p.mid];
  if (!(m.compo && m.compo.joueurs && m.compo.joueurs.length)) toast('Aucun joueur convoqué : les stats individuelles ne compteront pas.');
  CSEL = null;
  commit([put('Matchs', { id: m.id, statut: 'en_cours', chrono: { start: Date.now(), off: 0, paused: null } })]);
  go('live', { mid: m.id }, { replace: true });
};

/* ---------- match en direct ---------- */
/* mi-temps de la rencontre : « 2x25 » = 2 mi-temps de 25 min ; minutes vides = chrono libre */
function mtCfg(m) {
  const e = DB.Rencontres[m.rencontre] || {}, x = /^(\d)x(\d*)$/.exec(String(e.mitemps || ''));
  return { n: x ? +x[1] || 2 : 2, min: x && x[2] ? +x[2] : 0 };
}
function chronoOf(m) { return Object.assign({ start: 0, off: 0, paused: null, half: 1, mt: false, h1: 0 }, m.chrono || {}); }
/* temps écoulé dans la mi-temps en cours (ms) */
function elapsed(m) {
  const c = chronoOf(m); if (!c.start) return 0;
  const end = c.end || c.paused || Date.now();
  return Math.max(0, end - c.start - (c.off || 0));
}
function curMinute(m) {
  const c = chronoOf(m), cfg = mtCfg(m);
  const before = c.half === 2 ? (cfg.min ? cfg.min * 60000 : c.h1 || 0) : 0;
  return Math.floor((before + elapsed(m)) / 60000) + 1;
}
const fmtClock = ms => { const s = Math.floor(ms / 1000); return String(Math.floor(s / 60)).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0'); };
const VS = (sz, cls) => '<span class="vs' + (cls ? ' ' + cls : '') + '" style="width:' + sz + 'px;height:' + sz + 'px;font-size:' + Math.round(sz * .36) + 'px">VS</span>';
function clubBadge(sz) {
  const S = curSeason() || {}, logo = imgData(S.logo);
  return logo ? '<img src="' + logo + '" alt="" style="width:' + sz + 'px;height:' + sz + 'px;object-fit:contain;flex:none">' : '<span class="vs" style="width:' + sz + 'px;height:' + sz + 'px;background:var(--c1);color:var(--on1);font-size:' + Math.round(sz * .3) + 'px">' + esc(initials(S.abrev)) + '</span>';
}
function scoreBlock(m) {
  const S = curSeason() || {}, s = score(m);
  return '<div class="score"><div class="side">' + clubBadge(46) + '<span>' + esc(S.abrev || 'NOUS') + '</span></div>' +
    '<div class="num">' + s.p + '<i>–</i>' + s.c + '</div><div class="side">' + VS(44) + '<span>' + esc(advAbbr(m.adversaire)) + '</span></div></div>';
}
function advAbbr(n) { const w = String(n || '').trim().split(/\s+/); if (w.length === 1) return w[0].slice(0, 6).toUpperCase(); return initials(n); }
function clockLine(m) {
  const c = chronoOf(m), cfg = mtCfg(m), el = elapsed(m), over = cfg.min && el >= cfg.min * 60000;
  const per = cfg.n === 1 ? 'Match' : c.half === 2 ? '2e mi-temps' : '1re mi-temps';
  if (c.mt) return '<div class="clock"><span class="cd" style="font-size:26px;color:#FFC46B">MI-TEMPS</span><span class="mu">' + fmtClock(c.h1 || 0) + ' jouées</span></div>';
  return '<div class="clock"><span class="dot" style="background:' + (c.paused ? '#FFC46B' : 'var(--win)') + '"></span><span class="cd" id="clock" style="font-size:26px' + (over ? ';color:#FFA24D' : '') + '">' + fmtClock(el) + '</span>' +
    (cfg.min ? '<span class="mu">/ ' + fmtClock(cfg.min * 60000) + '</span>' : '') + '<span class="mu">· ' + per + (c.paused ? ' · pause' : '') + '</span>' +
    '<button type="button" class="ib" style="background:var(--s2);width:40px;height:40px;color:var(--tx)" data-a="lPause" aria-label="' + (c.paused ? 'Reprendre' : 'Pause') + '">' + (c.paused ? ICON.play : ICON.pause) + '</button></div>';
}
SCREENS.live = p => {
  const m = DB.Matchs[p.mid]; if (!m) return SCREENS.home({});
  const e = DB.Rencontres[m.rencontre] || {}, S = curSeason() || {};
  const done = isDone(m), c = chronoOf(m), cfg = mtCfg(m), over = cfg.min && elapsed(m) >= cfg.min * 60000;
  let h = topBar(TYPE_LBL[e.type] + ' · vs ' + (m.adversaire || ''), [m.phase, 'à ' + m.format, e.duree].filter(Boolean).join(' · '), { back: true });
  h += '<div class="main">';
  h += '<div class="card" style="align-items:center;padding:16px">' + scoreBlock(m);
  h += done ? '<p class="mu" style="font-weight:700">Match terminé · correction des buts</p>' : clockLine(m);
  h += '</div>';
  h += '<div class="row" style="gap:12px;align-items:stretch">' +
    '<button type="button" class="goal" data-a="lGoal" data-camp="nous" style="background:var(--c1);color:var(--on1);border:3px solid var(--c2)"><b>BUT</b><span class="gl">' + clubBadge(30) + '<span>' + esc(S.club || S.abrev || 'Nous') + '</span></span></button>' +
    '<button type="button" class="goal" data-a="lGoal" data-camp="eux" style="background:#C62828;color:#FFFFFF;border:3px solid #FF8A80"><b>BUT</b><span class="gl">' + VS(30, 'inv') + '<span>' + esc(m.adversaire || 'Adversaire') + '</span></span></button></div>';
  if (!done && cfg.n === 2 && c.half === 1 && !c.mt) h += '<button type="button" class="' + (over ? 'btn' : 'btn2') + '" data-a="lHalf">Siffler la mi-temps</button>';
  if (!done && c.mt) h += '<button type="button" class="btn" data-a="l2nd">' + ICON.play + 'Coup d\'envoi de la 2e mi-temps</button>';
  const gs = goalsOf(m.id);
  h += '<div class="card" style="gap:0"><p class="lbl" style="padding-bottom:8px">Fil du match · toucher un but pour le corriger</p>';
  let a = 0, b = 0; const lines = gs.map(g => { g.camp === 'eux' ? b++ : a++; return { g, sc: a + '-' + b }; }).reverse();
  lines.forEach(x => {
    const g = x.g;
    const t = g.camp === 'eux' ? '<span style="font-weight:700;color:#FF8A80">But ' + esc(m.adversaire) + '</span>' : '<span style="font-weight:700">But ' + esc(S.abrev || '') + ' · ' + esc(goalWho(g)) + '</span><p class="mu">' + esc(g.passeur ? 'passe décisive de ' + pname(g.passeur) : g.special === 'csc' ? 'contre son camp' : 'sans passe') + '</p>';
    h += '<button type="button" class="ev" data-a="lEdit" data-id="' + g.id + '"><span class="min">' + num(g.minute) + '\'</span><div style="flex:1">' + t + '</div><span class="cd">' + x.sc + '</span></button>';
  });
  h += '<div class="ev" style="cursor:default"><span class="min">0\'</span><span class="mu">Coup d\'envoi</span></div></div>';
  h += '<div class="row"><button type="button" class="btn2" data-a="lUndo"' + (gs.length ? '' : ' disabled') + '>' + ICON.undo + 'Annuler le dernier but</button><button type="button" class="btn2" style="flex:none;width:auto" data-a="go" data-s="compo" data-p=\'{"mid":"' + m.id + '"}\'>Compo</button></div>';
  const lastHalf = cfg.n === 1 || c.half === 2;
  h += done ? '<button type="button" class="btn" data-a="lDone">Enregistrer</button>' : '<button type="button" class="' + (over && lastHalf ? 'btn' : 'btn2 danger') + '" data-a="lFinish">Fin du match</button>';
  h += '</div>';
  return { html: h, after: () => {
    if (done || c.paused || c.mt) return;
    let wasOver = over;
    LIVE_T = setInterval(() => {
      const mm = DB.Matchs[p.mid] || m, el = elapsed(mm), k = $('#clock'); if (k) k.textContent = fmtClock(el);
      if (!wasOver && cfg.min && el >= cfg.min * 60000) { wasOver = true; try { navigator.vibrate && navigator.vibrate([200, 100, 200]); } catch (e) {} refresh(); }
    }, 1000);
  } };
};
function goalWho(g) { return g.special === 'inconnu' ? 'buteur inconnu' : g.special === 'csc' ? 'contre son camp adverse' : pname(g.buteur); }
function saveChrono(m, c) { commit([put('Matchs', { id: m.id, chrono: c })]); render(); }
ACT.lPause = () => {
  const m = DB.Matchs[cur().p.mid], c = chronoOf(m); if (!c.start) c.start = Date.now();
  if (c.paused) { c.off = (c.off || 0) + (Date.now() - c.paused); c.paused = null; } else c.paused = Date.now();
  saveChrono(m, c);
};
ACT.lHalf = () => { const m = DB.Matchs[cur().p.mid], c = chronoOf(m); c.h1 = elapsed(m); c.mt = true; c.paused = c.paused || Date.now(); saveChrono(m, c); toast('Mi-temps'); };
ACT.l2nd = () => { const m = DB.Matchs[cur().p.mid], c = chronoOf(m); Object.assign(c, { half: 2, mt: false, start: Date.now(), off: 0, paused: null }); saveChrono(m, c); };

/* saisie d'un but en deux fenêtres : d'abord le buteur, puis le passeur (validation au toucher) */
let GS = null;
ACT.lGoal = (el, d) => {
  const m = DB.Matchs[cur().p.mid], minute = isDone(m) ? 1 : curMinute(m);
  if (d.camp === 'eux') {
    const g = { id: uid('B'), match: m.id, camp: 'eux', minute, buteur: '', passeur: '', special: '', creeLe: nowIso() };
    commit([put('Buts', g)]); syncScore(m.id); render();
    try { navigator.vibrate && navigator.vibrate(80); } catch (e) {}
    toast('But ' + (m.adversaire || 'adverse') + ' · ' + minute + '\'', 'Annuler', () => { commit([del('Buts', g.id)]); syncScore(m.id); render(); });
    return;
  }
  GS = { mid: m.id, camp: 'nous', minute, buteur: '', passeur: '', special: '', step: 'but' };
  goalSheet();
};
ACT.lEdit = (el, d) => {
  const g = DB.Buts[d.id]; if (!g) return;
  GS = { mid: g.match, gid: g.id, camp: g.camp, minute: num(g.minute), buteur: g.buteur || '', passeur: g.passeur || '', special: g.special || '', step: 'but' };
  goalSheet();
};
function matchPlayers(m) {
  const c = m.compo || {}, F = FORM[m.format] || FORM['8'];
  const placed = F.map((s, i) => (c.places || {})[i]).filter(Boolean);
  const all = placed.concat((c.joueurs || []).filter(x => !placed.includes(x))).filter(x => player(x));
  return all.length ? all : roster().map(p => p.id);
}
function goalSheet() {
  const m = DB.Matchs[GS.mid], S = curSeason() || {};
  const minStep = '<div class="stepper"><button type="button" data-a="gsMin" data-id="-1" aria-label="Minute moins">−</button><b>' + GS.minute + '\'</b><button type="button" data-a="gsMin" data-id="1" aria-label="Minute plus">+</button></div>';
  const big = (act, id, lbl, sub, cls) => '<button type="button" class="pb big' + (cls ? ' ' + cls : '') + '" data-a="' + act + '" data-id="' + id + '">' + (sub ? '<i>' + esc(sub) + '</i>' : '') + '<span>' + esc(lbl) + '</span></button>';
  let h;
  if (GS.camp === 'eux') {
    h = '<div class="row"><h2 style="flex:1;color:#FF8A80">But ' + esc(m.adversaire) + '</h2>' + minStep + '</div>' +
      '<div class="row"><button type="button" class="btn2 danger" data-a="gsDel">' + ICON.trash + 'Supprimer</button><button type="button" class="btn" data-a="gsSave">OK</button></div>';
  } else if (GS.step === 'but') {
    const ps = matchPlayers(m);
    h = '<div class="row"><div style="flex:1"><p class="lbl">Étape 1 sur 2</p><h2 style="color:var(--c2)">' + (GS.gid ? 'Qui a marqué ?' : 'BUT ' + esc(S.abrev || '') + ' ! Qui a marqué ?') + '</h2></div>' + minStep + '</div>' +
      '<div class="pgrid big">' + ps.map(x => big('gsBut', x, pname(x), (player(x) || {}).numero, GS.buteur === x && !GS.special ? 'on' : '')).join('') +
      big('gsBut', '_inconnu', 'Je ne sais pas', '', 'alt') + big('gsBut', '_csc', 'Contre son camp adverse', '', 'csc') + '</div>' +
      '<div class="row">' + (GS.gid ? '<button type="button" class="btn2 danger" data-a="gsDel" style="flex:none;width:auto" aria-label="Supprimer le but">' + ICON.trash + '</button>' : '') + '<button type="button" class="btn2" data-a="gsCancel">' + (GS.gid ? 'Fermer' : 'Annuler le but') + '</button></div>';
  } else {
    const ps = matchPlayers(m).filter(x => x !== GS.buteur);
    h = '<div class="row"><div style="flex:1"><p class="lbl">Étape 2 sur 2 · but de ' + esc(goalWho(GS)) + ' · ' + GS.minute + '\'</p><h2>Passe décisive ?</h2></div></div>' +
      '<div class="pgrid big">' + big('gsPass', '_none', 'Pas de passe', '', 'alt span2' + (!GS.passeur && GS.gid ? ' on' : '')) + ps.map(x => big('gsPass', x, pname(x), (player(x) || {}).numero, GS.passeur === x ? 'on' : '')).join('') + '</div>' +
      '<div class="row"><button type="button" class="btn2" data-a="gsRedo">' + ICON.back + 'Refaire le buteur</button><button type="button" class="btn2" data-a="gsCancel">' + (GS.gid ? 'Fermer' : 'Annuler le but') + '</button></div>';
  }
  openSheet(h);
}
ACT.gsMin = (el, d) => { GS.minute = Math.max(1, Math.min(150, GS.minute + +d.id)); goalSheet(); };
ACT.gsBut = (el, d) => {
  if (d.id === '_inconnu' || d.id === '_csc') { GS.special = d.id.slice(1); GS.buteur = ''; }
  else { GS.special = ''; GS.buteur = d.id; if (GS.passeur === d.id) GS.passeur = ''; }
  if (GS.special === 'csc') { GS.passeur = ''; return saveGoal(); }
  GS.step = 'passe'; goalSheet();
};
ACT.gsPass = (el, d) => { GS.passeur = d.id === '_none' ? '' : d.id; saveGoal(); };
ACT.gsRedo = () => { GS.step = 'but'; goalSheet(); };
ACT.gsCancel = () => { GS = null; closeSheet(); };
ACT.gsSave = () => saveGoal();
ACT.gsDel = () => { const mid = GS.mid; commit([del('Buts', GS.gid)]); syncScore(mid); GS = null; closeSheet(); toast('But supprimé'); };
function saveGoal() {
  const g = { id: GS.gid || uid('B'), match: GS.mid, camp: GS.camp, minute: GS.minute, buteur: GS.camp === 'nous' ? GS.buteur : '', passeur: GS.camp === 'nous' ? GS.passeur : '', special: GS.camp === 'nous' ? GS.special : '' };
  if (!GS.gid) g.creeLe = nowIso();
  const isNew = !GS.gid, mid = GS.mid;
  commit([put('Buts', g)]); syncScore(mid);
  GS = null; closeSheet();
  if (isNew) {
    try { navigator.vibrate && navigator.vibrate([60, 40, 120]); } catch (e) {}
    toast('BUT ! ' + goalWho(g) + (g.passeur ? ' (passe de ' + pname(g.passeur) + ')' : ''), 'Annuler', () => { commit([del('Buts', g.id)]); syncScore(mid); render(); });
  } else toast('But corrigé');
}
function syncScore(mid) { const m = DB.Matchs[mid]; if (!m) return; const s = score(m); commit([put('Matchs', { id: mid, butsPour: s.p, butsContre: s.c })]); }
ACT.lUndo = async () => {
  const gs = goalsOf(cur().p.mid).sort((a, b) => String(a.creeLe).localeCompare(String(b.creeLe)));
  const g = gs[gs.length - 1]; if (!g) return;
  commit([del('Buts', g.id)]); syncScore(cur().p.mid); toast('But annulé'); render();
};
function finishFields(m, tab) {
  const s = score(m), c = chronoOf(m);
  if (c.start && !c.end) c.end = c.paused || Date.now();
  return { id: m.id, statut: 'termine', chrono: c, butsPour: s.p, butsContre: s.c, tab: tab || m.tab || null };
}
ACT.lFinish = async () => {
  const m = DB.Matchs[cur().p.mid], e = DB.Rencontres[m.rencontre] || {}, s = score(m);
  if (e.type === 'tournoi' && truthy(e.tab) && isKO(phaseBase(m.phase)) && s.p === s.c) return tabSheet(m);
  if (!await confirmBox('Fin du match ?', 'Score final : ' + s.p + ' – ' + s.c, 'Terminer')) { render(); return; }
  endMatch(m, null);
};
function tabSheet(m) {
  const S = curSeason() || {};
  openSheet('<h2>Égalité : tirs au but</h2><p class="mu">Score de la séance de tirs au but (laisser vide s\'il n\'y en a pas eu).</p><div class="row"><div class="field" style="flex:1"><label for="tbN">' + esc(S.abrev || 'Nous') + '</label><input id="tbN" type="number" inputmode="numeric" class="inp" min="0"></div><div class="field" style="flex:1"><label for="tbE">' + esc(m.adversaire) + '</label><input id="tbE" type="number" inputmode="numeric" class="inp" min="0"></div></div><div class="row"><button type="button" class="btn2" data-a="sheetClose">Annuler</button><button type="button" class="btn" id="tbOk">Terminer le match</button></div>');
  $('#tbOk').onclick = () => { const a = $('#tbN').value, b = $('#tbE').value; $('#sheet').hidden = true; endMatch(m, a !== '' && b !== '' ? { nous: +a, eux: +b } : null); };
}
function endMatch(m, tab) {
  const e = DB.Rencontres[m.rencontre] || {};
  const ops = [put('Matchs', finishFields(m, tab))];
  if (e.type === 'amical') ops.push(put('Rencontres', { id: e.id, statut: 'termine' }));
  commit(ops);
  if (e.type === 'amical') go('match', { mid: m.id }, { replace: true });
  else backTo('event', { eid: e.id });
}
/* revient à l'écran précédent s'il s'agit déjà de celui-là, sinon le remplace */
function backTo(s, p) {
  const prev = NAV[NAV.length - 2];
  if (prev && prev.s === s && JSON.stringify(prev.p.eid) === JSON.stringify(p.eid)) back();
  else go(s, p, { replace: true });
}
ACT.lDone = () => back();

/* ---------- détail d'un match ---------- */
SCREENS.match = p => {
  const m = DB.Matchs[p.mid]; if (!m) return SCREENS.home({});
  const e = DB.Rencontres[m.rencontre] || {}, S = curSeason() || {}, gs = goalsOf(m.id), s = score(m), t = p.t || 'tl';
  let h = topBar(e.type === 'amical' ? 'Match amical' : (e.titre || ''), [fdate(e.date, true), m.phase, 'à ' + m.format, LIEU_LBL[e.lieu]].filter(Boolean).join(' · '), { back: true, right: typeBadge(e.type) });
  h += '<div class="main"><div class="card" style="padding:16px">' + scoreBlock(m);
  const us = gs.filter(g => g.camp === 'nous').map(g => goalWho(g).split(' ')[0] + ' ' + num(g.minute) + '\'').join(' · ');
  const them = gs.filter(g => g.camp === 'eux').map(g => num(g.minute) + '\'').join(' · ');
  h += '<div class="row" style="font-size:13px;color:var(--tx2);align-items:flex-start"><div style="flex:1;text-align:right">' + esc(us) + '</div><div style="width:1px;align-self:stretch;background:var(--line)"></div><div style="flex:1">' + esc(them) + '</div></div>';
  const r = result(m), tabTxt = m.tab && m.tab.nous != null ? ' · tirs au but ' + m.tab.nous + '-' + m.tab.eux : '';
  h += '<p style="margin:4px 0 0;text-align:center;font-weight:700" class="' + RCLS[isKO(phaseBase(m.phase)) && s.p === s.c && m.tab ? (wonKO(m) ? 'V' : 'D') : r] + '">' + (isDone(m) ? { V: 'Victoire', N: 'Match nul', D: 'Défaite' }[r] : 'En cours') + esc(tabTxt) + '</p></div>';
  h += '<div class="seg" role="tablist"><button type="button" class="' + (t === 'tl' ? 'on' : '') + '" data-a="mTab" data-t="tl">Déroulé</button><button type="button" class="' + (t === 'compo' ? 'on' : '') + '" data-a="mTab" data-t="compo">Composition</button></div>';
  if (t === 'tl') {
    h += '<div class="tl"><div class="tle"><span class="mid">Coup d\'envoi</span></div>';
    let a = 0, b = 0;
    gs.forEach(g => {
      g.camp === 'eux' ? b++ : a++;
      const sc = '<div class="cd" style="font-size:18px">' + a + '-' + b + '</div>';
      if (g.camp === 'nous') h += '<div class="tle"><div class="l"><div class="who"' + (g.buteur === suiviId() ? ' style="color:var(--c2)"' : '') + '>' + esc(goalWho(g)) + '</div><p class="mu">' + esc(g.passeur ? 'passe de ' + pname(g.passeur) : g.special ? '' : 'sans passe') + '</p></div><span class="mn us">' + num(g.minute) + '\'</span><div class="r">' + sc + '</div></div>';
      else h += '<div class="tle"><div class="l">' + sc + '</div><span class="mn">' + num(g.minute) + '\'</span><div class="r"><div class="who" style="color:var(--tx2)">But ' + esc(advAbbr(m.adversaire)) + '</div></div></div>';
    });
    h += '<div class="tle"><span class="mid">' + (isDone(m) ? 'Fin du match · ' + s.p + '-' + s.c : 'Match en cours') + '</span></div></div>';
  } else {
    h += pitchHtml(m, false);
    const c = m.compo || {}, placed = new Set(Object.values(c.places || {}));
    const bench = (c.joueurs || []).filter(x => !placed.has(x));
    h += '<p class="mu">Remplaçants : ' + (bench.length ? esc(bench.map(pname).join(', ')) : 'aucun') + '</p>';
  }
  if (isDone(m)) h += '<p class="lbl">Compte rendu</p>' + recapPreview(e.id, e.type === 'amical' ? '' : m.id);
  h += '<div class="row"><button type="button" class="btn2" data-a="go" data-s="live" data-p=\'{"mid":"' + m.id + '"}\'>' + ICON.edit + 'Corriger</button><button type="button" class="btn2 danger" data-a="delMatch" style="flex:none;width:auto">' + ICON.trash + '</button></div>';
  h += '</div>';
  return { html: h };
};
ACT.mTab = (el, d) => { cur().p.t = d.t; render(); };
ACT.delMatch = async () => {
  const m = DB.Matchs[cur().p.mid], e = DB.Rencontres[m.rencontre] || {};
  if (!await confirmBox('Supprimer ce match ?', 'Le match et ses buts seront supprimés.', 'Supprimer', true)) { render(); return; }
  const ops = goalsOf(m.id).map(g => del('Buts', g.id)); ops.push(del('Matchs', m.id));
  if (e.type === 'amical') ops.push(del('Rencontres', e.id));
  commit(ops); back();
};
