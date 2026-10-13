/* Dans la Lucarne : effectif, fiches, photo, palmarès, réglages, configuration, installation */
'use strict';

/* ---------- effectif ---------- */
SCREENS.squad = () => {
  const S = curSeason(), pid = suiviId(), R = roster().filter(p => p.id !== pid);
  let h = topBar('Effectif', R.length + 1 + ' joueurs · ' + [S.categorie, S.libelle].filter(Boolean).join(' · '), { right: '<button type="button" class="ib" style="background:var(--c2);color:var(--on2)" data-a="addPlayer" aria-label="Ajouter un joueur">' + ICON.plus + '</button>' });
  h += '<div class="main">';
  if (player(pid)) h += '<p class="lbl">' + (isParent() ? 'Mon fils' : 'Joueur suivi') + '</p><button type="button" class="hero-card" data-a="go" data-s="fiche" data-p=\'{"pid":"' + pid + '"}\'>' + cardCv(pid, .56, true) + '</button>';
  h += '<div class="lbl-row"><p class="lbl">Coéquipiers</p><button type="button" class="chip" data-a="addPlayer">' + ICON.plus + 'Ajouter</button></div>';
  if (!R.length) h += '<div class="empty">Ajoute les coéquipiers pour les choisir dans les compositions.</div>';
  else h += '<div class="cards-grid">' + R.map(p => '<button type="button" data-a="go" data-s="fiche" data-p=\'{"pid":"' + p.id + '"}\'>' + cardCv(p.id, .29) + '</button>').join('') + '</div>';
  h += '<p class="mu" style="text-align:center">Toucher une carte pour voir la fiche du joueur.</p>';
  h += '</div>';
  return { html: h, tab: 'squad' };
};
function playerForm(p) {
  p = p || {};
  return '<div class="field"><label for="pfN">Prénom ou nom</label><input id="pfN" class="inp" value="' + esc(p.nom) + '" autocomplete="off"></div>' +
    '<div class="row"><div class="field" style="flex:1"><label for="pfNum">Numéro</label><input id="pfNum" class="inp" inputmode="numeric" value="' + esc(p.numero) + '"></div>' +
    '<div class="field" style="flex:2"><label for="pfP">Poste</label><select id="pfP" class="inp">' + Object.keys(POSTES).map(k => '<option value="' + k + '"' + (p.poste === k ? ' selected' : '') + '>' + POSTES[k] + '</option>').join('') + '</select></div></div>';
}
ACT.addPlayer = () => {
  openSheet('<h2>Nouveau joueur</h2>' + playerForm({ poste: 'MIL' }) + '<div class="row"><button type="button" class="btn2" data-a="sheetClose">Annuler</button><button type="button" class="btn" id="pfOk">Ajouter</button></div>');
  $('#pfN').focus();
  $('#pfOk').onclick = () => {
    const nom = $('#pfN').value.trim(); if (!nom) return toast('Indique le prénom.');
    const p = { id: uid('J'), nom, numero: $('#pfNum').value.trim(), poste: $('#pfP').value, actif: true, creeLe: nowIso() };
    const S = curSeason();
    commit([put('Joueurs', p), put('Saisons', { id: S.id, effectif: (S.effectif || []).concat(p.id) })]);
    closeSheet(); toast(nom + ' ajouté à l\'effectif');
  };
};
ACT.editPlayer = () => {
  const p = player(cur().p.pid), me = p.id === suiviId();
  openSheet('<h2>Modifier la carte</h2>' + playerForm(p) + (me ? '' : '<button type="button" class="btn2" data-a="setSuivi">' + ICON.star.replace('<svg ', '<svg style="width:18px;height:18px;color:var(--c2)" ') + 'Choisir comme joueur suivi</button><button type="button" class="btn2 danger" id="pfDel">Retirer de l\'effectif de la saison</button>') + '<div class="row"><button type="button" class="btn2" data-a="sheetClose">Annuler</button><button type="button" class="btn" id="pfOk">Enregistrer</button></div>');
  $('#pfOk').onclick = () => {
    const nom = $('#pfN').value.trim(); if (!nom) return toast('Le nom est vide.');
    commit([put('Joueurs', { id: p.id, nom, numero: $('#pfNum').value.trim(), poste: $('#pfP').value })]); closeSheet();
  };
  if (!me) $('#pfDel').onclick = () => {
    const S = curSeason();
    commit([put('Saisons', { id: S.id, effectif: (S.effectif || []).filter(x => x !== p.id) })]);
    $('#sheet').hidden = true; toast(p.nom + ' retiré (ses stats restent dans les matchs joués)'); back();
  };
};

