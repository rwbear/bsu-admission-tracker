/**
 * Patch-in-place selection for option lists.
 *
 * Remounting buttons to flip `.is-active` / `.selected` kills CSS transitions
 * (new nodes start already selected → instant flash). Always prefer this
 * when the ordered id set is unchanged.
 */

/**
 * @param {ParentNode} root
 * @param {string} optionSelector
 * @param {string | null} selectedId
 * @param {string} activeClass
 */
export function patchOptionSelection(
  root,
  optionSelector,
  selectedId,
  activeClass = "is-active",
) {
  for (const btn of root.querySelectorAll(optionSelector)) {
    if (!btn?.classList || typeof btn.getAttribute !== "function") continue;
    const on = selectedId != null && btn.getAttribute("data-id") === selectedId;
    btn.classList.toggle(activeClass, on);
    btn.setAttribute("aria-selected", on ? "true" : "false");
  }
}

/**
 * @param {Iterable<{ id: string }>} items
 */
export function optionListSignature(items) {
  return [...items].map((item) => item.id).join("|");
}

/**
 * True when root already hosts the same ordered option ids.
 * @param {ParentNode} root
 * @param {string} optionSelector
 * @param {Iterable<{ id: string }>} items
 */
export function optionListMatches(root, optionSelector, items) {
  const existing = [...root.querySelectorAll(optionSelector)].map((n) =>
    n.getAttribute("data-id"),
  );
  const next = [...items].map((item) => item.id);
  return (
    existing.length === next.length &&
    existing.length > 0 &&
    existing.every((id, i) => id === next[i])
  );
}
