# Changelog

## [Unreleased]

- Run controls now use a scrolling drawer with a fixed action footer. Long technical explanations use accessible custom help panels; short descriptions stay visible.
- Added a local company workbench with immutable baseline/candidate snapshots, revision history, canonical hashes, strict versioned imports and portable project backups.
- Added a validated model editor for catalogues, rates, pity, featured/charge rules, exchange effects, packs and original modifiers.
- Comparisons now run in cancellable workers with progress and protection against stale responses, using deterministic per-trial/per-event streams.
- Added baseline/candidate outcome tables and population attainment/survival plots on common axes, plus replayable comparison exports.
- Retained guild, collection-heat and two-pickup lessons as explicitly separate worker scenarios. Added [banner and pack workflow fixtures](docs/company-workbench.md).

- Added a [seven-milestone development checklist](DEVELOPMENT.md) based on the company research and blueprint.
- Added model/run validation with field-specific errors and explicit rarity-priority warnings.
- Added completion rates, termination reasons, population attainment percentiles and conditional completed-goal summaries.
- Added whole-pack execution with minimum-tier guarantees and separate purchased-pull/first-attainment reporting.
- Shop exchanges now preserve draw protection by default; models can declare their reset effects.
- The lab now exposes seed, horizon and action controls, validates errors and exports reproducible local JSON results. Currency consumption is labelled separately from revenue.
- The sample tape now uses an explicit seed and follows the selected single/pack action.

## [1.0.0] - 2026-08-24

The lab's first stable presentation release. Its simulation rules and preset
catalog shipped in 0.1.0; this update gives the project a visual front door.

### Added

- The README now shows a real seeded lab run, including the catalog, outcome
  measures, and histogram, so readers can judge the tool before running it.

## [0.1.0] - 2026-08-24

First lab. You pick a banner, it runs the pulls, and you see the cost and the tail before a pool ships.

### Added

- A seeded Monte Carlo engine for rarity pity, 50/50 capturing, featured hard pity, spark shops, and Blue Archive-style charge checkpoints.
- Genshin-like and FGO-like studied banners, so you can set a 50/50 catch-up next to a straight rate-up.
- Blue Archive-like spark (200-point shop) and JP 5.5 charge (100 is a 50% pickup 3-star, 200 is the pickup, a hit resets). Dual pickups show the leftover-bank difference.
- An independent crate and a 1% + hard 100 control when you need a meaner or simpler baseline.
- Pool Share: four players, one 5-star bar.
- Collection Heat: missing stickers get heavier.
- Audience Spark: chat fills the spark bar without touching the base rate.
- A local Vite lab with histogram, cost, shop rate, a ten-pull tape, and those compares on the matching presets.

[1.0.0]: https://github.com/apoapostolov/Gacha-Modeller/releases/tag/v1.0.0
[0.1.0]: https://github.com/apoapostolov/Gacha-Modeller/releases/tag/v0.1.0
