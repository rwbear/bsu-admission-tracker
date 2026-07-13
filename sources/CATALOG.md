# External monitoring catalog

Discovered from [kudapostupat.by/index/monitor](https://kudapostupat.by/index/monitor).
Use this list to grow `sources/universities.json`. Prefer official tables with score-bucket columns.

## Wired (scrapers exist)

| Uni | Hub / pattern | Adapter |
|-----|---------------|---------|
| БГУ | `https://abit.bsu.by/formk1?id={N}` | formk1 |
| БГПУ | `https://abiturient.bspu.by/formk1?id={N}` | formk1 |
| БГУИР | `https://abitur.bsuir.by/statistics/2026/group/*.html` | bsuir |
| БНТУ | `http://stat.priem.bntu.by/view_.php?...` | bntu |
| БГТУ | `https://lk.belstu.by/formk1?id={N}` | formk1 |
| ГрГУ | `https://abit.grsu.by/university.php?v={DF\|DP\|…}` | grsu |

## Next candidates (need adapter or discovery)

| Uni | Monitoring entry |
|-----|------------------|
| БГЭУ | https://bseu.by/abiturient/ |
| БГМУ | https://www.bsmu.by/pk/ |
| БрГУ | https://www.brsu.by/abi/monitoring-podachi-dokumentov |
| ПолесГУ | https://abit.polessu.by/monit/ |
| ВГУ | https://monitoring.vsu.by |
| ПГУ | https://abiturient.psu.by/monitorings |
| БелГУТ | http://www.bsut.by/APPLICANTS/ADMISSION/ADMISSION-INFO |
| ГГТУ | https://abiturient.gstu.by/course-of-documents-acceptance |
| МИТСО | https://apps.mitso.by/frontend/web/monitoring/info-full?city=Minsk |
| БарГУ | https://abit.barsu.by/…monitoring… |
| БГАА | https://abiturient.bgaa.by/monitoring |

Many entries are hubs (links/PDFs), not `formk1` tables. Add an adapter only when the page exposes parseable score ranges.
