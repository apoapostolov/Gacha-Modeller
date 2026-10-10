# Company-grade implementation backlog

Prepared 10 October 2026. This is a proposed delivery backlog, not a record of implemented features. Read the [product blueprint](company-product-plan.md) for semantics and the [research foundation](company-research.md) for evidence.

## 1. Release boundaries

**Release A: Mechanics workspace.** A local application where a designer can learn, import, edit, version and compare an authoritative reward model. It supports actual pack rules, stateful resets, success/failure reporting and portable results.

**Release B: Commercial scenarios.** Add wallets, prices, grants, calendars, starting cohorts and transparent player policies. Reports distinguish mechanical outcomes from assumed commercial behaviour and calculate reconciled contribution.

**Release C: Company pilot.** Import historical evidence, validate baseline forecasts, design/analyse experiments, explore bounded parameter changes and export an auditable decision. Business uplift claims depend on evidence quality.

**Later releases:** shared company workspaces, private compute, operational adapters, market simulation and licensed-gambling mathematics. Each additional profile needs a customer fixture and specialist review.

The product plan's 16-24-week envelope assumes two experienced engineers with part-time analytical support and available pilot reviewers. Estimate work after discovery; do not convert the backlog into a fixed-price contract without fixtures. Sizes below are relative engineering complexity: S = contained change, M = several coordinated components, L = major domain feature. Statistical observation time and customer integration are separate.

## 2. Phase 0: establish contracts

| ID / size | Deliverable and owner | Acceptance criteria | Dependency |
| --- | --- | --- | --- |
| D01 / M | Pilot decision and workflow, product + economy designer | One actual decision, authoritative config, existing analysis, decision owner and business/profile goals are documented. Qualitative discovery covers designers and reviewers. | None |
| D02 / M | Mechanics inventory, engine engineer + customer engineer | All baseline rules, counter scopes, guarantees, pack semantics, exchanges and migrations have a written example. Unsupported rules are explicit. | D01 |
| D03 / S | Financial metric contract, analyst + finance | Agreed cash/tax/fee conventions, contribution denominator, payout/fulfilment definitions, portfolio scope and horizon. Known unavailable costs are listed. | D01 |
| D04 / M | Data and validation contract, analyst + customer data owner | Fields, lawful access, pseudonymization, reconciliation, maturity windows and held-out period are agreed. Mechanical-only pilot path exists if data access is delayed. | D01 |
| D05 / S | Project charter/profile scope, product owner | Local-only Release A/B scope is explicit. Hosted/integration scope changes are recorded when needed. Regulatory eligibility and approval ownership are assigned. | D01 |

## 3. Release A: fix the foundation and make it editable

| ID / size | Deliverable | Acceptance criteria | Dependency |
| --- | --- | --- | --- |
| A01 / M | Runtime model validation | Invalid probabilities, negative weights, duplicate IDs, missing pools/references, invalid caps/units and unsupported rule combinations fail with field-level explanations. Feasibility diagnostics distinguish impossible goals from invalid models. | D02 |
| A02 / S | Trial termination contract | Every run reports goal achievement and termination reason. Impossible target and oversized budget probes no longer appear as ordinary acquisition samples. Unattained quantiles remain unavailable. | A01 |
| A03 / M | Explicit grant/reset semantics | Natural hit, forced draw, pack grant and shop exchange apply declared resets separately. Trace fixtures show capture and counters retained or cleared as configured. | A01, D02 |
| A04 / L | Pack executor | Supports fixed slots, quantities, independent and no-replacement pools, a declared at-least-one guarantee, atomic batch charge and explicit target-slot versus purchased-pack outcomes. Unsupported correlation schemes are rejected. | A01, A03 |
| A05 / M | Immutable model/project versions | Fork, rename, save, compare diff, export/import and migrate the legacy banner format. Same content yields a stable canonical hash. A saved baseline is not mutated by candidate editing. | A01 |
| A06 / L | Forms and advanced editor | Catalogue, pools, pity curve, featured/target rules, pack slots, reset/persistence matrix and exchange choices can be edited without code. Validated preview matches the engine. | A03-A05 |
| A07 / M | Worker jobs and random-stream contract | UI remains interactive; jobs show progress, cancellation and errors. Replay is independent of worker count/chunking under the documented scheme. Stale results cannot overwrite the selected run. | A02-A05 |
| A08 / L | Exact reference solvers + MC analysis | Geometric/capped-hazard and small capture/checkpoint fixtures match enumerated truth. MC estimates include sampling uncertainty; solver limits and fallbacks are explicit. | A02-A04 |
| A09 / M | Baseline/candidate analysis UI | Consistent-bin histogram, CDF/survival, acquisition by budget, completion mass, state-conditioned comparison, semantic diff and accessible tables. Reports disclose paired/independent methods. | A05, A07, A08 |
| A10 / M | Learning atlas and preset provenance | At least six mechanism cards include state step-through, real limitations and per-rule source classification. Synthetic overlays are distinct. Date/region/source of like-models is retained. | A03, A08 |
| A11 / M | Portable report and replay bundle | Model, initial state, seeds, engine/metric versions, assumptions, summaries and sampled traces export locally. A fresh workspace reproduces reference outputs. | A05, A07-A09 |

