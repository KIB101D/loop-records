# LOOP

Scroll-driven site for LOOP, a record, tape and audio-gear shop.

## Stack

- Vite + React 18 + TypeScript (strict)
- GSAP + ScrollTrigger for the scroll scenes, Lenis for smooth scrolling
- Three.js for the records, sleeve and gear models
- Rough.js for the hand-drawn logo
- Web Audio for the music (all five tracks are synthesised in the browser, no audio files)

## Scripts

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # type-check + production build into dist/
npm run preview    # serve dist/
```

## Structure

```
src/
  App.tsx                  page layout, starts the experience on mount
  components/              static markup for each section
  data/content.ts          records, gadgets, shop details
  engine/
    experience.ts          boot + full teardown (safe under StrictMode)
    motion.ts              intro, scroll timelines, menu jumps, cursor, parallax
    reduced.ts             prefers-reduced-motion version
    controls.ts            sound/now-playing UI, picking a single
    logoArt.ts, sketch.ts  hand-drawn logo, cassette and fallbacks
    audio/                 synth instruments, tracks, playback
    three/                 renderer kit, record + sleeve assets, gadget models, stage
  styles.css
```

Shop address, hours and social links live in `src/data/content.ts`.

## Credits

The LOOP logo, with its film-strip **L**, cassette **OO** and vinyl **P**, comes from an original hand drawing by **Emiliia Merzliakova**. The whole site is built around that sketch. Special thanks to her for the artwork.

The original drawing belongs to its author and is not covered by the code license.
