// Formazioni di ricezione del sistema 5-1 e generazione degli scenari, regolari o con fallo di posizione.
import { rotationZonesWithLibero, evaluate, CONSTRAINTS, constraintMargin, ROTATION_SEQUENCE } from './rules.js';

// [d, w, postura]  —  d = distanza dalla rete, w = distanza dalla laterale sinistra della squadra (metri).
// Ricezione a tre (libero + due schiacciatori), come nel sistema 5-1 di VBRotations
// (github.com/monkeysppp/VBRotations, posizioni "Ricezione"). Il libero prende il posto del centrale di seconda linea.
export const FORMATIONS = {
  1: { P: [7.0, 8.4, 'stand'], S1: [6.0, 7.0, 'ready'], C2: [0.6, 1.5, 'net'], O: [1.0, 0.54, 'net'], S2: [6.0, 2.0, 'ready'], L: [7.0, 4.5, 'ready'] },
  6: { S1: [6.0, 7.0, 'ready'], C2: [1.4, 7.0, 'net'], O: [0.6, 5.6, 'net'], S2: [6.0, 2.0, 'ready'], L: [7.0, 4.5, 'ready'], P: [1.7, 5.1, 'stand'] },
  5: { L: [6.0, 7.0, 'ready'], O: [1.0, 8.4, 'net'], S2: [6.0, 2.0, 'ready'], C1: [0.6, 0.6, 'net'], P: [1.4, 3.5, 'stand'], S1: [7.0, 4.5, 'ready'] },
  4: { O: [8.2, 7.6, 'stand'], S2: [6.0, 2.0, 'ready'], C1: [1.4, 1.4, 'net'], P: [0.6, 0.6, 'net'], S1: [7.0, 4.5, 'ready'], L: [6.0, 7.0, 'ready'] },
  3: { S2: [6.0, 7.0, 'ready'], C1: [1.4, 7.4, 'net'], P: [1.0, 6.0, 'net'], S1: [6.0, 2.0, 'ready'], L: [7.0, 4.5, 'ready'], O: [8.2, 5.6, 'stand'] },
  2: { L: [6.0, 7.0, 'ready'], P: [1.0, 7.0, 'net'], S1: [6.0, 2.0, 'ready'], C2: [1.6, 0.4, 'net'], O: [8.4, 2.6, 'stand'], S2: [7.0, 4.5, 'ready'] },
};

// Variante con l'opposto in ricezione: nelle rotazioni in cui è in seconda linea (P4, P3, P2)
// riceve al posto dello schiacciatore di prima linea, che resta a rete libero di attaccare.
export const OPP_FORMATIONS = {
  4: { P: [0.6, 0.6, 'net'], C1: [1.4, 1.4, 'net'], S2: [1.2, 2.7, 'net'], S1: [6.0, 2.0, 'ready'], L: [6.6, 4.5, 'ready'], O: [6.2, 7.0, 'ready'] },
  3: { S1: [1.0, 1.0, 'net'], P: [0.6, 6.0, 'net'], C1: [1.4, 7.4, 'net'], L: [6.2, 2.0, 'ready'], O: [6.6, 4.5, 'ready'], S2: [6.2, 7.0, 'ready'] },
  2: { C2: [0.6, 0.5, 'net'], S1: [1.2, 1.8, 'net'], P: [0.7, 7.0, 'net'], O: [6.2, 2.0, 'ready'], S2: [6.6, 4.5, 'ready'], L: [6.2, 7.0, 'ready'] },
};
export const OPP_ROTATIONS = [4, 3, 2];

