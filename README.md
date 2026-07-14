# Проход — Институт бизнеса БГУ

Радар конкурса для **Института бизнеса БГУ**: вводишь сумму баллов → видишь, сколько заявлений выше тебя относительно мест.

## Данные

Официальная таблица мониторинга (дневная форма — единственная, где сейчас есть Институт бизнеса):

- https://abit.bsu.by/formk1?id=7

**Как обновляется:** GitHub Actions раз в **10 минут** скрейпит таблицу через региональные HTTP-прокси и коммитит `data/sb-bsu.json` в ветку GitHub Pages.  
Сайт на загрузке и каждые 10 минут тянет самый новый закоммиченный снимок (Pages + raw + commit SHA) и показывает обратный отсчёт до следующего обновления.

Браузер **не** ходит на `abit.bsu.by` напрямую — оттуда TLS/CORS ломают любой клиентский «live»-парс.

Опционально: репозиторий → Settings → Secrets → `SCRAPE_PROXY` (`http://user:pass@host:port`) для стабильного выхода сборщика.

## Локально

```bash
npm test
npm run fixtures   # демо-снимок, если БГУ недоступен
npm run scrape     # живой сбор id=7
python3 -m http.server 8080
```

Открой `http://localhost:8080`. Для быстрой проверки таймера: `?pollMs=3000`.

## GitHub Pages

1. Settings → Pages → Deploy from a branch  
2. Branch: `cursor/admission-tracker-rebuild-be86` (или актуальная Pages-ветка), folder `/ (root)`  
3. **Важно:** workflow `scrape.yml` должен быть на **default branch (`main`)**, иначе schedule не запустится. Actions → **Scrape admission tables** → Run workflow

## Дизайн

Минимальный line UI: тонкие рамки, мягкие скругления, hairline-список, визуальные бары.

## Стек

- Static HTML / CSS / ES modules
- Node 20 scraper (`scripts/scrape`)
- Chance math in `js/compute.js`
