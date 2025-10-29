// Augment analytics KPIs using real pulse check-ins if available
import { Store } from './store.js';

function computeOrgEngagement(days = 30){
  const s = Store.getState();
  const perUser = (s.users || []).map(u => Store.computeEngagementFromPulses(u.id, days)).filter(Boolean);
  if (!perUser.length) return null;
  const avg = Math.round(perUser.reduce((a,b)=>a + (b?.avg||0), 0) / perUser.length);
  const count = perUser.reduce((a,b)=> a + (b?.count||0), 0);
  return { avg, count, users: perUser.length };
}

function applyEngagement(){
  const org = computeOrgEngagement(30);
  const el = document.getElementById('kpi-engagement');
  if (el && org){ el.textContent = `${org.avg}%`; }

  // Add a subtle insight if engagement is low
  const host = document.getElementById('aiInsights');
  if (host && org){
    const div = document.createElement('div');
    div.className = 'pill';
    div.style.background = org.avg < 70 ? '#fee2e2' : '#e0e7ff';
    div.style.color = org.avg < 70 ? '#991b1b' : '#3730a3';
    div.style.display = 'inline-block';
    div.style.marginTop = '8px';
    div.textContent = org.avg < 70
      ? `Pulse signals: engagement dipping (${org.avg}%). Investigate workload/stress.`
      : `Pulse signals: stable engagement (${org.avg}%). Maintain manager check-ins.`;
    host.appendChild(div);
  }
}

document.addEventListener('DOMContentLoaded', ()=>{
  try { applyEngagement(); } catch {}
});