**Release A gate:** a pilot designer imports or enters a real baseline, reproduces a known reference, modifies supported rules, finds the effect on target access and the tail, and exports a replayable comparison. Pack guarantees, incomplete trials and exchange resets have dedicated semantic verification. No business metric is shown as observed profit when only reward mechanics exist.

## 4. Release B: add commercial scenarios

| ID / size | Deliverable | Acceptance criteria | Dependency |
| --- | --- | --- | --- |
| B01 / L | Resource ledger and starting states | Paid/earned/promotional balances, inventory, counters and grants reconcile. Actions/exchanges are atomic; repeated event IDs do not double-apply. Arbitrary imported incumbent-state distributions are supported. | A03-A05, D03 |
| B02 / L | Offers and cash/contribution ledger | Single/batch prices, exact top-up or declared bundles, purchase limits, free tickets and subscriptions produce separate cash/resource events. Fees/taxes/refunds follow the finance convention. Recycled or earned currency does not create cash revenue. | B01, D03 |
| B03 / M | Event/session calendar | Offer opening/closing, grants, attendance, rotations and migration rules execute consistently at timezone boundaries. Pending protection follows declared persistence. | B01, D02 |
| B04 / L | Transparent player policies | At least four configurable policy families with heterogeneous budgets/goals, saving/switching/redemption and non-purchase play. Budget/eligibility constraints always dominate policy decisions. All policies are labelled assumed. | B01-B03 |
| B05 / M | Game utility adapter | Item tags/roster/upgrade curves generate declared useful-reward measures. Rarity and dollar cost remain separate. Utility changes are versioned inputs. | B01, D01 |
| B06 / L | Horizon/cohort scorecards | D7/D30/D90 windows, attainment, active days, balances, contribution per eligible player, cost waterfall and population denominators. Mechanical-only and responsive-policy comparison modes are separate. | B02-B05, A09 |
| B07 / M | Break-even and adverse scenarios | User can find required participation/repeat improvement for a candidate and include no-uplift, adverse demand/cost and portfolio cannibalization cases. Sampling error and scenario uncertainty are distinct. | B06 |

**Release B gate:** reproduce a finance-approved fixture with grants, top-ups, leftovers, salvage, fees and refunds; show how a candidate changes resources and cash over a calendar. An analyst can identify every assumption behind a contribution forecast. Cohort weighting and portfolio accounting are stable across variants.

## 5. Release C: evidence, experiments and bounded search

| ID / size | Deliverable | Acceptance criteria | Dependency |
| --- | --- | --- | --- |
| C01 / L | Historical-data mapping and parity report | Local extracts map into versioned events or aggregates; deduplication, lateness and missing state are diagnosed. Reconciliation reports distinguish model, data and configuration errors. | D04, B01-B03 |
| C02 / L | Baseline calibration and temporal validation | Fit attendance/purchase behaviour with documented features. Later holdout shows error/calibration by cohort/horizon; unsupported treatment responses remain scenario parameters. | C01, B04-B06 |
| C03 / L | Experiment specification/scorecard | Stable assignment/exposure, A/A/SRM and missing-data checks; primary metric/horizon/power plan; player or group uncertainty and guardrails. Invalid-quality tests cannot produce a winner recommendation. | D04, C01, B06 |
| C04 / M | Parameter sweeps and robust comparison | One/two-dimensional sweeps, feasible constraints and response surfaces with fixed inputs. Finalists rerun on validation seeds/scenarios. All considered candidates are retained. | A07-A09, B07 |
| C05 / M | Decision record and executive export | Baseline, alternatives, diff, evidence labels, conservative economics, key constraints, unresolved assumptions and experiment plan fit a review workflow. | C02-C04, A11 |

**Release C gate:** a company uses the tool to make a documented real decision. Behavioural forecasts pass pre-agreed held-out accuracy checks, or remain explicitly provisional. An experiment's assignment and measurement quality are reviewed before interpreting its effect. No promise of positive profit lift is required for pilot success: identifying a bad change before implementation is useful value.

## 6. Expansion backlog

