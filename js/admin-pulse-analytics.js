// Admin Pulse Analytics Dashboard — realtime insights from Store.pulses
import { Store } from './store.js';

// Demo mode controls
let demoMode = false;
let demoPulses = [];
let demoTimer = null;
let liveBuf = { labels:[], mood:[], stress:[], workload:[] };

function setDemoMode(on){
  demoMode = !!on;
  const banner = document.getElementById('demoBanner');
  if (banner){ banner.style.display = demoMode ? 'inline-block' : 'none'; }
  if (demoMode) startDemoStream(); else stopDemoStream();
}

function generateDemoData(){
  // Create synthetic pulses across 6 depts, ~30 employees over 60 days
  const depts = ['Engineering','Sales','Marketing','HR','Finance','Operations'];
  const users = []; const emps = [];
  const s = Store.getState();
  if (!s.users?.length || !s.employees?.length){
    for(let i=0;i<30;i++){
      const dept = depts[i%depts.length];
      const uid = `u-demo-${i}`;
      users.push({ id: uid, email: `demo${i}@lumion.com`, role: 'user', name: `Demo User ${i}` });
      emps.push({ id: `e-demo-${i}`, userId: uid, name: `Demo User ${i}`, department: dept, email: `demo${i}@lumion.com` });
    }
    // Do not persist users/employees; keep demo in-memory to avoid mutating live data
  }
  const today = new Date();
  const days = 60;
  const all = [];
  const pickUsers = (s.users?.length ? s.users.map(u=> u.id) : users.map(u=> u.id));
  for(let d=days; d>=0; d--){
    const dt = new Date(today); dt.setDate(today.getDate()-d); const dateStr = dt.toISOString().split('T')[0];
    pickUsers.forEach((uid, i)=>{
      const baseMood = 0.2*Math.sin(i + d/7) - 0.1*Math.cos(d/5);
      const mood = Math.max(-2, Math.min(2, baseMood + (Math.random()*0.6 - 0.3)));
      const stress = Math.max(1, Math.min(5, 3 + (Math.random()*1.2 - 0.6) + (mood<0 ? 0.3 : -0.1)));
      const workload = Math.max(1, Math.min(5, 3 + (Math.random()*1.5 - 0.75)));
      const notes = ['good progress','blocked on task','tight deadline','need support','smooth release','delayed by vendor','customer escalation','code review win'];
      const note = Math.random() < 0.25 ? notes[Math.floor(Math.random()*notes.length)] : '';
      all.push({ userId: uid, date: dateStr, mood, stress, workload, note });
    });
  }
  demoPulses = all;
}

function startDemoStream(){
  if (demoTimer) return;
  // Seed live buffer from last few aggregated points
  liveBuf = { labels:[], mood:[], stress:[], workload:[] };
  demoTimer = setInterval(()=>{ addDemoTick(); }, 1000);
}

function stopDemoStream(){
  if (demoTimer){ clearInterval(demoTimer); demoTimer=null; }
}

function addDemoTick(){
  // Create a new batch of pulses for current timestamp to simulate real-time
  const now = new Date(); const dateStr = now.toISOString().split('T')[0];
  const ids = Array.from(new Set((demoPulses.length? demoPulses : getAllPulses()).map(p=> p.userId)));
  const batchSize = Math.max(10, Math.floor(ids.length * 0.4));
  let sumMood=0, sumStress=0, sumWork=0;
  for(let i=0;i<batchSize;i++){
    const uid = ids[i % ids.length];
    const baseMood = 0.15*Math.sin(Date.now()/60000 + i*0.5) - 0.1*Math.cos(Date.now()/90000 + i*0.3);
    const mood = Math.max(-2, Math.min(2, baseMood + (Math.random()*0.6 - 0.3)));
    const stress = Math.max(1, Math.min(5, 3 + (Math.random()*1.0 - 0.5) + (mood<0 ? 0.3 : -0.1)));
    const workload = Math.max(1, Math.min(5, 3 + (Math.random()*1.2 - 0.6)));
    demoPulses.push({ userId: uid, date: dateStr, mood, stress, workload, note: '' });
    sumMood+=mood; sumStress+=stress; sumWork+=workload;
  }
  // Trim demo pulses to ~90 days worth to avoid memory growth
  const ninetyDaysAgo = new Date(); ninetyDaysAgo.setDate(ninetyDaysAgo.getDate()-90);
  const cutoff = ninetyDaysAgo.toISOString().split('T')[0];
  demoPulses = demoPulses.filter(p=> p.date >= cutoff);
  // Update live buffer (last 60 seconds)
  const label = now.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit', second:'2-digit'});
  const mAvg = sumMood / batchSize; const sAvg = sumStress / batchSize; const wAvg = sumWork / batchSize;
  liveBuf.labels.push(label); liveBuf.mood.push(mAvg); liveBuf.stress.push(sAvg); liveBuf.workload.push(wAvg);
  if (liveBuf.labels.length > 60){
    liveBuf.labels.shift(); liveBuf.mood.shift(); liveBuf.stress.shift(); liveBuf.workload.shift();
  }
  // Re-render charts and KPIs
  rerender();
  renderLiveCharts();
}

