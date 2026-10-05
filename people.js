/* Dans la Lucarne : effectif, fiches, photo, palmarès, réglages, configuration, installation */
'use strict';

/* ---------- effectif ---------- */
SCREENS.squad = () => {
  const S = curSeason(), pid = suiviId(), R = roster().filter(p => p.id !== pid);
  let h = topBar('Effectif', R.length + 1 + ' joueurs · ' + [S.categorie, S.libelle].filter(Boolean).join(' · '), { right: '<button type="button" class="ib" style="background:var(--c2);color:var(--on2)" data-a="addPlayer" aria-label="Ajouter un joueur">' + ICON.plus + '</button>' });
  h += '<div class="main">';
  if (player(pid)) h += '<p class="lbl">Joueur suivi</p><button type="button" class="hero-card" data-a="go" data-s="fiche" data-p=\'{"pid":"' + pid + '"}\'>' + cardCv(pid, .56, true) + '</button>';
  h += '<div class="lbl-row"><p class="lbl">Coéquipiers</p><button type="button" class="chip" data-a="addPlayer">' + ICON.plus + 'Ajouter</button></div>';
  if (!R.length) h += '<div class="empty">Ajoute les coéquipiers pour les choisir dans les compositions.</div>';
  else h += '<div class="cards-grid">' + R.map(p => '<button type="button" data-a="go" data-s="fiche" data-p=\'{"pid":"' + p.id + '"}\'>' + cardCv(p.id, .29) + '</button>').join('') + '</div>';
  h += '<p class="mu" style="text-align:center">Toucher une carte pour voir les statistiques de la saison.</p>';
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
  openSheet('<h2>Modifier la carte</h2>' + playerForm(p) + (me ? '' : '<button type="button" class="btn2 danger" id="pfDel">Retirer de l\'effectif de la saison</button>') + '<div class="row"><button type="button" class="btn2" data-a="sheetClose">Annuler</button><button type="button" class="btn" id="pfOk">Enregistrer</button></div>');
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

/* ---------- fiche joueur ---------- */
SCREENS.fiche = p => {
  const pl = player(p.pid); if (!pl) return SCREENS.squad({});
  const me = pl.id === suiviId(), S = curSeason(), t = me ? (p.t || 'res') : 'res';
  let h = topBar(pl.nom + (pl.numero ? ' · n°' + pl.numero : ''), posteLbl(pl.poste), { back: true, right: '<button type="button" class="ib" data-a="editPlayer" aria-label="Modifier la carte">' + ICON.edit + '</button>' });
  h += '<div class="main">';
  h += '<div style="align-self:center">' + cardCv(pl.id, .6, true) + '</div>';
  if (me) {
    h += '<div class="row"><button type="button" class="btn2" data-a="photoNew">' + ICON.cam + (pl.photo ? 'Changer la photo' : 'Ajouter une photo') + '</button>' + (pl.photo ? '<button type="button" class="btn2" data-a="photoEdit" style="flex:none;width:auto">Recadrer</button>' : '') + '</div>';
    h += '<div class="seg" role="tablist"><button type="button" class="' + (t === 'res' ? 'on' : '') + '" data-a="fTab" data-t="res">Résumé</button><button type="button" class="' + (t === 'det' ? 'on' : '') + '" data-a="fTab" data-t="det">Par type et saison</button></div>';
  }
  if (t === 'res') {
    const st = stats(S.id, pl.id);
    h += '<p class="lbl">Saison ' + esc(S.libelle) + '</p><div class="tiles t3">' +
      tl(st.mj, 'matchs joués') + tl(st.b, 'buts', 'color:var(--c2)') + tl(st.pd, 'passes D') +
      tl(st.type.amical.ev, 'amica' + (st.type.amical.ev > 1 ? 'ux' : 'l')) + tl(st.type.plateau.ev, 'plateau' + (st.type.plateau.ev > 1 ? 'x' : '') + '<br>(' + st.type.plateau.mj + ' matchs)') + tl(st.type.tournoi.ev, 'tournoi' + (st.type.tournoi.ev > 1 ? 's' : '') + '<br>(' + st.type.tournoi.mj + ' matchs)') + '</div>';
    h += '<div class="row"><div class="tile" style="flex:1;flex-direction:row;justify-content:center;gap:8px;background:var(--s1);border-radius:14px;padding:12px"><b style="font-size:22px">' + (st.mj ? (st.b / st.mj).toFixed(1).replace('.', ',') : '0') + '</b><span>but / match</span></div><div class="tile" style="flex:1;flex-direction:row;justify-content:center;gap:8px;background:var(--s1);border-radius:14px;padding:12px"><b style="font-size:22px">' + st.v + '</b><span>victoires</span></div></div>';
  } else h += detailStats(pl.id, p.sid || S.id);
  h += '</div>';
  return { html: h };
};
const tl = (v, l, st) => '<div class="tile"><b' + (st ? ' style="' + st + '"' : '') + '>' + v + '</b><span>' + l + '</span></div>';
ACT.fTab = (el, d) => { cur().p.t = d.t; render(); };
ACT.fSeason = (el, d) => { cur().p.sid = d.id; render(); };
function detailStats(pid, sid) {
  const ss = seasons();
  let h = '<div class="scroll-x">' + ss.map(s => '<button type="button" class="chip' + (s.id === sid ? ' on' : '') + '" data-a="fSeason" data-id="' + s.id + '">' + esc(s.libelle) + '</button>').join('') + '<button type="button" class="chip' + (sid === '*' ? ' on' : '') + '" data-a="fSeason" data-id="*">Carrière</button></div>';
  const st = stats(sid, pid), tot = st.b || 1;
  h += '<div class="card" style="gap:0"><div class="tbl"><div class="tr th"><span style="flex:1">Par type de rencontre</span><span class="c">MJ</span><span class="c">B</span><span class="c">PD</span></div>';
  ['amical', 'plateau', 'tournoi'].forEach(k => {
    const T = st.type[k];
    h += '<div class="tr"><div style="flex:1;display:flex;flex-direction:column;gap:5px;padding:6px 0"><span class="badge t-' + k + '" style="align-self:flex-start">' + { amical: 'Amicaux', plateau: 'Plateaux', tournoi: 'Tournois' }[k] + ' · ' + T.ev + '</span><div class="bar" style="width:' + Math.round(T.b / tot * 100) + '%"></div></div><span class="c">' + T.mj + '</span><span class="c" style="color:var(--c2)">' + T.b + '</span><span class="c">' + T.pd + '</span></div>';
  });
  h += '<div class="tr"><span style="flex:1;font-weight:700">Total</span><span class="c">' + st.mj + '</span><span class="c" style="color:var(--c2)">' + st.b + '</span><span class="c">' + st.pd + '</span></div></div><p class="mu" style="padding-top:6px">Barre = part des buts</p></div>';
  h += '<div class="card" style="gap:0"><div class="tbl"><div class="tr th"><span style="flex:1">Par saison</span><span class="c">MJ</span><span class="c">B</span><span class="c">PD</span></div>';
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
ACT.photoEdit = async () => {
  const p = player(cur().p.pid), d = imgData(p.photo); if (!d) return toast('Photo en cours de chargement…');
  PE = { pid: p.id, data: d, img: await loadImage(d), cadre: Object.assign({ zoom: 1, ox: 0, oy: 0 }, p.photoCadre || {}), isNew: false };
  photoEditor();
};
function photoEditor() {
  const s = Math.min(.78, (Math.min(window.innerWidth, 520) - 60) / PFT_CARDS.W);
  openSheet('<h2>Photo de la carte</h2><div class="photo-ed" style="display:flex;flex-direction:column;gap:12px"><canvas id="peCv" style="width:' + Math.round(PFT_CARDS.W * s) + 'px;height:' + Math.round(PFT_CARDS.H * s) + 'px"></canvas>' +
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
      '<div class="sb"><div><b>' + t.mj + '</b><span>matchs</span></div><div><b>' + t.v + '-' + t.n + '-' + t.d + '</b><span>V-N-D</span></div><div><b style="color:var(--c2)">' + me.b + ' · ' + me.pd + '</b><span>' + esc(pname(pid)) + ' B · PD</span></div></div>' +
      (bt ? '<div class="tr">' + ICON.trophy.replace('class="ic"', 'class="ic" style="width:16px;height:16px"') + esc(bt.r.txt + ' · ' + bt.e.titre) + '</div>' : '<div style="height:8px"></div>') + '</button>';
  });
  const car = stats('*', pid);
  h += '<div class="card" style="flex-direction:row;align-items:center"><div style="flex:1"><div style="font-weight:700">Carrière de ' + esc(pname(pid)) + '</div><p class="mu">' + car.mj + ' matchs · ' + car.b + ' buts · ' + car.pd + ' passes D</p></div><button type="button" class="chip" data-a="go" data-s="fiche" data-p=\'{"pid":"' + pid + '","t":"det","sid":"*"}\'>Détail</button></div>';
  h += '</div>';
  return { html: h, tab: 'palmares' };
};
ACT.palSeason = (el, d) => { NAV = [{ s: 'list', p: { sid: d.id } }]; render(); };

/* ---------- réglages ---------- */
SCREENS.settings = () => {
  const S = curSeason(), lg = imgData(S.logo), st = stats(S.id);
  let h = topBar('Réglages', 'Dans la Lucarne · version ' + VERSION_APP, { logo: false });
  h += '<div class="main">';
  if (!isStandalone()) h += installCard(false);
  h += '<div class="card"><p class="lbl">Club</p><div class="row">' + (lg ? '<img src="' + lg + '" alt="" style="width:50px;height:50px;object-fit:contain">' : '') + '<div style="flex:1"><div class="cd" style="font-size:20px">' + esc(S.club) + '</div><p class="mu">' + esc([S.abrev, S.categorie].filter(Boolean).join(' · ')) + '</p></div><span class="sw" style="background:var(--c1)"></span><span class="sw" style="background:var(--c2)"></span></div>' +
    '<button type="button" class="btn2" data-a="go" data-s="setup" data-p=\'{"edit":1}\'>Modifier ou changer de club</button><p class="mu">Logo, couleurs, nom et abréviation de la saison en cours. Les saisons passées gardent leur logo dans le Palmarès.</p></div>';
  h += '<div class="card"><p class="lbl">Saison</p><div class="lbl-row"><span class="cd" style="font-size:22px">' + esc(S.libelle) + '</span><span style="font-size:13px;font-weight:700;color:var(--win)">En cours</span></div><p class="mu">' + st.mj + ' matchs · ' + eventsOf(S.id).length + ' rencontres</p><button type="button" class="btn" data-a="go" data-s="endSeason">Archiver et démarrer la saison suivante</button></div>';
  const pend = OUTBOX.length;
  h += '<div class="card"><p class="lbl">Données</p><div class="row"><span class="dot" style="background:' + (!API_URL ? '#FFC46B' : SYNC.error ? 'var(--loss)' : pend ? '#FFC46B' : 'var(--win)') + '"></span><div style="flex:1"><div style="font-weight:600">Google Sheet</div><p class="mu">' + esc(!API_URL ? 'Non relié (config.js)' : SYNC.error ? SYNC.error : pend ? pend + ' modification(s) en attente' : 'À jour' + (SYNC.last ? ' · ' + new Date(SYNC.last).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : '')) + '</p></div></div>' +
    '<button type="button" class="btn2" data-a="syncNow">Synchroniser maintenant</button>' + (SYNC.sheetUrl ? '<a class="btn2" href="' + esc(SYNC.sheetUrl) + '" target="_blank" rel="noopener">Ouvrir le Google Sheet</a>' : '') +
    '<button type="button" class="btn2" data-a="changeCode">Changer le code d\'accès</button></div>';
  h += '</div>';
  return { html: h, tab: 'settings' };
};
ACT.syncNow = () => { SYNC.error = ''; flush(); toast('Synchronisation…'); };
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
    h += '<p class="mu">Le code se trouve en haut du script Google (ligne CODE_ACCES). Si l\'appli a déjà été configurée sur un autre téléphone, tout sera récupéré.</p></div>';
    return { html: h, neutral: true };
  }
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
  const max = 320, k = Math.min(1, max / Math.max(im.naturalWidth, im.naturalHeight));
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
  const o = document.createElement('canvas'); const out = Math.min(256, side); o.width = o.height = out;
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
    '<div class="tiles t3" style="grid-template-columns:repeat(2,minmax(0,1fr))">' + tl(t.mj + ' matchs', t.v + ' V · ' + t.n + ' N · ' + t.d + ' D') + tl(t.bp + ' – ' + t.bc, 'buts pour – contre') + tl(esc(pname(suiviId())) + ' ' + me.b + ' B · ' + me.pd + ' PD', 'joueur suivi', 'color:var(--c2);font-size:18px') + tl(bt ? esc(bt.r.txt) : '—', bt ? esc(bt.e.titre) : 'aucun tournoi', 'font-size:20px') + '</div></div>';
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

