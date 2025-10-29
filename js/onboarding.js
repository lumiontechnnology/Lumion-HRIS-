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
  const btn = document.querySelector('button[onclick="markComplete()"]');
  if (btn) {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const st = Store.getOnboarding(user.id);
      const nextIdx = [0,1,2,3].find(i => !st.stepsCompleted.includes(i));
      if (nextIdx === undefined) { alert('All onboarding steps completed!'); return; }
      const next = { ...st, stepsCompleted: [...st.stepsCompleted, nextIdx] };
      Store.setOnboarding(user.id, next);
      setProgress(user);
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

document.addEventListener('DOMContentLoaded', () => {
  const user = initUser();
  setProgress(user);
  attachVideoFallback();
  attachActions(user);
});