ACT.setSuivi = async () => {
  const p = player(cur().p.pid); $('#sheet').hidden = true; $('#sheet').innerHTML = '';
  if (!await confirmBox('Suivre ' + p.nom + ' ?', p.nom + ' devient le joueur suivi : carte « En forme », photo, statistiques sur l\'accueil. ' + pname(suiviId()) + ' repasse en carte or.', 'Choisir ' + p.nom)) { render(); return; }
  const S = curSeason(), ops = [put('Reglages', { id: 'suivi', valeur: p.id })];
  if (!(S.effectif || []).includes(p.id)) ops.push(put('Saisons', { id: S.id, effectif: (S.effectif || []).concat(p.id) }));
  commit(ops); render(); toast(p.nom + ' est maintenant le joueur suivi');
};
/* ---------- fiche joueur (V2 : pour tous les joueurs ; tuiles, anneaux, exploits, tableaux à icônes) ---------- */
SCREENS.fiche = p => {
  const pl = player(p.pid); if (!pl) return SCREENS.squad({});
  const S = curSeason(), t = p.t || 'res', sid = p.sid || S.id, adm = isAdmin(), kids = isParent() ? myKids() : [];
  const mine = kids.includes(pl.id);
  let h = topBar(pl.nom + (pl.numero ? ' · n°' + pl.numero : ''), posteLbl(pl.poste) + (mine ? ' · mon fils' : ''), { back: true, right: adm ? '<button type="button" class="ib" data-a="editPlayer" aria-label="Modifier la carte">' + ICON.edit + '</button>' : '' });
  h += '<div class="main">';
  h += '<div style="align-self:center">' + cardCv(pl.id, .6, true) + '</div>';
  if (adm) {
    h += '<div class="row"><button type="button" class="btn2" data-a="photoNew">' + ICON.cam + (pl.photo ? 'Changer la photo' : 'Ajouter une photo') + '</button>' + (pl.photo ? '<button type="button" class="btn2" data-a="photoEdit" style="flex:none;width:auto">Recadrer</button>' : '') + '</div>';
    const fond = pl.carte === 'forme' || pl.carte === 'or' ? pl.carte : (pl.id === reg('suivi') ? 'forme' : 'or');
    h += '<div class="lbl-row"><p class="lbl">Fond de la carte</p></div><div class="seg"><button type="button" class="' + (fond === 'forme' ? 'on' : '') + '" data-a="setCarte" data-k="forme">En forme</button><button type="button" class="' + (fond === 'or' ? 'on' : '') + '" data-a="setCarte" data-k="or">Or</button></div>';
    if (pl.id !== reg('suivi')) h += '<button type="button" class="btn2" data-a="setSuivi">' + ICON.star.replace('<svg ', '<svg style="width:18px;height:18px;color:var(--c2)" ') + 'Choisir comme joueur suivi</button>';
  } else if (mine) {
    const wait = rows('Propositions').some(x => x.joueur === pl.id && x.statut === 'attente');
    h += '<button type="button" class="btn2" data-a="propPhoto">' + ICON.cam + 'Proposer une autre photo</button><p class="mu" style="text-align:center">' + (wait ? 'Photo envoyée : en attente de validation par l\'organisateur.' : 'L\'organisateur valide la photo avant qu\'elle n\'apparaisse sur la carte.') + '</p>';
  } else if (isParent() && kids.length < 2) h += '<button type="button" class="chip" style="align-self:center" data-a="kidAdd">C\'est mon fils</button>';
  h += '<div class="seg" role="tablist"><button type="button" class="' + (t === 'res' ? 'on' : '') + '" data-a="fTab" data-t="res">Résumé</button><button type="button" class="' + (t === 'det' ? 'on' : '') + '" data-a="fTab" data-t="det">Par type et saison</button></div>';
  h += '<div class="scroll-x">' + seasons().map(x => '<button type="button" class="chip' + (x.id === sid ? ' on' : '') + '" data-a="fSeason" data-id="' + x.id + '">' + esc(x.libelle) + '</button>').join('') + '<button type="button" class="chip' + (sid === '*' ? ' on' : '') + '" data-a="fSeason" data-id="*">Carrière</button></div>';
  h += t === 'res' ? resumeStats(pl.id, sid) : detailStats(pl.id, sid);
  if (mine) h += '<button type="button" class="chip" style="align-self:center;margin-top:8px" data-a="kidDel">Ce n\'est pas mon fils</button>';
  h += '</div>';
  return { html: h };
};
const tl = (v, l, st) => '<div class="tile"><b' + (st ? ' style="' + st + '"' : '') + '>' + v + '</b><span>' + l + '</span></div>';
ACT.fTab = (el, d) => { cur().p.t = d.t; render(); };
ACT.fSeason = (el, d) => { cur().p.sid = d.id; render(); };
ACT.setCarte = (el, d) => { commit([put('Joueurs', { id: cur().p.pid, carte: d.k })]); render(); };
/* petites icônes du tableau de bord */
const SI = {
  pitch: '<svg viewBox="0 0 24 24" fill="none" stroke="#8FB4E8" stroke-width="1.8" aria-hidden="true"><rect x="2.5" y="5" width="19" height="14" rx="2"/><path d="M12 5v14"/><circle cx="12" cy="12" r="2.6"/><path d="M2.5 9h3v6h-3M21.5 9h-3v6h3"/></svg>',
  star: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2.8l2.8 5.8 6.3.9-4.6 4.4 1.1 6.3L12 17.2l-5.6 3 1.1-6.3-4.6-4.4 6.3-.9z" fill="#4CD08A"/></svg>',
  target: '<svg viewBox="0 0 24 24" fill="none" stroke="#FFC46B" stroke-width="1.8" aria-hidden="true"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.5" fill="#FFC46B"/></svg>',
  flame: '<svg viewBox="0 0 24 24" fill="none" stroke="#FF8A70" stroke-width="1.8" stroke-linejoin="round" aria-hidden="true"><path d="M12 3c1 3 4 4.5 4 8.5a4 4 0 0 1-8 0c0-2 1-3 1.5-4 .5 1.5 1.5 2 2.5 2 0-2.5-1-4.5 0-6.5z"/></svg>',
  cup: '<svg viewBox="0 0 24 24" fill="none" stroke="#FFC46B" stroke-width="1.8" aria-hidden="true"><path d="M8 4h8v5a4 4 0 0 1-8 0zM12 13v4M9.5 17h5v4h-5zM8 6H5a3 3 0 0 0 3 4M16 6h3a3 3 0 0 1-3 4"/></svg>',
  starO: '<svg viewBox="0 0 24 24" fill="none" stroke="#E5D52B" stroke-width="1.8" stroke-linejoin="round" aria-hidden="true"><path d="M12 2.8l2.8 5.8 6.3.9-4.6 4.4 1.1 6.3L12 17.2l-5.6 3 1.1-6.3-4.6-4.4 6.3-.9z"/></svg>',
  cal: '<svg viewBox="0 0 24 24" fill="none" stroke="#8FB4FF" stroke-width="1.8" aria-hidden="true"><rect x="3.5" y="5" width="17" height="15" rx="2"/><path d="M3.5 10h17M8 3v4M16 3v4"/></svg>',
  amical: '<svg viewBox="0 0 24 24" fill="none" stroke="#8FB4FF" stroke-width="1.8" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 7.5l4 3-1.5 4.5h-5L8 10.5z"/></svg>',
  plateau: '<svg viewBox="0 0 24 24" fill="none" stroke="#4CD08A" stroke-width="1.8" aria-hidden="true"><rect x="4" y="4" width="7" height="7" rx="1.5"/><rect x="13" y="4" width="7" height="7" rx="1.5"/><rect x="4" y="13" width="7" height="7" rx="1.5"/><rect x="13" y="13" width="7" height="7" rx="1.5"/></svg>',
  tournoi: '<svg viewBox="0 0 24 24" fill="none" stroke="#FFC46B" stroke-width="1.8" aria-hidden="true"><path d="M8 4h8v5a4 4 0 0 1-8 0zM12 13v4M9.5 17h5v4h-5z"/></svg>'
};
const TYPE_COL = { amical: '#8FB4FF', plateau: '#4CD08A', tournoi: '#FFC46B' };
/* matchs terminés d'un joueur, dans l'ordre chronologique (sid = saison ou '*') */
function playedMatches(pid, sid) {
  const evs = (sid === '*' ? rows('Rencontres').filter(e => DB.Saisons[e.saison] && TYPE_LBL[e.type]) : eventsOf(sid)).slice()
    .sort((a, b) => String(a.date + (a.heure || '')).localeCompare(String(b.date + (b.heure || ''))) || String(a.creeLe).localeCompare(String(b.creeLe)));
  const out = [];
  evs.forEach(e => matchesOf(e.id).filter(isDone).sort((a, b) => num(a.ordre) - num(b.ordre)).forEach(m => { if (inMatch(m, pid)) out.push({ e, m, x: playerLine(m, pid) }); }));
  return out;
}
/* exploits calculés tout seuls ; chacun garde la liste des matchs (ou du tournoi) concernés */
function exploits(pid, sid) {
  const pm = playedMatches(pid, sid), out = [];
  const wins = []; new Set(pm.filter(r => r.e.type === 'tournoi').map(r => r.e)).forEach(e => { if (e.statut === 'termine' && eventResult(e).txt === 'Vainqueur') wins.push(e); });
  if (wins.length) out.push({ ic: 'cup', t: plural(wins.length, 'tournoi gagné', 'tournois gagnés'), s: wins.map(e => e.titre).join(', '), ev: wins });
  const best = Math.max(0, ...pm.map(r => r.x.b + r.x.pd));
  if (best > 0) {
    const bm = pm.filter(r => r.x.b + r.x.pd === best), x = bm[0].x;
    const lbl = x.b >= 4 ? 'Quadruplé' : x.b === 3 ? 'Triplé' : x.b === 2 && !x.pd ? 'Doublé' : [x.b ? plural(x.b, 'but', 'buts') : '', x.pd ? plural(x.pd, 'passe D', 'passes D') : ''].filter(Boolean).join(' + ');
    out.push({ ic: 'starO', t: 'Meilleur match', s: lbl + (bm.length === 1 ? ' vs ' + (bm[0].m.adversaire || '?') : ' · ' + bm.length + ' fois'), ms: bm });
  }
  let run = [], top = [];
  pm.forEach(r => { if (r.x.b > 0) { run.push(r); if (run.length > top.length) top = run.slice(); } else run = []; });
  if (top.length >= 2) out.push({ ic: 'flame', t: top.length + ' matchs de suite', s: 'avec au moins 1 but', ms: top });
  const first = pm.find(r => r.x.b > 0);
  if (first) out.push({ ic: 'cal', t: sid === '*' ? '1er but' : '1er but de la saison', s: fdate(first.e.date) + ' vs ' + (first.m.adversaire || '?'), ms: [first] });
  return out;
}
let EXPL = [];
ACT.exploit = (el, d) => {
  const x = EXPL[+d.i]; if (!x) return;
  if (x.ev && x.ev.length === 1) return ACT.openEvent(null, { id: x.ev[0].id });
  if (x.ms && x.ms.length === 1) return ACT.openMatch(null, { id: x.ms[0].m.id });
  const items = x.ev ? x.ev.map(e => '<button type="button" class="it" data-a="openEvent" data-id="' + e.id + '">' + typeIcon(e.type) + '<div class="grow"><div class="t1">' + esc(evTitle(e)) + '</div><p class="mu">' + esc(fdate(e.date)) + '</p></div></button>')
    : x.ms.map(r => { const sc = score(r.m); return '<button type="button" class="it" data-a="openMatch" data-id="' + r.m.id + '">' + typeIcon(r.e.type) + '<div class="grow"><div class="t1">vs ' + esc(r.m.adversaire || '?') + '</div><p class="mu">' + esc(fdate(r.e.date) + (r.e.type !== 'amical' ? ' · ' + evTitle(r.e) : '')) + '</p></div><span class="sci">' + icBP(r.x.b, r.x.pd) + '</span><span class="cd ' + RCLS[result(r.m)] + '" style="font-size:20px;margin-left:8px">' + sc.p + '-' + sc.c + '</span></button>'; });
  openSheet('<h2>' + esc(x.t) + '</h2><p class="mu">' + esc(x.s) + '</p><div style="display:flex;flex-direction:column;gap:8px">' + items.join('') + '</div><button type="button" class="btn2" data-a="sheetClose">Fermer</button>');
};
function ring(pct, col, icon, val, lbl) {
  const p = Math.max(0, Math.min(100, Math.round(pct)));
  return '<div class="ring-w"><div class="ring" style="background:conic-gradient(' + col + ' 0 ' + p + '%, var(--s2) ' + p + '% 100%)"><div><span class="ri">' + icon + '</span><b>' + val + '</b></div></div><span>' + lbl + '</span></div>';
}
function resumeStats(pid, sid) {
  const st = stats(sid, pid), team = stats(sid), fr = n => String(n).replace('.', ',');
  let h = '<div class="tiles t3 icotiles">' +
    '<div class="tile"><span class="ti" style="background:#22304A">' + SI.pitch + '</span><b>' + st.mj + '</b><span>' + (st.mj > 1 ? 'matchs' : 'match') + '</span></div>' +
    '<div class="tile"><span class="ti big">' + IC_BALL + '</span><b style="color:var(--c2)">' + st.b + '</b><span>' + (st.b > 1 ? 'buts' : 'but') + '</span></div>' +
    '<div class="tile"><span class="ti big">' + IC_BOOT + '</span><b>' + st.pd + '</b><span>' + (st.pd > 1 ? 'passes D' : 'passe D') + '</span></div>' +
    '<div class="tile"><span class="ti" style="background:#173326">' + SI.star + '</span><b style="color:var(--win)">' + st.v + '</b><span>' + (st.v > 1 ? 'victoires' : 'victoire') + '</span></div>' +
    '<div class="tile"><span class="ti" style="background:#3A2A12">' + SI.target + '</span><b>' + (st.mj ? fr((st.b / st.mj).toFixed(1)) : '0') + '</b><span>but / match</span></div>' +
    '<div class="tile"><span class="ti" style="background:#3A1A1A">' + SI.flame + '</span><b>' + (st.b + st.pd) + '</b><span>buts + passes</span></div></div>';
  h += '<div class="rings">' +
    ring(st.mj ? st.v / st.mj * 100 : 0, 'var(--win)', SI.star, (st.mj ? Math.round(st.v / st.mj * 100) : 0) + '%', 'victoires<br>quand il joue') +
    ring(st.bp ? st.b / st.bp * 100 : 0, 'var(--c2)', IC_BALL, (st.bp ? Math.round(st.b / st.bp * 100) : 0) + '%', 'des buts<br>de l\'équipe') +
    ring(team.mj ? st.mj / team.mj * 100 : 0, '#6FB3FF', SI.pitch, st.mj + '/' + team.mj, 'matchs joués<br>' + (sid === '*' ? 'en carrière' : 'sur la saison')) + '</div>';
  EXPL = exploits(pid, sid);
  if (EXPL.length) h += '<p class="lbl">Ses exploits</p><div class="expl">' + EXPL.map((x, i) => '<button type="button" data-a="exploit" data-i="' + i + '"><span class="ei">' + SI[x.ic] + '</span><b>' + esc(x.t) + '</b><span>' + esc(x.s) + '</span></button>').join('') + '</div>';
  return h;
}
const HEAD_IC = '<span class="c" title="Matchs joués"><span class="hi">' + SI.pitch + '</span></span><span class="c" title="Buts"><span class="hi">' + IC_BALL + '</span></span><span class="c" title="Passes décisives"><span class="hi">' + IC_BOOT + '</span></span>';
function detailStats(pid, sid) {
  const ss = seasons(), st = stats(sid, pid), tot = st.b || 1;
  let h = '<div class="card" style="gap:0"><div class="tbl"><div class="tr th"><span style="flex:1">Où il marque</span>' + HEAD_IC + '</div>';
  ['amical', 'plateau', 'tournoi'].forEach(k => {
    const T = st.type[k];
    h += '<div class="tr"><div style="flex:1;display:flex;flex-direction:column;gap:6px;padding:8px 0;min-width:0"><div style="display:flex;align-items:center;gap:8px"><span class="hi">' + SI[k] + '</span><b style="font-size:15px">' + { amical: 'Amicaux', plateau: 'Plateaux', tournoi: 'Tournois' }[k] + '</b><span class="mu">· ' + T.ev + '</span></div><div class="bar2"><div style="width:' + Math.round(T.b / tot * 100) + '%;background:' + TYPE_COL[k] + '"></div></div></div><span class="c">' + T.mj + '</span><span class="c" style="color:var(--c2)">' + T.b + '</span><span class="c">' + T.pd + '</span></div>';
  });
  h += '<div class="tr"><span style="flex:1;font-weight:800">Total</span><span class="c">' + st.mj + '</span><span class="c" style="color:var(--c2)">' + st.b + '</span><span class="c">' + st.pd + '</span></div></div><p class="mu" style="padding-top:6px">Barre = part de ses buts</p></div>';
  h += '<div class="card" style="gap:0"><div class="tbl"><div class="tr th"><span style="flex:1">Par saison</span>' + HEAD_IC + '</div>';
  ss.forEach(s => {
    const x = stats(s.id, pid), lg = imgData(s.logo);
    h += '<div class="tr">' + (lg ? '<img src="' + lg + '" alt="" style="width:30px;height:30px;object-fit:contain">' : '<span class="sw" style="background:' + esc(s.couleur1) + '"></span>') + '<div style="flex:1;min-width:0"><div style="font-weight:700">' + esc(s.libelle) + '</div><p class="mu">' + esc([s.club, s.categorie].filter(Boolean).join(' · ')) + (s.statut === 'archivee' ? '' : ' · en cours') + '</p></div><span class="c">' + x.mj + '</span><span class="c" style="color:var(--c2)">' + x.b + '</span><span class="c">' + x.pd + '</span></div>';
  });
  return h + '</div></div>';
}

/* ---------- photo de la carte (comme dans FUT 5V5 : choisir, zoomer, déplacer) ---------- */
let PE = null;
ACT.photoNew = async () => {
  const f = await pickFile(); if (!f) return;
  try {
    const data = await shrinkPhoto(await readFile(f), 1100);
    PE = { pid: cur().p.pid, data, img: await loadImage(data), cadre: { zoom: 1, ox: 0, oy: 0 }, isNew: true };
    photoEditor();
  } catch (e) { toast('Impossible de lire cette image.'); }
};
/* V2 : un parent propose une photo pour son enfant (l'organisateur valide) */
ACT.propPhoto = async () => {
  const pid = cur().p.pid; if (!myKids().includes(pid)) return;
  const f = await pickFile(); if (!f) return;
  try {
    const data = await shrinkPhoto(await readFile(f), 1100);
    PE = { pid, data, img: await loadImage(data), cadre: { zoom: 1, ox: 0, oy: 0 }, isNew: true, prop: true };
    photoEditor();
  } catch (e) { toast('Impossible de lire cette image.'); }
};
ACT.photoEdit = async () => {
  const p = player(cur().p.pid), d = imgData(p.photo); if (!d) return toast('Photo en cours de chargement…');
  PE = { pid: p.id, data: d, img: await loadImage(d), cadre: Object.assign({ zoom: 1, ox: 0, oy: 0 }, p.photoCadre || {}), isNew: false };
  photoEditor();
};
function photoEditor() {
  const s = Math.min(.78, (Math.min(window.innerWidth, 520) - 60) / PFT_CARDS.W);
  openSheet('<h2>' + (PE.prop ? 'Proposer une photo' : 'Photo de la carte') + '</h2><div class="photo-ed" style="display:flex;flex-direction:column;gap:12px"><canvas id="peCv" style="width:' + Math.round(PFT_CARDS.W * s) + 'px;height:' + Math.round(PFT_CARDS.H * s) + 'px"></canvas>' +
    '<label class="flab" for="peZ">Zoom</label><input id="peZ" class="range" type="range" min="1" max="3" step="0.01" value="' + PE.cadre.zoom + '"><p class="mu" style="text-align:center">Fais glisser la photo pour la placer.</p></div>' +
    '<div class="row">' + (PE.isNew ? '' : '<button type="button" class="btn2 danger" id="peDel" style="flex:none;width:auto">' + ICON.trash + '</button>') + '<button type="button" class="btn2" data-a="sheetClose">Annuler</button><button type="button" class="btn" id="peOk">Enregistrer</button></div>');
  const cv = $('#peCv'), dpr = Math.min(3, window.devicePixelRatio || 1);
  const draw = () => { const d = cardData(PE.pid, true); d.photoImg = PE.img; d.cadre = PE.cadre; PFT_CARDS.drawCard(cv, d, s * dpr); };
  draw();
  $('#peZ').oninput = e => { PE.cadre.zoom = +e.target.value; draw(); };
  let drag = null;
  cv.onpointerdown = e => { drag = { x: e.clientX, y: e.clientY, ox: PE.cadre.ox, oy: PE.cadre.oy }; cv.setPointerCapture(e.pointerId); };
  cv.onpointermove = e => { if (!drag) return; PE.cadre.ox = drag.ox + (e.clientX - drag.x) / s; PE.cadre.oy = drag.oy + (e.clientY - drag.y) / s; draw(); };
  cv.onpointerup = cv.onpointercancel = () => { drag = null; };
  $('#peOk').onclick = () => {
    if (PE.prop) {
      const c = { zoom: +PE.cadre.zoom.toFixed(3), ox: Math.round(PE.cadre.ox), oy: Math.round(PE.cadre.oy) }, img = uid('IMG');
      commit([{ op: 'img', id: img, data: PE.data, type: 'proposition' }, put('Propositions', { id: uid('PR'), joueur: PE.pid, parent: ME.id, image: img, cadre: c, statut: 'attente', creeLe: nowIso() })]);
      PE = null; closeSheet(); toast('Photo envoyée : l\'organisateur va la valider'); return;
    }
    const ops = [], p = player(PE.pid), c = { zoom: +PE.cadre.zoom.toFixed(3), ox: Math.round(PE.cadre.ox), oy: Math.round(PE.cadre.oy) };
    let photo = p.photo;
    if (PE.isNew) { photo = uid('IMG'); ops.push({ op: 'img', id: photo, data: PE.data, type: 'photo' }); if (p.photo) ops.push(del('Images', p.photo)); }
    ops.push(put('Joueurs', { id: p.id, photo, photoCadre: c }));
    commit(ops); PE = null; closeSheet(); toast('Photo enregistrée');
  };
  if (!PE.isNew) $('#peDel').onclick = () => { const p = player(PE.pid); commit([del('Images', p.photo), put('Joueurs', { id: p.id, photo: '', photoCadre: null })]); PE = null; closeSheet(); };
}

