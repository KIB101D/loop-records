import rough from 'roughjs';
import type { Drawable, Options } from 'roughjs/bin/core';
import { C } from './palette';
import { round2 } from './math';

export type Pt = [number, number];
type Quad = [number, number, number, number];

const gen = rough.generator();
let seed = 17;

export const pts = (a: Pt[]) => a.map(p => `${p[0]},${p[1]}`).join(' ');

export function sketch(kind: 'rect' | 'ellipse' | 'line', a: Quad, opt?: Options): string;
export function sketch(kind: 'circle', a: [number, number, number], opt?: Options): string;
export function sketch(kind: 'arc', a: [number, number, number, number, number, number], opt?: Options): string;
export function sketch(kind: 'poly', a: Pt[], opt?: Options): string;
export function sketch(kind: 'path', a: string, opt?: Options): string;
export function sketch(kind: string, a: unknown, opt: Options = {}): string {
  const o: Options = {
    roughness: 1, bowing: .8, stroke: C.ink, strokeWidth: 2.2, seed: seed++,
    fillWeight: 1.4, hachureGap: 3.6, hachureAngle: -48, disableMultiStrokeFill: true, ...opt
  };
  let d: Drawable;
  const n = a as number[];
  switch (kind) {
    case 'rect': d = gen.rectangle(n[0], n[1], n[2], n[3], o); break;
    case 'ellipse': d = gen.ellipse(n[0], n[1], n[2], n[3], o); break;
    case 'line': d = gen.line(n[0], n[1], n[2], n[3], o); break;
    case 'circle': d = gen.circle(n[0], n[1], n[2], o); break;
    case 'arc': d = gen.arc(n[0], n[1], n[2], n[3], n[4], n[5], false, o); break;
    case 'poly': d = gen.polygon(a as Pt[], o); break;
    default: d = gen.path(a as string, o);
  }
  return gen.toPaths(d).map(p => {
    const isFill = !!p.fill && p.fill !== 'none';
    const isHatch = !isFill && !!o.fill && p.stroke === o.fill && p.strokeWidth === o.fillWeight;
    const cls = isFill ? 'k-solid' : isHatch ? 'k-hatch' : 'k-ink';
    return `<path class="${cls}" d="${p.d}" fill="${isFill ? p.fill : 'none'}" stroke="${isFill ? 'none' : p.stroke}" stroke-width="${p.strokeWidth}"/>`;
  }).join('');
}

export function rr(x: number, y: number, w: number, h: number, r: number) {
  return `M${x + r} ${y}H${x + w - r}Q${x + w} ${y} ${x + w} ${y + r}V${y + h - r}Q${x + w} ${y + h} ${x + w - r} ${y + h}H${x + r}Q${x} ${y + h} ${x} ${y + h - r}V${y + r}Q${x} ${y} ${x + r} ${y}Z`;
}

export const ext = (d: string, dx = 5, dy = 6) => `<path d="${d}" fill="${C.side}" transform="translate(${dx} ${dy})"/>`;
export const plain = (d: string, fill: string) => `<path d="${d}" fill="${fill}"/>`;
export const tinted = (d: string, col: string, base: string = C.light, opt: Options = {}) =>
  plain(d, base) + `<path d="${d}" fill="${col}" fill-opacity=".28"/>` +
  sketch('path', d, { fill: col, hachureGap: 3.4, fillWeight: 1.4, strokeWidth: 2.3, ...opt });

export const f = round2;
