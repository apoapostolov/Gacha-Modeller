# A company-grade direction for Gacha Modeller

Prepared 10 October 2026.

The current project is a useful probability backbone. Its next coherent form is a reward economy design and evaluation workspace: learn a mechanic, reproduce your existing rules, fork a candidate, compare reward access and economics, and carry the decision into a valid experiment.

## Read the plan

| Document | What you'll find |
| --- | --- |
| [Research foundation](company-research.md) | Academic evidence, comparable tools, current platform/regulatory developments, source limitations and customer research still needed |
| [Product blueprint](company-product-plan.md) | Repository audit, customization matrix, probability methods, player/economy models, horizon metrics, UX, comparisons, experiments and architecture |
| [Implementation backlog](company-implementation-backlog.md) | Prioritized release slices, dependencies, acceptance criteria, meaningful verification and pilot success measures |
| [Reference calculations](company-reference-calculations.json) | Reproducible numeric inputs/results for the guarantee, pack and collection examples; these are analytic examples, not profit forecasts |

## The important decisions

- Start with a local company workspace for closed-loop collection games or packs. Use explicit additional profiles for transferable collectibles and licensed gambling.
- Preserve the pure TypeScript engine, then add versioned rules, actual pack semantics, validation, explicit reset effects and honest trial termination.
- Keep reward rules, economy, player choices, calendar and evaluation independent. That makes a company modification explainable.
- Separate exact probability, Monte Carlo estimates, assumed behaviour, calibrated forecasts and experimental effects on every report.
- Evaluate session, event-cycle and multi-season outcomes together. Money, enjoyment, progression, trust and retention need separate metrics and an explicit relationship.
- Optimize contribution per eligible player alongside player/product constraints. Currency consumption, additional pulls and payer-only averages are insufficient.
- Build baseline/candidate comparison before automated optimization. Validate company data and assumptions before claiming profitability improvement.

## A concrete economic example

For a fresh-state 1% target model with a hard guarantee, lowering the cap from pull 100 to pull 80 changes expected pulls from 63.3968 to 55.2477. The median remains 69; p90 falls from 100 to 80.

If every pull costs exactly $1 cash and players stop at the first target, expected receipts per completed pursuit fall 12.8541%. Completed paid pursuits need to increase 14.7501% to preserve receipts under unchanged per-pull contribution economics. The tool should display that break-even threshold and help test whether it occurs. It should not assume that shorter acquisition automatically improves or damages long-term profit.

The blueprint extends this calculation to bundles, free currency, retained balances, salvage, subscriptions, event calendars, cannibalization and actual cost ledgers.

## What was verified

The repository was reviewed at commit `fc8b2bca02ce54a7b98001a4906553cadca9b1b8`, including pre-existing working-tree edits. All 22 existing tests and the TypeScript check passed. Targeted probes confirmed that declared pack guarantees are not executed, horizon-ended goals lack a completion status, and spark exchange uses reset semantics shared with forced draws.

Research used primary papers and official/vendor sources. A 2025 pricing/pity experiment measures payment intention, not audited lifetime profit. Motivation and longitudinal evidence supports a broader evaluation framework but supplies no universal retention formula. The source document records access limits and the work still needed with an actual company.

## Delivery recommendation

Release A makes mechanics editable, trustworthy and comparable. Release B adds economics and player-time scenarios. Release C connects company evidence, experiments and reviewable recommendations. A small experienced team could use a provisional 16-24-week envelope for a validated pilot, with earlier mechanics value; this estimate depends strongly on customer data and rule complexity.

Planning documents and reference calculations were added. Application source and the user's existing uncommitted edits were left intact. No deployment, live integration, company interviews or new commercial features were performed.
