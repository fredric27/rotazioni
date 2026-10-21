// Palazzetto 3D: campo, rete, squadre, pallone, viste degli arbitri, sovrimpressioni.
// Mondo: X lungo il campo (rete in x = 0), Z sulla larghezza, Y in alto.
// Il primo arbitro (seggiolone) sta in z < 0, il secondo arbitro in z > 0.
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { Player3D } from './player3d.js';
import { extents, CONSTRAINTS } from './rules.js';

export const COURT_STYLES = {
  classico: { name: 'Arancio e blu', court: '#d8782f', free: '#1f5aa0', grain: 0.05 },
  verde: { name: 'Blu e verde', court: '#2a63ab', free: '#2c8656', grain: 0.04 },
  parquet: { name: 'Parquet', court: '#c99158', free: '#9c6a3c', grain: 0.16 },
};

const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

// Coordinate di squadra -> mondo. s = +1 se la squadra occupa x > 0.
export const toWorld = (s, d, w) => ({ x: s * d, z: s * (4.5 - w) });
export const toTeam = (s, x, z) => ({ d: s * x, w: 4.5 - s * z });
// theta (0 = verso la rete, > 0 verso destra) -> rotazione Y del gruppo.
export const facingFromTheta = (s, theta) => Math.atan2(-s * Math.cos(theta), -s * Math.sin(theta));

function canvasTex(w, h, draw, { repeat } = {}) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  if (repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(...repeat); }
  t.anisotropy = 8;
  return t;
}

function grainTexture(strength) {
  return canvasTex(512, 512, (g, w, h) => {
    g.fillStyle = '#ffffff';
    g.fillRect(0, 0, w, h);
    for (let i = 0; i < 2600; i++) {
      const v = 255 - Math.random() * 255 * strength;
      g.fillStyle = `rgb(${v},${v},${v})`;
      g.fillRect(Math.random() * w, Math.random() * h, 2 + Math.random() * 40, 1 + Math.random() * 1.5);
    }
  }, { repeat: [4, 2] });
}

function textTexture(text, { bg = '#0b1730', fg = '#ffffff', accent = '#ffc629', w = 1024, h = 64 } = {}) {
  return canvasTex(w, h, (g) => {
    g.fillStyle = bg;
    g.fillRect(0, 0, w, h);
    g.font = '800 40px "Barlow Condensed", "Arial Narrow", Arial, sans-serif';
    g.textBaseline = 'middle';
    let x = 20, i = 0;
    while (x < w) {
      g.fillStyle = i % 2 ? accent : fg;
      g.fillText(text, x, h / 2 + 2);
      x += g.measureText(text).width + 40;
      i++;
    }
  });
}

export class Arena {
  constructor(container) {
    this.container = container;
    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;
    container.appendChild(this.renderer.domElement);
    this.canvas = this.renderer.domElement;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color('#0a0e17');
    this.scene.fog = new THREE.Fog('#0a0e17', 34, 70);
    this.camera = new THREE.PerspectiveCamera(60, 1, 0.1, 200);
    this.pipCamera = new THREE.PerspectiveCamera(26, 1.4, 0.1, 100);
    this.clock = new THREE.Clock();
    this.time = 0;
    this.tickers = new Set();

    this.view = 'cinematic';
    this.side = 1;
    this.look = { yaw: 0, pitch: 0 };
    this.netHeight = 2.43;
    this.pip = { enabled: true, visible: false };

    this.buildLights();
    this.buildFloor('classico');
    this.buildNet();
    this.buildSurroundings();
    this.buildBall();
    this.overlay = new THREE.Group();
    this.scene.add(this.overlay);
    this.zoneOverlay = new THREE.Group();
    this.scene.add(this.zoneOverlay);

    this.teams = [];
    this.figures = [[], []];
    this.ensureReferees();

    this.controls = new OrbitControls(this.camera, this.canvas);
    this.controls.enabled = false;
    this.controls.enableDamping = true;
    this.controls.maxPolarAngle = Math.PI * 0.48;
    this.controls.minDistance = 4;
    this.controls.maxDistance = 45;

    this.camAnim = null;
    this.camPos = new THREE.Vector3(0, 9, -22);
    this.camTarget = new THREE.Vector3(0, 0, 0);

    this.pipFrame = document.createElement('div');
    this.pipFrame.className = 'pip-frame';
    this.pipFrame.innerHTML = '<span>Battitore</span>';
    container.appendChild(this.pipFrame);

    this.setupPointer();
    this.resize();
    window.addEventListener('resize', () => this.resize());
    this.renderer.setAnimationLoop(() => this.frame());
  }

  // ---------- costruzione ----------
  buildLights() {
    this.scene.add(new THREE.HemisphereLight('#e6eeff', '#3b2a1d', 1.0));
    const key = new THREE.DirectionalLight('#ffffff', 1.5);
    key.position.set(6, 20, -8);
    this.scene.add(key);
    const fill = new THREE.DirectionalLight('#cfe0ff', 0.6);
    fill.position.set(-10, 14, 12);
    this.scene.add(fill);
  }