/* ---------- palmarès ---------- */
SCREENS.palmares = () => {
  const ss = seasons(), pid = suiviId(), cs = reg('saison');
  let h = topBar('Palmarès', ss.length + ' saison' + (ss.length > 1 ? 's' : '') + ' · ' + new Set(ss.map(s => s.club)).size + ' club' + (new Set(ss.map(s => s.club)).size > 1 ? 's' : ''));
  h += '<div class="main">';
  ss.forEach(s => {
    const t = stats(s.id), me = stats(s.id, pid), lg = imgData(s.logo), bt = bestTournament(s.id), on1 = onColor(s.couleur1 || '#2A4B71');
    h += '<button type="button" class="season' + (s.id === cs ? ' cur' : '') + '" data-a="palSeason" data-id="' + s.id + '"><div class="sh" style="background:' + esc(s.couleur1) + ';color:' + on1 + '">' + (lg ? '<img src="' + lg + '" alt="">' : '') +
      '<div style="flex:1;min-width:0"><div class="cd" style="font-size:19px">' + esc(s.libelle) + '</div><div style="font-size:13px;opacity:.86">' + esc([s.club, s.categorie].filter(Boolean).join(' · ')) + '</div></div>' +
      (s.id === cs ? '<span style="background:' + esc(s.couleur2) + ';color:' + onColor(s.couleur2 || '#E5D52B') + ';border-radius:7px;padding:3px 8px;font-size:12px;font-weight:700">En cours</span>' : '<span style="font-size:12px;font-weight:700;opacity:.85">Archivée</span>') + '</div>' +
      '<div class="sb"><div><b>' + t.mj + '</b><span>matchs</span></div><div><b>' + vndDash(t.v, t.n, t.d) + '</b><span>V-N-D</span></div><div><b class="bp"><span class="bpi">' + IC_BALL + '</span>' + me.b + '<span class="bpi">' + IC_BOOT + '</span>' + me.pd + '</b></div></div>' +
      (bt ? '<div class="tr">' + ICON.trophy.replace('class="ic"', 'class="ic" style="width:16px;height:16px"') + esc(bt.r.txt + ' · ' + bt.e.titre) + '</div>' : '<div style="height:8px"></div>') + '</button>';
  });
  const car = stats('*', pid);
  h += '<div class="card" style="flex-direction:row;align-items:center"><div style="flex:1"><div style="font-weight:700">Carrière de ' + esc(pname(pid)) + '</div><p class="mu">' + car.mj + ' matchs · ' + bpLine(car.b, car.pd) + '</p></div><button type="button" class="chip" data-a="go" data-s="fiche" data-p=\'{"pid":"' + pid + '","t":"det","sid":"*"}\'>Détail</button></div>';
  h += playersTable(PAL);
  h += '</div>';
  return { html: h, tab: 'palmares' };
};
/* tableau des joueurs, triable en touchant l'en-tête d'une colonne */
const PAL = { sid: '', k: 'b', dir: -1 };
const PCOLS = [['mj', 'MJ', 'Matchs joués'], ['b', 'Buts', ''], ['pd', 'PD', 'Passes décisives'], ['am', 'Amic.', 'Matchs amicaux'], ['pl', 'Plat.', 'Matchs en plateau'], ['to', 'Tourn.', 'Matchs en tournoi'], ['bm', 'B/M', 'Buts par match'], ['pm', 'PD/M', 'Passes D par match'], ['v', 'Vict.', 'Victoires']];
function playersTable(P) {
  const ss = seasons(), sid = P.sid || reg('saison');
  const ids = new Set();
  if (sid === '*') { ss.forEach(s => (s.effectif || []).forEach(x => ids.add(x))); }
  else (DB.Saisons[sid] && DB.Saisons[sid].effectif || []).forEach(x => ids.add(x));
  const list = Array.from(ids).filter(player).map(id => {
    const st = stats(sid, id);
    return { id, nom: pname(id), mj: st.mj, b: st.b, pd: st.pd, am: st.type.amical.mj, pl: st.type.plateau.mj, to: st.type.tournoi.mj, bm: st.mj ? st.b / st.mj : 0, pm: st.mj ? st.pd / st.mj : 0, v: st.v };
  });
  const k = P.k, dir = P.dir;
  list.sort((a, b) => k === 'nom' ? dir * String(a.nom).localeCompare(b.nom) : dir * (a[k] - b[k]) || String(a.nom).localeCompare(b.nom));
  const f = (r, c) => c === 'bm' || c === 'pm' ? r[c].toFixed(2).replace('.', ',') : r[c];
  let h = '<div class="lbl-row" style="margin-top:6px"><p class="lbl">Statistiques des joueurs</p></div>';
  h += '<div class="scroll-x">' + ss.map(s => '<button type="button" class="chip' + (s.id === sid ? ' on' : '') + '" data-a="palTSeason" data-id="' + s.id + '">' + esc(s.libelle) + '</button>').join('') + '<button type="button" class="chip' + (sid === '*' ? ' on' : '') + '" data-a="palTSeason" data-id="*">Toutes</button></div>';
  if (!list.length) return h + '<div class="empty">Aucun joueur pour cette saison.</div>';
  const arrow = c => c === k ? (dir < 0 ? ' ▼' : ' ▲') : '';
  h += '<div class="ptable-wrap"><table class="ptable"><thead><tr><th class="pn"><button type="button" data-a="palSort" data-k="nom">Joueur' + arrow('nom') + '</button></th>' +
    PCOLS.map(c => '<th><button type="button" data-a="palSort" data-k="' + c[0] + '" title="' + esc(c[2] || c[1]) + '"' + (c[0] === k ? ' class="on"' : '') + '>' + c[1] + arrow(c[0]) + '</button></th>').join('') + '</tr></thead><tbody>' +
    list.map(r => '<tr' + (r.id === suiviId() ? ' class="me"' : '') + '><th class="pn"><button type="button" data-a="go" data-s="fiche" data-p=\'{"pid":"' + r.id + '"}\'>' + esc(r.nom) + '</button></th>' + PCOLS.map(c => '<td' + (c[0] === k ? ' class="on"' : '') + '>' + f(r, c[0]) + '</td>').join('') + '</tr>').join('') +
    '</tbody></table></div><p class="mu">Touche un titre de colonne pour trier · MJ = matchs joués · B/M et PD/M = moyenne par match.</p>';
  return h;
}
ACT.palSort = (el, d) => { if (PAL.k === d.k) PAL.dir = -PAL.dir; else { PAL.k = d.k; PAL.dir = d.k === 'nom' ? 1 : -1; } render(); };
ACT.palTSeason = (el, d) => { PAL.sid = d.id; render(); };
ACT.palSeason = (el, d) => { NAV = [{ s: 'list', p: { sid: d.id } }]; render(); };

/* ---------- réglages ---------- */
SCREENS.settings = () => {
  if (isParent()) return parentSettings();
  const S = curSeason(), lg = imgData(S.logo), st = stats(S.id);
  let h = topBar('Réglages', 'Dans la Lucarne · version ' + VERSION_APP, { logo: false });
  h += '<div class="main">';
  if (!isStandalone()) h += installCard(false);
  h += '<div class="card"><p class="lbl">Club</p><div class="row">' + (lg ? '<img src="' + lg + '" alt="" style="width:50px;height:50px;object-fit:contain">' : '') + '<div style="flex:1"><div class="cd" style="font-size:20px">' + esc(S.club) + '</div><p class="mu">' + esc([S.abrev, S.categorie].filter(Boolean).join(' · ')) + '</p></div><span class="sw" style="background:var(--c1)"></span><span class="sw" style="background:var(--c2)"></span></div>' +
    '<button type="button" class="btn2" data-a="go" data-s="setup" data-p=\'{"edit":1}\'>Modifier ou changer de club</button><p class="mu">Logo, couleurs, nom et abréviation de la saison en cours. Les saisons passées gardent leur logo dans le Palmarès.</p></div>';
  h += '<div class="card"><p class="lbl">Saison</p><div class="lbl-row"><span class="cd" style="font-size:22px">' + esc(S.libelle) + '</span><span style="font-size:13px;font-weight:700;color:var(--win)">En cours</span></div><p class="mu">' + st.mj + ' matchs · ' + eventsOf(S.id).length + ' rencontres</p><button type="button" class="btn" data-a="go" data-s="endSeason">Archiver et démarrer la saison suivante</button></div>';
  h += '<div class="card"><p class="lbl">Données</p><div class="row"><span id="syncDot" class="syncdot ' + syncState() + '"></span><div style="flex:1"><div style="font-weight:600">Google Sheet · enregistrement automatique</div><p class="mu" id="syncTxt">' + esc(syncText()) + '</p></div></div>' +
    (REJECTED.length ? '<div style="background:#2A1416;border:1px solid #5A2A2A;border-radius:12px;padding:10px 12px"><b style="color:#FF8F86">' + REJECTED.length + ' modification(s) refusée(s) par le Google Sheet</b><p class="mu">' + esc(REJECTED[REJECTED.length - 1].err) + '</p><div class="row" style="margin-top:8px"><button type="button" class="btn2" data-a="rejRetry">Réessayer</button><button type="button" class="btn2" data-a="rejDrop">Ignorer</button></div></div>' : '') +
    '<button type="button" class="btn2" data-a="diag">Tester la connexion</button>' +
    (SYNC.sheetUrl ? '<a class="btn2" href="' + esc(SYNC.sheetUrl) + '" target="_blank" rel="noopener">Ouvrir le Google Sheet</a>' : '') +
    '</div>';
  /* V2 : parents et photos proposées */
  const P = rows('Parents'), nProp = rows('Propositions').filter(x => x.statut === 'attente').length;
  h += '<div class="card"><p class="lbl">Parents (consultation)</p><p class="mu">' + (P.length ? P.length + ' parent' + (P.length > 1 ? 's' : '') + ' · ' + P.filter(x => x.appareils > 0 && x.actif !== 'non').length + ' connecté' + (P.filter(x => x.appareils > 0).length > 1 ? 's' : '') : 'Invite les parents : chacun reçoit son propre lien, sans code à taper.') + '</p><button type="button" class="btn" data-a="go" data-s="parents">Gérer les parents</button>' +
    (nProp ? '<button type="button" class="btn2" data-a="go" data-s="props" style="color:#FFC46B">' + nProp + ' photo' + (nProp > 1 ? 's proposées' : ' proposée') + ' à valider</button>' : '') + '</div>';
  h += '<div class="card"><p class="lbl">Ce téléphone</p><p class="mu">Connecté en administrateur' + (ME && ME.nom && ME.id ? ' (' + esc(ME.nom) + ')' : '') + '.</p><button type="button" class="btn2" data-a="accOut">Se déconnecter de ce téléphone</button></div>';
  h += '</div>';
  return { html: h, tab: 'settings' };
};
ACT.rejRetry = () => { REJECTED.forEach(r => OUTBOX.push(r.op)); REJECTED = []; LS.set('rejected', []); saveOutbox(); SYNC.since = Date.now(); flushSoon(100); render(); };
ACT.rejDrop = async () => { if (!await confirmBox('Ignorer ?', 'Ces modifications refusées ne seront pas enregistrées dans le Google Sheet.', 'Ignorer', true)) { render(); return; } REJECTED = []; LS.set('rejected', []); rebuildDb(); render(); };
/* test de connexion (diagnostic) : temps de réponse, version du script, code */
ACT.diag = async () => {
  openSheet('<h2>Test de connexion</h2><div class="card" style="align-items:center"><div class="spin"></div><p class="mu">Appel du script Google…</p></div>');
  const t0 = Date.now(); let ok = false, lines = [];
  try {
    const r = await api('ping', [CODE], 20000);
    ok = true;
    lines = [['Script Google', 'répond en ' + ((Date.now() - t0) / 1000).toFixed(1).replace('.', ',') + ' s'], ['Version du script', r.version || '1.0 / 1.1 (à mettre à jour)'], ['Code d\'accès', 'accepté']];
  } catch (e) { lines = [['Problème', e.message], ['Délai', ((Date.now() - t0) / 1000).toFixed(1).replace('.', ',') + ' s']]; }
  lines.push(['En attente d\'envoi', String(OUTBOX.length)], ['Refusées', String(REJECTED.length)], ['Dernier envoi réussi', SYNC.last ? new Date(SYNC.last).toLocaleString('fr-FR') : 'jamais'], ['Appli', 'version ' + VERSION_APP]);
  if (SYNC.error) lines.push(['Dernière erreur', SYNC.error]);
  openSheet('<h2>' + (ok ? 'Connexion OK' : 'Connexion impossible') + '</h2><div class="tbl">' + lines.map(l => '<div class="tr"><span class="mu" style="flex:1">' + esc(l[0]) + '</span><span style="font-weight:700;text-align:right;max-width:60%">' + esc(l[1]) + '</span></div>').join('') + '</div><button type="button" class="btn" data-a="sheetClose">Fermer</button>');
  if (ok && OUTBOX.length) flushSoon(50);
};
/* ---------- V2 : réglages d'un parent ---------- */
function parentSettings() {
  const S = curSeason(), kids = myKids();
  let h = topBar('Réglages', 'Dans la Lucarne · version ' + VERSION_APP, { logo: false });
  h += '<div class="main">';
  if (!isStandalone()) h += installCard(false);
  h += '<div class="card"><p class="lbl">' + (kids.length > 1 ? 'Mes enfants' : 'Mon enfant') + '</p>' + (kids.length ? kids.map(k => '<button type="button" class="it" data-a="kidSwitch" data-id="' + k + '"><span class="grow" style="font-weight:700">' + esc(pname(k)) + '</span>' + (k === suiviId() ? '<span style="color:var(--c2);font-weight:700">Affiché</span>' : '<span class="mu">Afficher</span>') + '</button>').join('') : '<p class="mu">Pas encore choisi.</p>') +
    '<button type="button" class="btn2" data-a="go" data-s="welcome">' + (kids.length ? 'Modifier' : 'Choisir mon enfant') + '</button></div>';
  h += '<div class="card"><p class="lbl">Accès</p><p class="mu">Tu consultes l\'appli de ' + esc(S.club || 'l\'équipe') + ' avec ton lien personnel' + (ME && ME.nom ? ' (' + esc(ME.nom) + ')' : '') + '. Ne le transfère pas : il ne marche que sur 2 téléphones.</p><div class="row"><span id="syncDot" class="syncdot ' + syncState() + '"></span><p class="mu" id="syncTxt" style="flex:1">' + esc(syncText()) + '</p></div><button type="button" class="btn2" data-a="diag">Tester la connexion</button></div>';
  h += '</div>';
  return { html: h, tab: 'settings' };
}
ACT.kidSwitch = (el, d) => { LS.set('kid', d.id); render(); };
ACT.accOut = async () => {
  if (!await confirmBox('Se déconnecter ?', 'Ce téléphone oubliera le code administrateur. Il faudra le retaper pour revenir.', 'Se déconnecter', true)) { render(); return; }
  CODE = ''; LS.del('code'); ME = null; LS.del('me'); NAV = [{ s: 'acces', p: {} }]; render();
};