export const ROTATION_NOTES = {
  1: {
    title: 'P1 — palleggiatore in zona 1',
    text: 'Il palleggiatore è nell\'angolo in fondo a destra, nascosto dietro lo schiacciatore di zona 2 che riceve sulla destra: deve restare più lontano dalla rete di lui (2-1) e più a destra del libero (6-1). Opposto (zona 4) e centrale (zona 3) aspettano a rete sul lato sinistro: l\'opposto deve restare a sinistra del centrale (4-3).',
    critical: ['2-1', '6-1', '4-3'],
  },
  6: {
    title: 'P6 — palleggiatore in zona 6',
    text: 'Il palleggiatore (zona 6) penetra al centro, appena dietro l\'opposto di zona 3 che è a rete: deve restare dietro di lui (3-6), a destra del libero di zona 5 (5-6) e a sinistra dello schiacciatore di zona 1 (6-1). Lo schiacciatore di zona 4 riceve a sinistra e deve stare più avanti del libero (4-5).',
    critical: ['3-6', '5-6', '6-1', '4-5'],
  },
  5: {
    title: 'P5 — palleggiatore in zona 5',
    text: 'Il palleggiatore (zona 5) penetra sul lato sinistro, dietro al centrale di zona 4 che è nell\'angolo a rete (4-5), e deve restare a sinistra dello schiacciatore di zona 6 (5-6). Lo schiacciatore di zona 3 riceve a sinistra: deve stare più avanti di quello di zona 6 (3-6) e a destra del centrale (4-3).',
    critical: ['4-5', '5-6', '3-6', '4-3'],
  },
  4: {
    title: 'P4 — palleggiatore in zona 4',
    text: 'Palleggiatore (zona 4) e centrale (zona 3) sono nell\'angolo sinistro a rete, con il palleggiatore a sinistra (4-3). Lo schiacciatore di zona 2 riceve tutto a sinistra ma deve restare a destra del centrale (3-2): è la relazione più delicata. Il libero riceve a destra, a sinistra dell\'opposto nascosto in fondo in zona 1 (6-1).',
    critical: ['4-3', '3-2', '6-1'],
  },
  3: {
    title: 'P3 — palleggiatore in zona 3',
    text: 'Il palleggiatore (zona 3) è a rete, a sinistra del centrale di zona 2 (3-2). Lo schiacciatore di zona 4 riceve a sinistra e deve stare più avanti del libero (4-5). L\'opposto (zona 6) si nasconde in fondo, tra il libero (5-6) e lo schiacciatore di zona 1 (6-1).',
    critical: ['3-2', '4-5', '5-6', '6-1'],
  },
  2: {
    title: 'P2 — palleggiatore in zona 2',
    text: 'Il palleggiatore (zona 2) è già a rete sulla destra e il centrale (zona 4) aspetta nell\'angolo sinistro. Lo schiacciatore di zona 3 riceve a sinistra: deve stare più avanti dello schiacciatore di zona 6 (3-6) e a destra del centrale (4-3). L\'opposto (zona 5) si nasconde in fondo, a sinistra dello schiacciatore di zona 6 (5-6).',
    critical: ['3-6', '4-3', '5-6'],
  },
};

export const OPP_NOTES = {
  4: {
    title: 'P4 con l\'opposto in ricezione',
    text: 'Lo schiacciatore di zona 2 non riceve e aspetta a rete sulla sinistra, ma sempre a destra del centrale (3-2), che a sua volta sta a destra del palleggiatore (4-3). L\'opposto (zona 1) riceve a destra: il libero deve restare alla sua sinistra (6-1).',
    critical: ['3-2', '4-3', '6-1'],
  },
  3: {
    title: 'P3 con l\'opposto in ricezione',
    text: 'Lo schiacciatore di zona 4 resta a rete sulla sinistra. L\'opposto (zona 6) riceve al centro, tra il libero (5-6) e lo schiacciatore di zona 1 (6-1). Il palleggiatore è a rete, a sinistra del centrale (3-2).',
    critical: ['5-6', '6-1', '3-2'],
  },
  2: {
    title: 'P2 con l\'opposto in ricezione',
    text: 'Lo schiacciatore di zona 3 resta a rete sulla sinistra, ma a destra del centrale (4-3). L\'opposto (zona 5) riceve a sinistra e deve restare a sinistra dello schiacciatore di zona 6 (5-6).',
    critical: ['4-3', '5-6'],
  },
};

export const notesFor = (rot, variant) => (variant === 'opp' && OPP_NOTES[rot]) || ROTATION_NOTES[rot];

