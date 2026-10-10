# Workspace usability

The workspace serves people inspecting reward access and comparing proposed changes. Project selection, model context and candidate loading precede analytical output. Existing probability, evidence and financial contracts remain independent.

## Interaction contract

- [x] The subtitle “Probability models” stays on one line.
- [x] The Project header, file actions and comparison controls belong to the content column.
- [x] Projects and Companies use separate sidebar tabs. A file with company evidence, or in the Company section, appears under Companies.
- [x] Search filters names, game context and section names immediately and expands matching folders. Each tab retains its own query.
- [x] Refresh is a borderless glyph to the right of search, with an accessible name and a fixed target. Refresh rescans local files and resets the loaded comparison selection.
- [x] The initial model view contains the locked baseline and candidate selection. Candidate detail panels, changes and results appear after explicit loading.
- [x] Current and historical candidates are selectable. Loading a historical revision for comparison does not promote it in the saved file. Edited models create a new candidate revision.
- [x] Acquisition and specialist workers run only on request. Candidate unloading, project selection and refresh cancel acquisition work.
- [x] Short overview paragraphs explain context, distinctive mechanics, reward support and analysis focus. Technical detail remains in keyboard-accessible help and native disclosures.

Complete project files still contain baseline, candidate and history snapshots. Candidate loading controls inspection and execution; it does not claim lazy network transfer of individual snapshots. All projects continue to come from the directory API.

## Description contract

Format 7 adds an optional `overview` object with five nonempty string fields: `context`, `summary`, `distinctive`, `strength`, `analysis`. Each field is limited to 1,200 characters. The first sentence is visible, with additional explanation in help. The 17 shipped examples include concise authored descriptions; older files receive a generic description from their configured model. Companies and other modules preserve the latest envelope version when saving.

Descriptions name dated game-like examples or synthetic contexts. “Reward support” describes a feature such as a guarantee or crafting route; it does not imply measured commercial success. Descriptions are editable in the project JSON. They never modify the locked model, probability rules or model snapshot hashes.

## Accessibility decisions

- Native buttons, search inputs, selects, details and dialogs carry their usual keyboard behaviour.
- The Projects/Companies tablist supports Left/Right arrows, Home and End, with one tab stop and a visible selected underline.
- Refresh uses an accessible name, a 40-pixel target, a 44-pixel coarse-pointer minimum and a contrasting brass foreground.
- The skip link targets the project content directly, bypassing the sidebar.
- Project selection moves focus to its heading, including when the phone library closes.
- Explicit candidate loading/unloading moves focus to the surviving candidate region; the next Tab reaches its controls.
- Routine help remains a separate button, outside disclosure summaries. ArrowDown enters a help panel; Escape closes it.
- Narrow layouts stack overview and model columns, expose the library through its own toggle, and contain long revision names in the native selector.

## Verification

Automated checks cover baseline-only opening/refresh, explicit execution, cancellation, historical selection without promotion, module saves retaining format-7 descriptions, schema validation and axe semantic checks. Manual browser checks cover instant folder search, arrow-key tabs, candidate loading, an actual worker comparison, help/drawer focus and narrow reflow. Browser emulation and semantic checks do not establish full screen-reader or physical-device compliance.