function fmtPct(n){ return (Math.round(n*100)/100) + '%'; }
function clamp(v,a,b){ return Math.max(a, Math.min(b, v)); }

function getAllPulses(){
  if (demoMode){ return demoPulses.slice().sort((a,b)=> a.date.localeCompare(b.date)); }
  const s = Store.getState(); return (s.pulses||[]).slice().sort((a,b)=> a.date.localeCompare(b.date));
}
function users(){ return Store.getState().users || []; }
function employees(){ return Store.getState().employees || []; }
function empForUser(userId){ return Store.getEmployeeForUser(userId); }

function groupByDept(pulses){
  const map = new Map();
  pulses.forEach(p=>{
    const e = empForUser(p.userId);
    const dept = (e?.department) || 'General';
    if(!map.has(dept)) map.set(dept, []);
    map.get(dept).push(p);
  });
  return map;
}

function avg(arr){ return arr.length ? (arr.reduce((a,b)=>a+Number(b),0)/arr.length) : 0; }
function pearson(x, y){
  const n = Math.min(x.length, y.length); if(n===0) return 0;
  const xs = x.slice(-n); const ys = y.slice(-n);
  const mx = avg(xs), my = avg(ys);
  const num = xs.map((xi,i)=> (xi-mx)*(ys[i]-my)).reduce((a,b)=>a+b,0);
  const den = Math.sqrt(xs.map(xi=> (xi-mx)**2).reduce((a,b)=>a+b,0)) * Math.sqrt(ys.map(yi=> (yi-my)**2).reduce((a,b)=>a+b,0));
  return den ? clamp(num/den, -1, 1) : 0;
}

function sma(series, window=7){
  const out = []; for(let i=0;i<series.length;i++){
    const start = Math.max(0, i-window+1); const seg = series.slice(start, i+1);
    out.push(avg(seg));
  } return out;
}

function directionalBadge(curr, prev){
  const el = document.createElement('span'); el.className='pill';
  const diff = (curr - prev);
  const arrow = diff>0 ? '▲' : (diff<0 ? '▼' : '—');
  el.textContent = `${arrow} ${diff.toFixed(2)}`; el.style.background = diff>=0 ? '#ecfdf5' : '#fee2e2'; el.style.color = diff>=0 ? '#065f46' : '#991b1b';
  return el;
}

function drawLine(canvasId, labels, values){
  const canvas = document.getElementById(canvasId); if(!canvas) return;
  const ctx = canvas.getContext('2d'); const W=canvas.width, H=canvas.height; ctx.clearRect(0,0,W,H);
  const pad=40; const CW=W-pad*2, CH=H-pad*2; const max=Math.max(...values, 1), min=Math.min(...values, -2);
  const xStep=CW/Math.max(1,(labels.length-1)); const mapX=i=> pad + i*xStep;
  const mapY=v=> pad + (CH * (1 - ((v-min)/(max-min))));
  // axes
  ctx.strokeStyle='#e6e9f0'; ctx.beginPath(); ctx.moveTo(pad,pad); ctx.lineTo(pad,H-pad); ctx.lineTo(W-pad,H-pad); ctx.stroke();
  // line
  ctx.strokeStyle='#4f46e5'; ctx.lineWidth=2; ctx.beginPath();
  values.forEach((v,i)=>{ const x=mapX(i), y=mapY(v); if(i===0) ctx.moveTo(x,y); else ctx.lineTo(x,y); }); ctx.stroke();
  // overlay SMA for smoother visual
  const sm = sma(values, Math.min(7, Math.max(3, Math.floor(values.length/6))));
  ctx.strokeStyle='#0ea5e9'; ctx.lineWidth=1.5; ctx.beginPath();
  sm.forEach((v,i)=>{ const x=mapX(i), y=mapY(v); if(i===0) ctx.moveTo(x,y); else ctx.lineTo(x,y); }); ctx.stroke();
}

