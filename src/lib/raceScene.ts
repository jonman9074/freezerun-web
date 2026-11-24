import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import type { GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { clone as skeletonClone } from 'three/examples/jsm/utils/SkeletonUtils.js';
import type { AnimationMixer } from 'three';

export interface Racer {
  num: number;
  nameAm: string;
  nameEn: string;
  color: number;
}

export const RACERS: Racer[] = [
  { num: 1, nameAm: 'አንበጣ', nameEn: 'Blizzard', color: 0x22d3ee },
  { num: 2, nameAm: 'ኃይል', nameEn: 'Tornado', color: 0xf59e0b },
  { num: 3, nameAm: 'ጀግና', nameEn: 'Comet', color: 0x34d399 },
  { num: 4, nameAm: 'ላባ', nameEn: 'Flame', color: 0xf43f5e },
];

const LANE_W = 2.5;
const RX = 20;
const RZ = 32;
const DUST_N = 200;

const DERBY_URL =
  'https://raw.githubusercontent.com/jonman9074/freezerun-assets/main/red_horse_rider.glb';

// ---------- Amharic-Only Announcer & Race Audio Engine ----------
class RaceAudioEngine {
  private ctx: AudioContext | null = null;
  private muted = false;
  private hoofTimer = 0;

  private ensureCtx(): AudioContext | null {
    if (this.muted) return null;
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  public setMuted(m: boolean) {
    this.muted = m;
    if (m && typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
  }

  public isMuted(): boolean {
    return this.muted;
  }

  // Speaks strictly in Amharic (am-ET). Never falls back to English speech.
  public speakAmharic(text: string, rate = 1.0) {
    if (this.muted || typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    try {
      const voices = window.speechSynthesis.getVoices();
      const amVoice = voices.find((v) => v.lang.toLowerCase().startsWith('am'));
      if (!amVoice) {
        return;
      }
      window.speechSynthesis.cancel();
      const utter = new SpeechSynthesisUtterance(text);
      utter.lang = 'am-ET';
      utter.voice = amVoice;
      utter.rate = rate;
      utter.pitch = 1.02;
      window.speechSynthesis.speak(utter);
    } catch {
      // ignore if speech synthesis is unavailable
    }
  }

  public playStartSignal() {
    const ctx = this.ensureCtx();
    if (!ctx) return;
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(520, now);
    osc.frequency.exponentialRampToValueAtTime(780, now + 0.12);
    osc.frequency.exponentialRampToValueAtTime(440, now + 0.45);
    gain.gain.setValueAtTime(0.18, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.48);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.5);

    this.playCrowdCheer(0.12, 1.4);
  }

  public playCrowdCheer(volume = 0.08, duration = 1.8) {
    const ctx = this.ensureCtx();
    if (!ctx) return;
    const bufferSize = Math.floor(ctx.sampleRate * duration);
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.sin((i / bufferSize) * Math.PI);
    }
    const noise = ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 950;
    filter.Q.value = 0.7;

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(volume, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    noise.start();
  }

  public tickMovementSound(dt: number, mode: 'run' | 'derby') {
    if (this.muted) return;
    this.hoofTimer -= dt;
    if (this.hoofTimer > 0) return;
    this.hoofTimer = mode === 'derby' ? 0.14 : 0.2;

    const ctx = this.ensureCtx();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = mode === 'derby' ? 'triangle' : 'sine';
    const baseFreq = mode === 'derby' ? 120 + Math.random() * 35 : 160 + Math.random() * 25;
    osc.frequency.setValueAtTime(baseFreq, now);
    osc.frequency.exponentialRampToValueAtTime(42, now + 0.07);

    gain.gain.setValueAtTime(mode === 'derby' ? 0.09 : 0.05, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.075);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.08);
  }

  public announceReady(mode: 'run' | 'derby') {
    const sportAm = mode === 'derby' ? 'የፈረስ ግልቢያ ውድድር' : 'የፍሪዝ ሩጫ ውድድር';
    this.speakAmharic(`${sportAm} ሊጀምር ነው። ተወዳዳሪዎች ተዘጋጁ።`);
  }

  public announceStart() {
    this.playStartSignal();
    this.speakAmharic('ውድድሩ ተጀምሯል። ሩጫ ቀጥሏል።');
  }

  public announceFinish(winner?: Racer) {
    this.playCrowdCheer(0.16, 2.2);
    if (winner) {
      this.speakAmharic(`ውድድሩ ተጠናቋል። ቁጥር ${winner.num} ${winner.nameAm} አሸንፏል።`);
    } else {
      this.speakAmharic('ውድድሩ ተጠናቋል።');
    }
  }

  public dispose() {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    if (this.ctx) {
      this.ctx.close().catch(() => {});
      this.ctx = null;
    }
  }
}

function laneOffset(i: number) {
  return -1.5 * LANE_W + i * LANE_W;
}

// point on the oval for lane offset `off` at lap fraction t (0..1)
function pathPoint(t: number, off: number) {
  const th = t * Math.PI * 2;
  return {
    x: (RX + off) * Math.sin(th),
    z: (RZ + off) * Math.cos(th),
    tx: (RX + off) * Math.cos(th),
    tz: -(RZ + off) * Math.sin(th),
  };
}

function hex(color: number) {
  return `#${color.toString(16).padStart(6, '0')}`;
}

function jerseyTexture(num: number, color: number, mirror: boolean): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = hex(color);
  ctx.fillRect(0, 0, 256, 256);

  ctx.fillStyle = 'rgba(255,255,255,0.18)';
  for (let y = 18; y < 256; y += 44) {
    ctx.fillRect(0, y, 256, 10);
  }

  ctx.fillStyle = 'rgba(15, 23, 42, 0.35)';
  ctx.beginPath();
  ctx.roundRect(38, 42, 180, 172, 22);
  ctx.fill();

  ctx.save();
  if (mirror) {
    ctx.translate(256, 0);
    ctx.scale(-1, 1);
  }
  ctx.font = '900 156px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.lineWidth = 16;
  ctx.strokeStyle = '#0f172a';
  ctx.strokeText(String(num), 128, 134);
  ctx.fillStyle = '#ffffff';
  ctx.fillText(String(num), 128, 134);
  ctx.restore();

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

// ---------- Freeze Run: articulated human sprinter ----------
interface RunnerRig {
  hipL: THREE.Group;
  hipR: THREE.Group;
  kneeL: THREE.Group;
  kneeR: THREE.Group;
  shL: THREE.Group;
  shR: THREE.Group;
  elL: THREE.Group;
  elR: THREE.Group;
  rig: THREE.Group;
}

const SKIN_TONES = [0xf1c27d, 0xa1665e, 0x8d5524, 0xffdbac];

function buildRunner(r: Racer, i: number): { root: THREE.Group; parts: RunnerRig } {
  const root = new THREE.Group();
  const rig = new THREE.Group();
  root.add(rig);

  const skin = new THREE.MeshStandardMaterial({
    color: SKIN_TONES[i % SKIN_TONES.length],
    roughness: 0.68,
  });
  const jerseySide = new THREE.MeshStandardMaterial({ color: r.color, roughness: 0.55 });
  const jerseyFront = new THREE.MeshStandardMaterial({
    map: jerseyTexture(r.num, r.color, false),
    roughness: 0.55,
  });
  const jerseyBack = new THREE.MeshStandardMaterial({
    map: jerseyTexture(r.num, r.color, false),
    roughness: 0.55,
  });
  const shortsMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.7 });
  const shoeMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.45 });

  const hips: Record<string, THREE.Group> = {};
  const knees: Record<string, THREE.Group> = {};
  (['L', 'R'] as const).forEach((side, si) => {
    const s = si === 0 ? -1 : 1;
    const hip = new THREE.Group();
    hip.position.set(s * 0.17, 1.02, 0);
    const thigh = new THREE.Mesh(new THREE.CapsuleGeometry(0.095, 0.34, 6, 12), skin);
    thigh.position.y = -0.25;
    const knee = new THREE.Group();
    knee.position.y = -0.5;
    const shin = new THREE.Mesh(new THREE.CapsuleGeometry(0.075, 0.34, 6, 12), skin);
    shin.position.y = -0.24;
    const shoe = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.1, 0.3), shoeMat);
    shoe.position.set(0, -0.5, -0.06);
    knee.add(shin, shoe);
    hip.add(thigh, knee);
    rig.add(hip);
    hips[`hip${side}`] = hip;
    knees[`knee${side}`] = knee;
  });

  const torso = new THREE.Mesh(
    new THREE.BoxGeometry(0.58, 0.74, 0.32),
    [jerseySide, jerseySide, jerseySide, jerseySide, jerseyBack, jerseyFront]
  );
  torso.position.y = 1.66;
  torso.castShadow = true;
  rig.add(torso);

  const shorts = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.3, 0.34), shortsMat);
  shorts.position.y = 1.14;
  rig.add(shorts);

  const head = new THREE.Mesh(new THREE.SphereGeometry(0.17, 20, 20), skin);
  head.position.y = 2.24;
  rig.add(head);
  const hair = new THREE.Mesh(
    new THREE.SphereGeometry(0.175, 20, 20, 0, Math.PI * 2, 0, Math.PI / 2),
    new THREE.MeshStandardMaterial({ color: 0x1c1917, roughness: 0.9 })
  );
  hair.position.y = 2.26;
  rig.add(hair);

  const shoulders: Record<string, THREE.Group> = {};
  const elbows: Record<string, THREE.Group> = {};
  (['L', 'R'] as const).forEach((side, si) => {
    const s = si === 0 ? -1 : 1;
    const sh = new THREE.Group();
    sh.position.set(s * 0.36, 1.92, 0);
    const upper = new THREE.Mesh(new THREE.CapsuleGeometry(0.065, 0.26, 6, 12), jerseySide);
    upper.position.y = -0.19;
    const elbow = new THREE.Group();
    elbow.position.y = -0.4;
    const fore = new THREE.Mesh(new THREE.CapsuleGeometry(0.055, 0.24, 6, 12), skin);
    fore.position.y = -0.17;
    elbow.add(fore);
    sh.add(upper, elbow);
    rig.add(sh);
    shoulders[`sh${side}`] = sh;
    elbows[`el${side}`] = elbow;
  });

  const parts: RunnerRig = {
    hipL: hips.hipL,
    hipR: hips.hipR,
    kneeL: knees.kneeL,
    kneeR: knees.kneeR,
    shL: shoulders.shL,
    shR: shoulders.shR,
    elL: elbows.elL,
    elR: elbows.elR,
    rig,
  };
  return { root, parts };
}

