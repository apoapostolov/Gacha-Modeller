# Methodology

A banner here is a probability machine: rates, optional pity, a featured coin, a spark shop, and a few social or marketing knobs. Each trial is a seeded Monte Carlo run of that machine. The lab does not scrape live APIs and does not claim licensed drop tables.

## Pull sequence

1. Tick the featured-since counter (this is also recruitment charge).
2. If a charge hard checkpoint is due (Blue Archive-like 200), give this banner's pickup.
3. If charge sits exactly on the mid checkpoint (100), force that rarity and roll the mid featured chance (50%). A miss does not capture.
4. If a featured hard pity is due (FGO-like 330), give the featured item and stop the roll.
5. Check rarity hard pity from highest ranked rarity to lowest.
6. Roll a unit interval against stacked effective rates. The last rarity is the filler (whatever remains).
7. If the hit rarity has a featured rule, roll featured vs standard. A lost roll can arm capturing for the next hit of that rarity.
8. Pick a weighted item from the chosen sub-pool. Collection heat multiplies unowned weights.
9. Reset the hit rarity counter (and any `resetAlso` counters). Increment the others.
10. Add `1 + audienceSparkPerPull` to the spark bar. This banner's pickup zeros charge. Off-banner hits do not.

Soft pity is a linear ramp. At pull `n` of a cycle, `rate = min(1, base + (n - softStart + 1) * softStep)` once `n >= softStart`. Genshin-like uses base 0.6%, `softStart` 74, `softStep` 6%, hard 90. That is the community-consensus ramp, not an official closed form.

## Goals

| Goal | Stop when |
| --- | --- |
| First featured | You hold at least one featured item |
| Copies `n` | Featured count reaches `n` |
| Unique featured `n` | Distinct featured ids owned reaches `n` |
| Budget `p` | Exactly `p` pulls have been taken |
| Collection | Every item id in the active banner is retained |
| Named targets | Every listed item/copy count is retained |

Spark policy `if-needed` buys the featured from the shop when the bar is full and you still need one. Policy `never` leaves the shop closed. Spark is an exchange, not an extra pull, so the pull count stays at the bar cost.

Exchanges grant an item and subtract bar progress. They preserve rarity counters, capture protection and the featured-since counter by default. Set `spark.reset.rarityCounters`, `spark.reset.featuredArmed` or `spark.reset.sinceFeatured` to declare a model's shop-reset effects. Forced featured draws still apply draw resets. The shop chooses the first positive-weight unowned chase item, then the first positive-weight chase item when you own them all. With copy caps, missing-first chooses a reward with remaining capacity. `spark.choice` can instead be `selected` (run `exchangeItemId`) or `target` (selected featured target). An explicit `spark.items` pool can include zero-weight rewards.

## Validation and rarity priority

Simulation entry points validate models and run controls before executing. Diagnostics identify the field: invalid numeric bounds, duplicate IDs, missing references, empty selectable pools and unsupported flags. Ranked base rates cannot sum above one. The final rarity's declared base rate is descriptive; selection uses the remaining interval.

The engine retains the existing priority policy. It checks hard guarantees in rarity order and consumes the probability interval from highest to lowest. Soft rates can overlap, so lower tiers may receive less than their nominal effective rate. Validation reports a conservative warning when that can happen; it does not silently normalize rates or claim a complete reachable-state proof.

## Packs

`actionMode: 'pack'` executes exactly `multiPull.size` repeated slots with replacement. A declared `guaranteeRarity` means at least one item of that tier or a higher tier. If no earlier slot qualifies, the final slot keeps any qualifying natural result and otherwise uses the minimum tier before item selection and state updates. The result marks this as `packGuaranteed`, separately from pity. Normal featured selection applies within the guaranteed tier.

You purchase every slot even when a goal arrives early. `pulls` and `cost` reflect the whole purchase; `attainmentPulls` records the first slot meeting the goal. Shops settle between complete actions. A horizon or fixed budget that cannot fit the next full pack leaves that remainder unspent. Independent replacement packs can declare one slot row per paid slot: an exact item, an exact rarity or an ordinary draw, plus its copy quantity. Fixed items/rarities take precedence over hard/target/charge draw checkpoints. No replacement and shared-item packs require an unprotected one-tier pool; the former selects distinct IDs per purchase, while the latter selects one ID and repeats it. They reject fixed layouts, minimum tiers, protection and duplicate redirection. Batch discounts and arbitrary correlations are not represented.

