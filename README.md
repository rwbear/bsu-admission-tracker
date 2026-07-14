# Проход — Институт бизнеса БГУ

Радар конкурса для **Института бизнеса БГУ**: вводишь сумму баллов → выбираешь дневную или заочную → видишь, сколько заявлений выше тебя относительно мест.

## Данные

Официальная таблица мониторинга (дневная форма — единственная, где сейчас есть Институт бизнеса):

- https://abit.bsu.by/formk1?id=7

GitHub Actions скрейпит эти страницы в `data/sb-bsu.json` примерно каждые 5 минут днём по Минску (и реже ночью).  
На загрузке и по клику **LIVE** клиент тянет самый новый закоммиченный снимок (GitHub commits API + raw-by-SHA), а не только кэш Pages. LIVE дополнительно пробует прямую таблицу через CORS; если поднят `scripts/live-server.mjs`, задай `window.__PROHOD_LIVE_API__`.  
`abit.bsu.by` часто рвёт TLS с GitHub/US cloud — сборщик пробует прямое соединение, затем `SCRAPE_PROXY` / региональные HTTP-прокси.

Опционально: репозиторий → Settings → Secrets → `SCRAPE_PROXY` (`http://user:pass@host:port`) для стабильного выхода.

## Локально

```bash
npm test
npm run fixtures   # демо-снимок, если БГУ недоступен
npm run scrape     # живой сбор id=7 и id=8
python3 -m http.server 8080
```

Открой `http://localhost:8080`.

## GitHub Pages

1. Settings → Pages → Deploy from a branch
2. Branch: `main` или `cursor/admission-tracker-rebuild-be86`, folder `/ (root)`
3. Actions → **Scrape admission tables** → Run workflow

## Дизайн

Минимальный line UI: тонкие рамки, мягкие скругления, hairline-список, визуальные бары вместо ASCII.

## Стек

- Static HTML / CSS / ES modules
- Node 20 scraper (`scripts/scrape`)
- Chance math in `js/compute.js`
