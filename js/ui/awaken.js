/**
 * Scroll-awaken foundation for visual graphics.
 *
 * Contract:
 * - Mark graphic roots with `data-awaken="<kind>"` (e.g. chance | hist).
 * - Graphics start dormant (CSS `:not(.is-awake)`). Calling `awakenEl`
 *   adds `.is-awake` once — intro motion is CSS-owned by the graphic.
 * - `armScrollAwaken(scope)` observes dormant nodes in `scope`.
 * - If a node sits under `[data-reveal-step]` that is not yet `.is-revealed`,
 *   awaken waits for `reveal:done` (never play graphics into opacity 0).
 * - Re-arming the same scope disposes the previous observer.
 * - Reduced motion / immediate: flip awake with no IO wait.
 * - Safe when scope is replaced: callbacks no-op if node disconnected.
 */

/** @type {WeakMap<Element, { io: IntersectionObserver | null, abort: AbortController }>} */
const scopeState = new WeakMap();

const IO_OPTIONS = Object.freeze({
  root: null,
  rootMargin: "0px 0px -8% 0px",
  threshold: 0.35,
});

/**
 * @param {ParentNode} scope
 * @param {object} [opts]
 * @param {boolean} [opts.reduceMotion]
 * @param {boolean} [opts.immediate] — awaken all now (quiet paint / first paint)
 */
export function armScrollAwaken(scope, opts = {}) {
  const { reduceMotion = false, immediate = false } = opts;
  disposeScrollAwaken(scope);

  const targets = [...scope.querySelectorAll("[data-awaken]")].filter(
    (el) => el instanceof HTMLElement && !el.classList.contains("is-awake"),
  );

  if (!targets.length) return;

  if (reduceMotion || immediate) {
    for (const el of targets) awakenEl(el, { instant: true });
    return;
  }

  if (typeof IntersectionObserver !== "function") {
    for (const el of targets) awakenEl(el, { instant: true });
    return;
  }

  const abort = new AbortController();
  /** @type {WeakSet<Element>} */
  const waitingOnReveal = new WeakSet();
  /** @type {IntersectionObserver | null} */
  let io = null;

  const tryAwaken = (el) => {
    if (abort.signal.aborted || !el.isConnected) return;
    if (el.classList.contains("is-awake")) {
      io?.unobserve(el);
      return;
    }

    const step = el.closest("[data-reveal-step]");
    if (step instanceof HTMLElement && !step.classList.contains("is-revealed")) {
      if (waitingOnReveal.has(el)) return;
      waitingOnReveal.add(el);
      io?.unobserve(el);
      const onDone = () => {
        step.removeEventListener("reveal:done", onDone);
        if (abort.signal.aborted || !el.isConnected) return;
        requestAnimationFrame(() => {
          if (abort.signal.aborted || !el.isConnected) return;
          if (isInAwakenViewport(el)) awakenEl(el);
          else {
            waitingOnReveal.delete(el);
            io?.observe(el);
          }
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

    awakenEl(el);
    io?.unobserve(el);
  };

  io = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      const el = entry.target;
      if (!(el instanceof HTMLElement)) continue;
      tryAwaken(el);
    }
  }, IO_OPTIONS);

  scopeState.set(scope, { io, abort });

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
  scopeState.delete(scope);
}

/**
 * Rough match for IO rootMargin `0px 0px -8% 0px`.
 * @param {HTMLElement} el
 */
function isInAwakenViewport(el) {
  const rect = el.getBoundingClientRect();
  const vh = globalThis.innerHeight || 0;
  const bottomCut = vh * 0.08;
  return rect.bottom > 0 && rect.top < vh - bottomCut && rect.width > 0;
}

/**
 * @param {HTMLElement} el
 * @param {{ instant?: boolean }} [opts]
 */
export function awakenEl(el, opts = {}) {
  if (!el.isConnected) return;
  if (el.classList.contains("is-awake")) return;
  el.classList.add("is-awake");
  if (opts.instant) el.classList.add("is-instant");
  el.dispatchEvent(new CustomEvent("awaken:done", { bubbles: true }));
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
 * True when every `[data-awaken]` in scope is awake (or none exist).
 * @param {ParentNode} scope
 */
export function allAwake(scope) {
  const nodes = [...scope.querySelectorAll("[data-awaken]")];
  return nodes.every((el) => el.classList.contains("is-awake"));
}
