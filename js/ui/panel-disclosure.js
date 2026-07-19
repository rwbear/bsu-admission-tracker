/**
 * Panel disclosure open/close — compositor motion, not layout-per-frame.
 *
 * Why not `grid-template-rows: 0fr↔1fr` (or height) transitions:
 * - Those interpolate layout every frame → mobile drops below 60fps and
 *   the whole detail column (footer below) reflows with it.
 * - Felt like “not enough FPS” on «Подробные данные».
 *
 * Contract:
 * - One layout: snap the shell to its measured height (grid 1fr / px lock).
 * - Animate only `opacity` + `transform` on `.panel-details-inner` (GPU).
 * - Mid-flight reverse: open↔close from current progress (no click lock).
 * - Keep `[open]` during close fade so the UA doesn’t snap content away.
 * - Auto-open waits for `reveal:done` when pending.
 * - Reduced motion: native <details>, no interception.
 * - Body markup: `.panel-details-body > .panel-details-inner`.
 */

import { awakenEl } from './awaken.js';

/** @typedef {{ abort: AbortController, finishers: WeakMap<HTMLDetailsElement, () => void> }} DisclosureScope */

/** @type {WeakMap<Element, DisclosureScope>} */
const scopeState = new WeakMap();

/**
 * Snappy budgets — compositor fades, not reveal cascade.
 * Slightly under the old 200ms grid interp so open reads decisive.
 */
export const DISCLOSURE_TIMING = Object.freeze({
  openMs: 160,
  closeMs: 130,
  easeOpen: 'cubic-bezier(0.16, 1, 0.3, 1)',
  easeClose: 'cubic-bezier(0.55, 0, 1, 1)',
  /** Initial rise for open (px-equivalent rem). */
  fromY: '0.22rem',
  /** Leave dip. */
  toY: '0.12rem',
});

/**
 * @param {ParentNode} scope
 * @param {{ reduceMotion?: boolean }} [opts]
 */
export function armPanelDisclosures(scope, opts = {}) {
  const { reduceMotion = false } = opts;
  disposePanelDisclosures(scope);

  const nodes = [...scope.querySelectorAll('details.panel-details')].filter(
    (el) => el instanceof HTMLDetailsElement,
  );
  if (!nodes.length) return;

  const abort = new AbortController();
  /** @type {WeakMap<HTMLDetailsElement, () => void>} */
  const finishers = new WeakMap();
  scopeState.set(scope, { abort, finishers });

  for (const details of nodes) {
    if (reduceMotion) {
      if (details.dataset.disclosurePendingOpen === 'true') {
        details.removeAttribute('open');
        queuePendingOpenNative(details, abort.signal);
      } else if (details.open) {
        awakenInside(details, { instant: true });
      }
      continue;
    }

    details.classList.add('is-disclosure-armed');

    if (details.dataset.disclosurePendingOpen === 'true') {
      details.removeAttribute('open');
      queuePendingOpen(details, abort.signal, finishers, { instant: false });
      continue;
    }

    if (details.open) {
      markOpenInstant(details);
      awakenInside(details, { instant: true });
    }

    details.addEventListener(
      'click',
      (ev) => {
        if (abort.signal.aborted || !details.isConnected) return;
        const summary = details.querySelector(':scope > summary');
        if (!(summary instanceof HTMLElement)) return;
        const target = ev.target;
        if (
          !(target instanceof Node) ||
          (target !== summary && !summary.contains(target))
        ) {
          return;
        }
        ev.preventDefault();

        const closing = details.classList.contains('is-disclosure-closing');
        const opening = details.classList.contains('is-disclosure-opening');
        const shown =
          details.open &&
          (details.classList.contains('is-disclosure-open') ||
            details.classList.contains('is-disclosure-instant') ||
            opening);

        // Reverse mid-flight — never lock the summary.
        if (closing || (!shown && !opening)) {
          openDisclosure(details, finishers, abort.signal);
        } else {
          closeDisclosure(details, finishers, abort.signal);
        }
      },
      { signal: abort.signal },
    );
  }
}

/**
 * @param {ParentNode} scope
 */
