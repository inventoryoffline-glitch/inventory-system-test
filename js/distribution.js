// ============================================================
// distribution.js — Templates, workspace, progress, institute view, export
// ============================================================

function renderDistributionCentre(){
  renderTemplateList();renderProgressSelects();renderInstituteViewSelects();renderExportSelects();renderDCStats();
  if(activeTemplateId)openTemplateWorkspace(activeTemplateId,false);
}

function renderDCStats(){
  const activeTemplates=distTemplates.filter(t=>t.status==='Active').length;
  document.getElementById('dc-stat-templates').textContent=activeTemplates;
  const allInstIds=[...new Set(distAllocations.map(a=>a.instituteId))];
  let fullyDone=0,partial=0,notStarted=0;
  const pendingList=[];
  allInstIds.forEach(instId=>{
    const allocs=distAllocations.filter(a=>a.instituteId==instId);
    const totalPlanned=allocs.reduce((s,a)=>s+a.plannedQty,0);
    const totalDispatched=allocs.reduce((s,a)=>s+a.dispatchedQty,0);
    const instName=allocs[0]?allocs[0].instituteName:'Unknown';
    if(totalDispatched<=0){
      notStarted++;
      const pendingItems=[...new Set(allocs.map(a=>a.itemName))];
      const pendingTemplates=[...new Set(allocs.map(a=>{const t=distTemplates.find(t=>t.templateId==a.templateId);return t?t.templateName:'Unknown';}))];
      pendingList.push({instName,items:pendingItems,templates:pendingTemplates,status:'pending'});
    } else if(totalDispatched>=totalPlanned){
      fullyDone++;
    } else {
      partial++;
      const pendingItems=[...new Set(allocs.filter(a=>a.dispatchedQty<a.plannedQty).map(a=>a.itemName))];
      const pendingTemplates=[...new Set(allocs.filter(a=>a.dispatchedQty<a.plannedQty).map(a=>{const t=distTemplates.find(t=>t.templateId==a.templateId);return t?t.templateName:'Unknown';}))];
      pendingList.push({instName,items:pendingItems,templates:pendingTemplates,status:'partial'});
    }
  });
  document.getElementById('dc-stat-complete').textContent=fullyDone;
  document.getElementById('dc-stat-partial').textContent=partial;
  document.getElementById('dc-stat-pending').textContent=notStarted;
  const callWrap=document.getElementById('dc-call-list');
  if(!pendingList.length){callWrap.style.display='none';return;}
  callWrap.style.display='block';
  callWrap.innerHTML=`
    <div class="card" style="margin-bottom:0;border-color:#ef9a9a">
      <div class="card-title" style="color:var(--danger)">📞 Follow-up List — Institutes with Pending Supply</div>
      <div class="table-wrap">
        <table>
          <thead><tr><th>Institute</th><th>Pending Templates</th><th>Items Pending</th><th>Status</th></tr></thead>
          <tbody>
            ${pendingList.map(p=>`<tr style="background:${p.status==='pending'?'#fff8f0':'#f3f8ff'}">
              <td><strong>${p.instName}</strong></td>
              <td>${p.templates.map(t=>'<span class="tag-inst" style="margin:2px;display:inline-block">'+t+'</span>').join(' ')}</td>
              <td style="font-size:.85rem;color:var(--muted)">${p.items.join(', ')}</td>
              <td>${p.status==='pending'?'<span class="badge badge-pending">Not Started</span>':'<span class="badge badge-partial">Partial</span>'}</td>
            </tr>`).join('')}
          </tbody>
        </table>
      </div>
    </div>`;
}

function filterDCByStatus(status){
  dcSwitchTab('progress',document.querySelectorAll('.dc-tab-btn')[2]);
}

