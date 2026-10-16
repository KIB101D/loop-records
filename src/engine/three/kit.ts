import * as THREE from 'three';

export type Kit = ReturnType<typeof createKit>;

function studioEnvironment(renderer: THREE.WebGLRenderer) {
  const scene = new THREE.Scene();
  const box = new THREE.BoxGeometry();
  const room = new THREE.Mesh(box, new THREE.MeshStandardMaterial({ side: THREE.BackSide, color: 0x2a2826, roughness: 1 }));
  room.position.set(0, 10, 0);
  room.scale.set(32, 26, 32);
  scene.add(room);
  const bulb = new THREE.PointLight(0xffffff, 2, 30, 2);
  bulb.position.set(0, 15, 0);
  scene.add(bulb);
  const panel = (x: number, y: number, z: number, sx: number, sy: number, sz: number, intensity: number, color = 0xffffff) => {
    const m = new THREE.MeshBasicMaterial({ color });
    m.color.multiplyScalar(intensity);
    const b = new THREE.Mesh(box, m);
    b.position.set(x, y, z);
    b.scale.set(sx, sy, sz);
    scene.add(b);
  };
  panel(-15, 13, 6, .1, 5, 7, 14);
  panel(15, 11, -3, .1, 5, 8, 5, 0xfff0dc);
  panel(0, 9, 15, 9, 5, .1, 9);
  panel(4, 11, -15, 5, 3, .1, 4, 0xdce6ff);
  panel(0, 22, 0, 7, .1, 7, 18);
  const pmrem = new THREE.PMREMGenerator(renderer);
  const texture = pmrem.fromScene(scene, .04).texture;
  pmrem.dispose();
  scene.traverse(o => {
    if (o instanceof THREE.Mesh) (o.material as THREE.Material).dispose();
  });
  box.dispose();
  return texture;
}

