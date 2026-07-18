import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  UPDATES_SHEET,
  openUpdatesSheet,
  closeUpdatesSheet,
  isUpdatesSheetOpen,
  armUpdatesSheetChrome,
} from '../js/ui/updates-sheet.js';
import {
  UPDATES_TITLE,
  UPDATES_LEDE,
  UPDATES_FOOT,
  UPDATES_FACTS,
  UPDATES_ARIA_LABELS,
} from '../js/ui/updates-copy.js';

describe('updates sheet', () => {
  it('keeps stable ids and shared leave budget', () => {
    assert.ok(UPDATES_SHEET.closeMs >= 240, 'fallback must outlast backdrop opacity');
    assert.equal(UPDATES_SHEET.closeMs, 280);
    assert.equal(UPDATES_SHEET.overlayId, 'updates-overlay');
    assert.equal(UPDATES_SHEET.rootId, 'updates-overlay-root');
    assert.equal(UPDATES_SHEET.triggerId, 'update-status');
  });

  it('exports open/close/arm helpers', () => {
    assert.equal(typeof openUpdatesSheet, 'function');
    assert.equal(typeof closeUpdatesSheet, 'function');
    assert.equal(typeof isUpdatesSheetOpen, 'function');
    assert.equal(typeof armUpdatesSheetChrome, 'function');
    assert.equal(isUpdatesSheetOpen(), false);
  });

  it('keeps Russian copy locked and frozen', () => {
    assert.match(UPDATES_TITLE, /Схема обновления данных/);
    assert.match(UPDATES_LEDE, /Этот сервис не подключен к БГУ напрямую/);
    assert.match(UPDATES_LEDE, /abit\.bsu\.by/);
    // Bot: arm 3 min + scrape ≈ tip every ~5–7 min (not the page's 3 min poll).
    assert.match(UPDATES_LEDE, /примерно каждые 5–7 минут/);
    assert.doesNotMatch(UPDATES_LEDE, /4–5 минут/);
    assert.match(UPDATES_FOOT, /Сайт всегда старается показать самый актуальный снимок/);
    assert.match(UPDATES_FOOT, /прокси-канал не сработал/);
    assert.match(UPDATES_FOOT, /помечает это в баннере/);
    assert.equal(UPDATES_FACTS.length, 3);
    assert.equal(UPDATES_FACTS[0].term, 'Данные HH:MM');
    assert.match(UPDATES_FACTS[0].def, /скана от бота/);
    assert.equal(UPDATES_FACTS[1].term, 'След HH:MM');
    assert.match(UPDATES_FACTS[1].def, /следующего автоматического обновления/);
    assert.match(UPDATES_FACTS[1].def, /3 минуты/);
    assert.doesNotMatch(UPDATES_FACTS[1].def, /вледуйщегг|следущего/);
    assert.equal(UPDATES_FACTS[2].term, 'Точка слева');
    assert.match(UPDATES_FACTS[2].def, /следующего опроса/);
    assert.doesNotMatch(UPDATES_FACTS[2].def, /следущего/);
    assert.match(UPDATES_FACTS[2].def, /~12 минут/);
    assert.ok(Object.isFrozen(UPDATES_FACTS));
    assert.ok(Object.isFrozen(UPDATES_FACTS[0]));
  });

  it('builds state-aware aria labels with clocks', () => {
    const idle = UPDATES_ARIA_LABELS.idle('18:45', '18:48');
    assert.match(idle, /18:45/);
    assert.match(idle, /18:48/);
    assert.match(UPDATES_ARIA_LABELS.fetching('18:45', '18:48'), /Идёт проверка/);
    assert.match(UPDATES_ARIA_LABELS.chase('18:45', '18:48'), /Ждём свежий сбор/);
    assert.match(UPDATES_ARIA_LABELS.loading, /Загрузка/);
  });
});
