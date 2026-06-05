// ============================================================
// records.js — renderRecords, toggleVoucher, clearFilters
// ============================================================

function renderRecords(){
  const fInst=document.getElementById('filter-inst'),fItem=document.getElementById('filter-item');
  const ci=fInst.value,cx=fItem.value;
  fInst.innerHTML='<option value="">All</option>'+institutes.map(i=>`<option value="${i.id}" ${ci==i.id?'selected':''}>${i.name}</option>`).join('');
  fItem.innerHTML='<option value="">All</option>'+stock.map(s=>`<option value="${s.id}" ${cx==s.id?'selected':''}>${s.name}</option>`).join('');
  const from=document.getElementById('filter-from').value,to=document.getElementById('filter-to').value,fs=document.getElementById('filter-status').value;
  let f=[...records];
  if(ci)f=f.filter(r=>r.instId==ci);if(cx)f=f.filter(r=>r.itemId==cx);
  if(from)f=f.filter(r=>r.date>=from);if(to)f=f.filter(r=>r.date<=to);
  if(fs)f=f.filter(r=>(r.status||'active')===fs);
  f.sort((a,b)=>b.date.localeCompare(a.date));
  const tbody=document.getElementById('records-tbody');
  if(!f.length){tbody.innerHTML='<tr><td colspan="8" class="empty-msg">No records found.</td></tr>';return;}
  const voucherOrder=[];
  const voucherMap={};
  f.forEach(r=>{
    if(!voucherMap[r.voucherNo]){voucherMap[r.voucherNo]=[];voucherOrder.push(r.voucherNo);}
    voucherMap[r.voucherNo].push(r);
  });
  let html='';
  voucherOrder.forEach((vNo,vi)=>{
    const rows=voucherMap[vNo];
    const first=rows[0];
    const ic=(first.status||'active')==='cancelled';
    const grp=vi%2===0?'vgrp-a':'vgrp-b';
    const totalItems=rows.length;
    html+=`<tr class="voucher-header-row ${grp} ${ic?'cancelled':''}" onclick="toggleVoucher('${vNo}')" style="cursor:pointer">
      <td colspan="8" style="padding:0">
        <div style="display:flex;align-items:center;justify-content:space-between;padding:10px 14px;flex-wrap:wrap;gap:8px">
          <div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap">
            <span id="vtoggle-${vNo}" style="font-size:.9rem;color:var(--muted)">▶</span>
            <span style="font-family:'DM Mono',monospace;font-size:.9rem;color:var(--accent);font-weight:700">${vNo}</span>
            <span style="font-size:.82rem;color:var(--muted)">${formatDate(first.date)}</span>
            <span class="tag-inst">${first.instName}</span>
            <span style="font-size:.82rem;color:var(--muted)">${totalItems} item${totalItems>1?'s':''}</span>
            <span>${ic?'<span class="badge badge-cancelled">Cancelled</span>':'<span class="badge badge-active">Active</span>'}</span>
          </div>
          <div style="display:flex;gap:6px" onclick="event.stopPropagation()">
            <button class="btn btn-sm btn-gold print-voucher-btn" data-voucher="${vNo.replace(/"/g,'&quot;')}">🖨 Print</button>
            ${!ic?`<button class="btn btn-danger btn-sm" onclick="cancelDispatch('${vNo}')">Cancel</button>`:''}
          </div>
        </div>
      </td></tr>`;
    rows.forEach(r=>{
      html+=`<tr class="voucher-detail-row ${grp}" data-voucher="${vNo}" style="display:none">
        <td style="padding-left:40px">${r.itemName}${r.serialNotes?'<br><span style="font-size:.72rem;font-family:monospace;color:#555">'+(r.serialType||'Serial')+': '+r.serialNotes+'</span>':''}</td>
        <td>${formatDate(r.date)}</td>
        <td><span class="tag-inst">${r.instName}</span></td>
        <td style="font-family:'DM Mono',monospace;font-weight:600">${r.qty} ${r.unit||''}</td>
        <td>${r.receivedBy||'-'}${r.receivedPhone?'<br><small style="color:var(--muted)">'+r.receivedPhone+'</small>':''}</td>
        <td>${r.remarks||'—'}</td>
        <td colspan="2">${r.serialType?`<button class="btn btn-sm" style="background:#e3f2fd;border:none;color:#1565c0;font-size:.72rem" onclick="editSerialNumber('${r.id}','${(r.serialNotes||'').replace(/'/g,"\'")}','${r.serialType||''}')">✏ ${r.serialType}</button>`:''}</td>
      </tr>`;
    });
  });
  tbody.innerHTML=html;
}

function toggleVoucher(vNo){
  const rows=document.querySelectorAll(`tr.voucher-detail-row[data-voucher="${vNo}"]`);
  const icon=document.getElementById(`vtoggle-${vNo}`);
  const expanded=rows.length&&rows[0].style.display!=='none';
  rows.forEach(r=>r.style.display=expanded?'none':'table-row');
  if(icon)icon.textContent=expanded?'▶':'▼';
}
function clearFilters(){['filter-inst','filter-item','filter-from','filter-to','filter-status'].forEach(id=>document.getElementById(id).value='');renderRecords();}
