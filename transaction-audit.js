(() => {
  const logoSrc = 'assets/spin-city-logo.webp';
  const actorCache = {};
  const $id = id => document.getElementById(id);
  const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const money = v => `KSh ${Number(v || 0).toLocaleString('en-KE',{minimumFractionDigits:2,maximumFractionDigits:2})}`;
  const nameFor = (id, email) => id && actorCache[id] ? (actorCache[id].full_name || actorCache[id].email || email || id) : (email || id || 'Unknown');
  const localDateTime = value => value ? new Date(value).toLocaleString('en-KE',{year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hour12:false}) : '—';
  const localDate = value => value ? new Date(`${value}T00:00:00`).toLocaleDateString('en-KE',{year:'numeric',month:'2-digit',day:'2-digit'}) : '—';

  async function loadActors(ids) {
    if (typeof sb === 'undefined') return;
    const missing = [...new Set(ids.filter(Boolean))].filter(id => !actorCache[id]);
    if (!missing.length) return;
    const {data} = await sb.from('profiles').select('id,email,full_name').in('id', missing);
    (data || []).forEach(p => actorCache[p.id] = p);
  }

  function addPageBranding() {
    const appView = document.getElementById('appView');
    if (!appView) return;
    const nav = appView.querySelector('.nav');
    if (nav && !appView.querySelector('.app-logo-banner')) {
      const banner = document.createElement('div');
      banner.className = 'app-logo-banner';
      banner.innerHTML = `<img src="${logoSrc}" alt="Spin City Laundry Services logo"><div><strong>spincity</strong><span>Spin City Laundry Services</span></div>`;
      nav.insertAdjacentElement('beforebegin', banner);
    }
  }

  function addDateFilterTab() {
    const appView = document.getElementById('appView');
    const nav = appView?.querySelector('.nav');
    if (!nav || nav.querySelector('[data-tab="transactions"]')) return;

    const button = document.createElement('button');
    button.dataset.tab = 'transactions';
    button.textContent = 'Transactions';
    nav.appendChild(button);

    const section = document.createElement('div');
    section.id = 'transactions';
    section.className = 'tab hidden';
    section.innerHTML = `
      <div class="card audit-panel">
        <div class="row"><h3>Transaction history</h3><span class="pill">Audit trail</span></div>
        <p class="audit-help">Choose the service date range. Active entries show who added them and the exact entry time. Deleted entries remain here with who deleted them.</p>
        <div class="audit-toolbar">
          <label>From date<input id="auditFrom" type="date"></label>
          <label>To date<input id="auditTo" type="date"></label>
          <label>Type<select id="auditType"><option value="all">All transactions</option><option value="orders">Orders</option><option value="expenses">Expenses</option></select></label>
          <button class="btn primary" id="auditApply">Show transactions</button>
          <button class="btn" id="auditToday">Today</button>
          <button class="btn" id="auditClear">Clear</button>
        </div>
        <div id="auditSummary" class="audit-summary"></div>
        <div id="auditResults" class="audit-table-wrap"><div class="audit-empty">Choose a date range and click “Show transactions”.</div></div>
      </div>`;
    appView.appendChild(section);

    button.addEventListener('click', () => {
      appView.querySelectorAll('.tab').forEach(t => t.classList.add('hidden'));
      appView.querySelectorAll('.nav button').forEach(b => b.classList.remove('active'));
      button.classList.add('active');
      section.classList.remove('hidden');
      addPageBranding();
    });
    $id('auditApply').addEventListener('click', loadAudit);
    $id('auditToday').addEventListener('click', () => {
      const d = new Date();
      const s = new Date(d.getTime() - d.getTimezoneOffset()*60000).toISOString().slice(0,10);
      $id('auditFrom').value = s; $id('auditTo').value = s; loadAudit();
    });
    $id('auditClear').addEventListener('click', () => {
      $id('auditFrom').value=''; $id('auditTo').value=''; $id('auditSummary').innerHTML='';
      $id('auditResults').innerHTML='<div class="audit-empty">Choose a date range and click “Show transactions”.</div>';
    });
  }

  async function loadAudit() {
    if (typeof sb === 'undefined') return;
    const from = $id('auditFrom').value || '';
    const to = $id('auditTo').value || '';
    const type = $id('auditType').value || 'all';
    if (from && to && from > to) { alert('The From date must be before the To date.'); return; }
    const results = $id('auditResults');
    results.innerHTML = '<div class="audit-empty">Loading transactions…</div>';

    let oq = sb.from('orders').select('id,customer_name,customer_phone,service,amount,order_date,created_by,created_at');
    let eq = sb.from('expenses').select('id,category,description,amount,expense_date,created_by,created_at');
    let aq = sb.from('transaction_audit_log').select('table_name,record_id,action,actor_id,actor_email,occurred_at,record_snapshot').order('occurred_at',{ascending:false});
    if (from) { oq = oq.gte('order_date',from); eq = eq.gte('expense_date',from); }
    if (to) { oq = oq.lte('order_date',to); eq = eq.lte('expense_date',to); }
    const [or,er,ar] = await Promise.all([
      type==='expenses' ? Promise.resolve({data:[],error:null}) : oq,
      type==='orders' ? Promise.resolve({data:[],error:null}) : eq,
      aq
    ]);
    const err = or.error || er.error || ar.error;
    if (err) { results.innerHTML = `<div class="audit-empty">Could not load transaction history: ${esc(err.message)}</div>`; return; }

    const rows=[];
    (or.data||[]).forEach(r => rows.push({type:'Order',date:r.order_date,description:`${r.customer_name||'Customer'} — ${r.service||'Service'}`,amount:Number(r.amount||0),createdBy:r.created_by,createdAt:r.created_at,status:'Active'}));
    (er.data||[]).forEach(r => rows.push({type:'Expense',date:r.expense_date,description:`${r.category||'Expense'}${r.description?' — '+r.description:''}`,amount:-Math.abs(Number(r.amount||0)),createdBy:r.created_by,createdAt:r.created_at,status:'Active'}));
    (ar.data||[]).filter(a => a.action === 'DELETE').forEach(a => {
      const s = a.record_snapshot || {};
      const date = s.order_date || s.expense_date || (a.occurred_at||'').slice(0,10);
      if (from && date < from) return;
      if (to && date > to) return;
      rows.push({type:a.table_name==='orders'?'Order':'Expense',date,description:a.table_name==='orders'?`${s.customer_name||'Customer'} — ${s.service||'Service'}`:`${s.category||'Expense'}${s.description?' — '+s.description:''}`,amount:a.table_name==='expenses'?-Math.abs(Number(s.amount||0)):Number(s.amount||0),createdBy:s.created_by,createdAt:s.created_at,deletedBy:a.actor_id,deletedEmail:a.actor_email,deletedAt:a.occurred_at,status:'Deleted'});
    });
    rows.sort((a,b) => String(b.date||'').localeCompare(String(a.date||'')) || String(b.createdAt||'').localeCompare(String(a.createdAt||'')));
    await loadActors(rows.flatMap(r => [r.createdBy,r.deletedBy]));

    const net = rows.reduce((s,r)=>s+Number(r.amount||0),0);
    $id('auditSummary').innerHTML = `<div class="card"><strong>${rows.length}</strong><div class="muted">Entries</div></div><div class="card"><strong>${money(net)}</strong><div class="muted">Net shown</div></div><div class="card"><strong>${rows.filter(r=>r.status==='Active').length}</strong><div class="muted">Active</div></div><div class="card"><strong>${rows.filter(r=>r.status==='Deleted').length}</strong><div class="muted">Deleted</div></div>`;
    if (!rows.length) { results.innerHTML='<div class="audit-empty">No transactions found for this date range.</div>'; return; }
    results.innerHTML = `<table class="audit-table"><thead><tr><th>Service date</th><th>Entry time</th><th>Type</th><th>Description</th><th>Amount</th><th>Added by</th><th>Deleted by</th><th>Status</th></tr></thead><tbody>${rows.map(r=>`<tr class="${r.status==='Deleted'?'audit-deleted':''}"><td>${esc(localDate(r.date))}</td><td>${esc(localDateTime(r.createdAt))}</td><td>${esc(r.type)}</td><td>${esc(r.description)}</td><td>${money(r.amount)}</td><td class="audit-added">${esc(nameFor(r.createdBy))}</td><td>${r.deletedBy?esc(nameFor(r.deletedBy,r.deletedEmail)):'—'}${r.deletedAt?`<div class="muted">${esc(localDateTime(r.deletedAt))}</div>`:''}</td><td>${r.status==='Deleted'?'<span class="pill" style="background:#fee2e2;color:#991b1b">Deleted</span>':'<span class="pill approved">Active</span>'}</td></tr>`).join('')}</tbody></table>`;
  }

  async function enhanceOrdersTable() {
    const list = document.getElementById('ordersList');
    if (!list) return;
    const table = list.querySelector('table');
    if (!table) return;
    const data = typeof orders !== 'undefined' ? orders : (window.orders || []);
    if (!Array.isArray(data)) return;
    const search = (document.getElementById('orderSearch')?.value || '').toLowerCase();
    const filtered = data.filter(x => `${x.customer_name} ${x.customer_phone||''} ${x.service}`.toLowerCase().includes(search));
    const head = table.querySelector('thead tr');
    const body = table.querySelector('tbody');
    if (!head || !body) return;
    if (!head.querySelector('.entry-time-head')) {
      const thTime = document.createElement('th'); thTime.className='entry-time-head'; thTime.textContent='Entry time'; head.insertBefore(thTime,head.lastElementChild);
    }
    if (!head.querySelector('.added-by-head')) {
      const th = document.createElement('th'); th.className='added-by-head'; th.textContent='Added by'; head.insertBefore(th,head.lastElementChild);
    }
    await loadActors(filtered.map(x=>x.created_by).filter(Boolean));
    [...body.rows].forEach((row,i) => {
      const x = filtered[i];
      row.querySelectorAll('.audit-entry-time-cell,.audit-added-by-cell').forEach(c=>c.remove());
      const time = document.createElement('td'); time.className='audit-entry-time-cell'; time.textContent=x?localDateTime(x.created_at):'—';
      const added = document.createElement('td'); added.className='audit-added-by-cell audit-added'; added.textContent=x?nameFor(x.created_by):'Unknown';
      row.insertBefore(time,row.lastElementChild); row.insertBefore(added,row.lastElementChild);
      const first = row.firstElementChild;
      if (x && first && !first.dataset.formatted) { first.textContent=localDate(x.order_date); first.dataset.formatted='1'; }
    });
  }

  function addOrderFormHint() {
    const label = document.querySelector('#orderDate')?.closest('label');
    if (label && !label.querySelector('.date-help')) {
      const hint=document.createElement('div'); hint.className='date-help'; hint.textContent='Service date (DD/MM/YYYY). Exact entry time is recorded automatically when you save.'; label.appendChild(hint);
    }
  }

  function startObservers() {
    addPageBranding();
    addDateFilterTab();
    addOrderFormHint();
    const list = document.getElementById('ordersList');
    if (list) new MutationObserver(() => enhanceOrdersTable()).observe(list,{childList:true,subtree:true});
    new MutationObserver(() => { addPageBranding(); addDateFilterTab(); addOrderFormHint(); }).observe(document.body,{childList:true,subtree:true});
    setTimeout(enhanceOrdersTable,300);
    setTimeout(enhanceOrdersTable,1000);
  }

  const style=document.createElement('style');
  style.textContent=`
    .app-logo-banner{display:flex;align-items:center;gap:14px;background:#fff;border:1px solid #dce7f5;border-radius:14px;padding:10px 16px;margin:0 0 14px;box-shadow:0 2px 8px #0b3a6b12}
    .app-logo-banner img{width:58px;height:42px;object-fit:contain;border-radius:8px}.app-logo-banner strong{display:block;font-size:21px;line-height:1;color:#0758b8;text-transform:lowercase}.app-logo-banner span{display:block;margin-top:4px;font-size:11px;color:#536b8f}
    .audit-toolbar{display:flex;gap:10px;align-items:end;flex-wrap:wrap;margin:14px 0}.audit-toolbar label{display:flex;flex-direction:column;gap:5px;font-size:12px;color:#536b8f}.audit-toolbar input,.audit-toolbar select{min-width:155px}.audit-summary{display:flex;gap:10px;flex-wrap:wrap;margin-bottom:14px}.audit-summary .card{padding:12px 14px}.audit-table-wrap{overflow:auto}.audit-table td,.audit-table th{white-space:nowrap}.audit-deleted{background:#fff7f7}.audit-deleted td{color:#8b1e1e}.audit-added{color:#18794e;font-weight:700}.audit-empty{padding:24px;text-align:center;color:#536b8f}.audit-help{font-size:12px;color:#536b8f;margin:0;line-height:1.5}.date-help{font-size:11px;font-weight:500;color:#536b8f;margin-top:5px}.entry-time-head,.audit-entry-time-cell{min-width:145px}.added-by-head,.audit-added-by-cell{min-width:120px}
    @media(max-width:700px){.audit-table{min-width:900px}}
    @media(max-width:520px){.app-logo-banner{padding:8px 12px}.app-logo-banner img{width:48px;height:36px}.audit-toolbar input,.audit-toolbar select{width:100%;min-width:0}}
  `;
  document.head.appendChild(style);

  const boot = () => { startObservers(); };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded',boot); else boot();
})();
