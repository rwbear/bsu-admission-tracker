/**
 * ASCII / block-character chart helpers for overview + detail.
 */

const BLOCKS = ['░', '▒', '▓', '█'];

/**
 * Map 0..1 to a block glyph.
 * @param {number} t
 */
function blockAt(t) {
  if (t <= 0) return '░';
  if (t >= 1) return '█';
  return BLOCKS[Math.min(BLOCKS.length - 1, Math.floor(t * BLOCKS.length))];
}

/**
 * Horizontal bar of fixed width from a 0..1 fill ratio.
 * @param {number} ratio
 * @param {number} [width]
 */
export function asciiBar(ratio, width = 24) {
  const filled = Math.max(0, Math.min(width, Math.round(ratio * width)));
  return '█'.repeat(filled) + '░'.repeat(width - filled);
}

/**
 * Chance track as block string + seat/you markers.
 * @param {object} row enriched specialty with chance + score
 * @param {number} [width]
 */
export function asciiChanceTrack(row, width = 28) {
  const chance = row.chance || {
    segments: [],
    totalInBuckets: 0,
    plan: 0,
    seatCutRatio: 0,
    myMarkerRatio: null,
  };
  const denom = Math.max(chance.totalInBuckets, chance.plan, 1);
  const cells = Array.from({ length: width }, () => '░');

  let cursor = 0;
  for (const seg of chance.segments || []) {
    const w = Math.max(0, Math.round((seg.count / denom) * width));
    const density = seg.count > 0 ? (seg.isMine ? 1 : 0.7) : 0;
    for (let i = 0; i < w && cursor < width; i += 1, cursor += 1) {
      cells[cursor] = blockAt(density);
    }
  }

  const seatIdx = Math.min(
    width - 1,
    Math.max(0, Math.round((chance.seatCutRatio || 0) * (width - 1))),
  );
  let youIdx = null;
  if (chance.myMarkerRatio != null) {
    youIdx = Math.min(
      width - 1,
      Math.max(0, Math.round(chance.myMarkerRatio * (width - 1))),
    );
  }

  const track = cells.join('');
  const markerLine = Array.from({ length: width }, () => ' ');
  markerLine[seatIdx] = '▼';
  if (youIdx != null) markerLine[youIdx] = '*';

  return [
    `TRACK  [${track}]`,
    `MARK   [${markerLine.join('')}]`,
    `        * ты   ▼ мест=${chance.plan || 0}`,
  ].join('\n');
}

/**
 * Histogram as ASCII lines: `320-316 | ████░░ 4`
 * @param {object} row
 * @param {number | null} score
 * @param {number} [barWidth]
 */
export function asciiHistogram(row, score, barWidth = 16) {
  const ranges = row.ranges || [];
  const buckets = row.buckets || [];
  const max = Math.max(...buckets, 1);
  const lines = [];

  let cum = 0;
  let cutIdx = -1;
  const plan = row.plan || 0;
  for (let i = 0; i < buckets.length; i += 1) {
    cum += buckets[i] || 0;
    if (cutIdx === -1 && plan > 0 && cum >= plan) cutIdx = i;
  }

  ranges.forEach((label, i) => {
    const count = buckets[i] || 0;
    const bar = asciiBar(count / max, barWidth);
    const mine =
      score != null && row.chance?.segments?.[i]?.isMine ? ' <' : '';
    const cut = i === cutIdx ? ' |cut' : '';
    const padLabel = String(label).replace(/\s+/g, ' ').padEnd(12).slice(0, 12);
    lines.push(
      `${padLabel} |${bar}| ${String(count).padStart(3)}${cut}${mine}`,
    );
  });

  return lines.join('\n');
}

/**
 * @param {object[]} enrichedRows
 */
export function summarizeStatuses(enrichedRows) {
  const counts = { safe: 0, risk: 0, below: 0, neutral: 0 };
  for (const row of enrichedRows) {
    counts[row.status] = (counts[row.status] || 0) + 1;
  }
  return counts;
}
