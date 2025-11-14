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
})();