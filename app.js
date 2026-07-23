/* ============================================================
   Pathspire — app.js
   All modules: Nav · Dashboard · Grades · Activities ·
                Personal Statement · Interview Coach · Schools
   ============================================================ */

'use strict';

/* ──────────────────────────────────────────
   STATE
────────────────────────────────────────── */
const state = {
  lang: 'en',
  profile: null,
  grades: { DSE: {}, AP: {}, ALEVEL: {}, IB: {}, bonus: 0, gpa: null },
  activities: [],
  ps: { step: 1, generated: '' },
  interview: {
    active: false,
    stream: null,
    questions: [],
    qIndex: 0,
    category: 'general',
    tipInterval: null,
    frameInterval: null,
    sessionData: { anxiety: [], confidence: [], pace: [] },
    micActive: false,
    speechRec: null,
    wordsPerMin: 0,
    wordBuffer: [],
    startTime: null
  },
  schools: []
};

/* ──────────────────────────────────────────
   TRANSLATIONS
────────────────────────────────────────── */
const T = {
  en: {
    noActivities: 'No activities added yet. Click "+ Add Activity" to get started.',
    actDeleted: 'Activity removed.',
    actSaved: 'Activity saved!',
    profileSaved: 'Profile saved!',
    fillName: 'Please enter your name.',
    fillCurriculum: 'Please select a curriculum.',
    gradesSaved: 'Grades analysed!',
    psGenerated: 'Personal statement generated!',
    psCopied: 'Copied to clipboard!',
    psDownloaded: 'Downloaded!',
    interviewStarted: 'Session started. Good luck!',
    interviewStopped: 'Session ended.',
    camError: 'Camera access denied. Please allow camera permission.',
    runMatch: 'AI match complete!',
    langBtn: '繁中',
    anxietyLabel: 'Anxiety',
    confLabel: 'Confidence',
    paceLabel: 'Pace'
  },
  zh: {
    noActivities: '尚未添加任何活動。點擊「+ 添加活動」開始。',
    actDeleted: '活動已刪除。',
    actSaved: '活動已儲存！',
    profileSaved: '檔案已儲存！',
    fillName: '請輸入你的姓名。',
    fillCurriculum: '請選擇課程體系。',
    gradesSaved: '成績已分析！',
    psGenerated: '個人陳述已生成！',
    psCopied: '已複製到剪貼板！',
    psDownloaded: '已下載！',
    interviewStarted: '練習開始，加油！',
    interviewStopped: '練習已結束。',
    camError: '攝像頭訪問被拒絕，請允許權限。',
    runMatch: 'AI 配對完成！',
    langBtn: 'English',
    anxietyLabel: '焦慮',
    confLabel: '自信',
    paceLabel: '語速'
  }
};

function t(key) { return T[state.lang][key] || key; }

/* ──────────────────────────────────────────
   NAVIGATION
────────────────────────────────────────── */
function goHome() {
  showSection('landing');
}

function showSection(id) {
  if (!state.profile && id !== 'landing' && id !== 'dashboard') {
    id = 'dashboard';
  }

  document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
  const el = document.getElementById(id);
  if (el) el.classList.add('active');
  document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
  document.querySelectorAll(`.nav-link[onclick*="${id}"]`).forEach(l => l.classList.add('active'));
  window.scrollTo({ top: 0, behavior: 'smooth' });

  if (id === 'dashboard') {
    const profileSetup = document.getElementById('profileSetup');
    const dashboardGrid = document.getElementById('dashboardGrid');
    if (profileSetup && dashboardGrid) {
      if (!state.profile) {
        profileSetup.style.display = 'block';
        dashboardGrid.style.display = 'none';
      } else {
        profileSetup.style.display = 'none';
        dashboardGrid.style.display = 'grid';
      }
    }
  }

  // Close mobile menu
  document.getElementById('navLinks').classList.remove('open');
}

function openProfileEditor() {
  showSection('dashboard');
  const form = document.getElementById('profileSetup');
  const grid = document.getElementById('dashboardGrid');
  if (form) form.style.display = 'block';
  if (grid) grid.style.display = 'none';
  populateProfileForm();
  const nameInput = document.getElementById('userName');
  if (nameInput) nameInput.focus();
}

function toggleMenu() {
  document.getElementById('navLinks').classList.toggle('open');
}

/* ──────────────────────────────────────────
   LANGUAGE TOGGLE
────────────────────────────────────────── */
function toggleLang() {
  state.lang = state.lang === 'en' ? 'zh' : 'en';
  document.getElementById('langBtn').textContent = t('langBtn');
  document.querySelectorAll('[data-en]').forEach(el => {
    el.textContent = state.lang === 'zh' ? el.dataset.zh : el.dataset.en;
  });
  // Update dynamic labels
  const al = document.getElementById('anxietyLabel');
  const cl = document.getElementById('confLabel');
  const pl = document.getElementById('paceLabel');
  if (al) al.textContent = t('anxietyLabel');
  if (cl) cl.textContent = t('confLabel');
  if (pl) pl.textContent = t('paceLabel');
  updateMainActionButton();
  generateCareerTimeline();
  renderActivities();
}

/* ──────────────────────────────────────────
   TOAST
────────────────────────────────────────── */
function toast(msg, type = 'info') {
  const c = document.getElementById('toastContainer');
  const d = document.createElement('div');
  d.className = `toast ${type}`;
  const icon = { info: 'fa-info-circle', success: 'fa-check-circle', error: 'fa-exclamation-circle' };
  d.innerHTML = `<i class="fas ${icon[type] || 'fa-info-circle'}"></i>${msg}`;
  c.appendChild(d);
  setTimeout(() => d.remove(), 3500);
}

/* ──────────────────────────────────────────
   DASHBOARD
────────────────────────────────────────── */
function saveProfile() {
  const name = document.getElementById('userName').value.trim();
  const curr = document.getElementById('userCurriculum').value;
  const major = document.getElementById('targetMajor').value.trim();
  const program = document.getElementById('targetProgram').value.trim();
  const regions = [...document.getElementById('targetRegion').selectedOptions].map(o => o.value);
  if (!name) { toast(t('fillName'), 'error'); return; }
  if (!curr) { toast(t('fillCurriculum'), 'error'); return; }
  state.profile = { name, curriculum: curr, major, program, regions };
  localStorage.setItem('pathspire_profile', JSON.stringify(state.profile));
  document.getElementById('profileSetup').style.display = 'none';
  document.getElementById('dashboardGrid').style.display = 'grid';
  updateMainActionButton();
  switchCurriculum(curr);
  renderDashboard();
  generateCareerTimeline();
  toast(t('profileSaved'), 'success');
}

function populateProfileForm() {
  if (!state.profile) return;
  const nameInput = document.getElementById('userName');
  const currInput = document.getElementById('userCurriculum');
  const majorInput = document.getElementById('targetMajor');
  const programInput = document.getElementById('targetProgram');
  const regionInput = document.getElementById('targetRegion');

  if (nameInput) nameInput.value = state.profile.name || '';
  if (currInput) currInput.value = state.profile.curriculum || '';
  if (majorInput) majorInput.value = state.profile.major || '';
  if (programInput) programInput.value = state.profile.program || '';
  if (regionInput) {
    Array.from(regionInput.options).forEach(opt => {
      opt.selected = (state.profile.regions || []).includes(opt.value);
    });
  }
}

function updateMainActionButton() {
  const btn = document.getElementById('mainActionBtn');
  if (!btn) return;
  const isProfileReady = !!state.profile;
  btn.textContent = state.lang === 'zh'
    ? (isProfileReady ? '個人檔案' : '建立檔案')
    : (isProfileReady ? 'Profile' : 'Create Profile');
}

function renderDashboard() {
  if (!state.profile) return;
  const p = state.profile;
  document.getElementById('dashProfile').innerHTML = `
    <div style="display:flex;flex-direction:column;gap:8px">
      <div style="font-size:1.2rem;font-weight:800">${p.name}</div>
      <div style="color:var(--text2);font-size:0.875rem">${p.curriculum} · ${p.major || 'Undecided'}${p.program ? ` · ${p.program}` : ''}</div>
      <div style="font-size:0.8rem;color:var(--text3)">${p.regions.join(', ') || 'No regions selected'}</div>
    </div>`;
  updateProgressChecklist();
  renderAITips();
  renderDashboardScoreSummary();
}

function renderDashboardScoreSummary() {
  const el = document.getElementById('dashScores');
  if (!el) return;
  const curriculum = state.profile?.curriculum || 'DSE';
  const grades = state.grades[curriculum] || {};
  const subjectCount = Object.keys(grades).filter(key => key !== '_bonus').length;
  const gpa = state.grades.gpa;

  let metric = '—';
  if (curriculum === 'DSE') {
    const vals = Object.values(grades).map(g => DSE_POINTS[g] || 0).filter(v => v > 0);
    if (vals.length) metric = `${vals.sort((a, b) => b - a).slice(0, 5).reduce((a, b) => a + b, 0)} pts`;
  } else if (curriculum === 'AP') {
    const vals = Object.values(grades).filter(v => typeof v === 'number');
    if (vals.length) metric = `${(vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(1)} / 5`;
  } else if (curriculum === 'ALEVEL') {
    const vals = Object.values(grades).map(g => AL_POINTS[g] || 0).filter(v => v > 0);
    if (vals.length) metric = `${vals.length} subjects`;
  } else if (curriculum === 'IB') {
    const vals = Object.values(grades).filter(v => typeof v === 'number' && v <= 7);
    const bonus = grades['_bonus'] || 0;
    const total = vals.reduce((a, b) => a + b, 0) + bonus;
    if (vals.length) metric = `${total} / 45`;
  }

  const gpaText = gpa != null && gpa !== ''
    ? `${Number(gpa).toFixed(1)} / 5.0`
    : (state.lang === 'zh' ? 'N/A' : 'N/A');

  el.innerHTML = `
    <div class="score-summary-stack">
      <div class="score-pill"><span class="score-pill-label">${state.lang === 'zh' ? '課程' : 'Curriculum'}</span><strong>${curriculum}</strong></div>
      <div class="score-pill"><span class="score-pill-label">${state.lang === 'zh' ? '已輸入科目' : 'Subjects entered'}</span><strong>${subjectCount}</strong></div>
      <div class="score-pill"><span class="score-pill-label">${state.lang === 'zh' ? '估算指標' : 'Estimated metric'}</span><strong>${metric}</strong></div>
      <div class="score-pill"><span class="score-pill-label">${state.lang === 'zh' ? '估算 GPA' : 'Estimated GPA'}</span><strong>${gpaText}</strong></div>
    </div>`;
}

function updateProgressChecklist() {
  const checks = {
    'chk-grades': Object.keys(state.grades[state.profile?.curriculum || 'DSE'] || {}).length > 0,
    'chk-activities': state.activities.length > 0,
    'chk-ps': state.ps.generated.length > 0,
    'chk-interview': state.interview.sessionData.confidence.length > 0
  };
  Object.entries(checks).forEach(([id, done]) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.classList.toggle('done', done);
    el.querySelector('i').className = done ? 'fas fa-check-circle' : 'fas fa-circle';
  });
}

function renderAITips() {
  const tips = generateAITips();
  const el = document.getElementById('dashRecommendations');
  if (!el) return;
  el.innerHTML = tips.map(t => `<div class="ai-tip">${t}</div>`).join('');
}

