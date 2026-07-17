# R1 Judge — Product surface map

**Round:** 1 · Product map + baseline  
**Artifact:** `.overnight/audits/R1-product-map.md`  
**Code changes:** none (correct for this round)  
**Judge UTC:** ~2026-07-15T23:45Z

---

## Scores (1–5)

| Axis | Score | Notes |
|------|------:|-------|
| **Depth** | **4** | Goes past file listing into real product physics: formk1 column heuristics → wrong plan/passing; soft retention → mixed freshness under one `updatedAt`; peopleAbove (uniform band) vs status (delta to passing); dual catalog / load race. Ranks those. Stops short of reproducing a bug or opening real formk1 HTML. |
| **Rigor** | **3** | Spot-check against repo: config (`sb-bsu`, Pages branch, `pollMs` 180s), prefs keys, line counts, snapshot shape (~200 / 13 / 18), Actions self-arm 270s, `snapshotChanged` stringify, table-picker full remount, test file set — all match. Failures: no recorded `npm test` / fixture cold facts in the artifact (meta asked for them); several risks (#6 API spam, #7 focus flicker) are reasoned, not observed; catalog “drift” asserted without showing a current diff (ids currently align). |
| **Product fit** | **5** | Unmistakably this site: RU copy, Outfit / paper daylight / r.w.b., master-detail + chance track, hub tables, scrape→Pages truth path. Not a generic “admission SaaS” map. Respects “do not redesign / do not re-litigate pin math.” |
| **Ship readiness** | **4** | Map is safe to drive R2–R3. Nothing shipped this round (correct). Not a sealed baseline until test pass count and observed-vs-hypothesized risk labels are written down. |

---

## Keep

- Entry → bootstrap → data → compute → UI → CSS → tests spine (sections 1–6).
- Ranked risk list #1–#5 (parser, proxy, retention, dual catalog, status/peopleAbove tension) as the overnight critical path.
- Honest test gap table (math strong / scrape HTML + `main.js` weak).
- Leverage items #1–#3 (golden formk1 fixtures, post-scrape invariants, single catalog source).
- Explicit non-goals matching brand (no purple/cream hero cards).

## Kill

- Treating **unreproduced** UX/load risks (#6, #7, parts of #9) as equal weight to parser/retention without labeling them hypothesis.
- Any temptation to expand stubs (bsuir/bntu/grsu) or “hub discovery” from §7.10 — dead code, out of north star for overnight.
- Redesign / brand re-litigation disguised as “map follow-up.”

## Fix before morning

1. **Append cold facts to the R1 audit (or a sibling note):** `npm test` → **58 pass / 0 fail** (verified this judge pass); note snapshot `updatedAt` observed.
2. **Tag each §7 risk** `observed | inferred-from-code | hypothesis` so R3/R4 don’t chase ghosts.
3. **One-line catalog status:** `js/tables.js` ↔ `sources/bsu-tables.json` — same 13 ids today; risk is process drift, not current breakage.

## Verdict

**pass**

Grounded, on-brand, actionable ranked backlog. Not scrap-thin. Not a 5 across the board: missing written test baseline and a few speculative risk peers keep rigor at 3. Proceed to Round 2 design research only against Keep + §8 leverage priorities — do not reopen chance-track pin / peopleAbove unless tests or live spot-check disagree.
