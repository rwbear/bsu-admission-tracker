# Implement review — «Плита плана»

Spec: `docs/quota-module/VISUAL-VERDICT.md`. Files reviewed:
`js/ui/charts.js` · `js/ui/radar.js` · `css/components.css` · `js/compute.js`.

Math is honest and the seat-quota resolver is correct. The visual object
is wrapped wrong — two extra labels, an inverted ink hierarchy, and a
motion race with the rail. Fix the wrapper before ship.

---

## Must-fix (before ship)

1. **Ink hierarchy is inverted on the block.** `css/components.css:243–255`.
   Spec §4 «openPlan segment is full ink; taken segments hatched at
   ink-40». Current: `is-open` fills at `ink 16% → soft`, `is-taken` hatch
   stripes at `ink 22% → soft`. The «taken» stripe is *darker* than the
   «open» fill. At a glance the eye reads the eaten portion as the answer.
   Ship the open segment as solid `var(--ink)` (or ≥ 70%), lift hatch to
   `ink 40%` on `var(--paper)` as spec calls, and drop the muddy blended
   `is-open` background. This is the dual-signal that carries the whole
   object.

2. **Two extra chart labels break "one object, no card".**
   `js/ui/radar.js:248–270`. The plan slab is wrapped in a `.chart-block`
   with a `chart-caption` reading «План мест», and the rail below it gets
   another `.chart-block` with «Дорожка конкурса». Spec §4 is explicit —
   above the block there is one row: the equation caption. Below the
   block there is 24 px of daylight paper, then the rail. Currently the
   reader sees `ПЛАН МЕСТ` → equation → bar → `ДОРОЖКА КОНКУРСА` → rail.
   That is a mini-card pattern and it re-imports the queue-misread the
   spec was written to defuse. Render `planMount` + caption bare between
   `status` and the rail, and drop the «Дорожка конкурса» caption at the
   same time so the two objects sit as twins with only paper between them.

3. **The equation caption is echoed inside `.detail-note`.**
   `js/ui/radar.js:200–201`. When `showQuota` is true the code does
   `note += ' · ' + formatQuotaCaption(row)` — the exact string that
   already renders above the bar. Same tokens, twice, one line apart.
   The V1 prose sentence that spec §4 says «stays exactly where it is»
   is gone in this branch. Keep the V1 sentence prose («часть мест уже
   занята льготниками…») for `showQuota` too, and never re-emit the
   equation into `.detail-note`. The block owns the equation; the note
   owns prose.

4. **Motion clash — rail and slab awaken in parallel.**
   `js/ui/charts.js:264` (`data-awaken="plan"`) and
   `js/ui/charts.js:142` (`data-awaken="chance"`). Both roots enter the
   scroll-awaken scope independently. When the detail panel is on screen
   they fire together: block segments 0/40/80/120 ms + 320 ms and rail
   fill 480 ms — the rail is drawing while the block is still stepping.
   Spec §4 wanted «Rail fill starts 120 ms after the block completes» —
   that is the stagger that says «seats first, contest second». Put a
   `~560 ms` `animation-delay` on `.chance-track-wrap.is-awake … .chance-fill`
   inside detail panels, or gate the rail's awaken behind the slab's
   `awaken:done`. `prefers-reduced-motion` and `.is-instant` must skip
   the delay (they already skip the animation).

5. **`openPlan === 0` edge does not force «Ниже».**
   `js/compute.js:299–326`. Spec §4 «On taken > plan (п. 26¹ edge),
   clamp openPlan at 0 … status forces Ниже». Current `enrichSpec`
   clamps `plan = quota.openPlan = 0`, then `calcPassing` bails on
   `plan <= 0` → `estimatedPassing = null` → `getStatus` returns
   `neutral`, and the neutral-fallback branch is gated on `plan > 0` so
   it never fires. With zero open seats the row silently renders as
   neutral instead of below. **Critical for honesty.** Add an explicit
   branch: if `quotaParseOk && quota.taken >= planOfficial > 0`, force
   `status = 'below'` (regardless of score, and independent of
   `estimatedPassing`), so the caption's `= в общем 0` and the status
   pill agree.

6. **Gap block-bottom → rail-top is not the 24 px spec calls for.**
   `css/components.css:130–133`, `205–213`, `191–194`. With the current
   nesting: `plan-slab-wrap { padding-bottom: 20 }` + `plan-slab-block
   { margin-bottom: 4 }` + `.detail-inner { gap: 20 }` + the intervening
   `chart-caption` line ≈ **44 px of paper plus a text label**. Spec is
   24 px (16 px ≤ 360 px) of paper — bar bottom straight down to rail
   top, nothing else. Fix falls out of #2: once the outer `.chart-block`
   wrappers go, collapse the gap to `margin-bottom: var(--space-6)` on
   the slab (or a single grid gap on `.detail-inner` set to 24 px around
   these two children). Verify with the browser inspector on the
   биоинженерия golden.

---

## Nice polish

- **Caption operators are muddled by middle-dots.**
  `js/ui/charts.js:179`. Spec E-grammar: `План 32 − БВИ 8 − целевые 0 −
  вне 0 = в общем 24`. Current: `План 32 · − БВИ 8 · − целевые 0 · − вне
  0 · = в общем 24`. The `·` before every `−` reads as bullet-list
  punctuation and dulls the operator. Drop the `·` between subtractors.
  Keep only word-spacing around `−` and `=`.