/* ---------- V2 : écran d'accès (gris neutre, rien du club n'est affiché) ---------- */
SCREENS.acces = () => {
  const msg = { lien: ['Lien déjà utilisé', 'Ce lien personnel sert déjà sur 2 téléphones. Demande ton propre lien à l\'organisateur.'], coupe: ['Accès coupé', 'Ton accès a été coupé par l\'organisateur. Les données ont été effacées de ce téléphone.'], code: ['Code refusé', 'Le code administrateur a changé ou n\'est pas le bon.'], bloque: ['Trop d\'essais', 'Le code administrateur est bloqué 15 minutes. Réessaie plus tard.'] }[ACCESS_MSG];
  let h = '<div class="main" style="padding-top:40px;gap:16px"><div style="display:flex;flex-direction:column;align-items:center;gap:10px;text-align:center"><img src="icons/icon-192.png" alt="" style="width:84px;height:84px;border-radius:20px"><div class="cd" style="font-size:30px">Dans la Lucarne</div></div>';
  if (msg) h += '<div class="card" style="text-align:center;border:1px solid var(--line)"><b style="font-size:18px">' + msg[0] + '</b><p class="mu">' + msg[1] + '</p></div>';
  h += '<div class="card"><p class="lbl">Tu as reçu un lien ?</p><p class="mu">Ouvre simplement le lien reçu sur WhatsApp. Si l\'appli installée ne s\'ouvre pas avec ton accès (iPhone), copie le lien puis :</p><button type="button" class="btn" data-a="accPaste">Coller mon lien</button><div class="field"><label for="accL">ou colle-le ici</label><input id="accL" class="inp" autocomplete="off" placeholder="https://…#cle=…"></div><button type="button" class="btn2" data-a="accLink">Valider le lien</button></div>';
  h += '<div class="card"><p class="lbl">Organisateur</p><div class="field"><label for="accC">Code administrateur</label><div class="row"><input id="accC" class="inp" type="password" autocomplete="off" style="flex:1;color:#121315;background:#F1F1F2"><button type="button" class="btn2" data-a="accEye" style="flex:none;width:auto" aria-label="Afficher le code">👁</button></div></div><button type="button" class="btn2" data-a="accAdmin">Entrer</button></div>';
  h += '</div>';
  return { html: h, neutral: true };
};
function useLink(txt) {
  const m = /cle=([A-Za-z0-9]{64})/.exec(String(txt || ''));
  if (!m) return toast('Ce n\'est pas un lien d\'accès Dans la Lucarne.');
  wipeLocal(); CODE = m[1]; LS.set('code', CODE); ACCESS_MSG = ''; SYNC.first = false;
  NAV = [{ s: 'home', p: {} }]; render(); flush();
}
ACT.accPaste = async () => { try { useLink(await navigator.clipboard.readText()); } catch (e) { toast('Colle le lien dans la case en dessous.'); } };
ACT.accLink = () => useLink($('#accL').value);
ACT.accEye = () => { const i = $('#accC'); i.type = i.type === 'password' ? 'text' : 'password'; };
ACT.accAdmin = async () => {
  const c = $('#accC').value.trim(); if (!c) return toast('Tape le code administrateur.');
  try {
    const r = await api('ping', [c]);
    if (!r.moi || r.moi.role !== 'admin') return toast('Ce code n\'est pas un code administrateur.');
    CODE = c; LS.set('code', c); ME = r.moi; LS.set('me', ME); ACCESS_MSG = ''; SYNC.error = ''; SYNC.kind = ''; SYNC.first = false;
    NAV = [{ s: 'home', p: {} }]; render(); flush();
  } catch (e) { toast(e.acc === 'BLOQUE' ? 'Trop d\'essais : code bloqué 15 minutes.' : e.badCode ? 'Code refusé.' : e.message); }
};

/* ---------- V2 : « C'est mon fils » ---------- */
let KID = '';
SCREENS.welcome = () => {
  const R = roster(), kids = myKids();
  let h = '<div class="welcome-top"><div class="cd" style="font-size:30px">Bienvenue' + (ME && ME.nom ? ' ' + esc(ME.nom) : '') + ' !</div><p>' + (kids.length ? 'Touche la carte d\'un enfant pour l\'ajouter ou le retirer (2 au maximum).' : 'Touche la carte de ton enfant.') + '</p></div><div class="main">';
  h += '<div class="cards-grid">' + R.map(p => '<button type="button" data-a="kidPick" data-id="' + p.id + '" class="' + (KID === p.id ? 'kid-sel' : kids.includes(p.id) ? 'kid-on' : '') + '">' + cardCv(p.id, .29) + '</button>').join('') + '</div>';
  if (KID) {
    const has = kids.includes(KID);
    h += '<div class="card kid-panel"><b style="font-size:17px">' + esc(pname(KID)) + (has ? ' n\'est pas ton enfant ?' : ' est ton enfant ?') + '</b><button type="button" class="btn" data-a="kidOk">' + (has ? 'Ce n\'est pas mon fils' : 'C\'est mon fils') + '</button><p class="mu">L\'organisateur le voit et peut corriger si besoin.</p></div>';
  }
  if (kids.length) h += '<button type="button" class="btn2" data-a="home">Terminé</button>';
  if (!isStandalone()) h += installCard(false);
  h += '</div>';
  return { html: h };
};
ACT.kidPick = (el, d) => { KID = KID === d.id ? '' : d.id; render(); };
function setKids(list) {
  if (!ME || !ME.id) return toast('Accès en cours de vérification, réessaie dans un instant.');
  commit([put('Parents', { id: ME.id, enfants: list })]);
  ME.enfants = list; LS.set('me', ME);
}
ACT.kidOk = () => {
  const k = myKids();
  if (k.includes(KID)) setKids(k.filter(x => x !== KID));
  else { if (k.length >= 2) return toast('2 enfants au maximum.'); setKids(k.concat(KID)); LS.set('kid', KID); }
  KID = ''; if (myKids().length) NAV = [{ s: 'home', p: {} }]; render();
};
ACT.kidAdd = () => { const k = myKids(), id = cur().p.pid; if (k.length >= 2 || k.includes(id)) return; setKids(k.concat(id)); LS.set('kid', id); toast(pname(id) + ' ajouté : c\'est ton fils'); render(); };
ACT.kidDel = async () => { const id = cur().p.pid; if (!await confirmBox('Ce n\'est pas ton fils ?', pname(id) + ' sera retiré de tes enfants.', 'Retirer')) { render(); return; } setKids(myKids().filter(x => x !== id)); render(); };

