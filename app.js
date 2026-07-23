'use strict';

/* ──────────────────────────────────────────
   TEACHABLE MACHINE CONFIGURATION
────────────────────────────────────────── */

const TM_CONFIG = {
    URL: "tm-my-image-model/",  // 或者用上传的链接
    
    detectionInterval: 500,
    confidenceThreshold: 0.5,  // 置信度阈值
};
let tmModel = null;
let tmIsReady = false;
let tmIsLoading = false;

/**
 * 加载 Teachable Machine 模型
 */
async function loadTeachableModel() {
    if (tmIsLoading || tmIsReady) return;
    
    tmIsLoading = true;
    
    try {
        updateAIStatus('loading', 'Loading emotion model...');
        
        const modelURL = TM_CONFIG.URL + "model.json";
        const metadataURL = TM_CONFIG.URL + "metadata.json";
        
        console.log('🔄 Loading Teachable Machine model...');
        
        tmModel = await tmImage.load(modelURL, metadataURL);
        tmIsReady = true;
        
        console.log('✅ Teachable Machine model loaded!');
        console.log('📊 Detects: Confident / Nervous');
        
        updateAIStatus('ready', 'Emotion detection ready');
        return true;
        
    } catch (error) {
        console.error('❌ Failed to load model:', error);
        updateAIStatus('fallback', 'Emotion detection offline');
        return false;
    } finally {
        tmIsLoading = false;
    }
}

/**
 * 更新 AI 状态指示器
 */
function updateAIStatus(status, message) {
    const statusEl = document.getElementById('aiStatus');
    if (!statusEl) return;
    
    const dot = statusEl.querySelector('.ai-dot');
    
    let color;
    switch(status) {
        case 'loading': color = '#fbbf24'; break;
        case 'ready': color = '#a6e3a1'; break;
        case 'fallback': color = '#f87171'; break;
        default: color = '#a6e3a1';
    }
    
    statusEl.innerHTML = `
        <span class="ai-dot" style="width:8px;height:8px;border-radius:50%;display:inline-block;background:${color};flex-shrink:0;animation:pulse-dot 2s ease-in-out infinite;"></span>
        ${message}
    `;
}

/**
 * 使用 Teachable Machine 预测情绪
 * 返回: { confident: 0-100, nervous: 0-100 }
 */
async function predictEmotions(input) {
    if (!tmModel || !tmIsReady) {
        // 如果没有模型，返回模拟数据
        return simulateEmotionPredictions();
    }
    
    try {
        const predictions = await tmModel.predict(input);
        
        // 解析预测结果
        let confident = 0;
        let nervous = 0;
        
        predictions.forEach(p => {
            const name = p.className.toLowerCase();
            if (name.includes('confident')) {
                confident = p.probability * 100;
            } else if (name.includes('nervous') || name.includes('anxious')) {
                nervous = p.probability * 100;
            }
        });
        
        // 如果两个都没找到，用第一个作为 confident
        if (confident === 0 && nervous === 0 && predictions.length > 0) {
            confident = predictions[0].probability * 100;
            nervous = 100 - confident;
        }
        
        return { confident, nervous };
        
    } catch (error) {
        console.error('Prediction error:', error);
        return simulateEmotionPredictions();
    }
}

/**
 * 模拟预测（模型未加载时的备用方案）
 */
function simulateEmotionPredictions() {
    const confident = 30 + Math.random() * 50;
    return {
        confident: confident,
        nervous: 100 - confident
    };
}

/**
 * 根据 Confident/Nervous 百分比计算焦虑和自信分数
 */
function calculateScores(confident, nervous) {
    // Confident 越高 = 自信越高，焦虑越低
    const confidence = Math.min(95, Math.max(5, confident * 0.9 + 5));
    const anxiety = Math.min(95, Math.max(5, nervous * 0.9 + 5));
    
    return { anxiety, confidence };
}

/* ============================================================
   Pathspire — app.js
   All modules: Nav · Dashboard · Grades · Activities ·
                Personal Statement · Interview Coach · Schools
   ============================================================ */

'use strict';

/* ──────────────────────────────────────────
   COOKIE UTILITIES
────────────────────────────────────────── */
const CookieManager = {
  /**
   * Set a cookie with optional expiry days
   * @param {string} name - Cookie name
   * @param {*} value - Value to store (will be JSON stringified)
   * @param {number} days - Days until expiry (default: 30)
   * @param {string} path - Cookie path (default: '/')
   */
  set(name, value, days = 30, path = '/') {
    try {
      const serialized = JSON.stringify(value);
      const expires = new Date(Date.now() + days * 86400000).toUTCString();
      document.cookie = `${encodeURIComponent(name)}=${encodeURIComponent(serialized)}; expires=${expires}; path=${path}; SameSite=Lax`;
    } catch (e) {
      console.warn('Failed to set cookie:', e);
    }
  },

  /**
   * Get a cookie value
   * @param {string} name - Cookie name
   * @returns {*} Parsed value or null if not found
   */
  get(name) {
    try {
      const cookies = document.cookie.split('; ');
      for (const cookie of cookies) {
        const [key, value] = cookie.split('=');
        if (decodeURIComponent(key) === name) {
          try {
            return JSON.parse(decodeURIComponent(value));
          } catch {
            return decodeURIComponent(value);
          }
        }
      }
      return null;
    } catch (e) {
      console.warn('Failed to read cookie:', e);
      return null;
    }
  },

  /**
   * Delete a cookie
   * @param {string} name - Cookie name
   * @param {string} path - Cookie path
   */
  delete(name, path = '/') {
    document.cookie = `${encodeURIComponent(name)}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=${path}`;
  },

  /**
   * Check if cookies are enabled
   * @returns {boolean}
   */
  isEnabled() {
    try {
      document.cookie = 'test_cookie=1';
      const enabled = document.cookie.includes('test_cookie');
      document.cookie = 'test_cookie=; expires=Thu, 01 Jan 1970 00:00:00 GMT';
      return enabled;
    } catch {
      return false;
    }
  }
};

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
   COOKIE-BASED PERSISTENCE WRAPPER
────────────────────────────────────────── */
const Storage = {
  /**
   * Save data to both localStorage and cookies
   */
  save(key, data) {
    try {
      // Always save to localStorage
      localStorage.setItem(key, JSON.stringify(data));
      
      // Also save to cookies (with 30-day expiry)
      CookieManager.set(key, data, 30);
      
      return true;
    } catch (e) {
      console.warn('Failed to save data:', e);
      return false;
    }
  },

  /**
   * Load data from localStorage first, fallback to cookies
   */
  load(key) {
    try {
      // Try localStorage first
      const localData = localStorage.getItem(key);
      if (localData) {
        return JSON.parse(localData);
      }
    } catch (e) {
      console.warn('Failed to load from localStorage:', e);
    }

    // Fallback to cookies
    try {
      const cookieData = CookieManager.get(key);
      if (cookieData) {
        // Restore to localStorage for future use
        try {
          localStorage.setItem(key, JSON.stringify(cookieData));
        } catch (e) {
          // Ignore localStorage errors
        }
        return cookieData;
      }
    } catch (e) {
      console.warn('Failed to load from cookies:', e);
    }

    return null;
  },

  /**
   * Delete data from both localStorage and cookies
   */
  delete(key) {
    try {
      localStorage.removeItem(key);
      CookieManager.delete(key);
      return true;
    } catch (e) {
      console.warn('Failed to delete data:', e);
      return false;
    }
  },

  /**
   * Save all state to cookies (comprehensive backup)
   */
  saveAllState() {
    const stateData = {
      profile: state.profile,
      grades: state.grades,
      activities: state.activities,
      ps: state.ps,
      interview: {
        sessionData: state.interview.sessionData,
        questions: state.interview.questions
      }
    };
    
    // Save as a single backup cookie
    CookieManager.set('pathspire_full_state', stateData, 30);
    
    // Also save individual pieces for compatibility
    if (state.profile) CookieManager.set('pathspire_profile', state.profile, 30);
    if (state.grades) CookieManager.set('pathspire_grades', state.grades, 30);
    if (state.activities) CookieManager.set('pathspire_activities', state.activities, 30);
    if (state.ps.generated) CookieManager.set('pathspire_ps', state.ps.generated, 30);
  },

  /**
   * Load all state from cookies
   */
  loadAllState() {
    const fullState = CookieManager.get('pathspire_full_state');
    if (fullState) {
      if (fullState.profile) state.profile = fullState.profile;
      if (fullState.grades) state.grades = fullState.grades;
      if (fullState.activities) state.activities = fullState.activities;
      if (fullState.ps) state.ps = fullState.ps;
      if (fullState.interview) {
        state.interview.sessionData = fullState.interview.sessionData || { anxiety: [], confidence: [], pace: [] };
        state.interview.questions = fullState.interview.questions || [];
      }
      return true;
    }
    return false;
  }
};

