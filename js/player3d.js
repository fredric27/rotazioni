// Giocatore 3D stilizzato: scheletro semplice (IK a due ossa) e mesh primitive.
// Spazio locale: Y in alto, il giocatore guarda verso +Z, la sua sinistra è +X.
import * as THREE from 'three';

const UP = new THREE.Vector3(0, 1, 0);
const unitCyl = new THREE.CylinderGeometry(1, 1, 1, 12, 1);
const sphere = new THREE.SphereGeometry(1, 18, 14);
const hairGeo = new THREE.SphereGeometry(1, 20, 10, 0, Math.PI * 2, 0, Math.PI * 0.6);
// scarpa arrotondata (capsula allungata lungo Z) e suola più larga e bassa
const shoeGeo = new THREE.CapsuleGeometry(0.047, 0.17, 4, 12);
shoeGeo.rotateX(Math.PI / 2);
shoeGeo.scale(1, 0.78, 1);
shoeGeo.translate(0, 0, 0.06);
const soleGeo = new THREE.CapsuleGeometry(0.051, 0.17, 2, 12);
soleGeo.rotateX(Math.PI / 2);
soleGeo.scale(1, 0.3, 1);
soleGeo.translate(0, 0, 0.06);
const torsoGeo = new THREE.CylinderGeometry(0.2, 0.165, 1, 24, 1, false, Math.PI / 2);
const pelvisGeo = new THREE.CylinderGeometry(0.175, 0.19, 1, 18, 1);

let shadowTex = null;
function blobShadow() {
  if (!shadowTex) {
    const c = document.createElement('canvas');
    c.width = c.height = 64;
    const g = c.getContext('2d');
    const grd = g.createRadialGradient(32, 32, 2, 32, 32, 31);
    grd.addColorStop(0, 'rgba(0,0,0,0.55)');
    grd.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = grd;
    g.fillRect(0, 0, 64, 64);
    shadowTex = new THREE.CanvasTexture(c);
  }
  const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: shadowTex, transparent: true, depthWrite: false }));
  m.rotation.x = -Math.PI / 2;
  m.position.y = 0.012;
  m.renderOrder = 1;
  return m;
}

// Maglia "srotolata" sul cilindro del busto: u = 0.25 schiena, u = 0.75 petto, u = 0 e 0.5 i fianchi.
// Canvas 1024×512 ≈ 1 m × 0.6 m: numeri di circa 16 cm dietro e 12 cm davanti, come quelli veri.
function jerseyTexture(kit, number) {
  const W = 1024, H = 512;
  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  const g = c.getContext('2d');
  g.fillStyle = kit.main;
  g.fillRect(0, 0, W, H);
  // fasce laterali sottili e colletto con scollo a V sul davanti
  g.fillStyle = kit.trim;
  for (const x of [0, W / 2, W]) g.fillRect(x - 14, 40, 28, H - 40);
  g.fillRect(0, 0, W, 26);
  g.beginPath();
  g.moveTo(W * 0.75 - 46, 0); g.lineTo(W * 0.75, 70); g.lineTo(W * 0.75 + 46, 0);
  g.fill();
  g.fillStyle = kit.main;
  g.beginPath();
  g.moveTo(W * 0.75 - 26, 0); g.lineTo(W * 0.75, 44); g.lineTo(W * 0.75 + 26, 0);
  g.fill();
  if (String(number)) {
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.lineJoin = 'round';
    const draw = (x, y, size) => {
      g.font = `800 ${size}px "Barlow Condensed", "Arial Narrow", Arial, sans-serif`;
      g.lineWidth = size * 0.07;
      g.strokeStyle = kit.trim;
      g.strokeText(String(number), x, y);
      g.fillStyle = kit.num;
      g.fillText(String(number), x, y);
    };
    draw(W * 0.25, 210, 190); // schiena
    draw(W * 0.75, 205, 138); // petto
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

// Cartellino con il solo numero, nei colori della maglia: si legge anche quando il giocatore è di profilo.
function numberTag(kit, number) {
  const c = document.createElement('canvas');
  c.width = 128; c.height = 96;
  const g = c.getContext('2d');
  g.fillStyle = kit.main;
  g.strokeStyle = kit.trim;
  g.lineWidth = 8;
  g.beginPath();
  g.roundRect(6, 6, 116, 72, 18);
  g.fill();
  g.stroke();
  g.beginPath();
  g.moveTo(52, 78); g.lineTo(64, 92); g.lineTo(76, 78);
  g.fillStyle = kit.trim;
  g.fill();
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.font = '800 58px "Barlow Condensed", "Arial Narrow", Arial, sans-serif';
  g.fillStyle = kit.num;
  g.fillText(String(number), 64, 45);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, depthTest: false, transparent: true, sizeAttenuation: false }));
  s.scale.set(0.058, 0.0435, 1);
  s.center.set(0.5, 0);
  s.renderOrder = 9;
  return s;
}

