import { Store } from './store.js';

export class BalancedScorecard {
  constructor({ userId }){
    this.userId = userId;
    this.qSel = document.getElementById('bsc-quarter');
    this.pSel = document.getElementById('bsc-perspective');
    this.dSel = document.getElementById('bsc-dept');
    this.tSel = document.getElementById('bsc-theme');
    this.addBtn = document.getElementById('bsc-add');
    this.tblBody = document.getElementById('bsc-matrix-body');
    this.overview = document.getElementById('bsc-overview');
  }
  initialize(){
    this.setupEventListeners();
    this.render();
  }
  setupEventListeners(){
    if (this.qSel) this.qSel.addEventListener('change', ()=> this.render());
    if (this.pSel) this.pSel.addEventListener('change', ()=> this.render());
    if (this.dSel) this.dSel.addEventListener('change', ()=> this.render());
    if (this.tSel) this.tSel.addEventListener('change', ()=> this.render());
    if (this.addBtn) this.addBtn.addEventListener('click', ()=>{
      const perspective = this.pSel && this.pSel.value !== 'all' ? this.pSel.value : 'financial';
      const theme = this.tSel && this.tSel.value !== 'all' ? this.tSel.value : 'growth';
      const department = this.dSel && this.dSel.value !== 'all' ? this.dSel.value : (Store.getEmployeeForUser(this.userId)?.department || 'Admin');
      const objective = 'New Strategic Objective';
      const id = Store.addBSCObjective({ userId: this.userId, department, perspective, objective, kpis:['KPI'], target: 1, actual: 0, status: 'not_started', initiative: 'Initiative', theme });
      this.render();
    });
  }
  render(){
    const all = Store.getBSCObjectives(this.userId);
    let list = all.slice();
    const p = this.pSel?.value || 'all';
    const d = this.dSel?.value || 'all';
    const t = this.tSel?.value || 'all';
    if (p !== 'all') list = list.filter(x => x.perspective === p);
    if (d !== 'all') list = list.filter(x => (x.department||'') === d);
    if (t !== 'all') list = list.filter(x => (x.theme||'') === t);
    this.renderOverview(list);
    this.renderBSCMatrix(list);
  }
  renderOverview(list){
    if (!this.overview) return;
    const by = { financial: [], customer: [], process: [], learning: [] };
    list.forEach(o=>{ const tgt = Number(o.target)||0; const act = Number(o.actual)||0; const pct = tgt>0 ? Math.round(Math.min(120,(act/tgt)*100)) : 0; by[o.perspective]?.push(pct); });
    const avg = arr => arr.length ? Math.round(arr.reduce((a,b)=>a+b,0)/arr.length) : 0;
    const cards = [
      { key:'financial', label:'Financial', cls:'pers-fin' },
      { key:'customer', label:'Customer', cls:'pers-cust' },
      { key:'process', label:'Internal Processes', cls:'pers-proc' },
      { key:'learning', label:'Learning & Growth', cls:'pers-learn' }
    ];
    this.overview.innerHTML = cards.map(c => `<div class="card" style="padding:12px; min-width:220px;">
      <div class="pill ${c.cls}">${c.label}</div>
      <div style="font-size:24px; font-weight:700; margin-top:6px;">${avg(by[c.key])}%</div>
      <div class="muted">Perspective score</div>
    </div>`).join('');
  }
  renderBSCMatrix(list){
    if (!this.tblBody) return;
    const mapCls = p => p==='financial'?'pers-fin':p==='customer'?'pers-cust':p==='process'?'pers-proc':'pers-learn';
    const mapStatus = s => s==='on_track'?'status-on':s==='at_risk'?'status-risk':s==='off_track'?'status-off':'status-done';
    this.tblBody.innerHTML = '';
    list.forEach(o => {
      const tr = document.createElement('tr');
      const kp = (o.kpis||[]).join(', ');
      const st = o.status||'in_progress';
      tr.innerHTML = `
        <td><span class="pill ${mapCls(o.perspective)}">${o.perspective}</span></td>
        <td>${o.objective||''}</td>
        <td>${kp}</td>
        <td>${o.target ?? ''}</td>
        <td>${o.actual ?? ''}</td>
        <td><span class="pill ${mapStatus(st)}">${this.statusLabel(st)}</span></td>
        <td>${o.initiative||''}</td>
      `;
      this.tblBody.appendChild(tr);
    });
  }
  statusLabel(s){
    if (s==='on_track') return 'On Track';
    if (s==='at_risk') return 'At Risk';
    if (s==='off_track') return 'Off Track';
    if (s==='completed') return 'Completed';
    if (s==='not_started') return 'Not Started';
    return s;
  }
}

