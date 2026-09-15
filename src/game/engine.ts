import * as THREE from "three";
import {
  CAM_BLEND,
  FALL_MAX,
  GRAVITY_DOWN,
  GRAVITY_UP,
  JUMP_V,
  LANE_SPEED,
  ROOM,
  SONG_DURATION,
  SYNC_BOOST,
  COYOTE,
} from "./config";
import { buildChart, intensityAt, sectionAt, type CamMode, type Chart } from "./chart";
import { JazzEngine } from "./audio";
import { Runner } from "./character";
import { type HatId } from "./hats";
import { GameInput, type PlayCam } from "./input";
import { clamp, expDamp, spiralTangent, spiralXZ, waveY } from "./math";
import {
  START_INVULN,
  applyHit,
  kickHits,
  needleCaught,
  needleGap,
  needleProgress,
  playerProgress,
  recoverLag,
  runWon,
  snareHits,
} from "./rules";
import { persistFromUI, useGameUI } from "./store";
import {
  GrooveRibbon,
  Obstacles,
  Tonearm,
  makeCabinet,
  makeDisc,
  makeRecordTexture,
} from "./world";

const _fwd = new THREE.Vector3();
const _right = new THREE.Vector3();
const _up = new THREE.Vector3(0, 1, 0);
const _desiredPos = new THREE.Vector3();
const _desiredLook = new THREE.Vector3();
const _look = new THREE.Vector3();
const _shake = new THREE.Vector3();

export class Game {
  readonly input = new GameInput();
  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera = new THREE.PerspectiveCamera(42, 1, 0.08, 80);
  private audio = new JazzEngine();
  private runner = new Runner();
  private ribbon = new GrooveRibbon();
  private obstacles = new Obstacles();
  private arm = new Tonearm();
  private disc: THREE.Mesh;
  private recordTex: THREE.CanvasTexture;
  private hemi: THREE.HemisphereLight;
  private bg = new THREE.Color(ROOM.intro);

  private chart: Chart = buildChart("A");
  private side: "A" | "B" = "A";
  private screen: "title" | "play" | "dead" | "won" = "title";
  private camMode: CamMode = "orbit";
  private camSwitchAt = 0;
  private orbitT = 0;

  private songT = 0;
  private lag = 0;
  private lane = 0;
  private y = 0;
  private vy = 0;
  private grounded = true;
  private coyote = 0;
  private trip = 0;
  private invuln = 0;
  private trauma = 0;
  private uiAcc = 0;
  private acc = 0;
  private lastTs = 0;
  private disposed = false;
  private dropLift = 0.55;
  private hatId: HatId = useGameUI.getState().hatId;

  constructor(private canvas: HTMLCanvasElement) {
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: false,
      powerPreference: "high-performance",
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.setClearColor(ROOM.intro, 1);

    this.scene.background = this.bg;
    this.hemi = new THREE.HemisphereLight(ROOM.intro, 0x3d2a1c, 0.9);
    this.scene.add(this.hemi);
    const dir = new THREE.DirectionalLight(0xfff1dc, 0.55);
    dir.position.set(4, 10, 6);
    this.scene.add(dir);
    const fill = new THREE.DirectionalLight(0x7ba69a, 0.2);
    fill.position.set(-6, 3, -4);
    this.scene.add(fill);

    this.scene.add(makeCabinet());
    this.recordTex = makeRecordTexture("A");
    this.disc = makeDisc(this.recordTex);
    this.scene.add(this.disc);
    this.scene.add(this.ribbon.mesh);
    this.scene.add(this.obstacles.group);
    this.scene.add(this.arm.root);
    this.scene.add(this.runner.root);

    this.ribbon.setKicks(this.chart.kicks);
    this.obstacles.rebuild(this.chart);

    this.input.attach(canvas);
    this.resize();
    window.addEventListener("resize", this.onResize);
    document.addEventListener("visibilitychange", this.onVis);

    this.runner.setHat(this.hatId);
    this.placeRunner(0, 0, 0);
    this.arm.pointAt(...spiralXZ(0, 0), 0.55);
    this.camera.position.set(7.4, 4.4, 7.4);
    this.camera.lookAt(0, 0.2, 0);
    _look.set(0, 0.2, 0);

    this.bindControlsTest();
    this.pushUI(true);
    this.lastTs = performance.now();
    this.renderer.setAnimationLoop(this.loop);

    useGameUI.setState({ ready: true });
  }