function generateAITips() {
  const tips = [];
  const p = state.profile;
  if (!p) return tips;
  tips.push(`Welcome, ${p.name}! Your journey to ${p.regions[0] || 'your dream university'} starts here.`);
  if (Object.keys(state.grades[p.curriculum] || {}).length === 0)
    tips.push(`Add your ${p.curriculum} grades to unlock personalised school recommendations.`);
  if (state.activities.length < 3)
    tips.push('Universities love well-rounded students. Aim to list at least 5 meaningful activities.');
  if (!state.ps.generated)
    tips.push('Start your Personal Statement early — great essays take multiple drafts.');
  tips.push('Tip: Practise interview answers out loud. Hearing yourself builds confidence faster.');
  if (p.regions.includes('UK'))
    tips.push('UCAS personal statement is 4,000 characters. Focus on your subject passion first.');
  if (p.regions.includes('US'))
    tips.push('Common App essay is 650 words. Show your unique perspective, not just achievements.');
  return tips;
}

function updateCurriculumUI() {
  const curr = document.getElementById('userCurriculum').value;
  if (curr) switchCurriculum(curr, null);
}

/* ──────────────────────────────────────────
   GRADES — DATA
────────────────────────────────────────── */
const SUBJECTS = {
  DSE: {
    core: ['Chinese Language', 'English Language', 'Mathematics', 'Liberal Studies / Citizenship & Social Development'],
    electives: ['Biology', 'Chemistry', 'Physics', 'Economics', 'Geography', 'History', 'Business, Accounting & Financial Studies',
      'Information & Communication Technology', 'Music', 'Visual Arts', 'Tourism & Hospitality Studies',
      'Technology & Living', 'Chinese Literature', 'Literature in English', 'Chinese History', 'Ethics & Religious Studies',
      'Physical Education', 'Design & Applied Technology']
  },
  AP: [
    'AP 2D Art and Design', 'AP 3D Art and Design', 'AP Art History', 'AP Drawing', 'AP Music Theory',
    'AP English Language and Composition', 'AP English Literature and Composition',
    'AP African American Studies', 'AP Comparative Government and Politics', 'AP European History', 'AP Human Geography', 'AP Macroeconomics', 'AP Microeconomics', 'AP Psychology', 'AP United States Government and Politics', 'AP United States History', 'AP World History: Modern',
    'AP Calculus AB', 'AP Calculus BC', 'AP Computer Science A', 'AP Computer Science Principles', 'AP Precalculus', 'AP Statistics',
    'AP Biology', 'AP Chemistry', 'AP Environmental Science', 'AP Physics 1: Algebra-Based', 'AP Physics 2: Algebra-Based', 'AP Physics C: Electricity and Magnetism', 'AP Physics C: Mechanics',
    'AP Chinese Language and Culture', 'AP French Language and Culture', 'AP German Language and Culture', 'AP Italian Language and Culture', 'AP Japanese Language and Culture', 'AP Latin', 'AP Spanish Language and Culture', 'AP Spanish Literature and Culture',
    'AP Seminar', 'AP Research'
  ],
  ALEVEL: ['Mathematics', 'Further Mathematics', 'Physics', 'Chemistry', 'Biology', 'Economics',
    'Business Studies', 'Computer Science', 'Geography', 'History', 'Psychology', 'Sociology',
    'English Literature', 'English Language', 'Art & Design', 'Music', 'Drama', 'Law',
    'French', 'German', 'Spanish', 'Chinese', 'Accounting', 'Physical Education'],
  IB: {
    hl: ['Mathematics: Analysis', 'Mathematics: Applications', 'Physics', 'Chemistry', 'Biology',
      'Computer Science', 'Economics', 'History', 'Geography', 'Psychology',
      'English A: Literature', 'English A: Language & Literature', 'Chinese A', 'French B', 'Spanish B',
      'Visual Arts', 'Film', 'Music', 'Business Management', 'Global Politics'],
    sl: ['Mathematics: Analysis SL', 'Mathematics: Applications SL', 'Physics SL', 'Chemistry SL', 'Biology SL',
      'Economics SL', 'History SL', 'Geography SL', 'Psychology SL', 'English B SL', 'Chinese B SL']
  }
};

const DSE_GRADES = ['5**', '5*', '5', '4', '3', '2', '1', 'U'];
const ALEVEL_GRADES = ['A*', 'A', 'B', 'C', 'D', 'E', 'U'];
const IB_GRADES = ['7', '6', '5', '4', '3', '2', '1'];

function gradeSelect(id, options, extraClass = '') {
  return `<select class="subject-select ${extraClass}" id="${id}" onchange="onGradeChange()">
    <option value="">Grade</option>
    ${options.map(g => `<option value="${g}">${g}</option>`).join('')}
  </select>`;
}

function subjectCard(id, label, isCore, inputHtml, actionsHtml = '') {
  return `<div class="subject-card" data-subject-id="${id}">
    <div class="subject-name">
      <span>${label}</span>
      <div class="subject-meta">
        ${isCore ? '<span class="badge-core">Core</span>' : ''}
        ${actionsHtml}
      </div>
    </div>
    ${inputHtml}
  </div>`;
}

function initGrades() {
  renderAPSearchResults('');

  // DSE
  const dseEl = document.getElementById('dseSubjects');
  let dseHtml = SUBJECTS.DSE.core.map((s, i) =>
    subjectCard(`dse_core_${i}`, s, true, gradeSelect(`dse_core_${i}`, DSE_GRADES))
  ).join('');
  dseHtml += SUBJECTS.DSE.electives.slice(0, 3).map((s, i) =>
    subjectCard(`dse_elec_${i}`, s, false, gradeSelect(`dse_elec_${i}`, DSE_GRADES))
  ).join('');
  dseEl.innerHTML = dseHtml;

  // AP
  const apEl = document.getElementById('apSubjects');
  apEl.innerHTML = SUBJECTS.AP.slice(0, 5).map((s, i) => {
    const id = `ap_${i}`;
    return subjectCard(id, s, false,
      `<input type="number" class="subject-input" id="${id}" min="1" max="5" placeholder="1–5" inputmode="numeric" oninput="limitAPScore(this)" onchange="onGradeChange()" />`,
      `<button class="subject-delete-btn" onclick="removeAPSubject('${id}')" title="Remove">×</button>`);
  }).join('');
  renderAPRecommendation();
  const alEl = document.getElementById('alevelSubjects');
  alEl.innerHTML = SUBJECTS.ALEVEL.slice(0, 4).map((s, i) =>
    subjectCard(`al_${i}`, s, false, gradeSelect(`al_${i}`, ALEVEL_GRADES))
  ).join('');

  // IB
  const ibEl = document.getElementById('ibSubjects');
  let ibHtml = SUBJECTS.IB.hl.slice(0, 3).map((s, i) =>
    subjectCard(`ib_hl_${i}`, `${s} (HL)`, false, gradeSelect(`ib_hl_${i}`, IB_GRADES))
  ).join('');
  ibHtml += SUBJECTS.IB.sl.slice(0, 3).map((s, i) =>
    subjectCard(`ib_sl_${i}`, `${s} (SL)`, false, gradeSelect(`ib_sl_${i}`, IB_GRADES))
  ).join('');
  ibEl.innerHTML = ibHtml;
}

function switchCurriculum(curr, btn) {
  const curriculum = curr || 'DSE';
  ['DSE','AP','ALEVEL','IB'].forEach(c => {
    const el = document.getElementById(`grade-${c}`);
    if (el) el.style.display = c === curriculum ? 'flex' : 'none';
  });

  document.querySelectorAll('.curr-tab').forEach(t => t.classList.remove('active'));
  const targetBtn = btn || document.querySelector(`.curr-tab[data-curr="${curriculum}"]`);
  if (targetBtn) targetBtn.classList.add('active');
}

function addCustomSubject(curriculum) {
  if (curriculum === 'AP') {
    const searchInput = document.getElementById('apSearchInput');
    const subjectName = searchInput ? searchInput.value.trim() : '';
    if (!subjectName) {
      toast(state.lang === 'zh' ? '請先選擇一個 AP 科目。' : 'Please choose an AP subject first.', 'error');
      return;
    }
    const match = SUBJECTS.AP.find(item => item.toLowerCase() === subjectName.toLowerCase());
    if (!match) {
      toast(state.lang === 'zh' ? '請從搜尋結果中選擇一個官方 AP 科目。' : 'Please choose an official AP subject from the search results.', 'error');
      return;
    }
    const container = document.getElementById('apSubjects');
    const idx = Date.now();
    const id = `custom_ap_${idx}`;
    const div = document.createElement('div');
    div.innerHTML = subjectCard(id, match, false, `<input type="number" class="subject-input" id="${id}" min="1" max="5" placeholder="1–5" inputmode="numeric" oninput="limitAPScore(this)" onchange="onGradeChange()" />`, `<button class="subject-delete-btn" onclick="removeAPSubject('${id}')" title="Remove">×</button>`);
    container.appendChild(div.firstChild);
    if (searchInput) searchInput.value = '';
    hideAPSearchResults();
    return;
  }

  const name = prompt(state.lang === 'zh' ? '請輸入科目名稱：' : 'Enter subject name:');
  if (!name) return;
  const container = document.getElementById(
    curriculum === 'DSE' ? 'dseSubjects' :
    curriculum === 'AP' ? 'apSubjects' :
    curriculum === 'ALEVEL' ? 'alevelSubjects' : 'ibSubjects'
  );
  const idx = Date.now();
  const id = `custom_${curriculum}_${idx}`;
  let inputHtml;
  if (curriculum === 'DSE') inputHtml = gradeSelect(id, DSE_GRADES);
  else if (curriculum === 'AP') inputHtml = `<input type="number" class="subject-input" id="${id}" min="1" max="5" placeholder="1–5" onchange="onGradeChange()" />`;
  else if (curriculum === 'ALEVEL') inputHtml = gradeSelect(id, ALEVEL_GRADES);
  else inputHtml = gradeSelect(id, IB_GRADES);
  const div = document.createElement('div');
  div.innerHTML = subjectCard(id, name, false, inputHtml);
  container.appendChild(div.firstChild);
}

function filterAPSubjects() {
  const value = document.getElementById('apSearchInput')?.value?.trim().toLowerCase() || '';
  renderAPSearchResults(value);
}

function renderAPSearchResults(query = '') {
  const resultsEl = document.getElementById('apSearchResults');
  if (!resultsEl) return;
  const normalized = (query || '').trim().toLowerCase();
  if (!normalized) {
    resultsEl.innerHTML = '';
    resultsEl.style.display = 'none';
    return;
  }
  const filtered = SUBJECTS.AP.filter(item => item.toLowerCase().includes(normalized));
  const items = filtered.slice(0, 12).map(item => `<div class="ap-search-item" onclick="selectAPSubject('${item.replace(/'/g, "\\'")}', this)">${item}</div>`).join('');
  resultsEl.innerHTML = items || `<div class="ap-search-item">${state.lang === 'zh' ? '沒有找到相關科目' : 'No matching subjects found'}</div>`;
  resultsEl.style.display = 'flex';
}

function hideAPSearchResults() {
  const resultsEl = document.getElementById('apSearchResults');
  if (resultsEl) {
    resultsEl.innerHTML = '';
    resultsEl.style.display = 'none';
  }
}

function selectAPSubject(subject, el) {
  const input = document.getElementById('apSearchInput');
  if (input) input.value = subject;
  document.querySelectorAll('.ap-search-item').forEach(item => item.classList.remove('active'));
  if (el) el.classList.add('active');
  hideAPSearchResults();
}

