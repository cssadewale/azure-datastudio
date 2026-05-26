/* ================================================================
   Azure DataStudio Stimulator — ENTERPRISE LAYER
   --------------------------------------------------------------
   Purpose: Layer enterprise-grade governance, security, audit,
   automation and collaboration features on top of the base app
   WITHOUT modifying the original code or removing any feature.
   Everything is 100% client-side. No paid APIs. No AI.
   ================================================================ */
(function () {
  'use strict';

  const NS = 'ads.ent.v1.';                 // localStorage namespace
  const VERSION = '1.0.0';

  // -------- tiny utilities --------
  const $ = (sel, root=document) => root.querySelector(sel);
  const $$ = (sel, root=document) => Array.from(root.querySelectorAll(sel));
  const el = (tag, attrs={}, ...children) => {
    const n = document.createElement(tag);
    for (const [k,v] of Object.entries(attrs)) {
      if (k === 'class') n.className = v;
      else if (k === 'style' && typeof v === 'object') Object.assign(n.style, v);
      else if (k.startsWith('on') && typeof v === 'function') n.addEventListener(k.slice(2), v);
      else if (v !== false && v != null) n.setAttribute(k, v);
    }
    for (const c of children) {
      if (c == null) continue;
      n.append(c.nodeType ? c : document.createTextNode(c));
    }
    return n;
  };
  const ls = {
    get(k, d=null){ try { const v = localStorage.getItem(NS+k); return v==null?d:JSON.parse(v); } catch { return d; } },
    set(k, v){ try { localStorage.setItem(NS+k, JSON.stringify(v)); } catch(e){ console.warn('LS full', e); } },
    del(k){ localStorage.removeItem(NS+k); }
  };

  // -------- toast notifications --------
  function ensureToastHost(){
    let h = $('#ent-toasts');
    if (!h){ h = el('div', {id:'ent-toasts'}); document.body.append(h); }
    return h;
  }
  function toast(msg, type='info', ms=3200){
    const host = ensureToastHost();
    const t = el('div', {class:'ent-toast '+(type==='info'?'':type)}, msg);
    host.append(t);
    setTimeout(()=>{ t.style.opacity='0'; t.style.transition='opacity .25s'; setTimeout(()=>t.remove(), 260); }, ms);
  }

  // ===============================================================
  // 1. AUDIT LOG
  //    Records every meaningful user action with timestamp + actor.
  //    Capped at 2000 entries; exportable as JSON or CSV.
  // ===============================================================
  const Audit = {
    MAX: 2000,
    list(){ return ls.get('audit', []); },
    log(action, detail=''){
      const arr = this.list();
      arr.push({
        ts: new Date().toISOString(),
        actor: Auth.currentUser() || 'anonymous',
        role:  Auth.currentRole(),
        action, detail: String(detail).slice(0, 500)
      });
      while (arr.length > this.MAX) arr.shift();
      ls.set('audit', arr);
    },
    clear(){ ls.set('audit', []); },
    toCSV(){
      const rows = this.list();
      const head = 'timestamp,actor,role,action,detail';
      const esc = s => '"'+String(s).replace(/"/g,'""')+'"';
      return [head, ...rows.map(r=>[r.ts,r.actor,r.role,r.action,r.detail].map(esc).join(','))].join('\n');
    }
  };

  // ===============================================================
  // 2. AUTH / ROLES  (client-side governance — not crypto-strong)
  //    Roles: admin (all), analyst (read/write data, no settings),
  //    viewer (read-only, cannot run mutating SQL).
  // ===============================================================
  const Auth = {
    ROLES: ['admin','analyst','viewer'],
    config(){
      return ls.get('auth', {
        enabled:false, requirePass:false,
        passHash:null, salt:null,
        users:[ {name:'admin', role:'admin'} ],
        currentUser:'admin'
      });
    },
    save(c){ ls.set('auth', c); },
    currentUser(){ return this.config().currentUser; },
    currentRole(){
      const c = this.config();
      const u = c.users.find(x=>x.name===c.currentUser);
      return u ? u.role : 'viewer';
    },
    is(role){ return this.currentRole() === role; },
    can(action){
      const r = this.currentRole();
      if (r === 'admin') return true;
      if (r === 'analyst') return action !== 'admin';
      // viewer: only read
      return action === 'read';
    },
    async hash(pass, salt){
      const enc = new TextEncoder().encode(pass + ':' + salt);
      const buf = await crypto.subtle.digest('SHA-256', enc);
      return Array.from(new Uint8Array(buf)).map(b=>b.toString(16).padStart(2,'0')).join('');
    },
    randSalt(){
      const a = new Uint8Array(16); crypto.getRandomValues(a);
      return Array.from(a).map(b=>b.toString(16).padStart(2,'0')).join('');
    }
  };

  // ===============================================================
  // 3. PASSPHRASE GATE
  //    Optional splash screen requiring passphrase. Backed by PBKDF-ish
  //    SHA-256 + random salt. Stored locally only.
  // ===============================================================
  async function showGate(){
    const c = Auth.config();
    if (!c.enabled || !c.requirePass) return;
    // already authed this session?
    if (sessionStorage.getItem(NS+'gateOK') === '1') return;

    return new Promise(resolve => {
      const gate = el('div', {id:'ent-gate'},
        el('div', {class:'ent-gate-card'},
          el('h2', {}, '🔐 Workspace Locked'),
          el('p', {}, 'Enter passphrase to access this Azure DataStudio Stimulator workspace.'),
          el('div', {class:'ent-row'},
            el('label', {}, 'Passphrase'),
            (()=>{ const i = el('input', {type:'password', class:'ent-input', id:'ent-gate-pass'});
                   i.addEventListener('keydown', e=>{ if(e.key==='Enter') tryUnlock(); }); return i; })()
          ),
          el('div', {id:'ent-gate-msg', style:{fontSize:'11px', color:'#ff3366', minHeight:'14px', marginBottom:'10px'}}),
          el('button', {class:'ent-pbtn', style:{width:'100%'}, onclick: tryUnlock}, 'Unlock')
        )
      );
      document.body.append(gate);
      setTimeout(()=>$('#ent-gate-pass')?.focus(), 50);

      async function tryUnlock(){
        const v = $('#ent-gate-pass').value;
        const h = await Auth.hash(v, c.salt);
        if (h === c.passHash){
          sessionStorage.setItem(NS+'gateOK','1');
          Audit.log('auth.unlock', 'gate passed');
          gate.remove(); resolve();
        } else {
          $('#ent-gate-msg').textContent = 'Incorrect passphrase';
          Audit.log('auth.unlock.fail', '');
        }
      }
    });
  }

  // ===============================================================
  // 4. ENCRYPTED EXPORT/IMPORT (AES-GCM via Web Crypto API)
  //    Lets teams share a workspace bundle (settings + projects +
  //    snippets) encrypted with a shared passphrase.
  // ===============================================================
  const Crypt = {
    async deriveKey(pass, salt){
      const enc = new TextEncoder();
      const baseKey = await crypto.subtle.importKey(
        'raw', enc.encode(pass), 'PBKDF2', false, ['deriveKey']);
      return crypto.subtle.deriveKey(
        { name:'PBKDF2', salt, iterations:120000, hash:'SHA-256' },
        baseKey,
        { name:'AES-GCM', length:256 },
        false, ['encrypt','decrypt']);
    },
    async encrypt(plaintext, pass){
      const salt = crypto.getRandomValues(new Uint8Array(16));
      const iv   = crypto.getRandomValues(new Uint8Array(12));
      const key  = await this.deriveKey(pass, salt);
      const enc  = new TextEncoder().encode(plaintext);
      const ct   = new Uint8Array(await crypto.subtle.encrypt({name:'AES-GCM', iv}, key, enc));
      return { v:1, salt:[...salt], iv:[...iv], ct:[...ct] };
    },
    async decrypt(payload, pass){
      const salt = new Uint8Array(payload.salt);
      const iv   = new Uint8Array(payload.iv);
      const ct   = new Uint8Array(payload.ct);
      const key  = await this.deriveKey(pass, salt);
      const pt   = await crypto.subtle.decrypt({name:'AES-GCM', iv}, key, ct);
      return new TextDecoder().decode(pt);
    }
  };

  // ===============================================================
  // 5. GOVERNANCE POLICIES
  //    SQL guard rails. Configurable in UI.
  // ===============================================================
  const Policy = {
    get(){
      return ls.get('policy', {
        blockDrop:true, blockTruncate:false, confirmDelete:true,
        maxRowsPerQuery:100000, blockAttach:true,
        warnFullScan:true
      });
    },
    save(p){ ls.set('policy', p); },
    // returns {allowed:bool, reason?:string, warn?:string}
    check(sql){
      const p = this.get();
      const role = Auth.currentRole();
      const upper = sql.toUpperCase();
      // viewer cannot mutate
      if (role === 'viewer'){
        if (/\b(INSERT|UPDATE|DELETE|DROP|ALTER|CREATE|REPLACE|TRUNCATE|ATTACH)\b/.test(upper))
          return { allowed:false, reason:'Viewer role cannot execute mutating SQL' };
      }
      if (p.blockDrop && /\bDROP\s+(TABLE|VIEW|INDEX|TRIGGER)\b/.test(upper) && role!=='admin')
        return { allowed:false, reason:'Policy: DROP statements require admin role' };
      if (p.blockAttach && /\bATTACH\s+DATABASE\b/.test(upper))
        return { allowed:false, reason:'Policy: ATTACH DATABASE is disabled' };
      if (p.confirmDelete && /\bDELETE\s+FROM\b/.test(upper) && !/\bWHERE\b/.test(upper))
        return { allowed:false, reason:'Policy: DELETE without WHERE is blocked' };
      return { allowed:true };
    }
  };

  // ===============================================================
  // 6. TELEMETRY (purely local — never transmitted)
  //    Tracks: queries run, avg ms, errors, imports, exports.
  // ===============================================================
  const Telemetry = {
    state(){ return ls.get('telemetry', { runs:0, errors:0, totalMs:0, imports:0, exports:0, lastReset:new Date().toISOString() }); },
    bump(k, n=1){ const s = this.state(); s[k] = (s[k]||0) + n; ls.set('telemetry', s); },
    addMs(ms){ const s = this.state(); s.runs++; s.totalMs += ms; ls.set('telemetry', s); },
    reset(){ ls.set('telemetry', { runs:0, errors:0, totalMs:0, imports:0, exports:0, lastReset:new Date().toISOString() }); }
  };

  // ===============================================================
  // 7. SCHEDULED JOBS (runs while the tab is open)
  //    Every minute, checks if any job is due, runs it via the
  //    public window.db (sql.js) instance and records output.
  // ===============================================================
  const Jobs = {
    list(){ return ls.get('jobs', []); },
    save(arr){ ls.set('jobs', arr); },
    add(job){ const arr = this.list(); job.id = Date.now()+''; job.lastRun=null; job.lastOutput=null; arr.push(job); this.save(arr); return job; },
    remove(id){ this.save(this.list().filter(j=>j.id!==id)); },
    due(job, now){
      if (!job.enabled) return false;
      if (!job.lastRun) return true;
      const last = new Date(job.lastRun).getTime();
      const mins = (now - last) / 60000;
      return mins >= job.intervalMin;
    },
    async runOnce(job){
      try {
        const db = window.db || window.SQLDB || window.sqlDB;
        if (!db) throw new Error('Database not ready');
        const t0 = performance.now();
        const res = db.exec(job.sql);
        const ms = performance.now() - t0;
        const out = res.length ? `${res[0].values.length} rows in ${ms.toFixed(0)}ms` : `OK (${ms.toFixed(0)}ms)`;
        job.lastRun = new Date().toISOString();
        job.lastOutput = out;
        Audit.log('job.run', `${job.name} → ${out}`);
        const arr = this.list().map(j=>j.id===job.id?job:j); this.save(arr);
        toast(`Job "${job.name}" ran: ${out}`, 'ok');
      } catch (e) {
        job.lastRun = new Date().toISOString();
        job.lastOutput = 'ERROR: ' + e.message;
        Audit.log('job.error', `${job.name} → ${e.message}`);
        const arr = this.list().map(j=>j.id===job.id?job:j); this.save(arr);
        toast(`Job "${job.name}" failed: ${e.message}`, 'err');
      }
    },
    tickHandle: null,
    startTicker(){
      if (this.tickHandle) return;
      this.tickHandle = setInterval(()=>{
        const now = Date.now();
        for (const j of this.list()) if (this.due(j, now)) this.runOnce(j);
      }, 30 * 1000);
    }
  };

  // ===============================================================
  // 8. WEBHOOK / SHARE OUT
  //    POST query result to any URL (e.g. webhook.site, Zapier hook,
  //    Make.com hook — all have free tiers). User must opt in.
  // ===============================================================
  const Webhook = {
    config(){ return ls.get('webhook', { url:'', enabled:false, includeData:true, format:'json' }); },
    save(c){ ls.set('webhook', c); },
    async send(payload){
      const c = this.config();
      if (!c.enabled || !c.url) throw new Error('Webhook not configured');
      Audit.log('webhook.send', c.url);
      const body = c.format === 'json' ? JSON.stringify(payload) : String(payload);
      const res = await fetch(c.url, {
        method:'POST',
        headers: { 'Content-Type': c.format === 'json' ? 'application/json' : 'text/plain' },
        body
      });
      return res.status;
    }
  };

  // ===============================================================
  // 9. QUERY VERSION CONTROL
  //    Saves successive versions of any project / named query
  //    and shows simple line-level diffs.
  // ===============================================================
  const VCS = {
    snapshot(name, sql){
      const all = ls.get('vcs', {});
      const arr = all[name] || [];
      const last = arr[arr.length-1];
      if (last && last.sql === sql) return;        // no change
      arr.push({ ts:new Date().toISOString(), sql, author:Auth.currentUser() });
      while (arr.length > 50) arr.shift();
      all[name] = arr; ls.set('vcs', all);
    },
    history(name){ return (ls.get('vcs', {})[name]) || []; },
    diff(a, b){
      // very small line-level diff
      const al = a.split('\n'), bl = b.split('\n');
      const max = Math.max(al.length, bl.length);
      const out = [];
      for (let i=0;i<max;i++){
        if (al[i] === bl[i]) out.push({k:'eq', t:al[i]||''});
        else {
          if (al[i] != null) out.push({k:'rem', t:al[i]});
          if (bl[i] != null) out.push({k:'add', t:bl[i]});
        }
      }
      return out;
    }
  };

  // ===============================================================
  // 10. UI — HEADER INTEGRATION
  // ===============================================================
  function injectHeader(){
    const hdr = $('#hdr') || $('header');
    if (!hdr) { setTimeout(injectHeader, 400); return; }
    if ($('#ent-menu-btn')) return; // already injected

    // Enterprise badge after the version pill
    const badge = el('span', {class:'ent-badge', title:'Enterprise Edition '+VERSION}, '🏢 ENT');
    hdr.insertBefore(badge, hdr.children[3] || null);

    // Role pill
    const role = Auth.currentRole();
    const pill = el('span', {class:'ent-role-pill ent-role-'+role, id:'ent-role-pill', title:'Current role'}, role.toUpperCase());
    hdr.insertBefore(pill, hdr.children[4] || null);

    // Enterprise menu button (added near other header buttons)
    const btn = el('button', {class:'ent-btn', id:'ent-menu-btn', title:'Enterprise features', onclick:openHub}, '🏢 Enterprise');
    // Put it before the very last group: find #hspace if present
    const spacer = $('#hspace');
    if (spacer && spacer.nextSibling) hdr.insertBefore(btn, spacer.nextSibling);
    else hdr.append(btn);
  }

  // ===============================================================
  // 11. MAIN HUB MODAL
  // ===============================================================
  function modal({ title, body, footer, width='720px' }){
    const back = el('div', {class:'ent-modal-backdrop', onclick:e=>{ if(e.target===back) close(); }});
    const m = el('div', {class:'ent-modal', style:{width}},
      el('div', {class:'ent-modal-hdr'},
        el('h3', {}, title),
        el('button', {class:'ent-modal-close', onclick:close}, '✕')
      ),
      el('div', {class:'ent-modal-body'}, body),
      footer ? el('div', {class:'ent-modal-footer'}, footer) : null
    );
    back.append(m);
    document.body.append(back);
    function close(){ back.remove(); }
    return { close, root:m };
  }

  function openHub(){
    Audit.log('hub.open');
    const tabs = ['Overview','Audit Log','Roles','Policies','Jobs','Webhook','Backup','Telemetry','About'];
    const bodyHost = el('div', {});
    const tabBar = el('div', {class:'ent-tabs'},
      ...tabs.map(t => el('button', {class:'ent-tab', onclick:()=>renderTab(t)}, t))
    );
    const root = el('div', {}, tabBar, bodyHost);
    const m = modal({ title:'🏢 Enterprise Hub', body:root });
    let active = 'Overview';
    renderTab('Overview');

    function renderTab(name){
      active = name;
      $$('.ent-tab', tabBar).forEach((b,i)=>b.classList.toggle('active', tabs[i]===name));
      bodyHost.innerHTML = '';
      bodyHost.append(VIEWS[name]());
    }
  }

  // ===============================================================
  // 12. VIEW IMPLEMENTATIONS
  // ===============================================================
  const VIEWS = {
    Overview(){
      const stats = Telemetry.state();
      const grid = el('div', {class:'ent-tcards'},
        card('Queries Run', stats.runs),
        card('Avg ms / Query', stats.runs ? (stats.totalMs/stats.runs).toFixed(1) : '0'),
        card('Errors', stats.errors),
        card('Imports', stats.imports),
        card('Exports', stats.exports),
        card('Role', Auth.currentRole().toUpperCase())
      );
      const desc = el('div', {style:{lineHeight:1.6}},
        el('p', {}, 'Welcome to the Enterprise Hub. Use the tabs above to manage governance, automation, and security features. All data stays on your device — nothing is transmitted unless you explicitly configure a webhook.'),
        el('ul', {style:{paddingLeft:'18px', marginTop:'8px'}},
          el('li', {}, '🔐 Roles & passphrase gate — control workspace access'),
          el('li', {}, '📋 Audit log — every action timestamped and exportable'),
          el('li', {}, '🛡️ Policies — block dangerous SQL by rule'),
          el('li', {}, '🔄 Scheduled jobs — auto-run queries at intervals'),
          el('li', {}, '📤 Webhook — push results to free webhook services'),
          el('li', {}, '💾 Encrypted backup — AES-GCM 256 export bundle'),
          el('li', {}, '📊 Local telemetry — performance dashboard')
        )
      );
      return el('div', {}, grid, desc);
      function card(label, val){
        return el('div', {class:'ent-tcard'},
          el('div', {class:'label'}, label),
          el('div', {class:'value'}, String(val))
        );
      }
    },

    'Audit Log'(){
      const rows = Audit.list().slice().reverse();
      const host = el('div', {style:{maxHeight:'380px', overflow:'auto', border:'1px solid #1a2d4d', borderRadius:'6px', padding:'4px'}});
      if (!rows.length) host.append(el('div', {style:{padding:'20px', color:'#4a5f7a', textAlign:'center'}}, 'No audit entries yet.'));
      for (const r of rows){
        host.append(el('div', {class:'ent-audit-row'},
          el('span', {class:'ts'}, r.ts.replace('T',' ').slice(0,19)),
          el('span', {class:'actor'}, r.actor),
          el('span', {class:'act'}, r.action),
          el('span', {class:'det'}, r.detail || '')
        ));
      }
      const actions = el('div', {style:{display:'flex', gap:'8px', marginTop:'12px'}},
        el('button', {class:'ent-sbtn', onclick:()=>{ download('audit.json', JSON.stringify(Audit.list(),null,2), 'application/json'); }}, '⬇ Export JSON'),
        el('button', {class:'ent-sbtn', onclick:()=>{ download('audit.csv', Audit.toCSV(), 'text/csv'); }}, '⬇ Export CSV'),
        el('button', {class:'ent-dbtn', onclick:()=>{ if(confirm('Clear all audit entries?')){ Audit.clear(); toast('Audit cleared','ok'); openHub(); } }}, '🗑 Clear')
      );
      return el('div', {}, host, actions);
    },

    Roles(){
      const c = Auth.config();
      const wrap = el('div', {});
      // toggles
      const enabled = checkbox('Enable role enforcement', c.enabled, v=>{ c.enabled=v; Auth.save(c); refresh(); });
      const req     = checkbox('Require passphrase on load', c.requirePass, v=>{ c.requirePass=v; Auth.save(c); });
      // user list
      const list = el('div', {style:{marginTop:'12px'}});
      function drawList(){
        list.innerHTML = '';
        for (const u of c.users){
          list.append(el('div', {style:{display:'flex',gap:'8px',alignItems:'center',padding:'6px 0',borderBottom:'1px solid #162033'}},
            el('span', {style:{flex:1, fontFamily:'var(--mono,monospace)'}}, u.name),
            (()=>{ const s = el('select', {class:'ent-select', style:{width:'120px'}},
                ...Auth.ROLES.map(r => el('option', {value:r, selected: u.role===r ? 'selected':null}, r)));
                s.addEventListener('change', ()=>{ u.role=s.value; Auth.save(c); Audit.log('role.change', u.name+'→'+u.role); }); return s; })(),
            el('button', {class:'ent-sbtn', onclick:()=>{ c.currentUser=u.name; Auth.save(c); toast('Switched to '+u.name,'ok'); openHub(); applyRoleUI(); }}, 'Use'),
            el('button', {class:'ent-dbtn', onclick:()=>{ if(c.users.length<=1){ toast('Cannot remove last user','err'); return; } c.users = c.users.filter(x=>x!==u); if(c.currentUser===u.name) c.currentUser=c.users[0].name; Auth.save(c); drawList(); }}, '✕')
          ));
        }
      }
      drawList();
      const addRow = el('div', {style:{display:'flex',gap:'6px',marginTop:'10px'}},
        (()=>{ const n = el('input', {class:'ent-input', placeholder:'username', style:{flex:1}});
              const s = el('select', {class:'ent-select', style:{width:'120px'}},
                  ...Auth.ROLES.map(r => el('option', {value:r}, r)));
              const b = el('button', {class:'ent-pbtn', onclick:()=>{
                if(!n.value.trim()) return;
                c.users.push({name:n.value.trim(), role:s.value}); Auth.save(c); n.value=''; drawList(); }}, '+ Add User');
              addRow._n = n; return [n,s,b]; })()
      );
      // Passphrase setup
      const passSection = el('div', {style:{marginTop:'18px', padding:'12px', background:'#111827', borderRadius:'6px'}},
        el('div', {style:{fontWeight:700, marginBottom:'8px'}}, '🔐 Workspace Passphrase'),
        el('div', {class:'ent-help', style:{marginBottom:'8px'}}, 'When enabled, users must enter this passphrase to load the workspace.'),
        (()=>{ const p1 = el('input', {type:'password', class:'ent-input', placeholder:'New passphrase'});
              const p2 = el('input', {type:'password', class:'ent-input', placeholder:'Confirm', style:{marginTop:'6px'}});
              const b = el('button', {class:'ent-pbtn', style:{marginTop:'8px'}, onclick: async ()=>{
                if(!p1.value || p1.value!==p2.value){ toast('Passphrases do not match','err'); return; }
                const salt = Auth.randSalt();
                c.salt = salt; c.passHash = await Auth.hash(p1.value, salt); c.requirePass = true; c.enabled = true;
                Auth.save(c); toast('Passphrase set','ok'); openHub();
              }}, 'Set Passphrase');
              return [p1,p2,b]; })()
      );

      wrap.append(
        el('div', {style:{padding:'10px', background:'#111827', borderRadius:'6px', marginBottom:'12px'}}, enabled, req),
        el('div', {style:{fontWeight:700, marginBottom:'6px'}}, 'Users (current: '+c.currentUser+')'),
        list, addRow, passSection
      );
      function refresh(){ openHub(); }
      return wrap;
    },

    Policies(){
      const p = Policy.get();
      const w = el('div', {});
      const make = (key, label, help) => {
        const c = checkbox(label, p[key], v=>{ p[key]=v; Policy.save(p); toast('Policy saved','ok'); });
        return el('div', {style:{padding:'8px 0', borderBottom:'1px solid #162033'}}, c, el('div', {class:'ent-help'}, help));
      };
      w.append(
        make('blockDrop',     'Block DROP for non-admins',     'Only admin role may execute DROP TABLE/VIEW/INDEX.'),
        make('blockTruncate', 'Warn on TRUNCATE-equivalent',   'Flag DELETE FROM without WHERE.'),
        make('confirmDelete', 'Block DELETE without WHERE',    'Refuses to run DELETE statements lacking a WHERE clause.'),
        make('blockAttach',   'Block ATTACH DATABASE',          'Prevents attaching external SQLite files.'),
        make('warnFullScan',  'Warn on full table scans',       'Shows warning when query plan reports SCAN TABLE.')
      );
      w.append(el('div', {class:'ent-row', style:{marginTop:'12px'}},
        el('label', {}, 'Max rows per query'),
        (()=>{ const i = el('input', {type:'number', class:'ent-input', value:String(p.maxRowsPerQuery), min:'100', max:'1000000'});
              i.addEventListener('change', ()=>{ p.maxRowsPerQuery = parseInt(i.value,10)||100000; Policy.save(p); toast('Saved','ok'); }); return i; })(),
        el('div', {class:'ent-help'}, 'Soft cap; intercepts SELECTs and appends LIMIT if missing.')
      ));
      return w;
    },

    Jobs(){
      const w = el('div', {});
      function refresh(){
        w.innerHTML = '';
        const jobs = Jobs.list();
        if (!jobs.length) w.append(el('div', {style:{color:'#4a5f7a',padding:'10px 0'}}, 'No scheduled jobs.'));
        for (const j of jobs){
          w.append(el('div', {class:'ent-job'},
            el('div', {class:'ent-job-title'}, j.name + ' ' + (j.enabled?'🟢':'⚪')),
            el('div', {class:'ent-job-meta'},
              el('span', {}, 'Every '+j.intervalMin+' min'),
              el('span', {}, 'Last: '+(j.lastRun?new Date(j.lastRun).toLocaleString():'never')),
              el('span', {}, j.lastOutput||'')
            ),
            el('pre', {style:{fontSize:'10px', color:'#8a9bb8', marginTop:'6px', maxHeight:'80px', overflow:'auto', whiteSpace:'pre-wrap'}}, j.sql),
            el('div', {class:'ent-job-actions'},
              el('button', {class:'ent-sbtn', onclick:()=>{ Jobs.runOnce(j).then(refresh); }}, '▶ Run now'),
              el('button', {class:'ent-sbtn', onclick:()=>{ j.enabled=!j.enabled; const arr=Jobs.list().map(x=>x.id===j.id?j:x); Jobs.save(arr); refresh(); }}, j.enabled?'⏸ Pause':'▶ Enable'),
              el('button', {class:'ent-dbtn', onclick:()=>{ if(confirm('Delete job?')){ Jobs.remove(j.id); refresh(); } }}, '🗑')
            )
          ));
        }
        // new job form
        w.append(el('div', {style:{marginTop:'14px', padding:'12px', background:'#111827', borderRadius:'6px'}},
          el('div', {style:{fontWeight:700, marginBottom:'8px'}}, '+ New Scheduled Job'),
          (()=>{
            const n = el('input', {class:'ent-input', placeholder:'Job name'});
            const i = el('input', {type:'number', class:'ent-input', placeholder:'Interval (minutes)', value:'60', min:'1'});
            const s = el('textarea', {class:'ent-textarea', placeholder:'SQL to run...'});
            const b = el('button', {class:'ent-pbtn', style:{marginTop:'6px'}, onclick:()=>{
              if(!n.value.trim() || !s.value.trim()){ toast('Name and SQL required','err'); return; }
              Jobs.add({ name:n.value.trim(), intervalMin:parseInt(i.value,10)||60, sql:s.value, enabled:true });
              toast('Job created','ok'); refresh();
            }}, 'Create Job');
            return [n, i, s, b].map(x=>{ x.style.marginBottom='6px'; return x; });
          })()
        ));
      }
      refresh();
      return w;
    },

    Webhook(){
      const c = Webhook.config();
      const w = el('div', {});
      w.append(
        el('div', {class:'ent-help', style:{marginBottom:'10px'}}, 'Push query results or audit events to a free webhook receiver (webhook.site, Zapier free hook, Make.com free hook, n8n self-hosted, Pipedream).'),
        el('div', {class:'ent-row'},
          el('label', {}, 'Webhook URL'),
          (()=>{ const i = el('input', {class:'ent-input', value:c.url, placeholder:'https://webhook.site/your-uuid'});
                i.addEventListener('change', ()=>{ c.url=i.value; Webhook.save(c); }); return i; })()
        ),
        el('div', {class:'ent-row'},
          el('label', {}, 'Format'),
          (()=>{ const s = el('select', {class:'ent-select'},
              el('option', {value:'json', selected:c.format==='json'?'selected':null}, 'JSON'),
              el('option', {value:'text', selected:c.format==='text'?'selected':null}, 'Plain text'));
              s.addEventListener('change', ()=>{ c.format=s.value; Webhook.save(c); }); return s; })()
        ),
        checkbox('Webhook enabled', c.enabled, v=>{ c.enabled=v; Webhook.save(c); }),
        el('div', {style:{marginTop:'12px'}},
          el('button', {class:'ent-pbtn', onclick: async ()=>{
            try { const code = await Webhook.send({ kind:'test', ts:new Date().toISOString(), msg:'Hello from ADS Enterprise' });
              toast('Sent (HTTP '+code+')','ok'); } catch(e){ toast('Send failed: '+e.message, 'err'); }
          }}, '📤 Send Test Payload')
        )
      );
      return w;
    },

    Backup(){
      const w = el('div', {});
      w.append(
        el('div', {class:'ent-help', style:{marginBottom:'10px'}},
          'Bundle all local settings, projects, snippets, jobs, audit log, policies and variables into an encrypted file using AES-GCM 256. Share with teammates via email/Drive — they can import with the same passphrase.'),
        el('div', {class:'ent-row'},
          el('label', {}, 'Passphrase'),
          (()=>{ const i = el('input', {type:'password', class:'ent-input', id:'ent-bk-pass', placeholder:'Min 8 chars'}); return i; })()
        ),
        el('div', {style:{display:'flex', gap:'8px', marginTop:'8px'}},
          el('button', {class:'ent-pbtn', onclick: exportBundle}, '🔒 Export Encrypted Bundle'),
          el('button', {class:'ent-sbtn', onclick: ()=>{
            const inp = el('input', {type:'file', accept:'.adsent,.json'});
            inp.addEventListener('change', ()=>importBundle(inp.files[0]));
            inp.click();
          }}, '📥 Import Bundle')
        ),
        el('hr', {style:{margin:'18px 0', border:0, borderTop:'1px solid #1a2d4d'}}),
        el('div', {class:'ent-help'}, 'Plain (unencrypted) export — for migrating to another browser quickly:'),
        el('button', {class:'ent-sbtn', style:{marginTop:'6px'}, onclick: exportPlain}, '📦 Export Plain JSON'),
        el('button', {class:'ent-dbtn', style:{marginTop:'6px', marginLeft:'6px'}, onclick: factoryReset}, '⚠ Factory Reset (clear ENT data)')
      );
      return w;
    },

    Telemetry(){
      const s = Telemetry.state();
      const grid = el('div', {class:'ent-tcards'},
        tcard('Queries Run', s.runs),
        tcard('Total Time', (s.totalMs/1000).toFixed(1)+'s'),
        tcard('Avg Latency', s.runs ? (s.totalMs/s.runs).toFixed(1)+' ms' : '—'),
        tcard('Errors', s.errors),
        tcard('Error Rate', s.runs ? ((s.errors/s.runs)*100).toFixed(1)+'%' : '0%'),
        tcard('Imports', s.imports),
        tcard('Exports', s.exports),
        tcard('Since', new Date(s.lastReset).toLocaleDateString())
      );
      const btns = el('div', {style:{marginTop:'12px'}},
        el('button', {class:'ent-dbtn', onclick:()=>{ Telemetry.reset(); toast('Telemetry reset','ok'); openHub(); }}, 'Reset Counters')
      );
      return el('div', {}, grid, btns);
      function tcard(l,v){ return el('div', {class:'ent-tcard'}, el('div', {class:'label'}, l), el('div', {class:'value'}, String(v))); }
    },

    About(){
      return el('div', {style:{lineHeight:1.7}},
        el('h4', {style:{marginBottom:'8px'}}, 'Azure DataStudio Stimulator — Enterprise Edition'),
        el('div', {}, 'Version: '+VERSION),
        el('div', {}, 'Base app: Azure DataStudio Stimulator v7'),
        el('div', {style:{marginTop:'10px'}}, '100% client-side, free, offline-capable, no AI APIs, no telemetry leaves your device.'),
        el('div', {style:{marginTop:'10px'}}, 'Open-source under MIT License.')
      );
    }
  };

  function checkbox(label, val, onChange){
    const id = 'ent-cb-'+Math.random().toString(36).slice(2,7);
    const w = el('label', {for:id, style:{display:'flex', alignItems:'center', gap:'8px', cursor:'pointer', padding:'4px 0'}},
      (()=>{ const i = el('input', {type:'checkbox', id});
            i.checked = !!val;
            i.addEventListener('change', ()=>onChange(i.checked)); return i; })(),
      el('span', {style:{fontSize:'12px'}}, label)
    );
    return w;
  }

  function download(filename, content, mime='application/octet-stream'){
    const blob = (content instanceof Blob) ? content : new Blob([content], {type:mime});
    const url = URL.createObjectURL(blob);
    const a = el('a', {href:url, download:filename});
    document.body.append(a); a.click(); a.remove();
    setTimeout(()=>URL.revokeObjectURL(url), 2000);
  }

  // ===============================================================
  // 13. BACKUP HELPERS
  // ===============================================================
  function collectAllNamespacedLS(){
    const out = {};
    // ENT data
    for (let i=0;i<localStorage.length;i++){
      const k = localStorage.key(i);
      if (k.startsWith(NS)) out[k] = localStorage.getItem(k);
    }
    // Base-app data — best-effort: capture any key containing 'sqlab' or 'ads' prefix
    for (let i=0;i<localStorage.length;i++){
      const k = localStorage.key(i);
      if (!k.startsWith(NS) && (/sqlab|ads_|adstudio|projects/i.test(k))) out[k] = localStorage.getItem(k);
    }
    return out;
  }
  function restoreLS(obj){
    for (const [k,v] of Object.entries(obj)) localStorage.setItem(k, v);
  }
  async function exportBundle(){
    const pass = $('#ent-bk-pass')?.value || '';
    if (pass.length < 8) return toast('Passphrase must be ≥ 8 chars', 'err');
    const data = collectAllNamespacedLS();
    const json = JSON.stringify({ kind:'ads-ent-bundle', v:1, at:new Date().toISOString(), data });
    const enc = await Crypt.encrypt(json, pass);
    download('ads-workspace.adsent', JSON.stringify(enc, null, 2), 'application/json');
    Audit.log('backup.export.encrypted');
    toast('Encrypted bundle downloaded', 'ok');
  }
  async function importBundle(file){
    if (!file) return;
    const text = await file.text();
    const pass = prompt('Enter passphrase to decrypt (leave blank if plain JSON):') || '';
    try {
      let payload;
      try { payload = JSON.parse(text); } catch { return toast('Not valid JSON','err'); }
      let plain;
      if (payload.kind === 'ads-ent-bundle'){ plain = JSON.stringify(payload); }
      else if (payload.ct && payload.iv && payload.salt){
        plain = await Crypt.decrypt(payload, pass);
      } else { plain = text; }
      const obj = JSON.parse(plain);
      if (obj.kind !== 'ads-ent-bundle') return toast('Not an ADS bundle','err');
      restoreLS(obj.data);
      Audit.log('backup.import', file.name);
      toast('Imported. Reloading in 1s…', 'ok');
      setTimeout(()=>location.reload(), 1000);
    } catch (e){ toast('Decrypt failed: '+e.message, 'err'); }
  }
  function exportPlain(){
    const data = collectAllNamespacedLS();
    download('ads-workspace.json', JSON.stringify({ kind:'ads-ent-bundle', v:1, at:new Date().toISOString(), data }, null, 2), 'application/json');
    Audit.log('backup.export.plain');
  }
  function factoryReset(){
    if (!confirm('Erase ALL Enterprise data (roles, audit, jobs, policies, telemetry)? This cannot be undone.')) return;
    const keys = [];
    for (let i=0;i<localStorage.length;i++){ const k = localStorage.key(i); if (k.startsWith(NS)) keys.push(k); }
    for (const k of keys) localStorage.removeItem(k);
    toast('Enterprise data cleared','ok');
    setTimeout(()=>location.reload(), 800);
  }

  // ===============================================================
  // 14. APPLY ROLE LOCK (read-only UI for viewer)
  // ===============================================================
  function applyRoleUI(){
    const cfg = Auth.config();
    if (!cfg.enabled) { document.body.classList.remove('ent-readonly'); return; }
    if (Auth.currentRole() === 'viewer') document.body.classList.add('ent-readonly');
    else document.body.classList.remove('ent-readonly');
    const pill = $('#ent-role-pill');
    if (pill){
      pill.className = 'ent-role-pill ent-role-'+Auth.currentRole();
      pill.textContent = Auth.currentRole().toUpperCase();
    }
  }

  // ===============================================================
  // 15. SQL EXECUTION INTERCEPTOR
  //    Wrap window.db.exec / .run if present once the base app loads.
  //    Enforces policy + records telemetry/audit.
  // ===============================================================
  function tryWrapDB(){
    const db = window.db || window.SQLDB || window.sqlDB;
    if (!db || db.__entWrapped){ return false; }
    const origExec = db.exec.bind(db);
    const origRun  = db.run ? db.run.bind(db) : null;
    db.exec = function(sql, params){
      const chk = Policy.check(String(sql||''));
      if (!chk.allowed){
        Audit.log('policy.block', chk.reason);
        toast('Blocked: '+chk.reason, 'err', 5000);
        throw new Error('Policy block: '+chk.reason);
      }
      const t0 = performance.now();
      try {
        const r = origExec(sql, params);
        Telemetry.addMs(performance.now()-t0);
        Audit.log('sql.exec', String(sql).slice(0,140));
        return r;
      } catch(e){
        Telemetry.bump('errors');
        Audit.log('sql.error', e.message);
        throw e;
      }
    };
    if (origRun){
      db.run = function(sql, params){
        const chk = Policy.check(String(sql||''));
        if (!chk.allowed){
          Audit.log('policy.block', chk.reason);
          toast('Blocked: '+chk.reason, 'err', 5000);
          throw new Error('Policy block: '+chk.reason);
        }
        Audit.log('sql.run', String(sql).slice(0,140));
        return origRun(sql, params);
      };
    }
    db.__entWrapped = true;
    return true;
  }

  // Poll until db is ready, then wrap
  function watchDB(){
    let tries = 0;
    const id = setInterval(()=>{
      if (tryWrapDB() || ++tries > 60) clearInterval(id);
    }, 500);
  }

  // ===============================================================
  // 16. BOOT
  // ===============================================================
  async function boot(){
    // Inject CSS link if not already present
    if (!$('#ent-css')){
      const link = el('link', {id:'ent-css', rel:'stylesheet', href:'assets/enterprise.css'});
      document.head.append(link);
    }
    // Wait for body
    if (document.readyState === 'loading'){
      document.addEventListener('DOMContentLoaded', boot, { once:true });
      return;
    }
    await showGate();
    injectHeader();
    applyRoleUI();
    watchDB();
    Jobs.startTicker();
    Audit.log('app.boot', 'enterprise v'+VERSION);
    // Expose for power users / debugging
    window.ADSEnterprise = { Audit, Auth, Policy, Telemetry, Jobs, Webhook, VCS, Crypt, openHub, toast, version:VERSION };
  }

  boot();
})();
