// Suoni sintetizzati: fischietto, colpo di servizio, esito.
let ctx = null;
let enabled = true;

export function setSound(on) { enabled = on; }

function ac() {
  if (!enabled) return null;
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
  }
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

function noiseBuffer(c, seconds) {
  const buf = c.createBuffer(1, Math.ceil(c.sampleRate * seconds), c.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  return buf;
}

// Fischietto "a pallina": portante ~3 kHz con trillo rapido.
export function whistle(duration = 0.45, { pitch = 2950, trill = 34 } = {}) {
  const c = ac();
  if (!c) return;
  const t0 = c.currentTime + 0.01;
  const out = c.createGain();
  out.gain.setValueAtTime(0, t0);
  out.gain.linearRampToValueAtTime(0.22, t0 + 0.02);
  out.gain.setValueAtTime(0.22, t0 + duration - 0.06);
  out.gain.linearRampToValueAtTime(0, t0 + duration);
  out.connect(c.destination);

  const osc = c.createOscillator();
  osc.type = 'triangle';
  osc.frequency.value = pitch;
  const lfo = c.createOscillator();
  lfo.frequency.value = trill;
  const lfoGain = c.createGain();
  lfoGain.gain.value = 140;
  lfo.connect(lfoGain).connect(osc.frequency);

  const am = c.createGain();
  am.gain.value = 0.75;
  const amLfo = c.createGain();
  amLfo.gain.value = 0.25;
  lfo.connect(amLfo).connect(am.gain);
  osc.connect(am).connect(out);

  const n = c.createBufferSource();
  n.buffer = noiseBuffer(c, duration);
  const bp = c.createBiquadFilter();
  bp.type = 'bandpass';
  bp.frequency.value = pitch;
  bp.Q.value = 4;
  const ng = c.createGain();
  ng.gain.value = 0.35;
  n.connect(bp).connect(ng).connect(out);

  for (const s of [osc, lfo, n]) { s.start(t0); s.stop(t0 + duration + 0.02); }
}

export function ballHit() {
  const c = ac();
  if (!c) return;
  const t0 = c.currentTime + 0.005;
  const n = c.createBufferSource();
  n.buffer = noiseBuffer(c, 0.12);
  const lp = c.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.value = 1400;
  const g = c.createGain();
  g.gain.setValueAtTime(0.6, t0);
  g.gain.exponentialRampToValueAtTime(0.001, t0 + 0.1);
  n.connect(lp).connect(g).connect(c.destination);
  const o = c.createOscillator();
  o.frequency.setValueAtTime(190, t0);
  o.frequency.exponentialRampToValueAtTime(70, t0 + 0.09);
  const og = c.createGain();
  og.gain.setValueAtTime(0.5, t0);
  og.gain.exponentialRampToValueAtTime(0.001, t0 + 0.12);
  o.connect(og).connect(c.destination);
  n.start(t0); o.start(t0); o.stop(t0 + 0.14);
}

export function chime(good) {
  const c = ac();
  if (!c) return;
  const t0 = c.currentTime + 0.01;
  const notes = good ? [784, 1175] : [220, 185];
  notes.forEach((f, i) => {
    const o = c.createOscillator();
    o.type = good ? 'sine' : 'square';
    o.frequency.value = f;
    const g = c.createGain();
    const s = t0 + i * 0.11;
    g.gain.setValueAtTime(0, s);
    g.gain.linearRampToValueAtTime(good ? 0.16 : 0.06, s + 0.015);
    g.gain.exponentialRampToValueAtTime(0.001, s + 0.32);
    o.connect(g).connect(c.destination);
    o.start(s); o.stop(s + 0.34);
  });
}
