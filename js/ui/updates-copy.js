/**
 * Copy for «Схема обновления данных».
 * Shared so the sheet and any future surface stay in lockstep.
 *
 * Numbers (keep in sync with code):
 * - Bot tip cadence ≈ arm sleep 180s + scrape (~2–5 min) → ~5–7 min
 * - Client poll: CONFIG.pollMs = 3 min; chase STALE_POLL_MS = 30s
 * - Stale window: STALE_AFTER_MS = 12 min
 */

export const UPDATES_TITLE = 'Схема обновления данных';

export const UPDATES_LEDE =
  'Этот сервис не подключен к БГУ напрямую. Автоматизированный бот сканирует abit.bsu.by примерно каждые 5–7 минут, снимает данные таблицы и сохраняет новый файл в репозиторий. Страница читает этот файл и показывает его на сайте.';

/** @type {readonly { term: string, def: string }[]} */
export const UPDATES_FACTS = Object.freeze([
  Object.freeze({
    term: 'Данные HH:MM',
    def: 'Время последнего успешного скана от бота — то, что видно на странице сейчас.',
  }),
  Object.freeze({
    term: 'След HH:MM',
    def: 'Время следующего автоматического обновления: страница проверяет, не появился ли новый снимок. Обычный интервал — 3 минуты.',
  }),
  Object.freeze({
    term: 'Точка слева',
    def: 'Серая — ожидание следующего опроса. Тёмная пульсирует — проверка данных. Янтарная — снимок старше обычного окна (~12 минут), опрашиваем чаще.',
  }),
]);

export const UPDATES_FOOT =
  'Сайт всегда старается показать самый актуальный снимок. Если один канал отстал — сайт использует другой. Если таблица на БГУ временно не отвечает или прокси-канал не сработал — сайт отображает прошлые строки и помечает это в баннере.';

export const UPDATES_ARIA_LABELS = Object.freeze({
  /**
   * @param {string} dataClock
   * @param {string} nextClock
   */
  idle: (dataClock, nextClock) =>
    `Данные ${dataClock}. Следующая проверка ${nextClock}. Открыть, как это работает.`,
  /**
   * @param {string} dataClock
   * @param {string} nextClock
   */
  fetching: (dataClock, nextClock) =>
    `Данные ${dataClock}. Идёт проверка, дальше ${nextClock}. Открыть, как это работает.`,
  /**
   * @param {string} dataClock
   * @param {string} nextClock
   */
  chase: (dataClock, nextClock) =>
    `Данные ${dataClock}. Ждём свежий сбор, следующая проверка ${nextClock}. Открыть, как это работает.`,
  loading: 'Загрузка данных. Открыть, как это работает.',
});
