/* TT Farm: everything 3D. The field with its plots and crops, the animals' pen, Foxy's market, the barn, trees, Froggy's
   farm over the fence, the seasons' colours and weather, the people, and a camera that fits the whole farm on any screen.
   It only draws: js/rules.js says what is where and js/game.js says when. Crops are built once per crop and stage, merged
   into a few meshes per material, and shared by every plot, so a full field stays light on an iPad. */
(function () {
  'use strict';
  const T = THREE, G = Kit.gfx, F = window.FARM;
  const A = (F.art = {});
  const std = G.std;
  const tr = (s) => (Kit.lang ? Kit.lang.t(s) : s);
  let renderer, scene, camera;

  const PAL = [
    { sky: '#9ad7ff', fog: '#cdeeff', grass: '#7fd65a', leaf: '#ffb7d5', leaf2: '#ff8fbf', float: '#ffc6dd', floats: 'petal' },
    { sky: '#5fbcff', fog: '#bfe6ff', grass: '#5cc23f', leaf: '#3fae3a', leaf2: '#59c94a', float: '#ffffff', floats: '' },
    { sky: '#9cc9ea', fog: '#f3dcb8', grass: '#b9b44c', leaf: '#f08a24', leaf2: '#e2572a', float: '#f08a24', floats: 'leaf' },
    { sky: '#b9d3ea', fog: '#e9f1fa', grass: '#eef4fb', leaf: null, leaf2: null, float: '#ffffff', floats: 'snow' },
  ];
  const M = {
    soil: null, wood: std('#b07a45'), woodDark: std('#7c5230'), red: std('#d9473c'), white: std('#f8f4ea'), roof: std('#8a3d2f'),
    stone: std('#a7a39a'), trunk: std('#7b5534'), snow: std('#ffffff', { roughness: 0.9 }), hay: std('#e9c55a'), metal: std('#9fb4c4', { metalness: 0.2, roughness: 0.5 }),
    water: std('#58b4ff', { roughness: 0.2, transparent: true, opacity: 0.85 }), can: std('#3f8fe8', { roughness: 0.45 }),
    leafA: std('#3fae3a'), leafB: std('#59c94a'),
  };
  const mesh = (geo, mat, x = 0, y = 0, z = 0, parent, shadow = true) => G.mesh(geo, mat, x, y, z, parent, shadow);
  const box = (w, h, d) => new T.BoxGeometry(w, h, d);

  /* ---------------- merging: many little meshes into one per material ---------------- */
  function bake(group) {
    group.updateMatrixWorld(true);
    const byMat = new Map();
    group.traverse((o) => {
      if (!o.isMesh) return;
      const g = o.geometry.index ? o.geometry.toNonIndexed() : o.geometry.clone();
      g.applyMatrix4(o.matrixWorld);
      if (!byMat.has(o.material)) byMat.set(o.material, []);
      byMat.get(o.material).push(g);
    });
    const out = [];
    for (const [mat, geos] of byMat) {
      let n = 0;
      for (const g of geos) n += g.attributes.position.count;
      const pos = new Float32Array(n * 3), nor = new Float32Array(n * 3), uv = new Float32Array(n * 2);
      let o = 0;
      for (const g of geos) {
        pos.set(g.attributes.position.array, o * 3);
        nor.set(g.attributes.normal.array, o * 3);
        if (g.attributes.uv) uv.set(g.attributes.uv.array, o * 2);
        o += g.attributes.position.count;
        g.dispose();
      }
      const geo = new T.BufferGeometry();
      geo.setAttribute('position', new T.BufferAttribute(pos, 3));
      geo.setAttribute('normal', new T.BufferAttribute(nor, 3));
      geo.setAttribute('uv', new T.BufferAttribute(uv, 2));
      geo.computeBoundingSphere();
      out.push({ geo, mat });
    }
    return out;
  }
  function fromBaked(parts) {
    const g = new T.Group();
    for (const p of parts) {
      const m = new T.Mesh(p.geo, p.mat);
      m.castShadow = true;
      g.add(m);
    }
    return g;
  }

  /* ---------------- textures ---------------- */
  function soilTexture() {
    const [c, x] = G.makeCanvas(128, 128);
    x.fillStyle = '#8b5a32';
    x.fillRect(0, 0, 128, 128);
    for (let i = 0; i < 6; i++) {
      x.fillStyle = '#744828';
      x.fillRect(10, i * 18 + 22, 108, 6);
      x.fillStyle = '#9c6838';
      x.fillRect(10, i * 18 + 15, 108, 4);
    }
    x.strokeStyle = '#5a361b';
    x.lineWidth = 8;
    x.strokeRect(4, 4, 120, 120);
    for (let i = 0; i < 260; i++) {
      x.fillStyle = Math.random() < 0.5 ? 'rgba(60,35,15,0.35)' : 'rgba(190,140,90,0.3)';
      x.fillRect(Math.random() * 128, Math.random() * 128, 2, 2);
    }
    return G.toTexture(c);
  }
  function stripeTexture(a, b, n) {
    const [c, x] = G.makeCanvas(128, 64);
    for (let i = 0; i < n; i++) {
      x.fillStyle = i % 2 ? b : a;
      x.fillRect((i * 128) / n, 0, 128 / n + 1, 64);
    }
    return G.toTexture(c);
  }
  function melonTexture() {
    const [c, x] = G.makeCanvas(256, 128);
    x.fillStyle = '#5fbf3f';
    x.fillRect(0, 0, 256, 128);
    x.strokeStyle = '#1f6b1f';
    x.lineWidth = 11;
    for (let i = 0; i < 10; i++) {
      x.beginPath();
      const x0 = i * 25.6 + 6;
      x.moveTo(x0, 0);
      for (let y = 0; y <= 128; y += 8) x.lineTo(x0 + Math.sin(y * 0.15 + i) * 5, y);
      x.stroke();
    }
    return G.toTexture(c);
  }
  // a wooden sign board with words (drawn again when the language changes)
  const signs = [];
  function signTexture(lines, opts = {}) {
    const W = opts.w || 512, H = opts.h || 256;
    const [c, x] = G.makeCanvas(W, H);
    const draw = () => {
      x.clearRect(0, 0, W, H);
      x.fillStyle = opts.bg || '#f3dfb3';
      G.roundRect(x, 6, 6, W - 12, H - 12, 34);
      x.fill();
      x.lineWidth = 12;
      x.strokeStyle = opts.edge || '#7c5230';
      x.stroke();
      x.textAlign = 'center';
      x.textBaseline = 'middle';
      const ls = (typeof lines === 'function' ? lines() : lines).map((l) => (typeof l === 'string' ? { text: l } : l));
      const n = ls.length;
      ls.forEach((l, i) => {
        const text = l.raw ? l.text : tr(l.text);
        let size = l.size || (n === 1 ? 110 : 84);
        x.font = `${size}px ${l.emoji ? G.EMOJI_FONT : G.FONT}`;
        while (x.measureText(text).width > W - 60 && size > 20) { size -= 4; x.font = `${size}px ${l.emoji ? G.EMOJI_FONT : G.FONT}`; }
        x.fillStyle = l.color || opts.ink || '#4a2a12';
        x.fillText(text, W / 2, H * ((i + 0.5) / n) + (n === 1 ? 6 : 4));
      });
      tex.needsUpdate = true;
    };
    const tex = G.toTexture(c);
    draw();
    signs.push(draw);
    tex.redraw = draw;
    return tex;
  }
  // a sign on a post: board w x h metres, at height y
  function signPost(tex, w, h, y = 1.4, parent) {
    const g = new T.Group();
    mesh(box(0.14, y, 0.14), M.woodDark, 0, y / 2, 0, g);
    const board = mesh(box(w + 0.12, h + 0.12, 0.08), M.woodDark, 0, y + h / 2 - 0.1, 0, g);
    board.castShadow = true;
    const face = new T.Mesh(new T.PlaneGeometry(w, h), new T.MeshStandardMaterial({ map: tex, roughness: 0.9 }));
    face.position.set(0, y + h / 2 - 0.1, 0.05);
    g.add(face);
    g.userData.face = face;
    if (parent) parent.add(g);
    return g;
  }

  /* ---------------- crops: built once per crop and stage ---------------- */
  const cropCache = {};
  function leafMat(c) { return (M['lf' + c] = M['lf' + c] || std(c, { roughness: 0.75 })); }
  function bokchoy(stage, g, x, z) {
    const s = [0, 0.45, 0.75, 1][stage];
    const n = stage === 1 ? 3 : 6;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      const stem = new T.Mesh(new T.CylinderGeometry(0.035 * s + 0.01, 0.05 * s + 0.01, 0.42 * s, 6), leafMat('#e8f5d8'));
      stem.position.set(x + Math.cos(a) * 0.07 * s, 0.21 * s, z + Math.sin(a) * 0.07 * s);
      stem.rotation.set(Math.sin(a) * 0.35, 0, -Math.cos(a) * 0.35);
      g.add(stem);
      const leaf = new T.Mesh(new T.SphereGeometry(0.17 * s, 8, 6), leafMat(stage === 3 ? '#2f9a3a' : '#48b84a'));
      leaf.scale.set(0.8, 1.25, 0.32);
      leaf.position.set(x + Math.cos(a) * 0.17 * s, 0.48 * s, z + Math.sin(a) * 0.17 * s);
      leaf.rotation.set(0, -a + Math.PI / 2, 0);
      leaf.rotateX(-0.35);
      g.add(leaf);
    }
  }
  function riceTuft(stage, g, x, z) {
    const h = [0, 0.32, 0.62, 0.86][stage];
    const n = stage === 1 ? 4 : 7;
    const ripe = stage === 3;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + 0.3;
      const tilt = 0.12 + (i % 3) * 0.08;
      const blade = new T.Mesh(box(0.035, h, 0.035), leafMat(ripe ? '#cfae3a' : stage === 2 ? '#5cbf3c' : '#7ad35a'));
      blade.position.set(x + Math.cos(a) * 0.05, h / 2, z + Math.sin(a) * 0.05);
      blade.rotation.set(Math.sin(a) * tilt, 0, -Math.cos(a) * tilt);
      g.add(blade);
      if (stage >= 2) {
        const head = new T.Mesh(new T.SphereGeometry(0.055, 6, 5), leafMat(ripe ? '#f4cf3f' : '#a6d86a'));
        head.scale.set(0.7, 1.9, 0.7);
        const tipX = x + Math.cos(a) * (0.05 + h * Math.sin(tilt) + (ripe ? 0.07 : 0)), tipZ = z + Math.sin(a) * (0.05 + h * Math.sin(tilt) + (ripe ? 0.07 : 0));
        head.position.set(tipX, h * Math.cos(tilt) + (ripe ? -0.03 : 0.05), tipZ);
        head.rotation.set(Math.sin(a) * (ripe ? 1.1 : 0.3), 0, -Math.cos(a) * (ripe ? 1.1 : 0.3));
        g.add(head);
      }
    }
  }
  function melonPlant(stage, g) {
    const vine = leafMat('#3c9a35');
    const leaves = stage === 1 ? 3 : 7;
    for (let i = 0; i < leaves; i++) {
      const a = (i / leaves) * Math.PI * 2;
      const r = stage === 1 ? 0.18 : 0.65;
      const leaf = new T.Mesh(new T.SphereGeometry(stage === 1 ? 0.13 : 0.2, 8, 6), leafMat(i % 2 ? '#4fb948' : '#3a9d3a'));
      leaf.scale.set(1.2, 0.3, 1);
      leaf.position.set(Math.cos(a) * r, stage === 1 ? 0.16 : 0.12, Math.sin(a) * r);
      g.add(leaf);
      if (stage > 1) {
        const v = new T.Mesh(box(0.05, 0.05, r), vine);
        v.position.set(Math.cos(a) * r * 0.5, 0.06, Math.sin(a) * r * 0.5);
        v.rotation.y = -a + Math.PI / 2;
        g.add(v);
      }
    }
    if (stage === 1) { const st = new T.Mesh(box(0.04, 0.16, 0.04), vine); st.position.y = 0.08; g.add(st); }
    if (stage >= 2) {
      M.melon = M.melon || std('#ffffff', { map: melonTexture(), roughness: 0.55 });
      const big = stage === 3;
      const m = new T.Mesh(new T.SphereGeometry(big ? 0.5 : 0.24, 18, 12), M.melon);
      m.scale.set(1.25, 0.88, 0.95);
      m.position.set(big ? 0.05 : 0.18, big ? 0.42 : 0.2, big ? 0.05 : 0.15);
      m.rotation.y = 0.5;
      g.add(m);
      if (big) {
        const small = new T.Mesh(new T.SphereGeometry(0.26, 14, 10), M.melon);
        small.scale.set(1.2, 0.9, 1);
        small.position.set(-0.6, 0.22, -0.55);
        g.add(small);
      }
    }
  }
  function seeds(g, crop) {
    const mound = leafMat('#6e4424'), dot = leafMat(crop === 'melon' ? '#7ac943' : crop === 'rice' ? '#a7d86a' : '#8fd36a');
    const spots = crop === 'melon' ? [[0, 0]] : crop === 'rice' ? [[-0.62, -0.62], [0, -0.62], [0.62, -0.62], [-0.62, 0], [0, 0], [0.62, 0], [-0.62, 0.62], [0, 0.62], [0.62, 0.62]] : [[-0.5, -0.5], [0.5, -0.5], [-0.5, 0.5], [0.5, 0.5]];
    for (const [x, z] of spots) {
      const m = new T.Mesh(new T.SphereGeometry(0.16, 8, 5), mound);
      m.scale.set(1, 0.35, 1);
      m.position.set(x, 0.02, z);
      g.add(m);
      const d = new T.Mesh(new T.SphereGeometry(0.05, 6, 4), dot);
      d.position.set(x, 0.08, z);
      g.add(d);
    }
  }
  function cropParts(crop, stage) {
    const key = crop + stage;
    if (cropCache[key]) return cropCache[key];
    const g = new T.Group();
    if (stage === 0) seeds(g, crop);
    else if (crop === 'bokchoy') for (const [x, z] of [[-0.5, -0.5], [0.5, -0.5], [-0.5, 0.5], [0.5, 0.5]]) bokchoy(stage, g, x, z);
    else if (crop === 'rice') for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j++) riceTuft(stage, g, i * 0.62, j * 0.62);
    else melonPlant(stage, g);
    return (cropCache[key] = bake(g));
  }
  const stageOf = (g) => (g >= 1 ? 3 : g >= 2 / 3 ? 2 : g >= 1 / 3 ? 1 : 0);

  /* ---------------- animals ---------------- */
  function chicken(parent, x, z, rot = 0) {
    const g = new T.Group();
    const w = std('#fbfbf6'), red = std('#e8343a'), or = std('#ffa41f'), eye = std('#14121f');
    const body = new T.Group();
    g.add(body);
    mesh(box(0.42, 0.36, 0.52), w, 0, 0.36, 0, body);
    mesh(box(0.3, 0.26, 0.12), w, 0, 0.48, 0.3, body); // tail
    const head = new T.Group();
    head.position.set(0, 0.62, -0.24);
    body.add(head);
    mesh(box(0.26, 0.28, 0.26), w, 0, 0, 0, head);
    mesh(box(0.08, 0.12, 0.16), red, 0, 0.18, 0.02, head);
    mesh(box(0.1, 0.08, 0.12), or, 0, -0.02, -0.17, head);
    mesh(box(0.06, 0.1, 0.05), red, 0, -0.12, -0.12, head);
    for (const s of [-1, 1]) {
      mesh(box(0.05, 0.05, 0.02), eye, s * 0.1, 0.05, -0.13, head);
      mesh(box(0.06, 0.2, 0.06), or, s * 0.1, 0.1, 0, g);
      mesh(box(0.06, 0.24, 0.34), w, s * 0.23, 0.38, 0.02, body);
    }
    g.position.set(x, 0, z);
    g.rotation.y = rot;
    g.userData = { head, body };
    parent.add(g);
    return g;
  }
  function cow(parent) {
    const g = new T.Group();
    const w = std('#fbfaf5'), blk = std('#26221f'), pink = std('#f6a3b2'), horn = std('#f3e6c4');
    const body = new T.Group();
    g.add(body);
    mesh(box(0.9, 0.78, 1.5), w, 0, 1.0, 0, body);
    [[0.46, 1.1, 0.2, 0.02, 0.5, 0.6], [-0.46, 0.95, -0.35, 0.02, 0.4, 0.5], [0.1, 1.4, -0.2, 0.5, 0.02, 0.6], [-0.2, 0.9, 0.5, 0.02, 0.3, 0.3]].forEach(([x, y, z, sx, sy, sz]) => {
      mesh(box(sx || 0.02, sy, sz), blk, x + Math.sign(x) * 0.01, y, z, body);
    });
    mesh(box(0.42, 0.3, 0.3), blk, 0.18, 1.395 + 0.01, 0.3, body).scale.set(1, 0.05, 1);
    const head = new T.Group();
    head.position.set(0, 1.3, -0.86);
    body.add(head);
    mesh(box(0.56, 0.52, 0.5), w, 0, 0, 0, head);
    mesh(box(0.5, 0.26, 0.2), pink, 0, -0.14, -0.3, head);
    for (const s of [-1, 1]) {
      mesh(box(0.07, 0.07, 0.03), blk, s * 0.15, 0.08, -0.26, head);
      mesh(box(0.08, 0.18, 0.08), horn, s * 0.2, 0.33, 0.05, head);
      mesh(box(0.24, 0.1, 0.12), w, s * 0.38, 0.12, 0.08, head);
      for (const z of [-0.55, 0.55]) mesh(box(0.2, 0.62, 0.2), w, s * 0.28, 0.31, z, g);
    }
    mesh(box(0.38, 0.12, 0.3), pink, 0, 0.58, 0.35, body); // udder
    const tail = mesh(box(0.06, 0.6, 0.06), w, 0, 1.0, 0.78, body);
    tail.rotation.x = 0.3;
    g.userData = { head, body, tail };
    parent.add(g);
    return g;
  }
  function sheep(parent) {
    const g = new T.Group();
    const wool = std('#fbf8f2', { roughness: 1 }), face = std('#2e2a2a');
    const body = new T.Group();
    g.add(body);
    for (let i = 0; i < 9; i++) {
      const b = mesh(new T.IcosahedronGeometry(0.34, 0), wool, ((i % 3) - 1) * 0.28, 0.82 + (i % 2) * 0.1, (Math.floor(i / 3) - 1) * 0.36, body);
      b.rotation.set(i, i * 2, 0);
    }
    const head = new T.Group();
    head.position.set(0, 1.0, -0.62);
    body.add(head);
    mesh(box(0.36, 0.42, 0.36), face, 0, 0, 0, head);
    mesh(new T.IcosahedronGeometry(0.22, 0), wool, 0, 0.24, 0.04, head);
    for (const s of [-1, 1]) {
      mesh(box(0.06, 0.06, 0.03), std('#ffffff'), s * 0.1, 0.05, -0.19, head);
      mesh(box(0.2, 0.08, 0.1), face, s * 0.25, 0.08, 0.05, head);
      for (const z of [-0.36, 0.36]) mesh(box(0.13, 0.55, 0.13), face, s * 0.22, 0.27, z, g);
    }
    g.userData = { head, body };
    parent.add(g);
    return g;
  }
  function shelter(parent, w, d, color) {
    const g = new T.Group();
    // a back wall, four posts and a roof: open at the front and sides so you can see who lives there
    const wall = std(color);
    mesh(box(w, 1.6, 0.15), wall, 0, 0.8, -d / 2, g);
    for (const x of [-w / 2, w / 2]) for (const z of [-d / 2, d / 2]) mesh(box(0.14, 1.9, 0.14), M.woodDark, x, 0.95, z, g);
    const roof = mesh(box(w + 0.5, 0.14, d + 0.6), M.roof, 0, 1.95, 0, g);
    roof.rotation.x = -0.18;
    const snow = mesh(box(w + 0.52, 0.06, d + 0.62), M.snow, 0, 2.05, 0, g);
    snow.rotation.x = -0.18;
    snow.userData.snow = true;
    parent.add(g);
    return g;
  }
  function trough(parent) {
    const g = new T.Group();
    mesh(box(1.3, 0.34, 0.55), M.wood, 0, 0.27, 0, g);
    const food = mesh(box(1.1, 0.06, 0.38), M.hay, 0, 0.42, 0, g);
    food.visible = false;
    g.userData.food = food;
    parent.add(g);
    return g;
  }

  /* ---------------- buildings and trees ---------------- */
  function barn(parent) {
    const g = new T.Group();
    mesh(box(5.2, 3.4, 4.2), M.red, 0, 1.7, 0, g);
    const shape = new T.Shape();
    shape.moveTo(-2.9, 0); shape.lineTo(0, 2.1); shape.lineTo(2.9, 0); shape.lineTo(-2.9, 0);
    const roofGeo = new T.ExtrudeGeometry(shape, { depth: 4.6, bevelEnabled: false });
    const roof = mesh(roofGeo, M.roof, 0, 3.4, -2.3, g);
    const sn = new T.Shape();
    sn.moveTo(-2.95, 0.05); sn.lineTo(0, 2.2); sn.lineTo(2.95, 0.05); sn.lineTo(2.6, 0.05); sn.lineTo(0, 1.95); sn.lineTo(-2.6, 0.05);
    const snow = mesh(new T.ExtrudeGeometry(sn, { depth: 4.7, bevelEnabled: false }), M.snow, 0, 3.42, -2.35, g);
    snow.userData.snow = true;
    void roof;
    // the doors with their white X
    mesh(box(2.4, 2.4, 0.08), std('#b8392f'), 0, 1.2, 2.12, g);
    for (const s of [-1, 1]) {
      const b = mesh(box(0.16, 3.2, 0.06), M.white, 0, 1.2, 2.18, g);
      b.rotation.z = s * 0.78;
    }
    mesh(box(2.6, 0.16, 0.06), M.white, 0, 2.45, 2.18, g);
    mesh(box(0.16, 2.5, 0.06), M.white, -1.25, 1.2, 2.18, g);
    mesh(box(0.16, 2.5, 0.06), M.white, 1.25, 1.2, 2.18, g);
    mesh(box(1.1, 0.9, 0.08), std('#3a2a20'), 0, 4.1, 2.12, g);
    // the farm's name over the door
    A.nameTex = signTexture(() => [{ text: F.TITLE.toUpperCase(), raw: true }], { w: 512, h: 160, bg: '#fff3d6' });
    const name = new T.Mesh(new T.PlaneGeometry(2.7, 0.84), new T.MeshStandardMaterial({ map: A.nameTex, roughness: 0.9 }));
    name.position.set(0, 2.95, 2.13);
    g.add(name);
    // a silo
    mesh(new T.CylinderGeometry(1.0, 1.0, 5, 16), std('#cfd8dc', { roughness: 0.6 }), 3.6, 2.5, -0.6, g);
    mesh(new T.SphereGeometry(1.0, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), std('#8a3d2f'), 3.6, 5, -0.6, g);
    const ss = mesh(new T.SphereGeometry(1.03, 16, 8, 0, Math.PI * 2, 0, Math.PI / 3), M.snow, 3.6, 5.02, -0.6, g);
    ss.userData.snow = true;
    // hay bales
    for (const [x, z] of [[-3.3, 1.6], [-3.3, 0.4], [-3.3, 1.0]]) {
      const h = mesh(new T.CylinderGeometry(0.5, 0.5, 0.9, 12), M.hay, x, 0.5, z, g);
      h.rotation.z = Math.PI / 2;
    }
    parent.add(g);
    return g;
  }
  const trees = [];
  function tree(parent, x, z, s = 1) {
    const g = new T.Group();
    mesh(new T.CylinderGeometry(0.18 * s, 0.26 * s, 1.6 * s, 7), M.trunk, 0, 0.8 * s, 0, g);
    const crown = new T.Group();
    g.add(crown);
    const mats = [std('#3fae3a'), std('#59c94a')];
    [[0, 2.2, 0, 1.05], [0.6, 1.9, 0.2, 0.75], [-0.55, 1.95, -0.1, 0.8], [0.1, 2.75, -0.1, 0.7]].forEach(([cx, cy, cz, r], i) => {
      const m = mesh(new T.IcosahedronGeometry(r * s, 0), mats[i % 2], cx * s, cy * s, cz * s, crown);
      m.rotation.set(i, i * 1.3, 0);
    });
    const bare = new T.Group();
    g.add(bare);
    [[0.6, 2.1, 0.5], [-0.55, 2.0, -0.6], [0.1, 2.4, 0]].forEach(([bx, by, rz]) => {
      const b = mesh(new T.CylinderGeometry(0.05 * s, 0.09 * s, 1.1 * s, 5), M.trunk, bx * s * 0.5, by * s, 0, bare);
      b.rotation.z = rz;
      const sn = mesh(new T.SphereGeometry(0.16 * s, 6, 4), M.snow, bx * s, (by + 0.45) * s, 0, bare);
      sn.scale.y = 0.5;
    });
    g.position.set(x, 0, z);
    g.rotation.y = x * 1.7 + z;
    parent.add(g);
    trees.push({ g, crown, bare, mats });
    return g;
  }
  function fence(parent, x0, z0, x1, z1, gap) {
    const len = Math.hypot(x1 - x0, z1 - z0), n = Math.max(1, Math.round(len / 1.6));
    const g = new T.Group();
    for (let i = 0; i <= n; i++) {
      const k = i / n;
      if (gap && k > gap[0] && k < gap[1]) continue;
      mesh(box(0.16, 0.9, 0.16), M.wood, x0 + (x1 - x0) * k, 0.45, z0 + (z1 - z0) * k, g);
    }
    const ang = Math.atan2(z1 - z0, x1 - x0);
    const rails = gap ? [[0, gap[0]], [gap[1], 1]] : [[0, 1]];
    for (const [a, b] of rails) {
      for (const y of [0.35, 0.7]) {
        const l = len * (b - a);
        const r = mesh(box(l, 0.1, 0.07), M.wood, x0 + (x1 - x0) * (a + b) / 2, y, z0 + (z1 - z0) * (a + b) / 2, g);
        r.rotation.y = -ang;
      }
    }
    parent.add(g);
    return g;
  }

  /* ---------------- the market ---------------- */
  function market(parent) {
    const g = new T.Group();
    // built facing +z (toward the field when the group is turned)
    mesh(box(4.2, 1.1, 1.1), M.wood, 0, 0.55, 0.9, g);
    mesh(box(4.4, 0.12, 1.3), M.woodDark, 0, 1.16, 0.9, g);
    for (const x of [-2.05, 2.05]) for (const z of [0.4, 1.4 - 1.8]) mesh(box(0.16, 3.0, 0.16), M.woodDark, x, 1.5, z, g);
    const awn = std('#ffffff', { map: stripeTexture('#ff4b5c', '#fff6ea', 10), roughness: 0.8 });
    const a = mesh(box(4.7, 0.12, 2.6), awn, 0, 3.05, 0.3, g);
    a.rotation.x = 0.22;
    const sn = mesh(box(4.72, 0.05, 2.62), M.snow, 0, 3.13, 0.3, g);
    sn.rotation.x = 0.22;
    sn.userData.snow = true;
    // crates of goods on the counter and the ground
    const crates = [['🥬', -1.4], ['🌾', -0.45], ['🍉', 0.5], ['🥚', 1.45]];
    for (const [e, x] of crates) {
      mesh(box(0.8, 0.36, 0.7), std('#d9a066'), x, 1.4, 0.9, g);
      const s = A.emoji(e, 0.75);
      s.position.set(x, 1.82, 0.95);
      g.add(s);
    }
    A.marketTex = signTexture(['MARKET'], { w: 512, h: 150, bg: '#fff3d6', ink: '#c0392b' });
    const board = new T.Mesh(new T.PlaneGeometry(3.2, 0.94), new T.MeshStandardMaterial({ map: A.marketTex, roughness: 0.9 }));
    board.position.set(0, 3.7, 1.25);
    board.rotation.x = -0.1;
    g.add(board);
    mesh(box(3.3, 1.04, 0.08), M.woodDark, 0, 3.7, 1.2, g).rotation.x = -0.1;
    // Foxy's wish: a little chalkboard by the counter
    A.wishTex = signTexture(() => [{ text: A.wishText || '', raw: true, emoji: true, size: 96, color: '#fff' }], { w: 320, h: 180, bg: '#2f4a3a', edge: '#7c5230' });
    const wish = signPost(A.wishTex, 1.5, 0.84, 1.0, g);
    wish.position.set(2.75, 0, 1.3);
    wish.rotation.y = -0.25;
    parent.add(g);
    return g;
  }

  /* ---------------- people and sprites ---------------- */
  A.emoji = function (e, size) {
    const s = new T.Sprite(new T.SpriteMaterial({ map: G.emojiTexture(e), transparent: true, depthWrite: false }));
    s.scale.set(size, size, 1);
    return s;
  };
  A.person = function (id, size = 0.62) {
    const entry = Kit.roster.get(id);
    const p = Kit.people.build(entry.look);
    const holder = new T.Group();
    holder.add(p.root);
    holder.scale.setScalar(size);
    p.root.traverse((o) => { if (o.isMesh) o.castShadow = true; });
    holder.userData = { p, id, entry, size };
    return holder;
  };
  A.pose = (holder, phase, mode, k = 0.3) => Kit.people.pose(holder.userData.p, phase, mode, k);
  // a watering can in a person's right hand
  A.makeCan = function () {
    const g = new T.Group();
    mesh(new T.CylinderGeometry(0.16, 0.18, 0.3, 10), M.can, 0, 0, 0, g);
    const spout = mesh(new T.CylinderGeometry(0.03, 0.04, 0.42, 6), M.can, 0, 0.06, -0.24, g);
    spout.rotation.x = -1.0;
    const handle = mesh(new T.TorusGeometry(0.12, 0.025, 6, 12, Math.PI), M.can, 0, 0.16, 0.02, g);
    handle.rotation.y = Math.PI / 2;
    g.visible = false;
    scene.add(g);
    return g;
  };
  const tmpV = new T.Vector3();
  A.holdCan = function (can, holder, tip) {
    holder.updateMatrixWorld(true);
    Kit.people.handWorld(holder.userData.p, 1, tmpV);
    can.position.copy(tmpV);
    can.position.y -= 0.08;
    can.rotation.set(tip ? 0.7 : 0.1, holder.rotation.y, 0);
    can.visible = true;
  };

  // little things that float up and fade, and things that fly in an arc
  const pops = [];
  A.pop = function (e, x, y, z, o = {}) {
    const s = A.emoji(e, o.size || 0.9);
    s.position.set(x, y, z);
    scene.add(s);
    pops.push({ s, t: 0, life: o.life || 1.1, vy: o.vy === undefined ? 1.4 : o.vy, vx: o.vx || 0, vz: o.vz || 0, g: o.g || 0, size: o.size || 0.9, grow: o.grow || 0 });
  };
  const drops = [];
  A.splash = function (x, z, n = 8) {
    for (let i = 0; i < n; i++) {
      const s = new T.Sprite(new T.SpriteMaterial({ map: G.dotTexture(), color: '#6fc3ff', transparent: true, depthWrite: false }));
      s.scale.setScalar(0.16);
      s.position.set(x + (Math.random() - 0.5) * 1.8, 1.0 + Math.random() * 0.6, z + (Math.random() - 0.5) * 1.8);
      scene.add(s);
      drops.push({ s, vy: -2 - Math.random() * 2, life: 0.5 + Math.random() * 0.3, t: 0 });
    }
  };
  const flights = [];
  A.fly = function (e, from, to, o = {}) {
    const s = A.emoji(e, o.size || 0.9);
    s.position.copy(from);
    scene.add(s);
    flights.push({ s, from: from.clone(), to: to.clone(), t: 0, dur: o.dur || 0.6, arc: o.arc === undefined ? 2 : o.arc, spin: o.spin || 0 });
  };

  /* ---------------- the farm ---------------- */
  const plots = [];
  const animals = {};
  let L = null;
  A.init = function (canvas) {
    renderer = new T.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance', preserveDrawingBuffer: false });
    renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
    renderer.outputEncoding = T.sRGBEncoding;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = T.PCFSoftShadowMap;
    scene = new T.Scene();
    A.scene = scene;
    scene.background = new T.Color(PAL[0].sky);
    scene.fog = new T.Fog(PAL[0].fog, 45, 110);
    camera = new T.PerspectiveCamera(34, 1.6, 0.5, 300);
    A.camera = camera;
    const hemi = new T.HemisphereLight('#ffffff', '#6b8f4a', 0.75);
    scene.add(hemi);
    A.hemi = hemi;
    const sun = new T.DirectionalLight('#fff2d8', 1.05);
    sun.position.set(-14, 26, 16);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    const sc = sun.shadow.camera;
    sc.left = -26; sc.right = 26; sc.top = 22; sc.bottom = -22; sc.near = 1; sc.far = 80;
    sun.shadow.bias = -0.0008;
    scene.add(sun);
    A.sun = sun;

    // ground
    M.grass = std(PAL[0].grass, { roughness: 1 });
    const ground = new T.Mesh(new T.PlaneGeometry(160, 160), M.grass);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);
    A.ground = ground;
    // the field's dirt bed and its plots
    M.soilTex = soilTexture();
    const bed = mesh(box(4 * F.layout(false).pitch + 0.6, 0.08, 1), std('#9b6c42', { roughness: 1 }), 0, 0.04, 0, scene, false);
    bed.receiveShadow = true;
    A.bed = bed;
    for (let i = 0; i < F.PLOTS; i++) {
      const g = new T.Group();
      const mat = std('#ffffff', { map: M.soilTex, roughness: 0.95 });
      const soil = mesh(box(2.3, 0.22, 2.3), mat, 0, 0.11, 0, g, false);
      soil.receiveShadow = true;
      const crop = new T.Group();
      crop.position.y = 0.22;
      g.add(crop);
      const bubble = A.emoji('💧', 0.8);
      bubble.position.y = 1.7;
      bubble.visible = false;
      g.add(bubble);
      const tag = A.emoji('🥬', 0.5);
      tag.position.set(-0.95, 0.7, 0.95);
      tag.visible = false;
      g.add(tag);
      const stick = mesh(box(0.05, 0.5, 0.05), M.woodDark, -0.95, 0.4, 0.95, g);
      stick.visible = false;
      scene.add(g);
      plots.push({ g, soil, mat, crop, bubble, tag, stick, key: '', open: null, popT: 1, wet: -1 });
    }
    // the locked rows: stakes and a sign each
    A.rowSigns = {};
    for (const r of ['row1', 'row0']) {
      const tex = signTexture(() => ['MORE FIELD', { text: `${A.costs ? A.costs[r] : ''} 🪙`, raw: true, emoji: true }], { w: 400, h: 240 });
      const sp = signPost(tex, 1.5, 0.9, 1.1, scene);
      sp.userData.tex = tex;
      A.rowSigns[r] = sp;
    }
    // the animals, their shelters and troughs
    const pen = new T.Group();
    scene.add(pen);
    A.pen = pen;
    for (const id of F.ANIMAL_IDS) {
      const g = new T.Group();
      scene.add(g);
      const sh = shelter(g, id === 'cow' ? 2.8 : 2.4, 2.4, id === 'chicken' ? '#e0573f' : id === 'cow' ? '#c99a5e' : '#a8c7de');
      sh.position.set(0, 0, -0.2);
      const who = new T.Group();
      g.add(who);
      let bodies;
      if (id === 'chicken') bodies = [chicken(who, -0.45, 0.1, 0.4), chicken(who, 0.5, -0.1, -0.5)];
      else bodies = [id === 'cow' ? cow(who) : sheep(who)];
      if (id !== 'chicken') bodies[0].scale.setScalar(id === 'cow' ? 0.95 : 1);
      const tg = trough(scene);
      const bubble = A.emoji('🌽', 0.9);
      scene.add(bubble);
      const tex = signTexture(() => [{ text: F.ANIMALS[id].emoji, raw: true, emoji: true, size: 120 }, { text: `${A.costs ? A.costs[id] : ''} 🪙`, raw: true, emoji: true, size: 80 }], { w: 300, h: 260 });
      const sign = signPost(tex, 1.1, 0.95, 1.0, scene);
      sign.userData.tex = tex;
      animals[id] = { g, who, bodies, trough: tg, bubble, sign, owned: null, popT: 1, state: '' };
    }
    A.barn = barn(scene);
    A.market = market(scene);
    A.foxy = A.person('foxy', 0.66);
    scene.add(A.foxy);
    // Froggy's farm over the fence
    A.froggyFarm = new T.Group();
    scene.add(A.froggyFarm);
    const ff = A.froggyFarm;
    mesh(box(7.2, 0.06, 4.8), std('#9b6c42', { roughness: 1 }), 0, 0.03, 0, ff, false);
    A.froggyPlots = [];
    for (let i = 0; i < 6; i++) {
      const pg = new T.Group();
      pg.position.set(((i % 3) - 1) * 2.3, 0, (Math.floor(i / 3) - 0.5) * 2.2);
      mesh(box(1.9, 0.16, 1.8), std('#ffffff', { map: M.soilTex }), 0, 0.08, 0, pg, false);
      const c = new T.Group();
      c.position.y = 0.16;
      c.scale.setScalar(0.8);
      pg.add(c);
      ff.add(pg);
      A.froggyPlots.push({ c, key: '' });
    }
    fence(ff, -4, 2.9, 4, 2.9);
    fence(ff, -4, -2.9, -4, 2.9);
    A.froggySignTex = signTexture(["FROGGY'S FARM"], { w: 512, h: 140, bg: '#e8ffd8', ink: '#2f7d2a' });
    const fs = signPost(A.froggySignTex, 2.6, 0.72, 1.0, ff);
    fs.position.set(-2.6, 0, 3.3);
    A.froggy = A.person('froggy', 0.6);
    ff.add(A.froggy);
    // trees and bushes round the edge
    const tz = [[-20, -12], [-17, 10], [18, 9], [21, -6], [-21, 2], [5, -14], [-4, -15], [16, -15], [-8, 13], [9, 13.5], [-24, -6], [24, 3]];
    for (const [x, z] of tz) tree(scene, x, z, 1 + ((x * 7 + z * 3) % 3) * 0.12);
    // the weather: petals, leaves, snow (points) and rain (falling streaks)
    const N = 420;
    const fp = new Float32Array(N * 3);
    for (let i = 0; i < N; i++) { fp[i * 3] = (Math.random() - 0.5) * 60; fp[i * 3 + 1] = Math.random() * 16; fp[i * 3 + 2] = (Math.random() - 0.5) * 40; }
    const fg = new T.BufferGeometry();
    fg.setAttribute('position', new T.BufferAttribute(fp, 3));
    A.floats = new T.Points(fg, new T.PointsMaterial({ map: G.dotTexture(), size: 0.32, transparent: true, depthWrite: false, color: '#ffffff' }));
    A.floats.visible = false;
    scene.add(A.floats);
    const R = 900;
    const rp = new Float32Array(R * 6);
    for (let i = 0; i < R; i++) {
      const x = (Math.random() - 0.5) * 50, y = Math.random() * 18, z = (Math.random() - 0.5) * 34;
      rp.set([x, y, z, x - 0.05, y - 0.7, z + 0.05], i * 6);
    }
    const rg = new T.BufferGeometry();
    rg.setAttribute('position', new T.BufferAttribute(rp, 3));
    A.rain = new T.LineSegments(rg, new T.LineBasicMaterial({ color: '#cfe8ff', transparent: true, opacity: 0.0 }));
    A.rain.frustumCulled = false;
    scene.add(A.rain);
    A.rainT = 0;
    // the focus rings: Teddy's (P1) yellow, Tommy's (P2) cyan
    A.rings = ['#ffd400', '#18d4ff'].map((c) => {
      const m = new T.Mesh(new T.RingGeometry(1.25, 1.5, 40), new T.MeshBasicMaterial({ color: c, transparent: true, opacity: 0.95, depthWrite: false }));
      m.rotation.x = -Math.PI / 2;
      m.position.y = 0.26;
      m.visible = false;
      scene.add(m);
      const icon = A.emoji('💧', 0.95);
      icon.visible = false;
      scene.add(icon);
      return { m, icon, e: '' };
    });
    // the players' little ground discs
    A.discs = ['#ffd400', '#18d4ff'].map((c) => {
      const m = new T.Mesh(new T.CircleGeometry(0.42, 24), new T.MeshBasicMaterial({ color: c, transparent: true, opacity: 0.55, depthWrite: false }));
      m.rotation.x = -Math.PI / 2;
      m.position.y = 0.03;
      m.visible = false;
      scene.add(m);
      return m;
    });
    if (Kit.lang) Kit.lang.onChange(() => signs.forEach((d) => d()));
  };

  // put everything where this screen's layout wants it
  A.setLayout = function (lay) {
    L = lay;
    A.L = lay;
    plots.forEach((p, i) => p.g.position.set(lay.plots[i].x, 0, lay.plots[i].z));
    for (const id of F.ANIMAL_IDS) {
      const a = animals[id], at = lay.animals[id], tr0 = lay.troughs[id];
      a.g.position.set(at.x, 0, at.z);
      // they face the field: in landscape it's to their right (+x), in portrait in front (+z)
      a.g.rotation.y = lay.portrait ? 0 : Math.PI / 2 - 0.6;
      a.who.rotation.y = Math.PI;
      a.trough.position.set(tr0.x + (lay.portrait ? 0 : -0.55), 0, tr0.z + (lay.portrait ? -0.55 : 0));
      a.trough.rotation.y = lay.portrait ? 0 : Math.PI / 2;
      a.sign.position.set(tr0.x + (lay.portrait ? 1.2 : -0.6), 0, tr0.z + (lay.portrait ? -0.2 : 1.25));
      a.bubble.position.set(at.x, 2.4, at.z);
    }
    A.market.position.set(lay.market.x, 0, lay.market.z);
    // the market faces the field, turned a little toward the camera so its sign reads
    A.market.rotation.y = lay.portrait ? Math.PI - 0.45 : -Math.PI / 2 + 0.75;
    const back = new T.Vector3(0, 0, -0.2).applyAxisAngle(new T.Vector3(0, 1, 0), A.market.rotation.y);
    A.foxy.position.set(lay.market.x + back.x, 0, lay.market.z + back.z);
    A.foxy.rotation.y = A.market.rotation.y + Math.PI;
    for (const r of ['row1', 'row0']) {
      const s = lay.signs[r];
      A.rowSigns[r].position.set(s.x, 0, s.z);
      A.rowSigns[r].rotation.y = lay.portrait ? 0.35 : 0.5;
    }
    A.barn.position.set(lay.barn.x, 0, lay.barn.z);
    A.barn.rotation.y = lay.portrait ? 0.35 : 0.3;
    A.froggyFarm.position.set(lay.froggy.x, 0, lay.froggy.z);
    A.froggyFarm.rotation.y = lay.portrait ? -0.3 : -0.25;
    // trees that would stand in the way go
    for (const t of trees) {
      const p = t.g.position;
      const inside = p.x > lay.view.x0 - 1 && p.x < lay.view.x1 + 1 && p.z > lay.view.z0 + 2 && p.z < lay.view.z1 + 1;
      t.g.visible = !inside;
    }
    A.fit();
  };

  /* ---------------- seasons ---------------- */
  let seasonNow = -1;
  A.setSeason = function (i) {
    if (i === seasonNow) return;
    seasonNow = i;
    const P = PAL[i];
    scene.background.set(P.sky);
    scene.fog.color.set(P.fog);
    M.grass.color.set(P.grass);
    for (const t of trees) {
      t.crown.visible = !!P.leaf;
      t.bare.visible = !P.leaf;
      if (P.leaf) { t.mats[0].color.set(P.leaf); t.mats[1].color.set(P.leaf2); }
    }
    scene.traverse((o) => { if (o.userData && o.userData.snow) o.visible = i === 3; });
    A.floats.visible = !!P.floats;
    A.floats.material.color.set(P.float);
    A.floats.material.size = P.floats === 'snow' ? 0.28 : 0.36;
    A.sun.intensity = i === 1 ? 1.2 : i === 3 ? 0.85 : 1.0;
    A.hemi.intensity = i === 3 ? 0.9 : 0.75;
  };
  A.showRain = function () { A.rainT = 3.2; };

  /* ---------------- per frame: make the 3D farm match the rules ---------------- */
  const soilDry = new T.Color('#ffffff'), soilWet = new T.Color('#6b5a52');
  A.sync = function (S, t, dt) {
    A.costs = { row1: F.cost(S, 'row1'), row0: F.cost(S, 'row0'), cow: F.cost(S, 'cow'), sheep: F.cost(S, 'sheep') };
    for (let i = 0; i < F.PLOTS; i++) {
      const v = plots[i], p = S.plots[i];
      const open = F.plotOpen(S, i);
      if (v.open !== open) {
        if (v.open === false && open) v.popT = 0;
        v.open = open;
        v.g.visible = open;
      }
      if (v.popT < 1) { v.popT = Math.min(1, v.popT + dt * 2.5); v.g.scale.set(1, Math.max(0.05, 1 - Math.pow(1 - v.popT, 3) * (1 + Math.sin(v.popT * 9) * 0.1)), 1); } else v.g.scale.set(1, 1, 1);
      if (!open) continue;
      const wet = Math.round(p.water * 20) / 20;
      if (wet !== v.wet) { v.wet = wet; v.mat.color.copy(soilDry).lerp(soilWet, Math.min(1, wet * 1.6)); }
      const st = p.crop ? stageOf(p.g) : -1;
      const key = p.crop ? p.crop + st : '';
      if (key !== v.key) {
        while (v.crop.children.length) v.crop.remove(v.crop.children[0]);
        if (p.crop) v.crop.add(fromBaked(cropParts(p.crop, st)));
        if (v.key && p.crop && st > 0) v.bounce = 0; // a little hop when it grows a stage
        v.key = key;
        v.tag.visible = v.stick.visible = !!p.crop && st < 3;
        if (p.crop) v.tag.material.map = G.emojiTexture(F.CROPS[p.crop].emoji);
      }
      // grow smoothly inside a stage, and hop when a new stage comes
      if (p.crop) {
        const local = st === 3 ? 1 : (p.g * 3) % 1;
        let s = st === 0 ? 1 : 0.82 + 0.18 * local;
        if (v.bounce !== undefined && v.bounce < 1) { v.bounce = Math.min(1, v.bounce + dt * 3); s *= 1 + Math.sin(v.bounce * Math.PI) * 0.25; }
        if (st === 3) s *= 1 + Math.sin(t * 4 + i) * 0.03;
        v.crop.scale.set(s, s, s);
      }
      const dry = p.crop && p.g < 1 && p.water <= 0;
      const ripe = p.crop && p.g >= 1;
      const be = dry ? '💧' : ripe ? '✨' : '';
      v.bubble.visible = !!be;
      if (be && v.bubbleE !== be) { v.bubble.material.map = G.emojiTexture(be); v.bubble.material.needsUpdate = true; v.bubbleE = be; }
      if (be) v.bubble.position.y = (ripe ? 1.9 : 1.6) + Math.sin(t * 3 + i) * 0.12;
    }
    // the dirt bed under the open rows only, so the field grows when you buy more
    let r0 = 0;
    while (r0 < F.ROWS && !F.rowOpen(S, r0)) r0++;
    const zs = L.plots.slice(r0 * F.COLS).map((p) => p.z);
    const bz0 = Math.min(...zs) - L.pitch / 2 - 0.3, bz1 = Math.max(...zs) + L.pitch / 2 + 0.3;
    A.bed.scale.z = bz1 - bz0;
    A.bed.position.z = (bz0 + bz1) / 2;
    // locked rows' signs
    for (const r of ['row1', 'row0']) {
      const s = A.rowSigns[r];
      const show = !S.owned[r] && (r === 'row1' || S.owned.row1);
      s.visible = show;
      const c = A.costs[r];
      if (show && s.userData.cost !== c) { s.userData.cost = c; s.userData.tex.redraw(); }
    }
    // the animals
    for (const id of F.ANIMAL_IDS) {
      const a = animals[id], st = S.animals[id];
      const owned = F.hasAnimal(S, id);
      if (a.owned !== owned) { if (a.owned === false && owned) a.popT = 0; a.owned = owned; }
      a.who.visible = owned;
      a.sign.visible = !owned;
      const c = A.costs[id];
      if (!owned && a.sign.userData.cost !== c) { a.sign.userData.cost = c; a.sign.userData.tex.redraw(); }
      if (a.popT < 1) { a.popT = Math.min(1, a.popT + dt * 2); a.who.scale.setScalar(0.2 + 0.8 * (1 - Math.pow(1 - a.popT, 3))); }
      const eating = owned && st.state === 'eating';
      a.trough.userData.food.visible = eating;
      a.bodies.forEach((b, k) => {
        const u = b.userData;
        const ph = t * (eating ? 7 : 2) + k * 1.7;
        u.head.rotation.x = eating ? 0.55 + Math.sin(ph) * 0.25 : Math.sin(ph * 0.5) * 0.12;
        u.body.position.y = Math.abs(Math.sin(ph * (id === 'chicken' ? 1.5 : 0.6))) * (id === 'chicken' ? 0.05 : 0.02);
        if (u.tail) u.tail.rotation.z = Math.sin(t * 3) * 0.3;
        if (id === 'chicken' && !eating) b.rotation.y += Math.sin(t * 0.7 + k * 2) * dt * 0.8;
      });
      let be = '';
      if (owned) be = st.state === 'hungry' ? F.ANIMALS[id].food : st.state === 'ready' ? F.GOODS[F.ANIMALS[id].product].emoji : '';
      a.bubble.visible = !!be;
      if (be && a.bubbleE !== be) { a.bubble.material.map = G.emojiTexture(be); a.bubble.material.needsUpdate = true; a.bubbleE = be; }
      if (be) a.bubble.position.y = (id === 'chicken' ? 1.6 : 2.5) + Math.sin(t * 3 + id.length) * 0.12;
      if (be) a.bubble.scale.setScalar(st.state === 'ready' ? 1.1 + Math.sin(t * 6) * 0.08 : 0.85);
    }
    // the wish board
    const w = `⭐ ${F.GOODS[S.wish].emoji} x2`;
    if (A.wishText !== w) { A.wishText = w; A.wishTex.redraw(); }
    // Froggy's crops follow his sales: a field that ripens every 15 s
    const ft = (S.season * F.lv(S).season + S.t) / F.FROGGY_EVERY;
    A.froggyPlots.forEach((fp, i) => {
      const crop = F.CROP_IDS[(i + Math.floor(ft)) % 3];
      const g = (ft + i * 0.17) % 1;
      const key = crop + stageOf(g);
      if (fp.key !== key) {
        while (fp.c.children.length) fp.c.remove(fp.c.children[0]);
        fp.c.add(fromBaked(cropParts(crop, stageOf(g))));
        fp.key = key;
      }
    });
  };

  // where the focus ring and action icon go for player k (target null hides them)
  A.focus = function (k, target, emoji, t) {
    const r = A.rings[k];
    r.m.visible = r.icon.visible = !!target;
    if (!target) return;
    r.m.position.set(target.x, target.y || 0.26, target.z);
    const s = (target.r || 1.2) / 1.25;
    r.m.scale.setScalar(s * (1 + Math.sin(t * 6) * 0.04));
    if (r.e !== emoji) { r.icon.material.map = G.emojiTexture(emoji); r.icon.material.needsUpdate = true; r.e = emoji; }
    r.icon.position.set(target.x + (k ? 0.5 : -0.5), (target.top || 2.2) + Math.sin(t * 4) * 0.1, target.z);
  };

  /* ---------------- per frame: particles, weather ---------------- */
  A.update = function (dt, t) {
    for (let i = pops.length - 1; i >= 0; i--) {
      const p = pops[i];
      p.t += dt;
      p.vy -= p.g * dt;
      p.s.position.x += p.vx * dt;
      p.s.position.y += p.vy * dt;
      p.s.position.z += p.vz * dt;
      const k = p.t / p.life;
      p.s.material.opacity = k > 0.7 ? Math.max(0, (1 - k) / 0.3) : 1;
      p.s.scale.setScalar(p.size * (Math.min(1, p.t / 0.12) + p.grow * k));
      if (p.t >= p.life) { scene.remove(p.s); p.s.material.dispose(); pops.splice(i, 1); }
    }
    for (let i = drops.length - 1; i >= 0; i--) {
      const d = drops[i];
      d.t += dt;
      d.s.position.y += d.vy * dt;
      if (d.t >= d.life || d.s.position.y < 0.25) { scene.remove(d.s); d.s.material.dispose(); drops.splice(i, 1); }
    }
    for (let i = flights.length - 1; i >= 0; i--) {
      const f = flights[i];
      f.t += dt / f.dur;
      const k = Math.min(1, f.t);
      f.s.position.lerpVectors(f.from, f.to, k);
      f.s.position.y += Math.sin(k * Math.PI) * f.arc;
      f.s.material.rotation += f.spin * dt;
      if (k >= 1) { scene.remove(f.s); f.s.material.dispose(); flights.splice(i, 1); }
    }
    if (A.floats.visible) {
      const pos = A.floats.geometry.attributes.position;
      const kind = PAL[seasonNow].floats;
      const fall = kind === 'snow' ? 1.3 : 0.8;
      for (let i = 0; i < pos.count; i++) {
        let y = pos.getY(i) - fall * dt * (0.6 + (i % 5) * 0.12);
        let x = pos.getX(i) + Math.sin(t * 0.9 + i) * dt * (kind === 'snow' ? 0.4 : 1.1);
        if (y < 0) y += 16;
        pos.setXY(i, x, y);
      }
      pos.needsUpdate = true;
    }
    if (A.rainT > 0) {
      A.rainT -= dt;
      const pos = A.rain.geometry.attributes.position;
      for (let i = 0; i < pos.count; i += 2) {
        let y = pos.getY(i) - 26 * dt;
        if (y < 0) y += 18;
        pos.setY(i, y);
        pos.setY(i + 1, y - 0.7);
      }
      pos.needsUpdate = true;
      A.rain.material.opacity = Math.min(0.75, A.rainT * 0.8, (3.2 - A.rainT) * 2);
      A.rain.visible = true;
    } else A.rain.visible = false;
  };

  /* ---------------- the camera: the whole farm, clear of the buttons ---------------- */
  let W = 800, H = 600, margins = { l: 60, r: 12, t: 70, b: 110 };
  A.resize = function (w, h, m) {
    W = w; H = h;
    if (m) margins = m;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    A.fit();
  };
  const PITCH = 0.92; // how far the camera looks down (radians from level)
  A.fit = function () {
    if (!L || !camera) return;
    const v = L.view;
    const pts = [];
    for (const x of [v.x0, v.x1]) for (const z of [v.z0, v.z1]) { pts.push(new T.Vector3(x, 0, z)); pts.push(new T.Vector3(x, z < 0 ? 3.2 : 1.4, z)); }
    const safe = {
      x0: (margins.l / W) * 2 - 1, x1: 1 - (margins.r / W) * 2,
      y0: (margins.b / H) * 2 - 1, y1: 1 - (margins.t / H) * 2,
    };
    let tx = (v.x0 + v.x1) / 2, tz = (v.z0 + v.z1) / 2;
    let d = 40;
    const place = () => {
      camera.position.set(tx, Math.sin(PITCH) * d, tz + Math.cos(PITCH) * d);
      camera.lookAt(tx, 0, tz);
      camera.updateMatrixWorld(true);
    };
    const bbox = () => {
      let x0 = 9, x1 = -9, y0 = 9, y1 = -9;
      for (const p of pts) {
        const q = p.clone().project(camera);
        x0 = Math.min(x0, q.x); x1 = Math.max(x1, q.x); y0 = Math.min(y0, q.y); y1 = Math.max(y1, q.y);
      }
      return { x0, x1, y0, y1 };
    };
    for (let it = 0; it < 4; it++) {
      let lo = 5, hi = 200;
      for (let k = 0; k < 30; k++) {
        d = (lo + hi) / 2;
        place();
        const b = bbox();
        const fits = b.x1 - b.x0 <= safe.x1 - safe.x0 && b.y1 - b.y0 <= safe.y1 - safe.y0;
        if (fits) hi = d; else lo = d;
      }
      d = hi;
      place();
      const b = bbox();
      // slide the target so the box sits in the middle of the safe area
      const ex = (safe.x0 + safe.x1) / 2 - (b.x0 + b.x1) / 2, ey = (safe.y0 + safe.y1) / 2 - (b.y0 + b.y1) / 2;
      const wPerNdcX = ((v.x1 - v.x0) / Math.max(0.01, b.x1 - b.x0));
      const zPerNdcY = ((v.z1 - v.z0) / Math.max(0.01, b.y1 - b.y0));
      tx -= ex * wPerNdcX;
      tz += ey * zPerNdcY;
    }
    place();
    A.camD = d;
  };
  // the ground point under a screen point
  const ray = new T.Raycaster(), plane = new T.Plane(new T.Vector3(0, 1, 0), 0);
  A.pick = function (px, py) {
    const ndc = new T.Vector2((px / W) * 2 - 1, -(py / H) * 2 + 1);
    ray.setFromCamera(ndc, camera);
    const out = new T.Vector3();
    return ray.ray.intersectPlane(plane, out) ? { x: out.x, z: out.z } : null;
  };
  A.toScreen = function (x, y, z) {
    const q = new T.Vector3(x, y, z).project(camera);
    return { x: (q.x + 1) / 2 * W, y: (1 - q.y) / 2 * H };
  };
  A.render = function () { renderer.render(scene, camera); };
})();
