import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';
import { BOX, type Box } from './logoArt';
import { $, $$ } from './dom';
import { round2 } from './math';
import { S, T3, deck } from './state';
import { eqTick, scratch, setZone, tapeRolling } from './audio/engine';
import { selectSingle } from './controls';
import type { Stage } from './three/stage';

gsap.registerPlugin(ScrollTrigger);

export interface MotionEnv {
  signal: AbortSignal;
  ctx: gsap.Context;
  stage: () => Stage | null;
  ready: Promise<boolean>;
}

interface Spinner {
  el: HTMLElement;
  angle: number;
  speed: number;
  base: number;
  hover: number;
  hoverBoost: number;
  scrollK: number;
  accel: number;
  scr: number;
  last: number | null;
  target: (() => number) | null;
}

interface Layer { el: HTMLElement; depth: number; group: 'hero' | 'fin'; x: number; y: number }
interface Tilt { el: HTMLElement; group: 'hero' | 'fin'; rx: number; ry: number }
interface Rect { x: number; y: number; w: number; h: number }
interface Offset { x: number; y: number; s: number }

const rectOf = (el: Element): Rect => {
  const r = el.getBoundingClientRect();
  return { x: r.left, y: r.top, w: r.width, h: r.height };
};

function relPos(el: HTMLElement, ancestor: HTMLElement) {
  let x = 0, y = 0;
  let n: HTMLElement | null = el;
  while (n && n !== ancestor) {
    x += n.offsetLeft;
    y += n.offsetTop;
    n = n.offsetParent as HTMLElement | null;
  }
  return { x, y };
}

const rollDeg = (dist: number, boxW: number) => dist / (Math.PI * boxW * 208 / 220) * 360;

function groupMap(pieces: Rect[], G: Rect, target: Rect): Offset[] {
  const s = target.h / G.h;
  return pieces.map(p => ({ x: target.x + (p.x - G.x) * s - p.x, y: target.y + (p.y - G.y) * s - p.y, s }));
}

function logoRects(x0: number, y0: number, w: number) {
  const h = w * .43;
  const px = (b: Box): Rect => ({ x: x0 + b.x / 1000 * w, y: y0 + b.y / 430 * h, w: b.w / 1000 * w, h: b.h / 430 * h });
  return { L: px(BOX.L), cas: px(BOX.cas), stem: px(BOX.stem), vin: px(BOX.vin), P: px(BOX.P) };
}

const at = (st: ScrollTrigger, p: number) => st.start + (st.end - st.start) * p;

