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
  if (btn) btn.onclick = async () => {
    // clear both session systems (new + legacy)
    if (window.supabaseClient) await window.supabaseClient.auth.signOut();
    Store.logout();
    localStorage.removeItem('isLoggedIn');
    window.location.href = 'login.html';
  };
}

export async function signupWithSupabase(email, password, name) {
  if (!window.supabaseClient) {
    console.error('Supabase client not initialized');
    return { ok: false, error: 'Initialization error' };
  }
  const { data, error } = await window.supabaseClient.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: name,
        role: 'user' // Default role
      }
    }
  });
  if (error) return { ok: false, error: error.message };
  return { ok: true, user: data.user };
}

export async function loginWithSupabase(email, password) {
  if (!window.supabaseClient) {
    console.error('Supabase client not initialized');
    return { ok: false, error: 'Initialization error' };
  }
  const { data, error } = await window.supabaseClient.auth.signInWithPassword({
    email,
    password
  });
  if (error) return { ok: false, error: error.message };

  // Update local store
  Store.setCurrentUser(data.user);
  return { ok: true, user: data.user };
}

export function handleLoginForm() {
  const form = document.getElementById('login-form');
  if (!form) return;
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = form.querySelector('input[name="email"]').value.trim();
    const password = form.querySelector('input[name="password"]').value.trim();

    // Show loading state
    const btn = form.querySelector('button');
    const originalText = btn.textContent;
    btn.textContent = 'Logging in...';
    btn.disabled = true;

    try {
      const res = await loginWithSupabase(email, password);
      if (!res.ok) {
        alert('Login failed: ' + res.error);
        btn.textContent = originalText;
        btn.disabled = false;
        return;
      }

      const u = Store.currentUser();
      localStorage.setItem('isLoggedIn', 'true');
      if (u && u.role === 'admin') window.location.href = 'hris-dashboard-admin.html';
      else window.location.href = 'user-dashboard.html';
    } catch (err) {
      alert('An unexpected error occurred');
      console.error(err);
      btn.textContent = originalText;
      btn.disabled = false;
    }
  });
}