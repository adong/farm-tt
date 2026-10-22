/* TT Farm: the rules. Crops and their timers, water, the four seasons, the animals, Foxy's market, Froggy's farm next
   door, buying more field, and saving the farm. No THREE and no page: it runs in node too (tools/check.js), and the game
   (js/game.js) only draws what this says and asks it to do things.

   A crop grows only while its soil is wet. Watering fills the soil (water = 1) and a growing crop drinks it at the level's
   rate; when it runs dry the crop waits, never dies. step() is exact for any step size: it cuts the time at season ends,
   rain showers, ripening and running dry, so 1/60 s steps and one 30 s step give the same farm. */
(function () {
  'use strict';
  const F = (window.FARM = window.FARM || {});

  const CROPS = {
    bokchoy: { id: 'bokchoy', emoji: '🥬', name: 'BOK CHOY', seed: 2, price: 6, grow: 16 },
    rice: { id: 'rice', emoji: '🌾', name: 'RICE', seed: 3, price: 9, grow: 24 },
    melon: { id: 'melon', emoji: '🍉', name: 'WATERMELON', seed: 5, price: 15, grow: 34 },
  };
  const CROP_IDS = ['bokchoy', 'rice', 'melon'];
  const ANIMALS = {
    chicken: { id: 'chicken', emoji: '🐔', name: 'CHICKEN', product: 'egg', feed: 1, make: 12, food: '🌽' },
    cow: { id: 'cow', emoji: '🐄', name: 'COW', product: 'milk', feed: 2, make: 18, food: '🌿' },
    sheep: { id: 'sheep', emoji: '🐑', name: 'SHEEP', product: 'wool', feed: 3, make: 26, food: '🌿' },
  };
  const ANIMAL_IDS = ['chicken', 'cow', 'sheep'];
  const GOODS = {
    bokchoy: { emoji: '🥬', price: 6, name: 'BOK CHOY' },
    rice: { emoji: '🌾', price: 9, name: 'RICE' },
    melon: { emoji: '🍉', price: 15, name: 'WATERMELON' },
    egg: { emoji: '🥚', price: 4, name: 'EGG' },
    milk: { emoji: '🥛', price: 7, name: 'MILK' },
    wool: { emoji: '🧶', price: 10, name: 'WOOL' },
  };
  const GOOD_IDS = Object.keys(GOODS);
  // the crops' prices live in CROPS; GOODS reads them so a change in one place is a change everywhere
  for (const id of CROP_IDS) Object.defineProperty(GOODS[id], 'price', { get: () => CROPS[id].price, enumerable: true });

  // speed: how fast each crop grows this season. rain: when a shower waters every open plot (seconds into the season).
  const SEASONS = [
    { id: 'spring', emoji: '🌸', name: 'SPRING', speed: { bokchoy: 1.5, rice: 1, melon: 1 }, dry: 1, rain: [0.25, 0.62] },
    { id: 'summer', emoji: '☀️', name: 'SUMMER', speed: { bokchoy: 1, rice: 1.2, melon: 1.5 }, dry: 1.4, rain: [] },
    { id: 'autumn', emoji: '🍂', name: 'AUTUMN', speed: { bokchoy: 1.2, rice: 1.5, melon: 1 }, dry: 1, rain: [0.5] },
    { id: 'winter', emoji: '❄️', name: 'WINTER', speed: { bokchoy: 1, rice: 0.5, melon: 0.5 }, dry: 0.6, rain: [] },
  ];
  const STAR = ['bokchoy', 'melon', 'rice', 'bokchoy']; // each season's best crop (the ⭐ on the seed button)

  // EASY is for Tommy (5): free seeds and food, soil stays wet for ages, Froggy dawdles. NORMAL is for Teddy (8).
  const LEVELS = {
    easy: { season: 75, drain: 1 / 40, seeds: false, food: false, froggy: 0.17, startCoins: 0, costK: 0.5 },
    normal: { season: 90, drain: 1 / 12, seeds: true, food: true, froggy: 0.6, startCoins: 10, costK: 1 },
  };
  // more field and more animals, bought with coins at the signs on the farm
  const UPGRADES = {
    row1: { id: 'row1', emoji: '🟫', name: 'MORE FIELD', cost: 25 },
    row0: { id: 'row0', emoji: '🟫', name: 'MORE FIELD', cost: 40, needs: 'row1' },
    cow: { id: 'cow', emoji: '🐄', name: 'COW', cost: 18 },
    sheep: { id: 'sheep', emoji: '🐑', name: 'SHEEP', cost: 24 },
  };
  const COLS = 4, ROWS = 4, PLOTS = COLS * ROWS;
  const FROGGY_EVERY = 15; // Froggy sells a basket this often
  const SAVE_VERSION = 1;
  const BUG = {}; // set only by the check's "broken on purpose" runs (js/check.js)

  const lv = (S) => LEVELS[S.level] || LEVELS.easy;
  const cost = (S, id) => Math.round(UPGRADES[id].cost * lv(S).costK);
  const rowOpen = (S, r) => r >= 2 || !!S.owned['row' + r];
  const plotOpen = (S, i) => rowOpen(S, Math.floor(i / COLS));
  const hasAnimal = (S, id) => id === 'chicken' || !!S.owned[id];
  const yearLen = (S) => lv(S).season * 4;
  const season = (S) => SEASONS[S.season];
  const speed = (S, crop) => SEASONS[S.season].speed[crop];
  const drain = (S) => lv(S).drain * SEASONS[S.season].dry;
  const price = (S, good) => GOODS[good].price * (S.wish === good ? 2 : 1);
  const basketCount = (S) => GOOD_IDS.reduce((n, g) => n + S.basket[g], 0);
  const basketValue = (S) => GOOD_IDS.reduce((n, g) => n + S.basket[g] * price(S, g), 0);
  const wishFor = (year, s) => ['bokchoy', 'melon', 'rice', 'egg'][(s + year) % 4];

  function emptyPlot() { return { crop: null, g: 0, water: 0 }; }
  function newFarm(level = 'easy') {
    const S = {
      v: SAVE_VERSION, level: LEVELS[level] ? level : 'easy', year: 1, season: 0, t: 0, over: false,
      coins: LEVELS[level] ? LEVELS[level].startCoins : 0, earned: 0, froggy: 0,
      basket: {}, owned: { row1: false, row0: false, cow: false, sheep: false },
      plots: [], animals: {}, wish: wishFor(1, 0), stats: { teddy: 0, tommy: 0 }, sold: 0, rainAt: 0,
    };
    for (const g of GOOD_IDS) S.basket[g] = 0;
    for (let i = 0; i < PLOTS; i++) S.plots.push(emptyPlot());
    for (const a of ANIMAL_IDS) S.animals[a] = { state: 'hungry', t: 0 };
    return S;
  }
  // a new year on the same farm: the crops in the ground and the coins stay, the year's score starts again
  function newYear(S) {
    S.year++;
    S.season = 0;
    S.t = 0;
    S.over = false;
    S.earned = 0;
    S.froggy = 0;
    S.sold = 0;
    S.stats = { teddy: 0, tommy: 0 };
    S.wish = wishFor(S.year, 0);
    return S;
  }

  /* ---------------- time ---------------- */
  // the next moment in this season when something changes for everyone: a shower or the season's end
  function nextMark(S) {
    const L = lv(S).season;
    let m = L;
    for (const r of SEASONS[S.season].rain) if (r * L > S.t + 1e-9 && r * L < m) m = r * L;
    return m;
  }
  function rain(S) {
    for (let i = 0; i < PLOTS; i++) if (plotOpen(S, i)) S.plots[i].water = 1;
    S.rainAt = S.t;
  }
  function growPlots(S, h, ev) {
    const d = drain(S);
    for (let i = 0; i < PLOTS; i++) {
      const p = S.plots[i];
      if (!p.crop || p.g >= 1) continue;
      const rate = speed(S, p.crop) / CROPS[p.crop].grow;
      if (BUG.frameTimer) { // broken on purpose: grows a fixed bit per call, not per second
        p.g = Math.min(1, p.g + rate / 60);
        if (p.g >= 1) ev.push({ type: 'ripe', i, crop: p.crop });
        continue;
      }
      let wet = BUG.noDryStop ? h : Math.min(h, d > 0 ? p.water / d : h);
      wet = Math.min(wet, (1 - p.g) / rate);
      p.g += rate * wet;
      p.water = Math.max(0, p.water - d * wet);
      if (p.water < 1e-9) p.water = 0;
      if (p.g > 1 - 1e-9) { p.g = 1; ev.push({ type: 'ripe', i, crop: p.crop }); }
    }
  }
  function growAnimals(S, h, ev) {
    for (const id of ANIMAL_IDS) {
      const a = S.animals[id];
      if (a.state !== 'eating') continue;
      a.t += h;
      if (a.t >= ANIMALS[id].make - 1e-9) { a.state = 'ready'; a.t = ANIMALS[id].make; ev.push({ type: 'made', animal: id }); }
    }
  }
  function froggyAt(S, t) {
    if (BUG.lazyFroggy) return 0;
    return Math.round(lv(S).froggy * FROGGY_EVERY * Math.floor(t / FROGGY_EVERY + 1e-9));
  }
  // move the farm on by dt seconds; returns what happened (ripe crops, eggs, rain, a new season, the year's end)
  function step(S, dt) {
    const ev = [];
    if (S.over || !(dt > 0)) return ev;
    let left = dt;
    let guard = 0;
    while (left > 1e-12 && !S.over && guard++ < 10000) {
      const mark = nextMark(S);
      // the next ripening or running dry, so rates stay constant inside each piece
      let h = Math.min(left, mark - S.t);
      const d = drain(S);
      if (!BUG.frameTimer) {
        for (const p of S.plots) {
          if (!p.crop || p.g >= 1) continue;
          const rate = speed(S, p.crop) / CROPS[p.crop].grow;
          h = Math.min(h, (1 - p.g) / rate);
          if (p.water > 0 && d > 0 && !BUG.noDryStop) h = Math.min(h, p.water / d);
        }
      }
      h = Math.max(h, 0);
      growPlots(S, h, ev);
      growAnimals(S, h, ev);
      const before = (S.season * lv(S).season + S.t);
      S.t += h;
      left -= h;
      S.froggy = Math.max(S.froggy, froggyAt(S, before + h));
      if (S.t >= mark - 1e-9) {
        S.t = mark;
        if (mark >= lv(S).season - 1e-9) {
          if (S.season === 3) { S.over = true; S.t = lv(S).season; ev.push({ type: 'yearEnd' }); break; }
          S.season++;
          S.t = 0;
          S.wish = wishFor(S.year, S.season);
          ev.push({ type: 'season', season: S.season });
        } else { rain(S); ev.push({ type: 'rain' }); }
      }
      if (BUG.frameTimer) break;
    }
    return ev;
  }

  /* ---------------- things you do ---------------- */
  const cheapestSeed = () => Math.min(...CROP_IDS.map((c) => CROPS[c].seed));
  // nothing to sell, nothing growing, nothing coming and no coins: Foxy hands over free seeds, so nobody is ever stuck
  function stuck(S) {
    if (S.coins >= cheapestSeed()) return false;
    if (basketCount(S) > 0) return false;
    if (S.plots.some((p) => p.crop)) return false;
    if (ANIMAL_IDS.some((a) => hasAnimal(S, a) && S.animals[a].state !== 'hungry')) return false;
    return true;
  }
  function plant(S, i, crop) {
    const p = S.plots[i];
    if (!p || !CROPS[crop]) return { ok: false, why: 'bad' };
    if (!plotOpen(S, i)) return { ok: false, why: 'locked' };
    if (p.crop) return { ok: false, why: 'full' };
    let paid = 0, gift = false;
    if (lv(S).seeds) {
      const c = CROPS[crop].seed;
      if (S.coins >= c) { S.coins -= c; paid = c; } else if (stuck(S) && !BUG.noRescue) gift = true;
      else return { ok: false, why: 'coins', need: c };
    }
    p.crop = crop;
    p.g = 0;
    return { ok: true, paid, gift };
  }
  function water(S, i) {
    const p = S.plots[i];
    if (!p || !plotOpen(S, i)) return { ok: false, why: 'locked' };
    p.water = 1;
    return { ok: true };
  }
  function harvest(S, i, who) {
    const p = S.plots[i];
    if (!p || !p.crop || p.g < 1) return { ok: false, why: 'notRipe' };
    const crop = p.crop;
    S.basket[crop]++;
    p.crop = null;
    p.g = 0;
    if (who && S.stats[who] !== undefined) S.stats[who]++;
    return { ok: true, good: crop };
  }
  function feed(S, id) {
    const a = S.animals[id];
    if (!a || !hasAnimal(S, id)) return { ok: false, why: 'locked' };
    if (a.state !== 'hungry') return { ok: false, why: a.state };
    let paid = 0;
    if (lv(S).food) {
      const c = ANIMALS[id].feed;
      if (S.coins >= c) { S.coins -= c; paid = c; } else if (!stuck(S)) return { ok: false, why: 'coins', need: c };
    }
    a.state = 'eating';
    a.t = 0;
    return { ok: true, paid };
  }
  function collect(S, id, who) {
    const a = S.animals[id];
    if (!a || a.state !== 'ready') return { ok: false, why: 'notReady' };
    const good = ANIMALS[id].product;
    S.basket[good]++;
    a.state = 'hungry';
    a.t = 0;
    if (who && S.stats[who] !== undefined) S.stats[who]++;
    return { ok: true, good };
  }
  function sell(S) {
    const items = [];
    let total = 0;
    for (const g of GOOD_IDS) {
      const n = S.basket[g];
      if (!n) continue;
      const each = price(S, g);
      items.push({ good: g, n, each, wish: S.wish === g });
      total += n * each;
      S.sold += n;
      S.basket[g] = 0;
    }
    S.coins += total;
    S.earned += total;
    return { ok: total > 0, total, items };
  }
  function buy(S, id) {
    const u = UPGRADES[id];
    if (!u) return { ok: false, why: 'bad' };
    if (S.owned[id]) return { ok: false, why: 'owned' };
    if (u.needs && !S.owned[u.needs]) return { ok: false, why: 'needs' };
    const c = cost(S, id);
    if (S.coins < c) return { ok: false, why: 'coins', need: c };
    S.coins -= c;
    S.owned[id] = true;
    return { ok: true, paid: c };
  }
  // what Space does at a plot or an animal: the one thing that makes sense
  function plotAction(S, i) {
    const p = S.plots[i];
    if (!plotOpen(S, i)) return 'buy';
    if (!p.crop) return 'plant';
    if (p.g >= 1) return 'harvest';
    return 'water';
  }
  function animalAction(S, id) {
    if (!hasAnimal(S, id)) return 'buy';
    const a = S.animals[id];
    return a.state === 'hungry' ? 'feed' : a.state === 'ready' ? 'collect' : 'wait';
  }

  /* ---------------- saving ---------------- */
  function save(S) {
    if (BUG.forgetWater) {
      const c = JSON.parse(JSON.stringify(S));
      c.plots.forEach((p) => delete p.water);
      return JSON.stringify(c);
    }
    return JSON.stringify(S);
  }
  const num = (v, lo, hi, def) => (typeof v === 'number' && isFinite(v) ? Math.min(hi, Math.max(lo, v)) : def);
  // a saved farm back, checked piece by piece: anything broken or missing gets a safe value; junk gives null
  function load(str) {
    let o;
    try { o = typeof str === 'string' ? JSON.parse(str) : str; } catch (e) { return null; }
    if (!o || typeof o !== 'object' || o.v !== SAVE_VERSION || !LEVELS[o.level]) return null;
    if (!Array.isArray(o.plots) || o.plots.length !== PLOTS) return null;
    const S = newFarm(o.level);
    S.year = Math.floor(num(o.year, 1, 9999, 1));
    S.season = Math.floor(num(o.season, 0, 3, 0));
    S.t = num(o.t, 0, LEVELS[o.level].season, 0);
    S.over = !!o.over;
    S.coins = Math.floor(num(o.coins, 0, 1e7, 0));
    S.earned = Math.floor(num(o.earned, 0, 1e7, 0));
    S.froggy = Math.floor(num(o.froggy, 0, 1e7, 0));
    S.sold = Math.floor(num(o.sold, 0, 1e7, 0));
    S.rainAt = num(o.rainAt, 0, LEVELS[o.level].season, 0);
    S.wish = GOODS[o.wish] ? o.wish : wishFor(S.year, S.season);
    for (const g of GOOD_IDS) S.basket[g] = Math.floor(num(o.basket && o.basket[g], 0, 9999, 0));
    for (const k of Object.keys(S.owned)) S.owned[k] = !!(o.owned && o.owned[k]);
    if (o.stats) for (const k of ['teddy', 'tommy']) S.stats[k] = Math.floor(num(o.stats[k], 0, 1e6, 0));
    o.plots.forEach((p, i) => {
      if (!p || typeof p !== 'object') return;
      const crop = CROPS[p.crop] ? p.crop : null;
      S.plots[i] = { crop, g: crop ? num(p.g, 0, 1, 0) : 0, water: num(p.water, 0, 1, 0) };
    });
    for (const id of ANIMAL_IDS) {
      const a = o.animals && o.animals[id];
      if (a && ['hungry', 'eating', 'ready'].includes(a.state)) S.animals[id] = { state: a.state, t: num(a.t, 0, ANIMALS[id].make, 0) };
    }
    return S;
  }

  /* ---------------- Froggy's year, for the HUD ---------------- */
  const froggyYear = (S) => Math.round(froggyAt(S, yearLen(S)));
  const elapsed = (S) => S.season * lv(S).season + S.t;

  /* ---------------- the farm's layout (metres; x right, z toward the camera) ---------------- */
  // Landscape: the animals on the left, the field in the middle, Foxy's market on the right.
  // Portrait (phones held upright): the animals behind the field and the market in front, so it all fits the width.
  const PITCH = 2.8, PLOT = 2.3;
  function layout(portrait) {
    const plots = [];
    for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) plots.push({ x: (c - 1.5) * PITCH, z: (r - 1.5) * PITCH });
    const L = { portrait: !!portrait, plots, plot: PLOT, pitch: PITCH };
    if (!portrait) {
      L.animals = { chicken: { x: -12.2, z: -3.6 }, cow: { x: -12.6, z: 0.4 }, sheep: { x: -12.2, z: 4.4 } };
      L.troughs = { chicken: { x: -9.4, z: -3.6 }, cow: { x: -9.4, z: 0.4 }, sheep: { x: -9.4, z: 4.4 } };
      L.market = { x: 12.4, z: 0.4, face: -Math.PI / 2 };
      L.counter = { x: 9.6, z: 0.4 };
      L.signs = { row1: { x: -6.4, z: -1.4 }, row0: { x: -6.4, z: -4.2 } };
      L.bounds = { x0: -10.2, x1: 10.4, z0: -7, z1: 7.4 };
      L.view = { x0: -15.5, x1: 15, z0: -8.5, z1: 8 };
      L.barn = { x: -12.5, z: -9.5 };
      L.froggy = { x: 11.5, z: -10 };
      L.start = { teddy: { x: 0, z: 6.2 }, tommy: { x: 1.4, z: 6.2 } };
    } else {
      L.animals = { chicken: { x: -4.2, z: -10.4 }, cow: { x: 0, z: -10.9 }, sheep: { x: 4.2, z: -10.4 } };
      L.troughs = { chicken: { x: -4.2, z: -7.8 }, cow: { x: 0, z: -7.8 }, sheep: { x: 4.2, z: -7.8 } };
      L.market = { x: 0, z: 10.6, face: Math.PI };
      L.counter = { x: 0, z: 8.2 };
      L.signs = { row1: { x: -6.3, z: -1.4 }, row0: { x: -6.3, z: -4.2 } };
      L.bounds = { x0: -6.2, x1: 6.2, z0: -8.2, z1: 8.6 };
      L.view = { x0: -6.8, x1: 6.8, z0: -13, z1: 12.4 };
      L.barn = { x: -9.5, z: -13 };
      L.froggy = { x: 9.5, z: -14 };
      L.start = { teddy: { x: -0.7, z: 6 }, tommy: { x: 0.7, z: 6 } };
    }
    return L;
  }

  Object.assign(F, {
    CROPS, CROP_IDS, ANIMALS, ANIMAL_IDS, GOODS, GOOD_IDS, SEASONS, STAR, LEVELS, UPGRADES, COLS, ROWS, PLOTS, FROGGY_EVERY, BUG,
    newFarm, newYear, step, plant, water, harvest, feed, collect, sell, buy, save, load, stuck, layout,
    plotOpen, rowOpen, hasAnimal, plotAction, animalAction, price, basketCount, basketValue, cost, speed, drain, yearLen,
    season, froggyAt, froggyYear, elapsed, wishFor, lv,
  });
})();
