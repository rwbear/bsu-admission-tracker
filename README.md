# Проход — Институт бизнеса БГУ

Радар конкурса для **Института бизнеса БГУ**: вводишь сумму баллов → выбираешь дневную или заочную → видишь, сколько заявлений выше тебя относительно мест.

## Данные

Официальные таблицы мониторинга:

- Дневная: https://abit.bsu.by/formk1?id=7
- Заочная: https://abit.bsu.by/formk1?id=8

GitHub Actions скрейпит эти страницы в `data/sb-bsu.json`. Сайт на GitHub Pages читает только локальный JSON — без CORS-прокси.

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

**Portal CRT** — cream ink on charcoal, grain, hairline frames, mono metrics. Один институт, без мульти-вузового меню.

## Стек

- Static HTML / CSS / ES modules
- Node 20 scraper (`scripts/scrape`)
- Chance math in `js/compute.js`
