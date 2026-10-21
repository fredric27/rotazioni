// Rotazioni — allenamento per arbitri di pallavolo sul fallo di posizione in ricezione.
import { Arena, COURT_STYLES, toWorld } from './arena.js';
import {
  makeScenario, scenarioFrom, reevaluate, withConstraintMargin, swapZones, zoneCenterFormation,
  baseFormation, ROTATION_NOTES, DIFFICULTY, transitionSpot,
} from './formations.js';
import { rotationZonesWithLibero, describeViolation, misleadingPairs, ROLES, CONSTRAINTS, ROTATION_SEQUENCE, describeConstraint } from './rules.js';
import { makeTeams, KITS } from './team.js';
import { courtSVG, lineupSVG } from './minimap.js';
import { LESSONS } from './tutorial.js';
import * as sound from './audio.js';

// ---------- archiviazione locale ----------
const store = {
  get(key, fallback) {
    try { const v = localStorage.getItem('rotazioni.' + key); return v ? JSON.parse(v) : fallback; } catch { return fallback; }
  },
  set(key, value) { try { localStorage.setItem('rotazioni.' + key, JSON.stringify(value)); } catch { /* archiviazione non disponibile */ } },
};

const DEFAULTS = {
  obsTime: 6, varTime: true, reactTime: 2, view: 'alterna', difficulty: 'medio', faultProb: 0.45, rounds: 20,
  strict: true, freeze: false, libero: true, gender: 'M', kitHome: 'auto', kitAway: 'auto', kitLibero: 'auto',
  court: 'classico', cardStyle: 'vista', pip: true, sound: true,
};
const settings = { ...DEFAULTS, ...store.get('settings', {}) };
const emptyStats = () => ({
  rounds: 0, correct: 0,
  byRot: Object.fromEntries([1, 2, 3, 4, 5, 6].map((r) => [r, { n: 0, ok: 0 }])),
  byView: { r1: { n: 0, ok: 0 }, r2: { n: 0, ok: 0 } },
  byOutcome: {}, recognize: { n: 0, ok: 0 }, best: {}, lessons: {},
});
const stats = { ...emptyStats(), ...store.get('stats', {}) };
const saveStats = () => store.set('stats', stats);

// ---------- DOM ----------
const $ = (sel) => document.querySelector(sel);
const el = {
  stage: $('#stage'), home: $('#home'), hud: $('#hud'), hudInfo: $('#hud-info'), hudCard: $('#hud-card'),
  hudButtons: $('#hud-buttons'), hudHint: $('#hud-hint'), timer: $('#timer'), timerFill: $('#timer-fill'),
  panel: $('#panel'), modeTitle: $('#mode-title'), viewSwitch: $('#view-switch'), toast: $('#toast'),
  modal: $('#modal'), modalCard: $('#modal .modal-card'),
};

let arena, teams, teamSide = [-1, 1];
let mode = 'home';
let round = null;
let session = null;
let roundId = 0;
let teamsDirty = false;
let viewToggle = 0;

const pick = (a) => a[Math.floor(Math.random() * a.length)];
const pct = (o) => (o.n ? Math.round((100 * o.ok) / o.n) + '%' : '—');
// Il 1° arbitro (z < 0) ha a sinistra il campo x > 0; il 2° arbitro il campo x < 0.
const teamOnLeft = (view, side) => (view === 'r1' ? side === 1 : side === -1);
const viewName = (v) => (v === 'r1' ? '1° arbitro' : v === 'r2' ? '2° arbitro' : v === 'top' ? 'dall\'alto' : 'libera');

function toast(html, kind = '') {
  el.toast.innerHTML = html;
  el.toast.className = 'show ' + kind;
  clearTimeout(toast.t);
  toast.t = setTimeout(() => { el.toast.className = ''; }, 2600);
}

function applyVisualSettings() {
  sound.setSound(settings.sound);
  arena.pip.enabled = settings.pip;
  arena.setNetHeight(settings.gender === 'F' ? 2.24 : 2.43);
  arena.setCourtStyle(settings.court);
}

function newTeams() {
  teams = makeTeams(settings);
  arena.setTeams(teams);
  teamsDirty = false;
}

const teamLabel = (t) => `${t.name} <span class="kit-dot" style="--c:${t.kit.main};--t:${t.kit.trim}"></span>`;

// ---------- schermata iniziale ----------
function showHome() {
  mode = 'home';
  round = null;
  arena.dragEnabled = false;
  closePanel();
  closeModal();
  el.hud.hidden = true;
  el.home.hidden = false;
  el.viewSwitch.hidden = true;
  el.modeTitle.textContent = '';
  document.body.dataset.mode = 'home';
  if (teamsDirty) newTeams();
  arena.clearOverlay();
  arena.showZones(1, false);
  const scenario = makeScenario(pick(ROTATION_SEQUENCE), teams[1], { difficulty: 'facile', forceKind: 'legal', libero: settings.libero });
  arena.layoutReceiving(1, teamSide[1], scenario, { animate: false });
  arena.layoutServing(0, teamSide[0], pick(ROTATION_SEQUENCE), { animate: false });
  arena.setView('cinematic', 1, { instant: true });
  renderHome();
}

function renderHome() {
  const done = LESSONS.filter((l) => stats.lessons[l.id]).length;
  const rotBars = [1, 6, 5, 4, 3, 2].map((r) => {
    const o = stats.byRot[r];
    const v = o.n ? o.ok / o.n : 0;
    return `<div class="rb"><div class="rb-bar"><span style="height:${Math.round(v * 100)}%" class="${o.n ? (v >= 0.8 ? 'good' : v >= 0.6 ? 'mid' : 'bad') : ''}"></span></div><b>P${r}</b><small>${pct(o)}</small></div>`;
  }).join('');
  el.home.innerHTML = `
  <div class="home-inner">
    <div class="hero">
      <p class="eyebrow">Allenamento per arbitri di pallavolo</p>
      <h1>Rotazioni</h1>
      <p class="lede">Impara le posizioni in ricezione e il fallo di posizione, visto dal seggiolone del 1° arbitro o dal palo del 2°.</p>
    </div>
    <div class="cards">
      <button class="card" data-go="tutorial">
        <span class="card-k">01</span><h3>Tutorial</h3>
        <p>Zone, ordine di rotazione, la regola 7.4, le sei rotazioni del 5-1, esempi di falli.</p>
        <span class="card-meta">${done}/${LESSONS.length} lezioni completate</span>
      </button>
      <button class="card" data-go="assist">
        <span class="card-k">02</span><h3>Allenamento assistito</h3>
        <p>Etichette con ruolo e zona, rotazione indicata (P1…P6) e spiegazione dopo ogni servizio.</p>
        <span class="card-meta">Difficoltà: ${DIFFICULTY[settings.difficulty].label}</span>
      </button>
      <button class="card accent" data-go="match">
        <span class="card-k">03</span><h3>Partita</h3>
        <p>${settings.rounds} servizi senza aiuti. Fischia solo quando serve: punti, serie e riepilogo degli errori.</p>
        <span class="card-meta">Record: ${stats.best[settings.difficulty] ?? '—'} punti</span>
      </button>
      <button class="card" data-go="recognize">
        <span class="card-k">04</span><h3>Riconosci la rotazione</h3>
        <p>Guarda la ricezione e indica in che rotazione è la squadra.</p>
        <span class="card-meta">Precisione: ${pct(stats.recognize)}</span>
      </button>
      <button class="card" data-go="explore">
        <span class="card-k">05</span><h3>Esplora</h3>
        <p>Sposta i giocatori con il mouse e guarda in tempo reale quali relazioni rispettano.</p>
        <span class="card-meta">Libero, senza punteggio</span>
      </button>
    </div>
    <div class="home-foot">
      <div class="stats-box">
        <div class="stats-head"><h4>I tuoi numeri</h4><span>${stats.rounds} servizi giudicati · ${stats.rounds ? Math.round((100 * stats.correct) / stats.rounds) : 0}% giusti · 1° arb. ${pct(stats.byView.r1)} · 2° arb. ${pct(stats.byView.r2)}</span></div>
        <div class="rot-bars">${rotBars}</div>
      </div>
      <div class="home-actions">
        <button class="btn ghost" data-go="settings">⚙ Impostazioni</button>
        <a class="btn ghost" href="https://github.com/fredric27/rotazioni" target="_blank" rel="noopener">Codice su GitHub</a>
      </div>
    </div>
  </div>`;
  el.home.querySelectorAll('[data-go]').forEach((b) => b.addEventListener('click', () => {
    const go = b.dataset.go;
    if (go === 'settings') openSettings();
    else if (go === 'tutorial') startTutorial();
    else if (go === 'explore') startExplore();
    else startGame(go);
  }));
}

