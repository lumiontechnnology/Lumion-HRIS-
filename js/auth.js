// Simple role-based auth for static site (demo only)
import { Store } from './store.js';

/**
 * Lazily get or create the Supabase client.
 * Handles cases where supabase.js IIFE ran before the CDN script loaded.
 */
function getClient() {
  if (window.supabaseClient) return window.supabaseClient;
  const cfg = window.__env__ || {};
  const url = cfg.NEXT_PUBLIC_SUPABASE_URL;
  const key = cfg.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    console.error('Supabase env vars missing from window.__env__');
    return null;
  }
  if (typeof supabase === 'undefined') {
    console.error('Supabase SDK not loaded from CDN yet');
    return null;
  }
  window.supabaseClient = supabase.createClient(url, key);
  console.log('Supabase client lazily initialized');
  return window.supabaseClient;
}

export function requireAuth(role) {
  const user = Store.currentUser();
  if (!user) {
    window.location.href = 'login.html';
    return;
  }
  if (role && user.role !== role) {
    if (role === 'user' && user.role === 'admin') return;
    if (user.role === 'admin') window.location.href = 'hris-dashboard-admin.html';
    else window.location.href = 'user-dashboard.html';
  }
}

export function renderUserMenu(containerId = 'user-menu') {
  const el = document.getElementById(containerId);
  if (!el) return;
  const u = Store.currentUser();
  el.innerHTML = u ? (
    u.role === 'admin'
      ? `Logged in as ${u.name} (admin) 
         <a href="hris-dashboard-admin.html" class="btn">Admin Dashboard</a>
         <a href="user-dashboard.html" class="btn">User Dashboard</a>
         <button id="logoutBtn">Logout</button>`
      : `Logged in as ${u.name} (${u.role}) <button id="logoutBtn">Logout</button>`
  ) : '';
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
  const client = getClient();
  if (!client) {
    return { ok: false, error: 'Supabase is not configured. Check config/env.js has the correct SUPABASE_URL and ANON_KEY.' };
  }
  const { data, error } = await client.auth.signUp({
    email,
    password,
    options: { data: { full_name: name, role } }
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
    const email = form.querySelector('input[name="email"]').value.trim().toLowerCase();
    const password = form.querySelector('input[name="password"]').value.trim();

    const btn = form.querySelector('button');
    const originalText = btn.textContent;
    btn.textContent = 'Logging in…';
    btn.disabled = true;

    try {
      // ── Step 1: Try Supabase if available ──────────────────────────────
      const client = getClient();
      if (client) {
        const { data, error } = await client.auth.signInWithPassword({ email, password });

        if (error) {
          let errorMsg = error.message || 'Login failed';

          if (errorMsg.toLowerCase().includes('email not confirmed') ||
            errorMsg.toLowerCase().includes('email_not_confirmed')) {
            errorMsg = '✉️ Your email is not confirmed yet.\n\nPlease check your inbox (and spam folder) for a confirmation link from Supabase. After clicking the link, try logging in again.\n\nAlternatively, ask your admin to disable "Email Confirmations" in the Supabase Dashboard → Authentication → Providers → Email.';
          } else if (errorMsg.toLowerCase().includes('invalid login credentials') ||
            errorMsg.toLowerCase().includes('invalid credentials')) {
            errorMsg = 'Incorrect email or password. Please try again.';
          }

          alert('Login failed: ' + errorMsg);
          btn.textContent = originalText;
          btn.disabled = false;
          return;
        }

        // ── Step 2: Supabase login succeeded — set session ─────────────
        const sbUser = data.user;
        if (!sbUser) {
          alert('Login failed: No user returned. Please try again.');
          btn.textContent = originalText;
          btn.disabled = false;
          return;
        }

        // Extract role — Supabase stores it in user_metadata
        const role = (
          sbUser.user_metadata?.role ||
          sbUser.app_metadata?.role ||
          'user'
        ).toLowerCase();

        // Ensure user exists in local Store with correct role
        const s = Store.getState();
        let localUser = s.users.find(u => u.email === email);
        if (!localUser) {
          const newUser = {
            id: sbUser.id,
            email: sbUser.email,
            name: sbUser.user_metadata?.full_name || email.split('@')[0],
            role: role
          };
          Store.addUser(newUser);
          localStorage.setItem('lumionHR_current_user_id', sbUser.id);
        } else {
          // Update role in case it changed
          localUser.role = role;
          Store.setState(s);
          localStorage.setItem('lumionHR_current_user_id', localUser.id);
        }

        // Also store Supabase user in a quick-access key for settings pages
        localStorage.setItem('lumion_user', JSON.stringify({
          id: sbUser.id,
          email: sbUser.email,
          name: sbUser.user_metadata?.full_name || email.split('@')[0],
          role: role,
          user_metadata: sbUser.user_metadata
        }));

        localStorage.setItem('isLoggedIn', 'true');

        const target = 'user-dashboard.html';
        window.location.href = target;
        return;
      }

      // ── Step 3: Supabase not configured ────────────────────────────────
      alert('Supabase is not configured. Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in config/env.js.');
      btn.textContent = originalText;
      btn.disabled = false;

    } catch (err) {
      console.error('Login error:', err);
      alert('An unexpected error occurred: ' + (err.message || err));
      btn.textContent = originalText;
      btn.disabled = false;
    }
  });
}

// Local demo login (uses `js/store.js` seeded users). Useful when running the app
// without Supabase or for quick local demos. Returns an object similar to other
// login helpers: { ok: true, user } or { ok: false, error }
export function loginLocal(email, password) {
  try {
    const user = Store.login(email, password);
    if (!user) return { ok: false, error: 'Invalid local demo credentials' };

    // Persist session like other flows expect
    localStorage.setItem('lumionHR_current_user_id', user.id);
    localStorage.setItem('isLoggedIn', 'true');
    localStorage.setItem('lumion_user', JSON.stringify({ id: user.id, email: user.email, name: user.name, role: user.role }));

    const target = user.role === 'admin' ? 'hris-dashboard-admin.html' : 'user-dashboard.html';
    window.location.href = target;
    return { ok: true, user };
  } catch (err) {
    return { ok: false, error: err && err.message ? err.message : 'local_login_failed' };
  }
}