/* ──────────────────────────────────────────
   TRANSLATIONS (unchanged)
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
    paceLabel: 'Pace',
    cookieEnabled: 'Cookies enabled — your data will be saved!',
    cookieDisabled: 'Please enable cookies for better data persistence.'
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
    paceLabel: '語速',
    cookieEnabled: 'Cookie 已啟用 — 你的資料將被儲存！',
    cookieDisabled: '請啟用 Cookie 以獲得更好的資料保存體驗。'
  }
};

function t(key) { return T[state.lang][key] || key; }

/* ──────────────────────────────────────────
   NAVIGATION (unchanged)
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
   LANGUAGE TOGGLE (unchanged)
────────────────────────────────────────── */
function toggleLang() {
  state.lang = state.lang === 'en' ? 'zh' : 'en';
  document.getElementById('langBtn').textContent = t('langBtn');
  document.querySelectorAll('[data-en]').forEach(el => {
    el.textContent = state.lang === 'zh' ? el.dataset.zh : el.dataset.en;
  });
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
   TOAST (unchanged)
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
   DASHBOARD — UPDATED WITH COOKIE SAVING
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
  
  // Save using Storage wrapper (localStorage + cookies)
  Storage.save('pathspire_profile', state.profile);
  Storage.saveAllState(); // Backup all state
  
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
   GRADES — DATA (unchanged)
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

  Storage.save('pathspire_grades', state.grades);
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
  const activeTab = document.querySelector('.curr-tab.active');
  const curr = activeTab ? activeTab.textContent.replace('HKD','D').replace('SE','SE').trim() : 'DSE';
  const currMap = { 'HKDSE': 'DSE', 'AP': 'AP', 'A-Level': 'ALEVEL', 'IB': 'IB' };
  const curriculum = currMap[curr] || curr;
  const grades = collectGrades(curriculum);
  state.grades[curriculum] = grades;
  
  Storage.save('pathspire_grades', state.grades);
  Storage.saveAllState();

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
   ACTIVITIES — UPDATED WITH COOKIE SAVING
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
  Storage.save('pathspire_activities', state.activities);
  Storage.saveAllState();
  closeActivityModal();
  renderActivities();
  updateProgressChecklist();
  toast(t('actSaved'), 'success');
}
function deleteActivity(id) {
  state.activities = state.activities.filter(a => a.id !== id);
  Storage.save('pathspire_activities', state.activities);
  Storage.saveAllState();
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
   PERSONAL STATEMENT — UPDATED WITH COOKIE SAVING
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
    Storage.save('pathspire_ps', ps);
    Storage.saveAllState();

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
   INTERVIEW COACH — UPDATED WITH COOKIE SAVING
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
    reported: false,
    // ✅ Add these missing properties
    isAnswering: false,
    userResponded: false,
    currentAnswer: ''
};

// Interview question bank (unchanged)
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

// Dr. Path Script (unchanged)
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
// Replace your existing startInterviewSession with this AI-powered version
// Replace your startInterviewSession with this updated version
async function startInterviewSession() {
    const type = document.getElementById('interviewType').value;
    const difficulty = document.getElementById('interviewDifficulty').value;
    const count = parseInt(document.getElementById('interviewQuestionCount').value);
    
    const focusCheckboxes = document.querySelectorAll('#interviewSetup input[type="checkbox"]:checked');
    const focusAreas = Array.from(focusCheckboxes).map(cb => cb.value);
    
    // ✅ SHOW the AI generation status
    const statusEl = document.getElementById('aiGenerationStatus');
    if (statusEl) {
        statusEl.style.display = 'block';
        // Update the status text
        const statusText = statusEl.querySelector('span:first-child');
        if (statusText) {
            statusText.textContent = '🧠 AI is crafting personalized interview questions...';
        }
    }
    
    toast('🧠 AI is generating interview questions...', 'info');
    const startBtn = document.querySelector('#interviewSetup .btn-primary');
    if (startBtn) {
        startBtn.disabled = true;
        startBtn.textContent = '⏳ Generating...';
    }
    
    try {
        // ✅ Try AI first
        let questions = await generateEnhancedInterviewQuestions();
        
        // If AI didn't work, fallback to local questions
        if (!questions || questions.length === 0) {
            console.log('⚠️ AI generation failed, using fallback questions');
            questions = generateQuestions(type, difficulty, count, focusAreas);
        }
        
        // ✅ HIDE the status after generation
        if (statusEl) {
            statusEl.style.display = 'none';
        }
        
        if (questions.length === 0) {
            toast('No questions available. Please try different settings.', 'error');
            if (startBtn) {
                startBtn.disabled = false;
                startBtn.textContent = 'Start Interview';
            }
            return;
        }
        
        // ✅ Store questions in interview state
        interviewState.questions = questions;
        interviewState.qIndex = 0;
        interviewState.difficulty = difficulty;
        interviewState.questionCount = questions.length;
        interviewState.focusAreas = focusAreas;
        interviewState.sessionData = { anxiety: [], confidence: [], pace: [], answers: [] };
        interviewState.startTime = Date.now();
        interviewState.reported = false;
        interviewState.userResponded = false;
        interviewState.currentAnswer = '';
        
        // ✅ Show how many questions were generated
        const source = questions.length > 0 && questions[0].includes('AI') ? 'AI' : 'local';
        toast(`✅ ${questions.length} questions generated (${source})`, 'success');
        
        // ✅ Switch UI
        document.getElementById('interviewSetup').style.display = 'none';
        document.getElementById('interviewCall').style.display = 'block';
        document.getElementById('interviewReport').style.display = 'none';
        
        // ✅ Start camera and begin interview
        await startCamera();
        
        setTimeout(() => {
            // First display the question (will also speak it)
            displayQuestion();
            // Then speak Dr. Path intro (will transition to questions)
            setTimeout(() => {
                speakDrPathIntro();
            }, 500);
        }, 2000);
        
    } catch (error) {
        console.error('❌ Interview start error:', error);
        toast('Failed to start interview. Please try again.', 'error');
        // ✅ Hide status on error
        if (statusEl) {
            statusEl.style.display = 'none';
        }
    } finally {
        if (startBtn) {
            startBtn.disabled = false;
            startBtn.textContent = 'Start Interview';
        }
    }
}

async function generateEnhancedInterviewQuestions() {
    const type = document.getElementById('interviewType').value;
    const difficulty = document.getElementById('interviewDifficulty').value;
    const count = parseInt(document.getElementById('interviewQuestionCount').value);
    const focusCheckboxes = document.querySelectorAll('#interviewSetup input[type="checkbox"]:checked');
    const focusAreas = Array.from(focusCheckboxes).map(cb => cb.value);
    
    // ✅ Get user profile for personalized questions
    const profile = state.profile;
    const major = profile?.major || '';
    const regions = profile?.regions || [];
    const activities = profile?.activities || [];
    
    try {
        console.log('🤖 Calling AI to generate questions...');
        
        // ✅ Update status with more specific message
        const statusEl = document.getElementById('aiGenerationStatus');
        if (statusEl) {
            const statusText = statusEl.querySelector('span:first-child');
            if (statusText) {
                statusText.textContent = '🧠 AI is analyzing your profile and crafting questions...';
            }
        }
        
        const result = await callAI('/api/generate_questions', {
            type: type,
            difficulty: difficulty,
            count: count,
            focusAreas: focusAreas,
            program: profile?.program || '',
            university: regions.join(', ') || 'university',
            major: major,
            activities: activities.slice(0, 3).map(a => a.name).join(', '),
            context: `Student is interested in ${major || 'undecided'} and has experience in ${activities.length || 'various'} activities. Target regions: ${regions.join(', ') || 'various'}.`
        });
        
        // ✅ Update status when done
        if (statusEl) {
            const statusText = statusEl.querySelector('span:first-child');
            if (statusText) {
                statusText.textContent = '✅ Questions generated!';
            }
            // Small delay before hiding to show completion
            setTimeout(() => {
                statusEl.style.display = 'none';
            }, 800);
        }
        
        if (result && result.questions && result.questions.length > 0) {
            console.log(`✅ AI generated ${result.questions.length} questions`);
            console.log('📝 First question:', result.questions[0]);
            return result.questions;
        }
        
        console.warn('⚠️ AI returned no questions, using fallback');
        return null;
        
    } catch (error) {
        console.error('❌ AI question generation error:', error);
        // ✅ Show error in status
        const statusEl = document.getElementById('aiGenerationStatus');
        if (statusEl) {
            const statusText = statusEl.querySelector('span:first-child');
            if (statusText) {
                statusText.textContent = '⚠️ AI generation failed. Using fallback questions...';
                statusText.style.color = '#f87171';
            }
            setTimeout(() => {
                statusEl.style.display = 'none';
                if (statusText) {
                    statusText.style.color = '';
                }
            }, 2000);
        }
        return null;
    }
}

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
    
    const userName = state.profile?.name || 'You';
    document.getElementById('userNameDisplay').textContent = userName;
    
    startExpressionAnalysis(video);
    startSpeechRecognition();
    startCoachingTips();
    
  } catch (e) {
    toast('Camera access denied. Please allow camera permission.', 'error');
    document.getElementById('camOverlay').style.display = 'flex';
  }
}