function renderTemplateList(){
  const search=(document.getElementById('tpl-search').value||'').toLowerCase();
  const sf=document.getElementById('tpl-filter-status').value;
  let tpls=[...distTemplates];
  if(search)tpls=tpls.filter(t=>t.templateName.toLowerCase().includes(search)||(t.purpose||'').toLowerCase().includes(search));
  if(sf)tpls=tpls.filter(t=>t.status===sf);
  const wrap=document.getElementById('template-list');
  if(!tpls.length){wrap.innerHTML='<p class="empty-msg">No templates found.</p>';return;}
  wrap.innerHTML=tpls.map(t=>{
    const allocs=distAllocations.filter(a=>a.templateId==t.templateId);
    const planned=allocs.reduce((s,a)=>s+a.plannedQty,0),dispatched=allocs.reduce((s,a)=>s+a.dispatchedQty,0);
    const pct=planned>0?Math.round(dispatched/planned*100):0;
    const instCount=new Set(allocs.filter(a=>a.plannedQty>0).map(a=>a.instituteId)).size;
    const sb=t.status==='Active'?'badge-active':t.status==='Completed'?'badge-complete':t.status==='Archived'?'badge-archived':'badge-draft';
    return`<div class="template-card ${activeTemplateId==t.templateId?'selected':''}">
      <div class="template-card-left">
        <h3>${t.templateName} <span class="badge ${sb}" style="font-size:.7rem;margin-left:6px">${t.status}</span></h3>
        <p>${t.purpose||'No purpose set'} · Target: ${t.targetDate?formatDate(t.targetDate):'—'}</p>
        <p style="margin-top:4px">${instCount} institutes · ${allocs.length} allocations · ${pct}% dispatched</p>
        <div class="progress-bar-wrap"><div class="progress-bar" style="width:${pct}%"></div></div>
      </div>
      <div style="display:flex;flex-direction:column;gap:6px;align-items:flex-end">
        <button class="btn btn-primary btn-sm" onclick="openTemplateWorkspace('${t.templateId}',true)">Open →</button>
        <button class="btn btn-sm" style="background:#e3f2fd;border:none;color:#1565c0;font-size:.75rem" onclick="duplicateTemplate('${t.templateId}')">Duplicate</button>
        <button class="btn btn-sm" style="background:var(--surface2);border:1px solid var(--border);font-size:.75rem" onclick="archiveTemplate('${t.templateId}','${t.status}')">Archive</button>
        <button class="btn btn-danger btn-sm" onclick="deleteTemplate('${t.templateId}')">Delete</button>
      </div>
    </div>`;
  }).join('');
}

async function createTemplate(){
  const name=document.getElementById('tpl-name').value.trim();
  if(!name)return showAlert('dc-manager-alert','error','Template name is required.');
  showLoading(true);
  const res=await api({action:'createTemplate',templateName:name,purpose:document.getElementById('tpl-purpose').value.trim(),targetDate:document.getElementById('tpl-date').value,status:document.getElementById('tpl-status').value});
  showLoading(false);if(!res)return;
  ['tpl-name','tpl-purpose','tpl-date'].forEach(id=>document.getElementById(id).value='');
  showAlert('dc-manager-alert','success',`Template "${name}" created.`);await loadAll();
}

async function deleteTemplate(id){
  if(!confirm('Delete this template and all its allocations?'))return;
  showLoading(true);await api({action:'deleteTemplate',templateId:id});showLoading(false);
  if(activeTemplateId==id){activeTemplateId=null;document.getElementById('dc-workspace-empty').style.display='block';document.getElementById('dc-workspace-content').style.display='none';}
  await loadAll();
}

async function archiveTemplate(id,cur){
  const ns=cur==='Archived'?'Active':'Archived';
  showLoading(true);await api({action:'updateTemplateStatus',templateId:id,status:ns});showLoading(false);await loadAll();
}

async function duplicateTemplate(id){
  const tpl=distTemplates.find(t=>t.templateId==id);if(!tpl)return;
  showLoading(true);const res=await api({action:'duplicateTemplate',templateId:id,newName:'Copy of '+tpl.templateName});showLoading(false);
  if(!res)return;showAlert('dc-manager-alert','success','Template duplicated.');await loadAll();
}

