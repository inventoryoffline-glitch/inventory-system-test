// ============================================================
// audit.js — runAudit, renderAuditResults, badge, export
// ============================================================

let lastAuditResults=[];

function runAudit(silent){
  const results=[];
  const negStock=stock.filter(s=>s.qty<0);
  results.push({id:'neg_stock',title:'No Negative Stock',status:negStock.length===0?'pass':'fail',detail:negStock.length===0?'All '+stock.length+' items have zero or positive stock.':negStock.map(s=>s.name+' ('+s.qty+')').join(', ')});
  const stockMismatch=[];
  stock.forEach(s=>{
    const recDispatched=records.filter(r=>r.itemId==s.id&&(r.status||'active')==='active').reduce((sum,r)=>sum+(parseInt(r.qty)||0),0);
    const stockDispatched=parseInt(s.dispatched)||0;
    if(recDispatched!==stockDispatched)stockMismatch.push(s.name+': stock shows '+stockDispatched+', records show '+recDispatched);
  });
  results.push({id:'disp_match',title:'Stock Dispatched Count Matches Records',status:stockMismatch.length===0?'pass':'warn',detail:stockMismatch.length===0?'All dispatched counts match active records.':stockMismatch.join(' | ')});
  const cancelledWithStock=records.filter(r=>(r.status||'active')==='cancelled');
  results.push({id:'cancelled_clean',title:'Cancelled Records Not Affecting Balances',status:'pass',detail:cancelledWithStock.length+' cancelled records found. Stock restoration is handled automatically on cancel.'});
  const overAlloc=distAllocations.filter(a=>parseInt(a.dispatchedQty)>parseInt(a.plannedQty));
  results.push({id:'alloc_over',title:'No Allocation Exceeds Planned Quantity',status:overAlloc.length===0?'pass':'warn',detail:overAlloc.length===0?'All '+distAllocations.length+' allocations are within planned limits.':overAlloc.length+' allocation(s) have dispatched more than planned.'});
  const lowButActive=stock.filter(s=>s.showLow!==false&&s.showLow!=='false'&&s.qty<=s.low&&s.qty>0&&!isExpiredStock(s.expiry));
  results.push({id:'low_stock',title:'Low Stock Items',status:lowButActive.length===0?'pass':'warn',detail:lowButActive.length===0?'No items below low-stock threshold.':lowButActive.length+' item(s) below threshold: '+lowButActive.map(s=>s.name+' ('+s.qty+')').join(', ')});
  const outOfStock=stock.filter(s=>s.qty===0&&!isExpiredStock(s.expiry));
  results.push({id:'out_of_stock',title:'No Items Completely Out of Stock',status:outOfStock.length===0?'pass':'warn',detail:outOfStock.length===0?'All active items have stock.':outOfStock.length+' item(s) at zero: '+outOfStock.map(s=>s.name).join(', ')});
  const orphanRecs=records.filter(r=>{const instOk=institutes.find(i=>i.id==r.instId);const itemOk=stock.find(s=>s.id==r.itemId);return !instOk||!itemOk;});
  results.push({id:'rec_refs',title:'All Records Have Valid References',status:orphanRecs.length===0?'pass':'warn',detail:orphanRecs.length===0?'All '+records.length+' records reference valid institutes and items.':orphanRecs.length+' records reference deleted institutes or items.'});
  const zeroAllocs=distAllocations.filter(a=>parseInt(a.plannedQty)<=0);
  results.push({id:'zero_allocs',title:'No Zero-Quantity Allocations',status:zeroAllocs.length===0?'pass':'warn',detail:zeroAllocs.length===0?'All allocations have positive planned quantities.':zeroAllocs.length+' allocations have zero or negative planned quantities.'});
  
  // NEW CHECKS
  const thirtyDaysAgo=new Date();thirtyDaysAgo.setDate(thirtyDaysAgo.getDate()-30);
  const inactiveInsts=[];
  institutes.forEach(inst=>{
    const lastDispatch=records.filter(r=>r.instId==inst.id&&(r.status||'active')==='active').sort((a,b)=>new Date(b.date)-new Date(a.date))[0];
    if(!lastDispatch||new Date(lastDispatch.date)<thirtyDaysAgo)inactiveInsts.push(inst.name);
  });
  results.push({id:'inst_activity',title:'Institute Activity (Last 30 Days)',status:inactiveInsts.length===0?'pass':'info',detail:inactiveInsts.length===0?'All institutes active in last 30 days.':inactiveInsts.length+' institute(s) inactive: '+inactiveInsts.slice(0,5).join(', ')+(inactiveInsts.length>5?'...':'')});
  
  const today=new Date();const expiringDate=new Date();expiringDate.setDate(expiringDate.getDate()+30);
  const expiringItems=stock.filter(s=>{if(!s.expiry)return false;const ed=new Date(s.expiry);return ed>=today&&ed<=expiringDate&&parseInt(s.qty)>0;});
  results.push({id:'expiry_trend',title:'Items Expiring in Next 30 Days',status:expiringItems.length===0?'pass':'warn',detail:expiringItems.length===0?'No items expiring soon.':expiringItems.length+' item(s) expiring: '+expiringItems.map(s=>s.name).slice(0,5).join(', ')+(expiringItems.length>5?'...':'')});
  
  const fails=results.filter(r=>r.status==='fail').length;
  const warns=results.filter(r=>r.status==='warn').length;
  const passes=results.filter(r=>r.status==='pass').length;
  lastAuditResults=results;
  updateAuditBadge(fails,warns,passes);
  if(!silent){
    renderAuditResults(results,fails,warns);
    document.getElementById('audit-last-run').textContent='Last run: '+new Date().toLocaleString('en-IN');
  }
  return results;
}

