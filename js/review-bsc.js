import { Store } from './store.js';

const params = new URLSearchParams(location.search);
const cycleId = params.get('cycle');
const subjectId = Number(params.get('subject'));
const role = params.get('role') || 'subject';

const meta = document.getElementById('rev-meta');
const list = document.getElementById('obj-list');
const btn = document.getElementById('btn-submit');

function renderObjectives(objs){
  if (!list) return;
  list.innerHTML = objs.map(o => {
    const rid = `rate_${o.id}`;
    const cid = `comm_${o.id}`;
    const title = `${o.objective}`;
    const pers = o.perspective || '—';
    const kpis = Array.isArray(o.kpis) ? o.kpis.join(', ') : '';
    return `<div class="card p-3">
      <div class="text-sm text-gray-600">${pers.charAt(0).toUpperCase()+pers.slice(1)}</div>
      <div class="font-semibold">${title}</div>
      <div class="tiny text-gray-500">KPIs: ${kpis}</div>
      <div class="grid grid-cols-1 gap-2 mt-2">
        <div>
          <label class="tiny text-gray-600">Rating (1-5)</label>
          <select id="${rid}" class="border rounded p-2 w-full">
            <option>1</option><option>2</option><option>3</option><option>4</option><option selected>5</option>
          </select>
        </div>
        <div>
          <label class="tiny text-gray-600">Comments</label>
          <textarea id="${cid}" rows="3" class="border rounded p-2 w-full" placeholder="Notes"></textarea>
        </div>
      </div>
    </div>`;
  }).join('');
}

function init(){
  const s = Store.getState();
  const subj = (s.users||[]).find(u=>u.id===subjectId);
  const cycle = (s.cycles||[]).find(c=>String(c.id)===String(cycleId));
  const period = cycle?.period || '—';
  meta.innerText = `${role} BSC review for ${subj?.name||'Employee'} • Cycle ${cycleId} (${period})`;
  const objs = Store.getBSCObjectives(subjectId) || [];
  renderObjectives(objs);
}

btn.addEventListener('click', ()=>{
  const s = Store.getState();
  const me = (Store.currentUser && Store.currentUser()?.id) || s.users?.[0]?.id || 1;
  const cycle = (s.cycles||[]).find(c=>String(c.id)===String(cycleId));
  const period = cycle?.period || '—';
  const objs = Store.getBSCObjectives(subjectId) || [];
  const ratingsByObjective = {};
  objs.forEach(o => {
    const rEl = document.getElementById(`rate_${o.id}`);
    const cEl = document.getElementById(`comm_${o.id}`);
    const rating = Number(rEl?.value || 0);
    const comment = cEl?.value || '';
    ratingsByObjective[o.id] = { role, rating, comment };
  });
  Store.submitBSC({ cycleId, subjectId, raterId: me, period, ratingsByObjective });
  btn.disabled = true;
  btn.innerText = 'Submitted';
  setTimeout(()=>{ window.location.href = 'performance-dashboard.html#bsc'; }, 900);
});

init();