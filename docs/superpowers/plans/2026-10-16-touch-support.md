# Touch support, phase 1 (#26) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a finger on a handheld:
- pick and open games on Spotlight Home;
- swipe the games row and the feed rows;
- raise and lower the feed sheet;
- tap the game page's info and HowLongToBeat cards.

**Architecture:**
- **Pointer Events** on Home's existing transform-based rows.
- **Taps** are the browser's `click`.
- **Drags** are selection runs through Home's own `select()` and `useFastCycle`.
- **Gesture maths** lives in one pure module (`rowDrag.ts`).
- **A React hook** (`useRowDrag.ts`) wires pointer events to that module.
- **The game page cards** get tap actions in `cardActions.ts`, which a later controller step will reuse.

**Tech Stack:** TypeScript, React (Decky `@decky/ui` `Focusable`), vitest (node environment, no DOM: tests use plain objects), Steam's CEF (Chromium).

**Spec:** `docs/superpowers/specs/2026-10-16-touch-support-design.md`

## Global Constraints
- **Pointer Events only** (`pointerdown/move/up/cancel`), never `touch*` listeners.
- **Distances in logical px:** screen deltas ÷ (the `.gh-canvas` rect width ÷ `canvas.logicalWidth`).
- **The controller behaves exactly as before.** After a touch on Home, Steam's controller focus is in the touched zone.
- **No outside implementation is used or consulted.**
- **Commits** as `Michael Palma <18511803+michpalm@users.noreply.github.com>` (env vars), ending with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. Commit locally; push only when asked.
- **Work only in the `feat/touch` worktree**, never in the shared checkout.
- **Checks per task:** `npx vitest run` and `npx tsc --noEmit` must pass (1229 tests before this work).

## Review Focus
1. **A tap during a fast run or drag settle** opens the game Home is about to show, not a stale one. `onRecentsActivate` already settles first; Task 2 adds a test that a tap on the selected index is `'open'` regardless of run state.
2. **A second finger** (a second pointer) during a drag is ignored, so it doesn't restart or double-step the drag. Task 3: the hook acts only on `event.isPrimary`; device check.
3. **Steam taking the touch mid-drag** (QAM, overlay, `pointercancel`) must not leave Home stuck in a fast run (hero frozen). Task 3: `pointercancel` calls `onRun(false)` at once. Task 1's test that `flickRun(0, step)` is empty pins the "no flick, end now" path. Device check in Task 3.
4. **Rows with 0 or 1 games, or only the Library card:** a drag clamps and never wraps or throws. Task 1 tests `dragTarget` for count 0 and 1.
5. **A tap while the open transition runs** is ignored (`[data-gh-opening]` already sets `pointer-events: none`). Task 2 asserts that the new row rules don't override it.

---

### Task 1: `rowDrag.ts`, the gesture maths

**Files:**
- Create: `src/home/rowDrag.ts`
- Test: `tests/home/rowDrag.test.ts`

**Interfaces:**
- Produces:
  - `export type Axis = 'x' | 'y'`
  - `export const DRAG_SLOP = 10` (logical px)
  - `export const SWIPE_SHEET = 60` (logical px, vertical swipe to raise or lower the sheet)
  - `export function axisLock(dx: number, dy: number, slop = DRAG_SLOP): Axis | null`
  - `export function dragSteps(dx: number, step: number): number`: whole cards to move, rounded to the nearest card. The finger moving left (dx < 0) means positive steps (next card).
  - `export function dragTarget(start: number, steps: number, count: number): { index: number; overscroll: number }`: clamps to `0..count` (count is the Library card); `overscroll` is the steps beyond the ends (signed).
  - `export interface Sample { t: number; x: number }`
  - `export function releaseVelocity(samples: Sample[], windowMs = 100): number`: px/ms, a least-squares slope over samples within `windowMs` of the last one; 0 with fewer than 2.
  - `export const FLICK_MIN = 0.5` (px/ms)
  - `export function flickRun(velocity: number, step: number): number[]`: delays in ms for each extra step, sign ignored (the caller applies direction). Empty below `FLICK_MIN`. The number of steps is `round(|v| * 160 / step)`, at most 8. Delays start at 60 ms and grow by ×1.35 each.
  - `export function rubberBand(overscroll: number, limit: number): number`: `limit * (1 - 1 / (1 + |o| / limit))` with the sign of `o`.
  - `export function cardTap(index: number, focused: number): 'select' | 'open'`

