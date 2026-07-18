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
    assert.match(UPDATES_TITLE, /Как обновляются данные/);
    assert.ok(UPDATES_LEDE.length > 40);
    assert.match(UPDATES_LEDE, /abit\.bsu\.by/);
    assert.ok(UPDATES_FOOT.length > 40);
    assert.equal(UPDATES_FACTS.length, 3);
    for (const fact of UPDATES_FACTS) {
      assert.ok(fact.term);
      assert.ok(fact.def);
    }
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