function limitAPScore(input) {
  const raw = input.value.trim();
  if (!raw) return;
  const value = parseInt(raw, 10);
  if (Number.isNaN(value)) {
    input.value = '';
    return;
  }
  if (value < 1) input.value = '1';
  else if (value > 5) input.value = '5';
  else input.value = String(value);
  onGradeChange();
}

function removeAPSubject(id) {
  const card = document.querySelector(`.subject-card[data-subject-id="${id}"]`);
  if (card) card.remove();
  renderAPRecommendation();
}

function renderAPRecommendation() {
  const container = document.getElementById('gradeAnalysis');
  if (!container || container.style.display === 'none') return;
  const subjectCards = document.querySelectorAll('#apSubjects .subject-card');
  const scores = Array.from(subjectCards).map(card => {
    const input = card.querySelector('input.subject-input');
    return input && input.value ? parseInt(input.value, 10) : null;
  }).filter(v => v !== null);
  const count = scores.length;
  const avg = scores.length ? (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1) : '—';
  const topScores = scores.filter(v => v >= 4).length;
  const recommendation = count >= 7 && topScores >= 5
    ? (state.lang === 'zh' ? '這是非常強的 AP 配置，適合衝刺頂尖大學。' : 'This is a very strong AP profile for top-tier university applications.')
    : count >= 5 && topScores >= 3
      ? (state.lang === 'zh' ? '這是良好的 AP 配置，適合中上游大學。' : 'This is a solid AP profile for strong universities.')
      : (state.lang === 'zh' ? '建議先把 AP 數量控制在 5–8 科，並把大多數分數提升到 4 或 5。' : 'Aiming for 5–8 APs with mostly 4s and 5s is a strong and realistic target.');
  const box = document.getElementById('apRecommendation');
  if (box) box.innerHTML = `<strong>${state.lang === 'zh' ? 'AP 建議' : 'AP Recommendation'}</strong><br>${state.lang === 'zh' ? `你目前有 ${count} 科 AP，平均分數 ${avg}，${recommendation}` : `You currently have ${count} APs, average score ${avg}, and ${recommendation}`}`;
}

function onGradeChange() {
  calcIBTotal();
}

function saveEstimatedGpa() {
  const input = document.getElementById('estimatedGpa');
  if (!input) return;
  const raw = input.value.trim();

  if (!raw || raw.toLowerCase() === 'na' || raw === '') {
    delete state.grades.gpa;
    input.value = '';
  } else {
    const parsed = parseFloat(raw);
    if (Number.isNaN(parsed)) {
      delete state.grades.gpa;
      input.value = '';
    } else {
      const clamped = Math.max(0, Math.min(5, parsed));
      state.grades.gpa = Number(clamped.toFixed(1));
      input.value = state.grades.gpa.toFixed(1);
    }
  }

  localStorage.setItem('pathspire_grades', JSON.stringify(state.grades));
  renderDashboard();
}

function populateEstimatedGpaInput() {
  const input = document.getElementById('estimatedGpa');
  if (!input) return;
  if (state.grades.gpa == null) {
    input.value = '';
  } else {
    input.value = state.grades.gpa.toFixed(1);
  }
}

function calcIBTotal() {
  const selects = document.querySelectorAll('#ibSubjects select');
  let total = 0;
  selects.forEach(s => { if (s.value) total += parseInt(s.value) || 0; });
  const bonus = parseInt(document.getElementById('ibBonus')?.value) || 0;
  total += bonus;
  const el = document.getElementById('ibTotalScore');
  if (el) el.textContent = total || '—';
}

function collectGrades(curriculum) {
  const grades = {};
  if (curriculum === 'DSE') {
    document.querySelectorAll('#dseSubjects select').forEach(s => {
      if (s.value) grades[s.id] = s.value;
    });
  } else if (curriculum === 'AP') {
    document.querySelectorAll('#apSubjects input').forEach(i => {
      if (i.value) grades[i.id] = parseInt(i.value);
    });
  } else if (curriculum === 'ALEVEL') {
    document.querySelectorAll('#alevelSubjects select').forEach(s => {
      if (s.value) grades[s.id] = s.value;
    });
  } else if (curriculum === 'IB') {
    document.querySelectorAll('#ibSubjects select').forEach(s => {
      if (s.value) grades[s.id] = parseInt(s.value);
    });
    grades['_bonus'] = parseInt(document.getElementById('ibBonus')?.value) || 0;
  }
  return grades;
}

const DSE_POINTS = { '5**': 7, '5*': 6, '5': 5, '4': 4, '3': 3, '2': 2, '1': 1, 'U': 0 };
const AL_POINTS = { 'A*': 6, 'A': 5, 'B': 4, 'C': 3, 'D': 2, 'E': 1, 'U': 0 };

function analyzeGrades() {
  // Find active curriculum tab
  const activeTab = document.querySelector('.curr-tab.active');
  const curr = activeTab ? activeTab.textContent.replace('HKD','D').replace('SE','SE').trim() : 'DSE';
  const currMap = { 'HKDSE': 'DSE', 'AP': 'AP', 'A-Level': 'ALEVEL', 'IB': 'IB' };
  const curriculum = currMap[curr] || curr;
  const grades = collectGrades(curriculum);
  state.grades[curriculum] = grades;
  localStorage.setItem('pathspire_grades', JSON.stringify(state.grades));

  const box = document.getElementById('gradeAnalysis');
  box.style.display = 'block';
  renderAPRecommendation();
  renderDashboard();

  let html = '';
  if (curriculum === 'DSE') {
    const vals = Object.values(grades).map(g => DSE_POINTS[g] || 0).filter(v => v > 0);
    const best5 = vals.sort((a,b) => b-a).slice(0,5).reduce((a,b) => a+b, 0);
    const avg = vals.length ? (vals.reduce((a,b)=>a+b,0)/vals.length).toFixed(1) : '—';
    html = analysisHTML('HKDSE Analysis', [
      { val: best5 || '—', lbl: 'Best 5 JUPAS Points' },
      { val: avg, lbl: 'Average Grade' },
      { val: vals.filter(v=>v>=5).length, lbl: 'Level 5+ Subjects' },
      { val: vals.filter(v=>v>=7).length, lbl: '5** Subjects' }
    ], dseCompetitiveness(best5));
  } else if (curriculum === 'AP') {
    const vals = Object.values(grades).filter(v => typeof v === 'number');
    const avg = vals.length ? (vals.reduce((a,b)=>a+b,0)/vals.length).toFixed(1) : '—';
    html = analysisHTML('AP Analysis', [
      { val: vals.length, lbl: 'Subjects Taken' },
      { val: avg, lbl: 'Average Score' },
      { val: vals.filter(v=>v===5).length, lbl: 'Score 5s' },
      { val: vals.filter(v=>v>=4).length, lbl: 'Score 4+' }
    ], apCompetitiveness(avg));
  } else if (curriculum === 'ALEVEL') {
    const vals = Object.values(grades).map(g => AL_POINTS[g] || 0).filter(v => v > 0);
    const stars = Object.values(grades).filter(g => g === 'A*').length;
    const As = Object.values(grades).filter(g => g === 'A' || g === 'A*').length;
    html = analysisHTML('A-Level Analysis', [
      { val: `${stars}A*${As}A`, lbl: 'Grade Profile' },
      { val: vals.length, lbl: 'Subjects' },
      { val: stars, lbl: 'A* Grades' },
      { val: As, lbl: 'A/A* Grades' }
    ], alevelCompetitiveness(stars, As));
  } else if (curriculum === 'IB') {
    const vals = Object.values(grades).filter(v => typeof v === 'number' && v <= 7);
    const bonus = grades['_bonus'] || 0;
    const total = vals.reduce((a,b)=>a+b,0) + bonus;
    const avg = vals.length ? (vals.reduce((a,b)=>a+b,0)/vals.length).toFixed(1) : '—';
    html = analysisHTML('IB Analysis', [
      { val: total + '/45', lbl: 'Predicted Total' },
      { val: avg, lbl: 'Average Subject Score' },
      { val: vals.filter(v=>v>=6).length, lbl: '6–7 Scores' },
      { val: bonus + '/3', lbl: 'TOK/EE Bonus' }
    ], ibCompetitiveness(total));
  }

  box.innerHTML = html;
  updateProgressChecklist();
  toast(t('gradesSaved'), 'success');
}

function analysisHTML(title, stats, competitiveness) {
  return `
    <h3>${title}</h3>
    <div id="apRecommendation" class="ap-recommendation" style="display:${title.includes('AP') ? 'block' : 'none'}"></div>
    <div class="analysis-grid">
      ${stats.map(s => `<div class="analysis-stat"><div class="val">${s.val}</div><div class="lbl">${s.lbl}</div></div>`).join('')}
    </div>
    <div class="ai-tip"><strong>Competitiveness:</strong> ${competitiveness}</div>
    <div style="margin-top:14px">
      <button class="btn-secondary" onclick="showSection('schools');runAIMatch()" style="margin-right:10px">
        <i class="fas fa-university"></i> View Matching Schools
      </button>
    </div>`;
}

function dseCompetitiveness(pts) {
  if (pts >= 30) return '🏆 Top tier — eligible for HKU Medicine, CUHK, and top UK/US universities.';
  if (pts >= 25) return '⭐ Strong — competitive for HKUST, CityU, PolyU, and target UK/AU universities.';
  if (pts >= 20) return '✅ Good — suitable for most local universities and safety international schools.';
  return '📚 Keep pushing — focus on core subjects and consider extra tutoring.';
}
function apCompetitiveness(avg) {
  const a = parseFloat(avg);
  if (a >= 4.5) return '🏆 Exceptional AP profile — strong for Ivy League, Oxbridge, and top-25 US universities.';
  if (a >= 4.0) return '⭐ Strong — competitive for top-50 US universities and Russell Group UK.';
  if (a >= 3.5) return '✅ Solid — suitable for good US universities and Hong Kong.';
  return '📚 Aim for 4+ in core subjects for better university options.';
}
function alevelCompetitiveness(stars, As) {
  if (stars >= 3) return '🏆 Excellent — meets requirements for Oxford/Cambridge and top medical schools.';
  if (As >= 3) return '⭐ Very strong — competitive for Russell Group and top HK universities.';
  if (As >= 2) return '✅ Good — suitable for most UK universities and HK programmes.';
  return '📚 Work toward A grades in your strongest subjects.';
}
function ibCompetitiveness(total) {
  if (total >= 40) return '🏆 Outstanding IB — competitive for Oxford, Cambridge, Ivy League, and NUS.';
  if (total >= 36) return '⭐ Strong — suitable for top UK/US/HK universities.';
  if (total >= 30) return '✅ Solid — good fit for mid-tier international universities.';
  return '📚 Focus on HL subjects to boost your total.';
}

/* ──────────────────────────────────────────
   ACTIVITIES
────────────────────────────────────────── */
let editingActivityId = null;

function selectActivityEntryType(type, btn) {
  document.getElementById('actEntryType').value = type;
  document.querySelectorAll('.entry-type-btn').forEach(b => b.classList.remove('active'));
  if (btn) btn.classList.add('active');
  const roleGroup = document.getElementById('actRoleGroup');
  const awardGroup = document.getElementById('actAwardGroup');
  if (roleGroup) roleGroup.style.display = type === 'other' ? 'block' : 'none';
  if (awardGroup) awardGroup.style.display = type === 'award' ? 'block' : 'none';
}