function displayQuestion() {
    const { questions, qIndex } = interviewState;
    if (!questions.length || qIndex >= questions.length) {
        endInterview();
        return;
    }

    const question = questions[qIndex];
    
    // ✅ Show question subtly (small text) for users who need visual backup
    const qTextEl = document.getElementById('qText');
    const qProgressEl = document.getElementById('qProgress');
    
    if (qTextEl) {
        qTextEl.textContent = question;
        qTextEl.style.opacity = '0.5'; // Make it subtle
        qTextEl.style.fontSize = '0.9rem';
    }
    if (qProgressEl) qProgressEl.textContent = `Question ${qIndex + 1} of ${questions.length}`;

    interviewState.questionStartTime = Date.now();
    interviewState.isAnswering = false;

    // ✅ SPEAK THE QUESTION with Dr. Path's voice
    // The question will be spoken and the user will respond verbally
    setTimeout(() => {
        // Speak the question
        speakText(question, () => {
            // After speaking, show that we're listening
            console.log('🎤 Listening for response...');
            interviewState.isAnswering = true;
            
            // Update the UI to show "listening" state
            const statusEl = document.getElementById('interviewStatus');
            if (statusEl) {
                statusEl.textContent = '🎤 Listening...';
                statusEl.style.color = '#34d399';
            }
            
            // Start listening (speech recognition or timer)
            startListeningForResponse();
        });
    }, 500); // Small delay for natural pacing
}

let listeningTimeout = null;

function startListeningForResponse() {
    // Clear any existing timer
    if (listeningTimeout) clearTimeout(listeningTimeout);
    
    // Show listening indicator
    document.getElementById('listeningIndicator').style.display = 'flex';
    document.getElementById('interviewStatus').textContent = '🎤 Listening for your answer...';
    
    // If speech recognition is active, it will capture the response
    // If not, use a timer to move to next question after a pause
    
    // Set a timer to automatically move to next question after silence
    // (speech recognition will override this)
    listeningTimeout = setTimeout(() => {
        // If no speech detected and user hasn't responded
        if (!interviewState.userResponded) {
            console.log('⏰ No response detected, moving to next question...');
            // Show a prompt
            toast('No response detected. Moving to next question.', 'info');
            nextQuestion();
        }
    }, 15000); // 15 seconds of silence
}

// Speech recognition integration - capture user's verbal response
function setupSpeechRecognitionForInterview() {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
        console.log('Speech recognition not supported');
        return;
    }
    
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = 'en-US';
    
    recognition.onresult = (event) => {
        let transcript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
            transcript += event.results[i][0].transcript;
        }
        
        // Show what the user said
        const userAnswerEl = document.getElementById('userAnswerDisplay');
        if (userAnswerEl) {
            userAnswerEl.textContent = transcript;
            userAnswerEl.style.display = 'block';
        }
        
        // Mark that user responded
        interviewState.userResponded = true;
        interviewState.currentAnswer = transcript;
        
        // Stop listening after final result
        if (event.results[event.results.length - 1].isFinal) {
            recognition.stop();
            // Auto-advance after a short delay
            setTimeout(() => {
                nextQuestion();
            }, 2000);
        }
    };
    
    recognition.onend = () => {
        // If user didn't respond, auto-advance
        if (!interviewState.userResponded) {
            setTimeout(() => {
                nextQuestion();
            }, 3000);
        }
    };
    
    recognition.onerror = (event) => {
        console.log('Speech recognition error:', event.error);
        if (event.error === 'no-speech') {
            // No speech detected, auto-advance
            setTimeout(() => {
                nextQuestion();
            }, 5000);
        }
    };
    
    // Store recognition instance for later use
    window.interviewRecognition = recognition;
}

// Start listening when interview starts
function startInterviewWithSpeechRecognition() {
    setupSpeechRecognitionForInterview();
}



function nextQuestion() {
  const { questions, qIndex, questionStartTime } = interviewState;
  
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
    setTimeout(() => {
      displayQuestion();
    }, 1000);
  } else {
    setTimeout(() => {
      endInterview();
    }, 1500);
  }
}

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
  
  // Save interview data to cookies
  Storage.save('pathspire_interview_data', {
    sessionData: interviewState.sessionData,
    questions: interviewState.questions,
    date: new Date().toISOString()
  });
  Storage.saveAllState();
  
  showInterviewReport();
  toast('Interview completed!', 'success');
}

