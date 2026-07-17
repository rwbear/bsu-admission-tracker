# Debate A — Quiet Honesty

**Product:** BSU admission tracker · **Brand:** r.w.b. | production
**Stance (O3-leaning):** correct `openPlan` math is mandatory; presentation stays calm paper — **one** always-visible quiet quota sentence when seats were taken, methodology `<details>` for definitions, no stacked chance-track reserved block, no overview chips, no second table. Primary metrics stay «Над тобой / мест» (мест = `openPlan`) + «Расчётный балл».

## 1. What applicants need in the first detail glance

Three answers, in order: (a) above or below the line — status mark + delta; (b) how many people ahead, out of how many *real* seats — «Над тобой / мест»; (c) is that «мест» honest — does the tracker admit that БВИ / целевые / вне конкурса already claimed part of the plan. Everything else is second-glance. Principles 6 and 12 demand the same shape: corrected `openPlan` inside the numerator/denominator the eye already lands on, plus one sentence explaining where the missing seats went. Bioengineering is load-bearing — `plan=32`, БВИ=8, contest=31 — old math prints «underfilled», honest math prints a real contest.

## 2. UI copy proposals (Russian, ranked)

Rendered in the existing `.detail-note` slot. No card, no chip, no colour.

**V1 — recommended.** Full split, arrow to real capacity:
> «Из плана 32: без вступительных 8 · целевые 0 · вне конкурса 0 → в общем конкурсе 24 места.»

Names each bucket separately (olympiads never mislabelled «вне конкурса»), keeps arithmetic auditable against `formk1`, ends on the same number as «мест» above.

**V2 — compact.** Drops zero buckets, fits narrow phones:
> «8 мест уже заняты по БВИ — в общем конкурсе 24 из 32.»

**V3 — fallback** for groupless layouts (form 2/29):
> «Часть мест уже занята льготниками (БВИ, целевые, вне конкурса) — в общем конкурсе 24 места из 32.»

Only when the parser cannot label buckets. Discipline: never «олимпиадники = вне конкурса», never «проходной», never «шанс».

## 3. «Мест» on the chance-track label

**«Мест» = `openPlan`**, everywhere — chance track, «Над тобой / мест», `estimatedPassing`, histogram cut. One seat number in the UI, and it is the one the applicant actually competes for. Official `plan` appears only inside the quota sentence as the numerator being decomposed («Из плана 32…»). The pin never lands against 32 while the sentence says 24 — that would reintroduce the dual-signal contradiction R1 told us not to relitigate. Optional caption: «Дорожка конкурса · мест = план − квоты».

## 4. When to show vs hide the line

- **Show** when `taken > 0` (`enrolledTargeted + withoutExams + outOfCompetition`).
- **Hide** when `taken === 0` — «24 из 24» is noise and trains the eye to skip the sentence when it matters.
- **Softened** when the row is retained from a prior snapshot — same sentence, scoped retention hint prefixed, no new banner.
- **Never** hide behind `<details>`. Methodology hides; primary honesty does not. `<details>` expands definitions only (БВИ / целевые / вне конкурса, seat order п. 23 → п. 24 → п. 29 → п. 26 → п. 27).

## 5. Why O4 / O5 / O6 fail the brand and stress goal

**O4 (stacked reserved block on the chance track).** Two segments on one axis invite the misread we cannot afford — «the people to the left are olympians ahead of me». They are not: БВИ / целевые / вне конкурса are not in the histogram at all. Fusing disjoint populations into one visual is the dual-axis anti-pattern, carrying meaning only in colour or hatch — Principle 5 violation.

**O5 (column parity / second table).** Violates Principles 6, 8, 10 and «AdminLTE chrome»; duplicates the source; mobile death on 10–17-row faculties. Full table lives behind «Открыть источник →».

**O6 (overview chips).** «БВИ 8» scans as status without explaining itself — stressed readers see either a threat or false relief. Overview grammar is `mark · name · ratio · delta`; Principle 6 protects the ratio as the winner. A fifth column of chrome on a minority of rows breaks scan and demands a legend the hero cannot afford.

## 6. Risks and mitigations

- **Wrap on ≤360px.** Auto-fallback V1 → V2 when any bucket is zero.
- **Label conflation (БВИ vs вне конкурса).** Parser keys on exact `formk1` headers; `<details>` defines each with п.-number citation; UI never invents synonyms.
- **Campaign-phase drift on целевые.** Product picks one rule (`max(enrolledTargeted, planTargeted)` is the safer floor) and documents it in `<details>`.
- **`taken = 0` looks like a bug.** Methodology `<details>` stays visible always — applicant can confirm we know about БВИ and simply have nothing to subtract.
- **`plan=32` in `formk1`, we say 24.** V1 begins «Из плана 32:…»; both numbers coexist. Trust is preserved by showing our work, not by matching the official denominator.

## 7. Concessions to the Glanceable Composition camp

- Pure O1 (silent math) is worse than shipping nothing — numbers changing without a witness fracture trust. The quiet sentence is mandatory; conceded.
- One caption-level affordance near the track is acceptable: «Дорожка конкурса · мест = план − занятые квоты». Naming, not geometry.
- «Расчётный» can harden to «Расчётный балл · оценка по таблице», aligning with the note.
- When every row has non-trivial `taken`, sentence fatigue is real; future compression (V2 default, V1 only on the selected row) is defensible after user testing.
- Not conceded: overview chips, stacked track segments, second tables, admission-%. Those cross non-negotiables 1–4.

## Opening claim (opponent must answer)

The tracker's job is to tell a stressed 17-year-old how many seats they are actually competing for and how many people sit above them — nothing more, nothing prettier. Bioengineering proves the current UI is not merely incomplete but *wrong*: it prints «underfilled» when the contest is real. Any proposal that answers this by adding a second visual layer — stacked track segment, overview chip, parity table — buys glanceability with the exact chrome R2 rejected as SaaS grammar and admissions research warned would be read as «people above me». Correct `openPlan` plus one always-visible Russian sentence naming БВИ, целевые and вне конкурса separately, backed by a methodology `<details>`, is the only proposal that satisfies non-negotiables 1–4, Principles 2/6/11/12, and the paper-daylight brand at once. Opponent: name one decision the applicant makes better with a stacked track or a chip that V1's sentence does not answer more calmly — and explain how your proposal survives Principle 12 without smuggling primary honesty into progressive disclosure.