function labelSprite() {
  const c = document.createElement('canvas');
  c.width = 256; c.height = 128;
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  // dimensione fissa sullo schermo: leggibile sia per i giocatori vicini sia per quelli lontani
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, depthTest: false, transparent: true, sizeAttenuation: false }));
  s.scale.set(0.12, 0.06, 1);
  s.center.set(0.5, 0);
  s.renderOrder = 10;
  s.userData.canvas = c;
  return s;
}

function solveIK(a, target, l1, l2, pole, out) {
  const d = new THREE.Vector3().subVectors(target, a);
  let dist = d.length();
  const dir = d.clone().normalize();
  dist = Math.min(Math.max(dist, 0.02), l1 + l2 - 1e-3);
  const along = (l1 * l1 - l2 * l2 + dist * dist) / (2 * dist);
  const h = Math.sqrt(Math.max(0, l1 * l1 - along * along));
  const perp = pole.clone().sub(dir.clone().multiplyScalar(pole.dot(dir))).normalize();
  out.copy(a).addScaledVector(dir, along).addScaledVector(perp, h);
  return a.clone().addScaledVector(dir, dist);
}

const tmpA = new THREE.Vector3(), tmpB = new THREE.Vector3(), tmpQ = new THREE.Quaternion();
function placeLimb(mesh, a, b, radius, t0 = 0, t1 = 1) {
  tmpA.copy(a).lerp(b, t0);
  tmpB.copy(a).lerp(b, t1);
  const len = tmpA.distanceTo(tmpB);
  mesh.position.copy(tmpA).add(tmpB).multiplyScalar(0.5);
  mesh.scale.set(radius, Math.max(len, 1e-3), radius);
  tmpB.sub(tmpA).normalize();
  tmpQ.setFromUnitVectors(UP, tmpB);
  mesh.quaternion.copy(tmpQ);
}

const lerp = (a, b, t) => a + (b - a) * t;
const ease = (t) => t * t * (3 - 2 * t);
function angleLerp(a, b, t) {
  let d = b - a;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return a + d * t;
}

