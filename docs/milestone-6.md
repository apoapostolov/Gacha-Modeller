# Milestone 6: modular library and company evidence

The local synthetic workflow covers evidence contracts, editable aggregate extracts, training estimates, future holdout errors, experiment diagnostics and executive decision records. Real company approval, per-item production-state adapters and a second commercial decision remain open gates.

## Directory contract

`projects/<section-id>/section.json` defines a section. Every other `.json` file directly in that folder is a complete project envelope. The local service scans the directory on each library read; adding or reordering folders requires **Refresh library**, without a frontend build. Nested arbitrary code or plugins are not executed.

```json
{
  "format": "reward-model-section",
  "version": 1,
  "id": "cosmetics",
  "title": "Cosmetic loot boxes",
  "description": "Cosmetic collections and box layouts.",
  "order": 20
}
```

Folder ids contain lowercase letters, numbers and hyphens, with a maximum of 64 characters. Metadata ids match their folder. Titles, descriptions and ordering drive the library interface. Invalid metadata, JSON, model hashes, unsupported formats and duplicate identities produce visible diagnostics; valid neighboring projects remain available. Project imports retain the 5 MB limit.

The source of saved projects is the directory. Browser storage contains only selection/migration preferences and preserved legacy recovery bytes. **Import browser projects** copies existing browser projects to Workspace and records completed migrations without erasing the old library. Workspace project JSON is ignored by Git by default. Export remains available for portable backups and unsaved work.

Writes validate complete projects, serialize within the local service, compare a content revision, and write a temporary replacement plus previous-save `.backup`. External edits, removed/invalid files, duplicate identities and symbolic links are rejected. A conflict retains the browser's unsaved project for export. Refresh reads current files and resets local run/editor fields. Backups are not loaded automatically: preserve current work, restore the desired backup as the project JSON, then validate and refresh. Use one local service for a directory; concurrent external programs must coordinate their writes. The revision check is not an operating-system-wide transaction lock.

`npm run dev`, `npm run preview`, and `npm start` share the API. Production use requires `npm run build` before `npm start`. Port 3018 is fixed and bound to loopback. Host/origin checks and a custom JSON mutation header reject cross-origin writes. A static-only deployment has no filesystem service and reports that limitation. Hosted accounts and network exposure remain outside the local charter.

## Project authoring skill

The versioned [authoring skill](../skills/reward-project-authoring/SKILL.md) is also installed locally as `reward-project-authoring`. Its CLI creates a fresh project identity from a validated model or project; it never overwrites an input or invents snapshot hashes.

```powershell
npm run project:create -- --input C:/path/model.json --section workspace --name "Cosmetic collection study"
npm run project:create -- --input C:/path/model.json --section equipment --section-title "Equipment collections" --section-description "Equipment reward studies"
npm run project:create -- --validate
```

`scripts/seed-projects.ts` documents generation of the shipped examples. Its exclusive writes intentionally prevent accidental re-seeding over edits. The internal `src/presets` registry remains a reference for engine tests and historical lessons; it no longer determines sidebar projects or sections.

## Named game studies

These projects use dated rule shapes and synthetic inventories. They are not replicas of October 2026 live services.

| Project | Supported study | Explicit boundary |
| --- | --- | --- |
| Overwatch-like legendary cosmetic box | Four slots, one fixed legendary tier, within-tier unowned-item protection, collection goal, one earned box per complete action | Remaining-slot rates are synthetic. Regular-box epic/legendary counters, bonus-box overflow, current catalog and season auto-opening are not reproduced. |
| Fortnite-like revealed X-Ray llama | Fixed known schematic, hero and materials; target checklist; earned ticket cost | Save the World offer, not Battle Royale. Content inspection, offer rotation and inspect/skip choice policies are not simulated. |
| Fortnite-like historical blind llama | Random synthetic pack used as a historical contrast | Historical pre-reveal example, not an assertion about current paid llama availability. |
| Synthetic collectible card pack | Five slots, rare-or-better floor, finite collection, copy cap, salvage and crafting | Original design without licensed card probabilities or secondary-market valuation. |

Blizzard's [February 2025 patch notes](https://overwatch.blizzard.com/en-gb/news/patch-notes/live/2025/02/) describe four items, a rare-or-better minimum, an epic within five regular boxes, a legendary within twenty, and a separate legendary-box guarantee. Their occurrence rates are measured per box; applying those percentages to each slot would change the model. The shipped example uses only the legendary-box shape. The indexed official notes supplied these facts; direct retrieval returned HTTP 403 during verification.

Epic's [January 2019 X-Ray announcement](https://www.fortnite.com/news/loot-unboxing) describes contents revealed before selection and category-specific duplicate prevention. Its [March 2022 store change](https://www.fortnite.com/news/changes-to-save-the-world-store-and-llama-shop) removes V-Buck/real-money llama purchases in favor of earned X-Ray Tickets. The examples distinguish the revealed offer from the earlier blind opening and do not invent a Battle Royale paid loot-box store.

## Company section

The shipped company pilot combines the M5 synthetic economy with version-5 project evidence. Every project can attach its own company evidence through the **Company evidence** workspace module. **Company settings** edits ownership, contribution definitions, temporal boundaries, generator assumptions, raw CSV, field mapping, experiment criteria and decision narratives. Valid evidence contracts can be saved while quality diagnostics block interpretation. Invalid contracts/mapping headers leave the draft available for correction and do not replace the saved evidence.

Changing generator fields does not secretly change the extract. **Regenerate synthetic extract** explicitly replaces the draft CSV and resets its header mapping. The generated data remains synthetic. Contributions are independently generated illustrative amounts, including large contributors; they are not fitted game-revenue predictions. Generation is bounded to 20–2,000 independent groups and 1–180-day horizons. A/A generation removes the candidate response.

