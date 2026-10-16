import type { GadgetKey } from '../data/content';
import { C } from './palette';
import { ext, f, plain, pts, rr, sketch, tinted, type Pt } from './sketch';

type Frame = [start: number, length: number, colour: number];
type Part = [from: number, to: number, cls: string];
type Sample = [x: number, y: number, tx: number, ty: number];

interface StripConfig {
  pt: (s: number) => Sample;
  hw: number;
  hi: number;
  po: number;
  perf: [number, number];
  pp: number;
  frames: Frame[];
  parts: Part[];
}

export interface Box { x: number; y: number; w: number; h: number }

export const BOX = {
  L: { x: 0, y: 0, w: 240, h: 420 },
  cas: { x: 255, y: 110, w: 490, h: 310 },
  stem: { x: 794, y: 170, w: 80, h: 250 },
  vin: { x: 770, y: 2, w: 220, h: 220 },
  P: { x: 770, y: 2, w: 220, h: 418 }
} satisfies Record<string, Box>;

const pct = (b: Box) => `left:${b.x / 10}%;top:${f(b.y / 4.3)}%;width:${b.w / 10}%;height:${f(b.h / 4.3)}%`;

function strip(cfg: StripConfig) {
  const sample = (a: number, b: number, step: number) => {
    const n = Math.max(2, Math.ceil((b - a) / step) + 1);
    const out: Sample[] = [];
    for (let i = 0; i < n; i++) out.push(cfg.pt(a + (b - a) * i / (n - 1)));
    return out;
  };
  const band = (a: number, b: number, h: number, step: number): Pt[] => {
    const P = sample(a, b, step);
    const left = P.map(([x, y, tx, ty]): Pt => [f(x - ty * h), f(y + tx * h)]);
    const right = P.map(([x, y, tx, ty]): Pt => [f(x + ty * h), f(y - tx * h)]);
    return left.concat(right.reverse());
  };
  const cols = [C.coral, C.mustard, C.sky];
  return cfg.parts.map(([a, b, cls]) => {
    const body = band(a, b, cfg.hw, 7);
    let g = `<polygon points="${pts(body)}" fill="${C.side}" transform="translate(6 8)"/>`;
    g += sketch('poly', body, { fill: C.ink, fillStyle: 'solid', strokeWidth: 2.4, roughness: .8 });
    const gl = sample(a, b, 10).map(([x, y, tx, ty]): Pt => [f(x - ty * (cfg.hw - 3.5)), f(y + tx * (cfg.hw - 3.5))]);
    g += `<polyline points="${pts(gl)}" fill="none" stroke="#fff" stroke-opacity=".2" stroke-width="2"/>`;
    for (let s = a + cfg.pp / 2; s < b; s += cfg.pp) {
      const [x, y, tx, ty] = cfg.pt(s);
      const ang = f(Math.atan2(ty, tx) * 180 / Math.PI - 90);
      for (const sd of [1, -1]) {
        const px = f(x - ty * cfg.po * sd), py = f(y + tx * cfg.po * sd);
        g += `<rect x="${-cfg.perf[0] / 2}" y="${-cfg.perf[1] / 2}" width="${cfg.perf[0]}" height="${cfg.perf[1]}" rx="1.2" fill="${C.light}" transform="translate(${px} ${py}) rotate(${ang})"/>`;
      }
    }
    cfg.frames.forEach(([s0, len, ci]) => {
      if (s0 < a || s0 >= b) return;
      const poly = band(s0, s0 + len, cfg.hi, 4), col = cols[ci % 3];
      g += `<g class="frame"><polygon points="${pts(poly)}" fill="${C.light}"/><polygon points="${pts(poly)}" fill="${col}" fill-opacity=".3"/>` +
        sketch('poly', poly, { fill: col, stroke: 'none', hachureGap: 3.1, fillWeight: 1.5, hachureAngle: -38 - (ci * 13) % 24, roughness: 1.3 }) + `</g>`;
    });
    return `<g class="${cls}">${g}</g>`;
  }).join('');
}

export function lArt() {
  const pt = (s: number): Sample => {
    if (s <= 270) return [55, 20 + s, 0, 1];
    if (s <= 380) {
      const th = Math.PI - (s - 270) / 70;
      return [125 + 70 * Math.cos(th), 290 + 70 * Math.sin(th), Math.sin(th), -Math.cos(th)];
    }
    return [125 + (s - 380), 360, 1, 0];
  };
  const frames: Frame[] = [];
  let i = 0;
  for (let k = 0; k < 7; k++) frames.push([4 + k * 38, 33, i++]);
  for (let k = 0; k < 5; k++) frames.push([275 + k * 38, 33, i++]);
  return strip({ pt, hw: 38, hi: 25, po: 31.5, perf: [5, 7], pp: 11, frames, parts: [[0, 270, 'l-top'], [270, 470, 'l-foot']] });
}