function poseRunnerSprint(parts: RunnerRig, phase: number) {
  const s = Math.sin(phase);
  const c = Math.sin(phase + Math.PI);
  parts.hipL.rotation.x = s * 1.25 - 0.3;
  parts.hipR.rotation.x = c * 1.25 - 0.3;
  parts.kneeL.rotation.x = Math.max(0, -s) * 1.95 + 0.15;
  parts.kneeR.rotation.x = Math.max(0, -c) * 1.95 + 0.15;
  parts.shL.rotation.x = c * 1.15;
  parts.shR.rotation.x = s * 1.15;
  parts.elL.rotation.x = -1.35 - Math.max(0, c) * 0.35;
  parts.elR.rotation.x = -1.35 - Math.max(0, s) * 0.35;
  parts.rig.rotation.x = 0.26;
  parts.rig.position.y = Math.abs(Math.sin(phase)) * 0.12;
}

function poseRunnerIdle(parts: RunnerRig) {
  [parts.hipL, parts.hipR, parts.kneeL, parts.kneeR].forEach((g) => (g.rotation.x = 0));
  parts.shL.rotation.x = 0;
  parts.shR.rotation.x = 0;
  parts.elL.rotation.x = -0.25;
  parts.elR.rotation.x = -0.25;
  parts.rig.rotation.x = 0;
  parts.rig.position.y = 0;
}

