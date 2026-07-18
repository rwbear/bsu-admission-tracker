/**
 * Calm visual-viewport handling for body-portal overlays.
 *
 * Why the old pin thrashed on search focus:
 * - iOS animates visualViewport for ~300–700ms when the keyboard opens.
 * - Resizing shell/dialog every frame (and pulsing 16 rAFs) made the page
 *   blink and slide under the finger.
 *
 * Contract now:
 * - Counter keyboard *pan* with a transform only (no height thrash).
 * - Snap geometry once after the viewport settles (~stable 2 frames).
 * - `freeze()` before leave so dismiss/keyboard can't resize a fading shell.
 * - Dialog height stays CSS-driven (dvh) — JS does not fight it.
 */

/**
 * @param {HTMLElement} shell
 * @returns {{ sync: () => void, freeze: () => void, dispose: () => void }}
 */
export function pinOverlayShell(shell) {
  if (!(shell instanceof HTMLElement)) {
    return { sync: () => {}, freeze: () => {}, dispose: () => {} };
  }

  let alive = true;
  let frozen = false;
  /** @type {ReturnType<typeof setTimeout> | null} */
  let settleTimer = null;
  let lastH = 0;
  let stableCount = 0;

  const clearSettle = () => {
    if (settleTimer != null) {
      clearTimeout(settleTimer);
      settleTimer = null;
    }
  };

  /** Pan counter only — keeps the shell glued to what the user sees. */
  const applyPan = () => {
    if (!alive || frozen) return;
    const vv = window.visualViewport;
    if (!vv) {
      shell.style.transform = '';
      return;
    }
    const x = vv.offsetLeft || 0;
    const y = vv.offsetTop || 0;
    shell.style.transform = x || y ? `translate(${x}px, ${y}px)` : '';
  };

  /**
   * After keyboard motion settles, size the shell to the visible viewport once.
   * Never animate through intermediate heights.
   */
  const applySettledBox = () => {
    if (!alive || frozen) return;
    const vv = window.visualViewport;
    if (!vv) {
      shell.style.top = '0';
      shell.style.left = '0';
      shell.style.width = '';
      shell.style.height = '';
      shell.style.right = '';
      shell.style.bottom = '';
      shell.style.inset = '0';
      return;
    }
    shell.style.position = 'fixed';
    shell.style.top = '0';
    shell.style.left = '0';
    shell.style.right = 'auto';
    shell.style.bottom = 'auto';
    shell.style.inset = 'auto';
    shell.style.width = `${vv.width}px`;
    shell.style.height = `${vv.height}px`;
    applyPan();
  };

  const onViewportChange = () => {
    if (!alive || frozen) return;
    applyPan();

    const vv = window.visualViewport;
    const h = vv?.height ?? window.innerHeight;
    if (Math.abs(h - lastH) < 1) {
      stableCount += 1;
    } else {
      stableCount = 0;
      lastH = h;
    }

    clearSettle();
    // Snap box only after the keyboard animation stops changing height.
    settleTimer = setTimeout(() => {
      settleTimer = null;
      if (!alive || frozen) return;
      if (stableCount >= 1 || !vv) applySettledBox();
      else {
        // Still moving — one more wait.
        lastH = vv.height;
        settleTimer = setTimeout(() => {
          settleTimer = null;
          applySettledBox();
        }, 120);
      }
    }, 100);
  };

  // Initial: full layout shell, pan at 0.
  shell.style.position = 'fixed';
  shell.style.inset = '0';
  shell.style.width = '';
  shell.style.height = '';
  shell.style.transform = '';
  applyPan();

  const vv = window.visualViewport;
  if (vv) {
    vv.addEventListener('resize', onViewportChange);
    vv.addEventListener('scroll', applyPan);
  }
  window.addEventListener('resize', onViewportChange);

  const freeze = () => {
    if (frozen) return;
    frozen = true;
    clearSettle();
    // Expand to layout viewport under the opaque backdrop before keyboard
    // dismiss / unlock — prevents a shrinking hole during leave.
    shell.style.transform = '';
    shell.style.top = '0';
    shell.style.left = '0';
    shell.style.right = '0';
    shell.style.bottom = '0';
    shell.style.width = '';
    shell.style.height = '';
    shell.style.inset = '0';
  };

  const dispose = () => {
    if (!alive) return;
    alive = false;
    clearSettle();
    if (vv) {
      vv.removeEventListener('resize', onViewportChange);
      vv.removeEventListener('scroll', applyPan);
    }
    window.removeEventListener('resize', onViewportChange);
    shell.style.position = '';
    shell.style.top = '';
    shell.style.left = '';
    shell.style.right = '';
    shell.style.bottom = '';
    shell.style.width = '';
    shell.style.height = '';
    shell.style.inset = '';
    shell.style.transform = '';
  };

  return {
    sync: applySettledBox,
    freeze,
    dispose,
  };
}

/**
 * @deprecated No-op kept so old imports don't break mid-refactor.
 * Continuous rAF follow was the search-focus thrash source — do not revive.
 */
export function followOverlayViewport() {
  /* intentionally empty */
}
