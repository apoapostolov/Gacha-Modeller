# Gacha Modeller

Local Monte Carlo lab for gacha banners, lootbox crates, and the social tricks that sit on top of a pity bar.

<!-- trophy-proof: screenshot of the lab after a Genshin-like 8k-trial run (histogram + mean/p90 + spark rate). -->

Gacha copy talks in rates. Players live in tails. This app lets you encode a pool — studied like-models or a mechanic you invented — and see how many pulls, how much currency, and how often the spark shop actually saves someone.

## What you can do

- **Run a banner until the featured drops.** Mean, median, p90, and a histogram, from a seeded trial count you pick.
- **Put a cap on the tail.** Spark-if-needed buys the featured when the bar fills. Spark-never shows the raw distribution.
- **Compare a 50/50 with capturing against a straight rate-up.** Genshin-like and FGO-like sit in the same catalog so the shape difference is visible, not theoretical.
- **Use a no-pity crate as the control.** Independent covert odds, long tail, no hug at 90.
- **Share one pity bar across a guild.** Pool Share is an original mechanic: leftover pity is wasted once, not once per player.
- **Heat the missing stickers.** Collection Heat boosts unowned ids so completing a set is the product, not a side effect.
- **Let an audience fill the spark bar.** Viewers add progress per pull. The overlay is the marketing; the number is how much tail you subsidised.

## Catalog

Studied presets are like-models of published or community-consensus shapes. They are not licensed live tables.

| Preset | Shape |
| --- | --- |
| Genshin-like Character | 0.6% / 90, soft ramp from 74, 50/50 capturing, spark 180 |
| FGO-like Story Banner | 1% SSR, 80% on the rate-up, featured pity at 330 |
| Independent Crate | 0.64% covert, no pity |
| 1% + Hard Pity 100 | Teaching control |

Original presets are design proposals: Pool Share, Collection Heat, Audience Spark. Details and the math live in [docs/methodology.md](docs/methodology.md).

## Run it

```bash
cd /mnt/c/git-public/Gacha-Modeller
npm install
npm test
npm run dev
```

Open http://127.0.0.1:3018/. Pick a banner, set trials, run. The engine is deterministic from seed `20260823`.

## Limits

- No live game APIs. If a real banner changed last Tuesday, this lab does not know.
- No session calendars, first-time packs, or store UI. Those belong in a later player-time model.
- No legal opinion on lootboxes.

## License

MIT. Copyright 2026 Apostol Apostolov.
