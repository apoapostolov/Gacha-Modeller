# Milestone 7: local specialist expansion

Acceptance is synthetic, as authorized by the user. The local tracks provide reviewable catalogue mappings, collectible accounting, static payout mathematics and scoped review records. They do not complete hosted enterprise operation, customer validation or regulatory approval. Project format 6 retains formats 1–5 and adds optional `integration` and `specialist` modules.

## Research and design decisions

Sources inspected on 10 October 2026:

| Primary source | Finding | Design consequence |
| --- | --- | --- |
| [PlayFab Economy V2 catalogue](https://learn.microsoft.com/en-us/gaming/playfab/economy-monetization/economy-v2/catalog/catalog-overview) and [SearchItems reference](https://learn.microsoft.com/en-us/rest/api/playfab/economy/catalog/search-items?view=playfab-rest) | Catalogue identities and localized titles are distinct from prices, stacks, bundles and game-specific metadata. Search results are paginated. | Map identity/name subsets explicitly. Reject an outstanding continuation token. Do not infer probability rules or player state. |
| [Unity SDK configuration](https://docs.unity.com/en-us/economy/sdk/configuration), [resource types](https://docs.unity.com/en-us/economy/item-types) and [custom data](https://docs.unity.com/en-us/economy/custom-data) | Inventory definitions expose Id, Name and Type. Configuration and player inventory instances are distinct; custom JSON is game-defined. | Accept a documented SDK-definition export wrapper. Exclude currencies/purchases and keep custom odds outside the adapter. |
| [Unity inventory configuration notice](https://docs.unity.com/en-us/Economy/add-inventory-item) | New Economy project sign-ups stopped on 8 September 2026; active existing configurations continue. | Describe the adapter as support for existing configuration exports. |
| [UKGC RTS 3](https://www.gamblingcommission.gov.uk/standards/remote-gambling-and-software-technical-standards/rts-3-rules-game-descriptions-and-the-likelihood-of-winning) | Rules, winning likelihood and payouts need understandable disclosure. | Report payout probability, profitable-play probability and total returned stake separately. |
| [UKGC live RTP monitoring](https://www.gamblingcommission.gov.uk/licensees-and-businesses/guide/live-return-to-player-performance-monitoring-of-games-of-chance) | Theoretical RTP differs from observed RTP; volatility affects monitoring tolerance. Stakes include recycled winnings; payouts and turnover have distinct definitions. | Calculate static theoretical RTP/volatility and simulated turnover/payouts separately. Do not present sampled RTP as a guaranteed session return. |
| [UKGC RTS 7](https://www.gamblingcommission.gov.uk/standards/remote-gambling-and-software-technical-standards/rts-7-generation-of-random-outcomes) | Operational randomness has unpredictability and fairness requirements; compensated outcomes are prohibited. | Use fixed payout probabilities and research RNG only. Treasury and player history never adjust the payout table. |
| [UKGC testing procedure](https://www.gamblingcommission.gov.uk/strategy/testing-strategy-for-compliance-with-remote-gambling-and-software-technical/3-procedure-for-testing) and [change-control guidance](https://www.gamblingcommission.gov.uk/strategy/testing-strategy-for-compliance-with-remote-gambling-and-software-technical/6-in-house-developing-testing-and-release-good-practice) | Testing scope, version identification, change classification and authorization require evidence. | Record change identifiers, classification rationale, reviewer roles/references and exact scope hashes. These are editable research records, not certificates. |

UK sources inform the research contract; they do not establish the correct rules for an unspecified customer's jurisdiction. Collectible market/liquidity/redemption values are declared assumptions, not source-derived valuations. No live licensed table, market feed or customer data was copied.

## Catalogue contract

`integration` uses `catalog-binding`, version 1:

- `playfab-v2`: complete `{Items: [...]}` or `{data: {Items: [...]}}` SearchItems response. Supported rows have `Type: "catalogItem"`, `Id` and localized `Title`. Locale falls back to NEUTRAL. Combine all pages externally before import; an unfinished continuation token blocks use.
- `unity-sdk`: `{items: [{Id, Name, Type: "INVENTORY_ITEM"}, ...]}`. This is an explicit serialization contract for SDK configuration definitions, **not** a claim to consume every Unity CLI/REST export format.
- `customer`: `{items: [{id, name}, ...]}`. A customer exporter must produce this reviewed subset; arbitrary nested fields are not guessed.

Limits: 1 MB source text, 2,000 source rows; unique source identities and one-to-one mappings to existing candidate item IDs. Unsupported resource types produce visible notes. Unsupported shapes and missing names fail. Mapping names creates a new immutable candidate snapshot while preserving IDs, weights, rarities, pity and all other rules. Binding save does not change a model. Mapping review export includes source/candidate hashes, normalized names, mapping and scope. It is not a vendor deployment payload.

Vendor ownership/stack balances, prices, receipts, currencies, custom odds and guarantees remain outside this adapter. Before widening a mapping, require a versioned customer field contract, authoritative examples, units, completeness proof, round-trip tests and reviewer acceptance. Existing M6 aggregate CSV mappings remain the evidence adapter.

## Collectible accounting contract

Each profile has a fixed baseline and editable candidate. All money is integer minor units in USD/EUR/GBP; other currency precisions are rejected. One configured planning period has no implied calendar length.

For each item:

1. Issue `min(requestedIssue, cap − openingIssued)`. Lifetime issued supply never exceeds its cap. Redemptions do not restore issuance capacity.
2. Available circulation is opening issued minus opening redeemed plus new issuance.
3. Requested resales are `floor(available × listingRate × fillRate)`. Shared resale capacity allocates integer transactions proportionally, with largest-remainder allocation and stable input-order ties.
4. Redeem `floor(available × redemptionRate)` units after transfers. A transferred unit can subsequently be redeemed. Closing outstanding equals opening outstanding plus issuance minus redemption. Resales never create inventory.
5. Paid redemption is redeemed units times contractual redemption amount; remaining liability is closing outstanding times that amount.

Primary receipts, fees, issue costs, resale platform fees, redeemed cash and fixed costs form operator cash. Seller proceeds are secondary transaction volume less platform fees, not operator revenue. Fees and secondary transaction value round once at the aggregate stage. Cash after liability deducts all remaining guaranteed redemption obligations. Funding gap compares those obligations with opening reserve plus operator cash.

Low/base/high multipliers change assumed transaction values under the **same** completed-volume assumptions. Price and liquidity can be changed independently in candidate settings. These are scenarios, not a distribution, forecast, order book, price elasticity model or estimate of realizable unsold inventory. Supply rows are company-entered planning inputs; acquisition engine outcomes do not automatically mint financial inventory. Conservation is aggregate, not a per-instance ownership audit.

## Payout and treasury contract

Static outcomes have positive integer relative weights and nonnegative integer total payouts. Normalize weights to probabilities. Total payout includes any returned stake:

`RTP = E[payout] / stake`

`house edge = 1 − RTP`

`volatility = sqrt(Var[payout]) / stake`

`expected contribution/play = stake − E[payout] − rounded stake fee − operating cost`

There is no adaptive probability, pity, bonus-state, progressive jackpot, strategy dependence or production RNG. Above-100% RTP configurations are allowed for research and can have negative expected contribution. Positive payout, stake returned and profitable play are separate concepts.

Each Monte Carlo trial is an independent treasury portfolio. It begins with the configured operator reserve and settles the configured number of independent player sessions sequentially. Each player receives a fresh declared wallet, may reuse winnings, and stops before the next play if the wallet cannot fund a stake or cumulative net loss reaches the configured limit. A losing settlement may overshoot the net-loss limit by at most one stake. Zero loss limit means no plays. Treasury deficits are recorded without changing odds or discarding outcomes.

Named trial/session seeds make replay deterministic. Baseline and candidate share corresponding uniforms; each may stop independently. Eligible-player denominators include stopped sessions. Horizons 1, 10 (bounded by configured length) and final show any positive payout, any profitable play and ending net profit. These are reward observations, not observed excitement or causal engagement.

Reports distinguish player/session volume from treasury portfolio contribution; show mean contribution with a large-sample 95% interval, a paired candidate-minus-baseline contribution interval, ending treasury p01/median/p99, any-settlement deficit frequency with a Wilson score interval, largest simulated deficit and conservation. Mean intervals require at least 30 portfolios and observed variation; otherwise they are unavailable. Per-portfolio contribution samples are exported for replay. These intervals resample neither correlated players nor market assumptions. Zero observed deficits retain a nonzero upper sampling bound; they do not prove adequate capital. Pending withdrawals, correlations, taxes, liquidity delays, bonuses and jackpots are excluded. No actual money moves.

Limits: 10–5,000 portfolios; 1–1,000 sessions per portfolio; 1–1,000 plays per session; maximum 1,000,000 potential plays per model. Execution uses a dedicated worker; cancellation retains the previous report. There is no cloud execution or automated live RTP monitor.

## Review and replay

The review scope hashes engine/RNG versions, kind, provenance, both configurations, run settings, jurisdiction, change ID and classification. Each operations/legal/test-house record stores reviewer, reference, status and reviewed scope hash. A configuration or declared engine-version change makes previous reviews stale. Owner/jurisdiction and all current records are required for `reviewComplete`, but the export always retains `releaseStatus: "research-only"`. The file service provides backups and optimistic conflicts, not an authenticated approval ledger or immutable audit log.

Reports export complete profile inputs, both input hashes, scope hash, engine/RNG versions, numerical outputs, review diagnostics and limitations. Recompute reports in Node for exact replay. The specialist configurations are distinct from the project's legacy acquisition snapshots; neither is presented as deriving the other.

## Local acceptance checklist

- [x] Independent modules for catalogue adapters, specialist contracts, pure accounting/math, worker execution and UI.
- [x] Backward-compatible v6 imports without silently dropped modules.
- [x] Explicit catalogue preview, mapping, candidate-name revision and hashed review export.
- [x] Lifetime supply caps, shared liquidity, seller/operator separation and contractual liability scenarios.
- [x] Exact static payout metrics, stopped-player outcomes and bounded treasury portfolios.
- [x] Scoped operations/legal/test-house records with stale-review detection and research status.
- [x] Editable drawers, short visible descriptions, keyboard Help, focused errors and contained tables.
- [ ] Real customer configuration/state mappings and approval.
- [ ] Live service connectivity and production ownership/protection-state adapters.
- [ ] Jurisdiction-specific operational acceptance and independent test-house review.

## Hosted enterprise track

M7.2/M7.3 remain planned. The local-only charter stays intact until a concrete customer/environment contract exists.

1. **Acceptance and threat model:** identify tenant controller, data categories, residency, retention, deletion, expected workload, identity provider and deployment owner. Agree an authentication/authorization matrix and recovery objectives.
2. **Identity and authorization:** organization SSO through the selected OIDC/SAML provider; tenant-scoped analyst, reviewer, administrator and compute-service roles. Server enforcement on every query, job and export; cross-tenant negative tests. Reviewer separation from model authors.
3. **Evidence custody:** content-addressed configurations/artifacts, append-only decision events, actor identity/timestamps, signatures and reviewed scopes; object retention rules and tamper-evidence. Mutable drafts cannot alter signed approvals. Model changes reopen reviews.
4. **Storage and integration:** tenant-scoped database/object keys, encrypted credentials held server-side, read-only initial vendor adapters, paginated completeness/ETag tracking, idempotent imports and reconciliation. No credentials in project JSON or browser bundles.
5. **Compute:** profile measured local latency/memory first. Only then size job queues, quotas and workers. Immutable job inputs, deterministic stream allocation, cancellation, retries, resource limits and signed artifacts. Compare cloud outputs with local replay fixtures before use.
6. **Operations:** private ingress, backups and restore drills, access logs, deletion evidence, incident ownership and deployment promotion controls. Production access requires the customer's security/operational acceptance; a local modelling report is insufficient.

Do not treat SSO, tenant isolation, immutable review or cloud cost estimates as delivered by a local directory service. There is no provider/deployment choice supplied in this session.
