import * as THREE from 'three';
import { PICKS } from '../../data/content';
import type { Kit } from './kit';

export interface Disc {
  group: THREE.Group;
  spin: THREE.Group;
  top: THREE.Mesh;
  R: number;
  th: number;
  yaw: number;
}

interface LabelSpec {
  color: string;
  ink: string;
  brand: string;
  title: string;
  rpm: string;
  side: string;
  cat: string;
  big?: boolean;
}

type LabelPainter = (g: CanvasRenderingContext2D, cx: number, cy: number, r: number) => void;

export type RecordAssets = ReturnType<typeof createRecordAssets>;

export function createRecordAssets(kit: Kit) {
  const { cv, ctx2d, ctex, grain, fitFont, arcText, std, phys } = kit;

  const grooveMaps = (size: number, labelR: number, gaps: number[], rings: number) => {
    const n = cv(size, size), r = cv(size, size);
    const ng = ctx2d(n), rg = ctx2d(r);
    const nd = ng.createImageData(size, size), rd = rg.createImageData(size, size);
    const h = size / 2, K = 2 * Math.PI * rings / (.96 - labelR);
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const dx = (x + .5 - h) / h, dy = (y + .5 - h) / h, q = Math.sqrt(dx * dx + dy * dy), i = (y * size + x) * 4;
        let s = 0, rough = 255;
        if (q < labelR) rough = 214;
        else if (q < .99) {
          const gap = gaps.some(gp => Math.abs(q - gp) < .006);
          if (gap || q < labelR + .025 || q > .965) rough = 52;
          else {
            s = Math.cos(q * K) * .6 + Math.cos(q * K * 2.31 + .7) * .25;
            rough = 80;
          }
        }
        const ix = q > 0 ? dx / q : 0, iy = q > 0 ? dy / q : 0;
        nd.data[i] = 128 + ix * s * 120;
        nd.data[i + 1] = 128 - iy * s * 120;
        nd.data[i + 2] = 255;
        nd.data[i + 3] = 255;
        rd.data[i] = rd.data[i + 1] = rd.data[i + 2] = rough;
        rd.data[i + 3] = 255;
      }
    }
    ng.putImageData(nd, 0, 0);
    rg.putImageData(rd, 0, 0);
    return { normal: ctex(n, false), rough: ctex(r, false) };
  };

  const discMap = (size: number, labelR: number, gaps: number[], paintLabel: LabelPainter) => {
    const c = cv(size, size), g = ctx2d(c), h = size / 2;
    g.fillStyle = '#0B0A0D';
    g.fillRect(0, 0, size, size);
    for (let r = labelR * h; r < .985 * h; r += 1.6) {
      g.strokeStyle = `rgba(255,255,255,${.012 + Math.random() * .02})`;
      g.lineWidth = 1;
      g.beginPath();
      g.arc(h, h, r, 0, Math.PI * 2);
      g.stroke();
    }
    gaps.forEach(gp => {
      g.strokeStyle = 'rgba(255,255,255,.05)';
      g.lineWidth = size * .007;
      g.beginPath();
      g.arc(h, h, gp * h, 0, Math.PI * 2);
      g.stroke();
    });
    g.strokeStyle = 'rgba(255,255,255,.04)';
    g.lineWidth = size * .02;
    g.beginPath();
    g.arc(h, h, .975 * h, 0, Math.PI * 2);
    g.stroke();
    paintLabel(g, h, h, labelR * h);
    return ctex(c);
  };

  const label = (o: LabelSpec): LabelPainter => (g, cx, cy, r) => {
    g.save();
    g.beginPath();
    g.arc(cx, cy, r, 0, Math.PI * 2);
    g.clip();
    g.fillStyle = o.color;
    g.fillRect(cx - r, cy - r, 2 * r, 2 * r);
    for (let i = 0; i < r * r * .05; i++) {
      g.fillStyle = `rgba(0,0,0,${Math.random() * .07})`;
      g.fillRect(cx - r + Math.random() * 2 * r, cy - r + Math.random() * 2 * r, 1.4, 1.4);
    }
    g.strokeStyle = o.ink;
    g.globalAlpha = .85;
    g.lineWidth = Math.max(1, r * .012);
    g.beginPath();
    g.arc(cx, cy, r * .93, 0, Math.PI * 2);
    g.stroke();
    g.globalAlpha = 1;
    arcText(g, o.brand, cx, cy, r * .8, -Math.PI / 2, `700 ${r * .11}px "Schibsted Grotesk", Arial`, o.ink);
    g.fillStyle = o.ink;
    g.textAlign = 'center';
    g.textBaseline = 'alphabetic';
    fitFont(g, o.title, '400 {s}px Shrikhand, Georgia, serif', r * .2, r * 1.3);
    g.fillText(o.title, cx, cy + r * (o.big ? .52 : .62));
    g.font = `700 ${r * .085}px "Space Mono", monospace`;
    g.fillText(o.rpm, cx - r * (o.big ? .5 : .66), cy + r * .04);
    g.fillText(o.side, cx + r * (o.big ? .5 : .66), cy + r * .04);
    g.font = `400 ${r * .075}px "Space Mono", monospace`;
    g.fillText(o.cat, cx, cy + r * (o.big ? .74 : .8));
    if (o.big) {
      g.font = `700 ${r * .085}px "Space Mono", monospace`;
      g.fillText('STEREO', cx, cy - r * .42);
    }
    g.restore();
  };

  const LP_RATIO = .353, SINGLE_RATIO = .514;
  const LP_GAPS = [.47, .58, .7, .82];
  const lpMaps = grooveMaps(1024, LP_RATIO, LP_GAPS, 70);
  const singleMaps = grooveMaps(512, SINGLE_RATIO, [], 20);
  const lpTexture = discMap(1024, LP_RATIO, LP_GAPS, label({
    color: '#A0237A', ink: '#F7E9F1', brand: 'LOOP RECORDS · LR-001', title: 'LOOP Sessions',
    rpm: '33⅓', side: 'SIDE A', cat: 'VOL. 1 · STEREO LP', big: true
  }));
  const singleTextures = PICKS.map(p => discMap(512, SINGLE_RATIO, [], label({
    color: p.label, ink: p.ink, brand: 'LOOP RECORDS', title: p.title, rpm: '45 RPM', side: 'SIDE A', cat: p.cat
  })));

  const buildDisc = (kind: 'lp' | 'single', index = 0): Disc => {
    const lp = kind === 'lp';
    const R = lp ? 1.5 : .875, hole = lp ? .036 : .19, th = lp ? .02 : .016;
    const maps = lp ? lpMaps : singleMaps, map = lp ? lpTexture : singleTextures[index];
    const group = new THREE.Group(), spin = new THREE.Group();
    group.add(spin);
    const ns = lp ? .5 : .22;
    const top = new THREE.Mesh(new THREE.RingGeometry(hole, R, 160, 1), phys({
      map, normalMap: maps.normal, normalScale: new THREE.Vector2(ns, ns), roughnessMap: maps.rough,
      roughness: 1, metalness: 0, clearcoat: .18, clearcoatRoughness: .4, envMapIntensity: lp ? .55 : .4
    }));
    top.rotation.x = -Math.PI / 2;
    top.position.y = th / 2;
    spin.add(top);
    const black = std({ color: 0x0C0B0E, roughness: .4 });
    const bottom = new THREE.Mesh(new THREE.RingGeometry(hole, R, 96, 1), black);
    bottom.rotation.x = Math.PI / 2;
    bottom.position.y = -th / 2;
    spin.add(bottom);
    spin.add(new THREE.Mesh(new THREE.CylinderGeometry(R, R, th, 160, 1, true), black));
    spin.add(new THREE.Mesh(new THREE.CylinderGeometry(hole, hole, th, 48, 1, true), std({ color: 0x0C0B0E, roughness: .5, side: THREE.BackSide })));
    return { group, spin, top, R, th, yaw: 0 };
  };

  const sleeveFront = () => {
    const Z = 1024, c = cv(Z, Z), g = ctx2d(c);
    g.fillStyle = '#1E5B58';
    g.fillRect(0, 0, Z, Z);
    const cols = ['#E8707A', '#D9B44A', '#F1E6CC', '#6BB8D6'];
    for (let i = 0; i < 12; i++) {
      g.beginPath();
      g.arc(700, 320, 560 - i * 44, 0, Math.PI * 2);
      g.fillStyle = cols[i % 4];
      g.fill();
    }
    g.beginPath();
    g.arc(700, 320, 34, 0, Math.PI * 2);
    g.fillStyle = '#1E5B58';
    g.fill();
    g.fillRect(0, 640, Z, 384);
    g.fillStyle = 'rgba(243,232,204,.18)';
    for (let y = 300; y < 640; y += 15) {
      for (let x = 24; x < 440; x += 15) {
        const q = 1 + 5.5 * (1 - (x - 24) / 416) * ((y - 300) / 340);
        g.beginPath();
        g.arc(x + ((y / 15) % 2) * 7.5, y, q, 0, Math.PI * 2);
        g.fill();
      }
    }
    g.font = '400 250px Shrikhand, Georgia, serif';
    g.textBaseline = 'alphabetic';
    g.textAlign = 'left';
    g.fillStyle = '#E8707A';
    g.fillText('LOOP', 68, 906);
    g.fillStyle = '#F3E8CC';
    g.fillText('LOOP', 58, 896);
    g.font = '700 40px "Space Mono", monospace';
    g.fillText('SESSIONS · VOL. 1', 66, 966);
    g.beginPath();
    g.arc(118, 118, 74, 0, Math.PI * 2);
    g.fillStyle = '#F3E8CC';
    g.fill();
    g.fillStyle = '#1E5B58';
    g.textAlign = 'center';
    g.font = '700 34px "Space Mono", monospace';
    g.fillText('33⅓', 118, 114);
    g.font = '700 18px "Space Mono", monospace';
    g.fillText('STEREO', 118, 146);
    g.textAlign = 'right';
    g.font = '700 22px "Schibsted Grotesk", Arial';
    g.fillStyle = '#F3E8CC';
    g.fillText('LOOP RECORDS · LR-001', 966, 966);
    g.save();
    g.globalCompositeOperation = 'screen';
    g.filter = 'blur(7px)';
    g.strokeStyle = 'rgba(255,255,255,.11)';
    g.lineWidth = 36;
    g.beginPath();
    g.arc(512, 512, 466, 0, Math.PI * 2);
    g.stroke();
    g.restore();
    g.save();
    g.filter = 'blur(4px)';
    g.strokeStyle = 'rgba(255,248,232,.28)';
    g.lineWidth = 8;
    g.strokeRect(4, 4, Z - 8, Z - 8);
    g.restore();
    grain(g, Z, Z, .07);
    return c;
  };

  const sleeveBack = () => {
    const Z = 1024, c = cv(Z, Z), g = ctx2d(c);
    g.fillStyle = '#E6DCC6';
    g.fillRect(0, 0, Z, Z);
    grain(g, Z, Z, .08);
    g.fillStyle = '#1D1A1F';
    g.font = '400 64px Shrikhand, Georgia, serif';
    g.fillText('LOOP Sessions', 70, 150);
    g.font = '700 26px "Space Mono", monospace';
    ['SIDE A', '1. LOOP Theme', '2. Sunday Crates', '3. Night Bus', '', 'SIDE B', '1. Tape Hiss Bossa', '2. Coast Dub']
      .forEach((t, i) => g.fillText(t, 70, 250 + i * 52));
    g.font = '400 20px "Space Mono", monospace';
    g.fillText('Recorded and cut at LOOP, Alicante. Play loud, store upright.', 70, 940);
    return c;
  };

  const buildSleeve = () => {
    const edge = std({ color: 0xCBBD9E, roughness: .92 });
    const mats = [edge, edge, std({ map: ctex(sleeveFront()), roughness: .74 }), std({ map: ctex(sleeveBack()), roughness: .86 }), edge, edge];
    const group = new THREE.Group();
    group.add(new THREE.Mesh(new THREE.BoxGeometry(3.15, .05, 3.15), mats));
    return group;
  };

  return { lpMaps, lpTexture, buildDisc, buildSleeve };
}