// Falli tipici: quelli che si vedono davvero in partita. `move` = zone dei giocatori che si spostano.
export const COMMON_FAULTS = {
  1: [
    { c: '2-1', move: [1], w: 4, label: 'Il palleggiatore anticipa la penetrazione e passa davanti allo schiacciatore di zona 2.' },
    { c: '6-1', move: [1], w: 2, label: 'Il palleggiatore si stringe verso il centro e finisce a sinistra del libero.' },
    { c: '4-3', move: [4, 3], w: 2, label: 'Opposto e centrale, nascosti a rete sulla sinistra, hanno l\'ordine invertito.' },
    { c: '2-1', move: [2], w: 1, label: 'Lo schiacciatore di zona 2 riceve troppo profondo, dietro al palleggiatore.' },
  ],
  6: [
    { c: '3-6', move: [6, 3], w: 4, label: 'Penetrazione anticipata: il palleggiatore è più vicino alla rete dell\'opposto di zona 3.' },
    { c: '4-5', move: [4], w: 3, label: 'Lo schiacciatore di zona 4 riceve troppo profondo, dietro al libero.' },
    { c: '6-1', move: [6], w: 2, label: 'Il palleggiatore scivola a destra, oltre lo schiacciatore di zona 1.' },
    { c: '5-6', move: [5], w: 1, label: 'Il libero si sposta a destra del palleggiatore.' },
    { c: '3-2', move: [3, 2], w: 1, label: 'Opposto e centrale, a rete, hanno l\'ordine invertito.' },
  ],
  5: [
    { c: '5-6', move: [5], w: 4, label: 'Il palleggiatore scivola a destra prima del servizio, oltre lo schiacciatore di zona 6.' },
    { c: '4-5', move: [5, 4], w: 3, label: 'Penetrazione anticipata: il palleggiatore è più vicino alla rete del centrale di zona 4.' },
    { c: '3-6', move: [3], w: 3, label: 'Lo schiacciatore di zona 3 riceve troppo profondo, dietro a quello di zona 6.' },
    { c: '4-3', move: [4], w: 1, label: 'Il centrale di zona 4 si sposta a destra dello schiacciatore di zona 3.' },
  ],
  4: [
    { c: '3-2', move: [2], w: 4, label: 'Lo schiacciatore di zona 2, che riceve sulla sinistra, si allarga oltre il centrale di zona 3.' },
    { c: '4-3', move: [4, 3], w: 3, label: 'Palleggiatore e centrale, nell\'angolo a rete, hanno l\'ordine invertito.' },
    { c: '6-1', move: [6], w: 2, label: 'Il libero si allarga a destra, oltre l\'opposto nascosto in zona 1.' },
  ],
  3: [
    { c: '4-5', move: [4], w: 3, label: 'Lo schiacciatore di zona 4 riceve troppo profondo, dietro al libero.' },
    { c: '3-2', move: [3, 2], w: 3, label: 'Il palleggiatore si mette a destra del centrale di zona 2.' },
    { c: '5-6', move: [6], w: 2, label: 'L\'opposto nascosto in zona 6 si sposta a sinistra del libero.' },
    { c: '6-1', move: [6], w: 2, label: 'L\'opposto nascosto in zona 6 si sposta a destra dello schiacciatore di zona 1.' },
  ],
  2: [
    { c: '3-6', move: [3], w: 4, label: 'Lo schiacciatore di zona 3 riceve troppo profondo, dietro a quello di zona 6.' },
    { c: '4-3', move: [4], w: 2, label: 'Il centrale di zona 4 si sposta verso il centro, a destra dello schiacciatore di zona 3.' },
    { c: '5-6', move: [5], w: 2, label: 'L\'opposto nascosto in zona 5 si sposta a destra dello schiacciatore di zona 6.' },
  ],
};

export const OPP_FAULTS = {
  4: [
    { c: '3-2', move: [2, 3], w: 3, label: 'Lo schiacciatore di zona 2, che non riceve, si mette a rete a sinistra del centrale.' },
    { c: '4-3', move: [4, 3], w: 2, label: 'Palleggiatore e centrale, nell\'angolo a rete, hanno l\'ordine invertito.' },
    { c: '6-1', move: [6], w: 3, label: 'Il libero si allarga a destra dell\'opposto che riceve.' },
  ],
  3: [
    { c: '5-6', move: [5], w: 3, label: 'Il libero si sposta a destra dell\'opposto che riceve al centro.' },
    { c: '6-1', move: [6], w: 3, label: 'L\'opposto che riceve si allarga a destra dello schiacciatore di zona 1.' },
    { c: '3-2', move: [3, 2], w: 2, label: 'Il palleggiatore si mette a destra del centrale di zona 2.' },
  ],
  2: [
    { c: '4-3', move: [4, 3], w: 3, label: 'Centrale e schiacciatore, a rete sulla sinistra, hanno l\'ordine invertito.' },
    { c: '5-6', move: [5], w: 3, label: 'L\'opposto che riceve si sposta a destra dello schiacciatore di zona 6.' },
    { c: '6-1', move: [6], w: 1, label: 'Lo schiacciatore di zona 6 si allarga a destra del libero.' },
  ],
};

