/**
 * settings.js — Lumion HRIS Shared Settings Utilities
 * Used by both user-settings.html and admin-settings.html
 */

const SETTINGS_KEY = 'lumion_settings';

/** Load all persisted settings */
export function loadSettings() {
    try {
        return JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}');
    } catch {
        return {};
    }
}

/** Save a single setting key/value */
export function saveSetting(key, value) {
    const all = loadSettings();
    all[key] = value;
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(all));
}

/** Load a single setting with optional default */
export function getSetting(key, fallback = null) {
    return loadSettings()[key] ?? fallback;
}

/** Get current user from Store */
export function getCurrentUser() {
    try {
        if (window.Store) return window.Store.currentUser();
    } catch { }
    // fallback: check localStorage
    try {
        const raw = localStorage.getItem('lumion_user');
        if (raw) return JSON.parse(raw);
    } catch { }
    return null;
}

/** Returns role string: 'super_admin' | 'admin' | 'user' | null */
export function getRole() {
    const u = getCurrentUser();
    if (!u) return null;
    return (u.role || u.user_metadata?.role || 'user').toLowerCase();
}

/** Check if current user has at least this role level */
export function hasRole(requiredRole) {
    const roleRank = { super_admin: 3, admin: 2, user: 1 };
    const current = getRole();
    return (roleRank[current] || 0) >= (roleRank[requiredRole] || 0);
}

/** Show a specific settings section and hide others */
export function showSection(activeId, allIds) {
    allIds.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.style.display = (id === activeId) ? 'block' : 'none';
    });
}

/** Set active tab in sidebar */
export function setActiveTab(activeLinkId, allLinkIds) {
    allLinkIds.forEach(id => {
        const el = document.getElementById(id);
        if (!el) return;
        if (id === activeLinkId) {
            el.classList.add('active');
        } else {
            el.classList.remove('active');
        }
    });
}

/** Handle avatar upload: reads file → base64 → saves & previews */
export function handleAvatarUpload(inputEl, previewEl, storageKey = 'lumion_avatar') {
    inputEl.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;
        if (file.size > 2 * 1024 * 1024) {
            showToast('Image must be under 2MB', 'error');
            return;
        }
        const reader = new FileReader();
        reader.onload = (ev) => {
            const dataUrl = ev.target.result;
            localStorage.setItem(storageKey, dataUrl);
            applyAvatar(previewEl, dataUrl);
            showToast('Profile picture updated!', 'success');
        };
        reader.readAsDataURL(file);
    });
}

/** Apply stored avatar to an img/div element */
export function applyAvatar(el, src) {
    if (!el) return;
    if (el.tagName === 'IMG') {
        el.src = src;
    } else {
        el.style.backgroundImage = `url(${src})`;
        el.style.backgroundSize = 'cover';
        el.style.backgroundPosition = 'center';
        el.textContent = '';
    }
}

/** Load saved avatar into element */
export function loadAvatar(el, storageKey = 'lumion_avatar', initials = 'U') {
    const saved = localStorage.getItem(storageKey);
    if (saved) {
        applyAvatar(el, saved);
    } else if (el && el.tagName !== 'IMG') {
        el.textContent = initials;
    }
}

/** Password strength check: returns 'weak' | 'medium' | 'strong' */
export function passwordStrength(pw) {
    if (!pw || pw.length < 6) return 'weak';
    const hasUpper = /[A-Z]/.test(pw);
    const hasNum = /[0-9]/.test(pw);
    const hasSpecial = /[^A-Za-z0-9]/.test(pw);
    const score = [pw.length >= 10, hasUpper, hasNum, hasSpecial].filter(Boolean).length;
    if (score >= 3) return 'strong';
    if (score >= 2) return 'medium';
    return 'weak';
}

/** Show a toast notification at bottom-right */
export function showToast(message, type = 'success', duration = 3200) {
    let container = document.getElementById('settings-toast-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'settings-toast-container';
        container.style.cssText = 'position:fixed;right:20px;bottom:20px;z-index:9999;display:flex;flex-direction:column;gap:8px;max-width:90vw';
        document.body.appendChild(container);
    }
    const colors = { success: '#16a34a', error: '#dc2626', info: '#2563eb', warning: '#d97706' };
    const toast = document.createElement('div');
    toast.style.cssText = `background:${colors[type] || colors.info};color:#fff;padding:12px 18px;border-radius:12px;box-shadow:0 8px 24px rgba(0,0,0,.2);font-size:14px;font-family:Inter,sans-serif;transform:translateX(120%);opacity:0;transition:transform .22s ease,opacity .22s ease`;
    toast.textContent = message;
    container.appendChild(toast);
    requestAnimationFrame(() => {
        requestAnimationFrame(() => {
            toast.style.transform = 'translateX(0)';
            toast.style.opacity = '1';
        });
    });
    setTimeout(() => {
        toast.style.transform = 'translateX(120%)';
        toast.style.opacity = '0';
        setTimeout(() => toast.remove(), 250);
    }, duration);
}

/** Apply dark mode class to body */
export function applyTheme() {
    const theme = getSetting('theme', 'light');
    if (theme === 'dark') {
        document.documentElement.classList.add('dark-mode');
    } else {
        document.documentElement.classList.remove('dark-mode');
    }
}

/** Append to audit log in localStorage */
export function auditLog(action, actor, detail = '') {
    const key = 'lumion_audit_log';
    let log = [];
    try { log = JSON.parse(localStorage.getItem(key) || '[]'); } catch { }
    log.unshift({ ts: new Date().toISOString(), actor, action, detail });
    if (log.length > 200) log = log.slice(0, 200);
    localStorage.setItem(key, JSON.stringify(log));
}

/** Load audit log entries */
export function getAuditLog() {
    try { return JSON.parse(localStorage.getItem('lumion_audit_log') || '[]'); } catch { return []; }
}