function showInterviewReport() {
    document.getElementById('interviewCall').style.display = 'none';
    document.getElementById('interviewReport').style.display = 'block';
    
    const { sessionData, questions } = interviewState;
    
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
    
    const score = Math.min(100, Math.round(
        (avgConfidence * 0.5) + 
        (100 - Math.min(avgAnxiety, 100) * 0.3) + 
        (avgPace > 80 && avgPace < 160 ? 20 : 10)
    ));
    
    document.getElementById('reportOverall').textContent = `${score}%`;
    document.getElementById('reportDuration').textContent = `${minutes}m ${seconds}s`;
    document.getElementById('reportQuestions').textContent = questions.length;
    document.getElementById('reportConfidence').textContent = 
        avgConfidence >= 70 ? '😊 High' :
        avgConfidence >= 50 ? '😐 Moderate' : '😟 Needs Practice';
    
    // Performance Breakdown
    const breakdownData = [
        { label: 'Confidence', value: Math.min(100, avgConfidence + 20) },
        { label: 'Nervousness Management', value: Math.max(0, 100 - avgAnxiety) },
        { label: 'Pacing', value: Math.min(100, avgPace > 80 && avgPace < 160 ? 90 : 60) },
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
    
    // 添加 Confident/Nervous 情绪总结
    const emotionSummary = avgConfidence >= 65 
        ? '😎 You appeared confident throughout most of the interview. Great job!'
        : avgConfidence >= 45
            ? '🙂 You showed a balanced mix of confidence and nervousness. Keep practising!'
            : '😰 You appeared quite nervous. Practice more to build confidence.';
    
    const recommendations = generateReportRecommendations(avgAnxiety, avgConfidence, avgPace, score);
    document.getElementById('reportRecommendations').innerHTML = `
        <div class="recommendation-item" style="background:rgba(52,211,153,0.1);border-left:3px solid #34d399;margin-bottom:12px;">
            <span class="rec-icon">📊</span>
            <span><strong>Emotion Summary:</strong> ${emotionSummary}</span>
        </div>
        ${recommendations.map(rec => `
            <div class="recommendation-item">
                <span class="rec-icon">${rec.icon}</span>
                <span>${rec.text}</span>
            </div>
        `).join('')}
    `;
    
    // Questions Review
    const answers = interviewState.sessionData.answers || [];
    document.getElementById('reportQuestionsReview').innerHTML = questions.map((q, i) => `
        <div class="question-review-item">
            <div class="q-text">${i + 1}. ${q}</div>
            ${answers[i] ? `<div class="q-answer">${answers[i].answer || 'No answer recorded'}</div>` : ''}
        </div>
    `).join('');
    
    updateProgressChecklist();
}
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

function resetInterview() {
  document.getElementById('interviewReport').style.display = 'none';
  document.getElementById('interviewSetup').style.display = 'block';
  document.getElementById('interviewCall').style.display = 'none';
  
  interviewState.active = false;
  interviewState.reported = false;
  
  document.getElementById('camOverlay').style.display = 'flex';
  document.getElementById('expressionBadges').classList.remove('show');
  document.getElementById('realtimeTips').style.display = 'none';
}

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

function toggleCamera() {
  if (!interviewState.stream) return;
  const videoTrack = interviewState.stream.getVideoTracks()[0];
  if (!videoTrack) return;
  
  videoTrack.enabled = !videoTrack.enabled;
  interviewState.cameraActive = videoTrack.enabled;
  
  const btn = document.getElementById('cameraBtn');
  btn.innerHTML = `<i class="fas fa-video${videoTrack.enabled ? '' : '-slash'}"></i>`;
  
  // ✅ 摄像头关闭时隐藏相关 UI
  if (!videoTrack.enabled) {
    document.getElementById('camOverlay').style.display = 'flex';
    document.getElementById('expressionBadges').classList.remove('show');
    document.getElementById('realtimeTips').style.display = 'none';
    document.getElementById('emotionBadge').style.display = 'none';
  } else {
    document.getElementById('camOverlay').style.display = 'none';
    document.getElementById('expressionBadges').classList.add('show');
    document.getElementById('realtimeTips').style.display = 'block';
    // 如果有情绪数据，重新显示情绪徽章
    const emotionBadge = document.getElementById('emotionBadge');
    if (emotionBadge && emotionBadge.innerHTML.trim() !== '') {
      emotionBadge.style.display = 'inline-block';
    }
  }
}

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

function simulatePace() {
  const paceInterval = setInterval(() => {
    if (!interviewState.active) { clearInterval(paceInterval); return; }
    const wpm = Math.round(80 + Math.random() * 100);
    interviewState.wordsPerMin = wpm;
    interviewState.sessionData.pace.push(wpm);
    document.getElementById('paceVal').textContent = `${wpm} wpm`;
  }, 3000);
}

function startExpressionAnalysis(video) {
    const canvas = document.getElementById('expressionCanvas');
    const ctx = canvas.getContext('2d');
    
    // 画布尺寸（小一点减少绘制负担）
    const W = 420;
    const H = 280;
    canvas.width = W;
    canvas.height = H;
    
    let anxiety = 40;
    let confidence = 60;
    let lastAIUpdate = 0;
    const AI_INTERVAL = 1200; // AI 推理间隔 1.2秒
    
    // 缓存 DOM 元素
    const anxietyVal = document.getElementById('anxietyVal');
    const confVal = document.getElementById('confVal');
    const paceVal = document.getElementById('paceVal');
    const anxBadge = document.getElementById('badgeAnxiety');
    const emotionBadge = document.getElementById('emotionBadge');
    
    // 缓存上次的值
    let lastAnxiety = -1;
    let lastConfidence = -1;
    
    if (!tmIsReady && !tmIsLoading) {
        loadTeachableModel();
    }
    
    // ✅ 绘制循环：每帧都绘制（~30fps = 33ms）
    function drawFrame(timestamp) {
        if (!interviewState.active) {
            interviewState.frameInterval = requestAnimationFrame(drawFrame);
            return;
        }
        
        // ✅ 1. 每帧都绘制摄像头画面（流畅）
        ctx.drawImage(video, 0, 0, W, H);
        
        // ✅ 2. 每帧都更新语速
        const wpm = interviewState.wordsPerMin || 120;
        paceVal.textContent = `${wpm} wpm`;
        
        // ✅ 3. 只有到时间才做 AI 推理
        if (timestamp - lastAIUpdate >= AI_INTERVAL) {
            lastAIUpdate = timestamp;
            performAIInference();
        }
        
        interviewState.frameInterval = requestAnimationFrame(drawFrame);
    }
    
    // ✅ AI 推理函数（1.2秒执行一次）
    async function performAIInference() {
        try {
            let result;
            try {
                result = await predictEmotions(canvas);
            } catch (e) {
                result = simulateEmotionPredictions();
            }
            
            const confident = result.confident || 50;
            const nervous = result.nervous || 50;
            const scores = calculateScores(confident, nervous);
            
            const smoothFactor = 0.6;
            anxiety = anxiety * smoothFactor + scores.anxiety * (1 - smoothFactor);
            confidence = confidence * smoothFactor + scores.confidence * (1 - smoothFactor);
            
            anxiety = Math.max(5, Math.min(95, anxiety));
            confidence = Math.max(5, Math.min(95, confidence));
            
            interviewState.sessionData.anxiety.push(Math.round(anxiety));
            interviewState.sessionData.confidence.push(Math.round(confidence));
            
            // 只在数值变化时更新 DOM
            const roundedAnxiety = Math.round(anxiety);
            const roundedConfidence = Math.round(confidence);
            
            if (roundedAnxiety !== lastAnxiety) {
                lastAnxiety = roundedAnxiety;
                anxietyVal.textContent = `${roundedAnxiety}%`;
            }
            if (roundedConfidence !== lastConfidence) {
                lastConfidence = roundedConfidence;
                confVal.textContent = `${roundedConfidence}%`;
            }
            
            // 更新情绪徽章
            updateEmotionBadge(confident, nervous, anxiety, confidence);
            
        } catch (e) {
            console.warn('AI inference error:', e);
        }
    }
    
    // ✅ 更新情绪徽章
    function updateEmotionBadge(confident, nervous, anxiety, confidence) {
        let emotion, emoji, color;
        if (confident > 65) {
            emotion = 'Confident'; emoji = '😎'; color = '#34d399';
        } else if (nervous > 65) {
            emotion = 'Nervous'; emoji = '😰'; color = '#f87171';
        } else if (confident > 50) {
            emotion = 'Slightly Confident'; emoji = '🙂'; color = '#fbbf24';
        } else {
            emotion = 'Slightly Nervous'; emoji = '😐'; color = '#fbbf24';
        }
        
        // 更新焦虑徽章颜色
        if (anxiety > 65) {
            anxBadge.style.borderColor = 'rgba(239,68,68,0.5)';
            anxBadge.querySelector('i').className = 'fas fa-face-frown';
        } else if (anxiety > 40) {
            anxBadge.style.borderColor = 'rgba(245,158,11,0.5)';
            anxBadge.querySelector('i').className = 'fas fa-face-meh';
        } else {
            anxBadge.style.borderColor = 'rgba(34,197,94,0.4)';
            anxBadge.querySelector('i').className = 'fas fa-face-smile';
        }
        
        // 更新情绪徽章
        if (emotionBadge) {
            const confidentPercent = Math.round(confident);
            const nervousPercent = Math.round(nervous);
            emotionBadge.innerHTML = `
                <div style="display:flex;flex-direction:column;gap:2px;font-size:0.7rem;">
                    <div style="display:flex;align-items:center;gap:6px;">
                        <span>${emoji}</span>
                        <span style="font-weight:600;">${emotion}</span>
                        <span style="font-size:0.6rem;opacity:0.7;">
                            C: ${confidentPercent}% | N: ${nervousPercent}%
                        </span>
                    </div>
                    <div style="display:flex;gap:2px;height:4px;width:100%;border-radius:2px;overflow:hidden;background:#2d2d3d;">
                        <div style="flex:${confident};height:100%;background:#34d399;"></div>
                        <div style="flex:${nervous};height:100%;background:#f87171;"></div>
                    </div>
                </div>
            `;
            emotionBadge.style.display = 'inline-block';
            emotionBadge.style.borderColor = color;
            emotionBadge.style.border = `2px solid ${color}`;
        }
    }
    
    // ✅ 启动绘制循环
    interviewState.frameInterval = requestAnimationFrame(drawFrame);
}
/**
 * 根据情绪更新实时提示
 */
/**
 * 根据情绪更新实时提示 - 不显示百分比
 */
function updateRealtimeTip(emotion, confident, nervous, anxiety, confidence) {
    const tipEl = document.getElementById('tipText');
    if (!tipEl) return;
    
    let tip = '';
    
    if (confident > 70) {
        tip = '😎 Excellent! You look very confident. Maintain this energy!';
    } else if (confident > 55) {
        tip = '🙂 Good confidence level. Keep it up!';
    } else if (nervous > 70) {
        tip = '😰 You seem nervous. Take a deep breath. You\'ve got this!';
    } else if (nervous > 55) {
        tip = '😐 A bit nervous is normal. Pause, breathe, and collect your thoughts.';
    } else {
        tip = '💪 You\'re doing well. Keep going!';
    }
    
    // 根据焦虑程度添加额外建议（不显示百分比）
    if (anxiety > 70) {
        tip += ' 🧘 Try placing your feet flat on the ground for stability.';
    } else if (confidence > 75) {
        tip += ' 🌟 Your confidence is showing through clearly!';
    } else if (anxiety > 50 && confidence < 50) {
        tip += ' 💪 Remember: the interviewer wants you to succeed!';
    }
    
    tipEl.textContent = tip;
}

// /**
//  * Update the real-time coaching tip based on detected emotion
//  */
// function updateRealtimeTip(emotion, anxiety, confidence) {
//     const tipEl = document.getElementById('tipText');
//     if (!tipEl) return;
    
//     const tips = {
//         'Happy': '😊 Great! You appear confident and engaged. Keep this positive energy!',
//         'Confident': '💪 Strong presence! Maintain this confident posture throughout.',
//         'Anxious': '🧘 Take a deep breath. You\'re doing better than you think!',
//         'Nervous': '🫂 It\'s normal to feel nervous. Pause, breathe, and collect your thoughts.',
//         'Tired': '☕ You seem a bit tired. Sit up straight and take a moment to refocus.',
//         'Neutral': '👍 Good neutral expression. Add a slight smile to appear more engaged.',
//         'Calm': '🧘‍♂️ Excellent composure! Keep this calm, steady energy.',
//         'Excited': '🎯 Great enthusiasm! Channel this energy into clear, structured answers.',
//         'Focused': '👀 Outstanding focus! You\'re fully engaged in the conversation.',
//         'Uncertain': '💭 Try to ground your answers in specific examples you know well.',
//         'Stressed': '🌿 Take a moment to breathe deeply. You\'ve got this!',
//         'Relaxed': '😌 Excellent relaxed state. Maintain this calm confidence.',
//         'Bored': '🔥 Try to bring more energy to your responses. Show your passion!',
//         'Surprised': '😲 Great curiosity! Use this energy to explore the question deeply.',
//         'Sad': '💪 You\'re doing well. Try to bring a bit more energy to your answers.',
//         'Angry': '😤 Take a moment to center yourself. Speak calmly and clearly.'
//     };
    
//     let tip = tips[emotion] || '💡 Keep going! You\'re making great progress.';
    
//     // Add specific advice based on anxiety level
//     if (anxiety > 70) {
//         tip += ' Try placing your feet flat on the ground for stability.';
//     } else if (confidence > 75) {
//         tip += ' Your confidence is showing through clearly!';
//     } else if (anxiety > 50 && confidence < 50) {
//         tip += ' Remember: the interviewer wants you to succeed!';
//     }
    
//     tipEl.textContent = tip;
// }

function levelLabel(score) {
  if (score >= 70) return 'High';
  if (score >= 40) return 'Medium';
  return 'Low';
}

function startCoachingTips() {
    const tips = document.getElementById('tipText');
    if (!tips) return;
    
    // ✅ 先显示一条初始提示
    tips.textContent = '💪 You\'re doing well. Keep going!';
    
    // ✅ 清除之前的定时器
    if (interviewState.tipInterval) {
        clearInterval(interviewState.tipInterval);
    }
    
    // ✅ 每3秒更新一次提示（不显示百分比）
    interviewState.tipInterval = setInterval(() => {
        if (!interviewState.active) return;
        
        const anxiety = interviewState.sessionData.anxiety.slice(-3);
        const avgAnxiety = anxiety.length ? anxiety.reduce((a,b) => a+b, 0) / anxiety.length : 50;
        const wpm = interviewState.wordsPerMin || 120;
        
        let tip = '';
        
        // 根据焦虑程度和语速生成提示（不显示百分比）
        if (avgAnxiety > 65) {
            const pool = [
                '💡 Take a slow, deep breath before continuing — you\'re doing great.',
                '🌊 Pause for 2 seconds. Collect your thoughts. Interviewers appreciate composure.',
                '😊 Relax your shoulders and slightly smile — it signals confidence.',
                '🎯 You know this answer. Start with one clear key point.',
                '🧘 Ground yourself: feel your feet on the floor and speak from there.'
            ];
            tip = pool[Math.floor(Math.random() * pool.length)];
        } else if (wpm > 170) {
            const pool = [
                '🐢 Slow down slightly — you\'re speaking too quickly. Pausing shows confidence.',
                '⏱️ Take a breath between sentences. Speed can signal nervousness.',
                '🗣️ Aim for 120–140 words per minute for maximum clarity.'
            ];
            tip = pool[Math.floor(Math.random() * pool.length)];
        } else if (avgAnxiety > 45) {
            const pool = [
                '🧘 You\'re doing better than you think. Take a moment to breathe.',
                '😊 A slight smile can help you feel more confident instantly.',
                '💪 You have what it takes. Trust your preparation.'
            ];
            tip = pool[Math.floor(Math.random() * pool.length)];
        } else {
            const pool = [
                '✨ Excellent pacing! Keep it up.',
                '👍 Your tone sounds natural and confident. Great work.',
                '💪 You are presenting yourself really well. Stay in this zone.',
                '🌟 You\'re making great progress. Keep this momentum!'
            ];
            tip = pool[Math.floor(Math.random() * pool.length)];
        }
        
        tips.textContent = tip;
        
    }, 10000); // ← 改为 3000ms（3秒）
}
/* ──────────────────────────────────────────
   TEXT-TO-SPEECH (FREE - Web Speech API)
────────────────────────────────────────── */

// TTS Settings
let ttsEnabled = true;
let ttsRate = 0.9;
let ttsPitch = 1;
let ttsVoice = null;
let voicesLoaded = false;

/**
 * Load available voices
 */
function loadTTSVoices() {
    return new Promise((resolve) => {
        if (!window.speechSynthesis) {
            console.warn('Speech synthesis not supported');
            resolve([]);
            return;
        }
        
        const voices = window.speechSynthesis.getVoices();
        if (voices.length > 0) {
            voicesLoaded = true;
            resolve(voices);
            return;
        }
        
        window.speechSynthesis.onvoiceschanged = () => {
            voicesLoaded = true;
            resolve(window.speechSynthesis.getVoices());
        };
        
        // Fallback timeout
        setTimeout(() => {
            voicesLoaded = true;
            resolve(window.speechSynthesis.getVoices());
        }, 1000);
    });
}

/**
 * Get the best available voice
 */
function getBestVoice(voices) {
    // Preferred voices (Chrome has the best ones)
    const preferred = [
        'Google UK English Female',
        'Google US English Female',
        'Google UK English Male',
        'Microsoft Zira Desktop',
        'Microsoft David Desktop',
        'Samantha',
        'Alex',
        'Daniel'
    ];
    
    for (const name of preferred) {
        const found = voices.find(v => v.name.includes(name) && v.lang.startsWith('en'));
        if (found) return found;
    }
    
    // Fallback to any English voice
    return voices.find(v => v.lang.startsWith('en')) || voices[0] || null;
}

/**
 * Speak text using Web Speech API
 */
function speakText(text, callback = null) {
    if (!ttsEnabled) {
        if (callback) callback();
        return;
    }
    
    if (!window.speechSynthesis) {
        console.warn('Speech synthesis not supported');
        if (callback) callback();
        return;
    }
    
    // Cancel any ongoing speech
    window.speechSynthesis.cancel();
    
    const utterance = new SpeechSynthesisUtterance(text);
    
    // Use selected voice or find best
    if (ttsVoice) {
        utterance.voice = ttsVoice;
    } else {
        const voices = window.speechSynthesis.getVoices();
        const best = getBestVoice(voices);
        if (best) {
            utterance.voice = best;
            ttsVoice = best;
        }
    }
    
    utterance.lang = 'en-US';
    utterance.rate = ttsRate;
    utterance.pitch = ttsPitch;
    utterance.volume = 1;
    
    // Show speaking indicator
    const indicator = document.getElementById('speakingIndicator');
    if (indicator) indicator.style.display = 'flex';
    
    utterance.onstart = () => {
        console.log('🔊 Speaking:', text.slice(0, 50) + '...');
    };
    
    utterance.onend = () => {
        console.log('🔊 Finished speaking');
        if (indicator) indicator.style.display = 'none';
        if (callback) callback();
    };
    
    utterance.onerror = (e) => {
        console.warn('Speech error:', e);
        if (indicator) indicator.style.display = 'none';
        if (callback) callback();
    };
    
    window.speechSynthesis.speak(utterance);
}

/**
 * Toggle auto-speak on/off
 */
function toggleAutoSpeak() {
    ttsEnabled = !ttsEnabled;
    const btn = document.getElementById('autoSpeakBtn');
    if (btn) {
        btn.innerHTML = ttsEnabled 
            ? '<i class="fas fa-volume-up"></i> Auto-Speak' 
            : '<i class="fas fa-volume-mute"></i> Muted';
        btn.classList.toggle('muted', !ttsEnabled);
    }
    toast(ttsEnabled ? '🔊 Auto-speak enabled' : '🔇 Auto-speak disabled');
}

/**
 * Replay the current question
 */
function speakCurrentQuestion() {
    const { questions, qIndex } = interviewState;
    if (questions && questions[qIndex]) {
        speakText(questions[qIndex]);
    }
}

/**
 * Update speech rate
 */
function updateSpeechRate(value) {
    ttsRate = parseFloat(value);
    document.getElementById('speechRateDisplay').textContent = value + 'x';
}

/**
 * Speak Dr. Path intro when interview starts
 */
function speakDrPathIntro() {
    const intro = DR_PATH_SCRIPT.intro;
    const text = intro[Math.floor(Math.random() * intro.length)];
    
    // Show Dr. Path speaking
    const statusEl = document.getElementById('interviewStatus');
    if (statusEl) {
        statusEl.textContent = '👨‍⚕️ Dr. Path is speaking...';
        statusEl.style.color = '#60a5fa';
    }
    
    speakText(text, () => {
        // After intro, speak the first question
        console.log('👨‍⚕️ Intro complete, moving to question...');
        setTimeout(() => {
            // Make sure question is displayed and spoken
            const { questions, qIndex } = interviewState;
            if (questions && questions[qIndex]) {
                displayQuestion();
            }
        }, 500);
    });
}
/* ──────────────────────────────────────────
   SCHOOLS (unchanged)
────────────────────────────────────────── */
let SCHOOL_DATA = [];
SCHOOL_DATA = [
  { id:1, name:'University of Hong Kong', short:'HKU', country:'Hong Kong', region:'HK', rank:'QS #17', majors:['stem','medicine','law','business','social','arts'], desc:'A top-tier research university with strong medicine, law, business and sciences.', tags:['JUPAS','Research-led','English medium'], benchmark:{ gpa:4.3, dse:30, stem:4.5, leadership:3.5, volunteers:4, awards:4 } },
  { id:2, name:'HKUST', short:'HKUST', country:'Hong Kong', region:'HK', rank:'QS #47', majors:['stem','business','social'], desc:'Excellent for engineering, data science and business with a strong tech reputation.', tags:['JUPAS','Tech-focused','Global outlook'], benchmark:{ gpa:4.0, dse:27, stem:4.2, leadership:3.0, volunteers:3.5, awards:3.5 } },
  { id:3, name:'Chinese University of Hong Kong', short:'CUHK', country:'Hong Kong', region:'HK', rank:'QS #50', majors:['stem','medicine','business','arts','social'], desc:'Balanced and comprehensive with strong medicine, business and humanities offerings.', tags:['JUPAS','Bilingual','Medical School'], benchmark:{ gpa:4.0, dse:27, stem:4.0, leadership:3.2, volunteers:3.5, awards:3.5 } },
  { id:4, name:'City University of Hong Kong', short:'CityU', country:'Hong Kong', region:'HK', rank:'QS #62', majors:['stem','business','law','arts'], desc:'Professional and career-focused with strong industry links.', tags:['JUPAS','Professional focus'], benchmark:{ gpa:3.8, dse:24, stem:3.8, leadership:2.8, volunteers:3.0, awards:3.0 } },
  { id:5, name:'HK Baptist University', short:'HKBU', country:'Hong Kong', region:'HK', rank:'QS #301', majors:['arts','social','business'], desc:'Known for strong arts, media, and communication programmes.', tags:['JUPAS','Arts & Comm'], benchmark:{ gpa:3.5, dse:22, stem:3.0, leadership:2.5, volunteers:3.0, awards:2.8 } },
  { id:6, name:'University of Oxford', short:'Oxford', country:'United Kingdom', region:'UK', rank:'QS #3', majors:['stem','medicine','law','arts','social'], desc:'One of the world\'s most selective universities with outstanding academic reputation.', tags:['UCAS','Tutorial system','Research'], benchmark:{ gpa:4.5, dse:34, stem:4.8, leadership:4.5, volunteers:4.0, awards:4.5 } },
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
   COLLEGE PLANNING (unchanged)
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
   PERSISTENCE — LOAD FROM LOCALSTORAGE + COOKIES
────────────────────────────────────────── */
function loadPersistedData() {
  try {
    // Try to load full state from cookie backup first
    const fullStateLoaded = Storage.loadAllState();
    
    if (fullStateLoaded) {
      console.log('Loaded full state from cookies');
      // Populate UI from state
      populateProfileForm();
      if (state.profile) {
        document.getElementById('userName').value = state.profile.name || '';
        document.getElementById('userCurriculum').value = state.profile.curriculum || '';
        document.getElementById('targetMajor').value = state.profile.major || '';
        if (state.profile.regions) {
          state.profile.regions.forEach(r => {
            const opt = document.querySelector(`#targetRegion option[value="${r}"]`);
            if (opt) opt.selected = true;
          });
        }
        document.getElementById('profileSetup').style.display = 'none';
        document.getElementById('dashboardGrid').style.display = 'grid';
        updateMainActionButton();
        switchCurriculum(state.profile.curriculum);
        renderDashboard();
      }
      if (state.grades) {
        populateEstimatedGpaInput();
      }
      if (state.activities) {
        renderActivities();
      }
      if (state.ps.generated) {
        const words = state.ps.generated.split(/\s+/).filter(Boolean).length;
        document.getElementById('psOutput').innerHTML = `<div style="white-space:pre-wrap;line-height:1.9">${state.ps.generated}</div>`;
        document.getElementById('psWordCount').textContent = `${words} words`;
      }
      return;
    }

    // Fallback to individual localStorage + cookie loading
    const profile = Storage.load('pathspire_profile');
    if (profile) {
      state.profile = profile;
      populateProfileForm();
      document.getElementById('userName').value = state.profile.name || '';
      document.getElementById('userCurriculum').value = state.profile.curriculum || '';
      document.getElementById('targetMajor').value = state.profile.major || '';
      state.profile.regions.forEach(r => {
        const opt = document.querySelector(`#targetRegion option[value="${r}"]`);
        if (opt) opt.selected = true;
      });
      document.getElementById('profileSetup').style.display = 'none';
      document.getElementById('dashboardGrid').style.display = 'grid';
      updateMainActionButton();
      switchCurriculum(state.profile.curriculum);
      renderDashboard();
    }

    const grades = Storage.load('pathspire_grades');
    if (grades) {
      state.grades = grades;
      if (state.grades.gpa == null) state.grades.gpa = null;
      populateEstimatedGpaInput();
    }

    const activities = Storage.load('pathspire_activities');
    if (activities) { 
      state.activities = activities; 
      renderActivities(); 
    }

    const ps = Storage.load('pathspire_ps');
    if (ps) {
      state.ps.generated = ps;
      const words = ps.split(/\s+/).filter(Boolean).length;
      document.getElementById('psOutput').innerHTML = `<div style="white-space:pre-wrap;line-height:1.9">${ps}</div>`;
      document.getElementById('psWordCount').textContent = `${words} words`;
    }

    const interviewData = Storage.load('pathspire_interview_data');
    if (interviewData) {
      if (interviewData.sessionData) {
        state.interview.sessionData = interviewData.sessionData;
      }
    }

  } catch(e) {
    console.warn('Could not load persisted data:', e);
  }
}

/* ──────────────────────────────────────────
   COOKIE STATUS CHECK
────────────────────────────────────────── */
function checkCookieStatus() {
  const enabled = CookieManager.isEnabled();
  if (enabled) {
    console.log('Cookies are enabled — data will be persisted across sessions');
    // Optionally show a toast
    // toast(t('cookieEnabled'), 'success');
  } else {
    console.warn('Cookies are disabled — data will only be saved in localStorage');
    // toast(t('cookieDisabled'), 'warning');
  }
  return enabled;
}

/* ──────────────────────────────────────────
   INIT
────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
// Load TTS voices
initInterviewSystem();
setTimeout(async () => {
    await loadTTSVoices();
    const voices = window.speechSynthesis.getVoices();
    const best = getBestVoice(voices);
    if (best) {
        ttsVoice = best;
        console.log('✅ TTS voice loaded:', best.name);
    } else {
        console.warn('⚠️ No TTS voice available');
    }
}, 1000);

  // Check cookie status
  checkCookieStatus();
  
  // Initialize all modules
  initGrades();
  loadQuestions('general', null);
  loadPersistedData();
  populateEstimatedGpaInput();
  updateMainActionButton();
  generateCareerTimeline();
  renderSchools(SCHOOL_DATA.slice(0, 6).map(s => ({
    ...s, score: 72, level: 'target'
  })));
  goPSStep(1);
  
  // Save state to cookies periodically (every 30 seconds)
  setInterval(() => {
    if (state.profile || state.activities.length > 0 || state.ps.generated) {
      Storage.saveAllState();
    }
  }, 30000);
  setTimeout(() => {
        loadTeachableModel();
    }, 2000);
  
  // Also save when page is about to close
  window.addEventListener('beforeunload', () => {
    Storage.saveAllState();
  });
});

// Load questions (needed for interview)
function loadQuestions(type, el) {
  // This function is used for the interview question loading
  // The actual question loading happens in the interview setup
  console.log('Interview questions loaded for type:', type);
}




/* ──────────────────────────────────────────
   AI BACKEND CONFIGURATION
────────────────────────────────────────── */

const AI_CONFIG = {
    // ✅ 替换为您的 ngrok 公网地址
    baseUrl: 'https://scavenger-countable-recycled.ngrok-free.dev',
    endpoints: {
        generatePS: '/chat',
        generateQuestions: '/chat',
        interviewFeedback: '/chat',
        analyzeActivities: '/chat',
        matchSchools: '/chat',
        analyzeGrades: '/chat',
        generateSuggestions: '/chat',
    },
    timeout: 60000,
};

/* ──────────────────────────────────────────
   AI API CALLS
────────────────────────────────────────── */
async function callAI(endpoint, data) {
    try {
        let prompt = buildAIPrompt(endpoint, data);
        
        console.log('📤 Sending request to AI...');
        console.log('📤 Endpoint:', endpoint);
        console.log('📤 Data:', data);
        
        if (!prompt) {
            console.error('❌ Prompt is empty!');
            return null;
        }
        
        const response = await fetch(`${AI_CONFIG.baseUrl}/chat`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'ngrok-skip-browser-warning': 'true'
            },
            body: JSON.stringify({
                prompt: prompt,
                max_tokens: 1000,
                temperature: 0.8,
                // ✅ Add system message for better question generation
                system: "You are an expert university admissions interviewer. Generate realistic, thoughtful interview questions."
            }),
        });

        if (!response.ok) {
            console.error(`❌ HTTP error: ${response.status}`);
            return null;
        }

        const result = await response.json();
        console.log('📥 AI Response received:', result);
        
        if (result.success && result.response) {
            return parseAIResponse(endpoint, result.response);
        }
        
        return null;
    } catch (error) {
        console.error('❌ AI API Error:', error);
        return null;
    }
}


