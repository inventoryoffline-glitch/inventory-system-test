// ============================================================
// institutes.js — Institute CRUD, render, category combo
// ============================================================

async function addInstitute(){
  const name=document.getElementById('inst-name').value.trim();
  if(!name)return showAlert('inst-alert','error','Institute name is required.');
  showLoading(true);await api({action:'addInstitute',name,category:document.getElementById('inst-category').value.trim(),contact:document.getElementById('inst-contact').value.trim(),phone:document.getElementById('inst-phone').value.trim(),address:document.getElementById('inst-address').value.trim()});
  showLoading(false);
  ['inst-name','inst-category','inst-contact','inst-phone','inst-address'].forEach(id=>document.getElementById(id).value='');
  showAlert('inst-alert','success',`"${name}" added.`);await loadAll();
}
async function deleteInstitute(id,name){
  if(!confirm(`Delete "${name}"?`))return;
  showLoading(true);await api({action:'deleteInstitute',id});showLoading(false);await loadAll();
}
function renderInstitutes(){
  const tbody=document.getElementById('inst-tbody');
  if(!institutes.length){tbody.innerHTML='<tr><td colspan="8" class="empty-msg">No institutes yet.</td></tr>';return;}
  tbody.innerHTML=institutes.map((inst,i)=>{
    const dispatches=[...new Set(records.filter(r=>r.instId==inst.id&&(r.status||'active')==='active').map(r=>r.voucherNo))].length;
    return`<tr><td>${i+1}</td><td><strong>${inst.name}</strong></td><td>${inst.category||'-'}</td><td>${inst.contact||'-'}</td><td>${inst.phone||'-'}</td><td>${inst.address||'-'}</td><td>${dispatches}</td>
      <td><button class="btn btn-danger" onclick="deleteInstitute('${inst.id}','${inst.name.replace(/'/g,"\\'")}')">Delete</button></td></tr>`;
  }).join('');
}

// ── Institute category combo ──────────────────────────────────
const defaultInstCats=['Government School','Private School','PHC','CHC','Hospital','Anganwadi','NGO','Dispensary','Other'];
function instCatOpen(){instCatFilter();}
function instCatBlur(){setTimeout(()=>document.getElementById('combo-instcat-dd').classList.remove('open'),200);}
function instCatFilter(){
  const val=document.getElementById('inst-category').value.toLowerCase();
  const existing=[...new Set(institutes.map(i=>i.category).filter(Boolean))];
  const opts=[...new Set([...defaultInstCats,...existing])].filter(o=>o.toLowerCase().includes(val));
  const dd=document.getElementById('combo-instcat-dd');
  dd.innerHTML='';
  opts.forEach(o=>{const d=document.createElement('div');d.className='combo-option';d.textContent=o;d.onmousedown=()=>{document.getElementById('inst-category').value=o;dd.classList.remove('open');};dd.appendChild(d);});
  if(val&&!opts.find(o=>o.toLowerCase()===val)){const d=document.createElement('div');d.className='combo-option new-tag';d.textContent='+ Add "'+val+'"';d.onmousedown=()=>{document.getElementById('inst-category').value=val;dd.classList.remove('open');};dd.appendChild(d);}
  dd.classList.add('open');
}
