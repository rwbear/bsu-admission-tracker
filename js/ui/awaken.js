/**
 * Scroll awaken / sleep foundation for visual graphics.
 *
 * Contract:
 * - Mark graphic roots with `data-awaken="<kind>"` (chance | hist).
 * - States: dormant → `.is-awake` → (optional) `.is-sleeping` → dormant.
 * - `armScrollAwaken(scope)` keeps an IntersectionObserver for the life of
 *   the scope: enter view → awaken, leave view → reverse sleep animation.
 * - Hysteresis: wake ≥ WAKE_RATIO, sleep ≤ SLEEP_RATIO (no threshold flicker).
 * - If under a `[data-reveal-step]` not yet `.is-revealed`, wait for
 *   `reveal:done` before waking (never animate into opacity 0).
 * - `.is-instant` skips intro on quiet/first paint; first sleep clears it
 *   so later cycles use full motion.
 * - Reduced motion: stay visually complete (no sleep cycle).
 * - Re-arming disposes the previous observer + pending sleep timers.
 */

/** @type {WeakMap<Element, ScopeState>} */
const scopeState = new WeakMap();

/**
 * @typedef {{
 *   io: IntersectionObserver | null,
 *   abort: AbortController,
 *   sleepTimers: Map<Element, ReturnType<typeof setTimeout>>,
 * }} ScopeState
 */

/** Wake when this much of the target is in the (margin-adjusted) viewport. */
export const AWAKEN_WAKE_RATIO = 0.35;
/** Sleep only when clearly gone — hysteresis below wake. */
export const AWAKEN_SLEEP_RATIO = 0.08;

/** Longest sleep animation + stagger budget (hist bars). */
export const AWAKEN_SLEEP_MS = 420;

/**
 * After a wake, ignore sleep for this long. Layout/IO flicker during reveal
 * or panel height settle was putting graphics to sleep mid-intro and waking
 * them again — CSS replayed plan-slab / chance fill twice on load / faculty
 * select (dual-panel height lock clips IntersectionObserver).
 */
export const AWAKEN_SLEEP_GRACE_MS = 900;

/** @type {WeakMap<Element, number>} */
const awakeAt = new WeakMap();

/**
 * True while sleep should be ignored after a recent wake (IO flicker guard).
 * @param {Element} el
 * @param {number} [now]
 */
export function shouldDeferSleep(
  el,
  now = typeof performance !== "undefined" ? performance.now() : 0,
) {
  const woke = awakeAt.get(el);
  return woke != null && now - woke < AWAKEN_SLEEP_GRACE_MS;
}

const IO_OPTIONS = Object.freeze({
  root: null,
  rootMargin: "0px 0px -8% 0px",
  threshold: Object.freeze([0, 0.08, 0.2, 0.35, 0.5, 0.75, 1]),
});

/**
 * @param {ParentNode} scope
 * @param {object} [opts]
 * @param {boolean} [opts.reduceMotion]
 * @param {boolean} [opts.immediate] — show awake now (quiet / first paint), still observe
 */
