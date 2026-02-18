// Seamless-style User Dashboard renderer
import { Store } from './store.js';
import { requireAuth, renderUserMenu } from './auth.js';

requireAuth('user');
renderUserMenu();

const user = Store.currentUser();
if (!user) {
  // Not authenticated; redirect will be handled in requireAuth. Halt script.
  // Avoid binding event listeners when user is null.
  throw new Error('Not authenticated');
}
const employee = Store.getEmployeeForUser(user.id);

function el(q) { return document.querySelector(q); }
function fmtMoney(n) { return new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN' }).format(n); }
function fmtHHMM(d){
  const h=String(d.getHours()).padStart(2,'0');
  const m=String(d.getMinutes()).padStart(2,'0');
  return `${h}:${m}`;
}
function parseHHMM(s){ const [h,m] = (s||'').split(':').map(Number); if (isNaN(h)||isNaN(m)) return null; const d=new Date(); d.setHours(h||0,m||0,0,0); return d; }

function showToast(message, type='info'){
  const c = document.getElementById('toast-container'); if(!c) return;
  const d = document.createElement('div'); d.className = `toast ${type}`; d.textContent = message; c.appendChild(d);
  requestAnimationFrame(()=> d.classList.add('show'));
  setTimeout(()=>{ d.classList.remove('show'); setTimeout(()=> c.removeChild(d), 220); }, 3000);
}

function showLoading(selector, text='Loading...'){
  const n = typeof selector === 'string' ? document.querySelector(selector) : selector;
  if (!n) return ()=>{};
  const prev = { html: n.innerHTML, disabled: n.disabled };
  n.innerHTML = `<span class="spinner"></span>${text}`;
  n.disabled = true;
  return ()=>{ n.innerHTML = prev.html; n.disabled = prev.disabled; };
}

function validateLeaveForm(form){
  const s = form.start.value;
  const e = form.end.value;
  if (!s || !e){ showToast('Select start and end dates','warning'); return false; }
  const sd = new Date(s);
  const ed = new Date(e);
  const today = new Date(); today.setHours(0,0,0,0);
  if (sd < today){ showToast('Start date cannot be in the past','error'); return false; }
  if (ed < sd){ showToast('End date must be after start date','error'); return false; }
  const isWeekend = (d)=>{ const x = d.getDay(); return x===0 || x===6; };
  if (isWeekend(sd) || isWeekend(ed)){ showToast('Selected dates include a weekend','warning'); }
  return true;
}

function renderPendingRequests(){
  const b = document.getElementById('badge-pending'); if(!b) return;
  const leaves = Store.getLeaves(user.id).filter(l=> (l.status||'pending') === 'pending');
  const reqs = Store.getRequests(user.id).filter(r=> (r.status||'pending') === 'pending');
  const n = leaves.length + reqs.length;
  b.textContent = String(n);
  b.style.display = n > 0 ? '' : 'none';
}

function renderQuickStats(){
  const now = new Date();
  const ym = now.toISOString().slice(0,7);
  const all = Store.getLeaves(user.id);
  const monthCount = all.filter(l => (l.startDate||'').slice(0,7) === ym || (l.endDate||'').slice(0,7) === ym).length;
  const upcoming = all.filter(l => (l.startDate||l.start||'') >= Store.todayStr()).sort((a,b)=> (a.startDate||'').localeCompare(b.startDate||''))[0];
  const qs1 = document.getElementById('qs-leaves-month'); if(qs1) qs1.textContent = monthCount ? `${monthCount} leave(s) this month` : 'No leaves this month';
  const qs2 = document.getElementById('qs-upcoming'); if(qs2) qs2.textContent = upcoming ? `Upcoming: ${upcoming.type} on ${upcoming.startDate||upcoming.start}` : 'No upcoming leave';
}

// Glass KPI computations
function computeHoursThisWeek(){
  const start = startOfWeek(new Date());
  const end = endOfWeek(new Date());
  const records = Store.getAttendance(user.id).filter(r => {
    const d = r.date ? new Date(r.date) : null; if(!d) return false; return d >= start && d <= end;
  });
  let minutes = 0;
  records.forEach(r => {
    const cin = parseHHMM(r.clockIn||'09:00');
    const cout = parseHHMM(r.clockOut||WORK_END);
    if (cin && cout) minutes += Math.max(0, (cout - cin) / 60000);
  });
  return Math.round(minutes/60 * 10)/10; // hours, 1 decimal
}

function computeCompletedTasksThisMonth(){
  const s = Store.getState();
  const start = startOfMonth(new Date());
  const end = endOfMonth(new Date());
  const att = (s.attendance||[]).filter(a=>{ const d=new Date(a.date); return d>=start && d<=end && a.clockIn && a.clockOut; }).length;
  const leaves = (s.leaves||[]).filter(l=> l.userId===user.id && l.status==='approved' && new Date(l.startDate)>=start && new Date(l.startDate)<=end).length;
  return att + leaves;
}

function renderKpis(){
  const hours = computeHoursThisWeek();
  const { alloc, used } = Store.getLeaveBalances(user.id);
  const remainingAnnual = Math.max(0, (alloc.annual||0) - (used.annual||0));
  const perf = (()=>{
    const slips = Store.getAppraisals(user.id); if(!slips||!slips.length) return null;
    const last = slips[slips.length-1]; const sum = Store.computeAndSaveAppraisalSummary(user.id, last.period);
    return sum?.overall ?? null;
  })();
  const done = computeCompletedTasksThisMonth();
  const banner = document.querySelector('.hero .kpi .percent'); if (banner) banner.textContent = `${Math.min(100, Math.round((employee?.name?1:0) * 100))}%`;
  // Optionally update a KPI area if added later
}

function enhancePulseUI(){
  const labels = ['Very Low','Low','Moderate','High','Very High'];
  const add = (id)=>{
    const input = document.getElementById(id); if(!input) return;
    const next = input.nextElementSibling;
    if(!next || !next.classList || !next.classList.contains('slider-labels')){
      const div = document.createElement('div');
      div.className = 'slider-labels';
      div.innerHTML = labels.map(l=> `<span>${l}</span>`).join('');
      input.insertAdjacentElement('afterend', div);
    }
  };
  add('pulse-stress');
  add('pulse-workload');
}

function initials(name) {
  return (name||'')
    .split(' ')
    .filter(Boolean)
    .slice(0,2)
    .map(p => p[0].toUpperCase())
    .join('');
}

function daysBetween(a, b) {
  const d1 = new Date(a);
  const d2 = new Date(b);
  return Math.max(1, Math.round((d2 - d1) / (1000*60*60*24)) + 1);
}

function renderHero() {
  el('#hero-initials').textContent = initials(user.name);
  el('#hero-name').textContent = user.name;
  if (employee) {
    el('#hero-empid').textContent = employee.id || '—';
    el('#tile-dept .value').textContent = employee.department || '—';
    el('#tile-location .value').textContent = employee.location || '—';
    el('#tile-supervisor .value').textContent = employee.manager || '—';
    const start = employee.start ? new Date(employee.start) : null;
    if (start) {
      const date = start.toLocaleDateString(undefined, { month: 'long', day: '2-digit' });
      el('#tile-anniversary .value').textContent = date;
    }
  }
}

function renderLeaveBalances() {
  const { alloc, used } = Store.getLeaveBalances(user.id);
  const container = el('#leave-bars');
  const rows = [
    { key: 'exam', label: 'Exam Leave' },
    { key: 'compassionate', label: 'Compassionate Leave' },
    { key: 'annual', label: 'Annual Leave' },
    { key: 'sick', label: 'Sick Leave' }
  ];
  container.innerHTML = rows.map(r => {
    const total = alloc[r.key] ?? 0;
    const usedDays = used[r.key] ?? 0;
    const remaining = Math.max(0, total - usedDays);
    const pct = total ? Math.min(100, Math.round(((total - remaining) / total) * 100)) : 0;
    return `
      <div class="leave-row">
        <div class="label">${r.label}</div>
        <div class="bar bar-${r.key}"><span style="width:${pct}%"></span></div>
        <div class="meta">${remaining} of ${total} day(s)</div>
      </div>
    `;
  }).join('');
}

function startOfWeek(d){ const dt=new Date(d); const day=dt.getDay(); const diff=dt.getDate() - day + (day===0? -6:1); dt.setDate(diff); dt.setHours(0,0,0,0); return dt; }
function endOfWeek(d){ const s=startOfWeek(d); const e=new Date(s); e.setDate(s.getDate()+6); e.setHours(23,59,59,999); return e; }
function startOfMonth(d){ const dt=new Date(d); dt.setDate(1); dt.setHours(0,0,0,0); return dt; }
function endOfMonth(d){ const dt=new Date(d); dt.setMonth(dt.getMonth()+1,0); dt.setHours(23,59,59,999); return dt; }

function getDeptOnLeave(range='today'){
  const s = Store.getState();
  const meUser = s.users.find(x=>x.id===user.id);
  const me = s.employees.find(e=> e.email === meUser.email);
  if (!me) return [];
  const dept = me.department;
  const now = new Date();
  let winStart, winEnd;
  if (range==='today') { winStart = new Date(now); winStart.setHours(0,0,0,0); winEnd = new Date(now); winEnd.setHours(23,59,59,999); }
  if (range==='week') { winStart = startOfWeek(now); winEnd = endOfWeek(now); }
  if (range==='month') { winStart = startOfMonth(now); winEnd = endOfMonth(now); }
  const inWindow = (start,end) => !(end < winStart || start > winEnd);
  return s.leaves
    .filter(l => l.status === 'approved')
    .map(l => ({ l, u: s.users.find(x => x.id === l.userId) }))
    .filter(x => !!x.u)
    .map(x => ({ ...x, e: s.employees.find(e => e.email === x.u.email) }))
    .filter(x => x.e && x.e.department === dept)
    .filter(x => inWindow(new Date(x.l.startDate||x.l.start||now), new Date(x.l.endDate||x.l.end||now)))
    .map(x => ({ user: x.u, employee: x.e, leave: x.l }));
}

function renderDeptOnLeave(range='today') {
  const list = el('#dept-on-leave');
  const items = getDeptOnLeave(range);
  if (!items || items.length === 0) {
    list.innerHTML = '<div class="muted">No employee is on leave</div>';
    return;
  }
  list.innerHTML = items.map(x => {
    const days = daysBetween(x.leave.startDate||x.leave.start, x.leave.endDate||x.leave.end);
    return `<div class="person">
      <div class="avatar">${initials(x.user.name)}</div>
      <div class="who">${x.user.name}<div class="muted small">${x.employee.department}</div></div>
      <div class="days">${days} day(s)</div>
    </div>`;
  }).join('');
}

function renderPayslipSummary() {
  const slips = Store.getPayslips(user.id);
  const latest = slips[slips.length-1];
  if (!latest) return;
  el('#payslip-period').textContent = latest.period;
  el('#payslip-gross').textContent = fmtMoney(latest.gross);
  el('#payslip-net').textContent = fmtMoney(latest.net);
}

function wireActions() {
  const open = () => el('#leave-modal').classList.add('open');
  const close = () => el('#leave-modal').classList.remove('open');
  el('#act-request-leave').addEventListener('click', open);
  el('#leave-modal .close').addEventListener('click', close);
  el('#leave-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const form = e.currentTarget;
    const type = form.type.value;
    const reason = form.reason.value.trim();
    const start = form.start.value;
    const end = form.end.value;
    if (!validateLeaveForm(form)) return;
    const restore = showLoading(form.querySelector('button[type="submit"]') || form, 'Submitting...');
    setTimeout(()=>{
      Store.addLeave({ userId: user.id, type, reason, startDate: start, endDate: end });
      try {
        Store.addNotification({ type:'leave_requested', userId: user.id, date: Store.todayStr(), message: `${user.name} • ${type} ${daysBetween(start,end)}d (${start} → ${end})` });
      } catch {}
      restore();
      close();
      renderLeaveBalances();
      renderDeptOnLeave(currentRange);
      renderPendingRequests();
      renderQuickStats();
      showToast('Leave request submitted','success');
    }, 350);
  });

  // Range filters
  let links = document.querySelectorAll('.range-link');
  links.forEach(a => a.addEventListener('click', (e) => {
    e.preventDefault();
    links.forEach(x=>x.classList.remove('active'));
    e.currentTarget.classList.add('active');
    currentRange = e.currentTarget.getAttribute('data-range') || 'today';
    renderDeptOnLeave(currentRange);
  }));

  // Quick actions
  const kpi = document.querySelector('#act-set-kpi');
  const appraisal = document.querySelector('#act-take-appraisal');
  const viewPayslip = document.querySelector('#act-view-payslip');
  const myReq = document.querySelector('#act-my-req');
  if (kpi) kpi.addEventListener('click', ()=> { window.location.href = 'performance-dashboard.html#kpi'; });
  if (appraisal) appraisal.addEventListener('click', ()=> { window.location.href = 'performance-dashboard.html#appraisal'; });
  if (viewPayslip) viewPayslip.addEventListener('click', openPayslipModal);
  if (myReq) myReq.addEventListener('click', openReqModal);

  // View leaves link
  const linkLeaves = el('#link-view-leaves');
  if (linkLeaves) linkLeaves.addEventListener('click', (e)=>{ e.preventDefault(); openLeavesModal(); });

  // Edit profile
  const editProfile = el('#edit-profile-link');
  if (editProfile) editProfile.addEventListener('click', (e)=>{ e.preventDefault(); openProfileModal(); });
}

