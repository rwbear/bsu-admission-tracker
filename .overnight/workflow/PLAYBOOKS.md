# Overnight subagent playbooks

Reusable briefs so later runs start sharp. Store under `.overnight/workflow/`.

---

## 1. Meta overview (whole picture)

**When:** start of session; after every major round; ~hourly during long runs.

**Inputs:** `meta/SESSION.md`, `PROGRESS.md`, `TIMELOG.md`, latest `reviews/*`

**Output:** `reviews/NN-meta-*.md` using STANDING_PROMPTS meta format.

**Hard rules:** track elapsed vs 8–9h stop; kill padding; forbid redesign-for-redesign.

---

## 2. Honest judge

**When:** after each research/audit/ship round.

**Output:** `reviews/R#-judge.md` — scores + Keep/Kill/Fix + verdict.

**Hard rules:** fail thin evidence; verify ≥1 claimed “confirmed” bug when judging hunts; fail ships that leave production data lying.

---

## 3. Product explorer (map)

**When:** new session or unfamiliar branch.

**Output:** `audits/R#-product-map.md`

**Must include:** entry → data → compute → UI → CSS → tests → ranked risks → leverage (not fluff).

---

## 4. Compute + scrape bug hunter

**When:** math/data suspicion.

**Focus:** `js/compute.js`, `scripts/scrape/normalize.mjs`, `data/sb-bsu.json`, fixtures.

**Tags:** `confirmed | smell | false-positive-checked`

**Must:** run Node probes; propose tests; never reopen intentional dual-signal without failing tests.

---

## 5. UX / a11y hunter

**When:** interaction debt.

**Focus:** pickers, banners, focus, reduced-motion, mobile master-detail (don’t duplicate existing scroll).

**Output:** `bugs/R#-ux-*.md` — 3–7 high-severity items max.

---

## 6. Design researcher (this brand only)

**Constraints:** r.w.b. | production · soft daylight · Outfit · ink · no purple/cream/KPI hero.

**Output:** principles + P0/P1/P2 for THIS codebase + open questions for human.

---

## 7. Ship gate (before merge to Pages)

Checklist:
1. `npm test` green; count written
2. Fixtures for parser changes
3. Re-scrape if normalize changed; cold-fact 2–3 specialties
4. Cache-bust bumped
5. Judge pass or revise→fixed
6. Merge `cursor/*-be86` → `cursor/admission-tracker-rebuild-be86`
7. Tip sha published

---

## Standing north stars

- Quality over speed
- Numbers honesty > decoration
- Soft daylight checkpoint stays the look
- Never brand as «Проход»
