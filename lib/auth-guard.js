import { onAuth, getUserProfile } from './auth.js';

export function authGuard(options = {}){
  const {
    allowedRoles = ['employee','admin'],
    loginPath = '/login.html',
    pendingPath = '/pending.html',
    unauthorizedPath = '/unauthorized.html',
    onAuthorized
  } = options;
  return onAuth(async (user)=>{
    if (!user){ location.href = loginPath; return; }
    const profile = await getUserProfile(user.uid);
    if (!profile || !profile.approved){ location.href = pendingPath; return; }
    if (!allowedRoles.includes(profile.role)){ location.href = unauthorizedPath; return; }
    if (typeof onAuthorized === 'function') onAuthorized({ user, profile });
  });
}

export async function ensureAuthorized(options = {}){
  return new Promise((resolve)=>{
    const unsub = authGuard({
      ...options,
      onAuthorized: ({ user, profile })=>{ unsub(); resolve({ user, profile }); }
    });
  });
}