- **`= в общем N` is not one notch stronger than the other values.**
  Spec §4: «24 renders one notch stronger… weight carries the eye to the
  answer». The caption ships as a single `text` string, all one weight.
  Rebuild `formatQuotaCaption` to return DOM fragments (or wrap the last
  term in a `<b>` / `.plan-slab-answer` span) and give the answer term
  `font-weight: 500` while the rest sits at 400.

- **Metric grid still sits between `detail-status` and the slab.**
  `js/ui/radar.js:301–310`. Spec §4 placement: «between `detail-status`
  and the existing chance-track wrapper». Reader flow works better with
  status → slab → rail → metrics/hist/note; the numbers grid can slide
  below the two graphics without losing anything.

- **Aria-label duplicates the caption clumsily.**
  `js/ui/charts.js:240`. `План {plan} мест: {compact}` mixes «мест» (a
  rail token) into the block's screen-reader text. Use
  `formatQuotaCaption(row)` verbatim as the `aria-label`. It already
  reads as a sentence.

- **Hatch is faint and asymmetric with spec.**
  `css/components.css:244–250`. Spec §4: «hatched 45° at ink-40 on
  paper». Current: `-45°`, 1 px stripes at ink-22 alternating with
  ink-6+soft. Even after #1's contrast fix, bump the stripe ink to ~40 %
  and widen to 2 px so the texture reads on retina without becoming a
  ruler. Flip the angle to `45°` to match the direction in the design
  spec (cosmetic but named).

- **`--space-5` padding-bottom on `.plan-slab-wrap` is doing what
  `.detail-inner`'s gap should do.** Once #2/#6 land, the wrap is a two-
  row grid (caption + bar); the between-object spacing belongs on
  `.detail-inner` gap, not on the wrap itself. Cleaner and easier to
  tune the mobile 24 → 16 px step.

- **`.plan-slab-seg-label` uses `text-overflow: clip`.**
  `css/components.css:265`. On the narrow segments that just barely clear
  the 12 % gate the label gets sliced mid-glyph. Either raise the
  in-block label threshold (≥ 16 %) or switch to `ellipsis` — currently
  a chopped «БВИ» can appear in the golden.

- **Methodology copy shortens БВИ to «без вступительных».**
  `js/ui/radar.js:284`. Spec «§ Copy discipline» reserves the full form
  «без вступительных испытаний» for `<details>` verbatim. Restore the
  full phrase; keep short-form only in-object.

- **`formatQuotaCaption` falls back to `row.plan`.**
  `js/ui/charts.js:171,178`. Safe today because `enrichSpec` overwrites
  `row.plan = openPlan`, but that overload is exactly the trap spec §5
  warns about. Read strictly from `row.planOfficial` and `row.openPlan`;
  crash-guard with `Number.isFinite`, never fall back to `row.plan`. Same
  fix in `formatQuotaCaptionCompact`.

- **`renderPlanSlab` guards on `showQuota` and the caller sets
  `planBlock.hidden = true`.** Two gates, same signal — pick one. Leaving
  both in place risks a future refactor keeping `hidden` and losing the
  paint guard, or vice versa. Rely on the caller's `hidden`.

- **Compact caption prints «льготники» when every subtractor is zero.**
  `js/ui/charts.js:200`. That path is only reachable when
  `showQuota === true` but the taken counts round to a state where none
  belong on-screen — should not happen if `showQuota` is honest. If it
  does, silent is better than a word the spec never approved. Return
  empty string and let the aria-label degrade to the block role.

- **Segment `title` uses short label «БВИ», «целевые», «вне»** —
  fine in-object; consider `title` on the block wrapper as the equation
  string for hover parity with screen readers.

---

## Looks good

- `resolveSeatQuota` math is the spec formula:
  `taken = max(enrolledTargeted, planTargeted) + admittedNoExam +
  admittedOutOfCompetition`, `openPlan = max(0, plan − taken)`, and
  every field is null-safe. `showQuota = quotaParseOk && taken > 0` is
  the correct hide-when-silent gate (spec §4 «Show / hide»).
- `enrichSpec` overwriting `plan` with `openPlan` is exactly JUDGE §4b–c
  and every downstream (`calcPassing`, `buildChanceTrack`, `pressure`,
  status) consumes `openPlan` as intended. `planOfficial` is preserved
  on the row for the block, not confused with rail seats.
- Segment order in `renderPlanSlab` (`bvi → target → out → open`)
  matches п. 23 → п. 29 → п. 26 → п. 27 seat priority. Zero-count
  segments collapse via `filter(count > 0)` and the flex-grow weighting
  keeps ratios honest.
- Naming discipline in-object («БВИ» / «целевые» / «вне») and in the
  methodology («БВИ» explained, «вне конкурса» distinct from «целевые»)
  never merges п. 23 with п. 26. Spec §5 respected.
- Mobile: bar stays 20 px, inline labels collapse under 360 px, wrap
  pad drops one step. Matches spec §4 «Mobile».
- `prefers-reduced-motion` cancels the slab intro cleanly
  (`css/components.css:312–319`) — no residue.
- `data-awaken="plan"` participates in the scroll awaken/sleep foundation
  so scrolling out and back doesn't leave the slab in a stale state.
- Detail note prose in the `else if (quotaParseOk === false)` branch
  correctly falls to V1 with «в общем конкурсе N из M» — that fallback
  path is right; the bug (#3) is only in the `showQuota === true` branch.
- `method-details` styling: paper, ink-dim, no card. Progressive
  disclosure applies only to definitions, never to the answer.
