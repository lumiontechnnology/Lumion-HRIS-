import { Store } from './store.js';
import { AdminBalancedScorecard } from './bsc-module.js';
import { ensureSeededLeaves, getPeopleMeta, LeaveLabels } from './hr-data.js';

// Initial seed (deterministic) and setup
ensureSeededLeaves();

// DOM helpers
const $ = (sel) => document.querySelector(sel);
const ctx = (id) => document.getElementById(id).getContext('2d');

// Filters state
const state = {
  start: null,
  end: null,
  dept: 'All',
  role: 'All',
  loc: 'All',
  focus: 'perf'
};

// Build filter options from people meta
const PEOPLE = getPeopleMeta();

function initFilters() {
  const minDate = new Date(); minDate.setMonth(minDate.getMonth()-5); minDate.setDate(1);
  const maxDate = new Date();
  $('#f-start').value = minDate.toISOString().slice(0,10);
  $('#f-end').value = maxDate.toISOString().slice(0,10);
  state.start = $('#f-start').value; state.end = $('#f-end').value;

  const depts = ['All', ...[...new Set(PEOPLE.map(p=>p.department))]];
  const roles = ['All', ...[...new Set(PEOPLE.map(p=>p.role))]];
  const locs = ['All', ...[...new Set(PEOPLE.map(p=>p.location))]];
  $('#f-dept').innerHTML = depts.map(x=>`<option value="${x}">${x}</option>`).join('');
  $('#f-role').innerHTML = roles.map(x=>`<option value="${x}">${x}</option>`).join('');
  $('#f-loc').innerHTML = locs.map(x=>`<option value="${x}">${x}</option>`).join('');

  ['f-start','f-end','f-dept','f-role','f-loc'].forEach(id=>{
    document.getElementById(id).addEventListener('change', ()=>{
      state.start = $('#f-start').value; state.end = $('#f-end').value;
      state.dept = $('#f-dept').value; state.role = $('#f-role').value; state.loc = $('#f-loc').value;
      renderAll();
      renderOverview();
    });
  });

  // Focus buttons (Performance, Engagement, Recruitment, Compliance, Cost)
  const setFocus = (key)=>{
    state.focus = key;
    ['perf','eng','rec','comp','cost'].forEach(k=>{
      const el = document.getElementById(`foc-${k}`);
      if (!el) return;
      if (k === key) el.classList.remove('bg-white','border','text-gray-700');
      else el.classList.add('bg-white','border','text-gray-700');
    });
    renderOverview();
  };
  [['foc-perf','perf'],['foc-eng','eng'],['foc-rec','rec'],['foc-comp','comp'],['foc-cost','cost']]
    .forEach(([id,key])=>{ const el = document.getElementById(id); if (el) el.addEventListener('click', ()=> setFocus(key)); });
  const def = document.getElementById('foc-perf'); if (def) def.classList.remove('bg-white','border','text-gray-700');
}

// Data fetchers
function inRange(dateStr){
  if (!state.start || !state.end) return true;
  return dateStr >= state.start && dateStr <= state.end;
}

function getScope() {
  // People filtered by dept/role/loc
  return PEOPLE.filter(p => (state.dept==='All'||p.department===state.dept)
    && (state.role==='All'||p.role===state.role)
    && (state.loc==='All'||p.location===state.loc));
}

function getLeavesScoped() {
  const s = Store.getState();
  const allowedUserIds = new Set((s.users||[]).filter(u=> getScope().some(p=>p.email===u.email)).map(u=>u.id));
  return (s.leaves||[])
    .filter(l => allowedUserIds.has(l.userId))
    .filter(l => inRange((l.startDate||l.start||'').slice(0,10)) || inRange((l.endDate||l.end||'').slice(0,10)));
}

function getScopedUsers(){
  const s = Store.getState();
  return (s.users||[]).filter(u => getScope().some(p=>p.email===u.email));
}

function getScopedEmployees(){
  const s = Store.getState();
  const emails = new Set(getScope().map(p=>p.email));
  return (s.employees||[]).filter(e=> emails.has(e.email));
}

function daysBetween(a,b){
  const d1 = new Date(a); const d2 = new Date(b);
  return Math.max(1, Math.floor((d2-d1)/(1000*60*60*24))+1);
}

// Aggregate helpers
function aggTotals() {
  const rows = getLeavesScoped();
  const totals = { total:0, sick:0, casual:0, earned:0, unpaid:0, absent:0 };
  rows.forEach(l => {
    const days = daysBetween(l.startDate||l.start, l.endDate||l.end);
    const t = (l.type||'').toLowerCase();
    if (totals[t] !== undefined) totals[t] += days;
    totals.total += days;
  });
  return totals;
}

