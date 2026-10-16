import { $, $$ } from './dom';
import { T3 } from './state';
import { scratch, setZone } from './audio/engine';
import { selectSingle } from './controls';
import type { Stage } from './three/stage';

interface ReducedEnv {
  signal: AbortSignal;
  stage: () => Stage | null;
  ready: Promise<boolean>;
}

export function initReduced({ signal, stage, ready }: ReducedEnv): () => void {
  const root = document.documentElement;
  root.classList.add('static', 'reduced');

  const reveal = new IntersectionObserver(entries => entries.forEach(e => {
    if (!e.isIntersecting) return;
    e.target.classList.add('in');
    reveal.unobserve(e.target);
  }), { threshold: .15 });
  $$('.fade').forEach(el => reveal.observe(el));

  Object.assign(T3.R, { drop: 1, out: 1, lift: 1, away: 1, split: 1, tags: 1 });
  const leave = new IntersectionObserver(entries => entries.forEach(e => { if (!e.isIntersecting) selectSingle(null); }));
  leave.observe($('#records'));
  $$('[data-scratch]').forEach(el => el.addEventListener('click', scratch, { signal }));

  let raf = 0;
  const loop = (now: number) => {
    setZone($('#tapeSlot').getBoundingClientRect().top < innerHeight * .8);
    stage()?.frame(now);
    raf = requestAnimationFrame(loop);
  };
  void ready.then(() => { if (!signal.aborted) raf = requestAnimationFrame(loop); });

  return () => {
    cancelAnimationFrame(raf);
    reveal.disconnect();
    leave.disconnect();
    root.classList.remove('static', 'reduced');
  };
}