| ID | Capability | Start only when |
| --- | --- | --- |
| E01 | Reviewed PlayFab/Unity/customer adapters | Repeated manual mapping causes pilot friction and the company supplies authoritative semantics. |
| E02 | Shared projects, comments, SSO/RBAC, immutable approvals and tenant isolation | A customer requires multi-person/private deployment; local charter is revised. |
| E03 | Private/cloud compute and resumable large jobs | Local profiling shows a material limit and workloads justify operational cost. |
| E04 | Bounded multi-objective optimization | Validation and sweep results are trusted; objectives and constraints are defensible. |
| E05 | Transferable collectible market/treasury module | A specialist customer provides prices, liquidity, minting and redemption obligations. |
| E06 | Licensed gambling math/evidence module | An operator and specialist reviewers define target jurisdictions, approved game semantics, payout rules and evidence format. |
| E07 | Company custom-rule plugins | A real supported configuration cannot be represented declaratively; plugin isolation/solver contracts are designed. |
| E08 | Visual rule/economy editor | Usability research shows forms obscure important interactions; it compiles to the existing schema. |

## 7. Meaningful verification suite

This is the proposed verification for new engine behaviour. The current planning work only ran the existing 22 tests, TypeScript check and targeted read-only probes.

### Mechanics reference fixtures

- Independent geometric draw and finite hard guarantee: validate full mass, mean, quantiles and tail, not just a broad mean range.
- Zero-rate target with guarantee; zero-rate target without guarantee; unreachable target ID; copy count beyond availability.
- Hard/soft pity off-by-one, overlapping tier guarantees, rate mass at all reachable checkpoints and explicit precedence.
- Capture miss/hit, target switch, banner-family carryover and once-only versus recurring guarantee.
- Spark exchange retaining/clearing counters as declared; selected item versus missing-item choice.
- Five independent 2% slots giving 9.6079% chance of at least one rare; guaranteed and no-replacement fixtures enumerated separately.
- Atomic ten-pack where target lands early; charged pack count and target index stay distinct.
- Equal ten-item collection benchmark at 29.2897 individual draws; duplication and salvage conservation.
- Horizon-ended and budget-ended attainment; summaries never convert censored cases into successes.

### Ledger and calendar fixtures

- Earned currency and saved paid balances can fund draws without new cash purchases.
- Bundle purchases leave residual balances and obey purchase limits; paid provenance is retained.
- Refunds, net platform receipts and costs reconcile without double deduction.
- Salvage/crafting cannot mint more resources than the declared conversions permit.
- Expiry/season reset and retained protection follow explicit migration; simultaneous events have deterministic order.
- Group rewards have one declared recipient/allocation; group totals equal individual allocated totals.
- Cash-gambling deposits, recycled winnings, settled stakes and payouts remain distinct in profile-specific fixtures.

### Statistical and evidence checks

- Exact-to-MC agreement using justified stochastic tolerances and multiple independent reference seeds.
- Reproducibility across chunks/workers and exported replay; pairing checks on comparable events.
- Known censored fixture recovers valid attainment or labels unidentifiable quantities unavailable.
- Cluster resampling for groups; heavy-tail sensitivity; missing/SRM data is visibly invalid for causal conclusions.
- Calibration/holdout diagnostics use untouched future data and disclose poor segments.
- Optimization finalists face unseen seeds/scenarios; search cannot exploit missing eligibility or budget checks.

### UX and operational checks

Task-test the full learn/import/edit/compare/export workflow. Verify keyboard navigation, chart tables, units, validation, job cancellation, errors and stale results. Benchmark defined workloads and publish the reference machine/event count. Hosted-phase checks add tenant-boundary and access-audit tests. These checks should verify behaviour that can fail, not mirror component internals.

## 8. Product success and business validation

Track product usability separately from the customer's game performance:

| Product outcome | Pilot measurement |
| --- | --- |
| Baseline fidelity | Fraction of required semantics reproduced; reference/ledger reconciliation failures |
| Designer independence | Import/edit/compare task completion without engineer assistance |
| Decision speed | Time from authoritative config to reviewable comparison versus existing workflow |
| Decision quality | Unsupported assumptions found; candidates rejected or revised with documented reasons |
| Reuse | A second real decision and repeated model/version comparison by the pilot team |
| Commercial value | Customer willingness to pay for repeat use/private requirements, established through direct discovery |

Do not invent a SaaS price or market-size estimate before this evidence. A plausible packaging hypothesis is an open/local mechanics edition plus a paid company/private edition for evidence workflows, support and integrations. Validate licensing, support burden and willingness to pay. The public engine's MIT licence and any future commercial modules should have clearly explained terms.

## 9. Next executable work package

Implement A01-A04 with legacy fixtures first, then A05/A07 and a minimal A06/A09 path. This makes unsupported guarantees, unfinished trials and reset effects explicit before adding more charts or business scores. Keep the existing app usable while introducing versioned domain models.

The first review should demonstrate two complete workflows: a capped featured banner and a slot-based pack with duplicates. Both should import, fork, validate, run, compare and export locally. Choose one actual pilot baseline to decide which additional mechanics ship next.