export function stemArt() {
  const frames: Frame[] = [];
  for (let k = 0; k < 6; k++) frames.push([9.5 + k * 34, 29, k]);
  return strip({ pt: s => [40, 10 + s, 0, 1], hw: 32, hi: 21, po: 26.5, perf: [4, 6], pp: 10, frames, parts: [[0, 218, 'stem-g']] });
}

const LOOP_D = 'M170 45 L168 79 Q182 80 196 77 M220 45 C237.3 45 237.3 79 220 79 C202.7 79 202.7 45 221.5 45.8 M256 45 C273.3 45 273.3 79 256 79 C238.7 79 238.7 45 257.5 45.8 M286 80 L287 45 C309 42 312 64 288 63 M164 88 Q240 82 320 87';

function scribbleD() {
  let s = 7;
  const rnd = () => { s = (s * 9301 + 49297) % 233280; return s / 233280; };
  let d = '';
  ([[78, 112], [126, 168], [182, 300], [314, 412]] as Pt[]).forEach(([a, b]) => {
    let x = a;
    d += `M${a} 66`;
    while (x < b) {
      const w = 7 + rnd() * 5, h = 10 + rnd() * 12;
      d += ` C${f(x + 1)} ${f(66 - h)} ${f(x + w * .9)} ${f(66 - h)} ${f(x + w * .6)} 66 S${f(x + w)} 70 ${f(x + w + 2)} 64`;
      x += w + 2;
    }
  });
  return d;
}

function screw(x: number, y: number, r: number) {
  return `<circle cx="${x}" cy="${y}" r="${r}" fill="${C.teal}"/>` + sketch('circle', [x, y, r * 2], { strokeWidth: 1.6, roughness: .6 }) +
    `<path d="M${f(x - r * .55)} ${y}H${f(x + r * .55)}" stroke="${C.ink}" stroke-width="1.4"/>`;
}

export function cassetteArt({ ids = false, label = 'scribble' }: { ids?: boolean; label?: 'scribble' | 'loop' } = {}) {
  let g = '';
  g += `<path d="${rr(16, 16, 460, 282, 18)}" fill="${C.side}"/>`;
  g += sketch('path', rr(10, 8, 460, 282, 18), { fill: C.ink, fillStyle: 'solid', strokeWidth: 2.6, roughness: .8 });
  g += sketch('path', rr(16, 14, 448, 270, 14), { fill: '#3C3742', stroke: 'none', hachureGap: 8, fillWeight: 2.2, hachureAngle: -18, roughness: 1.6 });
  g += `<path d="${rr(10, 8, 460, 282, 18)}" fill="url(#gGloss)"/>`;
  g += plain(rr(40, 26, 410, 190, 10), C.cream);
  g += sketch('path', rr(40, 26, 410, 190, 10), { fill: '#E2CF9E', hachureGap: 6, fillWeight: 1, hachureAngle: -35, strokeWidth: 2 });
  g += sketch('line', [58, 94, 432, 92], { strokeWidth: 1.6 });
  g += sketch('line', [58, 100, 432, 99], { strokeWidth: 1, roughness: 1.5 });
  if (label === 'scribble') g += `<path class="scribble" d="${scribbleD()}" fill="none" stroke="${C.ink}" stroke-width="3"/>`;
  g += `<path class="label-loop" d="${LOOP_D}" fill="none" stroke="${C.ink}" stroke-width="3.6" transform="rotate(-3 240 62)"${label === 'scribble' ? ' opacity="0"' : ''}/>`;
  g += plain(rr(96, 108, 298, 84, 14), '#E9E3D5') + sketch('path', rr(96, 108, 298, 84, 14), { strokeWidth: 2.2 });
  for (const cx of [176, 314]) g += `<circle cx="${cx}" cy="150" r="36" fill="${C.light}"/>` + sketch('circle', [cx, 150, 72], { strokeWidth: 2.2 });
  g += sketch('rect', [224, 128, 40, 44], { fill: C.ink, hachureGap: 2.4, fillWeight: 1.2, hachureAngle: -60, strokeWidth: 2 });
  g += sketch('path', 'M274 128 Q292 150 274 172 Z', { fill: C.ink, hachureGap: 2.6, fillWeight: 1.1, strokeWidth: 2 });
  for (const x of [60, 406]) {
    [C.red, C.yellow, C.blue].forEach((col, i) => {
      const y = 126 + i * 15;
      g += `<rect x="${x}" y="${y}" width="24" height="13" fill="${col}" fill-opacity=".55"/>` + sketch('rect', [x, y, 24, 13], { fill: col, hachureGap: 2.6, fillWeight: 1.3, strokeWidth: 1.2, roughness: .8 });
    });
  }
  const tz = 'M112 290 L142 232 L348 232 L378 290 Z';
  g += plain(tz, '#DCD6C8') + sketch('path', tz, { strokeWidth: 2.2 });
  g += sketch('line', [152, 246, 338, 246], { strokeWidth: 1.2 }) + sketch('line', [132, 280, 358, 280], { strokeWidth: 1.2, roughness: 1.6 });
  g += screw(172, 262, 8) + screw(318, 262, 8);
  g += sketch('rect', [222, 253, 14, 11], { fill: C.teal, fillStyle: 'solid', strokeWidth: 1.6 });
  g += sketch('path', 'M258 253 h8 q8 5.5 0 11 h-8 z', { fill: C.teal, fillStyle: 'solid', strokeWidth: 1.6 });
  ([[28, 24], [462, 24], [28, 274], [462, 274]] as Pt[]).forEach(([x, y]) => { g += screw(x, y, 6); });
  return `<g${ids ? ' id="cassette"' : ''} class="cassette-art">${g}</g>`;
}