function openPayslipModal(){
  const slips = Store.getPayslips(user.id);
  const latest = slips[slips.length-1];
  if (!latest) return;
  el('#paydet-period').textContent = latest.period;
  el('#paydet-items').innerHTML = latest.items.map(it => `<tr><td>${it.label}</td><td style="text-align:right">${fmtMoney(it.amount)}</td></tr>`).join('');
  document.querySelector('#payslip-modal').classList.add('open');
  document.querySelector('#payslip-modal .close-pay').onclick = ()=> document.querySelector('#payslip-modal').classList.remove('open');
}

function openLeavesModal(){
  const rows = Store.getLeaves(user.id);
  el('#leaves-history').innerHTML = rows.map(l => `<tr><td>${l.type}</td><td>${l.startDate} → ${l.endDate}</td><td>${l.status}</td></tr>`).join('');
  document.querySelector('#leaves-modal').classList.add('open');
  document.querySelector('#leaves-modal .close-leaves').onclick = ()=> document.querySelector('#leaves-modal').classList.remove('open');
}

function openProfileModal(){
  const modal = document.querySelector('#profile-modal');
  if (!employee) { alert('No employee profile found for this user.'); return; }
  const form = document.querySelector('#profile-form');
  form.name.value = employee.name || '';
  form.location.value = employee.location || '';
  form.department.value = employee.department || '';
  form.manager.value = employee.manager || '';
  modal.classList.add('open');
  const close = ()=> modal.classList.remove('open');
  modal.querySelector('.close-prof').onclick = close;
  form.onsubmit = (e)=>{
    e.preventDefault();
    const patch = {
      name: form.name.value.trim(),
      location: form.location.value.trim(),
      department: form.department.value.trim(),
      manager: form.manager.value.trim()
    };
    Store.updateEmployee(employee.id, patch);
    // Refresh local employee snapshot and UI tiles/hero
    const refreshed = Store.getEmployeeForUser(user.id);
    if (refreshed){
      document.querySelector('#hero-name').textContent = refreshed.name || user.name;
      document.querySelector('#tile-dept .value').textContent = refreshed.department || '—';
      document.querySelector('#tile-location .value').textContent = refreshed.location || '—';
      document.querySelector('#tile-supervisor .value').textContent = refreshed.manager || '—';
    }
    close();
  };
}

