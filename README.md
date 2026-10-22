# TT Farm

[![TT Farm title screen](docs/screenshot.jpg)](https://adong.github.io/farm-tt/)

Press **?** any time (or tap the round **?** button on the left edge) to see the keys. The game waits while you look.
Tap the language button under it (the A文 icon) to switch between English and 中文; the dashboard and every game remember the choice.

**中文：** 在自己的农场里种菜、浇水、收获：种稻子、小白菜和西瓜，喂小鸡、奶牛和小羊，再去 Foxy 的市场卖掉换金币。春夏秋冬一年过完，就是丰收大集，看看谁赚得比隔壁的 Froggy 多。单人或双人。

A farm game for Teddy and Tommy: plant rice, bok choy and watermelons, water them, pick them when they're ripe, feed the chickens, the cow and the sheep, and sell it all at Foxy's market. A year is four seasons; at the end of winter comes the Harvest Fair, where you find out whether your farm earned more than Froggy's next door.
It's built with Claude Code from plain JavaScript and Three.js, on the shared Claude Games kit. There are no image, model or audio files: the farm, the animals and the brothers are made of boxes and balls, every texture is painted on a canvas, and every sound is synthesised.
The farm is saved as you play, so it's still there tomorrow: the crops in the ground, the coins, the field you bought and the animals.

The name lives in one constant, `FARM.TITLE` in `js/title.js`, and the page title, logo, the sign on the barn and the ? panel all follow it.

## Play

- **Double-click `index.html`.** It works offline because Three.js and the kit are copied into `kit/`. Without internet the title font falls back to Arial Black.
- **Send one file:** `dist/farm-tt.html` is the whole game in one page (about 830 KB). AirDrop or email it, then open it in a browser.
- Rebuild that file after any edit: `python3 kit/tools/bundle.py . --name farm-tt`

On the title screen, tap your face to play alone (**TEDDY** or **TOMMY**), or **TEDDY + TOMMY** for two players on one farm. Pick 🐣 **EASY** (the default) or 🔥 **NORMAL**. If there's a saved farm, the title shows it (year, season, coins) and you carry on where you left off; **NEW FARM** (tap twice) starts again.

## The farm

- **The field:** 8 plots to start with, 16 when you've bought both extra rows. Walk onto a plot and press Space (or just tap it), and you do the one thing that makes sense there: **plant** the seed you picked, **water** it 💧, or **pick** it 🧺 when it's ripe ✨. A ring and an icon over the plot show what Space will do.
- **The crops:** 🥬 bok choy (quick), 🌾 rice and 🍉 watermelon (slow, but worth the most). A crop only grows while its soil is wet: the soil darkens when you water it and dries as the crop drinks. A thirsty crop shows a 💧 and waits; nothing ever dies. Each crop grows in three steps you can see (sprouts, leaves, ripe), with a little seed-packet sign until it's ripe.
- **The seasons:** 🌸 spring, ☀️ summer, 🍂 autumn and ❄️ winter, a bit over a minute each. Each has a favourite crop that grows half as fast again, marked ⭐ on its seed: bok choy in spring, watermelons in summer, rice in autumn. In winter the snow comes, rice and watermelons grow at half speed and bok choy doesn't mind the cold. Spring has two rain showers and autumn one, which water the whole field. Summer sun dries the soil faster.
- **The animals:** walk to the trough and press Space to feed them (🌽 for the chickens, 🌿 for the cow and the sheep). A while later there's an 🥚, 🥛 or 🧶 to pick up. You start with the chickens; the cow and the sheep are bought at their signs.
- **Foxy's market:** walk to the counter and press Space to sell everything in your basket 🧺. Each season Foxy has a wish (⭐ on the chalkboard and in the basket bar) that pays double.
- **More field and more animals:** signs on the farm show what they cost. Walk to one with enough coins and press Space.
- **Froggy's farm** is over the fence. His coins float up every time he sells; his total is next to yours at the top of the screen.
- **The Harvest Fair:** at the end of winter the camera comes down to the field and the kids line up with Froggy. If your farm earned more this year, you win the blue ribbon 🎀 and do your signature move (Teddy's boxing and 🏀 jump shot, Tommy's ✌️ Y pose) with confetti; if not, Froggy hops for joy and you wave. Then the score (this year's coins, Froggy's, your best year) and **PLAY AGAIN**, which starts next year on the same farm.

| | Seeds (NORMAL) | Grows in (at 1×) | Sells for |
|---|---|---|---|
| 🥬 bok choy | 2 🪙 | 16 s | 6 🪙 |
| 🌾 rice | 3 🪙 | 24 s | 9 🪙 |
| 🍉 watermelon | 5 🪙 | 34 s | 15 🪙 |
| 🐔 chickens → 🥚 | food 1 🪙 | 12 s | 4 🪙 |
| 🐄 cow → 🥛 (buy: 18 🪙) | food 2 🪙 | 18 s | 7 🪙 |
| 🐑 sheep → 🧶 (buy: 24 🪙) | food 3 🪙 | 26 s | 10 🪙 |

More field costs 25 🪙 for the first row and 40 🪙 for the second. On EASY everything you buy is half price.

## Controls

| | Teddy (1P) | Tommy (2P) | Touch |
|---|---|---|---|
| walk | W A S D | ↑ ← ↓ → | tap where to go |
| plant · water · pick · feed · sell · buy | Space | Enter | tap the plot, the animal, the market or the sign |
| next seed | Q, or 1 2 3 | Shift | tap a seed |
| call your brother (1 player) · high five (2 players) | T | T | his face |
| pause · sound | P or Esc · M | | ❚❚ · 🔊 |

- **Playing alone**, all the keys work for you (WASD or the arrows, Space or Enter).
- **Two players** share one farm, one basket and one purse. Teddy's ring is yellow and Tommy's is cyan; the seed buttons show who has which seed. On an iPad a tap goes to whichever brother is nearer.
- **Title:** 1, 2 and 3 pick Teddy, Tommy or both, E switches EASY and NORMAL.

## Companion: call your brother

**Playing alone**, the other brother is your helper: Tommy for Teddy, Teddy for Tommy (`Kit.roster.buddyFor`). Call him with T, or tap the round button with his face, as often as you like.

- **He pops in** next to you at his `buddyScale`.
- **He says hi** with his signature move (Tommy's Y, Teddy's boxing) and tosses you a treat (🍦 💧 🧃 🍪 🍉 🍌): **"🍪 COOKIE FROM TOMMY!"**
- **Then he waters the whole field:** **"TOMMY SAYS: I'LL WATER THE WHOLE FIELD!"** He runs up and down every open row with his watering can, splashing each plot as he goes, then waves goodbye ("THE WHOLE FIELD IS WET! 💧"). Call him again while he's working and he says hi again and does another lap.
- When three or more crops are thirsty, his button glows and bounces.
- **Two players:** T is a high five ("HIGH FIVE! ✋") with a little confetti. It's just for fun.

**Foxy 🦊** runs the market, waves when you sell and gives free seeds if you're ever completely stuck (no coins, nothing growing, nothing to sell). **Froggy 🐸** farms next door and is who you race at the Harvest Fair.

## 🐣 EASY and 🔥 NORMAL

- 🐣 **EASY** (the default, for Tommy, 5): free seeds and free animal food, a watering lasts 40 seconds of growing (most crops need just one), upgrades are half price, the year is 5 minutes, and Froggy takes it slow (about 50 coins a year). At each new season your seed switches to that season's ⭐ crop.
- 🔥 **NORMAL** (for Teddy, 8): seeds and food cost coins, a watering lasts 12 seconds of growing (8.6 in summer), the year is 6 minutes, and Froggy earns about 216 coins a year. You start with 10 🪙.

## How it's tested

The rules (`js/rules.js`) and the check (`js/check.js`) have no Three.js in them, so the game and the headless check run the same code. Time on the farm is exact for any step size: a step is cut wherever a crop ripens or runs dry, a shower falls or a season ends.

```bash
node tools/check.js --fails
```

In the browser console the same is `game.check()` and `game.checkFails()`; `game.pageCheck()` checks the parts that need the page.

- **Crop timers:** every crop ripens on time (to 0.02 s) in every season on both levels; a crop in dry soil waits; one watering lasts exactly as long as it should; steps of 1/60 s, 1/7 s, 0.5 s, 3 s, 25 s and one 200 s step give the same farm; a crop planted at the end of spring carries on at summer's speed; spring rain waters every open plot and no locked one; the chickens lay on time and only once; the year is four seasons and then stands still; locked rows open only when bought.
- **Save and load:** a farm in the middle of things (crops, wet soil, animals eating, upgrades, a basket) comes back exactly, and carries on exactly like one that never stopped. Eight kinds of junk save load as nothing (a new farm) without a crash, and broken numbers and names (negative coins, a crop called pizza, NaN growth, water 7) are mended.
- **Prices balance:** every crop sells for more than its seeds and every animal's gift for more than its food; coins per second stay within 1.18× of each other on NORMAL; every season has a best crop; the market pays the basket exactly with the wish doubled; more field and new animals pay back in half a year; nobody gets stuck with no coins. Then bots play whole years: a quick Teddy-style bot beats Froggy by 30% or more and buys upgrades (588 vs 51 on EASY, 475 vs 216 on NORMAL), five so-so Teddy bots all still win on NORMAL (233 to 279 vs 216), five slow, wandering Tommy-style bots who never buy anything all win on EASY (60 to 120 vs 51), and a bot that naps all year loses.
- **Broken on purpose (`--fails`):** crops that grow in dry soil, crops that grow per frame instead of per second, a save that forgets the wet soil, no free seeds when stuck, a Froggy who never sells, watermelons cheaper than their seeds, bok choy worth three times the rest, more field for 400 coins, and watermelons that take three minutes. Each one must make the check fail, and each does.
- **In the page** (`game.pageCheck()`, and `game.pageCheck({ broken: true })` with a brother who skips every other plot, which fails): the brother waters the whole open field and goes again when called again, the farm comes back from localStorage exactly, a tap walks Tommy to a plot and plants it, and in two players T is a high five.
- **In the browser** (a server of `~/claude-games` on port 8864, muted): real key events for walking, Space, Enter, Q, Shift, 1 to 3, T, M, P and Esc in one and two players; real mouse clicks on a plot, a seed and the brother's button; a whole year to the Harvest Fair, won and lost; no console errors.
- **Every size, headless:** `tools/shoot.js` (headless Chrome, from TT BMX) at 1200 × 750, phone portrait (390 × 844, where the animals move behind the field and the market in front), phone landscape (740 × 360) and iPad (1024 × 768) with touch, checking that the kit's left-edge buttons cover no plot, trough, animal or the market. `dist/farm-tt.html` and `index.html` opened from `file://` boot, run and pass the checks, and the farm survives a reload.
- **English and 中文:** with `Kit.lang.set('zh')` a tour of every screen and message (title, NEW FARM, free seeds, not enough coins, empty basket, buying, feeding, the brother, the wish, rain, the new season, pause, the ? panel, the fair won and lost, two players) left `Kit.lang.untranslated()` at `[]`. In English, no Chinese characters on any screen (only the kit's language button, which names the language it switches to).

## Make it yours

- **`js/rules.js`** has every number worth changing at the top: the crops (seeds, price, grow time), the animals, the seasons (which crop each loves, the showers), what EASY and NORMAL change (season length, how fast soil dries, Froggy's pace) and the upgrades. Run `node tools/check.js` after editing; it says if a price got out of balance and how the bots do against Froggy.
- **`js/art.js`** builds everything you see: the crops for each stage (`bokchoy`, `riceTuft`, `melonPlant`), the animals, the barn, the market, the season colours (`PAL`) and the camera fit.
- **`js/game.js`** is the game: what Space does where (`doAction`), the brother's visit (`updateBuddy`), the Harvest Fair (`startFair`).

## Files

- `index.html`: the page, its styles and its screens.
- `js/title.js` the name · `js/rules.js` the farm's rules and saving · `js/check.js` the check and the bots · `js/art.js` 3D · `js/game.js` the game · `js/friends.js` Foxy and Froggy (copied from TT Rocket, which had them from TT Badminton) · `js/keys.js` the ? panel · `js/zh.js` 中文.
- `tools/check.js` the check in Node · `tools/shoot.js` and `tools/shots.json` screenshots with headless Chrome (`node tools/shoot.js tools/shots.json docs 1200 750` makes `docs/screenshot.jpg`).
- `kit/`: the shared kit, synced with `python3 ../kit/tools/sync.py .` (never edit it here).
- The farm is saved in the browser under `farmTT.farm`; the level and best year under `farmTT.prefs`.

## Not verified

- **Sound:** planting, watering, picking, the animals' noises, the market's coins, the season chime and the music are wired through `Kit.sound`, but every test ran muted and nobody listened.
- **Real touch devices:** taps were tried with a mouse in the browser and the layouts in headless Chrome at phone and iPad sizes; not under real fingers on an iPhone or iPad, or two kids on one iPad.
- **Real-time feel:** play was mostly driven with `game.step()`. Whether 75 to 90 seconds a season feels right, and whether a real 8-year-old beats Froggy on NORMAL (the bots say a so-so one does), needs the kids.
- **Performance on an iPad:** a full field with every animal is about 420 draw calls and 55,000 triangles; it wasn't run on a real iPad.
- **The iPad home-screen icon** and double-clicking from Finder weren't tried.