- [ ] **Step 1: Write the failing tests** in `tests/home/rowDrag.test.ts`. One `it` per function:
  - `axisLock`:
    - `(3, 4)` → `null`
    - `(12, 3)` → `'x'`
    - `(-2, -15)` → `'y'`
    - `(10, 10)` → `'x'` (a tie goes to the row)
  - `dragSteps`:
    - at step 168 (the handheld card pitch at ×1.6): `(-170, 168)` → `1`
    - `(250, 168)` → `-1`
    - `(-90, 168)` → `1`
    - `(-80, 168)` → `0`
    - `(0, 168)` → `0`
    - and the same cases scaled by the docked pitch from `recentsGeometry(CARD_SCALE_DOCKED).step`
  - `dragTarget`:
    - `(2, 3, 10)` → `{ index: 5, overscroll: 0 }`
    - `(1, -4, 10)` → `{ index: 0, overscroll: -3 }`
    - `(9, 3, 10)` → `{ index: 10, overscroll: 2 }`
    - count 0: `(0, 2, 0)` → `{ index: 0, overscroll: 2 }`
    - count 1: `(0, -1, 1)` → `{ index: 0, overscroll: -1 }`
  - `releaseVelocity`:
    - evenly spaced samples moving −2 px/ms → `-2` (within 1e-6)
    - uneven spacing on the same line → `-2`
    - samples older than 100 ms are ignored
    - a single sample → `0`
  - `flickRun`:
    - `flickRun(0.3, 168)` → `[]`
    - `flickRun(2, 168)` has 2 entries, `[60, 81]` (rounded)
    - `flickRun(20, 168)` has length 8
  - `rubberBand`:
    - `rubberBand(0, 40)` → `0`
    - `rubberBand(40, 40)` → `20`
    - a huge input stays below 40
    - `rubberBand(-40, 40)` → `-20`
  - `cardTap`:
    - `(3, 3)` → `'open'`
    - `(2, 3)` → `'select'`
    - `(10, 10)` (the Library card) → `'open'`

- [ ] **Step 2: Run** `npx vitest run tests/home/rowDrag.test.ts`. Expected: FAIL (module not found).
- [ ] **Step 3: Implement `src/home/rowDrag.ts`** with the signatures and values above, plus a module comment as in `focusZones.ts`.
- [ ] **Step 4: Run** `npx vitest run tests/home/rowDrag.test.ts && npx tsc --noEmit`. Expected: PASS.
- [ ] **Step 5: Commit** with the message `Touch: gesture maths for the rows (rowDrag)`.

### Task 2: Games row taps

**Files:**
- Modify: `src/home/homeCss.ts:354-355` (`.gh-recents`)
- Modify: `src/home/RecentsRow.tsx` (`RecentsRowNav`, cards and ghosts)
- Modify: `src/home/SpotlightHome.tsx` (`recentsNav`, about line 286)
- Test: `tests/home/homeCss.test.ts:121-138`

**Interfaces:**
- Consumes: `cardTap(index, focused)` (Task 1).
- Produces: `RecentsRowNav.onSelect(index: number): void`. Task 3 uses it for drags.

- [ ] **Step 1: Change the test** `the recents row is display only…` into `the recents row takes touch: pointer events on, its own gestures, off under the sheet and while opening`:
  - expect `.gh-recents { … pointer-events: auto … touch-action: none … user-select: none }`;
  - expect `.gh-page-up .gh-recents { pointer-events: none }`;
  - keep the ring and marks assertions;
  - remove the `not … cursor: pointer` assertion;
  - expect the existing `[data-gh-opening]` rule still comes after the row rule, so it wins: `css.indexOf('pointer-events: none', css.indexOf('[data-gh-opening]'))` is greater than the `.gh-recents` rule's index (Review Focus 5).