function renderReqList(){
  const el = document.getElementById('req-list'); if(!el) return;
  const rows = Store.getRequests(user.id).sort((a,b)=> (b.createdAt||'').localeCompare(a.createdAt||''));
  el.innerHTML = rows.map(r => `<div class="tile" style="margin:6px 0; align-items:center; justify-content:space-between">
    <div style="display:flex; gap:8px; align-items:center">
      <div class="icon">🧾</div>
      <div class="value">${r.type} — ₦${Number(r.amount||0).toLocaleString()}<div class="small muted">${r.description}</div></div>
    </div>
    <div class="small ${r.status==='approved'?'" style="color:#16a34a"':'"'}">${r.status}</div>
  </div>`).join('') || '<div class="muted small">No requests yet</div>';
}
function openReqModal(){
  const modal = document.getElementById('req-modal'); if(!modal) return;
  modal.classList.add('open');
  renderReqList();
  const close = ()=> modal.classList.remove('open');
  const form = document.getElementById('req-form');
  const restoreCloseBtn = modal.querySelector('.req-close'); if (restoreCloseBtn) restoreCloseBtn.onclick = close;
  form.onsubmit = (e)=>{
    e.preventDefault();
    const type = form.type.value;
    const description = form.description.value.trim();
    const amount = Number(form.amount.value||0);
    if (!description){ showToast('Description is required','warning'); return; }
    const btn = form.querySelector('button[type="submit"]'); const restore = showLoading(btn, 'Submitting...');
    setTimeout(()=>{
      Store.addRequest({ userId: user.id, type, description, amount });
      try { Store.addNotification({ type:'requisition_requested', userId: user.id, date: Store.todayStr(), message: `${type} • ₦${Number(amount||0).toLocaleString()} — ${description}` }); } catch {}
      restore(); renderReqList(); renderPendingRequests(); showToast('Requisition submitted','success');
      form.reset();
    }, 300);
  };
}

// Render all sections
renderHero();
renderLeaveBalances();
let currentRange = 'today';
renderDeptOnLeave(currentRange);
renderPayslipSummary();
wireActions();
renderPendingRequests();
renderQuickStats();
renderKpis();

// Policies & Assets
function renderPoliciesForUser(){
  const listEl = document.getElementById('policy-list'); if(!listEl) return;
  const pending = Store.getPendingPoliciesForUser(user.id) || [];
  if (!pending.length){ listEl.innerHTML = '<div class="muted small">No pending acknowledgments</div>'; return; }
  listEl.innerHTML = pending.map(p => `
    <div class="tile" style="margin:6px 0; align-items:center; justify-content:space-between">
      <div style="display:flex; align-items:center; gap:10px">
        <div class="icon">📄</div>
        <div class="value">${p.title}<div class="small muted">${p.version} • ${p.category}</div></div>
      </div>
      <div style="display:flex; gap:8px; align-items:center">
        ${p.url ? `<a href="${p.url}" target="_blank" rel="noopener" class="small" style="color:#2563eb">View</a>` : ''}
        <button class="ghost-btn text-xs" data-ack="${p.id}">Acknowledge</button>
      </div>
    </div>
  `).join('');
  Array.from(listEl.querySelectorAll('button[data-ack]')).forEach(btn => {
    btn.addEventListener('click', ()=>{
      const id = btn.getAttribute('data-ack');
      Store.acknowledgePolicy(user.id, id);
      showToast('Acknowledged','success');
      renderPoliciesForUser();
    });
  });
}

function renderAssetsForUser(){
  const listEl = document.getElementById('assets-list'); if(!listEl) return;
  const assets = Store.getAssetsForUser(user.id) || [];
  if (!assets.length){ listEl.innerHTML = '<div class="muted small">No assets assigned</div>'; return; }
  listEl.innerHTML = assets.map(a => `
    <div class="tile" style="margin:6px 0; align-items:center; justify-content:space-between">
      <div style="display:flex; align-items:center; gap:10px">
        <div class="icon">💼</div>
        <div class="value">${a.tag}<div class="small muted">${a.type} • ${a.status}</div></div>
      </div>
      <div class="small muted">${a.notes||''}</div>
    </div>
  `).join('');
}

renderPoliciesForUser();
renderAssetsForUser();

// ===== Attendance: clock in/out, history, and location awareness =====
const ATT_OFFICE_SITES = {
  'Lagos': { lat: 6.5244, lng: 3.3792, name: 'Lagos HQ', radiusM: 300, beacons: [] },
  'Abuja': { lat: 9.0765, lng: 7.3986, name: 'Abuja Office', radiusM: 300, beacons: [] },
  'Port Harcourt': { lat: 4.8156, lng: 7.0498, name: 'PH Office', radiusM: 300, beacons: [] },
  'Kano': { lat: 12.0022, lng: 8.5919, name: 'Kano Office', radiusM: 300, beacons: [] }
};
const GEOFENCE_RADIUS_M = 300; // fallback default if site.radiusM absent
const WORK_START = '09:00';
const WORK_END = '18:00';
const LATE_GRACE_MIN = 15;
const sessionStart = new Date();

function haversine(lat1,lon1,lat2,lon2){
  const toRad = (x)=>x*Math.PI/180;
  const R=6371000; const dLat=toRad(lat2-lat1); const dLon=toRad(lon2-lon1);
  const a=Math.sin(dLat/2)**2 + Math.cos(toRad(lat1))*Math.cos(toRad(lat2))*Math.sin(dLon/2)**2;
  const c=2*Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R*c;
}

function getOfficeSite(){
  const loc = employee?.location || 'Lagos';
  return ATT_OFFICE_SITES[loc] || ATT_OFFICE_SITES['Lagos'];
}

function setAttStatus(text){ const n = el('#att-status-text'); if (n) n.textContent = text; }
function setLocNote(text){ const n = el('#att-location-note'); if (n) n.textContent = text; }

function getSelectedMode(){
  const r = document.querySelector('input[name="att-mode"]:checked');
  return r ? r.value : 'office';
}

function computeStatusFor(dateStr, rec){
  const dt = new Date(dateStr);
  const weekday = dt.getDay();
  // Weekend is not marked absent
  if (!rec){
    if (weekday===0 || weekday===6) return '—';
    // Past weekdays with no record are Absent; today depends on time
    const todayStr = Store.todayStr();
    if (dateStr < todayStr) return 'Absent';
    return 'Not clocked in';
  }
  const cin = parseHHMM(rec.clockIn);
  const cout = parseHHMM(rec.clockOut);
  let base = 'Present';
  const start = parseHHMM(WORK_START);
  const grace = new Date(start); grace.setMinutes(start.getMinutes()+LATE_GRACE_MIN);
  if (cin && cin > grace) base = 'Late';
  if (!cin && !cout) base = 'Absent';
  return base;
}

