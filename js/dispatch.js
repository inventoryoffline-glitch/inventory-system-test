// ============================================================
// dispatch.js — Dispatch form, submit, cancel, search combos
// ============================================================

function renderDispatchDropdowns(){
  const active=activeStock();
  const opts=active.map(s=>`<option value="${s.id}" data-unit="${s.unit||''}" data-max="${s.qty}" data-name="${s.name.replace(/"/g,'&quot;')}" data-serialtype="${s.serialType||''}" data-serialval="${(s.serialValue||'').replace(/"/g,'&quot;')}">${s.name} (${s.qty} ${s.unit||''})</option>`).join('');
  document.querySelectorAll('.dispatch-item select').forEach(sel=>{
    const cur=sel.value;sel.innerHTML='<option value="">— Select item to dispatch —</option>'+opts;if(cur)sel.value=cur;
  });
  const dd=document.getElementById('disp-date');if(dd&&!dd.value){dd.value=getLocalDateStr();}
}

function addDispatchRow(prefillId,prefillQty){
  const active=activeStock();
  const opts=active.map(s=>`<option value="${s.id}" data-unit="${s.unit||''}" data-max="${s.qty}" data-name="${s.name.replace(/"/g,'&quot;')}" data-serialtype="${s.serialType||''}" data-serialval="${(s.serialValue||'').replace(/"/g,'&quot;')}">${s.name} (${s.qty} ${s.unit||''})</option>`).join('');
  const row=document.createElement('div');
  row.className='dispatch-item';
  row.style.flexWrap='wrap';
  row.innerHTML=`
    <select style="flex:3" onchange="updateDispatchSerial(this)"><option value="">— Select item —</option>${opts}</select>
    <input type="number" class="dispatch-qty-input" placeholder="Qty" min="1" value="${prefillQty||''}" style="flex:1;max-width:100px">
    <div class="dispatch-serial-wrap" style="flex:100%;display:none;padding:6px 0 0 0">
      <div style="font-size:.75rem;color:var(--muted);margin-bottom:4px" class="serial-label">Serial / Batch:</div>
      <textarea class="dispatch-serial-input" placeholder="Enter serial/batch numbers..." style="width:100%;padding:7px 10px;border:1px solid var(--border);border-radius:6px;font-size:.82rem;resize:vertical;min-height:50px;font-family:'DM Mono',monospace"></textarea>
    </div>
    <button onclick="this.parentElement.remove()" style="background:#ffebee;border:none;border-radius:6px;padding:7px 12px;cursor:pointer;color:#c62828;font-weight:700;font-size:1rem;flex:0">×</button>`;
  document.getElementById('dispatch-rows').appendChild(row);
  if(prefillId){
    const sel=row.querySelector('select');
    sel.value=prefillId;
    updateDispatchSerial(sel);
  }
}

function updateDispatchSerial(sel){
  const opt=sel.options[sel.selectedIndex];
  const serialType=opt?opt.dataset.serialtype||'':'';
  const serialVal=opt?opt.dataset.serialval||'':'';
  const wrap=sel.parentElement.querySelector('.dispatch-serial-wrap');
  const label=sel.parentElement.querySelector('.serial-label');
  if(!wrap)return;
  if(serialType){
    wrap.style.display='block';
    if(label)label.textContent=serialType+'s (one per line or comma separated):';
    const textarea=wrap.querySelector('.dispatch-serial-input');
    if(textarea&&serialVal&&!textarea.value)textarea.value=serialVal;
  } else {
    wrap.style.display='none';
  }
}

