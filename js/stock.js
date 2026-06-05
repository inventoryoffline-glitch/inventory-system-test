// ============================================================
// stock.js — Stock CRUD, expiry, render, combos, remove stock
// ============================================================

// ── Expiry helpers ───────────────────────────────────────────
function isExpiredStock(expiry){
  if(!expiry||expiry===''||expiry==='-')return false;
  const today=new Date();today.setHours(0,0,0,0);
  const exp=new Date(expiry);
  return !isNaN(exp.getTime())&&exp<today;
}
function activeStock(){return stock.filter(s=>!isExpiredStock(s.expiry));}
function expiredStock(){return stock.filter(s=>isExpiredStock(s.expiry));}

function getExpiryInfo(expiry){
  if(!expiry)return{cls:'',badge:'<span style="color:var(--muted);font-size:.8rem">—</span>'};
  const today=new Date();today.setHours(0,0,0,0);
  const d=Math.ceil((new Date(expiry)-today)/86400000);
  const near=parseInt(settings.nearExpiry)||90,high=parseInt(settings.highExpiry)||30;
  if(d<0)return{cls:'exp-high',badge:`<span class="badge badge-exp-high">⛔ Expired (${Math.abs(d)}d ago)</span>`};
  if(d<=high)return{cls:'exp-high',badge:`<span class="badge badge-exp-high">🔴 ${d}d left</span>`};
  if(d<=near)return{cls:'exp-near',badge:`<span class="badge badge-exp-near">🟡 ${d}d left</span>`};
  return{cls:'',badge:`<span class="badge badge-ok">${d}d left</span>`};
}

// ── Stock CRUD ────────────────────────────────────────────────
async function addItem(){
  const name=document.getElementById('item-name').value.trim();
  if(!name)return showAlert('stock-alert','error','Item name is required.');
  const showLow=document.getElementById('item-show-low').checked;
  showLoading(true);
  const res=await api({action:'addStock',name,cat:document.getElementById('item-cat').value.trim(),unit:document.getElementById('item-unit').value.trim(),qty:document.getElementById('item-qty').value||0,low:document.getElementById('item-low').value||10,expiry:document.getElementById('item-expiry').value||'',showLow:showLow?'true':'false',serialType:document.getElementById('item-serial-type').value||'',serialValue:document.getElementById('item-serial-value').value.trim()||'',refNumber:document.getElementById('item-ref-number').value.trim()||''});
  showLoading(false);if(!res)return;
  ['item-name','item-cat','item-unit','item-qty','item-low','item-expiry','item-serial-value','item-ref-number'].forEach(id=>document.getElementById(id).value='');
  document.getElementById('item-serial-type').value='';
  document.getElementById('item-show-low').checked=true;
  showAlert('stock-alert','success',`"${name}" added.`);await loadAll();
}
async function addQty(id){const x=parseInt(prompt('Enter quantity to add:'));if(!x||x<=0)return;showLoading(true);await api({action:'updateStock',id,addQty:x});showLoading(false);await loadAll();}
async function deleteItem(id,name){if(!confirm(`Delete "${name}"?`))return;showLoading(true);await api({action:'deleteStock',id});showLoading(false);await loadAll();}
async function toggleShowLow(id,val){await api({action:'updateShowLow',id,showLow:val?'true':'false'});await loadAll();}

