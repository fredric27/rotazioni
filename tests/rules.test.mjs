// Verifiche delle regole e del generatore di scenari: node tests/rules.test.mjs
import assert from 'node:assert/strict';
import { rotationZones, rotationZonesWithLibero, evaluate } from '../js/rules.js';
import { baseFormation, makeScenario, byZoneOf } from '../js/formations.js';

const team = { numbers: { P: 5, S1: 7, C2: 12, O: 9, S2: 3, C1: 14, L: 1 } };

assert.deepEqual(rotationZones(1), { 1: 'P', 2: 'S1', 3: 'C2', 4: 'O', 5: 'S2', 6: 'C1' });
assert.deepEqual(rotationZones(6), { 6: 'P', 1: 'S1', 2: 'C2', 3: 'O', 4: 'S2', 5: 'C1' });
assert.equal(rotationZones(4)[4], 'P');
for (const rot of [1, 2, 3, 4, 5, 6]) {
  assert.equal(rotationZones(rot)[rot], 'P', `P${rot}`);
  const { zones } = rotationZonesWithLibero(rot);
  assert.equal(Object.values(zones).filter((r) => r === 'L').length, 1);
  for (const libero of [true, false]) {
    const ev = evaluate(byZoneOf(baseFormation(rot, team, { libero })));
    assert.ok(ev.legal, `formazione base P${rot} libero=${libero}: ${ev.violations.map((v) => v.c.id)}`);
    const min = Math.min(...ev.results.map((r) => r.margin));
    assert.ok(min > 0.4, `margine P${rot} = ${min.toFixed(2)}`);
  }
}

// Un caso costruito a mano: zona 1 davanti a zona 2 → fallo 2-1.
const pl = baseFormation(1, team);
const bz = byZoneOf(pl);
bz[1].d = bz[2].d - 0.5;
assert.deepEqual(evaluate(bz).violations.map((v) => v.c.id), ['2-1']);

const stats = {};
for (const difficulty of ['facile', 'medio', 'difficile']) {
  for (let i = 0; i < 600; i++) {
    const rot = 1 + (i % 6);
    const s = makeScenario(rot, team, { difficulty });
    const k = `${difficulty}:${s.kind}`;
    stats[k] = (stats[k] || 0) + 1;
    assert.equal(s.fault, !s.evaluation.legal);
    if (s.kind === 'fault') assert.equal(s.evaluation.violations.length, 1);
    if (s.kind === 'legal' || s.kind === 'close') assert.ok(s.evaluation.legal);
    for (const p of s.players) assert.ok(p.d > 0 && p.d < 9 && p.w > 0 && p.w < 9);
  }
}
console.log(stats);
console.log('ok');
