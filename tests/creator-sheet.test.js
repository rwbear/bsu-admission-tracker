import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  CREATOR_SHEET,
  openCreatorSheet,
  closeCreatorSheet,
  isCreatorSheetOpen,
  armCreatorSheetChrome,
  toggleCreatorSheet,
} from '../js/ui/creator-sheet.js';
import {
  CREATOR_TITLE,
  CREATOR_GREETING,
  CREATOR_LEDE,
  CREATOR_PARAGRAPHS,
  CREATOR_CONTACTS,
  CREATOR_ARIA_LABEL,
} from '../js/ui/creator-copy.js';

describe('creator sheet', () => {
  it('keeps stable ids and shared leave budget', () => {
    assert.ok(CREATOR_SHEET.closeMs >= 240);
    assert.equal(CREATOR_SHEET.closeMs, 280);
    assert.equal(CREATOR_SHEET.overlayId, 'creator-overlay');
    assert.equal(CREATOR_SHEET.rootId, 'creator-overlay-root');
    assert.equal(CREATOR_SHEET.triggerId, 'creator-trigger');
  });

  it('exports open/close/arm helpers', () => {
    assert.equal(typeof openCreatorSheet, 'function');
    assert.equal(typeof closeCreatorSheet, 'function');
    assert.equal(typeof isCreatorSheetOpen, 'function');
    assert.equal(typeof armCreatorSheetChrome, 'function');
    assert.equal(typeof toggleCreatorSheet, 'function');
    assert.equal(isCreatorSheetOpen(), false);
  });

  it('keeps Russian copy and contacts locked', () => {
    assert.equal(CREATOR_TITLE, 'О создателе');
    assert.equal(CREATOR_GREETING, 'Поздравляю!');
    assert.match(CREATOR_LEDE, /уголок сайта с информацией о создателе/);
    assert.equal(CREATOR_PARAGRAPHS.length, 4);
    assert.match(CREATOR_PARAGRAPHS[0], /Меня зовут Миша/);
    assert.match(CREATOR_PARAGRAPHS[1], /каждые 10 минут/);
    assert.match(CREATOR_PARAGRAPHS[3], /контактная информация/);
    assert.equal(CREATOR_CONTACTS.length, 3);
    assert.equal(CREATOR_CONTACTS[0].href, 'mailto:r.w.bear.production@gmail.com');
    assert.equal(CREATOR_CONTACTS[1].href, 'tel:+375445760495');
    assert.equal(CREATOR_CONTACTS[2].href, 'https://t.me/RW_Bear');
    assert.equal(CREATOR_CONTACTS[2].external, true);
    assert.ok(Object.isFrozen(CREATOR_CONTACTS));
    assert.ok(Object.isFrozen(CREATOR_PARAGRAPHS));
    assert.match(CREATOR_ARIA_LABEL, /О создателе/);
  });
});
