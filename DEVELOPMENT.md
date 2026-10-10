# Development checklist

Updated 10 October 2026. This is the execution plan for the [company blueprint](docs/company-product-plan.md) and [implementation backlog](docs/company-implementation-backlog.md).

An item is checked only after its acceptance behaviour is implemented and verified. Larger milestones stay open while any required item is unfinished. Keep work local and preserve existing edits. Use supported declarative mechanics before adding custom code execution.

## Milestone 1: trustworthy simulation foundation

Goal: existing and company-authored models can run with explicit mechanics, validated inputs and honest completion reporting. Corresponds to A01-A04 and the first pieces of A07/A09.

- [x] M1.1 Validate model shape, numeric bounds, IDs, pools and mechanic references with field-specific diagnostics.
- [x] M1.2 Declare rarity precedence and diagnose soft-pity overlap without silently changing legacy presets.
- [x] M1.3 Validate run goals, seed, trial count, horizon and action mode before executing.
- [x] M1.4 Return goal achievement, termination reason and goal attainment time on every trial.
- [x] M1.5 Identify definitely impossible goals and avoid presenting truncated trials as successful acquisition.
- [x] M1.6 Report whole-population attainment/quantiles and distinguish attempts from completed-goal samples.
- [x] M1.7 Separate shop exchange effects from forced-draw resets, with explicit optional exchange-reset rules.
- [x] M1.8 Execute fixed-size packs with an at-least-one minimum rarity, seeded outcomes and atomic purchase semantics.
- [x] M1.9 Expose seed, horizon and single/pack action controls with validation/errors and completion evidence in the lab.
- [x] M1.10 Export a local result bundle recording exact model, goal, controls and seed.
- [x] M1.11 Verify regression fixtures, all preset tests, TypeScript, production build and browser behaviour.

M1 pack scope: repeated slots with replacement, one declared minimum-tier guarantee, full pack purchase, no batch discount. Correlated slot layouts, quantities and no-replacement packs remain in M3. Probability validation is structural plus conservative diagnostics; exhaustive reachable-state validation remains in M3/M4.

## Milestone 2: author, save and compare company models

Goal: import a baseline, fork a candidate, edit supported rules and compare reproducible outputs without editing application code. Corresponds to A05-A07/A09/A11.

- [x] M2.1 Versioned project/model schemas and legacy import adapter.
- [x] M2.2 Immutable baseline/candidate snapshots, semantic diffs and canonical content hashes.
- [x] M2.3 Local project persistence, backup and import/export with clear unsupported-field errors.
- [x] M2.4 Catalogue, rates, pity, featured, exchange and pack editor with live validation.
- [x] M2.5 Worker jobs, progress, cancellation and protection against stale results.
- [x] M2.6 Reproducible per-trial/per-event random streams independent of worker scheduling.
- [x] M2.7 Baseline/candidate CDF and survival views with common scales and population denominators.
- [x] M2.8 Portable comparison report with replay manifest and assumptions.
- [x] M2.9 Complete the import/fork/edit/run/compare/export workflow for a banner and a pack fixture.

## Milestone 3: expressive rules and learning

Corresponds to the remaining A01/A03/A04/A06/A10 and later E07/E08.

- [x] M3.1 Scoped counters and explicit reset/persistence matrix for banner switch, season and item target.
- [x] M3.2 Target selection, once-only guarantees and player-selected exchange.
- [x] M3.3 Fixed slot layouts, quantities, no-replacement sampling and supported pack correlations.
- [x] M3.4 Duplicate caps, protection, salvage and crafting transitions.
- [x] M3.5 Mechanic atlas with step-through explanations and source provenance per rule.
- [x] M3.6 Conservative reachability diagnostics extended to multi-target/collection interactions.
- [x] M3.7 Trace export for lucky, median, unlucky and incomplete journeys.

## Milestone 4: exact mathematics and comparison quality

Corresponds to A08/A09 and C04.