/* ---------- V2 : parents (organisateur) ---------- */
SCREENS.parents = () => {
  const P = rows('Parents').sort((a, b) => String(a.nom).localeCompare(b.nom));
  let h = topBar('Parents', 'Accès en consultation · ' + P.length + ' parent' + (P.length > 1 ? 's' : ''), { back: true });
  h += '<div class="main"><p class="mu">Chaque parent reçoit son propre lien : il voit tout mais ne peut rien modifier (sauf choisir son enfant et proposer une photo). Un lien marche sur 2 téléphones au maximum.</p>';
  P.forEach(x => {
    const kids = (x.enfants || []).map(pname).join(' et '), off = x.actif === 'non';
    h += '<div class="card par' + (off ? ' off' : '') + '"><div class="lbl-row"><div><b style="font-size:17px">' + esc(x.nom) + '</b>' + (x.admin === 'oui' ? ' <span class="badge" style="background:var(--c2);color:var(--on2)">Admin</span>' : '') + '<p class="mu">' + (kids ? 'Parent de <b style="color:var(--c2)">' + esc(kids) + '</b>' : 'Enfant pas encore choisi') + '</p></div><span class="mu" style="font-weight:700;white-space:nowrap">' + (off ? 'Accès coupé' : x.lien ? (x.appareils || 0) + ' / 2 tél.' : 'Pas de lien') + '</span></div>' +
      (off ? '<button type="button" class="btn2" data-a="pAcc" data-id="' + x.id + '" data-k="retablir">Rétablir (nouveau lien)</button>' :
        '<div class="row"><button type="button" class="btn wa" data-a="pSend" data-id="' + x.id + '">' + (x.lien ? 'Renvoyer son lien' : 'Envoyer son lien') + '</button><button type="button" class="btn2 danger" data-a="pAcc" data-id="' + x.id + '" data-k="couper" style="flex:none;width:auto">Couper</button></div>') +
      '<div class="row"><button type="button" class="chip" data-a="pKids" data-id="' + x.id + '">Enfants</button><button type="button" class="chip" data-a="pAcc" data-id="' + x.id + '" data-k="nouveau">Nouveau lien</button><button type="button" class="chip" data-a="pAdm" data-id="' + x.id + '">' + (x.admin === 'oui' ? 'Retirer admin' : 'Administrateur') + '</button><button type="button" class="chip" data-a="pDel" data-id="' + x.id + '">' + ICON.trash + '</button></div></div>';
  });
  h += '<button type="button" class="btn2 dash" data-a="pAdd">' + ICON.plus + 'Ajouter un parent</button></div>';
  return { html: h };
};
ACT.pAdd = () => {
  openSheet('<h2>Nouveau parent</h2><div class="field"><label for="paN">Prénom</label><input id="paN" class="inp" autocomplete="off"></div><div class="row"><button type="button" class="btn2" data-a="sheetClose">Annuler</button><button type="button" class="btn" id="paOk">Ajouter</button></div>');
  $('#paN').focus();
  $('#paOk').onclick = () => { const n = $('#paN').value.trim(); if (!n) return toast('Indique le prénom.'); commit([put('Parents', { id: uid('PA'), nom: n, actif: 'oui', admin: 'non', enfants: [], creeLe: nowIso() })]); closeSheet(); toast(n + ' ajouté : envoie-lui son lien'); };
};
async function parentApi(id, action) {
  if (OUTBOX.length) { await flush(); if (OUTBOX.length) await new Promise(r => setTimeout(r, 1500)); }
  return api('acces', [CODE, id, action]);
}
const appUrl = () => location.origin + location.pathname.replace(/index\.html$/, '');
ACT.pSend = async (el, d) => {
  const x = DB.Parents[d.id]; if (!x) return;
  openSheet('<h2>Lien de ' + esc(x.nom) + '</h2><div class="card" style="align-items:center"><div class="spin"></div><p class="mu">Préparation du lien…</p></div>');
  let r; try { r = await parentApi(x.id, 'lien'); } catch (e) { closeSheet(); return toast(e.message); }
  const S = curSeason() || {};
  const msg = 'Salut ' + x.nom + ' ! Voici ton accès à *Dans la Lucarne*, l\'appli des matchs de l\'équipe ' + (S.club || '') + ' ' + (S.categorie || '') + '.\nOuvre ce lien sur ton téléphone, puis appuie sur « Installer » :\n' + appUrl() + '#cle=' + r.jeton + '\n\nCe lien est personnel (il ne marche que sur 2 téléphones), ne le transfère pas.';
  openSheet('<h2>Lien de ' + esc(x.nom) + '</h2><div class="wa-msg">' + esc(msg).replace(/\n/g, '<br>') + '</div><a class="btn wa" href="https://wa.me/?text=' + encodeURIComponent(msg) + '" target="_blank" rel="noopener">Envoyer sur WhatsApp</a><button type="button" class="btn2" id="paCopy">Copier le message</button><button type="button" class="btn2" data-a="sheetClose">Fermer</button>');
  $('#paCopy').onclick = async () => { try { await navigator.clipboard.writeText(msg); toast('Message copié'); } catch (e) { toast('Copie impossible'); } };
};
ACT.pAcc = async (el, d) => {
  const x = DB.Parents[d.id]; if (!x) return;
  const txt = { couper: ['Couper l\'accès de ' + x.nom + ' ?', 'Son lien ne marchera plus et ses téléphones effaceront les données de l\'appli.', 'Couper l\'accès'], nouveau: ['Nouveau lien pour ' + x.nom + ' ?', 'L\'ancien lien ne marchera plus (téléphone perdu, lien transféré…). Il faudra lui envoyer le nouveau.', 'Nouveau lien'], retablir: ['Rétablir ' + x.nom + ' ?', 'Un nouveau lien sera créé : envoie-le-lui ensuite.', 'Rétablir'] }[d.k];
  if (!await confirmBox(txt[0], txt[1], txt[2], d.k === 'couper')) { render(); return; }
  try { await parentApi(x.id, d.k); toast(d.k === 'couper' ? 'Accès coupé' : 'Nouveau lien prêt : envoie-le'); flush(); } catch (e) { toast(e.message); }
};
ACT.pAdm = async (el, d) => {
  const x = DB.Parents[d.id]; if (!x) return; const on = x.admin !== 'oui';
  if (on && !await confirmBox(x.nom + ' administrateur ?', x.nom + ' pourra tout modifier comme toi (rencontres, buts, effectif, parents).', 'Oui, administrateur')) { render(); return; }
  commit([put('Parents', { id: x.id, admin: on ? 'oui' : 'non' })]); render();
};
ACT.pDel = async (el, d) => {
  const x = DB.Parents[d.id]; if (!x) return;
  if (!await confirmBox('Supprimer ' + x.nom + ' ?', 'Son accès est coupé définitivement.', 'Supprimer', true)) { render(); return; }
  try { await parentApi(x.id, 'couper'); } catch (e) {}
  commit([del('Parents', x.id)]); render();
};
ACT.pKids = (el, d) => {
  const x = DB.Parents[d.id]; if (!x) return; const sel = new Set(x.enfants || []);
  openSheet('<h2>Enfants de ' + esc(x.nom) + '</h2><div style="display:flex;flex-direction:column;gap:6px">' + roster().map(p => '<label class="row" style="min-height:44px;font-weight:600"><input type="checkbox" value="' + p.id + '"' + (sel.has(p.id) ? ' checked' : '') + ' style="width:22px;height:22px;accent-color:var(--c2)">' + esc(p.nom) + '</label>').join('') + '</div><div class="row"><button type="button" class="btn2" data-a="sheetClose">Annuler</button><button type="button" class="btn" id="pkOk">Enregistrer</button></div>');
  $('#pkOk').onclick = () => { const l = $$('#sheet input:checked').map(i => i.value).slice(0, 2); commit([put('Parents', { id: x.id, enfants: l })]); closeSheet(); };
};

/* ---------- V2 : photos proposées par les parents ---------- */
SCREENS.props = () => {
  const L = rows('Propositions').filter(x => x.statut === 'attente').sort((a, b) => String(a.creeLe).localeCompare(b.creeLe));
  let h = topBar('Photos proposées', L.length ? L.length + ' à valider' : 'Rien à valider', { back: true }) + '<div class="main">';
  if (!L.length) h += '<div class="empty">Aucune photo en attente.</div>';
  L.forEach(x => {
    h += '<div class="card"><p class="mu">Par ' + esc((DB.Parents[x.parent] || {}).nom || 'un parent') + ' pour <b style="color:var(--c2)">' + esc(pname(x.joueur)) + '</b> · ' + esc(fdate(String(x.creeLe).slice(0, 10))) + '</p><div class="row" style="justify-content:center;align-items:flex-end;gap:14px"><div style="display:flex;flex-direction:column;align-items:center;gap:6px"><span class="mu">Actuelle</span>' + cardCv(x.joueur, .3) + '</div><div style="display:flex;flex-direction:column;align-items:center;gap:6px"><span style="color:var(--c2);font-weight:700;font-size:12px">PROPOSÉE</span><canvas class="prop-cv" data-id="' + x.id + '" style="width:' + Math.round(PFT_CARDS.W * .36) + 'px;height:' + Math.round(PFT_CARDS.H * .36) + 'px"></canvas></div></div>' +
      '<div class="row"><button type="button" class="btn" style="background:var(--win);color:#08311A" data-a="propOk" data-id="' + x.id + '">Accepter</button><button type="button" class="btn2 danger" data-a="propNo" data-id="' + x.id + '">Refuser</button></div></div>';
  });
  h += '</div>';
  return { html: h, after: paintProps };
};
function paintProps() {
  const dpr = Math.min(3, window.devicePixelRatio || 1);
  $$('canvas.prop-cv').forEach(cv => {
    const x = DB.Propositions[cv.dataset.id]; if (!x) return;
    const d = cardData(x.joueur, false), im = imgEl(x.image); d.photoImg = im; d.cadre = x.cadre;
    try { PFT_CARDS.drawCard(cv, d, .36 * dpr); } catch (e) {}
  });
}
ACT.propOk = (el, d) => {
  const x = DB.Propositions[d.id]; if (!x) return; const p = player(x.joueur);
  const ops = [put('Joueurs', { id: x.joueur, photo: x.image, photoCadre: x.cadre }), put('Propositions', { id: x.id, statut: 'acceptee' })];
  if (p && p.photo && p.photo !== x.image) ops.push(del('Images', p.photo));
  commit(ops); toast('Photo acceptée'); render();
};
ACT.propNo = (el, d) => { const x = DB.Propositions[d.id]; if (!x) return; commit([put('Propositions', { id: x.id, statut: 'refusee' }), del('Images', x.image)]); toast('Photo refusée'); render(); };

/* consultation : les boutons de modification sont cachés (et bloqués) chez les parents */
(function roStyle() {
  const hide = Object.keys(ACT).filter(k => !RO_OK.has(k) && k !== 'lEdit').map(k => '.ro [data-a="' + k + '"]');
  hide.push('.ro [data-s="setup"]', '.ro [data-s="endSeason"]', '.ro [data-s="compo"]', '.ro [data-s="new"]', '.ro [data-s="parents"]', '.ro [data-s="props"]');
  const st = document.createElement('style');
  st.textContent = hide.join(',') + '{display:none!important}.ro [data-a="lEdit"]{pointer-events:none}';
  document.head.appendChild(st);
})();

ACT.changeCode = () => {
  openSheet('<h2>Code d\'accès</h2><p class="mu">Le code choisi dans le script Google (CODE_ACCES).</p><div class="field"><label for="ccC">Code</label><input id="ccC" class="inp" inputmode="numeric" value="' + esc(CODE) + '"></div><div class="row"><button type="button" class="btn2" data-a="sheetClose">Annuler</button><button type="button" class="btn" id="ccOk">Enregistrer</button></div>');
  $('#ccOk').onclick = async () => { const c = $('#ccC').value.trim(); try { await api('ping', [c]); CODE = c; LS.set('code', c); SYNC.error = ''; closeSheet(); flush(); toast('Code enregistré'); } catch (e) { toast(e.badCode ? 'Code refusé.' : e.message); } };
};

/* ---------- installation sur le téléphone ---------- */
let INSTALL_EVT = null;
window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); INSTALL_EVT = e; refresh(); });
window.addEventListener('appinstalled', () => { INSTALL_EVT = null; LS.set('installed', 1); toast('Dans la Lucarne est installée sur le téléphone'); refresh(); });
const isStandalone = () => (window.matchMedia && matchMedia('(display-mode: standalone)').matches) || navigator.standalone === true;
const isIOS = () => /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
function installCard(neutral) {
  return '<div class="install"' + (neutral ? '' : ' style="background:var(--c2);color:var(--on2)"') + '><img src="icons/icon-192.png" alt="" style="width:48px;height:48px;border-radius:12px"><div style="flex:1"><b>Installer l\'appli</b><div style="font-size:13px">Une icône sur l\'écran d\'accueil, en plein écran.</div></div><button type="button" data-a="install"' + (neutral ? '' : ' style="background:var(--on2);color:var(--c2)"') + '>Installer</button></div>';
}
ACT.install = async () => {
  if (INSTALL_EVT) { INSTALL_EVT.prompt(); try { await INSTALL_EVT.userChoice; } catch (e) {} INSTALL_EVT = null; refresh(); return; }
  const ios = isIOS();
  openSheet('<h2>Installer Dans la Lucarne</h2>' + (ios ?
    '<ol style="margin:0;padding-left:20px;line-height:1.7;font-size:16px"><li>Ouvre cette page dans <b>Safari</b>.</li><li>Touche le bouton <b>Partager</b> (carré avec une flèche vers le haut).</li><li>Choisis <b>« Sur l\'écran d\'accueil »</b>, puis <b>Ajouter</b>.</li></ol>' :
    '<ol style="margin:0;padding-left:20px;line-height:1.7;font-size:16px"><li>Ouvre cette page dans <b>Chrome</b>.</li><li>Touche le menu <b>⋮</b> en haut à droite.</li><li>Choisis <b>« Installer l\'application »</b> (ou « Ajouter à l\'écran d\'accueil »).</li></ol>') +
    '<button type="button" class="btn" data-a="sheetClose">J\'ai compris</button>');
};

