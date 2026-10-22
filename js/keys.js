/* The keys the ? panel shows. Press ? (Shift + /) in the game, or tap the round ? button.
   The panel and the freeze live in the shared kit: kit/help.js (Kit.help). */
Kit.help.setup({
  title: FARM.TITLE, // the name lives in js/title.js
  cols: ['Teddy (1P)', 'Tommy (2P)'],
  keys: [
    ['walk', 'W A S D', '↑ ← ↓ →'],
    ['plant · water · pick · feed · sell · buy', 'Space', 'Enter'],
    ['next seed', 'Q or 1 2 3', 'Shift'],
    ['call your brother · high five', 'T', 'T'],
    ['pause · sound', 'P or Esc · M', ''],
    ['title: Teddy · Tommy · both · easy', '1 2 3 E', ''],
  ],
  note: 'Playing alone, all the keys work, and T calls your brother as often as you like: he waters the whole field. Two players share one farm, and T is a high five.',
  touch: 'Tap a plot, an animal or the market: you walk there and do the right thing. Tap a seed to pick it. Tap your brother\'s face to call him.',
});
