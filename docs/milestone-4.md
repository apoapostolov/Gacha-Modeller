# Exact probabilities and comparison evidence

Milestone 4 adds mathematical checks, simulation uncertainty, starting player populations and bounded parameter experiments. You can compare mechanics more carefully before choosing an economy or company experiment. Spending still means currency consumed by the simulated player. Revenue, contribution, engagement and retention remain in milestones 5 and 6.

## Read a comparison

Use completion alongside spending. Failed pursuits count in both averages. An attainment percentile is unavailable when that share of the entire population has not completed the goal. The new interval table shows candidate minus baseline: positive completion differences mean more goals completed; negative spending differences mean less currency consumed.

A 95% simulation interval describes repeat sampling under these fixed rules and assumptions. It does not describe uncertainty in player behaviour or the accuracy of an imported model. An interval crossing zero leaves the direction unresolved by this run. Multiple grid settings remain exploratory comparisons, without a family-wide significance claim.

The paired interval uses the shared trial/event streams. The independent reference deliberately ignores pairing; it is a diagnostic comparison, not another experiment. Mean intervals are large-sample normal estimates, available with at least 30 observations and nonzero observed variance. Constant differences and small samples show an unavailable interval rather than a misleading assertion of certainty. The export still includes the underlying point estimates and mean standard errors. Unobserved rare tails and heavy distributions can defeat the approximation.

## Exact solver contract

The exact solver propagates probability through the same `pull` and `sparkIfReady` transitions as simulation. It partitions the uniform rarity and featured draws at their probability boundaries, invokes each branch with a value inside its interval, and merges states with identical future transition behaviour. Completed goals absorb their probability mass. No paths are pruned by a probability threshold.

Supported domain:

- First featured reward, bought as single pulls.
- Up to eight rarity tiers and 24 catalogue items, with one positive-weight selectable item in each rarity/featured bucket. A mixed bucket without an explicit featured split is unsupported.
- Priority rarity rates, inclusive soft pity, hard rarity pity, capture after a miss, featured/selected/once-only guarantees, charge checkpoints and featured exchanges.
- A declared starting state, including previously owned rewards and protection already used.

Packs, scheduled transitions, ownership heat, duplicate transformations, other goals and larger item pools use Monte Carlo. A model may declare a pack but remain eligible when the selected purchase action is single. A shop containing non-featured rewards uses simulation. Unsupported cases show a reason beside each model; they never receive a partial result labelled exact.

Limits are 2,000 purchased pulls, 2,000 simultaneous transient states and 200,000 branch transitions. Exceeding a limit retains the complete simulation and shows its fallback reason. The result exports the full exact CDF, whole-population median/p90/p95, expected purchased pulls and currency, state/transition counts and probability mass discrepancy. Floating-point roundoff remains; exact here means enumeration instead of random sampling.

For first featured acquisition, `E[min(T,H)] = sum(t=0..H-1) P(T>t)`. This is mean purchased pulls through the horizon, including unfinished players. It is not the conditional mean of successful pursuits or an infinite-horizon expectation. Ready exchanges settle at time zero and at the final purchased pull, matching simulation.

Analytical fixtures in `tests/analysis.test.ts` include:

| Model | Reference |
| --- | --- |
| Independent 1% draw, horizon 50 | Completion `1 - 0.99^50`; mean purchases `(1 - 0.99^50) / 0.01` |
| 1% draw, hard cap 100 | Mean purchases 63.396765872677; complete by pull 100 |
| Same draw, cap 80 | Mean purchases 55.247678623619; complete by pull 80 |
| 20% chase hit, 50% featured with capture, horizon 2 | Completion `0.1 + 0.8×0.1 + 0.1×0.2 = 0.2` |
| Same first draw, forced midpoint with 70% featured at pull 2 | Completion `0.1 + 0.9×0.7 = 0.73` |

Tests also cover soft pity, carried counters, a consumed one-time guarantee, zero-purchase completion, final-pull exchanges, unsupported mixed pools and both operation and state limits.

## Simulation uncertainty

Each model's attainment rate uses a Wilson score interval. It has nonzero width even with zero or all successful observations. With 100 trials and zero successes, the upper 95% score bound is about 3.699%; this is not proof that acquisition is impossible. See the [NIST proportion interval method](https://www.itl.nist.gov/div898/handbook/prc/section2/prc241.htm).

For paired completion, count candidate-only successes and baseline-only successes. Their difference estimates the completion difference. Two marginal 97.5% Wilson intervals produce a Bonferroni-adjusted rectangle; subtract opposite bounds and clip to [-1,1]. Score coverage is approximate, so this is a conservative construction rather than an exact coverage guarantee. The independent reference applies the same construction to the two marginal success rates.