function avgLeavesByDepartment(){
  const scope = getScope();
  const byDept = {};
  const s = Store.getState();
  const usersByEmail = new Map((s.users||[]).map(u=>[u.email,u]));
  scope.forEach(p=>{ byDept[p.department] = byDept[p.department] || { days:0, count:0 }; byDept[p.department].count += 1; });
  (s.leaves||[]).forEach(l=>{
    const u = (s.users||[]).find(x=>x.id===l.userId);
    const p = scope.find(pp=>pp.email===u?.email);
    if(!p) return;
    const days = daysBetween(l.startDate||l.start, l.endDate||l.end);
    byDept[p.department].days += days;
  });
  const labels = Object.keys(byDept);
  const values = labels.map(k => byDept[k].count ? +(byDept[k].days/byDept[k].count).toFixed(1) : 0);
  return { labels, values };
}

function avgLeavesByGender(){
  const scope = getScope();
  const s = Store.getState();
  const users = new Map((s.users||[]).map(u=>[u.email,u]));
  const buckets = { Male:{days:0,count:0}, Female:{days:0,count:0}, Others:{days:0,count:0} };
  scope.forEach(p=>{ buckets[p.gender] = buckets[p.gender] || {days:0,count:0}; buckets[p.gender].count += 1; });
  (s.leaves||[]).forEach(l=>{
    const u = (s.users||[]).find(x=>x.id===l.userId);
    const p = scope.find(pp=>pp.email===u?.email);
    if(!p) return;
    const days = daysBetween(l.startDate||l.start, l.endDate||l.end);
    const g = p.gender || 'Others';
    buckets[g] = buckets[g] || {days:0,count:0};
    buckets[g].days += days;
  });
  const labels = Object.keys(buckets).filter(k=>buckets[k].count>0);
  const values = labels.map(k => buckets[k].count ? +(buckets[k].days/buckets[k].count).toFixed(1) : 0);
  return { labels, values };
}

function trendByMonth(){
  const rows = getLeavesScoped();
  const fmt = (d)=> new Date(d).toISOString().slice(0,7);
  const months = {};
  rows.forEach(l=>{
    const m = fmt(l.startDate||l.start);
    months[m] = months[m] || { sick:0, casual:0, earned:0, unpaid:0, absent:0 };
    const days = daysBetween(l.startDate||l.start, l.endDate||l.end);
    const t = (l.type||'').toLowerCase();
    if(months[m][t]!==undefined) months[m][t]+=days;
  });
  const labels = Object.keys(months).sort();
  const make = (k)=> labels.map(l => months[l][k]||0);
  return { labels, sick: make('sick'), casual: make('casual'), earned: make('earned'), unpaid: make('unpaid'), absent: make('absent') };
}

function leavesByWeekday(){
  const rows = getLeavesScoped();
  const bucket = [0,0,0,0,0,0,0]; // Sun..Sat
  rows.forEach(l=>{
    const d = new Date(l.startDate||l.start);
    bucket[d.getDay()] += daysBetween(l.startDate||l.start, l.endDate||l.end);
  });
  const labels = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
  return { labels, values: bucket };
}

// Charts
let CHART_MIX=null, CHART_DEPT=null, CHART_GENDER=null, CHART_WEEKDAY=null, CHART_TREND=null;
let CHART_DEMO_GENDER=null, CHART_DEMO_DEPT=null, CHART_DEMO_LOC=null, CHART_DEMO_TENURE=null;
let CHART_FOCUS_A=null, CHART_FOCUS_B=null;

