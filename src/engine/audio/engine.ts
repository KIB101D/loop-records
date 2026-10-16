import type { PickKey, TrackKey } from '../../data/content';
import { TRACKS, type Instruments, type TrackDef } from './tracks';

interface Voice {
  key: TrackKey;
  src: AudioBufferSourceNode;
  gain: GainNode;
  lfo: OscillatorNode;
  t0: number;
  buf: AudioBuffer;
}

type WebkitWindow = Window & {
  webkitAudioContext?: typeof AudioContext;
  webkitOfflineAudioContext?: typeof OfflineAudioContext;
};

type SessionNavigator = Navigator & { audioSession?: { type: string } };

let silentLoop: HTMLAudioElement | null = null;

function silentWavUrl() {
  const rate = 8000, samples = 800, buf = new ArrayBuffer(44 + samples * 2), v = new DataView(buf);
  const text = (o: number, s: string) => [...s].forEach((ch, i) => v.setUint8(o + i, ch.charCodeAt(0)));
  text(0, 'RIFF'); v.setUint32(4, 36 + samples * 2, true); text(8, 'WAVE');
  text(12, 'fmt '); v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true);
  v.setUint32(24, rate, true); v.setUint32(28, rate * 2, true); v.setUint16(32, 2, true); v.setUint16(34, 16, true);
  text(36, 'data'); v.setUint32(40, samples * 2, true);
  return URL.createObjectURL(new Blob([buf], { type: 'audio/wav' }));
}

function preferPlaybackSession() {
  const nav = navigator as SessionNavigator;
  const useSession = () => {
    try {
      nav.audioSession!.type = 'playback';
      return true;
    } catch {
      return false;
    }
  };
  if (nav.audioSession && useSession()) return;
  if (silentLoop || !/iP(hone|ad|od)/.test(navigator.userAgent)) return;
  silentLoop = new Audio(silentWavUrl());
  silentLoop.loop = true;
  silentLoop.setAttribute('playsinline', '');
  silentLoop.volume = .01;
  void silentLoop.play().catch(() => {});
}

export const audio = {
  ctx: null as AudioContext | null,
  master: null as GainNode | null,
  analyser: null as AnalyserNode | null,
  data: null as Uint8Array | null,
  wanted: true,
  unlocked: false,
  unlockAt: -1e9,
  zone: false,
  pick: null as PickKey | null,
  cur: null as Voice | null,
  building: {} as Partial<Record<TrackKey, Promise<AudioBuffer>>>,
  offsets: {} as Partial<Record<TrackKey, number>>,
  token: 0
};

let notify: () => void = () => {};
export const onAudioChange = (fn: () => void) => { notify = fn; };

export function ensureCtx() {
  if (!audio.ctx) {
    const AC = window.AudioContext ?? (window as WebkitWindow).webkitAudioContext;
    if (!AC) return null;
    const ctx = new AC();
    const master = ctx.createGain();
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 256;
    analyser.smoothingTimeConstant = .72;
    master.connect(analyser);
    analyser.connect(ctx.destination);
    Object.assign(audio, { ctx, master, analyser, data: new Uint8Array(analyser.frequencyBinCount) });
  }
  return audio.ctx;
}