  dispose() {
    this.disposed = true;
    this.renderer.setAnimationLoop(null);
    this.input.detach();
    window.removeEventListener("resize", this.onResize);
    document.removeEventListener("visibilitychange", this.onVis);
    this.audio.stop();
    this.recordTex.dispose();
    this.renderer.dispose();
    delete window.__controlsTest;
  }

  unlockAudio() {
    this.audio.unlock();
    this.audio.setMuted(useGameUI.getState().muted);
  }

  setHat(id: HatId) {
    this.hatId = id;
    this.runner.setHat(id);
    useGameUI.setState({ hatId: id });
    persistFromUI();
  }

  setMuted(muted: boolean) {
    this.audio.setMuted(muted);
    useGameUI.setState({ muted });
    persistFromUI();
  }

  setCam(mode: PlayCam) {
    if (this.camMode === mode) return;
    this.camMode = mode;
    this.camSwitchAt = this.screen === "play" ? this.songT : this.orbitT;
    useGameUI.setState({ cam: mode });
  }

  start(side: "A" | "B") {
    this.unlockAudio();
    this.side = side;
    this.rebuildSide(side);
    this.resetRun();
    this.screen = "play";
    this.camMode = "profile";
    this.camSwitchAt = 0;
    this.dropLift = 0.55;
    this.audio.resetMusicGain();
    this.audio.start(this.chart);
    useGameUI.setState({ screen: "play", side, hint: true, cam: "profile" });
  }

  retry() {
    this.start(this.side);
  }

  toTitle() {
    this.audio.stop();
    this.audio.unlock();
    this.screen = "title";
    this.camMode = "orbit";
    this.lag = 0;
    this.songT = 0;
    this.lane = 0;
    this.y = 0;
    this.vy = 0;
    this.trip = 0;
    this.placeRunner(0, 0, 0);
    this.arm.pointAt(...spiralXZ(0, 0), 0.55);
    useGameUI.setState({ screen: "title", progress: 0, needleGap: 1, hint: false, cam: "orbit" });
  }

  private rebuildSide(side: "A" | "B") {
    this.chart = buildChart(side);
    this.ribbon.setKicks(this.chart.kicks);
    this.obstacles.rebuild(this.chart);
    this.recordTex.dispose();
    this.recordTex = makeRecordTexture(side);
    const mat = this.disc.material as THREE.MeshLambertMaterial;
    mat.map = this.recordTex;
    mat.needsUpdate = true;
  }

  private resetRun() {
    this.songT = 0;
    this.lag = 0;
    this.lane = 0;
    this.y = 0;
    this.vy = 0;
    this.grounded = true;
    this.coyote = 0;
    this.trip = 0;
    this.invuln = START_INVULN;
    this.trauma = 0;
    this.acc = 0;
    this.runner.root.rotation.set(0, 0, 0);
  }

  private onResize = () => this.resize();
  private onVis = () => {
    if (document.visibilityState === "visible") this.audio.unlock();
  };

  private resize() {
    const parent = this.canvas.parentElement ?? this.canvas;
    const w = Math.max(1, parent.clientWidth);
    const h = Math.max(1, parent.clientHeight);
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }

  private loop = (ts: number) => {
    if (this.disposed) return;
    const dt = Math.min((ts - this.lastTs) / 1000, 0.1);
    this.lastTs = ts;
    this.acc += dt;
    const FIXED = 1 / 60;
    while (this.acc >= FIXED) {
      this.fixed(FIXED);
      this.acc -= FIXED;
    }
    this.visual(dt);
    this.renderer.render(this.scene, this.camera);
  };

  private playerP() {
    return playerProgress(this.songT, this.lag);
  }

  private needleP() {
    return needleProgress(this.songT);
  }

