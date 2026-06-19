// ============================================================
// import-export.js — UPDATED: Batch CSV import
// ============================================================

// ── Stock CSV Import ──────────────────────────────────────────
window.addEventListener('dragover', function(e) { e.preventDefault(); }, false);
window.addEventListener('drop', function(e) { e.preventDefault(); }, false);
function downloadTemplate(e){
  e.preventDefault();
  const csv='name,category,unit,quantity,low_stock,expiry_date\nExample Item,Medicine,bottles,100,20,2025-12-31';
  const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([csv],{type:'text/csv'}));a.download='inventory_template.csv';a.click();
}

function handleDrop(e){
  e.preventDefault();
  const dropZone = document.getElementById('import-drop');
  if (dropZone) dropZone.classList.remove('drag');
  const file = e.dataTransfer.files[0];
  if (file) handleFileImport({ files: [file] });
}

function handleInstDrop(e){
  e.preventDefault();
  const dropZone = document.getElementById('inst-import-drop');
  if (dropZone) dropZone.classList.remove('drag');
  const file = e.dataTransfer.files[0];
  if (file) handleInstFileImport({ files: [file] });
}

function handleFileImport(input){const file=input.files[0];if(file)handleFileImport({ files: [file] });input.value='';}
function processImportFile(file){
  const reader=new FileReader();
  reader.onload=e=>{
    const text=e.target.result,rows=text.split(/\r?\n/).filter(r=>r.trim());
    if(rows.length<2)return showAlert('import-alert','error','File is empty or has only headers.');
    const headers=rows[0].toLowerCase().split(',').map(h=>h.trim().replace(/['"]/g,''));
    const ni=headers.findIndex(h=>h.includes('name')),ci=headers.findIndex(h=>h.includes('cat'));
    const ui=headers.findIndex(h=>h.includes('unit')),qi=headers.findIndex(h=>h.includes('qty')||h.includes('quantity'));
    const li=headers.findIndex(h=>h.includes('low')),ei=headers.findIndex(h=>h.includes('exp')||h.includes('date'));
    const sti=headers.findIndex(h=>h.includes('serial_type')),svi=headers.findIndex(h=>h.includes('serial_val')),rni=headers.findIndex(h=>h.includes('ref'));
    
    if(ni===-1||qi===-1)return showAlert('import-alert','error','File must have "name" and "quantity" columns.');
    importData=rows.slice(1).map(row=>{
      const cols=row.split(',').map(c=>c.trim().replace(/^["']|["']$/g,''));
      return{
        name:cols[ni]||'',
        cat:ci>=0?cols[ci]||'':'',
        unit:ui>=0?cols[ui]||'':'',
        qty:parseInt(cols[qi])||0,
        low:li>=0?parseInt(cols[li])||10:10,
        expiry:ei>=0?cols[ei]||'':'',
        serialType:sti>=0?cols[sti]||'':'',
        serialValue:svi>=0?cols[svi]||'':'',
        refNumber:rni>=0?cols[rni]||':''
      };
    }).filter(r=>r.name);
    
    if(!importData.length)return showAlert('import-alert','error','No valid rows found.');
    document.getElementById('import-count').textContent=`${importData.length} items ready`;
    document.getElementById('import-table-wrap').innerHTML=`<table><thead><tr><th>Name</th><th>Category</th><th>Qty</th><th>Low</th><th>Expiry</th></tr></thead><tbody>${importData.map(r=>`<tr><td>${r.name}</td><td>${r.cat||'-'}</td><td>${r.qty}</td><td>${r.low}</td><td>${r.expiry||'-'}</td></tr>`).join('')}</tbody></table>`;
    document.getElementById('import-preview').style.display='block';
  };reader.readAsText(file);
}
async function confirmImport(){
  if(!importData.length)return;
  showLoading(true);
  try {
    // Convert array to JSON string for batch processing
    const res = await api({
      action: 'batchAddStock',
      itemsJson: JSON.stringify(importData)
    });
    
    showLoading(false);
    if(res && res.success){
      showAlert('import-alert','success',`${res.count} items imported successfully.`);
      importData=[];
      document.getElementById('import-preview').style.display='none';
      await loadAll();
    } else {
      showAlert('import-alert','error', res ? res.error : 'Import failed. Check logs.');
    }
  } catch(e) {
    showLoading(false);
    showAlert('import-alert','error','Network error during import.');
  }
}
function cancelImport(){importData=[];document.getElementById('import-preview').style.display='none';document.getElementById('import-alert').classList.remove('show');}

// ── Institute CSV Import ──────────────────────────────────────
let instImportData=[];
function downloadInstTemplate(e){
  e.preventDefault();
  const csv='name,category,contact,phone,address\nGovernment School Ludhiana,Government School,Dr. Harpreet Singh,+91-98765,Civil Lines Ludhiana';
  const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([csv],{type:'text/csv'}));a.download='institutes_template.csv';a.click();
}
function handleInstDrop(e){e.preventDefault();document.getElementById('inst-import-drop').classList.remove('drag');const file=e.dataTransfer.files[0];if(file)processInstFile(file);}
function handleInstFileImport(input){const file=input.files[0];if(file)processInstFile(file);input.value='';}
function processInstFile(file){
  const reader=new FileReader();
  reader.onload=e=>{
    const text=e.target.result;
    const rows=text.split(/\r?\n/).filter(r=>r.trim());
    if(rows.length<2)return showAlert('inst-import-alert','error','File is empty or has only headers.');
    const headers=rows[0].toLowerCase().split(',').map(h=>h.trim().replace(/["']/g,''));
    const ni=headers.findIndex(h=>h.includes('name'));
    const cati=headers.findIndex(h=>h.includes('cat'));
    const coni=headers.findIndex(h=>h.includes('contact'));
    const pi=headers.findIndex(h=>h.includes('phone'));
    const ai=headers.findIndex(h=>h.includes('address'));
    if(ni===-1)return showAlert('inst-import-alert','error','File must have a "name" column.');
    instImportData=rows.slice(1).map(row=>{
      const cols=row.split(',').map(c=>c.trim().replace(/^["']|["']$/g,''));
      return{name:cols[ni]||'',category:cati>=0?cols[cati]||'':'',contact:coni>=0?cols[coni]||'':'',phone:pi>=0?cols[pi]||'':'',address:ai>=0?cols[ai]||':''};
    }).filter(r=>r.name);
    if(!instImportData.length)return showAlert('inst-import-alert','error','No valid rows found.');
    document.getElementById('inst-import-count').textContent=`${instImportData.length} institutes ready`;
    document.getElementById('inst-import-table-wrap').innerHTML=`<table>
      <thead><tr><th>Name</th><th>Category</th><th>Contact</th><th>Phone</th><th>Address</th></tr></thead>
      <tbody>${instImportData.map(r=>`<tr><td>${r.name}</td><td>${r.category||'-'}</td><td>${r.contact||'-'}</td><td>${r.phone||'-'}</td><td>${r.address||'-'}</td></tr>`).join('')}</tbody>
    </table>`;
    document.getElementById('inst-import-preview').style.display='block';
  };reader.readAsText(file);
}
async function confirmInstImport(){
  if(!instImportData.length)return;
  showLoading(true);
  try {
    const res = await api({
      action: 'batchAddInstitutes',
      itemsJson: JSON.stringify(instImportData)
    });
    showLoading(false);
    if(res && res.success){
      showAlert('inst-import-alert','success',`${res.count} institutes imported successfully.`);
      instImportData=[];
      document.getElementById('inst-import-preview').style.display='none';
      await loadAll();
    } else {
      showAlert('inst-import-alert','error', res ? res.error : 'Import failed.');
    }
  } catch(e) {
    showLoading(false);
    showAlert('inst-import-alert','error','Network error.');
  }
}
function cancelInstImport(){instImportData=[];document.getElementById('inst-import-preview').style.display='none';document.getElementById('inst-import-alert').classList.remove('show');}

function toggleImportPanel(cardId,show){
  const card=document.getElementById(cardId);if(card)card.style.display=show?'':'none';
}
