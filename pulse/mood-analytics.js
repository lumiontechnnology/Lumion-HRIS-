// MoodAnalytics — charts and insights using Chart.js

function exists(id){ return !!document.getElementById(id); }

export class MoodAnalytics {
  constructor(System){ this.System = System; }

  renderPersonalTrend(){
    if (!exists('personalMoodChart')) return;
    const u = this.System.currentUser() || this.System.listEmployees()[0];
    const entries = this.System.getEntries({ employeeId: u?.id, days: 14 })
      .filter(e=> e.session==='evening');
    const labels = entries.map(e=> e.timestamp.slice(0,10));
    const data = entries.map(e=> e.intensity);
    const ctx = document.getElementById('personalMoodChart').getContext('2d');
    if (this.personalChart) this.personalChart.destroy();
    this.personalChart = new Chart(ctx, {
      type: 'line',
      data: { labels, datasets: [{ label:'Evening Intensity', data, borderColor:'#6366f1', backgroundColor:'rgba(99,102,241,0.2)', tension:0.3 }] },
      options: { plugins:{ legend:{ display:true } }, scales:{ y:{ min:1, max:5, ticks:{ stepSize:1 } } } }
    });
  }

  renderDeptRadar(){
    if (!exists('deptRadarChart')) return;
    const data = this.System.departmentAverages();
    const labels = ['joy','calm','focused','stressed','anxious','sad','angry','tired'];
    const ctx = document.getElementById('deptRadarChart').getContext('2d');
    if (this.radarChart) this.radarChart.destroy();
    this.radarChart = new Chart(ctx, {
      type: 'radar',
      data: {
        labels,
        datasets: data.slice(0,5).map((d,i)=>({
          label: d.department,
          data: d.avg,
          borderColor: ['#4f46e5','#10b981','#f59e0b','#ef4444','#8b5cf6'][i%5],
          backgroundColor: ['rgba(79,70,229,0.2)','rgba(16,185,129,0.2)','rgba(245,158,11,0.2)','rgba(239,68,68,0.2)','rgba(139,92,246,0.2)'][i%5]
        }))
      },
      options: { scales: { r: { min:0, max:5 } } }
    });
  }

  renderHeatmap(){
    const root = document.getElementById('teamHeatmap'); if (!root) return;
    root.innerHTML = '';
    const data = this.System.teamHeatmap();
    const moods = ['joy','calm','focused','stressed','anxious','sad','angry','tired'];
    // Header row
    const header = document.createElement('div'); header.className='heat-cell'; header.textContent='Mood'; root.appendChild(header);
    moods.forEach(m=>{ const h = document.createElement('div'); h.className='heat-cell'; h.textContent=m; root.appendChild(h); });
    // Data row (avg intensity)
    const label = document.createElement('div'); label.className='heat-cell'; label.textContent='Avg'; root.appendChild(label);
    moods.forEach(m=>{
      const item = data.find(x=>x.mood===m) || { avg:0 };
      const cell = document.createElement('div'); cell.className='heat-cell';
      const v = item.avg; const hue = 220 - Math.round((v/5)*220); // blue→yellow gradient
      cell.style.background = `hsl(${hue}, 80%, 80%)`;
      cell.textContent = v.toFixed(1);
      root.appendChild(cell);
    });
  }

  renderInsights(){
    const ul = document.getElementById('predictiveInsights'); if (!ul) return;
    ul.innerHTML='';
    const employees = this.System.listEmployees();
    const items = [];
    employees.forEach(e=>{
      const r = this.System.computeBurnoutRisk(e.id);
      if (r.score >= 60){ items.push(`${e.name}: Burnout risk ${r.score}% (avg stress ${r.avgStressIntensity.toFixed(1)} over ${r.days} days)`); }
    });
    if (items.length===0) items.push('No elevated risk detected in the last 14 days.');
    items.forEach(t=>{ const li=document.createElement('li'); li.textContent=t; ul.appendChild(li); });
  }

  renderAlerts(){
    const ul = document.getElementById('hrAlerts'); if (!ul) return;
    ul.innerHTML='';
    const employees = this.System.listEmployees();
    const alerts = employees
      .map(e=> ({ e, r:this.System.computeBurnoutRisk(e.id) }))
      .filter(x=> x.r.score >= 75)
      .sort((a,b)=> b.r.score - a.r.score)
      .slice(0,5)
      .map(x=> `${x.e.name} • ${x.e.department} — High risk (${x.r.score}%)`);
    if (alerts.length===0) alerts.push('No high-risk alerts.');
    alerts.forEach(t=>{ const li=document.createElement('li'); li.textContent=t; ul.appendChild(li); });
  }

  renderAll(){
    this.renderPersonalTrend();
    this.renderDeptRadar();
    this.renderHeatmap();
    this.renderInsights();
    this.renderAlerts();
  }
}

import { Store } from '../js/store.js';

// Auto-run when EPS and Chart.js are available; render aggregates only for admin
function init(){
  if (!window.EPS || !window.Chart){ setTimeout(init, 300); return; }
  const current = Store.currentUser();
  const M = new MoodAnalytics(window.EPS);
  // Always allow personal trend for the current EPS user if present
  try { M.renderPersonalTrend(); } catch (e){ console.warn('Personal trend render failed:', e); }
  // Admin-only aggregate analytics
  if (current && current.role === 'admin'){
    try { M.renderDeptRadar(); M.renderHeatmap(); M.renderInsights(); M.renderAlerts(); } catch (e){ console.warn('Admin analytics render failed:', e); }
  }
  // Re-render after submissions (admin-only aggregate refresh)
  document.getElementById('morning-submit')?.addEventListener('click', ()=> setTimeout(()=> {
    if (current && current.role === 'admin') M.renderDeptRadar(), M.renderHeatmap(), M.renderInsights(), M.renderAlerts();
  }, 100));
  document.getElementById('evening-submit')?.addEventListener('click', ()=> setTimeout(()=> {
    if (current && current.role === 'admin') M.renderDeptRadar(), M.renderHeatmap(), M.renderInsights(), M.renderAlerts();
  }, 100));
}
init();