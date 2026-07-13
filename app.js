const PROXY = 'https://corsproxy.io/?url=';
const REFRESH_MS = 15 * 60 * 1000;

const UNIVERSITIES = [
  {
    id: 'bsu',
    name: 'БГУ',
    fullName: 'Белорусский государственный университет',
    icon: '🏛',
    base: 'https://abit.bsu.by/formk1?id=',
    faculties: [
      { id: 1,  name: 'Механико-математический' },
      { id: 2,  name: 'Физический' },
      { id: 3,  name: 'Химический' },
      { id: 4,  name: 'Географический' },
      { id: 5,  name: 'Геологический' },
      { id: 6,  name: 'Прикладной математики' },
      { id: 7,  name: 'Биологический' },
      { id: 8,  name: 'Исторический' },
      { id: 9,  name: 'Философии и социальных наук' },
      { id: 10, name: 'Экономический' },
      { id: 11, name: 'Юридический' },
      { id: 12, name: 'Международных отношений' },
      { id: 13, name: 'Журналистики' },
      { id: 14, name: 'Филологический' },
      { id: 15, name: 'Белорусской и русской филологии' },
      { id: 16, name: 'Романо-германской филологии' },
      { id: 17, name: 'Педагогический' },
      { id: 18, name: 'Психологический' },
      { id: 19, name: 'Социокультурных коммуникаций' },
      { id: 20, name: 'Военный факультет' },
      { id: 21, name: 'Государственного управления' },
      { id: 22, name: 'Социокультурных коммуникаций (2)' },
      { id: 23, name: 'Институт бизнеса БГУ' },
      { id: 24, name: 'Институт журналистики' },
      { id: 25, name: 'ФФСН' },
      { id: 26, name: 'Экологический' },
      { id: 27, name: 'Прикладной лингвистики' },
      { id: 28, name: 'ИПК' },
      { id: 29, name: 'Радиофизики и компьютерных технологий' },
      { id: 30, name: 'Спортивный' },
      { id: 31, name: 'Естественных наук' },
      { id: 32, name: 'Факультет 32' },
      { id: 33, name: 'Факультет 33' },
      { id: 34, name: 'Факультет 34' },
    ]
  },
  {
    id: 'bspu',
    name: 'БГПУ',
    fullName: 'Белорусский государственный педагогический университет',
    icon: '📚',
    base: 'https://abiturient.bspu.by/formk1?id=',
    faculties: [
      { id: 1, name: 'Математический' },
      { id: 2, name: 'Физический' },
      { id: 3, name: 'Естественный' },
      { id: 4, name: 'Исторический' },
      { id: 5, name: 'Филологический' },
      { id: 6, name: 'Иностранных языков' },
      { id: 7, name: 'Психологии' },
      { id: 8, name: 'Специального образования' },
      { id: 9, name: 'Дошкольного образования' },
      { id: 10, name: 'Начального образования' },
      { id: 11, name: 'Социальной педагогики' },
    ]
  },
];

let myScore = null;
let activeUniv = null;
let activeFacIds = new Set();
let customUrls = [];
let dataCache = {};
let countdown = REFRESH_MS / 1000;
let timer = null;

const $univGrid = document.getElementById('univ-grid');
const $facGroup  = document.getElementById('faculty-group');
const $facGrid   = document.getElementById('faculty-grid');
const $cards     = document.getElementById('cards');
const $loading   = document.getElementById('loading');
const $errorScr  = document.getElementById('error-screen');
const $emptySCr  = document.getElementById('empty-screen');
const $countdown = document.getElementById('refresh-countdown');
const $lastUpd   = document.getElementById('last-updated');
const $scoreInp  = document.getElementById('score-input');
const $scoreBtn  = document.getElementById('score-btn');
const $refBtn    = document.getElementById('refresh-btn');
const $retryBtn  = document.getElementById('retry-btn');
const $themeBtn  = document.getElementById('theme-btn');
const $customIn  = document.getElementById('custom-url');
const $customBtn = document.getElementById('custom-url-btn');
const $customTags= document.getElementById('custom-tags');