  private fixed(dt: number) {
    this.input.tick(dt);
    if (this.screen === "play") {
      const next = this.input.consumeCam(this.playCam());
      if (next) this.setCam(next);
    }
    if (this.screen !== "play") return;

    this.audio.tick();
    this.songT = this.audio.songTime();
    if (this.songT > SONG_DURATION) this.songT = SONG_DURATION;

    const p = this.playerP();
    const t = this.songT;
    const intensity = intensityAt(t);
    const base = waveY(p, t, intensity);

    if (this.trip > 0) this.trip = Math.max(0, this.trip - dt);
    if (this.invuln > 0) this.invuln = Math.max(0, this.invuln - dt);
    if (this.lag > 0 && this.trip <= 0) this.lag = recoverLag(this.lag, this.trip, dt);

    const steer = this.input.steer();
    const targetLane = steer === 0 ? 0 : clamp(-steer, -1, 1);
    this.lane = expDamp(this.lane, targetLane, LANE_SPEED, dt);

    if (this.grounded) this.coyote = COYOTE;
    else this.coyote = Math.max(0, this.coyote - dt);

    if (this.input.consumeJump() && (this.grounded || this.coyote > 0) && this.trip <= 0.12) {
      this.vy = JUMP_V;
      this.grounded = false;
      this.coyote = 0;
      this.audio.jump();
      const nearKick = this.chart.kicks.some((kp) => Math.abs(kp - p) < 0.006);
      if (nearKick) this.lag = Math.max(0, this.lag - SYNC_BOOST);
    }

    if (!this.grounded) {
      if (!this.input.jumpHeld && this.vy > 0) this.vy *= Math.pow(0.45, dt * 60);
      const g = this.vy > 0 ? GRAVITY_UP : GRAVITY_DOWN;
      this.vy -= g * dt;
      this.vy = Math.max(-FALL_MAX, this.vy);
      this.y += this.vy * dt;
      if (this.y <= base) {
        this.y = base;
        this.vy = 0;
        this.grounded = true;
        this.audio.land();
      }
    } else {
      this.y = base;
      this.vy = 0;
    }

    this.collide(p, base);

    if (needleCaught(this.playerP(), this.needleP(), t)) this.die();
    else if (runWon(p, t)) this.win();
  }

  private collide(p: number, base: number) {
    if (this.invuln > 0 || this.screen !== "play") return;
    if (
      kickHits(p, this.y, base, this.chart.kicks) ||
      snareHits(p, this.y, this.lane, this.chart.snares)
    ) {
      this.hit();
    }
  }

  private hit() {
    if (this.invuln > 0) return;
    const next = applyHit(this.lag);
    this.lag = next.lag;
    this.trip = next.trip;
    this.invuln = next.invuln;
    this.trauma = Math.min(1, this.trauma + 0.45);
    this.audio.stumble();
  }

  private die() {
    if (this.screen !== "play") return;
    this.screen = "dead";
    this.audio.catchNeedle();
    this.trauma = 1;
    const progress = this.playerP();
    const key = this.side === "A" ? "bestA" : "bestB";
    const prev = useGameUI.getState()[key];
    const patch: Partial<ReturnType<typeof useGameUI.getState>> = {
      screen: "dead",
      progress,
      needleGap: 0,
    };
    if (progress > prev) patch[key] = progress;
    useGameUI.setState(patch);
    persistFromUI();
  }

  private win() {
    if (this.screen !== "play") return;
    this.screen = "won";
    this.audio.win();
    const patch: Partial<ReturnType<typeof useGameUI.getState>> = {
      screen: "won",
      progress: 1,
      needleGap: 1,
    };
    if (this.side === "A") {
      patch.clearedA = true;
      patch.bestA = 1;
    } else {
      patch.clearedB = true;
      patch.bestB = 1;
    }
    useGameUI.setState(patch);
    persistFromUI();
  }

  private visual(dt: number) {
    this.orbitT += dt;
    this.trauma = Math.max(0, this.trauma - dt * 1.6);
    const t = this.screen === "title" ? this.orbitT : this.songT;
    const intensity = this.screen === "title" ? 0.04 : intensityAt(this.songT);
    const p = this.screen === "title" ? 0 : this.playerP();
    const fy = waveY(p, this.songT || 0, intensity);
    const y = (this.screen === "title" ? fy : this.y) + 0.06;

    this.placeRunner(p, this.lane, y);
    const bpm = this.audio.playing ? this.audio.bpmNow() : 80;
    this.runner.update(dt, {
      grounded: this.grounded || this.screen === "title",
      vy: this.vy,
      t,
      bpm,
      trip: this.trip,
      dead: this.screen === "dead",
      won: this.screen === "won",
    });

    this.ribbon.update(this.songT || 0, intensity);
    this.obstacles.update(this.songT || 0, intensity, this.chart.kicks);

    const np = this.screen === "title" ? 0 : Math.max(-0.02, this.needleP());
    const [nx, nz] = spiralXZ(clamp(np, 0, 1), 0);
    if (this.screen === "play" && this.dropLift > 0) {
      this.dropLift = Math.max(0, this.dropLift - dt * 0.45);
    }
    const lift = this.screen === "title" ? 0.42 : this.dropLift;
    this.arm.pointAt(nx, nz, lift);

    const sec = sectionAt(this.songT);
    const room = new THREE.Color(ROOM[sec] ?? ROOM.intro);
    this.bg.lerp(room, 1 - Math.exp(-1.2 * dt));
    this.scene.background = this.bg;
    this.renderer.setClearColor(this.bg, 1);
    this.hemi.color.copy(this.bg);

    this.updateCamera(dt, p);

    this.uiAcc += dt;
    if (this.uiAcc > 0.12) {
      this.uiAcc = 0;
      this.pushUI(false);
    }
  }

