# Density A — lean: bury the receipts, not the reveal

Reviewer A. Question: what is the leanest always-visible detail panel that still makes the конфликтология silence structurally impossible?

The panic case is not «user did not scroll to the 9-cell strip». It is «БВИ 8 was drawn *nowhere* the eye landed». The plan slab draws that eight as hatched ink the moment `taken > 0`; `.detail-note` names it in prose on the same trigger. Everything else in today’s panel — the 9-cell «Как в таблице БГУ» grid, four of the six metrics, the histogram — restates what the slab and the sentence have already said. That is the density Misha calls overwhelming, and it is safe to fold: R2 P12 forbids hiding *primary honesty numbers*, not their photocopies. The slab and the sentence are the primary; everything below them is auditability.

## 1. What must stay visible without a click

- Spec title + `.detail-status` (status · faculty).
- Two primary metric cells only: «Над тобой / мест конкурса» and «Расчётный балл» — personal position and passing score. Load-bearing per JUDGE §5.
- «Плита плана» (`planBlock`) whenever `row.showQuota` — the hatched slab + E-grammar caption. VISUAL-VERDICT §1 shipped this specifically to kill the конфликтология-class silence; folding it defeats the round.
- «Дорожка конкурса» (chance track) — pin, «ты», «выше тебя», seat cut at `openPlan`. R2 P6 scan-path anchor.
- `.detail-note` — `Обновлено … · <quota clause>`. The V1 sentence names БВИ/целевые/вне in prose whenever `taken > 0`; one line of Outfit for full auditability.
- Source link.

Nothing else at rest.

## 2. What goes behind «подробные данные»

- The full 9-cell «Как в таблице БГУ» strip (`factsBlock` + `renderTableFacts`) — this is the «full BSU left-column dump» JUDGE §4 refused as primary surface.
- The four secondary metric cells: «План → общий», «По конкурсу», «Дельта», «Конкурс» (pressure). Each is derivable from slab or sentence.
- «Интервалы баллов» (histogram) — lens on distribution, not the answer to «сколько мест, сколько выше меня».
- «Как считается место» methodology `<details>` stays as-is (see §5).

## 3. RU summary label — three options ranked

1. **«Подробные данные»** — user’s own phrase; parses instantly; no CTA tone; matches «no cards clutter» brand.
2. **«Как в таблице БГУ»** — reuses the caption in the codebase; tells the reader exactly what is inside; slight cost: duplicates a former section header.
3. **«Числа таблицы и разбивка»** — most descriptive, worst rhythm; fallback if usability testing shows «подробные» reads as CTA.

Reject «Показать больше», «Развернуть», «Детали» — SaaS grammar.

## 4. Open/closed default + auto-open

Default **closed** on every render. Silence is the point: if slab + sentence + track + two metrics have not decided the applicant, one click opens the audit. Auto-open only on structural anomalies the slab cannot draw:

- `quotaParseOk === false` **and** `showQuota === false` — parser failed; audit is the only surface left.
- `taken > plan` clamp (VISUAL-VERDICT §4h) — slab renders `в общем 0`; audit must be visible to explain why.
- Retained snapshot — the applicant needs the raw counts alongside the retention voice.

Never auto-open on «taken > 0», high pressure, or «В зоне». Those are *normal*; opening on normal defeats the fold.

## 5. Relationship to «Как считается место»

Two disclosures, both closed, stacked under the sentence in order: **«Подробные данные»** (parser dump — numbers as read) then **«Как считается место»** (methodology — how we count). Different affordances: the first answers «what did you see?», the second answers «what did you do with it?». Merging them re-creates the overwhelm we are removing. Both stay P12-compliant because neither carries primary numbers — those still live in the slab, the two metrics, and the sentence, all above the fold.

## 6. Opening claim for opponent

The конфликтология silence is solved the instant `taken > 0` fires the plan slab and the quota clause on the sentence — the 9-cell strip, the extra metrics, and the histogram add nothing to that fix. Any proposal that keeps them in the always-visible layer pays the overwhelm tax twice to prevent a silence we already prevent by construction. Opponent: name one decision a stressed 17-year-old makes better *at rest* with the strip than with slab-plus-sentence — and show how keeping it above the fold survives R2 P12 when P12 protects primary numbers, not photocopies of them.