(function init() {
  loadPrefs();
  buildUnivGrid();
  startTimer();
  showEmpty();
})();

function loadPrefs() {
  const s = localStorage.getItem('at-score');
  if (s) { myScore = +s; $scoreInp.value = s; }
  const t = localStorage.getItem('at-theme');
  if (t) document.documentElement.setAttribute('data-theme', t);
  const cu = localStorage.getItem('at-custom-urls');
  if (cu) try { customUrls = JSON.parse(cu); renderCustomTags(); } catch(e) {}
}
function savePrefs() {
  if (myScore !== null) localStorage.setItem('at-score', myScore);
  localStorage.setItem('at-custom-urls', JSON.stringify(customUrls));
}

$themeBtn.addEventListener('click', () => {
  const html = document.documentElement;
  const cur = html.getAttribute('data-theme');
  const dark = cur === 'dark' || (!cur && matchMedia('(prefers-color-scheme:dark)').matches);
  const next = dark ? 'light' : 'dark';
  html.setAttribute('data-theme', next);
  localStorage.setItem('at-theme', next);
});

$scoreBtn.addEventListener('click', applyScore);
$scoreInp.addEventListener('keydown', e => e.key === 'Enter' && applyScore());
function applyScore() {
  const v = parseInt($scoreInp.value);
  if (!isNaN(v) && v >= 0 && v <= 500) {
    myScore = v; savePrefs(); renderCards();
  }
}

function buildUnivGrid() {
  UNIVERSITIES.forEach(u => {
    const p = document.createElement('div');
    p.className = 'univ-pill';
    p.innerHTML = `<span class="pill-icon">${u.icon}</span><span>${u.name}</span><span style="font-size:11px;color:var(--text3)">${u.fullName}</span>`;
    p.addEventListener('click', () => selectUniv(u.id));
    p.dataset.uid = u.id;
    $univGrid.appendChild(p);
  });
}

function selectUniv(uid) {
  activeUniv = uid;
  activeFacIds = new Set();
  dataCache = {};
  document.querySelectorAll('.univ-pill').forEach(p => p.classList.toggle('active', p.dataset.uid === uid));
  buildFacGrid();
  $facGroup.style.display = 'block';
  showEmpty();
}

function buildFacGrid() {
  $facGrid.innerHTML = '';
  const univ = UNIVERSITIES.find(u => u.id === activeUniv);
  if (!univ) return;

  const all = document.createElement('div');
  all.className = 'fac-chip all';
  all.textContent = 'Все факультеты';
  all.addEventListener('click', () => {
    activeFacIds = new Set(univ.faculties.map(f => f.id));
    document.querySelectorAll('.fac-chip').forEach(c => c.classList.remove('active','multi-active'));
    all.classList.add('active');
    dataCache = {};
    loadAndRender();
  });
  $facGrid.appendChild(all);

  univ.faculties.forEach(f => {
    const c = document.createElement('div');
    c.className = 'fac-chip';
    c.textContent = f.name;
    c.dataset.fid = f.id;
    c.addEventListener('click', () => toggleFac(f.id, c, all));
    $facGrid.appendChild(c);
  });
}

function toggleFac(fid, chip, allChip) {
  allChip.classList.remove('active');
  if (activeFacIds.has(fid)) {
    activeFacIds.delete(fid);
    chip.classList.remove('active','multi-active');
    delete dataCache[activeUniv + '_' + fid];
  } else {
    activeFacIds.add(fid);
    chip.classList.add('active');
    if (activeFacIds.size > 1) {
      document.querySelectorAll('.fac-chip.active:not(.all)').forEach(c => {
        c.classList.remove('active'); c.classList.add('multi-active');
      });
    }
  }
  if (activeFacIds.size > 0) loadAndRender();
  else { renderCards(); }
}

