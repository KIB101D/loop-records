import * as THREE from 'three';
import type { GadgetKey } from '../../data/content';
import type { Kit } from './kit';
import type { RecordAssets } from './records';

type Placement = [x: number, y: number, z: number, rz: number, ry: number];

export function createGadgetBuilders(kit: Kit, records: RecordAssets): Record<GadgetKey, () => THREE.Group> {
  const { cv, ctx2d, ctex, rrect, slab, std, phys, mesh } = kit;

  const leatherBump = (() => {
    const c = cv(256, 256), x = ctx2d(c);
    x.fillStyle = '#808080';
    x.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 2600; i++) {
      const v = Math.random() < .5 ? 40 : 215;
      x.fillStyle = `rgba(${v},${v},${v},.22)`;
      x.beginPath();
      x.arc(Math.random() * 256, Math.random() * 256, 1 + Math.random() * 2.6, 0, 7);
      x.fill();
    }
    return ctex(c, false, [5, 5]);
  })();

  const scriptDecal = (text: string, w: number, h: number, font: string, color: string) => {
    const c = cv(w, h), x = ctx2d(c);
    x.font = font;
    x.textAlign = 'center';
    x.textBaseline = 'middle';
    x.fillStyle = 'rgba(0,0,0,.45)';
    x.fillText(text, w / 2 + 2, h / 2 + 4);
    x.fillStyle = color;
    x.fillText(text, w / 2, h / 2 + 2);
    return ctex(c);
  };

  const headphones = () => {
    const g = new THREE.Group();
    const leather = std({ color: 0x151515, roughness: .52, bumpMap: leatherBump, bumpScale: .01 });
    const soft = std({ color: 0x101010, roughness: .8, bumpMap: leatherBump, bumpScale: .006 });
    const plastic = std({ color: 0x1b1b1d, roughness: .42 });
    const wire = std({ color: 0x2a2a2e, metalness: .85, roughness: .32 });
    const brass = std({ color: 0xC9A24A, metalness: 1, roughness: .26 });
    const arc = (r0: number, r1: number, a0: number, a1: number, depth: number, mat: THREE.Material, y: number) => {
      const sh = new THREE.Shape();
      sh.absarc(0, 0, r1, a0, a1, false);
      sh.absarc(0, 0, r0, a1, a0, true);
      const geo = new THREE.ExtrudeGeometry(sh, { depth, bevelEnabled: true, bevelThickness: .03, bevelSize: .025, bevelSegments: 3, curveSegments: 64 });
      geo.translate(0, 0, -depth / 2);
      return mesh(geo, mat, 0, y, 0);
    };
    g.add(arc(.94, 1.06, .2, Math.PI - .2, .26, leather, .06));
    g.add(arc(.88, .94, .45, Math.PI - .45, .2, soft, .06));
    [-1, 1].forEach(sd => {
      g.add(mesh(new THREE.BoxGeometry(.16, .3, .26), plastic, sd, .14, 0));
      g.add(mesh(new THREE.CylinderGeometry(.04, .04, .3, 16).rotateZ(Math.PI / 2), plastic, sd, .02, 0));
      [-.37, .37].forEach(z => g.add(mesh(new THREE.CylinderGeometry(.017, .017, .66, 10), wire, sd, -.3, z)));
      g.add(mesh(new THREE.CylinderGeometry(.017, .017, .76, 10).rotateX(Math.PI / 2), wire, sd, .02, 0));
      const cup = slab(.62, .7, .2, .17, .05);
      cup.rotateY(Math.PI / 2);
      g.add(mesh(cup, plastic, sd * .99, -.64, 0));
      const plate = slab(.56, .64, .05, .15, .018);
      plate.rotateY(Math.PI / 2);
      g.add(mesh(plate, leather, sd * 1.115, -.64, 0));
      const cushion = slab(.6, .68, .14, .2, .06);
      cushion.rotateY(Math.PI / 2);
      g.add(mesh(cushion, soft, sd * .84, -.64, 0));
      [-.36, .36].forEach(z => g.add(mesh(new THREE.CylinderGeometry(.035, .035, .04, 16).rotateX(Math.PI / 2), wire, sd * .99, -.64, z)));
    });
    g.add(mesh(new THREE.CylinderGeometry(.06, .06, .05, 32).rotateZ(Math.PI / 2), brass, 1.18, -.86, .19));
    const logo = mesh(new THREE.PlaneGeometry(.34, .13), std({
      map: scriptDecal('LOOP', 256, 96, '72px "Caveat Brush", cursive', '#F4F1EA'), transparent: true, roughness: .4
    }), 1.165, -.62, 0);
    logo.rotation.y = Math.PI / 2;
    g.add(logo);
    return g;
  };

  const speaker = () => {
    const g = new THREE.Group();
    const rubber = std({ color: 0x141414, roughness: .7, bumpMap: leatherBump, bumpScale: .006 });
    const grille = (() => {
      const c = cv(256, 256), x = ctx2d(c);
      x.fillStyle = '#0b0b0b';
      x.fillRect(0, 0, 256, 256);
      x.lineCap = 'round';
      for (let k = -256; k <= 512; k += 32) {
        [[k, 0, k + 256, 256], [k + 256, 0, k, 256]].forEach(([a, b, c2, d], n) => {
          x.strokeStyle = '#6d6d6d';
          x.lineWidth = 9;
          x.beginPath(); x.moveTo(a, b); x.lineTo(c2, d); x.stroke();
          x.strokeStyle = n ? '#cfcfcf' : '#e6e6e6';
          x.lineWidth = 4;
          x.beginPath(); x.moveTo(a - 1, b); x.lineTo(c2 - 1, d); x.stroke();
        });
      }
      return ctex(c, true, [5.2, 2.5]);
    })();
    g.add(mesh(slab(2.2, 1.0, .84, .16, .05), rubber));
    [-1, 1].forEach(sd => g.add(mesh(slab(.34, 1.05, .9, .18, .06), rubber, sd * .95, 0, 0)));
    [1, -1].forEach(sd => {
      const back = mesh(new THREE.PlaneGeometry(1.62, .78), std({ color: 0x050505, roughness: .9 }), 0, -.01, sd * .474);
      const mesh2 = mesh(new THREE.PlaneGeometry(1.62, .78), std({
        map: grille, color: 0xffffff, metalness: .6, roughness: .38, envMapIntensity: 1.4, side: THREE.DoubleSide
      }), 0, -.01, sd * .482);
      if (sd < 0) {
        back.rotation.y = Math.PI;
        mesh2.rotation.y = Math.PI;
      }
      g.add(back, mesh2);
    });
    g.add(mesh(new THREE.PlaneGeometry(.78, .3), std({
      map: scriptDecal('LOOP', 512, 196, '150px "Caveat Brush", cursive', '#F7F5EF'), transparent: true, roughness: .35
    }), 0, -.02, .49));
    g.add(mesh(new THREE.CylinderGeometry(.19, .19, .02, 40), std({ color: 0x0c0c0c, roughness: .5 }), 0, .505, 0));
    g.add(mesh(new THREE.CylinderGeometry(.14, .14, .05, 48), std({ color: 0xC9A24A, metalness: 1, roughness: .24 }), 0, .53, 0));
    g.add(mesh(new THREE.CylinderGeometry(.055, .055, .03, 24), std({ color: 0x0e0e0e, roughness: .4 }), -.6, .515, 0));
    g.add(mesh(new THREE.SphereGeometry(.014, 10, 8), std({ color: 0xff2a1a, emissive: 0xff2a1a, emissiveIntensity: 1.6 }), -.6, .52, -.12));
    g.add(mesh(new THREE.BoxGeometry(.2, .012, .05), std({ color: 0xff3b2a, emissive: 0xff2a1a, emissiveIntensity: 1.3 }), .62, .506, 0));
    return g;
  };

  const earbuds = () => {
    const g = new THREE.Group();
    const gloss = phys({ color: 0xF7F7F4, roughness: .18, clearcoat: 1, clearcoatRoughness: .06 });
    const dark = std({ color: 0x1c1c1f, roughness: .85 });
    const metal = std({ color: 0xD8DADD, metalness: 1, roughness: .2 });
    g.add(mesh(slab(1.22, .96, .48, .34, .16), gloss));
    g.add(mesh(new THREE.PlaneGeometry(1.08, .006), std({ color: 0xB9B9B6, roughness: .5 }), 0, .2, .404));
    g.add(mesh(new THREE.CircleGeometry(.018, 16), std({ color: 0x22ff66, emissive: 0x22ff66, emissiveIntensity: 1.4 }), 0, -.1, .404));
    const buds: Placement[] = [[-.95, -.05, .36, .38, .35], [.95, -.08, .38, -.35, -.5]];
    buds.forEach(([x, y, z, rz, ry]) => {
      const b = new THREE.Group();
      b.position.set(x, y, z);
      b.rotation.set(.12, ry, rz);
      g.add(b);
      const head = mesh(new THREE.SphereGeometry(.17, 40, 30), gloss);
      head.scale.set(1, .9, .82);
      b.add(head);
      b.add(mesh(new THREE.SphereGeometry(.07, 24, 16), gloss, .02, .03, .13));
      const speakerGrille = mesh(new THREE.CircleGeometry(.04, 20), dark, -.06, .05, .135);
      speakerGrille.rotation.y = -.3;
      b.add(speakerGrille);
      b.add(mesh(new THREE.CapsuleGeometry(.046, .38, 8, 20), gloss, .02, -.33, 0));
      b.add(mesh(new THREE.CylinderGeometry(.046, .046, .02, 20), metal, .02, -.57, 0));
      b.add(mesh(new THREE.PlaneGeometry(.03, .1), dark, .02, -.22, .047));
    });
    return g;
  };

  const suitcase = () => {
    const g = new THREE.Group();
    const leather = (() => {
      const c = cv(256, 256), x = ctx2d(c);
      x.fillStyle = '#C8952E';
      x.fillRect(0, 0, 256, 256);
      for (let i = 0; i < 2600; i++) {
        x.fillStyle = `rgba(60,30,0,${Math.random() * .25})`;
        x.fillRect(Math.random() * 256, Math.random() * 256, 2, 2);
      }
      return ctex(c, true, [3, 3]);
    })();
    const body = slab(2.3, 1.7, .5, .12, .05);
    body.rotateX(-Math.PI / 2);
    g.add(mesh(body, std({ map: leather, roughness: .72 })));
    g.add(mesh(new THREE.BoxGeometry(2.1, .02, 1.5), std({ color: 0xEFE6D2, roughness: .5 }), 0, .322, 0));
    const platter = new THREE.Group();
    platter.position.set(-.3, .33, 0);
    g.add(platter);
    platter.add(mesh(new THREE.CylinderGeometry(.62, .62, .05, 64), std({ color: 0x1b1b1d, roughness: .8 }), 0, .02, 0));
    const record = new THREE.Mesh(new THREE.RingGeometry(.02, .58, 96, 1), phys({
      map: records.lpTexture, normalMap: records.lpMaps.normal, normalScale: new THREE.Vector2(.4, .4),
      roughnessMap: records.lpMaps.rough, roughness: 1, clearcoat: .3
    }));
    record.rotation.x = -Math.PI / 2;
    record.position.y = .06;
    platter.add(record);
    const chrome = std({ color: 0xE6E8EC, metalness: 1, roughness: .15 });
    g.add(mesh(new THREE.CylinderGeometry(.1, .12, .1, 24), chrome, .72, .37, -.5));
    const arm = mesh(new THREE.CylinderGeometry(.02, .02, .9, 12), chrome, .5, .44, -.1);
    arm.rotation.set(Math.PI / 2, 0, -.55);
    g.add(arm);
    g.add(mesh(new THREE.CylinderGeometry(.09, .09, .05, 24), std({ color: 0x2E8F8A, roughness: .4 }), .85, .35, .5));
    const grille = (() => {
      const c = cv(128, 128), x = ctx2d(c);
      x.fillStyle = '#2a2420';
      x.fillRect(0, 0, 128, 128);
      x.fillStyle = '#5a4c40';
      for (let yy = 6; yy < 128; yy += 10) {
        for (let xx = 6; xx < 128; xx += 10) {
          x.beginPath();
          x.arc(xx, yy, 2.4, 0, 7);
          x.fill();
        }
      }
      return ctex(c);
    })();
    g.add(mesh(new THREE.CircleGeometry(.28, 40), std({ map: grille, roughness: .8 }), .6, 0, .862));
    g.add(mesh(new THREE.BoxGeometry(.5, .06, .06), std({ color: 0x2b211a, roughness: .5 }), -.3, .02, .89));
    return g;
  };

  const walkman = () => {
    const g = new THREE.Group();
    g.add(mesh(slab(1.0, 1.4, .3, .08, .04), phys({ color: 0x6BB8D6, metalness: .45, roughness: .3, clearcoat: .7, clearcoatRoughness: .15 })));
    const cassetteWindow = (() => {
      const c = cv(512, 320), x = ctx2d(c);
      x.fillStyle = '#141316';
      x.fillRect(0, 0, 512, 320);
      x.fillStyle = '#ECE3CB';
      rrect(x, 30, 26, 452, 200, 14);
      x.fill();
      x.fillStyle = '#17151B';
      x.font = '84px "Caveat Brush", cursive';
      x.textAlign = 'center';
      x.fillText('LOOP', 256, 104);
      x.fillStyle = '#D8433B';
      x.fillRect(30, 130, 452, 8);
      x.globalCompositeOperation = 'destination-out';
      rrect(x, 190, 150, 132, 56, 10);
      x.fill();
      x.globalCompositeOperation = 'source-over';
      [150, 362].forEach(cx => {
        x.fillStyle = '#F2EFE8';
        x.beginPath(); x.arc(cx, 178, 34, 0, 7); x.fill();
        x.fillStyle = '#141316';
        x.beginPath(); x.arc(cx, 178, 16, 0, 7); x.fill();
      });
      return ctex(c);
    })();
    g.add(mesh(new THREE.PlaneGeometry(.8, .5), std({ map: cassetteWindow, roughness: .6 }), 0, .26, .194));
    g.add(mesh(new THREE.PlaneGeometry(.84, .54), phys({ color: 0x9fb4c4, roughness: .05, transparent: true, opacity: .14, clearcoat: 1, depthWrite: false }), 0, .26, .202));
    const plate = (() => {
      const c = cv(512, 200), x = ctx2d(c);
      x.fillStyle = '#E9EEF0';
      x.fillRect(0, 0, 512, 200);
      ['#D8433B', '#E8BC34', '#3B93CC'].forEach((col, i) => { x.fillStyle = col; x.fillRect(0, 20 + i * 18, 512, 12); });
      x.fillStyle = '#1D1A1F';
      x.font = '700 40px "Space Mono", monospace';
      x.textAlign = 'center';
      x.fillText('AUTO REVERSE', 256, 132);
      x.font = '400 26px "Space Mono", monospace';
      x.fillText('LOOP WM-1 · STEREO', 256, 176);
      return ctex(c);
    })();
    g.add(mesh(new THREE.PlaneGeometry(.8, .31), std({ map: plate, roughness: .45, metalness: .2 }), 0, -.36, .194));
    ([[-.3, 0xE8707A], [-.1, 0xD9B44A], [.1, 0x1D1A1F], [.3, 0x2E8F8A]] as [number, number][])
      .forEach(([x, col]) => g.add(mesh(new THREE.BoxGeometry(.16, .1, .16), std({ color: col, roughness: .45 }), x, .74, 0)));
    g.add(mesh(new THREE.CylinderGeometry(.045, .045, .1, 16), std({ color: 0xE6E8EC, metalness: 1, roughness: .15 }), .38, .74, .06));
    const wheel = mesh(new THREE.CylinderGeometry(.14, .14, .05, 32), std({ color: 0x2b2b30, metalness: .6, roughness: .35 }), .53, .1, 0);
    wheel.rotation.z = Math.PI / 2;
    g.add(wheel);
    return g;
  };

  return { headphones, speaker, earbuds, suitcase, walkman };
}