Mean standard error is `sqrt(sample variance / n)`. Paired mean-difference error uses each matched trial's difference; the independent reference uses `sqrt(sA²/nA + sB²/nB)`. The implementation uses a 1.95996398454 normal critical value and an explicit large-sample label, rather than claiming a finite-sample Student-t interval. [NIST's paired-observation guidance](https://www.itl.nist.gov/div898/handbook/prc/section3/prc311.htm) explains why differences must be analysed as paired observations. [MIT's Markov-chain materials](https://ocw.mit.edu/courses/6-041sc-probabilistic-systems-analysis-and-applied-probability-fall-2013/resources/lecture-18-video-1/) provide the absorption-probability foundation for the exact calculation.

## Starting progress and player groups

Open **Run settings → Player starting progress**. Add one to four named groups, set positive shares, then expand each group's progress. You can set rarity counters, capture protection, featured/selected progress, exchange points, one-time entitlement use, retained copies and available shards. Starting inventory must refer to IDs present on both models and respect their copy caps.

The same initial state applies on both sides of a group. Purchases, spending, newly earned shards and crafting count from this run only; existing inventory and shards are carried in. Historical purchases, scoped dormant banner histories and entire past ledgers are not imported by this starting-state schema. Scheduled transitions still act on the run's new purchased-pull positions.

Each group gets the declared full trial count per model. Population shares normalize exactly; weights do not round to integer player allocations. Stable ASCII IDs derive separate `cohort-v1` seeds, with collision rejection. Sorting by ID fixes aggregation order. Reordering groups or changing names leaves their streams and weighted results unchanged.

Weighted means and curves sum the group estimates using their declared shares. Completion-difference bounds use `z = Phi^-1(1 - 0.05/(4G))` for the two discordance proportions in each of G groups, then weight the group bounds. Shares are assumed known: their estimation error is not included. The fresh-player main comparison stays separate. The chart switches between the main comparison and the weighted player mix, and each group exports its own complete report and replay settings.

Import [company-cohorts.json](fixtures/company-cohorts.json) for a verified example: 1,000 trials per model/group, seed 42, horizon 20, newcomer share 1 and returning share 3 with chase pity at 79. Baseline and candidate caps are 100 and 80. Weighted completion is 17.425% versus 79.675%, and candidate mean new purchases are 5.31775. These synthetic population shares are assumptions, not customer evidence.

## Parameter experiments and Pareto selection

Open **Run settings → Explore parameter tradeoffs**. A grid varies one or two supported candidate parameters: price, a priority rarity's base rate, an existing hard pity, featured chance, exchange cost or a selected-target cap. Enter two to seven distinct numbers per axis, up to 49 settings. Chances use 0 to 1. All combinations must form valid models before sampling starts; the locked baseline and committed candidate remain intact.

Choose 30 to 2,000 trials per setting/seed, a validation seed distinct from the main seed, at least two objectives, a minimum completion share and a maximum mean currency consumption. Objectives minimize spending/pulls or maximize completion. These resource objectives do not stand in for engagement or company profit.

The first seed filters settings against the declared limits and identifies non-dominated grid points. A point is dominated only when another feasible setting is at least as good on every objective and strictly better on at least one. The fixed selection is checked with the second seed; validation does not select a replacement winner. All settings, including failed validation limits, remain available in the table and export. Feasibility labels refer to observed sample averages, not guaranteed population bounds.

The two-axis surface shows validation currency differences against the baseline. Zero is spending break-even. Text and signs explain each cell without relying on color. The summary shows up to five selected tradeoffs; expand the complete table for the full grid. You can inspect the validation intervals before deciding whether another, larger run is needed. This bounded search is not a global optimizer.

Player-group runs and parameter experiments are separate. Experiments use the main run's starting state, goal and lifecycle controls; a switched destination remains the embedded fixed model. Additional work is bounded before execution: `horizon × [2 × G × mainTrials + 2 × (gridCells + 1) × experimentTrials] ≤ 10 million draws`. The baseline is sampled once per experimental seed and reused for paired comparisons. Jobs report progress across all requested samples and remain cancellable.

Import [company-analysis.json](fixtures/company-analysis.json) for the verified 3×3 example: prices 0.8/1/1.2 and caps 60/80/100, 200 trials per setting/seed, exploratory seed 42 and validation seed 43. The 1-ticket/100-cap setting breaks even at zero sampled currency difference. The exploratory frontier selects price 0.8/cap 60; its validation completion is 100% and mean spending is 36.904 tickets. This is a resource tradeoff under the fixture, not an engagement or profitability recommendation.

## Portability, benchmark and verification

Comparison exports are version 3 with `analysis-4` / `event-streams-v1`. Projects need version 3 for initial progress or analysis settings. Model snapshots still use schemas 1/2; no new draw rule is encoded in M4. Earlier model/project/comparison imports remain supported, but old envelopes cannot claim new analysis settings. Import restores snapshots/settings and reruns the engine; exported numerical conclusions are not trusted as input. The existing 5 MB import limit remains.

Run `npm run benchmark` with Node 22 supporting `--experimental-transform-types`. It writes [benchmark-reference.json](benchmark-reference.json) with hardware, Node/OS, controls, sampled memory, actual draws, stored/total journey events and timing. The reference is a Ryzen 5 7600, 12 logical CPUs, about 31 GiB RAM, Windows and Node 22.23.2. Median measured times: about 74.5 ms for 1,000 capped trials, 376.6 ms for 5,000, and 122.0 ms for 1,000 capture trials. The single-state exact calculation took 2.65 ms; capture took 257.3 ms with 100 peak states and 40,400 branches.

This is one Node process, batches of 100 and uncontrolled garbage collection. Memory is sampled between batches, not an OS peak. Worker transfers, rendering, phones and competing workloads are excluded. The result is a reproducible reference, not a service latency promise. One hundred traced trials produced 12,808 events and about 7.02 MB of combined JSON; each trace stores at most 200 events without truncating its final result.

Verification includes 128 tests, TypeScript, production build, closed-form and hand-enumerated fixtures, group reorder/weight invariants, two-axis holdout replay, bounds rejection and semantic axe checks on expanded analysis controls/tables. Browser checks cover real worker runs, version-3 downloads/replay, focused validation errors, keyboard help scrolling, drawer focus restoration and narrow layouts. Automated checks use jsdom and exclude color-contrast evaluation. Physical devices, other browser engines and assistive screen readers have not been verified; this is not a full accessibility-conformance claim.

Every development pass now includes a separate interface comprehension pass. Short explanations stay visible, deeper detail stays in focus/hover/tap help, and color is accompanied by words or signs. The atlas, model summaries, run controls, chart, error recovery and experiment review were revisited during this milestone.
