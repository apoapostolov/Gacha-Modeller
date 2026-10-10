# Milestone 5: economy and player-time scenarios

The local workbench now compares acquisition rules alongside a calendar-based resource and cash model. The user authorized synthetic assumptions for this milestone. The technical delivery is complete under that scope; company finance approval and reconciliation against an approved pilot remain open release gates.

## Delivered checklist

| Item | Implementation and acceptance |
| --- | --- |
| M5.1 | Atomic, idempotent ledger for paid, earned and promotional balances, retained inventory, shards and cash categories. Whole packs remain indivisible. Every simulated ledger reconciles. |
| M5.2 | Versioned synthetic cash contribution contract, inclusive tax, retained payment fees, delayed refunds, fulfilment, active-day and promotional costs. Company approval pending. |
| M5.3 | Fixed bundles, exact-shortfall top-ups, attendance subscriptions, grants, offer windows and quantity limits. |
| M5.4 | Civil-day calendars, limited availability, expiry, season/banner/target migrations and retained protection. |
| M5.5 | Non-paying, budget-limited, goal-oriented and saving policies; weights, attendance, payment willingness, gross budgets and session time. |
| M5.6 | Versioned item/copy/tag utility adapter with upgrade saturation and roster bonuses. |
| M5.7 | Eligible-population and policy outcomes at D7, D30, D90, the final day and each season end. Unsimulated horizons remain unavailable. |
| M5.8 | No assumed response, declared response, adverse response, portfolio displacement and population break-even sensitivity. |
| M5.9 | Reconciled synthetic two-season pilot and a separate hand-calculated cash fixture. Approved company pilot pending. |

## Financial contract

Cash is stored as integer hundredths; virtual resources and shards use integer thousandths. Currency codes annotate a configured unit with 100 minor units; other cash precision conventions are unsupported. Model costs and shard conversion rates must have at most three resource decimals. Monetary rounding occurs at each event before aggregation. Population means can therefore have fractional minor units.

Contribution = gross payments − settled refunds − net inclusive tax − retained payment fees − reward fulfilment − service costs − promotional costs + other-product contribution − displaced other-product contribution.

Tax is extracted from a tax-inclusive gross payment using `gross × taxRate / (1 + taxRate)`. A refund reverses its declared share of gross payment and original tax. Fees and virtual credits remain retained. Refund shares are deterministic scenario inputs, rather than stochastic refund incidents. Outstanding refunds after the reporting horizon are disclosed separately and excluded from settled contribution.

Gross payment budgets count every payment and never replenish after refunds. Opening paid resources represent historical credits; consuming them does not create current cash revenue. Promotional costs are charged on issuance, including expired and unused credits. Fulfilment costs apply to retained copies from draws, exchanges or crafting, rather than overflow copies. Active-day service costs continue after goal completion if the player attends. The candidate cost multiplier applies to fulfilment, service and promotional costs; fee and tax contracts remain fixed. Each event rounds these costs to cash minor units.

