// Simple client-side store for Lumion-HRIS (localStorage-based)
// Not for production auth; demo-only persistence and interactions.

// Bump STORE_KEY when data schema materially changes
const STORE_KEY = 'lumionHR_store_v3';
const SESSION_KEY = 'lumionHR_current_user_id';

const defaultState = {
  // UI/feature preferences and dismissals per user
  preferences: {
    // userId: { dismissedNudges: { key: 'YYYY-MM-DD' }, featureFlags: {} }
  },
  users: [
    { id: 'u-admin', email: 'admin@lumion.com', password: 'admin123', role: 'admin', name: 'Admin User' },
    { id: 'u-stan', email: 'stanford.george@lumion.com', password: 'user123', role: 'user', name: 'Stanford George', managerId: 'u-admin' },
    { id: 'u-ada', email: 'ada.bello@lumion.com', password: 'user123', role: 'user', name: 'Ada Bello', managerId: 'u-admin' },
    { id: 'u-chike', email: 'chike.okoro@lumion.com', password: 'user123', role: 'user', name: 'Chike Okoro', managerId: 'u-admin' },
  ],
  employees: [
    { id: 'EMP101', name: 'Stanford George', email: 'stanford.george@lumion.com', department: 'Admin', location: 'Lagos', salary: 320000, start: '2023-09-01', manager: 'Admin User' },
    { id: 'EMP102', name: 'Ada Bello', email: 'ada.bello@lumion.com', department: 'Engineering', location: 'Lagos', salary: 220000, start: '2024-02-01', manager: 'Bayo K.' },
    { id: 'EMP103', name: 'Chike Okoro', email: 'chike.okoro@lumion.com', department: 'Sales', location: 'Abuja', salary: 200000, start: '2023-09-12', manager: 'Joel A.' },
    // Seed additional employees (no login accounts) for admin views/analytics
    { id: 'EMP104', name: 'Bayo Kareem', email: 'bayo.kareem@lumion.com', department: 'Engineering', location: 'Lagos', salary: 250000, start: '2022-11-01', manager: 'Admin User' },
    { id: 'EMP105', name: 'Zainab Musa', email: 'zainab.musa@lumion.com', department: 'Engineering', location: 'Abuja', salary: 210000, start: '2023-03-15', manager: 'Admin User' },
    { id: 'EMP106', name: 'Ifeanyi Nwosu', email: 'ifeanyi.nwosu@lumion.com', department: 'Sales', location: 'Lagos', salary: 180000, start: '2022-07-20', manager: 'Joel A.' },
    { id: 'EMP107', name: 'Tola Adebayo', email: 'tola.adebayo@lumion.com', department: 'HR', location: 'Lagos', salary: 190000, start: '2021-12-05', manager: 'Admin User' },
    { id: 'EMP108', name: 'Maryam Sani', email: 'maryam.sani@lumion.com', department: 'Finance', location: 'Abuja', salary: 230000, start: '2020-06-10', manager: 'Admin User' },
    { id: 'EMP109', name: 'Femi Adesina', email: 'femi.adesina@lumion.com', department: 'Engineering', location: 'Lagos', salary: 260000, start: '2021-02-11', manager: 'Admin User' },
    { id: 'EMP110', name: 'Ngozi Eze', email: 'ngozi.eze@lumion.com', department: 'Customer Support', location: 'Lagos', salary: 170000, start: '2022-01-30', manager: 'Admin User' },
    { id: 'EMP111', name: 'Kehinde Ajayi', email: 'kehinde.ajayi@lumion.com', department: 'Sales', location: 'Port Harcourt', salary: 185000, start: '2023-08-18', manager: 'Joel A.' },
    { id: 'EMP112', name: 'Blessing Udo', email: 'blessing.udo@lumion.com', department: 'Sales', location: 'Lagos', salary: 175000, start: '2022-09-02', manager: 'Joel A.' },
    { id: 'EMP113', name: 'Samuel Ojo', email: 'samuel.ojo@lumion.com', department: 'Engineering', location: 'Lagos', salary: 240000, start: '2021-05-09', manager: 'Admin User' },
    { id: 'EMP114', name: 'Hauwa Bello', email: 'hauwa.bello@lumion.com', department: 'HR', location: 'Abuja', salary: 195000, start: '2020-10-22', manager: 'Admin User' },
    { id: 'EMP115', name: 'Yusuf Danjuma', email: 'yusuf.danjuma@lumion.com', department: 'Finance', location: 'Abuja', salary: 235000, start: '2019-03-03', manager: 'Admin User' },
    { id: 'EMP116', name: 'Chinwe Obi', email: 'chinwe.obi@lumion.com', department: 'Admin', location: 'Lagos', salary: 160000, start: '2022-04-14', manager: 'Admin User' },
    { id: 'EMP117', name: 'Ridwan Salami', email: 'ridwan.salami@lumion.com', department: 'IT Ops', location: 'Lagos', salary: 200000, start: '2021-08-08', manager: 'Admin User' },
    { id: 'EMP118', name: 'Fatima Abubakar', email: 'fatima.abubakar@lumion.com', department: 'Customer Support', location: 'Abuja', salary: 165000, start: '2022-02-16', manager: 'Admin User' },
    { id: 'EMP119', name: 'Oluwatobi Akin', email: 'oluwatobi.akin@lumion.com', department: 'Engineering', location: 'Lagos', salary: 255000, start: '2020-01-27', manager: 'Admin User' },
    { id: 'EMP120', name: 'Amaka Nnaji', email: 'amaka.nnaji@lumion.com', department: 'Sales', location: 'Lagos', salary: 182000, start: '2023-06-12', manager: 'Joel A.' },
    { id: 'EMP121', name: 'Ibrahim Lawal', email: 'ibrahim.lawal@lumion.com', department: 'Finance', location: 'Kano', salary: 210000, start: '2021-09-19', manager: 'Admin User' }
  ],
  attendance: [
    // { userId, date: 'YYYY-MM-DD', clockIn: 'HH:mm', clockOut: 'HH:mm' }
  ],
  leaves: [
    // { id, userId, type: 'annual'|'sick', startDate, endDate, status: 'pending'|'approved'|'rejected', reason }
  ],
  payslips: [
    // { id, userId, period: 'YYYY-MM', gross, net, items: [{ label, amount }] }
  ],
  onboarding: {
    // userId: { stepsCompleted: [1,2], videosWatched: ['intro'] }
  },
  notifications: [
    // { id, type, userId, date, message, ts }
  ],
  // Daily pulse check-ins for engagement and wellbeing
  pulses: [
    // { id, userId, date: 'YYYY-MM-DD', mood: -2..2, stress: 1..5, workload: 1..5, note }
  ],
  allowances: {
    'u-stan': { annual: 20, sick: 3, exam: 3, compassionate: 3 },
    'u-ada': { annual: 20, sick: 3, exam: 3, compassionate: 3 },
    'u-chike': { annual: 20, sick: 3, exam: 3, compassionate: 3 }
  },
  // KPI templates by department (can fallback by role if needed)
  kpiTemplates: {
    'Engineering': [
      { key: 'deploys', title: 'Successful Deployments', unit: 'count', weight: 30, target: 8, kra: 'Delivery' },
      { key: 'bugs', title: 'Bugs Resolved', unit: 'count', weight: 40, target: 25, kra: 'Quality' },
      { key: 'codeQuality', title: 'Code Quality Score', unit: 'score', weight: 30, target: 85, kra: 'Quality' }
    ],
    'Sales': [
      { key: 'revenue', title: 'Monthly Revenue Closed', unit: 'NGN', weight: 50, target: 5000000, kra: 'Revenue' },
      { key: 'leads', title: 'Qualified Leads Generated', unit: 'count', weight: 30, target: 40, kra: 'Pipeline' },
      { key: 'conversion', title: 'Lead Conversion Rate', unit: '%', weight: 20, target: 20, kra: 'Conversion' }
    ],
    'Admin': [
      { key: 'sla', title: 'Ticket SLA Compliance', unit: '%', weight: 40, target: 95, kra: 'Compliance' },
      { key: 'attendance', title: 'Attendance Compliance', unit: '%', weight: 30, target: 98, kra: 'Compliance' },
      { key: 'requests', title: 'Requests Processed', unit: 'count', weight: 30, target: 120, kra: 'Throughput' }
    ]
  },
  // KPI templates by role (finer-grained than department)
  kpiTemplatesByRole: {
    'Software Engineer': [
      { key: 'features', title: 'Features Delivered', unit: 'count', weight: 35, target: 6, kra: 'Delivery' },
      { key: 'bugsFixed', title: 'Bugs Resolved', unit: 'count', weight: 25, target: 20, kra: 'Quality' },
      { key: 'reviews', title: 'Code Reviews', unit: 'count', weight: 20, target: 15, kra: 'Quality' },
      { key: 'velocity', title: 'Sprint Velocity', unit: 'points', weight: 20, target: 35, kra: 'Delivery' }
    ],
    'DevOps Engineer': [
      { key: 'uptime', title: 'Service Uptime', unit: '%', weight: 40, target: 99.9, kra: 'Reliability' },
      { key: 'mttr', title: 'Mean Time To Recover', unit: 'mins', weight: 30, target: 45, kra: 'Reliability' },
      { key: 'deploys', title: 'Automated Deployments', unit: 'count', weight: 30, target: 25, kra: 'Delivery' }
    ],
    'Backend Engineer': [
      { key: 'apis', title: 'API Endpoints Delivered', unit: 'count', weight: 35, target: 10, kra: 'Delivery' },
      { key: 'latency', title: 'Avg API Latency', unit: 'ms', weight: 25, target: 200, kra: 'Performance' },
      { key: 'bugs', title: 'Bugs Resolved', unit: 'count', weight: 40, target: 25, kra: 'Quality' }
    ],
    'Frontend Engineer': [
      { key: 'uiTickets', title: 'UI Tickets Closed', unit: 'count', weight: 40, target: 30, kra: 'Delivery' },
      { key: 'lighthouse', title: 'Lighthouse Score', unit: 'score', weight: 30, target: 90, kra: 'Quality' },
      { key: 'bugs', title: 'Front-end Bugs Resolved', unit: 'count', weight: 30, target: 20, kra: 'Quality' }
    ],
    'Product Manager': [
      { key: 'roadmap', title: 'Roadmap Delivery', unit: '%', weight: 40, target: 90, kra: 'Delivery' },
      { key: 'adoption', title: 'Feature Adoption', unit: '%', weight: 30, target: 60, kra: 'Impact' },
      { key: 'stakeholder', title: 'Stakeholder Satisfaction', unit: 'score', weight: 30, target: 4.0, kra: 'Quality' }
    ],
    'Sales Lead': [
      { key: 'revenue', title: 'Monthly Revenue', unit: 'NGN', weight: 50, target: 8000000, kra: 'Revenue' },
      { key: 'pipeline', title: 'Qualified Pipeline', unit: 'NGN', weight: 30, target: 15000000, kra: 'Pipeline' },
      { key: 'winRate', title: 'Win Rate', unit: '%', weight: 20, target: 30, kra: 'Conversion' }
    ],
    'Account Exec': [
      { key: 'revenue', title: 'Deals Closed', unit: 'NGN', weight: 55, target: 5000000, kra: 'Revenue' },
      { key: 'meetings', title: 'Client Meetings', unit: 'count', weight: 25, target: 20, kra: 'Pipeline' },
      { key: 'conversion', title: 'Conversion Rate', unit: '%', weight: 20, target: 25, kra: 'Conversion' }
    ],
    'HRBP': [
      { key: 'hires', title: 'Hires Delivered', unit: 'count', weight: 35, target: 10, kra: 'Delivery' },
      { key: 'timeToFill', title: 'Time To Fill', unit: 'days', weight: 35, target: 30, kra: 'Efficiency' },
      { key: 'stakeholder', title: 'Stakeholder Satisfaction', unit: 'score', weight: 30, target: 4.0, kra: 'Quality' }
    ],
    'Finance Manager': [
      { key: 'closing', title: 'Month-end Closing Timeliness', unit: 'days', weight: 40, target: 7, kra: 'Efficiency' },
      { key: 'accuracy', title: 'Reporting Accuracy', unit: '%', weight: 35, target: 98, kra: 'Quality' },
      { key: 'controls', title: 'Controls Compliance', unit: '%', weight: 25, target: 95, kra: 'Compliance' }
    ],
    'Recruiter': [
      { key: 'hires', title: 'Hires Per Quarter', unit: 'count', weight: 40, target: 8, kra: 'Delivery' },
      { key: 'pipeline', title: 'Qualified Candidates Pipeline', unit: 'count', weight: 30, target: 60, kra: 'Pipeline' },
      { key: 'offerAccept', title: 'Offer Acceptance Rate', unit: '%', weight: 30, target: 80, kra: 'Conversion' }
    ],
    'Payroll Exec': [
      { key: 'timeliness', title: 'Payroll Timeliness', unit: '%', weight: 40, target: 98, kra: 'Efficiency' },
      { key: 'accuracy', title: 'Accuracy', unit: '%', weight: 40, target: 99, kra: 'Quality' },
      { key: 'queries', title: 'Resolved Payroll Queries', unit: 'count', weight: 20, target: 30, kra: 'Support' }
    ],
    'Social Manager': [
      { key: 'content', title: 'Content Posts', unit: 'count', weight: 35, target: 40, kra: 'Delivery' },
      { key: 'engagement', title: 'Engagement Rate', unit: '%', weight: 35, target: 5, kra: 'Impact' },
      { key: 'growth', title: 'Follower Growth', unit: '%', weight: 30, target: 10, kra: 'Impact' }
    ]
  },
  // Per-user KPI entries; created on demand from templates
  userKpis: {
    // userId: [{ id, key, title, unit, weight, target, actual }]
  },
  // Appraisals collection for 360 feedback
  appraisals: [
    // { id, userId, period, status, self: { ratings:{kpiId: number}, comments }, manager: { reviewerId, ratings, comments }, peers: [{ name, email, rating, comment }], createdAt }
  ]
  ,
  // Balanced Scorecard
  bscObjectives: [
    // { id, userId, department, perspective, objective, kpis: [string], target, actual, status, initiative, theme }
  ],
  bscTrends: {
    // userId: [{ period, financial, customer, process, learning, initiatives: { completed, inProgress, notStarted } }]
  }
  ,
  // Appraisal cycles (admin-managed)
  cycles: [
    // { id, type: '360'|'bsc', period: 'Qx-YYYY', createdAt, participants: [userId], statusByUser: { [userId]: 'invited'|'in_progress'|'completed' }, reminders: [{ userId, ts }], ownerId, rolesByUser: { [userId]: { peers:[userId], manager:userId|null, directs:[userId] } } }
  ]
  ,
  bscReviews: {
    // userId: [{ cycleId, period, objectiveId, raterId, raterRole, rating, comment, ts }]
  }
};

