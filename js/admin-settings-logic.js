/**
 * admin-settings-logic.js
 * All interactive logic for admin-settings.html
 */

import {
    loadSettings, saveSetting, getSetting, getCurrentUser, getRole, hasRole,
    handleAvatarUpload, loadAvatar, applyAvatar, passwordStrength,
    showToast, applyTheme, auditLog, getAuditLog
} from './settings.js';

// ── Bootstrap ──────────────────────────────────────────────
applyTheme();

const user = getCurrentUser();
const role = getRole();

// Set role badge
const badge = document.getElementById('top-role-badge');
if (badge) {
    if (role === 'super_admin') { badge.textContent = '★ Super Admin'; badge.className = 'role-badge super'; }
    else { badge.textContent = 'Admin'; badge.className = 'role-badge admin-b'; }
}

// Sidebar user info
const sidebarAv = document.getElementById('sidebar-avatar');
const sidebarName = document.getElementById('sidebar-name');
const sidebarRole = document.getElementById('sidebar-subrole');

if (user) {
    const fullName = user.name || user.user_metadata?.full_name || user.email || 'Admin';
    sidebarName.textContent = fullName;
    sidebarRole.textContent = role === 'super_admin' ? 'Super Administrator' : 'Administrator';
    const initials = fullName.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() || 'A';
    sidebarAv.textContent = initials;
}
const savedAv = localStorage.getItem('lumion_avatar_admin');
if (savedAv) applyAvatar(sidebarAv, savedAv);

// ── Role-gating: hide super-admin-only tabs ─────────────────
const superOnlySections = ['roles', 'system', 'audit'];
if (role !== 'super_admin') {
    superOnlySections.forEach(s => {
        const navEl = document.getElementById(`nav-${s}`);
        if (navEl) navEl.closest('li').style.display = 'none';
    });
}
// Redirect plain users
if (role === 'user' || !role) {
    window.location.href = 'user-settings.html';
}

// ── Tab navigation ─────────────────────────────────────────
const navLinks = document.querySelectorAll('.sidebar-nav a[data-s]');
const sections = document.querySelectorAll('.section-card');

navLinks.forEach(link => {
    link.addEventListener('click', e => {
        e.preventDefault();
        const target = link.dataset.s;
        navLinks.forEach(l => l.classList.remove('active'));
        link.classList.add('active');
        sections.forEach(sec => sec.classList.toggle('active', sec.id === `section-${target}`));
    });
});

// ── My Profile ─────────────────────────────────────────────
const s = loadSettings();
if (user) {
    const full = user.name || user.user_metadata?.full_name || '';
    const [fn, ...ln] = full.split(' ');
    document.getElementById('p-firstname').value = s.adminFirstName || fn || '';
    document.getElementById('p-lastname').value = s.adminLastName || ln.join(' ') || '';
    document.getElementById('p-email').value = user.email || '';
}
document.getElementById('p-phone').value = s.adminPhone || '';

document.getElementById('save-profile').addEventListener('click', () => {
    const fn = document.getElementById('p-firstname').value.trim();
    const ln = document.getElementById('p-lastname').value.trim();
    const ph = document.getElementById('p-phone').value.trim();
    if (!fn) { showToast('First name required', 'error'); return; }
    saveSetting('adminFirstName', fn);
    saveSetting('adminLastName', ln);
    saveSetting('adminPhone', ph);
    sidebarName.textContent = `${fn} ${ln}`;
    auditLog('admin_profile_update', user?.email || 'admin', `Name: ${fn} ${ln}`);
    showToast('Profile saved!', 'success');
});

// ── Avatar ─────────────────────────────────────────────────
const avatarPreview = document.getElementById('avatar-preview');
const savedAdminAv = localStorage.getItem('lumion_avatar_admin');
if (savedAdminAv) applyAvatar(avatarPreview, savedAdminAv);

const fileInput = document.getElementById('avatar-file');
fileInput.addEventListener('change', e => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { showToast('Image must be under 2MB', 'error'); return; }
    const reader = new FileReader();
    reader.onload = ev => {
        const dataUrl = ev.target.result;
        localStorage.setItem('lumion_avatar_admin', dataUrl);
        applyAvatar(avatarPreview, dataUrl);
        applyAvatar(sidebarAv, dataUrl);
        showToast('Profile picture updated!', 'success');
    };
    reader.readAsDataURL(file);
});