function openTemplateWorkspace(templateId,doSwitch){
  activeTemplateId=templateId;
  const tpl=distTemplates.find(t=>t.templateId==templateId);if(!tpl)return;
  if(doSwitch){
    document.querySelectorAll('.dc-tab-content').forEach(el=>el.classList.remove('active'));
    document.querySelectorAll('.dc-tab-btn').forEach(el=>el.classList.remove('active'));
    document.getElementById('dc-tab-workspace').classList.add('active');
    document.querySelectorAll('.dc-tab-btn')[1].classList.add('active');
  }
  document.getElementById('dc-workspace-empty').style.display='none';
  document.getElementById('dc-workspace-content').style.display='block';
  document.getElementById('ws-template-name').textContent=tpl.templateName;
  document.getElementById('ws-template-meta').textContent=(tpl.purpose||'')+' · '+tpl.status+(tpl.targetDate?' · Target: '+formatDate(tpl.targetDate):'');
  gridSelectedInsts=[];gridSelectedItems=[];gridData={};gridDistrib={};gridEqualRow={};
  document.getElementById('grid-inst-tags').innerHTML='';
  document.getElementById('grid-item-tags').innerHTML='';
  document.getElementById('alloc-grid-wrap').style.display='none';
  loadGridFromAllocations(templateId);
  populateGridCatFilter();
  populateGridItemCatFilter();
  renderWorkspace();
}

async function saveAllocationDirect(templateId,instituteId,instituteName,itemId,itemName,unit,plannedQty){
  return await api({action:'saveAllocation',templateId,instituteId,instituteName,itemId,itemName,unit,plannedQty});
}

async function deleteAllocation(allocId){
  if(!confirm('Delete this allocation?'))return;
  showLoading(true);await api({action:'deleteAllocation',allocationId:allocId});showLoading(false);await loadAll();
}

