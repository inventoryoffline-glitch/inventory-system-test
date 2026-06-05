// ============================================================
// reports.js — renderReports, renderLedger, printLedger
// ============================================================

function renderReports(){
  const sel=document.getElementById('ledger-item-select'),cur=sel.value;
  const allItems=[...activeStock(),...expiredStock()];
  sel.innerHTML='<option value="">— Select an item —</option>'+allItems.map(s=>`<option value="${s.id}" ${cur==s.id?'selected':''}>${s.name}${expiredStock().find(e=>e.id==s.id)?' (Expired)':''}</option>`).join('');
  if(cur)renderLedger();
  const ledgerItemId=document.getElementById('ledger-item-select').value;
  const lfrom=document.getElementById('ledger-from').value;
  const lto=document.getElementById('ledger-to').value;
  document.getElementById('inst-summary-body').innerHTML=!institutes.length?'<tr><td colspan="3" class="empty-msg">No institutes.</td></tr>'
    :institutes.map(inst=>{
      let ir=records.filter(r=>r.instId==inst.id&&(r.status||'active')==='active');
      if(ledgerItemId)ir=ir.filter(r=>r.itemId==ledgerItemId);
      if(lfrom)ir=ir.filter(r=>r.date>=lfrom);
      if(lto)ir=ir.filter(r=>r.date<=lto);
      if(!ir.length)return'';
      const voucherCount=new Set(ir.map(r=>r.voucherNo)).size;
      return`<tr><td>${inst.name}</td><td style="font-family:'DM Mono',monospace">${voucherCount}</td><td style="font-family:'DM Mono',monospace">${ir.reduce((s,r)=>s+(parseInt(r.qty)||0),0)} ${ledgerItemId?(stock.find(s=>s.id==ledgerItemId)||{unit:''}).unit||'':''}</td></tr>`;
    }).filter(Boolean).join('')||'<tr><td colspan="3" class="empty-msg">No dispatches in selected period.</td></tr>';
}