- [x] M4.1 Exact independent/capped-hazard solver and analytical reference fixtures.
- [x] M4.2 Small-state capture/checkpoint solver, state-space limits and documented fallback.
- [x] M4.3 Attainment confidence intervals, paired/independent differences and sampling-error estimates.
- [x] M4.4 Initial-state distributions and stable cohort-weighted comparisons.
- [x] M4.5 One/two-dimensional sweeps, break-even surfaces and validation seeds.
- [x] M4.6 Bounded Pareto search after objective/constraint validation.
- [x] M4.7 Benchmark memory/events/latency on a documented reference machine.

## Milestone 5: economy and player-time scenarios

Corresponds to B01-B07. Money, resource consumption and subjective utility remain separate.

- [x] M5.1 Paid/earned/promotional currency and inventory ledger with atomic events.
- [x] M5.2 Cash payments, fees, refunds, fulfilment and versioned synthetic contribution definitions.
- [x] M5.3 Prices, bundles, top-ups, free grants, subscriptions and purchase limits.
- [x] M5.4 Sessions, event calendars, availability, migration and retained progress.
- [x] M5.5 Transparent heterogeneous player policies with hard budgets/time constraints.
- [x] M5.6 Game-specific useful-item/roster/upgrade utility adapter.
- [x] M5.7 D7/D30/D90 and cumulative multi-season cohort reports with evidence labels.
- [x] M5.8 No-uplift, adverse-response and portfolio-cannibalization scenarios.
- [x] M5.9 Reconcile a complete synthetic pilot fixture and an independent hand-calculated cash fixture.

The user authorized synthetic assumptions for the current delivery. This changes the technical acceptance scope of M5.2/M5.9; it does not supply company approval. External release gates remain:

- [ ] Finance approval of contribution definitions and refund/credit treatment.
- [ ] Reconciliation against a complete company-approved pilot fixture.

See the [M5 delivery contract](docs/milestone-5.md) and [synthetic reference](docs/economy-reference.json).

## Milestone 6: company evidence and decisions

Corresponds to D01-D04 and C01-C05. Customer interviews and company data are external dependencies, not prerequisites for the local mechanics work.

- [ ] M6.1 Select a pilot company decision, authoritative configuration and ownership.
- [ ] M6.2 Agree lawful data access, metric definitions, maturity windows and holdout period.
- [ ] M6.3 Local extract mapping, deduplication, state/ledger reconciliation and quality diagnostics.
- [x] M6.3a Local aggregate CSV mapping, deduplication, wallet/inventory reconciliation and quality diagnostics under the synthetic panel contract. Production protection-state adapters remain open under M6.3.
- [x] M6.4 Baseline attendance/purchase frequency estimates, explicit policy application and temporal holdout errors under synthetic acceptance. Real company calibration remains pending.
- [x] M6.5 Experiment specification, assignment/exposure checks, A/A and exact allocation diagnostics under the local declared contract.
- [x] M6.6 Independent-group bootstrap intervals, heavy-tail sensitivity and declared fixed-horizon criteria. Production preregistration and dependence review remain external gates.
- [x] M6.7 Executive decision record linking hashed evidence/models, alternatives, constraints and next experiment; synthetic/blocked adoption requests become holds.
- [ ] M6.8 Validate repeat company usage and commercial value through a second real decision.

Additional user-requested modularity:

- [x] Directory-backed project files, runtime section.json discovery and visible invalid-file diagnostics.
- [x] Conflict-aware file saves, previous-save backups and preserved browser-library migration.
- [x] Shared local API for development, preview and production execution.
- [x] Project authoring skill and validated create/inspect CLI.
- [x] Overwatch-like legendary cosmetic boxes, Fortnite-like revealed/historical llamas and original collectible card packs with source boundaries.
- [x] Editable company synthetic assumptions, CSV extracts, mappings and decision narratives.
- [x] Separate interface comprehension/accessibility rounds, formal labels and narrow layout checks.

See the [M6 contract](docs/milestone-6.md) and [exported evidence reference](docs/company-reference.json). M6.1/M6.2/M6.8 and the production-state portion of M6.3 are not represented as completed by synthetic fixtures.

## Milestone 7: specialist and enterprise expansion

Start each track after a customer need and acceptance contract exist.