$customBtn.addEventListener('click', addCustomUrl);
$customIn.addEventListener('keydown', e => e.key === 'Enter' && addCustomUrl());
function addCustomUrl() {
  const raw = $customIn.value.trim();
  if (!raw) return;
  const url = raw.startsWith('http') ? raw : 'https://' + raw;
  try { new URL(url); } catch(e) { alert('Неверный URL'); return; }
  const id = new URL(url).searchParams.get('id') || url;
  if (!customUrls.find(c => c.url === url)) {
    customUrls.push({ label: 'Ссылка ID=' + id, url });
    savePrefs(); renderCustomTags();
    loadAndRender();
  }
  $customIn.value = '';
}

function renderCustomTags() {
  $customTags.innerHTML = '';
  customUrls.forEach((cu, i) => {
    const t = document.createElement('div');
    t.className = 'custom-tag';
    t.innerHTML = `<span>${cu.label}</span><button title="Удалить">✕</button>`;
    t.querySelector('button').addEventListener('click', () => {
      customUrls.splice(i, 1);
      delete dataCache['custom_' + i];
      savePrefs(); renderCustomTags(); renderCards();
    });
    $customTags.appendChild(t);
  });
}

async function loadAndRender() {
  showLoading();
  const keys = getActiveKeys();
  if (keys.length === 0) { showEmpty(); return; }
  await Promise.all(keys.map(k => loadKey(k)));
  renderCards();
  $lastUpd.textContent = 'Обновлено: ' + new Date().toLocaleTimeString('ru-RU');
}

function getActiveKeys() {
  const keys = [];
  if (activeUniv && activeFacIds.size > 0) {
    const univ = UNIVERSITIES.find(u => u.id === activeUniv);
    activeFacIds.forEach(fid => {
      keys.push({ key: activeUniv + '_' + fid, url: univ.base + fid });
    });
  }
  customUrls.forEach((cu, i) => keys.push({ key: 'custom_' + i, url: cu.url }));
  return keys;
}

async function loadKey({ key, url }) {
  if (dataCache[key]) return;
  const proxyUrl = PROXY + encodeURIComponent(url);
  try {
    const res = await fetch(proxyUrl);
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const html = await res.text();
    const parsed = parseTable(html, key);
    if (parsed && parsed.length > 0) dataCache[key] = parsed;
    else dataCache[key] = null;
  } catch(e) {
    console.warn('Fetch error', key, e);
    dataCache[key] = null;
  }
}

function parseTable(html, key) {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const results = [];
  doc.querySelectorAll('table').forEach(table => {
    const ths = [...table.querySelectorAll('th, thead td')];
    const scoreRanges = ths
      .map(th => th.textContent.trim())
      .filter(t => /\d+\s*(и более|и менее|[-–]\s*\d+)/.test(t))
      .map(t => t.replace(/\s+/g,' ').trim());
    if (scoreRanges.length === 0) return;
    table.querySelectorAll('tbody tr').forEach(row => {
      const cells = [...row.querySelectorAll('td')].map(c => c.textContent.trim());
      const n = cells.length;
      if (n < scoreRanges.length + 3) return;
      const buckets = cells.slice(n - scoreRanges.length).map(v => parseInt(v) || 0);
      const plan = parseInt(cells[2]) || 0;
      const totalApps = parseInt(cells[n - scoreRanges.length - 1]) || 0;
      const inComp = parseInt(cells[n - scoreRanges.length - 2]) || totalApps;
      const groupName = cells[0];
      const specName = cells[1] || cells[0];
      if (!specName || buckets.every(v => v === 0)) return;
      const passing = calcPassing(scoreRanges, buckets, inComp || plan);
      results.push({ key, groupName: groupName !== specName ? groupName : '', specName, plan, totalApps, inComp, scoreRanges, buckets, passing });
    });
  });
  return results;
}

