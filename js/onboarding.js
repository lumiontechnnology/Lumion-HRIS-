// Onboarding interactions: progress, video fallback, certificate
import { Store } from './store.js';
import { renderUserMenu } from './auth.js';

function $(sel){ return document.querySelector(sel); }
function $all(sel){ return Array.from(document.querySelectorAll(sel)); }

function initUser(){
  renderUserMenu();
  const user = Store.currentUser() || Store.getState().users.find(u=>u.role==='user');
  const nameEl = $('#employeeName');
  if (nameEl && user) nameEl.textContent = user.name;
  return user;
}

function setProgress(user){
  const steps = ['Submit bank details','Upload ID card','Sign employment letter','Fill personal info'];
  const st = Store.getOnboarding(user.id);
  const completed = st.stepsCompleted.length;
  const pct = Math.round((completed / steps.length) * 100);
  const bar = $('#progressBar');
  if (bar) bar.style.width = pct + '%';
  const pctEl = $('#obProgressPct'); if (pctEl) pctEl.textContent = pct + '%';
}

function attachVideoFallback(){
  const fallback = 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4';
  $all('video').forEach(v => {
    v.setAttribute('preload','metadata');
    v.addEventListener('error', () => {
      try {
        v.src = fallback;
        v.load();
      } catch {}
    });
    v.addEventListener('ended', () => {
      const user = Store.currentUser() || Store.getState().users.find(u=>u.role==='user');
      const st = Store.getOnboarding(user.id);
      const id = v.id || 'video';
      if (!st.videosWatched.includes(id)) {
        st.videosWatched = [...st.videosWatched, id];
        Store.setOnboarding(user.id, st);
      }
    });
  });
}

function attachActions(user){
  const btn = document.querySelector('#markStepBtn');
  if (btn) {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const st = Store.getOnboarding(user.id);
      const nextIdx = [0,1,2,3].find(i => !st.stepsCompleted.includes(i));
      if (nextIdx === undefined) { alert('All onboarding steps completed!'); return; }
      const next = { ...st, stepsCompleted: [...st.stepsCompleted, nextIdx] };
      Store.setOnboarding(user.id, next);
      setProgress(user);
      renderStepsList(user);
    });
  }

  const certBtn = $('#downloadCert');
  if (certBtn) {
    certBtn.addEventListener('click', (e) => {
      e.preventDefault();
      const userName = (Store.currentUser()||{}).name || 'Employee';
      const text = `Onboarding Completion\n\nThis certifies that ${userName} has completed onboarding.`;
      const blob = new Blob([text], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = 'Onboarding_Certificate.txt'; a.click();
      URL.revokeObjectURL(url);
    });
  }
}

function renderStepsList(user){
  const steps = ['Submit bank details','Upload ID card','Sign employment letter','Fill personal info'];
  const st = Store.getOnboarding(user.id);
  const el = $('#stepsList'); if (!el) return;
  const rows = steps.map((label, idx) => {
    const done = st.stepsCompleted.includes(idx);
    const status = done ? 'Completed' : 'Pending';
    const badge = done ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700';
    const btn = done ? '' : `<button data-step="${idx}" class="px-3 py-1 bg-indigo-600 text-white rounded text-xs">Mark Complete</button>`;
    return `<div class="flex items-center justify-between p-3 border rounded">
      <div>
        <div class="font-medium">${label}</div>
        <div class="text-xs ${badge} inline-block px-2 py-0.5 rounded mt-1">${status}</div>
      </div>
      <div>${btn}</div>
    </div>`;
  }).join('');
  el.innerHTML = rows;
  const summary = steps.filter((_,i)=>!st.stepsCompleted.includes(i)).slice(0,3).join(', ') || 'All steps done';
  const sumEl = $('#nextStepsSummary'); if (sumEl) sumEl.textContent = summary;
  el.querySelectorAll('button[data-step]').forEach(b => {
    b.addEventListener('click', (e) => {
      const idx = Number(b.getAttribute('data-step'));
      const cur = Store.getOnboarding(user.id);
      if (!cur.stepsCompleted.includes(idx)) {
        Store.setOnboarding(user.id, { ...cur, stepsCompleted: [...cur.stepsCompleted, idx] });
        setProgress(user);
        renderStepsList(user);
      }
    });
  });
}

document.addEventListener('DOMContentLoaded', () => {
  const user = initUser();
  setProgress(user);
  renderStepsList(user);
  attachVideoFallback();
  attachActions(user);
  renderSchedule();
  attachSupport();
});

function renderSchedule(){
  const el = document.querySelector('#obSchedule'); if (!el) return;
  const sessions = [
    { title:'Company Culture & Values', date:'2025-10-25', status:'Scheduled' },
    { title:'Security & Compliance', date:'2025-10-26', status:'Scheduled' },
    { title:'Team Introduction', date:'2025-10-27', status:'Pending' },
  ];
  el.innerHTML = sessions.map(s => `<div class="flex items-center justify-between p-3 border rounded">
    <div>
      <div class="font-medium">${s.title}</div>
      <div class="text-xs text-gray-500">${new Date(s.date).toDateString()}</div>
    </div>
    <div class="text-xs ${s.status==='Scheduled'?'text-indigo-700':'text-yellow-700'}">${s.status}</div>
  </div>`).join('');
}

function attachSupport(){
  const btn = document.querySelector('#openHelp');
  if (!btn) return;
  btn.addEventListener('click', (e)=>{
    e.preventDefault();
    const w = window.open('', '_blank');
    w.document.write('<h2>Help Center</h2><p>Contact HR at hr@lumion.com or visit FAQs.</p>');
    w.document.close();
  });
}