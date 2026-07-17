# Morning packet — BSU admission tracker overnight

**For:** Misha · wake window ~2026-07-16  
**Session:** 2026-07-15T23:40:43Z → stop by ~07:40–08:40Z (8–9h hard cap)  
**Live:** https://rwbear.github.io/bsu-admission-tracker/ · cache `?v=20260715an`  
**Tip at quality land:** `7e4d773` (overnight ships). Pages tip may advance with Actions data scrapes — code stays; live bio2 still `11/10`.  
**Local archive:** `/workspace/.overnight/` (not in git — open there)

---

## Verdict in one breath

The screenshot bug on «Дорожка конкурса» was only the start: overnight found **lying «Конкурс» / apps columns** on real formk1 HTML, healed the scrape, locked invariants, and closed a stack of honest-UI / a11y gaps. The site’s numbers and chrome now agree much harder. Design research is deep and on-brand; open questions are trimmed for you.

---

## What shipped (must know)

1. **Parser honesty** — rowspan grid + `resolvePlanApps` (Всего ≥ bands; no целевое steal). Goldens for forms **2 / 29 / 32**.
2. **Data heal** — re-scrape; e.g. биология form2 **11/10**, form32 **37/18**, правоведение(м) **19/14**.
3. **CI invariants** — `ta ≥ ic`, band≈ic, passing recompute; **71/0** tests.
4. **Status / pressure** — no blank mark after score when seats full; one `competition` for pressure, note, track.
5. **Dual-signal copy** — when place is past seats but status «На грани», detail note explains both lenses.
6. **UX** — table-picker shell parity, overlay z-index, stale banner on fail + schedule, Tab trap, reduced-motion, sticky detail, overview focus keep, mobile **«← Обзор»**.

Commits listed in `shipped/INDEX.md`.

---

## What we learned (design)

Full brief: `design/R2-design-research.md` + errata `design/R2-errata.md`.

- Scoreboard tone, not sportsbook.
- **Two lenses stay siblings** (расчётный status vs «над тобой» place) — explain, don’t blend into a fake %.
- Motion budget already spent — rebalance, don’t add loops.
- Faculty×form density ~**3–17** (not “10–30 enterprise”).
- Paste-ready methodology `<details>` exists at `design/methodology-details-ru.md` — **not wired** (your call).

---

## What we refused

- Reopening pin / peopleAbove dual-signal *math*
- Chroma status / admission % gauges / hard-sun
- Shipping parser without goldens + re-scrape
- Inventing ships to fill clock time after critical path closed

---

## Decisions for you (≤5)

1. Keep dual-signal contradiction sentence as written?
2. Wire methodology `<details>` («Как считается место»)?
3. OG image back to 1200×630 with stronger brand plane?
4. Hide overview after select on mobile (stack B) vs current scroll + «← Обзор»?
5. Prefer lifelong ink-only status marks (no future color)?

---

## Archive map

| Path | Contents |
|------|----------|
| `audits/` | Product surface map |
| `design/` | Research, errata, methodology draft |
| `bugs/` | R3 compute/data, R4 UX, R5 main orchestration |
| `reviews/` | Judges + meta overview trail |
| `workflow/` | Standing prompts + playbooks for future agents |
| `shipped/` | Commit index |
| `meta/` | Session, progress, timelog, this packet |

---

## How to verify in 2 minutes

1. Hard-refresh live · confirm `?v=20260715an`
2. Faculty FMO · score **391** · «международные отношения» — track/pin/status coherent; dual note if past seats
3. Table form **2** биология · «Конкурс» ≈ **1.1×** not 0.1×
4. Open table picker · type search · no dialog blink
5. Mobile · select specialty · «← Обзор» returns to list
