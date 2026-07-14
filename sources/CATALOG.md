# BSU monitoring tables

Official hub:
https://abiturient.bsu.by/priemnaia-kampaniia/monitoring-podachi-zaiavlenii

Catalog file: `sources/bsu-tables.json` (mirrored in `js/tables.js`).

| Track | id | Label |
|-------|-----|--------|
| 3 сертификата | 32 | Дневная · бюджет |
| 3 сертификата | 29 | Военный · дневная · бюджет |
| 3 сертификата | 2 | Заочная · бюджет |
| 3 сертификата | **7** | **Дневная · платная (default)** |
| 3 сертификата | 8 | Заочная · платная |
| 2 сертификата | 34 | Дневная · бюджет |
| 2 сертификата | 21 | Дневная · бюджет · СКК |
| 2 сертификата | 22 | Дневная · платная · СКК |
| Без сертификатов | 5 | Дневная · бюджет |
| Без сертификатов | 6 | Заочная · бюджет |
| Без сертификатов | 16 | Дневная · платная |
| Без сертификатов | 17 | Заочная · платная |
| Без сертификатов | 13 | Заочная · платная · 2-е ВО |

Default product path remains **id=7** + Институт бизнеса БГУ.

Rollback before this expansion:
- branch `cursor/checkpoint-pre-hub-be86`
- tag `checkpoint/pre-hub-expansion-20260714`

See `docs/hub-expansion-plan.md`.
