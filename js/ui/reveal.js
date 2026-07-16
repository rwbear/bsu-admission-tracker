/**
 * Top→bottom cascade reveal foundation.
 *
 * Contract:
 * - Mark a root with `data-reveal-root`. Steps are `[data-reveal-step]`
 *   in document order (or explicit `data-reveal-step="<n>"` order).
 * - `primeReveal(root)` hides steps while preserving layout (opacity 0).
 * - `runReveal(root, opts)` plays a non-linear cascade; marks each step
 *   `.is-revealed` when its enter completes (awaken can wait on this).
 * - `finalizeReveal(root)` shows everything immediately (quiet / reduced).
 * - AbortSignal cancels in-flight WAAPI and leaves steps in a clean
 *   final-or-prime state for the next owner (caller usually replaces DOM).
 *
 * Does not fade the root itself — panel-swap chrome/dissolve stay separate.
 */

/** @typedef {{ durationMs: number, staggerMs: number, fromY: number }} RevealTiming */

export const REVEAL_TIMING = Object.freeze({
  durationMs: 320,
  staggerMs: 48,
  /** Subtle rise — small steps only, not tall-panel motion. */
  fromY: 6,
});

/** Non-linear opacity path (effect easing = linear). */
export const REVEAL_OPACITY = Object.freeze([
  { opacity: 0, offset: 0 },
  { opacity: 0.2, offset: 0.3 },
  { opacity: 0.78, offset: 0.65 },
  { opacity: 1, offset: 1 },
]);

/**
 * Stable step order: explicit index, then document order.
 * @param {Iterable<Element>} nodes
 * @returns {Element[]}
 */
export function sortRevealSteps(nodes) {
  return [...nodes].sort((a, b) => {
    const ao = orderOf(a);
    const bo = orderOf(b);
    if (ao !== bo) return ao - bo;
    const pos = a.compareDocumentPosition(b);
    if (typeof Node !== "undefined") {
      if (pos & Node.DOCUMENT_POSITION_FOLLOWING) return -1;
      if (pos & Node.DOCUMENT_POSITION_PRECEDING) return 1;
    } else {
      if (pos & 4) return -1;
      if (pos & 2) return 1;
    }
    return 0;
  });
}

/**
 * @param {HTMLElement} root
 * @returns {HTMLElement[]}
 */
export function revealSteps(root) {
  return sortRevealSteps(root.querySelectorAll("[data-reveal-step]"));
}

/**
 * @param {HTMLElement} root
 */
export function primeReveal(root) {
  root.setAttribute("data-reveal-root", "");
  for (const step of revealSteps(root)) {
    step.classList.remove("is-revealed");
    step.style.opacity = "0";
    step.style.transform = `translateY(${REVEAL_TIMING.fromY}px)`;
  }
}

/**
 * @param {HTMLElement} root
 */
export function finalizeReveal(root) {
  for (const step of revealSteps(root)) {
    step.classList.add("is-revealed");
    step.style.opacity = "";
    step.style.transform = "";
  }
}

/**
 * @param {HTMLElement} root
 * @param {object} [opts]
 * @param {boolean} [opts.reduceMotion]
 * @param {AbortSignal} [opts.signal]
 * @param {RevealTiming} [opts.timing]
 * @returns {Promise<void>}
 */
export async function runReveal(root, opts = {}) {
  const {
    reduceMotion = false,
    signal,
    timing = REVEAL_TIMING,
  } = opts;

  const steps = revealSteps(root);
  if (!steps.length) {
    finalizeReveal(root);
    return;
  }

  if (reduceMotion) {
    finalizeReveal(root);
    return;
  }

  throwIfAborted(signal);
  primeReveal(root);

  /** @type {Animation[]} */
  const live = [];

  try {
    await Promise.all(
      steps.map((step, index) =>
        playStep(step, index, timing, live, signal),
      ),
    );
  } finally {
    for (const anim of live) {
      try {
        anim.cancel();
      } catch {
        /* */
      }
    }
    // If aborted mid-cascade, don't leave half-visible steps for a reused root.
    // Callers that replace DOM can ignore this; quiet paths use finalizeReveal.
    if (signal?.aborted) {
      for (const step of steps) {
        if (!step.isConnected) continue;
        if (!step.classList.contains("is-revealed")) {
          step.style.opacity = "0";
          step.style.transform = `translateY(${timing.fromY}px)`;
        }
      }
    } else {
      finalizeReveal(root);
    }
  }
}

/**
 * Estimated cascade wall-clock (last step start + duration).
 * @param {number} stepCount
 * @param {RevealTiming} [timing]
 */
export function revealDurationMs(stepCount, timing = REVEAL_TIMING) {
  if (stepCount <= 0) return 0;
  return timing.durationMs + timing.staggerMs * (stepCount - 1);
}

/**
 * @param {HTMLElement} step
 * @param {number} index
 * @param {RevealTiming} timing
 * @param {Animation[]} live
 * @param {AbortSignal} [signal]
 */
function playStep(step, index, timing, live, signal) {
  throwIfAborted(signal);
  const delay = index * timing.staggerMs;
  const frames = [
    {
      opacity: 0,
      transform: `translateY(${timing.fromY}px)`,
      offset: 0,
    },
    ...REVEAL_OPACITY.filter((k) => k.offset > 0 && k.offset < 1).map((k) => ({
      opacity: k.opacity,
      transform: `translateY(${(timing.fromY * (1 - k.opacity)).toFixed(2)}px)`,
      offset: k.offset,
    })),
    { opacity: 1, transform: "translateY(0px)", offset: 1 },
  ];

  const anim = step.animate(frames, {
    duration: timing.durationMs,
    delay,
    easing: "linear",
    fill: "forwards",
  });
  live.push(anim);

  return settle(anim, signal).then(() => {
    step.classList.add("is-revealed");
    step.style.opacity = "";
    step.style.transform = "";
    step.dispatchEvent(new CustomEvent("reveal:done", { bubbles: true }));
  });
}

/**
 * @param {Animation} anim
 * @param {AbortSignal} [signal]
 */
function settle(anim, signal) {
  return new Promise((resolve, reject) => {
    let done = false;
    const finish = (ok) => {
      if (done) return;
      done = true;
      signal?.removeEventListener("abort", onAbort);
      if (!ok) {
        try {
          anim.cancel();
        } catch {
          /* */
        }
        reject(abortError());
        return;
      }
      try {
        if (typeof anim.commitStyles === "function") anim.commitStyles();
      } catch {
        /* */
      }
      try {
        anim.cancel();
      } catch {
        /* */
      }
      resolve();
    };
    const onAbort = () => finish(false);
    if (signal?.aborted) {
      finish(false);
      return;
    }
    signal?.addEventListener("abort", onAbort, { once: true });
    anim.finished.then(
      () => finish(true),
      () => {
        if (!done) finish(signal?.aborted ? false : true);
      },
    );
  });
}

/** @param {Element} el */
function orderOf(el) {
  const raw = el.getAttribute("data-reveal-step");
  if (raw == null || raw === "") return Number.POSITIVE_INFINITY;
  const n = Number(raw);
  return Number.isFinite(n) ? n : Number.POSITIVE_INFINITY;
}

/** @param {AbortSignal} [signal] */
function throwIfAborted(signal) {
  if (signal?.aborted) throw abortError();
}

function abortError() {
  const err = new Error("Reveal aborted");
  err.name = "AbortError";
  return err;
}
