import { db } from './firebase.js';

const fsMod = await import('https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js');

export async function approveUser(uid, role = 'employee') {
  const ref = fsMod.doc(db, 'users', uid);
  await fsMod.updateDoc(ref, { approved: true, role, approvedAt: new Date().toISOString() });
}

export async function setUserRole(uid, role) {
  const ref = fsMod.doc(db, 'users', uid);
  await fsMod.updateDoc(ref, { role });
}

