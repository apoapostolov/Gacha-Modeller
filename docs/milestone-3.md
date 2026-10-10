# Milestone 3 delivery contract

The next phase expands the existing declarative engine. Old models keep their pull semantics and seeds. New model/snapshot envelopes use version 2; version 1 remains importable.

- [x] Scope rarity counters, capture, featured/target progress, exchange progress and once-only protection to a banner, a named family or the account. Define retention/reset separately for banner, season and target changes. Test returning to an old banner and crossing seasons.
- [x] Select a featured target, support one-time hard guarantees, select shop rewards, and pursue multiple item/copy targets. Test that an exchange does not rearm a one-time guarantee.
- [x] Add exact rarity/item slots with quantities. Support independent replacement, weighted sampling without replacement in an unprotected single-tier pool, and shared-item packs. Reject combinations whose precedence is undefined.
- [x] Add copy caps, protection within the same rarity/featured bucket, overflow discard/salvage and selected-item crafting. Verify copy and shard conservation.
- [x] Expose every supported rule in the editor and scheduled transitions in run settings. Keep explanations in the existing custom help panels.
- [x] Add a mechanism atlas with rule-level source classification and a state-by-state journey viewer. Export representative completed and incomplete traces with exact trial indices and visible truncation.
- [x] Extend conservative reachability for explicit slots, selected targets, caps and crafting. Do not claim exhaustive proofs for interacting counters.
- [x] Verify old tests, new boundary fixtures, legacy import/replay, authoring and exports in the browser. Update the main checklist only after these behaviours pass.

Transitions execute before the next complete purchase once its purchased-pull boundary is reached. A boundary inside a pack is deferred until the pack ends. Event array order resolves equal boundaries. Inventory and total purchased pulls persist; protection fields follow their individual matrix. Draw prices accumulate per active model, and a journey must use one currency unit.

The initial no-replacement/shared-item implementations require an unprotected single-tier pool. This gives explicit, verifiable correlation semantics without silently overriding pity or featured rules. Richer correlated multi-tier configurations need another declared executor.

Verification includes 110 tests across ten suites and the three v2 workflow fixtures. Browser authoring/import/export checks passed in the Codex Chromium in-app browser, including a 390 x 844 layout check. See the [work record](../DEVELOPMENT.md) for the evidence and remaining verification limits.