function renderAttendanceToday(){
  const today = Store.todayStr();
  const rec = Store.getAttendanceForDate(user.id, today);
  const site = getOfficeSite();
  const todayDateEl = el('#att-today-date'); if (todayDateEl) todayDateEl.textContent = today;
  const inEl = el('#att-today-in'); if (inEl) inEl.textContent = rec?.clockIn || '—';
  const outEl = el('#att-today-out'); if (outEl) outEl.textContent = rec?.clockOut || '—';
  const statusEl = el('#att-today-status'); if (statusEl) statusEl.textContent = computeStatusFor(today, rec);
  if (rec?.mode === 'office' && rec?.officeMatch) setAttStatus(`You are clocked in at ${site.name}.`);
  else if (rec?.mode === 'office' && rec && !rec.officeMatch) setAttStatus('Location outside office geofence; recorded as remote.');
  else if (rec?.mode === 'remote') setAttStatus('Remote work mode.');
  else setAttStatus('—');
}

function renderAttendanceHistory(){
  const rowsEl = el('#att-history-rows'); if (!rowsEl) return;
  const all = Store.getAttendance(user.id);
  const days = [];
  const today = new Date();
  for (let i=0;i<30;i++){
    const d = new Date(today); d.setDate(today.getDate()-i);
    const ds = d.toISOString().slice(0,10);
    const rec = all.find(a=>a.date===ds);
    days.push({ date: ds, rec });
  }
  rowsEl.innerHTML = days.map(x => {
    const st = computeStatusFor(x.date, x.rec);
    const mode = x.rec?.mode ? (x.rec.mode==='office' && x.rec.officeMatch ? 'Office' : (x.rec.mode==='office' ? 'Office (out-zone)' : 'Remote')) : '—';
    const loc = x.rec?.geo ? `${x.rec.geo.lat?.toFixed(4)}, ${x.rec.geo.lng?.toFixed(4)}` : (x.rec?.officeName||'—');
    return `<tr><td>${x.date}</td><td>${st}</td><td>${x.rec?.clockIn||'—'}</td><td>${x.rec?.clockOut||'—'}</td><td>${mode}</td><td>${loc}</td></tr>`;
  }).join('');
}

function switchAttTab(which){
  const isClock = which === 'clock';
  const a = document.getElementById('att-tab-clock'); const b = document.getElementById('att-tab-history');
  if (a && b){ a.classList.toggle('active', isClock); b.classList.toggle('active', !isClock); }
  const paneA = document.getElementById('att-clock-pane'); const paneB = document.getElementById('att-history-pane');
  if (paneA && paneB){ paneA.style.display = isClock ? '' : 'none'; paneB.style.display = isClock ? 'none' : ''; }
}

