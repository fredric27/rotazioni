// Regole di posizione della squadra in ricezione
// (Regole di Gioco FIVB 2025-2028, regola 7.4 e 7.5).
//
// Coordinate "di squadra": d = distanza dalla linea centrale (0..9 m),
// w = distanza dalla linea laterale SINISTRA della squadra (0..9 m),
// sinistra/destra intese guardando la rete dal proprio campo.

export const ROLES = {
  P: { name: 'Palleggiatore', short: 'P' },
  O: { name: 'Opposto', short: 'O' },
  S1: { name: 'Schiacciatore 1', short: 'S1' },
  S2: { name: 'Schiacciatore 2', short: 'S2' },
  C1: { name: 'Centrale 1', short: 'C1' },
  C2: { name: 'Centrale 2', short: 'C2' },
  L: { name: 'Libero', short: 'L' },
};

// Ordine di rotazione del sistema 5-1: posizioni I..VI quando il palleggiatore è in zona 1.
export const ORDER = ['P', 'S1', 'C2', 'O', 'S2', 'C1'];

// Ordine in cui le rotazioni si susseguono durante la partita.
export const ROTATION_SEQUENCE = [1, 6, 5, 4, 3, 2];

export const ZONES = {
  1: { row: 'back', side: 'right', label: 'seconda linea, destra' },
  2: { row: 'front', side: 'right', label: 'prima linea, destra' },
  3: { row: 'front', side: 'center', label: 'prima linea, centro' },
  4: { row: 'front', side: 'left', label: 'prima linea, sinistra' },
  5: { row: 'back', side: 'left', label: 'seconda linea, sinistra' },
  6: { row: 'back', side: 'center', label: 'seconda linea, centro' },
};

export const BACK_ZONES = [1, 5, 6];
export const FRONT_ZONES = [2, 3, 4];

// Centro "convenzionale" di ogni zona (solo per disegni: le zone NON sono posti obbligati).
export const ZONE_CENTER = {
  4: { d: 1.5, w: 1.5 }, 3: { d: 1.5, w: 4.5 }, 2: { d: 1.5, w: 7.5 },
  5: { d: 6, w: 1.5 }, 6: { d: 6, w: 4.5 }, 1: { d: 6, w: 7.5 },
};

// Le 7 relazioni da controllare. kind 'fb' = avanti/dietro, 'lr' = sinistra/destra.
// fb: a = giocatore di prima linea, b = corrispondente di seconda linea.
// lr: a = giocatore più a sinistra, b = più a destra; `side` indica quale dei due è il laterale.
export const CONSTRAINTS = [
  { id: '4-5', kind: 'fb', a: 4, b: 5 },
  { id: '3-6', kind: 'fb', a: 3, b: 6 },
  { id: '2-1', kind: 'fb', a: 2, b: 1 },
  { id: '4-3', kind: 'lr', a: 4, b: 3, side: 'left' },
  { id: '3-2', kind: 'lr', a: 3, b: 2, side: 'right' },
  { id: '5-6', kind: 'lr', a: 5, b: 6, side: 'left' },
  { id: '6-1', kind: 'lr', a: 6, b: 1, side: 'right' },
];

// Coppie "in diagonale": nessun vincolo tra loro, ma spesso ingannano.
export const FREE_PAIRS = [[4, 6], [4, 1], [3, 5], [3, 1], [2, 6], [2, 5]];

// Zona -> ruolo per la rotazione "P<rot>" (palleggiatore in zona rot).
export function rotationZones(rot) {
  const r = (1 - rot + 6) % 6;
  const out = {};
  ORDER.forEach((role, i) => { out[(((i - r) % 6) + 6) % 6 + 1] = role; });
  return out;
}

// Come rotationZones, ma con il libero al posto del centrale di seconda linea.
export function rotationZonesWithLibero(rot, libero = true) {
  const z = rotationZones(rot);
  const replaced = BACK_ZONES.map((k) => z[k]).find((r) => r[0] === 'C');
  if (libero) for (const k of BACK_ZONES) if (z[k] === replaced) z[k] = 'L';
  return { zones: z, replaced };
}