export class Player3D {
  constructor({ kit, number, look, isLibero = false }) {
    this.group = new THREE.Group();
    this.body = new THREE.Group();
    this.group.add(this.body);
    this.k = look.height / 1.95;
    this.female = look.female;
    this.number = number;
    this.isLibero = isLibero;

    const skin = new THREE.MeshStandardMaterial({ color: look.skin, roughness: 0.65 });
    const hair = new THREE.MeshStandardMaterial({ color: look.hair, roughness: 0.85 });
    const shirt = new THREE.MeshStandardMaterial({ color: kit.main, roughness: 0.75 });
    const jersey = new THREE.MeshStandardMaterial({ map: jerseyTexture(kit, number), roughness: 0.75 });
    const shorts = new THREE.MeshStandardMaterial({ color: kit.shorts, roughness: 0.8 });
    const sock = new THREE.MeshStandardMaterial({ color: '#f4f4f2', roughness: 0.9 });
    const pad = new THREE.MeshStandardMaterial({ color: '#1a1a1d', roughness: 0.9 });
    const shoe = new THREE.MeshStandardMaterial({ color: kit.id === 'nero' ? '#e8e8e8' : '#f5f5f5', roughness: 0.6 });
    const sole = new THREE.MeshStandardMaterial({ color: kit.trim, roughness: 0.6 });
    const trim = new THREE.MeshStandardMaterial({ color: kit.trim, roughness: 0.75 });
    this.materials = [skin, hair, shirt, jersey, shorts, sock, pad, shoe, sole, trim];

    const add = (geo, mat) => { const m = new THREE.Mesh(geo, mat); this.body.add(m); return m; };
    this.m = {
      torso: add(torsoGeo, jersey),
      pelvis: add(pelvisGeo, shorts),
      neck: add(unitCyl, skin),
      head: add(sphere, skin),
      hair: add(hairGeo, hair),
    };
    if (this.female) this.m.tail = add(sphere, hair);
    for (const s of ['L', 'R']) {
      this.m['thigh' + s] = add(unitCyl, skin);
      this.m['shortLeg' + s] = add(unitCyl, shorts);
      this.m['shin' + s] = add(unitCyl, skin);
      this.m['sock' + s] = add(unitCyl, sock);
      this.m['pad' + s] = add(unitCyl, pad);
      this.m['shoe' + s] = add(shoeGeo, shoe);
      this.m['sole' + s] = add(soleGeo, sole);
      this.m['upper' + s] = add(unitCyl, skin);
      this.m['sleeve' + s] = add(unitCyl, shirt);
      this.m['cuff' + s] = add(unitCyl, trim);
      this.m['fore' + s] = add(unitCyl, skin);
      this.m['hand' + s] = add(sphere, skin);
    }

    this.shadow = blobShadow();
    this.shadow.scale.set(1.0, 1.0, 1);
    this.group.add(this.shadow);

    this.ring = new THREE.Mesh(new THREE.RingGeometry(0.42, 0.52, 40), new THREE.MeshBasicMaterial({ color: '#ff3b30', transparent: true, opacity: 0.9, depthWrite: false }));
    this.ring.rotation.x = -Math.PI / 2;
    this.ring.position.y = 0.015;
    this.ring.visible = false;
    this.ring.renderOrder = 2;
    this.group.add(this.ring);

    this.label = labelSprite();
    this.label.visible = false;
    this.group.add(this.label);
    if (String(number)) {
      this.tag = numberTag(kit, number);
      this.tag.visible = false;
      this.group.add(this.tag);
    }

    // stato
    this.pos = new THREE.Vector2(0, 0); // (x, z) mondo
    this.target = new THREE.Vector2(0, 0);
    this.facing = 0;
    this.targetFacing = 0;
    this.speed = 3;
    this.crouch = 0;
    this.targetCrouch = 0;
    this.sw = 0.2;
    this.targetSw = 0.2;
    this.stagger = 0;
    this.walk = 0;
    this.phase = Math.random() * 10;
    this.idlePhase = Math.random() * 10;
    this.armPose = 'hang';
    this.serveT = -1; // >= 0 durante l'animazione di servizio
    this.joints = {};
    this.update(0, 0);
  }

  setLabel(main, sub, color = '#ffffff', bg = 'rgba(10,16,30,0.82)') {
    const c = this.label.userData.canvas;
    const g = c.getContext('2d');
    g.clearRect(0, 0, c.width, c.height);
    g.fillStyle = bg;
    const r = 26;
    g.beginPath();
    g.roundRect(8, 10, 240, 96, r);
    g.fill();
    g.beginPath();
    g.moveTo(112, 104); g.lineTo(128, 124); g.lineTo(144, 104);
    g.fill();
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillStyle = color;
    g.font = '800 54px "Barlow Condensed", "Arial Narrow", Arial, sans-serif';
    g.fillText(main, 128, sub ? 46 : 58);
    if (sub) {
      g.font = '600 30px "Barlow Condensed", "Arial Narrow", Arial, sans-serif';
      g.fillStyle = 'rgba(255,255,255,0.8)';
      g.fillText(sub, 128, 86);
    }
    this.label.material.map.needsUpdate = true;
  }