document.getElementById('remove-avatar').addEventListener('click', () => {
    localStorage.removeItem('lumion_avatar_admin');
    const full = user?.name || user?.user_metadata?.full_name || 'Admin';
    const initials = full.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
    avatarPreview.style.backgroundImage = '';
    avatarPreview.textContent = initials;
    sidebarAv.style.backgroundImage = '';
    sidebarAv.textContent = initials;
    showToast('Avatar removed', 'info');
});

// ── Password ───────────────────────────────────────────────
const pwNew = document.getElementById('pw-new');
const pwFill = document.getElementById('pw-fill');
const pwLabel = document.getElementById('pw-label');

pwNew.addEventListener('input', () => {
    const str = passwordStrength(pwNew.value);
    const map = { weak: ['28%', '#ef4444', 'Weak'], medium: ['60%', '#f97316', 'Medium'], strong: ['100%', '#10b981', 'Strong ✓'] }[str];
    pwFill.style.width = map[0]; pwFill.style.background = map[1];
    pwLabel.textContent = map[2]; pwLabel.style.color = map[1];
});

document.getElementById('pw-confirm').addEventListener('input', function () {
    document.getElementById('pw-match-err').style.display =
        (this.value && this.value !== pwNew.value) ? 'block' : 'none';
});

document.getElementById('save-password').addEventListener('click', async () => {
    const cur = document.getElementById('pw-current').value;
    const nw = pwNew.value;
    const cf = document.getElementById('pw-confirm').value;
    if (!cur) { showToast('Enter current password', 'error'); return; }
    if (nw.length < 8) { showToast('Min 8 characters', 'error'); return; }
    if (nw !== cf) { showToast('Passwords do not match', 'error'); return; }
    if (passwordStrength(nw) === 'weak') { showToast('Password too weak', 'warning'); return; }

    const btn = document.getElementById('save-password');
    btn.textContent = 'Updating…'; btn.disabled = true;
    try {
        if (window.supabaseClient) {
            const { error } = await window.supabaseClient.auth.updateUser({ password: nw });
            if (error) throw new Error(error.message);
        }
        auditLog('password_change', user?.email || 'admin');
        showToast('Password updated!', 'success');
        document.getElementById('pw-current').value = '';
        pwNew.value = ''; document.getElementById('pw-confirm').value = '';
        pwFill.style.width = '0'; pwLabel.textContent = 'Enter a new password'; pwLabel.style.color = '';
    } catch (err) {
        showToast(err.message || 'Failed to update password', 'error');
    } finally { btn.textContent = 'Update Password'; btn.disabled = false; }
});

