import * as THREE from 'three';
import { GADGETS, PICKS, type GadgetKey } from '../../data/content';
import { $, $$ } from '../dom';
import { clamp01, lerp, smooth } from '../math';
import { S, T3 } from '../state';
import { createKit } from './kit';
import { createRecordAssets, type Disc } from './records';
import { createGadgetBuilders } from './gadgets';

export interface Stage {
  frame(now: number): void;
  dispose(): void;
}

interface View {
  el: HTMLElement;
  scene: THREE.Scene;
  camera: THREE.Camera;
  update(dt: number, t: number, r: DOMRect): boolean | void;
}

interface StageOptions {
  signal: AbortSignal;
  onSelect(index: number): void;
}

const POSE: Record<GadgetKey, [number, number]> = {
  headphones: [.2, .95],
  speaker: [.22, -.42],
  earbuds: [.3, -.25],
  suitcase: [.55, -.4],
  walkman: [.1, .32]
};

const tanHalf = (deg: number) => Math.tan(THREE.MathUtils.degToRad(deg / 2));

export function createStage({ signal, onSelect }: StageOptions): Stage | null {
  const canvas = $<HTMLCanvasElement>('#gl');
  if (!canvas) return null;
  THREE.ColorManagement.legacyMode = false;
  let renderer: THREE.WebGLRenderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
  } catch {
    return null;
  }
  const touch = matchMedia('(hover: none), (pointer: coarse)').matches;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, touch ? 1.25 : 1.6));
  let vw = innerWidth, vh = innerHeight;
  renderer.setSize(vw, vh, false);
  renderer.outputEncoding = THREE.sRGBEncoding;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.setClearColor(0x000000, 0);
  renderer.autoClear = false;

  const kit = createKit(renderer);
  const records = createRecordAssets(kit);
  const gadgets = createGadgetBuilders(kit, records);
  const { fader, shadowsOn, contactShadow } = kit;

  const views: View[] = [];
  const scene = (keyPos: [number, number, number], intensity: number) => {
    const s = new THREE.Scene();
    s.environment = kit.env;
    const light = new THREE.DirectionalLight(0xffffff, intensity);
    light.position.set(...keyPos);
    s.add(light);
    return { scene: s, light };
  };

  (() => {
    const { scene: sc, light: sun } = scene([-6, 8, -8], 1.25);
    sun.castShadow = true;
    sun.shadow.mapSize.set(touch ? 1024 : 2048, touch ? 1024 : 2048);
    Object.assign(sun.shadow.camera, { left: -18, right: 18, top: 18, bottom: -18, near: 1, far: 70 });
    sun.shadow.camera.updateProjectionMatrix();
    sun.shadow.bias = -.0004;
    sun.shadow.normalBias = .02;
    sc.add(sun.target);
    const cam = new THREE.PerspectiveCamera(26, 1, .5, 200);
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(140, 140), new THREE.ShadowMaterial({ opacity: .17 }));
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    sc.add(ground);

    const sleeve = records.buildSleeve();
    shadowsOn(sleeve);
    sc.add(sleeve);
    const lp = records.buildDisc('lp');
    shadowsOn(lp.group);
    sc.add(lp.group);
    const singles: Disc[] = PICKS.map((_, i) => {
      const d = records.buildDisc('single', i);
      shadowsOn(d.group);
      sc.add(d.group);
      d.yaw = ((i * 1.7) % 1) - .5;
      return d;
    });
    const sleeveFade = fader(sleeve), lpFade = fader(lp.group);
    const slot = $('#recSlot');
    const tags = $$<HTMLButtonElement>('.pick-tag');
    const section = $('#records');

    const L = {
      key: '', W: 17.5, sc: 1, ssc: 1, lpSmall: 1, big: 1,
      grid: new THREE.Vector3(), home: new THREE.Vector3(), enter: new THREE.Vector3(), slots: [] as THREE.Vector3[]
    };
    const v3 = new THREE.Vector3(), ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
    const onTable = (px: number, py: number, r: DOMRect) => {
      ndc.set(px / r.width * 2 - 1, -(py / r.height) * 2 + 1);
      ray.setFromCamera(ndc, cam);
      const t = -ray.ray.origin.y / ray.ray.direction.y;
      return ray.ray.origin.clone().addScaledVector(ray.ray.direction, t);
    };
    const layout = (r: DOMRect) => {
      const aspect = r.width / r.height, tilt = .3;
      const W = aspect >= 1.05 ? 17.5 : 7.6, visH = W / aspect, D = visH / (2 * tanHalf(26));
      cam.aspect = aspect;
      cam.updateProjectionMatrix();
      cam.position.set(0, D * Math.cos(tilt), D * Math.sin(tilt));
      cam.lookAt(0, 0, 0);
      cam.updateMatrixWorld();
      const sr = slot.getBoundingClientRect();
      const x0 = sr.left - r.left, y0 = sr.top - r.top, cx = x0 + sr.width / 2, cy = y0 + sr.height / 2;
      const C = onTable(cx, cy, r), left = onTable(x0, cy, r), right = onTable(x0 + sr.width, cy, r);
      const top = onTable(cx, y0, r), bottom = onTable(cx, y0 + sr.height, r);
      const Ws = right.x - left.x, Hs = bottom.z - top.z;
      const rad = Ws * .2, gapX = Ws * .1, rowGap = 2 * rad + Hs * .13;
      const big = aspect >= 1.05 ? Math.min(W * .44, visH * .6) : Math.min(W * .54, visH * .33);
      L.sc = rad / .875;
      L.grid.set(C.x, 0, C.z - Hs * .05);
      L.slots = [[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([a, b]) => new THREE.Vector3(C.x + a * (rad + gapX / 2), 0, L.grid.z + b * rowGap / 2));
      L.ssc = big / 3.15;
      L.lpSmall = Ws * .5 / 3;
      L.big = big;
      if (aspect >= 1.05) L.home.set(W * .065 + big * .3, 0, -visH * .045);
      else L.home.set(big * .2, 0, -visH * .02);
      L.enter.set(onTable(r.width, r.height / 2, r).x + big * 1.2, 0, L.home.z - big * .15);
      L.W = W;
    };

    let hover = -1;
    let lastRect: DOMRect | null = null;
    const hitAt = (x: number, y: number) => {
      if (!lastRect || T3.R.tags < .5) return -1;
      ndc.set((x - lastRect.left) / lastRect.width * 2 - 1, -((y - lastRect.top) / lastRect.height) * 2 + 1);
      ray.setFromCamera(ndc, cam);
      let best = -1, bestD = Infinity;
      singles.forEach((s, i) => {
        if (!s.group.visible) return;
        const p = s.group.position, t = (p.y - ray.ray.origin.y) / ray.ray.direction.y;
        const hx = ray.ray.origin.x + ray.ray.direction.x * t, hz = ray.ray.origin.z + ray.ray.direction.z * t;
        const d = Math.hypot(hx - p.x, hz - p.z);
        if (d < s.R * s.group.scale.x * 1.04 && d < bestD) {
          best = i;
          bestD = d;
        }
      });
      return best;
    };
    const isControl = (e: Event) => !!(e.target as Element).closest?.('button,a');
    section.addEventListener('pointermove', e => {
      if (e.pointerType !== 'mouse') return;
      hover = hitAt(e.clientX, e.clientY);
      $('.cursor')?.classList.toggle('is-link', hover >= 0 || !!(e.target as Element).closest?.('a,button,[data-cursor]'));
    }, { signal });
    section.addEventListener('pointerleave', () => { hover = -1; }, { signal });
    let down: { x: number; y: number } | null = null;
    section.addEventListener('pointerdown', e => { down = { x: e.clientX, y: e.clientY }; }, { signal });
    section.addEventListener('pointercancel', () => { down = null; }, { signal });
    section.addEventListener('pointerup', e => {
      const d = down;
      down = null;
      if (!d || isControl(e) || Math.hypot(e.clientX - d.x, e.clientY - d.y) > 14) return;
      const i = hitAt(e.clientX, e.clientY);
      if (i >= 0) onSelect(i);
    }, { signal });

    views.push({
      el: $('#recView'), scene: sc, camera: cam,
      update(dt, _t, r) {
        lastRect = r;
        const sr = slot.getBoundingClientRect();
        const key = [r.width, r.height, sr.left - r.left, sr.top - r.top, sr.width, sr.height].map(Math.round).join(',');
        if (key !== L.key) {
          L.key = key;
          layout(r);
        }
        const R = T3.R, e = R.drop, away = R.away;

        const yaw = lerp(.15, .36, e);
        const ox = Math.cos(yaw), oz = -Math.sin(yaw), awayD = away * (L.big * 1.7 + L.W * .45);
        const hx = lerp(L.enter.x, L.home.x, e), hz = lerp(L.enter.z, L.home.z, e);
        sleeve.position.set(hx + ox * awayD, .035, hz + oz * awayD);
        sleeve.rotation.set(0, yaw, 0);
        sleeve.scale.setScalar(L.ssc);
        sleeveFade(e < .004 ? 0 : 1 - smooth(.6, 1, away));

        const out = R.out * 3.15 * .62 * L.ssc, lift = R.lift;
        const bx = hx - ox * out, bz = hz - oz * out;
        lp.group.position.set(lerp(bx, L.grid.x, lift), .035 + Math.sin(Math.PI * lift) * 1.4 + lift * .6 + R.split * .3, lerp(bz, L.grid.z, lift));
        lp.group.rotation.set(-Math.sin(Math.PI * lift) * .2, yaw * (1 - lift), 0);
        lp.spin.rotation.y = R.out * 3.4 - lift * 2.5 - R.split * 4;
        lp.group.scale.setScalar(Math.max(.01, lerp(L.ssc, L.lpSmall, lift) * (1 - R.split * .8)));
        lpFade(R.out < .002 ? 0 : 1 - smooth(.35, .85, R.split));

        singles.forEach((s, i) => {
          const st = T3.singles[i];
          st.hov += ((hover === i || st.hovT ? 1 : 0) - st.hov) * Math.min(1, dt * 10);
          st.play += (st.playT - st.play) * Math.min(1, dt * 4);
          st.speed += ((st.playT ? 270 : 0) - st.speed) * Math.min(1, dt * (st.playT ? 1.8 : 1));
          st.angle += st.speed * dt;
          const si = clamp01((R.split - i * .08) / .76), k = 1 - Math.pow(1 - si, 3), home = L.slots[i];
          s.group.position.set(
            lerp(L.grid.x, home.x, k),
            lerp(1.5, .008 + s.th / 2, k) + Math.sin(Math.PI * si) + st.hov * .14 + st.play * .3,
            lerp(L.grid.z, home.z, k)
          );
          s.group.scale.setScalar(lerp(.15, L.sc, k) * (1 + st.play * .04));
          s.group.rotation.set(st.hov * .07 - st.play * .1, s.yaw, st.hov * -.04);
          s.spin.rotation.y = -THREE.MathUtils.degToRad(st.angle);
          s.group.visible = R.split > i * .08 + .001;
        });

        tags.forEach((b, i) => {
          const home = L.slots[i];
          v3.set(home.x, 0, home.z + .875 * L.sc + .12).project(cam);
          const px = (v3.x * .5 + .5) * r.width, py = (-v3.y * .5 + .5) * r.height;
          b.style.transform = `translate(${px.toFixed(1)}px, ${py.toFixed(1)}px) translateX(-50%)`;
          b.style.opacity = R.tags.toFixed(3);
          b.tabIndex = R.tags > .5 ? 0 : -1;
        });
      }
    });
  })();

  $$('.gadget').forEach((el, i) => {
    const key = GADGETS[i].key;
    const { scene: sc } = scene([-3, 5, 4], 1.1);
    const cam = new THREE.PerspectiveCamera(28, 1, .05, 60);
    const model = gadgets[key]();
    const holder = new THREE.Group();
    holder.add(model);
    sc.add(holder);
    const box = new THREE.Box3().setFromObject(model);
    const size = box.getSize(new THREE.Vector3());
    model.position.sub(box.getCenter(new THREE.Vector3()));
    const rad = size.length() / 2;
    const shadow = contactShadow(size.x * 1.25, Math.max(size.z, size.x * .45) * 1.25, .75);
    shadow.position.y = -size.y / 2 - .04;
    sc.add(shadow);
    const [bx, by] = POSE[key], phase = i * 1.3, st = T3.gadgets[i];
    views.push({
      el: $('.g-view', el), scene: sc, camera: cam,
      update(dt, t, r) {
        cam.aspect = r.width / r.height;
        const D = rad / Math.sin(THREE.MathUtils.degToRad(14)) * 1.02;
        cam.position.set(0, D * .22, D);
        cam.lookAt(0, 0, 0);
        cam.updateProjectionMatrix();
        st.hover += (st.hoverT - st.hover) * Math.min(1, dt * 8);
        holder.rotation.set(bx + S.my * .12, by + Math.sin(t * .45 + phase) * .22 + S.mx * .3 + st.hover * .35, 0);
        holder.position.y = Math.sin(t * 1.3 + phase) * .06 * rad;
        holder.scale.setScalar(.9 + st.hover * .1);
        shadow.scale.setScalar(1 - Math.sin(t * 1.3 + phase) * .05);
      }
    });
  });

  (() => {
    const { scene: sc } = scene([-2, 3, 6], 1.15);
    const cam = new THREE.OrthographicCamera(-1, 1, 1, -1, -5000, 5000);
    cam.position.set(0, 0, 1000);
    cam.lookAt(0, 0, 0);
    const roll = new THREE.Group();
    sc.add(roll);
    const lp = records.buildDisc('lp');
    lp.group.rotation.x = Math.PI / 2;
    roll.add(lp.group);
    const fade = fader(lp.group);
    views.push({
      el: $('#finView'), scene: sc, camera: cam,
      update(_dt, _t, r) {
        const F = T3.finLp;
        if (F.o <= .001) return false;
        const w = r.width, h = r.height;
        Object.assign(cam, { left: -w / 2, right: w / 2, top: h / 2, bottom: -h / 2 });
        cam.updateProjectionMatrix();
        roll.position.set(F.x - w / 2, h / 2 - F.y, 0);
        roll.scale.setScalar(F.s);
        roll.rotation.z = F.roll;
        fade(F.o);
      }
    });
  })();

  let last = performance.now();
  return {
    frame(now) {
      const dt = Math.min(.05, Math.max(0, (now - last) / 1000));
      last = now;
      S.time += dt;
      if (innerWidth !== vw || innerHeight !== vh) {
        vw = innerWidth;
        vh = innerHeight;
        renderer.setSize(vw, vh, false);
      }
      renderer.setScissorTest(false);
      renderer.clear(true, true, true);
      renderer.setScissorTest(true);
      for (const v of views) {
        const r = v.el.getBoundingClientRect();
        if (r.bottom < 0 || r.top > vh || r.right < 0 || r.left > vw || r.width < 4 || r.height < 4) continue;
        if (v.update(dt, S.time, r) === false) continue;
        const y = vh - r.bottom;
        renderer.setViewport(r.left, y, r.width, r.height);
        renderer.setScissor(r.left, y, r.width, r.height);
        renderer.clearDepth();
        renderer.render(v.scene, v.camera);
      }
    },
    dispose() {
      views.forEach(v => v.scene.traverse(o => {
        if (!(o instanceof THREE.Mesh)) return;
        o.geometry.dispose();
        (Array.isArray(o.material) ? o.material : [o.material]).forEach((m: THREE.Material) => m.dispose());
      }));
      kit.dispose();
      renderer.setScissorTest(false);
      renderer.clear();
      renderer.dispose();
    }
  };
}