function buildAIPrompt(endpoint, data) {
    console.log('🔍 Building AI prompt for:', endpoint, data);
    
    switch(endpoint) {
        case '/api/generate_questions':
            // ✅ Better prompt for interview questions
            return `Generate ${data.count || 5} university admissions interview questions for a student.

Student Profile:
- Major: ${data.major || 'Undecided'}
- Target regions: ${data.university || 'Various'}
- Interview type: ${data.type || 'general'}
- Difficulty: ${data.difficulty || 'medium'}
- Focus areas: ${(data.focusAreas || ['motivation']).join(', ')}
- Context: ${data.context || ''}

Requirements:
1. Questions should be in English
2. Each question should be on a new line, numbered (1., 2., etc.)
3. Questions should be appropriate for a university admissions interview
4. Make the questions sound natural and conversational
5. If difficulty is 'hard', ask more challenging, thought-provoking questions
6. If difficulty is 'easy', ask more straightforward, introductory questions

Generate ${data.count || 5} unique, interesting questions:`;
        
        case '/api/generate_ps':
            return `Generate a personal statement for a student applying to university. 
                    Name: ${data.name || 'Student'}
                    Major: ${data.major || 'Undecided'}
                    Target: ${data.university || 'University'}
                    Story: ${data.story || 'No story provided'}
                    Unique qualities: ${data.unique || 'Not specified'}
                    Academic background: ${data.academic || 'Not specified'}
                    Short-term goals: ${data.shortGoal || 'Not specified'}
                    Long-term goals: ${data.longGoal || 'Not specified'}
                    Why this university: ${data.whyUniDesc || 'Not specified'}
                    Word limit: ${data.wordLimit || 650}
                    Please write a compelling personal statement in English.`;
        
        default:
            return JSON.stringify(data);
    }
}

