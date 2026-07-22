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
  grades: { DSE: {}, AP: {}, ALEVEL: {}, IB: {}, bonus: 0 },
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
function showSection(id) {
  document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
  const el = document.getElementById(id);
  if (el) el.classList.add('active');
  document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
  document.querySelectorAll(`.nav-link[onclick*="${id}"]`).forEach(l => l.classList.add('active'));
  window.scrollTo({ top: 0, behavior: 'smooth' });
  // Close mobile menu
  document.getElementById('navLinks').classList.remove('open');
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
  const regions = [...document.getElementById('targetRegion').selectedOptions].map(o => o.value);
  if (!name) { toast(t('fillName'), 'error'); return; }
  if (!curr) { toast(t('fillCurriculum'), 'error'); return; }
  state.profile = { name, curriculum: curr, major, regions };
  localStorage.setItem('pathspire_profile', JSON.stringify(state.profile));
  document.getElementById('profileSetup').style.display = 'none';
  document.getElementById('dashboardGrid').style.display = 'grid';
  renderDashboard();
  toast(t('profileSaved'), 'success');
}

function renderDashboard() {
  if (!state.profile) return;
  const p = state.profile;
  document.getElementById('dashProfile').innerHTML = `
    <div style="display:flex;flex-direction:column;gap:8px">
      <div style="font-size:1.2rem;font-weight:800">${p.name}</div>
      <div style="color:var(--text2);font-size:0.875rem">${p.curriculum} · ${p.major || 'Undecided'}</div>
      <div style="font-size:0.8rem;color:var(--text3)">${p.regions.join(', ') || 'No regions selected'}</div>
    </div>`;
  updateProgressChecklist();
  renderAITips();
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
  AP: ['AP Calculus AB', 'AP Calculus BC', 'AP Statistics', 'AP Physics 1', 'AP Physics 2', 'AP Physics C',
    'AP Chemistry', 'AP Biology', 'AP Environmental Science', 'AP Computer Science A', 'AP Computer Science Principles',
    'AP English Language', 'AP English Literature', 'AP US History', 'AP World History', 'AP European History',
    'AP Psychology', 'AP Economics (Micro)', 'AP Economics (Macro)', 'AP Human Geography',
    'AP Chinese Language', 'AP French Language', 'AP Spanish Language', 'AP Art History', 'AP Music Theory'],
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

function subjectCard(id, label, isCore, inputHtml) {
  return `<div class="subject-card">
    <div class="subject-name">
      <span>${label}</span>
      ${isCore ? '<span class="badge-core">Core</span>' : ''}
    </div>
    ${inputHtml}
  </div>`;
}

function initGrades() {
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
  apEl.innerHTML = SUBJECTS.AP.slice(0, 5).map((s, i) =>
    subjectCard(`ap_${i}`, s, false,
      `<input type="number" class="subject-input" id="ap_${i}" min="1" max="5" placeholder="1–5" onchange="onGradeChange()" />`)
  ).join('');

  // A-Level
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
  ['DSE','AP','ALEVEL','IB'].forEach(c => {
    const el = document.getElementById(`grade-${c}`);
    if (el) el.style.display = c === curr ? 'flex' : 'none';
  });
  if (btn) {
    document.querySelectorAll('.curr-tab').forEach(t => t.classList.remove('active'));
    btn.classList.add('active');
  }
}

function addCustomSubject(curriculum) {
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

function onGradeChange() {
  calcIBTotal();
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
function openActivityModal() {
  document.getElementById('activityModal').style.display = 'flex';
  ['actName','actYears','actRole','actDesc','actAwards'].forEach(id => {
    document.getElementById(id).value = '';
  });
  document.getElementById('actCategory').value = 'leadership';
}
function closeActivityModal() {
  document.getElementById('activityModal').style.display = 'none';
}
function saveActivity() {
  const name = document.getElementById('actName').value.trim();
  if (!name) { toast('Please enter an activity name.', 'error'); return; }
  const act = {
    id: Date.now(),
    name,
    category: document.getElementById('actCategory').value,
    years: document.getElementById('actYears').value.trim(),
    role: document.getElementById('actRole').value.trim(),
    desc: document.getElementById('actDesc').value.trim(),
    awards: document.getElementById('actAwards').value.trim()
  };
  state.activities.push(act);
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
  leadership: 'Leadership', sports: 'Sports', arts: 'Arts',
  volunteer: 'Volunteer', academic: 'Academic', work: 'Work/Internship'
};
const CAT_LABELS_ZH = {
  leadership: '領導', sports: '體育', arts: '藝術',
  volunteer: '義工', academic: '學術', work: '工作/實習'
};
function renderActivities(filter = 'all') {
  const list = document.getElementById('activityList');
  if (!list) return;
  const filtered = filter === 'all' ? state.activities : state.activities.filter(a => a.category === filter);
  if (filtered.length === 0) {
    list.innerHTML = `<div style="color:var(--text3);font-size:0.875rem;padding:20px 0">${t('noActivities')}</div>`;
    return;
  }
  list.innerHTML = filtered.map(a => {
    const catLabel = state.lang === 'zh' ? (CAT_LABELS_ZH[a.category] || a.category) : (CAT_LABELS[a.category] || a.category);
    return `<div class="activity-item">
      <div class="act-left">
        <span class="act-cat-tag cat-${a.category}">${catLabel}</span>
        <div class="act-title">${a.name}</div>
        <div class="act-meta">${[a.role, a.years].filter(Boolean).join(' · ')}</div>
        ${a.desc ? `<div class="act-desc">${a.desc}</div>` : ''}
        ${a.awards ? `<div class="act-awards"><i class="fas fa-trophy"></i> ${a.awards}</div>` : ''}
      </div>
      <div class="act-actions">
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
   INTERVIEW COACH
────────────────────────────────────────── */
const QUESTIONS = {
  general: [
    'Tell me about yourself and why you want to study at this university.',
    'What are your greatest strengths, and how will they help you in this programme?',
    'Describe a challenge you have faced and how you overcame it.',
    'Where do you see yourself in five to ten years?',
    'What has been your most significant academic achievement and why?',
    'How do you manage your time when faced with multiple deadlines?',
    'What extracurricular activities have shaped your character?',
    'Why should we choose you over other equally qualified applicants?'
  ],
  subject: [
    'What sparked your interest in this specific subject area?',
    'Tell me about a recent development in your field that excited you.',
    'Describe a project or piece of work related to your subject that you are most proud of.',
    'What books or resources have influenced your thinking in this area?',
    'How does your subject connect to broader global challenges?',
    'What aspect of this field do you hope to specialise in, and why?'
  ],
  motivation: [
    'Why this university specifically over others?',
    'What do you hope to gain from university life beyond academics?',
    'How have your school experiences prepared you for university study?',
    'What motivates you to keep going when studies get difficult?',
    'How do you plan to contribute to our university community?'
  ],
  stress: [
    'How do you perform under pressure? Give a specific example.',
    'Tell me about a time you failed. What did you learn?',
    'Describe a situation where you had to work with someone you disagreed with.',
    'What would you do if you were struggling academically in your first year?',
    'How do you balance academic demands with personal wellbeing?'
  ]
};

const COACHING_TIPS = [
  { trigger: 'anxiety', tips: [
    '💡 Take a slow, deep breath before continuing — you\'re doing great.',
    '🌊 Pause for 2 seconds. Collect your thoughts. Interviewers appreciate composure.',
    '😊 Relax your shoulders and slightly smile — it signals confidence to both them and you.',
    '🎯 You know this answer. Start with one clear key point.',
    '🧘 Ground yourself: feel your feet on the floor and speak from there.'
  ]},
  { trigger: 'fast', tips: [
    '🐢 Slow down slightly — you\'re speaking too quickly. Pausing shows confidence.',
    '⏱️ Take a breath between sentences. Speed can signal nervousness.',
    '🗣️ Aim for 120–140 words per minute for maximum clarity and impact.'
  ]},
  { trigger: 'normal', tips: [
    '✨ Excellent pacing! Keep it up.',
    '👍 Your tone sounds natural and confident. Great work.',
    '💪 You are presenting yourself really well. Stay in this zone.'
  ]}
];

function loadQuestions(cat, btn) {
  state.interview.category = cat;
  state.interview.questions = [...QUESTIONS[cat]].sort(() => Math.random() - 0.5);
  state.interview.qIndex = 0;
  document.querySelectorAll('.q-filter').forEach(b => b.classList.remove('active'));
  if (btn) btn.classList.add('active');
  displayQuestion();
}

function displayQuestion() {
  const { questions, qIndex } = state.interview;
  if (!questions.length) return;
  const el = document.getElementById('qText');
  const num = document.getElementById('currentQuestion').querySelector('.q-number');
  if (el) el.textContent = questions[qIndex] || '';
  if (num) num.textContent = state.lang === 'zh'
    ? `第 ${qIndex + 1} 題，共 ${questions.length} 題`
    : `Question ${qIndex + 1} of ${questions.length}`;
  document.getElementById('answerText').value = '';
  document.getElementById('aiFeedback').style.display = 'none';
}
function nextQuestion() {
  if (state.interview.qIndex < state.interview.questions.length - 1) {
    state.interview.qIndex++;
    displayQuestion();
  }
}
function prevQuestion() {
  if (state.interview.qIndex > 0) {
    state.interview.qIndex--;
    displayQuestion();
  }
}

async function startInterview() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
    state.interview.stream = stream;
    state.interview.active = true;
    state.interview.startTime = Date.now();
    state.interview.sessionData = { anxiety: [], confidence: [], pace: [] };
    state.interview.wordBuffer = [];

    const video = document.getElementById('interviewVideo');
    video.srcObject = stream;
    document.getElementById('camOverlay').style.display = 'none';
    document.getElementById('expressionBadges').style.display = 'flex';
    document.getElementById('startCamBtn').style.display = 'none';
    document.getElementById('stopCamBtn').style.display = 'inline-flex';
    document.getElementById('micBtn').style.display = 'inline-flex';
    document.getElementById('realtimeTips').style.display = 'block';

    startExpressionAnalysis(video);
    startSpeechRecognition();
    startCoachingTips();
    toast(t('interviewStarted'), 'success');
  } catch (e) {
    toast(t('camError'), 'error');
  }
}

function stopInterview() {
  state.interview.active = false;
  if (state.interview.stream) {
    state.interview.stream.getTracks().forEach(t => t.stop());
    state.interview.stream = null;
  }
  if (state.interview.tipInterval) clearInterval(state.interview.tipInterval);
  if (state.interview.frameInterval) clearInterval(state.interview.frameInterval);
  if (state.interview.speechRec) { try { state.interview.speechRec.stop(); } catch(e){} }

  document.getElementById('camOverlay').style.display = 'flex';
  document.getElementById('expressionBadges').style.display = 'none';
  document.getElementById('startCamBtn').style.display = 'inline-flex';
  document.getElementById('stopCamBtn').style.display = 'none';
  document.getElementById('micBtn').style.display = 'none';

  showSessionReport();
  toast(t('interviewStopped'));
}

function startExpressionAnalysis(video) {
  const canvas = document.getElementById('expressionCanvas');
  const ctx = canvas.getContext('2d');

  state.interview.frameInterval = setInterval(() => {
    if (!state.interview.active) return;
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 360;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Simulated facial expression analysis
    // In production, integrate face-api.js or MediaPipe
    const anxiety = simulateExpressionScore('anxiety');
    const confidence = simulateExpressionScore('confidence');

    state.interview.sessionData.anxiety.push(anxiety);
    state.interview.sessionData.confidence.push(confidence);

    document.getElementById('anxietyVal').textContent = levelLabel(anxiety);
    document.getElementById('confVal').textContent = levelLabel(confidence);

    // Colour coding
    const anxBadge = document.getElementById('badgeAnxiety');
    if (anxiety > 65) { anxBadge.style.borderColor = 'rgba(239,68,68,0.5)'; }
    else if (anxiety > 40) { anxBadge.style.borderColor = 'rgba(245,158,11,0.5)'; }
    else { anxBadge.style.borderColor = 'rgba(34,197,94,0.4)'; }
  }, 800);
}

let _simAnxiety = 60; let _simConf = 40;
function simulateExpressionScore(type) {
  // Gradually improve over time as "coaching" helps
  const elapsed = (Date.now() - (state.interview.startTime || Date.now())) / 1000;
  const improvement = Math.min(elapsed / 60, 1) * 20; // improve up to 20pts over 1 min

  if (type === 'anxiety') {
    _simAnxiety = Math.max(10, Math.min(90, _simAnxiety + (Math.random() - 0.55) * 8 - improvement * 0.1));
    return Math.round(_simAnxiety);
  } else {
    _simConf = Math.min(90, Math.max(20, _simConf + (Math.random() - 0.45) * 8 + improvement * 0.1));
    return Math.round(_simConf);
  }
}

function levelLabel(score) {
  if (score >= 70) return 'High';
  if (score >= 40) return 'Medium';
  return 'Low';
}

function startSpeechRecognition() {
  const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRec) {
    // Fallback — simulate pace
    simulatePace();
    return;
  }
  const rec = new SpeechRec();
  rec.continuous = true;
  rec.interimResults = true;
  rec.lang = 'en-US';
  state.interview.speechRec = rec;

  let lastWordCount = 0;
  let lastTime = Date.now();

  rec.onresult = (e) => {
    let transcript = '';
    for (let i = e.resultIndex; i < e.results.length; i++) {
      transcript += e.results[i][0].transcript;
    }
    const wordCount = transcript.trim().split(/\s+/).length;
    const now = Date.now();
    const elapsed = (now - lastTime) / 60000; // minutes
    if (elapsed > 0) {
      const wpm = Math.round((wordCount - lastWordCount) / elapsed);
      if (wpm > 0 && wpm < 400) {
        state.interview.wordsPerMin = wpm;
        state.interview.sessionData.pace.push(wpm);
        document.getElementById('paceVal').textContent = `${wpm} wpm`;
      }
    }
    if (wordCount > lastWordCount + 20) { lastWordCount = wordCount; lastTime = now; }
  };
  try { rec.start(); } catch(e) { simulatePace(); }
}

function simulatePace() {
  const paceInterval = setInterval(() => {
    if (!state.interview.active) { clearInterval(paceInterval); return; }
    const wpm = Math.round(100 + Math.random() * 80);
    state.interview.wordsPerMin = wpm;
    state.interview.sessionData.pace.push(wpm);
    document.getElementById('paceVal').textContent = `${wpm} wpm`;
  }, 3000);
}

function toggleMic() {
  if (!state.interview.stream) return;
  const audioTrack = state.interview.stream.getAudioTracks()[0];
  if (!audioTrack) return;
  audioTrack.enabled = !audioTrack.enabled;
  state.interview.micActive = audioTrack.enabled;
  const btn = document.getElementById('micBtn');
  btn.innerHTML = `<i class="fas fa-microphone${audioTrack.enabled ? '' : '-slash'}"></i>`;
}

function startCoachingTips() {
  const tips = document.getElementById('tipText');
  const showTip = () => {
    if (!state.interview.active) return;
    const anxiety = state.interview.sessionData.anxiety.slice(-3);
    const avgAnxiety = anxiety.length ? anxiety.reduce((a,b)=>a+b,0)/anxiety.length : 50;
    const wpm = state.interview.wordsPerMin;

    let pool;
    if (avgAnxiety > 60) pool = COACHING_TIPS[0].tips;
    else if (wpm > 170) pool = COACHING_TIPS[1].tips;
    else pool = COACHING_TIPS[2].tips;

    const tip = pool[Math.floor(Math.random() * pool.length)];
    if (tips) tips.textContent = tip;
  };
  showTip();
  state.interview.tipInterval = setInterval(showTip, 5000);
}

function getAIFeedback() {
  const answer = document.getElementById('answerText').value.trim();
  if (!answer) { toast('Please type an answer first.', 'error'); return; }
  const fbEl = document.getElementById('aiFeedback');
  fbEl.style.display = 'block';
  fbEl.innerHTML = '<div class="ai-loader">Analysing your answer…</div>';

  setTimeout(() => {
    const feedback = generateAnswerFeedback(answer, state.interview.questions[state.interview.qIndex] || '');
    fbEl.innerHTML = feedback;
  }, 1200);
}

function generateAnswerFeedback(answer, question) {
  const words = answer.split(/\s+/).filter(Boolean).length;
  const hasConcrete = /\d|because|when|led|result|achieved|improved|created/i.test(answer);
  const hasStructure = answer.includes(',') || answer.includes('.') || words > 30;
  const tips = [];

  if (words < 30) tips.push('Your answer is very brief. Try to elaborate with a specific example (aim for 100–200 words when speaking).');
  if (!hasConcrete) tips.push('Add concrete details — numbers, dates, names, or measurable outcomes make answers much more compelling.');
  if (!hasStructure) tips.push('Structure helps: try the STAR method (Situation → Task → Action → Result).');
  if (words > 200) tips.push('Consider trimming — interviewers appreciate concise, focused answers.');
  if (tips.length === 0) tips.push('Good answer! It has a solid structure and concrete details.');

  const strength = hasConcrete && hasStructure ? '✅ Strengths: Clear and evidence-based.' : '⚠️ Room to grow: Add more specifics.';

  return `<strong><i class="fas fa-robot" style="color:var(--primary);margin-right:6px"></i>AI Feedback</strong>
    <div style="margin-top:10px;color:var(--text2)">${strength}</div>
    <ul style="margin-top:10px;padding-left:18px;display:flex;flex-direction:column;gap:6px">
      ${tips.map(tip => `<li style="font-size:0.875rem;color:var(--text2)">${tip}</li>`).join('')}
    </ul>`;
}

function showSessionReport() {
  const { sessionData, startTime } = state.interview;
  const duration = Math.round((Date.now() - (startTime || Date.now())) / 1000);
  const avgAnxiety = sessionData.anxiety.length
    ? Math.round(sessionData.anxiety.reduce((a,b)=>a+b,0) / sessionData.anxiety.length) : 0;
  const avgConf = sessionData.confidence.length
    ? Math.round(sessionData.confidence.reduce((a,b)=>a+b,0) / sessionData.confidence.length) : 0;
  const avgPace = sessionData.pace.length
    ? Math.round(sessionData.pace.reduce((a,b)=>a+b,0) / sessionData.pace.length) : 0;

  const statsEl = document.getElementById('sessionStats');
  const statsContent = document.getElementById('statsContent');
  if (!statsEl || !statsContent) return;

  statsEl.style.display = 'block';
  statsContent.innerHTML = `
    <div class="analysis-grid" style="margin-bottom:14px">
      <div class="analysis-stat"><div class="val">${Math.floor(duration/60)}m ${duration%60}s</div><div class="lbl">Session Duration</div></div>
      <div class="analysis-stat"><div class="val" style="color:${avgAnxiety<40?'var(--success)':avgAnxiety<65?'var(--warn)':'var(--danger)'}">${levelLabel(avgAnxiety)}</div><div class="lbl">Avg Anxiety</div></div>
      <div class="analysis-stat"><div class="val" style="color:${avgConf>60?'var(--success)':avgConf>35?'var(--warn)':'var(--danger)'}">${levelLabel(avgConf)}</div><div class="lbl">Avg Confidence</div></div>
      <div class="analysis-stat"><div class="val">${avgPace || '—'} <span style="font-size:1rem">wpm</span></div><div class="lbl">Speaking Pace</div></div>
    </div>
    <div class="ai-tip">${generateSessionRecommendation(avgAnxiety, avgConf, avgPace)}</div>`;

  updateProgressChecklist();
}

function generateSessionRecommendation(anxiety, conf, pace) {
  if (anxiety > 65)
    return '🧘 You showed signs of anxiety during this session. Try box breathing (4s in, hold 4s, out 4s) before your next practice, and remember — interviewers want you to succeed.';
  if (pace > 170)
    return '🐢 You spoke a bit fast at times. Slow down intentionally and use pauses as punctuation — it signals confidence and gives you time to think.';
  if (conf > 65)
    return '🏆 Great session! Your confidence came through clearly. Keep building on this foundation with more practice questions.';
  return '📈 Solid effort. Focus on maintaining eye contact with the camera and pausing before answering to compose your thoughts.';
}

/* ──────────────────────────────────────────
   SCHOOLS
────────────────────────────────────────── */
const SCHOOL_DATA = [
  // Hong Kong
  { id:1, name:'University of Hong Kong', short:'HKU', country:'Hong Kong', region:'HK', rank:'QS #17', majors:['stem','medicine','law','business','social','arts'], desc:'Hong Kong\'s oldest and most prestigious university, consistently ranked in the global top 30.', tags:['JUPAS','Research-led','English medium'] },
  { id:2, name:'HKUST', short:'HKUST', country:'Hong Kong', region:'HK', rank:'QS #47', majors:['stem','business','social'], desc:'World-renowned for science, technology, and business education with a stunning waterfront campus.', tags:['JUPAS','Tech-focused','Global outlook'] },
  { id:3, name:'Chinese University of Hong Kong', short:'CUHK', country:'Hong Kong', region:'HK', rank:'QS #50', majors:['stem','medicine','business','arts','social'], desc:'A bilingual research university known for its comprehensive programmes and strong alumni network.', tags:['JUPAS','Bilingual','Medical School'] },
  { id:4, name:'City University of Hong Kong', short:'CityU', country:'Hong Kong', region:'HK', rank:'QS #62', majors:['stem','business','law','arts'], desc:'Professional and career-focused programmes with strong industry connections.', tags:['JUPAS','Professional focus'] },
  { id:5, name:'HK Baptist University', short:'HKBU', country:'Hong Kong', region:'HK', rank:'QS #301', majors:['arts','social','business'], desc:'Known for communication, film, and arts programmes.', tags:['JUPAS','Arts & Comm'] },
  // UK
  { id:6, name:'University of Oxford', short:'Oxford', country:'United Kingdom', region:'UK', rank:'QS #3', majors:['stem','medicine','law','arts','social'], desc:'One of the world\'s oldest and most prestigious universities, offering a unique tutorial-based education.', tags:['UCAS','Tutorial system','Research'] },
  { id:7, name:'University of Cambridge', short:'Cambridge', country:'United Kingdom', region:'UK', rank:'QS #2', majors:['stem','medicine','law','arts','social'], desc:'Consistently ranked #1–2 globally, renowned for mathematics, natural sciences, and law.', tags:['UCAS','College system','Nobel laureates'] },
  { id:8, name:'Imperial College London', short:'Imperial', country:'United Kingdom', region:'UK', rank:'QS #8', majors:['stem','medicine','business'], desc:'A specialist science, technology, engineering, and medicine university in the heart of London.', tags:['UCAS','STEM focus','London'] },
  { id:9, name:'UCL', short:'UCL', country:'United Kingdom', region:'UK', rank:'QS #9', majors:['stem','medicine','law','arts','social'], desc:'London\'s leading multidisciplinary university with global research impact.', tags:['UCAS','London','Multidisciplinary'] },
  { id:10, name:'University of Edinburgh', short:'Edinburgh', country:'United Kingdom', region:'UK', rank:'QS #27', majors:['stem','medicine','arts','law','social'], desc:'One of the UK\'s ancient universities, known for medicine, arts and sciences.', tags:['UCAS','Ancient university','4-year degree'] },
  { id:11, name:'University of Manchester', short:'Manchester', country:'United Kingdom', region:'UK', rank:'QS #32', majors:['stem','medicine','business','social','arts'], desc:'A Russell Group university with strong research and vibrant student life.', tags:['UCAS','Russell Group','Research'] },
  // US
  { id:12, name:'MIT', short:'MIT', country:'United States', region:'US', rank:'QS #1', majors:['stem','business'], desc:'The world\'s top technology and science institute, home to countless Nobel laureates and innovators.', tags:['CommonApp','Engineering','Research'] },
  { id:13, name:'Harvard University', short:'Harvard', country:'United States', region:'US', rank:'QS #4', majors:['stem','medicine','law','business','arts','social'], desc:'America\'s oldest university and a global symbol of academic excellence.', tags:['CommonApp','Ivy League','Legacy'] },
  { id:14, name:'Stanford University', short:'Stanford', country:'United States', region:'US', rank:'QS #5', majors:['stem','medicine','law','business','social','arts'], desc:'Silicon Valley\'s academic powerhouse, renowned for entrepreneurship and innovation.', tags:['CommonApp','Silicon Valley','Entrepreneurship'] },
  { id:15, name:'NYU', short:'NYU', country:'United States', region:'US', rank:'QS #58', majors:['business','arts','law','social'], desc:'A vibrant urban university in New York City with strong programmes in business, arts, and law.', tags:['CommonApp','NYC','Global'] },
  { id:16, name:'UC Berkeley', short:'Berkeley', country:'United States', region:'US', rank:'QS #12', majors:['stem','law','business','social','arts'], desc:'Top public research university known for tech, social sciences, and activism.', tags:['UC System','Public Ivy','California'] },
  // Canada
  { id:17, name:'University of Toronto', short:'UofT', country:'Canada', region:'CA', rank:'QS #25', majors:['stem','medicine','law','business','arts','social'], desc:'Canada\'s top university with comprehensive programmes across all major fields.', tags:['OUAC','Research-intensive','Multicultural'] },
  { id:18, name:'McGill University', short:'McGill', country:'Canada', region:'CA', rank:'QS #29', majors:['stem','medicine','law','arts','social'], desc:'Known as the Harvard of Canada, with exceptional medicine and law faculties.', tags:['CEGEP/HS','Bilingual','Montreal'] },
  { id:19, name:'UBC', short:'UBC', country:'Canada', region:'CA', rank:'QS #34', majors:['stem','business','arts','social','medicine'], desc:'Beautiful Pacific campus with world-class research and diverse student community.', tags:['Direct admission','Vancouver','Sustainability'] },
  // Australia
  { id:20, name:'University of Melbourne', short:'UniMelb', country:'Australia', region:'AU', rank:'QS #13', majors:['stem','medicine','law','business','arts','social'], desc:'Australia\'s top university with a Melbourne Model curriculum offering broad undergraduate education.', tags:['UAC','Group of 8','Melbourne Model'] },
  { id:21, name:'ANU', short:'ANU', country:'Australia', region:'AU', rank:'QS #30', majors:['stem','law','social','arts','business'], desc:'Australia\'s national university, strong in research, law, and political science.', tags:['Direct','Canberra','Research'] },
  { id:22, name:'UNSW Sydney', short:'UNSW', country:'Australia', region:'AU', rank:'QS #18', majors:['stem','business','law','medicine'], desc:'A leading research university in Sydney with strong engineering and business schools.', tags:['UAC','Sydney','Engineering'] }
];

function computeMatchScore(school) {
  let score = 50;
  const p = state.profile;
  const gradeFilled = p && Object.keys(state.grades[p.curriculum] || {}).length > 0;
  const actCount = state.activities.length;

  // Region preference boost
  if (p && p.regions.includes(school.region)) score += 15;
  // Major match
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
  if (gradeFilled) score += 8;
  if (actCount >= 3) score += 7;
  if (actCount >= 6) score += 5;
  if (state.ps.generated) score += 5;

  // Noise
  score += Math.round((Math.random() - 0.5) * 10);
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

function renderSchools(schools) {
  const grid = document.getElementById('schoolGrid');
  if (!grid) return;
  if (!schools.length) {
    grid.innerHTML = '<div style="color:var(--text3);padding:20px">No schools match your filters.</div>';
    return;
  }
  grid.innerHTML = schools.map(s => {
    const matchLabels = { reach: '衝刺 Reach', target: '目標 Target', safety: '保底 Safety' };
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
      <div class="school-tags">
        ${s.tags.map(t => `<span class="school-tag">${t}</span>`).join('')}
      </div>
      <div class="school-actions">
        <button class="btn-secondary" style="font-size:0.8rem;padding:7px 14px" onclick="toast('Added ${s.name} to shortlist!','success')">
          <i class="fas fa-plus"></i> Shortlist
        </button>
        <button class="btn-outline" style="font-size:0.8rem;padding:7px 14px" onclick="toast('Opening ${s.name} info…','info')">
          <i class="fas fa-info-circle"></i> Details
        </button>
      </div>
    </div>`;
  }).join('');
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
      document.getElementById('profileSetup').style.display = 'none';
      document.getElementById('dashboardGrid').style.display = 'grid';
      renderDashboard();
    }
    const grades = localStorage.getItem('pathspire_grades');
    if (grades) state.grades = JSON.parse(grades);

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
  renderSchools(SCHOOL_DATA.slice(0, 6).map(s => ({
    ...s, score: 72, level: 'target'
  })));
  // Init PS step nav buttons visibility
  goPSStep(1);
});