## Local aggregate schema

There is one aggregate row per independent assignment group and period. This first adapter uses a stable panel across training, holdout and experiment. It is not a universal production telemetry schema.

| Fields | Meaning |
| --- | --- |
| `eventId`, `unitId`, `cohort` | Aggregate identity, independent assignment group, stable cohort identity |
| `period`, `arm` | training/holdout/experiment; baseline/candidate |
| `assigned`, `exposed` | Recorded allocation and exposure, represented as true/false or 1/0 |
| `startDay`, `endDay`, `receivedDay` | Inclusive observation window and extract arrival in one shared calendar |
| `eligibleDays`, `activeDays`, `purchaseDays` | Eligible group-days, active group-days, active days with purchases |
| `netMinor` | Authoritatively supplied contribution in hundredths of the declared currency; may be negative |
| `openingMinor`, `creditsMinor`, `debitsMinor`, `closingMinor` | Provided wallet balance and movements in minor currency units |
| `openingItems`, `awardedItems`, `closingItems` | Provided item-count conservation, without consumption in this adapter |

Headers can be renamed using the explicit mapping. CSV supports UTF-8 BOM, quoted commas/newlines and escaped quotes; no spreadsheet formulas execute. Limits are 2 MB and 10,000 rows. Whole values are bounded; non-contribution amounts cannot be negative. Attendance cannot exceed eligible days, purchases cannot exceed active days, and dates must be consistent.

Identical event duplicates are removed. Conflicting duplicates, repeated group-period aggregates, changing cohort identities, exposure without assignment, missing panel assignments, missing exposure, insufficient independent groups, late/unavailable rows and incomplete mature horizons block interpretation. Training must end before holdout, and holdout must end before the experiment. Wallet and item aggregates must conserve their declared opening/movements/closing values. The adapter verifies those identities, not taxes, true finance authority, individual rewards or protection counters. Per-item production-state reconstruction remains an open M6.3 task.

Approval and preregistration fields are local declarations. This prototype does not authenticate an approver or prove that criteria were immutable before outcomes. A production review/assignment service is an M7 integration. A company extract with pending approval blocks interpretation; a synthetic record cannot authorize proposed adoption even if numerical criteria pass.

## Calibration and experimentation

Training-only attendance is active-days/eligible-days. Purchase frequency is purchase-days/eligible-days. Future holdout errors are holdout minus training in percentage points, by cohort. **Apply training estimates** changes attendance and conditional purchase willingness in one explicitly selected economy policy; it does not fit finance, reward response, budgets, excitement or retention. Policy affordability/time constraints can prevent the simulation from reproducing an empirical frequency. Further residual calibration requires company data and agreed targets.

Experiment outcomes include every assigned group, including groups without exposure, while missing exposure blocks inference. The allocation diagnostic is an exact two-sided binomial probability-ordering test at p < 0.001. Microsoft Research's [SRM study](https://www.microsoft.com/en-us/research/publication/diagnosing-sample-ratio-mismatch-in-online-controlled-experiments-a-taxonomy-and-rules-of-thumb-for-practitioners/) supports treating an unexplained allocation mismatch as an evidence-quality issue before product decisions; the local threshold and implementation are declared design choices.

The fixed seed drives 1,000 independent within-arm group bootstrap replicates and percentile 95% intervals for contribution and attendance differences. Group identities are supplied by the extract; the app does not infer household/account dependence. These are exploratory fixed-horizon diagnostics, not guaranteed heavy-tail coverage. A pooled-p95 cap is a separate tail sensitivity. The raw estimate and interval remain primary. The share of positive contribution from the highest 5% is reported, with an alert above 25%.

Declared criteria require the raw contribution lower interval bound to exceed the minimum improvement, the attendance lower bound to stay within the allowed loss, and the p95-capped difference to exceed the improvement. Every quality gate must pass. A/A alerts when a contribution or attendance interval excludes zero; absence of such an alert does not certify the pipeline. Multiple comparisons, optional stopping, rare-event coverage and unobserved dependence require a separate plan.

The planning population uses `(1.96 + 0.8416)^2 × assumedSD^2 / (minimumUplift^2 × allocation × (1-allocation))`, rounded up. This is a normal-approximation 80%-power planning estimate for one fixed two-sided 95% test. The assumed standard deviation and independent groups are inputs, not properties established by the current sample.

## Decision export and acceptance

Version-1 decision records include baseline/candidate SHA-256 hashes, complete evidence and its hash, recomputed diagnostics, alternatives, constraints, unresolved questions, rationale and next experiment. A synthetic or blocked requested adoption exports as **hold**. A company adoption proposal requires approved evidence, passing quality/criteria and nonempty rationale/next experiment. It remains a proposal, not a deployment operation.

The [browser-exported reference](company-reference.json) contains 100 independent groups and 300 period aggregates. Its contribution difference is USD 1.1978, with a USD -5.0694 to 8.1896 interval. Attendance differs by 2.7143 percentage points. Allocation p = 1; the outcome is inconclusive. `node --experimental-transform-types scripts/company-reference.ts` verifies the export exactly against the saved evidence. This is workflow validation, not company uplift.

The implementation is split into directory contracts, a local file service, project persistence, pure extract/calibration/experiment/decision modules and UI components. Interface passes provide descriptive field mapping, visible purpose paragraphs, bounded hover/focus help, workspace module navigation, focused errors, keyboard-scrollable tables and a narrow-layout drawer.

Remaining acceptance gates: an actual pilot owner, lawful company data/contribution approval, a reviewed raw-event/protection-state adapter, calibrated real behavioural evidence and repeat value from a second company decision. Specialist production/market/gambling adapters remain M7.
