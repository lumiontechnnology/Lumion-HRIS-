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

// Department-level aggregation from pulses
function computeDeptEngagement(days = 30){
  const s = Store.getState();
  const byDept = new Map();
  (s.users||[]).forEach(u => {
    const emp = s.employees?.find(e => e.email === u.email);
    const dept = emp?.department || '—';
    const agg = Store.computeEngagementFromPulses(u.id, days);
    if(!agg) return;
    if(!byDept.has(dept)) byDept.set(dept, []);
    byDept.get(dept).push(agg.avg);
  });
  const rows = Array.from(byDept.entries()).map(([dept, arr]) => ({ dept, avg: Math.round(arr.reduce((a,b)=>a+b,0)/arr.length) }));
  rows.sort((a,b)=> b.avg - a.avg);
  return rows;
}

// Weekly trend over N weeks (org-level)
function computeWeeklyTrend(weeks = 8){
  const s = Store.getState();
  const out = [];
  const today = new Date();
  for(let w=weeks-1; w>=0; w--){
    const end = new Date(today); end.setDate(end.getDate() - (w*7)); end.setHours(23,59,59,999);
    const start = new Date(end); start.setDate(end.getDate() - 6); start.setHours(0,0,0,0);
    // gather pulses within [start,end]
    const inRange = (p)=>{ const d=new Date(p.date); return d>=start && d<=end; };
    const grouped = new Map();
    (s.pulses||[]).filter(inRange).forEach(p => {
      if(!grouped.has(p.userId)) grouped.set(p.userId, []);
      grouped.get(p.userId).push(p);
    });
    const perUser = Array.from(grouped.entries()).map(([uid, list])=>{
      // compute avg engagement for this user's week using Store mapping
      const avg = Math.round(list.reduce((a,p)=>{
        // recompute engagement mapping similar to Store.computeEngagementFromPulses
        const mood = Number(p.mood||0); const stress = Number(p.stress||3); const workload = Number(p.workload||3);
        let moodScore = 50 + (mood*10);
        let stressPenalty = (stress - 3) * 8; // -16 .. +16
        let workloadPenalty = (workload - 3) * 6; // -12 .. +12
        const idx = Math.max(0, Math.min(100, Math.round(moodScore - stressPenalty - workloadPenalty)));
        return a + idx;
      },0) / (list.length||1));
      return avg;
    });
    const weekAvg = perUser.length ? Math.round(perUser.reduce((a,b)=>a+b,0)/perUser.length) : null;
    out.push({ label: `${start.toISOString().slice(5,10)}–${end.toISOString().slice(5,10)}`, avg: weekAvg });
  }
  return out;
}

// Minimal renderers (module-local)
function drawBar(canvasId, labels, values, color){
  const c = document.getElementById(canvasId); if(!c) return;
  const ctx = c.getContext('2d');
  ctx.clearRect(0,0,c.width,c.height);
  const W=c.width,H=c.height,pad=36; const chartW=W-pad*2, chartH=H-pad*2;
  const max = Math.max(100, Math.max(...values,0));
  // y-axis ticks and grid
  ctx.fillStyle = '#9ca3af'; ctx.font = '11px Arial';
  ctx.strokeStyle = 'rgba(0,0,0,0.06)';
  for(let t=0;t<=5;t++){
    const val = Math.round((max/5)*t);
    const y = pad + chartH - (val/max)*chartH;
    ctx.beginPath(); ctx.moveTo(pad, y); ctx.lineTo(pad+chartW, y); ctx.stroke();
    ctx.fillText(val + '%', 6, y+4);
  }
  // x-axis baseline
  ctx.strokeStyle = '#e5e7eb'; ctx.beginPath(); ctx.moveTo(pad, pad+chartH); ctx.lineTo(pad+chartW, pad+chartH); ctx.stroke();
  const barW = chartW/values.length * 0.6;
  values.forEach((v,i)=>{
    const x = pad + i*(chartW/values.length) + (chartW/values.length - barW)/2;
    const h = (v/max)*chartH;
    ctx.fillStyle = color || '#4f46e5';
    ctx.fillRect(x, pad + chartH - h, barW, h);
    ctx.fillStyle = '#6b7280'; ctx.font = '12px Arial';
    const label = String(labels[i]).slice(0,10);
    ctx.fillText(label, x, H - 8);
  });
  // legend
  ctx.fillStyle = color || '#4f46e5'; ctx.fillRect(W-150, 10, 10, 10);
  ctx.fillStyle = '#374151'; ctx.font='12px Arial'; ctx.fillText('Avg engagement', W-135, 19);
}