// ---------- Horse + Jockey Gallop Rig ----------
interface HorseGallopRig {
  rig: THREE.Object3D;
  legNodes: { obj: THREE.Object3D; baseRotX: number; side: number; end: number }[];
  headNodes: { obj: THREE.Object3D; baseRotX: number }[];
  jockeyNodes: { obj: THREE.Object3D; baseRotX: number }[];
}

function createHorseGallopRig(model: THREE.Object3D): HorseGallopRig {
  const legNodes: { obj: THREE.Object3D; baseRotX: number; side: number; end: number }[] = [];
  const headNodes: { obj: THREE.Object3D; baseRotX: number }[] = [];
  const jockeyNodes: { obj: THREE.Object3D; baseRotX: number }[] = [];

  model.traverse((obj) => {
    const n = obj.name.toLowerCase();
    if (
      n.includes('leg') ||
      n.includes('foot') ||
      n.includes('hoof') ||
      n.includes('thigh') ||
      n.includes('shin') ||
      n.includes('limb') ||
      n.includes('front') ||
      n.includes('hind') ||
      n.includes('rear')
    ) {
      const isBack = n.includes('back') || n.includes('hind') || n.includes('rear') || obj.position.z > 0;
      const isRight = n.includes('right') || n.includes('_r') || obj.position.x > 0;
      legNodes.push({
        obj,
        baseRotX: obj.rotation.x,
        side: isRight ? 1 : -1,
        end: isBack ? 1 : -1,
      });
    } else if (n.includes('head') || n.includes('neck')) {
      headNodes.push({ obj, baseRotX: obj.rotation.x });
    } else if (n.includes('jockey') || n.includes('rider') || n.includes('torso') || n.includes('spine')) {
      jockeyNodes.push({ obj, baseRotX: obj.rotation.x });
    }
  });

  return { rig: model, legNodes, headNodes, jockeyNodes };
}