function makeInstruments(oc: OfflineAudioContext, out: AudioNode, fx: AudioNode | null, noiseBuf: AudioBuffer): Instruments {
  const mtof = (m: number) => 440 * Math.pow(2, (m - 69) / 12);
  const route = (node: AudioNode, pan: number, send: number) => {
    let n = node;
    if (pan && oc.createStereoPanner) {
      const p = oc.createStereoPanner();
      p.pan.value = pan;
      n.connect(p);
      n = p;
    }
    n.connect(out);
    if (send && fx) {
      const s = oc.createGain();
      s.gain.value = send;
      n.connect(s);
      s.connect(fx);
    }
  };
  const env = (g: GainNode, t: number, a: number, v: number, dur: number, sus: number) => {
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(v, t + a);
    g.gain.exponentialRampToValueAtTime(Math.max(v * sus, 1e-4), t + Math.max(a + .01, Math.min(.35, dur * .5)));
    g.gain.exponentialRampToValueAtTime(1e-4, t + dur);
  };
  const osc = (type: OscillatorType, fr: number, t: number, end: number, det = 0) => {
    const o = oc.createOscillator();
    o.type = type;
    o.frequency.value = fr;
    if (det) o.detune.value = det;
    o.start(t);
    o.stop(end);
    return o;
  };
  const noise = (t: number, dur: number, v: number, type: BiquadFilterType, fr: number, q = 0, pan = 0, send = 0) => {
    const s = oc.createBufferSource();
    s.buffer = noiseBuf;
    const fl = oc.createBiquadFilter();
    fl.type = type;
    fl.frequency.value = fr;
    if (q) fl.Q.value = q;
    const g = oc.createGain();
    g.gain.setValueAtTime(v, t);
    g.gain.exponentialRampToValueAtTime(1e-3, t + dur);
    s.connect(fl); fl.connect(g); route(g, pan, send);
    s.start(t, Math.random() * .5);
    s.stop(t + dur + .02);
  };
  return {
    ep(m, t, dur, v, pan = 0, send = 0) {
      const g = oc.createGain();
      env(g, t, .012, v, dur, .35);
      osc('sine', mtof(m), t, t + dur + .05).connect(g);
      const g2 = oc.createGain();
      g2.gain.value = .16;
      osc('triangle', mtof(m) * 2, t, t + dur + .05, 5).connect(g2);
      g2.connect(g);
      route(g, pan, send);
    },
    pad(m, t, dur, v, pan = 0) {
      const g = oc.createGain();
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(v, t + .35);
      g.gain.setValueAtTime(v, t + dur - .3);
      g.gain.linearRampToValueAtTime(0, t + dur + .4);
      const fl = oc.createBiquadFilter();
      fl.type = 'lowpass';
      fl.frequency.value = 1300;
      osc('sawtooth', mtof(m), t, t + dur + .45, -8).connect(fl);
      osc('sawtooth', mtof(m), t, t + dur + .45, 8).connect(fl);
      fl.connect(g);
      route(g, pan, 0);
    },
    pluck(m, t, dur, v, pan = 0, send = 0, type = 'triangle') {
      const g = oc.createGain();
      env(g, t, .004, v, dur, .2);
      const fl = oc.createBiquadFilter();
      fl.type = 'lowpass';
      fl.frequency.setValueAtTime(4200, t);
      fl.frequency.exponentialRampToValueAtTime(800, t + dur);
      osc(type, mtof(m), t, t + dur + .05).connect(fl);
      fl.connect(g);
      route(g, pan, send);
    },
    bass(m, t, dur, v = .5, type = 'sine') {
      const g = oc.createGain();
      env(g, t, .015, v, dur, .55);
      const fl = oc.createBiquadFilter();
      fl.type = 'lowpass';
      fl.frequency.value = type === 'sine' ? 900 : 560;
      osc(type, mtof(m), t, t + dur + .05).connect(fl);
      fl.connect(g);
      route(g, 0, 0);
    },
    kick(t, v = 1) {
      const o = oc.createOscillator();
      o.frequency.setValueAtTime(130, t);
      o.frequency.exponentialRampToValueAtTime(42, t + .14);
      const g = oc.createGain();
      g.gain.setValueAtTime(.9 * v, t);
      g.gain.exponentialRampToValueAtTime(.001, t + .38);
      o.connect(g);
      route(g, 0, 0);
      o.start(t);
      o.stop(t + .4);
    },
    snare(t, v = .3, len = .2, send = 0) {
      noise(t, len, v, 'bandpass', 1800, .8, 0, send);
      const o = osc('triangle', 185, t, t + .12);
      const g = oc.createGain();
      g.gain.setValueAtTime(v * .55, t);
      g.gain.exponentialRampToValueAtTime(.001, t + .1);
      o.connect(g);
      route(g, 0, send);
    },
    rim(t, v = .18, send = 0) {
      noise(t, .035, v, 'bandpass', 2600, 3, .1, send);
      const o = osc('square', 820, t, t + .05);
      const g = oc.createGain();
      g.gain.setValueAtTime(v * .25, t);
      g.gain.exponentialRampToValueAtTime(.001, t + .04);
      o.connect(g);
      route(g, .1, send);
    },
    hat(t, v = .06, open = false) {
      noise(t, open ? .2 : .05, v, 'highpass', 7500, 0, -.15, 0);
    },
    shaker(t, v = .025) {
      noise(t, .06, v, 'bandpass', 6200, 1.2, .2, 0);
    }
  };
}