const faultsFor = (rot, variant) => (variant === 'opp' && OPP_FAULTS[rot]) || COMMON_FAULTS[rot];

const STANCE = {
  ready: { sw: 0.25, crouch: 1 },
  stand: { sw: 0.16, crouch: 0.15 },
  net: { sw: 0.17, crouch: 0.05 },
};

// swap: due giocatori scambiati; wrongRot: squadra schierata come in un'altra rotazione.
export const DIFFICULTY = {
  facile: { label: 'Facile', fault: [0.8, 1.6], jitter: 0.2, swap: 0, wrongRot: 0.1, close: 0, faultProb: 0.5 },
  medio: { label: 'Medio', fault: [0.35, 0.9], jitter: 0.3, swap: 0.12, wrongRot: 0.1, close: 0.15, faultProb: 0.45 },
  difficile: { label: 'Difficile', fault: [0.08, 0.4], jitter: 0.4, swap: 0.15, wrongRot: 0.1, close: 0.35, faultProb: 0.45 },
};

const rand = (a, b) => a + Math.random() * (b - a);
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
function weightedPick(items, weightFn) {
  const ws = items.map(weightFn);
  let t = Math.random() * ws.reduce((s, x) => s + x, 0);
  for (let i = 0; i < items.length; i++) { t -= ws[i]; if (t <= 0) return items[i]; }
  return items[items.length - 1];
}

const BOUNDS = { dMin: 0.35, dMax: 8.6, wMin: 0.3, wMax: 8.7 };
const MIN_DIST = 0.72;

function inBounds(p) {
  return p.d >= BOUNDS.dMin && p.d <= BOUNDS.dMax && p.w >= BOUNDS.wMin && p.w <= BOUNDS.wMax;
}
function noCollisions(players) {
  for (let i = 0; i < players.length; i++) for (let j = i + 1; j < players.length; j++) {
    if (Math.hypot(players[i].d - players[j].d, players[i].w - players[j].w) < MIN_DIST) return false;
  }
  return true;
}
const byZoneOf = (players) => Object.fromEntries(players.map((p) => [p.zone, p]));
const clone = (players) => players.map((p) => ({ ...p }));
const POSE_KEYS = ['d', 'w', 'theta', 'stance', 'sw', 'crouch', 'stagger'];

// Formazione di base per la rotazione, con i numeri di maglia della squadra.
export function baseFormation(rot, team, { libero = true, variant = null } = {}) {
  const { zones, replaced } = rotationZonesWithLibero(rot, libero);
  const f = (variant === 'opp' && OPP_FORMATIONS[rot]) || FORMATIONS[rot];
  return Object.entries(zones).map(([zone, role]) => {
    const [d, w, stance] = f[role] ?? f.L;
    return {
      zone: Number(zone), role, num: team.numbers[role], isLibero: role === 'L', replaces: role === 'L' ? replaced : null,
      d, w, stance, theta: 0, sw: STANCE[stance].sw, stagger: 0, crouch: STANCE[stance].crouch,
    };
  });
}

function minMargin(players) {
  const { results } = evaluate(byZoneOf(players));
  return Math.min(...results.map((r) => r.margin));
}

// Piccole variazioni naturali: nessuna squadra si mette due volte identica.
function jitter(players, amount, safe = 0.3) {
  for (let attempt = 0; attempt < 60; attempt++) {
    const next = players.map((p) => {
      const q = { ...p };
      q.d += rand(-amount, amount);
      q.w += rand(-amount, amount);
      q.theta = p.stance === 'net' ? rand(-0.15, 0.15) : p.stance === 'ready' ? rand(-0.35, 0.35) : rand(-0.6, 0.6);
      q.stagger = p.stance === 'ready' ? rand(-0.18, 0.18) : rand(-0.1, 0.1);
      return q;
    });
    if (next.every(inBounds) && noCollisions(next) && minMargin(next) >= Math.min(safe, minMargin(players) * 0.8)) return next;
  }
  return clone(players);
}