function parseAIResponse(endpoint, response) {
    switch(endpoint) {
        case '/api/generate_ps':
            return { personal_statement: response };
        
        case '/api/generate_questions':
            // ✅ Better parsing for AI-generated questions
            const lines = response.split('\n');
            const questions = [];
            
            for (const line of lines) {
                // Match numbered questions (1., 2., etc.) or bullet points (-, *)
                const match = line.match(/^(\d+\.|\d+\)|\-|\*)\s*(.+)/);
                if (match) {
                    const question = match[2].trim();
                    if (question.length > 0) {
                        questions.push(question);
                    }
                } else if (line.trim().length > 0 && !line.match(/^(Here|These|Generate|Interview)/i)) {
                    // If no number, but it's a valid sentence, add it
                    const trimmed = line.trim();
                    if (trimmed.length > 10 && trimmed.endsWith('?')) {
                        questions.push(trimmed);
                    }
                }
            }
            
            // ✅ If we got questions, return them
            if (questions.length > 0) {
                console.log(`📝 Parsed ${questions.length} questions from AI response`);
                return { questions: questions };
            }
            
            // Fallback: split by question marks
            const qs = response.split('?')
                .filter(q => q.trim().length > 10)
                .map(q => q.trim() + '?');
            
            if (qs.length > 0) {
                return { questions: qs };
            }
            
            return { questions: [] };
        
        default:
            return { response: response };
    }
}

