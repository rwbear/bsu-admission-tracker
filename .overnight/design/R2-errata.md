# R2 errata — Fix-before-morning

**Parent:** `R2-design-research.md`  
**Trigger:** `reviews/R2-judge.md` → Fix before morning (pass, revise before implement)  
**Scope:** design docs only · no app code in this file  
**Spot-check base (this errata):** `js/main.js` `onSelectSpecialty`, `js/ui/radar.js`, `data/sb-bsu.json` @ `updatedAt` 2026-07-15T23:59Z  

Errata **supersedes** the brief where they conflict. Unmentioned Keep / Kill / P0 / principles stand.

---

## 1. P1#8 mobile master–detail — rewrite (do not ship as written)

### What the brief got wrong

P1#8A treated `scrollIntoView` on `#detail-panel` as a **new** discovery. It already exists:

```274:281:js/main.js
function onSelectSpecialty(id) {
  setSelected(id);
  if (window.matchMedia('(max-width: 767px)').matches) {
    $detail.scrollIntoView({
      behavior: prefersReducedMotion() ? 'auto' : 'smooth',
      block: 'nearest',
    });
  }
}
```

Shipping a second scroll path (another listener, duplicate smooth scroll, or re-binding select) is **Kill**.

### Residual gap (the real P1)

| Need | Status at errata time | Recommendation |
|------|----------------------|----------------|
| Scroll list → detail on mobile select | **Done** (`onSelectSpecialty`) | Leave alone |
| Return-to-list affordance | **Done in later R4 tranche:** `.detail-back` «← Обзор» scrolls overview col into view | Keep; do not reinvent as a second sticky marketing bar unless product asks |
| Optional pure stack (hide list / show detail) | **Not shipped** — option B still valid if Misha wants stateful panes | Morning decision only; higher state risk |

### Corrected P1#8 text (replace brief §)

> **Mobile list–detail.** Forward scroll already lives in `onSelectSpecialty` (&lt;768). Residual work is **return** (or true stack B), not discovery of scroll. Prefer light ink «← Обзор» control that scrolls back to overview — no card glow, no second scroll-on-select. Option B (hide list / show detail) only if morning chooses stateful panes over scroll.

### Implementer rule

- **Forbidden:** another `scrollIntoView` on specialty select.  
- **Allowed:** polish/sticky/presence on the existing back control; option B behind an explicit product yes.

---

## 2. List scale — tighten numbers; kill “10–30”

### Brief drift to kill

- Source table corrected density, but P1 header still said **“10–30 / dense faculties.”**  
- “Median ~4” for faculty×form is close; do not inflate the tail into enterprise-grid thinking.

### Snapshot recompute (current `sb-bsu.json`)

Faculty × form groups (what the overview list actually shows after channel + faculty):

| Stat | Value |
|------|------:|
| Groups | 46 |
| Min / max | 1 / **17** |
| Median | **4** |
| Mean | ~4.3 |
| Groups with ≥8 specialties | **7** |
| Groups with ≥10 | **1** (max 17) |

Judge asked for “median ~3.” On this snapshot the index-median is **4**; ~half of groups are ≤3 (p40 ≈ 3). Either way: **typical list is a handful**, not 10–30. Design for **~8–17 tails that are real but rare**, not for dense admin grids.

### Corrected framing (use everywhere)

- Default faculty×form list: **~1–7** (median ~3–4).  
- Dense tail: **~8–17**, about seven groups today; only one ≥10.  
- **Never** “10–30 specialty lists” as the planning default.  
- Mobile “lose overview after select” pain is **real for the dense tail**, not the median faculty — so sticky/return affordances matter, but do not rebuild the board as a mega-table UI.

### Section-title patch

Replace brief P1 header wording:

- ~~Master–detail mobile + desktop (10–30 / dense faculties)~~  
- → **Master–detail mobile + desktop (typical ~3–4; dense tail ~8–17)**

---

## 3. P0#2 — commit the label (no longer optional)

### Judge rule

Half-recommendations leave P0. Commit one string or demote.

### Decision (sealed)

| Surface | Label |
|---------|--------|
| Detail metric (primary) | **«Расчётный балл»** |
| Honesty note (default) | keep «расчётный балл — оценка по таблице» |
| Footer | keep «Расчётный балл — не приказ» |

**Do not** shorten the metric back to bare «Расчётный».  
**Do not** invent «проходной» in UI chrome.

### Status note

`radar.js` already renders `metric('Расчётный балл', …)` — P0#2 is **done for copy**. Residual honesty work stays on contradiction / underfilled / retention notes (P0#1, #3), not on renaming again.

### P0 list after errata

| # | Item | Errata status |
|---|------|----------------|
| 1 | Contradiction sentence | Keep (shipped later overnight; protect wording) |
| 2 | «Расчётный балл» label | **Committed** — closed |
| 3 | Retention-scoped note | Keep if still missing per-table scope |
| 4 | Overview `aria-label` + status | Keep |
| 5 | Overview column grammar | Keep |
| 6 | Detail primary/secondary weight | Keep |

---

## 4. Open questions for Misha — collapsed to ≤5

**Morning (decision-blocking):**

1. **Contradiction moments** — When place is past seats but status is «На грани», prefer explaining *place* first, *расчётный* first, or keep both equal with only a note?  
2. **Mobile list–detail** — Keep scroll + «← Обзор» (current), or move to true hide-list / show-detail stack?  
3. **Status color forever ink?** — Confirm no green/amber/red in app chrome (and in share/OG, or OG-only exception)?  
4. **«Расчётный балл»** — Confirm sealed wording above, or harden further («оценка» everywhere)?  
5. **Scope freeze** — Confirm R3+ still does **not** redesign chance-track pin geometry — only copy/CSS/hierarchy around it.

**If time (parked — do not block morning):**

- Hero faculty weight vs brand on first visit  
- Summary strip keep vs drop once marks + sort exist  
- Methodology always-visible one-liner vs `<details>` only → see `methodology-details-ru.md` draft  
- Mixed retention: global banner vs per-table / per-row  
- Multi-uni: BSU-specific «таблица мониторинга» vs future-neutral «канал»

---

## 5. What this errata does *not* change

- Product physics (two lenses, estimate ≠ order, hero budget, motion nearly maxed).  
- Principles 1–12; anti-pattern kill list; reject fake admission %.  
- Motion stance: reallocate / prune — no sixth animation layer.  
- **Do not reopen** chance-track pin / peopleAbove math.  
- Brand remains **r.w.b. | production** only.

---

## 6. Suggested morning intake order (updated)

1. Read this errata before touching P1#8.  
2. Honesty/hierarchy that is still open: retention-scoped note · aria · metric weight (if not already landed).  
3. Methodology `<details>` copy from `methodology-details-ru.md` — after numbers, not instead of them.  
4. Defer pure mobile stack (B) and desktop sticky detail until questions #2 (and optional sticky) are answered.

---

*End of R2 errata. Supersedes conflicting mobile / scale / P0#2 / open-question sections of the research brief.*
