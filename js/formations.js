// Formazioni di ricezione del sistema 5-1 (ricezione a tre: libero + due schiacciatori)
// e generazione degli scenari, regolari o con fallo di posizione.
import { rotationZonesWithLibero, evaluate, CONSTRAINTS, constraintMargin } from './rules.js';

// [d, w, postura]  —  d = distanza dalla rete, w = distanza dalla laterale sinistra della squadra.
// Il libero (L) prende il posto del centrale di seconda linea.
export const FORMATIONS = {
  1: { P: [5.9, 8.5, 'stand'], S1: [5.0, 7.1, 'ready'], C2: [1.0, 4.9, 'net'], O: [1.3, 2.0, 'net'], S2: [6.0, 1.9, 'ready'], L: [6.4, 4.5, 'ready'] },
  6: { O: [0.8, 5.0, 'net'], P: [1.9, 5.6, 'stand'], S2: [5.4, 1.9, 'ready'], L: [6.3, 4.0, 'ready'], S1: [6.1, 7.1, 'ready'], C2: [0.9, 7.4, 'net'] },
  5: { C1: [0.8, 1.3, 'net'], P: [1.9, 1.7, 'stand'], S2: [5.4, 2.9, 'ready'], S1: [6.3, 5.2, 'ready'], L: [6.2, 7.6, 'ready'], O: [0.9, 8.0, 'net'] },
  4: { P: [0.7, 3.6, 'net'], C1: [0.8, 5.6, 'net'], S2: [5.3, 7.4, 'ready'], O: [7.4, 8.5, 'stand'], S1: [6.1, 1.8, 'ready'], L: [6.5, 4.6, 'ready'] },
  3: { P: [0.7, 6.0, 'net'], C1: [0.9, 7.9, 'net'], S1: [5.4, 1.8, 'ready'], L: [6.3, 4.0, 'ready'], O: [7.6, 5.6, 'stand'], S2: [6.2, 7.2, 'ready'] },
  2: { P: [0.7, 7.9, 'net'], C2: [0.8, 1.4, 'net'], S1: [5.3, 3.0, 'ready'], S2: [6.3, 5.1, 'ready'], O: [7.5, 1.3, 'stand'], L: [6.2, 7.5, 'ready'] },
};

export const ROTATION_NOTES = {
  1: {
    title: 'P1 — palleggiatore in zona 1',
    text: 'Il palleggiatore è in seconda linea a destra e si nasconde dietro lo schiacciatore di zona 2, che riceve. Deve restare più lontano dalla rete di lui (2-1) e più a destra del libero (6-1). L\'opposto è in prima linea, zona 4.',
    critical: ['2-1', '6-1'],
  },
  6: {
    title: 'P6 — palleggiatore in zona 6',
    text: 'Il palleggiatore entra verso rete al centro, appena dietro l\'opposto di zona 3: deve restare dietro di lui (3-6), a destra del libero di zona 5 (5-6) e a sinistra dello schiacciatore di zona 1 (6-1).',
    critical: ['3-6', '5-6', '6-1'],
  },
  5: {
    title: 'P5 — palleggiatore in zona 5',
    text: 'Il palleggiatore si avvicina a rete sul lato sinistro, dietro al centrale di zona 4 (4-5), e deve restare a sinistra dello schiacciatore di zona 6 (5-6). Fallo tipico: scivolare verso destra prima del servizio.',
    critical: ['4-5', '5-6'],
  },
  4: {
    title: 'P4 — palleggiatore in zona 4',
    text: 'Il palleggiatore è in prima linea a sinistra: a rete deve restare a sinistra del centrale di zona 3 (4-3). L\'opposto è in zona 1, nascosto dietro lo schiacciatore di zona 2 che riceve (2-1).',
    critical: ['4-3', '2-1'],
  },
  3: {
    title: 'P3 — palleggiatore in zona 3',
    text: 'Il palleggiatore è a rete al centro: deve stare a sinistra del centrale di zona 2 (3-2). L\'opposto in zona 6 resta dietro, tra il libero (5-6) e lo schiacciatore di zona 1 (6-1).',
    critical: ['3-2', '5-6', '6-1'],
  },
  2: {
    title: 'P2 — palleggiatore in zona 2',
    text: 'Il palleggiatore è già a rete sulla destra. Lo schiacciatore di zona 3 riceve e deve stare più avanti dello schiacciatore di zona 6 (3-6). L\'opposto, in zona 5, si nasconde dietro il centrale di zona 4 (4-5).',
    critical: ['3-6', '4-5', '5-6'],
  },
};