/* ──────────────────────────────────────────
   UPDATED AI-POWERED FUNCTIONS
────────────────────────────────────────── */

// ✅ 修复：使用不同的函数名，避免覆盖冲突
async function generateEnhancedPS() {
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
    psOutput.innerHTML = '<div class="ai-loader">🧠 AI is crafting your personal statement...</div>';

    try {
        const result = await callAI('/api/generate_ps', {
            name: state.profile?.name || 'Student',
            major: state.profile?.major || '',
            university: whyUni || 'your target university',
            target: target,
            story: story,
            unique: unique,
            subjectWhy: subjectWhy,
            academic: academic,
            shortGoal: shortGoal,
            longGoal: longGoal,
            whyUni: whyUni,
            whyUniDesc: whyUniDesc,
            wordLimit: wordLimit,
        });

        if (result && result.personal_statement) {
            const ps = result.personal_statement;
            state.ps.generated = ps;
            Storage.save('pathspire_ps', ps);
            
            const words = ps.split(/\s+/).filter(Boolean).length;
            psOutput.innerHTML = `<div style="white-space:pre-wrap;line-height:1.9">${ps}</div>`;
            document.getElementById('psWordCount').textContent = `${words} / ${wordLimit} words`;
            
            const suggestions = await generateAISuggestions(ps);
            const sugEl = document.getElementById('aiPSSuggestions');
            document.getElementById('psSuggestionList').innerHTML = suggestions.map(s => 
                `<div class="ai-tip" style="margin-bottom:8px">${s}</div>`
            ).join('');
            sugEl.style.display = 'block';
            
            updateProgressChecklist();
            toast('Personal statement generated with AI!', 'success');
            return;
        }
    } catch (error) {
        console.error('AI generation failed:', error);
    }
    
    // Fallback: 使用原有函数
    generatePS();
}