/* ---------- configuration du club (premier lancement, ou changement de club) ---------- */
let SET = null;
SCREENS.setup = p => {
  const edit = !!p.edit && !!curSeason();
  const needCode = !edit && API_URL && !CODE;
  let h = '<div class="main" style="padding-top:calc(24px + var(--safe-t))">';
  h += '<div><p class="lbl">' + (edit ? 'Réglages' : 'Bienvenue dans Dans la Lucarne') + '</p><h1 class="cd" style="font-size:30px;margin:2px 0">' + (needCode ? 'Connexion' : edit ? 'Modifier le club' : 'Configurer le club') + '</h1><p class="mu">' + (edit ? 'Les changements s\'appliquent à la saison en cours.' : 'Modifiable plus tard dans Réglages (changement de club).') + '</p></div>';
  if (!isStandalone() && !edit) h += installCard(true);
  if (needCode) {
    h += '<div class="field"><label for="suCode">Code d\'accès</label><input id="suCode" class="inp" inputmode="numeric" autocomplete="off" placeholder="Code choisi dans le script Google"></div><button type="button" class="btn" data-a="suConnect">Continuer</button>';
    h += '<p class="mu">Le code se trouve en haut du script Google (ligne CODE_ACCES). Astuce : en l\'écrivant aussi dans config.js (ligne code), plus personne n\'aura à le saisir.</p></div>';
    return { html: h, neutral: true };
  }
  /* premier lancement : on regarde d'abord si le club est déjà configuré dans le Google Sheet */
  if (!edit && API_URL && CODE && !SYNC.first) {
    h += '<div class="card" style="align-items:center;text-align:center;padding:28px 16px"><div class="spin"></div><div style="font-weight:700">Connexion au Google Sheet…</div><p class="mu">Si le club est déjà configuré, l\'appli s\'ouvre directement.</p></div></div>';
    return { html: h, neutral: true };
  }
  if (!edit && SYNC.error && !curSeason()) h += '<div class="card" style="border:1px solid #5A2A2A"><b>Google Sheet injoignable</b><p class="mu">' + esc(SYNC.error) + ' Tu peux configurer quand même : tout sera envoyé dès que possible.</p></div>';
  if (!SET || SET.edit !== edit) SET = setupDraft(edit);
  const F = SET;
  h += '<div class="card"><div class="upl"><div class="pv">' + (F.logo ? '<img src="' + F.logo + '" alt="Logo du club">' : '<span class="mu" style="font-size:12px">Logo</span>') + '</div><div style="flex:1;display:flex;flex-direction:column;gap:6px"><p class="lbl">Logo du club</p><p class="mu">' + (F.logo ? 'Fond retiré automatiquement' : 'Une image du logo (PNG ou JPG)') + '</p><button type="button" class="btn2" style="min-height:40px" data-a="suLogo">' + (F.logo ? 'Changer le logo' : 'Importer le logo') + '</button></div></div></div>';
  h += '<div class="card"><div class="upl"><div class="pv">' + (F.maillot ? '<img src="' + F.maillot + '" alt="Maillot" style="object-fit:cover">' : '<span class="mu" style="font-size:12px">Maillot</span>') + '</div><div style="flex:1;display:flex;flex-direction:column;gap:6px"><p class="lbl">Photo du maillot <span style="text-transform:none;letter-spacing:0">(facultatif)</span></p><p class="mu">Pour proposer les couleurs portées par l\'équipe.</p><button type="button" class="btn2" style="min-height:40px" data-a="suJersey">' + (F.maillot ? 'Changer la photo' : 'Ajouter une photo') + '</button></div></div></div>';
  h += '<p class="lbl">Couleurs de l\'appli</p>';
  const opts = [];
  if (F.maillotCols) opts.push(['maillot', 'Couleurs du maillot', F.maillotCols]);
  if (F.logoCols) opts.push(['logo', 'Couleurs du logo', F.logoCols]);
  opts.push(['manuel', 'Mes couleurs', [F.c1m, F.c2m]]);
  opts.forEach(o => {
    const on = F.choice === o[0];
    h += '<button type="button" class="opt' + (on ? ' on' : '') + '" data-a="suChoice" data-k="' + o[0] + '"><span class="radio"></span><div style="flex:1;min-width:0"><div class="row" style="gap:8px"><span class="sw" style="background:' + o[2][0] + '"></span><span class="sw" style="background:' + o[2][1] + '"></span><span style="font-weight:700;flex:1">' + o[1] + '</span></div>' +
      '<div class="pbar" style="background:' + o[2][0] + ';color:' + onColor(o[2][0]) + '">' + (F.logo ? '<img src="' + F.logo + '" alt="">' : '') + '<b>' + esc(F.club || 'Mon club') + '</b><span style="background:' + o[2][1] + ';color:' + onColor(o[2][1]) + '">Nouveau match</span></div></div></button>';
  });
  if (F.choice === 'manuel') h += '<div class="row"><label class="row flab"><input type="color" id="suC1" value="' + F.c1m + '">Principale</label><label class="row flab"><input type="color" id="suC2" value="' + F.c2m + '">Secondaire</label><button type="button" class="chip" data-a="suSwap">Inverser</button></div>';
  h += '<div class="row"><div class="field" style="flex:2"><label for="suClub">Nom du club</label><input id="suClub" class="inp" value="' + esc(F.club) + '" placeholder="ex. US Ferrières"></div><div class="field" style="flex:1"><label for="suAbr">Abréviation</label><input id="suAbr" class="inp" maxlength="5" value="' + esc(F.abrev) + '" placeholder="USDF" style="text-transform:uppercase"></div></div>';
  h += '<div class="row"><div class="field" style="flex:1"><label for="suCat">Catégorie</label><input id="suCat" class="inp" value="' + esc(F.categorie) + '" placeholder="U11"></div><div class="field" style="flex:1"><label for="suLib">Saison</label><input id="suLib" class="inp" value="' + esc(F.libelle) + '"></div></div>';
  if (!edit) {
    h += '<p class="lbl">Joueur suivi</p><div class="row"><div class="field" style="flex:2"><label for="suJ">Prénom</label><input id="suJ" class="inp" value="' + esc(F.joueur) + '" placeholder="Paul"></div><div class="field" style="flex:1"><label for="suNum">Numéro</label><input id="suNum" class="inp" inputmode="numeric" value="' + esc(F.numero) + '"></div></div>' +
      '<div class="field"><label for="suPoste">Poste</label><select id="suPoste" class="inp">' + Object.keys(POSTES).map(k => '<option value="' + k + '"' + (F.poste === k ? ' selected' : '') + '>' + POSTES[k] + '</option>').join('') + '</select></div>';
  }
  h += '<button type="button" class="btn" data-a="suSave">' + (edit ? 'Enregistrer' : 'Ouvrir l\'appli') + '</button>';
  if (edit) h += '<button type="button" class="btn2" data-a="suCancel">Annuler</button>';
  h += '</div>';
  return { html: h, neutral: true };
};
function seasonLabel(d) { d = d || new Date(); const y = d.getFullYear(), m = d.getMonth() + 1; const a = m >= 7 ? y : y - 1; return a + '-' + (a + 1); }
function setupDraft(edit) {
  const S = edit ? curSeason() : null, me = edit ? player(suiviId()) || {} : {};
  return {
    edit, logo: S ? imgData(S.logo) : '', logoChanged: false, logoCols: null, maillot: '', maillotCols: null,
    choice: 'manuel', c1m: (S && S.couleur1) || '#2A4B71', c2m: (S && S.couleur2) || '#E5D52B',
    club: S ? S.club : '', abrev: S ? S.abrev : '', categorie: S ? S.categorie : '', libelle: S ? S.libelle : seasonLabel(),
    joueur: me.nom || '', numero: me.numero || '', poste: me.poste || 'ATT'
  };
}
function readSetup() {
  const v = id => { const e = $('#' + id); return e ? e.value.trim() : null; };
  const F = SET, map = { suClub: 'club', suAbr: 'abrev', suCat: 'categorie', suLib: 'libelle', suJ: 'joueur', suNum: 'numero', suPoste: 'poste', suC1: 'c1m', suC2: 'c2m' };
  Object.keys(map).forEach(k => { const x = v(k); if (x !== null) F[map[k]] = x; });
  F.abrev = String(F.abrev || '').toUpperCase();
}
ACT.suConnect = async () => {
  const c = $('#suCode').value.trim(); if (!c) return toast('Indique le code.');
  try {
    await api('ping', [c]);
    CODE = c; LS.set('code', c);
    toast('Connexion réussie');
    await flush();
    if (curSeason()) { SET = null; NAV = [{ s: 'home', p: {} }]; toast('Données récupérées depuis le Google Sheet'); }
    render();
  } catch (e) { toast(e.badCode ? 'Code refusé : vérifie CODE_ACCES dans le script.' : e.message); }
};
ACT.suChoice = (el, d) => { readSetup(); SET.choice = d.k; render(); };
ACT.suSwap = () => { readSetup(); const t = SET.c1m; SET.c1m = SET.c2m; SET.c2m = t; render(); };
ACT.suLogo = async () => {
  readSetup(); const f = await pickFile(); if (!f) return;
  try {
    const raw = await readFile(f), im = await loadImage(raw);
    SET.logo = cutoutLogo(im); SET.logoChanged = true;
    SET.logoCols = pickColors(await loadImage(SET.logo), false);
    if (!SET.maillotCols) { SET.choice = 'logo'; }
    render();
  } catch (e) { console.error(e); toast('Impossible de lire ce logo.'); }
};
ACT.suJersey = async () => {
  readSetup(); const f = await pickFile(); if (!f) return;
  try {
    const d = await shrinkPhoto(await readFile(f), 600);
    SET.maillot = d; SET.maillotCols = pickColors(await loadImage(d), true); SET.choice = 'maillot'; render();
  } catch (e) { toast('Impossible de lire cette photo.'); }
};
ACT.suCancel = () => { SET = null; back(); };
ACT.suSave = () => {
  readSetup(); const F = SET;
  if (!F.club) return toast('Indique le nom du club.');
  if (!F.edit && !F.joueur) return toast('Indique le prénom du joueur suivi.');
  const cols = F.choice === 'maillot' && F.maillotCols ? F.maillotCols : F.choice === 'logo' && F.logoCols ? F.logoCols : [F.c1m, F.c2m];
  const ops = [];
  const S = curSeason();
  const s = { id: S ? S.id : uid('S'), club: F.club, abrev: F.abrev || initials(F.club), categorie: F.categorie, libelle: F.libelle || seasonLabel(), couleur1: cols[0], couleur2: cols[1] };
  if (!S) { s.statut = 'en_cours'; s.debut = todayIso(); s.effectif = []; }
  if (F.logoChanged && F.logo) { const lid = uid('IMG'); ops.push({ op: 'img', id: lid, data: F.logo, type: 'logo' }); s.logo = lid; }
  if (!F.edit) {
    let pid = suiviId(); if (!pid || !player(pid)) pid = uid('J');
    ops.push(put('Joueurs', { id: pid, nom: F.joueur, numero: F.numero, poste: F.poste, actif: true, creeLe: nowIso() }));
    const eff = (S && S.effectif) || []; s.effectif = eff.includes(pid) ? eff : [pid].concat(eff);
    ops.push(put('Reglages', { id: 'suivi', valeur: pid }));
  }
  ops.push(put('Saisons', s));
  ops.push(put('Reglages', { id: 'saison', valeur: s.id }));
  commit(ops);
  SET = null;
  NAV = [{ s: F.edit ? 'settings' : 'home', p: {} }]; render();
};

/* détourage du logo : retire le fond uni (blanc ou autre) relié aux bords, puis recadre */
function cutoutLogo(im) {
  const max = 600, k = Math.min(1, max / Math.max(im.naturalWidth, im.naturalHeight));
  const w = Math.max(1, Math.round(im.naturalWidth * k)), h = Math.max(1, Math.round(im.naturalHeight * k));
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const x = c.getContext('2d'); x.drawImage(im, 0, 0, w, h);
  const d = x.getImageData(0, 0, w, h), a = d.data;
  const corners = [[0, 0], [w - 1, 0], [0, h - 1], [w - 1, h - 1]].map(([i, j]) => (j * w + i) * 4);
  const opaqueCorners = corners.filter(i => a[i + 3] > 200);
  if (opaqueCorners.length >= 3) {
    const bg = [0, 1, 2].map(ch => opaqueCorners.reduce((s, i) => s + a[i + ch], 0) / opaqueCorners.length);
    const dist = i => Math.hypot(a[i] - bg[0], a[i + 1] - bg[1], a[i + 2] - bg[2]);
    const seen = new Uint8Array(w * h), stack = [];
    for (let i = 0; i < w; i++) { stack.push(i, (h - 1) * w + i); }
    for (let j = 0; j < h; j++) { stack.push(j * w, j * w + w - 1); }
    while (stack.length) {
      const p = stack.pop(); if (seen[p]) continue; seen[p] = 1;
      const i = p * 4; if (dist(i) > 48) continue;
      a[i + 3] = 0;
      const px = p % w, py = (p - px) / w;
      if (px > 0) stack.push(p - 1); if (px < w - 1) stack.push(p + 1); if (py > 0) stack.push(p - w); if (py < h - 1) stack.push(p + w);
    }
    /* adoucit le bord : pixels opaques voisins du fond retiré et proches de sa couleur */
    for (let p = 0; p < w * h; p++) {
      const i = p * 4; if (!a[i + 3]) continue;
      const px = p % w, py = (p - px) / w;
      const nb = (px > 0 && !a[i - 1]) || (px < w - 1 && !a[i + 7]) || (py > 0 && !a[i - w * 4 + 3]) || (py < h - 1 && !a[i + w * 4 + 3]);
      if (nb) a[i + 3] = Math.min(255, Math.round(255 * Math.min(1, dist(i) / 120)));
    }
    x.putImageData(d, 0, 0);
  }
  /* recadrage sur la partie visible */
  let x0 = w, y0 = h, x1 = -1, y1 = -1;
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) if (a[(j * w + i) * 4 + 3] > 24) { if (i < x0) x0 = i; if (i > x1) x1 = i; if (j < y0) y0 = j; if (j > y1) y1 = j; }
  if (x1 < 0) return c.toDataURL('image/png');
  const cw = x1 - x0 + 1, ch = y1 - y0 + 1, side = Math.max(cw, ch);
  const o = document.createElement('canvas'); const out = Math.min(512, side); o.width = o.height = out;
  const sc = out / side;
  o.getContext('2d').drawImage(c, x0, y0, cw, ch, (out - cw * sc) / 2, (out - ch * sc) / 2, cw * sc, ch * sc);
  return o.toDataURL('image/png');
}
/* deux couleurs dominantes (la plus foncée devient la principale) */
function pickColors(im, photo) {
  const n = 72, c = document.createElement('canvas'); c.width = c.height = n;
  const x = c.getContext('2d');
  if (photo) { const iw = im.naturalWidth, ih = im.naturalHeight; x.drawImage(im, iw * .15, ih * .12, iw * .7, ih * .76, 0, 0, n, n); }
  else x.drawImage(im, 0, 0, n, n);
  const a = x.getImageData(0, 0, n, n).data, bins = {};
  for (let i = 0; i < a.length; i += 4) {
    if (a[i + 3] < 200) continue;
    const r = a[i], g = a[i + 1], b = a[i + 2], mx = Math.max(r, g, b), mn = Math.min(r, g, b);
    if (mn > 222) continue;                       // blanc
    if (photo && (mx < 30 || (mx - mn) / mx < .3)) continue; // gris, peau, ombres : on ne garde que les couleurs franches
    const k = (r >> 5) + ',' + (g >> 5) + ',' + (b >> 5);
    const o = bins[k] || (bins[k] = { n: 0, r: 0, g: 0, b: 0 });
    o.n++; o.r += r; o.g += g; o.b += b;
  }
  const list = Object.values(bins).map(o => { const c = [o.r / o.n, o.g / o.n, o.b / o.n], mx = Math.max(...c), sat = mx ? (mx - Math.min(...c)) / mx : 0; return { n: photo ? o.n * (.4 + sat) : o.n, c }; }).sort((p, q) => q.n - p.n);
  if (!list.length) return ['#2A4B71', '#E5D52B'];
  const first = list[0].c;
  const second = (list.find(o => Math.hypot(o.c[0] - first[0], o.c[1] - first[1], o.c[2] - first[2]) > 110) || { c: [229, 213, 43] }).c;
  /* une couleur de photo est souvent un peu terne : on la ravive légèrement */
  const boost = col => { if (!photo) return col; const m = Math.max(...col); const k = m > 0 ? Math.min(1.12, 235 / m) : 1; return col.map(v => v * k); };
  let h1 = rgb2hex(...boost(first)), h2 = rgb2hex(...boost(second));
  if (lum(h1) > lum(h2)) { const t = h1; h1 = h2; h2 = t; }
  return [h1, h2];
}

