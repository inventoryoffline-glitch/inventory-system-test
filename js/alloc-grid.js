// ============================================================
// alloc-grid.js — Allocation grid: build, cells, balance, save/load
// ============================================================

let gridSelectedInsts=[];
let gridSelectedItems=[];
let gridData={};
let gridDistrib={};
let gridEqualRow={};

// ── Institute search for grid ─────────────────────────────────
function gridInstSearch(){
  const val=document.getElementById('grid-inst-search').value.toLowerCase();
  const dd=document.getElementById('grid-inst-dd');
  const already=gridSelectedInsts.map(i=>i.id);
  const f=institutes.filter(i=>i.name.toLowerCase().includes(val)&&!already.includes(i.id));
  dd.innerHTML=f.map(i=>`<div class="combo-option" onmousedown="gridAddInst('${i.id}','${i.name.replace(/'/g,"\'")}')">+ ${i.name}</div>`).join('');
  dd.style.display=f.length?'block':'none';
}
function gridInstSearchOpen(){
  const dd=document.getElementById('grid-inst-dd');
  const already=gridSelectedInsts.map(i=>i.id);
  const f=institutes.filter(i=>!already.includes(i.id));
  dd.innerHTML=f.map(i=>`<div class="combo-option" onmousedown="gridAddInst('${i.id}','${i.name.replace(/'/g,"\'")}')">+ ${i.name}</div>`).join('');
  dd.style.display=f.length?'block':'none';
}
function gridInstSearchBlur(){setTimeout(()=>{document.getElementById('grid-inst-dd').style.display='none';},200);}
function gridAddInst(id,name){
  if(gridSelectedInsts.find(i=>i.id==id))return;
  gridSelectedInsts.push({id,name});
  document.getElementById('grid-inst-search').value='';
  renderGridTags();buildGrid();
}
function gridRemoveInst(id){
  gridSelectedInsts=gridSelectedInsts.filter(i=>i.id!=id);
  Object.keys(gridData).forEach(itemId=>{delete gridData[itemId][id];});
  renderGridTags();buildGrid();
}
function gridSelectAllInstitutes(){
  institutes.forEach(i=>{if(!gridSelectedInsts.find(x=>x.id==i.id))gridSelectedInsts.push({id:i.id,name:i.name});});
  renderGridTags();buildGrid();
}
function gridSelectByCategory(){
  const cat=document.getElementById('grid-cat-filter').value;
  if(!cat)return;
  institutes.filter(i=>i.category===cat).forEach(i=>{if(!gridSelectedInsts.find(x=>x.id==i.id))gridSelectedInsts.push({id:i.id,name:i.name});});
  document.getElementById('grid-cat-filter').value='';
  renderGridTags();buildGrid();
}
function populateGridCatFilter(){
  const sel=document.getElementById('grid-cat-filter');if(!sel)return;
  const cats=[...new Set(institutes.map(i=>i.category).filter(Boolean))];
  sel.innerHTML='<option value="">+ By Category</option>'+cats.map(c=>`<option value="${c}">${c}</option>`).join('');
}
function populateGridItemCatFilter(){
  const sel=document.getElementById('grid-item-cat-filter');if(!sel)return;
  const cats=[...new Set(activeStock().map(s=>s.cat).filter(Boolean))].sort();
  sel.innerHTML='<option value="">+ By Category</option>'+cats.map(c=>`<option value="${c}">${c}</option>`).join('');
}
function gridSelectItemsByCategory(){
  const cat=document.getElementById('grid-item-cat-filter').value;
  if(!cat)return;
  activeStock().filter(s=>s.cat===cat).forEach(s=>{
    if(!gridSelectedItems.find(x=>x.id==s.id)){
      gridSelectedItems.push({id:s.id,name:s.name,unit:s.unit||'',stock:s.qty});
      if(!gridData[s.id])gridData[s.id]={};
      if(!gridDistrib[s.id])gridDistrib[s.id]=s.qty;
      if(gridEqualRow[s.id]===undefined)gridEqualRow[s.id]=false;
    }
  });
  document.getElementById('grid-item-cat-filter').value='';
  renderGridTags();buildGrid();
}
function gridClearInstitutes(){gridSelectedInsts=[];gridData={};renderGridTags();buildGrid();}

