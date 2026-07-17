# Optional ships judge — methodology wire + tip residuals

**Mode:** honest idle gate · harsh on scope creep  
**UTC:** ~2026-07-16T00:57Z  
**Tip under judgment:** `7e4d773` (Pages ancestry; cache `?v=20260715an`)  
**Inputs:** `design/methodology-details-ru.md` · `meta/MORNING_PACKET.md` · `reviews/03-meta-hour1.md` · bug hunts R3–R5 · `shipped/INDEX.md` · light code spot-check on tip

---

## Keep idle

**Yes. Default = idle.** Critical path is closed. Meta already forbids inventing a second act. Clock left is not a backlog quota.

### Methodology wire-up — leave for morning

| Signal | Read |
|--------|------|
| Draft itself | «Code: not wired in this round» · «Draft only. Implementation gated on morning question» |
| Morning packet | Decision **#2:** «Wire methodology `<details>`…?» — **your call**, not overnight’s |
| Errata §4 parked | «Methodology always-visible one-liner vs `<details>` only» — **product fork still open** |
| Meta hour1 | Explicit: do **not** wire unless Misha already said yes (they haven’t) |

Wiring now would:

1. **Answer a morning question in code** without the decider.  
2. Touch detail chrome after honesty/a11y stack already sealed — regression surface for zero urgency.  
3. Still leave variant A/B/C + hide-when-no-score policy unresolved → half-ship or scope creep into CSS/placement debates.  
4. Violate “refuse junk ships after critical path closed” (packet §What we refused).

Copy is paste-ready. That is the overnight deliverable. **Ship = morning after Q2.**

---

## Optional ship X

**None that clears the tiny-ship bar on tip `7e4d773`.**

### What tip already closed (do not re-open)

| Residual from hunts | Status on tip |
|---------------------|---------------|
| R4 B1 table-picker parity / z-index | Shipped (`a9a3df3`) |
| R4 B2 fail-path + schedule banner | Shipped (`a9a3df3` / `5b788ab`; `armNextRefresh` → `applyBanner`) |
| R4 B3 Tab trap | Shipped (`5b788ab`) |
| R4 B4 focus remount + aria place | Aria in `a9a3df3`; focus preserve in **`7e4d773`** |
| R4 B5 reduce-motion close/scroll | Shipped (`CLOSE_MS→0` under reduce; score-submit branches) |
| R5 B1 overview focus | Shipped (`7e4d773`) |
| R5 B4 cheap `snapshotChanged` | Shipped (`7e4d773` — sig, not dual stringify) |
| R5 S1 «← Обзор» | Shipped (`7e4d773`) |
| R3 parser / apps / dual-signal / blank status | Shipped earlier; tests **71/0** |

### Still “confirmed” on paper — not tiny overnight ships

| ID | Why it fails the tiny-ship gate |
|----|----------------------------------|
| **R5 B2** syncTable/faculty bypass + nested `setSelected` emit | Still true in code (`sync*` mutate state; no shared `applyFormId`). Fix is **orchestration contract refactor** — multi-path, easy double-paint regressions. Smell in PROGRESS ≠ idle ship. **Morning.** |
| **R5 B3** `refreshing` set inside chained `run`; `online` ignores due | Race still structurally present. Needs eager busy flag + `online` policy. Rare flaky-network edge, not a user-visible break tonight. **Not tiny; not worth waking the tip.** |
| **R4 B6** OG 1200×340 / brand-weak share | Confirmed. **Asset + product decision** (packet Q3). CSS/meta height LARPs without a real 1200×630 = junk. |
| **Methodology `<details>`** | See Keep idle — **gated**, not residual bug. |
| Hierarchy CSS / retention-scoped note / pure mobile stack B | Design residuals / morning questions. **Kill overnight.** |

Light bug-report pass found **no new CONFIRMED break** that is both (a) still open on tip and (b) a one-file / one-liner with clear repro and green-test confidence. Everything left is either **product choice**, **asset work**, or **refactor debt**.

---

## Verdict

| Question | Call |
|----------|------|
| Wire `methodology-details-ru.md` overnight? | **No.** Leave for morning after Misha Q2. |
| Tiny ship before idle on tip `7e4d773`? | **No.** Residual confirmed items are not tiny; tip already took the cheap wins. |
| Mode until wall / finalize? | **Keep idle** (+ packet/archive polish only if still yellow — no feature commits). |

**Bottom line:** Critical path closed · methodology is a **decision**, not a bug · inventing ships from R5 B2/B3 or OG to fill hours is scope creep. **Keep idle.**