  showLabel(v) { this.label.visible = v; this.syncTag(); }
  showTag(v) { this.tagWanted = v; this.syncTag(); }
  // il cartellino col numero si nasconde quando c'è l'etichetta completa
  syncTag() { if (this.tag) this.tag.visible = !!this.tagWanted && !this.label.visible; }
  highlight(color) {
    this.ring.visible = !!color;
    if (color) this.ring.material.color.set(color);
  }

  place(x, z, facing) {
    this.pos.set(x, z);
    this.target.set(x, z);
    this.facing = this.targetFacing = facing;
    this.walk = 0;
  }

  moveTo(x, z, facing, speed = 3.2) {
    this.target.set(x, z);
    this.targetFacing = facing;
    this.speed = speed;
  }

  setStance({ crouch, sw, stagger }) {
    if (crouch !== undefined) this.targetCrouch = crouch;
    if (sw !== undefined) this.targetSw = sw;
    if (stagger !== undefined) this.stagger = stagger;
  }

  get moving() { return this.pos.distanceTo(this.target) > 0.03; }

  update(dt, time) {
    const k = this.k;
    // movimento
    const dx = this.target.x - this.pos.x, dz = this.target.y - this.pos.y;
    const dist = Math.hypot(dx, dz);
    if (dist > 0.01 && dt > 0) {
      const step = Math.min(dist, this.speed * dt);
      this.pos.x += (dx / dist) * step;
      this.pos.y += (dz / dist) * step;
      this.phase += (step / 1.35) * Math.PI * 2;
      this.walk = Math.min(1, this.walk + dt * 5);
      const moveAngle = Math.atan2(dx, dz);
      const face = dist > 1.2 ? moveAngle : this.targetFacing;
      this.facing = angleLerp(this.facing, face, Math.min(1, dt * 7));
    } else {
      this.walk = Math.max(0, this.walk - dt * 4);
      this.facing = angleLerp(this.facing, this.targetFacing, Math.min(1, dt * 6));
    }
    this.crouch = lerp(this.crouch, this.walk > 0.5 ? Math.min(this.targetCrouch, 0.25) : this.targetCrouch, Math.min(1, dt * 4));
    this.sw = lerp(this.sw, this.walk > 0.5 ? 0.13 : this.targetSw, Math.min(1, dt * 4));
    this.group.position.set(this.pos.x, 0, this.pos.y);
    this.group.rotation.y = this.facing;

    // posa
    const c = this.crouch, wa = this.walk, ph = this.phase;
    const idle = (1 - wa) * Math.sin(time * 2.1 + this.idlePhase) * (0.006 + 0.012 * c);
    const sw = this.sw; // come in rules.js: le posizioni dei piedi sono quelle valutate dalle regole
    const ankleY = 0.085 * k;
    const hipY = (0.98 - 0.24 * c) * k + idle - wa * 0.02 + Math.abs(Math.sin(ph)) * 0.025 * wa;
    const hipZ = -0.1 * c * k;
    const swing = Math.sin(ph) * 0.3 * wa * k;
    const st = this.stagger * (1 - wa);
    const ankleL = new THREE.Vector3(sw, ankleY + Math.max(0, Math.cos(ph)) * 0.1 * wa, st / 2 + swing);
    const ankleR = new THREE.Vector3(-sw, ankleY + Math.max(0, -Math.cos(ph)) * 0.1 * wa, -st / 2 - swing);
    const pelvis = new THREE.Vector3(0, hipY, hipZ);
    const hipL = new THREE.Vector3(0.1 * k, hipY - 0.04 * k, hipZ);
    const hipR = new THREE.Vector3(-0.1 * k, hipY - 0.04 * k, hipZ);
    const l1 = 0.47 * k, l2 = 0.47 * k;
    const kneeL = new THREE.Vector3(), kneeR = new THREE.Vector3();
    const fwd = new THREE.Vector3(0.15, 0, 1);
    const footL = solveIK(hipL, ankleL, l1, l2, fwd, kneeL);
    const footR = solveIK(hipR, ankleR, l1, l2, new THREE.Vector3(-0.15, 0, 1), kneeR);

    const pitch = 0.06 + 0.42 * c + 0.08 * wa;
    const torsoLen = 0.55 * k;
    const shoulderC = pelvis.clone().add(new THREE.Vector3(0, Math.cos(pitch), Math.sin(pitch)).multiplyScalar(torsoLen));
    const shL = shoulderC.clone().add(new THREE.Vector3(0.2 * k, -0.03, 0));
    const shR = shoulderC.clone().add(new THREE.Vector3(-0.2 * k, -0.03, 0));
    const headC = shoulderC.clone().add(new THREE.Vector3(0, 0.2 * k, 0.05 + 0.12 * c));

    // braccia
    const ua = 0.3 * k, fa = 0.28 * k;
    let wL, wR, poleL = new THREE.Vector3(0.4, -0.3, -1), poleR = new THREE.Vector3(-0.4, -0.3, -1);
    if (this.serveT >= 0) {
      ({ wL, wR } = this.servePose(shL, shR, k));
      poleL = new THREE.Vector3(0.6, -0.2, -0.5);
      poleR = new THREE.Vector3(-0.8, -0.2, -0.4);
    } else if (this.armPose === 'ready' && wa < 0.5) {
      wL = new THREE.Vector3(0.11 * k, shL.y - 0.45 * k, shL.z + 0.33 * k);
      wR = new THREE.Vector3(-0.11 * k, shR.y - 0.45 * k, shR.z + 0.33 * k);
      poleL = new THREE.Vector3(1, -0.6, 0);
      poleR = new THREE.Vector3(-1, -0.6, 0);
    } else if (this.armPose === 'net' && wa < 0.5) {
      wL = new THREE.Vector3(0.25 * k, shL.y - 0.5 * k, shL.z + 0.14 * k);
      wR = new THREE.Vector3(-0.25 * k, shR.y - 0.5 * k, shR.z + 0.14 * k);
    } else {
      const as = Math.sin(ph) * 0.28 * wa * k;
      wL = new THREE.Vector3(0.27 * k, shL.y - 0.55 * k, shL.z + 0.05 - as);
      wR = new THREE.Vector3(-0.27 * k, shR.y - 0.55 * k, shR.z + 0.05 + as);
    }
    const elL = new THREE.Vector3(), elR = new THREE.Vector3();
    const handL = solveIK(shL, wL, ua, fa, poleL, elL);
    const handR = solveIK(shR, wR, ua, fa, poleR, elR);

    // mesh
    const m = this.m;
    placeLimb(m.torso, pelvis.clone().add(new THREE.Vector3(0, 0.03, 0)), shoulderC.clone().add(new THREE.Vector3(0, 0.05, 0)), 1);
    m.torso.scale.set(k, m.torso.scale.y, 0.62 * k);
    placeLimb(m.pelvis, pelvis.clone().add(new THREE.Vector3(0, -0.1 * k, 0)), pelvis.clone().add(new THREE.Vector3(0, 0.06 * k, 0)), 1);
    m.pelvis.scale.set(k, m.pelvis.scale.y, 0.68 * k);
    placeLimb(m.neck, shoulderC, headC, 0.055 * k, 0, 0.6);
    m.head.position.copy(headC);
    m.head.scale.setScalar(0.115 * k);
    m.head.scale.z = 0.125 * k;
    m.hair.position.copy(headC).add(new THREE.Vector3(0, 0.01, -0.018));
    m.hair.scale.set(0.121 * k, 0.124 * k, 0.133 * k);
    m.hair.rotation.x = -0.55;
    if (m.tail) {
      m.tail.position.copy(headC).add(new THREE.Vector3(0, -0.06 * k, -0.16 * k));
      m.tail.scale.set(0.05 * k, 0.12 * k, 0.05 * k);
      m.tail.rotation.x = 0.5 + Math.sin(time * 3 + this.idlePhase) * 0.05;
    }
    for (const [s, hip, knee, foot, sh, el, hand] of [['L', hipL, kneeL, footL, shL, elL, handL], ['R', hipR, kneeR, footR, shR, elR, handR]]) {
      placeLimb(m['thigh' + s], hip, knee, 0.075 * k);
      placeLimb(m['shortLeg' + s], hip, knee, 0.094 * k, -0.05, 0.36);
      placeLimb(m['shin' + s], knee, foot, 0.056 * k);
      placeLimb(m['pad' + s], hip, knee, 0.082 * k, 0.86, 1.08);
      placeLimb(m['sock' + s], knee, foot, 0.06 * k, 0.45, 1);
      m['shoe' + s].position.set(foot.x, foot.y - 0.035, foot.z);
      m['shoe' + s].rotation.set(0, 0, 0);
      m['shoe' + s].scale.setScalar(Math.max(0.85, k));
      m['sole' + s].position.set(foot.x, foot.y - 0.068, foot.z);
      m['sole' + s].scale.set(Math.max(0.85, k), 1, Math.max(0.85, k));
      placeLimb(m['upper' + s], sh, el, 0.052 * k);
      placeLimb(m['sleeve' + s], sh, el, 0.066 * k, -0.08, 0.42);
      placeLimb(m['cuff' + s], sh, el, 0.069 * k, 0.36, 0.43);
      placeLimb(m['fore' + s], el, hand, 0.043 * k);
      m['hand' + s].position.copy(hand);
      m['hand' + s].scale.setScalar(0.048 * k);
    }
    this.joints.handR = handR;
    this.joints.handL = handL;
    this.label.position.set(headC.x, headC.y + 0.24, headC.z);
    if (this.tag) this.tag.position.set(headC.x, headC.y + 0.18, headC.z);
    this.shadow.scale.set(0.85 + sw, 0.85 + 0.3 * c, 1);
  }

