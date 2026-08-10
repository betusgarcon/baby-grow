# [OPEN] Debug Session: wishes-save-freeze

## Context
- Symptom: Clicking the save button on `wishes-museum.html` returns to `wishes-list.html`, then the page/browser/IDE may freeze.
- Expected: Save feedback appears and navigation completes without UI lockup.
- Scope: `prototype_demo` flow around `wishes-museum.html`, `wishes-list.html`, and recent museum persistence logic.

## Hypotheses
1. Save action triggers a synchronous blocking path before or during navigation, freezing the main thread.
2. `wishes-list` enhancement logic causes repeated DOM reordering or repeated event binding after navigation.
3. Persisted museum data in local storage grows or is re-rendered recursively, causing runaway DOM work.
4. Save action causes duplicate navigation or duplicated frame enhancement cycles, resulting in repeated reloads.

## Evidence Plan
- Add runtime instrumentation only, no business-logic fix yet.
- Observe save-click, route transitions, iframe enhancement frequency, and wishes-list reorder/render counts.
- Reproduce once and compare logs to determine which hypothesis holds.

## Evidence
- Local log file `.dbg/trae-debug-log-wishes-save-freeze.ndjson` currently contains only two events:
  - `app.js:enhanceIframe` for route `wishes-list`
  - `app.js:reorderWishesCards` with `alreadyReordered: false`
- The log does **not** yet contain `save-click`, `post-alert-navigation`, or repeated navigation evidence.
- Current evidence is insufficient to prove an infinite loop, repeated enhancement cycle, or storage-driven recursion.

## Temporary Mitigation
- Per user instruction, downgrade `wishes-museum` save behavior to direct navigation back to `wishes-list.html`.
- Checkbox interaction remains visual-only and does not write any checklist state to local storage.
- Keep the session open because the root cause is not yet conclusively proven.

## Status
- Session opened.
- Instrumentation exists but produced incomplete evidence for the failing save chain.
- Temporary mitigation applied while keeping the debug session open.