function calcPassing(ranges, counts, plan) {
  if (!plan) return null;
  let cum = 0;
  for (let i = 0; i < ranges.length; i++) {
    cum += counts[i];
    if (cum >= plan) return bucketLow(ranges[i]);
  }
  return null;
}
function bucketLow(s) {
  const m = s.match(/^(\d+)\s*(и более|и выше)/i);
  if (m) return +m[1];
  const r = s.match(/(\d+)\s*[-–]\s*(\d+)/);
  if (r) return Math.min(+r[1], +r[2]);
  return null;
}
function bucketHigh(s) {
  const m = s.match(/^(\d+)\s*(и более|и выше)/i);
  if (m) return +m[1] + 15;
  const r = s.match(/(\d+)\s*[-–]\s*(\d+)/);
  if (r) return Math.max(+r[1], +r[2]);
  return null;
}

function renderCards() {
  $cards.innerHTML = '';
  const allSpecs = [];
  Object.values(dataCache).forEach(arr => { if (arr) allSpecs.push(...arr); });
  if (allSpecs.length === 0) {
    const hasKeys = getActiveKeys().length > 0;
    if (hasKeys) {
      $cards.innerHTML = '<p style="color:var(--text2);text-align:center;padding:40px">Нет данных. Попробуй обновить или проверь ID факультета.</p>';
      showCards();
    } else {
      showEmpty();
    }
    return;
  }
  const grouped = {};
  allSpecs.forEach(s => {
    if (!grouped[s.key]) grouped[s.key] = [];
    grouped[s.key].push(s);
  });
  Object.entries(grouped).forEach(([key, specs]) => {
    const sec = document.createElement('div');
    sec.className = 'section-title';
    sec.textContent = getSectionTitle(key);
    $cards.appendChild(sec);
    specs.forEach((spec, idx) => $cards.appendChild(buildCard(spec, key + '_' + idx)));
  });
  showCards();
}

function getSectionTitle(key) {
  if (key.startsWith('custom_')) {
    const i = parseInt(key.replace('custom_',''));
    return customUrls[i]?.label || key;
  }
  const parts = key.split('_');
  const uid = parts[0], fid = +parts[1];
  const univ = UNIVERSITIES.find(u => u.id === uid);
  const fac = univ?.faculties.find(f => f.id === fid);
  return [univ?.name, fac?.name].filter(Boolean).join(' — ');
}

function buildCard(spec, uid) {
  const status = getStatus(spec.passing);
  const div = document.createElement('div');
  div.className = 'card ' + status;
  const passStr = spec.passing ?? '—';
  const ratio = spec.plan && spec.inComp ? (spec.inComp / spec.plan).toFixed(1) + 'x' : '—';
  const badgeHtml = myScore !== null && spec.passing ? `<span class="badge ${status}">${statusLabel(status)}</span>` : '';
  div.innerHTML = `
    <div class="card-head">
      <div class="card-title-block">
        ${spec.groupName ? `<div class="card-tag">${spec.groupName}</div>` : ''}
        <div class="card-name">${spec.specName}</div>
      </div>
      <div class="card-right">
        <div>
          <div class="pass-score-val">${passStr}</div>
          <div class="pass-score-lbl">Проходной</div>
        </div>
        ${badgeHtml}
        <div class="chevron">▾</div>
      </div>
    </div>
    <div class="card-stats">
      <div class="stat"><div class="stat-val">${spec.plan||'—'}</div><div class="stat-lbl">Мест</div></div>
      <div class="stat"><div class="stat-val">${spec.totalApps||'—'}</div><div class="stat-lbl">Заявлений</div></div>
      <div class="stat"><div class="stat-val">${ratio}</div><div class="stat-lbl">Конкурс</div></div>
      <div class="stat"><div class="stat-val">${spec.inComp||'—'}</div><div class="stat-lbl">По конкурсу</div></div>
    </div>
    <div class="card-body">
      <div class="card-body-inner">
        <div class="hist-title">Распределение баллов</div>
        ${buildHist(spec)}
        ${buildNote(spec)}
      </div>
    </div>`;
  div.querySelector('.card-head').addEventListener('click', () => {
    const body = div.querySelector('.card-body');
    const chev = div.querySelector('.chevron');
    body.classList.toggle('open');
    chev.classList.toggle('open');
  });
  return div;
}

