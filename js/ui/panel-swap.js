/**
 * Premium panel content transitions.
 *
 * Primary: View Transitions API — browser morphs named stages
 * (geometry + soft crossfade). Feels native and stays in sync with
 * compositor timing.
 *
 * Fallback: height-locked sequential opacity (out → gap → height → in).
 * No translateY on tall panels — that reads as muddy, not premium.
 */

const EASE_OUT = "cubic-bezier(0.22, 1, 0.36, 1)";
const EASE_INOUT = "cubic-bezier(0.45, 0, 0.55, 1)";

const FALLBACK = {
  outMs: 180,
  gapMs: 48,
  heightMs: 360,
  inMs: 280,
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

  if (typeof document.startViewTransition === "function") {
    await runViewTransition({
      overviewEl,
      detailEl,
      paintOverview,
      paintDetail,
      animateOverview,
      animateDetail,
    });
    return;
  }

  await runHeightLockFallback({
    overviewEl,
    detailEl,
    paintOverview,
    paintDetail,
    animateOverview,
    animateDetail,
  });
}

async function runViewTransition({
  overviewEl,
  detailEl,
  paintOverview,
  paintDetail,
  animateOverview,
  animateDetail,
}) {
  const prevOv = overviewEl.style.viewTransitionName;
  const prevDe = detailEl.style.viewTransitionName;

  overviewEl.style.viewTransitionName = animateOverview ? "overview-stage" : "none";
  detailEl.style.viewTransitionName = animateDetail ? "detail-stage" : "none";

  try {
    const transition = document.startViewTransition(() => {
      paintOverview();
      paintDetail();
    });
    await transition.finished;
  } catch {
    /* aborted / unsupported mid-flight — DOM already painted */
  } finally {
    overviewEl.style.viewTransitionName = prevOv;
    detailEl.style.viewTransitionName = prevDe;
  }
}

async function runHeightLockFallback({
  overviewEl,
  detailEl,
  paintOverview,
  paintDetail,
  animateOverview,
  animateDetail,
}) {
  const targets = [];
  if (animateOverview) targets.push(overviewEl);
  if (animateDetail) targets.push(detailEl);

  const locks = targets.map((el) => {
    const h = Math.max(el.getBoundingClientRect().height, 1);
    el.style.height = `${h}px`;
    el.style.overflow = "hidden";
    el.classList.add("is-panel-swapping");
    return { el, h };
  });

  try {
    await Promise.all(targets.map((el) => fadeOpacity(el, 0, FALLBACK.outMs, EASE_INOUT)));
    await wait(FALLBACK.gapMs);

    paintOverview();
    paintDetail();

    await Promise.all(
      locks.map(async ({ el, h }) => {
        el.style.height = "auto";
        const next = Math.max(el.getBoundingClientRect().height, 1);
        el.style.height = `${h}px`;
        void el.offsetHeight;
        await animateHeight(el, next, FALLBACK.heightMs, EASE_OUT);
        el.style.height = "auto";
      })
    );

    await Promise.all(targets.map((el) => fadeOpacity(el, 1, FALLBACK.inMs, EASE_OUT)));
  } finally {
    for (const { el } of locks) {
      el.style.height = "";
      el.style.overflow = "";
      el.style.opacity = "";
      el.classList.remove("is-panel-swapping");
    }
  }
}

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
      { duration: ms, easing: ease, fill: "forwards" }
    );
    anim.finished.then(() => {
      el.style.height = `${toPx}px`;
      anim.cancel();
      resolve();
    }, resolve);
  });
}

function wait(ms) {
  return new Promise((r) => setTimeout(r, ms));
}