const STANCE = {
  ready: { sw: 0.25, crouch: 1 },
  stand: { sw: 0.16, crouch: 0.15 },
  net: { sw: 0.17, crouch: 0.05 },
};

export const DIFFICULTY = {
  facile: { label: 'Facile', fault: [0.8, 1.6], jitter: 0.2, swap: 0, close: 0, faultProb: 0.5 },
  medio: { label: 'Medio', fault: [0.35, 0.9], jitter: 0.35, swap: 0.25, close: 0.15, faultProb: 0.45 },
  difficile: { label: 'Difficile', fault: [0.08, 0.4], jitter: 0.45, swap: 0.25, close: 0.35, faultProb: 0.45 },
};

const rand = (a, b) => a + Math.random() * (b - a);
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
function weightedPick(items, weightFn) {
  const ws = items.map(weightFn);
  let t = Math.random() * ws.reduce((s, x) => s + x, 0);
  for (let i = 0; i < items.length; i++) { t -= ws[i]; if (t <= 0) return items[i]; }
  return items[items.length - 1];
}

const BOUNDS = { dMin: 0.35, dMax: 8.6, wMin: 0.35, wMax: 8.65 };
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

// Formazione di base per la rotazione, con i numeri di maglia della squadra.
export function baseFormation(rot, team, { libero = true } = {}) {
  const { zones, replaced } = rotationZonesWithLibero(rot, libero);
  const f = FORMATIONS[rot];
  return Object.entries(zones).map(([zone, role]) => {
    const [d, w, stance] = f[role] ?? f.L;
    return {
      zone: Number(zone), role, num: team.numbers[role], isLibero: role === 'L', replaces: role === 'L' ? replaced : null,
      d, w, stance, theta: 0, sw: STANCE[stance].sw, stagger: 0, crouch: STANCE[stance].crouch,
    };
  });
}

function minMargin(players, exceptId) {
  const { results } = evaluate(byZoneOf(players));
  return Math.min(...results.filter((r) => r.c.id !== exceptId).map((r) => r.margin));
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
    if (next.every(inBounds) && noCollisions(next) && minMargin(next) >= safe) return next;
  }
  return clone(players);
}

