/**
 * Panel content transitions — sequential dissolve foundation.
 *
 * Contract (do not break for callers / next features):
 * - Never crossfade: old and new content are never both visible.
 * - Panel chrome (border, fill, radius) stays put; only inner content fades.
 * - Stages are ordered; height may still settle while new content enters
 *   (settle-reveal) — that is not a content crossfade.
 * - If incoming content is a `[data-reveal-root]`, enter is a top→bottom
 *   cascade (`runReveal`) instead of a bulk fade. Steps must already be
 *   primed (or `runReveal` primes them).
 * - Selection highlight may update immediately when the overview list
 *   shape is unchanged (`animateOverview: false` → paintOverview first).
 * - `signal` aborts mid-flight: animations cancel, inline styles clear,
 *   DOM is left as-is (caller runs the next transition).
 * - `prefers-reduced-motion`: paint once, no motion.
 *
 * Non-linear: opacity uses multi-stop keyframes (effect easing = linear
 * so the curve is the keyframe path). Height uses an ease-out cubic.
 */

import { runReveal } from "./reveal.js";

/** @typedef {{ outMs: number, gapMs: number, heightMs: number, inMs: number, enterAfterHeightMs: number }} PanelSwapTiming */

/** Tuned stage budget — wall-clock ≈ out+gap+max(height, enterAfter+in). */
export const PANEL_SWAP_TIMING = Object.freeze({
  outMs: 90,
  /** No empty-chrome hold — paint the next frame as soon as exit ends. */
  gapMs: 0,
  heightMs: 190,
  inMs: 170,
  /** Start enter this far into the height stage (0 = after height). */
  enterAfterHeightMs: 85,
});

/** Lighter budget for specialty-only swaps (overview shape unchanged). */
export const PANEL_SWAP_SELECT_TIMING = Object.freeze({
  outMs: 55,
  gapMs: 0,
  heightMs: 140,
  inMs: 140,
  enterAfterHeightMs: 0,
});

/** Explicit opacity path — effect uses linear easing so these offsets are the curve. */
export const EXIT_OPACITY = Object.freeze([
  { opacity: 1, offset: 0 },
  { opacity: 0.78, offset: 0.22 },
  { opacity: 0.28, offset: 0.55 },
  { opacity: 0, offset: 1 },
]);

export const ENTER_OPACITY = Object.freeze([
  { opacity: 0, offset: 0 },
  { opacity: 0.18, offset: 0.28 },
  { opacity: 0.72, offset: 0.62 },
  { opacity: 1, offset: 1 },
]);

const EASE_HEIGHT = "cubic-bezier(0.16, 1, 0.3, 1)";

/**
 * @param {object} opts
 * @param {HTMLElement} opts.overviewEl
 * @param {HTMLElement} opts.detailEl
 * @param {() => void} opts.paintOverview
 * @param {() => void} opts.paintDetail
 * @param {boolean} opts.animateOverview
 * @param {boolean} opts.animateDetail
 * @param {boolean} opts.reduceMotion
 * @param {AbortSignal} [opts.signal]
 */
export async function runPanelTransition(opts) {
  const {
    overviewEl,
    detailEl,
    paintOverview,
    paintDetail,
    animateOverview,
    animateDetail,
    reduceMotion,
    signal,
  } = opts;

  const needAnim = !reduceMotion && (animateOverview || animateDetail);

  if (!needAnim) {
    paintOverview();
    paintDetail();
    return;
  }

  throwIfAborted(signal);

  // Specialty-only: shorter exit, no height-enter lag — less empty-panel flash.
  const timing =
    animateDetail && !animateOverview
      ? PANEL_SWAP_SELECT_TIMING
      : PANEL_SWAP_TIMING;

  // Instant selection feedback when the list shape is unchanged.
  if (!animateOverview) {
    paintOverview();
  }

  /** @type {HTMLElement[]} */
  const panels = [];
  if (animateOverview) panels.push(overviewEl);
  if (animateDetail) panels.push(detailEl);

  /** @type {Animation[]} */
  const live = [];
  /** @type {HTMLElement[]} */
  const opacityNodes = [];

  const locks = panels.map((panel) => {
    const fromH = Math.max(panel.getBoundingClientRect().height, 1);
    panel.style.height = `${fromH}px`;
    panel.style.overflow = "hidden";
    panel.classList.add("is-panel-swapping");
    return { panel, fromH, outgoing: contentRoot(panel) };
  });

  try {
    // 1 — Exit along a non-linear opacity path
    await Promise.all(
      locks.map(({ outgoing }) => {
        if (!outgoing) return Promise.resolve();
        opacityNodes.push(outgoing);
        return runOpacity(outgoing, EXIT_OPACITY, timing.outMs, live, signal);
      }),
    );
    throwIfAborted(signal);

    // 2 — Empty settle
    if (timing.gapMs > 0) {
      await wait(timing.gapMs, signal);
      throwIfAborted(signal);
    }

    // Swap DOM while invisible
    if (animateOverview) paintOverview();
    paintDetail();
    throwIfAborted(signal);

    await afterLayout();
    throwIfAborted(signal);

    const incoming = locks.map(({ panel, fromH }) => {
      const content = contentRoot(panel);
      const revealRoot = findRevealRoot(content);
      if (content && !revealRoot) {
        content.style.opacity = "0";
        opacityNodes.push(content);
      }
      // Reveal roots stay at opacity 1; steps are primed by the painter.
      panel.style.height = "auto";
      const nextH = Math.max(panel.getBoundingClientRect().height, 1);
      panel.style.height = `${fromH}px`;
      void panel.offsetHeight;
      return { panel, fromH, nextH, content, revealRoot };
    });

    // 3 + 4 — Reshape, then settle-reveal enter (no content overlap)
    const heightRuns = incoming.some(({ fromH, nextH }) => Math.abs(fromH - nextH) >= 0.5);

    const heightPromise = Promise.all(
      incoming.map(({ panel, fromH, nextH }) => {
        if (Math.abs(fromH - nextH) < 0.5) {
          panel.style.height = "auto";
          return Promise.resolve();
        }
        return runHeight(panel, fromH, nextH, timing.heightMs, live, signal).then(
          () => {
            panel.style.height = "auto";
          },
        );
      }),
    );

    if (heightRuns && timing.enterAfterHeightMs > 0) {
      await wait(timing.enterAfterHeightMs, signal);
      throwIfAborted(signal);
    }

    const enterPromise = Promise.all(
      incoming.map(({ content, revealRoot }) => {
        if (!content) return Promise.resolve();
        if (revealRoot) {
          return runReveal(revealRoot, { signal, reduceMotion: false });
        }
        return runOpacity(content, ENTER_OPACITY, timing.inMs, live, signal);
      }),
    );

    await Promise.all([heightPromise, enterPromise]);
    throwIfAborted(signal);
  } finally {
    for (const anim of live) {
      try {
        anim.cancel();
      } catch {
        /* already finished */
      }
    }
    for (const { panel } of locks) {
      panel.style.height = "";
      panel.style.overflow = "";
      panel.classList.remove("is-panel-swapping");
    }
    // On abort, leave outgoing faded if it still owns the panel — clearing
    // to opacity:1 flashes old content under the next dissolve.
    if (!signal?.aborted) {
      for (const node of opacityNodes) {
        if (node.isConnected) node.style.opacity = "";
      }
    }
  }
}

