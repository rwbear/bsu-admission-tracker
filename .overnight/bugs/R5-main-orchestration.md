# R5 — `main.js` orchestration audit

**Mode:** report only (no application source changes)  
**UTC:** 2026-07-16 ~00:09Z  
**Surface:** `/workspace/js/main.js` + `js/state.js` + `js/ui/radar.js` (`renderOverviewList` / `resolveSelection`) + refresh helpers  
**Depends on:** R2 P1#8 (mobile list–detail) · R4 B4 / FP “second scroll” · current tip after R4 tranche2 (Tab trap, reduced-motion scroll, failed-poll banner, table shell parity already landed)  
**Tests:** not a gate for DOM orchestration; snapshot used only to size `stringify` cost

---

## Executive summary

Five themes examined end-to-end. **Confirmed:** overview list remount drops focus on every selection; `syncTableSelection` / `syncFacultySelection` mutate form/faculty **without** the `setForm`/`setFaculty` selection contract, then `resolveSelection` → `setSelected` **re-enters** `renderBoard`; `snapshotChanged` dual-`JSON.stringify`s ~282KB specialties on the common equal-`updatedAt` path; silent refresh can double-queue because `refreshing` is set only inside the chained `run`, while `online` ignores due time. **Smell / product gap:** mobile still lacks R2 P1#8A sticky «← Обзор» — **`scrollIntoView` to detail already exists; do not add a second scroll helper.**

---

## Scope evidence (cold)

| Probe | Result |
|--------|--------|
| Overview paint | `radar.js` `renderOverviewList`: always `container.innerHTML = ''` then rebuild listbox |
| Selection write path | `setSelected` → sync `emit()` → `subscribe(() => renderBoard())` |
| Auto-repair path | `renderMasterDetail` → `resolveSelection` → `setSelected` + **early return** (nested emit) |
| Form/faculty sync | `syncTableSelection` / `syncFacultySelection` write `state.*` + `localStorage` **directly** (bypass `setForm` / `setFaculty`) |
| `setForm` / `setFaculty` | Clear `selectedId` + emit (intentional user path) |
| Snapshot compare | `updatedAt` short-circuit, else dual `JSON.stringify(specialties)` |
| Live snapshot | `data/sb-bsu.json` · 197 specialties · **~282 149** stringify bytes · dual compare ~**564 KB** alloc · ~**1.4 ms**/pair on this host (50× bench) |
| Silent schedule | `runScheduledRefresh` guards `refreshing`, but flag flips only inside `fetchChain` `run`; pre-`armNextRefresh()` before await |
| Mobile select | `onSelectSpecialty`: `<768px` → `$detail.scrollIntoView(...)` (reduced-motion aware) |
| Sticky back UI | **Absent** in HTML/CSS/JS (no «← Обзор» bar) |
| Desktop sticky detail | Present from `768px` on `.detail-col .panel` |

---

## Confirmed bugs

### B1 · Overview remount destroys focus on selection  
**Tag:** `confirmed` · **Severity:** High · **Where:** `js/ui/radar.js` `renderOverviewList` · `js/main.js` `onSelectSpecialty` → `setSelected` → `emit` → `renderBoard` → `renderMasterDetail`

**What:** Choosing an overview row calls `setSelected(id)` which **synchronously** `emit()`s. The sole subscriber always rebuilds the board. `renderOverviewList` clears `innerHTML` and creates new `<button role="option">` nodes. The activated control is destroyed → focus falls to `body` (or nowhere useful). Keyboard users lose list position after every Space/Enter; AT focus follows that loss. Silent `emit()` on `changed` snapshots remounts the same way mid-interaction.

Mobile `scrollIntoView` on `#detail-panel` still runs (good). It does not restore overview focus.

**Repro:**

1. Tab into an overview row; activate with Enter/Space.  
2. Observe: focus leaves the listbox; selected styling is on a **new** DOM node.  
3. Optional: leave focus on a row; wait for a silent refresh that reports `changed` → same remount/focus loss without a click.

**Expected:** When the row id set is unchanged, patch `selected` / `aria-selected` (and classes) in place; only rebuild when ids/order/metrics require it. If a full rebuild is unavoidable, restore focus to `[data-id="<selectedId>"]` after paint.