// ── Item search for grid ──────────────────────────────────────
function gridItemSearch(){
  const val=document.getElementById('grid-item-search').value.toLowerCase();
  const dd=document.getElementById('grid-item-dd');
  const already=gridSelectedItems.map(i=>i.id);
  const f=activeStock().filter(s=>s.name.toLowerCase().includes(val)&&!already.includes(s.id));
  dd.innerHTML=f.map(s=>`<div class="combo-option" onmousedown="gridAddItem('${s.id}','${s.name.replace(/'/g,"\'")}','${s.unit||''}',${s.qty})">+ ${s.name} (${s.qty} ${s.unit||''})</div>`).join('');
  dd.style.display=f.length?'block':'none';
}
function gridItemSearchOpen(){
  const dd=document.getElementById('grid-item-dd');
  const already=gridSelectedItems.map(i=>i.id);
  const f=activeStock().filter(s=>!already.includes(s.id));
  dd.innerHTML=f.map(s=>`<div class="combo-option" onmousedown="gridAddItem('${s.id}','${s.name.replace(/'/g,"\'")}','${s.unit||''}',${s.qty})">+ ${s.name} (${s.qty} ${s.unit||''})</div>`).join('');
  dd.style.display=f.length?'block':'none';
}
function gridItemSearchBlur(){setTimeout(()=>{document.getElementById('grid-item-dd').style.display='none';},200);}
function gridAddItem(id,name,unit,stockQty){
  if(gridSelectedItems.find(i=>i.id==id))return;
  const qty=parseInt(stockQty)||0;
  gridSelectedItems.push({id,name,unit,stock:qty});
  if(!gridData[id])gridData[id]={};
  if(!gridDistrib[id])gridDistrib[id]=qty;
  if(gridEqualRow[id]===undefined)gridEqualRow[id]=false;
  document.getElementById('grid-item-search').value='';
  renderGridTags();buildGrid();
}
function gridRemoveItem(id){
  gridSelectedItems=gridSelectedItems.filter(i=>i.id!=id);
  delete gridData[id];delete gridDistrib[id];delete gridEqualRow[id];
  renderGridTags();buildGrid();
}
function gridSelectAllItems(){
  activeStock().forEach(s=>{
    if(!gridSelectedItems.find(x=>x.id==s.id))gridSelectedItems.push({id:s.id,name:s.name,unit:s.unit||'',stock:s.qty});
    if(!gridData[s.id])gridData[s.id]={};
    if(!gridDistrib[s.id])gridDistrib[s.id]=s.qty;
    if(gridEqualRow[s.id]===undefined)gridEqualRow[s.id]=false;
  });
  renderGridTags();buildGrid();
}
function gridClearItems(){gridSelectedItems=[];gridData={};gridDistrib={};gridEqualRow={};renderGridTags();buildGrid();}

// ── Render tags ───────────────────────────────────────────────
function renderGridTags(){
  document.getElementById('grid-inst-tags').innerHTML=gridSelectedInsts.map(i=>
    `<span class="grid-tag">${i.name}<button onmousedown="gridRemoveInst('${i.id}')">×</button></span>`).join('');
  document.getElementById('grid-item-tags').innerHTML=gridSelectedItems.map(i=>
    `<span class="grid-tag item-tag">${i.name}<button onmousedown="gridRemoveItem('${i.id}')">×</button></span>`).join('');
}