// ── Roles & Permissions ────────────────────────────────────
function buildRolesTable() {
    const tbody = document.getElementById('roles-tbody');
    if (!tbody) return;
    let users = [];
    try { users = JSON.parse(localStorage.getItem('lumion_managed_users') || '[]'); } catch { }
    if (!users.length) {
        users = [
            { id: 'u1', name: 'Admin User', email: 'admin@lumion.com', role: 'admin' },
            { id: 'u2', name: 'Super Admin', email: 'superadmin@lumion.com', role: 'super_admin' },
            { id: 'u3', name: 'HR Manager', email: 'hr@lumion.com', role: 'admin' },
            { id: 'u4', name: 'Ada Bello', email: 'ada@lumion.com', role: 'user' },
            { id: 'u5', name: 'Chike Okoro', email: 'chike@lumion.com', role: 'user' },
        ];
        localStorage.setItem('lumion_managed_users', JSON.stringify(users));
    }
    tbody.innerHTML = users.map(u => `
    <tr data-uid="${u.id}">
      <td><div class="user-chip">
        <div class="user-avatar-sm">${u.name.split(' ').map(w => w[0]).join('').slice(0, 2)}</div>
        <span style="font-weight:600">${u.name}</span>
      </div></td>
      <td style="color:var(--muted);font-size:12px">${u.email}</td>
      <td><span style="font-size:11px;padding:2px 8px;border-radius:999px;background:var(--brand-light);color:var(--brand);font-weight:700">${u.role.replace('_', ' ').toUpperCase()}</span></td>
      <td>
        <select class="role-select" data-uid="${u.id}" style="padding:6px 10px;border:1.5px solid var(--border);border-radius:8px;font-size:13px;background:var(--bg);color:var(--ink)">
          <option value="user" ${u.role === 'user' ? 'selected' : ''}>User</option>
          <option value="admin" ${u.role === 'admin' ? 'selected' : ''}>Admin</option>
          <option value="super_admin" ${u.role === 'super_admin' ? 'selected' : ''}>Super Admin</option>
        </select>
      </td>
      <td>
        <button class="btn btn-danger btn-sm revoke-btn" data-uid="${u.id}">Revoke Access</button>
      </td>
    </tr>`).join('');

    tbody.querySelectorAll('.revoke-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            if (!confirm('Revoke access for this user?')) return;
            const uid = btn.dataset.uid;
            users = users.filter(u => u.id !== uid);
            localStorage.setItem('lumion_managed_users', JSON.stringify(users));
            auditLog('revoke_access', user?.email, uid);
            buildRolesTable();
            showToast('Access revoked', 'info');
        });
    });
}

document.getElementById('save-roles')?.addEventListener('click', () => {
    let users = [];
    try { users = JSON.parse(localStorage.getItem('lumion_managed_users') || '[]'); } catch { }
    document.querySelectorAll('.role-select').forEach(sel => {
        const uid = sel.dataset.uid;
        const u = users.find(x => x.id === uid);
        if (u) u.role = sel.value;
    });
    localStorage.setItem('lumion_managed_users', JSON.stringify(users));
    auditLog('roles_updated', user?.email, `${users.length} users`);
    showToast('Roles saved!', 'success');
    buildRolesTable();
});

if (role === 'super_admin') buildRolesTable();

// ── Payroll Config ─────────────────────────────────────────
const defaultBrackets = [
    { min: 0, max: 30000, rate: 0 },
    { min: 30000, max: 100000, rate: 10 },
    { min: 100000, max: 300000, rate: 15 },
    { min: 300000, max: 999999999, rate: 20 }
];
let brackets = getSetting('payroll_brackets') || defaultBrackets;

function renderBrackets() {
    const tbody = document.getElementById('tax-tbody');
    if (!tbody) return;
    tbody.innerHTML = brackets.map((b, i) => `
    <tr>
      <td><input class="br-min" data-i="${i}" value="${b.min}" type="number"/></td>
      <td><input class="br-max" data-i="${i}" value="${b.max}" type="number"/></td>
      <td><input class="br-rate" data-i="${i}" value="${b.rate}" type="number" step="0.5"/></td>
      <td><button class="btn btn-danger btn-sm remove-br" data-i="${i}">✕</button></td>
    </tr>`).join('');
    tbody.querySelectorAll('.remove-br').forEach(btn => {
        btn.addEventListener('click', () => { brackets.splice(+btn.dataset.i, 1); renderBrackets(); });
    });
}
renderBrackets();

document.getElementById('add-bracket')?.addEventListener('click', () => {
    brackets.push({ min: 0, max: 0, rate: 0 });
    renderBrackets();
});

// Pre-fill payroll
document.getElementById('pay-currency').value = getSetting('pay_currency') || 'NGN';
document.getElementById('pay-cycle').value = getSetting('pay_cycle') || 'monthly';
document.getElementById('pay-pension').value = getSetting('pay_pension') ?? 8;
document.getElementById('pay-employer-pension').value = getSetting('pay_employer_pension') ?? 10;
document.getElementById('pay-company-name').value = getSetting('pay_company_name') || '';
document.getElementById('pay-footer').value = getSetting('pay_footer') || '';
document.getElementById('pay-bonus').value = getSetting('pay_bonus') || 'performance';