function renderExecutiveSummary(){
  const pulses = getAllPulses(); if(!pulses.length){
    document.getElementById('kpi-mood').textContent='—';
    document.getElementById('kpi-stress').textContent='—';
    document.getElementById('kpi-eng').textContent='—%';
    document.getElementById('kpi-alerts').textContent='Alerts: 0'; return;
  }
  const todaySeries = pulses.slice(-7);
  const prevSeries = pulses.slice(-14, -7);
  const moodAvg7 = avg(todaySeries.map(p=> (p.mood??0)));
  const moodAvgPrev = avg(prevSeries.map(p=> (p.mood??0)));
  const stressAvg7 = avg(todaySeries.map(p=> (p.stress??3)));
  const stressAvgPrev = avg(prevSeries.map(p=> (p.stress??3)));
  // Company engagement: mean across users of 30d index
  const ids = Array.from(new Set(users().map(u=>u.id)));
  const engs = ids.map(id=> Store.computeEngagementFromPulses(id, 30)).filter(Boolean).map(x=> x.avg);
  const engAvg = engs.length ? Math.round(avg(engs)) : 0;
  document.getElementById('kpi-mood').textContent = moodAvg7.toFixed(2);
  document.getElementById('kpi-stress').textContent = stressAvg7.toFixed(2);
  document.getElementById('kpi-eng').textContent = engAvg + '%';
  const moodDir = directionalBadge(moodAvg7, moodAvgPrev); const stressDir = directionalBadge(stressAvg7, stressAvgPrev);
  const km = document.getElementById('kpi-mood-dir'); km.innerHTML=''; km.appendChild(moodDir);
  const ks = document.getElementById('kpi-stress-dir'); ks.innerHTML=''; ks.appendChild(stressDir);
  // Alerts count
  const thresholds = getThresholds(); const alerts = pulses.filter(p=> (p.mood??0) <= thresholds.mood || (p.stress??3) >= thresholds.stress || (p.workload??3) >= thresholds.workload);
  document.getElementById('kpi-alerts').textContent = `Alerts: ${alerts.length}`;
}

function renderDeptComparison(){
  const pulses = getAllPulses(); const byDept = groupByDept(pulses);
  const tbody = document.querySelector('#deptTable tbody'); tbody.innerHTML='';
  byDept.forEach((list, dept)=>{
    const mood = avg(list.map(p=> (p.mood??0))).toFixed(2);
    const stress = avg(list.map(p=> (p.stress??3))).toFixed(2);
    // approx engagement as 100 * normalized mood
    const eng = Math.round(avg(list.map(p=> ((p.mood??0)+2)/4*100)));
    const tr = document.createElement('tr'); tr.innerHTML = `<td>${dept}</td><td>${mood}</td><td>${stress}</td><td>${eng}%</td>`; tbody.appendChild(tr);
  });
}

function getThresholds(){
  const prefs = Store.getUserPrefs('u-admin') || {}; const t = prefs.alertThresholds || { mood: -1, stress: 4, workload: 4 };
  return t;
}

function renderAlerts(){
  const t = getThresholds(); document.getElementById('thMood').textContent = String(t.mood); document.getElementById('thStress').textContent = String(t.stress); document.getElementById('thWork').textContent = String(t.workload);
  const pulses = getAllPulses(); const list = pulses.filter(p=> (p.mood??0) <= t.mood || (p.stress??3) >= t.stress || (p.workload??3) >= t.workload);
  const ul = document.getElementById('alertsList'); ul.innerHTML='';
  list.slice(-20).reverse().forEach(p=>{
    const e = empForUser(p.userId); const who = e?.name || p.userId; const li = document.createElement('li');
    li.className = 'alert-item';
    li.innerHTML = `<span class="alert-icon">⚠️</span><div class="alert-content"><h4>${who} • ${p.date}</h4><p>mood ${p.mood}, stress ${p.stress}, workload ${p.workload}${p.note? ' — '+p.note : ''}</p></div>`;
    ul.appendChild(li);
  });
}

