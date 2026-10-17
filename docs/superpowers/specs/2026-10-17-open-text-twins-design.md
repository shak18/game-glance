# Open transition: text that lands as the page draws it

Status: design approved in chat (Michael, 2026-10-17); this spec for review.
Branch: `feat/touch` (3.4.0). Builds on the open transition (2026-10-09 spec) and its later fixes on this branch.

## Understanding

**What Michael said**
- At the end of the open from Home to a game page, the text pops: it seems to stretch a little. It is most visible on the
  Play pill's label, and it happens to all the text.
- Docked on a TV (Ally, 1500×844 at a pixel ratio of 1.28), the page's text also shifts slightly at the handover.
  Handheld it lands in place. This was parked earlier the same day; he chose "approach A": measure the page and settle
  onto it.
- He chose design A for the stretch: draw the moving text at the page's own size, and design it together with the parked
  measure-and-settle fix.

**What is known (code and probes)**
- Every moving text is Home's own element, scaled by a transform until it covers the page's (`openMotion`: `--gho-title`,
  `--gho-eyebrow`, `--gho-play-label`, `--gho-chip-N-label/value`). Text does not scale linearly. At another font size
  the browser picks other advance widths, hinting and pixel positions, so a scaled 19 px label is not a real 18 d-unit
  label. The Play label is also scaled unevenly: the page's focus scale is about 1.009 × 1.04.
- The page opens only when the morph ends: Steam unmounts Home when the route changes. Until the page is ready, a frozen
  copy of Home's last frame covers it (`openBridge`), then it fades out over 300 ms (`OPEN_TIMINGS.bridgeFade`). The
  pop is that crossfade, between the copy's scaled text and the page's real text.
- The copy's positions are predicted (`openTargets`, calibrated on the Ally handheld). Docked, some predictions are off
  by a pixel or two.
- A layer outside Home's scaled canvas already draws parts of the page at the page's size, in root px and d units
  (`.gh-open-extras`, `OpenExtras`, `--gho-x-*`): the store pill, the description, the HowLongToBeat card's inside, and
  the played and size columns. It is copied with the bridge.

**Assumed**
- The page draws the same strings Home shows for these parts (title, eyebrow, Play label, stat labels and values), apart
  from the cases `openMotion` already handles (the HLTB label in Spotlight, columns Home has no chip for).
- Two copies of the same text, with the same font, size, letter spacing and final transform matrix, are rasterized
  alike by Chromium.

**Success**: on the Ally, handheld and docked, frame-by-frame recordings of the open show no change in the text's size
and no shift beyond 0.5 px at the handover, on Play's label, the title, the eyebrow and the stats.

## Design

### 1. Text twins at the page's size

Each moving text gets a twin in the extras layer, drawn with the page's own type: the same font, size (in d units),
weight, letter spacing, line height and colour as the page's rules in `themeCss`.

The twins, and the page element each one lands on:

- **Title** → `.gg-title`. Only when the title is text; a logo keeps today's image morph.
- **Eyebrow** → `.gg-eyebrow`.
- **Play label** → the Play button's label (`ActionButtonAndStatusPanel [role="button"] > div`). The Play icon stays
  Home's: an icon scales cleanly.
- **Each stat's label and value**, for every chip that becomes a page column → `.gg-stats [data-stat=K] .gg-label` and
  `.gg-value` (Clean: the same inside `.gg-clean-info`). In Spotlight, the HLTB accent copy becomes the value's twin, in
  the accent colour.

- Each twin is placed at its page target: the boxes `openTargets` already computes, in root px.
- `transform-origin` is its top-left corner, or its left edge and centre line for the Play label, as `openMotion` uses.
- **From:** a translate and a uniform scale that put it on Home's element box. The scale is Home's font size over the
  page's.
- **To:** `none`. The Play label is the exception while the page will show Play focused: it ends at the focus scale about
  the pill's centre, the same matrix the page applies (`pillFocusScale`). In mouse mode (`openMotion(…, focused = false)`)
  it ends at 1×.
