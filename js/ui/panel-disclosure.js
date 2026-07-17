/**
 * Panel disclosure open/close — CSS grid 0fr→1fr + opacity.
 *
 * Why not WAAPI height:
 * - Animating `height` forces layout every frame → mobile lag.
 * - Child stagger on top of that doubled paint work and stretched the feel.
 * - Blocking mid-flight clicks made toggles feel sticky.
 *
 * Contract:
 * - CSS transitions `grid-template-rows: 0fr↔1fr` + opacity (one shell).
 * - Mid-flight reverse: open↔close from current progress (no click lock).
 * - Keep `[open]` during close so the browser doesn't snap content away.
 * - Auto-open waits for `reveal:done` when pending.
 * - Reduced motion: native <details>, no interception.
 * - Body markup: `.panel-details-body > .panel-details-inner` (inner clips).
 */

import { awakenEl } from './awaken.js';

/** @typedef {{ abort: AbortController, finishers: WeakMap<HTMLDetailsElement, () => void> }} DisclosureScope */

/** @type {WeakMap<Element, DisclosureScope>} */
const scopeState = new WeakMap();

/** Snappy budgets — sit with panel-swap select (~140–190), not reveal cascade. */
export const DISCLOSURE_TIMING = Object.freeze({
  openMs: 200,
  closeMs: 160,
  easeOpen: 'cubic-bezier(0.16, 1, 0.3, 1)',
  easeClose: 'cubic-bezier(0.55, 0, 1, 1)',
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
  details.classList.remove('is-disclosure-opening', 'is-disclosure-closing');
  details.classList.add('is-disclosure-open', 'is-disclosure-instant');
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
 * @param {HTMLDetailsElement} details
 * @param {WeakMap<HTMLDetailsElement, () => void>} finishers
 * @param {AbortSignal} signal
 * @param {'open' | 'close'} kind
 * @param {() => void} onDone
 */
function awaitShellSettle(details, finishers, signal, kind, onDone) {
  clearFinisher(details, finishers);
  const body = details.querySelector(':scope > .panel-details-body');
  if (!(body instanceof HTMLElement)) {
    onDone();
    return;
  }

  const ms =
    kind === 'open' ? DISCLOSURE_TIMING.openMs : DISCLOSURE_TIMING.closeMs;
  let done = false;

  const cleanup = () => {
    body.removeEventListener('transitionend', onEnd);
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
    if (ev.target !== body) return;
    // Wait for the row clip — opacity finishes earlier and must not cut close.
    if (ev.propertyName !== 'grid-template-rows') return;
    finish();
  };

  body.addEventListener('transitionend', onEnd);
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
  details.open = true;

  const start = () => {
    if (signal.aborted || !details.isConnected) return;
    details.classList.add('is-disclosure-opening');
    awaitShellSettle(details, finishers, signal, 'open', () => {
      details.classList.remove('is-disclosure-opening');
      details.classList.add('is-disclosure-open');
      awakenInside(details, { instant: false });
    });
  };

  // Cold open needs one painted 0fr frame or the browser skips the transition.
  // Reverse from mid-close keeps the current interpolated value — no rAF.
  if (reversing) start();
  else requestAnimationFrame(start);
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
  // Keep [open] until the shell finishes — otherwise the UA snaps content away.

  awaitShellSettle(details, finishers, signal, 'close', () => {
    details.open = false;
    details.classList.remove('is-disclosure-closing');
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
