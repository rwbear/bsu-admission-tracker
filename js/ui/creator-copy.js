/**
 * Copy for the creator / contacts sheet (brand badge).
 * Keep strings frozen so the sheet and tests stay in lockstep.
 */

export const CREATOR_TITLE = 'О создателе';

export const CREATOR_GREETING = 'Поздравляю!';

export const CREATOR_LEDE =
  'Вы наткнулись на уголок сайта с информацией о создателе ;)';

/** @type {readonly string[]} */
export const CREATOR_PARAGRAPHS = Object.freeze([
  'Меня зовут Миша и создал я этот сайт по своей доброте душевной для всех тех ребят, для кого стресс на сдаче экзаменов не закончился.',
  'Всё же, удобнее смотреть за своим поступлением по красивым табличкам и графикам, а когда данные ещё и обновляются каждые 10 минут.. — сказка.',
  'Очень надеюсь, вам — пользователям, будет полезно заглядывать сюда и поменьше волноваться.',
  'А для предложений по улучшению работы или добавлению новых функций ниже моя контактная информация.',
]);

/**
 * @typedef {{
 *   term: string,
 *   href: string,
 *   label: string,
 *   external?: boolean,
 * }} CreatorContact
 */

/** @type {readonly CreatorContact[]} */
export const CREATOR_CONTACTS = Object.freeze([
  Object.freeze({
    term: 'Почта',
    href: 'mailto:r.w.bear.production@gmail.com',
    label: 'r.w.bear.production@gmail.com',
  }),
  Object.freeze({
    term: 'Телефон',
    href: 'tel:+375445760495',
    label: '+375 44 576-04-95',
  }),
  Object.freeze({
    term: 'Telegram',
    href: 'https://t.me/RW_Bear',
    label: '@RW_Bear',
    external: true,
  }),
]);

export const CREATOR_ARIA_LABEL =
  'О создателе — контакты r.w.b. | production';