// ── Build the grid table ──────────────────────────────────────
function buildGrid(){
  const wrap=document.getElementById('alloc-grid-wrap');
  if(!gridSelectedInsts.length||!gridSelectedItems.length){wrap.style.display='none';return;}
  wrap.style.display='block';
  const thead=document.getElementById('alloc-grid-head');
  thead.innerHTML=`<tr>
    <th>Item</th>
    <th title="Check to equally distribute">Eq ÷</th>
    <th class="stock-col">Stock</th>
    <th class="distrib-col">Distribute</th>
    ${gridSelectedInsts.map(i=>`<th class="inst-col">${i.name}</th>`).join('')}
    <th class="bal-col">Balance</th>
  </tr>`;
  const tbody=document.getElementById('alloc-grid-body');
  tbody.innerHTML=gridSelectedItems.map(item=>{
    if(!gridData[item.id])gridData[item.id]={};
    const distrib=gridDistrib[item.id]||0;
    const isEqual=gridEqualRow[item.id]||false;
    const instCells=gridSelectedInsts.map(inst=>{
      const val=gridData[item.id][inst.id]||0;
      return`<td><input type="number" class="grid-input ${isEqual?'equal-applied':'manual'}"
        min="0" value="${val}"
        oninput="gridCellChanged('${item.id}','${inst.id}',this)"
        onblur="gridCellChanged('${item.id}','${inst.id}',this)"
        id="gc_${item.id}_${inst.id}"></td>`;
    }).join('');
    const bal=gridCalcBalance(item.id);
    const balClass=bal<0?'over':bal===0?'ok':'warn';
    return`<tr id="gr_${item.id}">
      <td class="item-cell">${item.name}<br><span style="font-size:.72rem;color:var(--muted);font-weight:400">${item.unit}</span></td>
      <td style="text-align:center">
        <input type="checkbox" class="eq-check" ${isEqual?'checked':''} onchange="gridToggleEqual('${item.id}',this.checked)" title="Distribute equally">
        <br><button onclick="gridClearRow('${item.id}')" style="background:none;border:none;cursor:pointer;font-size:.7rem;color:var(--muted);margin-top:3px" title="Clear row">↺ Clear</button>
      </td>
      <td class="stock-cell">${item.stock} ${item.unit}</td>
      <td class="distrib-cell"><input type="number" class="grid-input" min="0" value="${distrib}"
        oninput="gridDistribChanged('${item.id}',this)"
        id="gdist_${item.id}"></td>
      ${instCells}
      <td class="bal-cell ${balClass}" id="gbal_${item.id}">${bal}</td>
    </tr>`;
  }).join('');
  const tfoot=document.getElementById('alloc-grid-foot');
  const totalPerInst=gridSelectedInsts.map(inst=>{
    const count=gridSelectedItems.filter(item=>(gridData[item.id]||{})[inst.id]>0).length;
    const qty=gridSelectedItems.reduce((s,item)=>s+(parseInt((gridData[item.id]||{})[inst.id])||0),0);
    return{count,qty};
  });
  const grandTotal=totalPerInst.reduce((s,i)=>s+i.qty,0);
  const distribItemCount=gridSelectedItems.filter(item=>(gridDistrib[item.id]||0)>0).length;
  const fb='position:sticky;background:var(--surface2);font-weight:600;font-size:.78rem;padding:8px 10px;border-right:1px solid var(--border);border-top:2px solid var(--border);';
  tfoot.innerHTML=`<tr>
    <td style="${fb}left:0;z-index:6;min-width:130px;max-width:130px;color:var(--muted)">Totals</td>
    <td style="${fb}left:130px;z-index:6;min-width:70px;max-width:70px"></td>
    <td style="${fb}left:200px;z-index:6;min-width:95px;max-width:95px;color:var(--muted);font-size:.72rem">Stock →</td>
    <td style="${fb}left:295px;z-index:6;min-width:95px;max-width:95px;color:#6a1b9a;font-family:'DM Mono',monospace">${distribItemCount} item${distribItemCount!==1?'s':''}</td>
    ${totalPerInst.map(d=>`<td style="text-align:right;font-family:'DM Mono',monospace;font-weight:700;padding:8px 10px;border-right:1px solid var(--border);border-top:2px solid var(--border);background:var(--surface2)">${d.qty}<br><span style="font-size:.7rem;font-weight:400;color:var(--muted)">${d.count} item${d.count!==1?'s':''}</span></td>`).join('')}
    <td style="${fb}right:0;z-index:6;box-shadow:-2px 0 4px rgba(0,0,0,.08);font-family:'DM Mono',monospace;color:var(--accent);text-align:right">${grandTotal}</td>
  </tr>`;
}

// ── Cell interactions ─────────────────────────────────────────
function gridCellChanged(itemId,instId,input){
  let val=parseInt(input.value)||0;
  if(val<0)val=0;
  input.value=val;
  if(!gridData[itemId])gridData[itemId]={};
  gridData[itemId][instId]=val;
  gridEqualRow[itemId]=false;
  input.className='grid-input manual';
  updateGridBalance(itemId);
  updateGridFoot();
}

function gridDistribChanged(itemId,input){
  const item=gridSelectedItems.find(i=>i.id==itemId);
  let val=parseInt(input.value)||0;
  if(val<0)val=0;
  if(item&&val>item.stock){val=item.stock;input.value=val;}
  input.value=val;
  gridDistrib[itemId]=val;
  if(gridEqualRow[itemId])gridApplyEqual(itemId);
  else updateGridBalance(itemId);
}