function reelArt(id?: string) {
  let g = sketch('circle', [0, 0, 60], { fill: '#FFFDF6', fillStyle: 'solid', strokeWidth: 2.4, roughness: .9 });
  const p: Pt[] = [];
  for (let k = 0; k < 6; k++) {
    const b = k * 60;
    ([[b - 22, 13], [b - 9, 19], [b + 9, 19], [b + 22, 13]] as Pt[]).forEach(([an, r]) => {
      const t = an * Math.PI / 180;
      p.push([f(Math.cos(t) * r), f(Math.sin(t) * r)]);
    });
  }
  g += sketch('poly', p, { fill: '#FFFDF6', fillStyle: 'solid', strokeWidth: 2, roughness: .7 });
  g += `<circle r="6" fill="${C.ink}"/><circle r="2" cx="-1.5" cy="-1.5" fill="#fff" opacity=".5"/>`;
  return `<g${id ? ` id="${id}"` : ''}>${g}</g>`;
}

function reelDiv(cls: 'r-left' | 'r-right', id?: string) {
  const left = cls === 'r-left' ? 27.755 : 55.918;
  return `<div class="reel ${cls}" style="left:${left}%;top:35.484%;width:16.327%;height:25.806%"><div class="spin"><svg class="art" viewBox="-40 -40 80 80">${reelArt(id)}</svg></div></div>`;
}

export function vinylDisc(ids: boolean) {
  let g = sketch('circle', [0, 0, 208], { fill: '#17151A', fillStyle: 'solid', strokeWidth: 2.4, roughness: .7 });
  for (let r = 42; r <= 100; r += 3.5) g += `<circle r="${r}" fill="none" stroke="#2D2A32" stroke-width=".9"/>`;
  const arcs: [number, number, number][] = [[58, .2, 1.7], [58, 3.3, 4.6], [68, 1.1, 2.9], [68, 4.1, 5.9], [78, .5, 2.2], [78, 3.6, 5.2], [88, 1.6, 3.4], [88, 4.6, 6.1], [96, .1, 1.3], [96, 2.6, 4.2]];
  arcs.forEach(([r, a, b]) => { g += sketch('arc', [0, 0, r * 2, r * 2, a, b], { stroke: C.teal, strokeWidth: 2.6, roughness: 1.3, bowing: 1.5 }); });
  let lab = `<circle r="37" fill="${C.magenta}"/>` + sketch('circle', [0, 0, 74], { fill: '#C2509E', hachureGap: 3, fillWeight: 1.3, hachureAngle: -30, strokeWidth: 2, roughness: .9 });
  lab += sketch('ellipse', [0, -8, 11, 12], { strokeWidth: 2, roughness: .6 }) + sketch('ellipse', [0, 6, 14, 15], { strokeWidth: 2, roughness: .6 });
  lab += `<text y="27" text-anchor="middle" font-family="Space Mono, monospace" font-size="7" font-weight="700" fill="${C.light}" letter-spacing="1">LOOP · 33⅓</text>`;
  lab += `<circle r="3.4" fill="${C.light}"/>`;
  g += `<g${ids ? ' id="vinyl-label"' : ''} class="vinyl-label">${lab}</g>`;
  return `<g${ids ? ' id="vinyl"' : ''}>${g}</g>`;
}

export function vinylSheen() {
  const wedge = (a1: number, a2: number) => {
    const r = 103, t1 = a1 * Math.PI / 180, t2 = a2 * Math.PI / 180;
    return `M0 0L${f(r * Math.cos(t1))} ${f(r * Math.sin(t1))}A${r} ${r} 0 0 1 ${f(r * Math.cos(t2))} ${f(r * Math.sin(t2))}Z`;
  };
  return `<path d="${wedge(-72, -34)}" fill="url(#gSheen)"/><path d="${wedge(108, 146)}" fill="url(#gSheen)"/><path d="M-82 -60A102 102 0 0 1 -32 -96" fill="none" stroke="#fff" stroke-opacity=".35" stroke-width="2.4" stroke-linecap="round"/>`;
}