// Rettangoli dei piedi (4 vertici ciascuno) in coordinate di squadra.
// theta = 0: il giocatore guarda la rete; theta > 0 ruota verso destra.
export const FOOT = { back: 0.07, front: 0.19, half: 0.05 };
export function feetOf(p) {
  const f = [-Math.cos(p.theta || 0), Math.sin(p.theta || 0)];
  const r = [Math.sin(p.theta || 0), Math.cos(p.theta || 0)];
  const sw = p.sw ?? 0.2;
  const st = p.stagger || 0;
  const feet = [];
  for (const side of [-1, 1]) { // -1 sinistro, +1 destro
    const fwd = side < 0 ? st / 2 : -st / 2;
    const ad = p.d + r[0] * sw * side + f[0] * fwd;
    const aw = p.w + r[1] * sw * side + f[1] * fwd;
    const corners = [];
    for (const [lf, lr] of [[-FOOT.back, -FOOT.half], [-FOOT.back, FOOT.half], [FOOT.front, FOOT.half], [FOOT.front, -FOOT.half]]) {
      corners.push({ d: ad + f[0] * lf + r[0] * lr, w: aw + f[1] * lf + r[1] * lr });
    }
    feet.push(corners);
  }
  return feet;
}

export function extents(p) {
  let minD = Infinity, minW = Infinity, maxW = -Infinity;
  for (const foot of feetOf(p)) for (const c of foot) {
    if (c.d < minD) minD = c.d;
    if (c.w < minW) minW = c.w;
    if (c.w > maxW) maxW = c.w;
  }
  return { minD, minW, maxW };
}

// Margine (metri) con cui la relazione è rispettata: > 0 regolare, <= 0 fallo.
export function constraintMargin(c, A, B) {
  const ea = extents(A), eb = extents(B);
  if (c.kind === 'fb') return eb.minD - ea.minD; // il piede più avanzato del prima linea deve essere più vicino alla rete
  if (c.side === 'left') return eb.minW - ea.minW; // il laterale sinistro deve avere un piede più vicino alla linea laterale sinistra
  return eb.maxW - ea.maxW; // il laterale destro deve avere un piede più vicino alla linea laterale destra
}

// byZone: { 1: player, 2: player, ... }
export function evaluate(byZone) {
  const results = CONSTRAINTS.map((c) => {
    const A = byZone[c.a], B = byZone[c.b];
    const margin = constraintMargin(c, A, B);
    return { c, A, B, margin, ok: margin > 0 };
  });
  const violations = results.filter((r) => !r.ok);
  return { legal: violations.length === 0, results, violations };
}

export const roleName = (role) => ROLES[role]?.name ?? role;
const who = (p) => `<b>n°${p.num}</b> (${roleName(p.role)}, zona ${p.zone})`;

export function describeViolation(v) {
  const { c, A, B } = v;
  if (c.kind === 'fb') {
    return `${who(B)} è in seconda linea ma è più vicino alla rete di ${who(A)}, il suo corrispondente di prima linea: deve stare più lontano dalla linea centrale.`;
  }
  if (c.side === 'left') {
    return `${who(A)} deve avere un piede più vicino alla linea laterale <b>sinistra</b> di entrambi i piedi di ${who(B)}, invece è più a destra di lui.`;
  }
  return `${who(B)} deve avere un piede più vicino alla linea laterale <b>destra</b> di entrambi i piedi di ${who(A)}, invece è più a sinistra di lui.`;
}

export function describeConstraint(c) {
  if (c.kind === 'fb') return `zona ${c.b} più lontana dalla rete di zona ${c.a}`;
  return `zona ${c.a} più a sinistra di zona ${c.b}`;
}

// Coppie in diagonale che "sembrano" un fallo (utile per spiegare le trappole).
export function misleadingPairs(byZone) {
  const out = [];
  for (const [fz, bz] of FREE_PAIRS) {
    const F = byZone[fz], B = byZone[bz];
    const front = FRONT_ZONES.includes(fz) ? F : B;
    const back = front === F ? B : F;
    const gap = extents(front).minD - extents(back).minD;
    if (gap > 0.6) out.push({ front, back, gap });
  }
  return out.sort((a, b) => b.gap - a.gap);
}
