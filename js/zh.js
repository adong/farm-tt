/* 中文 for TT Farm: the words on the page, the toasts, the banners, the signs and the ? panel (Kit.lang, from kit/lang.js).
   The kids' names, Foxy and Froggy, and the game's name (TT FARM) stay in English on purpose. Kid-sized words:
   农场 farm, 种菜 planting veggies, 浇水 watering, 收获 harvest. */
(function () {
  const L = Kit.lang;
  L.keep(['TEDDY', 'TOMMY', 'Teddy', 'Tommy', 'TEDDY & TOMMY', 'TEDDY + TOMMY', 'TT', 'TT FARM', 'TT Farm', 'Claude Code',
    'FOXY', 'FROGGY', 'Teddy (1P)', 'Tommy (2P)', 'TEDDY (1P)', 'TOMMY (2P)', 'Esc', '?', 'Shift', 'Space', 'Enter']);

  const SEASON = { SPRING: '春天', SUMMER: '夏天', AUTUMN: '秋天', WINTER: '冬天' };
  const GOOD = { 'BOK CHOY': '小白菜', RICE: '稻子', WATERMELON: '西瓜', EGG: '鸡蛋', MILK: '牛奶', WOOL: '羊毛', COW: '奶牛', SHEEP: '小羊', CHICKEN: '小鸡', 'MORE FIELD': '更多田地' };
  const TREAT = { 'ICE CREAM': '冰淇淋', WATER: '水', JUICE: '果汁', COOKIE: '饼干', WATERMELON: '西瓜', BANANA: '香蕉' };

  L.add(Object.assign({}, SEASON, GOOD, {
    // title
    'Plant, water and harvest! Feed the animals and sell at the market.': '种菜、浇水、收获！喂小动物，去市场卖东西。',
    '1 player · key 1': '1 个人玩 · 按 1',
    '1 player · key 2': '1 个人玩 · 按 2',
    '2 players, one farm · key 3': '2 个人，一个农场 · 按 3',
    'free seeds, wet soil': '种子免费，土一直湿',
    'seeds cost coins': '种子要花金币',
    'NEW FARM': '新农场',
    'SURE? TAP AGAIN': '真的吗？再点一下',
    'walk': '走路',
    'plant · water · pick · feed · sell': '种菜 · 浇水 · 收获 · 喂 · 卖',
    'next seed': '换种子',
    'easy': '简单',
    'Tap a plot to plant, water and pick. Tap the animals to feed them and Foxy\'s market to sell. Your brother\'s face calls him to water the whole field.':
      '点一块地就能种菜、浇水、收获。点小动物喂它们，点 Foxy 的市场卖东西。点哥哥或弟弟的脸，叫他来给整片地浇水。',
    'LOADING THE FARM…': '农场准备中…',
    'Difficulty': '难度',
    '🐣 EASY': '🐣 简单',
    '🔥 NORMAL': '🔥 普通',

    // the HUD
    'FREE': '免费',
    'EMPTY': '空的',
    'HIGH FIVE': '击掌',
    'Pause (P)': '暂停 (P)',
    'Sound (M)': '声音 (M)',

    // pause, results
    'PAUSED': '暂停',
    'Your farm is saved.': '你的农场已经存好了。',
    '▶ PLAY': '▶ 继续',
    '◀ MENU': '◀ 菜单',
    'P or Esc to play · Q for the menu': '按 P 或 Esc 继续 · 按 Q 回菜单',
    'HARVEST FAIR!': '丰收大集！',
    '▶ PLAY AGAIN': '▶ 再玩一次',
    'next year, same farm': '明年，还是这个农场',
    'Enter or Space: next year · Esc: menu': 'Enter 或空格：明年 · Esc：菜单',
    '🐸 FROGGY': '🐸 FROGGY',
    'YOU': '你',
    'FROGGY WINS THIS YEAR!': 'FROGGY 今年赢啦！',
    'FROGGY WINS THIS YEAR! TRY AGAIN!': 'FROGGY 今年赢啦！再试一次！',

    // hints and toasts
    'Tap a plot to plant! 🌱': '点一块地来种菜！🌱',
    'Walk to a plot and press Space! 🌱': '走到一块地上，按空格！🌱',
    'Walk to a plot. Teddy: Space · Tommy: Enter': '走到一块地上。Teddy：空格 · Tommy：Enter',
    'TAP A PLOT! 🌱': '点一块地！🌱',
    'WALK TO A PLOT FIRST! 🌱': '先走到一块地上！🌱',
    'FOXY: FREE SEEDS FOR YOU! 🎁': 'FOXY：送你免费的种子！🎁',
    'SELL AT THE MARKET FOR COINS!': '去市场卖东西换金币！',
    'FOXY: MY FAVOURITE! ⭐ x2': 'FOXY：我最喜欢这个！⭐ x2',
    'FOXY: THANK YOU!': 'FOXY：谢谢你！',
    'YOUR BASKET IS EMPTY 🧺': '篮子是空的 🧺',
    'PICK SOME VEGGIES FIRST!': '先去收获蔬菜吧！',
    'A NEW COW! 🐄': '来了一头奶牛！🐄',
    'A NEW SHEEP! 🐑': '来了一只小羊！🐑',
    'MORE FIELD! 🌱': '田地变大啦！🌱',
    'A NEW FARM! 🌱': '新农场！🌱',
    'HIGH FIVE! ✋': '击掌！✋',
    'THE WHOLE FIELD IS WET! 💧': '整片地都浇好水啦！💧',
    '🌧️ RAIN! THE FIELD IS WET!': '🌧️ 下雨啦！地都湿了！',
    '🥬 BOK CHOY GROWS FAST!': '🥬 小白菜长得快！',
    '🍉 WATERMELONS GROW FAST!': '🍉 西瓜长得快！',
    '🌾 RICE GROWS FAST!': '🌾 稻子长得快！',
    '🥬 BOK CHOY LIKES THE COLD!': '🥬 小白菜不怕冷！',

    // signs in the 3D farm
    'MARKET': '市场',
    "FROGGY'S FARM": 'FROGGY 的农场',
  }));

  L.rule(/^YEAR (\d+)$/, '第 $1 年');
  L.rule(/^(.+) (SPRING|SUMMER|AUTUMN|WINTER)(!?)$/, (m, e, s, x) => `${e} ${SEASON[s]}${x ? '！' : ''}`);
  L.rule(/^TT FARM: YEAR (\d+) · (\S+) (SPRING|SUMMER|AUTUMN|WINTER) · 🪙 (\d+)$/, (m, y, e, s, c) => `TT FARM：第 ${y} 年 · ${e} ${SEASON[s]} · 🪙 ${c}`);
  L.rule(/^CALL (TEDDY|TOMMY)$/, '叫 $1');
  L.rule(/^(TEDDY|TOMMY|TEDDY \+ TOMMY) 🧺 (\d+)$/, '$1 🧺 $2');
  L.rule(/^(\S+) SEEDS COST (\d+) 🪙$/, '$1 种子要 $2 🪙');
  L.rule(/^(\S+) FOOD COSTS (\d+) 🪙$/, '$1 的饲料要 $2 🪙');
  L.rule(/^(\S+) YUM! COME BACK SOON!$/, '$1 好吃！等一下再来！');
  L.rule(/^(\S+) (MORE FIELD|COW|SHEEP): (\d+) 🪙$/, (m, e, n, c) => `${e} ${GOOD[n]}：${c} 🪙`);
  L.rule(/^(\S+) (ICE CREAM|WATER|JUICE|COOKIE|WATERMELON|BANANA) FROM (TEDDY|TOMMY)!$/, (m, e, t, who) => `${e} ${who} 送来的${TREAT[t]}！`);
  L.rule(/^(TEDDY|TOMMY) SAYS: I'LL WATER THE WHOLE FIELD!$/, '$1 说：我来给整片地浇水！');
  L.rule(/^FOXY WANTS (\S+): DOUBLE COINS!$/, 'FOXY 想要 $1：双倍金币！');
  L.rule(/^(TEDDY|TOMMY|TEDDY & TOMMY) WINS? THE BLUE RIBBON!$/, '$1 赢得蓝丝带！');
  L.rule(/^NEW BEST YEAR! 🏆 🪙 (\d+)$/, '新纪录！🏆 🪙 $1');
  L.rule(/^BEST YEAR: 🪙 (\d+)$/, '最好的一年：🪙 $1');
  L.rule(/^🧺 (\d+) SOLD AT THE MARKET$/, '🧺 在市场卖了 $1 样');
  L.rule(/^TEDDY 🧺 (\d+) · TOMMY 🧺 (\d+)$/, 'TEDDY 🧺 $1 · TOMMY 🧺 $2');
  L.rule(/^= (\d+) 🪙$/, '= $1 🪙');
  L.rule(/^(\d+) 🪙$/, '$1 🪙');

  // the ? panel
  L.add({
    'plant · water · pick · feed · sell · buy': '种菜 · 浇水 · 收获 · 喂 · 卖 · 买',
    'call your brother · high five': '叫哥哥或弟弟 · 击掌',
    'title: Teddy · Tommy · both · easy': '标题页：Teddy · Tommy · 两个人 · 简单',
    'Playing alone, all the keys work, and T calls your brother as often as you like: he waters the whole field. Two players share one farm, and T is a high five.':
      '一个人玩时所有按键都能用，按 T 随时叫哥哥或弟弟，叫多少次都行：他会给整片地浇水。两个人一起玩同一个农场，按 T 击掌。',
    "Tap a plot, an animal or the market: you walk there and do the right thing. Tap a seed to pick it. Tap your brother's face to call him.":
      '点一块地、一只小动物或市场：你会走过去做对的事。点种子来选种子。点哥哥或弟弟的脸叫他来。',
  });
})();
