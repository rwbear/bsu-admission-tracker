# Проход — радар конкурса

Живой трекер шансов поступления: вводишь балл → выбираешь вуз и факультет → видишь, сколько заявлений выше тебя относительно мест.

Сайт: GitHub Pages (static). Данные: JSON-снимки официальных таблиц мониторинга, которые обновляет GitHub Actions.

## Как пользоваться

1. Введи сумму баллов (ЦЭ/ЦТ + аттестат).
2. Выбери университет и факультет / форму.
3. Смотри **дорожку конкурса**, счётчик «над тобой / мест» и расчётный проходной.
4. Раскрой строку — полное распределение по интервалам.

Расчётный проходной — оценка по текущей таблице, не официальный приказ о зачислении.

## Стек

- Frontend: HTML / CSS / ES modules (без сборки)
- Данные: `data/*.json`
- Скрейпер: Node 20 (`scripts/scrape`)
- Автообновление: `.github/workflows/scrape.yml` (cron + manual)

## Локальный запуск

```bash
npm test
npm run fixtures   # демо-данные, если нужно
npm run scrape     # живой сбор (нужен доступ к сайтам вузов)
python3 -m http.server 8080
```

Открой `http://localhost:8080`.

## GitHub Pages

1. Settings → Pages → Source: **Deploy from a branch**
2. Branch: `main` / folder: `/ (root)`
3. Дождись Actions scrape или запусти workflow вручную

## Добавить вуз

1. Запись в [`sources/universities.json`](sources/universities.json)
2. Адаптер в `scripts/scrape/adapters/` (если формат HTML новый)
3. Зарегистрировать адаптер в `scripts/scrape/run.mjs`

Каталог ссылок мониторинга: [kudapostupat.by/index/monitor](https://kudapostupat.by/index/monitor)

### Адаптеры сейчас

| Адаптер | Вузы |
|--------|------|
| `formk1` | БГУ, БГПУ, БГТУ |
| `bsuir` | БГУИР |
| `bntu` | БНТУ |
| `grsu` | ГрГУ |

## Команды

```bash
npm test
npm run scrape
npm run scrape -- --only bsuir --limit 2
npm run fixtures
```