function vinylLayers(ids: boolean) {
  return `<svg class="art v-under" viewBox="-110 -110 220 220"><circle cx="5" cy="7" r="104" fill="${C.side}"/></svg>` +
    `<div class="roll"><div class="spin"><svg class="art" viewBox="-110 -110 220 220">${vinylDisc(ids)}</svg></div></div>` +
    `<svg class="art v-sheen" viewBox="-110 -110 220 220">${vinylSheen()}</svg>`;
}

export function buildLogo(el: HTMLElement, { ids, label }: { ids: boolean; label: 'scribble' | 'loop' }) {
  const id = (n: string) => ids ? ` id="${n}"` : '';
  el.innerHTML =
    `<div class="shadow" style="${pct({ x: 8, y: 384, w: 250, h: 40 })}"></div>` +
    `<div class="shadow" style="${pct({ x: 262, y: 384, w: 500, h: 44 })}"></div>` +
    `<div class="shadow" style="${pct({ x: 784, y: 386, w: 124, h: 38 })}"></div>` +
    `<div class="piece p-l" style="${pct(BOX.L)}"><div class="intro"><div class="par" data-depth="6"><svg class="art" viewBox="0 0 240 420"><g${id('film-l')}>${lArt()}</g></svg></div></div></div>` +
    `<div class="piece p-cas" style="${pct(BOX.cas)}"><div class="intro"><div class="par" data-depth="10"><svg class="art" viewBox="0 0 490 310">${cassetteArt({ ids, label })}</svg>${reelDiv('r-left', ids ? 'reel-left' : undefined)}${reelDiv('r-right', ids ? 'reel-right' : undefined)}</div></div></div>` +
    `<div class="piece p-stem" style="${pct(BOX.stem)}"><div class="intro"><div class="par" data-depth="7"><svg class="art" viewBox="0 0 80 250"><g${id('film-p')}>${stemArt()}</g></svg></div></div></div>` +
    `<div class="piece p-vinyl" data-cursor data-scratch style="${pct(BOX.vin)}"><div class="intro"><div class="par" data-depth="10">${vinylLayers(ids)}</div></div></div>`;
}

export const tapeStaticHtml = () =>
  `<svg class="art" viewBox="0 0 490 310">${cassetteArt({ label: 'loop' })}</svg>${reelDiv('r-left')}${reelDiv('r-right')}`;

export const markLHtml = () => `<svg class="art" viewBox="0 0 240 420">${lArt()}</svg>`;

export const markPHtml = () =>
  `<svg class="art" viewBox="770 2 220 418"><g transform="translate(794 170)">${stemArt()}</g><g transform="translate(880 112)"><circle cx="5" cy="7" r="104" fill="${C.side}"/>${vinylDisc(false)}${vinylSheen()}</g></svg>`;

export const shelfLineHtml = () =>
  sketch('line', [0, 10, 1000, 10], { strokeWidth: 3, roughness: 1.2, bowing: .4 }) + sketch('line', [8, 15, 992, 15], { strokeWidth: 1.2, roughness: 1.6 });

export const GADGET_ART: Record<GadgetKey, () => string> = {
  headphones: () => {
    const cl = rr(20, 104, 38, 64, 15), cr = rr(142, 104, 38, 64, 15);
    return sketch('path', 'M44 120 C38 30 162 30 156 120', { strokeWidth: 11, roughness: .5 }) + ext(cl) + ext(cr) + tinted(cl, C.coral) + tinted(cr, C.coral);
  },
  speaker: () => {
    const body = rr(24, 70, 152, 92, 24);
    return ext(body) + tinted(body, C.teal) + sketch('circle', [72, 116, 52], { fill: C.ink, fillStyle: 'solid' }) + sketch('circle', [128, 116, 52], { fill: C.ink, fillStyle: 'solid' });
  },
  earbuds: () => {
    const cs = rr(46, 104, 108, 70, 32);
    return ext(cs) + tinted(cs, '#C9B98A', C.cream) + sketch('circle', [72, 62, 32], { fill: C.sky }) + sketch('circle', [128, 62, 32], { fill: C.sky });
  },
  suitcase: () => tinted('M22 120 H168 V158 H22 Z', C.mustard) + sketch('ellipse', [102, 106, 112, 22], { fill: C.ink, fillStyle: 'solid' }),
  walkman: () => {
    const body = rr(48, 40, 106, 140, 12);
    return ext(body) + tinted(body, C.sky) + sketch('path', rr(62, 58, 78, 50, 9));
  }
};