/* ---------- image de résumé à partager ---------- */
async function shareCanvas(cv, name, text) {
  const blob = await new Promise(ok => cv.toBlob(ok, 'image/png'));
  const file = new File([blob], name + '.png', { type: 'image/png' });
  try {
    if (navigator.canShare && navigator.canShare({ files: [file] })) { await navigator.share({ files: [file], text }); return; }
  } catch (e) { if (e && e.name === 'AbortError') return; }
  const url = URL.createObjectURL(blob);
  openSheet('<h2>Image du résumé</h2><img src="' + url + '" alt="Résumé" style="width:100%;border-radius:12px"><a class="btn" href="' + url + '" download="' + esc(name) + '.png">' + ICON.dl + 'Enregistrer l\'image</a><button type="button" class="btn2" data-a="sheetClose">Fermer</button>');
}
async function summaryImage(e, ms) {
  const S = curSeason() || {}, W = 1080, H = 1350, c = document.createElement('canvas'); c.width = W; c.height = H;
  const x = c.getContext('2d'), F = '"Barlow Semi Condensed","Arial Narrow",sans-serif';
  try { await document.fonts.load('800 40px "Barlow Semi Condensed"'); } catch (er) {}
  x.fillStyle = '#0D1118'; x.fillRect(0, 0, W, H);
  x.fillStyle = S.couleur1 || '#2A4B71'; x.fillRect(0, 0, W, 300);
  x.fillStyle = S.couleur2 || '#E5D52B'; x.fillRect(0, 300, W, 10);
  const lg = imgEl(S.logo); if (lg) x.drawImage(lg, 60, 60, 180, 180);
  const on1 = onColor(S.couleur1 || '#2A4B71');
  x.fillStyle = on1; x.textBaseline = 'alphabetic';
  x.font = '800 64px ' + F; fitText(x, evTitle(e), lg ? 270 : 60, 140, W - (lg ? 330 : 120));
  x.font = '600 38px ' + F; x.globalAlpha = .85; x.fillText([TYPE_LBL[e.type], fdate(e.date, true), 'à ' + e.format].join(' · '), lg ? 270 : 60, 205); x.globalAlpha = 1;
  let y = 400;
  const r = eventResult(e);
  x.textAlign = 'center'; x.fillStyle = '#FFFFFF';
  if (e.type === 'amical') { const s = score(ms[0]); x.font = '800 200px ' + F; x.fillText(s.p + ' – ' + s.c, W / 2, y + 150); y += 230; }
  else { x.font = '800 110px ' + F; x.fillStyle = e.type === 'tournoi' ? '#FFC46B' : '#FFFFFF'; x.fillText(r.txt, W / 2, y + 90); y += 150; }
  x.textAlign = 'left';
  if (e.type !== 'amical') {
    ms.forEach(m => {
      if (y > 1000) return; const s = score(m);
      x.fillStyle = '#161B25'; roundRect(x, 60, y, W - 120, 74, 18); x.fill();
      x.fillStyle = '#C9CFDB'; x.font = '600 36px ' + F; fitText(x, (m.phase ? m.phase + ' · ' : '') + 'vs ' + m.adversaire, 90, y + 50, W - 360);
      x.textAlign = 'right'; x.fillStyle = { V: '#4CD08A', N: '#C9CFDB', D: '#FF7A70' }[result(m)]; x.font = '800 46px ' + F; x.fillText(s.p + ' - ' + s.c, W - 90, y + 54); x.textAlign = 'left';
      y += 88;
    });
  }
  const tally = {};
  ms.forEach(m => goalsOf(m.id).forEach(g => { if (g.camp === 'nous' && g.buteur) tally[g.buteur] = (tally[g.buteur] || 0) + 1; }));
  const sc = Object.keys(tally).sort((a, b) => tally[b] - tally[a]).map(k => pname(k) + (tally[k] > 1 ? ' ×' + tally[k] : ''));
  if (sc.length) { y += 30; x.fillStyle = S.couleur2 || '#E5D52B'; x.font = '800 40px ' + F; x.fillText('BUTEURS', 60, y); y += 56; x.fillStyle = '#FFFFFF'; x.font = '600 40px ' + F; wrap(x, sc.join(' · '), 60, y, W - 120, 52); }
  x.fillStyle = '#6B7488'; x.font = '600 30px ' + F; x.textAlign = 'center'; x.fillText('Dans la Lucarne · ' + (S.club || ''), W / 2, H - 50);
  return c;
}
function fitText(x, t, px, py, w) { const f = x.font; let s = parseInt(/(\d+)px/.exec(f)[1], 10); while (x.measureText(t).width > w && s > 20) { s -= 2; x.font = f.replace(/\d+px/, s + 'px'); } x.fillText(t, px, py); x.font = f; }
function wrap(x, t, px, py, w, lh) { let line = ''; t.split(' ').forEach(wd => { const tt = line ? line + ' ' + wd : wd; if (x.measureText(tt).width > w) { x.fillText(line, px, py); py += lh; line = wd; } else line = tt; }); if (line) x.fillText(line, px, py); }
function roundRect(x, a, b, w, h, r) { x.beginPath(); x.moveTo(a + r, b); x.arcTo(a + w, b, a + w, b + h, r); x.arcTo(a + w, b + h, a, b + h, r); x.arcTo(a, b + h, a, b, r); x.arcTo(a, b, a + w, b, r); x.closePath(); }
ACT.shareEvent = async () => { const e = DB.Rencontres[cur().p.eid]; const ms = matchesOf(e.id).filter(isDone); const cv = await summaryImage(e, ms); shareCanvas(cv, 'resume-' + (e.titre || 'rencontre').replace(/\W+/g, '-').toLowerCase(), evTitle(e) + ' · ' + eventResult(e).txt); };
ACT.shareMatch = async () => { const m = DB.Matchs[cur().p.mid], e = DB.Rencontres[m.rencontre]; const cv = await summaryImage(e, [m]); const s = score(m); shareCanvas(cv, 'match-' + String(m.adversaire).replace(/\W+/g, '-').toLowerCase(), (curSeason() || {}).club + ' ' + s.p + '-' + s.c + ' ' + m.adversaire); };

/* ---------- démarrage ---------- */
(function boot() {
  rebuildDb();
  try { history.replaceState({ n: 1 }, ''); } catch (e) {}
  render();
  if (API_URL && CODE) flush();
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible' && API_URL && CODE) flush(); });
  window.addEventListener('online', () => flushSoon(500));
  if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('sw.js').catch(() => {});
})();