document.getElementById('save-payroll')?.addEventListener('click', () => {
    // Read updated bracket values
    brackets.forEach((b, i) => {
        const row = document.querySelector(`.br-min[data-i="${i}"]`);
        if (row) {
            b.min = +document.querySelector(`.br-min[data-i="${i}"]`).value;
            b.max = +document.querySelector(`.br-max[data-i="${i}"]`).value;
            b.rate = +document.querySelector(`.br-rate[data-i="${i}"]`).value;
        }
    });
    saveSetting('payroll_brackets', brackets);
    saveSetting('pay_currency', document.getElementById('pay-currency').value);
    saveSetting('pay_cycle', document.getElementById('pay-cycle').value);
    saveSetting('pay_pension', +document.getElementById('pay-pension').value);
    saveSetting('pay_employer_pension', +document.getElementById('pay-employer-pension').value);
    saveSetting('pay_company_name', document.getElementById('pay-company-name').value);
    saveSetting('pay_footer', document.getElementById('pay-footer').value);
    saveSetting('pay_bonus', document.getElementById('pay-bonus').value);
    auditLog('payroll_config_saved', user?.email);
    showToast('Payroll settings saved!', 'success');
});

// ── Performance Settings ───────────────────────────────────
document.getElementById('perf-cycle').value = getSetting('perf_cycle') || 'quarterly';
document.getElementById('perf-framework').value = getSetting('perf_framework') || 'okr';
document.getElementById('perf-scale').value = getSetting('perf_scale') || '5';
document.getElementById('perf-deadline').value = getSetting('perf_deadline') ?? 7;
document.getElementById('perf-360').checked = getSetting('perf_360') !== false;
document.getElementById('perf-nominate').checked = getSetting('perf_nominate') || false;

// KPI sliders live update
['productivity', 'quality', 'teamwork', 'leadership', 'innovation'].forEach(k => {
    const el = document.getElementById(`w-${k}`);
    const valEl = document.getElementById(`w-${k}-val`);
    if (!el) return;
    el.value = getSetting(`kpi_w_${k}`) ?? el.value;
    valEl.textContent = el.value + '%';
    el.addEventListener('input', () => valEl.textContent = el.value + '%');
});

document.getElementById('save-performance')?.addEventListener('click', () => {
    saveSetting('perf_cycle', document.getElementById('perf-cycle').value);
    saveSetting('perf_framework', document.getElementById('perf-framework').value);
    saveSetting('perf_scale', document.getElementById('perf-scale').value);
    saveSetting('perf_deadline', +document.getElementById('perf-deadline').value);
    saveSetting('perf_360', document.getElementById('perf-360').checked);
    saveSetting('perf_nominate', document.getElementById('perf-nominate').checked);
    ['productivity', 'quality', 'teamwork', 'leadership', 'innovation'].forEach(k => {
        saveSetting(`kpi_w_${k}`, document.getElementById(`w-${k}`)?.value);
    });
    auditLog('performance_config_saved', user?.email);
    showToast('Performance settings saved!', 'success');
});

// ── Employee Config ────────────────────────────────────────
let departments = getSetting('departments') || ['Engineering', 'Sales', 'HR', 'Product', 'Finance', 'Design', 'Customer Success', 'Operations', 'Legal', 'IT Ops', 'Marketing', 'Admin'];
let locations = getSetting('locations') || ['Lagos, Nigeria', 'Abuja, Nigeria', 'Remote', 'Accra, Ghana', 'Nairobi, Kenya'];

document.getElementById('emp-annual').value = getSetting('leave_annual') ?? 21;
document.getElementById('emp-sick').value = getSetting('leave_sick') ?? 10;
document.getElementById('emp-exam').value = getSetting('leave_exam') ?? 5;
document.getElementById('emp-probation').value = getSetting('emp_probation') ?? 3;
document.getElementById('emp-notice').value = getSetting('emp_notice') ?? 4;

