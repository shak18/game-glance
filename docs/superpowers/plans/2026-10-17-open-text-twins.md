# Open Transition Text Twins Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The open from Home to a game page ends with text drawn exactly as the page draws it: no stretch, and no shift
on any screen.

**Architecture:** Each moving text gets a twin: a DOM copy in Home's unscaled extras layer, typed with the page's own
type and placed at the page's position. It starts transformed onto Home's text and ends untransformed. Home's text
crossfades to the twins early in the morph. When the page reports ready, the bridge copy measures the page's real text
and glides each twin by the (small, guarded) difference while it fades.

**Tech Stack:** TypeScript, React (Decky plugin), CSS generated in TS (`homeCss`, `themeCss`), vitest (node environment,
no DOM: DOM code is thin over pure functions).

**Spec:** `docs/superpowers/specs/2026-10-17-open-text-twins-design.md`

## Global Constraints

- Only transform and opacity animate (motion.ts); never `!important` on transform or opacity in homeCss (the compositor
  refuses to animate it).
- Late fades are keyframes over the whole morph that hold their start value, never delayed transitions (the `lateFade`
  pattern in `homeCss.openingRules`).
- `OPEN_TIMINGS.twinFade = 180` (ms, the first 40% of the 450 ms morph); `OPEN_TIMINGS.settleGlide = 150`.
- Settle guards: no counterpart → none; size differs by more than 2% → none; |dx| or |dy| > 6 px → none; both under
  0.25 px → none.