async function renderTrack(def: TrackDef): Promise<AudioBuffer> {
  const sr = 44100, beat = 60 / def.bpm, len = beat * 16, tail = 3, sw = beat * (def.swing ?? 0);
  const OC = window.OfflineAudioContext ?? (window as WebkitWindow).webkitOfflineAudioContext;
  const oc = new OC(2, Math.ceil(sr * (len + tail)), sr);
  const out = oc.createGain();
  out.gain.value = def.gain ?? .6;
  const lp = oc.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.value = def.cut ?? 2600;
  lp.Q.value = .4;
  out.connect(lp);
  lp.connect(oc.destination);
  let fx: AudioNode | null = null;
  if (def.delay) {
    const dl = oc.createDelay(3);
    dl.delayTime.value = def.delay * beat;
    const fb = oc.createGain();
    fb.gain.value = def.fb ?? .4;
    const df = oc.createBiquadFilter();
    df.type = 'lowpass';
    df.frequency.value = 1800;
    dl.connect(df); df.connect(fb); fb.connect(dl); df.connect(out);
    fx = dl;
  }
  const noiseBuf = oc.createBuffer(1, sr, sr), nd = noiseBuf.getChannelData(0);
  for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;
  def.score(makeInstruments(oc, out, fx, noiseBuf), beat, sw);

  const crk = def.crackle ?? .006;
  const cr = oc.createBuffer(1, Math.ceil(sr * (len + tail)), sr), cd = cr.getChannelData(0);
  for (let i = 0; i < cd.length; i++) {
    cd[i] = (Math.random() * 2 - 1) * crk;
    if (Math.random() < .00035) cd[i] += (Math.random() * 2 - 1) * .5 * (crk / .006);
  }
  const cs = oc.createBufferSource();
  cs.buffer = cr;
  const cf = oc.createBiquadFilter();
  cf.type = 'bandpass';
  cf.frequency.value = 2400;
  cf.Q.value = .6;
  cs.connect(cf);
  cf.connect(oc.destination);
  cs.start(0);

  const rendered = await oc.startRendering();
  const N = Math.ceil(sr * len), T = rendered.length - N;
  const buf = audio.ctx!.createBuffer(2, N, sr);
  let peak = 0;
  for (let c = 0; c < 2; c++) {
    const s = rendered.getChannelData(c), d = buf.getChannelData(c);
    for (let i = 0; i < N; i++) {
      d[i] = s[i] + (i < T ? s[N + i] : 0);
      peak = Math.max(peak, Math.abs(d[i]));
    }
  }
  if (peak > .92) {
    const k = .92 / peak;
    for (let c = 0; c < 2; c++) {
      const d = buf.getChannelData(c);
      for (let i = 0; i < N; i++) d[i] *= k;
    }
  }
  return buf;
}

export const getBuffer = (key: TrackKey) => audio.building[key] ?? (audio.building[key] = renderTrack(TRACKS[key]));

function startVoice(key: TrackKey, buf: AudioBuffer): Voice {
  const c = audio.ctx!, t = c.currentTime, vinyl = !!TRACKS[key].vinyl;
  const src = c.createBufferSource();
  src.buffer = buf;
  src.loop = true;
  const gain = c.createGain();
  gain.gain.setValueAtTime(0, t);
  gain.gain.linearRampToValueAtTime(.9, t + (vinyl ? .6 : 1.4));
  const lfo = c.createOscillator();
  lfo.frequency.value = vinyl ? .55 : .9;
  const depth = c.createGain();
  depth.gain.value = vinyl ? 6 : 9;
  lfo.connect(depth);
  depth.connect(src.detune);
  src.playbackRate.setValueAtTime(vinyl ? .5 : .82, t);
  src.playbackRate.linearRampToValueAtTime(1, t + (vinyl ? .7 : .5));
  src.connect(gain);
  gain.connect(audio.master!);
  src.start(t, (audio.offsets[key] ?? 0) % buf.duration);
  lfo.start(t);
  return { key, src, gain, lfo, t0: t, buf };
}

function stopVoice(v: Voice) {
  const c = audio.ctx!, t = c.currentTime, d = 1.1;
  audio.offsets[v.key] = ((audio.offsets[v.key] ?? 0) + (t - v.t0)) % v.buf.duration;
  const r = v.src.playbackRate;
  r.cancelScheduledValues(t);
  r.setValueAtTime(r.value, t);
  r.linearRampToValueAtTime(TRACKS[v.key].vinyl ? .3 : .55, t + d);
  v.gain.gain.cancelScheduledValues(t);
  v.gain.gain.setValueAtTime(v.gain.gain.value, t);
  v.gain.gain.linearRampToValueAtTime(0, t + d);
  v.src.stop(t + d + .1);
  v.lfo.stop(t + d + .1);
}

const desiredKey = (): TrackKey | null =>
  audio.wanted && audio.unlocked ? audio.pick ?? (audio.zone ? 'ost' : null) : null;

