/* TT Farm: the game. The title, walking about the farm, doing the one right thing at a plot, an animal or the market,
   your brother's visit (he waters the whole field), the seasons, Froggy next door, the Harvest Fair at the end of the year,
   the HUD, keys and taps, and saving the farm. The rules are in js/rules.js and the 3D in js/art.js. */
(function () {
  'use strict';
  const F = window.FARM, A = F.art, SND = Kit.sound;
  const $ = (id) => document.getElementById(id);
  const T = THREE;
  const touch = matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window || /[?&]touch=1/.test(location.search);
  if (touch) document.body.classList.add('touch');
  const NAME = { teddy: 'TEDDY', tommy: 'TOMMY' };
  const TREATS = [['🍦', 'ICE CREAM'], ['💧', 'WATER'], ['🧃', 'JUICE'], ['🍪', 'COOKIE'], ['🍉', 'WATERMELON'], ['🍌', 'BANANA']];
  const SCALE = { teddy: 0.84, tommy: 0.72 };
  const SPEED = 5; // walking, metres per second

  /* ---------------- saved: the farm, and the prefs (level, best year per level) ---------------- */
  const FARM_KEY = 'farmTT.farm', PREF_KEY = 'farmTT.prefs';
  const prefs = (() => {
    let p = null;
    try { p = JSON.parse(localStorage.getItem(PREF_KEY)); } catch (e) { p = null; }
    const o = Object.assign({ level: 'easy', best: {} }, p && typeof p === 'object' ? p : {});
    if (!o.best || typeof o.best !== 'object') o.best = {};
    return o;
  })();
  const storePrefs = () => { try { localStorage.setItem(PREF_KEY, JSON.stringify(prefs)); } catch (e) { /* private window: not kept */ } };
  const loadFarm = () => { try { return F.load(localStorage.getItem(FARM_KEY)); } catch (e) { return null; } };
  function saveFarm() {
    if (!G.S) return;
    try { localStorage.setItem(FARM_KEY, F.save(G.S)); } catch (e) { /* private window: the farm just isn't kept */ }
  }

  /* ---------------- state ---------------- */
  const G = {
    screen: 'loading', mode: 'teddy', level: prefs.level === 'normal' ? 'normal' : 'easy',
    S: loadFarm(), demo: null, players: [], t: 0, paused: false, autoPause: true, faces: {},
    L: null, portrait: null, celebrate: null, saveT: 0, sureT: 0, lastFrog: 0, ripeSnd: 0, nudgeT: 0,
  };
  const keys = new Set();
  const playersIds = () => (G.mode === 'both' ? ['teddy', 'tommy'] : [G.mode]);
  const buddyId = () => Kit.roster.buddyFor(G.mode);
  const farm = () => G.S || G.demo;

  /* ---------------- toasts, banners, confetti (on the game clock) ---------------- */
  const toasts = [];
  function toast(text, cls = '', life = 2.4) {
    const el = document.createElement('div');
    el.className = 'toast ' + cls;
    el.textContent = text;
    $('toasts').appendChild(el);
    toasts.unshift({ el, t: 0, life });
    if (toasts.length > 4) toasts.pop().el.remove();
  }
  function updateToasts(dt) {
    const sc = $('score').getBoundingClientRect();
    let y = Math.max(sc.bottom + 8, 64);
    for (let i = 0; i < toasts.length; i++) {
      const o = toasts[i];
      o.t += dt;
      const k = Math.min(1, o.t / 0.18);
      o.el.style.top = `${y}px`;
      o.el.style.transform = `scale(${0.6 + 0.4 * k})`;
      o.el.style.opacity = o.t > o.life - 0.4 ? Math.max(0, (o.life - o.t) / 0.4) : 1;
      y += o.el.offsetHeight + 6;
      if (o.t > o.life) { o.el.remove(); toasts.splice(i, 1); i--; }
    }
  }
  const banner = { t: 0, life: 0 };
  function showBanner(text, sub = '', life = 2) {
    const el = $('banner');
    el.innerHTML = '';
    el.append(text);
    if (sub) { const s = document.createElement('small'); s.textContent = sub; el.appendChild(s); }
    banner.t = 0;
    banner.life = life;
  }
  function updateBanner(dt) {
    const el = $('banner');
    if (banner.life <= 0) { el.classList.add('hidden'); return; }
    banner.t += dt;
    el.classList.remove('hidden');
    const k = Math.min(1, banner.t / 0.25);
    el.style.transform = `scale(${0.4 + 0.6 * (1 - Math.pow(1 - k, 3))})`;
    el.style.opacity = banner.t > banner.life - 0.3 ? Math.max(0, (banner.life - banner.t) / 0.3) : 1;
    if (banner.t > banner.life) banner.life = 0;
  }
  function confetti(n = 90) {
    const colors = ['#e5533d', '#ffd400', '#18d4ff', '#7fdcbd', '#ff3d7f', '#5ec24a', '#ffffff'];
    for (let i = 0; i < n; i++) {
      const d = document.createElement('div');
      d.className = 'confetti';
      d.style.left = `${Math.random() * 100}vw`;
      d.style.background = colors[i % colors.length];
      d.style.animationDuration = `${2 + Math.random() * 1.8}s`;
      d.style.animationDelay = `${Math.random() * 0.6}s`;
      d.style.borderRadius = i % 3 ? '2px' : '50%';
      document.body.appendChild(d);
      setTimeout(() => d.remove(), 4600);
    }
  }
  const bump = (id) => { const el = $(id); el.classList.remove('bump'); void el.offsetWidth; el.classList.add('bump'); };

  /* ---------------- little sounds of our own ---------------- */
  const sfx = {
    plant() { SND.tone({ f: 330, to: 220, type: 'triangle', dur: 0.12, vol: 0.18 }); },
    water() { SND.hiss({ f: 2600, to: 900, dur: 0.5, vol: 0.12 }); },
    pick() { SND.tone({ f: 520, to: 780, type: 'square', dur: 0.09, vol: 0.1 }); SND.tone({ f: 780, to: 1040, type: 'square', dur: 0.09, vol: 0.1, at: 0.08 }); },
    ding() { SND.tone({ f: 1320, type: 'sine', dur: 0.25, vol: 0.08 }); },
    cluck() { SND.tone({ f: 900, to: 600, type: 'square', dur: 0.06, vol: 0.06 }); SND.tone({ f: 950, to: 620, type: 'square', dur: 0.06, vol: 0.06, at: 0.09 }); },
    moo() { SND.tone({ f: 140, to: 110, type: 'sawtooth', dur: 0.6, vol: 0.12, lp: 600 }); },
    baa() { SND.tone({ f: 420, to: 380, type: 'sawtooth', dur: 0.45, vol: 0.08, lp: 1400 }); },
    sell(n) { for (let i = 0; i < Math.min(6, n); i++) SND.tone({ f: 988 + i * 120, type: 'square', dur: 0.07, vol: 0.08, at: i * 0.07 }); },
    season() { [523, 659, 784, 1047].forEach((f, i) => SND.tone({ f, type: 'triangle', dur: 0.18, vol: 0.12, at: i * 0.11 })); },
    no() { SND.tone({ f: 220, to: 180, type: 'square', dur: 0.15, vol: 0.08 }); },
    fair() { [523, 659, 784, 659, 784, 1047].forEach((f, i) => SND.tone({ f, type: 'square', dur: 0.16, vol: 0.1, at: i * 0.14 })); },
  };
  const animalSound = (id) => (id === 'chicken' ? sfx.cluck() : id === 'cow' ? sfx.moo() : sfx.baa());

  /* ---------------- screens ---------------- */
  const SCREENS = ['title', 'pause', 'result'];
  function show(name) {
    G.screen = name;
    for (const s of SCREENS) $(s).classList.toggle('hidden', s !== name);
    $('hud').classList.toggle('off', !(name === 'play' || name === 'pause'));
    if (name === 'title') SND.music('title');
  }
  function setLevel(l) {
    G.level = l;
    prefs.level = l;
    storePrefs();
    if (G.S) G.S.level = l;
    document.querySelectorAll('[data-level]').forEach((b) => b.setAttribute('aria-checked', String(b.dataset.level === l)));
    seedPrices();
    farmRow();
  }
  function farmRow() {
    const S = G.S;
    $('farmRow').classList.toggle('hidden', !S);
    if (!S) return;
    const se = F.SEASONS[S.over ? 3 : S.season];
    $('farmInfo').textContent = `${F.TITLE.toUpperCase()}: YEAR ${S.year} · ${se.emoji} ${se.name} · 🪙 ${S.coins}`;
    $('newFarmBtn').textContent = 'NEW FARM';
    $('newFarmBtn').classList.remove('sure');
    G.sureT = 0;
  }
  function newFarmTap() {
    SND.click();
    if (!G.S) return;
    if (G.sureT > 0) {
      G.S = null;
      try { localStorage.removeItem(FARM_KEY); } catch (e) { /* nothing kept */ }
      makeDemo();
      farmRow();
      toast('A NEW FARM! 🌱', 'good');
      return;
    }
    G.sureT = 3;
    $('newFarmBtn').textContent = 'SURE? TAP AGAIN';
    $('newFarmBtn').classList.add('sure');
  }
  // the farm behind the title when there's no saved one: a few crops for looks
  function makeDemo() {
    const D = F.newFarm('easy');
    [[8, 'bokchoy', 1], [9, 'rice', 0.7], [10, 'melon', 1], [11, 'rice', 0.4], [12, 'melon', 0.5], [13, 'bokchoy', 0.2], [15, 'rice', 1]].forEach(([i, c, g]) => {
      D.plots[i].crop = c;
      D.plots[i].g = g;
      D.plots[i].water = 0.6;
    });
    D.animals.chicken.state = 'ready';
    G.demo = D;
  }
  function goTitle() {
    clearPlayers();
    endBuddy();
    G.celebrate = null;
    G.paused = false;
    if (G.S && G.S.over) { F.newYear(G.S); saveFarm(); }
    if (!G.S) makeDemo();
    A.froggyVisit = null;
    A.fit(null);
    A.setSeason(farm().season);
    $('logoMain').textContent = F.TITLE.toUpperCase();
    farmRow();
    show('title');
  }

  /* ---------------- players ---------------- */
  function clearPlayers() {
    for (const p of G.players) { A.scene.remove(p.holder); p.can.visible = false; A.scene.remove(p.can); }
    G.players = [];
    A.rings.forEach((r) => { r.m.visible = r.icon.visible = false; });
    A.discs.forEach((d) => (d.visible = false));
  }
  function spawnPlayers() {
    clearPlayers();
    const star = F.STAR[G.S.season];
    G.players = playersIds().map((id, k) => {
      const holder = A.person(id, SCALE[id]);
      A.scene.add(holder);
      const st = G.L.start[G.mode === 'both' ? id : 'teddy'];
      return { id, k, holder, x: st.x, z: st.z, face: Math.PI, moving: false, goal: null, act: null, seed: star, can: A.makeCan(), focus: null, phase: 0 };
    });
  }
  function start(mode) {
    SND.init();
    G.mode = mode;
    if (!G.S) G.S = F.newFarm(G.level);
    G.S.level = G.level;
    if (G.S.over) F.newYear(G.S);
    G.demo = null;
    endBuddy();
    G.celebrate = null;
    G.paused = false;
    spawnPlayers();
    setBud();
    A.setSeason(G.S.season);
    G.lastFrog = G.S.froggy;
    A.fit(null);
    show('play');
    seedPrices();
    const se = F.season(G.S);
    showBanner(`${se.emoji} ${se.name}`, `YEAR ${G.S.year}`, 1.8);
    $('hintLine').textContent = touch ? 'Tap a plot to plant! 🌱' : (G.mode === 'both' ? 'Walk to a plot. Teddy: Space · Tommy: Enter' : 'Walk to a plot and press Space! 🌱');
    G.hintT = 6;
    SND.music('play');
    saveFarm();
    resize();
  }

  /* ---------------- what's around: plots, animals, the market, the signs ---------------- */
  function targets() {
    const L = G.L, S = G.S, out = [];
    for (let i = 0; i < F.PLOTS; i++) {
      const p = L.plots[i];
      if (F.plotOpen(S, i)) out.push({ kind: 'plot', i, x: p.x, z: p.z, plot: true, r: 1.3 });
      else {
        const row = 'row' + Math.floor(i / F.COLS);
        if (row === 'row1' || S.owned.row1) out.push({ kind: 'buy', id: row, x: p.x, z: p.z, plot: true, r: 1.3, hidden: true });
      }
    }
    for (const r of ['row1', 'row0']) if (!S.owned[r] && (r === 'row1' || S.owned.row1)) out.push({ kind: 'buy', id: r, x: L.signs[r].x, z: L.signs[r].z, r: 0.9, top: 2.9 });
    for (const a of F.ANIMAL_IDS) {
      out.push({ kind: 'animal', id: a, x: L.troughs[a].x, z: L.troughs[a].z, r: 0.95, top: 2.6, hits: [L.animals[a]] });
    }
    out.push({ kind: 'market', x: L.counter.x, z: L.counter.z, r: 1.1, top: 2.8, hits: [L.market] });
    return out;
  }
  const reachOf = (t, x, z) => (t.plot ? Math.max(Math.abs(t.x - x), Math.abs(t.z - z)) <= 1.45 : Math.hypot(t.x - x, t.z - z) <= 1.7);
  function focusFor(p) {
    let best = null, bd = 1e9;
    for (const t of targets()) {
      if (!reachOf(t, p.x, p.z)) continue;
      const d = Math.hypot(t.x - p.x, t.z - p.z) + (t.hidden ? 0.5 : 0);
      if (d < bd) { bd = d; best = t; }
    }
    return best;
  }
  // what Space would do there, and the icon that says so
  function whatAt(t, p) {
    const S = G.S;
    if (t.kind === 'plot') {
      const a = F.plotAction(S, t.i);
      if (a === 'plant') return { act: 'plant', e: F.CROPS[p.seed].emoji };
      if (a === 'harvest') return { act: 'harvest', e: '🧺' };
      return { act: 'water', e: '💧' };
    }
    if (t.kind === 'buy') return { act: 'buy', e: '🛒' };
    if (t.kind === 'animal') {
      const a = F.animalAction(S, t.id);
      if (a === 'buy') return { act: 'buy', e: '🛒' };
      if (a === 'feed') return { act: 'feed', e: F.ANIMALS[t.id].food };
      if (a === 'collect') return { act: 'collect', e: F.GOODS[F.ANIMALS[t.id].product].emoji };
      return { act: 'wait', e: '⏳' };
    }
    return { act: 'sell', e: F.basketCount(S) ? '🪙' : '🧺' };
  }

  /* ---------------- doing things ---------------- */
  const pos = (t, y = 1.2) => new T.Vector3(t.x, y, t.z);
  function doAction(p, t) {
    const S = G.S;
    if (!t || p.act) return false;
    const w = whatAt(t, p);
    p.face = Math.atan2(-(t.x - p.x), -(t.z - p.z));
    if (Math.hypot(t.x - p.x, t.z - p.z) < 0.3) p.face = Math.PI;
    let ok = false, pose = 'grab', dur = 0.45;
    if (w.act === 'plant') {
      const r = F.plant(S, t.i, p.seed);
      if (r.ok) {
        ok = true;
        sfx.plant();
        A.pop(F.CROPS[p.seed].emoji, t.x, 0.9, t.z, { size: 0.8, life: 0.8 });
        if (r.paid) A.pop('🪙', t.x + 0.6, 1.2, t.z, { size: 0.55, life: 0.9, vy: 1.6 });
        if (r.gift) toast('FOXY: FREE SEEDS FOR YOU! 🎁', 'cpu', 2.6);
      } else if (r.why === 'coins') {
        sfx.no();
        toast(`${F.CROPS[p.seed].emoji} SEEDS COST ${r.need} 🪙`, 'oops');
        toast('SELL AT THE MARKET FOR COINS!', 'cpu');
      }
    } else if (w.act === 'water') {
      F.water(S, t.i);
      ok = true;
      sfx.water();
      A.splash(t.x, t.z, 10);
      pose = 'give';
      dur = 0.7;
      p.watering = 0.7;
    } else if (w.act === 'harvest') {
      const r = F.harvest(S, t.i, p.id);
      if (r.ok) {
        ok = true;
        sfx.pick();
        A.pop(F.GOODS[r.good].emoji, t.x, 1.0, t.z, { size: 1.1, life: 1.0, vy: 2.2 });
        bump('basket');
      }
    } else if (w.act === 'feed') {
      const r = F.feed(S, t.id);
      if (r.ok) {
        ok = true;
        pose = 'give';
        animalSound(t.id);
        A.pop(F.ANIMALS[t.id].food, t.x, 1.0, t.z, { size: 0.8, life: 0.8 });
        if (r.paid) A.pop('🪙', t.x + 0.5, 1.3, t.z, { size: 0.55, life: 0.9 });
      } else if (r.why === 'coins') {
        sfx.no();
        toast(`${F.ANIMALS[t.id].emoji} FOOD COSTS ${r.need} 🪙`, 'oops');
      }
    } else if (w.act === 'collect') {
      const r = F.collect(S, t.id, p.id);
      if (r.ok) {
        ok = true;
        sfx.pick();
        animalSound(t.id);
        A.pop(F.GOODS[r.good].emoji, t.x, 1.2, t.z, { size: 1.1, life: 1.0, vy: 2.2 });
        bump('basket');
      }
    } else if (w.act === 'wait') {
      if (G.nudgeT <= 0) { toast(`${F.ANIMALS[t.id].emoji} YUM! COME BACK SOON!`, 'cpu', 1.8); G.nudgeT = 1.5; }
      return false;
    } else if (w.act === 'sell') {
      const r = F.sell(S);
      pose = 'give';
      if (r.ok) {
        ok = true;
        sfx.sell(r.items.reduce((n, it) => n + it.n, 0));
        toast(`+${r.total} 🪙`, 'good', 2.2);
        if (r.items.some((it) => it.wish)) toast('FOXY: MY FAVOURITE! ⭐ x2', 'cpu', 2.4);
        else toast('FOXY: THANK YOU!', 'cpu', 1.8);
        bump('coins');
        G.foxyWave = 1.4;
        for (let i = 0; i < Math.min(8, r.total / 5); i++) A.pop('🪙', t.x + (Math.random() - 0.5) * 1.4, 1.6 + Math.random(), t.z + (Math.random() - 0.5) * 1.4, { size: 0.6, life: 0.9, vy: 2.5 });
      } else if (G.nudgeT <= 0) {
        toast('YOUR BASKET IS EMPTY 🧺', 'oops', 1.8);
        toast('PICK SOME VEGGIES FIRST!', 'cpu', 1.8);
        G.nudgeT = 1.5;
      }
    } else if (w.act === 'buy') {
      const r = F.buy(S, t.id);
      const u = F.UPGRADES[t.id];
      pose = 'give';
      if (r.ok) {
        ok = true;
        SND.powerup();
        toast(t.id === 'cow' ? 'A NEW COW! 🐄' : t.id === 'sheep' ? 'A NEW SHEEP! 🐑' : 'MORE FIELD! 🌱', 'good', 2.4);
        confetti(36);
        bump('coins');
      } else if (r.why === 'coins' && G.nudgeT <= 0) {
        sfx.no();
        toast(`${u.emoji} ${u.name}: ${r.need} 🪙`, 'oops', 2);
        toast('SELL AT THE MARKET FOR COINS!', 'cpu', 2);
        G.nudgeT = 1.5;
      }
    }
    if (ok) {
      p.act = { pose, t: 0, dur };
      if (G.hintT > 0) { G.hintT = 0; $('hintLine').textContent = ''; }
      saveFarm();
    }
    return ok;
  }

  /* ---------------- moving ---------------- */
  function inputDir(p) {
    let x = 0, z = 0;
    const wasd = G.mode !== 'both' || p.k === 0, arrows = G.mode !== 'both' || p.k === 1;
    if (wasd) { if (keys.has('KeyA')) x--; if (keys.has('KeyD')) x++; if (keys.has('KeyW')) z--; if (keys.has('KeyS')) z++; }
    if (arrows) { if (keys.has('ArrowLeft')) x--; if (keys.has('ArrowRight')) x++; if (keys.has('ArrowUp')) z--; if (keys.has('ArrowDown')) z++; }
    const n = Math.hypot(x, z);
    return n ? { x: x / n, z: z / n } : null;
  }
  const clampTo = (o) => {
    const b = G.L.bounds;
    o.x = Math.min(b.x1, Math.max(b.x0, o.x));
    o.z = Math.min(b.z1, Math.max(b.z0, o.z));
    return o;
  };
  function updatePlayers(dt) {
    for (const p of G.players) {
      p.phase += dt;
      if (p.act) {
        p.act.t += dt;
        if (p.act.t >= p.act.dur) p.act = null;
      }
      let dir = null;
      if (!p.act) {
        dir = inputDir(p);
        if (dir) p.goal = null;
        else if (p.goal) {
          const dx = p.goal.x - p.x, dz = p.goal.z - p.z, d = Math.hypot(dx, dz);
          if (d < 0.12) {
            const tg = p.goal.target;
            p.goal = null;
            if (tg) {
              const fresh = targets().find((t) => t.kind === tg.kind && t.i === tg.i && t.id === tg.id);
              if (fresh) doAction(p, fresh);
            }
          } else dir = { x: dx / d, z: dz / d, max: d };
        }
      }
      if (dir) {
        const s = Math.min(SPEED * dt, dir.max === undefined ? 1e9 : dir.max);
        p.x += dir.x * s;
        p.z += dir.z * s;
        clampTo(p);
        p.face = Math.atan2(-dir.x, -dir.z);
      }
      p.moving = !!dir;
      p.focus = p.act ? p.focus : focusFor(p);
    }
  }
  function drawPlayers(dt) {
    const k = 1 - Math.exp(-14 * dt);
    for (const p of G.players) {
      const h = p.holder;
      h.position.set(p.x, 0, p.z);
      let dr = p.face - h.rotation.y;
      while (dr > Math.PI) dr -= Math.PI * 2;
      while (dr < -Math.PI) dr += Math.PI * 2;
      h.rotation.y += dr * Math.min(1, dt * 14);
      let mode = p.moving ? 'run' : 'stand';
      if (p.act) mode = p.act.pose;
      if (p.five > 0) { p.five -= dt; mode = 'wave'; }
      A.pose(h, G.t * 9 + p.k, mode, k);
      if (p.watering > 0) { p.watering -= dt; A.holdCan(p.can, h, true); } else p.can.visible = false;
      const disc = A.discs[p.k];
      disc.visible = true;
      disc.position.x = p.x;
      disc.position.z = p.z;
      const t = p.focus;
      if (t && G.screen === 'play' && !G.celebrate) A.focus(p.k, t, whatAt(t, p).e, G.t);
      else A.focus(p.k, null);
    }
  }

  /* ---------------- your brother: hello, a treat, then he waters the whole field ---------------- */
  const V = { on: false, t: 0, holder: null, id: '', x: 0, z: 0, face: Math.PI, path: null, pi: 0, can: null, treat: null, gave: false, said: false, phase: '', end: 0 };
  function callBuddy() {
    if (G.screen !== 'play' || G.paused || G.celebrate || Kit.help.isOpen()) return;
    if (G.mode === 'both') return highFive();
    SND.click();
    const id = buddyId();
    const p = G.players[0];
    if (!V.on || V.id !== id) {
      endBuddy();
      V.holder = A.person(id, SCALE[id] * 0.95);
      A.scene.add(V.holder);
      V.id = id;
      const o = clampTo({ x: p.x + 1.4, z: p.z + 0.3 });
      V.x = o.x;
      V.z = o.z;
      V.on = true;
      V.t = 0;
      V.can = V.can || A.makeCan();
    } else V.t = Math.min(V.t, 0.4); // again: hello again, a treat, and another lap with the can
    V.phase = 'hello';
    V.gave = V.said = false;
    V.path = null;
    V.treat = TREATS[Math.floor(Math.random() * TREATS.length)];
    $('budBtn').classList.add('down');
    setTimeout(() => $('budBtn').classList.remove('down'), 150);
  }
  function highFive() {
    const [a, b] = G.players;
    if (!a || !b) return;
    a.face = Math.atan2(-(b.x - a.x), -(b.z - a.z));
    b.face = Math.atan2(-(a.x - b.x), -(a.z - b.z));
    a.five = b.five = 0.8;
    A.pop('✋', (a.x + b.x) / 2, 2.0, (a.z + b.z) / 2, { size: 1.3, life: 1.0, vy: 1 });
    toast('HIGH FIVE! ✋', 'good', 1.6);
    confetti(24);
    SND.coin(3);
  }
  function wateringPath() {
    const S = G.S, L = G.L, pts = [];
    for (let r = F.ROWS - 1, n = 0; r >= 0; r--) {
      if (!F.rowOpen(S, r)) continue;
      const cols = [0, 1, 2, 3];
      if (n++ % 2) cols.reverse();
      for (const c of cols) { const i = r * F.COLS + c; pts.push({ x: L.plots[i].x, z: L.plots[i].z, i }); }
    }
    // start from the end nearest him
    const d0 = Math.hypot(pts[0].x - V.x, pts[0].z - V.z), d1 = Math.hypot(pts[pts.length - 1].x - V.x, pts[pts.length - 1].z - V.z);
    return d1 < d0 ? pts.reverse() : pts;
  }
  function updateBuddy(dt) {
    if (!V.on) return;
    V.t += dt;
    const p = G.players[0], h = V.holder, entry = Kit.roster.get(V.id);
    const who = NAME[V.id];
    let mode = 'stand';
    let sc = 1;
    if (V.phase === 'hello') {
      if (V.t < 0.4) { mode = 'jump'; sc = 0.2 + 0.8 * (1 - Math.pow(1 - V.t / 0.4, 3)); V.face = Math.PI; }
      else if (V.t < 1.7) { mode = Kit.roster.signature(entry, 'hello'); V.face = Math.PI; }
      else if (V.t < 2.3) {
        mode = 'give';
        V.face = Math.atan2(-(p.x - V.x), -(p.z - V.z));
        if (!V.gave) {
          V.gave = true;
          A.fly(V.treat[0], new T.Vector3(V.x, 1.3, V.z), new T.Vector3(p.x, 1.2, p.z), { size: 0.9, dur: 0.55, arc: 1.4 });
          toast(`${V.treat[0]} ${V.treat[1]} FROM ${who}!`, 'good');
          SND.jump();
        }
      } else {
        V.phase = 'water';
        V.path = wateringPath();
        V.pi = 0;
        toast(`${who} SAYS: I'LL WATER THE WHOLE FIELD!`, 'buddy', 3);
        SND.powerup();
      }
    } else if (V.phase === 'water') {
      mode = 'run';
      const wp = V.path[V.pi];
      if (wp) {
        const dx = wp.x - V.x, dz = wp.z - V.z, d = Math.hypot(dx, dz), step = 8.5 * dt;
        if (d <= step) {
          V.x = wp.x;
          V.z = wp.z;
          if (F.plotOpen(G.S, wp.i) && !(G.brokenBuddy && wp.i % 2)) { // brokenBuddy: only for pageCheck({ broken: true })
            F.water(G.S, wp.i);
            A.splash(wp.x, wp.z, 8);
            if (V.pi % 2 === 0) sfx.water();
          }
          V.pi++;
        } else {
          V.x += (dx / d) * step;
          V.z += (dz / d) * step;
          V.face = Math.atan2(-dx, -dz);
        }
      } else {
        V.phase = 'bye';
        V.end = V.t;
        saveFarm();
        toast('THE WHOLE FIELD IS WET! 💧', 'good', 2);
      }
    } else if (V.phase === 'bye') {
      mode = 'wave';
      V.face = Math.PI;
      const k = V.t - V.end;
      if (k > 0.8) sc = Math.max(0.01, 1 - (k - 0.8) / 0.3);
      if (k > 1.1) { endBuddy(); return; }
    }
    h.position.set(V.x, 0, V.z);
    h.scale.setScalar(SCALE[V.id] * 0.95 * sc);
    h.rotation.y = V.face;
    A.pose(h, G.t * 10, mode, 1 - Math.exp(-14 * dt));
    if (V.phase === 'water') A.holdCan(V.can, h, true);
    else V.can.visible = false;
  }
  function endBuddy() {
    if (V.holder) A.scene.remove(V.holder);
    if (V.can) V.can.visible = false;
    V.holder = null;
    V.on = false;
    V.phase = '';
  }
  function setBud() {
    const imgs = $('budBtn').querySelectorAll('img');
    if (G.mode === 'both') {
      imgs[0].src = G.faces.teddy || '';
      imgs[1].src = G.faces.tommy || '';
      imgs[1].classList.remove('hidden');
      $('budBtn').querySelector('small').textContent = 'HIGH FIVE';
    } else {
      const id = buddyId();
      imgs[0].src = G.faces[id] || '';
      imgs[1].classList.add('hidden');
      $('budBtn').querySelector('small').textContent = `CALL ${NAME[id]}`;
    }
    resize();
  }

  /* ---------------- the farm's own events ---------------- */
  const TIPS = ['🥬 BOK CHOY GROWS FAST!', '🍉 WATERMELONS GROW FAST!', '🌾 RICE GROWS FAST!', '🥬 BOK CHOY LIKES THE COLD!'];
  function onEvents(ev) {
    for (const e of ev) {
      if (e.type === 'ripe') {
        const pl = G.L.plots[e.i];
        A.pop('✨', pl.x, 1.2, pl.z, { size: 0.9, life: 0.9, vy: 1.2 });
        if (G.t - G.ripeSnd > 0.4) { sfx.ding(); G.ripeSnd = G.t; }
      } else if (e.type === 'made') {
        const tr = G.L.troughs[e.animal];
        A.pop(F.GOODS[F.ANIMALS[e.animal].product].emoji, tr.x, 1.6, tr.z, { size: 1, life: 1.2, vy: 1 });
        animalSound(e.animal);
      } else if (e.type === 'rain') {
        A.showRain();
        toast('🌧️ RAIN! THE FIELD IS WET!', 'good', 2.6);
        SND.hiss({ f: 4000, to: 3000, dur: 2.5, vol: 0.05 });
      } else if (e.type === 'season') {
        const se = F.SEASONS[e.season];
        A.setSeason(e.season);
        showBanner(`${se.emoji} ${se.name}!`, TIPS[e.season], 2.4);
        G.wishT = 1.2; // Foxy's wish a moment later, once even if several seasons pass in one step
        if (G.S.level === 'easy') for (const p of G.players) p.seed = F.STAR[e.season];
        sfx.season();
        seedPrices();
        saveFarm();
      } else if (e.type === 'yearEnd') startFair();
    }
  }

  /* ---------------- the Harvest Fair at the end of the year ---------------- */
  function clearToasts() {
    while (toasts.length) toasts.pop().el.remove();
  }
  function startFair() {
    const S = G.S;
    endBuddy();
    clearToasts();
    G.wishT = 0;
    const you = S.earned, frog = S.froggy;
    const win = you >= frog;
    const lv = S.level;
    const best = prefs.best[lv] || 0;
    const newBest = you > best;
    if (newBest) prefs.best[lv] = you;
    storePrefs();
    saveFarm();
    G.celebrate = { t: 0, win, you, frog, newBest, best: Math.max(best, you), shot: false };
    // the kids line up in front of the field, and Froggy comes over for the fair
    const L = G.L;
    const fz = L.plots[F.PLOTS - 1].z + 2.3;
    G.players.forEach((p, i) => {
      p.x = (G.players.length === 2 ? (i ? 0.9 : -0.9) : 0);
      p.z = fz;
      p.face = Math.PI;
      p.goal = null;
      p.act = null;
      p.focus = null;
    });
    A.froggyVisit = { x: G.players.length === 2 ? 2.6 : 1.8, z: fz + 0.2 };
    A.fit({ x0: -6.5, x1: 6.5, z0: fz - 5.5, z1: fz + 1.6 }, true); // the camera glides in on the fair
    G.hintT = 0;
    $('hintLine').textContent = '';
    A.focus(0, null);
    A.focus(1, null);
    sfx.fair();
    if (win) confetti(110);
    showBanner('HARVEST FAIR!', win ? `${G.mode === 'both' ? 'TEDDY & TOMMY WIN' : NAME[G.mode] + ' WINS'} THE BLUE RIBBON!` : 'FROGGY WINS THIS YEAR!', 3);
    SND.music('over');
  }
  function updateFair(dt) {
    const C = G.celebrate;
    C.t += dt;
    for (const p of G.players) {
      const entry = Kit.roster.get(p.id);
      let mode = 'wave';
      let y = 0;
      if (C.win) {
        mode = Kit.roster.signature(entry, C.t < 2.2 ? 'hello' : 'goodbye');
        if (mode === 'jumpshot') {
          const k = ((C.t - 2.2) % 1.4) / 1.4;
          y = Math.sin(Math.min(1, k * 1.6) * Math.PI) * 0.6;
          if (k < 0.05 && !C['ball' + Math.floor((C.t - 2.2) / 1.4)]) {
            C['ball' + Math.floor((C.t - 2.2) / 1.4)] = true;
            A.fly('🏀', new T.Vector3(p.x, 2.0, p.z), new T.Vector3(p.x + 0.4, 1.0, p.z - 4), { size: 0.7, dur: 0.9, arc: 3.4, spin: 6 });
            SND.swish();
          }
        }
      }
      p.holder.position.set(p.x, y, p.z);
      p.holder.rotation.y = Math.PI;
      A.pose(p.holder, G.t * 8 + p.k, mode, 1 - Math.exp(-14 * dt));
      A.discs[p.k].position.set(p.x, 0.03, p.z);
    }
    if (C.t > 3.6 && G.screen === 'play') resultScreen();
  }
  function resultScreen() {
    const C = G.celebrate, S = G.S;
    $('ribbon').textContent = C.win ? '🎀' : '🐸';
    $('resLine').textContent = C.win ? `${G.mode === 'both' ? 'TEDDY & TOMMY WIN' : NAME[G.mode] + ' WINS'} THE BLUE RIBBON!` : 'FROGGY WINS THIS YEAR! TRY AGAIN!';
    $('resYouName').textContent = G.mode === 'both' ? 'TEDDY + TOMMY' : NAME[G.mode];
    $('resYouN').textContent = `🪙 ${C.you}`;
    $('resFrogN').textContent = `🪙 ${C.frog}`;
    $('resYou').classList.toggle('win', C.win);
    $('resFrog').classList.toggle('win', !C.win);
    $('resBest').textContent = C.newBest ? `NEW BEST YEAR! 🏆 🪙 ${C.you}` : `BEST YEAR: 🪙 ${C.best}`;
    $('resKids').textContent = G.mode === 'both' ? `TEDDY 🧺 ${S.stats.teddy} · TOMMY 🧺 ${S.stats.tommy}` : `🧺 ${S.sold} SOLD AT THE MARKET`;
    clearToasts();
    show('result');
    SND.music('over');
  }
  function nextYear() {
    SND.click();
    F.newYear(G.S);
    A.froggyVisit = null;
    saveFarm();
    start(G.mode);
  }

  /* ---------------- Foxy at the market, Froggy on his farm ---------------- */
  const frog = { x: 0, z: 0, tx: 0, tz: 0, wait: 0 };
  function updateFriends(dt) {
    const k = 1 - Math.exp(-12 * dt);
    G.foxyWave = Math.max(0, (G.foxyWave || 0) - dt);
    A.pose(A.foxy, G.t * 6, G.foxyWave > 0 || (G.celebrate && G.celebrate.win) ? 'wave' : 'stand', k);
    const fh = A.froggy;
    if (A.froggyVisit && G.celebrate) {
      // at the fair, beside the kids
      const inv = A.froggyFarm.worldToLocal(new T.Vector3(A.froggyVisit.x, 0, A.froggyVisit.z));
      fh.position.copy(inv);
      fh.rotation.y = Math.PI - A.froggyFarm.rotation.y;
      const hop = !G.celebrate.win ? Math.abs(Math.sin(G.t * 6)) * 0.4 : 0;
      fh.position.y = hop;
      A.pose(fh, G.t * 6, G.celebrate.win ? 'wave' : 'jump', k);
      return;
    }
    fh.position.y = 0;
    frog.wait -= dt;
    const dx = frog.tx - frog.x, dz = frog.tz - frog.z, d = Math.hypot(dx, dz);
    let mode = 'grab';
    if (d > 0.05) {
      const s = Math.min(d, 1.6 * dt);
      frog.x += (dx / d) * s;
      frog.z += (dz / d) * s;
      fh.rotation.y = Math.atan2(-dx, -dz);
      mode = 'walk';
    } else if (frog.wait <= 0) {
      frog.tx = (Math.floor(Math.random() * 3) - 1) * 2.3;
      frog.tz = Math.random() < 0.5 ? -1.1 + 1.1 : 1.1 + 0.9;
      frog.wait = 1.5 + Math.random() * 2;
    }
    fh.position.set(frog.x, 0, frog.z);
    A.pose(fh, G.t * 6, mode, k);
    // Froggy's sales float up from his farm
    const S = G.S;
    if (S && S.froggy > G.lastFrog) {
      const wp = A.froggyFarm.localToWorld(new T.Vector3(frog.x, 1.6, frog.z));
      A.pop('🪙', wp.x, wp.y, wp.z, { size: 0.7, life: 1.2, vy: 1.2 });
      G.lastFrog = S.froggy;
    }
  }

  /* ---------------- HUD ---------------- */
  const hudCache = {};
  const setText = (id, v) => { if (hudCache[id] !== v) { hudCache[id] = v; $(id).textContent = v; } };
  function seedPrices() {
    const S = farm();
    const pay = F.LEVELS[G.level].seeds;
    document.querySelectorAll('[data-price]').forEach((el) => {
      const c = F.CROPS[el.dataset.price];
      el.textContent = pay ? `${c.seed} 🪙` : 'FREE';
    });
    const star = F.STAR[S ? S.season : 0];
    document.querySelectorAll('.seed').forEach((b) => b.classList.toggle('star', b.dataset.seed === star));
  }
  function updateHud() {
    const S = G.S;
    if (!S || G.screen === 'title') return;
    const se = F.SEASONS[S.season];
    setText('sEmoji', se.emoji);
    setText('sName', se.name);
    setText('sYear', `YEAR ${S.year}`);
    const bars = $('yearbar').querySelectorAll('b');
    const frac = S.t / F.lv(S).season;
    bars.forEach((b, i) => { const w = i < S.season ? 100 : i === S.season ? Math.round(frac * 100) : 0; if (b._w !== w) { b._w = w; b.style.width = w + '%'; } });
    setText('coins', `🪙 ${S.coins}`);
    setText('vYou', `${G.mode === 'both' ? 'TEDDY + TOMMY' : NAME[G.mode]} 🧺 ${S.earned}`);
    setText('vFrog', `🐸 ${S.froggy}`);
    const items = F.GOOD_IDS.filter((g) => S.basket[g] > 0).map((g) => `${F.GOODS[g].emoji}${S.basket[g]}`).join(' ');
    if (hudCache.bItems !== items) {
      hudCache.bItems = items;
      const el = $('bItems');
      el.innerHTML = '';
      if (!items) { const s = document.createElement('span'); s.textContent = 'EMPTY'; s.style.font = "800 13px/1 'Rubik', sans-serif"; s.style.opacity = '0.8'; el.appendChild(s); }
      for (const g of F.GOOD_IDS) {
        if (!S.basket[g]) continue;
        const s = document.createElement('span');
        s.append(F.GOODS[g].emoji);
        const n = document.createElement('small');
        n.textContent = '×' + S.basket[g];
        s.appendChild(n);
        el.appendChild(s);
      }
    }
    const v = F.basketValue(S);
    setText('bValue', v ? `= ${v} 🪙` : '');
    setText('wish', `⭐ ${F.GOODS[S.wish].emoji} x2`);
    // the seed buttons show who has which seed
    const sel = G.players.map((p) => p.seed).join(',');
    if (hudCache.sel !== sel) {
      hudCache.sel = sel;
      document.querySelectorAll('.seed').forEach((b) => {
        b.classList.toggle('p1', !!G.players[0] && G.players[0].seed === b.dataset.seed);
        b.classList.toggle('p2', !!G.players[1] && G.players[1].seed === b.dataset.seed);
      });
    }
    // nudge to call your brother when lots of the field is dry
    const dry = S.plots.filter((p, i) => F.plotOpen(S, i) && p.crop && p.g < 1 && p.water <= 0).length;
    $('budBtn').classList.toggle('want', G.mode !== 'both' && dry >= 3 && !V.on);
  }

  /* ---------------- the frame ---------------- */
  function update(dt) {
    G.t += dt;
    if (G.sureT > 0) { G.sureT -= dt; if (G.sureT <= 0 && G.screen === 'title') farmRow(); }
    G.nudgeT -= dt;
    if (G.wishT > 0) {
      G.wishT -= dt;
      if (G.wishT <= 0 && G.S && !G.celebrate && G.screen === 'play') toast(`FOXY WANTS ${F.GOODS[G.S.wish].emoji}: DOUBLE COINS!`, 'cpu', 3);
    }
    if (G.hintT > 0) { G.hintT -= dt; if (G.hintT <= 0) $('hintLine').textContent = ''; }
    updateToasts(dt);
    updateBanner(dt);
    A.update(dt, G.t);
    if (G.screen === 'play' && !G.paused) {
      if (G.celebrate) updateFair(dt);
      else {
        onEvents(F.step(G.S, dt));
        if (!G.celebrate) {
          updatePlayers(dt);
          updateBuddy(dt);
          G.saveT += dt;
          if (G.saveT > 3) { G.saveT = 0; saveFarm(); }
        }
      }
    }
    updateFriends(dt);
    updateHud();
  }
  function draw(dt) {
    A.sync(farm(), G.t, dt);
    if (!G.celebrate) drawPlayers(dt);
    A.render();
  }
  let last = 0;
  function frame(now) {
    requestAnimationFrame(frame);
    const dt = Math.min(0.05, last ? (now - last) / 1000 : 0.016);
    last = now;
    update(dt);
    draw(dt);
  }

  /* ---------------- layout: which way the screen is, and room for the HUD ---------------- */
  function resize() {
    const w = window.innerWidth, h = window.innerHeight;
    const portrait = h > w * 1.05;
    if (portrait !== G.portrait) {
      G.portrait = portrait;
      G.L = F.layout(portrait);
      A.setLayout(G.L);
      for (const p of G.players) clampTo(p);
      if (V.on) clampTo(V);
    }
    // keep the farm clear of the HUD: measure it (it's laid out even while hidden)
    const top = Math.max(...['chip', 'score'].map((id) => $(id).getBoundingClientRect().bottom), 56);
    const bottom = Math.min(...['seeds', 'basket', 'budBtn'].map((id) => $(id).getBoundingClientRect().top), h - 80);
    A.resize(w, h, { l: 62, r: 10, t: top + 6, b: h - bottom + 8 });
  }

  /* ---------------- pause ---------------- */
  function pause(on) {
    if (G.screen !== 'play' && G.screen !== 'pause') return;
    if (on && (G.screen !== 'play' || G.celebrate)) return;
    G.paused = on;
    if (on) { saveFarm(); show('pause'); SND.music('pause'); } else { show('play'); SND.music('play'); }
  }

  /* ---------------- keys and taps ---------------- */
  function cycleSeed(p, dir = 1) {
    const i = F.CROP_IDS.indexOf(p.seed);
    p.seed = F.CROP_IDS[(i + dir + 3) % 3];
    SND.click();
  }
  function act(k) {
    const p = G.players[k];
    if (!p || p.act || G.celebrate) return;
    p.goal = null;
    const t = focusFor(p);
    if (t) doAction(p, t);
    else if (G.nudgeT <= 0) { toast(touch ? 'TAP A PLOT! 🌱' : 'WALK TO A PLOT FIRST! 🌱', 'cpu', 1.6); G.nudgeT = 1.6; }
  }
  // a tap on the farm: the nearest kid walks there and does the right thing
  function tapAt(x, z) {
    if (G.screen !== 'play' || G.paused || G.celebrate) return;
    let best = null, bd = 1e9;
    for (const t of targets()) {
      const pts = [t].concat(t.hits || []);
      for (const h of pts) {
        const hitR = h === t ? (t.plot ? 1.45 : 1.6) : 2.2;
        const d = t.plot && h === t ? Math.max(Math.abs(h.x - x), Math.abs(h.z - z)) : Math.hypot(h.x - x, h.z - z);
        if (d <= hitR && d < bd) { bd = d; best = t; }
      }
    }
    const goal = best ? { x: best.x, z: best.z } : { x, z };
    clampTo(goal);
    let p = G.players[0];
    if (G.players.length > 1) p = G.players.reduce((a, b) => (Math.hypot(b.x - goal.x, b.z - goal.z) < Math.hypot(a.x - goal.x, a.z - goal.z) ? b : a));
    if (best && reachOf(best, p.x, p.z) && !p.act) { p.goal = null; doAction(p, best); return best; }
    p.goal = { x: goal.x, z: goal.z, target: best };
    return best;
  }
  function onKey(e) {
    if (Kit.help.isOpen()) return;
    SND.init();
    const c = e.code;
    if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(c)) e.preventDefault();
    const fresh = !keys.has(c);
    keys.add(c);
    if (!fresh) return;
    if (c === 'KeyM') return SND.toggleMute();
    const s = G.screen;
    if (s === 'title') {
      if (c === 'Digit1' || c === 'Digit2' || c === 'Digit3') start(['teddy', 'tommy', 'both'][+c.slice(-1) - 1]);
      else if (c === 'KeyE') { SND.click(); setLevel(G.level === 'easy' ? 'normal' : 'easy'); }
      else if (c === 'Enter' || c === 'Space') start(G.mode);
      return;
    }
    if (s === 'pause') {
      if (c === 'KeyP' || c === 'Escape' || c === 'Space' || c === 'Enter') pause(false);
      else if (c === 'KeyQ') { SND.click(); goTitle(); }
      return;
    }
    if (s === 'result') {
      if (c === 'Enter' || c === 'Space') nextYear();
      else if (c === 'Escape') { SND.click(); goTitle(); }
      return;
    }
    if (s !== 'play') return;
    if (c === 'KeyP' || c === 'Escape') return pause(true);
    if (G.celebrate) return;
    if (c === 'KeyT') return callBuddy();
    const two = G.mode === 'both';
    if (c === 'Space') return act(0);
    if (c === 'Enter') return act(two ? 1 : 0);
    if (c === 'KeyQ') return cycleSeed(G.players[0]);
    if (c === 'ShiftRight' || (c === 'ShiftLeft' && !two)) return cycleSeed(G.players[two ? 1 : 0]);
    if (c === 'Digit1' || c === 'Digit2' || c === 'Digit3') { G.players[0].seed = F.CROP_IDS[+c.slice(-1) - 1]; SND.click(); }
  }
  function wire() {
    document.querySelectorAll('[data-play]').forEach((b) => b.addEventListener('click', () => { SND.click(); start(b.dataset.play); }));
    document.querySelectorAll('[data-level]').forEach((b) => b.addEventListener('click', () => { SND.click(); setLevel(b.dataset.level); }));
    $('newFarmBtn').addEventListener('click', newFarmTap);
    $('pauseBtn').addEventListener('click', () => pause(true));
    $('resumeBtn').addEventListener('click', () => pause(false));
    $('menuBtn').addEventListener('click', () => { SND.click(); goTitle(); });
    $('againBtn').addEventListener('click', nextYear);
    $('resMenuBtn').addEventListener('click', () => { SND.click(); goTitle(); });
    document.querySelectorAll('.muteBtn').forEach((b) => b.addEventListener('click', () => SND.toggleMute()));
    SND.onMute((m) => document.querySelectorAll('.muteBtn').forEach((b) => (b.textContent = m ? '🔇' : '🔊')));
    document.querySelectorAll('.muteBtn').forEach((b) => (b.textContent = SND.isMuted() ? '🔇' : '🔊'));
    document.querySelectorAll('.seed').forEach((b) => b.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      SND.init();
      for (const p of G.players) p.seed = b.dataset.seed;
      SND.click();
    }));
    $('budBtn').addEventListener('pointerdown', (e) => { e.preventDefault(); SND.init(); callBuddy(); });
    $('view').addEventListener('pointerdown', (e) => {
      SND.init();
      const pt = A.pick(e.clientX, e.clientY);
      if (pt) tapAt(pt.x, pt.z);
    });
    window.addEventListener('pointerdown', () => SND.init(), { capture: true });
    window.addEventListener('keydown', onKey);
    window.addEventListener('keyup', (e) => keys.delete(e.code));
    window.addEventListener('blur', () => keys.clear());
    window.addEventListener('resize', resize);
    window.addEventListener('pagehide', saveFarm);
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) { saveFarm(); if (G.autoPause && G.screen === 'play' && !G.celebrate) pause(true); SND.suspend(); }
      else SND.resume();
    });
  }

  /* ---------------- start ---------------- */
  function boot() {
    A.init($('view'));
    resize();
    try { G.faces = Kit.portraits([Kit.roster.get('teddy'), Kit.roster.get('tommy')], { size: 152 }); } catch (e) { G.faces = {}; }
    document.querySelectorAll('[data-face]').forEach((img) => (img.src = G.faces[img.dataset.face] || ''));
    setLevel(G.level);
    wire();
    $('loading').classList.add('hidden');
    goTitle();
    requestAnimationFrame(frame);
  }

  // the hooks for tests and screenshots (game.step works in a hidden tab, where frames are held back)
  window.game = {
    G, F,
    start(o = {}) {
      if (o.level) setLevel(o.level);
      if (o.fresh) G.S = F.newFarm(G.level);
      start(o.mode || 'teddy');
      return this.info();
    },
    step(seconds = 1, fps = 60) {
      const n = Math.round(seconds * fps);
      for (let i = 0; i < n; i++) { update(1 / fps); if (i % 6 === 5 || i === n - 1) draw(1 / fps); }
      return this.info();
    },
    // put a kid somewhere and press his action key
    goTo(k, x, z) { const p = G.players[k]; p.x = x; p.z = z; p.goal = null; p.focus = focusFor(p); return p.focus && whatAt(p.focus, p); },
    atPlot(k, i) { const pl = G.L.plots[i]; return this.goTo(k, pl.x, pl.z); },
    atAnimal(k, id) { const t = G.L.troughs[id]; return this.goTo(k, t.x, t.z); },
    atMarket(k = 0) { return this.goTo(k, G.L.counter.x, G.L.counter.z); },
    act(k = 0) { const p = G.players[k]; p.act = null; act(k); return this.info(); },
    tap: (x, z) => { const t = tapAt(x, z); return t ? t.kind : 'walk'; },
    tapScreen(px, py) { const pt = A.pick(px, py); return pt ? this.tap(pt.x, pt.z) : 'sky'; },
    screenOf(x, z, y = 0) { return A.toScreen(x, y, z); },
    seed(k, crop) { G.players[k].seed = crop; },
    call: () => callBuddy(),
    buddy: () => ({ on: V.on, phase: V.phase, pi: V.pi, path: V.path ? V.path.length : 0 }),
    title: goTitle,
    pause,
    save: saveFarm,
    reload() { G.S = loadFarm(); return !!G.S; },
    endYear() { onEvents(F.step(G.S, F.yearLen(G.S))); return this.info(); },
    info() {
      const S = G.S;
      return {
        screen: G.screen, mode: G.mode, level: G.level, paused: G.paused, portrait: G.portrait,
        farm: S && { year: S.year, season: F.SEASONS[S.season].id, t: +S.t.toFixed(2), coins: S.coins, earned: S.earned, froggy: S.froggy, over: S.over, owned: Object.keys(S.owned).filter((k) => S.owned[k]), basket: Object.fromEntries(F.GOOD_IDS.filter((g) => S.basket[g]).map((g) => [g, S.basket[g]])), wish: S.wish },
        plots: S && S.plots.map((p, i) => (F.plotOpen(S, i) ? (p.crop ? `${p.crop}:${p.g.toFixed(2)}:${p.water.toFixed(2)}` : `-:${p.water.toFixed(2)}`) : 'locked')),
        animals: S && Object.fromEntries(F.ANIMAL_IDS.map((a) => [a, F.hasAnimal(S, a) ? S.animals[a].state : 'none'])),
        players: G.players.map((p) => ({ id: p.id, x: +p.x.toFixed(2), z: +p.z.toFixed(2), seed: p.seed, focus: p.focus && (p.focus.kind + (p.focus.i !== undefined ? p.focus.i : p.focus.id ? ':' + p.focus.id : '')), goal: !!p.goal })),
        buddy: V.on ? V.phase : '', fair: G.celebrate && { win: G.celebrate.win, you: G.celebrate.you, frog: G.celebrate.frog },
      };
    },
    // the page's own part of the check: the brother waters the whole field (and again when called again), the farm
    // survives a trip through localStorage, and a tap walks a kid to a plot and plants it
    pageCheck(o = {}) {
      G.brokenBuddy = !!o.broken;
      const keep = { S: G.S, mode: G.mode, level: G.level, stored: (() => { try { return localStorage.getItem(FARM_KEY); } catch (e) { return null; } })() };
      const tests = [];
      const t = (test, ok, info = '') => tests.push({ test, ok: !!ok, info: String(info) });
      try {
        G.S = F.newFarm('normal');
        G.S.coins = 300;
        F.buy(G.S, 'row1');
        start('teddy');
        for (let i = 4; i < F.PLOTS; i++) F.plant(G.S, i, F.CROP_IDS[i % 3]);
        G.players[0].x = G.L.counter.x; G.players[0].z = G.L.counter.z;
        callBuddy();
        let laps = 0, seen = new Set(), guard = 0;
        while (V.on && guard++ < 2000) {
          update(1 / 30);
          if (V.phase === 'water' && V.pi > 0) seen.add(V.path[V.pi - 1].i);
          if (V.phase === 'water' && V.pi === 3 && laps === 0) { laps = 1; callBuddy(); }
        }
        const open = G.S.plots.map((p, i) => i).filter((i) => F.plotOpen(G.S, i));
        const wet = open.filter((i) => G.S.plots[i].water > 0.3);
        const locked = G.S.plots.filter((p, i) => !F.plotOpen(G.S, i)).every((p) => p.water === 0);
        t('your brother waters the whole open field, and goes again when called again', wet.length === open.length && seen.size === open.length && locked && laps === 1 && !V.on,
          `${wet.length}/${open.length} wet, ${seen.size} visited, locked dry ${locked}`);
        saveFarm();
        const back = loadFarm();
        t('the farm comes back from localStorage exactly', back && F.save(back) === F.save(G.S), back ? 'same' : 'nothing saved');
        G.S = F.newFarm('easy');
        start('tommy');
        const p = G.players[0];
        const pl = G.L.plots[10];
        tapAt(pl.x, pl.z);
        for (let i = 0; i < 240 && G.S.plots[10].crop === null; i++) update(1 / 30);
        t('a tap walks Tommy to a plot and plants it', G.S.plots[10].crop === p.seed && Math.hypot(p.x - pl.x, p.z - pl.z) < 0.3, `crop ${G.S.plots[10].crop}`);
        G.S = F.newFarm('easy');
        start('both');
        const before = toasts.length;
        callBuddy();
        t('two players: T is a high five, no brother pops in', !V.on && toasts.length > before && G.players.length === 2, `toasts ${before} -> ${toasts.length}`);
      } catch (e) {
        t('page check ran', false, e.message);
      }
      // put everything back as it was
      G.brokenBuddy = false;
      endBuddy();
      clearToasts();
      G.S = keep.S;
      try { if (keep.stored) localStorage.setItem(FARM_KEY, keep.stored); else localStorage.removeItem(FARM_KEY); } catch (e) { /* nothing kept */ }
      G.mode = keep.mode;
      goTitle();
      return { ok: tests.every((x) => x.ok), tests };
    },
    check: () => F.check.all(),
    checkFails: () => F.check.fails(),
    get autoPause() { return G.autoPause; },
    set autoPause(v) { G.autoPause = v; },
  };

  boot();
})();
