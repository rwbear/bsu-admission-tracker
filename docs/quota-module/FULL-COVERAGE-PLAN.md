# Full left-column coverage — execution plan

## Why конфликтология “says nothing” on the live site

1. **Pages branch** = `cursor/admission-tracker-rebuild-be86`. Live JSON has `plan=10`, `inCompetition=4`, **no** `admittedNoExam` / `taken` / `openPlan`. Client treats 4 < 10 as underfilled → soft silence; the 8 БВИ never appear.
2. This feature branch already parses `admittedNoExam=8`, `openPlan=2` — but that code/data is **not** what GitHub Pages serves until rebuild is updated.
3. Default table is still **id=7 (платная)**. On paid, конфликтология has `taken=0`. Budget story requires **id=32**.

## Goal

Every specialty detail must surface the same left-of-band numbers the ugly `formk1` table prints, in calm r.w.b. language — not only when `taken > 0`, and not only as a faint note.

## Ship steps

1. Parser: also map `planPaid` («на условиях оплаты») when present; keep optional targets.
2. UI: always-on **«Как в таблице»** fact strip when `quotaParseOk` (план, целевая, оплата, подано, целевые зачислены, БВИ, вне конкурса, по конкурсу, мест в общем).
3. Slab remains when `taken > 0`; facts strip always when parse ok.
4. Metrics: clarify «мест конкурса»; show official plan as its own cell.
5. Tests for конфликтология (form 32) + fact strip.
6. Merge/push to **Pages rebuild branch** so live site + data tip update.
7. Re-scrape on rebuild so JSON carries quota fields.
