# Live-мониторинг — БГУ

**[rwbear.github.io/bsu-admission-tracker](https://rwbear.github.io/bsu-admission-tracker/)**

Введи балл и отследи своё место в Конкурсе БГУ по live-таблицам и графикам.

made by: **r.w.b. | production**

## Данные

Источник — официальный мониторинг БГУ (13 таблиц с хаба приёмной кампании), по умолчанию **3 сертификата · дневная платная** (`formk1?id=7`) и **Институт бизнеса БГУ**.

**Как обновляется:** GitHub Actions roughly каждые **5 минут** скрейпит таблицы через прокси и коммитит `data/*.json` в ветку GitHub Pages. Сайт тянет самый новый снимок (сначала SHA-pinned raw) и чаще опрашивает, если снимок устарел. Браузер **не** ходит на `abit.bsu.by` напрямую — облачные IP до БГУ TLS не проходят, а CORS не пускает `fetch` из SPA.

**Прокси:** лучше всего Settings → Secrets → Actions → `SCRAPE_PROXY` (`http://user:pass@host:port`) — тогда Actions сидят только на этом канале. Без секрета scrape всё равно идёт через публичный discovery с жёсткими проверками HTML (`formk1` / minBytes), чтобы пустые оболочки не затирали таблицы.

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
3. **Важно:** workflow `scrape.yml` и `scrape-watchdog.yml` должны быть на **default branch (`main`)**, иначе schedule не запустится. Actions → **Scrape admission tables** → Run workflow. Watchdog раз в ~15 минут будит scrape, если tip старше порога.

Подробнее про каденс: `docs/scrape-cadence.md`.

### Repo About (description + Website)

Cursor’s GitHub App token cannot edit Administration fields. From your own machine (logged in as repo owner):

```bash
./scripts/set-github-about.sh
```

Or paste manually in GitHub → Settings → General → **Description** / **Website**.

## Стек

- Static HTML / CSS / ES modules
- Node scraper (`scripts/scrape`)
- Chance math in `js/compute.js`
