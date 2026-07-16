/**
 * Panel content transitions — sequential dissolve, never a crossfade.
 *
 * Stages (non-overlapping on purpose):
 *   1. Exit    — current content fades out (panel chrome stays)
 *   2. Gap     — brief empty settle
 *   3. Reshape — height eases to the next content size (invisible)
 *   4. Enter   — new content fades in
 *
 * No translate / scale on tall panels. No simultaneous old+new blend.
 * View Transitions are intentionally unused here: their default model is
 * a crossfade, which reads muddy for this master–detail swap.
 */

const EASE_EXIT = "cubic-bezier(0.55, 0, 1, 1)";
const EASE_RESHAPE = "cubic-bezier(0.22, 1, 0.36, 1)";
const EASE_ENTER = "cubic-bezier(0.16, 1, 0.3, 1)";

const STAGE = {
  outMs: 120,
  gapMs: 50,
  heightMs: 240,
  inMs: 210,
};

/**
 * @param {object} opts
 * @param {HTMLElement} opts.overviewEl
 * @param {HTMLElement} opts.detailEl
 * @param {() => void} opts.paintOverview
 * @param {() => void} opts.paintDetail
 * @param {boolean} opts.animateOverview
 * @param {boolean} opts.animateDetail
 * @param {boolean} opts.reduceMotion
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
  } = opts;

  const needAnim = !reduceMotion && (animateOverview || animateDetail);

  if (!needAnim) {
    paintOverview();
    paintDetail();
    return;
  }

  // Selection highlight should flip immediately; list rebuild waits for the dissolve.
  if (!animateOverview) {
    paintOverview();
  }

  /** @type {HTMLElement[]} */
  const panels = [];
  if (animateOverview) panels.push(overviewEl);
  if (animateDetail) panels.push(detailEl);

  const locks = panels.map((panel) => {
    const fromH = Math.max(panel.getBoundingClientRect().height, 1);
    panel.style.height = `${fromH}px`;
    panel.style.overflow = "hidden";
    panel.classList.add("is-panel-swapping");
    return { panel, fromH, outgoing: contentRoot(panel) };
  });

  /** @type {HTMLElement[]} */
  const faded = [];

  try {
    // 1 — Exit (panel chrome stays put)
    await Promise.all(
      locks.map(({ outgoing }) => {
        if (!outgoing) return Promise.resolve();
        faded.push(outgoing);
        return fadeOpacity(outgoing, 0, STAGE.outMs, EASE_EXIT);
      }),
    );

    // 2 — Empty settle
    await wait(STAGE.gapMs);

    // Swap DOM while invisible
    if (animateOverview) paintOverview();
    paintDetail();

    // New content starts invisible — no overlap with the old frame
    const incoming = locks.map(({ panel, fromH }) => {
      const content = contentRoot(panel);
      if (content) {
        content.style.opacity = "0";
        faded.push(content);
      }
      return { panel, fromH, content };
    });

    // 3 — Reshape height with content still at opacity 0
    await Promise.all(
      incoming.map(async ({ panel, fromH }) => {
        panel.style.height = "auto";
        const nextH = Math.max(panel.getBoundingClientRect().height, 1);
        panel.style.height = `${fromH}px`;
        void panel.offsetHeight;
        if (Math.abs(fromH - nextH) >= 0.5) {
          await animateHeight(panel, nextH, STAGE.heightMs, EASE_RESHAPE);
        }
        panel.style.height = "auto";
      }),
    );

    // 4 — Enter
    await Promise.all(
      incoming.map(({ content }) => {
        if (!content) return Promise.resolve();
        return fadeOpacity(content, 1, STAGE.inMs, EASE_ENTER);
      }),
    );
  } finally {
    for (const { panel } of locks) {
      panel.style.height = "";
      panel.style.overflow = "";
      panel.classList.remove("is-panel-swapping");
    }
    for (const node of faded) {
      if (node.isConnected) node.style.opacity = "";
    }
  }
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
 * @param {number} to
 * @param {number} ms
 * @param {string} ease
 */
function fadeOpacity(el, to, ms, ease) {
  return new Promise((resolve) => {
    const from = Number.parseFloat(getComputedStyle(el).opacity);
    const start = Number.isFinite(from) ? from : to === 0 ? 1 : 0;
    if (Math.abs(start - to) < 0.01) {
      el.style.opacity = String(to);
      resolve();
      return;
    }
    const anim = el.animate([{ opacity: start }, { opacity: to }], {
      duration: ms,
      easing: ease,
      fill: "forwards",
    });
    anim.finished.then(() => {
      el.style.opacity = String(to);
      anim.cancel();
      resolve();
    }, resolve);
  });
}

/**
 * @param {HTMLElement} el
 * @param {number} toPx
 * @param {number} ms
 * @param {string} ease
 */
function animateHeight(el, toPx, ms, ease) {
  return new Promise((resolve) => {
    const from = el.getBoundingClientRect().height;
    if (Math.abs(from - toPx) < 0.5) {
      el.style.height = `${toPx}px`;
      resolve();
      return;
    }
    const anim = el.animate(
      [{ height: `${from}px` }, { height: `${toPx}px` }],
      { duration: ms, easing: ease, fill: "forwards" },
    );
    anim.finished.then(() => {
      el.style.height = `${toPx}px`;
      anim.cancel();
      resolve();
    }, resolve);
  });
}

/** @param {number} ms */
function wait(ms) {
  return new Promise((r) => setTimeout(r, ms));
}