function drawLine(canvasId, labels, values, color){
  const c = document.getElementById(canvasId); if(!c) return;
  const ctx = c.getContext('2d');
  ctx.clearRect(0,0,c.width,c.height);
  const W=c.width,H=c.height,pad=36; const chartW=W-pad*2, chartH=H-pad*2;
  const max = Math.max(100, Math.max(...values.filter(v=>v!=null),0));
  const xStep = chartW / Math.max(1,(labels.length-1));
  const mapX = i => pad + i*xStep;
  const mapY = v => pad + chartH - (v/max)*chartH;
  // vertical grid + x labels
  ctx.strokeStyle = 'rgba(0,0,0,0.05)';
  for(let i=0;i<labels.length;i++){
    const x = mapX(i); ctx.beginPath(); ctx.moveTo(x,pad); ctx.lineTo(x,pad+chartH); ctx.stroke();
    ctx.fillStyle='#9ca3af'; ctx.font='11px Arial'; ctx.fillText(String(labels[i]).split('–')[1]||labels[i], x-10, H-8);
  }
  // y-axis ticks
  ctx.fillStyle = '#9ca3af'; ctx.font = '11px Arial';
  for(let t=0;t<=5;t++){
    const val = Math.round((max/5)*t);
    const y = pad + chartH - (val/max)*chartH;
    ctx.beginPath(); ctx.moveTo(pad, y); ctx.lineTo(pad+chartW, y); ctx.strokeStyle='rgba(0,0,0,0.06)'; ctx.stroke();
    ctx.fillText(val + '%', 6, y+4);
  }
  // line
  ctx.beginPath();
  let started=false;
  values.forEach((v,i)=>{
    if(v==null) return;
    const x=mapX(i), y=mapY(v);
    if(!started){ ctx.moveTo(x,y); started=true; } else { ctx.lineTo(x,y); }
  });
  ctx.strokeStyle = color || '#4f46e5'; ctx.lineWidth=2; ctx.stroke();
  // legend
  ctx.fillStyle = color || '#4f46e5'; ctx.fillRect(W-140, 10, 10, 10);
  ctx.fillStyle = '#374151'; ctx.font='12px Arial'; ctx.fillText('Engagement', W-125, 19);
}

// Simple floating tooltip helper
function makeTooltip(){
  let tt = document.getElementById('chartTooltip');
  if(!tt){
    tt = document.createElement('div'); tt.id='chartTooltip';
    Object.assign(tt.style, { position:'fixed', pointerEvents:'none', background:'#111', color:'#fff', padding:'6px 8px', borderRadius:'6px', fontSize:'12px', zIndex:9999, display:'none', opacity:'0.92' });
    document.body.appendChild(tt);
  }
  return tt;
}

function enableBarTooltip(canvasId, labels, values){
  const c = document.getElementById(canvasId); if(!c) return;
  const tt = makeTooltip();
  const W=c.width,H=c.height,pad=36; const chartW=W-pad*2, chartH=H-pad*2;
  const max = Math.max(100, Math.max(...values,0));
  const barW = chartW/values.length * 0.6;
  c.onmousemove = (e)=>{
    const rect = c.getBoundingClientRect(); const x = e.clientX - rect.left; const y = e.clientY - rect.top;
    // find bar index
    for(let i=0;i<values.length;i++){
      const bx = pad + i*(chartW/values.length) + (chartW/values.length - barW)/2;
      const bh = (values[i]/max)*chartH; const by = pad + chartH - bh;
      if(x>=bx && x<=bx+barW && y>=by && y<=by+bh){
        tt.style.display='block'; tt.textContent = `${labels[i]}: ${values[i]}%`;
        tt.style.left = (e.clientX + 10) + 'px'; tt.style.top = (e.clientY + 10) + 'px';
        return;
      }
    }
    tt.style.display='none';
  };
  c.onmouseleave = ()=>{ tt.style.display='none'; };
}

function enableLineTooltip(canvasId, labels, values){
  const c = document.getElementById(canvasId); if(!c) return;
  const tt = makeTooltip();
  const W=c.width,H=c.height,pad=36; const chartW=W-pad*2, chartH=H-pad*2;
  const max = Math.max(100, Math.max(...values.filter(v=>v!=null),0));
  const xStep = chartW / Math.max(1,(labels.length-1));
  const mapX = i => pad + i*xStep;
  const mapY = v => pad + chartH - (v/max)*chartH;
  c.onmousemove = (e)=>{
    const rect = c.getBoundingClientRect(); const x = e.clientX - rect.left;
    // nearest index
    let idx = 0, best = Infinity;
    for(let i=0;i<labels.length;i++){
      const xi = mapX(i); const d = Math.abs(x - xi); if(d < best){ best = d; idx = i; }
    }
    const v = values[idx]; if(v==null){ tt.style.display='none'; return; }
    tt.style.display='block'; tt.textContent = `${labels[idx]}: ${v}%`;
    tt.style.left = (e.clientX + 10) + 'px'; tt.style.top = (e.clientY + 10) + 'px';
  };
  c.onmouseleave = ()=>{ tt.style.display='none'; };
}

function renderDeptAndTrend(){
  try{
    // Department bar
    const rows = computeDeptEngagement(30).slice(0,6);
    if(rows && rows.length){
      const labels = rows.map(r=>r.dept); const vals = rows.map(r=>r.avg);
      drawBar('deptEngagementChart', labels, vals, '#6366f1');
      enableBarTooltip('deptEngagementChart', labels, vals);
    }
    // Weekly trend line
    const weeks = computeWeeklyTrend(8);
    if(weeks && weeks.length){
      const labels = weeks.map(w=>w.label); const vals = weeks.map(w=>w.avg);
      drawLine('engTrendChart', labels, vals, '#4f46e5');
      enableLineTooltip('engTrendChart', labels, vals);
    }
  } catch {}
}

document.addEventListener('DOMContentLoaded', ()=>{
  try { applyEngagement(); } catch {}
  try { renderDeptAndTrend(); } catch {}
});