(function(){
  var cfg = window.__env__ || {};
  var api = cfg.API_URL;
  if(api){
    window.loadRemoteState = async function(){
      try{
        var r = await fetch(api + '/api/state?key=lumion_jobs_state');
        if(!r.ok) return null;
        var j = await r.json();
        return j && j.payload ? j.payload : null;
      }catch(e){ return null; }
    };
    window.saveRemoteState = async function(state){
      try{
        await fetch(api + '/api/state', { method:'PUT', headers:{ 'Content-Type':'application/json' }, body: JSON.stringify({ key:'lumion_jobs_state', payload: state }) });
      }catch(e){}
    };
    window.saveRoleTest = async function(result){
      try{
        await fetch(api + '/api/role-tests', { method:'POST', headers:{ 'Content-Type':'application/json' }, body: JSON.stringify(result) });
      }catch(e){}
    };
    window.saveJob = async function(job){
      try{
        await fetch(api + '/api/jobs', { method:'POST', headers:{ 'Content-Type':'application/json' }, body: JSON.stringify({ job }) });
      }catch(e){}
    };
    window.saveEmployee = async function(emp){
      try{
        await fetch(api + '/api/employees', { method:'POST', headers:{ 'Content-Type':'application/json' }, body: JSON.stringify(emp) });
      }catch(e){}
    };
    window.loadJobsList = async function(){
      try{
        const r = await fetch(api + '/api/jobs');
        if(!r.ok) return [];
        return await r.json();
      }catch(e){ return []; }
    };
    window.loadEmployeesList = async function(){
      try{
        const r = await fetch(api + '/api/employees');
        if(!r.ok) return [];
        return await r.json();
      }catch(e){ return []; }
    };
    window.updateEmployee = async function(employeeId, patch){
      try{
        const r = await fetch(api + '/api/employees/' + encodeURIComponent(employeeId), { method:'PUT', headers:{ 'Content-Type':'application/json' }, body: JSON.stringify(patch||{}) });
        return r.ok;
      }catch(e){ return false; }
    };
    window.savePerformance = async function(p){
      try{
        const r = await fetch(api + '/api/performance', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(p) });
        return r.ok;
      }catch(e){ return false; }
    };
    window.loadPerformance = async function(employeeId, year, quarter){
      try{
        var url = api + '/api/performance';
        var qs = [];
        if(employeeId) qs.push('employee_id=' + encodeURIComponent(employeeId));
        if(year) qs.push('year=' + encodeURIComponent(year));
        if(quarter) qs.push('quarter=' + encodeURIComponent(quarter));
        if(qs.length) url += ('?' + qs.join('&'));
        const r = await fetch(url);
        if(!r.ok) return [];
        return await r.json();
      }catch(e){ return []; }
    };
    return;
  }

  var url = cfg.SUPABASE_URL;
  var key = cfg.SUPABASE_ANON_KEY;
  if(!url || !key || typeof supabase === 'undefined') return;
  var client = supabase.createClient(url, key);
  window.supabaseClient = client;
  window.loadRemoteState = async function(){
    try{
      var r = await client.from('states').select('key,payload').eq('key','lumion_jobs_state').limit(1).maybeSingle();
      if(r.error) return null;
      return r.data && r.data.payload ? r.data.payload : null;
    }catch(e){ return null; }
  };
  window.saveRemoteState = async function(state){
    try{
      await client.from('states').upsert({ key:'lumion_jobs_state', payload: state }, { onConflict: 'key' });
    }catch(e){}
  };
  window.saveRoleTest = async function(result){
    try{
      await client.from('role_tests').insert({
        job_id: result.job && result.job.id ? result.job.id : null,
        job_title: result.job && result.job.title ? result.job.title : null,
        score: result.score || 0,
        mcq_score: result.mcqScore || 0,
        answers: result.answers || {},
        ts: result.ts || Date.now()
      });
    }catch(e){}
  };
  window.saveJob = async function(job){
    try{
      await client.from('jobs').upsert({
        job_id: job.id,
        title: job.title || null,
        location: job.location || null,
        type: job.type || null,
        openings: job.openings || 0,
        team: job.team || null,
        description: job.description || null
      }, { onConflict: 'job_id' });
    }catch(e){}
  };
  window.saveEmployee = async function(emp){
    try{
      await client.from('employees').insert({
        employee_id: emp.employee_id || null,
        name: emp.name || null,
        job_id: emp.job_id || null,
        job_title: emp.job_title || null,
        status: emp.status || null,
        notes: emp.notes || null,
        years: emp.years || 0,
        skills: emp.skills || [],
        certs: emp.certs || [],
        source_company: emp.source_company || null
      });
    }catch(e){}
  };
  window.loadJobsList = async function(){
    try{
      const r = await client.from('jobs').select('*').order('created_at', { ascending: false });
      if(r.error) return [];
      return r.data || [];
    }catch(e){ return []; }
  };
  window.loadEmployeesList = async function(){
    try{
      const r = await client.from('employees').select('*').order('created_at', { ascending: false });
      if(r.error) return [];
      return r.data || [];
    }catch(e){ return []; }
  };
  window.updateEmployee = async function(employeeId, patch){
    try{
      const r = await client.from('employees').update(patch||{}).eq('employee_id', employeeId);
      return !r.error;
    }catch(e){ return false; }
  };
  window.savePerformance = async function(p){
    try{
      const r = await client.from('employee_performance').upsert({
        employee_id: p.employee_id,
        year: p.year,
        quarter: p.quarter,
        kpi_score: p.kpi_score||0,
        projects_completed: p.projects_completed||0,
        attendance_pct: p.attendance_pct||0,
        bonus_awarded: p.bonus_awarded||0,
        notes: p.notes||null
      }, { onConflict: 'employee_id,year,quarter' });
      return !r.error;
    }catch(e){ return false; }
  };
  window.loadPerformance = async function(employeeId, year, quarter){
    try{
      let q = client.from('employee_performance').select('*');
      if(employeeId) q = q.eq('employee_id', employeeId);
      if(year) q = q.eq('year', year);
      if(quarter) q = q.eq('quarter', quarter);
      const r = await q.order('year', { ascending: false }).order('quarter', { ascending: false });
      if(r.error) return [];
      return r.data || [];
    }catch(e){ return []; }
  };
})();