function openActivityModal(id = null) {
  document.getElementById('activityModal').style.display = 'flex';
  editingActivityId = id;
  const title = document.getElementById('activityModalTitle');
  if (title) title.textContent = id ? (state.lang === 'zh' ? '編輯活動' : 'Edit Activity') : (state.lang === 'zh' ? '添加活動' : 'Add Activity');
  ['actName','actType','actYears','actRole','actDesc','actAwards'].forEach(field => {
    document.getElementById(field).value = '';
  });
  document.getElementById('actEntryType').value = 'other';
  document.querySelectorAll('.entry-type-btn').forEach(b => b.classList.remove('active'));
  document.querySelector('.entry-type-btn:nth-of-type(3)')?.classList.add('active');
  const roleGroup = document.getElementById('actRoleGroup');
  const awardGroup = document.getElementById('actAwardGroup');
  if (roleGroup) roleGroup.style.display = 'block';
  if (awardGroup) awardGroup.style.display = 'none';

  if (id) {
    const act = state.activities.find(a => a.id === id);
    if (!act) return;
    document.getElementById('actName').value = act.name || '';
    document.getElementById('actType').value = act.type || '';
    document.getElementById('actYears').value = act.years || '';
    document.getElementById('actRole').value = act.role || '';
    document.getElementById('actDesc').value = act.desc || '';
    document.getElementById('actAwards').value = act.awards || '';
    document.getElementById('actEntryType').value = act.entryType || 'other';
    document.querySelectorAll('.entry-type-btn').forEach(b => b.classList.toggle('active', b.textContent.toLowerCase().includes(act.entryType || 'other')));
    const roleGroup = document.getElementById('actRoleGroup');
    const awardGroup = document.getElementById('actAwardGroup');
    if (roleGroup) roleGroup.style.display = (act.entryType || 'other') === 'other' ? 'block' : 'none';
    if (awardGroup) awardGroup.style.display = (act.entryType || 'other') === 'award' ? 'block' : 'none';
  }
}
function closeActivityModal() {
  document.getElementById('activityModal').style.display = 'none';
  editingActivityId = null;
}
function saveActivity() {
  const name = document.getElementById('actName').value.trim();
  if (!name) { toast('Please enter an activity name.', 'error'); return; }
  const act = {
    id: editingActivityId || Date.now(),
    name,
    type: document.getElementById('actType').value.trim(),
    entryType: document.getElementById('actEntryType').value || 'other',
    years: document.getElementById('actYears').value.trim(),
    role: document.getElementById('actRole').value.trim(),
    desc: document.getElementById('actDesc').value.trim(),
    awards: document.getElementById('actAwards').value.trim()
  };
  if (editingActivityId) {
    state.activities = state.activities.map(a => a.id === editingActivityId ? act : a);
  } else {
    state.activities.push(act);
  }
  localStorage.setItem('pathspire_activities', JSON.stringify(state.activities));
  closeActivityModal();
  renderActivities();
  updateProgressChecklist();
  toast(t('actSaved'), 'success');
}
function deleteActivity(id) {
  state.activities = state.activities.filter(a => a.id !== id);
  localStorage.setItem('pathspire_activities', JSON.stringify(state.activities));
  renderActivities();
  updateProgressChecklist();
  toast(t('actDeleted'));
}
function filterActivities(cat, btn) {
  document.querySelectorAll('.act-cat-btn').forEach(b => b.classList.remove('active'));
  if (btn) btn.classList.add('active');
  renderActivities(cat);
}
const CAT_LABELS = {
  award: 'Award', position: 'Position', other: 'Other'
};
const CAT_LABELS_ZH = {
  award: '獎項', position: '職位', other: '其他'
};
function renderActivities(filter = 'all') {
  const list = document.getElementById('activityList');
  if (!list) return;
  const filtered = filter === 'all' ? state.activities : state.activities.filter(a => a.entryType === filter);
  if (filtered.length === 0) {
    list.innerHTML = `<div style="color:var(--text3);font-size:0.875rem;padding:20px 0">${t('noActivities')}</div>`;
    return;
  }
  list.innerHTML = filtered.map(a => {
    const catLabel = state.lang === 'zh' ? (CAT_LABELS_ZH[a.entryType] || a.entryType) : (CAT_LABELS[a.entryType] || a.entryType);
    return `<div class="activity-item">
      <div class="act-left">
        <span class="act-cat-tag cat-${a.entryType || 'other'}">${catLabel}</span>
        <div class="act-title">${a.name}</div>
        <div class="act-meta">${[a.type, a.role, a.years].filter(Boolean).join(' · ')}</div>
        ${a.desc ? `<div class="act-desc">${a.desc}</div>` : ''}
        ${a.awards ? `<div class="act-awards"><i class="fas fa-trophy"></i> ${a.awards}</div>` : ''}
      </div>
      <div class="act-actions">
        <button class="icon-btn" onclick="openActivityModal(${a.id})" title="Edit"><i class="fas fa-edit"></i></button>
        <button class="icon-btn" onclick="deleteActivity(${a.id})" title="Delete"><i class="fas fa-trash"></i></button>
      </div>
    </div>`;
  }).join('');
}

/* ──────────────────────────────────────────
   PERSONAL STATEMENT
────────────────────────────────────────── */
let psCurrentStep = 1;
const PS_TOTAL_STEPS = 4;

function goPSStep(n) {
  psCurrentStep = n;
  for (let i = 1; i <= PS_TOTAL_STEPS; i++) {
    const form = document.getElementById(`psForm${i}`);
    const step = document.getElementById(`psstep${i}`);
    if (form) { form.classList.toggle('active', i === n); form.style.display = i === n ? 'flex' : 'none'; }
    if (step) step.classList.toggle('active', i === n);
  }
  document.getElementById('psPrevBtn').style.display = n > 1 ? 'inline-flex' : 'none';
  document.getElementById('psNextBtn').style.display = n < PS_TOTAL_STEPS ? 'inline-flex' : 'none';
}
function nextPSStep() { if (psCurrentStep < PS_TOTAL_STEPS) goPSStep(psCurrentStep + 1); }
function prevPSStep() { if (psCurrentStep > 1) goPSStep(psCurrentStep - 1); }

function generatePS() {
  const story = document.getElementById('psStory').value.trim();
  const unique = document.getElementById('psUnique').value.trim();
  const subjectWhy = document.getElementById('psSubjectWhy').value.trim();
  const academic = document.getElementById('psAcademic').value.trim();
  const shortGoal = document.getElementById('psShortGoal').value.trim();
  const longGoal = document.getElementById('psLongGoal').value.trim();
  const whyUni = document.getElementById('psWhyUni').value.trim();
  const whyUniDesc = document.getElementById('psWhyUniDesc').value.trim();
  const target = document.getElementById('psTarget').value;
  const wordLimit = parseInt(document.getElementById('psWordLimit').value) || 650;

  const psOutput = document.getElementById('psOutput');
  psOutput.innerHTML = '<div class="ai-loader">Generating your personal statement…</div>';

  setTimeout(() => {
    const ps = buildPersonalStatement({ story, unique, subjectWhy, academic, shortGoal, longGoal, whyUni, whyUniDesc, target, wordLimit });
    state.ps.generated = ps;
    localStorage.setItem('pathspire_ps', ps);

    const words = ps.split(/\s+/).filter(Boolean).length;
    psOutput.innerHTML = `<div style="white-space:pre-wrap;line-height:1.9">${ps}</div>`;
    document.getElementById('psWordCount').textContent = `${words} / ${wordLimit} words`;

    const suggestions = generatePSSuggestions(ps, target, wordLimit);
    const sugEl = document.getElementById('aiPSSuggestions');
    document.getElementById('psSuggestionList').innerHTML = suggestions.map(s => `<div class="ai-tip" style="margin-bottom:8px">${s}</div>`).join('');
    sugEl.style.display = 'block';

    updateProgressChecklist();
    toast(t('psGenerated'), 'success');
  }, 1600);
}

function buildPersonalStatement({ story, unique, subjectWhy, academic, shortGoal, longGoal, whyUni, whyUniDesc, target, wordLimit }) {
  const name = state.profile?.name || 'I';
  const subject = state.profile?.major || 'my chosen field';
  const uni = whyUni || 'this university';

  const intro = story
    ? `${story.charAt(0).toUpperCase() + story.slice(1).trim()}. This experience fundamentally shaped my understanding of ${subject} and ignited a passion I have pursued ever since.`
    : `From an early age, I have been captivated by the challenges and possibilities that ${subject} presents. It is a discipline that demands both rigorous analytical thinking and creative problem-solving—qualities I have spent years developing.`;

  const uniquePara = unique
    ? `What sets me apart is ${unique.charAt(0).toLowerCase() + unique.slice(1)}. I believe this perspective allows me to approach problems in ${subject} with a distinct lens, bridging theory and practice in ways that have consistently yielded meaningful results.`
    : '';

  const motivationPara = subjectWhy
    ? `My fascination with ${subject} deepened when ${subjectWhy.charAt(0).toLowerCase() + subjectWhy.slice(1)}. ${academic ? `Academically, I have pursued this curiosity through ${academic.charAt(0).toLowerCase() + academic.slice(1)}, each experience reinforcing my commitment to this field.` : ''}`
    : '';

  const goalPara = (shortGoal || longGoal)
    ? `At ${uni}, I aim to ${shortGoal ? shortGoal.charAt(0).toLowerCase() + shortGoal.slice(1) : 'deepen my expertise'}. ${longGoal ? `In the long term, I aspire to ${longGoal.charAt(0).toLowerCase() + longGoal.slice(1)}, using my education as a foundation for meaningful contribution.` : ''}`
    : '';

  const whyUniPara = whyUniDesc
    ? `${uni} represents the ideal environment for this ambition. ${whyUniDesc.charAt(0).toUpperCase() + whyUniDesc.slice(1)}.`
    : `I am drawn to ${uni} for its world-class faculty, vibrant intellectual community, and commitment to preparing graduates who make a genuine difference.`;

  const activities = state.activities.slice(0, 3);
  const actPara = activities.length > 0
    ? `Beyond academics, ${activities.map(a => `my role as ${a.role || 'a participant'} in ${a.name}`).join(', ')} has developed my leadership, teamwork, and resilience.`
    : '';

  const closing = target === 'UCAS'
    ? `I am eager to contribute to ${uni}'s academic community and to grow into a professional who bridges knowledge with impact. I look forward to the opportunity to do so.`
    : `I am confident that ${uni}'s programme aligns perfectly with my goals, and I am excited by the prospect of contributing to its community while pursuing excellence in ${subject}.`;

  const paragraphs = [intro, uniquePara, motivationPara, actPara, goalPara, whyUniPara, closing]
    .filter(Boolean)
    .map(p => p.trim());

  let fullText = paragraphs.join('\n\n');

  // Trim to approximate word limit
  const words = fullText.split(/\s+/);
  if (words.length > wordLimit) {
    fullText = words.slice(0, wordLimit).join(' ') + '…';
  }

  return fullText;
}

function generatePSSuggestions(ps, target, wordLimit) {
  const words = ps.split(/\s+/).filter(Boolean).length;
  const suggestions = [];
  if (words < wordLimit * 0.85) suggestions.push(`Your draft is ${words} words. Aim for ${Math.round(wordLimit * 0.9)}–${wordLimit} for maximum impact.`);
  if (!ps.includes('because') && !ps.includes('led me')) suggestions.push('Add specific reasons and causal language (e.g., "This led me to…", "because…") to strengthen your narrative arc.');
  if (target === 'UCAS') suggestions.push('UCAS tip: Admissions tutors spend ~2 minutes reading. Put your strongest point in paragraph 1.');
  if (target === 'CommonApp') suggestions.push('Common App tip: Show, don\'t tell. Replace adjectives with specific anecdotes and evidence.');
  suggestions.push('Read your statement aloud — any sentence that feels awkward when spoken should be revised.');
  suggestions.push('Ask a teacher or mentor to review for authentic "voice" — it should sound like you.');
  return suggestions;
}