function enterMode(m, title) {
  mode = m;
  document.body.dataset.mode = m;
  el.home.hidden = true;
  el.modeTitle.textContent = title;
  closeModal();
  if (teamsDirty) newTeams();
  arena.dragEnabled = false;
  arena.onDrag = null;
}

// ---------- scelta vista ----------
function pickView() {
  if (settings.view === 'r1' || settings.view === 'r2') return settings.view;
  if (settings.view === 'casuale') return Math.random() < 0.5 ? 'r1' : 'r2';
  viewToggle++;
  return viewToggle % 2 ? 'r2' : 'r1';
}

function updateViewSwitch(active) {
  el.viewSwitch.querySelectorAll('button').forEach((b) => b.classList.toggle('on', b.dataset.view === active));
}

function switchView(v) {
  if (!round && mode !== 'explore' && mode !== 'tutorial') return;
  if (mode === 'match') return;
  const side = round?.side ?? arena.side;
  arena.setView(v, side, { refOrientation: v === 'top' ? (arena.lastRefView || 'r1') : undefined });
  if (v === 'r1' || v === 'r2') arena.lastRefView = v;
  if (round) round.view = v === 'top' ? round.view : v;
  updateViewSwitch(v);
  if (mode === 'explore') renderExplore();
  if (round && mode !== 'explore') renderHud();
}

// ---------- partita / allenamento / riconoscimento ----------
function startGame(kind) {
  const titles = { assist: 'Allenamento assistito', match: 'Partita', recognize: 'Riconosci la rotazione' };
  enterMode(kind, titles[kind]);
  session = { kind, n: 0, total: kind === 'match' ? Number(settings.rounds) : Infinity, score: 0, streak: 0, bestStreak: 0, correct: 0, log: [] };
  el.hud.hidden = false;
  el.viewSwitch.hidden = kind === 'match';
  closePanel();
  newRound();
}

function weightedRotation() {
  if (session.kind !== 'match') return pick(ROTATION_SEQUENCE);
  // in partita le rotazioni in cui sbagli di più escono più spesso
  const ws = ROTATION_SEQUENCE.map((r) => { const o = stats.byRot[r]; return 1 + (o.n ? 3 * (1 - o.ok / o.n) : 1); });
  let t = Math.random() * ws.reduce((a, b) => a + b, 0);
  for (let i = 0; i < ws.length; i++) { t -= ws[i]; if (t <= 0) return ROTATION_SEQUENCE[i]; }
  return 1;
}

function newRound() {
  roundId++;
  closePanel();
  const recv = Math.random() < 0.5 ? 0 : 1;
  const side = teamSide[recv];
  const rot = weightedRotation();
  const view = pickView();
  const scenario = makeScenario(rot, teams[recv], {
    difficulty: settings.difficulty, faultProb: Number(settings.faultProb), libero: settings.libero,
    forceKind: session.kind === 'recognize' ? 'legal' : undefined,
  });
  arena.clearOverlay();
  arena.showZones(side, false);
  arena.layoutReceiving(recv, side, scenario, { animate: true });
  arena.layoutServing(1 - recv, -side, pick(ROTATION_SEQUENCE), { animate: true });
  arena.setView(view, side);
  arena.lastRefView = view;
  updateViewSwitch(view);
  round = { id: roundId, recv, side, rot, view, scenario, phase: 'setup', t0: arena.time, team: teams[recv] };
  session.n++;
  applyAssistLabels();
  applyLiveHints();
  renderHud();
}

function applyAssistLabels(force) {
  const on = force ?? (session?.kind === 'assist' && store.get('assistLabels', true));
  arena.setLabels(on ? (p) => ({
    main: ROLES[p.role].short, sub: `zona ${p.zone}`,
    color: p.role === 'P' ? '#ffc629' : p.role === 'L' ? '#9fd8ff' : '#ffffff',
  }) : null);
}

function applyLiveHints() {
  arena.clearOverlay();
  if (session?.kind === 'assist' && store.get('assistPairs', false) && round) {
    arena.showConstraints(round.scenario.evaluation.results, round.side, { neutral: true });
  }
}

function zonesRolesOf(r) {
  return Object.fromEntries(r.scenario.players.map((p) => [p.zone, p.role]));
}

function cardOrientation() {
  if (settings.cardStyle === 'squadra') return 'team';
  return round.view === 'r1' ? 'r1' : 'r2';
}