export function createKit(renderer: THREE.WebGLRenderer) {
  const aniso = Math.min(8, renderer.capabilities.getMaxAnisotropy());
  const textures: THREE.Texture[] = [];

  const cv = (w: number, h: number) => {
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    return c;
  };
  const ctx2d = (c: HTMLCanvasElement) => c.getContext('2d') as CanvasRenderingContext2D;
  const ctex = (c: HTMLCanvasElement, srgb = true, repeat?: [number, number]) => {
    const t = new THREE.CanvasTexture(c);
    if (srgb) t.encoding = THREE.sRGBEncoding;
    t.anisotropy = aniso;
    if (repeat) {
      t.wrapS = t.wrapT = THREE.RepeatWrapping;
      t.repeat.set(repeat[0], repeat[1]);
    }
    textures.push(t);
    return t;
  };
  const grain = (g: CanvasRenderingContext2D, w: number, h: number, amount: number) => {
    const img = g.getImageData(0, 0, w, h), d = img.data;
    for (let i = 0; i < d.length; i += 4) {
      const n = (Math.random() - .5) * 255 * amount;
      d[i] += n; d[i + 1] += n; d[i + 2] += n;
    }
    g.putImageData(img, 0, 0);
  };
  const rrect = (g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) => {
    g.beginPath();
    g.moveTo(x + r, y);
    g.arcTo(x + w, y, x + w, y + h, r);
    g.arcTo(x + w, y + h, x, y + h, r);
    g.arcTo(x, y + h, x, y, r);
    g.arcTo(x, y, x + w, y, r);
    g.closePath();
  };
  const fitFont = (g: CanvasRenderingContext2D, text: string, template: string, size: number, maxW: number) => {
    let s = size;
    g.font = template.replace('{s}', s.toFixed(1));
    while (g.measureText(text).width > maxW && s > 6) {
      s *= .94;
      g.font = template.replace('{s}', s.toFixed(1));
    }
  };
  const arcText = (g: CanvasRenderingContext2D, text: string, cx: number, cy: number, r: number, mid: number, font: string, color: string) => {
    g.save();
    g.font = font;
    g.fillStyle = color;
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    const chars = [...text];
    const widths = chars.map(ch => g.measureText(ch).width + r * .012);
    let a = mid - widths.reduce((s, w) => s + w, 0) / r / 2;
    chars.forEach((ch, i) => {
      a += widths[i] / r / 2;
      g.save();
      g.translate(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
      g.rotate(a + Math.PI / 2);
      g.fillText(ch, 0, 0);
      g.restore();
      a += widths[i] / r / 2;
    });
    g.restore();
  };

  const shadowTex = (() => {
    const c = cv(256, 256), g = ctx2d(c);
    const gr = g.createRadialGradient(128, 128, 0, 128, 128, 128);
    gr.addColorStop(0, 'rgba(0,0,0,.6)');
    gr.addColorStop(.45, 'rgba(0,0,0,.28)');
    gr.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = gr;
    g.fillRect(0, 0, 256, 256);
    return ctex(c, false);
  })();
  const contactShadow = (w: number, d: number, opacity = 1) => {
    const m = new THREE.Mesh(
      new THREE.PlaneGeometry(w, d),
      new THREE.MeshBasicMaterial({ map: shadowTex, transparent: true, depthWrite: false, opacity, toneMapped: false })
    );
    m.rotation.x = -Math.PI / 2;
    m.renderOrder = -1;
    return m;
  };

  const rrShape = (w: number, h: number, r: number) => {
    const s = new THREE.Shape(), x = -w / 2, y = -h / 2;
    s.moveTo(x + r, y);
    s.lineTo(x + w - r, y);
    s.quadraticCurveTo(x + w, y, x + w, y + r);
    s.lineTo(x + w, y + h - r);
    s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    s.lineTo(x + r, y + h);
    s.quadraticCurveTo(x, y + h, x, y + h - r);
    s.lineTo(x, y + r);
    s.quadraticCurveTo(x, y, x + r, y);
    return s;
  };
  const slab = (w: number, h: number, depth: number, r: number, bevel: number) => {
    const g = new THREE.ExtrudeGeometry(rrShape(w - 2 * bevel, h - 2 * bevel, Math.max(.002, r - bevel)), {
      depth, bevelEnabled: true, bevelThickness: bevel, bevelSize: bevel, bevelSegments: 4, curveSegments: 12
    });
    g.translate(0, 0, -depth / 2);
    return g;
  };
  const std = (o: THREE.MeshStandardMaterialParameters) => new THREE.MeshStandardMaterial(o);
  const phys = (o: THREE.MeshPhysicalMaterialParameters) => new THREE.MeshPhysicalMaterial(o);
  const mesh = (geo: THREE.BufferGeometry, mat: THREE.Material | THREE.Material[], x = 0, y = 0, z = 0) => {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(x, y, z);
    return m;
  };
  const fader = (root: THREE.Object3D) => {
    const mats: THREE.Material[] = [];
    root.traverse(o => {
      if (!(o instanceof THREE.Mesh)) return;
      const list: THREE.Material[] = Array.isArray(o.material) ? o.material : [o.material];
      list.forEach(m => {
        if (mats.includes(m)) return;
        m.userData.baseTransparent = m.transparent;
        m.userData.baseOpacity = m.opacity;
        mats.push(m);
      });
    });
    let last = -1;
    return (v: number) => {
      if (v === last) return;
      last = v;
      root.visible = v > .002;
      const fading = v < .999;
      mats.forEach(m => {
        m.transparent = fading || m.userData.baseTransparent;
        m.opacity = m.userData.baseOpacity * v;
        m.depthWrite = fading ? !m.userData.baseTransparent : true;
      });
    };
  };
  const shadowsOn = (root: THREE.Object3D) => root.traverse(o => {
    if (o instanceof THREE.Mesh && !(o.material as THREE.Material).transparent) {
      o.castShadow = true;
      o.receiveShadow = true;
    }
  });

  const env = studioEnvironment(renderer);

  return {
    cv, ctx2d, ctex, grain, rrect, fitFont, arcText, contactShadow, slab, std, phys, mesh, fader, shadowsOn, env,
    dispose() {
      textures.forEach(t => t.dispose());
      env.dispose();
    }
  };
}
