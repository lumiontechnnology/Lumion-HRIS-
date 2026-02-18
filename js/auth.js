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

export async function signupWithSupabase(email, password, name, role = 'user') {
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
        role: role
      }
    }
  });
  if (error) return { ok: false, error: error.message };
  return { ok: true, user: data.user };
}

/**
 * Creates a new Auth user via signUp using a secondary client.
 * This ensures the current Admin session is not replaced.
 * Supabase will send a confirmation/welcome email by default.
 */
export async function adminCreateEmployeeAuth(email, name, role = 'user') {
  if (!window.supabaseClient || !window.__env__) {
    return { ok: false, error: 'Supabase not configured' };
  }

  // Use a secondary client for "background" signup to avoid session clash
  const tempClient = supabase.createClient(
    window.__env__.NEXT_PUBLIC_SUPABASE_URL,
    window.__env__.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    { auth: { persistSession: false } }
  );

  const tempPass = `Lumion@${new Date().getFullYear()}!`;

  const { data, error } = await tempClient.auth.signUp({
    email,
    password: tempPass,
    options: {
      data: {
        full_name: name,
        role: role
      }
    }
  });

  if (error) {
    console.error('Admin signup error:', error);
    return { ok: false, error: error.message };
  }

  console.log('Employee Auth created successfully for:', email);
  return { ok: true, user: data.user, tempPass };
}

export async function loginWithSupabase(email, password) {
  console.log('Attempting Supabase login for:', email);
  if (!window.supabaseClient) {
    console.error('Supabase client not initialized. Check window.__env__ and supabase SDK.');
    return { ok: false, error: 'Initialization error: window.supabaseClient is missing' };
  }
  const { data, error } = await window.supabaseClient.auth.signInWithPassword({
    email,
    password
  });
  if (error) {
    console.error('Supabase sign-in error:', error);
    return { ok: false, error: error.message };
  }
  console.log('Supabase sign-in success:', data.user);

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
        let errorMsg = res.error;
        if (errorMsg.toLowerCase().includes('email not confirmed')) {
          errorMsg = 'Your email has not been confirmed yet. Please check your inbox for a confirmation link from Supabase.';
        } else if (email === 'admin@lumion.com' && errorMsg.includes('Invalid login credentials')) {
          errorMsg += '\n\nTIP: Since we migrated to Supabase, you must first CREATE this account at the signup page once.';
        }
        alert('Login failed: ' + errorMsg);
        btn.textContent = originalText;
        btn.disabled = false;
        return;
      }

      const u = Store.currentUser();
      console.log('Current user from Store after login:', u);
      localStorage.setItem('isLoggedIn', 'true');

      const target = (u && u.role === 'admin') ? 'hris-dashboard-admin.html' : 'user-dashboard.html';
      console.log('Redirecting to:', target);
      window.location.href = target;
    } catch (err) {
      alert('An unexpected error occurred');
      console.error(err);
      btn.textContent = originalText;
      btn.disabled = false;
    }
  });
}