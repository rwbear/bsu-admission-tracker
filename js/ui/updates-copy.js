/**
 * Copy for «Как обновляются данные».
 * Shared so the sheet and any future surface stay in lockstep.
 */

export const UPDATES_TITLE = 'Как обновляются данные';

export const UPDATES_LEDE =
  'Этот сервис не подключен к БГУ напрямую: страница на GitHub не может читать таблицы БГУ из браузера, а сервера GitHub сами до abit.bsu.by не достучатся. Автоматизированный бот заходит на abit.bsu.by каждые 4–5 минут через стабильный прокси-канал, снимает данные таблицы и сохраняет новый файл в репозиторий. Страница читает этот файл и показывает его на сайте.';

/** @type {readonly { term: string, def: string }[]} */
export const UPDATES_FACTS = Object.freeze([
  Object.freeze({
    term: 'Данные HH:MM',
    def: 'Время последнего успешного снимка от бота — то, что видно на странице сейчас.',
  }),
  Object.freeze({
    term: 'След HH:MM',
    def: 'Время следующего автоматического обновления: страница сама пойдёт проверять, не появился ли новый снимок. Обычный интервал — 3 минуты.',
  }),
  Object.freeze({
    term: 'Точка слева',
    def: 'Серая — ждём следующий опрос. Тёмная пульсирует — идёт проверка. Янтарная — снимок старше обычного окна (~12 минут), опрашиваем чаще.',
  }),
]);

export const UPDATES_FOOT =
  'Сайт всегда старается показать самый актуальный снимок: сначала по прямой ссылке на коммит, потом через GitHub Pages, потом с ветки. Если один канал отстал — сайт использует другой. Если таблица на БГУ временно не отвечает или прокси-канал не сработал — сайт отображает прошлые строки и помечает это в баннере.';

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
