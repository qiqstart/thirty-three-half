import { bpmAt, type Chart, type ChartEvent } from "./chart";

function midiHz(m: number) {
  return 440 * Math.pow(2, (m - 69) / 12);
}

export class JazzEngine {
  ctx: AudioContext | null = null;
  master: GainNode | null = null;
  music: GainNode | null = null;
  sfx: GainNode | null = null;
  crackleGain: GainNode | null = null;
  private noise: AudioBuffer | null = null;
  private live: AudioScheduledSourceNode[] = [];
  private chart: Chart | null = null;
  private idx = 0;
  private t0 = 0;
  playing = false;
  muted = false;
  private hissTimer = 0;

  unlock() {
    if (!this.ctx) {
      const Ctor = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new Ctor({ latencyHint: "interactive" });
      this.master = this.ctx.createGain();
      this.music = this.ctx.createGain();
      this.sfx = this.ctx.createGain();
      this.crackleGain = this.ctx.createGain();
      this.music.gain.value = 0.72;
      this.sfx.gain.value = 0.9;
      this.crackleGain.gain.value = 0.045;
      this.master.gain.value = this.muted ? 0 : 0.85;
      this.music.connect(this.master);
      this.sfx.connect(this.master);
      this.crackleGain.connect(this.master);
      this.master.connect(this.ctx.destination);
      this.noise = this.makeNoise(2);
      this.startHiss();
    }
    if (this.ctx.state === "suspended") void this.ctx.resume();
  }

  setMuted(muted: boolean) {
    this.muted = muted;
    if (this.master && this.ctx) {
      this.master.gain.setTargetAtTime(muted ? 0 : 0.85, this.ctx.currentTime, 0.03);
    }
  }

  private makeNoise(seconds: number) {
    const ctx = this.ctx!;
    const n = Math.floor(ctx.sampleRate * seconds);
    const buf = ctx.createBuffer(1, n, ctx.sampleRate);
    const d = buf.getChannelData(0);
    let b = 0;
    for (let i = 0; i < n; i++) {
      b = 0.97 * b + 0.03 * (Math.random() * 2 - 1);
      d[i] = b * 3;
    }
    return buf;
  }

  private startHiss() {
    if (!this.ctx || !this.noise || !this.crackleGain) return;
    const src = this.ctx.createBufferSource();
    src.buffer = this.noise;
    src.loop = true;
    const f = this.ctx.createBiquadFilter();
    f.type = "highpass";
    f.frequency.value = 900;
    const g = this.ctx.createGain();
    g.gain.value = 1;
    src.connect(f);
    f.connect(g);
    g.connect(this.crackleGain);
    src.start();
    this.live.push(src);
  }

  songTime() {
    if (!this.ctx || !this.playing) return 0;
    return Math.max(0, this.ctx.currentTime - this.t0);
  }

  start(chart: Chart) {
    this.unlock();
    this.stopVoices(false);
    this.chart = chart;
    this.idx = 0;
    this.t0 = this.ctx!.currentTime + 0.06;
    this.playing = true;
  }

  stop() {
    this.playing = false;
    this.stopVoices(true);
  }

  private stopVoices(keepHiss: boolean) {
    for (const n of this.live) {
      try {
        n.stop();
      } catch {
        /* already stopped */
      }
    }
    this.live = [];
    if (keepHiss) this.startHiss();
  }

  tick() {
    if (!this.playing || !this.ctx || !this.chart) return;
    const now = this.ctx.currentTime;
    const song = now - this.t0;
    const look = 0.18;
    while (this.idx < this.chart.events.length) {
      const ev = this.chart.events[this.idx]!;
      if (ev.t > song + look) break;
      const when = this.t0 + ev.t;
      this.play(ev, Math.max(when, now + 0.01));
      this.idx += 1;
    }
    this.hissTimer += 0.016;
    if (this.crackleGain && song > 0) {
      const pop = Math.random() < 0.02 ? 0.09 : 0.045;
      this.crackleGain.gain.setTargetAtTime(pop, now, 0.01);
    }
  }

  private track(node: AudioScheduledSourceNode) {
    this.live.push(node);
    node.onended = () => {
      const i = this.live.indexOf(node);
      if (i >= 0) this.live.splice(i, 1);
    };
  }

