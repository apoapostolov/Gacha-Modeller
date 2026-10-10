# Company workbench

Milestone 2 provides a local authoring and comparison workflow. It compares mechanics and resource consumption. The later economy and evidence milestones cover company profitability, engagement and retention.

## First comparison

1. Open the lab at `http://localhost:3018/`.
2. Use **Import project** with [company-banner.json](fixtures/company-banner.json). Import creates a locked baseline and an editable candidate. The baseline keeps its source; candidate forks are labelled original.
3. Open **Edit candidate**, change **Chase hard pity** from 100 to 80, review the description/notes to match the new rule, then **Save candidate**. Invalid drafts cannot be saved. The previous candidate stays in history.
4. In **Run settings**, set 1,000 trials, seed 42 and a 200-pull horizon. Run the comparison.
5. Baseline mean purchases are 63.276 pulls; candidate mean purchases are 55.177. Both attain 100%; p90 changes from 100 to 80. These are sampled resource outcomes.
6. Switch between attainment and still-waiting curves. Both use the same axes and the whole population, including unfinished goals. **Completion evidence** explains failures and conditional summaries.
7. Export both project and comparison. Re-importing the comparison restores the exact snapshot pair and controls and reproduces the numerical reports.

Repeat with [company-pack.json](fixtures/company-pack.json), choose **Whole pack**, and change the cap to 80. The declared purchase has ten slots. At the same seed and trial count, mean purchased pulls are 66.32 versus 57.85; p90 attainment is 100 versus 80. Acquisition can occur before a pack's final slot, but the full purchase is charged. The filler minimum adds no extra chase guarantee.

## Authoring and help

The editor supports item IDs, names, weights and featured flags; rarity priority and rates; hard/soft pity and reset links; featured probability and capture; charge checkpoints; exchange cost/reset effects; pack size/minimum tier; and the existing original modifiers. Probabilities use fractions, so `0.01` means 1%. Renaming a rarity updates references. Removing it may require fixing remaining items or rules; live validation identifies those fields.

The header has two fixed actions. Run controls live in a drawer with a scrolling body and fixed action footer, so more controls can be added without expanding the header. Short descriptions stay visible. Detailed explanations use custom `?` panels, available by hover, keyboard focus or tap. Escape dismisses the help first, then the drawer; drawer closure restores focus. Long panels scroll within the viewport. The model library collapses on small screens and wide comparison tables scroll within their own container.

Candidate drafts stay in memory while their project remains selected. Save creates a new immutable revision. History loads an earlier revision into the editor for review and a new save; it never edits the baseline. Committed projects, settings and history save locally. Export regularly for portable backups. A failed local save is shown explicitly. Unreadable primary and backup copies are preserved, and the app works in memory rather than replacing them.

## Import and replay contract

Supported JSON inputs:

- Raw legacy `Banner` object.
- `{ "format": "gacha-modeller-model", "version": 1, "model": ... }`.
- `gacha-modeller-project` version 1 with schema-versioned snapshots, history and settings.
- M1 `gacha-modeller-result` version 1, restoring the model and original controls.
- M2 `gacha-modeller-comparison` version 1, restoring both models and completed-run settings.

Snapshots hash canonical model content using SHA-256: object keys sorted, array order retained, absent optional fields omitted. Imports verify hashes and supported fields. This detects content mismatches; it does not authenticate the author. An import with an existing project ID creates a separate project. Comparison exports use the completed run's settings even when the settings drawer contains newer edits. Imports are limited to 5 MB.

M2 uses `workbench-2` / `event-streams-v1`. For a programmatic replay, import `importProject` from `src/project/project.ts` and `compareProject` from `src/jobs/compare.ts`, then run:

```ts
const project = await importProject(bundle);
const replay = await compareProject(project, project.settings);
```

Trial/event indexing makes main comparison results independent of worker batch size. Older M1 numerical sequences use `runMonteCarlo` with their manifest. Supplementary guild and two-pickup lessons keep their legacy random policy and explicit scenario controls. They are separate lessons, not edited-candidate evaluations.

## Current limits

There are no confidence intervals or exact solvers yet. Reachability diagnostics remain conservative. Packs support replacement draws and one minimum-tier guarantee; slot layouts, correlations and duplicate transformations belong to M3. There is no paid/free currency ledger or behavioural calibration yet. The [development checklist](../DEVELOPMENT.md) defines those next steps.