function renderHud() {
  if (!round) return;
  const r = round;
  const kind = session.kind;
  const t = r.team;
  let info = '';
  if (kind === 'assist') {
    const note = ROTATION_NOTES[r.rot];
    info = `<div class="rot-badge">P${r.rot}</div>
      <div class="info-body">
        <div class="info-title">Palleggiatore n°${t.numbers.P} in zona ${r.rot} · ${teamLabel(t)}</div>
        <p class="info-note">${note.text}</p>
        <div class="info-toggles">
          <label><input type="checkbox" id="tg-labels" ${store.get('assistLabels', true) ? 'checked' : ''}> Etichette</label>
          <label><input type="checkbox" id="tg-pairs" ${store.get('assistPairs', false) ? 'checked' : ''}> Coppie da controllare</label>
          <span class="info-view">Vista: ${viewName(r.view)}</span>
        </div>
      </div>`;
  } else if (kind === 'match') {
    info = `<div class="score-grid">
      <div><small>Servizio</small><b>${session.n}/${session.total}</b></div>
      <div><small>Punti</small><b>${session.score}</b></div>
      <div><small>Serie</small><b>${session.streak}</b></div>
      <div><small>Vista</small><b>${r.view === 'r1' ? '1° arb.' : '2° arb.'}</b></div>
    </div>`;
  } else {
    info = `<div class="score-grid">
      <div><small>Domanda</small><b>${session.n}</b></div>
      <div><small>Giuste</small><b>${session.correct}</b></div>
      <div><small>Serie</small><b>${session.streak}</b></div>
    </div>`;
  }
  el.hudInfo.innerHTML = info;
  el.hudInfo.querySelector('#tg-labels')?.addEventListener('change', (e) => { store.set('assistLabels', e.target.checked); applyAssistLabels(); });
  el.hudInfo.querySelector('#tg-pairs')?.addEventListener('change', (e) => { store.set('assistPairs', e.target.checked); if (round.phase !== 'result') applyLiveHints(); });

  if (kind === 'recognize') {
    const n = t.numbers;
    el.hudCard.innerHTML = `<div class="card-title">Squadra in ricezione · ${teamLabel(t)}</div>
      <div class="roster">
        <span class="hl">P <b>${n.P}</b></span><span>O <b>${n.O}</b></span>
        <span>S <b>${n.S1}</b> · <b>${n.S2}</b></span><span>C <b>${n.C1}</b> · <b>${n.C2}</b></span>
        ${settings.libero ? `<span>L <b>${n.L}</b></span>` : ''}
      </div>`;
  } else {
    const orientation = cardOrientation();
    const lib = r.scenario.players.find((p) => p.isLibero);
    el.hudCard.innerHTML = `<div class="card-title">Formazione in campo · ${teamLabel(t)}</div>
      ${lineupSVG({ team: t, zonesRoles: zonesRolesOf(r), side: r.side, orientation, showRoles: kind === 'assist' })}
      <div class="card-foot">${orientation === 'team' ? 'Schema standard: rete in alto' : 'Orientata come la vedi'}${lib ? ` · L n°${lib.num} al posto del n°${t.numbers[lib.replaces]}` : ''}</div>`;
  }
  renderButtons();
}

function renderButtons() {
  if (!round) { el.hudButtons.innerHTML = ''; return; }
  const ph = round.phase;
  el.timer.hidden = !(ph === 'serving' || ph === 'post');
  if (session.kind === 'recognize') {
    if (ph === 'result') { el.hudButtons.innerHTML = ''; el.hudHint.textContent = ''; return; }
    el.hudButtons.innerHTML = `<div class="rot-choice">${[1, 2, 3, 4, 5, 6].map((r) => `<button class="btn rot" data-rot="${r}" ${ph === 'setup' ? 'disabled' : ''}>P${r}</button>`).join('')}</div>`;
    el.hudHint.textContent = ph === 'setup' ? 'Le squadre si stanno schierando…' : 'In che rotazione è la squadra in ricezione? Tasti 1–6 o clic.';
    el.hudButtons.querySelectorAll('[data-rot]').forEach((b) => b.addEventListener('click', () => answerRotation(Number(b.dataset.rot))));
    return;
  }
  if (ph === 'setup' || ph === 'ready') {
    el.hudButtons.innerHTML = `<button class="btn primary big" id="btn-whistle" ${ph === 'setup' ? 'disabled' : ''}><span class="ico">📣</span> Autorizza servizio <kbd>Invio</kbd></button>`;
    el.hudHint.textContent = ph === 'setup' ? 'Le squadre si stanno schierando…' : 'Controlla numeri e posizioni, poi fischia per autorizzare il servizio.';
    el.hudButtons.querySelector('#btn-whistle').addEventListener('click', whistleStart);
  } else if (ph === 'serving' || ph === 'post') {
    el.hudButtons.innerHTML = '<button class="btn danger big" id="btn-fault"><span class="ico">✋</span> Fallo di posizione <kbd>Spazio</kbd></button>';
    el.hudHint.textContent = ph === 'serving' ? 'Il battitore sta per servire…' : 'Colpo di servizio! Fischia ora se c\'è fallo.';
    el.hudButtons.querySelector('#btn-fault').addEventListener('pointerdown', (e) => { e.preventDefault(); pressFault(); });
  } else {
    el.hudButtons.innerHTML = '';
    el.hudHint.textContent = '';
  }
}

function tick() {
  if (!round || !session) return;
  const r = round;
  if (r.phase === 'setup' && (arena.playersSettled || arena.time - r.t0 > 4.5)) {
    r.phase = 'ready';
    renderButtons();
  }
  if (r.phase === 'serving') {
    el.timer.classList.remove('post');
    el.timerFill.style.width = '100%';
  }
  if (r.phase === 'post') {
    const left = 1 - (arena.time - r.tHit) / settings.reactTime;
    el.timer.classList.add('post');
    el.timerFill.style.width = Math.max(0, left * 100) + '%';
    if (!settings.freeze && !r.moved && arena.time - r.tHit > 0.35) {
      r.moved = true;
      for (const p of r.scenario.players) {
        const t = transitionSpot(p);
        const w = toWorld(r.side, t.d, t.w);
        p.figure.moveTo(w.x, w.z, p.figure.facing, p.role === 'P' ? 4.6 : 3.4);
        p.figure.setStance({ crouch: p.role === 'P' ? 0.1 : 0.6 });
      }
      const sv = arena.server;
      const st = toWorld(-r.side, 6.5, 4.5);
      sv.serveT = -1;
      sv.moveTo(st.x, st.z, sv.facing, 3.5);
    }
    if (left <= 0) resolveRound({ pressed: false });
  }
}

function whistleStart() {
  if (!round || round.phase !== 'ready') return;
  sound.whistle(0.42);
  const r = round;
  r.phase = 'serving';
  r.tWhistle = arena.time;
  const T = Number(settings.obsTime);
  r.delay = settings.varTime ? T * (0.55 + Math.random() * 0.45) : T;
  arena.pip.visible = true;
  const receivers = r.scenario.players.filter((p) => p.stance === 'ready');
  const target = pick(receivers.length ? receivers : r.scenario.players);
  const tw = toWorld(r.side, target.d - 0.35, target.w);
  const id = r.id;
  arena.serve(r.delay, { x: tw.x, y: 0.85, z: tw.z }).then(() => onServeHit(id));
  renderButtons();
}

function onServeHit(id) {
  if (!round || round.id !== id || round.phase !== 'serving') return;
  sound.ballHit();
  round.phase = 'post';
  round.tHit = arena.time;
  const pw = toWorld(round.side, 0.9, 6);
  arena.setPassTarget({ x: pw.x, y: 2.9, z: pw.z });
  renderButtons();
}

function pressFault() {
  if (!round || mode === 'recognize') return;
  const r = round;
  if (r.phase === 'serving') {
    if (settings.strict) {
      if (session.kind === 'assist') {
        toast('Aspetta il <b>colpo di servizio</b>: il 2° arbitro fischia il fallo di posizione solo dopo.', 'warn');
        return;
      }
      sound.whistle(0.7, { pitch: 3150 });
      resolveRound({ pressed: true, early: true });
      return;
    }
    sound.whistle(0.7, { pitch: 3150 });
    resolveRound({ pressed: true });
    return;
  }
  if (r.phase === 'post') {
    sound.whistle(0.7, { pitch: 3150 });
    resolveRound({ pressed: true, reaction: arena.time - r.tHit });
  }
}

