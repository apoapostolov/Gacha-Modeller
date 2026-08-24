# Blue Archive recruitment (like-model)

JP 5.5 (29 Jul 2026) swapped Recruitment Points for Recruitment Charge. This lab keeps both, as studied like-models. Rates are the published pickup table. Charge rules follow the JP wiki and Yostar's 28 Jul writeup, not a scraped live banner.

If you saved for a dual pickup under the old 200 spark, this is the change that burned that plan.

## Published rates (both models)

| Roll | Rate |
| --- | --- |
| 1-star | 78.5% |
| 2-star | 18.5% |
| 3-star (any) | 3.0% |
| This banner's pickup 3-star | 0.7% |
| Cost | 120 pyroxene-like |
| 10-pull | last slot is 2-star or better |

On a normal roll, P(pickup given a 3-star) is 0.7 / 3 ≈ 23.3%. That is **not** the 50% at charge 100.

Fest banners double the 3-star group to 6% and still publish 0.7% on the featured student. Not in the v0 preset.

## Old: Recruitment Points (spark)

Global still used this when JP shipped charge. Archive banners still use a point spark.

- 1 point per pull.
- 200 points buy **one** current pickup. You choose which, if two rate-ups share the pool.
- A natural pickup does **not** reset or spend the points.
- Dual / concurrent pickups of the same campaign share the point pool.
- When the pickup period ends, leftover points convert 1:1 to Keystone Pieces. They do not carry to the next pickup.

The plan people lost: you hit A at 60, you keep pulling, you spark B at 200. Both students, 200 pulls.

Worst case for both was never 200. Spark spends the bar. A second student still needs another 200 or a natural. What died is the *banked leftover*, not the ceiling.

## New: Recruitment Charge (JP 5.5)

Announced 26 Jul 2026 on the JP 5.5 livestream, detailed 28 Jul, live 29 Jul. Producer Kim Yong-ha apologised for the short notice. Steam recent reviews went Overwhelmingly Negative. Global date was unannounced in those writeups.

- Charge +1 per pull. Two bars: regular pickups, and limited / anniversary / encore / recollection.
- Same-type banners share a bar. The bar **carries** when a banner expires.
- Off-banner 3-stars, including a concurrent other pickup, do **not** reset charge.
- This banner's pickup **does** reset charge to 0, including a natural 0.7%.
- At **exactly 100** charge: this pull is a 3-star, **50%** this banner's pickup. A miss does not arm the next 3-star. Charge stays at 100 and keeps ticking.
- At **200** charge: this pull is this banner's pickup. Charge then resets.

There is no capturing. A lost 100 is just a 3-star and a longer walk to 200.

Dual same-type pickups share the bar, so getting A zeros the bar you wanted for B. "Both students" stopped being a 200-bank plan and became two independent charge cycles.

## What the lab compares

| Preset | First pickup | Two sequential pickups |
| --- | --- | --- |
| `blue-archive-spark` | Spark at 200 if you still need them | Leftover points stay; spark the second |
| `blue-archive-charge` | 100 coin, 200 hard, reset on hit | Second banner starts at charge 0 |

Pick either Blue Archive preset and the UI runs both two-pickup arms.

Unconditional mean pulls to *two* pickups can favor Charge. The 100-charge 50% 3-star is a real gift on every cycle, twice. The sting is leftover banking and the tail: if A lands by 80, Spark still caps both at 200, Charge can walk a second 200 (p90 and max go up). The lab reports that early-A slice on its own. A lost 100 also does not capture. You lose the spark *choice* of which concurrent pickup to take.

## Sources

- [Blue Archive Wiki: Recruitment](https://bluearchive.wiki/wiki/Recruitment_(Gacha)): rates, spark, charge, two bars, reset rules
- [Inven Global, 28 Jul 2026](https://www.invenglobal.com/articles/24203/blue-archive-details-upcoming-monetization-changes-for-jp-server): Yostar breakdown, 100/50%/200, carry by type
- [Automaton West](https://automaton-media.com/en/news/blue-archive-executive-producer-apologizes-following-backlash-over-changes-to-gacha-and-pity-system/): apology, dual-banner reset, Steam rating
- [JP notice](https://bluearchive.jp/news/newsJump/679) and [JP X explainer](https://x.com/Blue_ArchiveJP/status/2081354265256468538)

This is a like-model. If JP patched the 50% or the reset after these sources, the preset stays stale until we cite a new shape.