// Sposta uno dei giocatori indicati in modo che il margine della relazione diventi `target`.
function shiftForMargin(players, cons, target, safe, zones = [cons.a, cons.b]) {
  for (let attempt = 0; attempt < 80; attempt++) {
    const spread = attempt < 30 ? 0.35 : 0.9; // se il posto è occupato, si prova anche un po' più in là
    const zone = pick(zones);
    const next = clone(players);
    const bz = byZoneOf(next);
    const m = constraintMargin(cons, bz[cons.a], bz[cons.b]);
    const delta = m - target;
    const P = bz[zone];
    if (cons.kind === 'fb') {
      if (zone === cons.b) P.d -= delta; else P.d += delta;
      P.w += rand(-spread, spread);
    } else {
      if (zone === cons.a) P.w += delta; else P.w -= delta;
      P.d += rand(-spread, spread);
    }
    if (!inBounds(P) || !noCollisions(next)) continue;
    const res = evaluate(byZoneOf(next));
    const own = res.results.find((r) => r.c.id === cons.id).margin;
    if (Math.abs(own - target) > 0.02) continue;
    if (res.results.some((r) => r.c.id !== cons.id && r.margin < safe)) continue;
    return { players: next, moved: P };
  }
  return null;
}

const consById = (id) => CONSTRAINTS.find((c) => c.id === id);

// Uno dei falli tipici della rotazione, più o meno evidente a seconda della difficoltà.
function makeCommonFault(players, rot, variant, diff) {
  const list = faultsFor(rot, variant);
  for (let attempt = 0; attempt < 12; attempt++) {
    const f = weightedPick(list, (x) => x.w);
    const out = shiftForMargin(players, consById(f.c), -rand(diff.fault[0], diff.fault[1]), 0.2, f.move);
    if (out) return { players: out.players, kind: 'fault', focus: f.c, label: f.label };
  }
  return null;
}

// Caso al limite: una relazione tipica rispettata per pochi centimetri.
function makeClose(players, rot, variant) {
  const list = faultsFor(rot, variant);
  for (let attempt = 0; attempt < 12; attempt++) {
    const f = weightedPick(list, (x) => x.w);
    const out = shiftForMargin(players, consById(f.c), rand(0.04, 0.16), 0.2, f.move);
    if (out) return { players: out.players, kind: 'close', focus: f.c, label: null };
  }
  return null;
}

// Due giocatori della stessa coppia hanno il posto scambiato (dopo un cambio, un time-out…).
function makeSwap(players, rot, variant) {
  const list = faultsFor(rot, variant);
  for (let attempt = 0; attempt < 12; attempt++) {
    const f = weightedPick(list, (x) => x.w);
    const c = consById(f.c);
    const next = swapZones(players, c.a, c.b);
    const res = evaluate(byZoneOf(next));
    if (!res.legal) {
      const bz = byZoneOf(next);
      return { players: next, kind: 'swap', focus: c.id, label: `Il n°${bz[c.a].num} e il n°${bz[c.b].num} hanno il posto scambiato: la disposizione sembra normale, ma i numeri non sono dove dovrebbero.` };
    }
  }
  return null;
}

// La squadra si schiera con la formazione di un'altra rotazione (quella prima o quella dopo).
function makeWrongRotation(rot, team, opts) {
  const i = ROTATION_SEQUENCE.indexOf(rot);
  for (const other of [ROTATION_SEQUENCE[(i + 5) % 6], ROTATION_SEQUENCE[(i + 1) % 6]].sort(() => Math.random() - 0.5)) {
    const wrong = baseFormation(other, team, { libero: opts.libero, variant: null });
    const players = baseFormation(rot, team, opts).map((p) => {
      const src = wrong.find((q) => q.role === p.role) || (p.role[0] === 'C' && wrong.find((q) => q.role[0] === 'C'));
      const q = { ...p };
      if (src) for (const k of POSE_KEYS) q[k] = src[k];
      return q;
    });
    if (!evaluate(byZoneOf(players)).legal) {
      return { players, kind: 'wrongrot', focus: null, label: `La squadra si è schierata come in P${other}, non in P${rot}: i giocatori occupano i posti di un'altra rotazione.` };
    }
  }
  return null;
}