  private playCam(): PlayCam {
    return this.camMode === "orbit" ? "profile" : this.camMode;
  }

  private placeRunner(p: number, lane: number, y: number) {
    const [x, z] = spiralXZ(p, lane);
    this.runner.root.position.set(x, y, z);
  }

  private updateCamera(dt: number, p: number) {
    const [fx, fz] = spiralTangent(p);
    _fwd.set(fx, 0, fz);
    _right.crossVectors(_fwd, _up).normalize();
    const rp = this.runner.root.position;
    let fov = 42;
    const mode = this.screen === "title" ? "orbit" : this.camMode;

    if (mode === "orbit") {
      const th = this.orbitT * 0.14;
      _desiredPos.set(Math.cos(th) * 7.5, 4.35, Math.sin(th) * 7.5);
      _desiredLook.set(0, 0.15, 0);
      fov = 38;
    } else if (mode === "overhead") {
      _desiredPos.set(rp.x * 0.15 + 0.35, 11.2, rp.z * 0.15 + 0.5);
      _desiredLook.set(rp.x * 0.45, 0, rp.z * 0.45);
      fov = 40;
    } else if (mode === "chase") {
      _desiredPos.copy(rp).addScaledVector(_fwd, -1.85).addScaledVector(_up, 0.62);
      _desiredLook.copy(rp).addScaledVector(_fwd, 1.05).addScaledVector(_up, 0.4);
      fov = 40;
    } else {
      _desiredPos
        .copy(rp)
        .addScaledVector(_right, -1.7)
        .addScaledVector(_fwd, 0.15)
        .addScaledVector(_up, 0.58);
      _desiredLook.copy(rp).addScaledVector(_up, 0.4);
      fov = 30;
    }

    const switching = this.screen === "play" && this.songT - this.camSwitchAt < CAM_BLEND;
    const lambda = switching ? 5.8 : mode === "orbit" ? 2.4 : 9;
    const k = 1 - Math.exp(-lambda * dt);
    this.camera.position.lerp(_desiredPos, k);
    _look.lerp(_desiredLook, k);

    const shake = this.trauma * this.trauma * 0.12;
    if (shake > 0.001) {
      _shake.set(
        (Math.random() - 0.5) * shake,
        (Math.random() - 0.5) * shake * 0.6,
        (Math.random() - 0.5) * shake,
      );
      this.camera.position.add(_shake);
    }
    this.camera.lookAt(_look);
    this.camera.fov = expDamp(this.camera.fov, fov, 3.5, dt);
    this.camera.updateProjectionMatrix();
  }

  private pushUI(force: boolean) {
    if (this.screen !== "play" && !force) return;
    const gap = needleGap(this.playerP(), this.needleP());
    const hint = this.screen === "play" && this.songT < 6;
    useGameUI.setState({
      progress: this.playerP(),
      needleGap: gap,
      intensity: intensityAt(this.songT),
      section: sectionAt(this.songT),
      cam: this.screen === "title" ? "orbit" : this.camMode,
      hint,
    });
  }

  private bindControlsTest() {
    window.__controlsTest = {
      getYaw: () => -this.lane * 1.5,
      getSpeed: () => (this.screen === "play" ? Math.max(0.2, 1 - this.lag * 8) : 0),
      setSteer: (v: number) => {
        this.input.steerOverride = v;
      },
      setKeys: (codes: string[]) => this.input.setKeys(codes),
      getCamY: () => this.camera.position.y,
      getPlayerY: () => this.runner.root.position.y,
      getCam: () => this.camMode,
    };
  }
}

declare global {
  interface Window {
    __controlsTest?: {
      getYaw: () => number;
      getSpeed: () => number;
      setSteer?: (v: number) => void;
      setKeys?: (codes: string[]) => void;
      getCamY?: () => number;
      getPlayerY?: () => number;
      getCam?: () => string;
    };
  }
}
