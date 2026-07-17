import { readFileSync } from 'fs';
import {
  extractTables,
  parseScoreBucketTables,
  cellText,
} from '../../scripts/scrape/normalize.mjs';

for (const id of ['2', '29', '32']) {
  const html = readFileSync(`tests/fixtures/formk1/id-${id}.html`, 'utf8');
  console.log('\n==== FORM', id, 'len', html.length);
  const tables = extractTables(html);
  console.log('tables', tables.length);
  const t0 = tables[0];
  if (!t0) continue;
  for (let i = 0; i < Math.min(8, t0.length); i += 1) {
    const texts = t0[i]
      .map(cellText)
      .map((t) => t.replace(/\s+/g, ' ').trim())
      .filter(Boolean);
    console.log(
      'r' + i,
      'cells',
      t0[i].length,
      'nonempty',
      texts.length,
      texts.slice(0, 14),
    );
  }
  const rows = parseScoreBucketTables(html, {
    universityId: 'sb-bsu',
    form: id,
    sourceUrl: 'x',
    updatedAt: 't',
  });
  console.log('parsed specs', rows.length);
  const interesting = rows
    .filter((r) =>
      /биология|правоведение|международные отношения/i.test(r.specName),
    )
    .slice(0, 8);
  for (const r of interesting) {
    const bsum = r.buckets.reduce((a, b) => a + b, 0);
    console.log({
      name: r.specName.slice(0, 48),
      plan: r.plan,
      apps: r.totalApps,
      inC: r.inCompetition,
      bsum,
    });
  }
}
