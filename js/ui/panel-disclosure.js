/**
 * Panel disclosure open/close — height + meta fade, staggered body steps.
 *
 * Contract:
 * - Targets native `<details class="panel-details">` inside a scope.
 * - Summary click is intercepted (unless reduced motion): height animates,
 *   then `[open]` toggles — never an instant snap.
 * - Open: ease-out `cubic-bezier(0.16, 1, 0.3, 1)` — same family as reveal/chance.
 * - Close: ease-in `cubic-bezier(0.55, 0, 1, 1)` — same family as graphic sleep.
 * - Body children stagger on open (48 ms); quick reverse fade on close.
 * - `[data-awaken]` inside wakes after open settles (or instant open).
 * - `data-disclosure-pending-open="true"`: defer open until parent reveal step
 *   fires `reveal:done` (intro cascade).
 * - `disposePanelDisclosures(scope)` aborts listeners + in-flight motion.
 */

import { awakenEl } from './awaken.js';

/** @typedef {{ abort: AbortController, running: WeakMap<HTMLDetailsElement, Animation[]> }} DisclosureScope */

/** @type {WeakMap<Element, DisclosureScope>} */
const scopeState = new WeakMap();

export const DISCLOSURE_TIMING = Object.freeze({
  openMs: 320,
  closeMs: 260,
  childMs: 280,
  childCloseMs: 180,
  staggerMs: 48,
  openDelayMs: 56,
  closeStaggerMs: 24,
  bodyFromY: 6,
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
  /** @type {WeakMap<HTMLDetailsElement, Animation[]>} */
  const running = new WeakMap();
  scopeState.set(scope, { abort, running });

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
    if (!details.open) prepareClosedShell(details);

    if (details.dataset.disclosurePendingOpen === 'true') {
      details.removeAttribute('open');
      queuePendingOpen(details, abort.signal, running, { instant: false });
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
        if (!(target instanceof Node) || (target !== summary && !summary.contains(target))) {
          return;
        }
        if (isAnimating(details, running)) {
          ev.preventDefault();
          return;
        }
        ev.preventDefault();
        if (details.open) {
          closeDisclosure(details, running, abort.signal);
        } else {
          openDisclosure(details, running, abort.signal);
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
    cancelAnimations(details, prev.running);
    details.classList.remove(
      'is-disclosure-armed',
      'is-disclosure-open',
      'is-disclosure-opening',
      'is-disclosure-closing',
      'is-disclosure-instant',
    );
    const body = getBody(details);
    if (body) {
      clearBodyStyles(body);
      clearChildrenStyles(body);
    }
  }
  scopeState.delete(scope);
}

/**
 * @param {HTMLDetailsElement} details
 * @returns {HTMLElement | null}
 */
function getBody(details) {
  const body = details.querySelector(':scope > .panel-details-body');
  return body instanceof HTMLElement ? body : null;
}

/**
 * @param {HTMLDetailsElement} details
 */
function prepareClosedShell(details) {
  if (details.open) return;
  const body = getBody(details);
  if (!body) return;
  body.style.height = '0px';
  body.style.opacity = '0';
  body.style.paddingTop = '0px';
  body.style.overflow = 'hidden';
}

/**
 * @param {HTMLDetailsElement} details
 */
function markOpenInstant(details) {
  details.classList.add('is-disclosure-open', 'is-disclosure-instant');
  const body = getBody(details);
  if (body) clearBodyStyles(body);
}

/**
 * @param {HTMLDetailsElement} details
 * @param {WeakMap<HTMLDetailsElement, Animation[]>} running
 */
function isAnimating(details, running) {
  const list = running.get(details);
  return Boolean(list?.length);
}

/**
 * @param {HTMLDetailsElement} details
 * @param {WeakMap<HTMLDetailsElement, Animation[]>} running
 */
function cancelAnimations(details, running) {
  const list = running.get(details);
  if (!list?.length) return;
  for (const anim of list) anim.cancel();
  running.delete(details);
}

/**
 * @param {HTMLDetailsElement} details
 * @param {WeakMap<HTMLDetailsElement, Animation[]>} running
 * @param {AbortSignal} signal
 */
function openDisclosure(details, running, signal) {
  const body = getBody(details);
  if (!body) {
    details.open = true;
    awakenInside(details, { instant: false });
    return;
  }

  cancelAnimations(details, running);
  details.classList.remove('is-disclosure-closing', 'is-disclosure-instant');
  details.classList.add('is-disclosure-opening');
  details.open = true;

  body.style.overflow = 'hidden';
  body.style.height = '0px';
  body.style.opacity = '0';
  body.style.paddingTop = '0px';
  body.style.transform = `translateY(-${DISCLOSURE_TIMING.bodyFromY}px)`;

  /** @type {Animation[]} */
  const anims = [];

  requestAnimationFrame(() => {
    if (signal.aborted || !details.isConnected) return;

    const targetH = body.scrollHeight;
    const shell = body.animate(
      [
        {
          height: '0px',
          opacity: 0,
          paddingTop: '0px',
          transform: `translateY(-${DISCLOSURE_TIMING.bodyFromY}px)`,
        },
        {
          height: `${targetH}px`,
          opacity: 1,
          paddingTop: '',
          transform: 'translateY(0)',
        },
      ],
      {
        duration: DISCLOSURE_TIMING.openMs,
        easing: DISCLOSURE_TIMING.easeOpen,
        fill: 'forwards',
      },
    );
    anims.push(shell);

    shell.addEventListener(
      'finish',
      () => {
        if (signal.aborted || !details.isConnected) return;
        finishOpen(details, body, running);
        awakenInside(details, { instant: false });
      },
      { once: true },
    );

    anims.push(...staggerChildrenOpen(body, signal));
    running.set(details, anims);
  });
}

/**
 * @param {HTMLDetailsElement} details
 * @param {WeakMap<HTMLDetailsElement, Animation[]>} running
 * @param {AbortSignal} signal
 */
function closeDisclosure(details, running, signal) {
  const body = getBody(details);
  if (!body) {
    details.open = false;
    return;
  }

  cancelAnimations(details, running);
  details.classList.remove('is-disclosure-open', 'is-disclosure-instant');
  details.classList.add('is-disclosure-closing');

  const startH = body.scrollHeight;
  body.style.overflow = 'hidden';
  body.style.height = `${startH}px`;

  /** @type {Animation[]} */
  const anims = [];
  anims.push(...staggerChildrenClose(body, signal));

  requestAnimationFrame(() => {
    if (signal.aborted || !details.isConnected) return;

    const shell = body.animate(
      [
        {
          height: `${startH}px`,
          opacity: 1,
          paddingTop: '',
          transform: 'translateY(0)',
        },
        {
          height: '0px',
          opacity: 0,
          paddingTop: '0px',
          transform: `translateY(-${Math.round(DISCLOSURE_TIMING.bodyFromY * 0.5)}px)`,
        },
      ],
      {
        duration: DISCLOSURE_TIMING.closeMs,
        easing: DISCLOSURE_TIMING.easeClose,
        fill: 'forwards',
      },
    );
    anims.push(shell);

    shell.addEventListener(
      'finish',
      () => {
        if (signal.aborted || !details.isConnected) return;
        finishClose(details, body, running);
      },
      { once: true },
    );

    running.set(details, anims);
  });
}

/**
 * @param {HTMLDetailsElement} details
 * @param {HTMLElement} body
 * @param {WeakMap<HTMLDetailsElement, Animation[]>} running
 */
function finishOpen(details, body, running) {
  running.delete(details);
  clearBodyStyles(body);
  details.classList.remove('is-disclosure-opening');
  details.classList.add('is-disclosure-open');
}

/**
 * @param {HTMLDetailsElement} details
 * @param {HTMLElement} body
 * @param {WeakMap<HTMLDetailsElement, Animation[]>} running
 */
function finishClose(details, body, running) {
  running.delete(details);
  details.open = false;
  clearBodyStyles(body);
  clearChildrenStyles(body);
  details.classList.remove('is-disclosure-closing');
}

/**
 * @param {HTMLElement} body
 */
function clearBodyStyles(body) {
  body.style.height = '';
  body.style.opacity = '';
  body.style.paddingTop = '';
  body.style.transform = '';
  body.style.overflow = '';
}

/**
 * @param {HTMLElement} body
 */
function clearChildrenStyles(body) {
  for (const kid of body.children) {
    if (kid instanceof HTMLElement) {
      kid.style.opacity = '';
      kid.style.transform = '';
    }
  }
}

/**
 * @param {HTMLElement} body
 * @param {AbortSignal} signal
 * @returns {Animation[]}
 */
function staggerChildrenOpen(body, signal) {
  /** @type {Animation[]} */
  const anims = [];
  const kids = [...body.children].filter((n) => n instanceof HTMLElement);

  kids.forEach((kid, i) => {
    kid.style.opacity = '0';
    kid.style.transform = `translateY(${DISCLOSURE_TIMING.bodyFromY}px)`;
    const anim = kid.animate(
      [
        { opacity: 0, transform: `translateY(${DISCLOSURE_TIMING.bodyFromY}px)` },
        { opacity: 1, transform: 'translateY(0)' },
      ],
      {
        duration: DISCLOSURE_TIMING.childMs,
        delay: DISCLOSURE_TIMING.openDelayMs + i * DISCLOSURE_TIMING.staggerMs,
        easing: DISCLOSURE_TIMING.easeOpen,
        fill: 'forwards',
      },
    );
    anim.addEventListener(
      'finish',
      () => {
        if (signal.aborted) return;
        kid.style.opacity = '';
        kid.style.transform = '';
      },
      { once: true },
    );
    anims.push(anim);
  });

  return anims;
}

/**
 * @param {HTMLElement} body
 * @param {AbortSignal} signal
 * @returns {Animation[]}
 */
function staggerChildrenClose(body, signal) {
  /** @type {Animation[]} */
  const anims = [];
  const kids = [...body.children].filter((n) => n instanceof HTMLElement);

  kids.forEach((kid, i) => {
    const anim = kid.animate(
      [
        { opacity: 1, transform: 'translateY(0)' },
        {
          opacity: 0,
          transform: `translateY(${Math.round(DISCLOSURE_TIMING.bodyFromY * 0.5)}px)`,
        },
      ],
      {
        duration: DISCLOSURE_TIMING.childCloseMs,
        delay: i * DISCLOSURE_TIMING.closeStaggerMs,
        easing: DISCLOSURE_TIMING.easeClose,
        fill: 'forwards',
      },
    );
    anim.addEventListener(
      'finish',
      () => {
        if (signal.aborted) return;
        kid.style.opacity = '';
        kid.style.transform = '';
      },
      { once: true },
    );
    anims.push(anim);
  });

  return anims;
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
 * @param {WeakMap<HTMLDetailsElement, Animation[]>} running
 * @param {{ instant: boolean }} opts
 */
function queuePendingOpen(details, signal, running, opts) {
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
    openDisclosure(details, running, signal);
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