export function initMotion({ signal, ctx, stage, ready }: MotionEnv): () => void {
  const root = document.documentElement;
  root.classList.add('motion');
  ScrollTrigger.config({ ignoreMobileResize: true });
  const fine = matchMedia('(hover: hover) and (pointer: fine)').matches;
  const isMobile = () => innerWidth < 800;
  const listen = <K extends keyof WindowEventMap>(type: K, fn: (e: WindowEventMap[K]) => void, opts: AddEventListenerOptions = {}) =>
    addEventListener(type, fn, { ...opts, signal });

  const touch = matchMedia('(hover: none), (pointer: coarse)').matches;
  const lenis = new Lenis({
    lerp: .11,
    smoothWheel: true,
    syncTouch: touch,
    syncTouchLerp: .09,
    touchInertiaMultiplier: 28
  });
  lenis.on('scroll', ScrollTrigger.update);
  const lenisTick = (time: number) => lenis.raf(time * 1000);
  gsap.ticker.add(lenisTick);
  gsap.ticker.lagSmoothing(0);

  const spinners: Spinner[] = [];
  const spinner = (el: HTMLElement, hoverEl: HTMLElement, o: Partial<Spinner>) => {
    const s: Spinner = { el, angle: 0, speed: 0, base: 0, hover: 0, hoverBoost: 360, scrollK: 0, accel: 3, scr: 0, last: null, target: null, ...o };
    hoverEl.addEventListener('pointerenter', () => { s.hover = 1; }, { signal });
    hoverEl.addEventListener('pointerleave', () => { s.hover = 0; }, { signal });
    spinners.push(s);
    return s;
  };

  const layers: Layer[] = [];
  const tilts: Tilt[] = [
    { el: $('#heroTilt'), group: 'hero', rx: 7, ry: -9 },
    { el: $('#finTilt'), group: 'fin', rx: 0, ry: 0 }
  ];
  const factor = (g: 'hero' | 'fin') => g === 'hero' ? S.hero : S.fin;
  const marks = $$('.mark-in');
  let finTl: gsap.core.Timeline | null = null;
  let heroTl!: gsap.core.Timeline, rTl!: gsap.core.Timeline, gTl!: gsap.core.Timeline;

  ctx.add(() => {
    const heroVinyl = $('#heroLogo .p-vinyl'), finVinyl = $('#finaleLogo .p-vinyl');
    const hv = spinner($('.spin', heroVinyl), heroVinyl, { base: 26, hoverBoost: 420 });
    const fv = spinner($('.spin', finVinyl), finVinyl, { base: 26, hoverBoost: 420 });
    (['#heroLogo', '#finaleLogo'] as const).forEach((logo, i) => (['.r-left', '.r-right'] as const).forEach(reel =>
      spinner($(`${logo} ${reel} .spin`), $(`${logo} ${reel}`), {
        scrollK: i ? .5 : .9, hoverBoost: 540, accel: 2, target: () => tapeRolling() ? 150 : 0
      })));
    ([[heroVinyl, hv], [finVinyl, fv]] as const).forEach(([el, s]) => el.addEventListener('click', () => {
      gsap.fromTo(s, { scr: 0 }, { scr: -46, duration: .09, ease: 'power1.inOut', yoyo: true, repeat: 3 });
      scratch();
    }, { signal }));

    $$('#heroLogo .par').forEach(el => layers.push({ el, depth: Number(el.dataset.depth), group: 'hero', x: 0, y: 0 }));
    $$('#finaleLogo .par').forEach(el => layers.push({ el, depth: Number(el.dataset.depth), group: 'fin', x: 0, y: 0 }));
    gsap.set('#heroTilt', { rotationX: 7, rotationY: -9 });
    gsap.set('#finTilt', { rotationX: 0, rotationY: 0 });

    if (fine) {
      root.classList.add('has-cursor');
      const cursor = $('.cursor');
      gsap.set(cursor, { xPercent: -50, yPercent: -50, x: -100, y: -100 });
      const qx = gsap.quickTo(cursor, 'x', { duration: .16, ease: 'power3' });
      const qy = gsap.quickTo(cursor, 'y', { duration: .16, ease: 'power3' });
      listen('pointermove', e => {
        qx(e.clientX);
        qy(e.clientY);
        S.mx = (e.clientX / innerWidth - .5) * 2;
        S.my = (e.clientY / innerHeight - .5) * 2;
        cursor.classList.remove('is-hidden');
      }, { passive: true });
      document.addEventListener('pointerover', e => {
        const t = e.target as Element;
        if (!t.closest || t.closest('#records')) return;
        cursor.classList.toggle('is-link', !!t.closest('a,button,[data-cursor]'));
      }, { signal });
      root.addEventListener('pointerleave', () => cursor.classList.add('is-hidden'), { signal });
    }

    const H = <T extends Element = HTMLElement>(q: string) => $<T>('#heroLogo ' + q);
    const pieces = { L: H('.p-l'), cas: H('.p-cas'), stem: H('.p-stem'), vin: H('.p-vinyl') };
    gsap.set(Object.values(pieces), { transformOrigin: '0 0' });

    const foot = H<SVGGElement>('.l-foot');
    H<SVGSVGElement>('.p-l svg.art').insertAdjacentHTML('afterbegin',
      '<defs><mask id="lFootMask" maskUnits="userSpaceOnUse" x="-60" y="-60" width="400" height="560"><path id="lFootPath" d="M55 258 L55 290 A70 70 0 0 0 125 360 L226 360" fill="none" stroke="#fff" stroke-width="118" stroke-linecap="butt"/></mask></defs>');
    foot.setAttribute('mask', 'url(#lFootMask)');
    const footPath = $<SVGPathElement>('#lFootPath');
    const footLen = Math.ceil(footPath.getTotalLength()) + 2;
    gsap.set(footPath, { strokeDasharray: `${footLen} ${footLen}`, strokeDashoffset: footLen });

    const inkLen = new WeakMap<Element, number>();
    const inks = $$<SVGPathElement>('#heroLogo .k-ink');
    inks.forEach(p => {
      const l = Math.ceil(p.getTotalLength()) + 2;
      p.style.strokeDasharray = `${l} ${l}`;
      inkLen.set(p, l);
    });

    const W = innerWidth, Hh = innerHeight, dist = W * .55;
    const casIntro = H('.p-cas .intro'), stemIntro = H('.p-stem .intro'), vinIntro = H('.p-vinyl .intro');
    gsap.timeline({ delay: .2 })
      .from(H('.p-l .intro'), { x: -W * .6, rotation: -10, duration: .95, ease: 'power3.out' }, 0)
      .to(footPath, { strokeDashoffset: 0, duration: .75, ease: 'power2.inOut' }, .85)
      .from(casIntro, { y: -Hh, duration: .7, ease: 'power2.in' }, .2)
      .to(casIntro, { scaleX: 1.07, scaleY: .88, transformOrigin: '50% 100%', duration: .1, ease: 'power1.out' }, .9)
      .to(casIntro, { scaleX: 1, scaleY: 1, duration: .75, ease: 'elastic.out(1,.35)' }, 1)
      .from(stemIntro, { y: Hh * .8, duration: .75, ease: 'power3.out' }, .35)
      .to(stemIntro, { scaleX: 1.06, scaleY: .9, transformOrigin: '50% 100%', duration: .08 }, 1.08)
      .to(stemIntro, { scaleX: 1, scaleY: 1, duration: .55, ease: 'elastic.out(1,.4)' }, 1.16)
      .from(vinIntro, { x: dist, duration: 1.05, ease: 'power2.out' }, .6)
      .from(H('.p-vinyl .roll'), { rotation: rollDeg(dist, pieces.vin.offsetWidth), duration: 1.05, ease: 'power2.out' }, .6)
      .from(vinIntro, { y: -70, duration: .55, ease: 'bounce.out' }, 1.5)
      .from('#heroLogo .shadow', { opacity: 0, scaleX: .3, duration: .6, stagger: .12 }, 1)
      .fromTo(inks, { strokeDashoffset: (_i: number, el: Element) => inkLen.get(el) ?? 0 }, { strokeDashoffset: 0, duration: .8, stagger: { amount: .7 }, ease: 'power1.inOut' }, .9)
      .from('#heroLogo .frame', { opacity: 0, duration: .3, stagger: .045 }, 1.15)
      .from(['.tagline', '.hint'], { opacity: 0, y: 18, duration: .6, stagger: .12, ease: 'power2.out' }, 1.9);

    const tapeSection = $('#tapes'), slot = $('#tapeSlot');
    const scribble = H<SVGPathElement>('.scribble'), loopWord = H<SVGPathElement>('.label-loop');
    const sLen = Math.ceil(scribble.getTotalLength()) + 2, lLen = Math.ceil(loopWord.getTotalLength()) + 2;
    gsap.set(scribble, { strokeDasharray: `${sLen} ${sLen}`, strokeDashoffset: 0 });
    gsap.set(loopWord, { attr: { opacity: 1 }, strokeDasharray: `${lLen} ${lLen}`, strokeDashoffset: lLen });

    let map: { l: Offset; st: Offset; vi: Offset; c: Offset } | null = null;
    const heroMap = () => {
      if (map) return map;
      const logo = $('#heroLogo'), lp = relPos(logo, tapeSection), sx = tapeSection.getBoundingClientRect().left;
      const R = logoRects(lp.x, lp.y, logo.offsetWidth);
      const toSection = (r: Rect): Rect => ({ x: r.x - sx, y: r.y, w: r.w, h: r.h });
      const [l] = groupMap([R.L], R.L, toSection(rectOf($('.mark-l'))));
      const [st, vi] = groupMap([R.stem, R.vin], R.P, toSection(rectOf($('.mark-p'))));
      const sp = relPos(slot, tapeSection), s = slot.offsetWidth / R.cas.w;
      map = { l, st, vi, c: { x: sp.x - R.cas.x, y: sp.y + (slot.offsetHeight - R.cas.h * s) / 2 - R.cas.y, s } };
      return map;
    };
    const resetMap = () => { map = null; };
    ScrollTrigger.addEventListener('refreshInit', resetMap);
    signal.addEventListener('abort', () => ScrollTrigger.removeEventListener('refreshInit', resetMap));
    const toMap = (k: 'l' | 'st' | 'vi' | 'c') => ({ x: () => heroMap()[k].x, y: () => heroMap()[k].y, scale: () => heroMap()[k].s });

    heroTl = gsap.timeline({
      scrollTrigger: {
        trigger: tapeSection, start: 'top top', end: () => '+=' + Math.round(innerHeight * (isMobile() ? 1.5 : 2.2)),
        pin: true, scrub: true, anticipatePin: 1, invalidateOnRefresh: true,
        onUpdate: self => { S.hero = Math.max(0, 1 - self.progress / .14); }
      }
    });
    heroTl
      .fromTo('.hero-copy', { autoAlpha: 1, y: 0 }, { autoAlpha: 0, y: -30, duration: .1, ease: 'none' }, 0)
      .fromTo('#heroLogo .shadow', { opacity: 1 }, { opacity: 0, duration: .08, ease: 'none' }, .02)
      .to(pieces.L, { ...toMap('l'), duration: .3, ease: 'power2.inOut' }, .03)
      .to(pieces.stem, { ...toMap('st'), duration: .3, ease: 'power2.inOut' }, .05)
      .to(pieces.vin, { ...toMap('vi'), duration: .3, ease: 'power2.inOut' }, .05)
      .fromTo([pieces.L, pieces.stem, pieces.vin], { opacity: 1 }, { opacity: 0, duration: .03, ease: 'none' }, .32)
      .fromTo(marks, { opacity: 0 }, { opacity: 1, duration: .03, ease: 'none' }, .32)
      .to(pieces.cas, { ...toMap('c'), duration: .4, ease: 'power1.inOut', force3D: false }, .06)
      .fromTo(casIntro, { rotation: 0 }, { rotation: -7, duration: .18, ease: 'sine.inOut' }, .08)
      .to(casIntro, { rotation: 0, duration: .2, ease: 'sine.inOut' }, .26)
      .fromTo(scribble, { strokeDashoffset: 0 }, { strokeDashoffset: sLen, duration: .08, ease: 'none' }, .18)
      .fromTo(loopWord, { strokeDashoffset: lLen }, { strokeDashoffset: 0, duration: .14, ease: 'none' }, .27)
      .fromTo('.tape-copy .line, #tapeHint', { opacity: 0, y: 34 }, { opacity: 1, y: 0, stagger: .035, duration: .12, ease: 'power2.out' }, .5)
      .to({}, { duration: .1 }, .9);

    const R = T3.R;
    rTl = gsap.timeline({
      scrollTrigger: {
        trigger: '#records', start: 'top top', end: () => '+=' + Math.round(innerHeight * (isMobile() ? 1.6 : 2.4)),
        pin: true, scrub: true, anticipatePin: 1, invalidateOnRefresh: true,
        onUpdate: self => { if (self.progress < .72 && deck.cur !== null) selectSingle(null); },
        onLeave: () => selectSingle(null),
        onLeaveBack: () => selectSingle(null)
      }
    });
    rTl
      .fromTo(R, { drop: 0 }, { drop: 1, duration: .2, ease: 'power3.out' }, 0)
      .fromTo(R, { out: 0 }, { out: 1, duration: .15, ease: 'power2.out' }, .22)
      .fromTo(R, { away: 0 }, { away: 1, duration: .13, ease: 'power2.in' }, .38)
      .fromTo(R, { lift: 0 }, { lift: 1, duration: .12, ease: 'power2.inOut' }, .5)
      .fromTo(R, { split: 0 }, { split: 1, duration: .15, ease: 'none' }, .6)
      .fromTo(R, { tags: 0 }, { tags: 1, duration: .04, ease: 'none' }, .74)
      .fromTo('.rec-copy .line', { opacity: 0, x: -40 }, { opacity: 1, x: 0, stagger: .02, duration: .08, ease: 'power2.out' }, .76)
      .to({}, { duration: .1 }, .9);

    const typing = gsap.fromTo('#typed .ch', { opacity: 0 }, { opacity: 1, duration: .01, stagger: .07, ease: 'none', paused: true });
    gTl = gsap.timeline({
      scrollTrigger: {
        trigger: '#gear', start: 'top top', end: () => '+=' + Math.round(innerHeight * (isMobile() ? 1 : 1.4)),
        pin: true, scrub: true, anticipatePin: 1, invalidateOnRefresh: true,
        onUpdate: self => {
          if (self.progress > .7) typing.play();
          else if (self.progress < .55) typing.reverse();
        }
      }
    });
    gTl
      .fromTo('.gear-copy .line', { opacity: 0, y: 30 }, { opacity: 1, y: 0, stagger: .05, duration: .15, ease: 'power2.out' }, 0)
      .fromTo('#shelfLine', { scaleX: 0 }, { scaleX: 1, transformOrigin: '0 50%', duration: .3, ease: 'power2.out' }, .02)
      .fromTo('.gadget', { y: () => innerHeight * .65, opacity: 0 }, { y: 0, opacity: 1, stagger: .08, duration: .32, ease: 'back.out(1.7)' }, .08)
      .fromTo('.caret', { opacity: 0 }, { opacity: 1, duration: .05 }, .66)
      .to({}, { duration: .3 }, .7);

    const F = <T extends Element = HTMLElement>(q: string) => $<T>('#finaleLogo ' + q);
    const fin = { L: F('.p-l'), cas: F('.p-cas'), stem: F('.p-stem'), vin: F('.p-vinyl') };
    const finAll = Object.values(fin), finShadows = $$('#finaleLogo .shadow');
    gsap.set(finAll, { transformOrigin: '0 0', opacity: 0 });
    gsap.set(finShadows, { opacity: 0 });

    const playFinale = () => ctx.add(() => {
      finTl?.kill();
      S.fin = 0;
      tilts[1].rx = tilts[1].ry = 0;
      gsap.set('#finTilt', { rotationX: 0, rotationY: 0 });
      const st = rectOf($('#finaleStage')), R2 = logoRects(st.x, st.y, st.w);
      const [l] = groupMap([R2.L], R2.L, rectOf($('.mark-l')));
      const [sm] = groupMap([R2.stem, R2.vin], R2.P, rectOf($('.mark-p')));
      finTl = gsap.timeline()
        .set(fin.L, { x: l.x, y: l.y, scale: l.s, opacity: 1 })
        .set(fin.stem, { x: sm.x, y: sm.y, scale: sm.s, opacity: 1 })
        .to('.mark', { opacity: 0, duration: .12 }, 0)
        .to([fin.L, fin.stem], { x: 0, y: 0, scale: 1, duration: 1.1, ease: 'power3.inOut', stagger: .06 }, 0)
        .to(finShadows, { opacity: 1, duration: .5, stagger: .08 }, 1.05)
        .to(S, { fin: 1, duration: 1, ease: 'power1.inOut' }, 1.7)
        .set(fin.cas, { opacity: 1 }, .3)
        .fromTo(F('.p-cas .intro'), { y: -(st.y + st.w * .43 + 200), rotation: -12 }, { y: 0, rotation: 0, duration: .95, ease: 'bounce.out' }, .3);
      if (T3.ok) {
        const vr = rectOf($('#finView')), lw = st.w, lh = lw * .43, ox = st.x - vr.x, oy = st.y - vr.y;
        const lx = ox + 880 / 1000 * lw, ly = oy + 112 / 430 * lh, ld = 208 / 1000 * lw;
        const lp = T3.finLp, d2 = vr.w - lx + ld;
        Object.assign(lp, { x: lx + d2, y: ly, s: ld / 3, roll: -d2 / (ld / 2), o: 1 });
        finTl
          .to(lp, { x: lx, roll: 0, duration: 1.25, ease: 'power2.out' }, .3)
          .fromTo(fin.vin, { opacity: 0 }, { opacity: 1, duration: .4, ease: 'none' }, 1.5)
          .to(lp, { o: 0, duration: .4, ease: 'none' }, 1.55);
      } else {
        const d = innerWidth - R2.vin.x + 30;
        finTl
          .set(fin.vin, { opacity: 1 }, .25)
          .fromTo(F('.p-vinyl .intro'), { x: d }, { x: 0, duration: 1.1, ease: 'power2.out' }, .25)
          .fromTo(F('.p-vinyl .roll'), { rotation: rollDeg(d, fin.vin.offsetWidth) }, { rotation: 0, duration: 1.1, ease: 'power2.out' }, .25);
      }
    });
    const resetFinale = () => ctx.add(() => {
      finTl?.kill();
      S.fin = 0;
      T3.finLp.o = 0;
      gsap.to(finAll, { opacity: 0, duration: .25 });
      gsap.to(finShadows, { opacity: 0, duration: .25 });
      gsap.to('.mark', { opacity: 1, duration: .25 });
    });
    ScrollTrigger.create({
      trigger: '#finaleStage', start: 'top 78%',
      onEnter: () => { void ready.then(() => { if (!signal.aborted) playFinale(); }); },
      onLeaveBack: resetFinale
    });
  });

  const heroST = heroTl.scrollTrigger!;
  const maxY = () => document.documentElement.scrollHeight - innerHeight;
  type Route = { tl: gsap.core.Timeline; p: number; dur: number } | { y: () => number };
  const routes: Record<string, Route> = {
    '#top': { y: () => 0 },
    '#tapes': { tl: heroTl, p: .75, dur: 3.4 },
    '#records': { tl: rTl, p: .92, dur: 5 },
    '#gear': { tl: gTl, p: .86, dur: 3 },
    '#visit': { y: maxY }
  };
  const curtain = document.createElement('div');
  curtain.className = 'curtain';
  curtain.setAttribute('aria-hidden', 'true');
  document.body.appendChild(curtain);
  let busy = false;
  let replay: gsap.core.Tween | null = null;
  const setY = (y: number) => {
    lenis.scrollTo(y, { immediate: true, force: true });
    ScrollTrigger.update();
  };
  const stopReplay = () => {
    replay?.kill();
    replay = null;
  };
  listen('wheel', stopReplay, { passive: true });
  listen('touchstart', stopReplay, { passive: true });
  listen('keydown', e => {
    if (['ArrowDown', 'ArrowUp', 'PageDown', 'PageUp', ' ', 'Home', 'End'].includes(e.key)) stopReplay();
  });
  const goTo = (hash: string) => {
    const route = routes[hash];
    if (!route || busy) return;
    busy = true;
    stopReplay();
    curtain.classList.add('on');
    window.setTimeout(() => {
      if (signal.aborted) return;
      if ('tl' in route) {
        setY(at(route.tl.scrollTrigger!, route.p));
        route.tl.progress(0);
      } else setY(route.y());
      requestAnimationFrame(() => requestAnimationFrame(() => {
        curtain.classList.remove('on');
        busy = false;
        if ('tl' in route) ctx.add(() => {
          replay = gsap.fromTo(route.tl, { progress: 0 }, {
            progress: route.p, duration: route.dur, ease: 'power1.inOut', delay: .15, onComplete: () => { replay = null; }
          });
        });
      }));
    }, 260);
  };
  $$<HTMLAnchorElement>('a[href^="#"]').forEach(a => a.addEventListener('click', e => {
    const hash = a.getAttribute('href') ?? '';
    if (!routes[hash]) return;
    e.preventDefault();
    goTo(hash);
  }, { signal }));

  const bars = $$('#eq i');
  let lastY = scrollY;
  const tick = (_time: number, deltaMs: number) => {
    const d = Math.min(deltaMs, 64) / 1000;
    const y = scrollY, v = (y - lastY) / Math.max(d, .001);
    lastY = y;
    S.vel += (v - S.vel) * Math.min(1, d * 10);
    setZone(y > heroST.end + 2 || (y >= at(heroST, .5) && heroTl.progress() >= .55));
    for (const s of spinners) {
      const target = (s.target ? s.target() : s.base) + s.hover * s.hoverBoost + S.vel * s.scrollK;
      s.speed += (target - s.speed) * Math.min(1, d * s.accel);
      s.angle = (s.angle + s.speed * d) % 360;
      const a = round2(s.angle + s.scr);
      if (a !== s.last) {
        s.last = a;
        gsap.set(s.el, { rotation: a });
      }
    }
    const k = 1 - Math.pow(.002, d);
    for (const p of layers) {
      const fc = fine ? factor(p.group) : 0, tx = S.mx * p.depth * fc, ty = S.my * p.depth * fc;
      if (Math.abs(tx - p.x) > .02 || Math.abs(ty - p.y) > .02) {
        p.x += (tx - p.x) * k;
        p.y += (ty - p.y) * k;
        gsap.set(p.el, { x: p.x, y: p.y });
      }
    }
    for (const t of tilts) {
      const fc = factor(t.group), m = fine ? 1 : 0;
      const rx = (7 - S.my * 5 * m) * fc, ry = (-9 + S.mx * 8 * m) * fc;
      if (Math.abs(rx - t.rx) > .01 || Math.abs(ry - t.ry) > .01) {
        t.rx += (rx - t.rx) * k;
        t.ry += (ry - t.ry) * k;
        gsap.set(t.el, { rotationX: t.rx, rotationY: t.ry });
      }
    }
    eqTick(bars);
    stage()?.frame(performance.now());
  };
  gsap.ticker.add(tick);

  const refresh = () => ScrollTrigger.refresh();
  void ready.then(() => { if (!signal.aborted) refresh(); });
  void document.fonts?.ready.then(() => { if (!signal.aborted) refresh(); });
  listen('load', refresh);

  return () => {
    stopReplay();
    finTl?.kill();
    gsap.ticker.remove(tick);
    gsap.ticker.remove(lenisTick);
    gsap.ticker.lagSmoothing(500, 33);
    lenis.destroy();
    curtain.remove();
    root.classList.remove('motion', 'has-cursor');
  };
}