const OUTCOMES = {
  hit: { ok: true, title: 'Fallo fischiato!', cls: 'good' },
  ok: { ok: true, title: 'Giusto: posizioni regolari', cls: 'good' },
  miss: { ok: false, title: 'Fallo non fischiato', cls: 'bad' },
  false: { ok: false, title: 'Fischio sbagliato: era regolare', cls: 'bad' },
  early: { ok: false, title: 'Fischio anticipato', cls: 'bad' },
};

function resolveRound({ pressed, early = false, reaction = null }) {
  const r = round;
  if (!r || r.phase === 'result') return;
  r.phase = 'result';
  arena.pip.visible = false;
  const fault = r.scenario.fault;
  const outcome = early ? 'early' : fault ? (pressed ? 'hit' : 'miss') : pressed ? 'false' : 'ok';
  const good = OUTCOMES[outcome].ok;
  r.outcome = outcome;
  r.reaction = reaction;
  setTimeout(() => sound.chime(good), 380);

  // statistiche
  stats.rounds++;
  if (good) stats.correct++;
  stats.byRot[r.rot].n++; if (good) stats.byRot[r.rot].ok++;
  stats.byView[r.view] ||= { n: 0, ok: 0 };
  stats.byView[r.view].n++; if (good) stats.byView[r.view].ok++;
  stats.byOutcome[outcome] = (stats.byOutcome[outcome] || 0) + 1;
  saveStats();

  let points = 0;
  if (good) {
    points = 100 + (outcome === 'hit' && reaction != null ? Math.max(0, Math.round(60 - reaction * 30)) : 0);
    session.streak++;
    points += Math.min(5, session.streak - 1) * 10;
    session.correct++;
  } else session.streak = 0;
  session.bestStreak = Math.max(session.bestStreak, session.streak);
  session.score += points;
  session.log.push({ n: session.n, rot: r.rot, view: r.view, side: r.side, scenario: r.scenario, team: r.team, outcome, reaction, points, kind: r.scenario.kind });

  // riporta i giocatori dove erano al colpo di servizio e mostra le relazioni
  arena.layoutReceiving(r.recv, r.side, r.scenario, { animate: false });
  arena.clearOverlay();
  arena.showConstraints(r.scenario.evaluation.results, r.side);
  arena.setLabels((p) => ({ main: `${p.num}`, sub: `${ROLES[p.role].short} · zona ${p.zone}`, color: p.role === 'P' ? '#ffc629' : '#fff' }));
  renderHud();
  showFeedback(r, points);
}

function explainScenario(sc, { early = false } = {}) {
  let html = '';
  if (early) html += '<p>Il 2° arbitro fischia il fallo di posizione <b>solo dopo il colpo di servizio</b>: prima i giocatori possono ancora sistemarsi.</p>';
  if (sc.fault) {
    html += `<p class="ex-h bad">${sc.evaluation.violations.length > 1 ? 'Relazioni violate' : 'Relazione violata'} al colpo di servizio:</p><ul class="ex-list">`;
    for (const v of sc.evaluation.violations) html += `<li><span class="pair bad">${v.c.id}</span> ${describeViolation(v)} <small>(${Math.round(-v.margin * 100)} cm)</small></li>`;
    html += '</ul>';
    if (sc.kind === 'swap') html += '<p class="note">Due giocatori si sono scambiati il posto: la disposizione sembra normale, ma i numeri non sono dove dovrebbero.</p>';
  } else {
    html += '<p class="ex-h good">Tutte le 7 relazioni erano rispettate.</p>';
    const tight = sc.evaluation.results.filter((x) => x.margin < 0.25).sort((a, b) => a.margin - b.margin)[0];
    if (tight) html += `<p><span class="pair warn">${tight.c.id}</span> Rispettata per soli <b>${Math.max(1, Math.round(tight.margin * 100))} cm</b>: contano i piedi, non il corpo.</p>`;
    const bz = Object.fromEntries(sc.players.map((p) => [p.zone, p]));
    const trap = misleadingPairs(bz)[0];
    if (trap) html += `<p class="note">Il n°${trap.back.num} (zona ${trap.back.zone}) era più vicino alla rete del n°${trap.front.num} (zona ${trap.front.zone}), ma sono in <b>diagonale</b>: tra loro non c'è nessun vincolo.</p>`;
  }
  return html;
}

function showFeedback(r, points) {
  const o = OUTCOMES[r.outcome];
  const note = ROTATION_NOTES[r.rot];
  const orient = r.view === 'r1' ? 'r1' : 'r2';
  el.panel.innerHTML = `
    <div class="fb-head ${o.cls}">
      <span class="fb-ico">${o.ok ? '✓' : '✗'}</span>
      <div><h2>${o.title}</h2><p>${r.scenario.fault ? 'C\'era un fallo di posizione' : 'Nessun fallo di posizione'} · P${r.rot} · ${viewName(r.view)}${r.reaction != null ? ` · reazione ${r.reaction.toFixed(2)} s` : ''}${session.kind === 'match' ? ` · +${points} punti` : ''}</p></div>
    </div>
    <div class="fb-body">
      ${explainScenario(r.scenario, { early: r.outcome === 'early' })}
      <div class="fb-map">${courtSVG({ players: r.scenario.players, side: r.side, orientation: orient, results: r.scenario.evaluation.results, team: r.team, labels: 'num', highlight: r.scenario.evaluation.violations.flatMap((v) => [v.c.a, v.c.b]) })}</div>
      ${session.kind === 'assist' ? `<details class="fb-note"><summary>${note.title}</summary><p>${note.text}</p></details>` : ''}
      <p class="legend"><i class="lg ok"></i>rispettata <i class="lg warn"></i>al limite <i class="lg bad"></i>violata · tratteggio = sinistra/destra</p>
    </div>
    <div class="fb-actions">
      <button class="btn ghost" id="fb-top">Vista dall'alto</button>
      <button class="btn primary" id="fb-next">${session.n >= session.total ? 'Vedi il riepilogo' : 'Prossimo servizio'} <kbd>Invio</kbd></button>
    </div>`;
  openPanel('feedback');
  el.panel.querySelector('#fb-next').addEventListener('click', nextRound);
  el.panel.querySelector('#fb-top').addEventListener('click', (e) => {
    const top = arena.view !== 'top';
    arena.setView(top ? 'top' : r.view, r.side, { refOrientation: r.view });
    e.target.textContent = top ? 'Vista arbitro' : 'Vista dall\'alto';
  });
}

function nextRound() {
  if (!round || round.phase !== 'result') return;
  if (session.n >= session.total) return showSummary();
  newRound();
}

