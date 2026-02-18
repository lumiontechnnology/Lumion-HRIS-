import { auth, db } from './firebase.js';

const fsMod = await import('https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js');

export async function getUserProfile(uid){
  const ref = fsMod.doc(db, 'users', uid);
  const snap = await fsMod.getDoc(ref);
  return snap.exists() ? snap.data() : null;
}

export async function updateUserProfile(uid, data){
  const ref = fsMod.doc(db, 'users', uid);
  await fsMod.setDoc(ref, data, { merge: true });
}

export async function setUserPreferences(uid, preferences){
  await updateUserProfile(uid, { preferences });
}

export async function getCurrentUserProfile(){
  const u = auth.currentUser;
  if (!u) return null;
  return await getUserProfile(u.uid);
}

export async function saveUserRole(uid, role){
  const ref = fsMod.doc(db, 'users', uid);
  await fsMod.updateDoc(ref, { role });
}