function renderCharts(){
  if (typeof window.Chart === 'undefined') { console.warn('Chart.js not available; skipping renderCharts.'); return; }
  const totals = aggTotals();
  const mixLabels = ['All'];
  const datasets = LeaveLabels.map(l => ({
    label: l.label,
    data: [ totals[l.key] || 0 ],
    backgroundColor: l.color,
    stack: 'mix'
  }));
  if (CHART_MIX) CHART_MIX.destroy();
  CHART_MIX = new Chart(ctx('c-mix'), { type:'bar', data:{ labels: mixLabels, datasets }, options:{ indexAxis:'y', plugins:{legend:{position:'bottom'}}, scales:{x:{stacked:true}, y:{stacked:true}} } });

  const dept = avgLeavesByDepartment();
  if (CHART_DEPT) CHART_DEPT.destroy();
  CHART_DEPT = new Chart(ctx('c-dept'), { type:'doughnut', data:{ labels: dept.labels, datasets:[{ data: dept.values, backgroundColor: dept.labels.map((_,i)=>`hsl(${(i*57)%360} 70% 65%)`)}] }, options:{ plugins:{legend:{position:'bottom'}} } });

  const gen = avgLeavesByGender();
  if (CHART_GENDER) CHART_GENDER.destroy();
  CHART_GENDER = new Chart(ctx('c-gender'), { type:'bar', data:{ labels: gen.labels, datasets:[{ label:'Avg leaves', data: gen.values, backgroundColor:'#6366f1' }] }, options:{ plugins:{legend:{display:false}} } });

  const wd = leavesByWeekday();
  if (CHART_WEEKDAY) CHART_WEEKDAY.destroy();
  CHART_WEEKDAY = new Chart(ctx('c-weekday'), { type:'bar', data:{ labels: wd.labels, datasets:[{ label:'Leaves', data: wd.values, backgroundColor:'#f97316' }] }, options:{ plugins:{legend:{display:false}} } });

  const tr = trendByMonth();
  const makeSet = (label, data, color) => ({ label, data, borderColor: color, backgroundColor: color+'22', tension:0.25, fill:false });
  if (CHART_TREND) CHART_TREND.destroy();
  CHART_TREND = new Chart(ctx('c-trend'), { type:'line', data:{ labels: tr.labels, datasets:[
    makeSet('Sick Leaves', tr.sick, '#7c3aed'),
    makeSet('Casual Leaves', tr.casual, '#a78bfa'),
    makeSet('Earned Leaves', tr.earned, '#f59e0b'),
    makeSet('Unpaid Leaves', tr.unpaid, '#ef4444'),
    makeSet('Absenteeism without leave', tr.absent, '#94a3b8'),
  ]}, options:{ plugins:{legend:{position:'bottom'}} } });
}

function renderKpis(){
  const totals = aggTotals();
  const scopeCount = getScope().length;
  const prevNote = 'vs prev period (deterministic seed)';
  $('#k-total').innerText = `${totals.total} day(s)`; $('#k-total-sub').innerText = prevNote;
  $('#k-sick').innerText = `${totals.sick} day(s)`; $('#k-sick-sub').innerText = prevNote;
  $('#k-casual').innerText = `${totals.casual} day(s)`; $('#k-casual-sub').innerText = prevNote;
  $('#k-earned').innerText = `${totals.earned} day(s)`; $('#k-earned-sub').innerText = prevNote;
  $('#k-unpaid').innerText = `${totals.unpaid} day(s)`; $('#k-unpaid-sub').innerText = prevNote;
  $('#k-absent').innerText = `${totals.absent} day(s)`; $('#k-absent-sub').innerText = prevNote;
  $('#k-emp').innerText = `${scopeCount}`; $('#k-emp-sub').innerText = 'employees in filters';
  // Leaves offered: average annual allocation from Store.allowances for scoped users
  const s = Store.getState();
  const ids = (s.users||[]).filter(u => getScope().some(p=>p.email===u.email)).map(u=>u.id);
  const allocs = ids.map(id => (s.allowances?.[id]) || { annual:20, sick:3, exam:3, compassionate:3 });
  const avgOffered = allocs.length ? Math.round(allocs.reduce((a,b)=>a+(b.annual||0),0)/allocs.length) : 0;
  $('#k-offered').innerText = `${avgOffered} days`; $('#k-offered-sub').innerText = 'avg annual offered';
}

function renderAll(){
  renderKpis();
  renderCharts();
}

// Tabs and Overview helpers
function setActiveTab(tab){
  const summary = document.getElementById('summary-section');
  const leaves = document.getElementById('leaves-section');
  const bsc = document.getElementById('bsc-section');
  const cycles = document.getElementById('cycles-section');
  const tabSummary = document.getElementById('tab-summary');
  const tabLeaves = document.getElementById('tab-leaves');
  const tabBsc = document.getElementById('tab-bsc');
  const tabCycles = document.getElementById('tab-cycles');
  const isSummary = tab === 'summary';
  const isBsc = tab === 'bsc';
  const isCycles = tab === 'cycles';
  summary.classList.toggle('hidden', !isSummary);
  leaves.classList.toggle('hidden', isSummary || isBsc || isCycles);
  if (bsc) bsc.classList.toggle('hidden', !isBsc);
  if (cycles) cycles.classList.toggle('hidden', !isCycles);
  // visual pills
  if (isSummary){
    tabSummary.classList.remove('bg-white','border','text-gray-700');
    tabLeaves.classList.add('bg-white','border','text-gray-700');
    if (tabBsc) tabBsc.classList.add('bg-white','border','text-gray-700');
    if (tabCycles) tabCycles.classList.add('bg-white','border','text-gray-700');
  } else {
    tabSummary.classList.add('bg-white','border','text-gray-700');
    if (tabBsc && isBsc) {
      tabBsc.classList.remove('bg-white','border','text-gray-700');
      tabLeaves.classList.add('bg-white','border','text-gray-700');
      if (tabCycles) tabCycles.classList.add('bg-white','border','text-gray-700');
    } else if (tabCycles && isCycles) {
      tabCycles.classList.remove('bg-white','border','text-gray-700');
      tabLeaves.classList.add('bg-white','border','text-gray-700');
      if (tabBsc) tabBsc.classList.add('bg-white','border','text-gray-700');
    } else {
      tabLeaves.classList.remove('bg-white','border','text-gray-700');
      if (tabBsc) tabBsc.classList.add('bg-white','border','text-gray-700');
      if (tabCycles) tabCycles.classList.add('bg-white','border','text-gray-700');
    }
  }
}

