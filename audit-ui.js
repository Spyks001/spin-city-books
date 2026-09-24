(() => {
  const $ = (id) => document.getElementById(id);
  const esc = (v) => String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const money = (v) => `KSh ${Number(v || 0).toLocaleString('en-KE',{minimumFractionDigits:2,maximumFractionDigits:2})}`;
  const state = { audit: [], names: {} };

  function client() {
    try { return typeof sb !== 'undefined' ? sb : null; } catch (_) { return null; }
  }

  async function loadAudit() {
    const s = client();
    if (!s) return;
    const { data, error } = await s.from('transaction_audit_log')
      .select('id,table_name,record_id,action,actor_id,actor_email,occurred_at,record_snapshot')
      .order('occurred_at', { ascending: false });
    if (!error) state.audit = data || [];
    const ids = [...new Set(state.audit.map(x => x.actor_id).filter(Boolean))];
    if (ids.length) {
      const r = await s.from('profiles').select('id,full_name,email').in('id', ids);
      if (!r.error) (r.data || []).forEach(p => state.names[p.id] = p.full_name || p.email || p.id);
    }
  }

  function actor(a) {
    if (!a) return '—';
    return state.names[a.actor_id] || a.actor_email || a.actor_id || '—';
  }

  function orderAudit(id) {
    return state.audit.filter(a => a.table_name === 'orders' && a.record_id === id);
  }

  function expenseAudit(id) {
    return state.audit.filter(a => a.table_name === 'expenses' && a.record_id === id);
  }

  function addFilters() {
    const ordersList = $('ordersList');
    if (ordersList && !$('orderDateFilter')) {
      const box = document.createElement('div');
      box.id = 'orderDateFilter';
      box.className = 'card';
      box.style.marginBottom = '12px';
      box.innerHTML = `<div class="row"><strong>Filter orders by date</strong><div class="actions"><label>From <input id="orderFrom" type="date" style="width:auto;margin:0 4px"></label><label>To <input id="orderTo" type="date" style="width:auto;margin:0 4px"></label><button class="btn small primary" id="applyOrderDates">Show</button><button class="btn small" id="clearOrderDates">Clear</button></div></div>`;
      ordersList.parentElement.insertBefore(box, ordersList);
      $('applyOrderDates').onclick = () => filterTableByDates(ordersList, $('orderFrom').value, $('orderTo').value);
      $('clearOrderDates').onclick = () => { $('orderFrom').value=''; $('orderTo').value=''; filterTableByDates(ordersList,'',''); };
    }
    const expensesList = $('expensesList');
    if (expensesList && !$('expenseDateFilter')) {
      const box = document.createElement('div');
      box.id = 'expenseDateFilter'; box.className='card'; box.style.marginBottom='12px';
      box.innerHTML = `<div class="row"><strong>Filter expenses by date</strong><div class="actions"><label>From <input id="expenseFrom" type="date" style="width:auto;margin:0 4px"></label><label>To <input id="expenseTo" type="date" style="width:auto;margin:0 4px"></label><button class="btn small primary" id="applyExpenseDates">Show</button><button class="btn small" id="clearExpenseDates">Clear</button></div></div>`;
      expensesList.parentElement.insertBefore(box, expensesList);
      $('applyExpenseDates').onclick = () => filterTableByDates(expensesList, $('expenseFrom').value, $('expenseTo').value);
      $('clearExpenseDates').onclick = () => { $('expenseFrom').value=''; $('expenseTo').value=''; filterTableByDates(expensesList,'',''); };
    }
  }

  function filterTableByDates(container, from, to) {
    const table = container.querySelector('table'); if (!table) return;
    [...table.tBodies[0].rows].forEach(row => {
      const d = row.cells[0]?.textContent.trim() || '';
      row.style.display = (!from || d >= from) && (!to || d <= to) ? '' : 'none';
    });
  }

  function addAuditColumns(containerId, type) {
    const container = $(containerId); if (!container) return;
    const table = container.querySelector('table'); if (!table) return;
    const head = table.tHead?.rows[0]; if (!head || head.dataset.auditReady === '1') return;
    head.dataset.auditReady = '1';
    const th1 = document.createElement('th'); th1.textContent='Added by';
    const th2 = document.createElement('th'); th2.textContent='Deleted by';
    const th3 = document.createElement('th'); th3.textContent='Status';
    const actionHead = head.lastElementChild; head.insertBefore(th1, actionHead); head.insertBefore(th2, actionHead); head.insertBefore(th3, actionHead);
    [...table.tBodies[0].rows].forEach(row => {
      const cells = row.cells;
      const date = cells[0]?.textContent.trim();
      const customer = cells[1]?.textContent.trim();
      const amount = cells[3]?.textContent.trim();
      const source = type === 'orders' ? state.audit.filter(a=>a.table_name==='orders') : state.audit.filter(a=>a.table_name==='expenses');
      let matches = source.filter(a => a.action === 'INSERT' || a.action === 'CREATE');
      const match = matches.find(a => {
        const s = a.record_snapshot || {};
        return String(s.order_date || s.expense_date || '') === date && String(s.amount ?? '') === amount.replace(/[^0-9.]/g,'') && (type==='orders' ? String(s.customer_name||'').toLowerCase()===customer.toLowerCase() : String(s.category||'').toLowerCase()===customer.toLowerCase());
      });
      const all = match ? orderAudit(match.record_id) : [];
      const allE = match ? expenseAudit(match.record_id) : [];
      const history = match ? (type==='orders' ? all : allE) : [];
      const inserted = history.find(a=>a.action==='INSERT' || a.action==='CREATE');
      const deleted = history.find(a=>a.action==='DELETE');
      const td1=document.createElement('td'); td1.textContent=actor(inserted);
      const td2=document.createElement('td'); td2.textContent=actor(deleted);
      const td3=document.createElement('td'); td3.innerHTML=deleted?'<span class="pill" style="background:#fee2e2;color:#991b1b">Deleted</span>':'<span class="pill" style="background:#dcfce7;color:#166534">Active</span>';
      row.insertBefore(td1, actionHead ? row.lastElementChild : null); row.insertBefore(td2, row.lastElementChild); row.insertBefore(td3, row.lastElementChild);
    });
  }

  function installTransactionsTab() {
    const nav = document.querySelector('#appView .nav'); if (!nav || $('auditTab')) return;
    const b = document.createElement('button'); b.id='auditTab'; b.dataset.tab='transactions'; b.textContent='Transactions'; nav.appendChild(b);
    const section = document.createElement('div'); section.id='transactions'; section.className='tab hidden';
    section.innerHTML = `<div class="card section"><div class="row"><div><h3>Transaction history</h3><p class="muted">Choose the dates you want to review. This includes entries and deletions recorded in the audit log.</p></div><div class="actions"><label>From <input id="auditFrom" type="date" style="width:auto;margin:0 4px"></label><label>To <input id="auditTo" type="date" style="width:auto;margin:0 4px"></label><button class="btn small primary" id="auditShow">Show</button><button class="btn small" id="auditToday">Today</button><button class="btn small" id="auditClear">Clear</button></div></div></div><div class="card"><div id="auditResults" class="muted">Select a date range or press Show to display transactions.</div></div>`;
    $('appView').appendChild(section);
    b.onclick=()=>showTab('transactions');
    $('auditShow').onclick=renderAudit;
    $('auditClear').onclick=()=>{ $('auditFrom').value=''; $('auditTo').value=''; renderAudit(); };
    $('auditToday').onclick=()=>{ const d=new Date().toISOString().slice(0,10); $('auditFrom').value=d; $('auditTo').value=d; renderAudit(); };
  }

  function showTab(id) {
    document.querySelectorAll('#appView .tab').forEach(x=>x.classList.add('hidden'));
    const target=$(id); if(target) target.classList.remove('hidden');
    document.querySelectorAll('#appView .nav button').forEach(x=>x.classList.toggle('active',x.dataset.tab===id));
    if(id==='transactions') renderAudit();
  }

  function renderAudit() {
    const out=$('auditResults'); if(!out) return;
    const from=$('auditFrom').value, to=$('auditTo').value;
    let rows=state.audit.filter(a=>['orders','expenses'].includes(a.table_name));
    if(from) rows=rows.filter(a=>String(a.occurred_at).slice(0,10)>=from);
    if(to) rows=rows.filter(a=>String(a.occurred_at).slice(0,10)<=to);
    rows.sort((a,b)=>new Date(b.occurred_at)-new Date(a.occurred_at));
    out.innerHTML=rows.length?`<div style="overflow:auto"><table><thead><tr><th>Date/time</th><th>Type</th><th>Description</th><th>Amount</th><th>Added by</th><th>Deleted by</th><th>Action</th></tr></thead><tbody>${rows.map(a=>{const s=a.record_snapshot||{};const desc=a.table_name==='orders'?(s.customer_name||s.service||'Order'):(s.description||s.category||'Expense');const add=(a.action==='INSERT'||a.action==='CREATE')?actor(a):'—';const del=a.action==='DELETE'?actor(a):'—';return `<tr><td>${esc(new Date(a.occurred_at).toLocaleString('en-KE'))}</td><td>${esc(a.table_name)}</td><td>${esc(desc)}</td><td>${money(s.amount)}</td><td>${esc(add)}</td><td>${esc(del)}</td><td><span class="pill">${esc(a.action)}</span></td></tr>`}).join('')}</tbody></table></div>`:'<p class="muted">No transactions found for that date range.</p>';
  }

  function enhance() {
    installTransactionsTab(); addFilters(); addAuditColumns('ordersList','orders'); addAuditColumns('expensesList','expenses');
  }

  async function start() {
    await new Promise(r=>setTimeout(r,500));
    await loadAudit();
    enhance();
    const observer=new MutationObserver(()=>enhance());
    const root=$('appView'); if(root) observer.observe(root,{childList:true,subtree:true});
    setInterval(()=>{loadAudit().then(enhance)},30000);
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',start); else start();
})();