- The store pill is already drawn at the page's size in the extras layer and is unchanged.
- **Pure function:** `twinMotion(home: Box, page: Box, homeFont: number, pageFont: number, origin: 'corner' | 'midline')`
  returns the from transform, in a new module `src/home/openTwins.ts`. `openMotion` writes the twins' variables
  (`--gho-t-<name>-x/y/w/from/o`) next to its others.

### 2. Home's text hands over early

- Home's text and its twin move on the same path, with the same duration and easing (`OPEN_TIMINGS.morph`,
  `MORPH_EASE`), so they cover each other all the way.
- Over the first 40% of the morph (`OPEN_TIMINGS.twinFade = 180`), Home's text fades out and its twin fades in, with
  opacity only. That is when the motion is fastest and detail is least visible.
- The fade uses keyframes over the whole morph that hold their end value (the late-fade pattern in `homeCss`, for the
  same reason: the GPU may draw a delayed transition at its end value early).
- After that only the twins show. The bridge copy holds them at their end state, with nothing animating in it.

### 3. Landing on what is really there

When the page reports ready (`openTransition`'s `onReady`, before `leave`):

1. Measure each twin's counterpart on the page, using the selectors in the table, inside the page's root.
2. Compute the difference from each twin's final box, as drawn in the bridge.
3. Glide each twin by its difference: a translate over `OPEN_TIMINGS.settleGlide = 150` ms, ease-out, set through
   variables on the bridge copy. The bridge fade starts at the same time; its 300 ms covers the glide.

**Guards (pure function `settleDelta(predicted: Box, measured: Box | null): { dx: number; dy: number } | null`):**
- No counterpart found, or a size that differs by more than 2%: null. The twin is left as it is.
- A difference over 6 px on either axis: null. It must be the wrong element, or a layout the twin cannot match.
- A difference under 0.25 px: null. Nothing to glide.

If the page reaches the ready cap (`OPEN_TIMINGS.readyCap`) without reporting ready, the bridge fades as today, with no
glide.

### 4. What does not change

- The open's timeline, the bridge, the hero art, the glass panels and their rings, the circles, the pill's background
  layer, the store pill, the description and the HLTB card's inside.
- The feed card opens (`heroFade` and `fade`): they have no morph.
- The way back (B).

## Error handling

- Any failure building a twin: that part keeps today's morph (Home's own scaled text), so the page always opens.
- Measurement or glide throws: caught; the bridge fades as today.
- A missing target box (for example, a column the page does not draw): no twin; Home's text fades as it does now.

## Testing

**Unit (vitest)**
- `twinMotion`: a twin's from transform puts its box exactly on Home's (corner and midline origins), at both card scales
  and both looks.
- The Play label ends at the focus scale when focused, and at 1× when not.
- `openMotion` writes twin variables for every chip that becomes a column, and none for the others.
- `settleDelta`: each guard (missing, size mismatch, over 6 px, under 0.25 px) and an ordinary 1.5 px case.
- `homeCss`: the twins' rules. Opacity-only crossfade keyframes over the whole morph; no `!important` on transform or
  opacity (the compositor rule); the bridge freeze holds the twins' end state.
- Existing open-transition tests keep passing. Those that pin Home's text transforms move to the twins where they replace
  them.

**On the Ally**, with Michael's go-ahead each time:
- Recordings of the open, handheld and docked, with the scratchpad's `cef-record.mjs`, compared at the handover with
  `align.py` (per region: Play label, title, eyebrow, stats) and `diffs.py`. Success is the threshold above.
- A slow page (a cold HLTB lookup): the glide is skipped and nothing jumps.

## Out of scope

- The Clean look's panel layout and the chips' glass shells: positions only, unchanged.
- Learning corrections per screen (approach C): not needed once the glide measures the page each time.