function copyPS() {
  const text = state.ps.generated;
  if (!text) return;
  navigator.clipboard.writeText(text).then(() => toast(t('psCopied'), 'success'));
}
function downloadPS() {
  const text = state.ps.generated;
  if (!text) return;
  const blob = new Blob([text], { type: 'text/plain' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'pathspire_personal_statement.txt';
  a.click();
  toast(t('psDownloaded'), 'success');
}

/* ──────────────────────────────────────────
   INTERVIEW COACH — NEW VERSION
────────────────────────────────────────── */

// Interview state
const interviewState = {
  active: false,
  stream: null,
  questions: [],
  qIndex: 0,
  category: 'general',
  difficulty: 'medium',
  questionCount: 5,
  focusAreas: ['motivation', 'academic', 'extracurricular', 'future'],
  sessionData: { anxiety: [], confidence: [], pace: [], answers: [] },
  micActive: true,
  cameraActive: true,
  speechRec: null,
  wordsPerMin: 0,
  wordBuffer: [],
  startTime: null,
  questionStartTime: null,
  reported: false
};

// Interview question bank
const INTERVIEW_QUESTIONS = {
  general: {
    easy: [
      'Tell me about yourself and your background.',
      'Why are you interested in studying at our university?',
      'What are your greatest strengths?',
      'Describe a challenge you have overcome.',
      'What do you hope to achieve during your time at university?',
      'Why did you choose this field of study?',
      'Tell me about a book that has influenced you.',
      'What do you enjoy doing outside of academics?',
      'How do you handle stress and pressure?',
      'What makes you a good fit for our programme?'
    ],
    medium: [
      'Tell me about yourself and what drives your academic interests.',
      'Why this university specifically, and what do you hope to contribute?',
      'What are your greatest strengths and how will they serve you here?',
      'Describe a significant challenge you\'ve faced and what you learned from it.',
      'Where do you see yourself in five to ten years?',
      'What academic achievement are you most proud of and why?',
      'Tell me about a time you worked in a team. What was your role?',
      'How do you approach difficult problems or unfamiliar topics?',
      'What do you think makes a successful student at this university?',
      'Why should we choose you over other qualified candidates?'
    ],
    hard: [
      'Tell me about yourself in a way that reveals both your character and intellectual curiosity.',
      'Why this university? Be specific about programmes, faculty, and opportunities.',
      'What do you believe are the most pressing challenges in your field today?',
      'Describe a time you failed or made a significant mistake. What did you learn?',
      'Where do you see your career heading, and how does this programme fit?',
      'What academic project or research are you most passionate about?',
      'Tell me about a time you had to persuade others to see your perspective.',
      'How do you stay current with developments in your field?',
      'What unique perspective or experience would you bring to our community?',
      'If you could change one thing about your academic journey, what would it be?'
    ]
  },
  subject: {
    easy: [
      'Why are you passionate about this subject area?',
      'What sparked your interest in this field?',
      'Tell me about a project or assignment you enjoyed in this subject.',
      'What do you find most challenging about this subject?',
      'Who is a figure in this field that inspires you?'
    ],
    medium: [
      'What aspects of this subject do you find most compelling, and why?',
      'How have your academic experiences shaped your interest in this field?',
      'Tell me about a current issue in this field that interests you.',
      'What skills have you developed that are relevant to this subject?',
      'How does this subject connect to broader societal or global issues?'
    ],
    hard: [
      'What do you consider the most significant debate in your field today?',
      'How would you approach a research project in this area?',
      'What books or thinkers have shaped your understanding of this subject?',
      'How do you see the future of this field evolving over the next decade?',
      'What contribution would you like to make to this field?'
    ]
  },
  oxbridge: {
    medium: [
      'Let\'s begin with a question about your subject: What drew you to this field?',
      'Consider this thought experiment: How would you explain [subject concept] to a non-specialist?',
      'What do you think is the relationship between theory and practice in your field?',
      'Tell me about a time you had to think critically about a complex problem.',
      'How do you approach learning something completely new?',
      'What do you believe is the purpose of a university education?'
    ],
    hard: [
      'Let\'s test your thinking: How would you approach this problem from first principles?',
      'What are the limitations of current knowledge in your field?',
      'Consider the ethical implications of a recent development in your field.',
      'How would you design an experiment or study to test a hypothesis?',
      'What do you think is the relationship between your subject and society?',
      'Tell me about a time you disagreed with a teacher or mentor.'
    ]
  },
  medical: {
    medium: [
      'Why do you want to study medicine?',
      'What qualities do you think make a good doctor?',
      'Tell me about a time you helped someone in need.',
      'How do you handle stressful or emotionally difficult situations?',
      'What do you know about the current challenges in healthcare?'
    ],
    hard: [
      'What is your understanding of the role of a doctor in modern society?',
      'How would you handle a situation where you had to deliver bad news?',
      'What do you think are the biggest ethical challenges in medicine today?',
      'Tell me about a time you had to advocate for someone or something.',
      'What would you do if you saw a colleague making a mistake?',
      'How do you balance empathy with professional detachment?'
    ]
  },
  business: {
    medium: [
      'Why are you interested in studying business?',
      'What qualities make a good leader?',
      'Tell me about a time you demonstrated leadership.',
      'What do you think are the biggest challenges facing businesses today?',
      'How do you approach decision-making under uncertainty?'
    ],
    hard: [
      'What is your understanding of the role of business in society?',
      'Tell me about a business or entrepreneur that inspires you and why.',
      'How would you handle a situation where you had to make an unpopular decision?',
      'What do you think are the ethical responsibilities of businesses?',
      'Where do you see the future of your chosen industry heading?',
      'How do you stay informed about business and economic trends?'
    ]
  }
};

// Script for Dr. Path's introductions and transitions
const DR_PATH_SCRIPT = {
  intro: [
    "Good day! I'm Dr. Path from PATHS Admissions. Thank you for joining me today.",
    "I'm delighted to have this conversation with you. Let's begin with a few questions to get to know you better.",
    "Take your time with each answer — there's no rush. I'm here to listen and learn about you."
  ],
  transition: [
    "That's a very thoughtful answer. Let's move to our next question.",
    "Thank you for sharing that. Now, I'd like to ask you something a bit different.",
    "I appreciate your perspective on that. Let's explore another aspect of your experience."
  ],
  closing: [
    "Thank you for such a meaningful conversation today. I've really enjoyed learning about you.",
    "You've given me some excellent insights into your thinking and experiences. Thank you.",
    "That concludes our interview. I'm impressed by your thoughtful responses. Best of luck with your application!"
  ]
};

// Start interview session
function startInterviewSession() {
  const type = document.getElementById('interviewType').value;
  const difficulty = document.getElementById('interviewDifficulty').value;
  const count = parseInt(document.getElementById('interviewQuestionCount').value);
  
  // Get focus areas
  const focusCheckboxes = document.querySelectorAll('#interviewSetup input[type="checkbox"]:checked');
  const focusAreas = Array.from(focusCheckboxes).map(cb => cb.value);
  
  // Generate questions
  const questions = generateQuestions(type, difficulty, count, focusAreas);
  
  if (questions.length === 0) {
    toast('No questions available. Please try different settings.', 'error');
    return;
  }
  
  // Initialize interview state
  interviewState.questions = questions;
  interviewState.qIndex = 0;
  interviewState.difficulty = difficulty;
  interviewState.questionCount = questions.length;
  interviewState.focusAreas = focusAreas;
  interviewState.sessionData = { anxiety: [], confidence: [], pace: [], answers: [] };
  interviewState.startTime = Date.now();
  interviewState.reported = false;
  
  // Show call screen
  document.getElementById('interviewSetup').style.display = 'none';
  document.getElementById('interviewCall').style.display = 'block';
  document.getElementById('interviewReport').style.display = 'none';
  
  // Start camera
  startCamera();
// Display first question after a delay
setTimeout(() => {
  displayQuestion();
}, 2000);
  
  toast('Interview session started! Good luck!', 'success');
}

// Generate questions based on settings
function generateQuestions(type, difficulty, count, focusAreas) {
  let pool = [];
  
  // Get questions from selected type
  if (INTERVIEW_QUESTIONS[type]) {
    const level = INTERVIEW_QUESTIONS[type][difficulty] || INTERVIEW_QUESTIONS[type].medium;
    pool = [...level];
  }
  
  // Add general questions as fallback
  if (pool.length < count) {
    const generalPool = INTERVIEW_QUESTIONS.general[difficulty] || INTERVIEW_QUESTIONS.general.medium;
    pool = [...pool, ...generalPool];
  }
  
  // Shuffle and filter by focus areas (simple keyword matching)
  let filtered = pool;
  if (focusAreas.length > 0 && focusAreas.length < 5) {
    const keywords = {
      motivation: ['motivate', 'passion', 'interest', 'drive', 'why'],
      academic: ['academic', 'study', 'learn', 'research', 'project', 'subject', 'field'],
      extracurricular: ['outside', 'activity', 'club', 'sport', 'volunteer', 'hobby'],
      future: ['future', 'goal', 'aspire', 'career', 'plan', 'see yourself'],
      challenge: ['challenge', 'difficult', 'fail', 'overcome', 'problem']
    };
    
    const activeKeywords = focusAreas.flatMap(f => keywords[f] || []);
    if (activeKeywords.length > 0) {
      filtered = pool.filter(q => 
        activeKeywords.some(kw => q.toLowerCase().includes(kw))
      );
      if (filtered.length < count) {
        // Add back some general questions to meet count
        const remaining = pool.filter(q => !filtered.includes(q));
        const shuffled = remaining.sort(() => Math.random() - 0.5);
        filtered = [...filtered, ...shuffled];
      }
    }
  }
  
  // Shuffle and limit
  const shuffled = filtered.sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.min(count, shuffled.length));
}

// Start camera
async function startCamera() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ 
      video: true, 
      audio: true 
    });
    
    interviewState.stream = stream;
    interviewState.active = true;
    
    const video = document.getElementById('interviewVideo');
    video.srcObject = stream;
    
    document.getElementById('camOverlay').style.display = 'none';
    document.getElementById('expressionBadges').classList.add('show');
    document.getElementById('realtimeTips').style.display = 'block';
    
    // Update user name
    const userName = state.profile?.name || 'You';
    document.getElementById('userNameDisplay').textContent = userName;
    
    // Start analysis
    startExpressionAnalysis(video);
    startSpeechRecognition();
    startCoachingTips();
    
  } catch (e) {
    toast('Camera access denied. Please allow camera permission.', 'error');
    document.getElementById('camOverlay').style.display = 'flex';
  }
}

// Display question
function displayQuestion() {
  const { questions, qIndex } = interviewState;
  if (!questions.length || qIndex >= questions.length) {
    endInterview();
    return;
  }

  const question = questions[qIndex];
  const qTextEl = document.getElementById('qText');
  const qProgressEl = document.getElementById('qProgress');

  if (qTextEl) qTextEl.textContent = question;
  if (qProgressEl) qProgressEl.textContent = `Question ${qIndex + 1} of ${questions.length}`;

  interviewState.questionStartTime = Date.now();
}