// Sposta un giocatore della coppia in modo che il margine della relazione diventi `target`.
function shiftForMargin(players, cons, target, safe) {
  const zones = [cons.a, cons.b];
  for (let attempt = 0; attempt < 40; attempt++) {
    const zone = pick(zones);
    const next = clone(players);
    const bz = byZoneOf(next);
    const A = bz[cons.a], B = bz[cons.b];
    const m = constraintMargin(cons, A, B);
    const delta = m - target;
    const P = bz[zone];
    if (cons.kind === 'fb') {
      if (zone === cons.b) P.d -= delta; else P.d += delta;
      P.w += rand(-0.35, 0.35);
    } else {
      if (zone === cons.a) P.w += delta; else P.w -= delta;
      P.d += rand(-0.35, 0.35);
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

// Peso: le relazioni già "strette" nella formazione sono quelle in cui i falli capitano davvero.
function constraintWeights(players) {
  const { results } = evaluate(byZoneOf(players));
  return (c) => Math.exp(-Math.max(0, results.find((r) => r.c.id === c.id).margin) / 1.1) + 0.02;
}

function makeFault(players, diff) {
  const weight = constraintWeights(players);
  for (let attempt = 0; attempt < 30; attempt++) {
    const cons = weightedPick(CONSTRAINTS, weight);
    const target = -rand(diff.fault[0], diff.fault[1]);
    const out = shiftForMargin(players, cons, target, 0.2);
    if (out) return { players: out.players, kind: 'fault', focus: cons.id };
  }
  return null;
}

// Due giocatori "corrispondenti" si scambiano il posto (es. si sono messi come nella rotazione sbagliata).
function makeSwap(players) {
  const weight = constraintWeights(players);
  for (let attempt = 0; attempt < 20; attempt++) {
    const cons = weightedPick(CONSTRAINTS, weight);
    const next = clone(players);
    const bz = byZoneOf(next);
    const A = bz[cons.a], B = bz[cons.b];
    for (const k of ['d', 'w', 'theta', 'stance', 'sw', 'crouch', 'stagger']) [A[k], B[k]] = [B[k], A[k]];
    const res = evaluate(byZoneOf(next));
    if (!res.legal) return { players: next, kind: 'swap', focus: cons.id };
  }
  return null;
}

function makeClose(players) {
  const weight = constraintWeights(players);
  for (let attempt = 0; attempt < 30; attempt++) {
    const cons = weightedPick(CONSTRAINTS, weight);
    const out = shiftForMargin(players, cons, rand(0.04, 0.16), 0.2);
    if (out) return { players: out.players, kind: 'close', focus: cons.id };
  }
  return null;
}

export function makeScenario(rot, team, opts = {}) {
  const diff = DIFFICULTY[opts.difficulty || 'medio'];
  const faultProb = opts.faultProb ?? diff.faultProb;
  let players = jitter(baseFormation(rot, team, opts), diff.jitter);
  let result = null;
  if (opts.forceKind === 'legal') result = null;
  else if (opts.forceKind === 'fault' || Math.random() < faultProb) {
    result = (Math.random() < diff.swap ? makeSwap(players) : null) || makeFault(players, diff);
  } else if (Math.random() < diff.close) {
    result = makeClose(players);
  }
  if (result) players = result.players;
  const evaluation = evaluate(byZoneOf(players));
  return {
    rotation: rot,
    players,
    kind: result ? result.kind : 'legal',
    focus: result?.focus ?? null,
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
export function scenarioFrom(rot, players, kind = 'custom') {
  const evaluation = evaluate(byZoneOf(players));
  return { rotation: rot, players, kind, focus: null, evaluation, fault: !evaluation.legal };
}

export function reevaluate(scenario) {
  scenario.evaluation = evaluate(byZoneOf(scenario.players));
  scenario.fault = !scenario.evaluation.legal;
  return scenario;
}

// Porta il margine di una relazione a `margin` (negativo = fallo) spostando uno dei due giocatori.
export function withConstraintMargin(players, consId, margin) {
  const cons = CONSTRAINTS.find((c) => c.id === consId);
  for (let i = 0; i < 10; i++) {
    const out = shiftForMargin(players, cons, margin, 0.15);
    if (out) return out.players;
  }
  return players;
}

export function swapZones(players, za, zb) {
  const next = clone(players);
  const bz = byZoneOf(next);
  for (const k of ['d', 'w', 'theta', 'stance', 'sw', 'crouch', 'stagger']) [bz[za][k], bz[zb][k]] = [bz[zb][k], bz[za][k]];
  return next;
}

// Giocatori al centro delle zone (per spiegare numerazione e rotazione).
export function zoneCenterFormation(rot, team, opts = {}) {
  return baseFormation(rot, team, opts).map((p) => {
    const c = { 4: [1.6, 1.5], 3: [1.6, 4.5], 2: [1.6, 7.5], 5: [6.2, 1.5], 6: [6.2, 4.5], 1: [6.2, 7.5] }[p.zone];
    return { ...p, d: c[0], w: c[1], theta: 0, stagger: 0, stance: 'stand', sw: 0.16, crouch: 0.15 };
  });
}
