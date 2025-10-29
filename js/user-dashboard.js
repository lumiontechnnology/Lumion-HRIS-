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
        <div class="bar"><span style="width:${pct}%"></span></div>
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
    if (!start || !end) return;
    Store.addLeave({ userId: user.id, type, reason, startDate: start, endDate: end });
    close();
    renderLeaveBalances();
    renderDeptOnLeave(currentRange);
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
  if (myReq) myReq.addEventListener('click', ()=> { alert('Requisitions module coming soon'); });

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

// Render all sections
renderHero();
renderLeaveBalances();
let currentRange = 'today';
renderDeptOnLeave(currentRange);
renderPayslipSummary();
wireActions();

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
    if (mode === 'office'){
      if (!('geolocation' in navigator)){
        setLocNote('Location unavailable; recording as remote.');
        Store.clockInAt(user.id, fmtHHMM(sessionStart));
        Store.updateAttendanceMeta(user.id, Store.todayStr(), { mode:'remote', sessionLogin: fmtHHMM(sessionStart) });
        Store.addNotification({ type: 'remote_recorded', userId: user.id, date: Store.todayStr(), message: 'Clock-in recorded as remote due to missing location.' });
        renderAttendanceToday();
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
      }, (err)=>{
        setLocNote('Location permission denied; recording as remote.');
        Store.clockInAt(user.id, fmtHHMM(sessionStart));
        Store.updateAttendanceMeta(user.id, Store.todayStr(), { mode:'remote', sessionLogin: fmtHHMM(sessionStart) });
        Store.addNotification({ type: 'remote_recorded', userId: user.id, date: Store.todayStr(), message: 'Clock-in recorded as remote due to denied location permission.' });
        renderAttendanceToday();
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
    }
  });
  if (btnOut) btnOut.addEventListener('click', ()=>{
    Store.clockOut(user.id);
    renderAttendanceToday();
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