- [ ] M7.1 Reviewed PlayFab/Unity/customer import/export mappings.
- [ ] M7.2 Charter revision for optional hosted operation; SSO/RBAC, immutable reviews and tenant isolation.
- [ ] M7.3 Private/cloud compute after measured local limits.
- [ ] M7.4 Collectible supply, fees, liquidity, market-value uncertainty and redemption obligations.
- [ ] M7.5 Licensed-gambling stakes/payouts/RTP/volatility and treasury scenarios.
- [ ] M7.6 Profile-specific operational/legal/test-house review workflow; research RNG remains separate from production randomness.

## Work record

### 10 October 2026: foundation implemented and verified

Scope: M1.1-M1.11. Regression behaviours: invalid models; impossible targets; horizon/budget termination; population acquisition quantiles; exchange preservation; pack guarantees and atomic spending. Existing application styles and unrelated edits are retained.

Delivered M1.1-M1.11. Read the [updated methodology](docs/methodology.md) for exact priority, exchange, pack, completion and replay semantics. The foundation does not complete the broader A04 pack system, exhaustive reachability, company model editor, behavioural evidence or financial model.

Verification:

- `npm test`: 62 tests passed across 3 files, including the existing 22 engine tests and 40 validation/foundation cases. Regressions were observed failing before engine implementation; the empty-bar fractional exchange case was also reproduced before its fix.
- `npm run build`: TypeScript no-emit checks and Vite production build passed.
- Browser: existing presets render; a 1-pull horizon at seed 42 reports 1% attainment over 200 trials and leaves median/p90/p95 unavailable; zero trials produces a field-specific error; a 9-pull horizon in 10-slot pack mode buys zero slots; a 1,000-pull pack run completes and distinguishes purchased pulls from first attainment.
- Browser export: after changing the draft seed from 42 to 43 without running, the downloaded bundle still records the actual run's seed 42, exact model, 200 trials, pack mode and horizon 1,000. Parsed the downloaded JSON and checked those fields.
- Confirmed hot reload after UI edits and no console errors/warnings in the final preview. [Saved lab screenshot](docs/assets/foundation-lab.png).
- `git diff --check` passed. Existing preset/copy edits remain in the worktree.

Limits at M1 completion: large jobs still ran synchronously, without progress/cancel controls. Validation was structural plus conservative reachability checks. Monte Carlo reports had no uncertainty intervals. The report export covered the main run; supplementary comparison paragraphs used their own documented scenarios.

Next implementation batch: M2.1 versioned schemas, M2.2 immutable baseline/candidate snapshots and M2.5 worker jobs; then M2.3 persistence and M2.4 model editor. Finish M2.6-M2.9 with one full import/fork/edit/run/compare/export journey. Its acceptance fixture changes the original 1% hard cap from 100 to 80, preserves the baseline, and shows completion/distribution differences before any profitability claims.

### 10 October 2026: UI polish and company workbench verified

Delivered M2.1-M2.9. The [workbench guide](docs/company-workbench.md) covers authoring, imports, snapshot/replay semantics, the [banner](docs/fixtures/company-banner.json) and [pack](docs/fixtures/company-pack.json) fixtures, and current limits.

UI: the header has fixed actions and a scrollable parameter drawer with fixed footer. Short descriptions stay visible; long technical details use custom hover/focus/tap panels. Drawer focus wraps and restores, Escape dismisses help before the drawer, and long panels stay within the viewport. Added responsive library disclosure, contained table scrolling, revision history, clear stale-result labels and warmer scrollbars.

Verification:

