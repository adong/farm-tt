#!/usr/bin/env node
/* TT Farm's headless check in node: node tools/check.js [--fails]
   The same code as game.check() / game.checkFails() in the page (js/check.js), on the same rules (js/rules.js). */
'use strict';
global.window = global;
const path = require('path');
for (const f of ['title', 'rules', 'check']) require(path.join(__dirname, '..', 'js', f + '.js'));
const C = FARM.check;
const t0 = Date.now();
const res = C.all();
console.table(res.tests.map((t) => ({ suite: t.suite, test: t.test, ok: t.ok ? 'ok' : 'FAIL', info: t.info.slice(0, 110) })));
console.log('Whole years played by bots (coins earned this year vs Froggy):');
console.table(res.bots);
let ok = res.ok;
if (process.argv.includes('--fails')) {
  const f = C.fails();
  console.log('Broken on purpose (each must be caught):');
  console.table(f.cases);
  ok = ok && f.ok;
}
console.log(ok ? `PASS (${((Date.now() - t0) / 1000).toFixed(1)} s)` : 'FAIL');
process.exit(ok ? 0 : 1);