export class AdminBalancedScorecard {
  constructor(){
    this.qSel = document.getElementById('absc-quarter');
    this.pSel = document.getElementById('absc-perspective');
    this.tSel = document.getElementById('absc-theme');
    this.deptSel = document.getElementById('f-dept'); // reuse global dept filter
    this.tblBody = document.getElementById('absc-matrix');
  }
  initialize(){
    ['change','input'].forEach(ev=>{
      if (this.qSel) this.qSel.addEventListener(ev, ()=> this.render());
      if (this.pSel) this.pSel.addEventListener(ev, ()=> this.render());
      if (this.tSel) this.tSel.addEventListener(ev, ()=> this.render());
      if (this.deptSel) this.deptSel.addEventListener(ev, ()=> this.render());
    });
    this.render();
  }
  render(){
    let list = Store.getAllBSCObjectives().slice();
    const p = this.pSel?.value || 'all';
    const d = this.deptSel?.value || 'All';
    const t = this.tSel?.value || 'all';
    if (p !== 'all') list = list.filter(x => x.perspective === p);
    if (d !== 'All') list = list.filter(x => (x.department||'') === d);
    if (t !== 'all') list = list.filter(x => (x.theme||'') === t);
    this.renderOverview(list);
    this.renderMatrix(list);
  }
  renderOverview(list){
    const by = { financial: [], customer: [], process: [], learning: [] };
    list.forEach(o=>{ const tgt = Number(o.target)||0; const act = Number(o.actual)||0; const pct = tgt>0 ? Math.round(Math.min(120,(act/tgt)*100)) : 0; by[o.perspective]?.push(pct); });
    const avg = arr => arr.length ? Math.round(arr.reduce((a,b)=>a+b,0)/arr.length) : 0;
    const set = (id,val)=>{ const el = document.getElementById(id); if (el) el.innerText = `${val}%`; };
    set('absc-fin', avg(by.financial)); set('absc-cust', avg(by.customer)); set('absc-proc', avg(by.process)); set('absc-learn', avg(by.learning));
  }
  renderMatrix(list){
    if (!this.tblBody) return;
    const mapCls = p => p==='financial'?'bg-emerald-100 text-emerald-800':p==='customer'?'bg-violet-100 text-violet-800':p==='process'?'bg-orange-100 text-orange-800':'bg-red-100 text-red-800';
    const mapStatus = s => s==='on_track'?['bg-green-100','text-green-800'] : s==='at_risk'?['bg-yellow-100','text-yellow-800'] : s==='off_track'?['bg-red-100','text-red-800'] : ['bg-gray-100','text-gray-800'];
    this.tblBody.innerHTML = '';
    list.forEach(o => {
      const tr = document.createElement('tr');
      const kp = (o.kpis||[]).join(', ');
      const st = o.status||'in_progress';
      const [stBg, stText] = mapStatus(st);
      tr.innerHTML = `
        <td class="p-2"><span class="pill ${mapCls(o.perspective)}">${o.perspective}</span></td>
        <td class="p-2">${o.objective||''}</td>
        <td class="p-2">${kp}</td>
        <td class="p-2">${o.target ?? ''}</td>
        <td class="p-2">${o.actual ?? ''}</td>
        <td class="p-2"><span class="pill ${stBg} ${stText}">${this.statusLabel(st)}</span></td>
        <td class="p-2">${o.initiative||''}</td>
        <td class="p-2">${o.department||''}</td>
      `;
      this.tblBody.appendChild(tr);
    });
  }
  statusLabel(s){
    if (s==='on_track') return 'On Track';
    if (s==='at_risk') return 'At Risk';
    if (s==='off_track') return 'Off Track';
    if (s==='completed') return 'Completed';
    if (s==='not_started') return 'Not Started';
    return s;
  }
}