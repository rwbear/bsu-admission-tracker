# Meta overview — pace check (post R6 heal + R4 a11y)

**UTC:** ~2026-07-16T00:08Z · After R6 revise→healed · R4 hunt+tranches · tip `5b788ab`

## 1. Elapsed / remaining
- **Elapsed:** ~0h30m–0h40m (start 2026-07-15T23:40:43Z)
- **Hard stop:** 8h00m–9h00m → ~2026-07-16T07:40–08:40Z
- **Budget left:** ~7h20m–8h30m (≈7.5h usable before preferred wall)
- **Pacing read:** Critical overnight truth work landed in the first half-hour. That is **good pace, bad temptation**. Remaining hours are **not** a quota to fill. Prefer early idle with a sealed packet over inventing ships.

## 2. Critical path?
**Partially — merge + seal, not invent.**

Already on the critical path and largely **done**:
- Parser + goldens + healed snapshot + invariants + dual-signal UI → Pages (`958301f` / `aab079e`, PR #20)
- R4 high-leverage UX: table-picker parity, stale banner (fail + schedule), Tab trap, reduce-motion CLOSE_MS/scroll, caret drop, sticky detail, aria copy (`a9a3df3` → `5b788ab`)
- Tests **71 / 0**

**Still critical before calling night closed:**
1. **Land `a9a3df3` + `5b788ab` onto Pages** (`cursor/admission-tracker-rebuild-be86` tip + publish tip sha). Working branch is ahead of Pages; morning must not open on overnight-only tip.
2. **One residual honesty/a11y slice max** (see §4) — then stop stacking polish.
3. **Morning packet finalize** (shipped shas, refused list, open questions) before wall.

Not critical path: more research rounds, OG hero redesign LARPing, mobile sticky «← Обзор» unless explicitly chosen as the *one* residual, playbook essay writing beyond what’s already in `PLAYBOOKS.md`.

## 3. Quality risks right now
- **Junk padding.** ~7.5h left with the hard problems closed → high risk of decorative CSS, second mobile scroll, brand re-litigation, or “another hunt” with thin severity.
- **Celebrating R4 closed while Pages tip is still `aab079e`.** Overnight UX is real; production Pages hasn’t absorbed it yet.
- **Treating R4 judge “Fix before morning” as a full night backlog.** Judge scored tranche-1 on `a9a3df3`; `5b788ab` already closed trap / schedule banner / CLOSE_MS / score-scroll / caret. Remaining real gaps are **narrow**: overview remount focus (B4 rest), OG 1200×340 (B6), unused `id-2`/`id-29` fixtures.
- **Overview still `innerHTML = ''` every render** — keyboard focus loss survives despite aria copy fix. Do not claim “a11y tranche finished” in the packet without naming this residual (or fixing it once).
- Stale meta board (`SESSION`/`PROGRESS` round table) lagging reality — archive debt, not product debt, but morning confusion if ignored.
- Soft ships without judge + `npm test` written: with quiet hours, corners get cut for vibe polish.

## 4. Recommended next 60–90 min
**Primary: Pages land of R4 tip + one optional residual — then harden archive, don’t expand scope.**

1. Merge/push overnight tip → Pages base; bump tip sha; confirm cache-bust `am` live on Pages.
2. **Pick at most one residual ship** (not both unless trivial):
   - **Preferred:** B4 rest — overview incremental `aria-selected` / focus restore when id set unchanged (real keyboard debt already judged).
   - **Else:** wire or delete unused `id-2.html` / `id-29.html` + one form32 `ic≠bsum` assert (R6 rigor leftover — cheap, morning-proof).
   - **Defer OG (B6)** unless residual #1 is already green and there’s appetite for an **asset** task with a real 1200×630 — not CSS tweaks pretending to be share cards.
3. Update `PROGRESS.md` / `TIMELOG.md` / draft morning packet with exact shas (`d8f7103`→`1f4bb5a`→Pages; `a9a3df3`/`5b788ab` + land sha).
4. After that window: **idle or light smoke** (score → select → picker open/Tab → stale path). Do not open Round “design polish.”

## 5. Stop doing
- Opening new audit/design rounds to “use” remaining hours.
- Shipping P1 sticky mobile back bar, methodology `<details>`, or hierarchy CSS (R2 P0#5–#6) as overnight must-haves — packet questions, not filler.
- A second mobile `scrollIntoView` (R4 FP — stay dead).
- Re-opening pin / peopleAbove / parser label-map theater while heuristics + goldens + healed snapshot hold.
- Redesigning OG copy/geometry as multi-hour brand project; either one committed asset later or leave as open for Misha.
- Inflating soft Tab wrap into a full focus-management rewrite (`inert` optional later).
- Padding playbooks into novels — `PLAYBOOKS.md` is enough skeleton.

## 6. Morning packet readiness
**Yellow → almost green on substance; red on completeness until R4 lands on Pages + packet lists `5b788ab`.**

Draft exists with honesty + dual-signal + early UX notes, but it still cites cache-bust `al` and understates the R4 follow-up tip. Green when:
- Pages tip includes R4 tranche commits (or explicit “Pages pending: `5b788ab`” if land slips)
- Packet has refused list + open questions for Misha + test count 71/0
- Residuals named honestly (overview remount / OG / unused fixtures) — not disappeared

---

**Hard call on the remaining ~7.5h:**  
The night’s product bet already paid off early. Spend ≤2h on **Pages land + ≤1 residual + packet/archive**. Leave the rest as **controlled idle / smoke**, not invention. Shipping three more “polish” commits to burn time is failure mode, not diligence.