function answerRotation(rot) {
  const r = round;
  if (!r || r.phase === 'result' || r.phase === 'setup') return;
  r.phase = 'result';
  const good = rot === r.rot;
  sound.chime(good);
  stats.recognize.n++; if (good) stats.recognize.ok++;
  saveStats();
  if (good) { session.correct++; session.streak++; } else session.streak = 0;
  arena.setLabels((p) => ({ main: ROLES[p.role].short, sub: `zona ${p.zone}`, color: p.role === 'P' ? '#ffc629' : '#fff' }));
  arena.clearOverlay();
  arena.showConstraints(r.scenario.evaluation.results, r.side, { only: ROTATION_NOTES[r.rot].critical });
  const note = ROTATION_NOTES[r.rot];
  const setter = r.scenario.players.find((p) => p.role === 'P');
  el.panel.innerHTML = `
    <div class="fb-head ${good ? 'good' : 'bad'}">
      <span class="fb-ico">${good ? '✓' : '✗'}</span>
      <div><h2>${good ? 'Esatto!' : `No, era P${r.rot}`}</h2><p>Hai risposto P${rot} · palleggiatore n°${setter.num} in zona ${setter.zone}</p></div>
    </div>
    <div class="fb-body">
      <h4>${note.title}</h4><p>${note.text}</p>
      <div class="fb-map">${courtSVG({ players: r.scenario.players, side: r.side, orientation: r.view, results: r.scenario.evaluation.results.filter((x) => note.critical.includes(x.c.id)), team: r.team, labels: 'full' })}</div>
      <p class="note">Trucco: trova il palleggiatore e conta. In prima linea (zone 2-3-4) è vicino a rete tra gli attaccanti; in seconda linea (1-6-5) si "nasconde" dietro il compagno di prima linea che ha davanti.</p>
    </div>
    <div class="fb-actions"><button class="btn primary" id="fb-next">Prossima <kbd>Invio</kbd></button></div>`;
  openPanel('feedback');
  el.panel.querySelector('#fb-next').addEventListener('click', () => newRound());
  renderHud();
}

function showSummary() {
  const s = session;
  const errors = s.log.filter((l) => !OUTCOMES[l.outcome].ok);
  const best = stats.best[settings.difficulty] || 0;
  const record = s.score > best;
  if (record) { stats.best[settings.difficulty] = s.score; saveStats(); }
  const counts = (k) => s.log.filter((l) => l.outcome === k).length;
  const rows = s.log.map((l, i) => `<tr class="${OUTCOMES[l.outcome].ok ? '' : 'err'}" data-i="${i}">
      <td>${l.n}</td><td>P${l.rot}</td><td>${l.view === 'r1' ? '1°' : '2°'}</td>
      <td>${l.scenario.fault ? 'Fallo ' + l.scenario.evaluation.violations.map((v) => v.c.id).join(', ') : 'Regolare'}</td>
      <td>${OUTCOMES[l.outcome].title}</td><td>${l.points}</td></tr>`).join('');
  openModal(`
    <h2>Fine partita</h2>
    <div class="sum-grid">
      <div><small>Punti</small><b>${s.score}</b>${record ? '<em>Nuovo record!</em>' : `<em>Record: ${best}</em>`}</div>
      <div><small>Decisioni giuste</small><b>${s.correct}/${s.log.length}</b></div>
      <div><small>Serie migliore</small><b>${s.bestStreak}</b></div>
      <div><small>Falli non visti</small><b>${counts('miss')}</b></div>
      <div><small>Fischi ingiusti</small><b>${counts('false')}</b></div>
      <div><small>Anticipati</small><b>${counts('early')}</b></div>
    </div>
    ${errors.length ? '<p class="note">Clicca una riga per rivedere la situazione.</p>' : '<p class="note">Partita perfetta. Prova una difficoltà più alta.</p>'}
    <div class="sum-table-wrap"><table class="sum-table"><thead><tr><th>#</th><th>Rot.</th><th>Arb.</th><th>Situazione</th><th>Esito</th><th>Punti</th></tr></thead><tbody>${rows}</tbody></table></div>
    <div id="sum-detail"></div>
    <div class="modal-actions"><button class="btn ghost" id="sum-home">Home</button><button class="btn primary" id="sum-again">Gioca ancora</button></div>`);
  el.modalCard.querySelectorAll('tr[data-i]').forEach((tr) => tr.addEventListener('click', () => {
    const l = s.log[Number(tr.dataset.i)];
    el.modalCard.querySelector('#sum-detail').innerHTML = `<div class="sum-detail"><div class="fb-map">${courtSVG({ players: l.scenario.players, side: l.side, orientation: l.view, results: l.scenario.evaluation.results, team: l.team, labels: 'num' })}</div><div>${explainScenario(l.scenario, { early: l.outcome === 'early' })}</div></div>`;
  }));
  el.modalCard.querySelector('#sum-home').addEventListener('click', showHome);
  el.modalCard.querySelector('#sum-again').addEventListener('click', () => startGame('match'));
}

// ---------- pannello laterale e finestre ----------
function openPanel(kind) {
  document.body.classList.toggle('result', kind === 'feedback');
  el.panel.hidden = false;
  el.panel.dataset.kind = kind;
  el.panel.scrollTop = 0;
  updateViewShift();
}
function closePanel() {
  document.body.classList.remove('result');
  el.panel.hidden = true;
  el.panel.innerHTML = '';
  updateViewShift();
}
// La scena 3D si sposta per non finire sotto il pannello laterale.
function updateViewShift() {
  if (!arena) return;
  if (el.panel.hidden) return arena.setViewShift(0, 0);
  const r = el.panel.getBoundingClientRect();
  if (window.innerWidth <= 820) return arena.setViewShift(0, Math.round(r.height / 2));
  const left = el.panel.dataset.kind !== 'feedback';
  arena.setViewShift(Math.round(((r.width + 16) / 2) * (left ? 1 : -1)), 0);
}
window.addEventListener('resize', () => updateViewShift());
function openModal(html) { el.modalCard.innerHTML = html; el.modal.hidden = false; }
function closeModal() { el.modal.hidden = true; el.modalCard.innerHTML = ''; }
el.modal.addEventListener('click', (e) => { if (e.target === el.modal && mode !== 'match') closeModal(); });

// ---------- scene descritte (tutorial ed esplora) ----------
let sceneState = null;

function buildScene(sc) {
  const side = sc.side ?? 1;
  teamSide = [side, -side];
  const team = teams[0];
  const zonesForm = sc.formation === 'zones';
  let players = zonesForm ? zoneCenterFormation(sc.rot, team, { libero: false }) : baseFormation(sc.rot, team, { libero: settings.libero });
  if (sc.fault) players = withConstraintMargin(players, sc.fault[0], sc.fault[1]);
  if (sc.margin) players = withConstraintMargin(players, sc.margin[0], sc.margin[1]);
  if (sc.swap) players = swapZones(players, sc.swap[0], sc.swap[1]);
  const scenario = scenarioFrom(sc.rot, players);
  return { side, scenario };
}

function showScene(sc, { animate = true, keepView = false } = {}) {
  const { side, scenario } = buildScene(sc);
  sceneState = { sc: { ...sc }, side, scenario };
  arena.clearOverlay();
  arena.layoutReceiving(0, side, scenario, { animate });
  if (sc.serving) arena.layoutServing(1, -side, 1, { animate });
  else {
    for (const f of arena.figures[1]) f.group.visible = false;
    arena.ball.visible = false;
    arena.ballShadow.visible = false;
    arena.server = null;
  }
  if (!keepView) {
    const view = sc.view || 'r2';
    arena.setView(view, side, { refOrientation: sc.topFrom || 'r1' });
    if (view === 'r1' || view === 'r2') arena.lastRefView = view;
    updateViewSwitch(view);
  }
  arena.showZones(side, !!sc.zones, { readFrom: sc.zonesFrom || sc.topFrom || 'r1' });
  applySceneLabels(sc.labels);
  applySceneConstraints(sc.constraints);
}