// // Display Dr. Path message
// function displayDrPathMessage(message) {
//   document.getElementById('qText').textContent = message;
//   document.getElementById('qProgress').textContent = 'Dr. Path is speaking...';
//   document.getElementById('speakingIndicator').classList.add('active');
  
//   setTimeout(() => {
//     document.getElementById('speakingIndicator').classList.remove('active');
//   }, Math.min(3000, message.length * 80));
// }

// Next question
function nextQuestion() {
  const { questions, qIndex, questionStartTime } = interviewState;
  
  // Record answer
  const answer = prompt('Type your answer (optional):') || '';
  if (answer) {
    interviewState.sessionData.answers.push({
      question: questions[qIndex],
      answer: answer,
      time: Math.round((Date.now() - questionStartTime) / 1000)
    });
  }
  
  if (qIndex < questions.length - 1) {
    interviewState.qIndex++;
    
// Move to next question
setTimeout(() => {
  displayQuestion();
}, 1000);
  } else {
    // All questions done - end interview
setTimeout(() => {
  endInterview();
}, 1500);
  }
}

// End interview
function endInterview() {
  if (!interviewState.active && interviewState.reported) return;
  
  interviewState.active = false;
  interviewState.reported = true;
  
  if (interviewState.stream) {
    interviewState.stream.getTracks().forEach(t => t.stop());
    interviewState.stream = null;
  }
  
  if (interviewState.tipInterval) clearInterval(interviewState.tipInterval);
  if (interviewState.frameInterval) clearInterval(interviewState.frameInterval);
  if (interviewState.speechRec) {
    try { interviewState.speechRec.stop(); } catch(e) {}
  }
  
  // Show report
  showInterviewReport();
  toast('Interview completed!', 'success');
}

// Show interview report
function showInterviewReport() {
  document.getElementById('interviewCall').style.display = 'none';
  document.getElementById('interviewReport').style.display = 'block';
  
  const { sessionData, questions, questionStartTime } = interviewState;
  
  // Calculate stats
  const duration = Math.round((Date.now() - (interviewState.startTime || Date.now())) / 1000);
  const minutes = Math.floor(duration / 60);
  const seconds = duration % 60;
  
  const avgAnxiety = sessionData.anxiety.length
    ? Math.round(sessionData.anxiety.reduce((a, b) => a + b, 0) / sessionData.anxiety.length)
    : 40;
  const avgConfidence = sessionData.confidence.length
    ? Math.round(sessionData.confidence.reduce((a, b) => a + b, 0) / sessionData.confidence.length)
    : 60;
  const avgPace = sessionData.pace.length
    ? Math.round(sessionData.pace.reduce((a, b) => a + b, 0) / sessionData.pace.length)
    : 120;
  
  // Overall score (combination of confidence and pace)
  const score = Math.min(100, Math.round(
    (avgConfidence * 0.5) + 
    (100 - Math.min(avgAnxiety, 100) * 0.3) + 
    (avgPace > 80 && avgPace < 160 ? 20 : 10)
  ));
  
  // Update report
  document.getElementById('reportOverall').textContent = `${score}%`;
  document.getElementById('reportDuration').textContent = `${minutes}m ${seconds}s`;
  document.getElementById('reportQuestions').textContent = questions.length;
  document.getElementById('reportConfidence').textContent = 
    avgConfidence >= 70 ? '😊 High' :
    avgConfidence >= 50 ? '😐 Moderate' : '😟 Needs Practice';
  
  // Breakdown
  const breakdownData = [
    { label: 'Confidence', value: Math.min(100, avgConfidence + 20) },
    { label: 'Pacing', value: Math.min(100, avgPace > 80 && avgPace < 160 ? 90 : 60) },
    { label: 'Anxiety Management', value: Math.max(0, 100 - avgAnxiety) },
    { label: 'Clarity', value: Math.min(100, 60 + (avgPace < 180 ? 30 : 0)) }
  ];
  
  document.getElementById('reportBreakdown').innerHTML = breakdownData.map(item => `
    <div class="breakdown-item">
      <span class="breakdown-label">${item.label}</span>
      <div class="breakdown-bar">
        <div class="breakdown-fill" style="width:${item.value}%"></div>
      </div>
      <span class="breakdown-value">${item.value}%</span>
    </div>
  `).join('');
  
  // Recommendations
  const recommendations = generateReportRecommendations(avgAnxiety, avgConfidence, avgPace, score);
  document.getElementById('reportRecommendations').innerHTML = recommendations.map(rec => `
    <div class="recommendation-item">
      <span class="rec-icon">${rec.icon}</span>
      <span>${rec.text}</span>
    </div>
  `).join('');
  
  // Question review
  const answers = interviewState.sessionData.answers || [];
  document.getElementById('reportQuestionsReview').innerHTML = questions.map((q, i) => `
    <div class="question-review-item">
      <div class="q-text">${i + 1}. ${q}</div>
      ${answers[i] ? `<div class="q-answer">${answers[i].answer || 'No answer recorded'}</div>` : ''}
    </div>
  `).join('');
  
  updateProgressChecklist();
}

// Generate report recommendations
function generateReportRecommendations(anxiety, confidence, pace, score) {
  const recs = [];
  
  if (anxiety > 65) {
    recs.push({
      icon: '🧘',
      text: 'You showed signs of anxiety during the interview. Try deep breathing exercises before your next practice session.'
    });
  }
  
  if (pace > 170) {
    recs.push({
      icon: '🐢',
      text: 'You spoke quite quickly. Practice slowing down — use pauses to collect your thoughts and sound more confident.'
    });
  } else if (pace < 80) {
    recs.push({
      icon: '⚡',
      text: 'Your speaking pace was quite slow. Try to speed up slightly to maintain engagement and show enthusiasm.'
    });
  }
  
  if (confidence < 50) {
    recs.push({
      icon: '💪',
      text: 'Work on building confidence through more practice. Record yourself answering common questions and review the recordings.'
    });
  }
  
  if (score < 60) {
    recs.push({
      icon: '📚',
      text: 'Consider practising with a friend or mentor. Getting feedback from others can help you identify areas for improvement.'
    });
  }
  
  if (recs.length === 0 || score >= 75) {
    recs.push({
      icon: '🌟',
      text: 'Excellent performance! You demonstrated strong communication skills and confidence. Keep up the great work!'
    });
  }
  
  if (recs.length < 2) {
    recs.push({
      icon: '🎯',
      text: 'Continue practising with different types of questions to expand your comfort zone.'
    });
  }
  
  return recs;
}

// Reset interview
function resetInterview() {
  document.getElementById('interviewReport').style.display = 'none';
  document.getElementById('interviewSetup').style.display = 'block';
  document.getElementById('interviewCall').style.display = 'none';
  
  // Reset state
  interviewState.active = false;
  interviewState.reported = false;
  
  // Reset camera display
  document.getElementById('camOverlay').style.display = 'flex';
  document.getElementById('expressionBadges').classList.remove('show');
  document.getElementById('realtimeTips').style.display = 'none';
}

// Toggle microphone
function toggleMic() {
  if (!interviewState.stream) return;
  const audioTrack = interviewState.stream.getAudioTracks()[0];
  if (!audioTrack) return;
  
  audioTrack.enabled = !audioTrack.enabled;
  interviewState.micActive = audioTrack.enabled;
  
  const btn = document.getElementById('micBtn');
  btn.innerHTML = `<i class="fas fa-microphone${audioTrack.enabled ? '' : '-slash'}"></i>`;
  btn.classList.toggle('muted', !audioTrack.enabled);
}

// Toggle camera
function toggleCamera() {
  if (!interviewState.stream) return;
  const videoTrack = interviewState.stream.getVideoTracks()[0];
  if (!videoTrack) return;
  
  videoTrack.enabled = !videoTrack.enabled;
  interviewState.cameraActive = videoTrack.enabled;
  
  const btn = document.getElementById('cameraBtn');
  btn.innerHTML = `<i class="fas fa-video${videoTrack.enabled ? '' : '-slash'}"></i>`;
  
  if (!videoTrack.enabled) {
    document.getElementById('camOverlay').style.display = 'flex';
  } else {
    document.getElementById('camOverlay').style.display = 'none';
  }
}

// Speech recognition
function startSpeechRecognition() {
  const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRec) {
    simulatePace();
    return;
  }
  
  const rec = new SpeechRec();
  rec.continuous = true;
  rec.interimResults = true;
  rec.lang = 'en-US';
  interviewState.speechRec = rec;
  
  let lastWordCount = 0;
  let lastTime = Date.now();
  
  rec.onresult = (e) => {
    if (!interviewState.active) return;
    let transcript = '';
    for (let i = e.resultIndex; i < e.results.length; i++) {
      transcript += e.results[i][0].transcript;
    }
    const wordCount = transcript.trim().split(/\s+/).length;
    const now = Date.now();
    const elapsed = (now - lastTime) / 60000;
    if (elapsed > 0 && wordCount > lastWordCount) {
      const wpm = Math.round((wordCount - lastWordCount) / elapsed);
      if (wpm > 0 && wpm < 400) {
        interviewState.wordsPerMin = wpm;
        interviewState.sessionData.pace.push(wpm);
        document.getElementById('paceVal').textContent = `${wpm} wpm`;
      }
    }
    if (wordCount > lastWordCount + 20) {
      lastWordCount = wordCount;
      lastTime = now;
    }
  };
  
  try { rec.start(); } catch(e) { simulatePace(); }
}

// Simulate pace
function simulatePace() {
  const paceInterval = setInterval(() => {
    if (!interviewState.active) { clearInterval(paceInterval); return; }
    const wpm = Math.round(80 + Math.random() * 100);
    interviewState.wordsPerMin = wpm;
    interviewState.sessionData.pace.push(wpm);
    document.getElementById('paceVal').textContent = `${wpm} wpm`;
  }, 3000);
}

// Expression analysis
function startExpressionAnalysis(video) {
  const canvas = document.getElementById('expressionCanvas');
  const ctx = canvas.getContext('2d');
  
  let anxiety = 40;
  let confidence = 60;
  
  interviewState.frameInterval = setInterval(() => {
    if (!interviewState.active) return;
    
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 360;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    // Simulate improvement over time
    const elapsed = (Date.now() - (interviewState.startTime || Date.now())) / 1000;
    const improvement = Math.min(elapsed / 120, 1) * 15;
    
    anxiety = Math.max(10, Math.min(80, anxiety + (Math.random() - 0.55) * 6 - improvement * 0.1));
    confidence = Math.min(90, Math.max(30, confidence + (Math.random() - 0.45) * 6 + improvement * 0.1));
    
    interviewState.sessionData.anxiety.push(Math.round(anxiety));
    interviewState.sessionData.confidence.push(Math.round(confidence));
    
    document.getElementById('anxietyVal').textContent = levelLabel(anxiety);
    document.getElementById('confVal').textContent = levelLabel(confidence);
    
    const anxBadge = document.getElementById('badgeAnxiety');
    if (anxiety > 65) { anxBadge.style.borderColor = 'rgba(239,68,68,0.5)'; }
    else if (anxiety > 40) { anxBadge.style.borderColor = 'rgba(245,158,11,0.5)'; }
    else { anxBadge.style.borderColor = 'rgba(34,197,94,0.4)'; }
  }, 800);
}

function levelLabel(score) {
  if (score >= 70) return 'High';
  if (score >= 40) return 'Medium';
  return 'Low';
}