function gridToggleEqual(itemId,checked){
  gridEqualRow[itemId]=checked;
  if(checked)gridApplyEqual(itemId);
  else{
    gridSelectedInsts.forEach(inst=>{
      const inp=document.getElementById('gc_'+itemId+'_'+inst.id);
      if(inp)inp.className='grid-input manual';
    });
  }
}

function gridApplyEqual(itemId){
  const item=gridSelectedItems.find(i=>i.id==itemId);if(!item)return;
  const distributable=Math.max(0,gridDistrib[itemId]||0);
  const n=gridSelectedInsts.length;if(n===0)return;
  const base=Math.floor(distributable/n);
  const extra=distributable-(base*n);
  gridSelectedInsts.forEach((inst,idx)=>{
    const qty=base+(idx<extra?1:0);
    gridData[itemId][inst.id]=qty;
    const inp=document.getElementById('gc_'+itemId+'_'+inst.id);
    if(inp){inp.value=qty;inp.className='grid-input equal-applied';}
  });
  updateGridBalance(itemId);
  updateGridFoot();
}

function gridClearRow(itemId){
  gridSelectedInsts.forEach(inst=>{
    gridData[itemId][inst.id]=0;
    const inp=document.getElementById('gc_'+itemId+'_'+inst.id);
    if(inp){inp.value=0;inp.className='grid-input manual';}
  });
  gridEqualRow[itemId]=false;
  const cb=document.querySelector(`#gr_${itemId} .eq-check`);
  if(cb)cb.checked=false;
  updateGridBalance(itemId);
  updateGridFoot();
}

function gridClearAll(){
  gridSelectedItems.forEach(item=>{
    gridSelectedInsts.forEach(inst=>{gridData[item.id][inst.id]=0;});
    gridDistrib[item.id]=0;gridEqualRow[item.id]=false;
  });
  buildGrid();
}

// ── Balance calculation ───────────────────────────────────────
function gridCalcBalance(itemId){
  const totalAlloc=gridSelectedInsts.reduce((s,inst)=>s+(parseInt((gridData[itemId]||{})[inst.id])||0),0);
  const distrib=gridDistrib[itemId]||0;
  return distrib-totalAlloc;
}

function updateGridBalance(itemId){
  const bal=gridCalcBalance(itemId);
  const cell=document.getElementById('gbal_'+itemId);
  if(!cell)return;
  cell.textContent=bal;
  cell.className='bal-cell '+(bal<0?'over':bal===0?'ok':'warn');
}

function updateGridFoot(){
  const tfoot=document.getElementById('alloc-grid-foot');if(!tfoot)return;
  const totalPerInst=gridSelectedInsts.map(inst=>{
    const count=gridSelectedItems.filter(item=>(gridData[item.id]||{})[inst.id]>0).length;
    const qty=gridSelectedItems.reduce((s,item)=>s+(parseInt((gridData[item.id]||{})[inst.id])||0),0);
    return{count,qty};
  });
  const grandTotal=totalPerInst.reduce((s,i)=>s+i.qty,0);
  const distribItemCount=gridSelectedItems.filter(item=>(gridDistrib[item.id]||0)>0).length;
  const fb='position:sticky;background:var(--surface2);font-weight:600;font-size:.78rem;padding:8px 10px;border-right:1px solid var(--border);border-top:2px solid var(--border);';
  tfoot.innerHTML=`<tr>
    <td style="${fb}left:0;z-index:6;min-width:130px;max-width:130px;color:var(--muted)">Totals</td>
    <td style="${fb}left:130px;z-index:6;min-width:70px;max-width:70px"></td>
    <td style="${fb}left:200px;z-index:6;min-width:95px;max-width:95px;color:var(--muted);font-size:.72rem">Stock →</td>
    <td style="${fb}left:295px;z-index:6;min-width:95px;max-width:95px;color:#6a1b9a;font-family:'DM Mono',monospace">${distribItemCount} item${distribItemCount!==1?'s':''}</td>
    ${totalPerInst.map(d=>`<td style="text-align:right;font-family:'DM Mono',monospace;font-weight:700;padding:8px 10px;border-right:1px solid var(--border);border-top:2px solid var(--border);background:var(--surface2)">${d.qty}<br><span style="font-size:.7rem;font-weight:400;color:var(--muted)">${d.count} item${d.count!==1?'s':''}</span></td>`).join('')}
    <td style="${fb}right:0;z-index:6;box-shadow:-2px 0 4px rgba(0,0,0,.08);font-family:'DM Mono',monospace;color:var(--accent);text-align:right">${grandTotal}</td>
  </tr>`;
}