export function disposePanelDisclosures(scope) {
  const prev = scopeState.get(scope);
  if (!prev) return;
  prev.abort.abort();
  for (const details of scope.querySelectorAll('details.panel-details')) {
    if (!(details instanceof HTMLDetailsElement)) continue;
    clearFinisher(details, prev.finishers);
    clearMotionStyles(details);
    details.classList.remove(
      'is-disclosure-armed',
      'is-disclosure-open',
      'is-disclosure-opening',
      'is-disclosure-closing',
      'is-disclosure-instant',
    );
  }
  scopeState.delete(scope);
}

/**
 * @param {HTMLDetailsElement} details
 */
function markOpenInstant(details) {
  clearMotionStyles(details);
  details.classList.remove('is-disclosure-opening', 'is-disclosure-closing');
  details.classList.add('is-disclosure-open', 'is-disclosure-instant');
}

/**
 * @param {HTMLDetailsElement} details
 */
function clearMotionStyles(details) {
  const body = details.querySelector(':scope > .panel-details-body');
  const inner =
    body instanceof HTMLElement
      ? body.querySelector(':scope > .panel-details-inner')
      : null;
  if (body instanceof HTMLElement) {
    body.style.height = '';
    body.style.overflow = '';
  }
  if (inner instanceof HTMLElement) {
    inner.style.opacity = '';
    inner.style.transform = '';
    inner.style.transition = '';
    inner.style.willChange = '';
  }
}

/**
 * @param {HTMLDetailsElement} details
 * @param {WeakMap<HTMLDetailsElement, () => void>} finishers
 */
function clearFinisher(details, finishers) {
  const fn = finishers.get(details);
  if (fn) {
    fn();
    finishers.delete(details);
  }
}

/**
 * @param {HTMLElement} inner
 * @param {HTMLDetailsElement} details
 * @param {WeakMap<HTMLDetailsElement, () => void>} finishers
 * @param {AbortSignal} signal
 * @param {number} ms
 * @param {() => void} onDone
 */
function awaitInnerSettle(inner, details, finishers, signal, ms, onDone) {
  clearFinisher(details, finishers);
  let done = false;

  const cleanup = () => {
    inner.removeEventListener('transitionend', onEnd);
    clearTimeout(timer);
    finishers.delete(details);
  };

  const finish = () => {
    if (done) return;
    done = true;
    cleanup();
    if (!signal.aborted && details.isConnected) onDone();
  };

  const onEnd = (ev) => {
    if (ev.target !== inner) return;
    if (ev.propertyName !== 'opacity') return;
    finish();
  };

  inner.addEventListener('transitionend', onEnd);
  const timer = setTimeout(finish, ms + 40);
  finishers.set(details, () => {
    if (done) return;
    done = true;
    cleanup();
  });

  signal.addEventListener(
    'abort',
    () => {
      if (done) return;
      done = true;
      cleanup();
    },
    { once: true },
  );
}

/**
 * @param {HTMLDetailsElement} details
 * @returns {{ body: HTMLElement, inner: HTMLElement } | null}
 */
function shellParts(details) {
  const body = details.querySelector(':scope > .panel-details-body');
  if (!(body instanceof HTMLElement)) return null;
  const inner = body.querySelector(':scope > .panel-details-inner');
  if (!(inner instanceof HTMLElement)) return null;
  return { body, inner };
}

/**
 * @param {HTMLDetailsElement} details
 * @param {WeakMap<HTMLDetailsElement, () => void>} finishers
 * @param {AbortSignal} signal
 */
function openDisclosure(details, finishers, signal) {
  clearFinisher(details, finishers);
  const reversing = details.classList.contains('is-disclosure-closing');
  details.classList.remove(
    'is-disclosure-closing',
    'is-disclosure-instant',
    'is-disclosure-open',
  );

  const parts = shellParts(details);
  if (!parts) {
    details.open = true;
    details.classList.add('is-disclosure-open');
    awakenInside(details, { instant: false });
    return;
  }
  const { body, inner } = parts;
  const { openMs, easeOpen, fromY } = DISCLOSURE_TIMING;

  // Hide content before the shell expands so the height snap isn’t a flash.
  if (!reversing) {
    inner.style.transition = 'none';
    inner.style.opacity = '0';
    inner.style.transform = `translateY(${fromY})`;
  }

  details.open = true;
  details.classList.add('is-disclosure-opening');
  // One layout: CSS flips 0fr→1fr with no transition; lock px height.
  void body.offsetHeight;
  const h = Math.max(0, Math.ceil(inner.getBoundingClientRect().height));
  body.style.height = `${h}px`;
  body.style.overflow = 'hidden';

  void inner.offsetWidth;
  inner.style.willChange = 'opacity, transform';
  inner.style.transition = `opacity ${openMs}ms ${easeOpen}, transform ${openMs}ms ${easeOpen}`;
  inner.style.opacity = '1';
  inner.style.transform = 'translateY(0)';

  awaitInnerSettle(inner, details, finishers, signal, openMs, () => {
    details.classList.remove('is-disclosure-opening');
    details.classList.add('is-disclosure-open');
    clearMotionStyles(details);
    awakenInside(details, { instant: false });
  });
}