- The Play label's twin ends at `pillFocusScale(PAGE_LAYOUT.playW, PAGE_LAYOUT.icon)` about the pill's centre when
  focused, and at 1× when not (`openMotion`'s `focused`).
- Never `instanceof` on Big Picture DOM (other realm); use `cardNav.asElement` or duck typing.
- Commits as `Michael Palma <18511803+michpalm@users.noreply.github.com>` through the GIT_AUTHOR_*/GIT_COMMITTER_*
  variables; messages end with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. No push.

## Review Focus

- A title that wraps onto two lines on the page: the twin must wrap identically (the same max width, at the page's size).
  Task 3 test `title twin keeps the page's max width`.
- A logo title: no title twin, and the image morph is unchanged. Task 2 test `no title twin for a logo`.
- Opened in mouse mode: the Play label's twin ends at 1×. Task 2 test `play twin ends unscaled when not focused`.
- Spotlight's HowLongToBeat column: no label twin (the page names it "Main" in its card), and the value twin is in the
  accent colour. Task 2 test `hltb in spotlight: value twin only, accent`.
- A page that reports ready late (the ready cap) or never: no glide, the bridge fades as today. Task 5 test `no settle
  without ready`.

---

### Task 1: The page's type, in one place

**Files:**
- Modify: `src/styles/themeCss.ts` (the restyled `.gg-eyebrow`, `.gg-title`, `.gg-label`, `.gg-value`,
  `.gg-clean-info .gg-value` and the Play label rules)
- Test: `tests/styles/themeCss.test.ts`

**Interfaces:**
- Produces: `export type TypeRole = 'title' | 'eyebrow' | 'label' | 'value' | 'cleanValue' | 'playLabel'`;
  `export const PAGE_TYPE: Record<TypeRole, { size: number; weight: number; letterSpacing: string; lineHeight: string; upper: boolean }>`
  (size in d units); `export function pageType(role: TypeRole, unit: (n: number) => string): string`, which returns the
  declarations `font-size; font-weight; letter-spacing; line-height; text-transform`.

- [ ] **Step 1: Write the failing test** `PAGE_TYPE drives the page's own text rules`. For each role, assert that the
  restyled output contains `pageType(role, d)`'s declarations in that role's rule. Assert the values:
  - title: 64 / 800 / `-0.02em` / `1`;
  - eyebrow: 12 / 700 / `0.2em` / `1.2`, upper;
  - label: 11 / 700 / `0.18em` / `1.5`, upper;
  - value: 30 / 700 / `normal` / `1.2`;
  - cleanValue: `PAGE_LAYOUT.cleanInfo.value` / 700 / `normal` / `1.2`;
  - playLabel: 22 / 700 / `normal` / `normal`.
- [ ] **Step 2: Run it.** `npx vitest run tests/styles/themeCss.test.ts`. Expected: FAIL, `PAGE_TYPE` not exported.
- [ ] **Step 3: Implement `PAGE_TYPE` and `pageType`.** Rewrite those rules to use `pageType(role, d)`. The visible
  output stays the same; any change in the restyled rules other than declaration order is a defect.
- [ ] **Step 4: Run the whole suite.** `npx vitest run`. Expected: every test passes; earlier string assertions may
  need only reordering.
- [ ] **Step 5: Commit** `Page type in one place (PAGE_TYPE), for the open's text twins`.

### Task 2: Twin specs (pure)

**Files:**
- Create: `src/home/openTwins.ts`
- Modify: `src/home/motion.ts` (`OPEN_TIMINGS.twinFade = 180`, `settleGlide = 150`)
- Test: `tests/home/openTwins.test.ts`

**Interfaces:**
- Consumes: `HomeRects`, `PageTargets`, `PageStat`, `PageLook` (existing); `PAGE_TYPE`, `TypeRole` (Task 1);
  `HOME_CHIP_FONTS`, `TITLE_BLOCK`, `HOME_PILL`, `pillFocusScale`, `PAGE_LAYOUT` (existing).
- Produces:
  - `export type TwinOrigin = 'top' | 'base' | 'midline'`.
  - `export interface TwinSpec { name: string; role: TypeRole; text: string; x: number; y: number; origin: TwinOrigin; from: string; to: string; accent: boolean }`.
    `x` and `y` are root px, at the origin point.
  - `export function twinFrom(home: Box, at: { x: number; y: number }, scale: number, origin: TwinOrigin): string`.
    The transform (translate in px, then a uniform scale) that puts the page-sized twin anchored at `at` onto Home's
    `home` box. The anchor point is matched: top-left for `top`, bottom-left for `base`, the left end of the centre
    line for `midline`.
  - `export function twinSpecs(home: HomeRects, page: PageTargets, texts: { title: string | null; eyebrow: string; play: string }, stats: PageStat[], look: PageLook, focused: boolean): TwinSpec[]`.
    `title: null` means the title is a logo.
  - Names: `title`, `eyebrow`, `play`, `label-<key>`, `value-<key>`.

- [ ] **Step 1: Write the failing tests:**
  - `twinFrom maps the anchor onto Home's box`, for each origin, at scales 0.5 and 1.6.
  - `twin specs for spotlight: title, eyebrow, play, and each column's label and value`.
  - `no title twin for a logo`.
  - `play twin ends unscaled when not focused`: `to === 'none'`. Focused: `to` contains
    `scale(${pf.x}, ${pf.y})` about the pill's centre.
  - `hltb in spotlight: value twin only, accent`.
  - `no twin for a chip the page has no column for`.
  - `clean values use cleanValue`.

  Each twin's scale is Home's font over the page's:
  - title: `TITLE_BLOCK.titleSize / (64·d)`;
  - eyebrow: Home's eyebrow size over 12·d;
  - label: `HOME_CHIP_FONTS.label / 11`;
  - value: `HOME_CHIP_FONTS.value / 30`;
  - play label: `HOME_PILL.font / 22`;

  each also times the canvas scale `s` where Home's box is in screen px.
- [ ] **Step 2: Run them.** `npx vitest run tests/home/openTwins.test.ts`. Expected: FAIL, module missing.
- [ ] **Step 3: Implement `openTwins.ts`.**
  - The `x` and `y` targets: title and eyebrow from `page.titleBottomLeft` and `page.eyebrowBottomLeft` (`base`); the
    play label at the page pill's left inset and centre line (`midline`); stats from `page.stats[k].label/value`
    (`top`). Subtract `home.root` for root px, as `openMotion`'s extras do.
  - The texts: stats use `PageStat.label` / `.value` (the page's own strings).
- [ ] **Step 4: Run them.** Expected: PASS.
- [ ] **Step 5: Commit** `Open transition: twin specs (openTwins)`.

### Task 3: Twins drawn and crossfaded

**Files:**
- Modify: `src/home/openHome.ts` (new `mountTwins`, called from `applyOpening`'s morph path; removed by its undo)
- Modify: `src/home/homeNav.ts:176-187` (read the texts, call `twinSpecs`, pass the specs to `applyOpening`)
- Modify: `src/home/homeCss.ts` (`openingRules`: `.gh-twin` rules, the crossfade, the bridge freeze)
- Test: `tests/home/homeCss.test.ts`, `tests/home/openHome.test.ts`

**Interfaces:**
- Consumes: `TwinSpec`, `twinSpecs` (Task 2); `pageType` (Task 1); `OPEN_TIMINGS.twinFade` (Task 2).
- Produces:
  - `export function mountTwins(layer: { ownerDocument: Document; appendChild(n: Node): unknown } | null, specs: TwinSpec[]): () => void`.
    It creates one `div.gh-twin[data-twin=name][data-role=role]` per spec, with textContent `text` and the style
    variables `--t-x`, `--t-y`, `--t-from`, `--t-to`. It returns their removal.
  - `applyOpening(root, variant, vars, heroUrl, extras = '', twins: TwinSpec[] = [])`. It sets
    `data-gh-twins="<names joined by spaces>"` on the root.
  - In `homeNav`: `readTwinTexts(root): { title: string | null; eyebrow: string; play: string }`, in `openHome.ts`.
    `title` is null when `.gh-title-slot` holds an image; `play` is the text of `.gh-btn[data-action="play"] .gh-btn-label`.

- [ ] **Step 1: Write the failing tests:**
  - homeCss `twins: page type in d units, placed, from → to with the morph, faded in over the first 40%`.
    `.gh-twin[data-role=R]` has `pageType(R, (n) => calc(n * var(--gho-x-d)))`; `left/top: var(--t-x/y)`;
    `transform: var(--t-from)` in phase from and `var(--t-to)` in phase to, with `transform ${morph}ms ${MORPH_EASE}`.
    A `gh-twin-in` keyframe goes 0 → 1 by 40%.
  - homeCss `home's text fades out as its twin fades in, only where a twin exists`. `[data-gh-twins~="title"]
    .gh-title-slot`, `~="eyebrow" .gh-eyebrow`, `~="play" .gh-btn[data-action="play"] .gh-btn-label`, and
    `~="label-K"` / `~="value-K"` on chip K's label and value run `gh-twin-out` (1 → 0 by 40%).
  - homeCss `title twin keeps the page's max width` (`max-width: calc(640 * var(--gho-x-d))`).
  - homeCss `the bridge holds the twins' end state` (opacity 1, `transform: var(--t-to)`, `animation: none`) and Home's
    text at 0.
  - homeCss: no `!important` on transform or opacity in any `.gh-twin` rule. The existing compositor test must cover it.
  - openHome `mountTwins creates one element per spec with its text and variables, and removes them`, with a fake layer.
  - openHome `readTwinTexts: null title for a logo`.
- [ ] **Step 2: Run them.** Expected: FAIL.
- [ ] **Step 3: Implement.**
  - The twins go into `.gh-open-extras`, which the bridge copies.
  - On any throw in building or mounting twins, open without twins (catch in `homeNav`, warn once).
- [ ] **Step 4: Run the whole suite and the type check.** `npx vitest run && npx tsc --noEmit`. Expected: all pass.
- [ ] **Step 5: Commit** `Open transition: the moving text as page-sized twins`.

### Task 4: Settle guards (pure)

**Files:**
- Modify: `src/home/openTwins.ts`
- Test: `tests/home/openTwins.test.ts`

**Interfaces:**
- Produces: `export function settleDelta(predicted: Box, measured: Box | null): { dx: number; dy: number } | null`, with
  the guards from Global Constraints.

- [ ] **Step 1: Write the failing tests** `settleDelta`:
  - `(box, null)` gives null;
  - a width 3% off gives null;
  - dx 7 gives null;
  - dx 0.1 with dy 0.2 gives null;
  - dx 1.5 with dy −0.75 gives `{ dx: 1.5, dy: -0.75 }`.
- [ ] **Step 2: Run them.** Expected: FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run them.** Expected: PASS.
- [ ] **Step 5: Commit** `Open transition: settle guards`.

### Task 5: The glide at ready

**Files:**
- Modify: `src/home/openTransition.ts` (`OpenBridge` gains an optional `settle?(): void`, called once in `leave`
  before `fadeOut`)
- Modify: `src/home/openBridge.ts` (`mountOpenBridge` takes an optional `settle(copy: HTMLElement): void` and exposes it)
- Modify: `src/styles/themeCss.ts` (new `twinTargets(classes, look): Record<string, string>`, giving the page selector
  per twin name), `src/styles/theme.ts` (a wrapper)
- Modify: `src/home/homeNav.ts` (the settle: for each `.gh-twin` in the copy, measure its counterpart in the page's
  document, apply `settleDelta`, and set `--t-dx/--t-dy`)
- Modify: `src/home/homeCss.ts` (`.gh-root.gh-bridge .gh-twin { translate: var(--t-dx, 0) var(--t-dy, 0); transition: translate ${settleGlide}ms ease-out }`;
  the `translate` property composes with the held transform)
- Test: `tests/home/openTransition.test.ts`, `tests/styles/themeCss.test.ts`, `tests/home/homeCss.test.ts`

**Interfaces:**
- Consumes: `settleDelta` (Task 4); `OPEN_TIMINGS.settleGlide` (Task 2).
- Produces: `twinTargets` with these selectors:
  - `title` → `.gg-title`;
  - `eyebrow` → `.gg-eyebrow`;
  - `play` → `${playButton} [role="button"] > div`;
  - `label-K` → `.gg-hero [data-stat="K"] .gg-label`, or `.gg-clean-info [data-stat="K"] .gg-label` in Clean;
  - `value-K` → the same with `.gg-value`.

- [ ] **Step 1: Write the failing tests:**
  - openTransition `settles once when the page is ready, before the fade`.
  - openTransition `no settle without ready` (the ready cap fires `leave`: settle not called).
  - openTransition `a settle that throws still fades`.
  - themeCss `twinTargets` for both looks.
  - homeCss: the bridge twin's translate rule with its 150 ms transition.
- [ ] **Step 2: Run them.** Expected: FAIL.
- [ ] **Step 3: Implement.**
  - A glide only on ready: `leave` from the cap passes `settle: false`.
  - Measuring and setting variables is DOM-only in `homeNav`, over the pure guard.
- [ ] **Step 4: Run the whole suite and the type check.** Expected: all pass.
- [ ] **Step 5: Commit** `Open transition: twins glide onto the page as measured`.

### Task 6: Device verification and notes

**Files:**
- Modify: `docs/release-notes/3.4.0.md` (the open-transition bullet: text lands as the page draws it, on any screen)
- Modify: memory note (project file): the docked text-shift item is done

- [ ] **Step 1: Build and package.** `pnpm build && bash scripts/package.sh`. Copy the zip to the Ally's
  `~/Downloads` when Michael asks.
- [ ] **Step 2: With Michael's go-ahead, record opens on the Ally, handheld and docked.** Use the scratchpad's
  `cef-record.mjs`, then `align.py` on the last bridge frame against the first page frame for the Play label, title,
  eyebrow and stats. Expected: each |shift| ≤ 0.5 px and no size change (the `align.py` scale is about 1).
- [ ] **Step 3: A cold page (a game whose HowLongToBeat is not cached).** Expected: no glide, no jump.
- [ ] **Step 4: Commit** the release notes.