- [ ] **Step 2: Run** `npx vitest run tests/home/homeCss.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement:**
  - **`homeCss.ts`:** swap `pointer-events: none` for `pointer-events: auto; touch-action: none; user-select: none` and add the `.gh-page-up .gh-recents` rule. Update the comment above it: "one gamepad focusable; taps select or open, drags step the selection (useRowDrag)".
  - **`RecentsRow.tsx`:**
    - Add `onSelect(index: number): void` to `RecentsRowNav`.
    - Give each `GameCapsule` wrapper, the Library card and each ghost an `onClick`. It calls `event.stopPropagation()`, then `cardTap(i, at) === 'open' ? nav.onActivate() : nav.onSelect(i)`. A ghost `j` selects `j`; the Library card's index is `count`.
    - Ghosts keep `pointer-events: none` in CSS today; change them to `pointer-events: auto` and keep `cursor: default`.
  - **`SpotlightHome.tsx`:** `onSelect: (i) => { focusGames(); select(i); }`.
- [ ] **Step 4: Run** `npx vitest run && npx tsc --noEmit`. Expected: PASS.
- [ ] **Step 5: Device check (Deck, port 18081).** Package with `scripts/package.sh`, serve `out/`, install with `DeckyBackend.call('utilities/install_plugin', …)`. Then check:
  - a tap on an unselected card selects it and the controller focus ring is on the row;
  - a tap on the selected card opens it with the open transition;
  - check whether the `Focusable` also fired `onActivate` on a first tap: the game opens instead of selecting. If it does, guard `onActivate` with a flag set in the card's `pointerdown` and cleared after `click` (a code step here, documented in the commit);
  - the Library card opens the Library when selected;
  - a ghost selects its game.
- [ ] **Step 6: Commit** with the message `Touch: tap a game to select it, tap again to open`.

### Task 3: Games row drags as selection runs

**Files:**
- Create: `src/home/useRowDrag.ts`
- Modify: `src/home/RecentsRow.tsx` (track transform and class)
- Modify: `src/home/SpotlightHome.tsx` (`useFastCycle` input, drag wiring)
- Modify: `src/home/homeCss.ts` (`.gh-recents-drag .gh-recents-track { transition: none }`)
- Test: `tests/home/homeCss.test.ts` (the drag rule)

**Interfaces:**
- Consumes: `axisLock`, `dragSteps`, `dragTarget`, `releaseVelocity`, `flickRun`, `rubberBand`, `DRAG_SLOP` (Task 1); `RecentsRowNav.onSelect` (Task 2).
- Produces:
  - `export function useRowDrag(opts: { index: number; count: number; step: number; scale: () => number; onSelect(next: number): void; onRun(running: boolean): void; onVerticalSwipe?(dy: number): void }): { dx: number; dragging: boolean; handlers: { onPointerDown; onPointerMove; onPointerUp; onPointerCancel } }`
  - `dx` is the finger's movement in logical px since the drag locked. Past the first or last card, the part beyond the end is passed through `rubberBand(beyond, step * 0.5)`.
  - **The row follows the finger exactly:** while `dragging`, the track sits at `scrollX at drag start + dx`. On release it returns to the layout's `scrollX` for the new selection. This holds in both row styles. In Steam style the layout doesn't scroll until the selection passes the middle, so a leftover-only offset would leave the cards still under a moving finger.
  - Task 4 reuses the hook for the feed rows, with `onRun` as a no-op.

- [ ] **Step 1: Write the failing CSS test:** `.gh-recents-drag .gh-recents-track` has `transition: none`.
- [ ] **Step 2: Run it.** Expected: FAIL.
- [ ] **Step 3: Implement `useRowDrag`:**
  - **Pointer filtering:** track one pointer (`isPrimary` only), and record `start index` at `pointerdown`.
  - **On move,** collect `Sample`s from `getCoalescedEvents()` when available, else the event itself. Lock the axis with `axisLock` on logical deltas (screen ÷ `scale()`).
    - **`'x'`:**
      - `setPointerCapture`, then call `onRun(true)` once.
      - `dragSteps(dx, step)` → `dragTarget(start, steps, count)`. Call `onSelect(index)` when the index changes.
      - Update `dx` (rubber-banded past the ends, as in Interfaces).
    - **`'y'`:** do nothing until release, then call `onVerticalSwipe(dy)`.
  - **On `pointerup`:**
    - set `dragging` to false, so the track transition settles to the layout's position;
    - `flickRun(releaseVelocity(samples), step)` → schedule one `onSelect` per delay in the flick's direction, clamped with `dragTarget`;
    - `onRun(false)` after the last one, or at once when there's no flick.
  - **On `pointercancel`:** `dragging` false, no flick, `onRun(false)`.
  - **Cleanup:** clear the flick timers on unmount and on a new `pointerdown`.
- [ ] **Step 4: Wire it:**
  - **`SpotlightHome`:**
    - `const [dragRunning, setDragRunning] = useState(false)`, and feed `bumperRepeating || directionRepeating || dragRunning` into `useFastCycle`.
    - `scale` = the `.gh-canvas` rect width ÷ `canvas.logicalWidth`.
    - `step` = the current `geometry.step`.
    - `onSelect` = Task 2's `onSelect`.
    - `onVerticalSwipe` is left for Task 4.
  - **`RecentsRow`:**
    - spread `handlers` on the `Focusable`;
    - add `gh-recents-drag` to the track while `dragging`;
    - keep a ref with `layout.scrollX` at the drag's start (set when `dragging` turns true);
    - set the track transform to `translateX(${dragging ? startScrollX + dx : layout.scrollX}px)`.
  - Add the CSS rule.
- [ ] **Step 5: Run** `npx vitest run && npx tsc --noEmit`. Expected: PASS.
- [ ] **Step 6: Device check on the Deck and the Ally (port 18080), in both row styles:**
  - the drag follows the finger;
  - the hero holds and updates on release;
  - a flick runs several cards;
  - the ends spring back;
  - lifting the finger never opens a game;
  - a second finger does nothing;
  - opening the QAM mid-drag leaves Home responsive (Review Focus 2 and 3);
  - record one drag with the CEF screencast script.
- [ ] **Step 7: Commit** with the message `Touch: swipe the games row (a drag steps the selection like a held stick)`.

### Task 4: Feed sheet (swipes, tabs, feed rows)

**Files:**
- Modify: `src/home/SpotlightHome.tsx` (vertical swipe handling on the Home root)
- Modify: `src/home/FeedSheet.tsx` (track drag, tab taps)
- Modify: `src/home/homeCss.ts` (`.gh-tabs` pointer events)
- Test: `tests/home/homeCss.test.ts`

**Interfaces:**
- Consumes: `useRowDrag` (Task 3), `SWIPE_SHEET`, `axisLock` (Task 1).
- Produces: nothing new for later tasks.

- [ ] **Step 1: Write the failing CSS tests:**
  - `.gh-tabs` has `pointer-events: none`;
  - `.gh-page-up .gh-tabs` has `pointer-events: auto`.
- [ ] **Step 2: Run it.** Expected: FAIL.
- [ ] **Step 3: Implement:**
  - **The CSS rules.**
  - **Vertical swipes in `SpotlightHome`:**
    - `onVerticalSwipe(dy)` from the row: `dy <= -SWIPE_SHEET` raises the sheet (focus the current tab: expose `raise()` from `FeedSheet` through a ref or callback prop `onRaiseRequest`, which focuses `tabRefs.current[tab]`).
    - A root-level `pointerdown`/`pointerup` pair on `.gh-root` (`axisLock` `'y'`): `dy <= -SWIPE_SHEET` while not `sheetUp` raises; `dy >= SWIPE_SHEET` while `sheetUp` calls `focusGames()`.
    - The row's own swipe is the same gesture; ignore the root's when the row already handled it (`event.defaultPrevented`, set by the row hook).
  - **Each feed track:**
    - `useRowDrag({ index: sel[r], count: rows[r].length - 1, step: rows[r][sel[r]].width + FEED_GAP, onSelect: (i) => focusElement(cardRefs.current[flat(r, i)], 'feed card'), onRun: () => {} })`;
    - the handlers go on the `Focusable`, and while dragging the track's transform is the scroll at the drag's start minus `dx` (`translateX(${-(startScroll) + dx}px)`, the same rule as the games row);
    - feed cards keep their `onClick`.
- [ ] **Step 4: Run** `npx vitest run && npx tsc --noEmit`. Expected: PASS.
- [ ] **Step 5: Device check:**
  - a swipe up on the row or the hero raises the sheet;
  - a swipe down lowers it;
  - invisible tabs no longer react at rest;
  - a tap on a tab switches tabs;
  - a drag steps a feed row;
  - a tap on a feed card opens it;
  - the controller still moves through tabs and cards.
- [ ] **Step 6: Commit** with the message `Touch: swipe the feed sheet up and down, and its rows sideways`.

### Task 5: Game page cards, the touch part of #24

**Files:**
- Create: `src/components/cardActions.ts`
- Modify: `src/components/InfoCard.tsx`, `src/components/HltbCard.tsx` (optional `onPress?: (el: HTMLElement) => void`; the root `div` gets `onClick` and the class `gg-card-tap` when set)
- Modify: `src/components/GameHero.tsx:187-189` (pass the actions)
- Modify: `src/styles/themeCss.ts` (pressed state, and the cards' pointer events in Unifideck's layout, line 405)
- Test: `tests/components/cardActions.test.ts`, `tests/styles/themeCss.test.ts`

**Interfaces:**
- Produces, for the later controller step:
  - `export function hltbUrl(result: HltbResult | undefined): string | null`: `https://howlongtobeat.com/game/<gameId>` for `status: 'found'`, else `null`.
  - `export const GAME_INFO_TAB = '[role="tab"][id$="GameInfo"]'`
  - `export function openGameInfoTab(doc: Pick<Document, 'querySelector'>): boolean`: `click()` the tab, `scrollIntoView({ block: 'start', behavior: 'smooth' })`, and `takeSteamFocus`/`focusElement` on it. Returns false if the tab isn't found.
  - `export function openHltbPage(result: HltbResult | undefined): boolean`: `Navigation.NavigateToExternalWeb(url)` when `hltbUrl` isn't null.