**Minimal fix:** In `renderOverviewList` (or a thin `paintOverviewSelection` helper): if container already has `.overview-list` with the same ordered `data-id`s, update classes/`aria-selected` only; else rebuild once, then `list.querySelector(`[data-id="${CSS.escape(selectedId)}"]`)?.focus({ preventScroll: true })` when focus was inside the list before paint. Keep existing mobile `scrollIntoView` untouched.

**Impact:** Undercuts R2 “selection is sacred” and the R4 aria investment on every selection, not only on edge refreshes.

---

### B2 · Form/faculty sync bypasses selection reset contract; `setSelected` re-enters `renderBoard`  
**Tag:** `confirmed` · **Severity:** High · **Where:** `js/main.js` `syncTableSelection` / `syncFacultySelection` / `renderMasterDetail` · `js/state.js` `setForm` / `setFaculty` / `setSelected`

**What (two coupled defects):**

1. **Contract split.** User pickers call `setForm` / `setFaculty`, which clear `selectedId` and emit. Board orchestration also runs `syncTableSelection()` + `syncFacultySelection()` on **every** `renderBoard` and again after a successful fetch. Those helpers assign `state.formId` / `state.facultyId` (and prefs) **without** clearing selection. When the coerced form/faculty filters out the stored specialty, `resolveSelection` falls through to `enrichedRows[0]` and calls `setSelected` — selection “jumps” to the first row of the coerced faculty/table without a user picker change. Typical triggers: first paint after `uniData` arrives; silent refresh where a faculty disappears from `facultiesForTable`; catalog/table list resolving a different default than the saved id.

2. **Re-entrant emit.** `renderMasterDetail` does:
   ```js
   if (selectedId !== state.selectedId) {
     setSelected(selectedId);
     return;
   }
   ```
   `setSelected` → `emit()` → nested `renderBoard()` completes a full paint, then the outer call returns. Every intentional `setForm`/`setFaculty` (null selection → auto-first) and every sync-coercion path pays a **double** board render. Combined with B1, that is two full overview remounts per filter change.

**Also smell (not separate bug):** `setForm`’s comment claims it “resets faculty scope”; it only clears `selectedId`. Faculty rebinding is left to `syncFacultySelection` (R4 S1). End state is usually fine after sync, but the bypass makes unexpected faculty+selection coupling harder to see.

**Repro (sync coercion):**

1. Persist a faculty id that exists for table A.  
2. Switch data so that faculty is absent for the active `formId` (or load with a saved faculty not in `facultiesForTable`).  
3. Observe: `state.facultyId` changes inside `syncFacultySelection` with no `setFaculty`; overview selection becomes specialty[0] of the new faculty via `resolveSelection` + nested `setSelected`.

**Repro (re-entrancy):** Change table in the picker → one `setForm` emit, then an immediate second `emit` from auto-`setSelected` while the first `renderBoard` is still on the stack.

**Expected:** Coercing form/faculty goes through one helper that applies the same selection policy as `setForm`/`setFaculty` (clear or explicitly re-resolve once). Auto-selection should update state **without** nested `emit` mid-render (set field + persist, paint once; or defer `emit` to microtask after the outer render finishes).

**Minimal fix:**

- Extract `applyFormId(id, { clearSelection })` / `applyFacultyId(...)` used by both setters and sync.  
- When sync changes an id, clear or resolve selection in that same place.  
- In `renderMasterDetail`, if selection must change: assign `state.selectedId` + `localStorage` **without** `emit`, then continue the same paint; or return a flag and let `renderBoard` call `emit` once at the end.

**Impact:** Users see selection/faculty jump on refresh or first data bind; orchestration always double-renders on filter changes.

---

### B3 · Silent refresh race: `refreshing` gap + `online` ignores due time  
**Tag:** `confirmed` · **Severity:** Medium–High · **Where:** `js/main.js` `fetchData` / `runScheduledRefresh` / `onScheduleTick` / `online` + `visibilitychange` listeners

**What:** Overlap control is split across three mechanisms that are not aligned:

