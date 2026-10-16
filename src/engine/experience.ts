import { gsap } from 'gsap';
import { GADGETS } from '../data/content';
import { $, $$ } from './dom';
import { buildLogo, GADGET_ART, markLHtml, markPHtml, shelfLineHtml, tapeStaticHtml } from './logoArt';
import { resetState, T3 } from './state';
import { disposeAudio, onAudioChange, suspendWhileHidden, toggleSound, unlock } from './audio/engine';
import { renderUi, selectSingle } from './controls';
import { createStage, type Stage } from './three/stage';
import { initMotion } from './motion';
import { initReduced } from './reduced';

const FONTS = ['110px "Caveat Brush"', '200px "Shrikhand"', '700 30px "Space Mono"', '700 30px "Schibsted Grotesk"', '400 30px "Schibsted Grotesk"'];

function loadFonts() {
  if (!document.fonts?.load) return Promise.resolve();
  return Promise.race([
    Promise.all(FONTS.map(f => document.fonts.load(f).catch(() => []))),
    new Promise(resolve => setTimeout(resolve, 2500))
  ]);
}

function drawArt(signal: AbortSignal) {
  buildLogo($('#heroLogo'), { ids: true, label: 'scribble' });
  buildLogo($('#finaleLogo'), { ids: false, label: 'loop' });
  $('#tapeStatic').innerHTML = tapeStaticHtml();
  $('.mark-l').innerHTML = markLHtml();
  $('.mark-p').innerHTML = markPHtml();
  $('#shelfLine').innerHTML = shelfLineHtml();
  $$('.gadget').forEach((el, i) => {
    $('.g-fallback', el).innerHTML = `<svg class="art" viewBox="0 0 200 200">${GADGET_ART[GADGETS[i].key]()}</svg>`;
    const state = T3.gadgets[i];
    const on = () => { state.hoverT = 1; }, off = () => { state.hoverT = 0; };
    el.addEventListener('pointerenter', on, { signal });
    el.addEventListener('pointerleave', off, { signal });
    el.addEventListener('focus', on, { signal });
    el.addEventListener('blur', off, { signal });
  });
}

function bindControls(signal: AbortSignal) {
  (['pointerdown', 'keydown', 'touchend'] as const).forEach(type =>
    addEventListener(type, unlock, { capture: true, passive: true, signal }));
  document.addEventListener('visibilitychange', suspendWhileHidden, { signal });
  $('#soundToggle').addEventListener('click', toggleSound, { signal });
  $$('.pick-tag').forEach((b, i) => {
    const state = T3.singles[i];
    b.addEventListener('click', () => selectSingle(i), { signal });
    b.addEventListener('pointerenter', () => { state.hovT = 1; }, { signal });
    b.addEventListener('pointerleave', () => { state.hovT = 0; }, { signal });
    b.addEventListener('focus', () => { state.hovT = 1; }, { signal });
    b.addEventListener('blur', () => { state.hovT = 0; }, { signal });
  });
}

export function startExperience(): () => void {
  const controller = new AbortController();
  const { signal } = controller;
  const root = document.documentElement;

  resetState();
  drawArt(signal);
  bindControls(signal);
  onAudioChange(renderUi);
  renderUi();

  let stage: Stage | null = null;
  const ready = loadFonts().then(() => {
    if (signal.aborted) return false;
    try {
      stage = createStage({ signal, onSelect: selectSingle });
    } catch (err) {
      console.error(err);
      stage = null;
    }
    T3.ok = !!stage;
    root.classList.add(T3.ok ? 'has3d' : 'no3d');
    return T3.ok;
  });

  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const ctx = gsap.context(() => {});
  const stop = reduced
    ? initReduced({ signal, stage: () => stage, ready })
    : initMotion({ signal, ctx, stage: () => stage, ready });

  return () => {
    controller.abort();
    stop();
    ctx.revert();
    stage?.dispose();
    stage = null;
    onAudioChange(() => {});
    disposeAudio();
    root.classList.remove('has3d', 'no3d');
    resetState();
  };
}