  private play(ev: ChartEvent, when: number) {
    switch (ev.kind) {
      case "kick":
        this.kick(when);
        break;
      case "snare":
        this.snare(when);
        break;
      case "hat":
        this.hat(when);
        break;
      case "ride":
        this.ride(when);
        break;
      case "bass":
        if (ev.midi != null) this.bass(when, midiHz(ev.midi));
        break;
      case "chord":
        if (ev.chord) this.rhodes(when, ev.chord);
        break;
      case "horn":
        if (ev.midi != null) this.horn(when, midiHz(ev.midi));
        break;
      default:
        break;
    }
  }

  private kick(when: number) {
    const ctx = this.ctx!;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(148, when);
    osc.frequency.exponentialRampToValueAtTime(40, when + 0.13);
    g.gain.setValueAtTime(0.0001, when);
    g.gain.exponentialRampToValueAtTime(0.95, when + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, when + 0.22);
    osc.connect(g);
    g.connect(this.music!);
    osc.start(when);
    osc.stop(when + 0.24);
    this.track(osc);
    this.noiseBurst(when, 0.025, 1800, 0.18, "highpass");
  }

  private snare(when: number) {
    const ctx = this.ctx!;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = "triangle";
    osc.frequency.setValueAtTime(186, when);
    g.gain.setValueAtTime(0.0001, when);
    g.gain.exponentialRampToValueAtTime(0.22, when + 0.005);
    g.gain.exponentialRampToValueAtTime(0.0001, when + 0.11);
    osc.connect(g);
    g.connect(this.music!);
    osc.start(when);
    osc.stop(when + 0.12);
    this.track(osc);
    this.noiseBurst(when, 0.12, 1600, 0.32, "bandpass");
  }

  private hat(when: number) {
    this.noiseBurst(when, 0.038, 7500, 0.09, "highpass");
  }

  private ride(when: number) {
    this.noiseBurst(when, 0.22, 5200, 0.08, "highpass");
  }

