# Methodology disclosure — RU copy draft

**For:** detail panel, after the honesty note · GOV.UK-style `<details>` (one secondary chunk)  
**Not for:** hero, overview rows, summary strip, banners  
**Voice:** same as the site — calm, short, no lecture, no fake precision  
**Depends on:** R2 principles 2–4 / 12 · errata §3 (`Расчётный балл` sealed)  
**Code:** not wired in this round — paste-ready for implementers  

---

## Placement

```
[ metric grid ]
[ chance track ]
[ histogram ]
[ detail-note ]          ← primary honesty; always visible
<details class="method-details"> … </details>   ← optional deepen
[ source link ]
```

Never hide «Над тобой / мест», status, scrape warnings, or the contradiction sentence behind the expander.

---

## Recommended UI copy

### Summary (always visible on the control)

```
Как считается место
```

Short. Matches chart captions («Дорожка конкурса», «Интервалы баллов»). No «методология», no «FAQ».

### Body (inside `<details>`)

Plain text, three beats — seats, within-band estimate, two lenses:

```
Места идут сверху: сначала более высокие баллы, пока не закроется план.

«Над тобой» внутри твоего интервала — оценка: баллы в полосе считаем равномерно. Это не очередь приёмной.

Статус («В зоне / На грани / Ниже») смотрит на расчётный балл. Место смотрит на людей выше тебя. Иногда они расходятся — это нормально; оба сигнала остаются оценкой по таблице БГУ, не приказом.
```

---

## HTML sketch (implementer paste)

Use site tokens / classes when wiring; markup is illustrative.

```html
<details class="method-details">
  <summary>Как считается место</summary>
  <div class="method-details-body">
    <p>Места идут сверху: сначала более высокие баллы, пока не закроется план.</p>
    <p>
      «Над тобой» внутри твоего интервала — оценка: баллы в полосе считаем
      равномерно. Это не очередь приёмной.
    </p>
    <p>
      Статус («В зоне / На грани / Ниже») смотрит на расчётный балл. Место
      смотрит на людей выше тебя. Иногда они расходятся — это нормально; оба
      сигнала остаются оценкой по таблице БГУ, не приказом.
    </p>
  </div>
</details>
```

### One-block alternative (if three `<p>` feels long)

```text
Места — с высоких баллов вниз до плана. В своём интервале «над тобой» —
равномерная оценка, не живая очередь. Статус — по расчётному баллу; место —
по людям выше. Могут не совпасть: оба — оценка по таблице, не приказ.
```

Prefer the three-sentence version for scan; keep the one-block as mobile fallback if vertical budget is tight.

---

## Why these three sentences (product map)

| Sentence | Lens / fact | What it prevents |
|----------|-------------|------------------|
| Места сверху до плана | Official seat cut from high scores | Reading the track as a mood meter |
| Равномерно в интервале | Within-band uniform estimate (`peopleAbove`) | Treating the pin as an official queue position |
| Статус vs место | Delta-to-passing vs people/plan | Blending into one fake “% поступления” |

Aligned with compute honesty: higher bands count in full; own closed band spreads uniformly over integer scores; open «N и более» does not invent within-band rank.

---

## Tone checklist

- **Do:** table, оценка, расчётный балл, интервал, план, места.  
- **Don’t:** вероятность, шанс %, доверительный интервал, «точный рейтинг», traffic-light words.  
- **Don’t** name the brand as «Проход»; product chrome stays **r.w.b.**  
- Keep body at detail-note weight (`ink-dim` / `text-sm`) — honesty depth, not faint caption chrome.  
- No modal, no accordion cluster, no second disclosure for the same math.

---

## Optional micro-variants (morning may pick one)

| Variant | Summary | Use when |
|---------|---------|----------|
| A (default) | `Как считается место` | General |
| B | `О месте и статусе` | If contradiction notes are frequent and users ask “why two numbers?” |
| C | `Как считают «над тобой»` | If the pin/ratio is the only confusion hotspot |

Body stays the same across A–C; only the summary changes.

---

## When *not* to show the disclosure

- Empty detail («Выбери специальность…»)  
- No score entered (ratios are «—») — optional: still fine to show; prefer hide until score exists so the panel stays quiet  
- Fixture / error board — banners already carry the message  

---

## Wire-up notes (later round)

1. Insert after `.detail-note`, before source link.  
2. One `<details>` only — Principle 12.  
3. Open state: default **closed**. Do not `open` on contradiction; the note sentence remains the majority channel.  
4. CSS: hairline / no card shell; inherit panel paper; summary uses existing quiet caption rhythm.  
5. `prefers-reduced-motion`: native details — no custom expand animation required.

---

*Draft only. Implementation gated on morning question (methodology as details vs always-visible one-liner).*