function buildHist(spec) {
  if (!spec.scoreRanges?.length) return '<p style="color:var(--text3);font-size:12px">Нет данных</p>';
  const max = Math.max(...spec.buckets, 1);
  let cum = 0, cutIdx = -1;
  for (let i = 0; i < spec.buckets.length; i++) {
    cum += spec.buckets[i];
    if (cutIdx === -1 && cum >= (spec.inComp || spec.plan || Infinity)) cutIdx = i;
  }
  return '<div class="histogram">' + spec.scoreRanges.map((r, i) => {
    const cnt = spec.buckets[i];
    const pct = Math.round(cnt / max * 100);
    const cls = cnt === 0 ? 'zero' : i === cutIdx ? 'cut' : i < cutIdx ? 'top' : '';
    const lo = bucketLow(r), hi = bucketHigh(r);
    const mine = myScore !== null && lo !== null && hi !== null && myScore >= lo && myScore <= hi;
    return `<div class="hist-row${mine?' my-row':''}">
      <div class="hist-lbl">${r}</div>
      <div class="hist-track"><div class="hist-fill ${cls}" style="width:${pct}%"></div></div>
      <div class="hist-count">${cnt}</div>
    </div>`;
  }).join('') + '</div>';
}

function buildNote(spec) {
  if (!spec.passing) return '';
  let extra = '';
  if (myScore !== null) {
    const d = myScore - spec.passing;
    extra = d >= 0
      ? ` · выше на <strong style="color:var(--accent)">+${d}</strong>`
      : ` · не хватает <strong style="color:var(--danger)">${-d}</strong>`;
  }
  return `<div class="pass-note"><div class="pass-dot"></div><span>Расчётный проходной: <strong>${spec.passing}</strong>${extra}</span></div>`;
}

function getStatus(p) {
  if (myScore === null || p === null) return 'neutral';
  const d = myScore - p;
  if (d >= 10) return 'safe';
  if (d >= 0) return 'risk';
  return 'below';
}
function statusLabel(s) {
  return {safe:'✅ В зоне', risk:'⚠️ Риск', below:'❌ Ниже', neutral:''}[s] || '';
}

$refBtn.addEventListener('click', async () => {
  $refBtn.classList.add('spin');
  dataCache = {};
  await loadAndRender();
  resetTimer();
  $refBtn.classList.remove('spin');
});
$retryBtn.addEventListener('click', () => { $errorScr.classList.add('hidden'); loadAndRender(); });

function startTimer() {
  countdown = REFRESH_MS / 1000;
  if (timer) clearInterval(timer);
  timer = setInterval(async () => {
    countdown--;
    updateCD();
    if (countdown <= 0) {
      dataCache = {};
      if (getActiveKeys().length > 0) await loadAndRender();
      resetTimer();
    }
  }, 1000);
}
function resetTimer() { countdown = REFRESH_MS / 1000; updateCD(); }
function updateCD() {
  const m = String(Math.floor(countdown / 60)).padStart(2,'0');
  const s = String(countdown % 60).padStart(2,'0');
  $countdown.textContent = m + ':' + s;
}

function showLoading() {
  $loading.classList.remove('hidden');
  $cards.classList.add('hidden');
  $errorScr.classList.add('hidden');
  $emptySCr.classList.add('hidden');
}
function showCards() {
  $cards.classList.remove('hidden');
  $loading.classList.add('hidden');
  $errorScr.classList.add('hidden');
  $emptySCr.classList.add('hidden');
}
function showEmpty() {
  $emptySCr.classList.remove('hidden');
  $loading.classList.add('hidden');
  $cards.classList.add('hidden');
  $errorScr.classList.add('hidden');
}