function applyHorseGallop(hRig: HorseGallopRig, time: number, racing: boolean) {
  if (!racing) {
    hRig.rig.position.y = 0;
    hRig.rig.rotation.x = 0;
    hRig.rig.rotation.z = 0;
    hRig.legNodes.forEach((l) => {
      l.obj.rotation.x = l.baseRotX;
    });
    hRig.headNodes.forEach((h) => {
      h.obj.rotation.x = h.baseRotX;
    });
    hRig.jockeyNodes.forEach((j) => {
      j.obj.rotation.x = j.baseRotX;
    });
    return;
  }

  const cycle = time * 14.0;
  const bounce = Math.abs(Math.sin(cycle)) * 0.22;
  hRig.rig.position.y = bounce;
  hRig.rig.rotation.x = Math.sin(cycle) * 0.14;
  hRig.rig.rotation.z = Math.cos(cycle * 0.5) * 0.06;

  hRig.legNodes.forEach((l) => {
    const phase = cycle + l.end * 1.25 + l.side * 0.5;
    l.obj.rotation.x = l.baseRotX + Math.sin(phase) * 0.72;
  });

  hRig.headNodes.forEach((h) => {
    h.obj.rotation.x = h.baseRotX + Math.sin(cycle + 0.8) * 0.24;
  });

  hRig.jockeyNodes.forEach((j) => {
    j.obj.rotation.x = j.baseRotX + Math.cos(cycle) * 0.18;
  });
}

// ---------- shared stadium pieces ----------
function ellipseCurve(off: number, y: number): THREE.CatmullRomCurve3 {
  const pts: THREE.Vector3[] = [];
  for (let k = 0; k < 96; k++) {
    const th = (k / 96) * Math.PI * 2;
    pts.push(new THREE.Vector3((RX + off) * Math.sin(th), y, (RZ + off) * Math.cos(th)));
  }
  return new THREE.CatmullRomCurve3(pts, true);
}

function ringMesh(off: number, thickness: number, mat: THREE.Material): THREE.Mesh {
  const g = new THREE.RingGeometry(RX + off - thickness / 2, RX + off + thickness / 2, 128);
  g.rotateX(-Math.PI / 2);
  const m = new THREE.Mesh(g, mat);
  m.scale.z = RZ / RX;
  return m;
}

function addGrandstands(scene: THREE.Scene, count: number, isIce: boolean) {
  const tierMat = new THREE.MeshStandardMaterial({ color: 0x64748b, roughness: 0.85 });
  const seatMat = new THREE.MeshStandardMaterial({ color: isIce ? 0x1e40af : 0x991b1b, roughness: 0.75 });
  const roofMat = new THREE.MeshStandardMaterial({ color: isIce ? 0x0284c7 : 0xd97706, roughness: 0.55 });
  const crowdColors = [0xf8fafc, 0xfbbf24, 0x38bdf8, 0xf87171, 0x4ade80];

  for (let k = 0; k < count; k++) {
    const t = k / count;
    const p = pathPoint(t, 12.2);
    const tan = new THREE.Vector3(p.tx, 0, p.tz).normalize();
    const stand = new THREE.Group();

    for (let tier = 0; tier < 3; tier++) {
      const step = new THREE.Mesh(new THREE.BoxGeometry(14.5, 1.3, 2.1), tierMat);
      step.position.set(0, 0.65 + tier * 1.25, 1.8 - tier * 1.55);
      const seatRow = new THREE.Mesh(new THREE.BoxGeometry(14.1, 0.35, 0.8), seatMat);
      seatRow.position.set(0, 1.45 + tier * 1.25, 1.8 - tier * 1.55);
      stand.add(step, seatRow);

      for (let s = -6; s <= 6; s += 2) {
        const specMat = new THREE.MeshStandardMaterial({
          color: crowdColors[(k + tier + Math.abs(s)) % crowdColors.length],
          roughness: 0.8,
        });
        const spectator = new THREE.Mesh(new THREE.CapsuleGeometry(0.22, 0.45, 4, 8), specMat);
        spectator.position.set(s, 1.95 + tier * 1.25, 1.8 - tier * 1.55);
        stand.add(spectator);
      }
    }

    const roof = new THREE.Mesh(new THREE.BoxGeometry(15.2, 0.35, 6.6), roofMat);
    roof.position.set(0, 5.8, 0.2);
    roof.rotation.x = -0.08;
    stand.add(roof);

    stand.position.set(p.x, 0, p.z);
    stand.rotation.y = Math.atan2(-tan.z, tan.x);
    scene.add(stand);
  }
}