/* ---------- fin de saison ---------- */
SCREENS.endSeason = p => {
  const S = curSeason(), t = stats(S.id), me = stats(S.id, suiviId()), bt = bestTournament(S.id), lg = imgData(S.logo);
  const R = roster(), keep = p.keep || (p.keep = R.map(x => x.id));
  const next = p.lib || (p.lib = nextLabel(S.libelle)), cat = p.cat != null ? p.cat : (p.cat = nextCat(S.categorie));
  let h = topBar('Fin de saison', 'Archiver ' + S.libelle, { back: true });
  h += '<div class="main"><div class="card"><p class="lbl">1 · Bilan archivé</p><div class="row">' + (lg ? '<img src="' + lg + '" alt="" style="width:40px;height:40px;object-fit:contain">' : '') + '<div style="flex:1"><div class="cd" style="font-size:18px">' + esc(S.club + (S.categorie ? ' · ' + S.categorie : '')) + '</div><p class="mu">Logo et couleurs gardés avec la saison</p></div></div>' +
    '<div class="tiles t3" style="grid-template-columns:repeat(2,minmax(0,1fr))">' + tl(t.mj + ' matchs', vnd(t.v, t.n, t.d, ' · ')) + tl(t.bp + ' – ' + t.bc, 'buts pour – contre') + tl(esc(pname(suiviId())) + ' ' + me.b + ' B · ' + me.pd + ' PD', 'joueur suivi', 'color:var(--c2);font-size:18px') + tl(bt ? esc(bt.r.txt) : '—', bt ? esc(bt.e.titre) : 'aucun tournoi', 'font-size:20px') + '</div></div>';
  h += '<div class="card"><p class="lbl">2 · Nouvelle saison</p><div class="row"><div class="field" style="flex:1"><label for="esL">Saison</label><input id="esL" class="inp" value="' + esc(next) + '"></div><div class="field" style="flex:1"><label for="esC">Catégorie</label><input id="esC" class="inp" value="' + esc(cat) + '"></div></div>' +
    '<div class="lbl-row"><span style="font-weight:700">Reconduire l\'effectif</span><span class="mu">' + keep.length + ' sur ' + R.length + '</span></div><div class="chips">' +
    R.map(x => { const on = keep.includes(x.id); return '<button type="button" class="pchip' + (on ? '' : ' off') + '" data-a="esKeep" data-id="' + x.id + '"' + (x.id === suiviId() ? ' disabled' : '') + '><span class="tok' + (x.id === suiviId() ? ' me' : '') + '">' + (on ? '✓' : '–') + '</span>' + esc(x.nom) + '</button>'; }).join('') + '</div>' +
    '<label class="row" style="font-weight:600"><input type="checkbox" id="esClub" ' + (p.club ? 'checked' : '') + ' style="width:22px;height:22px;accent-color:var(--c2)">Changer de club pour la nouvelle saison</label><p class="mu">Les nouveaux joueurs s\'ajoutent ensuite dans Effectif.</p></div>';
  h += '<button type="button" class="btn" data-a="esGo">Archiver et démarrer ' + esc(next) + '</button></div>';
  return { html: h };
};
function nextLabel(l) { const m = /^(\d{4})\D+(\d{4})$/.exec(String(l || '')); return m ? (+m[1] + 1) + '-' + (+m[2] + 1) : seasonLabel(new Date(Date.now() + 200 * 864e5)); }
function nextCat(c) { const m = /^U(\d+)$/i.exec(String(c || '').trim()); return m ? 'U' + (+m[1] + 1) : (c || ''); }
function readEs() { const p = cur().p; p.lib = $('#esL').value.trim(); p.cat = $('#esC').value.trim(); p.club = $('#esClub').checked; }
ACT.esKeep = (el, d) => { readEs(); const p = cur().p; p.keep = p.keep.includes(d.id) ? p.keep.filter(x => x !== d.id) : p.keep.concat(d.id); render(); };
ACT.esGo = async () => {
  readEs(); const p = cur().p, S = curSeason();
  if (!p.lib) return toast('Indique la nouvelle saison.');
  if (!await confirmBox('Archiver ' + S.libelle + ' ?', 'La saison passe dans le Palmarès et ' + p.lib + ' démarre avec ' + p.keep.length + ' joueurs.', 'Archiver')) { render(); return; }
  const t = stats(S.id), me = stats(S.id, suiviId()), bt = bestTournament(S.id);
  const ns = { id: uid('S'), libelle: p.lib, club: S.club, abrev: S.abrev, categorie: p.cat, couleur1: S.couleur1, couleur2: S.couleur2, logo: S.logo, statut: 'en_cours', debut: todayIso(), effectif: p.keep.includes(suiviId()) ? p.keep : [suiviId()].concat(p.keep) };
  commit([
    put('Saisons', { id: S.id, statut: 'archivee', fin: todayIso(), bilan: { mj: t.mj, v: t.v, n: t.n, d: t.d, bp: t.bp, bc: t.bc, suivi: { mj: me.mj, b: me.b, pd: me.pd }, tournoi: bt ? bt.r.txt + ' · ' + bt.e.titre : '' } }),
    put('Saisons', ns), put('Reglages', { id: 'saison', valeur: ns.id })
  ]);
  if (p.club) { NAV = [{ s: 'setup', p: { edit: 1 } }]; SET = null; render(); toast('Saison archivée : configure le nouveau club'); }
  else { NAV = [{ s: 'palmares', p: {} }]; render(); toast('Saison archivée'); }
};

/* ---------- comptes rendus (image + texte à partager) : v1.2 ---------- */
const APP_ICON = new Image(); APP_ICON.onload = () => paintRecaps(); APP_ICON.src = 'icons/icon-192.png';
/* polices du compte rendu chargées avant de le dessiner */
if (document.fonts) Promise.all(['900 40px "Barlow Condensed"', '700 40px "Barlow Condensed"', '800 40px "Barlow Semi Condensed"', '700 40px "Barlow Semi Condensed"', '600 40px "Barlow Semi Condensed"', '600 40px Barlow'].map(f => document.fonts.load(f).catch(() => {})))
  .then(() => { RECAP_CACHE.clear(); $$('canvas.recap-cv').forEach(c => c._big = null); paintRecaps(); });