function renderOverview(){
  const totals = aggTotals();
  const scope = getScope();
  const insights = [];

  const setK = (i, label, val, sub='')=>{
    const l = document.getElementById(`ov-k${i}-label`);
    const v = document.getElementById(`ov-k${i}`);
    const s = document.getElementById(`ov-k${i}-sub`);
    if (l) l.innerText = label;
    if (v) v.innerText = val;
    if (s) s.innerText = sub;
  };
  const fmtCurr = (v)=> new Intl.NumberFormat('en-NG', { style:'currency', currency:'NGN', maximumFractionDigits:0 }).format(Math.round(v||0));

  const dept = avgLeavesByDepartment();
  const scopeCount = scope.length || 1;
  const avgLeaves = +(totals.total / scopeCount).toFixed(1);

  if (state.focus === 'perf') {
    const users = getScopedUsers();
    const scores = users.map(u => Store.computeKpiAggregate(u.id) || 0);
    const avgScore = scores.length ? Math.round(scores.reduce((a,b)=>a+b,0)/scores.length) : 0;
    setK(1, 'Avg KPI Score', `${avgScore}%`, 'Weighted average across scoped users');
    setK(2, 'Avg Leaves per Employee', `${avgLeaves} day(s)`, `across ${scope.length} employee(s)`);
    setK(3, 'Employees in Scope', `${scope.length}`, 'after filters');
    let best = '—', bestVal = Infinity;
    dept.labels.forEach((label,i)=>{ const v = dept.values[i]; if (v < bestVal){ best=label; bestVal=v; }});
    setK(4, 'Best Dept (Lowest Leaves)', best === '—' ? '—' : best, best === '—' ? '' : `${bestVal} avg days`);
    if (avgScore < 50) insights.push('KPI scores are low; consider coaching or workload review.');
    insights.push(`Average leaves per employee is ${avgLeaves}.`);
  } else if (state.focus === 'eng') {
    const now = new Date();
    const emps = getScopedEmployees();
    const months = emps.map(e => Math.max(0, (now - new Date(e.start))/(1000*60*60*24*30.4)));
    const avgTenure = months.length ? Math.round(months.reduce((a,b)=>a+b,0)/months.length) : 0;
    const proxyEng = Math.max(50, Math.min(95, Math.round(100 - (avgLeaves*5))));
    setK(1, 'Engagement Score (proxy)', `${proxyEng}%`, 'Derived from leave usage');
    setK(2, 'Retention Rate', `100%`, 'No departures recorded');
    setK(3, 'Attrition Rate', `0%`, 'No departures recorded');
    setK(4, 'Average Tenure', `${avgTenure} mo`, 'across scoped employees');
    insights.push(`Average tenure is ${avgTenure} months.`);
  } else if (state.focus === 'rec') {
    const s = Store.getState();
    const emailSet = new Set(scope.map(p=>p.email));
    const hires = (s.employees||[]).filter(e => emailSet.has(e.email))
      .filter(e => inRange((e.start||'').slice(0,10)));
    const newHires = hires.length;
    const rate = scope.length ? Math.round((newHires / scope.length) * 100) : 0;
    const avgTenureHires = newHires ? Math.round(hires.map(h=> (new Date() - new Date(h.start)) / (1000*60*60*24*30.4)).reduce((a,b)=>a+b,0)/newHires) : 0;
    setK(1, 'New Hires (period)', `${newHires}`, 'Start date within filters');
    setK(2, 'Hiring Rate (approx)', `${rate}%`, 'New hires / scope headcount');
    setK(3, 'Headcount (scope)', `${scope.length}`, 'after filters');
    setK(4, 'Avg Tenure of New Hires', newHires ? `${avgTenureHires} mo` : '—', newHires ? '' : 'No new hires in period');
    if (newHires === 0) insights.push('No new hires in the selected period.');
  } else if (state.focus === 'comp') {
    const approvedDays = totals.total - (totals.absent || 0);
    const compliance = totals.total ? Math.round((approvedDays / totals.total) * 100) : 100;
    setK(1, 'Leave Compliance Rate', `${compliance}%`, 'Approved vs absent days');
    setK(2, 'Policy Breaches (Absent Days)', `${totals.absent || 0}`, 'Absences without leave');
    setK(3, 'Unpaid Leave Days', `${totals.unpaid || 0}`, 'Not covered by pay');
    setK(4, 'Approved Leave Days', `${approvedDays}`, 'All compliant leave days');
    if ((totals.absent||0) > 0) insights.push('Absenteeism detected; consider follow-ups on policy adherence.');
  } else if (state.focus === 'cost') {
    const emps = getScopedEmployees();
    const sumSalary = emps.reduce((a,b)=>a + (Number(b.salary)||0), 0);
    const avgSalary = emps.length ? Math.round(sumSalary / emps.length) : 0;
    const paidDays = (totals.sick||0) + (totals.casual||0) + (totals.earned||0);
    const avgDaily = emps.length ? (avgSalary / 22) : 0;
    const leaveCost = Math.round(paidDays * avgDaily);
    setK(1, 'Total Monthly Payroll', fmtCurr(sumSalary), 'Sum of base salaries');
    setK(2, 'Paid Leave Cost (period)', fmtCurr(leaveCost), `${paidDays} paid leave day(s)`);
    setK(3, 'Headcount (scope)', `${emps.length}`, 'after filters');
    setK(4, 'Average Salary', fmtCurr(avgSalary), 'per employee');
    insights.push(`Estimated paid leave cost is ${fmtCurr(leaveCost)} for the period.`);
  }

  // Always include a largest-share insight from leaves mix
  const kinds = [
    {k:'sick', label:'Sick'}, {k:'casual', label:'Casual'}, {k:'earned', label:'Earned'}, {k:'unpaid', label:'Unpaid'}
  ];
  const maxKind = kinds.reduce((m, it)=> (totals[it.k] > (m.val||0) ? {key:it.k, label:it.label, val:totals[it.k]} : m), {});
  if (maxKind.label) insights.push(`${maxKind.label} leaves are the largest share at ${maxKind.val} day(s).`);
  $('#ov-insights').innerHTML = insights.map(i=>`<li>${i}</li>`).join('');

  // After KPIs/insights, render demographics and focus charts
  renderDemographics();
  renderFocusCharts();
}