async function submitDispatch(){
  const voucherNo=document.getElementById('disp-voucher').value.trim();
  const instId=document.getElementById('disp-inst-id').value;
  const instName=document.getElementById('disp-inst-search').value.trim();
  const date=document.getElementById('disp-date').value;
  const receivedName=document.getElementById('disp-received-name').value.trim();
  const receivedPhone=document.getElementById('disp-received-phone').value.trim();
  const remarks=document.getElementById('disp-remarks').value.trim();
  if(!voucherNo)return showAlert('dispatch-alert','error','Please enter a voucher number.');
  if(!instId)return showAlert('dispatch-alert','error','Please select an institute.');
  if(!date)return showAlert('dispatch-alert','error','Please select a date.');
  if(!receivedName)return showAlert('dispatch-alert','error','Please enter the receiver name.');
  if(records.some(r=>r.voucherNo===voucherNo&&(r.status||'active')==='active'))return showAlert('dispatch-alert','error',`Voucher "${voucherNo}" already exists as an active record. Cancel it first or use a different number.`);
  const rows=document.querySelectorAll('#dispatch-rows .dispatch-item');
  const items=[];let hasError=false;
  rows.forEach(row=>{
    const sel=row.querySelector('select');
    const qtyInput=row.querySelector('.dispatch-qty-input');
    if(!sel||!qtyInput)return;
    const qty=parseInt(qtyInput.value);
    const itemId=sel.value;
    const opt=sel.options[sel.selectedIndex];
    if(!itemId||!qty||qty<=0)return;
    if(qty>parseInt(opt.dataset.max)){showAlert('dispatch-alert','error',`"${opt.dataset.name}" only has ${opt.dataset.max} available.`);hasError=true;return;}
    const serialTextarea=row.querySelector('.dispatch-serial-input');
    const serialNotes=serialTextarea?serialTextarea.value.trim():'';
    items.push({itemId,itemName:opt.dataset.name,qty,unit:opt.dataset.unit,serialType:opt.dataset.serialtype||'',serialNotes});
  });
  if(hasError)return;if(!items.length)return showAlert('dispatch-alert','error','Please add at least one item.');
  document.getElementById('dispatch-btn').disabled=true;showLoading(true);

  const dispatchParams={action:'dispatch',voucherNo,instId,instName,date,remarks,receivedBy:receivedName,receivedPhone,issuedBy:settings.issuedBy||'',items:JSON.stringify(items)};

  let res=await api(dispatchParams, true);

  if(!res){
    setSyncStatus('loading','Retrying...');
    await new Promise(r=>setTimeout(r,2000));
    res=await api(dispatchParams, true);
  } else if(res.error){
    if(res.error.toLowerCase().includes('already exists')||res.error.toLowerCase().includes('voucher number already')){
      res={success:true,voucherNo,_recovered:true};
    } else {
      showLoading(false);document.getElementById('dispatch-btn').disabled=false;
      showAlert('dispatch-alert','error',res.error);return;
    }
  }

  showLoading(false);document.getElementById('dispatch-btn').disabled=false;

  if(!res||res.error){
    const errMsg=res&&res.error?res.error:'Network error. Check your connection and try again.';
    showAlert('dispatch-alert','error','Dispatch failed: '+errMsg);return;
  }

  showAlert('dispatch-alert','success',`Issued! Voucher: ${voucherNo}`+(res._recovered?' (recovered from network hiccup)':''));
  ['disp-voucher','disp-inst-search','disp-inst-id','disp-received-name','disp-received-phone','disp-remarks'].forEach(id=>{const el=document.getElementById(id);if(el)el.value='';});
  const dd=document.getElementById('disp-date');if(dd){dd.value=getLocalDateStr();}
  document.getElementById('dispatch-rows').innerHTML='';
  addDispatchRow();
  await loadAll();
  setTimeout(()=>{try{printVoucher(voucherNo);}catch(e){console.warn('Print error:',e);showAlert('dispatch-alert','error','Voucher saved. Click 🖨 in Records tab to print.');}},600);
}

async function cancelDispatch(voucherNo){
  if(!confirm(`Cancel voucher "${voucherNo}"? Stock will be restored.`))return;
  showLoading(true);const res=await api({action:'cancelDispatch',voucherNo});showLoading(false);
  if(!res)return;if(res.error)return alert('Error: '+res.error);await loadAll();
}

// ── Institute search combo ─────────────────────────────────────
function instSearch(){
  const val=document.getElementById('disp-inst-search').value.toLowerCase();
  document.getElementById('disp-inst-id').value='';
  const dd=document.getElementById('disp-inst-dd'),f=institutes.filter(i=>i.name.toLowerCase().includes(val));
  dd.innerHTML=f.map(i=>`<div class="combo-option" onmousedown="selectInst('${i.id}','${i.name.replace(/'/g,"\\'")}')">${i.name}</div>`).join('');
  dd.style.display=f.length?'block':'none';
}
function instSearchOpen(){const dd=document.getElementById('disp-inst-dd');dd.innerHTML=institutes.map(i=>`<div class="combo-option" onmousedown="selectInst('${i.id}','${i.name.replace(/'/g,"\\'")}')">${i.name}</div>`).join('');dd.style.display=institutes.length?'block':'none';}
function instSearchBlur(){setTimeout(()=>{document.getElementById('disp-inst-dd').style.display='none';},200);}
function selectInst(id,name){document.getElementById('disp-inst-id').value=id;document.getElementById('disp-inst-search').value=name;document.getElementById('disp-inst-dd').style.display='none';}

// ── Receiver search ────────────────────────────────────────────
function getKnownReceivers(){const map={};records.forEach(r=>{if(r.receivedBy){const k=r.receivedBy.toLowerCase();if(!map[k])map[k]={name:r.receivedBy,phone:r.receivedPhone||''};}});return Object.values(map);}
function receiverSearch(){
  const val=document.getElementById('disp-received-name').value.toLowerCase(),dd=document.getElementById('recv-dd');
  if(!val){dd.classList.remove('open');return;}
  const m=getKnownReceivers().filter(r=>r.name.toLowerCase().includes(val));
  if(!m.length){dd.classList.remove('open');return;}
  dd.innerHTML=m.map(r=>`<div class="recv-option" onmousedown="selectReceiver('${r.name.replace(/'/g,"\\'")}','${r.phone}')"><strong>${r.name}</strong><small>${r.phone||'No phone saved'}</small></div>`).join('');
  dd.classList.add('open');
}
function receiverSearchOpen(){receiverSearch();}
function receiverSearchBlur(){setTimeout(()=>document.getElementById('recv-dd').classList.remove('open'),200);}
function selectReceiver(name,phone){document.getElementById('disp-received-name').value=name;document.getElementById('disp-received-phone').value=phone;document.getElementById('recv-dd').classList.remove('open');}