function initAttendanceUI(){
  const tabClock = document.getElementById('att-tab-clock');
  const tabHist = document.getElementById('att-tab-history');
  if (tabClock) tabClock.addEventListener('click', (e)=>{ e.preventDefault(); switchAttTab('clock'); });
  if (tabHist) tabHist.addEventListener('click', (e)=>{ e.preventDefault(); switchAttTab('history'); renderAttendanceHistory(); });
  const radios = Array.from(document.querySelectorAll('input[name="att-mode"]'));
  radios.forEach(r => r.addEventListener('change', ()=>{
    const mode = getSelectedMode();
    if (mode==='office') setLocNote('On clock-in, we will verify your location against office geofence.');
    else setLocNote(`Remote mode: we will use your browser session time (${fmtHHMM(sessionStart)}) as login.`);
  }));
  const btnIn = document.getElementById('btn-clock-in');
  const btnOut = document.getElementById('btn-clock-out');
  if (btnIn) btnIn.addEventListener('click', async ()=>{
    const mode = getSelectedMode();
    const restoreLoading = showLoading(btnIn, 'Clocking in...');
    if (mode === 'office'){
      if (!('geolocation' in navigator)){
        setLocNote('Location unavailable; recording as remote.');
        Store.clockInAt(user.id, fmtHHMM(sessionStart));
        Store.updateAttendanceMeta(user.id, Store.todayStr(), { mode:'remote', sessionLogin: fmtHHMM(sessionStart) });
        Store.addNotification({ type: 'remote_recorded', userId: user.id, date: Store.todayStr(), message: 'Clock-in recorded as remote due to missing location.' });
        renderAttendanceToday();
        restoreLoading();
        showToast('Clocked in (remote)','success');
        return;
      }
      navigator.geolocation.getCurrentPosition((pos)=>{
        const { latitude, longitude } = pos.coords;
        const site = getOfficeSite();
        const primaryDist = haversine(latitude, longitude, site.lat, site.lng);
        const radius = site.radiusM || GEOFENCE_RADIUS_M;
        let inZone = primaryDist <= radius;
        if (!inZone && Array.isArray(site.beacons) && site.beacons.length){
          inZone = site.beacons.some(b => haversine(latitude, longitude, b.lat, b.lng) <= (b.radiusM || radius));
        }
        Store.clockIn(user.id);
        Store.updateAttendanceMeta(user.id, Store.todayStr(), { mode:'office', geo:{lat:latitude,lng:longitude}, officeMatch: inZone, officeName: site.name });
        setLocNote(inZone ? `Detected at ${site.name} (within ${Math.round(primaryDist)}m).` : `Outside office zone (~${Math.round(primaryDist)}m); marked remote.`);
        if (!inZone) {
          Store.addNotification({ type: 'out_zone', userId: user.id, date: Store.todayStr(), message: 'Clock-in outside office geofence; recorded as remote.' });
        }
        // Late notification if applicable
        const rec = Store.getAttendanceForDate(user.id, Store.todayStr());
        const st = computeStatusFor(Store.todayStr(), rec);
        if (st === 'Late') {
          Store.addNotification({ type: 'late', userId: user.id, date: Store.todayStr(), message: `Late clock-in at ${rec?.clockIn || ''}` });
        }
        renderAttendanceToday();
        restoreLoading();
        showToast('Clocked in','success');
      }, (err)=>{
        setLocNote('Location permission denied; recording as remote.');
        Store.clockInAt(user.id, fmtHHMM(sessionStart));
        Store.updateAttendanceMeta(user.id, Store.todayStr(), { mode:'remote', sessionLogin: fmtHHMM(sessionStart) });
        Store.addNotification({ type: 'remote_recorded', userId: user.id, date: Store.todayStr(), message: 'Clock-in recorded as remote due to denied location permission.' });
        renderAttendanceToday();
        restoreLoading();
        showToast('Clocked in (remote)','success');
      }, { enableHighAccuracy:true, timeout:8000, maximumAge:0 });
    } else {
      // Remote: use session start time as the login reference
      Store.clockInAt(user.id, fmtHHMM(sessionStart));
      Store.updateAttendanceMeta(user.id, Store.todayStr(), { mode:'remote', sessionLogin: fmtHHMM(sessionStart) });
      setLocNote(`Recorded remote login at ${fmtHHMM(sessionStart)}.`);
      const rec = Store.getAttendanceForDate(user.id, Store.todayStr());
      const st = computeStatusFor(Store.todayStr(), rec);
      if (st === 'Late') {
        Store.addNotification({ type: 'late', userId: user.id, date: Store.todayStr(), message: `Late clock-in at ${rec?.clockIn || ''}` });
      }
      renderAttendanceToday();
      restoreLoading();
      showToast('Clocked in (remote)','success');
    }
  });
  if (btnOut) btnOut.addEventListener('click', ()=>{
    const restoreLoading = showLoading(btnOut, 'Clocking out...');
    Store.clockOut(user.id);
    renderAttendanceToday();
    restoreLoading();
    showToast('Clocked out','success');
  });
  // initial render
  // Trigger mode note update
  const r0 = document.querySelector('input[name="att-mode"]:checked');
  if (r0) r0.dispatchEvent(new Event('change'));
  // Auto-close any open shifts from previous days
  try { Store.autoCloseOpenShifts(user.id, WORK_END); } catch {}
  renderAttendanceToday();

  // Wire CSV export
  const btnCsv = document.getElementById('att-export-csv');
  if (btnCsv) btnCsv.addEventListener('click', ()=>{
    const today = new Date();
    const all = Store.getAttendance(user.id);
    const rows = [];
    for (let i=0;i<30;i++){
      const d = new Date(today); d.setDate(today.getDate()-i);
      const ds = d.toISOString().slice(0,10);
      const rec = all.find(a=>a.date===ds);
      const status = computeStatusFor(ds, rec);
      const mode = rec?.mode ? (rec.mode==='office' && rec.officeMatch ? 'Office' : (rec.mode==='office' ? 'Office (out-zone)' : 'Remote')) : '';
      const loc = rec?.geo ? `${rec.geo.lat?.toFixed(5)},${rec.geo.lng?.toFixed(5)}` : (rec?.officeName||'');
      rows.push({ Date: ds, Status: status, In: rec?.clockIn||'', Out: rec?.clockOut||'', Mode: mode, Location: loc, AutoClosed: rec?.autoClosed ? 'Yes' : '' });
    }
    const headers = Object.keys(rows[0] || {Date:'',Status:'',In:'',Out:'',Mode:'',Location:'',AutoClosed:''});
    const csv = [headers.join(','), ...rows.map(r => headers.map(h => `"${String(r[h]||'').replace(/"/g,'""')}"`).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `attendance_${Store.currentUser()?.email||user.id}.csv`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    URL.revokeObjectURL(url);
  });
}

// ===== Daily Check-in (Pulse) =====
function renderPulseUI(){
  enhancePulseUI();
  const stress = document.getElementById('pulse-stress');
  const stressVal = document.getElementById('pulse-stress-val');
  const workload = document.getElementById('pulse-workload');
  const workloadVal = document.getElementById('pulse-workload-val');
  if (stress && stressVal){ stress.addEventListener('input', ()=> stressVal.textContent = String(stress.value)); stressVal.textContent = String(stress.value); }
  if (workload && workloadVal){ workload.addEventListener('input', ()=> workloadVal.textContent = String(workload.value)); workloadVal.textContent = String(workload.value); }

  // Load existing pulse for today
  try {
    const todayPulse = Store.getPulse(user.id, Store.todayStr());
    if (todayPulse){
      const setRadio = (name, val)=>{ const r = document.querySelector(`input[name="${name}"][value="${val}"]`); if (r) r.checked = true; };
      setRadio('pulse-mood', String(todayPulse.mood ?? 0));
      if (stress){ stress.value = String(todayPulse.stress ?? 3); if (stressVal) stressVal.textContent = String(stress.value); }
      if (workload){ workload.value = String(todayPulse.workload ?? 3); if (workloadVal) workloadVal.textContent = String(workload.value); }
      const note = document.getElementById('pulse-note'); if (note) note.value = todayPulse.note || '';
      const status = document.getElementById('pulse-status-text'); if (status) status.textContent = 'Saved for today. You can update it.';
    }
  } catch {}

  // Show last 7-day engagement
  try {
    const agg = Store.computeEngagementFromPulses(user.id, 7);
    const avgEl = document.getElementById('pulse-avg-7d');
    if (avgEl){ avgEl.textContent = agg ? `Last 7d engagement: ${agg.avg}% (${agg.count} entry${agg.count===1?'':'ies'})` : 'Last 7d engagement: —'; }
  } catch {}

  const btn = document.getElementById('pulse-save');
  if (btn) btn.addEventListener('click', ()=>{
    const restore = showLoading(btn, 'Saving...');
    const moodRadio = document.querySelector('input[name="pulse-mood"]:checked');
    const mood = Number(moodRadio ? moodRadio.value : 0);
    const stressN = Number((document.getElementById('pulse-stress')||{ value:3}).value);
    const workloadN = Number((document.getElementById('pulse-workload')||{ value:3}).value);
    const note = (document.getElementById('pulse-note')||{ value:''}).value.trim();
    Store.addOrUpdatePulse({ userId: user.id, date: Store.todayStr(), mood, stress: stressN, workload: workloadN, note });
    const status = document.getElementById('pulse-status-text'); if (status) status.textContent = 'Saved ✓';
    try {
      const agg2 = Store.computeEngagementFromPulses(user.id, 7);
      const avgEl2 = document.getElementById('pulse-avg-7d'); if (avgEl2) avgEl2.textContent = agg2 ? `Last 7d engagement: ${agg2.avg}% (${agg2.count} entries)` : 'Last 7d engagement: —';
    } catch {}
    // After save, hide/snooze nudge for the rest of today
    try { Store.dismissNudge(user.id, 'highWorkloadStreak', Store.todayStr()); } catch {}
    const nc = document.getElementById('nudge-card'); if (nc) nc.style.display = 'none';
    restore();
    showToast('Check-in saved','success');
  });

  // Compute contextual nudge: high workload 3 consecutive days
  try {
    const s = Store.getState();
    const all = (s.pulses||[]).filter(p=> p.userId===user.id);
    const byDate = new Map(all.map(p=> [p.date, p]));
    const today = new Date();
    const todayStr = Store.todayStr();
    let streak = 0;
    for(let i=0;i<7;i++){
      const d = new Date(today); d.setDate(today.getDate()-i); d.setHours(0,0,0,0);
      const ds = d.toISOString().slice(0,10);
      const p = byDate.get(ds);
      if(p && (p.workload||0) >= 4){ streak++; }
      else { if(i===0 && !p){ // allow missing today to continue checking previous days
          continue;
        } else { break; }
      }
      if(streak>=3) break;
    }
    const dismissed = Store.isNudgeDismissed(user.id, 'highWorkloadStreak', todayStr);
    const todayPulse = Store.getPulse(user.id, todayStr);
    if(streak>=3 && !dismissed){
      const nudgeCard = document.getElementById('nudge-card');
      const nudgeText = document.getElementById('pulse-nudge');
      if(nudgeCard && nudgeText){
        nudgeText.textContent = todayPulse
          ? 'You’ve reported high workload recently. Consider sharing a brief note for context.'
          : 'Noticing high workload 3 days in a row. Quick check-in can help us support you.';
        nudgeCard.style.display = '';
        const btnDismiss = document.getElementById('nudge-dismiss');
        const btnOpen = document.getElementById('nudge-open');
        if(btnDismiss) btnDismiss.onclick = ()=>{
          // Snooze for 7 days
          const until = new Date(); until.setDate(until.getDate()+7);
          const untilStr = until.toISOString().slice(0,10);
          try { Store.dismissNudge(user.id, 'highWorkloadStreak', untilStr); } catch {}
          nudgeCard.style.display='none';
        };
        if(btnOpen) btnOpen.onclick = ()=>{
          const card = document.getElementById('checkin-card');
          if(card){ card.scrollIntoView({behavior:'smooth', block:'center'}); }
          const txt = document.getElementById('pulse-note'); if(txt) txt.focus();
        };
      }
    }
  } catch {}
}

// Defer attendance init until DOM is ready
document.addEventListener('DOMContentLoaded', initAttendanceUI);
document.addEventListener('DOMContentLoaded', ()=>{ try { renderPulseUI(); } catch {} });

// ===== Tomorrow Planner =====
function tomorrowStr(){ const d = new Date(); d.setDate(d.getDate()+1); return d.toISOString().slice(0,10); }
function suggestPlannerDefaults(){
  const s = Store.getState();
  const pulses = (s.pulses||[]).filter(p=> p.userId===user.id).sort((a,b)=> (b.date||'').localeCompare(a.date||''));
  const last = pulses[0] || null;
  const dept = employee?.department || 'Admin';
  const focusByDept = {
    'Engineering':'deep', 'IT Ops':'deep', 'Product':'collab', 'HR':'collab', 'Sales':'outreach', 'Finance':'deep', 'Marketing':'learning', 'Customer Support':'collab'
  };
  const focus = focusByDept[dept] || 'learning';
  let mode = 'office';
  if (last && (last.stress>=4 || last.workload>=4)) mode = 'remote';
  let start = '09:00';
  if (last && last.mood<=-1) start = '09:30';
  const wellness = { break: (last && last.workload>=4) ? true : false, walk: (last && last.stress>=4) ? true : false, checkin: true };
  return { mode, start, focus, wellness };
}
function renderPlanner(){
  const dateEl = document.getElementById('planner-date'); if (dateEl) dateEl.textContent = tomorrowStr();
  const suggest = suggestPlannerDefaults();
  const plan = Store.getPlan(user.id, tomorrowStr()) || suggest;
  const modeEl = document.getElementById('plan-mode'); const startEl = document.getElementById('plan-start'); const focusEl = document.getElementById('plan-focus');
  const br = document.getElementById('plan-break'); const wk = document.getElementById('plan-walk'); const ci = document.getElementById('plan-checkin');
  const shareEl = document.getElementById('plan-share');
  if (modeEl) modeEl.value = plan.mode || 'office';
  if (startEl) startEl.value = plan.start || '09:00';
  if (focusEl) focusEl.value = plan.focus || 'learning';
  if (br) br.checked = !!(plan.wellness?.break);
  if (wk) wk.checked = !!(plan.wellness?.walk);
  if (ci) ci.checked = !!(plan.wellness?.checkin);
  if (shareEl) shareEl.checked = !!(plan.share);
  const suggEl = document.getElementById('planner-suggest');
  if (suggEl){
    const txt = `Suggested: ${suggest.mode==='remote'?'Remote':'Office'} • Start ${suggest.start} • ${suggest.focus}`;
    suggEl.textContent = txt;
  }
  const btn = document.getElementById('plan-save');
  if (btn) btn.onclick = ()=>{
    const restore = showLoading(btn, 'Saving...');
    const planObj = {
      mode: modeEl?.value || 'office',
      start: startEl?.value || '09:00',
      focus: focusEl?.value || 'learning',
      wellness: { break: !!br?.checked, walk: !!wk?.checked, checkin: !!ci?.checked },
      notes: (document.getElementById('plan-notes')||{ value:''}).value.trim(),
      share: !!shareEl?.checked
    };
    Store.setPlan(user.id, tomorrowStr(), planObj);
    try { Store.addNotification({ type:'plan_saved', userId: user.id, date: tomorrowStr(), message: `Plan saved (${planObj.mode}, ${planObj.start}, ${planObj.focus})` }); } catch {}
    restore();
    showToast('Tomorrow plan saved','success');
  };
}

document.addEventListener('DOMContentLoaded', ()=>{ try { renderPlanner(); } catch {} });

function computeAttendanceConsistency(lastDays=14){
  const all = Store.getAttendance(user.id);
  const today = new Date();
  let present = 0, total = 0;
  for(let i=0;i<lastDays;i++){
    const d = new Date(today); d.setDate(today.getDate()-i); const wd = d.getDay();
    if (wd===0 || wd===6) continue;
    const ds = d.toISOString().slice(0,10);
    const rec = all.find(a=>a.date===ds);
    const st = computeStatusFor(ds, rec);
    if (st!=='—'){ total++; }
    if (st==='Present' || st==='Late'){ present++; }
  }
  return total ? Math.round(present/total*100) : 0;
}

function pickLearningFromKpis(){
  const kpis = Store.getUserKpis(user.id) || [];
  const ranked = kpis.map(k=>{
    const tgt = Number(k.target)||0; const act = Number(k.actual)||0; const ratio = tgt>0 ? act/tgt : 0; return { k, ratio };
  }).sort((a,b)=> a.ratio - b.ratio);
  const dept = employee?.department || 'Admin';
  const catalog = {
    Engineering: {
      Quality: ['Unit testing essentials', 'Refactoring patterns overview'],
      Delivery: ['Deep work: focus sprints', 'CI basics refresher'],
      General: ['Accessibility quick wins', 'Performance tuning basics']
    },
    Sales: {
      Pipeline: ['Prospecting micro‑habits', 'Lead qualification rubric'],
      Conversion: ['Handling objections', 'Negotiation tactics'],
      Revenue: ['Time blocking for outreach', 'CRM hygiene']
    },
    HR: {
      Compliance: ['GDPR in HR data basics', 'Structured interviews'],
      Throughput: ['Batching admin tasks', 'Templates for speed'],
      General: ['Culture fit fairness', 'Feedback frameworks']
    },
    Finance: {
      Efficiency: ['Closing checklist', 'Spreadsheet speed techniques'],
      Quality: ['Reconciliation tips', 'Variance analysis basics'],
      General: ['Controls overview', 'Tax updates snapshot']
    },
    Product: {
      Impact: ['Define success metrics', 'Hypothesis writing'],
      Delivery: ['Roadmap prioritization', 'Stakeholder updates'],
      General: ['User interviews in 30m', 'PM shortcuts']
    },
    Marketing: {
      Impact: ['Content hooks', 'Engagement quick tests'],
      Delivery: ['Copy sprints', 'Review cycles'],
      General: ['Analytics basics', 'Community responses']
    },
    'Customer Support': {
      Quality: ['De‑escalation phrases', 'Ticket triage'],
      Efficiency: ['Macros & templates', 'First response time'],
      General: ['Empathy cues', 'Knowledge base tips']
    },
    Admin: { General: ['Time blocking', 'Inbox zero starter'] }
  };
  const de = catalog[dept] || catalog['Admin'];
  const recent = new Set((Store.getLearningHistory(user.id, { lastNDays: 30 })||[]).map(e => e.name));
  const items = [];
  for(let i=0;i<ranked.length;i++){
    const kra = ranked[i].k.kra || 'General';
    const pool = de[kra] || de['General'] || ['Micro‑learning'];
    for(const p of pool){ if (recent.has(p)) continue; if (!items.includes(p)) items.push(p); if (items.length>=3) break; }
    if (items.length>=3) break;
  }
  if (items.length===0){ const pool = (de['General'] || ['Micro‑learning']).filter(p => !recent.has(p)); items.push(...pool.slice(0,3)); }
  return items.slice(0,3);
}

function renderReadinessAndLearning(){
  const eng = Store.computeEngagementFromPulses(user.id, 7);
  const attendance = computeAttendanceConsistency(14);
  const engagement = eng?.avg || 0;
  const readiness = Math.round(0.6*engagement + 0.4*attendance);
  const scoreEl = document.getElementById('planner-ready-score'); if (scoreEl) scoreEl.textContent = readiness + '%';
  const tipEl = document.getElementById('planner-ready-tip'); if (tipEl){
    let tip = 'Solid baseline.';
    if (engagement<60) tip = 'Boost engagement: set a light start.';
    else if (attendance<70) tip = 'Improve consistency: plan punctual start.';
    tipEl.textContent = tip;
  }
  const learningEl = document.getElementById('planner-learning-list');
  if (learningEl){
    const linkMap = {
      'Unit testing essentials': 'https://kentcdodds.com/blog/unit-tests-vs-integration-tests',
      'Refactoring patterns overview': 'https://refactoring.guru/refactoring',
      'Accessibility quick wins': 'https://web.dev/accessible/',
      'Performance tuning basics': 'https://web.dev/fast/',
      'Prospecting micro‑habits': 'https://www.saleshacker.com/sales-prospecting-techniques/',
      'Lead qualification rubric': 'https://www.hubspot.com/sales/lead-qualification',
      'Handling objections': 'https://www.saleshacker.com/handling-sales-objections/',
      'Negotiation tactics': 'https://hbr.org/2015/12/15-rules-for-negotiating-a-job-offer',
      'GDPR in HR data basics': '/resources/market-research.html',
      'Structured interviews': '/analytics.html',
      'Batching admin tasks': '/analytics.html',
      'Templates for speed': '/resources/competitor-analysis.html',
      'Culture fit fairness': '/analytics.html',
      'Feedback frameworks': '/analytics.html',
      'Closing checklist': '/resources/market-research.html',
      'Spreadsheet speed techniques': 'https://exceljet.net/',
      'Reconciliation tips': 'https://www.accountingtools.com/articles/reconciliation.html',
      'Variance analysis basics': 'https://corporatefinanceinstitute.com/resources/accounting/variance-analysis/',
      'Controls overview': '/analytics.html',
      'Tax updates snapshot': '/resources/market-research.html',
      'Define success metrics': 'https://www.atlassian.com/work-management/project-management/project-metrics',
      'Hypothesis writing': 'https://www.intercom.com/blog/product-management-hypotheses/',
      'Roadmap prioritization': 'https://www.productplan.com/learn/product-roadmap-prioritization/',
      'Stakeholder updates': 'https://www.atlassian.com/team-playbook/plays/stakeholder-communications',
      'User interviews in 30m': 'https://www.nngroup.com/articles/user-interviews/',
      'PM shortcuts': '/analytics.html',
      'Content hooks': 'https://copyhackers.com/',
      'Engagement quick tests': 'https://optimizely.com/optimization-glossary/ab-testing/',
      'Copy sprints': 'https://www.copy.ai/blog/copywriting-sprints',
      'Review cycles': '/analytics.html',
      'Analytics basics': 'https://analytics.google.com/analytics/academy/',
      'Community responses': 'https://www.socialmediaexaminer.com/',
      'De‑escalation phrases': 'https://www.zendesk.com/blog/de-escalation-techniques/',
      'Ticket triage': 'https://support.atlassian.com/jira-service-management-cloud/docs/triage-incoming-requests/',
      'Macros & templates': 'https://support.zendesk.com/hc/en-us/articles/4408882496666-Macros',
      'First response time': 'https://www.zendesk.com/blog/first-response-time/',
      'Empathy cues': 'https://hbr.org/2017/12/the-power-of-empathy-in-the-workplace',
      'Knowledge base tips': 'https://www.atlassian.com/it-service-management/knowledge-management',
      'Time blocking': 'https://calnewport.com/time-blocking-101/',
      'Inbox zero starter': 'https://www.fastcompany.com/3046963/inbox-zero-101-how-to-get-your-email-to-zero-every-day'
    };
    const descMap = {
      'Unit testing essentials': 'Write resilient tests and reduce regressions.',
      'Refactoring patterns overview': 'Improve structure without changing behavior.',
      'Accessibility quick wins': 'Make interfaces usable for everyone.',
      'Performance tuning basics': 'Speed up rendering and loading.',
      'Prospecting micro‑habits': 'Daily routines to grow pipeline.',
      'Lead qualification rubric': 'Focus on leads likely to convert.',
      'Handling objections': 'Disarm common buyer concerns.',
      'Negotiation tactics': 'Trade without losing value.',
      'GDPR in HR data basics': 'Handle personal data responsibly.',
      'Structured interviews': 'Consistent, fair candidate evaluation.',
      'Batching admin tasks': 'Reduce context switching overhead.',
      'Templates for speed': 'Reuse patterns to accelerate work.',
      'Culture fit fairness': 'Avoid bias; assess behaviors.',
      'Feedback frameworks': 'Use SBI/STAR for clear feedback.',
      'Closing checklist': 'Reduce last‑mile errors and delays.',
      'Spreadsheet speed techniques': 'Navigate and edit faster.',
      'Reconciliation tips': 'Match records efficiently.',
      'Variance analysis basics': 'Explain changes and trends.',
      'Controls overview': 'Strengthen process reliability.',
      'Tax updates snapshot': 'Stay compliant with changes.',
      'Define success metrics': 'Set measurable outcomes.',
      'Hypothesis writing': 'Clarify assumptions and tests.',
      'Roadmap prioritization': 'Decide what matters next.',
      'Stakeholder updates': 'Keep partners aligned.',
      'User interviews in 30m': 'Get insights fast.',
      'PM shortcuts': 'Work smarter as a PM.',
      'Content hooks': 'Create messages that stick.',
      'Engagement quick tests': 'Run small experiments.',
      'Copy sprints': 'Ship copy on cadence.',
      'Review cycles': 'Tighten feedback loops.',
      'Analytics basics': 'Read and act on data.',
      'Community responses': 'Engage with audiences well.',
      'De‑escalation phrases': 'Calm difficult conversations.',
      'Ticket triage': 'Sort and solve quickly.',
      'Macros & templates': 'Automate frequent replies.',
      'First response time': 'Respond faster, reduce wait.',
      'Empathy cues': 'Connect with customers.',
      'Knowledge base tips': 'Improve self‑serve success.',
      'Time blocking': 'Protect focus time.',
      'Inbox zero starter': 'Tame email overload.'
    };
    const items = pickLearningFromKpis();
    learningEl.innerHTML = items.map(x=> {
      const href = linkMap[x] || '/analytics.html';
      const desc = descMap[x] || '';
      return `<div class="tile" style="display:flex;align-items:center;justify-content:space-between;margin:6px 0">
        <a data-item="${x}" href="${href}" target="_blank" rel="noopener" style="display:flex;align-items:center;gap:8px;flex:1;text-decoration:none">
          <div class="icon">📘</div>
          <div class="value">${x}<div class="small muted">${desc}</div></div>
        </a>
        <button class="ghost-btn text-xs" data-done="${x}" style="margin-left:8px">Done</button>
      </div>`;
    }).join('');
    const timeMap = {
      'Unit testing essentials': 20,
      'Refactoring patterns overview': 15,
      'Accessibility quick wins': 12,
      'Performance tuning basics': 15,
      'Prospecting micro‑habits': 10,
      'Lead qualification rubric': 12,
      'Handling objections': 12,
      'Negotiation tactics': 20,
      'GDPR in HR data basics': 15,
      'Structured interviews': 15,
      'Batching admin tasks': 8,
      'Templates for speed': 8,
      'Culture fit fairness': 12,
      'Feedback frameworks': 10,
      'Closing checklist': 10,
      'Spreadsheet speed techniques': 15,
      'Reconciliation tips': 12,
      'Variance analysis basics': 12,
      'Controls overview': 12,
      'Tax updates snapshot': 10,
      'Define success metrics': 12,
      'Hypothesis writing': 10,
      'Roadmap prioritization': 12,
      'Stakeholder updates': 8,
      'User interviews in 30m': 15,
      'PM shortcuts': 8,
      'Content hooks': 12,
      'Engagement quick tests': 10,
      'Copy sprints': 8,
      'Review cycles': 8,
      'Analytics basics': 20,
      'Community responses': 12,
      'De‑escalation phrases': 10,
      'Ticket triage': 8,
      'Macros & templates': 8,
      'First response time': 8,
      'Empathy cues': 10,
      'Knowledge base tips': 10,
      'Time blocking': 8,
      'Inbox zero starter': 12
    };
    let tip = document.getElementById('ml-tooltip');
    if(!tip){
      tip = document.createElement('div');
      tip.id = 'ml-tooltip';
      tip.style.position = 'fixed';
      tip.style.zIndex = '9999';
      tip.style.background = 'rgba(17,17,17,0.95)';
      tip.style.color = '#fff';
      tip.style.padding = '8px 10px';
      tip.style.borderRadius = '8px';
      tip.style.fontSize = '12px';
      tip.style.boxShadow = '0 6px 20px rgba(0,0,0,0.25)';
      tip.style.display = 'none';
      document.body.appendChild(tip);
    }
    const showTip = (name, x, y)=>{
      const desc = descMap[name] || '';
      const mins = timeMap[name] || 10;
      tip.innerHTML = `<div style="font-weight:600;margin-bottom:4px">${name}</div><div>${desc}</div><div style="margin-top:6px;opacity:0.8">~${mins} min</div>`;
      const dx = 12, dy = 12;
      const vw = window.innerWidth, vh = window.innerHeight;
      tip.style.display = 'block';
      tip.style.left = Math.min(x+dx, vw-220) + 'px';
      tip.style.top = Math.min(y+dy, vh-120) + 'px';
    };
    const hideTip = ()=>{ tip.style.display = 'none'; };
    Array.from(learningEl.querySelectorAll('a.tile')).forEach(a => {
      const name = a.getAttribute('data-item') || '';
      a.addEventListener('mouseenter', e => showTip(name, e.clientX, e.clientY));
      a.addEventListener('mousemove', e => showTip(name, e.clientX, e.clientY));
      a.addEventListener('mouseleave', hideTip);
      a.addEventListener('blur', hideTip);
    });
    Array.from(learningEl.querySelectorAll('button[data-done]')).forEach(btn => {
      btn.addEventListener('click', ev => {
        const name = btn.getAttribute('data-done');
        const href = linkMap[name] || '/analytics.html';
        const mins = timeMap[name] || 10;
        Store.addLearning(user.id, { name, url: href, minutes: mins, completedAt: new Date().toISOString().slice(0,10) });
        showToast('Marked as done','success');
        renderReadinessAndLearning();
        renderLearningHistory();
      });
    });
  }
}

function renderLearningHistory(){
  const el = document.getElementById('learning-history'); if(!el) return;
  const list = Store.getLearningHistory(user.id, { lastNDays: 90, limit: 6 }) || [];
  el.innerHTML = list.map(e => `<div class="tile" style="margin:6px 0"><div class="icon">✅</div><div class="value">${e.name}<div class="small muted">${e.completedAt || (e.ts||'').slice(0,10)} • ~${e.minutes || 10} min</div></div></div>`).join('') || '<div class="text-gray-500 text-sm">No recent learning</div>';
}

document.addEventListener('DOMContentLoaded', ()=>{ try { renderReadinessAndLearning(); } catch {} });
document.addEventListener('DOMContentLoaded', ()=>{ try { renderLearningHistory(); } catch {} });

function formatICSDate(d){
  const pad = n => String(n).padStart(2,'0');
  const y = d.getUTCFullYear(); const m = pad(d.getUTCMonth()+1); const day = pad(d.getUTCDate());
  const hh = pad(d.getUTCHours()); const mm = pad(d.getUTCMinutes()); const ss = pad(d.getUTCSeconds());
  return `${y}${m}${day}T${hh}${mm}${ss}Z`;
}
function buildEvent({ summary, start, durationMin, location, description }){
  const end = new Date(start.getTime() + durationMin*60000);
  const uid = 'plan-' + Math.random().toString(36).slice(2) + '@lumion.com';
  return `BEGIN:VEVENT\nUID:${uid}\nDTSTAMP:${formatICSDate(new Date())}\nDTSTART:${formatICSDate(start)}\nDTEND:${formatICSDate(end)}\nSUMMARY:${summary}\nDESCRIPTION:${description||''}\nLOCATION:${location||''}\nEND:VEVENT`;
}
function exportPlanICS(){
  const t = new Date(); t.setDate(t.getDate()+1);
  const mode = (document.getElementById('plan-mode')||{}).value || 'office';
  const startStr = (document.getElementById('plan-start')||{ value:'09:00'}).value || '09:00';
  const [hh,mm] = startStr.split(':').map(Number);
  t.setHours(hh||9, mm||0, 0, 0);
  const focus = (document.getElementById('plan-focus')||{}).value || 'learning';
  const br = !!(document.getElementById('plan-break')||{}).checked;
  const wk = !!(document.getElementById('plan-walk')||{}).checked;
  const ci = !!(document.getElementById('plan-checkin')||{}).checked;
  const loc = mode==='office' ? 'Office' : 'Remote';
  const descBase = (document.getElementById('plan-notes')||{ value:''}).value || '';
  const events = [];
  const focusDur = focus==='deep' ? 120 : (focus==='outreach' ? 120 : (focus==='learning' ? 60 : 60));
  events.push(buildEvent({ summary:`Focus: ${focus}`, start:new Date(t), durationMin:focusDur, location:loc, description:descBase }));
  let cursor = new Date(t.getTime() + focusDur*60000);
  if (br){ events.push(buildEvent({ summary:'Break', start:new Date(cursor), durationMin:15, location:loc })); cursor = new Date(cursor.getTime()+15*60000); }
  if (wk){ events.push(buildEvent({ summary:'Walk/Stretch', start:new Date(cursor), durationMin:15, location:loc })); cursor = new Date(cursor.getTime()+15*60000); }
  if (ci){ events.push(buildEvent({ summary:'Quick Check-in', start:new Date(cursor), durationMin:5, location:loc })); }
  const ics = `BEGIN:VCALENDAR\nVERSION:2.0\nPRODID:-//Lumion HR//EN\n${events.join('\n')}\nEND:VCALENDAR`;
  const blob = new Blob([ics], { type:'text/calendar' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = 'Tomorrow_Plan.ics'; a.click(); URL.revokeObjectURL(url);
}

document.addEventListener('DOMContentLoaded', ()=>{
  const btn = document.getElementById('plan-export-ics');
  if (btn) btn.addEventListener('click', exportPlanICS);
});