function renderWorkspace(){
  if(!activeTemplateId)return;
  const allocs=distAllocations.filter(a=>a.templateId==activeTemplateId);
  const tbody=document.getElementById('allocations-tbody');
  if(!tbody)return;
  if(!allocs.length){tbody.innerHTML='<tr><td colspan="8" class="empty-msg">No allocations yet. Use the grid above to add and save allocations.</td></tr>';return;}
  tbody.innerHTML=allocs.map(a=>{
    const rem=Math.max(0,a.plannedQty-a.dispatchedQty);
    const status=a.dispatchedQty===0?'Pending':rem<=0?'Complete':'Partial';
    const sb=status==='Complete'?'badge-complete':status==='Partial'?'badge-partial':'badge-pending';
    const tc=status==='Complete'?'alloc-complete':status==='Partial'?'alloc-partial':'alloc-pending';
    const safeName=(a.instituteName||'').replace(/'/g,"\\'");
    return`<tr class="${tc}">
      <td><span class="tag-inst">${a.instituteName}</span></td>
      <td>${a.itemName}</td><td>${a.unit||'-'}</td>
      <td style="font-family:'DM Mono',monospace;font-weight:600">${a.plannedQty}</td>
      <td style="font-family:'DM Mono',monospace;color:var(--accent2)">${a.dispatchedQty}</td>
      <td style="font-family:'DM Mono',monospace;color:${rem<=0?'var(--accent2)':'var(--danger)'}">${rem}</td>
      <td><span class="badge ${sb}">${status}</span></td>
      <td style="display:flex;gap:5px;flex-wrap:wrap">
        ${rem>0?`<button class="btn btn-sm btn-primary" onclick="dispatchFromAllocation('${a.instituteId}','${safeName}','${a.itemId}',${rem},'${a.unit||''}')">Dispatch</button>`:''}
        <button class="btn btn-danger btn-sm" onclick="deleteAllocation('${a.allocationId}')">Del</button>
      </td>
    </tr>`;
  }).join('');
}

function switchToDispatch(){
  const btns=document.querySelectorAll('.tab-btn');
  let dispBtn=null;
  btns.forEach(b=>{if(b.textContent.trim().includes('Dispatch Items'))dispBtn=b;});
  if(dispBtn)switchTab('dispatch',dispBtn);
  window.scrollTo({top:0,behavior:'smooth'});
}

function dispatchFromAllocation(instId,instName,itemId,remaining,unit){
  switchToDispatch();
  setTimeout(()=>{
    document.getElementById('disp-inst-search').value=instName;
    document.getElementById('disp-inst-id').value=instId;
    document.getElementById('disp-date').value=getLocalDateStr();
    document.getElementById('dispatch-rows').innerHTML='';
    addDispatchRow(itemId,remaining);
    const vf=document.getElementById('disp-voucher');
    if(vf){vf.focus();vf.scrollIntoView({behavior:'smooth',block:'center'});}
    showAlert('dispatch-alert','info',`Pre-filled from allocation: ${remaining} ${unit} for ${instName}. Enter voucher number and receiver to complete.`);
  },100);
}

// ── Progress Dashboard ────────────────────────────────────────
function renderProgressSelects(){
  const sel=document.getElementById('progress-template-select'),cur=sel.value;
  sel.innerHTML='<option value="">— Select Template —</option>'+distTemplates.map(t=>`<option value="${t.templateId}" ${cur==t.templateId?'selected':''}>${t.templateName}</option>`).join('');
  if(cur)renderProgressDashboard();
}

function renderProgressDashboard(){
  const templateId=document.getElementById('progress-template-select').value,wrap=document.getElementById('progress-content');
  if(!templateId){wrap.innerHTML='<p class="empty-msg">Select a template above.</p>';return;}
  const allocs=distAllocations.filter(a=>a.templateId==templateId);
  if(!allocs.length){wrap.innerHTML='<p class="empty-msg">No allocations in this template yet.</p>';return;}
  const instMap={};
  allocs.forEach(a=>{if(!instMap[a.instituteId])instMap[a.instituteId]={name:a.instituteName,planned:0,dispatched:0,items:0};instMap[a.instituteId].planned+=a.plannedQty;instMap[a.instituteId].dispatched+=a.dispatchedQty;instMap[a.instituteId].items++;});
  const rows=Object.entries(instMap).map(([id,d])=>{
    const rem=d.planned-d.dispatched,pct=d.planned>0?Math.round(d.dispatched/d.planned*100):0;
    const status=d.dispatched===0?'Pending':rem<=0?'Complete':'Partial';
    const tc=status==='Complete'?'alloc-complete':status==='Partial'?'alloc-partial':'alloc-pending';
    const sb=status==='Complete'?'badge-complete':status==='Partial'?'badge-partial':'badge-pending';
    return`<tr class="${tc}"><td><strong>${d.name}</strong></td><td>${d.items}</td>
      <td style="font-family:'DM Mono',monospace">${d.planned}</td>
      <td style="font-family:'DM Mono',monospace;color:var(--accent2)">${d.dispatched}</td>
      <td style="font-family:'DM Mono',monospace">${rem}</td>
      <td><div class="progress-bar-wrap" style="width:80px;display:inline-block;vertical-align:middle"><div class="progress-bar" style="width:${pct}%"></div></div> <span class="progress-pct">${pct}%</span></td>
      <td><span class="badge ${sb}">${status}</span></td>
      <td><button class="btn btn-sm btn-blue" onclick="dispatchToInstitute('${id}','${d.name.replace(/'/g,"\\'")}','${templateId}')">Dispatch</button></td></tr>`;
  }).join('');
  wrap.innerHTML=`<div class="table-wrap"><table><thead><tr><th>Institute</th><th>Items</th><th>Planned Qty</th><th>Dispatched</th><th>Remaining</th><th>Progress</th><th>Status</th><th>Action</th></tr></thead><tbody>${rows}</tbody></table></div>`;
}

function dispatchToInstitute(instId,instName,templateId){
  const allocs=distAllocations.filter(a=>a.templateId==templateId&&a.instituteId==instId&&a.plannedQty>a.dispatchedQty);
  if(!allocs.length){alert('No pending allocations for this institute.');return;}
  switchToDispatch();
  setTimeout(()=>{
    document.getElementById('disp-inst-search').value=instName;
    document.getElementById('disp-inst-id').value=instId;
    document.getElementById('disp-date').value=getLocalDateStr();
    document.getElementById('dispatch-rows').innerHTML='';
    allocs.forEach(a=>addDispatchRow(a.itemId,a.plannedQty-a.dispatchedQty));
    const vf=document.getElementById('disp-voucher');
    if(vf){vf.focus();vf.scrollIntoView({behavior:'smooth',block:'center'});}
    showAlert('dispatch-alert','info',`Pre-filled ${allocs.length} item(s) for ${instName}. Enter voucher number and receiver to complete.`);
  },100);
}

// ── Institute View ────────────────────────────────────────────
function renderInstituteViewSelects(){
  const sel=document.getElementById('instview-select'),cur=sel.value;
  sel.innerHTML='<option value="">— Select Institute —</option>'+institutes.map(i=>`<option value="${i.id}" ${cur==i.id?'selected':''}>${i.name}</option>`).join('');
  if(cur)renderInstituteView();
}

function renderInstituteView(){
  const instId=document.getElementById('instview-select').value;
  const wrap=document.getElementById('instview-content');
  const multiBtn=document.getElementById('multi-dispatch-btn');
  if(!instId){wrap.innerHTML='<p class="empty-msg">Select an institute above.</p>';multiBtn.style.display='none';return;}
  const allocs=distAllocations.filter(a=>a.instituteId==instId);
  if(!allocs.length){wrap.innerHTML='<p class="empty-msg">No allocations for this institute.</p>';multiBtn.style.display='none';return;}
  const tplMap={};
  allocs.forEach(a=>{if(!tplMap[a.templateId])tplMap[a.templateId]=[];tplMap[a.templateId].push(a);});
  let html='';
  const hasPending=allocs.some(a=>a.plannedQty>a.dispatchedQty);
  multiBtn.style.display=hasPending?'inline-flex':'none';
  Object.entries(tplMap).forEach(([tplId,tAllocs])=>{
    const tpl=distTemplates.find(t=>t.templateId==tplId);
    const tplName=tpl?tpl.templateName:'Unknown Template';
    const tplPending=tAllocs.some(a=>a.plannedQty>a.dispatchedQty);
    const tplTotal=tAllocs.reduce((s,a)=>s+a.plannedQty,0);
    const tplDisp=tAllocs.reduce((s,a)=>s+a.dispatchedQty,0);
    const tplPct=tplTotal>0?Math.round(tplDisp/tplTotal*100):0;
    const rows=tAllocs.map(a=>{
      const rem=a.plannedQty-a.dispatchedQty;
      const status=a.dispatchedQty===0?'Pending':rem<=0?'Complete':'Partial';
      const sb=status==='Complete'?'badge-complete':status==='Partial'?'badge-partial':'badge-pending';
      const tc=status==='Complete'?'alloc-complete':status==='Partial'?'alloc-partial':'alloc-pending';
      return`<tr class="${tc}">
        <td>${a.itemName}</td>
        <td style="font-family:'DM Mono',monospace">${a.plannedQty} ${a.unit||''}</td>
        <td style="font-family:'DM Mono',monospace;color:var(--accent2)">${a.dispatchedQty} ${a.unit||''}</td>
        <td style="font-family:'DM Mono',monospace;color:${rem<=0?'var(--accent2)':'var(--danger)'}">${rem} ${a.unit||''}</td>
        <td><span class="badge ${sb}">${status}</span></td>
        ${rem>0?`<td><button class="btn btn-sm btn-primary" onclick="dispatchFromAllocation('${a.instituteId}','${a.instituteName.replace(/'/g,"\'")}','${a.itemId}',${rem},'${a.unit||''}')">Dispatch</button></td>`:'<td></td>'}
      </tr>`;
    }).join('');
    html+=`<div style="margin-bottom:18px">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;flex-wrap:wrap;gap:8px">
        <label style="display:flex;align-items:center;gap:8px;cursor:pointer;font-weight:600;font-size:.95rem">
          ${tplPending?`<input type="checkbox" class="tpl-dispatch-cb" value="${tplId}" style="width:16px;height:16px;accent-color:var(--accent)" onchange="updateMultiDispatchBtn()">`:'<span style="width:16px;display:inline-block"></span>'}
          ${tplName}
          <span class="badge ${tpl&&tpl.status==='Active'?'badge-active':'badge-draft'}" style="font-size:.7rem">${tpl?tpl.status:'—'}</span>
        </label>
        <div style="display:flex;align-items:center;gap:10px">
          <div style="width:80px;background:#e0e0e0;border-radius:10px;height:5px"><div style="width:${tplPct}%;background:var(--accent2);height:5px;border-radius:10px"></div></div>
          <span style="font-size:.78rem;color:var(--muted)">${tplPct}%</span>
        </div>
      </div>
      <div class="table-wrap">
        <table><thead><tr><th>Item</th><th>Planned</th><th>Dispatched</th><th>Remaining</th><th>Status</th><th>Action</th></tr></thead>
        <tbody>${rows}</tbody></table>
      </div>
    </div>`;
  });
  wrap.innerHTML=html;
}

function updateMultiDispatchBtn(){
  const checked=document.querySelectorAll('.tpl-dispatch-cb:checked').length;
  const btn=document.getElementById('multi-dispatch-btn');
  if(btn)btn.textContent=checked>0?`→ Dispatch ${checked} Selected Template${checked>1?'s':''}`:'→ Dispatch Selected Templates';
}

function dispatchSelectedTemplates(){
  const instId=document.getElementById('instview-select').value;
  const inst=institutes.find(i=>i.id==instId);
  if(!inst){alert('Please select an institute first.');return;}
  const checked=[...document.querySelectorAll('.tpl-dispatch-cb:checked')].map(cb=>cb.value);
  if(!checked.length){alert('Please check at least one template to dispatch.');return;}
  const items=[];
  checked.forEach(tplId=>{
    distAllocations.filter(a=>a.templateId==tplId&&a.instituteId==instId&&a.plannedQty>a.dispatchedQty).forEach(a=>{
      const existing=items.find(x=>x.itemId==a.itemId);
      if(existing){existing.qty+=a.plannedQty-a.dispatchedQty;}
      else{items.push({itemId:a.itemId,qty:a.plannedQty-a.dispatchedQty,unit:a.unit||''});}
    });
  });
  if(!items.length){alert('No pending quantities found in selected templates.');return;}
  switchToDispatch();
  setTimeout(()=>{
    document.getElementById('disp-inst-search').value=inst.name;
    document.getElementById('disp-inst-id').value=inst.id;
    document.getElementById('disp-date').value=getLocalDateStr();
    document.getElementById('dispatch-rows').innerHTML='';
    items.forEach(it=>addDispatchRow(it.itemId,it.qty));
    const tplNames=checked.map(id=>{const t=distTemplates.find(x=>x.templateId==id);return t?t.templateName:'';}).join(', ');
    document.getElementById('disp-remarks').value='Templates: '+tplNames;
    const vf=document.getElementById('disp-voucher');
    if(vf){vf.focus();vf.scrollIntoView({behavior:'smooth',block:'center'});}
    showAlert('dispatch-alert','info',`Pre-filled ${items.length} item${items.length>1?'s':''} from ${checked.length} template${checked.length>1?'s':''}. Enter voucher number and receiver to complete.`);
  },100);
}

// ── Export ────────────────────────────────────────────────────
function renderExportSelects(){
  const ts=document.getElementById('export-tpl-select'),cur=ts.value;
  ts.innerHTML='<option value="">— Select Template —</option>'+distTemplates.map(t=>`<option value="${t.templateId}" ${cur==t.templateId?'selected':''}>${t.templateName}</option>`).join('');
  const is=document.getElementById('export-inst-select'),curi=is.value;
  is.innerHTML='<option value="">— Select Institute —</option>'+institutes.map(i=>`<option value="${i.id}" ${curi==i.id?'selected':''}>${i.name}</option>`).join('');
}

function exportTemplate(){
  const tid=document.getElementById('export-tpl-select').value;if(!tid){alert('Select a template.');return;}
  const tpl=distTemplates.find(t=>t.templateId==tid),allocs=distAllocations.filter(a=>a.templateId==tid);
  const rows=[['Template','Institute','Item','Unit','Planned','Dispatched','Remaining','Status']];
  allocs.forEach(a=>{const rem=a.plannedQty-a.dispatchedQty,st=a.dispatchedQty===0?'Pending':rem<=0?'Complete':'Partial';rows.push([tpl.templateName,a.instituteName,a.itemName,a.unit||'',a.plannedQty,a.dispatchedQty,rem,st]);});
  exportCSV(rows,`template_${tpl.templateName.replace(/\s+/g,'_')}.csv`);
}

function exportInstitute(){
  const iid=document.getElementById('export-inst-select').value;if(!iid){alert('Select an institute.');return;}
  const inst=institutes.find(i=>i.id==iid),allocs=distAllocations.filter(a=>a.instituteId==iid);
  const rows=[['Template','Item','Unit','Planned','Dispatched','Remaining','Status']];
  allocs.forEach(a=>{const tpl=distTemplates.find(t=>t.templateId==a.templateId),rem=a.plannedQty-a.dispatchedQty,st=a.dispatchedQty===0?'Pending':rem<=0?'Complete':'Partial';rows.push([tpl?tpl.templateName:'—',a.itemName,a.unit||'',a.plannedQty,a.dispatchedQty,rem,st]);});
  exportCSV(rows,`institute_${inst.name.replace(/\s+/g,'_')}.csv`);
}

function exportAllTemplates(){
  const rows=[['Template','Purpose','Target Date','Status','Institute','Item','Unit','Planned','Dispatched','Remaining','Alloc Status']];
  distTemplates.forEach(t=>{const allocs=distAllocations.filter(a=>a.templateId==t.templateId);if(!allocs.length){rows.push([t.templateName,t.purpose||'',t.targetDate?formatDate(t.targetDate):'',t.status,'','','','','','','']);}else allocs.forEach(a=>{const rem=a.plannedQty-a.dispatchedQty,st=a.dispatchedQty===0?'Pending':rem<=0?'Complete':'Partial';rows.push([t.templateName,t.purpose||'',t.targetDate?formatDate(t.targetDate):'',t.status,a.instituteName,a.itemName,a.unit||'',a.plannedQty,a.dispatchedQty,rem,st]);});});
  exportCSV(rows,'all_templates.csv');
}

function exportAllAllocations(){
  const rows=[['Template','Institute','Item','Unit','Planned','Dispatched','Remaining','Status']];
  distAllocations.forEach(a=>{const tpl=distTemplates.find(t=>t.templateId==a.templateId),rem=a.plannedQty-a.dispatchedQty,st=a.dispatchedQty===0?'Pending':rem<=0?'Complete':'Partial';rows.push([tpl?tpl.templateName:'—',a.instituteName,a.itemName,a.unit||'',a.plannedQty,a.dispatchedQty,rem,st]);});
  exportCSV(rows,'all_allocations.csv');
}
