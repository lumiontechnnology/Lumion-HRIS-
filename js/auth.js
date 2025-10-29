// Simple role-based auth for static site (demo only)
import { Store } from './store.js';

export function requireAuth(role) {
  const user = Store.currentUser();
  if (!user) {
    window.location.href = 'login.html';
    return;
  }
  if (role && user.role !== role) {
    // redirect to appropriate home
    if (user.role === 'admin') window.location.href = 'hris-dashboard-admin.html';
    else window.location.href = 'user-dashboard.html';
  }
}

export function renderUserMenu(containerId = 'user-menu') {
  const el = document.getElementById(containerId);
  if (!el) return;
  const u = Store.currentUser();
  el.innerHTML = u ? `Logged in as ${u.name} (${u.role}) <button id="logoutBtn">Logout</button>` : '';
  const btn = document.getElementById('logoutBtn');
  if (btn) btn.onclick = () => { 
    // clear both session systems (new + legacy)
    Store.logout(); 
    localStorage.removeItem('isLoggedIn');
    window.location.href = 'login.html'; 
  };
}

export function handleLoginForm() {
  const form = document.getElementById('login-form');
  if (!form) return;
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const email = form.querySelector('input[name="email"]').value.trim();
    const password = form.querySelector('input[name="password"]').value.trim();
    const u = Store.login(email, password);
    if (!u) {
      alert('Invalid credentials');
      return;
    }
    // set legacy flag for pages still checking it
    localStorage.setItem('isLoggedIn', 'true');
    if (u.role === 'admin') window.location.href = 'hris-dashboard-admin.html';
    else window.location.href = 'user-dashboard.html';
  });
}