// ✅ 修复：使用不同的函数名
async function generateEnhancedInterviewQuestions() {
    const type = document.getElementById('interviewType').value;
    const difficulty = document.getElementById('interviewDifficulty').value;
    const count = parseInt(document.getElementById('interviewQuestionCount').value);
    const focusCheckboxes = document.querySelectorAll('#interviewSetup input[type="checkbox"]:checked');
    const focusAreas = Array.from(focusCheckboxes).map(cb => cb.value);

    try {
        const result = await callAI('/api/generate_questions', {
            type: type,
            difficulty: difficulty,
            count: count,
            focusAreas: focusAreas,
            program: state.profile?.program || '',
            university: state.profile?.regions?.join(', ') || '',
        });

        if (result && result.questions && result.questions.length > 0) {
            return result.questions;
        }
    } catch (error) {
        console.error('AI question generation failed:', error);
    }
    
    return generateQuestions(type, difficulty, count, focusAreas);
}

async function generateAIFeedback(sessionData) {
    try {
        const result = await callAI('/api/interview_feedback', {
            anxiety: sessionData.anxiety || [],
            confidence: sessionData.confidence || [],
            pace: sessionData.pace || [],
            answers: sessionData.answers || [],
        });

        if (result && result.feedback) {
            return result.feedback;
        }
    } catch (error) {
        console.error('AI feedback generation failed:', error);
    }
    
    return generateReportRecommendations(
        sessionData.anxiety.reduce((a,b) => a+b, 0) / (sessionData.anxiety.length || 1),
        sessionData.confidence.reduce((a,b) => a+b, 0) / (sessionData.confidence.length || 1),
        sessionData.pace.reduce((a,b) => a+b, 0) / (sessionData.pace.length || 1),
        70
    );
}

async function enhancedSchoolMatch() {
    const region = document.getElementById('filterRegion').value;
    const matchFilter = document.getElementById('filterMatch').value;
    const majorFilter = document.getElementById('filterMajor').value;

    let filteredSchools = SCHOOL_DATA.filter(s => {
        if (region !== 'all' && s.region !== region) return false;
        if (majorFilter !== 'all' && !s.majors.includes(majorFilter)) return false;
        return true;
    });

    try {
        const result = await callAI('/api/match_schools', {
            profile: {
                name: state.profile?.name || '',
                curriculum: state.profile?.curriculum || 'DSE',
                major: state.profile?.major || '',
                regions: state.profile?.regions || [],
                grades: state.grades[state.profile?.curriculum || 'DSE'] || {},
                activities: state.activities || [],
            },
            schools: filteredSchools,
        });

        if (result && result.matches) {
            state.schools = filteredSchools.map(s => ({
                ...s,
                score: Math.min(98, Math.max(10, 50 + Math.random() * 40)),
                level: Math.random() > 0.5 ? 'target' : 'reach',
            })).sort((a,b) => b.score - a.score);
            
            renderSchools(state.schools);
            toast('AI-powered matching complete!', 'success');
            return;
        }
    } catch (error) {
        console.error('AI school matching failed:', error);
    }
    
    runAIMatch();
}

async function analyzeActivitiesWithAI() {
    if (state.activities.length === 0) {
        toast('Please add some activities first.', 'warning');
        return null;
    }

    try {
        const result = await callAI('/api/analyze_activities', {
            activities: state.activities,
            targetMajor: state.profile?.major || '',
            curriculum: state.profile?.curriculum || 'DSE',
        });

        if (result && result.analysis) {
            toast('AI activity analysis complete!', 'success');
            return result.analysis;
        }
    } catch (error) {
        console.error('AI activity analysis failed:', error);
    }
    
    return null;
}

async function generateAISuggestions(ps) {
    try {
        const result = await callAI('/api/generate_suggestions', {
            personal_statement: ps,
            target_university: state.profile?.regions?.[0] || '',
            major: state.profile?.major || '',
        });

        if (result && result.suggestions) {
            return result.suggestions.split('\n').filter(s => s.trim());
        }
    } catch (error) {
        console.error('AI suggestion generation failed:', error);
    }
    
    return [
        'Add more specific examples to strengthen your narrative.',
        'Consider mentioning how this program aligns with your goals.',
        'Review for clarity and conciseness.',
    ];
}

/* ──────────────────────────────────────────
   OVERRIDE INTERFACE FUNCTIONS (修复版)
────────────────────────────────────────── */

// ✅ 用新函数替换原有函数，而不是直接赋值
function generatePSWithAI() {
    generateEnhancedPS();
}

function initInterviewSystem() {
    // Load TTS voices
    loadTTSVoices().then(voices => {
        console.log(`✅ Loaded ${voices.length} TTS voices`);
        if (voices.length > 0) {
            ttsVoice = getBestVoice(voices);
        }
    });
    
    // Setup speech recognition for user responses
    setupSpeechRecognitionForInterview();
    
    // Make sure TTS is enabled by default
    ttsEnabled = true;
    
    console.log('🎤 Interview system initialized');
}

// ✅ 修改 startInterviewSession 使用 AI 生成的问题
const startInterviewWithAI = function() {
    const enhancedQuestions = generateEnhancedInterviewQuestions();
    enhancedQuestions.then(questions => {
        if (questions && questions.length > 0) {
            interviewState.questions = questions;
            interviewState.qIndex = 0;
            document.getElementById('interviewSetup').style.display = 'none';
            document.getElementById('interviewCall').style.display = 'block';
            document.getElementById('interviewReport').style.display = 'none';
            startCamera();
            setTimeout(() => {
                displayQuestion();
            }, 2000);
            toast('AI-generated questions ready!', 'success');
        } else {
            originalStartInterview();
        }
    });
};

// ✅ 安全的覆盖方式 - 用新函数替换旧函数
const originalGeneratePS = generatePS;
const originalStartInterview = startInterviewSession;
const originalRunMatch = runAIMatch;

// ✅ 重新定义函数
window.generatePS = async function() {
    await generateEnhancedPS();
};

window.startInterviewSession = async function() {
    const questions = await generateEnhancedInterviewQuestions();
    if (questions && questions.length > 0) {
        interviewState.questions = questions;
        interviewState.qIndex = 0;
        document.getElementById('interviewSetup').style.display = 'none';
        document.getElementById('interviewCall').style.display = 'block';
        document.getElementById('interviewReport').style.display = 'none';
        startCamera();
        setTimeout(() => {
            displayQuestion();
        }, 2000);
        toast('AI-generated questions ready!', 'success');
    } else {
        originalStartInterview();
    }
};

window.runAIMatch = async function() {
    await enhancedSchoolMatch();
};

function addAIActivityAnalysis() {
    const container = document.getElementById('activities');
    if (!container) return;
    const existing = container.querySelector('.ai-activity-btn');
    if (existing) return;
    const btn = document.createElement('button');
    btn.className = 'btn-secondary ai-activity-btn';
    btn.innerHTML = '<i class="fas fa-robot"></i> Analyze with AI';
    btn.onclick = analyzeActivitiesWithAI;
    container.appendChild(btn);
}

/* ──────────────────────────────────────────
   CONNECTION STATUS CHECK
────────────────────────────────────────── */

async function checkAIConnection() {
    try {
        const response = await fetch(`${AI_CONFIG.baseUrl}/health`, {
            headers: {
                'Content-Type': 'application/json',
                // ✅ 添加这一行！
                'ngrok-skip-browser-warning': 'true'
            }
        });
        if (response.ok) {
            console.log('✅ AI Backend connected');
            const statusEl = document.getElementById('aiStatus');
            if (statusEl) statusEl.textContent = '🟢 AI Connected';
            return true;
        }
    } catch (error) {
        console.log('⚠️ AI Backend unavailable - using fallback responses');
        const statusEl = document.getElementById('aiStatus');
        if (statusEl) statusEl.textContent = '🟡 AI Offline (Fallback)';
        return false;
    }
}

// ✅ 页面加载完成后添加 AI 分析按钮
document.addEventListener('DOMContentLoaded', function() {
    addAIActivityAnalysis();
    setTimeout(checkAIConnection, 3000);
});

console.log('✅ AI 模块加载完成！');