function renderTrend(){
  const pulses = getAllPulses(); const labels = Array.from(new Set(pulses.map(p=> p.date)));
  const byDate = labels.map(d=> avg(pulses.filter(p=> p.date===d).map(p=> (p.mood??0))));
  drawLine('moodTrend', labels, byDate);
  // Correlation r
  const sVals = labels.map(d=> avg(pulses.filter(p=> p.date===d).map(p=> (p.stress??3))));
  const wVals = labels.map(d=> avg(pulses.filter(p=> p.date===d).map(p=> (p.workload??3))));
  // Additional line charts for stress and workload trends
  drawLine('stressTrend', labels, sVals);
  drawLine('workTrend', labels, wVals);
  document.getElementById('corrStress').textContent = pearson(byDate, sVals).toFixed(2);
  document.getElementById('corrWork').textContent = pearson(byDate, wVals).toFixed(2);
  // Forecast SMA for next 7d: last value of SMA projected
  const sm = sma(byDate, 7); const next = sm.length ? sm[sm.length-1] : 0;
  document.getElementById('forecastMood').textContent = next.toFixed(2);
}

function riskClass(mood, stress){ if(mood<=-1 || stress>=4) return 'risk'; if(mood<0 || stress>=3.5) return 'warn'; return 'ok'; }

function renderHeatMap(){
  const pulses = getAllPulses(); const byDept = groupByDept(pulses);
  const grid = document.getElementById('heatGrid'); grid.innerHTML='';
  byDept.forEach((list, dept)=>{
    const m = avg(list.map(p=> (p.mood??0))); const s = avg(list.map(p=> (p.stress??3)));
    const div = document.createElement('div'); div.className = `heatcell ${riskClass(m,s)}`; div.innerHTML = `<div style="font-weight:600">${dept}</div><div class="small muted">m ${m.toFixed(2)} • s ${s.toFixed(2)}</div>`;
    div.onclick = ()=> renderTeamPanel(dept);
    grid.appendChild(div);
  });
}

function renderTeams(){
  const pulses = getAllPulses(); const byDept = groupByDept(pulses);
  const root = document.getElementById('teams'); root.innerHTML='';
  byDept.forEach((list, dept)=>{
    const m = avg(list.map(p=> (p.mood??0))); const s = avg(list.map(p=> (p.stress??3)));
    const card = document.createElement('div'); card.className='card'; card.innerHTML = `<div style="font-weight:600">${dept}</div><div class="small muted">Mood ${m.toFixed(2)} • Stress ${s.toFixed(2)}</div><button class="btn" style="margin-top:8px">Open</button>`;
    card.querySelector('button').onclick = ()=> renderTeamPanel(dept);
    root.appendChild(card);
  });
}

function renderTeamPanel(dept){
  const pulses = getAllPulses().filter(p=> { const e=empForUser(p.userId); return ((e?.department)||'General')===dept; });
  const panel = document.getElementById('employeePanel'); panel.classList.remove('muted');
  if(!pulses.length){ panel.textContent = `No pulse data for ${dept}.`; return; }
  const grouped = new Map(); pulses.forEach(p=>{ const e=empForUser(p.userId); const who=e?.name||p.userId; if(!grouped.has(who)) grouped.set(who,[]); grouped.get(who).push(p); });
  const wrap = document.createElement('div');
  grouped.forEach((list, who)=>{
    const moodAvg = avg(list.map(p=> (p.mood??0))).toFixed(2);
    const stressAvg = avg(list.map(p=> (p.stress??3))).toFixed(2);
    const last = list[list.length-1];
    const div = document.createElement('div'); div.style.marginBottom='8px';
    div.innerHTML = `<strong>${who}</strong> — mood ${moodAvg}, stress ${stressAvg} • last ${last.date}${last.note? ' — '+last.note: ''}`;
    wrap.appendChild(div);
  });
  panel.innerHTML=''; panel.appendChild(wrap);
}

function analyzeSentiment(){
  const pulses = getAllPulses(); const notes = pulses.map(p=> (p.note||'').toLowerCase()).filter(x=> !!x);
  const posWords = ['good','great','happy','support','help','win','thanks','ok','progress'];
  const negWords = ['bad','sad','stress','overload','tired','angry','delay','blocked','issue'];
  let pos=0, neg=0, neu=0; const freq = {};
  notes.forEach(n=>{
    let score=0; posWords.forEach(w=>{ if(n.includes(w)) score++; freq[w]=(freq[w]||0) + (n.includes(w)?1:0); });
    negWords.forEach(w=>{ if(n.includes(w)) score--; freq[w]=(freq[w]||0) + (n.includes(w)?1:0); });
    if(score>0) pos++; else if(score<0) neg++; else neu++;
  });
  document.getElementById('sentPos').textContent = String(pos);
  document.getElementById('sentNeu').textContent = String(neu);
  document.getElementById('sentNeg').textContent = String(neg);
  const top = Object.entries(freq).sort((a,b)=> b[1]-a[1]).slice(0,8).map(([w,c])=> `${w}(${c})`).join(', ');
  document.getElementById('sentKeys').textContent = top || '—';
}

