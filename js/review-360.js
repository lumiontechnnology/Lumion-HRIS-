import { Store } from './store.js';

const params = new URLSearchParams(location.search);
const cycleId = params.get('cycle');
const subjectId = Number(params.get('subject'));
const role = params.get('role') || 'peer';

const meta = document.getElementById('rev-meta');
const rOverall = document.getElementById('r-overall');
const rComments = document.getElementById('r-comments');
const btn = document.getElementById('btn-submit');

function init(){
  const s = Store.getState();
  const subj = (s.users||[]).find(u=>u.id===subjectId);
  meta.innerText = `${role} review for ${subj?.name||'Employee'} • Cycle ${cycleId}`;
}

btn.addEventListener('click', ()=>{
  const me = Store.getState().users?.[0]?.id || 1;
  const ratings = { __overall: Number(rOverall.value) };
  const comments = rComments.value || '';
  Store.submitFeedback({ cycleId, subjectId, raterId: me, role, ratings, comments });
  btn.disabled = true;
  btn.innerText = 'Submitted';
  setTimeout(()=>{ window.location.href = 'performance-dashboard.html#appraisal'; }, 900);
});

init();