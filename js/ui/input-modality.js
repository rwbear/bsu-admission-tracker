/**
 * Track whether the last intentional input was pointer or keyboard.
 *
 * Pointer modality hides focus rings (mobile tap outlines, post-close restore).
 * Keyboard modality keeps :focus-visible for Tab / arrow users.
 *
 * Default is pointer — first Tab flips to keyboard.
 */

const ROOT_ATTR = 'data-input';

/**
 * @returns {'pointer' | 'keyboard'}
 */
export function inputModality() {
  const v = document.documentElement.getAttribute(ROOT_ATTR);
  return v === 'keyboard' ? 'keyboard' : 'pointer';
}

/**
 * @param {'pointer' | 'keyboard'} mode
 */
export function setInputModality(mode) {
  document.documentElement.setAttribute(
    ROOT_ATTR,
    mode === 'keyboard' ? 'keyboard' : 'pointer',
  );
}

/**
 * Install capture listeners once.
 */
export function armInputModality() {
  if (typeof document === 'undefined') return;
  if (document.documentElement.dataset.inputModalityArmed === '1') return;
  document.documentElement.dataset.inputModalityArmed = '1';
  setInputModality('pointer');

  window.addEventListener(
    'keydown',
    (e) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      // Printable keys / nav — treat as keyboard modality.
      setInputModality('keyboard');
    },
    true,
  );

  window.addEventListener(
    'pointerdown',
    () => {
      setInputModality('pointer');
    },
    true,
  );
}
