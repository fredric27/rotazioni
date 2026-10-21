// Verifiche delle regole, delle formazioni e del generatore di scenari: node tests/rules.test.mjs
import assert from 'node:assert/strict';
import { rotationZones, rotationZonesWithLibero, evaluate, CONSTRAINTS } from '../js/rules.js';
import { baseFormation, makeScenario, byZoneOf, COMMON_FAULTS, OPP_FAULTS, OPP_ROTATIONS, withConstraintMargin } from '../js/formations.js';

const team = { numbers: { P: 5, S1: 7, C2: 12, O: 9, S2: 3, C1: 14, L: 1 } };

assert.deepEqual(rotationZones(1), { 1: 'P', 2: 'S1', 3: 'C2', 4: 'O', 5: 'S2', 6: 'C1' });
assert.deepEqual(rotationZones(6), { 6: 'P', 1: 'S1', 2: 'C2', 3: 'O', 4: 'S2', 5: 'C1' });
assert.deepEqual(rotationZones(4), { 1: 'O', 2: 'S2', 3: 'C1', 4: 'P', 5: 'S1', 6: 'C2' });

// Formazioni di base (standard e con l'opposto in ricezione): regolari con margine.
for (const rot of [1, 2, 3, 4, 5, 6]) {
  assert.equal(rotationZones(rot)[rot], 'P', `P${rot}`);
  const { zones } = rotationZonesWithLibero(rot);
  assert.equal(Object.values(zones).filter((r) => r === 'L').length, 1);
  const variants = OPP_ROTATIONS.includes(rot) ? [null, 'opp'] : [null];
  for (const variant of variants) for (const libero of [true, false]) {
    const ev = evaluate(byZoneOf(baseFormation(rot, team, { libero, variant })));
    const tag = `P${rot}${variant ? ' opp' : ''} libero=${libero}`;
    assert.ok(ev.legal, `${tag}: ${ev.violations.map((v) => v.c.id)}`);
    const min = Math.min(...ev.results.map((r) => r.margin));
    assert.ok(min > 0.3, `${tag}: margine minimo ${min.toFixed(2)}`);
  }
}

// P4 standard: lo schiacciatore di zona 2 riceve a sinistra, ma a destra del centrale (come in VBRotations).
{
  const bz = byZoneOf(baseFormation(4, team));
  assert.equal(bz[2].role, 'S2');
  assert.ok(bz[2].w < 3 && bz[2].w > bz[3].w);
  assert.ok(bz[4].w < bz[3].w && bz[4].d < 1);
}

// Fallo costruito a mano: zona 1 davanti a zona 2 → fallo 2-1.
{
  const bz = byZoneOf(baseFormation(1, team));
  bz[1].d = bz[2].d - 0.5;
  assert.deepEqual(evaluate(bz).violations.map((v) => v.c.id), ['2-1']);
}

// Ogni fallo del catalogo è realizzabile spostando i giocatori indicati.
for (const [catalog, variant] of [[COMMON_FAULTS, null], [OPP_FAULTS, 'opp']]) {
  for (const [rot, list] of Object.entries(catalog)) for (const f of list) {
    const base = baseFormation(Number(rot), team, { variant });
    const out = withConstraintMargin(base, f.c, -0.4, f.move);
    const ev = evaluate(byZoneOf(out));
    assert.deepEqual(ev.violations.map((v) => v.c.id), [f.c], `P${rot}${variant ? ' opp' : ''} ${f.c}`);
    assert.ok(CONSTRAINTS.some((c) => c.id === f.c));
  }
}

const stats = {};
for (const difficulty of ['facile', 'medio', 'difficile']) {
  for (let i = 0; i < 600; i++) {
    const rot = 1 + (i % 6);
    const s = makeScenario(rot, team, { difficulty, variant: i % 2 ? "opp" : null, swapProb: 0.15, wrongRotProb: 0.1 });
    const k = `${difficulty}:${s.kind}`;
    stats[k] = (stats[k] || 0) + 1;
    assert.equal(s.fault, !s.evaluation.legal);
    if (['fault', 'swap', 'wrongrot'].includes(s.kind)) assert.ok(s.fault && s.label, `${k} P${rot}`);
    if (s.kind === 'fault') assert.equal(s.evaluation.violations.length, 1);
    if (s.kind === 'legal' || s.kind === 'close') assert.ok(s.evaluation.legal);
    for (const p of s.players) assert.ok(p.d > 0 && p.d < 9 && p.w > 0 && p.w < 9);
  }
}
console.log(stats);
console.log('ok');