function applySceneLabels(kind) {
  arena.setLabels(kind ? (p) => {
    const color = p.role === 'P' ? '#ffc629' : p.role === 'L' ? '#9fd8ff' : '#ffffff';
    if (kind === 'zone') return { main: `${p.zone}`, sub: 'zona', color };
    if (kind === 'role') return { main: ROLES[p.role].short, sub: `zona ${p.zone}`, color };
    if (kind === 'num') return { main: `${p.num}`, sub: '', color: '#fff' };
    return { main: ROLES[p.role].short, sub: `zona ${p.zone} · n°${p.num}`, color };
  } : null);
}

function applySceneConstraints(c) {
  const { scenario, side, sc } = sceneState;
  arena.clearOverlay();
  if (!c) return;
  const results = scenario.evaluation.results;
  if (c === true) arena.showConstraints(results, side);
  else if (c === 'fb' || c === 'lr') arena.showConstraints(results.filter((r) => r.c.kind === c), side);
  else if (c === 'violations') arena.showConstraints(results, side, { onlyViolations: true });
  else if (c === 'critical') arena.showConstraints(results, side, { only: ROTATION_NOTES[sc.rot].critical });
  else if (Array.isArray(c)) arena.showConstraints(results, side, { only: c });
}

// ---------- tutorial ----------
let tut = null;

function startTutorial(lessonId) {
  enterMode('tutorial', 'Tutorial');
  round = null;
  session = null;
  el.hud.hidden = true;
  el.viewSwitch.hidden = false;
  if (lessonId) openLesson(lessonId); else renderLessonList();
}

function renderLessonList() {
  tut = null;
  showScene({ rot: 1, formation: 'reception', side: 1, view: 'free', labels: null, serving: true });
  el.panel.innerHTML = `<div class="tut-head"><h2>Tutorial</h2><p>Sette lezioni brevi. Ogni lezione mostra la scena in 3D e si chiude con una verifica.</p></div>
    <ol class="lesson-list">${LESSONS.map((l, i) => `<li><button data-l="${l.id}" class="${stats.lessons[l.id] ? 'done' : ''}"><span class="ln">${stats.lessons[l.id] ? '✓' : i + 1}</span><span><b>${l.title}</b><small>${l.summary}</small></span></button></li>`).join('')}</ol>`;
  openPanel('tutorial');
  el.panel.querySelectorAll('[data-l]').forEach((b) => b.addEventListener('click', () => openLesson(b.dataset.l)));
}

function openLesson(id) {
  tut = { lesson: LESSONS.find((l) => l.id === id), step: 0 };
  renderStep();
}

function renderStep() {
  const { lesson, step } = tut;
  const s = lesson.steps[step];
  showScene(s.scene);
  tut.rot = s.scene.rot;
  let html = s.html;
  if (s.rotNote) {
    const note = ROTATION_NOTES[s.rotNote];
    html = `<p>${note.text}</p><p class="ex-h">Relazioni critiche in questa rotazione:</p><ul class="ex-list">${note.critical.map((id) => `<li><span class="pair">${id}</span> ${describeConstraint(CONSTRAINTS.find((c) => c.id === id))}</li>`).join('')}</ul>
      <p class="note">Sei il ${s.scene.view === 'r1' ? '1°' : '2°'} arbitro; la squadra è alla tua ${teamOnLeft(s.scene.view, s.scene.side) ? 'sinistra: zone 1 e 2 vicine a te' : 'destra: zone 1 e 2 lontane da te'}.</p>`;
  }
  const quizzes = s.quiz ? (Array.isArray(s.quiz) ? s.quiz : [s.quiz]) : [];
  const last = step === lesson.steps.length - 1;
  el.panel.innerHTML = `
    <div class="tut-top"><button class="link" id="tut-back">← Lezioni</button><span>${lesson.title} · ${step + 1}/${lesson.steps.length}</span></div>
    <div class="tut-progress"><span style="width:${((step + 1) / lesson.steps.length) * 100}%"></span></div>
    <h2>${s.title}</h2>
    <div class="tut-body">${html}</div>
    ${quizzes.map((q, qi) => `<div class="quiz" data-q="${qi}"><p class="quiz-q">${q.q}</p><div class="quiz-opts">${q.options.map((o, i) => `<button data-o="${i}">${o}</button>`).join('')}</div><p class="quiz-ex" hidden></p></div>`).join('')}
    ${s.actions ? `<div class="tut-actions">${s.actions.map((a) => `<button class="btn ghost" data-a="${a.action}">${a.label}</button>`).join('')}</div>` : ''}
    <div class="tut-nav">
      <button class="btn ghost" id="tut-prev" ${step === 0 ? 'disabled' : ''}>Indietro</button>
      <button class="btn primary" id="tut-next">${last ? 'Fine lezione ✓' : 'Avanti'} <kbd>Invio</kbd></button>
    </div>`;
  openPanel('tutorial');
  el.panel.querySelector('#tut-back').addEventListener('click', renderLessonList);
  el.panel.querySelector('#tut-prev').addEventListener('click', () => { tut.step--; renderStep(); });
  el.panel.querySelector('#tut-next').addEventListener('click', tutNext);
  el.panel.querySelectorAll('[data-a]').forEach((b) => b.addEventListener('click', () => tutAction(b.dataset.a)));
  el.panel.querySelectorAll('.quiz').forEach((qEl) => {
    const q = quizzes[Number(qEl.dataset.q)];
    qEl.querySelectorAll('[data-o]').forEach((b) => b.addEventListener('click', () => {
      const i = Number(b.dataset.o);
      const good = i === q.answer;
      sound.chime(good);
      qEl.querySelectorAll('[data-o]').forEach((x) => { x.disabled = true; x.classList.toggle('right', Number(x.dataset.o) === q.answer); });
      if (!good) b.classList.add('wrong');
      const ex = qEl.querySelector('.quiz-ex');
      ex.hidden = false;
      ex.innerHTML = `<b>${good ? 'Giusto.' : 'Non proprio.'}</b> ${q.explain}`;
      if (q.reveal) {
        applySceneLabels(q.reveal.labels);
        applySceneConstraints(q.reveal.constraints);
      }
    }));
  });
}

function tutNext() {
  if (!tut) return;
  if (tut.step < tut.lesson.steps.length - 1) { tut.step++; renderStep(); return; }
  stats.lessons[tut.lesson.id] = true;
  saveStats();
  const idx = LESSONS.indexOf(tut.lesson);
  const next = LESSONS[idx + 1];
  toast(`Lezione completata: <b>${tut.lesson.title}</b>`, 'good');
  if (next) openLesson(next.id); else renderLessonList();
}

function tutAction(a) {
  const st = sceneState;
  if (a === 'rotate') {
    const i = ROTATION_SEQUENCE.indexOf(st.sc.rot);
    const rot = ROTATION_SEQUENCE[(i + 1) % 6];
    showScene({ ...st.sc, rot }, { keepView: true });
    toast(`Rotazione: ora il palleggiatore è in zona ${rot} (<b>P${rot}</b>)`);
  } else if (a === 'toggleTop') {
    const top = arena.view !== 'top';
    arena.setView(top ? 'top' : st.sc.view, st.side, { refOrientation: st.sc.view });
    updateViewSwitch(arena.view);
  } else if (a === 'toggleRef') {
    const v = arena.view === 'r1' ? 'r2' : 'r1';
    st.sc.view = v;
    arena.setView(v, st.side);
    arena.lastRefView = v;
    updateViewSwitch(v);
    toast(`Ora sei il <b>${viewName(v)}</b>: la squadra è alla tua ${teamOnLeft(v, st.side) ? 'sinistra' : 'destra'}`);
  } else if (a === 'startAssist') startGame('assist');
}

