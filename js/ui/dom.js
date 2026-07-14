/**
 * @param {string} selector
 * @param {ParentNode} [root]
 */
export function $(selector, root = document) {
  const el = root.querySelector(selector);
  if (!el) throw new Error(`Missing element: ${selector}`);
  return el;
}

/**
 * @param {string} tag
 * @param {Record<string, string>} [attrs]
 * @param {(Node|string)[]} [children]
 */
export function el(tag, attrs = {}, children = []) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === 'className') node.className = v;
    else if (k === 'text') node.textContent = v;
    else if (k === 'style' && typeof v === 'string') node.setAttribute('style', v);
    else if (typeof v === 'function' && k.startsWith('on')) {
      node.addEventListener(k.slice(2).toLowerCase(), v);
    } else if (v !== '' && v != null) node.setAttribute(k, String(v));
  }
  for (const child of children) {
    node.append(child);
  }
  return node;
}

/**
 * @param {number | null | undefined} n
 * @param {string} [fallback]
 */
export function fmtNum(n, fallback = '—') {
  if (n == null || Number.isNaN(n)) return fallback;
  return new Intl.NumberFormat('ru-RU').format(n);
}

/**
 * @param {string | null | undefined} iso
 */
export function fmtTime(iso) {
  if (!iso) return 'нет данных';
  try {
    return new Date(iso).toLocaleString('ru-RU', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

/**
 * Relative freshness for the live strip.
 * @param {string | null | undefined} iso
 */
export function fmtAge(iso) {
  if (!iso) return 'нет данных';
  const t = new Date(iso).getTime();
  if (!Number.isFinite(t)) return fmtTime(iso);
  const sec = Math.max(0, Math.round((Date.now() - t) / 1000));
  if (sec < 45) return 'только что';
  if (sec < 3600) return `${Math.floor(sec / 60)} мин назад`;
  if (sec < 86400) return `${Math.floor(sec / 3600)} ч назад`;
  return fmtTime(iso);
}