This is cash contribution, not recognized revenue or statutory profit. Fixed costs, accruals, deferred revenue, breakage, discounting, cash-out liabilities and statutory reporting are excluded. The distinction follows the need to assess delivery/performance obligations separately from payment collection described by [IFRS 15](https://www.ifrs.org/issued-standards/list-of-standards/ifrs-15-revenue-from-contracts-with-customers/). The application's synthetic calculation does not constitute an IFRS accounting implementation. Separating virtual and real-money transactions also corresponds to the resource distinction in [Unity Economy documentation](https://docs.unity.com/en-us/economy/item-types?tocpath=Resource+types%7C_____1).

## Calendar and policy contract

Day 1 is the starting local date. The declared IANA zone defines the calendar convention; this model has no intraday timestamps or elapsed-hour events. Dates advance by civil calendar day, including daylight-saving changes. Offers and draw availability use inclusive day ranges.

Each day settles due refunds, processes promotional expiry, grants, season changes, banner migrations and target changes, then samples attendance. Same-type events sort by stable ASCII ID. Inventory, shards and wallets remain owned during migration; acquisition protection follows the existing model's field-specific persistence engine. A destination banner snapshot applies to both sides. Targets absent from a destination's eligible pool are cleared, and explicit target changes are validated on the active destination.

An attended session receives its configured resource grants and valid subscription instalments. Draw actions are bounded by the declared action count, session minutes, affordability, saving date, acquisition goal, availability and purchased-pull horizon. Attendance does not automatically change after a reward or goal: a response multiplier is an explicit assumption. A goal-oriented policy always stops drawing at its goal; other families can select this behaviour.

Resources are consumed in promotional, earned, then paid order. A policy uses one preferred offer without an implicit cheapest-offer optimizer. Bundles purchase the minimum whole quantity needed in one payment, with one fixed payment fee. Exact top-ups credit only the missing resources and round their cash price upward. A subscription supplies upfront credit plus its first instalment on purchase; later instalments require attendance. Terms cannot overlap for the same offer. Renewal requires a later shortfall and a deliberate purchase within the offer window; there is no automatic renewal. Missed instalments are not accumulated.

Streams are addressed by seed, stable policy ID, trial index and event/day. Reordering policies leaves results unchanged. The four runs are baseline, candidate without response, candidate with declared response and candidate with adverse response. Fixed policy shares normalize weights; every policy receives the full configured sample. Budgets and time constraints always override willingness multipliers.

## Utility and reporting contract

Each item has up to 20 marginal copy values. Additional copies add zero utility. A useful roster tag is covered by ownership of an item whose curve contains a positive value; each covered tag adds its declared bonus once. Gained utility excludes starting utility, while starting roster coverage remains included. Useful reward attainment requires utility to increase beyond the opening value. Utility is a subjective adapter, with no asserted mapping to excitement, money or willingness to pay.

Every eligible simulated player remains in the denominator, including inactive players and non-payers. Completion means the configured goal was attained at least once by the reporting day, including across migrations. Day return means attendance on that calendar day; trailing-seven-day return means any attendance in that inclusive window. Neither is a measured retention estimate. Repeat payer share counts players making at least two cash payment events; buying several bundles in one payment counts once. Season-end reports are cumulative from assignment, rather than new cohorts or reset season totals.

Contribution differences use paired trial streams and a stratified normal approximation with fixed policy weights. At least 30 trials per policy and positive observed difference variance are required. Intervals cover sampling error only, excluding response-model uncertainty and heavy-tail inadequacy. Adverse responses are sensitivity cases, not confidence bounds. Break-even scales the complete candidate eligible population at fixed per-player economics and requires positive contributions on both sides; it does not predict attainable demand.

## Configuration and replay

Run settings exposes calendar, finance, offers, policy, utility and sensitivity sections. Short explanations remain visible. Longer details use keyboard/hover/tap help panels. Full scenario JSON supports imported policy inventories/protection and arbitrary destination snapshots. Unknown fields, incompatible pull schedules, mechanical population/parameter experiments, invalid currencies and excessive work fail validation. Financial assumptions remain visibly synthetic.

Bounds: 180 calendar days, 1,000 trials per policy, four policies, eight offers, 40 calendar events, 24 utility items, two million draw slots and 400,000 player-days across the four runs. Defaults scale the sample for pack size. Automatic exchanges or crafts exceeding 100 per action fail explicitly rather than truncate progress.

Projects with economy settings and completed comparisons use envelope version 4 and engine `economy-5`; model snapshots retain schema 1 or 2. Earlier supported imports remain available. A comparison import restores authoritative immutable models/settings and recomputes results, rather than trusting serialized results. Mechanical-only comparisons still use version 3 / `analysis-4`.

Each selected trial-0 ledger export includes project, settings, opening balance, complete aggregate movements, closing balance, daily outcomes and final acquisition protection. The event preview retains at most 100 events and discloses truncation. Complete aggregates still reconcile every resource and cash category. This diagnostic ledger envelope is not a project import; the full comparison is the portable UI replay format.

## Synthetic acceptance evidence

Import [company-economy.json](fixtures/company-economy.json), then run the comparison. The seed-42 pilot uses a 100-versus-80 hard cap, three offer types, four policy families, 100 players per policy, 90 days and a second season on day 46. All 1,600 ledgers reconcile. The [reference output](economy-reference.json) records all horizons, policy groups and scenarios. Regenerate both files with `node --experimental-transform-types scripts/economy-fixture.ts`.

At D90 without assumed response, completion increases from 53.65% to 68.85%; mean cash contribution changes from USD 18.354455 to USD 18.187295 per eligible player. The difference is USD −0.16716, with an approximate sampling interval of −0.2050945 to −0.1292255. The required population multiplier is about 1.00919. These values illustrate a completion/contribution tradeoff, not an observed company result. Adverse assumptions reduce candidate contribution to USD 17.01949.

The independent two-day hand calculation charges USD 5 once, refunds USD 1, retains USD 0.66 net tax and USD 0.25 fees, deducts USD 0.04 service, USD 0.06 fulfilment and USD 0.02 promotion, and closes at USD 2.97 contribution with four paid resource units remaining. Tests cover atomic rollback/idempotency, origin order, budgets, exact rounding, pack affordability, missed subscription instalments, session time, expiry order, season/migration state, utility, work limits, policy reorder stability, immature horizons and full comparison replay. Semantic axe checks cover the new forms and tables; rendered colour contrast and responsive behaviour are checked separately in the browser.

Company release gates remain: approved contribution definitions, approved refund/credit treatment, an approved pilot fixture, and observational calibration/experimentation in Milestone 6. The current fixture and every output retain their synthetic evidence label.
