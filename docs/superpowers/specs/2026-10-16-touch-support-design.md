# Touch support, phase 1 (#26): design

Status: draft for review, 2026-10-16. Code base: main at 6364ebe (3.3.1).

## Goal
Make Spotlight Home and the game page usable with a finger on handhelds (Steam Deck, ROG Ally).
- Mouse on desktop or docked setups is phase 2. It builds on the same Pointer Events code and adds hover and the wheel.
- The screensaver is out of scope.

Success:
- a game can be picked and opened by touch alone;
- the games row and the feed rows can be swiped;
- the feed sheet raises and lowers by swiping;
- the game page's info and HowLongToBeat cards respond to a tap;
- the controller keeps working exactly as before, and after any touch the controller's focus is where the touch left it.

Decisions (Michael):
- A tap on an unselected game selects it; a tap on the selected game opens it.
- The row follows the finger, then settles on a card; a flick moves several.
- Phase 1 covers the games row, the feed sheet, and the game page cards (#24, touch part only). The cards become selectable with the controller in a later step, built on the same actions.
- Pointer Events on today's transform-based rows. Native scroll containers with CSS scroll snap were considered and rejected: they'd fit only the Steam row style, and the loop preview, fast L1/R1 runs and the open transition all read the transform.
- No outside implementation is used or consulted.

## What the device does (probe on the Steam Deck LCD, SteamOS 3.8.28, Game Mode)
- **A finger arrives as Pointer Events** with `pointerType: "touch"`, followed by touch events, compatibility mouse events and a `click`, also `pointerType: "touch"`.
- **A tap produces a `click`** 100–200 ms after the finger lands. **A swipe produces no `click`:** Chromium's touch slop already separates the two.
- **Today the row ignores pointers** (`.gh-recents { pointer-events: none }`, `src/home/homeCss.ts:355`), so taps on it land on `.gh-page`.
- **The game page's tabs** are `[role=tab]` elements whose ids end in `WhatsNew`, `YourStuff`, `Community` and `GameInfo`. Those suffixes are language-independent. `click()` on the `GameInfo` tab selects it (`aria-selected=true`), and `scrollIntoView({ block: 'start' })` brings its content into view, the same view the controller reaches.
- **Seen in passing:** Game Glance's status bar covers the right end of Steam's tab strip once that strip sticks to the top. This is an existing cosmetic issue, to be filed separately.

## Principles
- **Pointer Events only**, never touch events, so mouse support (phase 2) reuses the code.
- **Taps are the browser's `click`.** There is no hit-testing by coordinates and no tap-after-drag timer.
- **Touch and controller stay in step.** A touch on Home moves Steam's controller focus to the same zone (`focusElement` / `focusGames`, `src/home/homeNav.ts:120`).
- **Gesture maths in a pure module with vitest tests;** components only wire events.
- **Distances are logical px:** screen deltas divided by the canvas's actual scale (the `.gh-canvas` rect width ÷ `canvas.logicalWidth`). This also stays right during Steam's 0.95 mount animation.

## 1. Games row (`src/home/RecentsRow.tsx`, `src/home/SpotlightHome.tsx`)

### Taps
- **Each card gets a `click` handler:** game cards, the Library card and the loop preview's ghosts.
- **An unselected card is selected** with a new `RecentsRowNav.onSelect(index)`. In `SpotlightHome` this focuses the row (`focusGames()`), then calls the existing `select(index)` (`SpotlightHome.tsx:209`). A ghost selects its game.
- **The selected card opens** through the existing `onRecentsActivate` (`SpotlightHome.tsx:255`), with its 1 s guard and the open transition from `selectedCard()`. On the Library card it opens the Library.
- **If the row `Focusable` also fires `onActivate` for a tap,** the card's handler stops propagation, so a first tap only selects. Checked on the device in step 2.

### Drags: a selection run
A drag drives Home's existing selection machinery, like holding the stick:
- **Each step:** every `step` logical px (the card pitch of the current layout, handheld or docked) the finger moves selects the next or previous card through `select()`.
- **A run:** the drag counts as one for `useFastCycle` (`SpotlightHome.tsx:154`), as held Left/Right and L1/R1 already do. The hero, accent and wide card hold, then update when the drag settles. In Spotlight style the cards stay uniform during the run, as in fast runs.
- **Following the finger:** the layout carries the row from card to card as the selection steps, and the track adds the finger's remainder beyond the selected card (`dragView`). A release only settles that remainder, so nothing springs back. In Steam style the layout doesn't scroll until the selection passes the middle, so there the highlight moves along the cards until then, as with the stick. (Final review: the earlier "track at its start position plus the finger" sprang the row back on release in Steam style.)
- **Release:** the remainder settles through the row's existing transition.
- **No click from a drag:** a sideways drag swallows the click a short quick slide can still produce; a flick stops at the row's end and while a game opens.
- **Flick:** the row glides on at the release speed, slowing down smoothly frame by frame (`glide`: the speed falls by e every 400 ms, so it runs on about speed × 400 px), through the same view as the drag, and comes to rest on a card or at the row's end. (Michael, after the first device build: the stepped flick felt jerky and stopped too soon.)
- **Ends:** past the first game or the Library card, a rubber-band offset springs back on release. A drag never wraps; Left/Right presses still wrap as today.

### `src/home/rowDrag.ts` (pure, tested)
- `axisLock(dx, dy, slop)`: `null` until the move passes `slop` logical px, then `'x'` (the row) or `'y'` (the sheet, section 2).
- `dragSteps(dx, step)`: whole cards to move, rounded to the nearest card (signed).
- `releaseVelocity(samples)`: logical px/ms from a least-squares fit over the samples of the last ~100 ms (`getCoalescedEvents()` for the full rate).
- `glide(velocity, t)`: how far a flick has run on `t` ms after release, and whether it has come to rest; nothing below a minimum speed.
- `rubberBand(overscroll, limit)`: increasing, never past `limit`.

### Wiring
- `.gh-recents`: `pointer-events: auto; touch-action: none`. The row decides both axes, because vertical swipes raise the sheet.
- Pointer events go off under `.gh-page-up` and while opening (`[data-gh-opening]`, already off).
- `setPointerCapture` once the axis locks horizontal.
- A `gh-recents-drag` class turns off the track transition while the finger is down.
- `pointercancel` settles like a release with no velocity.

## 2. Feed sheet (`src/home/FeedSheet.tsx`, `SpotlightHome.tsx`, `homeCss.ts`)
- **Raising:** a vertical swipe up of 60 logical px on the games row or the hero area raises the sheet by focusing the current tab (`focusElement(tabRefs…)`). `zone` and `sheetUp` then follow, as with the controller.
- **Lowering:** a swipe down while the sheet is up calls `focusGames()`, as B does from the tabs.
- **Tabs:** at rest they get `pointer-events: none`, which fixes the invisible tabs catching taps. While up, a tap selects a tab (the existing `selectTab`).
- **Feed rows:** a horizontal drag on a row is a selection run on that row (`rowDrag`), and the existing `feedScroll` follows.
- **Feed cards:** a tap keeps the existing `onClick`, which opens the card like A.

## 3. Game page cards, #24 touch part (`src/components/GameHero.tsx`, `src/styles/themeCss.ts`)
- **Actions:** `src/components/cardActions.ts` has one function per card action:
  - **Info card:** open the Game Info tab. Find `[role=tab][id$="GameInfo"]`, `click()` it, `scrollIntoView({ block: 'start', behavior: 'smooth' })`, and move Steam's focus to it.
  - **HowLongToBeat card:** `Navigation.NavigateToExternalWeb('https://howlongtobeat.com/game/<id>')` when matched, as `SettingsPanel.tsx:258` does. It does nothing without a match.
- **Taps:** call the action from `onClick`, with a short pressed state. The later controller step calls the same functions from a `Focusable`'s `onActivate`.
- **The controller's focus order** on the page is unchanged in this phase.
- **Unifideck's layout** keeps `pointer-events: none` on `.gg-hero` (`themeCss.ts:405`) except on the cards. The Clean look has no cards and is unchanged.

## Tests and docs
- **New:** `tests/home/rowDrag.test.ts` covers the axis lock, steps at both card scales, velocity from uneven samples, the glide and the rubber band.
- **Changed:** `tests/home/homeCss.test.ts:121-138` currently asserts the row's `pointer-events: none` and no pointer cursor. It moves to the new rules.
- **Docs:**
  - `docs/device-checklist.md`: rows 32 and 41 rewritten, plus a row per gesture.
  - `README.md`: a Touch section.
  - `docs/features.md`.
  - `docs/release-notes/3.4.0.md`; `package.json` to 3.4.0.

## Order
1. `rowDrag.ts` with tests (TDD).
2. Games row: taps and `onSelect`, then drags as selection runs.
3. Feed sheet: swipes, the tab fix, row drags.
4. Game page cards: `cardActions.ts` and taps.
5. Docs and version.

Each step is checked on the Deck (1280×800, scale 1) and the Ally handheld (828×466, scale about 0.575). Recordings use the CEF screencast script.
