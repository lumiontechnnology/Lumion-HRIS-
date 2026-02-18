import { auth, db, googleProvider, serverTimestamp } from './firebase.js';
import { getUserProfile } from './user.js';

const authMod = await import('https://www.gstatic.com/firebasejs/10.7.0/firebase-auth.js');
const fsMod = await import('https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js');

export async function signupWithEmail({ email, password, displayName, preferences = {} }) {
  const userCred = await authMod.createUserWithEmailAndPassword(auth, email, password);
  const user = userCred.user;
  const userDocRef = fsMod.doc(db, 'users', user.uid);
  await fsMod.setDoc(userDocRef, {
    uid: user.uid,
    name: displayName || '',
    email,
    role: 'employee',
    approved: false,
    createdAt: serverTimestamp(),
    preferences
  }, { merge: true });
  return user;
}

export async function signinWithEmail({ email, password }) {
  return await authMod.signInWithEmailAndPassword(auth, email, password);
}

export async function signinWithGoogle() {
  const res = await authMod.signInWithPopup(auth, googleProvider);
  const user = res.user;
  const userRef = fsMod.doc(db, 'users', user.uid);
  const snapshot = await fsMod.getDoc(userRef);
  if (!snapshot.exists()) {
    await fsMod.setDoc(userRef, {
      uid: user.uid,
      name: user.displayName || '',
      email: user.email,
      role: 'employee',
      approved: false,
      createdAt: serverTimestamp()
    });
  }
  return user;
}

export function signout() {
  return authMod.signOut(auth);
}

export function onAuth(cb) {
  return authMod.onAuthStateChanged(auth, cb);
}

export { getUserProfile };

export async function signup(email, password, displayName = ''){
  try {
    const userCred = await authMod.createUserWithEmailAndPassword(auth, email, password);
    const user = userCred.user;
    const userDocRef = fsMod.doc(db, 'users', user.uid);
    await fsMod.setDoc(userDocRef, { uid: user.uid, name: displayName || '', email, role: 'employee', approved: false, createdAt: serverTimestamp() }, { merge: true });
    return { ok: true, user };
  } catch (err) {
    return { ok: false, error: err && err.message ? err.message : 'signup_failed' };
  }
}

export async function login(email, password){
  try {
    const userCred = await authMod.signInWithEmailAndPassword(auth, email, password);
    const user = userCred.user;
    let profile = null;
    try {
      const ref = fsMod.doc(db, 'users', user.uid);
      const snap = await fsMod.getDoc(ref);
      profile = snap.exists() ? snap.data() : null;
    } catch {}
    return { ok: true, user, profile };
  } catch (err) {
    return { ok: false, error: err && err.message ? err.message : 'login_failed' };
  }
}
