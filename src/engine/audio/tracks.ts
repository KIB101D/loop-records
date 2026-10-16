import type { TrackKey } from '../../data/content';

export interface Instruments {
  ep(m: number, t: number, dur: number, v: number, pan?: number, send?: number): void;
  pad(m: number, t: number, dur: number, v: number, pan?: number): void;
  pluck(m: number, t: number, dur: number, v: number, pan?: number, send?: number, type?: OscillatorType): void;
  bass(m: number, t: number, dur: number, v?: number, type?: OscillatorType): void;
  kick(t: number, v?: number): void;
  snare(t: number, v?: number, len?: number, send?: number): void;
  rim(t: number, v?: number, send?: number): void;
  hat(t: number, v?: number, open?: boolean): void;
  shaker(t: number, v?: number): void;
}

export interface TrackDef {
  title: string;
  bpm: number;
  swing?: number;
  cut?: number;
  gain?: number;
  crackle?: number;
  delay?: number;
  fb?: number;
  vinyl?: boolean;
  score(I: Instruments, beat: number, sw: number): void;
}

type Hit = [beat: number, note: number];

export const TRACKS: Record<TrackKey, TrackDef> = {
  ost: {
    title: 'LOOP Theme', bpm: 78, swing: .09, cut: 2600, gain: .62,
    score(I, beat, sw) {
      const ch = [[65, 69, 72, 76], [64, 67, 71, 74], [62, 65, 69, 72], [60, 64, 67, 71]], bs = [41, 40, 38, 36];
      for (let b = 0; b < 4; b++) {
        const t = b * beat * 4, c = ch[b];
        c.forEach((m, k) => I.ep(m, t + k * .018, beat * 2.3, .085, (k - 1.5) * .25));
        c.forEach((m, k) => I.ep(m, t + beat * 2.5 + sw + k * .014, beat * 1.4, .06, (k - 1.5) * .25));
        I.ep(c[3] + 12, t + beat * 3.5 + sw, beat * .5, .035, .3);
        I.bass(bs[b], t, beat * 2.4, .5);
        I.bass(bs[b] + (b % 2 ? 7 : 12), t + beat * 2.5 + sw, beat * 1.2, .45);
        I.kick(t); I.kick(t + beat * 1.75 + sw * .5, .55); I.kick(t + beat * 2.5 + sw, .8);
        I.snare(t + beat); I.snare(t + beat * 3);
        for (let e = 0; e < 8; e++) I.hat(t + e * beat / 2 + (e % 2 ? sw : 0), e % 2 ? .05 : .08);
      }
    }
  },
  crates: {
    title: 'Sunday Crates', bpm: 70, swing: .13, cut: 2300, gain: .6, crackle: .012, vinyl: true,
    score(I, beat, sw) {
      const ch = [[62, 65, 69, 72, 76], [65, 69, 71, 76], [64, 67, 71, 74], [61, 64, 67, 70]], bs = [38, 43, 36, 45], mel = [77, 74, 76, 73];
      for (let b = 0; b < 4; b++) {
        const t = b * beat * 4, c = ch[b];
        c.forEach((m, k) => I.ep(m, t + k * .022, beat * 1.8, .062, (k - 2) * .2));
        c.forEach((m, k) => I.ep(m, t + beat * 1.5 + sw + k * .016, beat * .6, .04, (k - 2) * .2));
        c.forEach((m, k) => I.ep(m, t + beat * 3 + k * .02, beat * .9, .05, (k - 2) * .2));
        I.ep(mel[b], t + beat * 2.5 + sw, beat * .8, .05, .2);
        I.ep(mel[b] - 2, t + beat * 3.5 + sw, beat * .4, .035, .2);
        I.bass(bs[b], t, beat * 1.4, .55); I.bass(bs[b] + 12, t + beat * 1.5 + sw, beat * .4, .32); I.bass(bs[b] + 7, t + beat * 3, beat * .9, .45);
        I.kick(t, .95); I.kick(t + beat * 2.25 + sw, .5); I.kick(t + beat * 2.5 + sw, .8);
        I.snare(t + beat, .26, .28); I.snare(t + beat * 3, .26, .28);
        for (let e = 0; e < 8; e++) I.hat(t + e * beat / 2 + (e % 2 ? sw : 0), e % 2 ? .04 : .065);
      }
    }
  },
  bus: {
    title: 'Night Bus', bpm: 96, swing: 0, cut: 5200, gain: .5, delay: .75, fb: .38, crackle: .003, vinyl: true,
    score(I, beat) {
      const ch = [[57, 60, 64, 69], [53, 57, 60, 65], [55, 60, 64, 67], [55, 59, 62, 67]], bs = [45, 41, 36, 43], ord = [0, 1, 2, 3, 2, 1, 2, 3];
      for (let b = 0; b < 4; b++) {
        const t = b * beat * 4, c = ch[b];
        c.forEach((m, k) => I.pad(m, t, beat * 4, .03, (k - 1.5) * .3));
        for (let s = 0; s < 16; s++) I.pluck(c[ord[s % 8]] + 12, t + s * beat / 4, beat * .22, .04, s % 2 ? .3 : -.3, .35, 'square');
        for (let e = 0; e < 8; e++) I.bass(bs[b] + (e % 2 ? 12 : 0), t + e * beat / 2, beat * .42, .38, 'sawtooth');
        I.kick(t); I.kick(t + beat * 2); I.kick(t + beat * 2.5, .6);
        I.snare(t + beat, .3, .42, .25); I.snare(t + beat * 3, .3, .42, .25);
        for (let e = 0; e < 8; e++) I.hat(t + e * beat / 2, e % 2 ? .065 : .03, e % 2 === 1);
      }
    }
  },
  bossa: {
    title: 'Tape Hiss Bossa', bpm: 128, swing: .04, cut: 3800, gain: .6, crackle: .008, vinyl: true,
    score(I, beat, sw) {
      const ch = [[57, 60, 64, 67], [57, 60, 62, 66], [55, 59, 62, 66], [55, 59, 60, 64]], rt = [45, 38, 43, 36], mel = [76, 74, 71, 72];
      for (let b = 0; b < 4; b++) {
        const t = b * beat * 4, c = ch[b];
        [0, 1.5, 2.5, 3.5].forEach((p, j) => c.forEach((m, k) => I.pluck(m, t + p * beat + (j % 2 ? sw : 0) + k * .012, beat * (j === 0 ? 1.2 : .55), .05, (k - 1.5) * .2, 0, 'triangle')));
        I.bass(rt[b], t, beat * 1.4, .5); I.bass(rt[b], t + beat * 1.5, beat * .45, .38);
        I.bass(rt[b] + 7, t + beat * 2, beat * 1.4, .45); I.bass(rt[b] + 7, t + beat * 3.5, beat * .45, .36);
        I.kick(t, .5); I.kick(t + beat * 1.5, .32); I.kick(t + beat * 2, .5); I.kick(t + beat * 3.5, .32);
        (b % 2 === 0 ? [0, 1.5, 3] : [1, 2]).forEach(p => I.rim(t + p * beat, .16));
        for (let s = 0; s < 16; s++) I.shaker(t + s * beat / 4, s % 4 === 2 ? .035 : .018);
        I.ep(mel[b], t + beat * .5, beat * 1.5, .045, .25);
        I.ep(mel[b] - 3, t + beat * 2.5, beat, .035, .25);
      }
    }
  },
  dub: {
    title: 'Coast Dub', bpm: 72, swing: .06, cut: 2200, gain: .6, delay: .75, fb: .55, crackle: .007, vinyl: true,
    score(I, beat, sw) {
      const ch = [[55, 58, 62], [55, 58, 62], [55, 60, 63], [55, 60, 63]];
      const bl: Hit[][] = [
        [[0, 43], [1.5, 43], [2, 46], [2.5, 50], [3.5, 48]],
        [[0, 43], [1, 43], [2, 50], [3, 46], [3.5, 45]],
        [[0, 36], [1.5, 36], [2, 39], [2.5, 43], [3.5, 41]],
        [[0, 36], [1, 39], [2, 43], [3, 41], [3.5, 38]]
      ];
      for (let b = 0; b < 4; b++) {
        const t = b * beat * 4, c = ch[b];
        [1, 3].forEach(p => c.forEach((m, k) => I.pluck(m + 12, t + p * beat + k * .006, beat * .2, .06, (k - 1) * .3, .5, 'square')));
        bl[b].forEach(([p, m]) => I.bass(m, t + p * beat, beat * (p % 1 ? .45 : .9), .6));
        I.kick(t + beat * 2, .95); I.rim(t + beat * 2, .22, .6);
        for (let e = 0; e < 8; e++) I.hat(t + e * beat / 2 + (e % 2 ? sw : 0), e % 2 ? .05 : .03);
        if (b === 3) I.rim(t + beat * 3.5, .16, .8);
      }
    }
  }
};