function handleHash(){
  const h = (location.hash || '#summary').replace('#','');
  setActiveTab(h);
}

// Init
initFilters();
renderAll();
renderOverview();
handleHash();
window.addEventListener('hashchange', handleHash);
document.getElementById('tab-summary').addEventListener('click', ()=> setTimeout(()=>renderOverview(), 0));
const tabBsc = document.getElementById('tab-bsc');
let ADMIN_BSC=null;
if (tabBsc) {
  tabBsc.addEventListener('click', ()=> {
    if (!ADMIN_BSC) { ADMIN_BSC = new AdminBalancedScorecard(); ADMIN_BSC.initialize(); }
    else { ADMIN_BSC.render(); }
  });
}

const tabCycles = document.getElementById('tab-cycles');
function renderCycles(){
  const s = Store.getState();
  const deptSel = document.getElementById('cyc-dept');
  if (deptSel && !deptSel.options.length){
    const depts = ['All', ...[...new Set((s.employees||[]).map(e=>e.department))]];
    deptSel.innerHTML = depts.map(x=>`<option value="${x}">${x}</option>`).join('');
  }
  const rows = Store.getAppraisalCycles();
  const tbody = document.getElementById('cyc-table');
  if (!tbody) return;
  tbody.innerHTML = '';
  rows.forEach(c => {
    const completed = (c.participants||[]).filter(uid => (c.statusByUser||{})[uid] === 'completed').length;
    const pending = (c.participants||[]).length - completed;
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td class="p-2">${c.type.toUpperCase()}</td>
      <td class="p-2">${c.period}</td>
      <td class="p-2">${(c.participants||[]).length}</td>
      <td class="p-2">${completed}</td>
      <td class="p-2">${pending}</td>
      <td class="p-2">
        <button class="pill bg-white border text-gray-700" data-act="remind" data-id="${c.id}">Send Reminders</button>
        ${c.type==='360' ? `<button class="pill bg-white border text-gray-700" data-act="assign" data-id="${c.id}">Assign Default Raters</button>` : ''}
      </td>`;
    tbody.appendChild(tr);
  });
  tbody.querySelectorAll('button[data-act="remind"]').forEach(btn => {
    btn.addEventListener('click', ()=>{
      const id = btn.getAttribute('data-id');
      const cyc = rows.find(r => r.id === id);
      (cyc.participants||[]).filter(uid => (cyc.statusByUser||{})[uid] !== 'completed').forEach(uid => Store.sendCycleReminder(id, uid));
      renderCycles();
    });
  });
  tbody.querySelectorAll('button[data-act="assign"]').forEach(btn => {
    btn.addEventListener('click', ()=>{
      const id = btn.getAttribute('data-id');
      Store.assignDefaultRaters(id);
      renderCycles();
    });
  });
}
if (tabCycles){
  tabCycles.addEventListener('click', ()=> renderCycles());
  const btnCreate = document.getElementById('cyc-create');
  if (btnCreate) btnCreate.addEventListener('click', ()=>{
    const type = document.getElementById('cyc-type').value;
    const period = document.getElementById('cyc-period').value;
    const dept = document.getElementById('cyc-dept').value;
    const s = Store.getState();
    const users = (s.users||[]).filter(u => {
      const e = (s.employees||[]).find(e=>e.email===u.email);
      return dept==='All' ? true : e?.department === dept;
    }).map(u=>u.id);
    const ownerId = (s.users||[])[0]?.id || 1;
    Store.createAppraisalCycle({ type, period, participants: users, ownerId });
    renderCycles();
  });
}
document.getElementById('tab-leaves').addEventListener('click', ()=> setTimeout(()=>renderAll(), 0));

// Demographics helpers and charts
function getScopedPeople(){ return getScope(); }

function demoGender(){
  const p = getScopedPeople();
  const counts = {};
  p.forEach(x=>{ const g=x.gender||'Other'; counts[g]=(counts[g]||0)+1; });
  const labels = Object.keys(counts);
  const values = labels.map(k=>counts[k]);
  return { labels, values };
}
function demoDept(){
  const p = getScopedPeople();
  const counts = {};
  p.forEach(x=>{ const d=x.department||'—'; counts[d]=(counts[d]||0)+1; });
  const labels = Object.keys(counts);
  const values = labels.map(k=>counts[k]);
  return { labels, values };
}
function demoLoc(){
  const p = getScopedPeople();
  const counts = {};
  p.forEach(x=>{ const d=x.location||'—'; counts[d]=(counts[d]||0)+1; });
  const labels = Object.keys(counts);
  const values = labels.map(k=>counts[k]);
  return { labels, values };
}
function demoTenure(){
  const p = getScopedPeople();
  const s = Store.getState();
  const byEmail = new Map((s.employees||[]).map(e=>[e.email,e]));
  const now = new Date();
  const buckets = { '<6m':0,'6–12m':0,'1–2y':0,'2–3y':0,'3y+':0 };
  p.forEach(x=>{
    const emp = byEmail.get(x.email);
    if (!emp || !emp.start) return;
    const months = Math.max(0, (now - new Date(emp.start))/(1000*60*60*24*30.4));
    if (months < 6) buckets['<6m']++;
    else if (months < 12) buckets['6–12m']++;
    else if (months < 24) buckets['1–2y']++;
    else if (months < 36) buckets['2–3y']++;
    else buckets['3y+']++;
  });
  const labels = Object.keys(buckets);
  const values = labels.map(k=>buckets[k]);
  return { labels, values };
}

function renderDemographics(){
  if (typeof window.Chart === 'undefined') { console.warn('Chart.js not available; skipping renderDemographics.'); return; }
  try {
    const g = demoGender();
    if (CHART_DEMO_GENDER) CHART_DEMO_GENDER.destroy();
    CHART_DEMO_GENDER = new Chart(ctx('c-demo-gender'), { type:'doughnut', data:{ labels:g.labels, datasets:[{ data:g.values, backgroundColor:g.labels.map((_,i)=>`hsl(${(i*67)%360} 70% 65%)`) }] }, options:{ plugins:{legend:{position:'bottom'}} } });

    const d = demoDept();
    if (CHART_DEMO_DEPT) CHART_DEMO_DEPT.destroy();
    CHART_DEMO_DEPT = new Chart(ctx('c-demo-dept'), { type:'bar', data:{ labels:d.labels, datasets:[{ label:'Headcount', data:d.values, backgroundColor:'#60a5fa' }] }, options:{ plugins:{legend:{display:false}}, scales:{x:{ticks:{autoSkip:false}}} } });

    const l = demoLoc();
    if (CHART_DEMO_LOC) CHART_DEMO_LOC.destroy();
    CHART_DEMO_LOC = new Chart(ctx('c-demo-loc'), { type:'bar', data:{ labels:l.labels, datasets:[{ label:'Headcount', data:l.values, backgroundColor:'#34d399' }] }, options:{ plugins:{legend:{display:false}} } });

    const t = demoTenure();
    if (CHART_DEMO_TENURE) CHART_DEMO_TENURE.destroy();
    CHART_DEMO_TENURE = new Chart(ctx('c-demo-tenure'), { type:'bar', data:{ labels:t.labels, datasets:[{ label:'Employees', data:t.values, backgroundColor:'#fbbf24' }] }, options:{ plugins:{legend:{display:false}} } });
  } catch {}
}

// Focus charts
function renderFocusCharts(){
  if (typeof window.Chart === 'undefined') { console.warn('Chart.js not available; skipping renderFocusCharts.'); return; }
  const setLabel = (id, text)=>{ const el=document.getElementById(id); if (el) el.innerText=text; };
  const sub = { perf:'Performance & Productivity', eng:'Engagement & Retention', rec:'Recruitment & Pipeline', comp:'Compliance & Policy', cost:'HR Cost & Workforce' }[state.focus] || '';
  setLabel('focus-charts-sub', sub);

  // Destroy previous
  if (CHART_FOCUS_A) { CHART_FOCUS_A.destroy(); CHART_FOCUS_A=null; }
  if (CHART_FOCUS_B) { CHART_FOCUS_B.destroy(); CHART_FOCUS_B=null; }

  const scope = getScope();
  const s = Store.getState();
  const emails = new Set(scope.map(p=>p.email));

  if (state.focus === 'perf'){
    // A: Avg KPI by department
    const depts = [...new Set(scope.map(p=>p.department))];
    const byDept = depts.map(d=>{
      const users = (s.users||[]).filter(u=> emails.has(u.email) && scope.find(p=>p.email===u.email)?.department===d);
      const scores = users.map(u=> Store.computeKpiAggregate(u.id));
      const avg = scores.length ? Math.round(scores.reduce((a,b)=>a+b,0)/scores.length) : 0;
      return avg;
    });
    setLabel('c-focus-a-label','Avg KPI Score by Department');
    CHART_FOCUS_A = new Chart(ctx('c-focus-a'), { type:'bar', data:{ labels:depts, datasets:[{ label:'Avg KPI %', data:byDept, backgroundColor:'#818cf8' }] }, options:{ plugins:{legend:{display:false}} } });

    // B: Avg Leaves by Department (reuse dept averages)
    const deptLeaves = avgLeavesByDepartment();
    setLabel('c-focus-b-label','Avg Leaves by Department');
    CHART_FOCUS_B = new Chart(ctx('c-focus-b'), { type:'bar', data:{ labels:deptLeaves.labels, datasets:[{ label:'Avg days', data:deptLeaves.values, backgroundColor:'#f472b6' }] }, options:{ plugins:{legend:{display:false}} } });
  } else if (state.focus === 'eng'){
    // A: Engagement proxy by department (100 - avgLeaves*5)
    const deptLeaves = avgLeavesByDepartment();
    const engVals = deptLeaves.values.map(v=> Math.max(50, Math.min(95, Math.round(100 - (v*5)))));
    setLabel('c-focus-a-label','Engagement Score (proxy) by Department');
    CHART_FOCUS_A = new Chart(ctx('c-focus-a'), { type:'bar', data:{ labels:deptLeaves.labels, datasets:[{ label:'Engagement %', data:engVals, backgroundColor:'#34d399' }] }, options:{ plugins:{legend:{display:false}} } });

    // B: Average Tenure by Department
    const byDept = {};
    const empByEmail = new Map((s.employees||[]).map(e=>[e.email,e]));
    scope.forEach(p=>{
      const e = empByEmail.get(p.email); if (!e||!e.start) return;
      const months = Math.max(0, (new Date() - new Date(e.start))/(1000*60*60*24*30.4));
      byDept[p.department] = byDept[p.department] || { sum:0, n:0 };
      byDept[p.department].sum += months; byDept[p.department].n += 1;
    });
    const labels = Object.keys(byDept);
    const vals = labels.map(k=> byDept[k].n? Math.round(byDept[k].sum/byDept[k].n):0);
    setLabel('c-focus-b-label','Average Tenure (months) by Department');
    CHART_FOCUS_B = new Chart(ctx('c-focus-b'), { type:'bar', data:{ labels, datasets:[{ label:'Months', data:vals, backgroundColor:'#fbbf24' }] }, options:{ plugins:{legend:{display:false}} } });
  } else if (state.focus === 'rec'){
    // A: New hires per month
    const hires = (s.employees||[]).filter(e=> emails.has(e.email)).filter(e=> e.start && inRange(e.start.slice(0,10)));
    const months = {};
    hires.forEach(h=>{ const m=(new Date(h.start)).toISOString().slice(0,7); months[m]=(months[m]||0)+1; });
    const labels = Object.keys(months).sort(); const vals = labels.map(l=>months[l]);
    setLabel('c-focus-a-label','New Hires per Month');
    CHART_FOCUS_A = new Chart(ctx('c-focus-a'), { type:'line', data:{ labels, datasets:[{ label:'Hires', data:vals, borderColor:'#60a5fa', backgroundColor:'#60a5fa22', tension:0.25, fill:false }] }, options:{ plugins:{legend:{position:'bottom'}} } });

    // B: New hires by department
    const byDept = {};
    hires.forEach(h=>{ const p=scope.find(pp=>pp.email===h.email); const d=p?.department||'—'; byDept[d]=(byDept[d]||0)+1; });
    const dLabels = Object.keys(byDept); const dVals = dLabels.map(k=>byDept[k]);
    setLabel('c-focus-b-label','New Hires by Department');
    CHART_FOCUS_B = new Chart(ctx('c-focus-b'), { type:'bar', data:{ labels:dLabels, datasets:[{ label:'Hires', data:dVals, backgroundColor:'#a78bfa' }] }, options:{ plugins:{legend:{display:false}} } });
  } else if (state.focus === 'comp'){
    // A: Compliance rate by department
    const leaves = getLeavesScoped();
    const byDept = {};
    leaves.forEach(l=>{
      const u = (s.users||[]).find(x=>x.id===l.userId); if (!u) return;
      const p = scope.find(pp=>pp.email===u.email); if (!p) return;
      const d = p.department; const days = daysBetween(l.startDate||l.start, l.endDate||l.end);
      byDept[d] = byDept[d] || { total:0, absent:0 };
      byDept[d].total += days; if ((l.type||'').toLowerCase()==='absent') byDept[d].absent += days;
    });
    const labels = Object.keys(byDept);
    const vals = labels.map(k=>{ const x=byDept[k]; return x.total? Math.round(((x.total - x.absent)/x.total)*100):100; });
    setLabel('c-focus-a-label','Leave Compliance Rate by Department');
    CHART_FOCUS_A = new Chart(ctx('c-focus-a'), { type:'bar', data:{ labels, datasets:[{ label:'Compliance %', data:vals, backgroundColor:'#10b981' }] }, options:{ plugins:{legend:{display:false}}, scales:{y:{min:0,max:100}} } });

    // B: Absent days per month
    const rows = leaves.filter(l=> (l.type||'').toLowerCase()==='absent');
    const months = {};
    rows.forEach(l=>{ const m=(new Date(l.startDate||l.start)).toISOString().slice(0,7); months[m]=(months[m]||0)+daysBetween(l.startDate||l.start,l.endDate||l.end); });
    const mLabels = Object.keys(months).sort(); const mVals = mLabels.map(k=>months[k]);
    setLabel('c-focus-b-label','Absenteeism (days) per Month');
    CHART_FOCUS_B = new Chart(ctx('c-focus-b'), { type:'line', data:{ labels:mLabels, datasets:[{ label:'Absent days', data:mVals, borderColor:'#ef4444', backgroundColor:'#ef444422', tension:0.25, fill:false }] }, options:{ plugins:{legend:{position:'bottom'}} } });
  } else if (state.focus === 'cost'){
    // A: Payroll by department
    const byDept = {};
    (s.employees||[]).filter(e=> emails.has(e.email)).forEach(e=>{ const d=e.department||'—'; byDept[d]=(byDept[d]||0)+ (Number(e.salary)||0); });
    const labels = Object.keys(byDept); const vals = labels.map(k=>byDept[k]);
    setLabel('c-focus-a-label','Monthly Payroll by Department');
    CHART_FOCUS_A = new Chart(ctx('c-focus-a'), { type:'bar', data:{ labels, datasets:[{ label:'NGN', data:vals, backgroundColor:'#0ea5e9' }] }, options:{ plugins:{legend:{display:false}} } });

    // B: Paid leave cost per month (approx)
    const leaves = getLeavesScoped();
    const paidTypes = new Set(['sick','casual','earned']);
    const emps = (s.employees||[]).filter(e=> emails.has(e.email));
    const avgSalary = emps.length ? emps.reduce((a,b)=>a+(Number(b.salary)||0),0)/emps.length : 0;
    const avgDaily = avgSalary/22;
    const months = {};
    leaves.forEach(l=>{
      const t=(l.type||'').toLowerCase(); if (!paidTypes.has(t)) return;
      const m=(new Date(l.startDate||l.start)).toISOString().slice(0,7);
      const days=daysBetween(l.startDate||l.start,l.endDate||l.end);
      months[m]=(months[m]||0)+ Math.round(days*avgDaily);
    });
    const mLabels = Object.keys(months).sort(); const mVals = mLabels.map(k=>months[k]);
    setLabel('c-focus-b-label','Paid Leave Cost per Month (approx)');
    CHART_FOCUS_B = new Chart(ctx('c-focus-b'), { type:'line', data:{ labels:mLabels, datasets:[{ label:'Cost (NGN)', data:mVals, borderColor:'#14b8a6', backgroundColor:'#14b8a622', tension:0.25, fill:false }] }, options:{ plugins:{legend:{position:'bottom'}} } });
  }
}