## Completion evidence

Every trial returns `goalAchieved`, `attainmentPulls` and a termination: `goal`, `horizon`, `budget` or `impossible`. Ready shop exchanges can settle at the final purchased pull. Definite impossibility checks include missing reachable chase rewards, too many unique targets and zero-weight collection items. Other counter interactions may still be unreachable; these finish at the horizon until broader reachability analysis is implemented.

The lab starts with a 1,000-pull horizon; the engine defaults to 100,000 when no horizon is supplied. Purchased-pull and currency summaries include all trials. They measure resource consumption, not company revenue or profit. Completed-goal summaries are conditional and return `null` when nobody finishes.

Population acquisition percentiles use nearest ranks: for percentile `q`, select the `ceil(q * trials)`th attained goal. If fewer than that many trials finish, the percentile is `null` and the UI shows "not reached". Attainment can fall inside a purchased pack. These Monte Carlo estimates have sampling error; confidence intervals and exact solvers remain on the [development checklist](../DEVELOPMENT.md).

## Studied models

Studied presets are *like-models*. They follow a published or community-consensus shape (base rate, pity cap, capturing, spark) so you can compare systems. They are not dumps of a live banner.

- **Genshin-like Character.** 0.6% / 90, soft ramp from 74, 50/50 with capturing, 4-star pity 10, spark 180.
- **Blue Archive-like Spark / Charge.** 0.7% pickup, 3% 3-star. Spark is the old 200-point shop. Charge is JP 5.5: 100 = 50% pickup 3-star, 200 = pickup, a hit resets, same-type banners share the bar. [blue-archive-recruitment.md](blue-archive-recruitment.md).
- **FGO-like.** 1% SSR, 80% of SSR hits are the rate-up, no capturing, featured pity at 330.
- **Independent crate.** No pity. Covert 0.64%. The long-tail control.
- **1% + hard 100.** Teaching control. Geometric with a cap, so the mean falls below 100.

## Original models

These are design proposals. The catalog marks them `original`.

### Pool share

A group shares one high-rarity pity sequence. The pitch is "pull together." At a fixed total pull count, leftover pity is wasted once, not once per player. Four solo cycles of 90 pulls throw away four fragments of a 90-pity bar. One shared sequence of 360 pulls does not. The comparison panel reports mean featured hits shared vs solo, plus leftover pity the solo group wasted.

Fairness is a separate bill. The copy still goes to whoever rolled the hit unless you add a claim rule. That rule is not in v0.

### Collection heat

Every item starts equal. Unowned ids get `weight * (1 + heat)`. Completing the album is the product. Heat cuts the duplicate tax at the end of a set without advertising a pity timer. The lab runs the same pool at heat 0 so you can see what you removed.

### Audience spark

Each pull fills `1 + audienceSparkPerPull` spark ticks. Viewers pay down the tail without touching the base rate. A 180 spark with +0.25 per pull buys at 144 if the featured never dropped. The overlay is the pitch: watching counts, pulling is public.

## What this does not model yet

- Session time, login calendars, or first-time buyer packs
- UI framing, rarity animation, or sunk-cost presentation
- Trade-after-reveal or claim votes on a shared drop
- Legal classification of lootboxes in any jurisdiction
- Live rate tables, capture-radiance patches, or regional banner differences

Add a preset when you have a cited shape. Keep invented mechanics in the original family so the catalog does not pretend they shipped.

## Reproducibility

Mulberry32 remains the generator. Legacy `runMonteCarlo`, guild and two-pickup lessons retain a sequential stream. M2 comparison jobs use `event-streams-v1`: deterministic 32-bit seed derivation from run seed, absolute trial index and event name, followed by Mulberry32. Event names include purchased pull position and rarity, featured or item selection. Reordering batches or changing metadata does not alter trial results. Changing mechanics can alter paths; common streams do not guarantee lower variance for every metric. This is a research generator, not a production gambling RNG.

The UI starts with seed `20260823`. **Run settings** opens a scrollable drawer; **Run comparison** applies its controls to both snapshots. Candidate saves create revisions and wait for an explicit comparison. Selecting a project runs its committed settings. Old results stay labelled when draft controls or a committed candidate change. The sample tape uses the committed seed from fresh state and a separate legacy sequential stream.