function renderLedger(){
  const itemId=document.getElementById('ledger-item-select').value,wrap=document.getElementById('ledger-wrap');
  if(!itemId){wrap.innerHTML='<p class="empty-msg">Select an item above.</p>';return;}
  const item=[...activeStock(),...expiredStock()].find(s=>s.id==itemId);if(!item){wrap.innerHTML='<p class="empty-msg">Item not found.</p>';return;}
  const fromDate=document.getElementById('ledger-from').value,toDate=document.getElementById('ledger-to').value;
  let events=[];
  records.filter(r=>r.itemId==itemId).forEach(r=>events.push({date:r.date,type:(r.status||'active')==='cancelled'?'cancelled':'issue',qty:r.qty,ref:r.voucherNo,inst:r.instName,remarks:r.remarks||'',status:r.status||'active'}));
  adjustments.filter(a=>a.itemId==itemId).forEach(a=>events.push({date:a.date,type:'writeoff',qty:a.qty,ref:'WO-'+a.id.toString().slice(-4),inst:'—',remarks:a.reason+(a.remarks?': '+a.remarks:''),status:'active'}));
  events.sort((a,b)=>a.date.localeCompare(b.date));
  if(fromDate)events=events.filter(e=>e.date>=fromDate);if(toDate)events=events.filter(e=>e.date<=toDate);
  const totalIssued=records.filter(r=>r.itemId==itemId&&(r.status||'active')==='active').reduce((s,r)=>s+r.qty,0);
  const totalWO=adjustments.filter(a=>a.itemId==itemId).reduce((s,a)=>s+a.qty,0);
  let rb=item.qty+totalIssued+totalWO;
  if(fromDate){
    const be=[...records.filter(r=>r.itemId==itemId&&(r.status||'active')==='active'&&r.date<fromDate).map(r=>r.qty),...adjustments.filter(a=>a.itemId==itemId&&a.date<fromDate).map(a=>a.qty)];
    rb=item.qty+totalIssued+totalWO-be.reduce((s,v)=>s+v,0);
  }
  const openRow=`<tr class="opening"><td colspan="4" style="text-align:center;font-size:.8rem;text-transform:uppercase;letter-spacing:.05em">Opening Balance</td><td class="ledger-balance" style="color:var(--accent);font-size:1rem">${rb}</td><td></td></tr>`;
  const rows=events.map(e=>{
    const ic=e.status==='cancelled';
    if(!ic&&(e.type==='issue'||e.type==='writeoff'))rb-=e.qty;
    const qtyCell=e.type==='issue'?`<span class="ledger-issue">− ${e.qty}</span>`:e.type==='writeoff'?`<span class="ledger-writeoff">− ${e.qty} <small>(write-off)</small></span>`:`<span style="color:var(--muted)">— ${e.qty} (cancelled)</span>`;
    const balCell=ic?`<span style="color:var(--muted)">—</span>`:`<span class="ledger-balance" style="color:${rb<item.low?'var(--danger)':'var(--accent)'}">${rb}</span>`;
    return`<tr class="${ic?'cancelled-row':e.type==='writeoff'?'writeoff':'issue'}">
      <td>${formatDate(e.date)}</td><td><span style="font-family:'DM Mono',monospace;font-size:.82rem;color:var(--accent);font-weight:600">${e.ref}</span></td>
      <td>${e.inst}</td><td>${e.remarks||'—'}</td><td style="text-align:right">${qtyCell}</td><td style="text-align:right">${balCell}</td></tr>`;
  }).join('');
  const closeRow=`<tr style="background:var(--surface2);font-weight:700"><td colspan="4" style="text-align:right;font-size:.8rem;text-transform:uppercase;letter-spacing:.05em">Closing Balance</td><td class="ledger-balance" style="color:${rb<item.low?'var(--danger)':'var(--accent)'}">${rb}</td><td></td></tr>`;
  wrap.innerHTML=`<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;flex-wrap:wrap;gap:8px">
    <div><strong style="font-size:1rem">${item.name}</strong><span style="font-size:.8rem;color:var(--muted);margin-left:10px">${item.cat||''} · ${item.unit||''}</span></div>
    <div style="font-family:'DM Mono',monospace;font-size:.85rem;background:var(--surface2);padding:6px 14px;border-radius:8px;border:1px solid var(--border)">Current Stock: <strong style="color:var(--accent)">${item.qty} ${item.unit||''}</strong></div>
  </div>
  <div class="table-wrap" id="ledger-print-area">
    <table class="ledger-table"><thead><tr><th>Date</th><th>Voucher / Ref</th><th>Issued To / Reason</th><th>Remarks</th><th style="text-align:right">Qty Issued</th><th style="text-align:right">Balance</th></tr></thead>
    <tbody>${openRow}${rows||'<tr><td colspan="6" class="empty-msg">No transactions in this period.</td></tr>'}${closeRow}</tbody></table>
  </div>`;
}

function printLedger(){
  const itemId=document.getElementById('ledger-item-select').value;
  if(!itemId){alert('Select an item first.');return;}
  const item=stock.find(s=>s.id==itemId)||activeStock().find(s=>s.id==itemId)||expiredStock().find(s=>s.id==itemId);
  if(!item){alert('Item not found.');return;}
  const table=document.getElementById('ledger-print-area');
  if(!table){alert('No ledger data to print. Please select an item and view its ledger first.');return;}
  const orgName=settings.systemName||'Inventory Management System';
  const fromDate=document.getElementById('ledger-from').value;
  const toDate=document.getElementById('ledger-to').value;
  const dateRange=fromDate||toDate?`<div style="font-size:.78rem;color:#888;margin-top:2px">Period: ${fromDate?formatDate(fromDate):'Start'} to ${toDate?formatDate(toDate):'Present'}</div>`:'';
  const html='<div style="text-align:center;margin-bottom:20px;border-bottom:2px solid #333;padding-bottom:14px"><h2 style="font-size:1.4rem">'+orgName+'</h2><div style="font-size:.85rem;color:#555;margin-top:4px">Stock Ledger — '+item.name+'</div>'+dateRange+'<div style="font-size:.78rem;color:#888;margin-top:2px">Printed: '+new Date().toLocaleString('en-IN')+'</div></div>'+table.innerHTML;
  openPrintWindow(html);
}