- [ ] **Step 1: Write the failing tests:**
  - `hltbUrl`: found with gameId 68151 → `'https://howlongtobeat.com/game/68151'`; `notFound`, `unavailable` and `undefined` → `null`.
  - `openGameInfoTab`, with a fake doc whose `querySelector(GAME_INFO_TAB)` returns `{ click: spy, scrollIntoView: spy, focus: spy }`: returns true, and both `click` and `scrollIntoView` were called once. A doc returning `null` → false, with no throw.
  - themeCss: `.gg-card-tap` gets a pressed state (`.gg-card-tap:active { transform: scale(0.98)`), and in the Unifideck layout `.gg-hero .gg-card` gets `pointer-events: auto`.
- [ ] **Step 2: Run** `npx vitest run tests/components/cardActions.test.ts tests/styles/themeCss.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement:**
  - `cardActions.ts`, the CSS, and the `onPress` props.
  - **`GameHero`:**
    - info card: `onPress={(el) => openGameInfoTab(el.ownerDocument)}`;
    - HowLongToBeat card: `onPress={() => openHltbPage(hltb)}` only when `hltbUrl(hltb)` isn't null;
    - no `Focusable` and no change to the controller's focus order.
- [ ] **Step 4: Run** `npx vitest run && npx tsc --noEmit`. Expected: PASS.
- [ ] **Step 5: Device check:**
  - a tap on the info card shows Game Info scrolled into view;
  - a tap on the HowLongToBeat card opens howlongtobeat.com, and B comes back;
  - a game without a match does nothing;
  - the Unifideck page's cards respond while its buttons still work;
  - the controller's order on the page is unchanged.
- [ ] **Step 6: Commit** with the message `Touch: tap the game page's cards (Game Info, HowLongToBeat), part of #24`.

