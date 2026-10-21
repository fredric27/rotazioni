// Squadre: colori delle maglie, numeri, aspetto dei giocatori.

export const KITS = [
  { id: 'blu', name: 'Blu', main: '#1d4fb8', trim: '#0e2a66', num: '#ffffff', shorts: '#0e2a66' },
  { id: 'rosso', name: 'Rosso', main: '#c8202f', trim: '#7a0f19', num: '#ffffff', shorts: '#1b1b1f' },
  { id: 'giallo', name: 'Giallo', main: '#f4c20d', trim: '#1b2a55', num: '#1b2a55', shorts: '#1b2a55' },
  { id: 'verde', name: 'Verde', main: '#14864a', trim: '#0a4426', num: '#ffffff', shorts: '#ffffff' },
  { id: 'bianco', name: 'Bianco', main: '#f1f1ee', trim: '#1f3a8a', num: '#1f3a8a', shorts: '#1f3a8a' },
  { id: 'nero', name: 'Nero', main: '#1d1d22', trim: '#e2b100', num: '#e2b100', shorts: '#1d1d22' },
  { id: 'arancio', name: 'Arancio', main: '#ec6a12', trim: '#3a1d06', num: '#ffffff', shorts: '#2a2a2a' },
  { id: 'viola', name: 'Viola', main: '#6b2fa3', trim: '#2e1150', num: '#ffffff', shorts: '#2e1150' },
  { id: 'azzurro', name: 'Azzurro', main: '#2fa4e7', trim: '#0d4a75', num: '#ffffff', shorts: '#ffffff' },
  { id: 'granata', name: 'Granata', main: '#7c1d2e', trim: '#d9b26a', num: '#f6e7c8', shorts: '#7c1d2e' },
];

const TEAM_NAMES = ['Lupi', 'Falchi', 'Delfini', 'Aquile', 'Squali', 'Tigri', 'Volpi', 'Orsi', 'Lampi', 'Comete'];
const SKINS = ['#f1c9a8', '#e6b08c', '#cf9670', '#b27850', '#8a5636', '#5e3a24'];
const HAIRS = ['#1d140f', '#2f1f14', '#4a3020', '#6b4a2a', '#a07a46', '#d1b072', '#121212'];

const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const kit = (id) => KITS.find((k) => k.id === id) || KITS[0];

// Due colori ben distinguibili (luminanza diversa o tinta diversa).
const CLASHES = new Set(['blu|viola', 'rosso|granata', 'rosso|arancio', 'blu|azzurro', 'nero|viola', 'nero|granata', 'giallo|arancio']);
const clash = (a, b) => a === b || CLASHES.has(`${a}|${b}`) || CLASHES.has(`${b}|${a}`);

export function pickKits(pref = {}) {
  let a = pref.home && pref.home !== 'auto' ? pref.home : pick(KITS).id;
  let b = pref.away && pref.away !== 'auto' ? pref.away : null;
  while (!b || clash(a, b)) b = pick(KITS).id;
  let l = pref.libero && pref.libero !== 'auto' ? pref.libero : null;
  // Il libero di ciascuna squadra veste un colore diverso dai compagni e dagli avversari.
  const liberoFor = (own) => {
    if (l && !clash(l, own)) return l;
    let x;
    do x = pick(KITS).id; while (clash(x, a) || clash(x, b));
    return x;
  };
  return { home: a, away: b, liberoHome: liberoFor(a), liberoAway: liberoFor(b) };
}

function numbers() {
  const pool = [];
  for (let i = 1; i <= 20; i++) pool.push(i);
  for (let i = 0; i < 4; i++) pool.push(21 + Math.floor(Math.random() * 78));
  const out = [];
  while (out.length < 7) {
    const n = pool.splice(Math.floor(Math.random() * pool.length), 1)[0];
    if (!out.includes(n)) out.push(n);
  }
  return out;
}

export function makeTeam(kitId, liberoKitId, { female = false, usedName } = {}) {
  const [P, S1, C2, O, S2, C1, L] = numbers();
  let name;
  do name = pick(TEAM_NAMES); while (name === usedName);
  const look = {};
  const baseH = female ? 1.8 : 1.94;
  const heights = { P: -0.06, S1: 0, S2: 0.01, O: 0.04, C1: 0.08, C2: 0.07, L: -0.13 };
  for (const role of ['P', 'S1', 'C2', 'O', 'S2', 'C1', 'L']) {
    look[role] = {
      height: baseH + heights[role] + (Math.random() - 0.5) * 0.08,
      skin: pick(SKINS),
      hair: pick(HAIRS),
      female,
    };
  }
  return { name, kit: kit(kitId), liberoKit: kit(liberoKitId), numbers: { P, S1, C2, O, S2, C1, L }, look, female };
}

export function makeTeams(settings) {
  const female = settings.gender === 'F';
  const k = pickKits({ home: settings.kitHome, away: settings.kitAway, libero: settings.kitLibero });
  const A = makeTeam(k.home, k.liberoHome, { female });
  const B = makeTeam(k.away, k.liberoAway, { female, usedName: A.name });
  return [A, B];
}