function renderTags(list, containerId, saveKey) {
    const container = document.getElementById(containerId);
    if (!container) return;
    container.innerHTML = list.map((t, i) => `
    <span class="tag">${t}<span class="tag-remove" data-i="${i}" data-key="${saveKey}">×</span></span>
  `).join('');
    container.querySelectorAll('.tag-remove').forEach(x => {
        x.addEventListener('click', () => {
            if (saveKey === 'departments') departments.splice(+x.dataset.i, 1);
            else locations.splice(+x.dataset.i, 1);
            renderTags(saveKey === 'departments' ? departments : locations, containerId, saveKey);
        });
    });
}
renderTags(departments, 'dept-tags', 'departments');
renderTags(locations, 'loc-tags', 'locations');

document.getElementById('add-dept')?.addEventListener('click', () => {
    const v = document.getElementById('dept-input').value.trim();
    if (!v) return;
    departments.push(v);
    document.getElementById('dept-input').value = '';
    renderTags(departments, 'dept-tags', 'departments');
});
document.getElementById('add-loc')?.addEventListener('click', () => {
    const v = document.getElementById('loc-input').value.trim();
    if (!v) return;
    locations.push(v);
    document.getElementById('loc-input').value = '';
    renderTags(locations, 'loc-tags', 'locations');
});

document.getElementById('save-employees')?.addEventListener('click', () => {
    saveSetting('leave_annual', +document.getElementById('emp-annual').value);
    saveSetting('leave_sick', +document.getElementById('emp-sick').value);
    saveSetting('leave_exam', +document.getElementById('emp-exam').value);
    saveSetting('emp_probation', +document.getElementById('emp-probation').value);
    saveSetting('emp_notice', +document.getElementById('emp-notice').value);
    saveSetting('departments', departments);
    saveSetting('locations', locations);
    auditLog('employee_config_saved', user?.email);
    showToast('Employee config saved!', 'success');
});

// ── Jobs & Recruiting ──────────────────────────────────────
let pipelineStages = getSetting('pipeline_stages') || ['Applied', 'Phone Screen', 'Technical Interview', 'Culture Fit', 'Reference Check', 'Offer', 'Hired'];

function renderStages() {
    const container = document.getElementById('pipeline-stages');
    if (!container) return;
    const colors = ['#eef2ff', '#fce7f3', '#dcfce7', '#fef9c3', '#fee2e2', '#dbeafe', '#f3e8ff'];
    container.innerHTML = pipelineStages.map((st, i) => `
    <div class="stage-item" draggable="true" data-i="${i}">
      <span class="drag-handle">⠿</span>
      <span class="stage-name">${st}</span>
      <span class="stage-badge" style="background:${colors[i % colors.length]};color:#374151">${i + 1}</span>
      <button class="btn btn-danger btn-sm rm-stage" data-i="${i}" style="margin-left:auto">✕</button>
    </div>`).join('');
    container.querySelectorAll('.rm-stage').forEach(btn => {
        btn.addEventListener('click', () => {
            pipelineStages.splice(+btn.dataset.i, 1);
            renderStages();
        });
    });
}
renderStages();
document.getElementById('jobs-threshold').value = getSetting('jobs_threshold') ?? 70;
document.getElementById('jobs-approval').value = getSetting('jobs_approval') || 'none';
document.getElementById('jobs-offer-template').value = getSetting('jobs_offer_template') || '';

document.getElementById('add-stage')?.addEventListener('click', () => {
    const v = document.getElementById('stage-input').value.trim();
    if (!v) return;
    pipelineStages.push(v);
    document.getElementById('stage-input').value = '';
    renderStages();
});
document.getElementById('save-jobs')?.addEventListener('click', () => {
    saveSetting('pipeline_stages', pipelineStages);
    saveSetting('jobs_threshold', +document.getElementById('jobs-threshold').value);
    saveSetting('jobs_approval', document.getElementById('jobs-approval').value);
    saveSetting('jobs_offer_template', document.getElementById('jobs-offer-template').value);
    auditLog('jobs_config_saved', user?.email);
    showToast('Jobs & Recruiting settings saved!', 'success');
});

// ── Interview Settings ─────────────────────────────────────
document.getElementById('int-platform').value = getSetting('int_platform') || 'zoom';
document.getElementById('int-buffer').value = getSetting('int_buffer') ?? 15;
document.getElementById('int-panel-size').value = getSetting('int_panel_size') ?? 2;