export function armScrollAwaken(scope, opts = {}) {
  const { reduceMotion = false, immediate = false } = opts;
  disposeScrollAwaken(scope);

  const targets = [...scope.querySelectorAll("[data-awaken]")].filter(
    (el) => el instanceof HTMLElement,
  );
  if (!targets.length) return;

  if (reduceMotion) {
    for (const el of targets) awakenEl(el, { instant: true });
    return;
  }

  if (immediate) {
    // Only paint-awake what is already on screen; below-fold stays dormant
    // so the first scroll can play a real wake (no flash-then-sleep).
    for (const el of targets) {
      if (visibilityRatio(el) >= AWAKEN_WAKE_RATIO) {
        awakenEl(el, { instant: true });
      }
    }
  }

  if (typeof IntersectionObserver !== "function") {
    for (const el of targets) awakenEl(el, { instant: true });
    return;
  }

  const abort = new AbortController();
  /** @type {WeakSet<Element>} */
  const waitingOnReveal = new WeakSet();
  /** @type {Map<Element, ReturnType<typeof setTimeout>>} */
  const sleepTimers = new Map();
  /** @type {IntersectionObserver | null} */
  let io = null;

  const state = /** @type {ScopeState} */ ({ io: null, abort, sleepTimers });
  scopeState.set(scope, state);

  const clearSleepTimer = (el) => {
    const t = sleepTimers.get(el);
    if (t != null) {
      clearTimeout(t);
      sleepTimers.delete(el);
    }
  };

  const tryAwaken = (el) => {
    if (abort.signal.aborted || !el.isConnected) return;

    const step = el.closest("[data-reveal-step]");
    if (step instanceof HTMLElement && !step.classList.contains("is-revealed")) {
      if (waitingOnReveal.has(el)) return;
      waitingOnReveal.add(el);
      const onDone = () => {
        step.removeEventListener("reveal:done", onDone);
        waitingOnReveal.delete(el);
        if (abort.signal.aborted || !el.isConnected) return;
        // Always wake when the reveal step finishes — do not gate on
        // visibilityRatio. During faculty dual-panel swaps the detail is
        // height-locked + overflow:hidden; ratio can read ~0 while the
        // cascade is intentionally introducing the graphic. Skipping here
        // left plan-slab dormant (empty track) until a later IO pulse,
        // which replayed the intro and looked broken.
        requestAnimationFrame(() => {
          if (abort.signal.aborted || !el.isConnected) return;
          clearSleepTimer(el);
          awakenEl(el);
        });
      };
      step.addEventListener("reveal:done", onDone, { once: true });
      abort.signal.addEventListener(
        "abort",
        () => step.removeEventListener("reveal:done", onDone),
        { once: true },
      );
      return;
    }

    clearSleepTimer(el);
    awakenEl(el);
  };

  const trySleep = (el) => {
    if (abort.signal.aborted || !el.isConnected) return;
    if (!el.classList.contains("is-awake") && !el.classList.contains("is-sleeping")) {
      return;
    }
    if (shouldDeferSleep(el)) return;
    // Panel height settle clips descendants; IO reports "gone" falsely.
    if (isUnderPanelSwap(el)) return;
    sleepEl(el, {
      settleMs: AWAKEN_SLEEP_MS,
      onSchedule: (timer) => {
        clearSleepTimer(el);
        sleepTimers.set(el, timer);
      },
      onSettled: () => {
        sleepTimers.delete(el);
      },
    });
  };

  io = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      const el = entry.target;
      if (!(el instanceof HTMLElement)) continue;
      const ratio = entry.intersectionRatio;
      if (ratio >= AWAKEN_WAKE_RATIO && entry.isIntersecting) {
        tryAwaken(el);
      } else if (ratio <= AWAKEN_SLEEP_RATIO || !entry.isIntersecting) {
        trySleep(el);
      }
    }
  }, IO_OPTIONS);

  state.io = io;

  for (const el of targets) {
    io.observe(el);
  }
}

/**
 * @param {ParentNode} scope
 */
export function disposeScrollAwaken(scope) {
  const prev = scopeState.get(scope);
  if (!prev) return;
  prev.abort.abort();
  prev.io?.disconnect();
  for (const t of prev.sleepTimers.values()) clearTimeout(t);
  prev.sleepTimers.clear();
  scopeState.delete(scope);
}

/**
 * True while a sequential panel dissolve still owns layout (height lock +
 * overflow clip). IO ratios are unreliable for descendants in this window.
 * @param {Element} el
 */
export function isUnderPanelSwap(el) {
  return Boolean(el?.closest?.(".is-panel-swapping"));
}

/**
 * Approximate intersection ratio against the awaken rootMargin.
 * @param {HTMLElement} el
 */