const PH_SHORT = { 'Quart de finale': 'Quart', 'Demi-finale': 'Demi', 'Match de classement': 'Classement', '32e de finale': '32e', '16e de finale': '16e', '8e de finale': '8e' };
const phShort = ph => { const b = phaseBase(ph), g = String(ph || '').split(' · ')[1]; return (PH_SHORT[b] || b) + (g ? ' ' + g : ''); };
const QUOTES_N = ['Un point de pris, on lâche rien.', 'Match serré, on reviendra plus forts.', 'Partage des points, la suite au prochain épisode.'];
const QUOTES_D = [['TÊTE HAUTE !', 'On apprend, et on revient plus forts.'], ['ON SE RELÈVE !', 'Les grandes équipes savent rebondir.'], ['ON REMET ÇA !', 'La prochaine sera la bonne.']];
const hash = s => { let h = 0; String(s).split('').forEach(c => h = (h * 31 + c.charCodeAt(0)) | 0); return Math.abs(h); };
function koRes(m) { const s = score(m); if (s.p === s.c && m.tab && m.tab.nous != null) return wonKO(m) ? 'V' : 'D'; return result(m); }
/* données du compte rendu d'une rencontre (ou d'un seul match si mid est donné) */
const SMALL_CARDS = new Map();   // petites cartes des comptes rendus, gardées en mémoire
function recapData(e, mid) {
  const S = DB.Saisons[e.saison] || curSeason() || {}, pid = suiviId(), p = player(pid);
  const ms = mid ? [DB.Matchs[mid]].filter(Boolean) : matchesOf(e.id).filter(isDone);
  if (!ms.length) return null;
  const kind = mid && e.type !== 'amical' ? 'amical' : e.type;
  const R = {
    kind, title: evTitle(e), date: fdate(e.date, true),
    label: mid && e.type !== 'amical' ? (TYPE_LBL[e.type] + (ms[0].phase ? ' · ' + phShort(ms[0].phase) : '')).toUpperCase() : { amical: 'MATCH AMICAL', plateau: 'PLATEAU', tournoi: 'TOURNOI' }[e.type],
    club: { name: S.club || '', abbr: S.abrev || '', cat: S.categorie || '', c1: S.couleur1 || '#2A4B71', c2: S.couleur2 || '#E5D52B', logoImg: imgEl(S.logo) },
    appIcon: APP_ICON.complete && APP_ICON.naturalWidth ? APP_ICON : null,
    matches: ms.map(m => { const s = score(m); return { phase: e.type === 'tournoi' ? phShort(m.phase) : '', opp: m.adversaire || '?', p: s.p, c: s.c, tab: m.tab && m.tab.nous != null ? m.tab.nous + '-' + m.tab.eux : '', res: koRes(m) }; })
  };
  const st = { mj: ms.length, v: 0, n: 0, d: 0, bp: 0, bc: 0 };
  R.matches.forEach(m => { st[m.res.toLowerCase()]++; st.bp += m.p; st.bc += m.c; });
  R.stats = st;
  /* buts du match (pour un seul match) */
  if (ms.length === 1) R.goals = goalsOf(ms[0].id).filter(g => g.camp === 'nous').map(g => ({ who: goalWho(g), pass: g.passeur ? pname(g.passeur) : '', min: num(g.minute), me: g.buteur === pid }));
  /* joueur suivi */
  const tally = {}; ms.forEach(m => goalsOf(m.id).forEach(g => { if (g.camp === 'nous' && g.buteur) tally[g.buteur] = (tally[g.buteur] || 0) + 1; }));
  const played = ms.filter(m => inMatch(m, pid)).length;
  if (p && (played || tally[pid])) {
    let b = 0, pd = 0; ms.forEach(m => { const x = playerLine(m, pid); b += x.b; pd += x.pd; });
    const max = Math.max(0, ...Object.values(tally));
    const official = e.type === 'tournoi' && !mid && String(e.distinctions || '').includes('buteur');
    const ribbon = official ? 'MEILLEUR BUTEUR DU TOURNOI' : (kind !== 'amical' && b > 0 && b === max ? 'MEILLEUR BUTEUR DE L\'ÉQUIPE' : '');
    let line = plural(b, 'but', 'buts') + ' · ' + plural(pd, 'passe D', 'passes D');
    if (kind === 'amical' && st.d && b && b === st.bp && st.bp === 1) line = '1 but · le but de l\'honneur';
    const card = document.createElement('canvas');
    const cd = cardData(pid, false); cd.stats = [['MJ', played], ['BUTS', b], ['PASSES D', pd]];
    try { PFT_CARDS.drawCard(card, cd, 1.4); } catch (er) {}
    R.me = { name: p.nom, b, pd, top: !!ribbon, ribbon, line, card, _k: cd._k, honneur: line.indexOf('honneur') > 0 };
  }
  /* v1.4 : cartes de toute l'équipe (plateau / tournoi) et meilleur contributeur (match seul) */
  const line = {}; const L = k => line[k] = line[k] || { b: 0, pd: 0 };
  ms.forEach(m => goalsOf(m.id).forEach(g => { if (g.camp !== 'nous') return; if (g.buteur && g.special !== 'inconnu') L(g.buteur).b++; if (g.passeur) L(g.passeur).pd++; }));
  const smallCard = k => {
    const cd = cardData(k, false); let cv = SMALL_CARDS.get(cd._k);
    if (!cv) { cv = document.createElement('canvas'); try { PFT_CARDS.drawCard(cv, cd, .6); } catch (er) {} SMALL_CARDS.set(cd._k, cv); if (SMALL_CARDS.size > 60) SMALL_CARDS.delete(SMALL_CARDS.keys().next().value); }
    return { cv, k: cd._k };
  };
  if (kind !== 'amical') {
    const PO = { GB: 0, DEF: 1, MIL: 2, ATT: 3 };
    const ids = Object.values(DB.Joueurs).filter(j => ms.some(m => inMatch(m, j.id)) || line[j.id]).map(j => j.id);
    const official = e.type === 'tournoi' && String(e.distinctions || '').includes('buteur');
    R.team = ids.sort((a, b) => (PO[player(a).poste] ?? 9) - (PO[player(b).poste] ?? 9) || num(player(a).numero) - num(player(b).numero)).map(k => {
      const c = smallCard(k), x = line[k] || { b: 0, pd: 0 };
      return { name: pname(k), b: x.b, pd: x.pd, card: c.cv, _k: c.k, star: official && k === pid };
    });
  } else {
    /* le plus de buts + passes D ; à égalité, le plus de buts */
    const best = Object.keys(line).filter(k => player(k)).sort((a, b) => (line[b].b + line[b].pd) - (line[a].b + line[a].pd) || line[b].b - line[a].b)[0];
    if (best) { const c = smallCard(best); R.best = { name: pname(best), b: line[best].b, pd: line[best].pd, card: c.cv, _k: c.k, me: best === pid }; }
  }
  /* résultat et textes */
  if (kind === 'amical') {
    R.outcome = R.matches[0].res;
    const q = hash(e.id + (mid || ''));
    R.quote = QUOTES_N[q % QUOTES_N.length]; R.quoteTitle = QUOTES_D[q % QUOTES_D.length][0]; if (R.outcome === 'D') R.quote = QUOTES_D[q % QUOTES_D.length][1];
  } else if (e.type === 'tournoi') {
    const r = eventResult(e);
    R.outcome = r.txt === 'Vainqueur' ? 'champion' : 'mixed';
    R.headline = r.txt === 'Finaliste' ? 'FINALISTE' : r.txt === 'Phase de poules' ? 'BILAN DU TOURNOI' : r.txt === 'Vainqueur' ? 'VAINQUEUR' : String(r.txt).toUpperCase();
  } else { R.outcome = 'mixed'; R.headline = 'BILAN DU PLATEAU'; }
  return R;
}
function recapKey(R) { return JSON.stringify(Object.assign({}, R, { club: Object.assign({}, R.club, { logoImg: !!R.club.logoImg }), appIcon: !!R.appIcon, me: R.me ? Object.assign({}, R.me, { card: R.me._k }) : null, best: R.best ? Object.assign({}, R.best, { card: R.best._k }) : null, team: (R.team || []).map(t => Object.assign({}, t, { card: t._k })) })); }
const RECAP_CACHE = new Map();
function recapCanvas(R) {
  const k = recapKey(R); let c = RECAP_CACHE.get(k);
  if (!c) { c = document.createElement('canvas'); DLL_RECAP.drawRecap(c, R); RECAP_CACHE.set(k, c); if (RECAP_CACHE.size > 12) RECAP_CACHE.delete(RECAP_CACHE.keys().next().value); }
  return c;
}
/* aperçu dans l'appli : <canvas class="recap-cv" data-ev="…" data-m="…"> */
function recapPreview(eid, mid) {
  return '<div class="recap-box"><canvas class="recap-cv" data-ev="' + esc(eid) + '"' + (mid ? ' data-m="' + esc(mid) + '"' : '') + ' aria-label="Compte rendu"></canvas>' +
    '<div class="row"><button type="button" class="btn" data-a="shareImg" data-ev="' + esc(eid) + '"' + (mid ? ' data-m="' + esc(mid) + '"' : '') + '>' + ICON.share + 'Partager l\'image</button>' +
    '<button type="button" class="btn2" data-a="shareTxt" data-ev="' + esc(eid) + '"' + (mid ? ' data-m="' + esc(mid) + '"' : '') + ' style="flex:none;width:auto">Texte</button></div></div>';
}
function paintRecaps() {
  $$('canvas.recap-cv').forEach(cv => {
    const e = DB.Rencontres[cv.dataset.ev]; if (!e) return;
    const R = recapData(e, cv.dataset.m || ''); if (!R) { cv.parentNode.style.display = 'none'; return; }
    try {
      const big = recapCanvas(R), dpr = Math.min(2, window.devicePixelRatio || 1), w = Math.round((cv.clientWidth || 340) * dpr);
      if (cv._big === big && cv.width === w) return;
      cv.width = w; cv.height = Math.round(w * DLL_RECAP.H / DLL_RECAP.W);
      const x = cv.getContext('2d'); x.imageSmoothingQuality = 'high'; x.drawImage(big, 0, 0, cv.width, cv.height); cv._big = big;
    } catch (er) { console.error(er); }
  });
}
function recapText(R) {
  const opp = R.matches[0] ? R.matches[0].opp : '', sc = R.matches[0] ? R.matches[0].p + '-' + R.matches[0].c : '';
  const me = R.me, meLine = me && (me.b || me.pd) ? me.name + ' : ' + me.line.replace(' · ', ' et ') : '';
  /* v1.4 : meilleur contributeur (match) et buteurs / passeurs de l'équipe (plateau, tournoi) */
  const bpTxt = (b, pd) => [b ? b + ' but' + (b > 1 ? 's' : '') : '', pd ? pd + ' passe' + (pd > 1 ? 's' : '') + ' D' : ''].filter(Boolean).join(' et ');
  const bestLine = R.best ? '\n⭐ Meilleur contributeur : ' + R.best.name + ' (' + bpTxt(R.best.b, R.best.pd) + ')' : '';
  const teamLine = (R.team || []).filter(t => t.b || t.pd).map(t => t.name + ' ' + bpTxt(t.b, t.pd) + (t.star ? ' (meilleur buteur du tournoi)' : '')).join(', ');
  let t;
  if (R.kind === 'amical') {
    const buts = (R.goals || []).map(g => g.who + ' ' + g.min + '\'').join(', ');
    if (R.outcome === 'V') t = '✅ VICTOIRE ' + sc + ' contre ' + opp + ' !' + (buts ? '\n⚽ ' + buts : '') + bestLine;
    else if (R.outcome === 'N') t = '🤝 Match nul ' + sc + ' contre ' + opp + '. ' + R.quote + (buts ? '\n⚽ ' + buts : '') + bestLine;
    else t = '💪 Défaite ' + sc + ' contre ' + opp + ', mais tête haute !' + (me && me.b ? ' ' + me.name + ' a marqué' + ((R.goals || []).filter(g => g.me).map(g => ' (' + g.min + '\')').join('')) + '.' : '') + ' On remet ça !';
  } else if (R.outcome === 'champion') {
    t = '🏆 VAINQUEURS du ' + R.title + ' ! ' + R.stats.mj + ' matchs, ' + R.stats.v + ' victoires, ' + R.stats.bp + ' buts marqués, ' + R.stats.bc + ' encaissé' + (R.stats.bc > 1 ? 's' : '') + '.' + (teamLine ? '\n⚽ ' + teamLine : '') + '\nQuelle journée ! 🎉';
  } else {
    const head = R.headline === 'FINALISTE' ? '🥈 Finalistes du ' + R.title + ' !' : R.kind === 'tournoi' ? '🏟️ ' + R.title + ' : ' + R.headline.toLowerCase() : '📋 ' + R.title;
    t = head + '\n' + R.stats.v + ' victoire' + (R.stats.v > 1 ? 's' : '') + ', ' + R.stats.n + ' nul' + (R.stats.n > 1 ? 's' : '') + ', ' + R.stats.d + ' défaite' + (R.stats.d > 1 ? 's' : '') + ' · ' + R.stats.bp + ' buts marqués, ' + R.stats.bc + ' encaissé' + (R.stats.bc > 1 ? 's' : '') + '.' + (teamLine ? '\n⚽ ' + teamLine : '');
  }
  return t + '\n— ' + [R.club.name, R.club.cat].filter(Boolean).join(' ') + ' · Dans la Lucarne';
}
function recapFor(d) { const e = DB.Rencontres[d.ev]; return e ? recapData(e, d.m || '') : null; }
ACT.shareImg = async (el, d) => {
  const R = recapFor(d); if (!R) return;
  const cv = recapCanvas(R);
  shareCanvas(cv, 'dans-la-lucarne-' + String(R.title).replace(/[^a-z0-9]+/gi, '-').toLowerCase(), recapText(R));
};
ACT.shareTxt = async (el, d) => {
  const R = recapFor(d); if (!R) return; const t = recapText(R);
  try { if (navigator.share) { await navigator.share({ text: t }); return; } } catch (e) { if (e && e.name === 'AbortError') return; }
  openSheet('<h2>Texte à partager</h2><textarea class="inp" style="height:180px;padding:10px;white-space:pre-wrap" readonly>' + esc(t) + '</textarea><div class="row"><button type="button" class="btn2" id="txCopy">Copier</button><a class="btn" href="https://wa.me/?text=' + encodeURIComponent(t) + '" target="_blank" rel="noopener">WhatsApp</a></div><button type="button" class="btn2" data-a="sheetClose">Fermer</button>');
  $('#txCopy').onclick = async () => { try { await navigator.clipboard.writeText(t); toast('Texte copié'); } catch (e) { toast('Copie impossible'); } };
};
async function shareCanvas(cv, name, text) {
  const blob = await new Promise(ok => cv.toBlob(ok, 'image/png'));
  const file = new File([blob], name + '.png', { type: 'image/png' });
  try {
    if (navigator.canShare && navigator.canShare({ files: [file] })) { await navigator.share({ files: [file], text }); return; }
  } catch (e) { if (e && e.name === 'AbortError') return; }
  const url = URL.createObjectURL(blob);
  openSheet('<h2>Compte rendu</h2><img src="' + url + '" alt="Compte rendu" style="width:100%;border-radius:12px"><a class="btn" href="' + url + '" download="' + esc(name) + '.png">' + ICON.dl + 'Enregistrer l\'image</a><button type="button" class="btn2" data-a="sheetClose">Fermer</button>');
}
/* distinctions de fin de tournoi */
function distinctionSheet(e) {
  const p = player(suiviId()) || {};
  openSheet('<h2>Tournoi terminé !</h2><p class="mu">Une distinction officielle pour ' + esc(p.nom || '') + ' ?</p><label class="row" style="font-weight:700;font-size:16px;min-height:48px"><input type="checkbox" id="dsBut"' + (String(e.distinctions || '').includes('buteur') ? ' checked' : '') + ' style="width:24px;height:24px;accent-color:var(--c2)">Meilleur buteur du tournoi</label><button type="button" class="btn" id="dsOk">Voir le compte rendu</button>');
  $('#dsOk').onclick = () => { commit([put('Rencontres', { id: e.id, distinctions: $('#dsBut').checked ? 'buteur' : '' })]); closeSheet(); window.scrollTo(0, 0); };
}
/* ---------- démarrage ---------- */
(function boot() {
  rebuildDb();
  try { history.replaceState({ n: 1 }, ''); } catch (e) {}
  render();
  if (API_URL && CODE) flush();
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible' && API_URL && CODE) flush(); });
  window.addEventListener('online', () => flushSoon(500));
  if ('serviceWorker' in navigator && location.protocol === 'https:') {
    const had = !!navigator.serviceWorker.controller;
    navigator.serviceWorker.register('sw.js').then(r => { try { r.update(); } catch (e) {} }).catch(() => {});
    /* nouvelle version installée : on recharge une fois pour l'utiliser tout de suite */
    let done = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => { if (had && !done) { done = true; location.reload(); } });
  }
})();