function loadState() {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (!raw) return { ...defaultState };
    const parsed = JSON.parse(raw);
    // merge defaults to avoid missing keys and ensure seeded employees are present
    const base = { ...defaultState, ...parsed };
    const have = new Set((parsed.employees || []).map(e => e.email));
    const extras = defaultState.employees.filter(e => !have.has(e.email));
    base.employees = [ ...(parsed.employees || []), ...extras ];
    // Ensure allowances container exists
    base.allowances = { ...defaultState.allowances, ...(parsed.allowances || {}) };
    // Ensure KPI structures
    base.kpiTemplates = { ...defaultState.kpiTemplates, ...(parsed.kpiTemplates || {}) };
    base.userKpis = { ...(parsed.userKpis || {}) };
    base.appraisals = [ ...(parsed.appraisals || []) ];
    // Ensure preferences container
    base.preferences = { ...(parsed.preferences || {}) };
    return base;
  } catch {
    return { ...defaultState };
  }
}

function saveState(state) {
  localStorage.setItem(STORE_KEY, JSON.stringify(state));
}

export const Store = {
  getState() { return loadState(); },
  setState(next) { saveState(next); },

  currentUserId() { return localStorage.getItem(SESSION_KEY); },
  currentUser() {
    const id = Store.currentUserId();
    if (!id) return null;
    const s = loadState();
    return s.users.find(u => u.id === id) || null;
  },
  login(email, password) {
    const s = loadState();
    const u = s.users.find(x => x.email === email && x.password === password);
    if (!u) return null;
    localStorage.setItem(SESSION_KEY, u.id);
    return u;
  },
  logout() { localStorage.removeItem(SESSION_KEY); },

  // Preferences and dismissals
  getUserPrefs(userId){ const s = loadState(); s.preferences = s.preferences || {}; return s.preferences[userId] || {}; },
  setUserPref(userId, key, value){ const s = loadState(); s.preferences = s.preferences || {}; s.preferences[userId] = s.preferences[userId] || {}; s.preferences[userId][key] = value; saveState(s); return s.preferences[userId]; },
  dismissNudge(userId, nudgeKey, untilDate){
    const s = loadState(); s.preferences = s.preferences || {}; s.preferences[userId] = s.preferences[userId] || {}; const prefs = s.preferences[userId];
    prefs.dismissedNudges = prefs.dismissedNudges || {}; prefs.dismissedNudges[nudgeKey] = untilDate; saveState(s); return true;
  },
  isNudgeDismissed(userId, nudgeKey, onDate){ const s = loadState(); const prefs = (s.preferences||{})[userId] || {}; const map = prefs.dismissedNudges || {}; const until = map[nudgeKey]; if(!until) return false; const d = (onDate||Store.todayStr()); return d <= until; },

  // Users / Employees
  addUser(user) {
    const s = loadState();
    const id = user.id || `u-${Date.now()}`;
    s.users.push({ ...user, id });
    saveState(s);
    return id;
  },
  getEmployees() { return loadState().employees; },
  getEmployeeByEmail(email) { return loadState().employees.find(e => e.email === email) || null; },
  getEmployeeForUser(userId) {
    const s = loadState();
    const u = s.users.find(x => x.id === userId);
    if (!u) return null;
    return s.employees.find(e => e.email === u.email) || null;
  },
  addEmployee(emp) {
    const s = loadState();
    const id = emp.id || `e-${Date.now()}`;
    s.employees.push({ ...emp, id });
    saveState(s);
    return id;
  },
  updateEmployee(id, patch) {
    const s = loadState();
    const idx = s.employees.findIndex(e => e.id === id);
    if (idx >= 0) {
      s.employees[idx] = { ...s.employees[idx], ...patch };
      saveState(s);
      return true;
    }
    return false;
  },
  removeEmployee(id) {
    const s = loadState();
    const idx = s.employees.findIndex(e => e.id === id);
    if (idx >= 0) {
      s.employees.splice(idx, 1);
      saveState(s);
      return true;
    }
    return false;
  },

  // Attendance
  todayStr(date = new Date()) { return date.toISOString().slice(0,10); },
  clockIn(userId) {
    const s = loadState();
    const day = Store.todayStr();
    const existing = s.attendance.find(a => a.userId === userId && a.date === day);
    const time = new Date().toTimeString().slice(0,5);
    if (existing) { existing.clockIn = time; }
    else { s.attendance.push({ userId, date: day, clockIn: time }); }
    saveState(s);
  },
  clockInAt(userId, timeHHmm) {
    const s = loadState();
    const day = Store.todayStr();
    const existing = s.attendance.find(a => a.userId === userId && a.date === day);
    const time = (timeHHmm || '').slice(0,5);
    if (existing) { existing.clockIn = time; }
    else { s.attendance.push({ userId, date: day, clockIn: time }); }
    saveState(s);
  },
  clockOut(userId) {
    const s = loadState();
    const day = Store.todayStr();
    const existing = s.attendance.find(a => a.userId === userId && a.date === day);
    const time = new Date().toTimeString().slice(0,5);
    if (existing) { existing.clockOut = time; }
    else { s.attendance.push({ userId, date: day, clockOut: time }); }
    saveState(s);
  },
  updateAttendanceMeta(userId, dateStr, patch) {
    const s = loadState();
    const day = (dateStr || Store.todayStr());
    const idx = s.attendance.findIndex(a => a.userId === userId && a.date === day);
    if (idx >= 0) {
      s.attendance[idx] = { ...s.attendance[idx], ...(patch || {}) };
      saveState(s);
      return true;
    }
    return false;
  },
  getAttendanceForDate(userId, dateStr) {
    const s = loadState();
    const day = (dateStr || Store.todayStr());
    return s.attendance.find(a => a.userId === userId && a.date === day) || null;
  },
  getAttendance(userId) { return loadState().attendance.filter(a => a.userId === userId); },

  // Attendance maintenance and notifications
  autoCloseOpenShifts(userId, cutoffHHmm = '18:00') {
    const s = loadState();
    const today = Store.todayStr();
    let changed = false;
    s.attendance
      .filter(a => a.userId === userId && a.date < today && a.clockIn && !a.clockOut)
      .forEach(a => {
        a.clockOut = cutoffHHmm;
        a.autoClosed = true;
        changed = true;
        // Add notification for auto-close
        const id = `auto_close:${userId}:${a.date}`;
        s.notifications = s.notifications || [];
        if (!s.notifications.find(n => n.id === id)) {
          s.notifications.push({ id, type: 'auto_close', userId, date: a.date, message: `Auto-closed open shift on ${a.date} at ${cutoffHHmm}`, ts: new Date().toISOString() });
        }
      });
    if (changed) saveState(s);
    return changed;
  },
  addNotification(note) {
    const s = loadState();
    s.notifications = s.notifications || [];
    const id = note.id || `${note.type||'info'}:${note.userId||'na'}:${note.date||Store.todayStr()}`;
    if (!s.notifications.find(n => n.id === id)) {
      s.notifications.push({ id, ts: new Date().toISOString(), ...note });
      saveState(s);
      return true;
    }
    return false;
  },
  getNotifications(filter = {}) {
    const s = loadState();
    let list = s.notifications || [];
    if (filter.userId) list = list.filter(n => n.userId === filter.userId);
    if (filter.type) list = list.filter(n => n.type === filter.type);
    return list.sort((a,b) => (b.ts||'').localeCompare(a.ts||''));
  },

  // Pulses (Daily check-ins)
  addOrUpdatePulse({ userId, date, mood, stress, workload, note }) {
    const s = loadState();
    const day = date || Store.todayStr();
    s.pulses = s.pulses || [];
    const idx = s.pulses.findIndex(p => p.userId === userId && p.date === day);
    const entry = { id: `pulse:${userId}:${day}`, userId, date: day, mood, stress, workload, note: (note||'') };
    if (idx >= 0) s.pulses[idx] = { ...s.pulses[idx], ...entry };
    else s.pulses.push(entry);
    saveState(s);
    return entry.id;
  },
  getPulse(userId, date) {
    const s = loadState();
    const day = date || Store.todayStr();
    return (s.pulses || []).find(p => p.userId === userId && p.date === day) || null;
  },
  getPulses(userId, { startDate, endDate, lastNDays } = {}) {
    const s = loadState();
    let list = (s.pulses || []).filter(p => p.userId === userId);
    if (lastNDays && lastNDays > 0){
      const end = new Date();
      const start = new Date(); start.setDate(end.getDate() - (lastNDays-1));
      const sstr = start.toISOString().slice(0,10);
      const estr = end.toISOString().slice(0,10);
      list = list.filter(p => p.date >= sstr && p.date <= estr);
    }
    if (startDate) list = list.filter(p => p.date >= startDate);
    if (endDate) list = list.filter(p => p.date <= endDate);
    return list.sort((a,b)=> a.date.localeCompare(b.date));
  },
  computeEngagementFromPulses(userId, days = 30){
    // Map mood (-2..+2), stress (1..5), workload (1..5) into 0..100 index
    const pulses = Store.getPulses(userId, { lastNDays: days });
    if (!pulses.length) return null;
    const norm = pulses.map(p => {
      const moodPct = ((p.mood ?? 0) + 2) / 4; // 0..1
      const stressPct = 1 - (((p.stress ?? 3) - 1) / 4); // invert; 1=best, 5=worst
      const workloadPct = 1 - (((p.workload ?? 3) - 1) / 4); // invert
      // Weighted average: mood 50%, stress 30%, workload 20%
      return (moodPct*0.5 + stressPct*0.3 + workloadPct*0.2) * 100;
    });
    const avg = Math.round(norm.reduce((a,b)=>a+b,0)/norm.length);
    return { avg, count: pulses.length };
  },

  // Leaves
  addLeave(req) {
    const s = loadState();
    const id = `l-${Date.now()}`;
    s.leaves.push({ ...req, id, status: req.status || 'pending' });
    saveState(s);
    return id;
  },
  getLeaves(userId) { return loadState().leaves.filter(l => l.userId === userId); },
  getLeaveBalances(userId) {
    const s = loadState();
    const alloc = (s.allowances && s.allowances[userId]) || { annual: 20, sick: 3, exam: 3, compassionate: 3 };
    const used = { annual: 0, sick: 0, exam: 0, compassionate: 0 };
    s.leaves.filter(l => l.userId === userId).forEach(l => {
      const start = new Date(l.startDate || l.start || l.from || l.date || Date.now());
      const end = new Date(l.endDate || l.end || l.to || l.date || Date.now());
      const days = Math.max(1, Math.round((end - start) / (1000 * 60 * 60 * 24)) + 1);
      const t = l.type || 'annual';
      if (used[t] !== undefined) used[t] += days;
    });
    return { alloc, used };
  },

  // Payslips (generate on the fly if missing)
  getPayslips(userId) {
    const s = loadState();
    let slips = s.payslips.filter(p => p.userId === userId);
    if (slips.length === 0) {
      const emp = s.employees.find(e => e.email === (s.users.find(u => u.id === userId)?.email));
      const base = emp?.salary || 300000;
      const period = new Date().toISOString().slice(0,7);
      const items = [
        { label: 'Base Salary', amount: base },
        { label: 'Tax (PAYE)', amount: Math.round(base * 0.1) },
        { label: 'Pension', amount: Math.round(base * 0.08) },
      ];
      const gross = base;
      const deductions = items.slice(1).reduce((a,b)=>a+b.amount,0);
      const net = gross - deductions;
      const slip = { id: `p-${Date.now()}`, userId, period, gross, net, items };
      s.payslips.push(slip);
      saveState(s);
      slips = [slip];
    }
    return slips;
  },

  // KPI Helpers
  getKpiTemplateForUser(userId) {
    const s = loadState();
    const e = Store.getEmployeeForUser(userId);
    const dept = e?.department || e?.dept || 'Admin';
    const role = e?.role || null;
    const byRole = role ? (s.kpiTemplatesByRole?.[role] || null) : null;
    return byRole || s.kpiTemplates[dept] || s.kpiTemplates['Admin'] || [];
  },
  ensureUserKpis(userId) {
    const s = loadState();
    if (!s.userKpis[userId] || s.userKpis[userId].length === 0) {
      const tmpl = Store.getKpiTemplateForUser(userId);
      s.userKpis[userId] = tmpl.map(t => ({ id: `kpi-${t.key}`, key: t.key, title: t.title, unit: t.unit, weight: t.weight, target: t.target, actual: 0, kra: t.kra || 'General' }));
      saveState(s);
    }
    return s.userKpis[userId];
  },
  getUserKpis(userId) {
    const s = loadState();
    return s.userKpis[userId] || Store.ensureUserKpis(userId);
  },
  upsertUserKpi(userId, kpi) {
    const s = loadState();
    s.userKpis[userId] = s.userKpis[userId] || [];
    const idx = s.userKpis[userId].findIndex(k => k.id === kpi.id);
    if (idx >= 0) s.userKpis[userId][idx] = { ...s.userKpis[userId][idx], ...kpi };
    else s.userKpis[userId].push(kpi);
    saveState(s);
  },
  deleteUserKpi(userId, kpiId) {
    const s = loadState();
    s.userKpis[userId] = (s.userKpis[userId] || []).filter(k => k.id !== kpiId);
    saveState(s);
  },

  // 360 Appraisals
  getOrStartAppraisal(userId, period) {
    const s = loadState();
    let ap = s.appraisals.find(a => a.userId === userId && a.period === period);
    if (!ap) {
      ap = { id: `ap-${Date.now()}`, userId, period, status: 'in_progress', self: { ratings: {}, comments: '' }, manager: { reviewerId: null, ratings: {}, comments: '' }, peers: [], createdAt: new Date().toISOString() };
      s.appraisals.push(ap);
      saveState(s);
    }
    return ap;
  },
  updateSelfReview(userId, period, { ratings, comments }) {
    const s = loadState();
    const ap = Store.getOrStartAppraisal(userId, period);
    ap.self = { ratings: { ...ap.self.ratings, ...(ratings||{}) }, comments: comments ?? ap.self.comments };
    saveState(s);
    return ap;
  },
  addPeerFeedback(userId, period, { name, email, rating, comment }) {
    const s = loadState();
    const ap = Store.getOrStartAppraisal(userId, period);
    ap.peers.push({ name, email, rating, comment });
    saveState(s);
    return ap;
  },
  updateManagerReview(userId, period, reviewerId, { ratings, comments, status }) {
    const s = loadState();
    const ap = Store.getOrStartAppraisal(userId, period);
    ap.manager = { reviewerId, ratings: { ...ap.manager.ratings, ...(ratings||{}) }, comments: comments ?? ap.manager.comments };
    if (status) ap.status = status;
    saveState(s);
    return ap;
  },

  // Appraisal helpers and history
  getAppraisals(userId) {
    const s = loadState();
    return s.appraisals
      .filter(a => a.userId === userId)
      .sort((a,b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
  },
  finalizeAppraisal(userId, period) {
    const s = loadState();
    const ap = Store.getOrStartAppraisal(userId, period);
    ap.status = 'completed';
    saveState(s);
    return ap;
  },
  getManagerForUser(userId) {
    const s = loadState();
    const u = s.users.find(x => x.id === userId);
    if (!u || !u.managerId) return null;
    return s.users.find(x => x.id === u.managerId) || null;
  },
  computeKpiAggregate(userId) {
    const s = loadState();
    const kpis = Store.getUserKpis(userId);
    const sumW = kpis.reduce((a,b)=>a + (Number(b.weight)||0), 0) || 1;
    const normalized = kpis.map(k => {
      const tgt = Number(k.target) || 0;
      const act = Number(k.actual) || 0;
      const ratio = tgt > 0 ? (act / tgt) : 0;
      const pct = Math.max(0, Math.min(120, ratio * 100));
      return pct * (Number(k.weight)||0) / sumW;
    }).reduce((a,b)=>a+b,0);
    return Math.round(normalized);
  },
  computeAndSaveAppraisalSummary(userId, period) {
    const s = loadState();
    const ap = Store.getOrStartAppraisal(userId, period);
    const kpiScore = Store.computeKpiAggregate(userId);
    const selfVals = Object.values(ap.self?.ratings || {});
    const managerVals = Object.values(ap.manager?.ratings || {});
    const avg = arr => arr.length ? arr.reduce((a,b)=>a+Number(b),0)/arr.length : 0;
    const toPct = x => Math.round((Number(x)||0) / 5 * 100);
    const selfScore = toPct(avg(selfVals));
    const managerScore = toPct(avg(managerVals));
    const overall = Math.round(0.6 * kpiScore + 0.2 * selfScore + 0.2 * managerScore);
    ap.summary = { kpiScore, selfScore, managerScore, overall };
    saveState(s);
    return ap.summary;
  },

  // Balanced Scorecard
  getBSCObjectives(userId){
    const s = loadState();
    if (!s.bscObjectives || s.bscObjectives.length === 0){
      const e = Store.getEmployeeForUser(userId);
      const dept = e?.department || 'Admin';
      const seed = [
        { perspective:'financial', objective:'Improve revenue conversion', kpis:['Win Rate','Monthly Revenue'], target:100, actual:72, status:'at_risk', initiative:'Deal coaching', theme:'growth' },
        { perspective:'customer', objective:'Increase customer satisfaction', kpis:['CSAT','Response Time'], target:5, actual:4, status:'on_track', initiative:'Support SLAs', theme:'quality' },
        { perspective:'process', objective:'Enhance deployment efficiency', kpis:['Deployments','MTTR'], target:25, actual:18, status:'on_track', initiative:'CI/CD enhancements', theme:'efficiency' },
        { perspective:'learning', objective:'Upskill engineering team', kpis:['Certifications','Training Hours'], target:40, actual:22, status:'off_track', initiative:'Quarterly workshops', theme:'innovation' }
      ];
      s.bscObjectives = seed.map((o,i)=> ({ id:`bsc-${Date.now()}-${i}`, userId, department:dept, ...o }));
      saveState(s);
    }
    return (s.bscObjectives||[]).filter(o => o.userId === userId);
  },
  addBSCObjective(data){
    const s = loadState();
    const id = data.id || `bsc-${Date.now()}`;
    s.bscObjectives = s.bscObjectives || [];
    s.bscObjectives.push({ id, ...data });
    saveState(s);
    return id;
  },
  updateBSCProgress(objectiveId, progress){
    const s = loadState();
    const idx = (s.bscObjectives||[]).findIndex(o => o.id === objectiveId);
    if (idx >= 0){
      s.bscObjectives[idx] = { ...s.bscObjectives[idx], ...(progress||{}) };
      saveState(s);
      return true;
    }
    return false;
  },
  getBSCTrends(userId){
    const s = loadState();
    s.bscTrends = s.bscTrends || {};
    if (!s.bscTrends[userId] || s.bscTrends[userId].length === 0){
      const periods = ['Q1-2025','Q2-2025','Q3-2025','Q4-2025'];
      const rand = () => 50 + Math.floor(Math.random()*50);
      s.bscTrends[userId] = periods.map(p => ({ period:p, financial:rand(), customer:rand(), process:rand(), learning:rand(), initiatives:{ completed:Math.floor(Math.random()*6), inProgress:Math.floor(Math.random()*5), notStarted:Math.floor(Math.random()*4) } }));
      saveState(s);
    }
    return s.bscTrends[userId];
  },
  getAllBSCObjectives(){
    const s = loadState();
    s.bscObjectives = s.bscObjectives || [];
    if (s.bscObjectives.length === 0){
      const users = (s.users||[]);
      const seedObjs = [
        { perspective:'financial', objective:'Increase revenue conversion', kpis:['Win Rate','MRR'], target:100, actual:70, status:'at_risk', initiative:'Deal coaching', theme:'growth' },
        { perspective:'customer', objective:'Improve satisfaction', kpis:['CSAT','Response Time'], target:5, actual:4, status:'on_track', initiative:'Support SLAs', theme:'quality' },
        { perspective:'process', objective:'Optimize deployment efficiency', kpis:['Deployments','MTTR'], target:25, actual:18, status:'on_track', initiative:'CI/CD enhancements', theme:'efficiency' },
        { perspective:'learning', objective:'Upskill teams', kpis:['Certifications','Training Hours'], target:40, actual:22, status:'off_track', initiative:'Quarterly workshops', theme:'innovation' }
      ];
      users.forEach((u,idx)=>{
        const e = s.employees.find(e=>e.email===u.email);
        const dept = e?.department || 'Admin';
        seedObjs.forEach((o,i)=> s.bscObjectives.push({ id:`bsc-${Date.now()}-${idx}-${i}`, userId:u.id, department:dept, ...o }));
      });
      saveState(s);
    }
    return s.bscObjectives;
  },

  // Appraisal cycles
  createAppraisalCycle({ type, period, participants = [], ownerId }){
    const s = loadState();
    const id = `cycle-${Date.now()}`;
    const statusByUser = {};
    participants.forEach(uid => { statusByUser[uid] = 'invited'; });
    s.cycles = s.cycles || [];
    s.cycles.push({ id, type, period, participants, statusByUser, reminders: [], ownerId, createdAt: new Date().toISOString(), rolesByUser: {} });
    // Send notifications to participants
    participants.forEach(uid => {
      Store.addNotification({ type:'appraisal_invite', userId: uid, date: period, message: `${type.toUpperCase()} review invitation for ${period}`, id:`invite:${id}:${uid}` });
    });
    saveState(s);
    return id;
  },
  getAppraisalCycles(){ return loadState().cycles || []; },
  getCyclesForUser(userId){
    const s = loadState();
    return (s.cycles||[]).filter(c => (c.participants||[]).includes(userId));
  },
  getAppraisalParticipants(cycleId){
    const s = loadState();
    const c = (s.cycles||[]).find(x => x.id === cycleId);
    if (!c) return [];
    return (c.participants||[]).map(uid => ({ userId: uid, roles: (c.rolesByUser||{})[uid] || { peers:[], manager:null, directs:[] }, status: (c.statusByUser||{})[uid] || 'invited' }));
  },
  assignDefaultRaters(cycleId){
    const s = loadState();
    const c = (s.cycles||[]).find(x => x.id === cycleId);
    if (!c || c.type !== '360') return false;
    c.rolesByUser = c.rolesByUser || {};
    const users = (s.users||[]);
    const employees = (s.employees||[]);
    const byId = new Map(users.map(u=>[u.id,u]));
    const deptOf = (uid) => { const u = byId.get(uid); const e = employees.find(e=>e.email===u?.email); return e?.department||null; };
    const managerOf = (uid) => { const u = byId.get(uid); return users.find(x=>x.id === (u?.managerId||null))?.id || null; };
    const directsOf = (uid) => users.filter(x=>x.managerId === uid).map(x=>x.id);
    (c.participants||[]).forEach(uid => {
      const dept = deptOf(uid);
      const peers = users.filter(x=> x.id!==uid && x.managerId!==uid && dept && employees.find(e=>e.email===x.email)?.department===dept).slice(0,3).map(x=>x.id);
      const manager = managerOf(uid);
      const directs = directsOf(uid).slice(0,3);
      c.rolesByUser[uid] = { peers, manager, directs };
    });
    saveState(s);
    return true;
  },
  assignParticipants(cycleId, userIds){
    const s = loadState();
    const c = (s.cycles||[]).find(x => x.id === cycleId);
    if (!c) return false;
    const set = new Set([...(c.participants||[]), ...userIds]);
    c.participants = [...set];
    c.statusByUser = c.statusByUser || {};
    userIds.forEach(uid => { if (!c.statusByUser[uid]) c.statusByUser[uid] = 'invited'; Store.addNotification({ type:'appraisal_invite', userId: uid, date: c.period, message: `${c.type.toUpperCase()} review invitation for ${c.period}`, id:`invite:${cycleId}:${uid}` }); });
    saveState(s);
    return true;
  },
  updateCycleParticipantStatus(cycleId, userId, status){
    const s = loadState();
    const c = (s.cycles||[]).find(x => x.id === cycleId);
    if (!c) return false;
    c.statusByUser = c.statusByUser || {};
    c.statusByUser[userId] = status;
    saveState(s);
    return true;
  },
  sendCycleReminder(cycleId, userId){
    const s = loadState();
    const c = (s.cycles||[]).find(x => x.id === cycleId);
    if (!c) return false;
    c.reminders = c.reminders || [];
    c.reminders.push({ userId, ts: new Date().toISOString() });
    Store.addNotification({ type:'reminder', userId, date:c.period, message:`Reminder: complete ${c.type.toUpperCase()} review for ${c.period}`, id:`reminder:${cycleId}:${userId}:${Date.now()}` });
    saveState(s);
    return true;
  },
  // Reviewer tasks and submissions
  getReviewerTasks(userId){
    const s = loadState();
    const tasks = [];
    (s.cycles||[]).forEach(c => {
      if (c.type === '360'){
        (c.participants||[]).forEach(sub => {
          const roles = (c.rolesByUser||{})[sub] || { peers:[], manager:null, directs:[] };
          if (roles.manager === userId) tasks.push({ cycleId:c.id, type:'360', role:'manager', subjectId:sub, period:c.period });
          if ((roles.directs||[]).includes(userId)) tasks.push({ cycleId:c.id, type:'360', role:'direct', subjectId:sub, period:c.period });
          if ((roles.peers||[]).includes(userId)) tasks.push({ cycleId:c.id, type:'360', role:'peer', subjectId:sub, period:c.period });
        });
      }
      if (c.type === 'bsc'){
        (c.participants||[]).forEach(sub => {
          // Both subject and manager rate BSC
          tasks.push({ cycleId:c.id, type:'bsc', role:'subject', subjectId:sub, period:c.period });
          const mgr = Store.getManagerForUser(sub)?.id || null;
          if (mgr) tasks.push({ cycleId:c.id, type:'bsc', role:'manager', subjectId:sub, period:c.period });
        });
      }
    });
    return tasks;
  },
  submitFeedback({ cycleId, subjectId, raterId, role, ratings, comments }){
    const s = loadState();
    const c = (s.cycles||[]).find(x => x.id === cycleId);
    if (!c || c.type !== '360') return false;
    const period = c.period;
    const ap = Store.getOrStartAppraisal(subjectId, period);
    if (role === 'manager'){
      ap.manager = { reviewerId: raterId, ratings: { ...ap.manager.ratings, ...(ratings||{}) }, comments: comments || ap.manager.comments };
    } else {
      ap.peers = ap.peers || [];
      const id = `${cycleId}:${raterId}:${subjectId}`;
      const idx = ap.peers.findIndex(p => p.id === id);
      const entry = { id, name: '', email: '', rating: ratings?.__overall || null, comment: comments || '' };
      if (idx >= 0) ap.peers[idx] = { ...ap.peers[idx], ...entry };
      else ap.peers.push(entry);
    }
    saveState(s);
    return true;
  },
  submitBSC({ cycleId, subjectId, raterId, period, ratingsByObjective }){
    const s = loadState();
    s.bscReviews = s.bscReviews || {};
    const list = s.bscReviews[subjectId] = s.bscReviews[subjectId] || [];
    Object.entries(ratingsByObjective||{}).forEach(([objectiveId, payload])=>{
      list.push({ cycleId, period, objectiveId, raterId, raterRole: payload.role || 'subject', rating: payload.rating || null, comment: payload.comment || '', ts: new Date().toISOString() });
    });
    saveState(s);
    return true;
  },
  // API-like wrappers for requested names
  createAppraisal(data){ return Store.createAppraisalCycle(data); },
  updateAppraisal(id, patch){
    const s = loadState();
    const c = (s.cycles||[]).find(x => x.id === id);
    if (!c) return false;
    Object.assign(c, patch||{});
    saveState(s);
    return true;
  },
  getAppraisals(userId, role){
    if (role === 'reviewer') return Store.getReviewerTasks(userId);
    return Store.getCyclesForUser(userId);
  },

  // Department leave insight for dashboard
  getEmployeesOnLeaveInDepartment(userId) {
    const s = loadState();
    const u = s.users.find(x => x.id === userId);
    if (!u) return [];
    const me = s.employees.find(e => e.email === u.email);
    if (!me) return [];
    const dept = me.department;
    const today = new Date().toISOString().slice(0,10);
    return s.leaves
      .filter(l => l.status === 'approved')
      .map(l => ({ l, u: s.users.find(x => x.id === l.userId) }))
      .filter(x => !!x.u)
      .map(x => ({ ...x, e: s.employees.find(e => e.email === x.u.email) }))
      .filter(x => x.e && x.e.department === dept)
      .filter(x => (x.l.startDate || x.l.start || today) <= today && (x.l.endDate || x.l.end || today) >= today)
      .map(x => ({ user: x.u, employee: x.e, leave: x.l }));
  },

  // Onboarding
  getOnboarding(userId) {
    const s = loadState();
    return s.onboarding[userId] || { stepsCompleted: [], videosWatched: [] };
  },
  setOnboarding(userId, data) {
    const s = loadState();
    s.onboarding[userId] = data;
    saveState(s);
  }
};

// Also expose as global for non-module access patterns
try { if (typeof window !== 'undefined') { window.Store = Store; } } catch {}