/**
 * @param {HTMLDetailsElement} details
 * @param {WeakMap<HTMLDetailsElement, () => void>} finishers
 * @param {AbortSignal} signal
 */
function closeDisclosure(details, finishers, signal) {
  clearFinisher(details, finishers);
  details.classList.remove(
    'is-disclosure-open',
    'is-disclosure-opening',
    'is-disclosure-instant',
  );
  details.classList.add('is-disclosure-closing');
  // Keep [open] until the fade finishes — otherwise the UA snaps content away.

  const parts = shellParts(details);
  if (!parts) {
    details.open = false;
    details.classList.remove('is-disclosure-closing');
    return;
  }
  const { body, inner } = parts;
  const { closeMs, easeClose, toY } = DISCLOSURE_TIMING;

  // Lock height so the fade doesn’t reflow the column underneath.
  const h = Math.max(0, Math.ceil(body.getBoundingClientRect().height));
  if (h > 0) {
    body.style.height = `${h}px`;
    body.style.overflow = 'hidden';
  }

  void inner.offsetWidth;
  inner.style.willChange = 'opacity, transform';
  inner.style.transition = `opacity ${closeMs}ms ${easeClose}, transform ${closeMs}ms ${easeClose}`;
  inner.style.opacity = '0';
  inner.style.transform = `translateY(${toY})`;

  awaitInnerSettle(inner, details, finishers, signal, closeMs, () => {
    details.open = false;
    details.classList.remove('is-disclosure-closing');
    clearMotionStyles(details);
  });
}

/**
 * Reduced motion: native toggle, only defer auto-open until reveal.
 * @param {HTMLDetailsElement} details
 * @param {AbortSignal} signal
 */
function queuePendingOpenNative(details, signal) {
  const step = details.closest('[data-reveal-step]');
  const run = () => {
    if (signal.aborted || !details.isConnected) return;
    details.open = true;
    awakenInside(details, { instant: true });
    delete details.dataset.disclosurePendingOpen;
  };
  if (step instanceof HTMLElement && !step.classList.contains('is-revealed')) {
    step.addEventListener('reveal:done', run, { once: true, signal });
  } else {
    requestAnimationFrame(run);
  }
}

/**
 * @param {HTMLDetailsElement} details
 * @param {AbortSignal} signal
 * @param {WeakMap<HTMLDetailsElement, () => void>} finishers
 * @param {{ instant: boolean }} opts
 */
function queuePendingOpen(details, signal, finishers, opts) {
  const step = details.closest('[data-reveal-step]');

  const run = () => {
    if (signal.aborted || !details.isConnected) return;
    if (opts.instant) {
      details.open = true;
      markOpenInstant(details);
      awakenInside(details, { instant: true });
      delete details.dataset.disclosurePendingOpen;
      return;
    }
    openDisclosure(details, finishers, signal);
    delete details.dataset.disclosurePendingOpen;
  };

  if (step instanceof HTMLElement && !step.classList.contains('is-revealed')) {
    step.addEventListener('reveal:done', run, { once: true, signal });
  } else {
    requestAnimationFrame(run);
  }
}

/**
 * @param {HTMLDetailsElement} details
 * @param {{ instant?: boolean }} [opts]
 */
function awakenInside(details, opts = {}) {
  for (const node of details.querySelectorAll('[data-awaken]')) {
    if (node instanceof HTMLElement) {
      awakenEl(node, { instant: Boolean(opts.instant) });
    }
  }
}
