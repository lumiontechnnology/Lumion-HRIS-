// Performance dashboard logic: KPI setup and 360 appraisal
import { Store } from './store.js';
(function () {
  const current = Store.currentUser();
  if (!current) {
    window.location.href = 'login.html?next=performance-dashboard.html';
    return;
  }
  const qs = new URLSearchParams(window.location.search);
  const viewUserId = qs.get('userId');
  const subjectUserId = (viewUserId && current.role === 'admin') ? viewUserId : current.id;
  const employee = Store.getEmployeeForUser(subjectUserId);

  const el = sel => document.querySelector(sel);
  const els = sel => Array.from(document.querySelectorAll(sel));

  // UI Elements
  const tabKpi = el('#tab-kpi');
  const tabAp = el('#tab-appraisal');
  const sectionKpi = el('#section-kpi');
  const sectionAp = el('#section-appraisal');
  const kpiRows = el('#kpi-rows');
  const kpiDeptTip = el('#kpi-dept-tip');
  const kpiSaveAll = el('#kpi-save-all');
  const kpiAdd = el('#kpi-add');
  const perfUserSubtitle = el('#perf-user-subtitle');

  const periodSel = el('#ap-period');
  const selfList = el('#self-kpi-list');
  const selfComments = el('#self-comments');
  const selfSubmit = el('#self-submit');
  const peerList = el('#peer-list');
  const peerName = el('#peer-name');
  const peerEmail = el('#peer-email');
  const peerRating = el('#peer-rating');
  const peerComment = el('#peer-comment');
  const peerAdd = el('#peer-add');

  // Manager feedback & history elements
  const mgrNameEl = el('#mgr-name');
  const mgrOverallEl = el('#mgr-overall');
  const mgrCommentsEl = el('#mgr-comments');
  const mgrSaveBtn = el('#mgr-save');
  const apFinalizeBtn = el('#ap-finalize');
  const apHistoryEl = el('#ap-history');

  // Subtitle
  const viewingNote = (viewUserId && current.role==='admin') ? ` (viewing)` : '';
  perfUserSubtitle.textContent = `${employee?.name || current.name}${viewingNote} • ${employee?.department || current.role}`;

  // Tab handling
  function activateTab(which) {
    const kActive = which === 'kpi';
    tabKpi.classList.toggle('active', kActive);
    tabAp.classList.toggle('active', !kActive);
    sectionKpi.style.display = kActive ? '' : 'none';
    sectionAp.style.display = kActive ? 'none' : '';
    if (!kActive) renderAppraisal();
  }
  function syncFromHash() {
    const hash = (window.location.hash || '').replace('#', '');
    activateTab(hash === 'appraisal' ? 'appraisal' : 'kpi');
  }
  window.addEventListener('hashchange', syncFromHash);
  tabKpi.addEventListener('click', () => { window.location.hash = 'kpi'; });
  tabAp.addEventListener('click', () => { window.location.hash = 'appraisal'; });

  // KPI rendering
  function renderKpis() {
    const kpis = Store.getUserKpis(subjectUserId);
    const tmpl = Store.getKpiTemplateForUser(subjectUserId);
    kpiDeptTip.textContent = `Department: ${employee?.department || 'Admin'} • Template size: ${tmpl.length}`;
    kpiRows.innerHTML = '';
    kpis.forEach(k => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td><input type="text" data-k="title" value="${k.title}" /></td>
        <td><span class="pill">${k.kra || 'General'}</span></td>
        <td><span class="pill">${k.unit || ''}</span></td>
        <td><input type="number" data-k="weight" min="0" max="100" value="${k.weight}" /></td>
        <td><input type="number" data-k="target" value="${k.target}" /></td>
        <td><input type="number" data-k="actual" value="${k.actual || 0}" /></td>
        <td class="actions">
          <button class="btn secondary" data-act="save" data-id="${k.id}">Save</button>
          <button class="btn ghost" data-act="del" data-id="${k.id}">Delete</button>
        </td>`;
      kpiRows.appendChild(tr);
    });
  }

  function collectRowData(tr) {
    const [titleI, kraSpan, unitSpan, weightI, targetI, actualI] = tr.children;
    return {
      title: titleI.querySelector('input').value.trim(),
      weight: Number(weightI.querySelector('input').value || 0),
      target: Number(targetI.querySelector('input').value || 0),
      actual: Number(actualI.querySelector('input').value || 0)
    };
  }

  kpiRows.addEventListener('click', (e) => {
    const btn = e.target.closest('button');
    if (!btn) return;
    const id = btn.getAttribute('data-id');
    const act = btn.getAttribute('data-act');
    const tr = btn.closest('tr');
    if (act === 'save') {
      const upd = collectRowData(tr);
      Store.upsertUserKpi(subjectUserId, { id, ...upd });
    } else if (act === 'del') {
      Store.deleteUserKpi(subjectUserId, id);
      renderKpis();
    }
  });

  kpiSaveAll.addEventListener('click', () => {
    els('#kpi-rows tr').forEach(tr => {
      const idx = Array.from(tr.parentElement.children).indexOf(tr);
      const kpi = Store.getUserKpis(subjectUserId)[idx];
      const upd = collectRowData(tr);
      Store.upsertUserKpi(subjectUserId, { id: kpi.id, ...upd });
    });
    // Re-render to reflect persisted values and give quick feedback
    renderKpis();
    try {
      kpiSaveAll.disabled = true;
      const prev = kpiSaveAll.textContent;
      kpiSaveAll.textContent = 'Saved';
      setTimeout(()=>{ kpiSaveAll.textContent = prev; kpiSaveAll.disabled = false; }, 900);
    } catch {}
  });

  kpiAdd.addEventListener('click', () => {
    const id = `kpi-custom-${Date.now()}`;
    Store.upsertUserKpi(subjectUserId, { id, title: 'New KPI', unit: 'count', weight: 10, target: 1, actual: 0 });
    renderKpis();
  });

  // 360 Appraisal
  function renderAppraisal() {
    const period = periodSel.value;
    const kpis = Store.getUserKpis(subjectUserId);
    const ap = Store.getOrStartAppraisal(subjectUserId, period);
    const mgrUser = Store.getManagerForUser(subjectUserId);
    mgrNameEl.textContent = mgrUser?.name || employee?.manager || 'Manager';
    // Self list
    selfList.innerHTML = '';
    kpis.forEach(k => {
      const wrap = document.createElement('div');
      wrap.className = 'card';
      const rating = ap.self.ratings?.[k.id] ?? '';
      wrap.innerHTML = `
        <div style="display:flex; align-items:center; justify-content:space-between; gap:8px;">
          <div>
            <div><strong>${k.title}</strong> <span class="pill">${k.weight}%</span></div>
            <div class="muted">KRA: ${k.kra || 'General'} • Target: ${k.target} ${k.unit || ''} • Actual: ${k.actual || 0}</div>
          </div>
          <div style="min-width:160px;">
            <select data-kpi="${k.id}" class="self-rate">
              <option value="">Self rating (1-5)</option>
              ${[1,2,3,4,5].map(n => `<option value="${n}" ${String(rating)===String(n)?'selected':''}>${n}</option>`).join('')}
            </select>
          </div>
        </div>`;
      selfList.appendChild(wrap);
    });

    // Comments
    selfComments.value = ap.self.comments || '';

    // Peers
    peerList.innerHTML = '';
    if (ap.peers.length === 0) {
      const p = document.createElement('div');
      p.className = 'muted';
      p.textContent = 'No peer feedback yet.';
      peerList.appendChild(p);
    } else {
      ap.peers.forEach(p => {
        const card = document.createElement('div');
        card.className = 'card';
        card.innerHTML = `<strong>${p.name}</strong> <span class="muted">${p.email}</span> • Rating: <span class="pill">${p.rating || '-'}</span><div style="margin-top:6px;">${p.comment || ''}</div>`;
        peerList.appendChild(card);
      });
    }

    // Manager feedback current period
    const overallRating = ap.manager?.ratings?.['__overall'] ?? '';
    mgrOverallEl.value = overallRating ? String(overallRating) : '';
    mgrCommentsEl.value = ap.manager?.comments || '';

    // Summary for current period
    const summary = Store.computeAndSaveAppraisalSummary(subjectUserId, period);
    const sumEl = el('#ap-summary');
    if (sumEl) {
      sumEl.innerHTML = `
        <div class="pill">Overall: ${summary?.overall ?? '—'}%</div>
        <div class="pill">KPI: ${summary?.kpiScore ?? '—'}%</div>
        <div class="pill">Self: ${summary?.selfScore ?? '—'}%</div>
        <div class="pill">Mgr: ${summary?.managerScore ?? '—'}%</div>
      `;
    }

    // Lock controls if finalized
    const finalized = ap.status === 'completed';
    els('select.self-rate').forEach(s => s.disabled = finalized);
    selfComments.disabled = finalized;
    peerName.disabled = finalized; peerEmail.disabled = finalized; peerRating.disabled = finalized; peerComment.disabled = finalized; peerAdd.disabled = finalized;
    mgrOverallEl.disabled = finalized; mgrCommentsEl.disabled = finalized; mgrSaveBtn.disabled = finalized;
    apFinalizeBtn.disabled = finalized;

    // History list
    renderHistory();
  }

  periodSel.addEventListener('change', renderAppraisal);

  selfSubmit.addEventListener('click', () => {
    const period = periodSel.value;
    const ratings = {};
    els('select.self-rate').forEach(s => {
      const val = s.value ? Number(s.value) : null;
      if (val) ratings[s.getAttribute('data-kpi')] = val;
    });
    Store.updateSelfReview(subjectUserId, period, { ratings, comments: selfComments.value || '' });
    try { const prev = selfSubmit.textContent; selfSubmit.textContent = 'Saved'; selfSubmit.disabled = true; setTimeout(()=>{ selfSubmit.textContent = prev; selfSubmit.disabled = false; }, 900); } catch {}
    renderAppraisal();
  });

  peerAdd.addEventListener('click', () => {
    const period = periodSel.value;
    if (!peerName.value || !peerEmail.value || !peerRating.value) return;
    Store.addPeerFeedback(subjectUserId, period, {
      name: peerName.value.trim(),
      email: peerEmail.value.trim(),
      rating: Number(peerRating.value),
      comment: peerComment.value.trim()
    });
    peerName.value = '';
    peerEmail.value = '';
    peerRating.value = '';
    peerComment.value = '';
    renderAppraisal();
  });

  // Manager save/finalize
  mgrSaveBtn.addEventListener('click', () => {
    const period = periodSel.value;
    const rating = mgrOverallEl.value ? Number(mgrOverallEl.value) : null;
    const mgrUser = Store.getManagerForUser(subjectUserId);
    Store.updateManagerReview(subjectUserId, period, mgrUser?.id || null, {
      ratings: rating ? { '__overall': rating } : {},
      comments: mgrCommentsEl.value || ''
    });
    Store.computeAndSaveAppraisalSummary(subjectUserId, period);
    try { const prev = mgrSaveBtn.textContent; mgrSaveBtn.textContent = 'Saved'; mgrSaveBtn.disabled = true; setTimeout(()=>{ mgrSaveBtn.textContent = prev; mgrSaveBtn.disabled = false; }, 900); } catch {}
    renderAppraisal();
  });
  apFinalizeBtn.addEventListener('click', () => {
    const period = periodSel.value;
    Store.finalizeAppraisal(subjectUserId, period);
    Store.computeAndSaveAppraisalSummary(subjectUserId, period);
    try { const prev = apFinalizeBtn.textContent; apFinalizeBtn.textContent = 'Finalized'; apFinalizeBtn.disabled = true; setTimeout(()=>{ apFinalizeBtn.textContent = prev; }, 900); } catch {}
    renderAppraisal();
  });

  function renderHistory() {
    const list = Store.getAppraisals(subjectUserId);
    apHistoryEl.innerHTML = '';
    if (list.length === 0) {
      const p = document.createElement('div');
      p.className = 'muted';
      p.textContent = 'No past appraisals found.';
      apHistoryEl.appendChild(p);
      return;
    }
    list.forEach(ap => {
      const sum = Store.computeAndSaveAppraisalSummary(subjectUserId, ap.period);
      const row = document.createElement('div');
      row.className = 'card';
      row.innerHTML = `
        <div style="display:flex; align-items:center; justify-content:space-between; gap:8px;">
          <div>
            <div><strong>${ap.period}</strong> <span class="pill">${ap.status}</span></div>
            <div class="muted">Manager notes: ${ap.manager?.comments ? ap.manager.comments : '—'}</div>
          </div>
          <div style="display:flex; gap:12px;">
            <div class="pill">Overall: ${sum?.overall ?? '—'}%</div>
            <div class="pill">KPI: ${sum?.kpiScore ?? '—'}%</div>
            <div class="pill">Self: ${sum?.selfScore ?? '—'}%</div>
            <div class="pill">Mgr: ${sum?.managerScore ?? '—'}%</div>
          </div>
        </div>`;
      apHistoryEl.appendChild(row);
    });
  }

  // Seed past appraisals to make history visible
  function seedPastAppraisals() {
    const existing = Store.getAppraisals(subjectUserId);
    if (existing.length >= 3) return; // already seeded
    const periods = ['Q1-2025','Q2-2025','Q3-2025'];
    periods.forEach((p, idx) => {
      const ap = Store.getOrStartAppraisal(subjectUserId, p);
      // simple self ratings
      const kpis = Store.getUserKpis(subjectUserId);
      const ratings = {};
      kpis.forEach(k => { ratings[k.id] = Math.min(5, 3 + Math.floor(Math.random()*3)); });
      Store.updateSelfReview(subjectUserId, p, { ratings, comments: idx===0 ? 'Improved delivery and quality.' : idx===1 ? 'Solid quarter, more conversions needed.' : 'Strong compliance and throughput.' });
      // manager overall
      const mgrUser = Store.getManagerForUser(subjectUserId);
      const mRating = 3 + Math.floor(Math.random()*2);
      Store.updateManagerReview(subjectUserId, p, mgrUser?.id || null, { ratings: { '__overall': mRating }, comments: 'Consistent performance; keep focus on key KRAs.' });
      Store.finalizeAppraisal(subjectUserId, p);
      Store.computeAndSaveAppraisalSummary(subjectUserId, p);
    });
  }

  // Init
  renderKpis();
  syncFromHash();
  // Make sure history exists
  seedPastAppraisals();
})();