function exportCSV(){
  const pulses = getAllPulses(); const rows = [['userId','date','mood','stress','workload','note']].concat(
    pulses.map(p=> [p.userId, p.date, p.mood, p.stress, p.workload, (p.note||'').replace(/\n/g,' ')])
  );
  const csv = rows.map(r=> r.map(x=> (x==null?'':String(x))).join(',')).join('\n');
  const blob = new Blob([csv], { type:'text/csv' }); const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href=url; a.download='lumion_pulses.csv'; a.click(); URL.revokeObjectURL(url);
}

function scheduleIntervention(){
  const email = document.getElementById('empEmail').value.trim(); if(!email){ alert('Enter employee email'); return; }
  const emp = employees().find(e=> e.email===email); if(!emp){ alert('Employee not found'); return; }
  const id = Store.addNotification({ id:`intervention:${email}:${Date.now()}`, type:'intervention', userId: (Store.getState().users.find(u=> u.email===email)?.id || 'unknown'), date: Store.todayStr(), message:`Scheduled wellness check-in for ${emp.name}` });
  const li = document.createElement('li'); li.textContent = `Created: ${id}`; document.getElementById('interventions').appendChild(li);
}

function bind(){
  const exportBtn = document.getElementById('exportPulses'); exportBtn && (exportBtn.onclick = exportCSV);
  const export2 = document.getElementById('exportCSV2'); export2 && (export2.onclick = exportCSV);
  const printBtn = document.getElementById('printSnapshot'); printBtn && (printBtn.onclick = ()=> window.print());
  const schedBtn = document.getElementById('scheduleCheckin'); schedBtn && (schedBtn.onclick = scheduleIntervention);
  const demoBtn = document.getElementById('demoToggle'); demoBtn && (demoBtn.onclick = ()=>{ setDemoMode(!demoMode); rerender(); });

  // Thresholds UI binding
  const moodIn = document.getElementById('thMoodInput');
  const stressIn = document.getElementById('thStressInput');
  const workIn = document.getElementById('thWorkInput');
  const saveBtn = document.getElementById('saveThresholds');
  const msg = document.getElementById('thSaveMsg');
  const t = getThresholds();
  if (moodIn && stressIn && workIn) {
    moodIn.value = String(t.mood);
    stressIn.value = String(t.stress);
    workIn.value = String(t.workload);
  }
  if (saveBtn) {
    saveBtn.onclick = ()=>{
      const next = {
        mood: Number(moodIn?.value ?? t.mood),
        stress: Number(stressIn?.value ?? t.stress),
        workload: Number(workIn?.value ?? t.workload)
      };
      // Basic range clamp to expected scales
      next.mood = Math.max(-2, Math.min(2, next.mood));
      next.stress = Math.max(1, Math.min(5, next.stress));
      next.workload = Math.max(1, Math.min(5, next.workload));
      Store.setUserPref('u-admin', 'alertThresholds', next);
      rerender();
      if (msg) { msg.style.display = 'inline'; setTimeout(()=>{ msg.style.display='none'; }, 1600); }
    };
  }
}

function rerender(){
  renderExecutiveSummary();
  renderDeptComparison();
  renderAlerts();
  renderTrend();
  renderHeatMap();
  renderTeams();
  analyzeSentiment();
}

function init(){
  // Auto demo if no live pulses or if ?demo=1 in URL
  const params = new URLSearchParams(location.search);
  const liveHave = (Store.getState().pulses||[]).length > 0;
  if (params.get('demo')==='1' || !liveHave){
    generateDemoData(); setDemoMode(true);
  }
  rerender();
  bind();
  // If demo mode is active, also render the live charts area continuously
  if (demoMode){ renderLiveCharts(); }
}

function renderLiveCharts(){
  // Live mood stream (60s)
  drawLine('liveMood', liveBuf.labels, liveBuf.mood);
  // Optionally could render live stress/workload if canvases exist
}

document.addEventListener('DOMContentLoaded', init);