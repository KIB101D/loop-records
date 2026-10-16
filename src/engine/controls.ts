import { PICKS } from '../data/content';
import { TRACKS } from './audio/tracks';
import { audio, setPick } from './audio/engine';
import { $, $$ } from './dom';
import { T3, deck } from './state';

const touch = () => matchMedia('(hover: none), (pointer: coarse)').matches;

export function renderUi() {
  const sound = $<HTMLButtonElement>('#soundToggle');
  if (!sound) return;
  const on = audio.wanted && audio.unlocked;
  sound.setAttribute('aria-pressed', String(on));
  sound.setAttribute('aria-label', on ? 'Turn sound off' : 'Turn sound on');
  $('#soundTxt').textContent = on ? 'Sound on' : 'Sound off';
  $('#tapeHint').hidden = !(audio.zone && !audio.unlocked);
  $$<HTMLButtonElement>('.pick-tag').forEach((b, i) => {
    const playing = deck.cur === i;
    b.setAttribute('aria-pressed', String(playing));
    $('i', b).textContent = playing ? 'Spinning · tap to stop' : PICKS[i].meta;
  });
  $('#npTitle').textContent = audio.pick ? TRACKS[audio.pick].title : 'LOOP Theme';
  $('#npState').textContent = !audio.unlocked ? `${touch() ? 'Tap' : 'Click'} anywhere for sound`
    : !audio.wanted ? 'Sound is off'
      : audio.pick ? 'On vinyl · 45 RPM'
        : audio.zone ? 'On tape · side A'
          : 'Waiting for the tape';
}

export function selectSingle(i: number | null) {
  const target = i === null || i === deck.cur ? null : i;
  if (target === deck.cur) return;
  deck.cur = target;
  T3.singles.forEach((s, j) => { s.playT = j === target ? 1 : 0; });
  setPick(target !== null ? PICKS[target].key : null);
  renderUi();
}