function addFloodlights(scene: THREE.Scene, count: number) {
  const poleMat = new THREE.MeshStandardMaterial({ color: 0xcbd5e1, roughness: 0.5, metalness: 0.6 });
  const lampMat = new THREE.MeshStandardMaterial({
    color: 0xf8fafc,
    emissive: 0xffffff,
    emissiveIntensity: 1.5,
  });
  for (let k = 0; k < count; k++) {
    const p = pathPoint(k / count, 10.8);
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.24, 13.5, 8), poleMat);
    pole.position.set(p.x, 6.75, p.z);
    const head = new THREE.Group();
    head.position.set(p.x, 13.8, p.z);
    head.lookAt(0, 6, 0);
    const panel = new THREE.Mesh(new THREE.BoxGeometry(2.8, 1.4, 0.25), lampMat);
    head.add(panel);
    scene.add(pole, head);
  }
}

export function initRaceScene(
  mount: HTMLDivElement,
  mode: 'run' | 'derby'
): {
  dispose: () => void;
  onLoad: (cb: () => void) => void;
  setProgress: (i: number, frac: number) => void;
  followLeader: (frac: number) => void;
  setRacing: (racing: boolean) => void;
  setMuted: (muted: boolean) => void;
  announceWinner: (winnerNum?: number) => void;
} {
  const scene = new THREE.Scene();
  const isIce = mode === 'run';
  scene.background = new THREE.Color(isIce ? 0x0b1628 : 0x87b7e8);
  scene.fog = new THREE.Fog(isIce ? 0x0b1628 : 0x87b7e8, 65, 175);

  const camera = new THREE.PerspectiveCamera(
    55,
    mount.clientWidth / mount.clientHeight,
    0.1,
    400
  );
  camera.position.set(0, 20, RZ + 20);
  camera.lookAt(0, 0, 0);

  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(mount.clientWidth, mount.clientHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  mount.appendChild(renderer.domElement);

  const audio = new RaceAudioEngine();

  scene.add(new THREE.HemisphereLight(0xffffff, isIce ? 0x223344 : 0x5a7d4a, 1.2));
  const sun = new THREE.DirectionalLight(isIce ? 0xcfe8ff : 0xfff1d6, 1.8);
  sun.position.set(30, 45, 25);
  sun.castShadow = true;
  scene.add(sun);
  const fill = new THREE.DirectionalLight(0x88bbff, 0.45);
  fill.position.set(-20, 25, -35);
  scene.add(fill);

  // ---- ground + stadium track ----
  const grass = new THREE.Mesh(
    new THREE.CircleGeometry(Math.max(RX, RZ) * 1.8, 64),
    new THREE.MeshStandardMaterial({ color: isIce ? 0x1e3a5f : 0x3f7d3a, roughness: 1 })
  );
  grass.rotation.x = -Math.PI / 2;
  scene.add(grass);

  const trackMat = new THREE.MeshStandardMaterial({
    color: isIce ? 0x1d6ef0 : 0x8a5a33,
    roughness: isIce ? 0.45 : 0.92,
  });
  const track = ringMesh(0, 5 * LANE_W, trackMat);
  track.position.y = 0.02;
  track.receiveShadow = true;
  scene.add(track);

  if (isIce) {
    const redMat = new THREE.MeshStandardMaterial({ color: 0xd9480f, roughness: 0.7 });
    const border1 = ringMesh(2.5 * LANE_W, 0.55, redMat);
    const border2 = ringMesh(-2.5 * LANE_W, 0.55, redMat);
    border1.position.y = 0.03;
    border2.position.y = 0.03;
    const lineMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    [-1.5, -0.5, 0.5, 1.5].forEach((b) => {
      const line = ringMesh(b * LANE_W, 0.12, lineMat);
      line.position.y = 0.04;
      scene.add(line);
    });
    scene.add(border1, border2);
  } else {
    const railMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.4 });
    [-5 + 0.2, 5 - 0.2].forEach((off) => {
      const rail = new THREE.Mesh(
        new THREE.TubeGeometry(ellipseCurve(off, 1), 220, 0.08, 6, true),
        railMat
      );
      scene.add(rail);
      for (let k = 0; k < 44; k++) {
        const p = pathPoint(k / 44, off);
        const post = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 1, 6), railMat);
        post.position.set(p.x, 0.5, p.z);
        scene.add(post);
      }
    });
  }

  // infield
  const infield = new THREE.Mesh(
    new THREE.CircleGeometry(1, 64),
    new THREE.MeshStandardMaterial({ color: isIce ? 0x2b6cb0 : 0x4a9440, roughness: 1 })
  );
  infield.scale.set(RX - 5 * LANE_W, RZ - 5 * LANE_W, 1);
  infield.rotation.x = -Math.PI / 2;
  infield.position.y = 0.03;
  scene.add(infield);

  // finish line + arch
  const finishLine = new THREE.Mesh(
    new THREE.PlaneGeometry(1.5, 5 * LANE_W),
    new THREE.MeshBasicMaterial({ color: 0xffffff })
  );
  finishLine.rotation.x = -Math.PI / 2;
  finishLine.rotation.z = Math.PI / 2;
  finishLine.position.set(0, 0.05, RZ);
  scene.add(finishLine);

  const archMat = new THREE.MeshStandardMaterial({ color: 0x0ea5e9, roughness: 0.5 });
  const archSpan = 5 * LANE_W + 3;
  [-1, 1].forEach((s) => {
    const pillar = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.45, 8, 10), archMat);
    pillar.position.set(0, 4, RZ + (s * archSpan) / 2);
    scene.add(pillar);
  });
  const bannerCanvas = document.createElement('canvas');
  bannerCanvas.width = 512;
  bannerCanvas.height = 96;
  const bctx = bannerCanvas.getContext('2d')!;
  bctx.fillStyle = '#0ea5e9';
  bctx.fillRect(0, 0, 512, 96);
  bctx.fillStyle = '#ffffff';
  bctx.font = 'bold 58px sans-serif';
  bctx.textAlign = 'center';
  bctx.textBaseline = 'middle';
  bctx.fillText('ፍኒሽ · FINISH', 256, 52);
  const bannerTex = new THREE.CanvasTexture(bannerCanvas);
  bannerTex.colorSpace = THREE.SRGBColorSpace;
  const banner = new THREE.Mesh(
    new THREE.BoxGeometry(archSpan, 1.6, 0.25),
    new THREE.MeshBasicMaterial({ map: bannerTex })
  );
  banner.position.set(0, 7.4, RZ);
  scene.add(banner);

  addGrandstands(scene, 10, isIce);
  addFloodlights(scene, isIce ? 6 : 4);

  // ---------- racers ----------
  const roots: THREE.Group[] = [];
  const runnerRigs: (RunnerRig | null)[] = [];
  const horseRigs: (HorseGallopRig | null)[] = [];
  const mixers: AnimationMixer[] = [];
  let racing = false;

  const statusBadge = document.createElement('div');
  statusBadge.style.cssText =
    'position:absolute;top:4rem;left:0.75rem;z-index:5;max-width:calc(100% - 1.5rem);' +
    'padding:4px 10px;border-radius:8px;background:rgba(15,23,42,0.85);color:#fca5a5;' +
    'font:12px/1.4 ui-monospace,monospace;border:1px solid rgba(248,113,113,0.4);' +
    'pointer-events:none;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;display:none';
  mount.appendChild(statusBadge);
  function showStatus(msg: string) {
    console.error(`[raceScene] ${msg}`);
    statusBadge.textContent = msg;
    statusBadge.style.display = 'block';
  }

  let loadCallbacks: (() => void)[] = [];
  function onLoad(cb: () => void) {
    if (roots.length === RACERS.length) cb();
    else loadCallbacks.push(cb);
  }
  function notifyLoaded() {
    loadCallbacks.forEach((cb) => cb());
    loadCallbacks = [];
  }

  function addRacerRoot(_r: Racer, i: number, model: THREE.Object3D): { root: THREE.Group; rig: THREE.Group } {
    const root = new THREE.Group();
    const rig = new THREE.Group();
    root.add(rig);
    rig.add(model);
    scene.add(root);
    roots[i] = root;
    setProgress(i, 0);
    return { root, rig };
  }

  function buildHorseFromGLTF(gltf: GLTF) {
    const template = gltf.scene;
    const box = new THREE.Box3().setFromObject(template);
    const size = box.getSize(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z) || 1;
    template.scale.setScalar(2.9 / maxDim);

    const box2 = new THREE.Box3().setFromObject(template);
    const center = box2.getCenter(new THREE.Vector3());
    const h = box2.max.y - box2.min.y;
    template.position.x -= center.x;
    template.position.z -= center.z;
    template.position.y -= box2.min.y;
    // Face forward along the track direction (-Z in local space matches atan2(-p.tx, -p.tz))
    template.rotation.y = 0;

    const clips = gltf.animations ?? [];
    const bibSize = Math.max(0.36, h * 0.24);
    const chestY = h * 0.68;
    const d = box2.max.z - box2.min.z;

    RACERS.forEach((r, i) => {
      const clone = skeletonClone(template);
      clone.traverse((obj) => {
        const mesh = obj as THREE.Mesh;
        if (mesh.isMesh) {
          mesh.castShadow = true;
          mesh.receiveShadow = true;
        }
      });

      const bibF = new THREE.Mesh(
        new THREE.PlaneGeometry(bibSize, bibSize),
        new THREE.MeshStandardMaterial({
          map: jerseyTexture(r.num, r.color, false),
          roughness: 0.55,
        })
      );
      bibF.position.set(0, chestY, -d * 0.16);
      bibF.rotation.y = Math.PI;

      const bibB = new THREE.Mesh(
        new THREE.PlaneGeometry(bibSize, bibSize),
        new THREE.MeshStandardMaterial({
          map: jerseyTexture(r.num, r.color, false),
          roughness: 0.55,
        })
      );
      bibB.position.set(0, chestY, d * 0.18);
      clone.add(bibF, bibB);

      const { rig } = addRacerRoot(r, i, clone);
      rig.userData.horse = true;
      horseRigs[i] = createHorseGallopRig(clone);

      if (clips.length > 0) {
        const mixer = new THREE.AnimationMixer(clone);
        const action = mixer.clipAction(clips[0]);
        action.timeScale = 1.6;
        action.play();
        mixers.push(mixer);
      }
    });
    statusBadge.style.display = 'none';
    notifyLoaded();
  }

  function buildHorseFallback() {
    showStatus('GLB load error: using capsule markers');
    RACERS.forEach((r, i) => {
      const body = new THREE.Mesh(
        new THREE.CapsuleGeometry(0.45, 1.6, 8, 16),
        new THREE.MeshStandardMaterial({ color: r.color, roughness: 0.4 })
      );
      body.position.y = 1.4;
      addRacerRoot(r, i, body);
    });
    notifyLoaded();
  }

  function parseBuffer(buffer: ArrayBuffer) {
    const loader = new GLTFLoader();
    try {
      loader.parse(
        buffer,
        '',
        (gltf: GLTF) => buildHorseFromGLTF(gltf),
        (err: unknown) => {
          showStatus(
            `GLB parse error (fetch fallback): ${
              err instanceof Error ? err.message : String(err)
            }`
          );
          buildHorseFallback();
        }
      );
    } catch (err) {
      showStatus(`GLB parse exception: ${err instanceof Error ? err.message : String(err)}`);
      buildHorseFallback();
    }
  }

  if (mode === 'derby') {
    const loader = new GLTFLoader();
    loader.crossOrigin = 'anonymous';
    loader.load(
      DERBY_URL,
      (gltf: GLTF) => buildHorseFromGLTF(gltf),
      undefined,
      (err: unknown) => {
        const detail =
          err instanceof Error
            ? err.message
            : err && typeof err === 'object' && 'status' in err
              ? `HTTP status ${(err as { status: number }).status}`
              : String(err);
        console.error(`[raceScene] GLTFLoader.load failed for ${DERBY_URL}:`, err);
        showStatus(`GLB load error: ${detail} — retrying via fetch...`);
        fetch(DERBY_URL, { mode: 'cors' })
          .then((res) => {
            if (!res.ok) throw new Error(`HTTP status ${res.status} ${res.statusText}`);
            return res.arrayBuffer();
          })
          .then(parseBuffer)
          .catch((fetchErr: unknown) => {
            showStatus(
              `GLB load error: ${detail} · fetch fallback failed: ${
                fetchErr instanceof Error ? fetchErr.message : String(fetchErr)
              }`
            );
            buildHorseFallback();
          });
      }
    );
  } else {
    RACERS.forEach((r, i) => {
      const { root, parts } = buildRunner(r, i);
      runnerRigs[i] = parts;
      scene.add(root);
      roots[i] = root;
      setProgress(i, 0);
    });
    notifyLoaded();
  }

  audio.announceReady(mode);

  // ---------- dust / snow particles ----------
  const dustGeo = new THREE.BufferGeometry();
  const dustPos = new Float32Array(DUST_N * 3).fill(-100);
  dustGeo.setAttribute('position', new THREE.BufferAttribute(dustPos, 3));
  const dustMat = new THREE.PointsMaterial({
    color: isIce ? 0xe0f2fe : 0xd2b48c,
    size: 0.38,
    transparent: true,
    opacity: 0.55,
    depthWrite: false,
  });
  const dust = new THREE.Points(dustGeo, dustMat);
  scene.add(dust);
  const dustData = Array.from({ length: DUST_N }, () => ({ life: 0, vx: 0, vy: 0, vz: 0 }));
  let dustCursor = 0;
  function spawnDust(x: number, z: number) {
    const k = dustCursor;
    dustCursor = (dustCursor + 1) % DUST_N;
    dustPos[k * 3] = x + (Math.random() - 0.5) * 0.8;
    dustPos[k * 3 + 1] = 0.1;
    dustPos[k * 3 + 2] = z + (Math.random() - 0.5) * 0.8;
    dustData[k] = {
      life: 0.6 + Math.random() * 0.4,
      vx: (Math.random() - 0.5) * 0.6,
      vy: 0.8 + Math.random() * 0.8,
      vz: (Math.random() - 0.5) * 0.6,
    };
  }

  // ---------- public API ----------
  function setProgress(i: number, frac: number) {
    const root = roots[i];
    if (!root) return;
    const off = laneOffset(i);
    const p = pathPoint(frac, off);
    root.position.set(p.x, 0, p.z);
    root.rotation.y = Math.atan2(-p.tx, -p.tz);
  }

  function followLeader(frac: number) {
    const p = pathPoint(frac, 0);
    const tan = new THREE.Vector3(p.tx, 0, p.tz).normalize();
    const target = new THREE.Vector3(p.x - tan.x * 13, 10, p.z - tan.z * 13);
    camera.position.lerp(target, 0.06);
    camera.lookAt(p.x + tan.x * 10, 1, p.z + tan.z * 10);
  }

  function setRacing(v: boolean) {
    const wasRacing = racing;
    racing = v;
    if (!wasRacing && v) {
      audio.announceStart();
    }
  }

  function setMuted(m: boolean) {
    audio.setMuted(m);
  }

  function announceWinner(winnerNum?: number) {
    const winner = RACERS.find((r) => r.num === winnerNum);
    audio.announceFinish(winner);
  }

  // ---------- loop ----------
  let raf = 0;
  const clock = new THREE.Clock();
  function animate() {
    raf = requestAnimationFrame(animate);
    const dt = clock.getDelta();
    const t = clock.getElapsedTime();
    mixers.forEach((m) => m.update(dt));

    if (racing) {
      audio.tickMovementSound(dt, mode);
    }

    runnerRigs.forEach((parts, i) => {
      if (!parts) return;
      if (racing) poseRunnerSprint(parts, t * 14 + i * 2.1);
      else poseRunnerIdle(parts);
    });

    roots.forEach((root, i) => {
      const hRig = horseRigs[i];
      if (hRig) {
        applyHorseGallop(hRig, t + i * 0.7, racing);
      } else {
        const rig = root.children[0];
        if (rig?.userData.horse) {
          rig.position.y = racing ? Math.abs(Math.sin(t * 12 + i * 1.9)) * 0.18 : 0;
          rig.rotation.z = racing ? Math.sin(t * 12 + i * 1.9) * 0.06 : 0;
        }
      }
      if (racing && i % 2 === 0) {
        spawnDust(root.position.x, root.position.z);
      }
    });

    for (let k = 0; k < DUST_N; k++) {
      if (dustData[k].life > 0) {
        dustData[k].life -= dt;
        dustPos[k * 3] += dustData[k].vx * dt;
        dustPos[k * 3 + 1] += dustData[k].vy * dt;
        dustPos[k * 3 + 2] += dustData[k].vz * dt;
        if (dustData[k].life <= 0) dustPos[k * 3 + 1] = -100;
      }
    }
    dustGeo.attributes.position.needsUpdate = true;

    renderer.render(scene, camera);
  }
  animate();

  function onResize() {
    if (!mount.clientWidth) return;
    camera.aspect = mount.clientWidth / mount.clientHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(mount.clientWidth, mount.clientHeight);
  }
  window.addEventListener('resize', onResize);

  return {
    dispose() {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', onResize);
      audio.dispose();
      renderer.dispose();
      if (renderer.domElement.parentElement === mount) {
        mount.removeChild(renderer.domElement);
      }
      statusBadge.remove();
    },
    onLoad,
    setProgress,
    followLeader,
    setRacing,
    setMuted,
    announceWinner,
  };
}