| Mechanism | Behavior |
|-----------|----------|
| `fetchChain` | Serializes `run` callbacks (good) |
| `refreshing` | Set `true` only at the **start of** `run`, not when `fetchData` is invoked |
| `runScheduledRefresh` | `if (refreshing) return;` then **`armNextRefresh()`** then `await fetchData({ silent: true })` |
| `online` | Always calls `runScheduledRefresh()` — no due-time check |
| Tick / visibility | Tick uses `shouldRefreshNow(..., refreshing, ...)`; visibility only refreshes if `now >= nextRefreshAt` |

**Race (confirmed by control-flow):**

1. Tick: `shouldRefreshNow` true → `runScheduledRefresh`.  
2. `refreshing === false` → pre-arm schedule → `fetchData` queues `run` on `fetchChain` and returns a Promise.  
3. **Before** the queued `run` sets `refreshing = true`, `online` (or a second visibility/tick edge) enters `runScheduledRefresh` again.  
4. Second entry also sees `refreshing === false`, pre-arms again, queues a **second** silent fetch.  
5. `fetchChain` runs both back-to-back: duplicate network, duplicate `snapshotChanged`, and if either reports `changed`, duplicate `emit()` → B1 remounts.

Pre-arm before fetch hides the gap from the 1s tick (`nextRefreshAt` pushed forward) but **does not** protect `online`, which never consults `nextRefreshAt`.

**Related (smell, same area):** Non-silent `fetchData` can `emit()` in `try` (`!silent \|\| changed`) and again in `finally` (`if (!silent) emit()`), so bootstrap/retry remount twice (amplifies B1). Silent+unchanged path correctly skips board emit.

**Repro (logic):** Start a scheduled silent refresh; fire `window` `online` in the same turn before the fetchChain microtask runs `run` → two queued silent loads.

**Expected:** Treat “refresh requested” as busy **before** await/queue (e.g. set `refreshing = true` synchronously in `fetchData` or `runScheduledRefresh`), or key the guard off “chain pending” rather than mid-run. Optionally give `online` the same due/visibility policy as the tick, or coalesce to a single trailing fetch.

**Minimal fix:** Set `refreshing = true` at the top of `runScheduledRefresh` / synchronously in `fetchData` before returning the chained promise; clear only in `finally`. Drop the pre-arm if the flag is reliable, or keep pre-arm but make `online` no-op when `refreshing`. Collapse double `emit` on non-silent to a single finally emit.

**Impact:** Duplicate polls under flaky connectivity; extra main-thread compare + possible focus-killing remounts (B1).

---

### B4 · `snapshotChanged` pays dual `JSON.stringify` on the common path  
**Tag:** `confirmed` · **Severity:** Medium (perf smell with dead work) · **Where:** `js/main.js` `snapshotChanged` · caller `fetchData` every poll

**What:**

```js
if (next.updatedAt !== prev.updatedAt) return true;
return JSON.stringify(next.specialties) !== JSON.stringify(prev.specialties);
```

- Unequal `updatedAt` → return `true` **without** stringify (cheap).  
- Equal `updatedAt` → stringify **both** specialty arrays (~282KB each on current snapshot ≈ **564KB** temporary strings; ~**1.4ms** dual compare here).  

Unchanged silent polls (the majority) keep the same scrape stamp → **always** hit the expensive branch to discover `changed === false`. Pipeline writes a new `updatedAt` whenever Actions commits a new body, so same-stamp / different-body is not a realistic success mode for `loadUniversity` + `bust: true` (fresh JSON parse each time). The specialties deep compare is therefore **dead cost on the steady-state poll path**.

Stale chase (`STALE_POLL_MS` = 30s) multiplies how often that dead path runs while Pages has not moved.

**Repro:** Poll twice against an unchanged `sb-bsu.json`; observe `updatedAt` equal and both stringifies running before `changed === false` skips board emit.

**Expected:** Treat equal `updatedAt` as unchanged, **or** compare a cheap fingerprint already on the payload (byte length, specialty count, hash if scrape adds one). Keep a deep compare only behind an explicit debug flag if ever needed.

**Minimal fix:** `if (next.updatedAt === prev.updatedAt) return false;` after the null/unequal checks; delete the stringify line. Optional belt: `next.specialties?.length !== prev.specialties?.length`.

