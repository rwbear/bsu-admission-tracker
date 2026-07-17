# R4 — UX / mobile / a11y / freshness / share bug hunt

**Mode:** report only (no application source changes)  
**UTC:** 2026-07-16 ~00:05Z  
**Surface:** `/workspace` · `js/main.js`, pickers, `command-meta` / `refresh-schedule`, `index.html` OG, overview a11y  
**Depends on:** R1 product map · R2 design research (P1 #8/#11, a11y/motion) · R3 left alone (compute)  
**Tests not re-run as gate** (orchestration/DOM bugs); pure helpers already covered (`command-meta.test.js`, `refresh-schedule.test.js`)

---

## Executive summary

Highest-severity UX debt is **table-picker asymmetry** vs the faculty shell pattern (full remount + missing overlay stacking), plus **stale banner never re-evaluated on failed polls**. Overlay **`aria-modal` without a Tab trap**, **overview remount focus loss / wrong people↔plan aria wording**, and **share card geometry / brand weakness** complete the actionable set. Mobile `scrollIntoView` to detail already exists — do **not** ship a second one.

---

## Confirmed bugs

### B1 · Table picker remounts/re-animates; faculty preserves shell  
**Tag:** `confirmed` · **Severity:** High · **Where:** `js/ui/table-picker.js` · `js/main.js` `onTableQuery` / `renderBoard` → `renderHeroChrome` · `css/layout.css` overlay roots

**What:** Faculty overlay mounts once per open session and only patches `.faculty-overlay-list` on search (R2 P1#11 already called this out). Table picker clears `mount` **and** `#table-overlay-root` on every `renderTablePicker` call, including each search keystroke and every `renderBoard` (which always calls `renderHeroChrome` first). Overlay re-applies one-shot `faculty-fade-in` / `faculty-popover-in` keyframes on each rebuild. `main.js` then re-focuses `#table-search-input` and restores caret — papering over focus loss, not fixing remount.

Additionally, `#faculty-overlay-root` has `position: relative; z-index: 80` (above sticky `.command` at `z-index: 40`). **`#table-overlay-root` has no CSS at all**, so its `position: fixed` shell stacks at auto/`0` and can paint **under** the sticky header.

**Repro:**

1. Open table overlay → type two characters in search → dialog blinks / re-fades each key.  
2. Leave table overlay open; wait for a silent refresh path that hits `renderHeroChrome` (`!changed`) or any `emit()` → overlay rebuilt.  
3. Open table overlay on a short viewport → confirm command bar sits above dimmed backdrop (faculty does not).

**Expected:** Same shell-preserve + list-patch + host `z-index: 80` as faculty.  
**Impact:** Unequal hero controls; focus flicker; animation noise; header intercepting overlay.

**Fix sketch:** Port `paintFacultyList` / live-shell pattern to `table-picker.js`; add `#table-overlay-root { position: relative; z-index: 80; }`; drop caret-restore hack once the input node survives.

---

### B2 · Stale banner only updates after a *successful* fetch  
**Tag:** `confirmed` · **Severity:** High · **Where:** `js/main.js` `applyBanner` · `fetchData` catch · `armNextRefresh` / `resolveEffectivePollMs`

**What:** `applyBanner(payload)` runs only on the success path of `fetchData`. Failed silent refreshes still hit `finally` → `armNextRefresh()`, and `resolveEffectivePollMs` correctly switches to `STALE_POLL_MS` (30s) once `updatedAt` ages past `STALE_AFTER_MS` (6 min). The banner (`Снимок старше обычного интервала…`) does **not** appear until a later successful load re-runs `applyBanner`.

**Repro (logic):**

1. Load with a fresh snapshot; banner hidden.  
2. Let wall-clock age pass `STALE_AFTER_MS` while `loadUniversity` fails (offline / Pages blip).  
3. Observe: countdown interval becomes ~30s (stale chase armed), banner stays `hidden`.

**Expected:** Banner (and freshness copy) track `isSnapshotStale(state.uniData?.updatedAt)` on schedule ticks or on every `armNextRefresh`, not only on OK payloads.  
**Impact:** Users see aggressive “следующее через…” chase with **no** honesty banner — opposite of R2 freshness principles.

**Fix sketch:** `applyBanner(state.uniData)` (or a dedicated `applyFreshnessBanner(now)`) from `armNextRefresh` / `onScheduleTick` when `uniData` exists; keep scrapeMeta fixture/retention branches as today.

---

### B3 · `aria-modal` dialogs without Tab focus trap  
**Tag:** `confirmed` · **Severity:** High · **Where:** `js/ui/{table,faculty}-picker.js` · `js/main.js` `bindPickerChrome`

**What:** Both overlays set `role="dialog"`, `aria-modal="true"`, Escape closes, ArrowUp/Down/Home/End move within `.faculty-option`. There is **no** Tab/Shift+Tab wrap, no `inert` on `.site`, and no `focusin` guard. After the last option, Tab reaches page chrome (score input, overview, footer) while `html.*-overlay-open` only locks `overflow`, not focus. Backdrop is a sibling `<button>` before the dialog — easy to land on via Shift+Tab from header/close without a trap model.

**Repro:** Open faculty (or table) overlay → Tab repeatedly past options → focus lands in the page behind the modal; screen reader virtual cursor can exit the dialog.

**Expected:** While open, Tab cycles dialog focusables (search ↔ options ↔ close); optional `inert` on `#top` / `.site` excluding the portal.  
**Impact:** WCAG dialog pattern failure for the two primary hero controls.

---

### B4 · Overview list rebuild drops keyboard focus; aria misstates place metric  
**Tag:** `confirmed` · **Severity:** High · **Where:** `js/ui/radar.js` `renderOverviewList` · `js/main.js` `onSelectSpecialty` / `setSelected` → `emit` → `renderBoard`

**What:**

1. Every selection (and every board render) does `container.innerHTML = ''` and rebuilds the listbox. The activated `<button role="option">` is destroyed → focus goes to `body`. Mobile still `scrollIntoView`s `#detail-panel` (keep that); keyboard users lose their place in the master list.  
2. Newly added `aria-label` includes  
   `` `${peopleAbove} из ${plan} мест выше тебя` ``  
   Visible twin is **«Над тобой / мест»** (`peopleAbove` / `plan`). «N из M мест выше тебя» reads as “N of M seats are above you,” which is false when peopleAbove ≳ plan (edge cases R2 cares about).

**Repro:** Tab to an overview row → Space/Enter to select → focus lost; VoiceOver/TalkBack hears misleading “из … мест выше”.

**Expected:** Patch selection styles / `aria-selected` in place when the id set is unchanged; aria like «над тобой N, мест M» (mirror detail metric).  
**Impact:** Undermines the R2 P0#4 aria investment; hurts keyboard + AT users most.

---

### B5 · Reduced-motion gaps on scroll + overlay close delay  
**Tag:** `confirmed` · **Severity:** Medium–High · **Where:** `css/layout.css` `html { scroll-behavior: smooth }` · `js/main.js` score submit + mobile detail scroll · `js/ui/faculty-picker.js` `CLOSE_MS = 220`

**What:** CSS correctly disables faculty/meta/chance/detail animations under `prefers-reduced-motion: reduce`. Still smooth:

- Global `html { scroll-behavior: smooth }` with **no** reduced-motion override.  
- `scrollIntoView({ behavior: 'smooth' })` on score submit and specialty select (no `prefersReducedMotion()` branch — unlike meta fade).  
- Faculty close always waits `CLOSE_MS` (220) before DOM teardown / trigger focus, even when transitions are `none`.

**Expected:** `scroll-behavior: auto` under reduce; JS `behavior: prefersReducedMotion() ? 'auto' : 'smooth'`; `CLOSE_MS → 0` (or finish immediately) when reduced.

**Impact:** Motion-sensitive users still get smooth page jumps and delayed focus return after closing the loudest overlay.

---

### B6 · Share / OG card weak on brand + awkward crop surface  
**Tag:** `confirmed` · **Severity:** Medium–High · **Where:** `index.html` head · `assets/og-share.jpg`

**What:**

| Signal | Actual |
|--------|--------|
| Image | **1200×340** (banner), ink only ~**2.8%** of pixels in bbox ≈(353,115)–(845,227); paper `#f7f7f5` elsewhere |
| `og:image:height` | `340` (matches file; not the 1200×630 platforms prefer) |
| `og:title` / `<title>` | Product-first «БГУ · live-таблицы конкурса» |
| Brand | `og:site_name` + description footer only |
| Description | Literal `&#10;made by: r.w.b. \| production` in the attribute source — entity-aware parsers decode; dumb scrapers may show `&#10;` |

**Expected (brand rules / R2):** Share preview should read as **r.w.b. \| production** even if product title stays; image should survive 1.91:1 / square crops with legible lockup (not a thin centered strip on an empty banner). Prefer a real newline or separate “maker” line platforms reliably keep.

**Impact:** Link previews look empty/cropped and brand-secondary — fails the brand test for the one surface people see outside the site.

---

## Smells (not elevated)

| ID | Smell | Why not confirmed high |
|----|--------|-------------------------|
| S1 | `setForm` comment says “resets faculty scope” but only clears `selectedId` | `renderBoard` → `syncFacultySelection` rebinds; may be intentional keep-when-present |
| S2 | `runScheduledRefresh` pre-arms then `fetchData` re-arms → rotator epoch double-reset | Prevents tick re-entry; UX jitter only during refresh |
| S3 | Non-silent `fetchData` can `emit()` in try and again in `finally` | Double remount; covered partly by B1/B4 |
| S4 | Meta live region empties both lines during 720ms swap (`aria-hidden` both) | Intentional sequential fade; reduce path already 0ms |
| S5 | Global retention banner when *any* `retainedFormIds` (R2 wanted scoped note) | Product copy preference, not a logic break |
| S6 | `online` always triggers refresh ignoring due time | Aggressive freshness; acceptable chase |

---

## False-positive-checked

| Hypothesis | Verdict |
|------------|---------|
| Need another mobile `scrollIntoView` to detail after select | **FP** — already in `onSelectSpecialty` (`max-width: 767px`, `block: 'nearest'`). Remaining mobile gap is return-to-list / sticky back (R2 P1#8A), not a second scroll |
| `metaRotatorPhase` / fade helpers wrong | **FP** — matches tests; refreshing forces countdown; reduce → `metaFadeMs(0)` |
| `fetchChain` drops overlapping polls | **FP** — serializes via `fetchChain.then(run, run)` |
| Overview missing status for AT | **FP** — `statusLabel` is in `aria-label`; defect is **wording** of place metric (B4), not absence |
| Stale chase never tightens poll | **FP** — `resolveEffectivePollMs` → 30s when aged; defect is **banner** lag on failure (B2) |
| Faculty Escape / trigger restore broken | **FP** — Escape + delayed focus works; delay ignored under reduce is B5 |

---

## Fix ranking (morning)

1. **B1** table-picker shell parity + `#table-overlay-root` z-index (highest visible polish + a11y adjacent)  
2. **B2** freshness banner on schedule / failed refresh  
3. **B3** Tab focus trap (both overlays)  
4. **B4** overview incremental selection + fix aria place copy  
5. **B5** reduced-motion for scroll + close timeout  
6. **B6** OG 1200×630 (or safer crop) + brand-forward title/description without brittle `&#10;`

Do not file a second mobile scroll helpers as a “fix.”

---

*End of R4 UX/a11y hunt. No application code modified.*
