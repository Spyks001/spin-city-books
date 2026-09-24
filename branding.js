(() => {
  const logoSrc = 'assets/spin-city-logo.webp';
  const addBranding = () => {
    const appView = document.getElementById('appView');
    if (!appView) return;

    const nav = appView.querySelector('.nav');
    if (nav && !appView.querySelector('.app-logo-banner')) {
      const banner = document.createElement('div');
      banner.className = 'app-logo-banner';
      banner.innerHTML = `<img src="${logoSrc}" alt="Spin City Laundry Services logo"><div><strong>spincity</strong><span>Spin City Laundry Services</span></div>`;
      nav.insertAdjacentElement('beforebegin', banner);
    }

    appView.querySelectorAll('.tab').forEach(tab => {
      if (tab.querySelector('.page-logo')) return;
      const heading = tab.querySelector('h2, h3');
      const logo = document.createElement('div');
      logo.className = 'page-logo';
      logo.innerHTML = `<img src="${logoSrc}" alt="Spin City Laundry Services logo"><span>spincity</span>`;
      if (heading) heading.parentElement.insertBefore(logo, heading);
      else tab.insertBefore(logo, tab.firstChild);
    });
  };

  const style = document.createElement('style');
  style.textContent = `
    .app-logo-banner{display:flex;align-items:center;gap:14px;background:#fff;border:1px solid #dce7f5;border-radius:14px;padding:10px 16px;margin:0 0 14px;box-shadow:0 2px 8px #0b3a6b12}
    .app-logo-banner img{width:58px;height:42px;object-fit:contain;border-radius:8px}
    .app-logo-banner strong{display:block;font-size:21px;line-height:1;color:#0758b8;text-transform:lowercase}
    .app-logo-banner span{display:block;margin-top:4px;font-size:11px;color:#536b8f}
    .page-logo{display:flex;align-items:center;gap:10px;margin:0 0 12px;padding-bottom:10px;border-bottom:1px solid #dce7f5}
    .page-logo img{width:52px;height:38px;object-fit:contain;border-radius:7px}
    .page-logo span{font-weight:800;font-size:18px;color:#0758b8;text-transform:lowercase}
    .audit-tab-panel{margin-top:2px}.audit-toolbar{display:flex;gap:10px;align-items:end;flex-wrap:wrap;margin-bottom:14px}.audit-toolbar label{display:flex;flex-direction:column;gap:5px;font-size:12px;color:#536b8f}.audit-toolbar input,.audit-toolbar select{min-width:155px}.audit-summary{display:flex;gap:10px;flex-wrap:wrap;margin-bottom:14px}.audit-summary .card{padding:12px 14px}.audit-table-wrap{overflow:auto}.audit-table td,.audit-table th{white-space:nowrap}.audit-deleted{background:#fff7f7}.audit-deleted td{color:#8b1e1e}.audit-added{color:#18794e;font-weight:700}.audit-empty{padding:24px;text-align:center;color:#536b8f}.audit-help{font-size:12px;color:#536b8f;margin:0 0 14px;line-height:1.5}
    @media(max-width:520px){.app-logo-banner{padding:8px 12px}.app-logo-banner img{width:48px;height:36px}.audit-toolbar input,.audit-toolbar select{width:100%;min-width:0}}
  `;
  document.head.appendChild(style);

  const addAuditTab = () => {
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
      <div class="card audit-tab-panel">
        <div class="row"><h3>Transaction history</h3><span class="pill">Audit trail</span></div>
        <p class="audit-help">Choose a start and end date to see orders and expenses. Deleted entries remain visible here with who deleted them.</p>
        <div class="audit-toolbar">
          <label>From<input id="auditFrom" type="date"></label>
          <label>To<input id="auditTo" type="date"></label>
          <label>Type<select id="auditType"><option value="all">All transactions</option><option value="orders">Orders</option><option value="expenses">Expenses</option></select></label>
          <button class="btn primary" id="auditApply">Show transactions</button>
          <button class="btn" id="auditToday">Today</button>
          <button class="btn" id="auditClear">Clear</button>
        </div>
        <div id="auditSummary" class="audit-summary"></div>
        <div id="auditResults" class="audit-table-wrap"><div class="audit-empty">Select dates and click “Show transactions”.</div></div>
      </div>`;
    appView.appendChild(section);

    const switchToAudit = () => {
      appView.querySelectorAll('.tab').forEach(t => t.classList.add('hidden'));
      appView.querySelectorAll('.nav button').forEach(b => b.classList.remove('active'));
      button.classList.add('active');
      section.classList.remove('hidden');
      addBranding();
    };
    button.addEventListener('click', switchToAudit);

    document.getElementById('auditToday').addEventListener('click', () => {
      const d = new Date(); const s = d.toISOString().slice(0,10);
      document.getElementById('auditFrom').value = s; document.getElementById('auditTo').value = s;
      loadAudit();
    });
    document.getElementById('auditClear').addEventListener('click', () => {
      document.getElementById('auditFrom').value=''; document.getElementById('auditTo').value='';
      document.getElementById('auditResults').innerHTML='<div class="audit-empty">Select dates and click “Show transactions”.</div>';
      document.getElementById('auditSummary').innerHTML='';
    });
    document.getElementById('auditApply').addEventListener('click', loadAudit);
  };

  const escapeHtml = v => String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const money = v => `KSh ${Number(v || 0).toLocaleString('en-KE',{minimumFractionDigits:2,maximumFractionDigits:2})}`;
  const displayName = (profileMap, id, email) => profileMap[id]?.full_name || profileMap[id]?.email || email || 'Unknown';

  async function loadAudit() {
    if (typeof sb === 'undefined') return;
    const from = document.getElementById('auditFrom')?.value || '';
    const to = document.getElementById('auditTo')?.value || '';
    const type = document.getElementById('auditType')?.value || 'all';
    if (from && to && from > to) { alert('The From date must be before the To date.'); return; }
    const results = document.getElementById('auditResults');
    results.innerHTML = '<div class="audit-empty">Loading transactions…</div>';

    let orderQ = sb.from('orders').select('id,customer_name,service,amount,order_date,created_by,created_at');
    let expenseQ = sb.from('expenses').select('id,category,description,amount,expense_date,created_by,created_at');
    let auditQ = sb.from('transaction_audit_log').select('table_name,record_id,action,actor_id,actor_email,occurred_at,record_snapshot').order('occurred_at',{ascending:false});
    if (from) { orderQ = orderQ.gte('order_date', from); expenseQ = expenseQ.gte('expense_date', from); }
    if (to) { orderQ = orderQ.lte('order_date', to); expenseQ = expenseQ.lte('expense_date', to); }
    const [{data:orders,error:oe},{data:expenses,error:ee},{data:audit,error:ae}] = await Promise.all([
      type==='expenses' ? Promise.resolve({data:[],error:null}) : orderQ,
      type==='orders' ? Promise.resolve({data:[],error:null}) : expenseQ,
      auditQ
    ]);
    if (oe || ee || ae) { results.innerHTML=`<div class="audit-empty">Could not load transaction history: ${escapeHtml((oe||ee||ae)?.message||'Unknown error')}</div>`; return; }

    const rows=[]; const ids=new Set();
    (orders||[]).forEach(r=>{ids.add(r.id);rows.push({id:r.id,type:'Order',date:r.order_date,description:`${r.customer_name||'Customer'} — ${r.service||'Service'}`,amount:r.amount,createdBy:r.created_by,createdAt:r.created_at,deletedBy:null,deletedAt:null,status:'Active'});});
    (expenses||[]).forEach(r=>{ids.add(r.id);rows.push({id:r.id,type:'Expense',date:r.expense_date,description:`${r.category||'Expense'}${r.description?' — '+r.description:''}`,amount:-Math.abs(Number(r.amount||0)),createdBy:r.created_by,createdAt:r.created_at,deletedBy:null,deletedAt:null,status:'Active'});});
    const deleted=[];
    (audit||[]).filter(a=>a.action==='DELETE').forEach(a=>{
      const s=a.record_snapshot||{}; const date=s.order_date||s.expense_date||a.occurred_at?.slice(0,10);
      if(from && date<from) return; if(to && date>to) return;
      deleted.push({id:a.record_id,type:a.table_name==='orders'?'Order':'Expense',date,description:a.table_name==='orders'?`${s.customer_name||'Customer'} — ${s.service||'Service'}`:`${s.category||'Expense'}${s.description?' — '+s.description:''}`,amount:a.table_name==='expenses'?-Math.abs(Number(s.amount||0)):Number(s.amount||0),createdBy:s.created_by,createdAt:s.created_at,deletedBy:a.actor_id,deletedEmail:a.actor_email,deletedAt:a.occurred_at,status:'Deleted'});
    });
    const all=[...rows,...deleted].sort((a,b)=>String(b.date||'').localeCompare(String(a.date||'')) || String(b.createdAt||'').localeCompare(String(a.createdAt||'')));
    const profileIds=[...new Set(all.flatMap(r=>[r.createdBy,r.deletedBy]).filter(Boolean))];
    let profileMap={};
    if(profileIds.length){const {data:profiles}=await sb.from('profiles').select('id,email,full_name').in('id',profileIds);(profiles||[]).forEach(p=>profileMap[p.id]=p);}
    const total=all.reduce((s,r)=>s+Number(r.amount||0),0), active=all.filter(r=>r.status==='Active').length, del=all.filter(r=>r.status==='Deleted').length;
    document.getElementById('auditSummary').innerHTML=`<div class="card"><strong>${all.length}</strong><div class="muted">Entries</div></div><div class="card"><strong>${money(total)}</strong><div class="muted">Net shown</div></div><div class="card"><strong>${active}</strong><div class="muted">Active</div></div><div class="card"><strong>${del}</strong><div class="muted">Deleted</div></div>`;
    if(!all.length){results.innerHTML='<div class="audit-empty">No transactions found for this date range.</div>';return;}
    results.innerHTML=`<table class="audit-table"><thead><tr><th>Date</th><th>Type</th><th>Description</th><th>Amount</th><th>Added by</th><th>Deleted by</th><th>Status</th></tr></thead><tbody>${all.map(r=>`<tr class="${r.status==='Deleted'?'audit-deleted':''}"><td>${escapeHtml(r.date||'—')}</td><td>${escapeHtml(r.type)}</td><td>${escapeHtml(r.description)}</td><td>${money(r.amount)}</td><td class="audit-added">${escapeHtml(displayName(profileMap,r.createdBy))}</td><td>${r.deletedBy?escapeHtml(displayName(profileMap,r.deletedBy,r.deletedEmail)):'—'}${r.deletedAt?`<div class="muted">${escapeHtml(new Date(r.deletedAt).toLocaleString())}</div>`:''}</td><td>${r.status==='Deleted'?'<span class="pill" style="background:#fee2e2;color:#991b1b">Deleted</span>':'<span class="pill approved">Active</span>'}</td></tr>`).join('')}</tbody></table>`;
  }

  addBranding();
  addAuditTab();
  new MutationObserver(() => { addBranding(); addAuditTab(); }).observe(document.body, { childList: true, subtree: true });
})();
