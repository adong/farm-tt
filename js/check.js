/* TT Farm: the headless check of the rules (js/rules.js). The same code runs in node (tools/check.js) and in the page
   (game.check(), game.checkFails()).
     crop timers  - every crop ripens on time in every season and level, waits when dry, a step of any size gives the
                    same farm, seasons hand over mid-crop, rain, animals, the year's end, locked plots.
     save / load  - a farm comes back exactly and carries on the same; junk and broken saves never crash it.
     prices       - every crop and animal pays, none pays far more than the rest, upgrades pay back, nobody gets stuck
                    with no coins, and bots who play like Teddy, like Tommy, or not at all end the year where they should.
   checkFails() breaks the rules on purpose, one way at a time, and each break must make the check fail. */
(function () {
  'use strict';
  const F = window.FARM;
  const near = (a, b, eps = 1e-6) => Math.abs(a - b) <= eps;

  function suite(name) {
    const tests = [];
    return {
      tests,
      t(what, ok, info = '') { tests.push({ suite: name, test: what, ok: !!ok, info: String(info) }); return !!ok; },
      get ok() { return tests.every((x) => x.ok); },
    };
  }

  /* ---------------- crop timers ---------------- */
  function timers() {
    const s = suite('timers');
    // 1. ripe right on time, kept wet, for every crop x season x level
    let worst = 0, bad = [];
    for (const level of ['easy', 'normal']) {
      for (let si = 0; si < 4; si++) {
        for (const crop of F.CROP_IDS) {
          const S = F.newFarm(level);
          S.season = si;
          S.t = 0;
          const i = 13;
          F.plant(S, i, crop);
          const due = F.CROPS[crop].grow / F.SEASONS[si].speed[crop];
          let t = 0;
          while (t < due - 0.02 - 1e-9) {
            F.water(S, i);
            const h = Math.min(0.5, due - 0.02 - t);
            F.step(S, h);
            t += h;
          }
          const early = S.plots[i].g;
          F.water(S, i);
          F.step(S, 0.04);
          const ok = early < 1 && S.plots[i].g === 1;
          worst = Math.max(worst, Math.abs(1 - early));
          if (!ok) bad.push(`${level} ${F.SEASONS[si].id} ${crop}: ${early.toFixed(3)} -> ${S.plots[i].g.toFixed(3)} at ${due.toFixed(2)} s`);
        }
      }
    }
    s.t('every crop ripens on time (2 levels x 4 seasons x 3 crops)', bad.length === 0, bad.join('; ') || 'within 0.02 s');

    // 2. dry soil: the crop waits (summer, no rain)
    {
      const S = F.newFarm('normal');
      S.season = 1;
      F.plant(S, 12, 'rice');
      F.step(S, 60);
      s.t('a dry crop waits (60 s, never watered)', S.plots[12].g === 0 && S.plots[12].crop === 'rice', 'g = ' + S.plots[12].g.toFixed(3));
    }
    // 3. one watering lasts exactly 1/drain seconds of growing
    for (const [level, si, secs] of [['easy', 3, 72], ['normal', 1, 80]]) {
      const S = F.newFarm(level);
      S.season = si;
      F.plant(S, 12, 'melon');
      F.water(S, 12);
      F.step(S, secs);
      const d = F.drain(S), want = (F.SEASONS[si].speed.melon / F.CROPS.melon.grow) / d;
      s.t(`one watering lasts ${(1 / d).toFixed(1)} s (${level}, ${F.SEASONS[si].id})`, want < 1 && near(S.plots[12].g, want, 1e-6) && S.plots[12].water === 0, `g ${S.plots[12].g.toFixed(4)} want ${want.toFixed(4)}`);
    }
    // 4. any step size gives the same farm
    {
      const run = (h, total = 200) => {
        const S = F.newFarm('normal');
        S.coins = 99;
        F.plant(S, 8, 'bokchoy'); F.plant(S, 9, 'rice'); F.plant(S, 10, 'melon'); F.plant(S, 15, 'rice');
        F.water(S, 8); F.water(S, 9); F.water(S, 10);
        F.feed(S, 'chicken');
        let ripe = 0;
        for (let t = 0; t < total - 1e-9; t += h) ripe += F.step(S, Math.min(h, total - t)).filter((e) => e.type === 'ripe').length;
        return { S, ripe };
      };
      const sizes = [1 / 60, 1 / 7, 0.5, 3, 25, 200];
      const runs = sizes.map((h) => run(h));
      const ref = runs[0].S;
      const diff = (S) => Math.max(...S.plots.map((p, i) => Math.abs(p.g - ref.plots[i].g) + Math.abs(p.water - ref.plots[i].water)), Math.abs(S.t - ref.t));
      const worstDiff = Math.max(...runs.map((r) => diff(r.S)));
      const sameRipe = runs.every((r) => r.ripe === runs[0].ripe);
      s.t('steps of 1/60 s, 1/7 s, 0.5 s, 3 s, 25 s and 200 s give the same farm', worstDiff < 1e-6 && sameRipe && runs.every((r) => r.S.season === ref.season && r.S.animals.chicken.state === ref.animals.chicken.state),
        `max diff ${worstDiff.toExponential(1)}, ripe events ${runs.map((r) => r.ripe).join('/')}`);
    }
    // 5. a crop planted late in spring carries on into summer at summer's speed
    {
      const S = F.newFarm('normal');
      const L = F.LEVELS.normal.season;
      S.t = L - 4;
      F.plant(S, 12, 'rice');
      F.water(S, 12);
      const ev = F.step(S, 8);
      const g = 4 / 24 + (4 * 1.2) / 24, w = 1 - 4 / 12 - (4 * 1.4) / 12;
      s.t('seasons hand over mid-crop (spring -> summer)', S.season === 1 && near(S.plots[12].g, g) && near(S.plots[12].water, w) && ev.some((e) => e.type === 'season'),
        `g ${S.plots[12].g.toFixed(4)} want ${g.toFixed(4)}, water ${S.plots[12].water.toFixed(3)} want ${w.toFixed(3)}`);
    }
    // 6. rain waters every open plot and no locked one
    {
      const S = F.newFarm('normal');
      const L = F.LEVELS.normal.season;
      const ev = F.step(S, F.SEASONS[0].rain[0] * L + 0.01);
      const open = S.plots.filter((p, i) => F.plotOpen(S, i));
      const locked = S.plots.filter((p, i) => !F.plotOpen(S, i));
      s.t('spring rain waters the open field', ev.some((e) => e.type === 'rain') && open.every((p) => p.water === 1) && locked.every((p) => p.water === 0), `${open.length} open, ${locked.length} locked`);
    }
    // 7. animals: fed, ready on time, collected once
    {
      const S = F.newFarm('easy');
      const fed = F.feed(S, 'chicken');
      F.step(S, F.ANIMALS.chicken.make - 0.1);
      const before = S.animals.chicken.state;
      const ev = F.step(S, 0.2);
      const c1 = F.collect(S, 'chicken', 'tommy'), c2 = F.collect(S, 'chicken', 'tommy');
      const cow = F.feed(S, 'cow');
      s.t('the chicken lays on time, once; the cow waits to be bought', fed.ok && before === 'eating' && ev.some((e) => e.type === 'made') && c1.ok && !c2.ok && S.basket.egg === 1 && S.stats.tommy === 1 && !cow.ok,
        `${before} -> ${S.animals.chicken.state}, eggs ${S.basket.egg}`);
    }
    // 8. the year ends after four seasons, once, and then stands still
    for (const level of ['easy', 'normal']) {
      const S = F.newFarm(level);
      const ev = [];
      for (let k = 0; k < 400; k++) ev.push(...F.step(S, 1.7));
      const seasons = ev.filter((e) => e.type === 'season').length, ends = ev.filter((e) => e.type === 'yearEnd').length;
      const t = S.t;
      F.step(S, 10);
      s.t(`the year is four seasons, ${F.yearLen(S)} s (${level})`, S.over && seasons === 3 && ends === 1 && S.t === t && S.season === 3, `${seasons} season changes, ${ends} year end`);
    }
    // 9. locked rows can't be planted until bought
    {
      const S = F.newFarm('normal');
      S.coins = 100;
      const a = F.plant(S, 4, 'rice');
      const b = F.buy(S, 'row0');
      const c = F.buy(S, 'row1');
      const d = F.plant(S, 4, 'rice');
      s.t('locked rows open only when bought, in order', !a.ok && a.why === 'locked' && !b.ok && c.ok && d.ok && S.coins === 100 - 25 - 3, `coins left ${S.coins}`);
    }
    return s;
  }

  /* ---------------- bots: play a whole year on the rules ---------------- */
  // style: speed (m/s), pause after each job (s), which crops, when to water and sell, buy upgrades or not, call the brother
  const STYLES = {
    teddy: { speed: 4.5, pause: 0.5, crops: 'star', waterBelow: 0.2, sellAt: 40, buy: true, buddyEvery: 0 },
    medium: { speed: 3.6, pause: 1.2, crops: 'star', waterBelow: 0.05, sellAt: 30, buy: true, buddyEvery: 0, wander: 0.12 },
    tommy: { speed: 2.5, pause: 2.5, crops: 'bokchoy', waterBelow: 0, sellAt: 8, buy: false, buddyEvery: 0, wander: 0.35 },
    idle: { idle: true },
  };
  function bot(level, styleName, seed = 1) {
    const st = STYLES[styleName];
    const S = F.newFarm(level);
    const L = F.layout(false);
    let rnd = seed * 9301 + 49297;
    const rand = () => ((rnd = (rnd * 9301 + 49297) % 233280) / 233280);
    let pos = { x: L.start.teddy.x, z: L.start.teddy.z };
    let negative = false, bought = [], jobs = 0, gifts = 0;
    const go = (to, cost) => {
      const d = Math.hypot(to.x - pos.x, to.z - pos.z);
      F.step(S, d / st.speed + (cost || 0.4) + st.pause);
      pos = { x: to.x, z: to.z };
    };
    const seedFor = () => {
      if (st.crops === 'bokchoy') return 'bokchoy';
      const star = F.STAR[S.season];
      if (!F.lv(S).seeds || S.coins >= F.CROPS[star].seed) return star;
      return 'bokchoy';
    };
    let guard = 0;
    while (!S.over && guard++ < 20000) {
      if (st.idle) { F.step(S, 5); continue; }
      if (st.wander && rand() < st.wander) { go({ x: (rand() - 0.5) * 16, z: (rand() - 0.5) * 10 }, 0.2); continue; }
      const jobsNow = [];
      const left = F.yearLen(S) - F.elapsed(S);
      for (let i = 0; i < F.PLOTS; i++) {
        if (!F.plotOpen(S, i)) continue;
        const p = S.plots[i], at = L.plots[i];
        if (p.crop && p.g >= 1) jobsNow.push({ kind: 'harvest', i, at, pri: 0 });
        else if (p.crop && p.water <= st.waterBelow) jobsNow.push({ kind: 'water', i, at, pri: 1 });
        else if (!p.crop) {
          const c = seedFor();
          const due = F.CROPS[c].grow / F.speed(S, c);
          if (due < left - 3 && (!F.lv(S).seeds || S.coins >= F.CROPS[c].seed || F.stuck(S))) jobsNow.push({ kind: 'plant', i, at, crop: c, pri: 2 });
        }
      }
      for (const a of F.ANIMAL_IDS) {
        if (!F.hasAnimal(S, a)) continue;
        const act = F.animalAction(S, a);
        if (act === 'collect') jobsNow.push({ kind: 'collect', a, at: L.troughs[a], pri: 0 });
        else if (act === 'feed' && F.ANIMALS[a].make < left - 3 && (!F.lv(S).food || S.coins >= F.ANIMALS[a].feed)) jobsNow.push({ kind: 'feed', a, at: L.troughs[a], pri: 2 });
      }
      const value = F.basketValue(S);
      const broke = F.lv(S).seeds && S.coins < 5;
      if (value > 0 && (value >= st.sellAt || left < 12 || (broke && !jobsNow.some((j) => j.kind === 'harvest')))) jobsNow.push({ kind: 'sell', at: L.counter, pri: value >= st.sellAt * 1.5 || left < 12 ? -1 : 3 });
      if (st.buy) {
        for (const u of ['row1', 'cow', 'row0', 'sheep']) {
          const up = F.UPGRADES[u];
          if (S.owned[u] || (up.needs && !S.owned[up.needs])) continue;
          if (S.coins >= F.cost(S, u) + 8 && left > F.yearLen(S) * 0.3) { jobsNow.push({ kind: 'buy', u, at: u === 'cow' || u === 'sheep' ? L.troughs[u] : L.signs[u], pri: 1 }); break; }
        }
      }
      if (!jobsNow.length) { F.step(S, 0.5); continue; }
      jobsNow.sort((a, b) => a.pri - b.pri || Math.hypot(a.at.x - pos.x, a.at.z - pos.z) - Math.hypot(b.at.x - pos.x, b.at.z - pos.z));
      const j = jobsNow[0];
      go(j.at, j.kind === 'sell' ? 1 : 0.4);
      if (S.over) break;
      let r;
      if (j.kind === 'harvest') r = F.harvest(S, j.i, 'teddy');
      else if (j.kind === 'water') r = F.water(S, j.i);
      else if (j.kind === 'plant') { r = F.plant(S, j.i, j.crop); if (r.gift) gifts++; }
      else if (j.kind === 'collect') r = F.collect(S, j.a, 'teddy');
      else if (j.kind === 'feed') r = F.feed(S, j.a);
      else if (j.kind === 'sell') r = F.sell(S);
      else if (j.kind === 'buy') { r = F.buy(S, j.u); if (r.ok) bought.push(j.u); }
      if (r && r.ok) jobs++;
      if (S.coins < 0) negative = true;
    }
    return { S, earned: S.earned, froggy: S.froggy, coins: S.coins, bought, jobs, negative, gifts };
  }

  /* ---------------- prices ---------------- */
  function prices() {
    const s = suite('prices');
    const C = F.CROPS, A = F.ANIMALS, G = F.GOODS;
    // 1. everything pays for its seeds or its food
    const losers = F.CROP_IDS.filter((c) => !(C[c].price > C[c].seed)).concat(F.ANIMAL_IDS.filter((a) => !(G[A[a].product].price > A[a].feed)));
    s.t('every crop sells for more than its seeds, every animal\'s gift for more than its food', losers.length === 0, losers.join(', ') || F.CROP_IDS.map((c) => `${C[c].emoji} ${C[c].seed}->${C[c].price}`).join(' ') + ' ' + F.ANIMAL_IDS.map((a) => `${A[a].emoji} ${A[a].feed}->${G[A[a].product].price}`).join(' '));
    // 2. no crop or animal pays far more per second than the rest (NORMAL profit, EASY takings)
    const rN = F.CROP_IDS.map((c) => (C[c].price - C[c].seed) / C[c].grow).concat(F.ANIMAL_IDS.map((a) => (G[A[a].product].price - A[a].feed) / A[a].make));
    const rE = F.CROP_IDS.map((c) => C[c].price / C[c].grow).concat(F.ANIMAL_IDS.map((a) => G[A[a].product].price / A[a].make));
    const spread = (r) => Math.max(...r) / Math.min(...r);
    s.t('coins per second stay close: NORMAL within 1.35x, EASY within 1.6x', spread(rN) <= 1.35 && spread(rE) <= 1.6 && Math.min(...rN) > 0, `NORMAL ${rN.map((x) => x.toFixed(3)).join(' ')} (${spread(rN).toFixed(2)}x), EASY ${spread(rE).toFixed(2)}x`);
    // 3. each season has a crop that loves it, and its ⭐ is that crop
    const seasonsOk = F.SEASONS.every((se, i) => {
      const best = F.CROP_IDS.reduce((b, c) => (se.speed[c] > se.speed[b] ? c : b), F.CROP_IDS[0]);
      return F.STAR[i] === best && se.speed[best] >= (i === 3 ? 1 : 1.2);
    });
    s.t('every season has a best crop (the ⭐), winter too', seasonsOk, F.STAR.join(' '));
    // 4. the market pays exactly the basket, Foxy's wish twice
    {
      const S = F.newFarm('normal');
      S.wish = 'melon';
      S.basket.melon = 2; S.basket.egg = 3; S.basket.rice = 1;
      const r = F.sell(S);
      const want = 2 * C.melon.price * 2 + 3 * G.egg.price + C.rice.price;
      const again = F.sell(S);
      s.t('the market pays the basket, the wish x2, and an empty basket pays nothing', r.total === want && S.coins === 10 + want && again.total === 0 && F.basketCount(S) === 0, `${r.total} (want ${want})`);
    }
    // 5. buying more field or an animal pays back within a year, and isn't free on NORMAL
    {
      const yr = F.LEVELS.normal.season * 4;
      const minCrop = Math.min(...F.CROP_IDS.map((c) => (C[c].price - C[c].seed) / C[c].grow));
      const pay = {
        row1: 4 * minCrop * 0.3 * yr * 0.5, row0: 4 * minCrop * 0.3 * yr * 0.5,
        cow: ((G.milk.price - A.cow.feed) / A.cow.make) * 0.5 * yr * 0.5, sheep: ((G.wool.price - A.sheep.feed) / A.sheep.make) * 0.5 * yr * 0.5,
      };
      const bad = Object.keys(F.UPGRADES).filter((u) => !(F.UPGRADES[u].cost <= pay[u] && F.UPGRADES[u].cost >= 10));
      s.t('more field and new animals pay back in half a year, worked a third of the time', bad.length === 0, bad.join(', ') || Object.keys(pay).map((u) => `${u} ${F.UPGRADES[u].cost}<=${pay[u].toFixed(0)}`).join(' '));
    }
    // 6. no coins, nothing growing, nothing to sell: Foxy's free seeds. With crops in the ground you wait for them.
    {
      const S = F.newFarm('normal');
      S.coins = 0;
      const a = F.plant(S, 12, 'bokchoy');
      const b = F.plant(S, 13, 'bokchoy');
      s.t('nobody gets stuck: free seeds only when there is nothing else', a.ok && a.gift && !b.ok && b.why === 'coins' && S.coins === 0, `first ${a.ok ? 'gift' : a.why}, second ${b.ok ? 'planted' : b.why}`);
    }
    // 7. whole years played by bots
    const rows = [];
    let allOk = true;
    const want = (cond, label) => { if (!cond) allOk = false; return cond ? 'ok' : 'NO: ' + label; };
    for (const level of ['easy', 'normal']) {
      for (const style of ['teddy', 'medium', 'tommy', 'idle']) {
        const seeds = style === 'tommy' || style === 'medium' ? [1, 2, 3, 4, 5] : [1];
        for (const seed of seeds) {
          const r = bot(level, style, seed);
          let verdict;
          if (style === 'teddy') verdict = want(r.earned >= r.froggy * 1.3 && !r.negative && r.bought.length >= (level === 'easy' ? 4 : 2), 'beat Froggy by 30% and buy');
          else if (style === 'medium') verdict = want(r.earned > r.froggy && !r.negative, 'a so-so Teddy still beats Froggy');
          else if (style === 'tommy') verdict = level === 'easy' ? want(r.earned > r.froggy * 1.1 && !r.negative, 'a slow EASY farmer beats Froggy') : 'info';
          else verdict = want(r.froggy > 0 && r.earned === 0, 'Froggy earns while you nap');
          rows.push({ level, style, seed, earned: r.earned, froggy: r.froggy, coins: r.coins, bought: r.bought.join(' '), jobs: r.jobs, verdict });
        }
      }
    }
    s.t('bots: a quick Teddy beats Froggy by 30% and buys, a so-so one still wins, a slow Tommy wins EASY, napping loses', allOk,
      rows.filter((r) => r.verdict !== 'ok' && r.verdict !== 'info').map((r) => `${r.level} ${r.style}#${r.seed} ${r.earned} vs ${r.froggy}`).join('; ') || 'all as wanted');
    s.rows = rows;
    return s;
  }

  /* ---------------- save and load ---------------- */
  function saving() {
    const s = suite('save');
    // a farm in the middle of things: crops, water, animals, upgrades, a basket
    const mid = () => {
      const S = F.newFarm('normal');
      S.coins = 120;
      F.buy(S, 'row1'); F.buy(S, 'cow');
      F.plant(S, 5, 'melon'); F.water(S, 5);
      F.plant(S, 12, 'rice'); F.water(S, 12);
      F.plant(S, 14, 'bokchoy');
      F.feed(S, 'chicken'); F.feed(S, 'cow');
      F.step(S, 37.3);
      F.harvest(S, 12, 'teddy');
      S.basket.egg = 2;
      F.step(S, 50.1);
      return S;
    };
    const A = mid();
    const str = F.save(A);
    const B = F.load(str);
    s.t('a saved farm comes back exactly', B && JSON.stringify(B) === JSON.stringify(A), B ? `${str.length} bytes, season ${B.season}, t ${B.t.toFixed(1)}` : 'load gave null');
    // ...and carries on the same
    if (B) {
      const act = (S) => { F.water(S, 5); F.step(S, 20); F.plant(S, 13, 'rice'); F.water(S, 13); F.step(S, 41); F.sell(S); F.step(S, 30); };
      act(A); act(B);
      s.t('a loaded farm carries on exactly like the one that never stopped', F.save(A) === F.save(B), `season ${A.season}, coins ${A.coins} / ${B.coins}`);
    } else s.t('a loaded farm carries on exactly like the one that never stopped', false, 'no farm');
    // junk never crashes it
    const good = JSON.parse(F.save(F.newFarm('easy')));
    const junk = {
      empty: '', words: 'hello farm', nothing: 'null', array: '[]', obj: '{}', future: JSON.stringify(Object.assign({}, good, { v: 99 })),
      badLevel: JSON.stringify(Object.assign({}, good, { level: 'super' })), shortField: JSON.stringify(Object.assign({}, good, { plots: good.plots.slice(0, 3) })),
    };
    let crashed = [], notNull = [];
    for (const [k, v] of Object.entries(junk)) {
      try { if (F.load(v) !== null) notNull.push(k); } catch (e) { crashed.push(k); }
    }
    s.t('junk saves load as nothing (a new farm), never a crash', crashed.length === 0 && notNull.length === 0, crashed.concat(notNull).join(', ') || Object.keys(junk).length + ' kinds of junk');
    // broken values get mended
    {
      const o = JSON.parse(F.save(F.newFarm('normal')));
      o.coins = -50; o.earned = 'lots'; o.season = 7; o.t = 1e9; o.year = null;
      o.plots[0] = { crop: 'pizza', g: 0.5, water: 7 }; o.plots[1] = null; o.plots[2] = { crop: 'melon', g: NaN, water: -1 };
      o.basket.melon = Infinity; o.animals.cow = { state: 'flying', t: 3 }; o.owned.row1 = 'yes';
      let S = null, err = '';
      try { S = F.load(JSON.stringify(o)); } catch (e) { err = e.message; }
      const fine = S && S.coins === 0 && S.earned === 0 && S.season === 3 && S.t === F.LEVELS.normal.season && S.year === 1 &&
        S.plots[0].crop === null && S.plots[0].water === 1 && S.plots[1].crop === null && S.plots[2].crop === 'melon' && S.plots[2].g === 0 && S.plots[2].water === 0 &&
        S.basket.melon === 0 && S.animals.cow.state === 'hungry' && S.owned.row1 === true;
      s.t('broken numbers and names are mended on load', fine, err || (S ? 'mended' : 'null'));
    }
    return s;
  }

  function all() {
    const parts = [timers(), saving(), prices()];
    const tests = [].concat(...parts.map((p) => p.tests));
    return { ok: tests.every((t) => t.ok), tests, bots: parts[2].rows };
  }

  // each way of breaking the rules must be caught by the check
  const BREAKS = {
    noDryStop: { why: 'crops grow in dry soil', on() { F.BUG.noDryStop = true; }, off() { delete F.BUG.noDryStop; } },
    frameTimer: { why: 'crops grow per frame, not per second', on() { F.BUG.frameTimer = true; }, off() { delete F.BUG.frameTimer; } },
    forgetWater: { why: 'the save forgets the wet soil', on() { F.BUG.forgetWater = true; }, off() { delete F.BUG.forgetWater; } },
    noRescue: { why: 'no free seeds when you are stuck', on() { F.BUG.noRescue = true; }, off() { delete F.BUG.noRescue; } },
    lazyFroggy: { why: 'Froggy never sells anything', on() { F.BUG.lazyFroggy = true; }, off() { delete F.BUG.lazyFroggy; } },
    cheapMelon: { why: 'watermelons sell for less than their seeds', on() { F.CROPS.melon.price = 4; }, off() { F.CROPS.melon.price = 15; } },
    goldBokChoy: { why: 'bok choy pays three times the rest', on() { F.CROPS.bokchoy.price = 20; }, off() { F.CROPS.bokchoy.price = 6; } },
    pricyField: { why: 'more field costs 400 coins', on() { F.UPGRADES.row1.cost = 400; }, off() { F.UPGRADES.row1.cost = 25; } },
    slowMelon: { why: 'watermelons take 3 minutes', on() { F.CROPS.melon.grow = 180; }, off() { F.CROPS.melon.grow = 34; } },
  };
  function fails() {
    const cases = [];
    for (const [id, b] of Object.entries(BREAKS)) {
      b.on();
      let r;
      try { r = all(); } catch (e) { r = { ok: false, tests: [{ ok: false, test: 'crashed: ' + e.message }] }; } finally { b.off(); }
      const caughtBy = r.tests.filter((t) => !t.ok).map((t) => t.test);
      cases.push({ break: id, why: b.why, caught: !r.ok, by: caughtBy.slice(0, 2).join(' | ') });
    }
    const clean = all();
    return { ok: cases.every((c) => c.caught) && clean.ok, cases, cleanAfter: clean.ok };
  }

  F.check = { all, fails, bot, timers, saving, prices };
})();
