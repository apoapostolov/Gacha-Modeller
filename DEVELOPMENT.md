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

- [ ] M4.1 Exact independent/capped-hazard solver and analytical reference fixtures.
- [ ] M4.2 Small-state capture/checkpoint solver, state-space limits and documented fallback.
- [ ] M4.3 Attainment confidence intervals, paired/independent differences and sampling-error estimates.
- [ ] M4.4 Initial-state distributions and stable cohort-weighted comparisons.
- [ ] M4.5 One/two-dimensional sweeps, break-even surfaces and validation seeds.
- [ ] M4.6 Bounded Pareto search after objective/constraint validation.
- [ ] M4.7 Benchmark memory/events/latency on a documented reference machine.

## Milestone 5: economy and player-time scenarios

Corresponds to B01-B07. Money, resource consumption and subjective utility remain separate.

- [ ] M5.1 Paid/earned/promotional currency and inventory ledger with atomic events.
- [ ] M5.2 Cash payments, fees, refunds, fulfilment and finance-approved contribution definitions.
- [ ] M5.3 Prices, bundles, top-ups, free grants, subscriptions and purchase limits.
- [ ] M5.4 Sessions, event calendars, availability, migration and retained progress.
- [ ] M5.5 Transparent heterogeneous player policies with hard budgets/time constraints.
- [ ] M5.6 Game-specific useful-item/roster/upgrade utility adapter.
- [ ] M5.7 D7/D30/D90 and multi-season cohort reports with evidence labels.
- [ ] M5.8 No-uplift, adverse-response and portfolio-cannibalization scenarios.
- [ ] M5.9 Reconcile a complete finance-approved pilot fixture.

## Milestone 6: company evidence and decisions

Corresponds to D01-D04 and C01-C05. Customer interviews and company data are external dependencies, not prerequisites for the local mechanics work.

- [ ] M6.1 Select a pilot company decision, authoritative configuration and ownership.
- [ ] M6.2 Agree lawful data access, metric definitions, maturity windows and holdout period.
- [ ] M6.3 Local extract mapping, deduplication, state/ledger reconciliation and quality diagnostics.
- [ ] M6.4 Baseline behavioural calibration and temporal holdout validation.
- [ ] M6.5 Experiment specification, assignment/exposure checks, A/A and SRM diagnostics.
- [ ] M6.6 Heavy-tail/group uncertainty and preregistered decision criteria.
- [ ] M6.7 Executive decision record linking evidence, alternatives, constraints and next experiment.
- [ ] M6.8 Validate repeat company usage and commercial value through a second real decision.

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
