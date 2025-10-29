// Deterministic, non-random seeding for Leaves analytics
// Generates historical leave records from existing employees in Store
import { Store } from './store.js';

const SEED_FLAG = 'lumionHR_leave_seed_v1';

// Helper: simple stable hash for strings
function hashCode(str) {
  let h = 0; for (let i=0;i<str.length;i++){ h = ((h<<5)-h) + str.charCodeAt(i); h |= 0; }
  return Math.abs(h);
}

// Assign role, tier, gender deterministically based on name/email
export function getPeopleMeta() {
  const emps = Store.getState().employees || [];
  const roles = ['Software Engineer','Account Exec','HRBP','Finance Manager','DevOps Engineer','Product Manager','Payroll Exec','Recruiter','Social Manager'];
  const tiers = ['Junior','Mid','Senior'];
  return emps.map(e => {
    const h = hashCode(e.email || e.name || e.id);
    const dept = e.department || 'Admin';
    const role = roles[h % roles.length];
    const tier = tiers[h % tiers.length];
    const gender = (h % 2 === 0) ? 'Male' : 'Female';
    return { id: e.id, email: e.email, name: e.name, department: dept, location: e.location || 'HQ', role, tier, gender };
  });
}

// Seed leaves if insufficient data exists, using deterministic patterns (no randomness)
export function ensureSeededLeaves() {
  if (localStorage.getItem(SEED_FLAG) === '1') return;
  const s = Store.getState();
  const usersByEmail = new Map((s.users||[]).map(u => [u.email, u]));
  const emps = s.employees || [];

  // Choose a 6-month window ending today
  const end = new Date();
  const start = new Date(); start.setMonth(end.getMonth() - 5); start.setDate(1);

  // Helper to add a leave day-span
  const add = (userId, type, sd, ed, reason='') => {
    Store.addLeave({ userId, type, startDate: sd, endDate: ed, status: 'approved', reason });
  };

  // For each employee with a matching user, add structured leaves monthly
  emps.forEach(e => {
    const u = usersByEmail.get(e.email);
    if (!u) return; // seed only known users to keep totals realistic
    const h = hashCode(e.id + e.email);
    const monthCount = 6;
    for (let i=0;i<monthCount;i++){
      const d = new Date(start); d.setMonth(start.getMonth()+i);
      const yyyy = d.getFullYear(); const mm = String(d.getMonth()+1).padStart(2,'0');
      // Construct deterministic days per type
      const sickDays = (h % 3 === 0) ? 2 : 1;   // 1–2
      const casualDays = (h % 4 === 0) ? 3 : 2; // 2–3
      const earnedDays = (h % 5 === 0) ? 2 : 1; // 1–2
      const unpaidDays = (h % 7 === 0) ? 1 : 0; // 0–1
      const absentDays = (h % 6 === 0) ? 1 : 0; // 0–1

      // Build contiguous spans: 1–3 days per type within the month (avoids randomness)
      const mk = (day, len)=> `${yyyy}-${mm}-${String(day).padStart(2,'0')}`;
      if (sickDays) add(u.id, 'sick', mk(2+i, 0), mk(2+i + sickDays-1, 0), 'Seeded');
      if (casualDays) add(u.id, 'casual', mk(8+i, 0), mk(8+i + casualDays-1, 0), 'Seeded');
      if (earnedDays) add(u.id, 'earned', mk(15+i, 0), mk(15+i + earnedDays-1, 0), 'Seeded');
      if (unpaidDays) add(u.id, 'unpaid', mk(22+i, 0), mk(22+i + unpaidDays-1, 0), 'Seeded');
      if (absentDays) add(u.id, 'absent', mk(26+i, 0), mk(26+i + absentDays-1, 0), 'Seeded');
    }
  });

  localStorage.setItem(SEED_FLAG, '1');
}

export const LeaveLabels = [
  { key:'sick', label:'Sick Leaves', color:'#7c3aed' },
  { key:'casual', label:'Casual Leaves', color:'#a78bfa' },
  { key:'earned', label:'Earned Leaves', color:'#f59e0b' },
  { key:'unpaid', label:'Unpaid Leaves', color:'#ef4444' },
  { key:'absent', label:'Absenteeism without leave', color:'#94a3b8' }
];