export async function sync() {
  const key = desiredKey();
  if (audio.cur && audio.cur.key === key) return;
  const token = ++audio.token;
  if (audio.cur) {
    stopVoice(audio.cur);
    audio.cur = null;
  }
  if (!key) return;
  let buf: AudioBuffer;
  try {
    buf = await getBuffer(key);
  } catch {
    return;
  }
  if (token !== audio.token || !audio.ctx) return;
  audio.cur = startVoice(key, buf);
  notify();
}

function markUnlocked() {
  if (audio.unlocked) return;
  audio.unlocked = true;
  audio.unlockAt = performance.now();
  void getBuffer('ost');
  void sync();
  notify();
}

export function unlock() {
  const ctx = ensureCtx();
  if (!ctx) return;
  preferPlaybackSession();
  if (ctx.state === 'running') {
    markUnlocked();
    return;
  }
  ctx.resume().then(() => {
    if (ctx.state === 'running') markUnlocked();
  }).catch(() => {});
}

export function toggleSound() {
  if (performance.now() - audio.unlockAt < 900) return;
  audio.wanted = !audio.wanted;
  void sync();
  notify();
}

export function setPick(key: PickKey | null) {
  if (audio.pick === key) return;
  audio.pick = key;
  if (key) {
    audio.wanted = true;
    unlock();
  }
  void sync();
  notify();
}

export function setZone(z: boolean) {
  if (audio.zone === z) return;
  audio.zone = z;
  void sync();
  notify();
}

export const tapeRolling = () => audio.cur?.key === 'ost';

export function scratch() {
  const c = audio.ctx;
  if (!c || !(audio.wanted && audio.unlocked)) return;
  const t = c.currentTime, len = .42;
  const b = c.createBuffer(1, Math.ceil(c.sampleRate * len), c.sampleRate), d = b.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  const s = c.createBufferSource();
  s.buffer = b;
  const bp = c.createBiquadFilter();
  bp.type = 'bandpass';
  bp.Q.value = 4;
  bp.frequency.setValueAtTime(300, t);
  bp.frequency.exponentialRampToValueAtTime(2600, t + .1);
  bp.frequency.exponentialRampToValueAtTime(500, t + .2);
  bp.frequency.exponentialRampToValueAtTime(2200, t + .3);
  bp.frequency.exponentialRampToValueAtTime(350, t + .4);
  const g = c.createGain();
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(.5, t + .03);
  g.gain.linearRampToValueAtTime(.08, t + .19);
  g.gain.linearRampToValueAtTime(.45, t + .24);
  g.gain.linearRampToValueAtTime(0, t + .42);
  s.connect(bp); bp.connect(g); g.connect(c.destination);
  s.start(t);
  s.stop(t + len);
  if (audio.cur) {
    const r = audio.cur.src.playbackRate;
    r.cancelScheduledValues(t);
    r.setValueAtTime(r.value, t);
    r.linearRampToValueAtTime(.35, t + .1);
    r.linearRampToValueAtTime(1.6, t + .22);
    r.linearRampToValueAtTime(1, t + .42);
  }
}

const BINS = [1, 2, 3, 4, 5, 6, 7, 8, 10, 12, 14, 17, 20, 24];
const levels = new WeakMap<HTMLElement, number>();

export function eqTick(bars: HTMLElement[]) {
  const live = !!(audio.cur && audio.analyser && audio.data);
  if (live) audio.analyser!.getByteFrequencyData(audio.data!);
  bars.forEach((bar, i) => {
    const target = live ? Math.max(.05, Math.min(1, audio.data![BINS[i]] / 255 * (1 + i * .06))) : .05;
    const cur = levels.get(bar) ?? .05;
    const next = cur + (target - cur) * .35;
    if (Math.abs(next - cur) > .002) {
      levels.set(bar, next);
      bar.style.transform = `scaleY(${next.toFixed(3)})`;
    }
  });
}

export function suspendWhileHidden() {
  if (!audio.ctx) return;
  if (document.hidden) {
    void audio.ctx.suspend();
    silentLoop?.pause();
  } else if (audio.unlocked) {
    void audio.ctx.resume().catch(() => {});
    void silentLoop?.play().catch(() => {});
  }
}

export function disposeAudio() {
  audio.token++;
  const ctx = audio.ctx;
  Object.assign(audio, {
    ctx: null, master: null, analyser: null, data: null, wanted: true, unlocked: false, unlockAt: -1e9,
    zone: false, pick: null, cur: null, building: {}, offsets: {}
  });
  if (ctx) void ctx.close();
  if (silentLoop) {
    silentLoop.pause();
    URL.revokeObjectURL(silentLoop.src);
    silentLoop = null;
  }
}
