// Emotional Pulse System — Core logic and UI wiring

export class EmotionalPulseSystem {
  constructor() {
    this.STORE_KEY = 'eps_store_v1';
    this.SESSION_KEY = 'eps_current_user_id';
    this.state = this._load() || this._seed();
  }

  _seed(){
    const employees = [
      { id:'e-ada', name:'Ada Bello', department:'Engineering', role:'Software Engineer' },
      { id:'e-stan', name:'Stanford George', department:'Engineering', role:'Software Engineer' },
      { id:'e-chike', name:'Chike Okoro', department:'Sales', role:'Sales Lead' },
      { id:'e-ife', name:'Ifeoma Udo', department:'HR', role:'HRBP' },
      { id:'e-bayo', name:'Bayo Kareem', department:'Finance', role:'Finance Manager' },
      { id:'e-tolu', name:'Tolu Asha', department:'Marketing', role:'Social Manager' },
      { id:'e-joel', name:'Joel Ataga', department:'Admin', role:'Payroll Exec' },
      { id:'e-zain', name:'Zainab Ali', department:'Engineering', role:'DevOps Engineer' }
    ];
    const moods = ['joy','calm','focused','stressed','anxious','sad','angry','tired'];
    const entries = [];
    const now = new Date();
    for (let d=29; d>=0; d--){
      const day = new Date(now); day.setDate(now.getDate() - d);
      employees.forEach((e, i) => {
        const seed = (i*37 + day.getDate()*13) % moods.length;
        const morningMood = moods[seed];
        const eveningMood = moods[(seed + (i%3)) % moods.length];
        const intensityA = 2 + ((i + day.getDay()) % 4); // 2–5
        const intensityB = Math.max(1, Math.min(5, intensityA + ((i%2===0)? -1 : 1)));
        entries.push(this._mkEntry(e.id, 'morning', morningMood, intensityA, `Auto-seeded ${morningMood}`, day));
        entries.push(this._mkEntry(e.id, 'evening', eveningMood, intensityB, `Auto-seeded ${eveningMood}`, day));
      });
    }
    const s = { employees, entries };
    this._save(s);
    return s;
  }

  _mkEntry(empId, session, mood, intensity, notes, day){
    const ts = new Date(day);
    // morning at 09:00, evening at 18:00
    if (session === 'morning'){ ts.setHours(9,0,0,0); }
    else { ts.setHours(18,0,0,0); }
    return { id: `m-${empId}-${session}-${ts.toISOString()}`, employeeId: empId, session, mood, intensity, notes, timestamp: ts.toISOString() };
  }

  _load(){ try { return JSON.parse(localStorage.getItem(this.STORE_KEY) || 'null'); } catch { return null; } }
  _save(s){ localStorage.setItem(this.STORE_KEY, JSON.stringify(s)); }

  currentUserId(){ return localStorage.getItem(this.SESSION_KEY) || null; }
  currentUser(){ const id = this.currentUserId(); return (this.state.employees||[]).find(e=>e.id===id) || null; }
  login(employeeId){ localStorage.setItem(this.SESSION_KEY, employeeId); }
  logout(){ localStorage.removeItem(this.SESSION_KEY); }

  listEmployees(){ return this.state.employees || []; }

  recordMood(employeeId, session, mood, intensity, notes){
    const entry = this._mkEntry(employeeId, session, mood, intensity, notes || '', new Date());
    this.state.entries.push(entry);
    this._save(this.state);
    return entry;
  }

  getEntries({ employeeId, days=30 }={}){
    const cutoff = new Date(); cutoff.setDate(cutoff.getDate() - days);
    return (this.state.entries||[])
      .filter(e => (!employeeId || e.employeeId===employeeId))
      .filter(e => new Date(e.timestamp) >= cutoff)
      .sort((a,b)=> new Date(a.timestamp) - new Date(b.timestamp));
  }

  // Daily delta for a given employee: evening intensity minus morning intensity mapped to stress spectrum
  getDailyDelta(employeeId){
    const byDay = new Map();
    const list = this.getEntries({ employeeId, days: 7 });
    list.forEach(e=>{
      const key = e.timestamp.slice(0,10);
      const o = byDay.get(key) || { morning:null, evening:null };
      o[e.session] = e; byDay.set(key, o);
    });
    const deltas = [];
    byDay.forEach((o, key)=>{
      if (o.morning && o.evening){ const delta = (o.evening.intensity - o.morning.intensity); deltas.push({ date: key, delta, morning: o.morning, evening: o.evening }); }
    });
    return deltas;
  }

  // Simple burnout risk: weighted stress/anxious + negative delta frequency
  computeBurnoutRisk(employeeId){
    const entries = this.getEntries({ employeeId, days: 14 });
    const stressLike = entries.filter(e=> ['stressed','anxious','tired','sad'].includes(e.mood) );
    const avgStressIntensity = stressLike.length ? (stressLike.reduce((a,c)=>a+c.intensity,0) / stressLike.length) : 0;
    const deltas = this.getDailyDelta(employeeId);
    const negDays = deltas.filter(d=> d.delta < 0).length;
    const risk = Math.min(100, Math.round( (avgStressIntensity/5)*60 + (negDays/Math.max(1,deltas.length))*40 ));
    return { score: risk, avgStressIntensity, negDays, days: deltas.length };
  }