- `npm test`: 79 tests across five files, including existing engine regressions, immutable/hash-verified projects, strict imports, backup recovery, storage failures, trial batching, event independence, cancellation/stale-worker messages, retained lessons and exported banner/pack replay. The old-result-settings import regression was reproduced before its fix.
- `npm run build`: TypeScript and Vite production build passed, including the dedicated worker bundle.
- Browser banner workflow: imported fixture, forked candidate, changed cap 100 to 80, validated and saved a revision, ran 1,000 trials at seed 42/horizon 200, compared outcomes and parsed its exported comparison. Mean pulls 63.276 versus 55.177; p90 100 versus 80; baseline unchanged.
- Browser pack workflow: imported fixture, changed candidate cap, selected whole packs, ran and exported both project and comparison. Mean purchased pulls 66.32 versus 57.85; p90 attainment 100 versus 80. Reload restored committed models/settings/history. Re-imported comparison reproduced the table and controls.
- Browser export after changing draft seed to 43 still recorded the completed run's seed 42, pack mode and exact 100/80 snapshots. A rejected version-99 import retained the existing project and result.
- Browser cancellation: a 50,000-trial, 100,000-pull-budget job stayed responsive and cancelled immediately, keeping the previous completed report.
- Desktop and 390×844 viewport checks: no page overflow, responsive library, fitting drawer, scrollable detail content, bounded long help, focus wrapping/restoration and two-stage Escape dismissal. Confirmed hot reload and no final console errors/warnings.
- [Desktop workbench](docs/assets/workbench-lab.png) and [phone drawer](docs/assets/workbench-mobile.png) captured. `git diff --check` passed. Existing unrelated edits remain in the worktree.

Current limits: local projects and a previous-save backup, no cloud accounts. Double-corrupt storage remains untouched and work stays in memory. Import limit 5 MB. RNG policy differs from M1; its legacy function remains available. Group/two-pickup lessons use their explicit separate scenarios. No uncertainty intervals, exact solver, advanced pack layout, economy ledger or measured behavioural uplift yet.

Next implementation batch: M3 scoped counters/reset persistence and target selection, then richer packs and duplicate transformations. Exact mathematics and comparison uncertainty stay in M4; economy and company evidence stay in M5/M6.

### 10 October 2026: expressive mechanics and journeys

Milestone 3 delivers field-specific persistence, selected/one-time target rules, selected exchanges, multi-item goals, explicit pack slots/quantities, distinct-ID and shared-item sampling, and duplicate/salvage/craft flows. Version 2 envelopes carry the new rules, while earlier imports remain supported. The editor exposes the supported mechanics; run settings schedule immutable destinations and lifecycle changes.

Seven rule cards classify source assumptions. Representative journeys replay real trial indices with before/after state and export completed/incomplete evidence. Stored event truncation is visible and does not truncate the final simulation. Conservative reachability accounts for declared reward channels and finite caps; interacting transitions still need simulation.

Verification: 110 tests across ten suites, TypeScript, production build and Git whitespace checks. Browser checks covered v2 import, candidate authoring, resource conservation, a comparison export/import numerical replay, season resets, incomplete journey export, distinct/shared packs, unsupported-combination rejection and source metadata. At 390 x 844, the drawer scrolls with its footer visible, help remains within the viewport, and the page has no horizontal overflow. These browser checks used the Codex Chromium in-app browser; other browser engines and physical devices remain unverified.

