// ============================================================
// dashboard.js — renderDashboard
// ============================================================

function renderDashboard(){
  const activeRecs=records.filter(r=>(r.status||'active')==='active');
  const lowItems=stock.filter(s=>s.showLow!==false&&s.showLow!=='false'&&s.qty<=s.low);
  document.getElementById('stats-row').innerHTML=`
    <div class="stat-box"><div class="num">${stock.length}</div><div class="lbl">Item Types</div></div>
    <div class="stat-box"><div class="num" style="color:${lowItems.length?'var(--danger)':'var(--accent)'}">${lowItems.length}</div><div class="lbl">Low Stock Items</div></div>
    <div class="stat-box"><div class="num">${institutes.length}</div><div class="lbl">Institutes</div></div>
    <div class="stat-box"><div class="num">${activeRecs.length}</div><div class="lbl">Active Dispatches</div></div>`;
  const grouped={};[...records].sort((a,b)=>b.date.localeCompare(a.date)).forEach(r=>{if(!grouped[r.voucherNo])grouped[r.voucherNo]=r;});
  document.getElementById('dash-recent-body').innerHTML=!Object.keys(grouped).length?'<tr><td colspan="5" class="empty-msg">No dispatches yet.</td></tr>'
    :Object.values(grouped).slice(0,8).map(r=>{const ic=(r.status||'active')==='cancelled';return'<tr><td>'+formatDate(r.date)+'</td><td style="font-family:\'DM Mono\',monospace;font-size:.8rem;color:var(--accent);font-weight:600">'+r.voucherNo+'</td><td><span class="tag-inst">'+r.instName+'</span></td><td>'+(ic?'<span class="badge badge-cancelled">Cancelled</span>':'<span class="badge badge-active">Active</span>')+'</td><td><button class="print-voucher-btn" data-voucher="'+r.voucherNo.replace(/"/g,'&quot;')+'" style="background:#e8f0fe;border:none;color:#1a56db;border-radius:6px;cursor:pointer;padding:4px 10px;font-size:.78rem;font-weight:600">🖨</button></td></tr>';}).join('');
  document.getElementById('low-stock-list').innerHTML=!lowItems.length?'<p class="empty-msg">All tracked items OK ✓</p>'
    :lowItems.map(s=>`<div style="display:flex;justify-content:space-between;align-items:center;padding:8px 0;border-bottom:1px solid var(--border)"><div><strong>${s.name}</strong><br><span style="font-size:.8rem;color:var(--muted)">${s.cat||'-'}</span></div><div style="text-align:right"><span style="font-family:'DM Mono',monospace;font-size:1.1rem;font-weight:600;color:${s.qty===0?'var(--danger)':'#e65100'}">${s.qty}</span><br><span style="font-size:.75rem;color:var(--muted)">${s.unit||''}</span></div></div>`).join('');
  const near=parseInt(settings.nearExpiry)||90;
  const expiring=stock.filter(s=>{if(!s.expiry)return false;return Math.ceil((new Date(s.expiry)-new Date())/86400000)<=near;}).sort((a,b)=>new Date(a.expiry)-new Date(b.expiry));
  document.getElementById('expiry-alert-list').innerHTML=!expiring.length?'<p class="empty-msg">No items near expiry ✓</p>'
    :expiring.map(s=>{const exp=getExpiryInfo(s.expiry);return`<div style="display:flex;justify-content:space-between;align-items:center;background:${exp.cls==='exp-high'?'#fff5f5':'#fffdf0'};border-radius:4px;padding:8px 10px;margin-bottom:4px"><div><strong>${s.name}</strong><br><span style="font-size:.8rem;color:var(--muted)">${s.cat||'-'}</span></div><div style="text-align:right">${exp.badge}<br><span style="font-size:.75rem;color:var(--muted)">${formatDate(s.expiry)}</span></div></div>`;}).join('');
}
