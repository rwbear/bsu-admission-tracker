# Проход — БГУ

Радар конкурса для **БГУ**: выбираешь таблицу мониторинга и факультет, вводишь сумму баллов → видишь, сколько заявлений выше тебя относительно мест.

Живой сайт: https://rwbear.github.io/bsu-admission-tracker/

## Данные

Источник — официальный мониторинг БГУ (13 таблиц с хаба приёмной кампании), по умолчанию **3 сертификата · дневная платная** (`formk1?id=7`) и **Институт бизнеса БГУ**.

**Как обновляется:** GitHub Actions roughly каждые **5 минут** скрейпит таблицы через HTTP-прокси и коммитит `data/*.json` в ветку GitHub Pages. Сайт тянет самый новый снимок (сначала SHA-pinned raw) и чаще опрашивает, если снимок устарел. Браузер **не** ходит на `abit.bsu.by` напрямую.

Опционально: Settings → Secrets → `SCRAPE_PROXY` (`http://user:pass@host:port`).

## Локально

```bash
npm test
npm run fixtures   # демо-снимок, если БГУ недоступен
npm run scrape     # живой сбор
python3 -m http.server 8080
```

Открой `http://localhost:8080`. Для быстрой проверки таймера: `?pollMs=3000`.

## GitHub Pages

1. Settings → Pages → Deploy from a branch  
2. Branch: `cursor/admission-tracker-rebuild-be86` (актуальная Pages-ветка), folder `/ (root)`  
3. **Важно:** workflow `scrape.yml` должен быть на **default branch (`main`)**, иначе schedule не запустится. Actions → **Scrape admission tables** → Run workflow

Подробнее про каденс: `docs/scrape-cadence.md`.

## Стек

- Static HTML / CSS / ES modules
- Node scraper (`scripts/scrape`)
- Chance math in `js/compute.js`