  departmentAverages(){
    const moods = ['joy','calm','focused','stressed','anxious','sad','angry','tired'];
    const byDept = new Map();
    this.state.employees.forEach(e=>{
      byDept.set(e.department, { counts: new Map(moods.map(m=>[m,{ sum:0, n:0 }])) });
    });
    (this.state.entries||[]).forEach(en=>{
      const emp = this.state.employees.find(x=>x.id===en.employeeId); if(!emp) return;
      const c = byDept.get(emp.department)?.counts.get(en.mood); if (!c) return;
      c.sum += en.intensity; c.n += 1;
    });
    const result = [];
    byDept.forEach((v, k)=>{
      const avg = moods.map(m=>{ const c=v.counts.get(m); return c.n? c.sum/c.n : 0; });
      result.push({ department: k, moods, avg });
    });
    return result;
  }

  teamHeatmap(){
    const moods = ['joy','calm','focused','stressed','anxious','sad','angry','tired'];
    // Average intensity per mood across all employees in last 7 days
    const data = new Map(moods.map(m=>[m,{ sum:0, n:0 }]));
    const cutoff = new Date(); cutoff.setDate(cutoff.getDate() - 7);
    (this.state.entries||[]).forEach(e=>{
      if (new Date(e.timestamp) < cutoff) return;
      const c = data.get(e.mood); c.sum += e.intensity; c.n += 1;
    });
    return moods.map(m=> ({ mood:m, avg: (data.get(m).n? data.get(m).sum/data.get(m).n : 0) }));
  }
}

// UI wiring
const System = new EmotionalPulseSystem();

function $(sel){ return document.querySelector(sel); }
function $all(sel){ return Array.from(document.querySelectorAll(sel)); }
function showScreen(id){ $all('.screen').forEach(s=> s.classList.remove('active')); const el = document.getElementById(id); if (el) el.classList.add('active'); }
function setUserBadge(){ const u = System.currentUser(); const b = document.getElementById('userBadge'); if (b) b.textContent = u ? `${u.name} • ${u.department}` : 'Not logged in'; }

// Build login employees
const loginSel = document.getElementById('login-employee');
if (loginSel){
  loginSel.innerHTML = System.listEmployees().map(e=> `<option value="${e.id}">${e.name} — ${e.department}</option>`).join('');
}

// Mood buttons
const MOODS = [
  { key: 'joy', label:'Joy' },
  { key: 'calm', label:'Calm' },
  { key: 'focused', label:'Focused' },
  { key: 'stressed', label:'Stressed' },
  { key: 'anxious', label:'Anxious' },
  { key: 'sad', label:'Sad' },
  { key: 'angry', label:'Angry' },
  { key: 'tired', label:'Tired' }
];

function buildMoodGrid(rootId){
  const root = document.getElementById(rootId); if (!root) return;
  root.innerHTML = '';
  MOODS.forEach(m=>{
    const d = document.createElement('div'); d.className = 'mood'; d.dataset.mood = m.key; d.textContent = m.label;
    d.addEventListener('click', ()=>{
      root.querySelectorAll('.mood').forEach(x=>x.classList.remove('selected'));
      d.classList.add('selected');
    });
    root.appendChild(d);
  });
}
buildMoodGrid('morning-moods');
buildMoodGrid('evening-moods');

// Time-based session selection
function sessionFromTime(date = new Date()){
  const h = date.getHours();
  // Morning: 5–12, Evening: 13–23
  return (h >= 5 && h < 13) ? 'morning' : 'evening';
}

// Actions
document.getElementById('login-btn')?.addEventListener('click', ()=>{
  const id = loginSel.value; System.login(id); setUserBadge();
  const sess = sessionFromTime();
  showScreen(sess === 'morning' ? 'screen-morning' : 'screen-evening');
});
// Remove manual nav in favor of time-based flow (buttons may not exist if header removed)
document.getElementById('nav-login')?.addEventListener('click', ()=> showScreen('screen-login'));
document.getElementById('nav-logout')?.addEventListener('click', ()=>{ System.logout(); setUserBadge(); showScreen('screen-login'); });

document.getElementById('morning-submit')?.addEventListener('click', ()=>{
  const u = System.currentUser(); if (!u){ alert('Please login first.'); return; }
  const moodEl = document.querySelector('#morning-moods .mood.selected'); if (!moodEl){ alert('Select a mood.'); return; }
  const mood = moodEl.dataset.mood;
  const intensity = Number(document.getElementById('morning-intensity').value);
  const notes = document.getElementById('morning-notes').value.trim();
  System.recordMood(u.id, 'morning', mood, intensity, notes);
  // Redirect to normal user dashboard after recording
  window.location.href = '/user-dashboard.html';
});

document.getElementById('evening-submit')?.addEventListener('click', ()=>{
  const u = System.currentUser(); if (!u){ alert('Please login first.'); return; }
  const moodEl = document.querySelector('#evening-moods .mood.selected'); if (!moodEl){ alert('Select a mood.'); return; }
  const mood = moodEl.dataset.mood;
  const intensity = Number(document.getElementById('evening-intensity').value);
  const notes = document.getElementById('evening-notes').value.trim();
  const entry = System.recordMood(u.id, 'evening', mood, intensity, notes);
  // Optional: compute delta silently; then redirect
  // const delta = System.getDailyDelta(u.id).slice(-1)[0];
  window.location.href = '/user-dashboard.html';
});

// Initial screen
if (System.currentUser()){
  setUserBadge();
  const sess = sessionFromTime();
  showScreen(sess === 'morning' ? 'screen-morning' : 'screen-evening');
} else {
  showScreen('screen-login');
}

// Expose for analytics module
window.EPS = System;