document.getElementById('save-interviews')?.addEventListener('click', () => {
    saveSetting('int_platform', document.getElementById('int-platform').value);
    saveSetting('int_buffer', +document.getElementById('int-buffer').value);
    saveSetting('int_panel_size', +document.getElementById('int-panel-size').value);
    auditLog('interview_config_saved', user?.email);
    showToast('Interview settings saved!', 'success');
});

// ── Notifications ──────────────────────────────────────────
const notifIds = ['n-newemp', 'n-leave', 'n-payroll', 'n-perf', 'n-cand', 'n-asset', 'n-policy'];
notifIds.forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    const stored = getSetting(id);
    if (stored !== null) el.checked = stored;
});
document.getElementById('save-notifications')?.addEventListener('click', () => {
    notifIds.forEach(id => {
        const el = document.getElementById(id);
        if (el) saveSetting(id, el.checked);
    });
    auditLog('notifications_saved', user?.email);
    showToast('Notification preferences saved!', 'success');
});

// ── System & Integrations ──────────────────────────────────
if (role === 'super_admin') {
    document.getElementById('sys-company').value = getSetting('sys_company') || '';
    document.getElementById('sys-logo').value = getSetting('sys_logo') || '';
    document.getElementById('sys-timezone').value = getSetting('sys_timezone') || 'Africa/Lagos';
    document.getElementById('sys-dateformat').value = getSetting('sys_dateformat') || 'DD/MM/YYYY';
    document.getElementById('sys-webhook').value = getSetting('sys_webhook') || '';
    document.getElementById('sys-domains').value = getSetting('sys_domains') || '';
    const supabaseUrlEl = document.getElementById('sys-supabase-url');
    if (supabaseUrlEl && window.__env__) supabaseUrlEl.value = window.__env__.NEXT_PUBLIC_SUPABASE_URL || '(not configured)';

    document.getElementById('save-system')?.addEventListener('click', () => {
        saveSetting('sys_company', document.getElementById('sys-company').value);
        saveSetting('sys_logo', document.getElementById('sys-logo').value);
        saveSetting('sys_timezone', document.getElementById('sys-timezone').value);
        saveSetting('sys_dateformat', document.getElementById('sys-dateformat').value);
        saveSetting('sys_webhook', document.getElementById('sys-webhook').value);
        saveSetting('sys_domains', document.getElementById('sys-domains').value);
        auditLog('system_config_saved', user?.email);
        showToast('System settings saved!', 'success');
    });

    document.getElementById('reset-system')?.addEventListener('click', () => {
        if (!confirm('Reset all system config? This cannot be undone.')) return;
        const keys = ['sys_company', 'sys_logo', 'sys_timezone', 'sys_dateformat', 'sys_webhook', 'sys_domains'];
        keys.forEach(k => saveSetting(k, null));
        showToast('System config reset', 'info');
        location.reload();
    });
}

// ── Audit Log ──────────────────────────────────────────────
function renderAuditLog() {
    const tbody = document.getElementById('audit-tbody');
    const empty = document.getElementById('audit-empty');
    if (!tbody) return;
    const entries = getAuditLog();
    if (!entries.length) {
        tbody.innerHTML = '';
        if (empty) empty.style.display = 'block';
        return;
    }
    if (empty) empty.style.display = 'none';
    tbody.innerHTML = entries.map(e => `
    <tr>
      <td style="color:var(--muted)">${new Date(e.ts).toLocaleString()}</td>
      <td style="font-weight:600">${e.actor}</td>
      <td><span style="font-size:11px;background:var(--brand-light);color:var(--brand);padding:2px 8px;border-radius:999px">${e.action.replace(/_/g, ' ')}</span></td>
      <td style="color:var(--muted)">${e.detail || '—'}</td>
    </tr>`).join('');
}

if (role === 'super_admin') {
    renderAuditLog();
    document.getElementById('clear-audit')?.addEventListener('click', () => {
        if (!confirm('Clear entire audit log?')) return;
        localStorage.removeItem('lumion_audit_log');
        renderAuditLog();
        showToast('Audit log cleared', 'info');
    });
}