The [M3 delivery contract](docs/milestone-3.md), [workbench examples](docs/company-workbench.md#m3-fixtures), and [methodology](docs/methodology.md#m3-state-and-acquisition-semantics) describe boundaries. Milestone 4 is next; confidence intervals, exact solvers, economy modelling and behavioural calibration are still open.

### 10 October 2026: exact mathematics and comparison quality

Delivered M4.1–M4.7 with bounded exact hazard/state propagation, simulation intervals and paired/independent error references, declared starting progress and weighted player groups, one/two-axis experiments, spending break-even surfaces, a fixed exploratory Pareto selection with a second validation seed, and a reproducible hardware benchmark. The [M4 delivery contract](docs/milestone-4.md) gives supported solver shapes, work bounds, interval assumptions, fixtures and limitations.

Interface passes replaced label-only help with visible explanations, clarified conditional featured rates, expanded atlas descriptions, provided keyboard scrolling in long help, focused run errors and condensed experiment results into a surface and selected-tradeoff summary with a full review table. This loop is now recorded in AGENTS.md.

Verification: 128 tests across 12 suites, including expanded semantic axe checks; TypeScript and production build; real worker runs, parsed version-3 exports and replay; carried progress with exact population shares; keyboard/error recovery and responsive checks. The dependency audit reports zero advisories after updating Vitest and source-map-js. See the [reference benchmark](docs/benchmark-reference.json), [experiment surface](docs/assets/analysis-surface.png), [player groups](docs/assets/analysis-cohorts.png) and [narrow drawer](docs/assets/analysis-mobile.png).

Current boundaries: exact first-featured/single-pull analysis supports small declared pools and falls back explicitly on other cases. Mean intervals use a large-sample approximation; declared player shares and objective limits are assumptions. Pareto selection covers only the tested grid and resource objectives. Company finance, player-time policies, engagement and retention remain M5/M6. Milestone 5 is next.

### 10 October 2026: synthetic economy and calendar scenarios

Delivered M5.1–M5.9 under the user-authorized synthetic acceptance scope. The [M5 contract](docs/milestone-5.md) records units, financial/event conventions, policy constraints, utility, eligible denominators, uncertainty and replay. Company-approved definitions and a company-approved pilot remain explicit external gates.

The engine adds origin-separated wallets, cash/resource/inventory/shard events, complete aggregate reconciliation, three offer types, four policy families, day calendars, migrations, subjective item utility and response sensitivity. Reports include D7/D30/D90, final and season-end horizons, a cash waterfall, policy outcomes, residual balances and trial-0 ledgers. Economy projects/comparisons use version 4 / `economy-5`; earlier imports remain supported.

Interface passes replaced promotional headings with formal subjects, added visible control/result explanations, exposed calendar and copy-utility authoring, clarified percentage-point differences and two-decimal cash values, and bounded ledger previews. Full JSON validates before application and retains the previous valid scenario after errors.

Verification: 159 tests across 13 suites, including expanded semantic axe coverage; TypeScript and production build; hand-calculated USD 2.97 contribution fixture; 1,600/1,600 reconciled pilot ledgers. Real browser comparison exports replayed exactly in Node and matched all reference scenarios/groups. Browser checks covered D7/D90/adverse selection, waterfall and trace exports, complete aggregate movements, invalid JSON/time-zone recovery with focused errors, fixed mobile footer, contained overflow, focus wrapping and help dismissal. Sampled result text contrast ranged from 7.33:1 to 14.15:1. Final loaded workflow had no new console errors/warnings. The checks cover the Codex Chromium browser, without asserting other engines or physical devices.

The synthetic no-response pilot increases D90 completion from 53.65% to 68.85%, while cash contribution decreases from USD 18.354455 to USD 18.187295 per eligible player. The interface presents this as a tradeoff. Assumed attendance and subjective utility are not observed retention or excitement. See the [reference output](docs/economy-reference.json), [desktop report](docs/assets/economy-workbench.png) and [mobile help/drawer](docs/assets/economy-mobile.png).

Milestone 6 is next: company decision ownership, approved financial/data contracts, observational calibration and experimentation. The current delivery remains local and synthetic.

### 10 October 2026: directory projects and editable company evidence

Delivered the local M6 acceptance scope: runtime section/project discovery, conflict-aware saves and backups, preserved browser migration, a validated authoring skill/CLI, named-game examples with explicit fidelity limits, and editable synthetic company extracts. The company module adds aggregate reconciliation, training/holdout estimates, assignment and exposure diagnostics, independent-group bootstrap intervals, tail sensitivity and hashed decision exports.

Verification: 182 tests across 16 suites; TypeScript and production build; exact Node replay of the browser-exported company reference; production service discovery; real browser writes, CSV remapping, regeneration, invalid-JSON recovery and migration of 11 prior browser projects. Browser checks covered the cosmetic box and revealed llama models, keyboard focus/Help dismissal, fixed drawer footer and no page overflow at 390 × 844. Final fresh loading had no new console warnings/errors. Screenshots: [company report](docs/assets/company-workbench.png) and [phone company settings](docs/assets/company-mobile.png). Browser coverage is Codex Chromium.

The synthetic reference has 100 independent groups and 300 aggregate rows. Its contribution interval is USD -5.07 to USD 8.19 per assigned group, so the decision remains inconclusive. Synthetic evidence does not complete company ownership, lawful access, production protection-state reconciliation or repeat commercial validation. See the [M6 contract](docs/milestone-6.md).