**Impact:** Avoidable main-thread work every quiet poll; grows linearly with hub specialty count.

---

## Smells (not elevated to bugs)

### S1 · Mobile sticky back affordance gap (scroll already shipped)  
**Tag:** `smell` / product gap · **Severity:** Medium (UX) · **Where:** `js/main.js` `onSelectSpecialty` · R2 P1#8A · CSS has no back bar

**What:** On `<768px`, selection already `scrollIntoView`s `#detail-panel` (`block: 'nearest'`, reduced-motion aware). Stacked master–detail still leaves both panels in the document: after reading charts the user must manually scroll back to the list. R2 recommended a light sticky mini-bar «← Обзор · {short name}» that scrolls to `#overview-list` (option A), not a second invent-your-own navigation stack.

**False positive guard (R4):** Do **not** file another “scroll to detail on select” helper — it exists. Desktop sticky detail panel (≥768) is already in `layout.css`.

**Minimal fix when scheduled:** One sticky bar under `.command` or at top of `.detail-col` for `max-width: 767px` when `selectedId` is set; click → `$overview.scrollIntoView(...)` with the same reduced-motion branch. No routing, no hide-list mode unless P1#8B is explicitly chosen later.

---

### S2 · Duplicate `prefersReducedMotion` in `main.js`  
Declared twice (≈L182 and ≈L392). Harmless shadowing; delete one copy when touching the file.

---

### S3 · `prepareSpecs` runs twice per successful paint  
`renderMasterDetail` prepares rows for selection/summary/detail; `renderOverviewList` prepares again. Waste tied to B1 rebuilds; fix with a single prepared list passed into overview, or incremental paint.

---

### S4 · Pre-arm + finally re-arm resets meta rotator epoch twice per refresh  
`runScheduledRefresh` calls `armNextRefresh()` before fetch; `fetchData` `finally` arms again. Countdown/phase epoch jitters during refresh (R4 S2). Low severity once B3’s busy flag is solid.

---

## False-positive-checked

| Hypothesis | Verdict |
|------------|---------|
| Need another mobile `scrollIntoView` to detail | **FP** — already in `onSelectSpecialty`. Remaining gap is **sticky back** (S1), not forward scroll |
| `fetchChain` drops overlapping polls | **FP** — chain serializes; defect is **double-queue** before `refreshing` flips (B3) |
| `setForm`/`setFaculty` fail to clear selection | **FP** — they clear; unexpected jumps come from **sync bypass** + `resolveSelection` (B2) |
| Equal-`updatedAt` still needs deep specialties compare | **FP** for this scrape/CDN pipeline — stringify is dead work (B4) |
| Silent unchanged polls remount overview | **FP** — `!silent \|\| changed` skips emit; remount is selection path (B1) + changed silent (B1/B3) |
| Table-picker remount / missing Tab trap / failed-poll banner | **Out of scope / largely landed** in post-R4 tip — not re-filed here |

---

## Fix ranking (minimal morning slice)

| Rank | ID | Fix | Why first |
|------|-----|-----|-----------|
| 1 | **B1** | Incremental overview selection paint + focus restore | Every click/key select; pairs with R2 sacred selection |
| 2 | **B2** | Shared apply-form/faculty + non-emitting selection repair in one paint | Stops surprise jumps and nested double `renderBoard` |
| 3 | **B3** | Eager `refreshing` / coalesce `online` | Stops double silent fetch under blips |
| 4 | **B4** | Drop specialties stringify when `updatedAt` equal | One-liner; removes ~0.5MB alloc/poll |
| 5 | **S1** | Sticky «← Обзор» → scroll to `#overview-list` only | R2 P1#8A; **do not** reinvent forward scroll |

Suggested patch order for a single small PR: **B4 → B3 → B2 → B1** (low-risk → focus/a11y), with **S1** as a separate UX commit.

---

## Non-goals

- No application code changes in this round.  
- No second mobile scroll-to-detail helper.  
- No redesign of list–detail hide/show (P1#8B) unless product explicitly picks it over 8A.

---

*End of R5 main-orchestration audit. No application code modified.*