export function makeScenario(rot, team, opts = {}) {
  const diff = DIFFICULTY[opts.difficulty || 'medio'];
  const faultProb = opts.faultProb ?? diff.faultProb;
  const variant = opts.variant && OPP_FORMATIONS[rot] ? opts.variant : null;
  const o = { ...opts, variant };
  let players = jitter(baseFormation(rot, team, o), diff.jitter);
  let result = null;
  if (opts.forceKind === 'legal') result = null;
  else if (opts.forceKind === 'fault' || Math.random() < faultProb) {
    const r = Math.random();
    if (r < diff.wrongRot) result = makeWrongRotation(rot, team, o);
    else if (r < diff.wrongRot + diff.swap) result = makeSwap(players, rot, variant);
    result ||= makeCommonFault(players, rot, variant, diff);
  } else if (Math.random() < diff.close) {
    result = makeClose(players, rot, variant);
  }
  if (result) players = result.players;
  const evaluation = evaluate(byZoneOf(players));
  return {
    rotation: rot,
    variant,
    players,
    kind: result ? result.kind : 'legal',
    focus: result?.focus ?? null,
    label: result?.label ?? null,
    evaluation,
    fault: !evaluation.legal,
  };
}

// Posizioni dopo il servizio (cambi di ruolo): mostrano come le sovrapposizioni si "sciolgono".
export function transitionSpot(p) {
  const front = [2, 3, 4].includes(p.zone);
  switch (p.role) {
    case 'P': return { d: 0.7, w: 6.0 };
    case 'O': return front ? { d: 3.4, w: 8.4 } : { d: 6.5, w: 7.8 };
    case 'S1': case 'S2': return front ? { d: 3.6, w: 0.7 } : { d: 6.8, w: 4.5 };
    case 'C1': case 'C2': return { d: 3.0, w: 4.4 };
    case 'L': return { d: 6.3, w: 1.6 };
    default: return { d: p.d, w: p.w };
  }
}

export { byZoneOf };

// ---- aiuti per tutorial ed esplorazione ----
export function scenarioFrom(rot, players, kind = 'custom', variant = null) {
  const evaluation = evaluate(byZoneOf(players));
  return { rotation: rot, variant, players, kind, focus: null, label: null, evaluation, fault: !evaluation.legal };
}

export function reevaluate(scenario) {
  scenario.evaluation = evaluate(byZoneOf(scenario.players));
  scenario.fault = !scenario.evaluation.legal;
  return scenario;
}

// Porta il margine di una relazione a `margin` (negativo = fallo) spostando uno dei giocatori indicati.
export function withConstraintMargin(players, consId, margin, zones) {
  const cons = consById(consId);
  for (let i = 0; i < 10; i++) {
    const out = shiftForMargin(players, cons, margin, 0.15, zones);
    if (out) return out.players;
  }
  return players;
}

// Un fallo tipico a caso per la rotazione (per Esplora), con la sua descrizione.
export function commonFault(players, rot, variant, margin) {
  const list = faultsFor(rot, variant);
  for (let attempt = 0; attempt < 12; attempt++) {
    const f = weightedPick(list, (x) => x.w);
    const out = shiftForMargin(players, consById(f.c), margin, 0.15, f.move);
    if (out) return { players: out.players, label: f.label };
  }
  return null;
}

export function swapZones(players, za, zb) {
  const next = clone(players);
  const bz = byZoneOf(next);
  for (const k of POSE_KEYS) [bz[za][k], bz[zb][k]] = [bz[zb][k], bz[za][k]];
  return next;
}

// Giocatori al centro delle zone (per spiegare numerazione e rotazione).
export function zoneCenterFormation(rot, team, opts = {}) {
  return baseFormation(rot, team, opts).map((p) => {
    const c = { 4: [1.6, 1.5], 3: [1.6, 4.5], 2: [1.6, 7.5], 5: [6.2, 1.5], 6: [6.2, 4.5], 1: [6.2, 7.5] }[p.zone];
    return { ...p, d: c[0], w: c[1], theta: 0, stagger: 0, stance: 'stand', sw: 0.16, crouch: 0.15 };
  });
}

export { COMMON_FAULTS as FAULT_CATALOG };
