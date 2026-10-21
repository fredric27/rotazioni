// Schemi 2D (SVG): campo visto dall'alto e scheda della formazione.
import { toWorld } from './arena.js';
import { ROLES } from './rules.js';

// Trasformazione mondo/squadra -> piano dello schema.
// 'r1' e 'r2': come li vede l'arbitro (lui è in basso). 'team': rete in alto, sinistra della squadra a sinistra.
// Il 1° arbitro guarda verso +Z (la sua destra è -X), il 2° verso -Z (la sua destra è +X).
function projector(orientation, side) {
  if (orientation === 'team') return (d, w) => ({ u: w, v: d });
  return (d, w) => {
    const { x, z } = toWorld(side, d, w);
    return orientation === 'r2' ? { u: x, v: z } : { u: -x, v: -z };
  };
}

function bbox(points, pad) {
  const us = points.map((p) => p.u), vs = points.map((p) => p.v);
  const minU = Math.min(...us) - pad, minV = Math.min(...vs) - pad;
  return { minU, minV, w: Math.max(...us) - minU + pad, h: Math.max(...vs) - minV + pad };
}

const esc = (s) => String(s).replace(/[<>&"]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;' }[c]));

// Mezzo campo della squadra in ricezione con giocatori, relazioni e (opzionale) zone.
export function courtSVG({ players, side, orientation = 'r1', results = [], showZones = false, labels = 'num', team, highlight = [] }) {
  const P = projector(orientation, side);
  const corners = [P(0, 0), P(0, 9), P(9, 0), P(9, 9)];
  const b = bbox(corners, 0.9);
  const line = (d0, w0, d1, w1, cls, extra = '') => {
    const a = P(d0, w0), c = P(d1, w1);
    return `<line x1="${a.u}" y1="${a.v}" x2="${c.u}" y2="${c.v}" class="${cls}" ${extra}/>`;
  };
  let s = `<svg viewBox="${b.minU} ${b.minV} ${b.w} ${b.h}" class="court-svg" xmlns="http://www.w3.org/2000/svg">`;
  const poly = corners.length && [P(0, 0), P(0, 9), P(9, 9), P(9, 0)].map((p) => `${p.u},${p.v}`).join(' ');
  s += `<polygon points="${poly}" class="cs-court"/>`;
  if (showZones) {
    s += line(3, 0, 3, 9, 'cs-zone') + line(0, 3, 9, 3, 'cs-zone') + line(0, 6, 9, 6, 'cs-zone');
    for (const [z, d, w] of [[4, 1.5, 1.5], [3, 1.5, 4.5], [2, 1.5, 7.5], [5, 6, 1.5], [6, 6, 4.5], [1, 6, 7.5]]) {
      const p = P(d, w);
      s += `<text x="${p.u}" y="${p.v}" class="cs-zonenum">${z}</text>`;
    }
  } else {
    s += line(3, 0, 3, 9, 'cs-line');
  }
  s += line(0, -0.6, 0, 9.6, 'cs-net');
  const netLabel = P(-0.45, 4.5);
  s += `<text x="${netLabel.u}" y="${netLabel.v}" class="cs-netlabel">RETE</text>`;
  // relazioni
  for (const r of results) {
    const a = P(r.A.d, r.A.w), c = P(r.B.d, r.B.w);
    const cls = r.ok ? (r.margin < 0.25 ? 'cs-rel warn' : 'cs-rel ok') : 'cs-rel bad';
    s += `<line x1="${a.u}" y1="${a.v}" x2="${c.u}" y2="${c.v}" class="${cls} ${r.c.kind}"/>`;
  }
  for (const p of players) {
    const q = P(p.d, p.w);
    const kit = p.isLibero ? team?.liberoKit : team?.kit;
    const hl = highlight.includes(p.zone) ? ' hl' : '';
    s += `<g class="cs-player${hl}" transform="translate(${q.u} ${q.v})">`;
    s += `<circle r="0.42" fill="${kit?.main ?? '#fff'}" stroke="${kit?.trim ?? '#000'}"/>`;
    const txt = labels === 'role' ? ROLES[p.role].short : labels === 'zone' ? p.zone : p.num;
    s += `<text class="cs-pnum" fill="${kit?.num ?? '#000'}">${esc(txt)}</text>`;
    if (labels === 'full') s += `<text class="cs-psub" y="0.78">${esc(ROLES[p.role].short)} · Z${p.zone}</text>`;
    s += '</g>';
  }
  if (orientation !== 'team') {
    const ref = { u: b.minU + b.w / 2, v: b.minV + b.h - 0.15 };
    s += `<text x="${ref.u}" y="${ref.v}" class="cs-ref">▲ ${orientation === 'r1' ? '1° arbitro' : '2° arbitro'}</text>`;
  }
  return s + '</svg>';
}

// Scheda della formazione: numero di maglia per ogni zona, orientata come lo schema.
export function lineupSVG({ team, zonesRoles, side, orientation = 'r1', showRoles = false, markSetter = false }) {
  const P = projector(orientation, side);
  const cells = { 4: [1.5, 1.5], 3: [1.5, 4.5], 2: [1.5, 7.5], 5: [4.5, 1.5], 6: [4.5, 4.5], 1: [4.5, 7.5] };
  const pts = Object.values(cells).map(([d, w]) => P(d, w));
  const b = bbox(pts, 1.75);
  let s = `<svg viewBox="${b.minU} ${b.minV} ${b.w} ${b.h}" class="lineup-svg" xmlns="http://www.w3.org/2000/svg">`;
  // lato rete
  const n0 = P(0, -0.1), n1 = P(0, 9.1);
  s += `<line x1="${n0.u}" y1="${n0.v}" x2="${n1.u}" y2="${n1.v}" class="ls-net"/>`;
  for (const [zone, [d, w]] of Object.entries(cells)) {
    const p = P(d, w);
    const role = zonesRoles[zone];
    const kit = role === 'L' ? team.liberoKit : team.kit;
    s += `<g transform="translate(${p.u} ${p.v})">`;
    s += `<rect x="-1.38" y="-1.38" width="2.76" height="2.76" rx="0.35" class="ls-cell"/>`;
    s += `<text class="ls-zone" x="-1.12" y="-0.88">${zone}</text>`;
    if (markSetter && role === 'P') s += '<circle r="1.18" class="ls-setter"/>';
    s += `<circle r="0.95" fill="${kit.main}" stroke="${kit.trim}" stroke-width="0.12"/>`;
    s += `<text class="ls-num" fill="${kit.num}">${team.numbers[role]}</text>`;
    if (showRoles) s += `<text class="ls-role" y="1.12">${ROLES[role].short}</text>`;
    s += '</g>';
  }
  return s + '</svg>';
}