  // Servizio flottante: palla nella sinistra, lancio, braccio destro caricato, colpo.
  servePose(shL, shR, k) {
    const t = this.serveT; // 0 = attesa, 1 = colpo
    const hold = (side) => new THREE.Vector3(side * 0.08 * k, shL.y - 0.32 * k, shL.z + 0.3 * k);
    if (t < 0.55) {
      const b = Math.max(0, Math.sin((t / 0.55) * Math.PI * 3)) * 0.12 * (t < 0.4 ? 1 : 0);
      return { wL: hold(1).add(new THREE.Vector3(0, -b, 0)), wR: hold(-1).add(new THREE.Vector3(0, -b, 0)) };
    }
    if (t < 1) {
      const u = ease((t - 0.55) / 0.45);
      const wL = hold(1).lerp(new THREE.Vector3(0.12 * k, shL.y + 0.55 * k, shL.z + 0.22 * k), Math.min(1, u * 1.6));
      const wR = hold(-1).lerp(new THREE.Vector3(-0.3 * k, shR.y + 0.32 * k, shR.z - 0.18 * k), u);
      if (u > 0.85) wR.lerp(new THREE.Vector3(-0.12 * k, shR.y + 0.55 * k, shR.z + 0.35 * k), (u - 0.85) / 0.15);
      return { wL, wR };
    }
    const u = Math.min(1, (t - 1) / 0.6);
    return {
      wL: new THREE.Vector3(0.25 * k, shL.y - 0.5 * k * u, shL.z + 0.2 * k),
      wR: new THREE.Vector3(-0.12 * k, shR.y + 0.55 * k - 0.6 * k * u, shR.z + 0.35 * k + 0.1 * u),
    };
  }

  // Punto di impatto del servizio (mondo), circa sopra la spalla destra.
  serveContactPoint() {
    const local = new THREE.Vector3(-0.1 * this.k, 2.62 * this.k, 0.35 * this.k);
    return this.group.localToWorld(local);
  }
  holdPoint() {
    const local = new THREE.Vector3(0, 1.22 * this.k, 0.4 * this.k);
    return this.group.localToWorld(local);
  }

  dispose() {
    for (const m of this.materials) { m.map?.dispose(); m.dispose(); }
    this.label.material.map.dispose();
    this.label.material.dispose();
    this.tag?.material.map.dispose();
    this.tag?.material.dispose();
  }
}
