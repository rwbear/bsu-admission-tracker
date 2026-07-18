/**
 * Pin body-portal overlay shells to the visual viewport.
 *
 * iOS Safari keeps the layout viewport tall when the keyboard opens and only
 * shrinks/offsets the visual viewport. A `position:fixed; inset:0` shell then
 * sits half under the keyboard — search feels broken and list taps miss.
 *
 * Contract: call `pinOverlayShell(shell)` after mount; call `dispose()` in
 * teardown. Call `sync()` on search focus/blur to catch keyboard transitions
 * before visualViewport events settle.
 */

/**
 * @param {HTMLElement} shell
 * @param {{ dialogSelector?: string, padPx?: number, maxDialogPx?: number }} [opts]
 * @returns {{ sync: () => void, dispose: () => void }}
 */
export function pinOverlayShell(shell, opts = {}) {
  if (!(shell instanceof HTMLElement)) {
    return { sync: () => {}, dispose: () => {} };
  }

  const dialogSelector = opts.dialogSelector || '.faculty-overlay';
  const padPx = opts.padPx ?? 16;
  const maxDialogPx = opts.maxDialogPx ?? 28 * 16;
  let alive = true;

  const sync = () => {
    if (!alive) return;
    const vv = window.visualViewport;
    const width = vv?.width ?? window.innerWidth;
    const height = vv?.height ?? window.innerHeight;
    const top = vv?.offsetTop ?? 0;
    const left = vv?.offsetLeft ?? 0;

    shell.style.position = 'fixed';
    shell.style.top = `${top}px`;
    shell.style.left = `${left}px`;
    shell.style.width = `${width}px`;
    shell.style.height = `${height}px`;
    shell.style.right = 'auto';
    shell.style.bottom = 'auto';
    shell.style.inset = 'auto';

    const dialog = shell.querySelector(dialogSelector);
    if (!(dialog instanceof HTMLElement)) return;
    // Method sheet sizes to content; faculty/table keep a stable frame.
    if (dialog.classList.contains('method-overlay')) {
      const maxH = Math.max(160, Math.min(height - padPx * 2, maxDialogPx));
      dialog.style.maxHeight = `${maxH}px`;
      dialog.style.height = '';
      return;
    }
    const maxH = Math.max(200, Math.min(height - padPx * 2, maxDialogPx));
    dialog.style.height = `${maxH}px`;
    dialog.style.maxHeight = `${maxH}px`;
  };

  sync();

  const vv = window.visualViewport;
  if (vv) {
    vv.addEventListener('resize', sync);
    vv.addEventListener('scroll', sync);
  }
  window.addEventListener('resize', sync);

  const dispose = () => {
    if (!alive) return;
    alive = false;
    if (vv) {
      vv.removeEventListener('resize', sync);
      vv.removeEventListener('scroll', sync);
    }
    window.removeEventListener('resize', sync);
    shell.style.position = '';
    shell.style.top = '';
    shell.style.left = '';
    shell.style.width = '';
    shell.style.height = '';
    shell.style.right = '';
    shell.style.bottom = '';
    shell.style.inset = '';
    const dialog = shell.querySelector(dialogSelector);
    if (dialog instanceof HTMLElement) {
      dialog.style.height = '';
      dialog.style.maxHeight = '';
    }
  };

  return { sync, dispose };
}

/**
 * visualViewport resize lags the iOS keyboard animation — pulse sync for a
 * few frames after search focus/blur so the shell tracks the visible area.
 * @param {{ sync?: () => void } | null | undefined} pin
 * @param {() => boolean} stillLive
 * @param {number} [frames]
 */
export function followOverlayViewport(pin, stillLive, frames = 16) {
  let n = 0;
  const step = () => {
    if (!stillLive()) return;
    pin?.sync?.();
    if (++n < frames) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}
