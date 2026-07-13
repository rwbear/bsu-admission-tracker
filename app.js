const CORS_PROXY = 'https://corsproxy.io/?url=';
const BSU_BASE   = 'https://abit.bsu.by/formk1?id=';
const FACULTIES = [
  { id: 7,  label: 'Биологический',      short: 'Биол.' },
  { id: 22, label: 'Социокультурных',    short: 'Соц.' },
  { id: 32, label: 'Факультет 32',       short: 'Ф32'  },
  { id: 34, label: 'Факультет 34',       short: 'Ф34'  },
];
const REFRESH_INTERVAL_MS = 15 * 60 * 1000;
let allData = {};
let myScore = null;
let activeTab = FACULTIES[0].id;
let countdown = REFRESH_INTERVAL_MS / 1000;
let countdownTimer = null;
let themeOverride = null;
const $loadingScreen = document.getElementById('loading-screen');
const $errorScreen = document.getElementById('error-screen');
const $cardsContainer = document.getElementById('cards-container');
const $lastUpdated = document.getElementById('last-updated');
const $refreshBtn = document.getElementById('refresh-btn');
const $retryBtn = document.getElementById('retry-btn');
const $myScoreInput = document.getElementById('my-score');
const $applyBtn = document.getElementById('score-apply-btn');
const $facultyTabs = document.getElementById('faculty-tabs');
const $countdown = document.getElementById('refresh-countdown');
const $themeBtn = document.getElementById('theme-toggle');
(async function init() {
  loadPrefs();
  buildTabs();
  await fetchAllFaculties();
  renderActiveTab();
  startCountdown();
})();
function loadPrefs() {
  const saved = localStorage.getItem('bsu-tracker-score');
  if (saved) {
    myScore = parseInt(saved, 10);
    $myScoreInput.value = myScore;
  }
  const savedTheme = localStorage.getItem('bsu-tracker-theme');
  if (savedTheme) {
    themeOverride = savedTheme;
    document.documentElement.setAttribute('data-theme', savedTheme);
  }
}
function saveScore() {
  if (myScore !== null) localStorage.setItem('bsu-tracker-score', myScore);
}
$themeBtn.addEventListener('click', () => {
  const html = document.documentElement;
  const current = html.getAttribute('data-theme');
  const isDark = current === 'dark' || (!current && window.matchMedia('(prefers-color-scheme: dark)').matches);
  const next = isDark ? 'light' : 'dark';
  html.setAttribute('data-theme', next);
  localStorage.setItem('bsu-tracker-theme', next);
});
function buildTabs() {
  FACULTIES.forEach(f => {
    const btn = document.createElement('button');
    btn.className = 'tab-btn' + (f.id === activeTab ? ' active' : '');
    btn.textContent = f.label;
    btn.dataset.id = f.id;
    btn.addEventListener('click', () => {
      activeTab = f.id;
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.toggle('active', parseInt(b.dataset.id) === activeTab));
      renderActiveTab();
    });
    $facultyTabs.appendChild(btn);
  });
}
async function fetchAllFaculties() {
  showLoading();
  const results = await Promise.all(FACULTIES.map(f => fetchFaculty(f.id)));
  let anySuccess = false;
  FACULTIES.forEach((f, i) => {
    if (results[i] !== null) { allData[f.id] = results[i]; anySuccess = true; }
  });
  if (!anySuccess) { showError('Не удалось загрузить ни одного факультета.'); return; }
  const now = new Date();
  $lastUpdated.textContent = `Последнее обновление: ${now.toLocaleTimeString('ru-RU')}`;
  hideLoading();
}
async function fetchFaculty(id) {
  const url = CORS_PROXY + encodeURIComponent(BSU_BASE + id);
  try {
    const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const html = await res.text();
    return parseHTML(html, id);
  } catch (e) {
    console.warn('Fetch failed for id=' + id, e);
    return null;
  }
}
function parseHTML(html, facultyId) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  const specialties = [];
  const tables = doc.querySelectorAll('table');
  tables.forEach(table => {
    const headerCells = Array.from(table.querySelectorAll('th, thead td'));
    let scoreRanges = [];
    headerCells.forEach(th => {
      const t = th.textContent.trim();
      if (/\d+\s*(и более|[-–]\s*\d+)/.test(t)) scoreRanges.push(t.replace(/\s+/g, ' ').trim());
    });
    if (scoreRanges.length === 0) return;
    const rows = table.querySelectorAll('tbody tr');
    rows.forEach(row => {
      const cells = Array.from(row.querySelectorAll('td'));
      if (cells.length < 4) return;
      let specialtyName = '';
      let groupName = '';
      let planTotal = 0;
      let totalApplicants = 0;
      let bucketCounts = [];
      let withinCompetition = 0;
      const cellTexts = cells.map(c => c.textContent.trim());
      const numCols = cells.length;
      if (numCols >= scoreRanges.length + 3) {
        bucketCounts = cellTexts.slice(numCols - scoreRanges.length).map(v => parseInt(v) || 0);
        planTotal = parseInt(cellTexts[2]) || parseInt(cellTexts[3]) || 0;
        totalApplicants = parseInt(cellTexts[numCols - scoreRanges.length - 1]) || 0;
        withinCompetition = parseInt(cellTexts[numCols - scoreRanges.length - 2]) || totalApplicants;
        groupName = cellTexts[0];
        specialtyName = cellTexts[1] || cellTexts[0];
      } else {
        return;
      }
      if (!specialtyName || bucketCounts.length === 0) return;
      if (bucketCounts.every(v => v === 0) && totalApplicants === 0) return;
      const passingScore = estimatePassingScore(scoreRanges, bucketCounts, planTotal, withinCompetition);
      specialties.push({ facultyId, groupName: groupName !== specialtyName ? groupName : '', specialtyName, planTotal, totalApplicants, withinCompetition, scoreRanges, bucketCounts, passingScore });
    });
  });
  return specialties.length > 0 ? specialties : null;
}
function estimatePassingScore(ranges, counts, plan, inCompetition) {
  if (!plan || plan === 0) return null;
  let cumulative = 0;
  for (let i = 0; i < ranges.length; i++) {
    cumulative += counts[i];
    if (cumulative >= plan) return parseBucketLow(ranges[i]);
  }
  return null;
}
function parseBucketLow(rangeStr) {
  const moreMatch = rangeStr.match(/^(\d+)\s*(и более|и выше)/i);
  if (moreMatch) return parseInt(moreMatch[1]);
  const rangeMatch = rangeStr.match(/(\d+)\s*[-–]\s*(\d+)/);
  if (rangeMatch) return Math.min(parseInt(rangeMatch[1]), parseInt(rangeMatch[2]));
  return null;
}
function parseBucketHigh(rangeStr) {
  const moreMatch = rangeStr.match(/^(\d+)\s*(и более|и выше)/i);
  if (moreMatch) return parseInt(moreMatch[1]) + 10;
  const rangeMatch = rangeStr.match(/(\d+)\s*[-–]\s*(\d+)/);
  if (rangeMatch) return Math.max(parseInt(rangeMatch[1]), parseInt(rangeMatch[2]));
  return null;
}
function renderActiveTab() {
  $cardsContainer.innerHTML = '';
  const data = allData[activeTab];
  if (!data || data.length === 0) {
    $cardsContainer.innerHTML = `<p style="color:var(--text-2);padding:40px 0;text-align:center;">Нет данных для этого факультета. Возможно, страница не загрузилась.</p>`;
    $cardsContainer.classList.remove('hidden');
    return;
  }
  data.forEach((spec, idx) => {
    const card = buildCard(spec, idx);
    $cardsContainer.appendChild(card);
  });
  $cardsContainer.classList.remove('hidden');
}
function buildCard(spec, idx) {
  const { status, statusText } = getStatus(spec.passingScore);
  const card = document.createElement('div');
  card.className = `spec-card status-${status}`;
  const totalFmt = spec.totalApplicants || '—';
  const planFmt = spec.planTotal || '—';
  const compFmt = spec.withinCompetition || '—';
  const passFmt = spec.passingScore ? spec.passingScore : '—';
  const compRatio = spec.planTotal && spec.withinCompetition ? (spec.withinCompetition / spec.planTotal).toFixed(1) : '—';
  card.innerHTML = `
    <div class="card-header" id="header-${idx}">
      <div class="card-title-area">
        <div class="card-faculty-tag">${FACULTIES.find(f=>f.id===spec.facultyId)?.label || 'BSU'}</div>
        <div class="card-specialty-name">${spec.specialtyName}</div>
        ${spec.groupName ? `<div class="card-group-name">${spec.groupName}</div>` : ''}
      </div>
      <div class="card-header-right">
        <div class="card-passing-score">
          <div class="passing-score-value">${passFmt}</div>
          <div class="passing-score-label">Проходной</div>
        </div>
        ${myScore !== null ? `<span class="status-badge ${status}">${statusText}</span>` : ''}
        <div class="card-collapse-icon" id="icon-${idx}">▾</div>
      </div>
    </div>
    <div class="card-stats">
      <div class="stat-item"><div class="stat-value">${planFmt}</div><div class="stat-label">Мест (план)</div></div>
      <div class="stat-item"><div class="stat-value">${totalFmt}</div><div class="stat-label">Заявлений</div></div>
      <div class="stat-item"><div class="stat-value">${compRatio}x</div><div class="stat-label">Конкурс</div></div>
      <div class="stat-item"><div class="stat-value">${compFmt}</div><div class="stat-label">По конкурсу</div></div>
    </div>
    <div class="card-body" id="body-${idx}">
      <div class="card-body-inner">
        <div class="chart-section-title">Распределение баллов</div>
        ${buildHistogram(spec, idx)}
        ${buildPassingIndicator(spec)}
      </div>
    </div>`;
  card.querySelector(`#header-${idx}`).addEventListener('click', () => {
    const body = card.querySelector(`#body-${idx}`);
    const icon = card.querySelector(`#icon-${idx}`);
    const isOpen = body.classList.toggle('expanded');
    icon.classList.toggle('open', isOpen);
  });
  return card;
}
function buildHistogram(spec, idx) {
  const { scoreRanges, bucketCounts, passingScore, planTotal } = spec;
  if (!scoreRanges || scoreRanges.length === 0) return '<p style="color:var(--text-3);font-size:12px;">Нет данных гистограммы</p>';
  const maxCount = Math.max(...bucketCounts, 1);
  let cumulative = 0;
  let passingBucketIdx = -1;
  for (let i = 0; i < scoreRanges.length; i++) {
    cumulative += bucketCounts[i];
    if (passingBucketIdx === -1 && cumulative >= (planTotal || Infinity)) passingBucketIdx = i;
  }
  let rows = '';
  scoreRanges.forEach((range, i) => {
    const count = bucketCounts[i];
    const pct = Math.round((count / maxCount) * 100);
    const isHighlight = i === passingBucketIdx;
    const isTop = i < passingBucketIdx;
    const barClass = count === 0 ? 'zero' : isHighlight ? 'highlight' : isTop ? 'top' : '';
    const low = parseBucketLow(range);
    const high = parseBucketHigh(range);
    const myScoreInBucket = myScore !== null && myScore >= low && myScore <= high;
    rows += `<div class="hist-row" style="${myScoreInBucket ? 'background:var(--warn-dim);border-radius:4px;' : ''}"><div class="hist-label">${range}</div><div class="hist-bar-wrap"><div class="hist-bar ${barClass}" style="width:${pct}%"></div></div><div class="hist-count">${count}</div></div>`;
  });
  return `<div class="histogram">${rows}</div>`;
}
function buildPassingIndicator(spec) {
  if (!spec.passingScore) return '';
  let extra = '';
  if (myScore !== null) {
    const diff = myScore - spec.passingScore;
    if (diff >= 0) extra = ` · Ты выше на <strong style="color:var(--accent)">+${diff}</strong>`;
    else extra = ` · Тебе не хватает <strong style="color:var(--danger)">${Math.abs(diff)}</strong>`;
  }
  return `<div class="passing-indicator"><div class="passing-indicator-dot"></div><div class="passing-indicator-text">Расчётный проходной: <strong>${spec.passingScore}</strong>${extra}</div></div>`;
}
function getStatus(passingScore) {
  if (myScore === null || passingScore === null) return { status: 'neutral', statusText: '' };
  const diff = myScore - passingScore;
  if (diff >= 10) return { status: 'safe', statusText: '✅ В зоне' };
  if (diff >= 0) return { status: 'risk', statusText: '⚠️ Риск' };
  return { status: 'below', statusText: '❌ Ниже' };
}
$applyBtn.addEventListener('click', applyScore);
$myScoreInput.addEventListener('keydown', e => { if (e.key === 'Enter') applyScore(); });
function applyScore() {
  const val = parseInt($myScoreInput.value, 10);
  if (!isNaN(val) && val >= 0 && val <= 500) {
    myScore = val;
    saveScore();
    renderActiveTab();
  }
}
$refreshBtn.addEventListener('click', async () => {
  $refreshBtn.classList.add('spinning');
  await fetchAllFaculties();
  renderActiveTab();
  resetCountdown();
  $refreshBtn.classList.remove('spinning');
});
$retryBtn.addEventListener('click', async () => {
  hideError();
  await fetchAllFaculties();
  renderActiveTab();
});
function startCountdown() {
  countdown = REFRESH_INTERVAL_MS / 1000;
  if (countdownTimer) clearInterval(countdownTimer);
  countdownTimer = setInterval(async () => {
    countdown--;
    updateCountdownDisplay();
    if (countdown <= 0) {
      await fetchAllFaculties();
      renderActiveTab();
      resetCountdown();
    }
  }, 1000);
}
function resetCountdown() {
  countdown = REFRESH_INTERVAL_MS / 1000;
  updateCountdownDisplay();
}
function updateCountdownDisplay() {
  const m = Math.floor(countdown / 60).toString().padStart(2, '0');
  const s = (countdown % 60).toString().padStart(2, '0');
  $countdown.textContent = `${m}:${s}`;
}
function showLoading() {
  $loadingScreen.classList.remove('hidden');
  $errorScreen.classList.add('hidden');
  $cardsContainer.classList.add('hidden');
}
function hideLoading() { $loadingScreen.classList.add('hidden'); }
function showError(msg) {
  document.getElementById('error-message').textContent = msg;
  $errorScreen.classList.remove('hidden');
  $loadingScreen.classList.add('hidden');
  $cardsContainer.classList.add('hidden');
}
function hideError() { $errorScreen.classList.add('hidden'); }
