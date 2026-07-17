# Debate B — Glanceable Composition

**Reviewer:** B · **Camp:** stronger visual composition over a text-only quota line.
**Stance:** refined O4 (safer visual) with the O3 sentence kept as its caption. Reject O5, O6, O2, and naive O4.
**Non-negotiables held:** correct `openPlan`; no invented %; no traffic light; source link and dual-signal note preserved.

## 1. Why text-only O3 under-delivers

The applicant refreshing at 01:40 in campaign week is not reading paragraphs. R2 Principle 6 fixes the detail scan path as metric grid → chance track → histogram → note; O3 places the honesty fix at the *end* of that path, where Principle 12 explicitly warns primary numbers must not hide.

The bioeng fixture makes it concrete: with naive `plan=32` the rail draws `chance-fill` to `мест 32` while the O3 line below reads «в общем конкурсе 24 мест». One screen, two seat counts, no bridge — a fresh contradiction the user arbitrates under stress. The lie is spatial: the rail *draws* seats we do not have. A sentence cannot hold a chart accountable; the fix must live where the misread lives.

## 2. Concrete visual — «Состав плана» microstrip

A single ~6px hairline strip **above** the existing `дорожка конкурса`, inside the same detail panel, never a card. No axis, no background, no shadow — ink on paper only. Segments proportional to plan in order БВИ · целевые · вне конкурса · общий конкурс: reserved segments use fine ink hatch/dot at `ink-dim`, «общий конкурс» a quiet solid. Textures — never new colors — carry the “not applicants” meaning. Inline labels («БВИ 8», «целевые 2», «общий 24») render on segments ≥28px; narrower ones fold into the caption. A 1px ink-dim bridge tick connects the right edge of «общий конкурс» to the seat cut on the rail — the only visual bond. The rail label changes from `мест 32` to `мест 24`; total plan (32) appears only in the strip title «Состав плана · 32». Under the strip, the O3 sentence stays verbatim as caption: «Из плана 32: БВИ 8 · целевые 2 · вне 0 → в общем конкурсе 24 мест.» Strip and sentence are one unit. Strip renders **only when `taken > 0`** — zero-reserved specialties keep today’s composition exactly. Must **not** be implied: no admission %, no projection of who wins seats, no merging of БВИ and «вне конкурса», no live/polling motion, no card chrome.

## 3. How this avoids “olympians are people above me”

Two axes, two units, two captions, deliberately separated. «Состав плана» — unit **seat**. «Дорожка конкурса» — unit **applicant** from the histogram cohort only. Reserved segments live *only* on the plan strip; nothing to the left of the rail’s `chance-fill` ever names a person, and the «N выше тебя» statistic continues to count only histogram applicants. Hatch/dot vs. solid ink are visually incompatible — the eye does not merge them into one row. Vertical gap ≥12px; the ink-dim bridge tick reads as “these lengths agree,” not “these are the same row.” Principle 2 is honored: the strip is a third lens (plan composition) beside the place and score lenses, not blended with either.

## 4. Mobile

Strip stays one hairline. Inline segment labels drop into the wrapping caption line under 420px. Cost when `taken > 0`: ~20px inline / ~40px wrapped; zero otherwise. Stack order unchanged: title → status → metric grid → **strip** → rail → histogram → note → source. Sticky «← Обзор» bar (R2 P1#8A) unaffected. No motion on the strip — instantaneous render on selection.

## 5. Why O6 chips are rejected

Chips on overview rows violate Principle 8 by adding a fifth column whose meaning varies row-by-row (0 vs 17); chips without context frighten. If cross-specialty reserve scanning is genuinely wanted, the O3 math change already delivers it typographically: when `taken > 0`, the row ratio prints `3/24` instead of `3/32` — same shape, honest math, no chip. Ship the strip in detail; ship the openPlan denominator in overview; skip chips.

## 6. Risks and mitigations

Second-chart competition — 6px hairline, no axis, textures not weight. Textures reading as warning — ink-dim, generous hatch, no chroma, no icons. Crowded labels — inline only ≥28px, otherwise caption; zero-width segments not drawn. БВИ / вне конкурса confusion — segments and copy stay separate; methodology `<details>` links п. 23 vs п. 26. Partial parser data or forms 2 / 29 without «по конкурсу» — fall back to the O3 caption line only. Total-plan invariant confusion (32 vs 24) — strip title states total; caption spells the arithmetic. Dual-scaled-axis misread — the two strips share no numeric axis, only the bridge tick. Anti-card drift in prototype — if the strip acquires a border-box, background, or shadow, prune to O3. Campaign-time target ambiguity — adopt the briefing rule `taken = max(enrolledTargeted, planTargeted) + БВИ + вне` and let the caption reflect it verbatim.

## 7. Concessions to Quiet Honesty

Correct `openPlan` math is the primary win; if implementation cost forces a split, ship O3 first and the strip second — the proposal is additive. Silence when `taken === 0` is correct. The O3 sentence is preserved verbatim — I caption a picture with it, not replace it. Methodology stays in `<details>`; the strip labels, it does not explain. O6 chips are separately rejected. No new color, no new motion, no new card enclosure. `peopleAbove` and the dual-signal contradiction sentence stay untouched. If user testing shows the strip fails the false-reading test, ship O3 — math outranks visual.

## Opening claim

When we tell a stressed applicant the seat number is 24 while the rail still draws to 32, we have not fixed the lie — we have moved it from the math into the composition, which is the layer they scanned first. A hairline «Состав плана» strip above the existing дорожка is the smallest honest visual that closes the gap: only ink on paper, no card, no color, no invented percentage; it names seats where seats belong and leaves people where people belong; and it does what a paragraph beside «Обновлено …» structurally cannot — it makes the plan we draw equal the plan we describe. Show me a caption that can hold a chart accountable, or concede composition needs a visual answer.