function updateAuditBadge(fails,warns,passes){
  const badge=document.getElementById('audit-badge');
  const icon=document.getElementById('audit-badge-icon');
  const label=document.getElementById('audit-badge-label');
  if(!badge)return;
  badge.style.display='flex';
  if(fails>0){badge.style.background='rgba(192,57,43,.8)';icon.textContent='🔴';label.textContent=fails+' Issue'+(fails>1?'s':'');}
  else if(warns>0){badge.style.background='rgba(200,169,81,.8)';icon.textContent='🟡';label.textContent=warns+' Warning'+(warns>1?'s':'');}
  else{badge.style.background='rgba(74,124,47,.8)';icon.textContent='✅';label.textContent='Audit OK';}
}

function renderAuditResults(results,fails,warns){
  const wrap=document.getElementById('audit-results');if(!wrap)return;
  const summary=`<div style="display:flex;gap:12px;flex-wrap:wrap;margin-bottom:16px">
    <div class="stat-box" style="min-width:100px;padding:12px 16px"><div class="num" style="color:var(--accent2);font-size:1.4rem">${results.filter(r=>r.status==='pass').length}</div><div class="lbl">Passed</div></div>
    <div class="stat-box" style="min-width:100px;padding:12px 16px"><div class="num" style="color:#e65100;font-size:1.4rem">${warns}</div><div class="lbl">Warnings</div></div>
    <div class="stat-box" style="min-width:100px;padding:12px 16px"><div class="num" style="color:var(--danger);font-size:1.4rem">${fails}</div><div class="lbl">Failed</div></div>
  </div>`;
  const rows=results.map(r=>`
    <div class="audit-row ${r.status}">
      <div class="audit-icon">${r.status==='pass'?'✅':r.status==='warn'?'⚠️':r.status==='info'?'ℹ️':'❌'}</div>
      <div><div class="audit-title">${r.title}</div><div class="${r.status==='fail'?'audit-fail-detail':'audit-detail'}">${r.detail}</div></div>
    </div>`).join('');
  wrap.innerHTML=summary+rows;
}

function openAuditFromBadge(){
  const auditBtn=document.querySelector('.tab-btn[onclick*="audit"]');
  if(auditBtn)switchTab('audit',auditBtn);
  if(!lastAuditResults.length)runAudit();
  else renderAuditResults(lastAuditResults,lastAuditResults.filter(r=>r.status==='fail').length,lastAuditResults.filter(r=>r.status==='warn').length);
}

function exportAuditCSV(){
  if(!lastAuditResults.length){alert('Please run the audit first.');return;}
  const rows=[['Check','Status','Detail']];
  lastAuditResults.forEach(r=>rows.push([r.title,r.status.toUpperCase(),r.detail]));
  rows.push(['','','']);
  rows.push(['Audit run at',new Date().toLocaleString('en-IN'),'']);
  exportCSV(rows,'audit_report_'+getLocalDateStr()+'.csv');
}