// ── Stock view (summary / detail) ─────────────────────────────
let currentStockView='summary';
function setStockView(mode){
  currentStockView=mode;
  document.getElementById('view-summary-btn').style.background=mode==='summary'?'var(--accent)':'var(--surface2)';
  document.getElementById('view-summary-btn').style.color=mode==='summary'?'#fff':'var(--text)';
  document.getElementById('view-detail-btn').style.background=mode==='detail'?'var(--accent)':'var(--surface2)';
  document.getElementById('view-detail-btn').style.color=mode==='detail'?'#fff':'var(--text)';
  renderStock();
}
function getStockSummary(items){
  const map={};
  items.forEach(it=>{
    const key=it.name.trim().toLowerCase();
    if(!map[key]){map[key]={...it,qty:0,batches:[]};}
    map[key].qty+=parseInt(it.qty)||0;
    if(it.serialValue||it.expiry){map[key].batches.push({serialType:it.serialType||'',serialValue:it.serialValue||'',expiry:it.expiry||'',qty:parseInt(it.qty)||0});}
  });
  return Object.values(map);
}
function renderStock(){
  const tbody=document.getElementById('stock-tbody');
  const activeItems=activeStock();
  if(!activeItems.length){tbody.innerHTML='<tr><td colspan="9" class="empty-msg">No items yet.</td></tr>';return;}
  if(currentStockView==='summary'){
    const summaryItems=getStockSummary(activeItems);
    tbody.innerHTML=summaryItems.map((it,i)=>{
      const sl=it.showLow!==false&&it.showLow!=='false';
      const ss=it.qty===0?'<span class="badge badge-out">Out of Stock</span>':it.qty<=it.low?'<span class="badge badge-low">Low Stock</span>':'<span class="badge badge-ok">In Stock</span>';
      const batchInfo=it.batches.length?`<span style="font-size:.75rem;color:var(--muted)">${it.batches.length} batch${it.batches.length>1?'es':''}</span>`:'—';
      return`<tr><td>${i+1}</td><td><strong>${it.name}</strong></td><td>${it.cat||'-'}</td><td>${it.unit||'-'}</td>
        <td style="font-family:'DM Mono',monospace;font-weight:700">${it.qty}</td>
        <td>${batchInfo}</td><td>—</td><td>—</td>
        <td><label style="cursor:pointer;display:flex;align-items:center;gap:5px;font-size:.8rem"><input type="checkbox" ${sl?'checked':''} onchange="toggleShowLow('${it.id}',this.checked)" style="accent-color:var(--accent)"> Alert</label></td>
        <td>${ss}</td>
        <td style="display:flex;gap:6px">
          <button style="background:#e8f5e9;color:#2e7d32;border:none;border-radius:6px;padding:5px 10px;cursor:pointer;font-weight:600;font-size:.78rem" onclick="addQty('${it.id}')">+ Add</button>
          <button class="btn-danger btn" onclick="deleteItem('${it.id}','${it.name}')">Del</button>
        </td></tr>`;
    }).join('');
    return;
  }
  tbody.innerHTML=activeItems.map((it,i)=>{
    const ss=it.qty===0?'<span class="badge badge-out">Out of Stock</span>':it.qty<=it.low?'<span class="badge badge-low">Low Stock</span>':'<span class="badge badge-ok">In Stock</span>';
    const exp=getExpiryInfo(it.expiry);const sl=it.showLow!==false&&it.showLow!=='false';
    const batchDisplay=it.serialType?`<span style="font-size:.75rem;color:var(--muted)">${it.serialType}:</span><br><span style="font-size:.82rem;font-family:'DM Mono',monospace">${it.serialValue||'—'}</span>`:'—';
    return`<tr class="${exp.cls}"><td>${i+1}</td><td><strong>${it.name}</strong></td><td>${it.cat||'-'}</td><td>${it.unit||'-'}</td>
      <td style="font-family:'DM Mono',monospace;font-weight:700">${it.qty}</td>
      <td style="font-size:.82rem">${batchDisplay}</td>
      <td style="font-size:.82rem;color:var(--muted)">${it.refNumber||'—'}</td>
      <td>${it.expiry?formatDate(it.expiry)+'<br>'+exp.badge:exp.badge}</td>
      <td><label style="cursor:pointer;display:flex;align-items:center;gap:5px;font-size:.8rem"><input type="checkbox" ${sl?'checked':''} onchange="toggleShowLow('${it.id}',this.checked)" style="accent-color:var(--accent)"> Alert</label></td>
      <td>${ss}</td>
      <td style="display:flex;gap:6px">
        <button style="background:#e8f5e9;color:#2e7d32;border:none;border-radius:6px;padding:5px 10px;cursor:pointer;font-weight:600;font-size:.78rem" onclick="addQty('${it.id}')">+ Add</button>
        <button class="btn-danger btn" onclick="deleteItem('${it.id}','${it.name}')">Del</button>
      </td></tr>`;
  }).join('');
}
function renderExpiredStock(){
  const tbody=document.getElementById('expired-tbody');
  const expired=expiredStock();
  if(!expired.length){tbody.innerHTML='<tr><td colspan="8" class="empty-msg">No expired items.</td></tr>';return;}
  const today=new Date();today.setHours(0,0,0,0);
  tbody.innerHTML=expired.map((it,i)=>{
    const exp=new Date(it.expiry);
    const daysExpired=Math.abs(Math.ceil((exp-today)/86400000));
    const batch=it.serialType?`<span style="font-size:.75rem;color:var(--muted)">${it.serialType}:</span><br><span style="font-size:.82rem;font-family:'DM Mono',monospace">${it.serialValue||'—'}</span>`:'—';
    return`<tr style="background:#ffebee"><td>${i+1}</td><td><strong>${it.name}</strong></td><td>${it.cat||'-'}</td><td>${it.unit||'—'}</td><td style="font-family:'DM Mono',monospace;font-weight:700">${it.qty}</td><td>${batch}</td><td style="color:var(--danger);font-weight:600">${formatDate(it.expiry)}</td><td style="color:var(--danger);font-family:'DM Mono',monospace">${daysExpired}d ago</td></tr>`;
  }).join('');
}

