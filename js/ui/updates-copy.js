/**
 * Copy for «Как обновляются данные».
 * Shared so the sheet and any future surface stay in lockstep.
 */

export const UPDATES_TITLE = 'Как обновляются данные';

export const UPDATES_LEDE =
  'Мы не подключены к БГУ напрямую. Робот заходит на abit.bsu.by примерно раз в 4–5 минут, снимает таблицы и кладёт свежий JSON в репозиторий. Страница читает этот JSON и показывает его тебе.';

/** @type {readonly { term: string, def: string }[]} */
export const UPDATES_FACTS = Object.freeze([
  Object.freeze({
    term: 'данные HH:MM',
    def: 'Время последнего успешного снимка от робота — то, что ты видишь на странице сейчас.',
  }),
  Object.freeze({
    term: 'след HH:MM',
    def: 'Когда страница сама пойдёт проверять, не появился ли новый снимок. Обычный интервал — 3 минуты.',
  }),
  Object.freeze({
    term: 'Точка слева',
    def: 'Серая — ждём следующий опрос. Тёмная пульсирует — идёт проверка. Янтарная — снимок старше обычного окна (~12 минут), опрашиваем чаще.',
  }),
]);

export const UPDATES_FOOT =
  'Мы всегда стараемся показать самый свежий снимок: сначала по прямой ссылке на коммит, потом через GitHub Pages, потом с ветки. Если один канал отстал — берём с другого. Если таблица на БГУ временно не отдалась — держим прошлые строки и помечаем это в баннере.';

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
