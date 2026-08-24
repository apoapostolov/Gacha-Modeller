# Methodology

Gacha Modeller treats a banner as a probability machine with optional pity, featured capturing, a spark shop, and a small set of social or marketing modifiers. Every trial is a seeded Monte Carlo run of that machine. The lab does not scrape live game APIs and does not claim licensed drop tables.

## Pull sequence

1. Increment the featured-since counter (also the recruitment charge).
2. If a charge hard checkpoint is due (Blue Archive-like 200), grant this banner's pickup.
3. If charge is exactly at the mid checkpoint (100), force that rarity and roll the mid featured chance (50%). A miss does not capture.
4. If a featured hard pity is due (FGO-like 330), grant the featured item and stop the roll.
5. Check rarity hard pity from highest ranked rarity to lowest.
6. Roll a unit interval against stacked effective rates. The last rarity is the filler (remainder).
7. If the hit rarity has a featured rule, roll featured vs standard. A lost roll can arm capturing for the next hit of that rarity.
8. Pick a weighted item from the chosen sub-pool. Collection heat multiplies unowned weights.
9. Reset the hit rarity counter (and any `resetAlso` counters). Increment the others.
10. Add `1 + audienceSparkPerPull` to the spark bar. This banner's pickup zeros charge. Off-banner hits do not.

Soft pity is a linear ramp: at pull `n` of a cycle, `rate = min(1, base + (n - softStart + 1) * softStep)` once `n >= softStart`. The Genshin-like preset uses base 0.6%, `softStart` 74, `softStep` 6%, hard 90. That is the community-consensus ramp, not an official closed form.

## Goals

| Goal | Stop when |
| --- | --- |
| First featured | Inventory holds at least one featured item |
| Copies `n` | Featured count reaches `n` |
| Unique featured `n` | Distinct featured ids owned reaches `n` |
| Budget `p` | Exactly `p` pulls have been taken |
| Collection | Every item id in the banner has dropped once |

Spark policy `if-needed` buys the featured from the shop when the spark bar is full and the goal still needs a featured item. Policy `never` ignores the shop. Spark is an exchange, not an extra pull, so the pull count stays at the bar cost.

## Studied models

Studied presets are *like-models*. They encode a published or community-consensus shape (base rate, pity cap, capturing, spark) so you can compare systems. They are not dumps of a live banner.

- **Genshin-like Character.** 0.6% / 90, soft ramp from 74, 50/50 with capturing, 4-star pity 10, spark 180.
- **Blue Archive-like Spark / Charge.** 0.7% pickup, 3% 3-star. Spark is the old 200-point shop. Charge is JP 5.5: 100 = 50% pickup 3-star, 200 = pickup, hit resets, same-type banners share the bar. [blue-archive-recruitment.md](blue-archive-recruitment.md).
- **FGO-like.** 1% SSR, 80% of SSR hits are the rate-up, no capturing, featured pity at 330.
- **Independent crate.** No pity. Covert 0.64%. The long-tail control.
- **1% + hard 100.** Teaching control. Geometric with a cap, so the mean falls below 100.

## Original models

These are design proposals, labelled `original` in the catalog.

### Pool share

A group shares one high-rarity pity sequence. The marketing line is "pull together." The measurable effect at a fixed total pull count: leftover pity is wasted once, not once per player. N solo cycles of 90 pulls throw away N fragments of a 90-pity bar. One shared sequence of 360 pulls does not. The comparison panel reports mean featured hits shared vs solo, plus leftover pity wasted by the solo group.

The fairness cost is separate: the copy still lands on whoever rolled the hit unless you add a claim or split rule. That rule is not in v0.

### Collection heat

Every item starts equal. Unowned ids get `weight * (1 + heat)`. Completing the album is the product. Heat cuts the duplicate tax at the end of a set without advertising a pity timer. The lab runs the same pool at heat 0 as a cold control.

### Audience spark

Each pull fills `1 + audienceSparkPerPull` spark ticks. Viewers subsidise the tail without touching the base rate. A 180 spark with +0.25 per pull buys at 144 if the featured never dropped. The overlay is the marketing: watching is contribution, pulling is public.

## What this does not model yet

- Session time, login calendars, or first-time buyer packs
- UI framing, rarity animation, or sunk-cost presentation
- Trade-after-reveal or claim votes on a shared drop
- Legal classification of lootboxes in any jurisdiction
- Live rate tables, capture-radiance patches, or regional banner differences

Add a preset when you have a cited shape. Keep original mechanics in the original family so the catalog does not pretend they shipped.

## Reproducibility

`mulberry32(seed)` is the only RNG. `runMonteCarlo` and `simulatePoolShare` take an explicit seed. The UI uses seed `20260823`. Engine tests pin pity, capturing, spark, and the mean windows for the studied presets.
