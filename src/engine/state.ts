import { GADGETS, PICKS } from '../data/content';

export interface SingleState { play: number; playT: number; angle: number; speed: number; hov: number; hovT: number }
export interface HoverState { hover: number; hoverT: number }
export interface RecordsProgress { drop: number; out: number; lift: number; away: number; split: number; tags: number }

export const S = { mx: 0, my: 0, hero: 1, fin: 0, vel: 0, time: 0 };

export const T3 = {
  ok: false,
  R: { drop: 0, out: 0, lift: 0, away: 0, split: 0, tags: 0 } as RecordsProgress,
  singles: PICKS.map((): SingleState => ({ play: 0, playT: 0, angle: 0, speed: 0, hov: 0, hovT: 0 })),
  finLp: { x: 0, y: 0, s: 1, roll: 0, o: 0 },
  gadgets: GADGETS.map((): HoverState => ({ hover: 0, hoverT: 0 }))
};

export const deck = { cur: null as number | null };

export function resetState() {
  Object.assign(S, { mx: 0, my: 0, hero: 1, fin: 0, vel: 0, time: 0 });
  T3.ok = false;
  Object.assign(T3.R, { drop: 0, out: 0, lift: 0, away: 0, split: 0, tags: 0 });
  T3.singles.forEach(s => Object.assign(s, { play: 0, playT: 0, angle: 0, speed: 0, hov: 0, hovT: 0 }));
  Object.assign(T3.finLp, { x: 0, y: 0, s: 1, roll: 0, o: 0 });
  T3.gadgets.forEach(g => Object.assign(g, { hover: 0, hoverT: 0 }));
  deck.cur = null;
}