### Task 6: Docs, version and the full device pass

**Files:**
- Modify:
  - `docs/device-checklist.md` (rows 32 and 41 rewritten; new rows 134–140, one per gesture)
  - `README.md` (Touch section)
  - `docs/features.md`
  - `package.json` (3.4.0)
- Create: `docs/release-notes/3.4.0.md`

- [ ] **Step 1: Write the docs.**
  - Rows 32 and 41 now say a tap selects and a second tap opens.
  - New rows: tap, drag, flick, ends, sheet swipe, feed rows, page cards. Each has a PASS/FAIL result from the device runs in Tasks 2–5, on the Deck and the Ally handheld.
  - The release notes follow the 3.3.0 format: what touch does, that the controller is unchanged, that mouse comes later, and #26 / #24 (touch part).
- [ ] **Step 2: Run** `npx vitest run && npx tsc --noEmit && pnpm build`. Expected: PASS and a build.
- [ ] **Step 3: Full device pass** on the Deck and the Ally handheld (Ally at 828×466 by `Emulation.setDeviceMetricsOverride` if it's docked, plus a real handheld session if possible). Run every new checklist row and record the results in the checklist.
- [ ] **Step 4: Commit** with the message `Version 3.4.0: touch on Home and the game page`.
- [ ] **Step 5: Hand over to Michael** for his own device check before any push or PR.