// ---------- esplora ----------
const explore = { rot: 1, side: 1, labels: 'full', zones: false, constraints: true, view: 'r2' };

function startExplore() {
  enterMode('explore', 'Esplora');
  round = null;
  session = null;
  el.hud.hidden = true;
  el.viewSwitch.hidden = false;
  resetExplore();
}

function resetExplore(players) {
  const sc = { rot: explore.rot, formation: 'reception', side: explore.side, view: explore.view, labels: explore.labels, zones: explore.zones, serving: true, constraints: explore.constraints ? true : null, zonesFrom: explore.view === 'r1' ? 'r1' : 'r2' };
  showScene(sc, { keepView: !!players || explore.started });
  if (!explore.started || !players) {
    arena.setView(explore.view, explore.side, { refOrientation: arena.lastRefView || 'r2' });
    updateViewSwitch(explore.view);
  }
  explore.started = true;
  if (players) {
    sceneState.scenario.players = players;
    reevaluate(sceneState.scenario);
    arena.layoutReceiving(0, explore.side, sceneState.scenario, { animate: true });
    applySceneLabels(explore.labels);
    refreshExploreOverlay();
  }
  arena.dragEnabled = true;
  arena.onDrag = () => { reevaluate(sceneState.scenario); refreshExploreOverlay(); };
  arena.onDragEnd = null;
  renderExplore();
}

function refreshExploreOverlay() {
  applySceneConstraints(explore.constraints ? true : null);
  if (!explore.constraints) {
    for (const v of sceneState.scenario.evaluation.violations) { v.A.figure.highlight('#ff3b30'); v.B.figure.highlight('#ff3b30'); }
  }
  renderExploreStatus();
}

function renderExplore() {
  if (mode !== 'explore') return;
  const seg = (name, opts, cur) => `<div class="seg wide" data-k="${name}">${opts.map(([v, l]) => `<button data-v="${v}" class="${String(cur) === String(v) ? 'on' : ''}">${l}</button>`).join('')}</div>`;
  el.panel.innerHTML = `
    <h2>Esplora</h2>
    <p class="muted">Trascina i giocatori della squadra in ricezione: le linee mostrano le relazioni (verde = rispettata, giallo = al limite, rosso = violata).</p>
    <label class="lbl">Rotazione</label>${seg('rot', [1, 6, 5, 4, 3, 2].map((r) => [r, 'P' + r]), explore.rot)}
    <label class="lbl">Vista</label>${seg('view', [['r1', '1° arbitro'], ['r2', '2° arbitro'], ['top', 'Dall\'alto'], ['free', 'Libera']], explore.view)}
    <label class="lbl">Campo della squadra in ricezione</label>${seg('side', [[-1, 'Sinistro'], [1, 'Destro']], explore.side)}
    <label class="lbl">Etichette</label>${seg('labels', [['', 'Nessuna'], ['num', 'Numeri'], ['zone', 'Zone'], ['full', 'Ruolo e zona']], explore.labels || '')}
    <div class="checks">
      <label><input type="checkbox" data-c="zones" ${explore.zones ? 'checked' : ''}> Zone sul campo</label>
      <label><input type="checkbox" data-c="constraints" ${explore.constraints ? 'checked' : ''}> Relazioni</label>
    </div>
    <div class="tut-actions">
      <button class="btn ghost" data-x="fault">Crea un fallo</button>
      <button class="btn ghost" data-x="close">Caso al limite</button>
      <button class="btn ghost" data-x="reset">Ripristina</button>
    </div>
    <div id="explore-status"></div>
    <details class="fb-note" open><summary>${ROTATION_NOTES[explore.rot].title}</summary><p>${ROTATION_NOTES[explore.rot].text}</p></details>`;
  openPanel('explore');
  el.panel.querySelectorAll('.seg[data-k]').forEach((s) => s.querySelectorAll('button').forEach((b) => b.addEventListener('click', () => {
    const k = s.dataset.k;
    let v = b.dataset.v;
    if (k === 'rot' || k === 'side') v = Number(v);
    explore[k] = v || null;
    if (k === 'view') {
      arena.setView(v, explore.side, { refOrientation: arena.lastRefView || 'r2' });
      if (v === 'r1' || v === 'r2') arena.lastRefView = v;
      updateViewSwitch(v);
      renderExplore();
      return;
    }
    if (k === 'labels') { sceneState.sc.labels = explore.labels; applySceneLabels(explore.labels); renderExplore(); return; }
    resetExplore();
  })));
  el.panel.querySelectorAll('[data-c]').forEach((c) => c.addEventListener('change', () => {
    explore[c.dataset.c] = c.checked;
    if (c.dataset.c === 'zones') arena.showZones(explore.side, explore.zones, { readFrom: explore.view === 'r1' ? 'r1' : 'r2' });
    refreshExploreOverlay();
  }));
  el.panel.querySelectorAll('[data-x]').forEach((b) => b.addEventListener('click', () => {
    const x = b.dataset.x;
    if (x === 'reset') return resetExplore();
    const base = baseFormation(explore.rot, teams[0], { libero: settings.libero });
    const cons = pick(ROTATION_NOTES[explore.rot].critical);
    const players = withConstraintMargin(base, cons, x === 'fault' ? -(0.3 + Math.random() * 0.6) : 0.05 + Math.random() * 0.08);
    resetExplore(players);
    toast(x === 'fault' ? 'Fallo creato: trovalo, poi trascina un giocatore per correggerlo.' : 'Regolare per pochi centimetri: guarda i piedi.');
  }));
  renderExploreStatus();
}

function renderExploreStatus() {
  const box = el.panel.querySelector('#explore-status');
  if (!box) return;
  const ev = sceneState.scenario.evaluation;
  box.innerHTML = ev.legal
    ? '<div class="status good">✓ Posizione regolare</div>'
    : `<div class="status bad">✗ Fallo di posizione</div><ul class="ex-list">${ev.violations.map((v) => `<li><span class="pair bad">${v.c.id}</span> ${describeViolation(v)}</li>`).join('')}</ul>`;
}

