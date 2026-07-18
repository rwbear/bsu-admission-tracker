/**
 * Fire on primary pointerdown (instant press), swallow the synthetic click.
 * Keyboard / assistive click still reaches `action` via the click path.
 *
 * @param {Element} node
 * @param {(e: Event) => void} action
 */
export function onPrimaryActivate(node, action) {
  if (!node || typeof action !== 'function') return;
  let ignoreClickUntil = 0;

  node.addEventListener('pointerdown', (e) => {
    if (typeof e.button === 'number' && e.button !== 0) return;
    if (e.isPrimary === false) return;
    ignoreClickUntil = performance.now() + 600;
    action(e);
  });

  node.addEventListener('click', (e) => {
    if (performance.now() < ignoreClickUntil) {
      e.preventDefault();
      e.stopPropagation();
      return;
    }
    action(e);
  });
}