// Coaching tips
function startCoachingTips() {
  const tips = document.getElementById('tipText');
  const showTip = () => {
    if (!interviewState.active) return;
    
    const anxiety = interviewState.sessionData.anxiety.slice(-3);
    const avgAnxiety = anxiety.length ? anxiety.reduce((a,b) => a+b, 0) / anxiety.length : 50;
    const wpm = interviewState.wordsPerMin;
    
    let tip;
    if (avgAnxiety > 65) {
      const pool = [
        '💡 Take a slow, deep breath before continuing — you\'re doing great.',
        '🌊 Pause for 2 seconds. Collect your thoughts. Interviewers appreciate composure.',
        '😊 Relax your shoulders and slightly smile — it signals confidence.',
        '🎯 You know this answer. Start with one clear key point.'
      ];
      tip = pool[Math.floor(Math.random() * pool.length)];
    } else if (wpm > 170) {
      const pool = [
        '🐢 Slow down slightly — you\'re speaking too quickly. Pausing shows confidence.',
        '⏱️ Take a breath between sentences. Speed can signal nervousness.',
        '🗣️ Aim for 120–140 words per minute for maximum clarity.'
      ];
      tip = pool[Math.floor(Math.random() * pool.length)];
    } else {
      const pool = [
        '✨ Excellent pacing! Keep it up.',
        '👍 Your tone sounds natural and confident. Great work.',
        '💪 You are presenting yourself really well. Stay in this zone.'
      ];
      tip = pool[Math.floor(Math.random() * pool.length)];
    }
    
    if (tips) tips.textContent = tip;
  };
  
  showTip();
  interviewState.tipInterval = setInterval(showTip, 5000);
}
/* ──────────────────────────────────────────
   SCHOOLS
────────────────────────────────────────── */
let SCHOOL_DATA = [];
SCHOOL_DATA = [
  { id:1, name:'University of Hong Kong', short:'HKU', country:'Hong Kong', region:'HK', rank:'QS #17', majors:['stem','medicine','law','business','social','arts'], desc:'A top-tier research university with strong medicine, law, business and sciences.', tags:['JUPAS','Research-led','English medium'], benchmark:{ gpa:4.3, dse:30, stem:4.5, leadership:3.5, volunteers:4, awards:4 } },
  { id:2, name:'HKUST', short:'HKUST', country:'Hong Kong', region:'HK', rank:'QS #47', majors:['stem','business','social'], desc:'Excellent for engineering, data science and business with a strong tech reputation.', tags:['JUPAS','Tech-focused','Global outlook'], benchmark:{ gpa:4.0, dse:27, stem:4.2, leadership:3.0, volunteers:3.5, awards:3.5 } },
  { id:3, name:'Chinese University of Hong Kong', short:'CUHK', country:'Hong Kong', region:'HK', rank:'QS #50', majors:['stem','medicine','business','arts','social'], desc:'Balanced and comprehensive with strong medicine, business and humanities offerings.', tags:['JUPAS','Bilingual','Medical School'], benchmark:{ gpa:4.0, dse:27, stem:4.0, leadership:3.2, volunteers:3.5, awards:3.5 } },
  { id:4, name:'City University of Hong Kong', short:'CityU', country:'Hong Kong', region:'HK', rank:'QS #62', majors:['stem','business','law','arts'], desc:'Professional and career-focused with strong industry links.', tags:['JUPAS','Professional focus'], benchmark:{ gpa:3.8, dse:24, stem:3.8, leadership:2.8, volunteers:3.0, awards:3.0 } },
  { id:5, name:'HK Baptist University', short:'HKBU', country:'Hong Kong', region:'HK', rank:'QS #301', majors:['arts','social','business'], desc:'Known for strong arts, media, and communication programmes.', tags:['JUPAS','Arts & Comm'], benchmark:{ gpa:3.5, dse:22, stem:3.0, leadership:2.5, volunteers:3.0, awards:2.8 } },
  { id:6, name:'University of Oxford', short:'Oxford', country:'United Kingdom', region:'UK', rank:'QS #3', majors:['stem','medicine','law','arts','social'], desc:'One of the world’s most selective universities with outstanding academic reputation.', tags:['UCAS','Tutorial system','Research'], benchmark:{ gpa:4.5, dse:34, stem:4.8, leadership:4.5, volunteers:4.0, awards:4.5 } },
  { id:7, name:'University of Cambridge', short:'Cambridge', country:'United Kingdom', region:'UK', rank:'QS #2', majors:['stem','medicine','law','arts','social'], desc:'Renowned for mathematics, sciences and elite humanities teaching.', tags:['UCAS','College system','Nobel laureates'], benchmark:{ gpa:4.5, dse:34, stem:4.8, leadership:4.5, volunteers:4.0, awards:4.5 } },
  { id:8, name:'Imperial College London', short:'Imperial', country:'United Kingdom', region:'UK', rank:'QS #8', majors:['stem','medicine','business'], desc:'Excellent for engineering, medicine and science with a strong STEM focus.', tags:['UCAS','STEM focus','London'], benchmark:{ gpa:4.3, dse:31, stem:4.6, leadership:3.8, volunteers:3.5, awards:3.8 } },
  { id:9, name:'UCL', short:'UCL', country:'United Kingdom', region:'UK', rank:'QS #9', majors:['stem','medicine','law','arts','social'], desc:'Highly ranked and multidisciplinary with global research strength.', tags:['UCAS','London','Multidisciplinary'], benchmark:{ gpa:4.2, dse:30, stem:4.3, leadership:3.8, volunteers:3.5, awards:3.8 } },
  { id:10, name:'University of Manchester', short:'Manchester', country:'United Kingdom', region:'UK', rank:'QS #32', majors:['stem','medicine','business','social','arts'], desc:'A strong Russell Group option with broad subject choice.', tags:['UCAS','Russell Group','Research'], benchmark:{ gpa:4.0, dse:27, stem:4.0, leadership:3.2, volunteers:3.2, awards:3.2 } },
  { id:11, name:'University of Toronto', short:'UofT', country:'Canada', region:'CA', rank:'QS #25', majors:['stem','medicine','law','business','arts','social'], desc:'One of the strongest research universities in North America.', tags:['OUAC','Research-intensive','Multicultural'], benchmark:{ gpa:4.2, dse:29, stem:4.2, leadership:3.5, volunteers:3.5, awards:3.7 } },
  { id:12, name:'McGill University', short:'McGill', country:'Canada', region:'CA', rank:'QS #29', majors:['stem','medicine','law','arts','social'], desc:'Excellent for medicine, law and humanities with a global reputation.', tags:['CEGEP/HS','Bilingual','Montreal'], benchmark:{ gpa:4.1, dse:28, stem:4.0, leadership:3.4, volunteers:3.3, awards:3.6 } },
  { id:13, name:'UBC', short:'UBC', country:'Canada', region:'CA', rank:'QS #34', majors:['stem','business','arts','social','medicine'], desc:'A very popular Canadian choice for science and sustainability.', tags:['Direct admission','Vancouver','Sustainability'], benchmark:{ gpa:4.0, dse:27, stem:3.9, leadership:3.2, volunteers:3.2, awards:3.3 } },
  { id:14, name:'University of Melbourne', short:'UniMelb', country:'Australia', region:'AU', rank:'QS #13', majors:['stem','medicine','law','business','arts','social'], desc:'A globally respected university with strong results across disciplines.', tags:['UAC','Group of 8','Melbourne Model'], benchmark:{ gpa:4.1, dse:28, stem:4.0, leadership:3.4, volunteers:3.3, awards:3.5 } },
  { id:15, name:'ANU', short:'ANU', country:'Australia', region:'AU', rank:'QS #30', majors:['stem','law','social','arts','business'], desc:'A strong research university known for politics, law and public policy.', tags:['Direct','Canberra','Research'], benchmark:{ gpa:4.0, dse:27, stem:3.8, leadership:3.2, volunteers:3.2, awards:3.2 } },
  { id:16, name:'UNSW Sydney', short:'UNSW', country:'Australia', region:'AU', rank:'QS #18', majors:['stem','business','law','medicine'], desc:'Very strong for engineering, computing and business in Sydney.', tags:['UAC','Sydney','Engineering'], benchmark:{ gpa:4.0, dse:27, stem:4.0, leadership:3.2, volunteers:3.2, awards:3.2 } }
];

function getProfileBenchmark() {
  const p = state.profile;
  const curriculum = p?.curriculum || 'DSE';
  const gpa = state.grades.gpa;
  const grades = state.grades[curriculum] || {};
  const subjectCount = Object.keys(grades).filter(k => k !== '_bonus').length;
  const stemCount = Object.values(grades).filter(v => typeof v === 'number' && v >= 4).length;
  const leaders = state.activities.filter(a => a.entryType === 'position').length;
  const volunteers = state.activities.filter(a => a.entryType === 'other').length;
  const awards = state.activities.filter(a => a.entryType === 'award').length;

  const dseScore = curriculum === 'DSE'
    ? Math.min(5, Object.values(grades).map(g => DSE_POINTS[g] || 0).filter(v => v > 0).reduce((a, b) => a + b, 0) / 6)
    : curriculum === 'AP'
      ? Math.min(5, (Object.values(grades).filter(v => typeof v === 'number').reduce((a, b) => a + b, 0) / Math.max(1, Object.values(grades).filter(v => typeof v === 'number').length)) / 1)
      : curriculum === 'ALEVEL'
        ? Math.min(5, 2.5 + (Object.values(grades).filter(g => g === 'A' || g === 'A*').length * 0.3))
        : Math.min(5, (Object.values(grades).filter(v => typeof v === 'number').reduce((a, b) => a + b, 0) / Math.max(1, Object.values(grades).filter(v => typeof v === 'number').length)) / 1.4);

  return {
    gpa: gpa != null ? Number(gpa) : 0,
    dse: Number(dseScore.toFixed(1)),
    stem: Math.min(5, 2.3 + stemCount * 0.2 + subjectCount * 0.05),
    leadership: Math.min(5, 1.5 + leaders * 0.6),
    volunteers: Math.min(5, 1.5 + volunteers * 0.4),
    awards: Math.min(5, 1.5 + awards * 0.6)
  };
}

function computeMatchScore(school) {
  let score = 48;
  const p = state.profile;
  const profile = getProfileBenchmark();

  if (p && p.regions.includes(school.region)) score += 15;
  if (p && p.major) {
    const majorLower = p.major.toLowerCase();
    const stemKw = ['computer','cs','math','physics','engineering','science','tech','bio','chem'];
    const busKw = ['business','finance','econ','accounting','management'];
    const artKw = ['art','music','film','design','literature','creative'];
    const lawKw = ['law','legal'];
    const medKw = ['medicine','medical','health','nursing','pharma'];
    const socKw = ['social','psych','history','geography','politics','sociology'];
    if (stemKw.some(k => majorLower.includes(k)) && school.majors.includes('stem')) score += 10;
    if (busKw.some(k => majorLower.includes(k)) && school.majors.includes('business')) score += 10;
    if (artKw.some(k => majorLower.includes(k)) && school.majors.includes('arts')) score += 10;
    if (lawKw.some(k => majorLower.includes(k)) && school.majors.includes('law')) score += 10;
    if (medKw.some(k => majorLower.includes(k)) && school.majors.includes('medicine')) score += 10;
    if (socKw.some(k => majorLower.includes(k)) && school.majors.includes('social')) score += 10;
  }

  const benchmark = school.benchmark || { gpa: 3.5, dse: 24, stem: 3.5, leadership: 2.5, volunteers: 3, awards: 3 };
  const profileVsBenchmark = [
    profile.gpa >= benchmark.gpa ? 8 : 0,
    profile.dse >= benchmark.dse ? 8 : 0,
    profile.stem >= benchmark.stem ? 8 : 0,
    profile.leadership >= benchmark.leadership ? 8 : 0,
    profile.volunteers >= benchmark.volunteers ? 8 : 0,
    profile.awards >= benchmark.awards ? 8 : 0
  ].reduce((a, b) => a + b, 0);
  score += profileVsBenchmark;

  if (state.activities.length >= 3) score += 7;
  if (state.activities.length >= 6) score += 5;
  if (state.ps.generated) score += 5;

  return Math.min(98, Math.max(10, score));
}