  buildFloor(styleId) {
    if (this.floorGroup) this.scene.remove(this.floorGroup);
    const style = COURT_STYLES[styleId] || COURT_STYLES.classico;
    const g = new THREE.Group();
    this.floorGroup = g;
    const grain = grainTexture(style.grain);
    const outer = new THREE.Mesh(new THREE.PlaneGeometry(80, 60), new THREE.MeshStandardMaterial({ color: '#1b2029', roughness: 0.9 }));
    outer.rotation.x = -Math.PI / 2;
    outer.position.y = -0.01;
    g.add(outer);
    const free = new THREE.Mesh(new THREE.PlaneGeometry(31, 19), new THREE.MeshStandardMaterial({ color: style.free, roughness: 0.55, map: grain }));
    free.rotation.x = -Math.PI / 2;
    free.position.y = 0;
    g.add(free);
    const court = new THREE.Mesh(new THREE.PlaneGeometry(18, 9), new THREE.MeshStandardMaterial({ color: style.court, roughness: 0.5, map: grain }));
    court.rotation.x = -Math.PI / 2;
    court.position.y = 0.002;
    g.add(court);

    const lineMat = new THREE.MeshBasicMaterial({ color: '#f7f7f2' });
    const line = (x, z, lx, lz) => {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(lx, lz), lineMat);
      m.rotation.x = -Math.PI / 2;
      m.position.set(x, 0.004, z);
      g.add(m);
    };
    const W = 0.05;
    line(0, -4.5 + W / 2, 18, W); // laterali (dentro il campo)
    line(0, 4.5 - W / 2, 18, W);
    line(-9 + W / 2, 0, W, 9); // linee di fondo
    line(9 - W / 2, 0, W, 9);
    line(0, 0, W, 9); // linea centrale
    for (const s of [-1, 1]) {
      line(s * (3 - W / 2), 0, W, 9); // linee d'attacco
      for (let i = 0; i < 5; i++) { // prolungamenti tratteggiati
        for (const zs of [-1, 1]) line(s * (3 - W / 2), zs * (4.5 + 0.2 + 0.075 + i * 0.35), W, 0.15);
      }
    }
    this.scene.add(g);
  }

  buildNet() {
    const g = new THREE.Group();
    this.netGroup = g;
    const meshTex = canvasTex(256, 256, (c, w, h) => {
      c.clearRect(0, 0, w, h);
      c.strokeStyle = '#ffffff';
      c.lineWidth = 3;
      for (let i = 0; i <= 10; i++) {
        const p = (i / 10) * w;
        c.beginPath(); c.moveTo(p, 0); c.lineTo(p, h); c.stroke();
        c.beginPath(); c.moveTo(0, p); c.lineTo(w, p); c.stroke();
      }
    }, { repeat: [9.8, 1] });
    const net = new THREE.Mesh(new THREE.PlaneGeometry(9.8, 1), new THREE.MeshBasicMaterial({ map: meshTex, color: '#15171c', transparent: true, alphaTest: 0.25, side: THREE.DoubleSide }));
    net.rotation.y = Math.PI / 2;
    g.add(net);
    this.netMesh = net;
    const white = new THREE.MeshStandardMaterial({ color: '#f4f4f4', roughness: 0.6 });
    this.netTop = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.07, 9.8), white);
    this.netBottom = new THREE.Mesh(new THREE.BoxGeometry(0.015, 0.05, 9.8), white);
    g.add(this.netTop, this.netBottom);
    this.sideBands = [-1, 1].map((s) => {
      const b = new THREE.Mesh(new THREE.BoxGeometry(0.02, 1, 0.05), white);
      b.position.z = s * 4.475;
      g.add(b);
      return b;
    });
    const antTex = canvasTex(8, 256, (c, w, h) => {
      for (let i = 0; i < 18; i++) { c.fillStyle = i % 2 ? '#ffffff' : '#e3262f'; c.fillRect(0, (i / 18) * h, w, h / 18 + 1); }
    });
    this.antennas = [-1, 1].map((s) => {
      const a = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 1.8, 8), new THREE.MeshStandardMaterial({ map: antTex, roughness: 0.4 }));
      a.position.z = s * 4.55;
      g.add(a);
      return a;
    });
    const postMat = new THREE.MeshStandardMaterial({ color: '#c9ccd2', metalness: 0.6, roughness: 0.35 });
    const padMat = new THREE.MeshStandardMaterial({ color: '#13306b', roughness: 0.8 });
    this.posts = {};
    for (const s of [-1, 1]) {
      const postGroup = new THREE.Group();
      this.posts[s] = postGroup;
      g.add(postGroup);
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 2.6, 16), postMat);
      post.position.set(0, 1.3, s * 5.5);
      const pad = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 1.9, 20), padMat);
      pad.position.set(0, 0.95, s * 5.5);
      const base = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.32, 0.06, 20), padMat);
      base.position.set(0, 0.03, s * 5.5);
      postGroup.add(post, pad, base);
      const cable = new THREE.Mesh(new THREE.CylinderGeometry(0.005, 0.005, 0.62, 4), postMat);
      cable.rotation.x = Math.PI / 2;
      cable.position.set(0, 2.43, s * 5.2);
      g.add(cable);
      (this.cables ||= []).push(cable);
    }
    // seggiolone del primo arbitro
    const stand = new THREE.Group();
    const frame = new THREE.MeshStandardMaterial({ color: '#2b3442', roughness: 0.6, metalness: 0.3 });
    const top = new THREE.Mesh(new THREE.BoxGeometry(0.75, 0.06, 0.7), frame);
    top.position.y = 1.32;
    stand.add(top);
    for (const [x, z] of [[-0.33, -0.3], [0.33, -0.3], [-0.33, 0.3], [0.33, 0.3]]) {
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.05, 1.32, 0.05), frame);
      leg.position.set(x, 0.66, z);
      stand.add(leg);
    }
    const rail = new THREE.Mesh(new THREE.BoxGeometry(0.75, 0.05, 0.05), frame);
    rail.position.set(0, 1.62, 0.33);
    stand.add(rail);
    for (let i = 0; i < 5; i++) {
      const step = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.04, 0.16), frame);
      step.position.set(0, 0.26 * (i + 0.6), -0.45 - i * 0.12);
      stand.add(step);
    }
    stand.position.set(0, 0, -6.15);
    g.add(stand);
    this.scene.add(g);
    this.setNetHeight(2.43);
  }

  setNetHeight(h) {
    this.netHeight = h;
    this.netMesh.position.y = h - 0.5;
    this.netTop.position.y = h - 0.035;
    this.netBottom.position.y = h - 0.975;
    for (const b of this.sideBands) b.position.y = h - 0.5;
    for (const a of this.antennas) a.position.y = h - 1 + 0.9;
    for (const c of this.cables) c.position.y = h;
  }

  buildSurroundings() {
    const g = new THREE.Group();
    const crowdTex = canvasTex(512, 256, (c, w, h) => {
      c.fillStyle = '#141824';
      c.fillRect(0, 0, w, h);
      const cols = ['#3b4252', '#4c566a', '#7a3b3b', '#2f4f7f', '#6b6b6b', '#8a7a52', '#30303a', '#5b3a6b', '#9a9a9a'];
      for (let y = 6; y < h; y += 16) for (let x = 4; x < w; x += 11) {
        if (Math.random() < 0.18) continue;
        c.fillStyle = cols[Math.floor(Math.random() * cols.length)];
        c.fillRect(x + Math.random() * 2, y + Math.random() * 3, 7, 9);
        c.fillStyle = '#b08d74';
        c.fillRect(x + 1.5, y - 4, 4, 4);
      }
    }, { repeat: [6, 3] });
    const crowdMat = new THREE.MeshStandardMaterial({ map: crowdTex, roughness: 1, color: '#9aa3b5' });
    const tribune = (w, x, z, rot) => {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(w, 12), crowdMat);
      m.position.set(x, 4.2, z);
      m.rotation.set(0, rot, 0);
      m.rotateX(-0.55);
      g.add(m);
    };
    tribune(46, 0, -14.5, 0);
    tribune(46, 0, 14.5, Math.PI);
    tribune(32, -21, 0, Math.PI / 2);
    tribune(32, 21, 0, -Math.PI / 2);

    const boardMat = new THREE.MeshBasicMaterial({ map: textTexture('ROTAZIONI  ·  SCUOLA ARBITRI  ·  FAIR PLAY') });
    const boardMat2 = new THREE.MeshBasicMaterial({ map: textTexture('PALLAVOLO  ·  ROTAZIONI  ·  POSIZIONI', { bg: '#101a12', accent: '#7ee08a' }) });
    const board = (w, x, z, rot, mat) => {
      const m = new THREE.Mesh(new THREE.BoxGeometry(w, 0.9, 0.12), mat);
      m.position.set(x, 0.45, z);
      m.rotation.y = rot;
      g.add(m);
    };
    board(15, -7.8, -9.6, 0, boardMat);
    board(15, 7.8, -9.6, 0, boardMat2);
    board(12, -15.6, 0, Math.PI / 2, boardMat2);
    board(12, 15.6, 0, -Math.PI / 2, boardMat);
    board(10, -9.5, 9.6, Math.PI, boardMat);
    board(10, 9.5, 9.6, Math.PI, boardMat2);
    // tavolo del segnapunti, dietro il secondo arbitro
    const table = new THREE.Mesh(new THREE.BoxGeometry(3.4, 0.76, 0.7), new THREE.MeshStandardMaterial({ color: '#1d2b4a', roughness: 0.7 }));
    table.position.set(0, 0.38, 8.4);
    g.add(table);
    const tableFront = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 0.5), new THREE.MeshBasicMaterial({ map: textTexture('SEGNAPUNTI', { w: 512, h: 64 }) }));
    tableFront.position.set(0, 0.42, 8.04);
    tableFront.rotation.y = Math.PI;
    g.add(tableFront);
    // panchine
    for (const s of [-1, 1]) {
      const bench = new THREE.Mesh(new THREE.BoxGeometry(4, 0.45, 0.5), new THREE.MeshStandardMaterial({ color: '#333a48', roughness: 0.8 }));
      bench.position.set(s * 7.5, 0.22, 9.0);
      g.add(bench);
    }
    // luci del soffitto
    const lampMat = new THREE.MeshBasicMaterial({ color: '#fff8e8' });
    for (let x = -12; x <= 12; x += 6) for (const z of [-6, 0, 6]) {
      const l = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.1, 0.6), lampMat);
      l.position.set(x, 16, z);
      g.add(l);
    }
    this.scene.add(g);
  }

  buildBall() {
    const tex = canvasTex(256, 128, (c, w, h) => {
      const cols = ['#ffd21f', '#1b4fbf', '#ffd21f', '#1b4fbf', '#ffffff', '#1b4fbf'];
      for (let i = 0; i < 6; i++) { c.fillStyle = cols[i]; c.fillRect(0, (i / 6) * h, w, h / 6 + 1); }
      c.strokeStyle = 'rgba(0,0,0,0.25)';
      c.lineWidth = 2;
      for (let i = 0; i < 8; i++) { c.beginPath(); c.moveTo((i / 8) * w, 0); c.bezierCurveTo((i / 8) * w + 30, h / 3, (i / 8) * w - 30, (2 * h) / 3, (i / 8) * w, h); c.stroke(); }
    });
    this.ball = new THREE.Mesh(new THREE.SphereGeometry(0.105, 24, 16), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.55 }));
    this.ball.visible = false;
    this.scene.add(this.ball);
    this.ballShadow = new THREE.Mesh(new THREE.CircleGeometry(0.11, 20), new THREE.MeshBasicMaterial({ color: '#000', transparent: true, opacity: 0.3, depthWrite: false }));
    this.ballShadow.rotation.x = -Math.PI / 2;
    this.ballShadow.position.y = 0.011;
    this.ballShadow.visible = false;
    this.scene.add(this.ballShadow);
    this.ballAnim = null;
  }

  setCourtStyle(id) { this.buildFloor(id); }

  // ---------- squadre ----------
  setTeams(teams) {
    for (const list of this.figures) for (const f of list) { this.scene.remove(f.group); f.dispose(); }
    this.teams = teams;
    this.figures = teams.map((team) => ['P', 'S1', 'C2', 'O', 'S2', 'C1', 'L'].map((role) => {
      const isL = role === 'L';
      const f = new Player3D({ kit: isL ? team.liberoKit : team.kit, number: team.numbers[role], look: team.look[role], isLibero: isL });
      f.role = role;
      f.group.visible = false;
      this.scene.add(f.group);
      return f;
    }));
    this.ensureReferees();
  }

  ensureReferees() {
    if (this.refs) return;
    const kit = { id: 'arbitro', main: '#1a2c55', trim: '#0e1830', num: '#1a2c55', shorts: '#16181d' };
    const look = { height: 1.8, skin: '#e2b08c', hair: '#3a2a1e', female: false };
    const mk = () => {
      const r = new Player3D({ kit, number: '', look });
      // pantaloni lunghi
      for (const s of ['L', 'R']) {
        r.m['thigh' + s].material = r.materials[4];
        r.m['shin' + s].material = r.materials[4];
        r.m['sock' + s].material = r.materials[4];
        r.m['pad' + s].visible = false;
        r.m['shortLeg' + s].visible = false;
        r.m['shoe' + s].material = r.materials[6];
      }
      this.scene.add(r.group);
      return r;
    };
    this.refs = { r1: mk(), r2: mk() };
    this.refs.r1.place(0, -6.15, 0);
    this.refs.r1.baseY = 1.35;
    this.refs.r2.place(0, 6.1, Math.PI);
  }

  figure(teamIndex, role) { return this.figures[teamIndex].find((f) => f.role === role); }

  // Dispone la squadra in ricezione secondo lo scenario.
  layoutReceiving(teamIndex, side, scenario, { animate = true, fromBase = false } = {}) {
    const figs = this.figures[teamIndex];
    const onCourt = new Set(scenario.players.map((p) => p.role));
    for (const f of figs) {
      f.group.visible = onCourt.has(f.role);
      f.highlight(null);
      f.showLabel(false);
    }
    this.receiving = { teamIndex, side, scenario };
    for (const p of scenario.players) {
      const f = this.figure(teamIndex, p.role);
      const { x, z } = toWorld(side, p.d, p.w);
      const face = facingFromTheta(side, p.theta);
      f.setStance({ crouch: p.crouch, sw: p.sw, stagger: p.stagger });
      f.armPose = p.stance === 'ready' ? 'ready' : p.stance === 'net' ? 'net' : 'hang';
      f.serveT = -1;
      f.baseY = 0;
      p.figure = f;
      // chi è nell'altra metà campo (cambio di campo o di squadra) viene riposizionato subito
      if (f.wasPlaced && Math.sign(f.pos.x) !== side) f.wasPlaced = false;
      if (!animate || !f.wasPlaced) {
        const start = fromBase || !f.wasPlaced ? toWorld(side, p.d + (Math.random() - 0.5) * 3, p.w + (Math.random() - 0.5) * 3) : null;
        if (animate && start) {
          f.place(Math.max(-8.7, Math.min(8.7, start.x)), Math.max(-4.3, Math.min(4.3, start.z)), face);
          f.moveTo(x, z, face, 2.4 + Math.random());
        } else {
          f.place(x, z, face);
          f.crouch = p.crouch;
          f.sw = p.sw;
        }
      } else {
        f.moveTo(x, z, face, 2.4 + Math.random());
      }
      f.wasPlaced = true;
    }
  }

  // La squadra al servizio è libera di disporsi (regola 7.4 dal 2025): posizioni tipiche.
  layoutServing(teamIndex, side, rot, { animate = true } = {}) {
    const zonesRoles = { 1: null };
    const order = ['P', 'S1', 'C2', 'O', 'S2', 'C1'];
    const r = (1 - rot + 6) % 6;
    order.forEach((role, i) => { zonesRoles[(((i - r) % 6) + 6) % 6 + 1] = role; });
    const spots = {
      2: [0.8, 7.6, 'net'], 3: [0.8, 4.5, 'net'], 4: [0.8, 1.4, 'net'],
      5: [6.6, 1.6, 'ready'], 6: [7.4, 4.5, 'ready'],
    };
    const figs = this.figures[teamIndex];
    for (const f of figs) { f.group.visible = f.role !== 'L'; f.highlight(null); f.showLabel(false); f.serveT = -1; f.baseY = 0; }
    this.serving = { teamIndex, side, rot };
    for (const [zone, role] of Object.entries(zonesRoles)) {
      const f = this.figure(teamIndex, role);
      let d, w, stance;
      if (Number(zone) === 1) {
        d = 9 + 1.2 + Math.random() * 2.6;
        w = 1 + Math.random() * 7;
        stance = 'stand';
        this.server = f;
      } else {
        [d, w, stance] = spots[zone];
        d += (Math.random() - 0.5) * 0.4;
        w += (Math.random() - 0.5) * 0.6;
      }
      const { x, z } = toWorld(side, d, w);
      const face = facingFromTheta(side, 0);
      f.setStance({ crouch: stance === 'ready' ? 0.8 : 0.05, sw: stance === 'ready' ? 0.24 : 0.17, stagger: 0 });
      f.armPose = stance === 'net' ? 'net' : stance === 'ready' ? 'ready' : 'hang';
      if (animate && f.wasPlaced && Math.sign(f.pos.x) === side) f.moveTo(x, z, face, 3);
      else f.place(x, z, face);
      f.wasPlaced = true;
    }
    this.server.serveT = 0.2;
    this.ball.visible = true;
    this.ballShadow.visible = true;
    this.ballAnim = { mode: 'held' };
  }

  get playersSettled() {
    return this.figures.every((list) => list.every((f) => !f.group.visible || !f.moving));
  }

  hideAll() {
    for (const list of this.figures) for (const f of list) { f.group.visible = false; f.wasPlaced = false; }
    this.ball.visible = false;
    this.ballShadow.visible = false;
    this.ballAnim = null;
  }

  setLabels(fn) {
    if (!this.receiving) return;
    for (const p of this.receiving.scenario.players) {
      const f = p.figure;
      const l = fn ? fn(p) : null;
      if (l) { f.setLabel(l.main, l.sub, l.color, l.bg); f.showLabel(true); } else f.showLabel(false);
    }
  }

  // ---------- servizio ----------
  // Lancio + colpo dopo `delay` secondi. Restituisce una Promise risolta al colpo.
  serve(delay, target) {
    const server = this.server;
    return new Promise((resolve) => {
      this.ballAnim = { mode: 'wait', t: 0, delay, server, target: new THREE.Vector3(target.x, target.y, target.z), resolve, bounceAt: 0.6 };
    });
  }

  updateBall(dt) {
    const a = this.ballAnim;
    if (!a) return;
    const b = this.ball;
    const server = this.server;
    const bounce = (t) => { // palleggio a terra prima del servizio
      const hold = server.holdPoint();
      const u = Math.min(1, t / 0.55);
      const floorP = hold.clone(); floorP.y = 0.11;
      const p = u < 0.5 ? hold.clone().lerp(floorP, ease(u * 2)) : floorP.clone().lerp(hold, 1 - Math.pow(1 - (u - 0.5) * 2, 2));
      return p;
    };
    if (a.mode === 'held') {
      if (server) b.position.copy(server.holdPoint());
    } else if (a.mode === 'wait') {
      a.t += dt;
      const tossDur = 0.9;
      const remaining = a.delay - a.t;
      if (remaining > tossDur) {
        server.serveT = 0.2;
        if (a.t >= a.bounceAt && a.t < a.bounceAt + 0.55 && remaining > tossDur + 0.6) b.position.copy(bounce(a.t - a.bounceAt));
        else {
          if (a.t >= a.bounceAt + 0.55) a.bounceAt = a.t + 1.1 + Math.random() * 0.8;
          b.position.copy(server.holdPoint());
        }
      } else if (remaining > 0) {
        const u = 1 - remaining / tossDur;
        server.serveT = 0.55 + 0.45 * u;
        const hold = server.holdPoint();
        const contact = server.serveContactPoint();
        const apex = contact.y + 0.35;
        const y = u < 0.75 ? hold.y + (apex - hold.y) * Math.sin((u / 0.75) * Math.PI / 2) : apex - (apex - contact.y) * ((u - 0.75) / 0.25) ** 2;
        b.position.set(hold.x + (contact.x - hold.x) * u, y, hold.z + (contact.z - hold.z) * u);
      } else {
        server.serveT = 1;
        const from = server.serveContactPoint();
        b.position.copy(from);
        this.ballAnim = { mode: 'flight', t: 0, dur: 1.15, from, to: a.target.clone(), arc: 1.0 };
        a.resolve();
      }
    } else if (a.mode === 'flight' || a.mode === 'pass') {
      a.t += dt;
      const u = Math.min(1, a.t / a.dur);
      b.position.lerpVectors(a.from, a.to, u);
      b.position.y += a.arc * 4 * u * (1 - u);
      b.rotation.x += dt * 9;
      if (server && server.serveT >= 1) server.serveT = Math.min(1.6, server.serveT + dt);
      if (u >= 1) {
        if (a.mode === 'flight' && a.next) {
          this.ballAnim = { mode: 'pass', t: 0, dur: 1.1, from: a.to.clone(), to: a.next.clone(), arc: 2.6 };
        } else this.ballAnim = { mode: 'rest', vy: 0 };
      }
    } else if (a.mode === 'rest') {
      a.vy -= 9.8 * dt;
      b.position.y = Math.max(0.105, b.position.y + a.vy * dt);
      if (b.position.y <= 0.105) a.vy = Math.abs(a.vy) > 1 ? -a.vy * 0.5 : 0;
    }
    this.ballShadow.position.set(b.position.x, 0.011, b.position.z);
    const s = Math.max(0.4, 1.4 - b.position.y * 0.2);
    this.ballShadow.scale.set(s, s, 1);
  }

  setPassTarget(v) { if (this.ballAnim) this.ballAnim.next = new THREE.Vector3(v.x, v.y, v.z); }

  // ---------- sovrimpressioni ----------
  clearOverlay() {
    for (const c of [...this.overlay.children]) { this.overlay.remove(c); c.geometry?.dispose(); }
    for (const list of this.figures) for (const f of list) f.highlight(null);
  }

  ribbon(a, b, color, width = 0.06, y = 0.02, opacity = 0.95, dashed = false) {
    const dx = b.x - a.x, dz = b.z - a.z;
    const len = Math.hypot(dx, dz);
    if (len < 1e-3) return;
    const segs = dashed ? Math.max(1, Math.floor(len / 0.35)) : 1;
    const mat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity, depthWrite: false, depthTest: false });
    for (let i = 0; i < segs; i++) {
      if (dashed && i % 2) continue;
      const t0 = i / segs, t1 = dashed ? (i + 1) / segs : 1;
      const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), mat);
      m.rotation.x = -Math.PI / 2;
      const cx = a.x + dx * (t0 + t1) / 2, cz = a.z + dz * (t0 + t1) / 2;
      m.position.set(cx, y, cz);
      m.rotation.z = Math.atan2(dz, dx) * -1;
      m.scale.set(len * (t1 - t0), width, 1);
      m.renderOrder = 5;
      this.overlay.add(m);
    }
  }

  // Linee tra i giocatori "corrispondenti": verdi se la relazione è rispettata, rosse se no.
  // neutral: mostra solo quali coppie controllare, senza rivelare l'esito.
  showConstraints(results, side, { onlyViolations = false, references = true, only = null, neutral = false } = {}) {
    for (const r of results) {
      if (onlyViolations && r.ok) continue;
      if (only && !only.includes(r.c.id)) continue;
      const a = toWorld(side, r.A.d, r.A.w), b = toWorld(side, r.B.d, r.B.w);
      if (neutral) {
        this.ribbon(a, b, '#8fc1ff', 0.04, 0.025, 0.75, r.c.kind === 'lr');
        continue;
      }
      const color = r.ok ? (r.margin < 0.25 ? '#ffc629' : '#36d17c') : '#ff3b30';
      this.ribbon(a, b, color, r.ok ? 0.05 : 0.08, 0.025, r.ok ? 0.85 : 1, r.c.kind === 'lr');
      if (!r.ok) {
        r.A.figure?.highlight('#ff3b30');
        r.B.figure?.highlight('#ff3b30');
        if (references) this.referenceLines(r, side);
      }
    }
  }

  // Linee di riferimento sul piede decisivo dei due giocatori (parallele alla rete o alle laterali).
  referenceLines(r, side, color = '#ff3b30') {
    const ea = extents(r.A), eb = extents(r.B);
    if (r.c.kind === 'fb') {
      for (const d of [ea.minD, eb.minD]) this.ribbon(toWorld(side, d, -0.2), toWorld(side, d, 9.2), color, 0.025, 0.03, 0.9, true);
    } else {
      const key = r.c.side === 'left' ? 'minW' : 'maxW';
      for (const w of [ea[key], eb[key]]) this.ribbon(toWorld(side, -0.2, w), toWorld(side, 9.2, w), color, 0.025, 0.03, 0.9, true);
    }
  }

  showZones(side, on, { numbers = true, readFrom = 'r1' } = {}) {
    for (const c of [...this.zoneOverlay.children]) this.zoneOverlay.remove(c);
    if (!on) return;
    const zoneRect = { 4: [0, 3, 0, 3], 3: [0, 3, 3, 6], 2: [0, 3, 6, 9], 5: [3, 9, 0, 3], 6: [3, 9, 3, 6], 1: [3, 9, 6, 9] };
    for (const [zone, [d0, d1, w0, w1]] of Object.entries(zoneRect)) {
      const c = toWorld(side, (d0 + d1) / 2, (w0 + w1) / 2);
      const plane = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ color: Number(zone) <= 4 && Number(zone) >= 2 ? '#ffffff' : '#0b1a33', transparent: true, opacity: 0.07, depthWrite: false }));
      plane.rotation.x = -Math.PI / 2;
      plane.position.set(c.x, 0.006, c.z);
      plane.scale.set(d1 - d0 - 0.06, w1 - w0 - 0.06, 1);
      this.zoneOverlay.add(plane);
      if (numbers) {
        const tex = canvasTex(128, 128, (g) => {
          g.clearRect(0, 0, 128, 128);
          g.font = '800 104px "Barlow Condensed", Arial, sans-serif';
          g.textAlign = 'center';
          g.textBaseline = 'middle';
          g.fillStyle = 'rgba(255,255,255,0.42)';
          g.fillText(zone, 64, 70);
        });
        const num = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 1.6), new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false }));
        num.rotation.x = -Math.PI / 2;
        // numeri dritti per chi guarda dal lato dell'arbitro indicato
        num.rotation.z = readFrom === 'r2' ? 0 : readFrom === 'team' ? side * Math.PI / 2 : Math.PI;
        num.position.set(c.x, 0.008, c.z);
        this.zoneOverlay.add(num);
      }
    }
    // separazioni tra le zone
    for (const w of [3, 6]) this.ribbonTo(this.zoneOverlay, toWorld(side, 0, w), toWorld(side, 9, w), '#ffffff', 0.03, 0.35);
  }

  ribbonTo(group, a, b, color, width, opacity) {
    const dx = b.x - a.x, dz = b.z - a.z;
    const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ color, transparent: true, opacity, depthWrite: false }));
    m.rotation.x = -Math.PI / 2;
    m.rotation.z = -Math.atan2(dz, dx);
    m.position.set((a.x + b.x) / 2, 0.007, (a.z + b.z) / 2);
    m.scale.set(Math.hypot(dx, dz), width, 1);
    group.add(m);
  }

  // ---------- telecamera ----------
  refEye(view, side) {
    if (view === 'r1') return new THREE.Vector3(0, this.netHeight + 0.6, -6.15);
    return new THREE.Vector3(side * 0.8, 1.72, 6.5);
  }

  viewGoal(view, side) {
    if (view === 'r1' || view === 'r2') {
      const eye = this.refEye(view, side);
      const target = new THREE.Vector3(side * 4.4, 0.5, view === 'r1' ? 0.6 : -0.6);
      return { pos: eye, target };
    }
    if (view === 'top') {
      return { pos: new THREE.Vector3(side * 4.5, 15.5, -0.01), target: new THREE.Vector3(side * 4.5, 0, 0) };
    }
    if (view === 'topfull') return { pos: new THREE.Vector3(0, 23, -0.01), target: new THREE.Vector3(0, 0, 0) };
    if (view === 'behind') return { pos: new THREE.Vector3(side * 16.5, 5.5, 0), target: new THREE.Vector3(side * 3, 0.5, 0) };
    if (view === 'free') return { pos: new THREE.Vector3(side * 4.5 - side * 3, 11, -13), target: new THREE.Vector3(side * 4.5, 0, 0) };
    return { pos: new THREE.Vector3(0, 9, -22), target: new THREE.Vector3(0, 0.5, 0) };
  }

  setView(view, side = this.side, { instant = false, refOrientation = 'r1' } = {}) {
    this.view = view;
    this.side = side;
    this.look.yaw = 0;
    this.look.pitch = 0;
    // orientamento della vista dall'alto: come la vede il 1° arbitro, il 2° arbitro o la squadra (rete in alto)
    this.topUp = refOrientation === 'r2' ? new THREE.Vector3(0, 0, -1) : refOrientation === 'team' ? new THREE.Vector3(-side, 0, 0) : new THREE.Vector3(0, 0, 1);
    const goal = this.viewGoal(view, side);
    this.controls.enabled = view === 'free';
    this.pip.visible = false;
    // il palo sotto il seggiolone coprirebbe metà campo: dal punto di vista del 1° arbitro lo nascondiamo
    this.posts[-1].visible = view !== 'r1';
    if (view === 'r1' || view === 'r2') {
      this.refs.r1.group.visible = view !== 'r1';
      this.refs.r2.group.visible = view !== 'r2';
      this.refs.r2.place(side * 0.8, 6.5, Math.PI);
    } else {
      this.refs.r1.group.visible = true;
      this.refs.r2.group.visible = true;
    }
    if (instant) {
      this.camPos.copy(goal.pos);
      this.camTarget.copy(goal.target);
      this.camAnim = null;
    } else {
      this.camAnim = { t: 0, dur: 1.0, fromPos: this.camPos.clone(), fromTarget: this.camTarget.clone(), goal };
    }
    if (view === 'free') this.controls.target.copy(goal.target);
    this.resize();
  }

  updateCamera(dt) {
    const cam = this.camera;
    if (this.view === 'free' && !this.camAnim) {
      this.controls.update();
      return;
    }
    if (this.camAnim) {
      const a = this.camAnim;
      a.t += dt;
      const u = ease(Math.min(1, a.t / a.dur));
      this.camPos.lerpVectors(a.fromPos, a.goal.pos, u);
      this.camTarget.lerpVectors(a.fromTarget, a.goal.target, u);
      if (u >= 1) {
        this.camAnim = null;
        if (this.view === 'free') { cam.position.copy(this.camPos); this.controls.target.copy(this.camTarget); }
      }
    }
    if (this.view === 'cinematic') {
      const t = this.time * 0.05;
      this.camPos.set(Math.sin(t) * 21, 8.5 + Math.sin(t * 0.7) * 1.5, -Math.cos(t) * 21);
      this.camTarget.set(0, 0.8, 0);
    }
    cam.position.copy(this.camPos);
    cam.up.set(0, 1, 0);
    if (this.view === 'top' || this.view === 'topfull') cam.up.copy(this.topUp);
    const target = this.camTarget.clone();
    if (this.view === 'r1' || this.view === 'r2') {
      // sguardo dell'arbitro: rotazione della testa
      const dir = target.clone().sub(this.camPos);
      const len = dir.length();
      const yaw = Math.atan2(dir.x, dir.z) + this.look.yaw;
      const pitch = Math.asin(dir.y / len) + this.look.pitch;
      target.copy(this.camPos).add(new THREE.Vector3(Math.sin(yaw) * Math.cos(pitch), Math.sin(pitch), Math.cos(yaw) * Math.cos(pitch)).multiplyScalar(len));
    }
    cam.lookAt(target);
  }

  resize() {
    const w = this.container.clientWidth || window.innerWidth;
    const h = this.container.clientHeight || window.innerHeight;
    this.renderer.setSize(w, h);
    const aspect = w / h;
    this.camera.aspect = aspect;
    const hfov = this.view === 'r1' || this.view === 'r2' ? 88 : 70;
    let vfov = (2 * Math.atan(Math.tan((hfov * Math.PI) / 360) / aspect) * 180) / Math.PI;
    vfov = Math.min(this.view === 'top' || this.view === 'topfull' ? 80 : 72, Math.max(40, vfov));
    this.camera.fov = vfov;
    this.size = { w, h };
    this.applyViewShift();
  }

  // Sposta il centro dell'inquadratura (pixel) per lasciare spazio ai pannelli.
  setViewShift(dx = 0, dy = 0) {
    this.shift = { dx, dy };
    this.applyViewShift();
  }

  applyViewShift() {
    const { dx = 0, dy = 0 } = this.shift || {};
    const { w, h } = this.size;
    if (dx || dy) this.camera.setViewOffset(w, h, -dx, dy, w, h);
    else this.camera.clearViewOffset();
    this.camera.updateProjectionMatrix();
  }

  // ---------- input ----------
  setupPointer() {
    this.raycaster = new THREE.Raycaster();
    this.floorPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    this.dragEnabled = false;
    this.onDrag = null;
    let drag = null;
    const floorPoint = (e) => {
      const r = this.canvas.getBoundingClientRect();
      const ndc = new THREE.Vector2(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
      this.raycaster.setFromCamera(ndc, this.camera);
      const p = new THREE.Vector3();
      return this.raycaster.ray.intersectPlane(this.floorPlane, p) ? p : null;
    };
    this.canvas.addEventListener('pointerdown', (e) => {
      if (this.dragEnabled && this.receiving) {
        const p = floorPoint(e);
        if (p) {
          let best = null, bestD = 0.75;
          for (const pl of this.receiving.scenario.players) {
            const dd = Math.hypot(pl.figure.pos.x - p.x, pl.figure.pos.y - p.z);
            if (dd < bestD) { best = pl; bestD = dd; }
          }
          if (best) {
            drag = { kind: 'player', player: best, off: { x: best.figure.pos.x - p.x, z: best.figure.pos.y - p.z }, controls: this.controls.enabled };
            this.controls.enabled = false;
            this.canvas.setPointerCapture(e.pointerId);
            this.canvas.classList.add('dragging');
            return;
          }
        }
      }
      if (this.view === 'r1' || this.view === 'r2') {
        drag = { kind: 'look', x: e.clientX, y: e.clientY, yaw: this.look.yaw, pitch: this.look.pitch };
        this.canvas.setPointerCapture(e.pointerId);
      }
    });
    this.canvas.addEventListener('pointermove', (e) => {
      if (!drag) {
        if (this.dragEnabled && this.receiving) {
          const p = floorPoint(e);
          const near = p && this.receiving.scenario.players.some((pl) => Math.hypot(pl.figure.pos.x - p.x, pl.figure.pos.y - p.z) < 0.75);
          this.canvas.classList.toggle('can-drag', !!near);
        }
        return;
      }
      if (drag.kind === 'look') {
        const k = 1.6 / this.size.h;
        this.look.yaw = Math.max(-1.1, Math.min(1.1, drag.yaw + (e.clientX - drag.x) * k));
        this.look.pitch = Math.max(-0.5, Math.min(0.4, drag.pitch + (e.clientY - drag.y) * k));
        return;
      }
      const p = floorPoint(e);
      if (!p) return;
      const s = this.receiving.side;
      const t = toTeam(s, p.x + drag.off.x, p.z + drag.off.z);
      const pl = drag.player;
      pl.d = Math.max(0.3, Math.min(8.7, t.d));
      pl.w = Math.max(0.3, Math.min(8.7, t.w));
      const wpos = toWorld(s, pl.d, pl.w);
      pl.figure.place(wpos.x, wpos.z, facingFromTheta(s, pl.theta));
      this.onDrag?.(pl);
    });
    const end = () => {
      if (drag?.kind === 'player') {
        this.controls.enabled = drag.controls;
        this.onDragEnd?.(drag.player);
      }
      drag = null;
      this.canvas.classList.remove('dragging');
    };
    this.canvas.addEventListener('pointerup', end);
    this.canvas.addEventListener('pointercancel', end);
    this.canvas.addEventListener('dblclick', () => { this.look.yaw = 0; this.look.pitch = 0; });
  }

  nudgeLook(dyaw, dpitch) {
    this.look.yaw = Math.max(-1.1, Math.min(1.1, this.look.yaw + dyaw));
    this.look.pitch = Math.max(-0.5, Math.min(0.4, this.look.pitch + dpitch));
  }

  onTick(fn) { this.tickers.add(fn); return () => this.tickers.delete(fn); }

  // ---------- ciclo ----------
  frame() {
    const dt = Math.min(0.05, this.clock.getDelta());
    this.time += dt;
    for (const fn of this.tickers) fn(dt, this.time);
    for (const list of this.figures) for (const f of list) if (f.group.visible) {
      f.update(dt, this.time);
      if (f.baseY) f.group.position.y = f.baseY;
    }
    if (this.refs) for (const r of Object.values(this.refs)) {
      if (!r.group.visible) continue;
      r.update(dt, this.time);
      if (r.baseY) r.group.position.y = r.baseY;
      // gli arbitri guardano la squadra in ricezione
      const tx = this.side * 4.5 - r.pos.x, tz = -r.pos.y;
      r.targetFacing = Math.atan2(tx, tz);
    }
    this.updateBall(dt);
    this.updateCamera(dt);

    const { w, h } = this.size;
    this.renderer.setViewport(0, 0, w, h);
    this.renderer.setScissorTest(false);
    this.renderer.render(this.scene, this.camera);

    const showPip = this.pip.enabled && this.pip.visible && this.server && (this.view === 'r1' || this.view === 'r2');
    this.pipFrame.style.display = showPip ? 'block' : 'none';
    if (showPip) {
      const pw = Math.round(Math.min(300, w * 0.26)), ph = Math.round(pw * 0.62);
      const px = 16, py = h - ph - 16;
      Object.assign(this.pipFrame.style, { left: px + 'px', top: py + 'px', width: pw + 'px', height: ph + 'px' });
      const sp = this.server.group.position;
      this.pipCamera.position.copy(this.camera.position);
      this.pipCamera.aspect = pw / ph;
      this.pipCamera.updateProjectionMatrix();
      this.pipCamera.lookAt(sp.x, 1.6, sp.z);
      this.renderer.setScissorTest(true);
      this.renderer.setScissor(px, h - py - ph, pw, ph);
      this.renderer.setViewport(px, h - py - ph, pw, ph);
      this.renderer.render(this.scene, this.pipCamera);
      this.renderer.setScissorTest(false);
    }
  }
}

export { CONSTRAINTS };