// ── Save allocations ──────────────────────────────────────────
async function saveGridAllocations(){
  if(!activeTemplateId)return showAlert('grid-alert','error','No template selected.');
  const btn=document.getElementById('grid-save-btn');
  btn.disabled=true;
  let hasOver=false;
  gridSelectedItems.forEach(item=>{if(gridCalcBalance(item.id)<0)hasOver=true;});
  if(hasOver){showAlert('grid-alert','error','Some items are over-allocated (red balance). Please fix before saving.');btn.disabled=false;return;}
  showLoading(true);
  const existing=distAllocations.filter(a=>a.templateId==activeTemplateId);
  let deleteOk=true;
  for(const a of existing){
    const r=await api({action:'deleteAllocation',allocationId:a.allocationId});
    if(!r){deleteOk=false;break;}
  }
  if(!deleteOk){showLoading(false);btn.disabled=false;showAlert('grid-alert','error','Failed to clear old allocations. Check connection and try again.');return;}
  let saveCount=0,saveFailed=false;
  for(const item of gridSelectedItems){
    for(const inst of gridSelectedInsts){
      const qty=parseInt((gridData[item.id]||{})[inst.id])||0;
      if(qty>0){
        const r=await api({action:'saveAllocation',templateId:activeTemplateId,instituteId:inst.id,instituteName:inst.name,itemId:item.id,itemName:item.name,unit:item.unit||'',plannedQty:qty});
        if(!r){saveFailed=true;break;}
        saveCount++;
      }
    }
    if(saveFailed)break;
  }
  if(saveFailed){showLoading(false);btn.disabled=false;showAlert('grid-alert','error','Some allocations failed to save. Check connection and try again.');return;}
  await loadAll();
  showLoading(false);btn.disabled=false;
  if(activeTemplateId){loadGridFromAllocations(activeTemplateId);renderWorkspace();buildGrid();}
  const gis=document.getElementById('grid-inst-search');if(gis)gis.value='';
  const gims=document.getElementById('grid-item-search');if(gims)gims.value='';
  showAlert('grid-alert','success',`${saveCount} allocations saved successfully.`);
}

// ── Load allocations into grid ────────────────────────────────
function loadGridFromAllocations(templateId){
  const allocs=distAllocations.filter(a=>a.templateId==templateId);
  if(!allocs.length)return;
  allocs.forEach(a=>{
    if(!gridSelectedInsts.find(i=>i.id==a.instituteId))
      gridSelectedInsts.push({id:a.instituteId,name:a.instituteName});
    if(!gridSelectedItems.find(i=>i.id==a.itemId)){
      const s=activeStock().find(x=>x.id==a.itemId)||stock.find(x=>x.id==a.itemId);
      gridSelectedItems.push({id:a.itemId,name:a.itemName,unit:a.unit||'',stock:s?s.qty:0});
    }
    if(!gridData[a.itemId])gridData[a.itemId]={};
    gridData[a.itemId][a.instituteId]=a.plannedQty;
    if(gridEqualRow[a.itemId]===undefined)gridEqualRow[a.itemId]=false;
  });
  // Restore gridDistrib = sum of planned quantities per item (fixes balance on reload)
  gridSelectedItems.forEach(item=>{
    const itemAllocs=allocs.filter(a=>a.itemId==item.id);
    const totalPlanned=itemAllocs.reduce((s,a)=>s+a.plannedQty,0);
    gridDistrib[item.id]=totalPlanned;
  });
  renderGridTags();
  buildGrid();
}

// ── Global grid input delegation ─────────────────────────────
document.addEventListener('input',function(e){
  if(e.target.classList.contains('grid-input')){e.target.style.borderColor='var(--accent2)';}
});
document.addEventListener('change',function(e){
  if(e.target.classList.contains('grid-input')){
    let val=parseInt(e.target.value)||0;
    if(val<0){val=0;e.target.value=0;}
    e.target.value=val;
  }
});