function getMatchLevel(score) {
  if (score >= 75) return 'target';
  if (score >= 55) return 'safety';
  return 'reach';
}

function getMatchLevelForTopSchools(school, score) {
  // Prestige adjustment for top schools
  const topReach = ['Oxford','Cambridge','MIT','Harvard','Stanford','HKU'];
  const midTarget = ['Imperial','UCL','Berkeley','UofT','HKUST','CUHK','McGill','UniMelb'];
  if (topReach.includes(school.short)) return score >= 80 ? 'target' : 'reach';
  if (midTarget.includes(school.short)) return score >= 65 ? 'target' : score >= 45 ? 'safety' : 'reach';
  return getMatchLevel(score);
}

function runAIMatch() {
  const region = document.getElementById('filterRegion').value;
  const matchFilter = document.getElementById('filterMatch').value;
  const majorFilter = document.getElementById('filterMajor').value;

  let schools = SCHOOL_DATA.filter(s => {
    if (region !== 'all' && s.region !== region) return false;
    if (majorFilter !== 'all' && !s.majors.includes(majorFilter)) return false;
    return true;
  });

  // Compute scores
  state.schools = schools.map(s => ({
    ...s,
    score: computeMatchScore(s),
  })).map(s => ({
    ...s,
    level: getMatchLevelForTopSchools(s, s.score)
  })).filter(s => matchFilter === 'all' || s.level === matchFilter)
    .sort((a,b) => b.score - a.score);

  renderSchools(state.schools);
  toast(t('runMatch'), 'success');
}

function filterSchools() { runAIMatch(); }

function buildRadarChartSvg(profile, benchmark) {
  const size = 180;
  const center = size / 2;
  const radius = 64;
  const maxValue = 5;
  const metrics = [
    { label: 'GPA', value: Math.min(maxValue, profile.gpa || 0), target: Math.min(maxValue, benchmark.gpa || 0) },
    { label: 'DSE', value: Math.min(maxValue, profile.dse || 0), target: Math.min(maxValue, (benchmark.dse || 0) / 6) },
    { label: 'STEM', value: Math.min(maxValue, profile.stem || 0), target: Math.min(maxValue, benchmark.stem || 0) },
    { label: 'Leadership', value: Math.min(maxValue, profile.leadership || 0), target: Math.min(maxValue, benchmark.leadership || 0) },
    { label: 'Volunteers', value: Math.min(maxValue, profile.volunteers || 0), target: Math.min(maxValue, benchmark.volunteers || 0) },
    { label: 'Awards', value: Math.min(maxValue, profile.awards || 0), target: Math.min(maxValue, benchmark.awards || 0) }
  ];

  const polarPoint = (value, index) => {
    const angle = (Math.PI / 2) + (index * (Math.PI * 2 / metrics.length));
    const scaledRadius = (value / maxValue) * radius;
    return `${center + Math.cos(angle) * scaledRadius},${center - Math.sin(angle) * scaledRadius}`;
  };

  const userPoints = metrics.map((_, index) => polarPoint(metrics[index].value, index)).join(' ');
  const targetPoints = metrics.map((_, index) => polarPoint(metrics[index].target, index)).join(' ');

  const gridLines = [0.25, 0.5, 0.75, 1].map(ratio => {
    const ringRadius = radius * ratio;
    const points = metrics.map((_, index) => {
      const angle = (Math.PI / 2) + (index * (Math.PI * 2 / metrics.length));
      return `${center + Math.cos(angle) * ringRadius},${center - Math.sin(angle) * ringRadius}`;
    }).join(' ');
    return `<polygon points="${points}" class="radar-grid" />`;
  }).join('');

  const axes = metrics.map((metric, index) => {
    const angle = (Math.PI / 2) + (index * (Math.PI * 2 / metrics.length));
    const x = center + Math.cos(angle) * radius;
    const y = center - Math.sin(angle) * radius;
    const labelX = center + Math.cos(angle) * (radius + 18);
    const labelY = center - Math.sin(angle) * (radius + 18);
    return `<g>
      <line x1="${center}" y1="${center}" x2="${x}" y2="${y}" class="radar-axis" />
      <text x="${labelX}" y="${labelY}" class="radar-label">${metric.label}</text>
    </g>`;
  }).join('');

  return `<svg class="school-radar-chart" viewBox="0 0 ${size} ${size}" role="img" aria-label="Performance radar chart">
    <g>
      ${gridLines}
      ${axes}
      <polygon points="${targetPoints}" class="radar-target" />
      <polygon points="${userPoints}" class="radar-user" />
    </g>
  </svg>`;
}

function renderSchools(schools) {
  const grid = document.getElementById('schoolGrid');
  if (!grid) return;
  if (!schools.length) {
    grid.innerHTML = '<div class="schools-empty">No schools match your filters yet.</div>';
    return;
  }

  const profile = getProfileBenchmark();
  grid.innerHTML = schools.map(s => {
    const matchLabels = { reach: '衝刺 Reach', target: '目標 Target', safety: '保底 Safety' };
    const benchmark = s.benchmark || { gpa: 3.5, dse: 24, stem: 3.5, leadership: 2.5, volunteers: 3, awards: 3 };
    const radarChart = buildRadarChartSvg(profile, benchmark);

    return `<div class="school-card">
      <div class="school-header">
        <div>
          <div class="school-name">${s.name}</div>
          <div class="school-country">${s.country} · ${s.rank}</div>
        </div>
        <div style="text-align:right">
          <div class="match-pct">${s.score}%</div>
          <div class="match-label">Match</div>
        </div>
      </div>
      <span class="match-badge match-${s.level}">${matchLabels[s.level]}</span>
      <div class="school-body">${s.desc}</div>
      <div class="school-tags">${s.tags.map(t => `<span class="school-tag">${t}</span>`).join('')}</div>
      <div class="school-radar">
        <div class="school-radar-title">Performance Radar</div>
        ${radarChart}
      </div>
      <div class="school-actions">
        <button class="btn-secondary" style="font-size:0.8rem;padding:7px 14px" onclick="toast('Added ${s.name} to shortlist!','success')"><i class="fas fa-plus"></i> Shortlist</button>
        <button class="btn-outline" style="font-size:0.8rem;padding:7px 14px" onclick="toast('Opening ${s.name} info…','info')"><i class="fas fa-info-circle"></i> Details</button>
      </div>
    </div>`;
  }).join('');
}

/* ──────────────────────────────────────────
   COLLEGE PLANNING
────────────────────────────────────────── */
function generateCareerTimeline() {
  const profile = state.profile;
  const major = profile?.major || (state.lang === 'zh' ? '你選擇的學科' : 'your chosen field');
  const curriculum = profile?.curriculum || 'DSE';
  const timeline = state.lang === 'zh' ? [
    { title: '第 1 階段：建立基礎', text: `先整理 ${curriculum} 成績、活動和目標大學要求，確認自己最強的申請優勢。` },
    { title: '第 2 階段：打磨材料', text: `完成個人陳述草稿，並把課外活動和獎項整理成更有說服力的故事。` },
    { title: '第 3 階段：面試與表達', text: `每週至少練習一次 AI 模擬面試，提升自信與語速控制。` },
    { title: '第 4 階段：申請提交', text: `根據 ${major} 的方向，對照每間大學的截止日期和申請流程，準備提交。` }
  ] : [
    { title: 'Stage 1 — Build the foundation', text: `Start by consolidating ${curriculum} grades, activities and university requirements to identify your strongest application edge.` },
    { title: 'Stage 2 — Polish the materials', text: `Draft your personal statement and shape your activities into a compelling story that reflects ${major}.` },
    { title: 'Stage 3 — Interview readiness', text: `Practise at least one AI mock interview per week to strengthen confidence, pacing and clarity.` },
    { title: 'Stage 4 — Submit with confidence', text: `Track each university deadline and application checklist for ${major} so submissions stay organised.` }
  ];

  const timelineEl = document.getElementById('careerTimeline');
  if (timelineEl) {
    timelineEl.innerHTML = timeline.map(item => `
      <div class="timeline-item">
        <strong>${item.title}</strong>
        <span>${item.text}</span>
      </div>
    `).join('');
  }

  const stepsEl = document.getElementById('careerSteps');
  if (stepsEl) {
    const steps = state.lang === 'zh' ? [
      '完成你的個人陳述第一稿。',
      '至少整理 5 個有影響力的活動與成就。',
      '每週練習一次 AI 面試，提升自信與語速。',
      '把目標大學的要求與截止日期列入清單。'
    ] : [
      'Finish your first personal statement draft.',
      'List at least 5 meaningful activities and achievements.',
      'Practise one AI mock interview each week to build confidence.',
      'Track deadlines and application requirements for each target school.'
    ];
    stepsEl.innerHTML = steps.map(step => `<li>${step}</li>`).join('');
  }
}

/* ──────────────────────────────────────────
   PERSISTENCE — LOAD FROM LOCALSTORAGE
────────────────────────────────────────── */
function loadPersistedData() {
  try {
    const profile = localStorage.getItem('pathspire_profile');
    if (profile) {
      state.profile = JSON.parse(profile);
      // Re-populate form
      document.getElementById('userName').value = state.profile.name || '';
      document.getElementById('userCurriculum').value = state.profile.curriculum || '';
      document.getElementById('targetMajor').value = state.profile.major || '';
      state.profile.regions.forEach(r => {
        const opt = document.querySelector(`#targetRegion option[value="${r}"]`);
        if (opt) opt.selected = true;
      });
      populateProfileForm();
      document.getElementById('profileSetup').style.display = 'none';
      document.getElementById('dashboardGrid').style.display = 'grid';
      updateMainActionButton();
      switchCurriculum(state.profile.curriculum);
      renderDashboard();
    }
    const grades = localStorage.getItem('pathspire_grades');
    if (grades) {
      state.grades = JSON.parse(grades);
      if (state.grades.gpa == null) state.grades.gpa = null;
    }
    populateEstimatedGpaInput();

    const activities = localStorage.getItem('pathspire_activities');
    if (activities) { state.activities = JSON.parse(activities); renderActivities(); }

    const ps = localStorage.getItem('pathspire_ps');
    if (ps) {
      state.ps.generated = ps;
      const words = ps.split(/\s+/).filter(Boolean).length;
      document.getElementById('psOutput').innerHTML = `<div style="white-space:pre-wrap;line-height:1.9">${ps}</div>`;
      document.getElementById('psWordCount').textContent = `${words} words`;
    }
  } catch(e) {
    console.warn('Could not load persisted data:', e);
  }
}

/* ──────────────────────────────────────────
   INIT
────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
  initGrades();
  loadQuestions('general', null);
  loadPersistedData();
  populateEstimatedGpaInput();
  updateMainActionButton();
  generateCareerTimeline();
  renderSchools(SCHOOL_DATA.slice(0, 6).map(s => ({
    ...s, score: 72, level: 'target'
  })));
  // Init PS step nav buttons visibility
  goPSStep(1);
});