  private noiseBurst(
    when: number,
    dur: number,
    freq: number,
    gain: number,
    type: BiquadFilterType,
  ) {
    if (!this.ctx || !this.noise) return;
    const src = this.ctx.createBufferSource();
    src.buffer = this.noise;
    const f = this.ctx.createBiquadFilter();
    f.type = type;
    f.frequency.setValueAtTime(freq, when);
    f.Q.value = type === "bandpass" ? 1.1 : 0.7;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.0001, when);
    g.gain.exponentialRampToValueAtTime(gain, when + 0.004);
    g.gain.exponentialRampToValueAtTime(0.0001, when + dur);
    src.connect(f);
    f.connect(g);
    g.connect(this.music!);
    src.start(when);
    src.stop(when + dur + 0.02);
    this.track(src);
  }

  private bass(when: number, hz: number) {
    const ctx = this.ctx!;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    const f = ctx.createBiquadFilter();
    osc.type = "sine";
    osc.frequency.setValueAtTime(hz, when);
    f.type = "lowpass";
    f.frequency.value = 420;
    g.gain.setValueAtTime(0.0001, when);
    g.gain.exponentialRampToValueAtTime(0.42, when + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, when + 0.28);
    osc.connect(f);
    f.connect(g);
    g.connect(this.music!);
    osc.start(when);
    osc.stop(when + 0.3);
    this.track(osc);
  }

  private rhodes(when: number, chord: number[]) {
    const ctx = this.ctx!;
    for (let i = 0; i < chord.length; i++) {
      const hz = midiHz(chord[i]!);
      const car = ctx.createOscillator();
      const mod = ctx.createOscillator();
      const modG = ctx.createGain();
      const g = ctx.createGain();
      const lp = ctx.createBiquadFilter();
      car.type = "sine";
      mod.type = "sine";
      car.frequency.setValueAtTime(hz, when);
      mod.frequency.setValueAtTime(hz * 2, when);
      modG.gain.value = hz * 1.15;
      lp.type = "lowpass";
      lp.frequency.setValueAtTime(2100, when);
      lp.frequency.exponentialRampToValueAtTime(900, when + 1.4);
      g.gain.setValueAtTime(0.0001, when);
      g.gain.exponentialRampToValueAtTime(0.11, when + 0.03);
      g.gain.exponentialRampToValueAtTime(0.0001, when + 1.6);
      mod.connect(modG);
      modG.connect(car.frequency);
      car.connect(lp);
      lp.connect(g);
      g.connect(this.music!);
      car.start(when);
      mod.start(when);
      car.stop(when + 1.7);
      mod.stop(when + 1.7);
      this.track(car);
      this.track(mod);
    }
  }

  private horn(when: number, hz: number) {
    const ctx = this.ctx!;
    const a = ctx.createOscillator();
    const b = ctx.createOscillator();
    const g = ctx.createGain();
    const bp = ctx.createBiquadFilter();
    a.type = "sawtooth";
    b.type = "square";
    a.frequency.setValueAtTime(hz, when);
    b.frequency.setValueAtTime(hz * 1.003, when);
    const lfo = ctx.createOscillator();
    const lfoG = ctx.createGain();
    lfo.frequency.value = 5.2;
    lfoG.gain.value = 7;
    lfo.connect(lfoG);
    lfoG.connect(a.frequency);
    bp.type = "bandpass";
    bp.frequency.value = 1100;
    bp.Q.value = 2.2;
    g.gain.setValueAtTime(0.0001, when);
    g.gain.exponentialRampToValueAtTime(0.09, when + 0.05);
    g.gain.exponentialRampToValueAtTime(0.0001, when + 0.7);
    a.connect(bp);
    b.connect(bp);
    bp.connect(g);
    g.connect(this.music!);
    a.start(when);
    b.start(when);
    lfo.start(when);
    a.stop(when + 0.75);
    b.stop(when + 0.75);
    lfo.stop(when + 0.75);
    this.track(a);
    this.track(b);
    this.track(lfo);
  }

  jump() {
    if (!this.ctx) return;
    const when = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(520, when);
    osc.frequency.exponentialRampToValueAtTime(280, when + 0.08);
    g.gain.setValueAtTime(0.0001, when);
    g.gain.exponentialRampToValueAtTime(0.16, when + 0.005);
    g.gain.exponentialRampToValueAtTime(0.0001, when + 0.1);
    osc.connect(g);
    g.connect(this.sfx!);
    osc.start(when);
    osc.stop(when + 0.12);
    this.track(osc);
  }

  land() {
    if (!this.ctx) return;
    this.noiseBurst(this.ctx.currentTime, 0.05, 400, 0.12, "lowpass");
  }

  stumble() {
    if (!this.ctx) return;
    const when = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(240, when);
    osc.frequency.exponentialRampToValueAtTime(70, when + 0.22);
    g.gain.setValueAtTime(0.0001, when);
    g.gain.exponentialRampToValueAtTime(0.2, when + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, when + 0.28);
    osc.connect(g);
    g.connect(this.sfx!);
    osc.start(when);
    osc.stop(when + 0.3);
    this.track(osc);
    this.noiseBurst(when, 0.22, 2000, 0.28, "bandpass");
  }

  catchNeedle() {
    if (!this.ctx) return;
    const when = this.ctx.currentTime;
    this.noiseBurst(when, 0.55, 1400, 0.5, "bandpass");
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = "square";
    osc.frequency.setValueAtTime(180, when);
    osc.frequency.exponentialRampToValueAtTime(40, when + 0.5);
    g.gain.setValueAtTime(0.0001, when);
    g.gain.exponentialRampToValueAtTime(0.18, when + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, when + 0.55);
    osc.connect(g);
    g.connect(this.sfx!);
    osc.start(when);
    osc.stop(when + 0.58);
    this.track(osc);
    if (this.music) this.music.gain.setTargetAtTime(0.12, when, 0.08);
  }

  win() {
    if (!this.ctx) return;
    const when = this.ctx.currentTime;
    this.rhodes(when, [65, 69, 72, 76]);
    this.rhodes(when + 0.35, [60, 67, 72, 79]);
    if (this.music) this.music.gain.setTargetAtTime(0.4, when, 0.2);
  }

  resetMusicGain() {
    if (this.music && this.ctx) this.music.gain.setTargetAtTime(0.72, this.ctx.currentTime, 0.05);
  }

  bpmNow() {
    return bpmAt(this.songTime());
  }
}
