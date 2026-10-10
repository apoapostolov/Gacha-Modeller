<!-- markdownlint-disable MD033 -->

<div align="center">

  <h1>Gacha Modeller</h1>

  <p>Probability mechanics, economy scenarios and baseline/candidate analysis.</p>

  <p>
    <a href="#analysis-capabilities"><img src="https://img.shields.io/badge/Type-Web%20app-555" alt="Type: Web app"></a>
    <a href="./package.json"><img src="https://img.shields.io/badge/Language-TypeScript-555" alt="Language: TypeScript"></a>
    <a href="https://github.com/apoapostolov/Gacha-Modeller/releases/latest"><img src="https://img.shields.io/github/v/release/apoapostolov/Gacha-Modeller" alt="Latest stable release version"></a>
    <a href="https://github.com/apoapostolov/Gacha-Modeller/releases/latest"><img src="https://img.shields.io/github/release-date/apoapostolov/Gacha-Modeller?display_date=published_at&amp;label=last%20release" alt="Published date of latest stable release"></a>
    <a href="./LICENSE"><img src="https://img.shields.io/badge/License-MIT-green" alt="License: MIT"></a>
  </p>

</div>

![Gacha Modeller lab after a seeded banner simulation, with cost distribution and summary measures](docs/gacha-modeller-hero.png)

Gacha Modeller is a local analysis workbench for banner, lootbox and digital-pack models. Immutable baseline/candidate snapshots support reproducible comparisons of acquisition distributions, resource consumption and calendar-based cash contribution. Completion, subjective reward utility and assumed activity remain distinct outcomes.

## Analysis capabilities

The [company workbench guide](docs/company-workbench.md) describes model authoring, imports, comparison and replay. The [development checklist](DEVELOPMENT.md) tracks delivery and external evidence gates. The [M4 contract](docs/milestone-4.md) covers mathematical analysis; the [M5 contract](docs/milestone-5.md) covers financial conventions and synthetic economy scenarios.

- **Acquisition mechanics:** rarity priority, hard/soft pity, featured and selected-target protection, exchanges and scoped progress.
- **Pack and duplicate rules:** slot quantities, distinct-item sampling, shared-item packs, copy caps, salvage and crafting.
- **Probability distributions:** completion, mean consumption, population attainment percentiles, incomplete pursuits and common-axis curves.
- **Mathematical checks:** supported exact solvers, explicit fallbacks, sampling intervals and paired differences.
- **Player groups and parameter experiments:** declared starting progress, fixed population shares, bounded grids and validation seeds.
- **Economy and calendar scenarios:** origin-separated wallets, cash payments, offers, subscriptions, grants, refunds, availability and season migrations.
- **Policy and utility assumptions:** non-paying, budget-limited, goal-oriented and saving populations; hard affordability/time limits; item upgrade curves and roster coverage.
- **Sensitivity and evidence:** D7/D30/D90 and season-end outcomes, no-response and adverse cases, portfolio displacement and reconciled synthetic pilot fixtures.
- **Audit and replay:** source-labelled mechanics, individual trial journeys, complete aggregate ledgers and versioned project/comparison exports.

## Catalog

Studied presets follow a published or community-consensus shape. They are not licensed live tables.

| Preset | Shape |
| --- | --- |
| Genshin-like Character | 0.6% / 90, soft ramp from 74, 50/50 capturing, spark 180 |
| Blue Archive-like Spark | 0.7% pickup, 200-point spark, leftover bar survives a natural hit |
| Blue Archive-like Charge | JP 5.5: 100 = 50% pickup 3-star, 200 = pickup, hit resets |
| FGO-like Story Banner | 1% SSR, 80% on the rate-up, featured pity at 330 |
| Independent Crate | 0.64% covert, no pity |
| 1% + Hard Pity 100 | Teaching control |

Pool Share, Collection Heat and Audience Spark are original models. Engine semantics are documented in [the methodology](docs/methodology.md); Blue Archive-like charge and spark shapes are described in [the recruitment study](docs/blue-archive-recruitment.md).

## Local development

```bash
cd Gacha-Modeller
npm install
npm test
npm run dev
```

The development server runs at http://127.0.0.1:3018/. A fixed seed, immutable models, settings and engine version reproduce the same result. The [synthetic economy fixture](docs/fixtures/company-economy.json) provides a complete Milestone 5 example.

## Limits

- Local-only storage, with no accounts, telemetry or live game configuration feeds.
- Economy outputs use synthetic assumptions. Company finance approval, an approved pilot and behavioural calibration remain pending.
- Cash contribution excludes statutory revenue recognition, fixed costs, discounting and cash-out liabilities.
- Calendar events operate on local civil days; intraday sessions, automatic churn and causal engagement models are outside the current contract.
- Exact analysis supports bounded model shapes; other cases use simulation with an explicit explanation.

## License

MIT. Copyright 2026 Apostol Apostolov.