**Export comparison** saves `gacha-modeller-comparison` version 2: exact project snapshots, SHA-256 content hashes, run controls, engine/random policy, both population reports, semantic diff, assumptions supplementary lesson results, and representative addressed journeys. CDF entries store cumulative attained counts. Both curve views divide by every trial and use identical axes; survival is one minus attainment. Pack curves use individual slot positions, while purchase summaries count whole packs.

Replay from application code with `const project = await importProject(bundle); await compareProject(project, project.settings)`. Re-importing the bundle in the UI also restores the project and runs it. Compare numerical reports rather than timestamps or newly assigned project IDs. Unknown project/model fields, future format versions, altered snapshot content and unsupported replay engine policies are rejected. A raw legacy Banner, a versioned model envelope, an M1 result bundle and an M2 project are supported imports. M1 import restores its run settings but recomputes under M2; use legacy `runMonteCarlo` for its exact original sequence.

Comparison execution runs in a dedicated worker with progress messages. Cancel terminates that worker. Worker identity and job ID suppress late responses from replaced/cancelled jobs. Per-trial streams are independent of batching. Lesson calculations also stay in the worker. Guild and dual-pickup lessons retain separate legacy random policy and their stated parameters; collection heat's cold counterfactual shares baseline controls and named event streams. Lessons do not establish candidate uplift.

Projects and candidate history persist in this browser, with a previous valid save as backup. Corrupt-primary recovery uses the backup. If neither copy is readable, the app preserves stored bytes and works in memory; export work for recovery. Storage failures are visible. JSON import is bounded to 5 MB. Export is the portable backup, not a cloud account. See the [workbench guide](company-workbench.md) and [development checklist](../DEVELOPMENT.md) for workflow and remaining milestones.

## M3 state and acquisition semantics

`targetRule` protects a selected positive-weight featured item after its hard threshold, optionally once. A natural draw of that target resets target progress without consuming the one-time entitlement. A fired one-time guarantee consumes it. `featured.once` can make the existing featured hard cap once-only. Selected-target rules cannot overlap charge or another featured hard cap. Shops/crafts preserve one-time entitlement; explicit lifecycle resets can rearm it.

Protection fields are rarity counters, capture, featured-since, exchange progress, target progress and one-time entitlement. Each field chooses banner, named-family or account scope, with separate retain/reset effects for banner, season and target changes. Defaults are separate banner histories, retained on banner return; a season resets progress except one-time entitlement; changing a target resets target progress. Destination rules govern restoration. Saved season/target metadata prevent dormant banners from restoring progress across a declared reset. Inventory, purchased pulls and resource totals persist.

Scheduled transitions occur before the next purchase after their boundary is reached. A boundary inside a pack waits for its final slot. Equal boundaries follow array order. Prices accumulate from the active model, with one currency unit across the journey. Pursuit stops at first attainment, so later scheduled events are not executed. At the final horizon, due transitions, crafting and ready exchanges can still settle before the next purchase is refused.

A duplicate rule caps new retained copies per ID. Existing inventory survives model switches, even if the destination cap is lower. Same-rarity protection redirects a capped draw within the same featured/standard bucket using positive item weights. It does not redirect shop/craft rewards or redistribute the unaccepted portion of a multi-copy grant. Overflow becomes declared whole shards or is discarded. A redirected reward determines draw-protection resets. Copy grants record quantity, retained count and salvage. Repeat-copy statistics count received repeats after any redirection, including overflow.

Crafting spends a fixed shard amount on declared recipes, with one retained copy per craft and no purchased pull. The missing-targets policy settles recipes in goal/catalogue order before exchanges and before checking purchase limits. Shop/craft grants preserve draw protection; explicit shop resets remain available. Shards earned minus shards spent equals remaining shards. They are resource units, not cash value.

`diagnoseGoal` proves only missing acquisition channels and finite copy bounds, accounting for fixed slots, selected shops, one-time quantities and caps. Crafting channels are conservative; their existence does not prove a sufficient shard supply. Scheduled transitions return an unresolved diagnosis rather than an initial-model impossibility claim. Interacting counters can still make a goal unreachable. Horizon failures stay separate from proven impossibility.

Representative journeys replay actual trial indices, with the same event streams as the population run. Lucky/median/unlucky are completed-subgroup illustrations; incomplete is an unfinished member. Stored traces stop at 200 events by default, but execution continues to its full final result. `traceTrial` accepts up to 2,000 stored events. See the [workbench guide](company-workbench.md) for export/replay examples and three reproducible fixtures.
