# Research foundation for a company-grade Gacha Modeller

Research date: 10 October 2026. Companion documents: [product blueprint](company-product-plan.md) and [implementation backlog](company-implementation-backlog.md).

## 1. What the evidence supports

You can calculate a reward distribution from complete rules. You can forecast a business outcome only after adding assumptions about player decisions, the surrounding game, prices, costs, and time. You can establish whether a change caused a business improvement only through an appropriate experiment or another defensible causal design.

These are three different products inside one workspace: a probability laboratory, an economy simulator, and an evidence-based decision process. A professional tool should show which one produced each number.

This review covers primary academic research, official platform documentation, regulators, and first-party tool documentation. Search results from forums and commercial commentary were discovery leads, not evidence for recommendations. It is a focused design review, not a systematic literature review or a worldwide legal determination. No company data was available. Proposed commercial outcomes, implementation estimates, and UX designs are therefore recommendations, not observed performance.

## 2. Evidence that changes the product design

### A. Gacha design can affect willingness to pay, but intention is not lifetime profit

A 2025 study reports a randomized experiment with 457 participants examining pull price, pity, perceived risk, and intention to pay. Its public abstract and highlights report that higher prices reduced payment intention through perceived risk, while pity reduced perceived risk and increased intention. The outcome is stated intention, not audited transactions, retention, or long-term contribution margin. The full study was not accessible in this review. [Monetization mechanisms in gacha games, publisher record](https://www.sciencedirect.com/science/article/pii/S1875952125001247).

**Design implication:** make price and protection mechanisms jointly configurable. Test the hypothesis that reduced uncertainty changes participation. Do not import a universal conversion multiplier from this study.

A theoretical economics paper distinguishes buyers with different awareness of their own probability weighting and derives different optimal mechanisms, including worst-case insurance under particular assumptions. This is a stylized model of selling a unit good, not an empirical recipe for a live service. [Gan, Gacha Game: When Prospect Theory Meets Optimal Pricing](https://arxiv.org/abs/2208.03602).

**Design implication:** include deterministic purchase alternatives and hard caps as comparison controls. Keep behavioural assumptions visible. A mathematically optimal seller strategy under one preference model is not automatically a commercially durable or acceptable product.

### B. Excitement is one motive among several

RAFFLE was developed using cognitive interviews and two surveys of UK loot-box purchasers. The resulting 23-item instrument has seven factors: enhancement, progression, social pressure, distraction/compulsion, altruism, fear of missing out, and resale. It measures motivations, not a causal equation predicting retention from drop rates. [Lloyd et al., RAFFLE, author institutional repository](https://eprints.glos.ac.uk/11753/).

**Design implication:** separate enjoyment, useful progression, collection, social participation, and perceived control. Include pressure and regret as diagnostic outcomes rather than treating every additional purchase as desirable engagement. Use validated instruments in research with suitable permissions and administration; do not invent a score and call it RAFFLE.

Four studies applying self-determination theory associate perceived autonomy, competence, and relatedness with enjoyment and future play. Their context is video games broadly, not modern gacha unit economics. [Ryan, Rigby and Przybylski, The Motivational Pull of Video Games](https://selfdeterminationtheory.org/SDT/documents/2006_RyanRigbyPrzybylski_MandE.pdf).

**Design implication:** measure whether rewards let players make meaningful choices, accomplish goals, and participate with others. A useful common item may support progression more than an unusable rare duplicate. The simulator needs utility and game-context inputs, not rarity alone.

### C. Reward protection does not make harm concerns disappear

A 2025 longitudinal replication followed young adult gamers in British Columbia for six months. The cleaned sample was 126, with substantial attrition. Baseline loot-box spending and risky involvement predicted later gambling expenditure; evidence for initiation depended on analysis, with support in Bayesian models using informed priors. It remains observational and geographically limited. [Palmer, Brooks and Clark, BMC Psychology](https://link.springer.com/article/10.1186/s40359-025-02766-1).

**Design implication:** spending escalation and pressure belong in the evaluation framework. These findings do not establish a universal causal coefficient and must not become a targeting model for vulnerable players. Company-grade analysis should identify designs that sustain voluntary enjoyment and trust alongside margin.

### D. Time and incomplete observation matter

Research on the mean cumulative function explains how censored player histories can bias game analytics and presents estimates for repeated events such as sessions, purchases, playtime, and value over time. [Viljanen et al., Measuring Player Retention and Monetization using the Mean Cumulative Function](https://arxiv.org/abs/1709.06737).

**Design implication:** distinguish an unfinished simulated goal from a completed goal; distinguish a newly acquired real player from a mature 90-day cohort. Report horizon-specific attainment and use appropriate methods for incomplete histories. An absent purchase is not proof that a player has permanently churned.

### E. Short-term revenue can point in the wrong direction

Microsoft's research describes how short-term metrics can diverge from long-term value, and how long-running tests can suffer from identity instability, selection, survivorship, and misleading trends. [Dmitriev et al., Pitfalls of Long-Term Online Controlled Experiments](https://www.microsoft.com/en-us/research/?p=683337).

**Design implication:** show D7, D30, D90, and observed or explicitly extrapolated later outcomes. Include acquisition-cohort and incumbent-player views. Compare total portfolio contribution, since a successful banner can move spending away from another banner or a subscription.

Microsoft also describes sample ratio mismatch as an experiment integrity failure. PlayFab's game-specific documentation advises against drawing conclusions from affected tests until the cause is addressed. [Microsoft Research on SRM](https://www.microsoft.com/en-us/research/articles/diagnosing-sample-ratio-mismatch-in-a-b-testing/), [PlayFab experimentation practices](https://learn.microsoft.com/en-us/xbox/playfab/live-service-management/game-configuration/experiments/experimentation-keys).

**Design implication:** experiment scorecards must show assignment and exposure quality before presenting a winner. Randomization should persist at player level, or at group level for shared mechanics. Statistical significance cannot repair broken assignment or incomplete logging.

### F. Automated balancing is feasible within a specified model

GEEvo presents graph-based economy simulation and evolutionary generation/balancing against defined objectives. Its evaluated examples include fictional character-class economies. It demonstrates a modelling and search approach, not that search can discover human enjoyment or reliable business uplift. [Rupp and Eckert, GEEvo, full paper](https://arxiv.org/html/2404.18574v1).

**Design implication:** add constrained parameter search after validation and comparison work. Let users see Pareto tradeoffs, parameter bounds, robustness, and the full configuration. Search only has meaning relative to its objective and behavioural assumptions.

## 3. Position among existing tools

| Tool category | Verified capabilities | What that means for this project |
| --- | --- | --- |
| Machinations | Browser-based resource-flow modelling, interactive execution, stochastic predictions, charts, CSV export, and parameter export to Sheets | Economy diagrams and simulation are established workflows. Specialize in stateful randomized rewards, explainable odds, and baseline/candidate evidence rather than rebuilding every generic economy feature. |
| PlayFab Economy v2 | Catalogs, currencies, inventories, bundles, subscriptions, purchases and transaction history | Integrate with operational systems through versioned adapters. A modelling workspace does not need to become a wallet or transaction platform. |
| Unity Economy and Remote Config | Currency/item/purchase definitions, receipt-validation flow, configuration and game overrides | Read a company's configuration and export a reviewed mapping. Keep live publishing and player segmentation in the company's operational stack. |
| Internal spreadsheets/scripts | Not audited for any particular company | Treat them as the pilot's current workflow. Validate exact parity before claiming to replace them. |

First-party sources: [Machinations overview](https://machinations.io/docs/what-is-machinations-systems-simulation-tool), [PlayFab inventory overview](https://learn.microsoft.com/en-us/gaming/playfab/economy-monetization/economy-v2/inventory/items-and-inventory-overview), [Unity Economy resources](https://docs.unity.com/en-us/economy/item-types?tocpath=Resource+types%7C_____1), [Unity configuration overrides](https://docs.unity.com/en-us/remote-config/game-overrides-and-settings).

The proposed differentiation is a hypothesis: **a reward-system specialist that connects learnable mechanics, auditable customization, player journeys, and business evidence**. Validate it through company interviews and a pilot. The documentation reviewed does not prove that these vendors lack every overlapping feature. No pricing or market-size claim is needed to select the product direction.

## 4. Product classification changes the required analysis

Keep three profiles distinct:

1. **Closed-loop game rewards:** items have gameplay or cosmetic utility and no operator cash redemption. Model retention, progression, virtual-currency flows and digital-content contribution.
2. **Transferable collectibles/packs:** inventory may be traded or sold. Model supply, concentration, ownership, market-value uncertainty, fees and liquidity. Transferability can change legal classification.
3. **Licensed real-money gambling:** rewards have redeemable monetary value. Model stakes, payouts, theoretical and realized RTP, volatility, player losses and operator reserves. The modelling tool does not establish licensing eligibility or certify a game.

The UK government's loot-box response states that cash-convertible prizes may bring a system into the gambling definition. That is a jurisdiction-specific starting point, not a universal safe harbour for other packs. [UK government response](https://www.gov.uk/government/calls-for-evidence/loot-boxes-in-video-games-call-for-evidence/outcome/government-response-to-the-call-for-evidence-on-loot-boxes-in-video-games).

**Architecture implication:** a common reward engine can support analytical comparisons, while economic reporting and release eligibility depend on the selected profile. A generic field named `value` is insufficient: separate gameplay utility, sale price, redemption liability, and operator fulfilment cost.

## 5. Current requirements with concrete product implications

This is a scoped requirements map. An operator's counsel and compliance team must confirm applicability, effective rules and approvals for each actual market and product. A green software check means its encoded rule passed, not that the product is legally approved.

| Area | Verified requirement or event | Proposed capability |
| --- | --- | --- |
| Apple distribution | Random-item purchases must disclose odds of each item type before purchase | Generate versioned disclosure output from the executable model, including conditional rules and pack semantics. |
| Google Play distribution | Purchase-based random items require clear odds disclosure before and close to purchase | Provide localized disclosure previews and retain the exact model version used to produce them. |
| EU purchased virtual currency | CPC principles address real-money price clarity, hidden conversion costs, unwanted currency bundles, contract information and consumer vulnerabilities | Keep actual cash paid, displayed reference price, virtual spend and residual balance separate; review expiry/refund rules. |
| US enforcement example | FTC's January 2025 Cognosphere announcement describes a $20m settlement and restrictions addressing age, currency purchases, costs and odds | Treat age eligibility, purchase-path clarity and odds provenance as first-class review fields. This case is not a blanket US statute for all games. |
| UK advertising | ASA's 26 February 2026 notice calls for prominent app-store disclosure of paid loot boxes, with active monitoring from 26 May 2026 | Add a review item for storefront/marketing disclosure, separate from the in-game probability table. |
| PEGI submissions | March 2026 announcement, reproduced by AEVI, applies broader criteria to submissions from June; paid random items have a default PEGI 16 classification, with some PEGI 18 cases | Version rating assumptions and record parental/control features and submission context. Age ratings and gambling licences are different approvals. |
| South Korea | MCST issued probability-disclosure guidance, including an English version in March 2024 | Provide an export adapter and local review workflow; do not claim worldwide disclosure equivalence. |
| Japan | Consumer Affairs Agency explains the card-matching prohibition relevant to complete-gacha rewards | Flag paid random distinct-item set completion that grants an additional economic benefit for review. Ordinary collection analysis is not itself proof of a prohibited design. |
| UK licensed gambling | RTS 7 requires acceptable randomness, prohibits compensated/adaptive behaviour, addresses misleading near misses and rule changes | Separate reproducible research RNG from production randomness; maintain rules, change notices and lab-review evidence. Stateful gacha features need specific applicability review. |
| Gambling technical evaluation | GLI-19 provides an interactive-gaming technical framework; applicable jurisdictions decide acceptance | Produce a mathematical evidence package. Do not badge the simulator or exported design as certified without actual testing and approval. |

Sources: [Apple App Review Guidelines 3.1.1](https://developer.apple.com/app-store/review/guidelines/), [Google Play Payments policy](https://support.google.com/googleplay/android-developer/answer/9858738?hl=en), [EU CPC principles, 21 March 2025](https://commission.europa.eu/document/download/8af13e88-6540-436c-b137-9853e7fe866a_en?filename=Key+principles+on+in-game+virtual+currencies.pdf), [FTC Cognosphere announcement](https://www.ftc.gov/news-events/news/press-releases/2025/01/genshin-impact-game-developer-will-be-banned-selling-lootboxes-teens-under-16-without-parental), [ASA 2026 notice](https://www.asa.org.uk/resource/enforcement-notice-disclosure-of-loot-boxes-in-app-stores.html), [AEVI reproduction of PEGI announcement](https://aevi.org.es/pegi-amplia-los-criterios-de-clasificacion-por-edad-con-categorias-de-riesgo-interactivo/), [MCST English-guidance notice](https://www.mcst.go.kr/site/s_notice/notice/noticeView.jsp?pSeq=17910), [Japan CAA card-matching Q&A](https://www.caa.go.jp/policies/policy/representation/fair_labeling/faq/card), [UKGC RTS 7](https://www.gamblingcommission.gov.uk/manual/remote-gambling-and-software-technical-standards/rts-7-generation-of-random-outcomes), [GLI standards catalogue](https://gaminglabs.com/gli-standards/).

## 6. Questions the available research cannot answer

There is no defensible universal function of the form `retention = f(pity, rarity)` or `excitement = reward variance`. The reviewed evidence does not establish a transferable optimum for pity length, pricing, duplicate protection, event cadence, or cash-out margins.

These need company-specific evidence:

- Does an earlier guarantee expand the participating population enough to offset lower spend per goal?
- Does duplicate salvage create meaningful progress or just more currency inflation?
- Does completion produce satisfaction and a new voluntary goal, or end the reason to return?
- Does pack animation improve reported enjoyment independently of rewards?
- Do multiple concurrent offers create incremental value or cannibalize one another?
- Do shared rewards improve social enjoyment after allocation disputes and group churn are included?
- Do favourable simulated outcomes survive economic uncertainty and conservative behavioural responses?

The plan answers these as testable questions, not fabricated uplift estimates.

## 7. Discovery and research programme

**Proposed pilot research, not work already conducted:** interview 8-12 economy designers, analysts, live-ops owners and finance/compliance stakeholders across 3-5 potential customers. Ask each to bring a recently contested model decision and describe the current analysis, data, decision owner, and failure modes. Include a digital-pack business and a licensed gambling operator if both remain target markets.

Run 5-8 task-based prototype sessions: import a baseline, explain a stateful rule, modify it, find a tail outcome, compare candidates, and identify unsupported business claims. Record completion, time, misunderstandings and decisions that still need a spreadsheet. Sample sizes are pragmatic qualitative targets, not representative market estimates.

Secure one pilot with an authoritative configuration and consented, pseudonymized or suitably aggregated historical data. Aim for mature cohorts covering at least two representative event cycles; a 90-180-day extract is a useful starting target where lawful and available. Data volume, season length and product profile can change that requirement.

Agree the financial definitions with finance, replay reward mechanics with the implementing engineers, and validate behavioural forecasts on a later held-out period. Follow a simulated recommendation with a preregistered experiment if operationally and legally eligible.

## 8. Source access and interpretation notes

- Full text or substantive official body was inspected for GEEvo, the SDT paper, the BMC replication, the EU principles, the institutional RAFFLE record and the referenced official product/policy pages.
- The 2025 pricing/pity paper was assessed from its indexed publisher abstract and highlights; detailed methods and effect sizes were not verified. The Gan and Viljanen papers were reviewed at abstract level. They justify avenues of design, not numerical default parameters.
- PMC pages presented access challenges; RAFFLE was checked through the author repository and the replication through its publisher.
- PEGI's own announcement timed out. Its announcement text was inspected through the Spanish video-game industry association AEVI, which explicitly republishes PEGI's statement. Do not use this review to infer unlisted exceptions or transition rules.
- MCST's notice establishes availability of English guidance. This review does not claim to have implemented or legally validated the detailed Korean disclosure format.
- Product documentation establishes advertised features, not comparative accuracy, customer willingness to pay, or absence of competing capabilities.
- Recheck changeable policies before a pilot, integration or release. The findings above are tied to the research date, not promised future applicability.