export function visibilityRatio(el) {
  const rect = el.getBoundingClientRect();
  const vh = globalThis.innerHeight || 0;
  if (vh <= 0 || rect.width <= 0 || rect.height <= 0) return 0;
  const viewTop = 0;
  const viewBottom = vh * 0.92; // match rootMargin bottom -8%
  const top = Math.max(rect.top, viewTop);
  const bottom = Math.min(rect.bottom, viewBottom);
  const visible = Math.max(0, bottom - top);
  return Math.min(1, visible / rect.height);
}

/**
 * @param {HTMLElement} el
 * @param {{ instant?: boolean }} [opts]
 */
export function awakenEl(el, opts = {}) {
  if (!el.isConnected) return;

  const wasSleeping = el.classList.contains("is-sleeping");
  el.classList.remove("is-sleeping");

  if (opts.instant) {
    el.classList.add("is-awake", "is-instant");
    if (typeof performance !== "undefined") {
      awakeAt.set(el, performance.now());
    }
    el.dispatchEvent(new CustomEvent("awaken:done", { bubbles: true }));
    return;
  }

  el.classList.remove("is-instant");

  if (el.classList.contains("is-awake") && !wasSleeping) {
    return;
  }

  // Restart intro when cancelling a sleep mid-flight.
  if (el.classList.contains("is-awake") && wasSleeping) {
    el.classList.remove("is-awake");
    void el.offsetWidth;
  }

  el.classList.add("is-awake");
  if (typeof performance !== "undefined") {
    awakeAt.set(el, performance.now());
  }
  el.dispatchEvent(new CustomEvent("awaken:done", { bubbles: true }));
}

/**
 * Reverse the graphic back to dormant.
 * @param {HTMLElement} el
 * @param {object} [opts]
 * @param {boolean} [opts.instant]
 * @param {number} [opts.settleMs]
 * @param {(timer: ReturnType<typeof setTimeout>) => void} [opts.onSchedule]
 * @param {() => void} [opts.onSettled]
 */
export function sleepEl(el, opts = {}) {
  const {
    instant = false,
    settleMs = AWAKEN_SLEEP_MS,
    onSchedule,
    onSettled,
  } = opts;

  if (!el.isConnected) return;
  if (!el.classList.contains("is-awake") && !el.classList.contains("is-sleeping")) {
    return;
  }
  if (el.classList.contains("is-sleeping") && !instant) return;

  el.classList.remove("is-instant");

  if (instant) {
    el.classList.remove("is-awake", "is-sleeping");
    el.dispatchEvent(new CustomEvent("sleep:done", { bubbles: true }));
    onSettled?.();
    return;
  }

  el.classList.add("is-sleeping");
  // Keep `.is-awake` until settle so base dormant styles don't flash.

  const timer = setTimeout(() => {
    if (!el.isConnected) {
      onSettled?.();
      return;
    }
    if (!el.classList.contains("is-sleeping")) {
      onSettled?.();
      return;
    }
    el.classList.remove("is-awake", "is-sleeping");
    el.dispatchEvent(new CustomEvent("sleep:done", { bubbles: true }));
    onSettled?.();
  }, settleMs);

  onSchedule?.(timer);
}

/**
 * @param {ParentNode} scope
 */
export function awakenAllIn(scope) {
  for (const el of scope.querySelectorAll("[data-awaken]")) {
    if (el instanceof HTMLElement) awakenEl(el);
  }
}

/**
 * @param {ParentNode} scope
 */
export function allAwake(scope) {
  const nodes = [...scope.querySelectorAll("[data-awaken]")];
  return nodes.every((el) => el.classList.contains("is-awake") && !el.classList.contains("is-sleeping"));
}

/**
 * True when every graphic is fully dormant (not awake, not mid-sleep).
 * @param {ParentNode} scope
 */
export function allAsleep(scope) {
  const nodes = [...scope.querySelectorAll("[data-awaken]")];
  return nodes.every(
    (el) =>
      !el.classList.contains("is-awake") && !el.classList.contains("is-sleeping"),
  );
}