/**
 * Wall-clock estimate for tests / orchestration docs.
 * @param {PanelSwapTiming} [t]
 * @param {{ heightChanges?: boolean }} [opts]
 */
export function panelSwapDurationMs(t = PANEL_SWAP_TIMING, opts = {}) {
  const heightChanges = opts.heightChanges !== false;
  if (!heightChanges) {
    return t.outMs + t.gapMs + t.inMs;
  }
  return t.outMs + t.gapMs + Math.max(t.heightMs, t.enterAfterHeightMs + t.inMs);
}

/**
 * @param {HTMLElement | null} content
 * @returns {HTMLElement | null}
 */
function findRevealRoot(content) {
  if (!content) return null;
  if (content.hasAttribute("data-reveal-root")) return content;
  const nested = content.querySelector("[data-reveal-root]");
  return nested instanceof HTMLElement ? nested : null;
}

/**
 * @param {HTMLElement} panel
 * @returns {HTMLElement | null}
 */
function contentRoot(panel) {
  const child = panel.firstElementChild;
  return child instanceof HTMLElement ? child : null;
}

/**
 * @param {HTMLElement} el
 * @param {readonly { opacity: number, offset: number }[]} keyframes
 * @param {number} ms
 * @param {Animation[]} live
 * @param {AbortSignal} [signal]
 */
function runOpacity(el, keyframes, ms, live, signal) {
  throwIfAborted(signal);
  const frames = keyframes.map((k) => ({ opacity: String(k.opacity), offset: k.offset }));
  const anim = el.animate(frames, {
    duration: ms,
    easing: "linear",
    fill: "forwards",
  });
  live.push(anim);
  return settleAnimation(anim, el, "opacity", frames[frames.length - 1].opacity, signal);
}

/**
 * @param {HTMLElement} el
 * @param {number} fromPx
 * @param {number} toPx
 * @param {number} ms
 * @param {Animation[]} live
 * @param {AbortSignal} [signal]
 */
function runHeight(el, fromPx, toPx, ms, live, signal) {
  throwIfAborted(signal);
  el.style.height = `${fromPx}px`;
  const anim = el.animate(
    [{ height: `${fromPx}px` }, { height: `${toPx}px` }],
    {
      duration: ms,
      easing: EASE_HEIGHT,
      fill: "forwards",
    },
  );
  live.push(anim);
  return settleAnimation(anim, el, "height", `${toPx}px`, signal);
}

/**
 * @param {Animation} anim
 * @param {HTMLElement} el
 * @param {string} prop
 * @param {string} endValue
 * @param {AbortSignal} [signal]
 */
function settleAnimation(anim, el, prop, endValue, signal) {
  return new Promise((resolve, reject) => {
    let settled = false;
    const finish = (ok) => {
      if (settled) return;
      settled = true;
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
        el.style.setProperty(prop, endValue);
      }
      try {
        anim.cancel();
      } catch {
        /* */
      }
      el.style.setProperty(prop, endValue);
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
        if (!settled) finish(signal?.aborted ? false : true);
      },
    );
  });
}

function afterLayout() {
  return new Promise((resolve) => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => resolve());
    });
  });
}

/**
 * @param {number} ms
 * @param {AbortSignal} [signal]
 */
function wait(ms, signal) {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(abortError());
      return;
    }
    const id = setTimeout(() => {
      signal?.removeEventListener("abort", onAbort);
      resolve();
    }, ms);
    const onAbort = () => {
      clearTimeout(id);
      reject(abortError());
    };
    signal?.addEventListener("abort", onAbort, { once: true });
  });
}

/** @param {AbortSignal} [signal] */
function throwIfAborted(signal) {
  if (signal?.aborted) throw abortError();
}

function abortError() {
  const err = new Error("Panel transition aborted");
  err.name = "AbortError";
  return err;
}