// ---------- impostazioni ----------
const kitOptions = [['auto', 'Casuale'], ...KITS.map((k) => [k.id, k.name])];
const SETTINGS_SCHEMA = [
  { group: 'Tempi' },
  { key: 'obsTime', label: 'Tempo massimo dal fischio al servizio', type: 'range', min: 3, max: 12, step: 0.5, fmt: (v) => `${v} s` },
  { key: 'varTime', label: 'Istante del servizio variabile', hint: 'Il battitore serve tra metà e la fine del tempo: non puoi prevedere il colpo.', type: 'toggle' },
  { key: 'reactTime', label: 'Tempo per fischiare dopo il colpo', type: 'range', min: 1, max: 5, step: 0.5, fmt: (v) => `${v} s` },
  { key: 'strict', label: 'Fischio solo dopo il colpo di servizio', hint: 'Come prevede la regola: un fischio prima del colpo è anticipato.', type: 'toggle' },
  { group: 'Gioco' },
  { key: 'view', label: 'Vista', type: 'select', options: [['alterna', 'Alterna 1° e 2° arbitro'], ['r2', 'Sempre 2° arbitro'], ['r1', 'Sempre 1° arbitro'], ['casuale', 'Casuale']] },
  { key: 'difficulty', label: 'Difficoltà', hint: 'Facile: falli evidenti. Difficile: pochi centimetri, scambi e casi al limite.', type: 'select', options: Object.entries(DIFFICULTY).map(([k, d]) => [k, d.label]) },
  { key: 'faultProb', label: 'Frequenza dei falli', type: 'range', min: 0.1, max: 0.9, step: 0.05, fmt: (v) => `${Math.round(v * 100)}%` },
  { key: 'rounds', label: 'Servizi per partita', type: 'select', options: [[10, '10'], [20, '20'], [30, '30'], [50, '50']] },
  { key: 'freeze', label: 'Giocatori fermi dopo il servizio', hint: 'Disattivato: dopo il colpo i giocatori si spostano come in partita.', type: 'toggle' },
  { key: 'libero', label: 'Libero in campo', type: 'toggle' },
  { key: 'cardStyle', label: 'Scheda della formazione', type: 'select', options: [['vista', 'Orientata come la vista'], ['squadra', 'Standard (rete in alto)']] },
  { group: 'Aspetto' },
  { key: 'gender', label: 'Categoria', type: 'select', options: [['M', 'Maschile (rete 2,43 m)'], ['F', 'Femminile (rete 2,24 m)']] },
  { key: 'kitHome', label: 'Maglie squadra A', type: 'select', options: kitOptions },
  { key: 'kitAway', label: 'Maglie squadra B', type: 'select', options: kitOptions },
  { key: 'kitLibero', label: 'Maglia del libero', type: 'select', options: kitOptions },
  { key: 'court', label: 'Campo', type: 'select', options: Object.entries(COURT_STYLES).map(([k, c]) => [k, c.name]) },
  { key: 'pip', label: 'Riquadro con il battitore', type: 'toggle' },
  { key: 'sound', label: 'Suoni', type: 'toggle' },
];

function openSettings() {
  const rows = SETTINGS_SCHEMA.map((f) => {
    if (f.group) return `<h4 class="set-group">${f.group}</h4>`;
    const v = settings[f.key];
    let input = '';
    if (f.type === 'toggle') input = `<label class="switch"><input type="checkbox" data-k="${f.key}" ${v ? 'checked' : ''}><span></span></label>`;
    else if (f.type === 'range') input = `<div class="range"><input type="range" data-k="${f.key}" min="${f.min}" max="${f.max}" step="${f.step}" value="${v}"><output>${f.fmt(v)}</output></div>`;
    else input = `<select data-k="${f.key}">${f.options.map(([ov, ol]) => `<option value="${ov}" ${String(ov) === String(v) ? 'selected' : ''}>${ol}</option>`).join('')}</select>`;
    return `<div class="set-row"><div><span>${f.label}</span>${f.hint ? `<small>${f.hint}</small>` : ''}</div>${input}</div>`;
  }).join('');
  openModal(`<h2>Impostazioni</h2><div class="settings">${rows}</div>
    <div class="modal-actions"><button class="btn ghost" id="set-reset-stats">Azzera statistiche</button><button class="btn ghost" id="set-defaults">Valori predefiniti</button><button class="btn primary" id="set-close">Fatto</button></div>`);
  el.modalCard.querySelectorAll('[data-k]').forEach((inp) => inp.addEventListener('input', () => {
    const f = SETTINGS_SCHEMA.find((x) => x.key === inp.dataset.k);
    let v = f.type === 'toggle' ? inp.checked : inp.value;
    if (f.type === 'range') { v = Number(v); inp.nextElementSibling.textContent = f.fmt(v); }
    settings[f.key] = v;
    store.set('settings', settings);
    if (['gender', 'kitHome', 'kitAway', 'kitLibero'].includes(f.key)) teamsDirty = true;
    if (['sound', 'pip', 'gender', 'court'].includes(f.key)) applyVisualSettings();
  }));
  el.modalCard.querySelector('#set-close').addEventListener('click', () => { closeModal(); if (mode === 'home') { if (teamsDirty) showHome(); else renderHome(); } });
  el.modalCard.querySelector('#set-defaults').addEventListener('click', () => {
    Object.assign(settings, DEFAULTS);
    store.set('settings', settings);
    teamsDirty = true;
    applyVisualSettings();
    openSettings();
  });
  el.modalCard.querySelector('#set-reset-stats').addEventListener('click', (e) => {
    if (e.target.dataset.confirm) {
      Object.assign(stats, emptyStats());
      saveStats();
      e.target.textContent = 'Statistiche azzerate';
      e.target.disabled = true;
    } else {
      e.target.dataset.confirm = '1';
      e.target.textContent = 'Clicca di nuovo per confermare';
    }
  });
}

// ---------- tastiera ----------
window.addEventListener('keydown', (e) => {
  if (e.target.matches?.('input, select, textarea')) return;
  if (!el.modal.hidden) {
    if (e.key === 'Escape' && mode !== 'match') closeModal();
    return;
  }
  const k = e.key;
  if (k === ' ' || k === 'Spacebar') {
    e.preventDefault();
    if (mode === 'assist' || mode === 'match') pressFault();
    return;
  }
  if (k === 'Enter') {
    e.preventDefault();
    if (mode === 'assist' || mode === 'match') {
      if (round?.phase === 'ready') whistleStart();
      else if (round?.phase === 'result') nextRound();
    } else if (mode === 'recognize' && round?.phase === 'result') newRound();
    else if (mode === 'tutorial' && tut) tutNext();
    return;
  }
  if (mode === 'recognize' && /^[1-6]$/.test(k)) { answerRotation(Number(k)); return; }
  if ((k === '1' || k === '2') && mode !== 'match' && mode !== 'home') switchView(k === '1' ? 'r1' : 'r2');
  if (k === 'ArrowLeft') arena.nudgeLook(0.08, 0);
  if (k === 'ArrowRight') arena.nudgeLook(-0.08, 0);
  if (k === 'ArrowUp') arena.nudgeLook(0, 0.05);
  if (k === 'ArrowDown') arena.nudgeLook(0, -0.05);
  if (k === 'Escape' && mode !== 'home') showHome();
});

// ---------- avvio ----------
async function init() {
  try {
    await Promise.race([
      Promise.all([document.fonts.load('900 100px "Barlow Condensed"'), document.fonts.load('600 30px "Barlow Condensed"')]),
      new Promise((r) => setTimeout(r, 2500)),
    ]);
  } catch { /* si usano i font di sistema */ }
  arena = new Arena(el.stage);
  applyVisualSettings();
  newTeams();
  arena.onTick(tick);
  $('#btn-home').addEventListener('click', showHome);
  $('#btn-settings').addEventListener('click', openSettings);
  el.viewSwitch.querySelectorAll('button').forEach((b) => b.addEventListener('click', () => switchView(b.dataset.view)));
  showHome();
  document.body.classList.add('ready');
}

init();