// ── Remove / Write-off stock ──────────────────────────────────
async function removeStock(){
  const itemId=document.getElementById('remove-item-id').value;
  const qty=parseInt(document.getElementById('remove-qty').value);
  const date=document.getElementById('remove-date').value;
  const reason=document.getElementById('remove-reason').value;
  const remarks=document.getElementById('remove-remarks').value.trim();
  if(!itemId)return showAlert('remove-alert','error','Please select an item.');
  if(!qty||qty<=0)return showAlert('remove-alert','error','Please enter a valid quantity.');
  if(!date)return showAlert('remove-alert','error','Please select a date.');
  const item=stock.find(s=>s.id==itemId);
  if(qty>item.qty)return showAlert('remove-alert','error',`Only ${item.qty} ${item.unit||''} available.`);
  if(!confirm(`Remove ${qty} ${item.unit||''} of "${item.name}"? Reason: ${reason}`))return;
  showLoading(true);const res=await api({action:'removeStock',itemId,qty,date,reason,remarks});showLoading(false);
  if(!res)return;
  showAlert('remove-alert','success',`${qty} removed. Reason: ${reason}`);
  document.getElementById('remove-qty').value='';document.getElementById('remove-remarks').value='';
  await loadAll();
}
function renderAdjustments(){
  const fi=document.getElementById('adj-filter-item'),cur=fi.value;
  fi.innerHTML='<option value="">All Items</option>'+stock.map(s=>`<option value="${s.id}" ${cur==s.id?'selected':''}>${s.name}</option>`).join('');
  const fr=document.getElementById('adj-filter-reason').value,from=document.getElementById('adj-from').value,to=document.getElementById('adj-to').value;
  let f=[...adjustments];
  if(cur)f=f.filter(a=>a.itemId==cur);if(fr)f=f.filter(a=>a.reason===fr);
  if(from)f=f.filter(a=>a.date>=from);if(to)f=f.filter(a=>a.date<=to);
  f.sort((a,b)=>b.date.localeCompare(a.date));
  const tbody=document.getElementById('adj-tbody');
  if(!f.length){tbody.innerHTML='<tr><td colspan="6" class="empty-msg">No adjustments found.</td></tr>';return;}
  tbody.innerHTML=f.map(a=>`<tr>
    <td>${formatDate(a.date)}</td><td><strong>${a.itemName}</strong></td>
    <td style="font-family:'DM Mono',monospace;color:var(--danger);font-weight:700">−${a.qty} ${a.unit||''}</td>
    <td><span class="badge badge-low">${a.reason}</span></td>
    <td>${a.remarks||'—'}</td><td style="font-family:'DM Mono',monospace">${a.stockAfter}</td></tr>`).join('');
}
function clearAdjFilters(){['adj-filter-item','adj-filter-reason','adj-from','adj-to'].forEach(id=>document.getElementById(id).value='');renderAdjustments();}

// ── Combo dropdowns (add item form) ──────────────────────────
const staticUnits=['pieces','boxes','bottles','packets','strips','vials','kg','grams','litres','ml','units','pairs','sets'];
const comboSrc={name:()=>[...new Set(stock.map(s=>s.name).filter(Boolean))],cat:()=>[...new Set(stock.map(s=>s.cat).filter(Boolean))],unit:()=>[...new Set(stock.map(s=>s.unit).filter(Boolean))]};
function comboOpen(f){comboFilter(f);document.getElementById('combo-'+f+'-dd').classList.add('open');}
function comboBlur(f){setTimeout(()=>document.getElementById('combo-'+f+'-dd').classList.remove('open'),200);}
function comboFilter(f){
  const val=document.getElementById('item-'+f).value.toLowerCase();
  let opts=f==='unit'?[...new Set([...staticUnits,...comboSrc[f]()])]:[...comboSrc[f]()];
  const filtered=opts.filter(o=>o.toLowerCase().includes(val));
  const dd=document.getElementById('combo-'+f+'-dd');dd.innerHTML='';
  filtered.forEach(o=>{const d=document.createElement('div');d.className='combo-option';d.textContent=o;d.onmousedown=()=>{document.getElementById('item-'+f).value=o;dd.classList.remove('open');};dd.appendChild(d);});
  if(val&&!opts.find(o=>o.toLowerCase()===val)){const d=document.createElement('div');d.className='combo-option new-tag';d.textContent='+ Add "'+val+'"';d.onmousedown=()=>{document.getElementById('item-'+f).value=val;dd.classList.remove('open');};dd.appendChild(d);}
}
