// ============================================================
// core.js — State, API, loadAll, settings, tab switching, helpers
// ============================================================

const safeStorage={get(k){try{return localStorage.getItem(k);}catch(e){return null;}},set(k,v){try{localStorage.setItem(k,v);}catch(e){}}};
let SCRIPT_URL=safeStorage.get('inv_script_url')||'';
let stock=[],institutes=[],records=[],adjustments=[];
let distTemplates=[],distAllocations=[];
let settings={systemName:'Inventory Management System',issuedBy:'',nearExpiry:90,highExpiry:30,showSerial:'yes',labelSize:'medium',labelFont:'12',labelShowName:true,labelShowBatch:true,labelShowExpiry:true,labelShowOrg:false};
let importData=[],activeTemplateId=null;

// ── Setup ──────────────────────────────────────────────────────
function checkSetup(){
  if(SCRIPT_URL){
    document.getElementById('setup-banner').classList.add('hidden');
    setSyncStatus('loading','Connecting...');
    loadAll();
  } else {
    setSyncStatus('err','Not connected');
    try{refreshAll();}catch(e){console.warn('Initial render:',e);}
  }
}
function saveScriptUrl(){
  const url=document.getElementById('script-url-input').value.trim();
  if(!url.startsWith('https://script.google.com')){alert('Please paste a valid Google Apps Script URL.');return;}
  SCRIPT_URL=url;safeStorage.set('inv_script_url',url);
  document.getElementById('setup-banner').classList.add('hidden');
  setSyncStatus('loading','Connecting...');loadAll();
}
setInterval(()=>{document.getElementById('clock').textContent=new Date().toLocaleString('en-IN');},1000);

// ── API ────────────────────────────────────────────────────────
function setSyncStatus(s,l){document.getElementById('sync-dot').className='sync-dot '+s;document.getElementById('sync-label').textContent=l;}
async function api(params, allowServerError){
  if(!SCRIPT_URL){alert('Please connect your Google Sheet first.');return null;}
  try{
    setSyncStatus('loading','Syncing...');
    const res=await fetch(SCRIPT_URL,{
      method:'POST',
      redirect:'follow',
      cache:'no-store',
      headers:{'Content-Type':'application/x-www-form-urlencoded;charset=UTF-8'},
      body:new URLSearchParams(params).toString()
    });
    if(!res.ok&&res.status!==0){throw new Error('HTTP '+res.status);}
    const text=await res.text();
    if(!text||!text.trim()){throw new Error('Empty response from server');}
    let data;
    try{data=JSON.parse(text);}
    catch(e){throw new Error('Invalid JSON response: '+text.slice(0,100));}
    if(data.error&&!allowServerError)throw new Error(data.error);
    setSyncStatus('ok','Synced ✓');
    return data;
  }catch(err){
    setSyncStatus('err','Sync error');
    console.error('API error ['+params.action+']:', err.message||err);
    return null;
  }
}

// ── Load All ───────────────────────────────────────────────────
async function loadAll(){
  showLoading(true);
  const data=await api({action:'getAll'});
  showLoading(false);
  if(!data)return;
  stock=(data.stock||[]).map(s=>({...s,qty:+s.qty,dispatched:+(s.dispatched||0),low:+(s.low||10),showLow:s.showLow!=='false'&&s.showLow!==false}));
  institutes=data.institutes||[];
  records=(data.records||[]).map(r=>({
  ...r,
  voucherNo:String(r.voucherNo||''),
  instId:String(r.instId||''),
  itemId:String(r.itemId||''),
  qty:+r.qty
}));
  adjustments=(data.adjustments||[]).map(a=>({...a,qty:+a.qty,stockAfter:+(a.stockAfter||0)}));
  distTemplates=data.distTemplates||[];
  distAllocations=(data.distAllocations||[]).map(a=>({...a,plannedQty:+a.plannedQty,dispatchedQty:+a.dispatchedQty}));
  if(data.settings){settings={...settings,...data.settings};settings.nearExpiry=parseInt(settings.nearExpiry)||90;settings.highExpiry=parseInt(settings.highExpiry)||30;}
  applySettings();refreshAll();
  const wsContent=document.getElementById('dc-workspace-content');
  if(wsContent&&wsContent.style.display!=='none'&&activeTemplateId){
    try{renderWorkspace();}catch(e){}
  }
  setTimeout(()=>{try{runAudit(true);}catch(e){console.warn("Audit error:",e);}},800);
}

function applySettings(){
  const name=settings.systemName||'Inventory Management System';
  document.getElementById('header-title').textContent=name;
  document.title=name;
  document.getElementById('setting-sysname').value=name;
  document.getElementById('setting-issuedby').value=settings.issuedBy||'';
  document.getElementById('setting-scripturl').value=SCRIPT_URL;
  document.getElementById('setting-nearexpiry').value=settings.nearExpiry||90;
  document.getElementById('setting-highexpiry').value=settings.highExpiry||30;
  const ss=document.getElementById('setting-showserial');if(ss)ss.value=settings.showSerial||'yes';
  const ls=document.getElementById('setting-labelsize');if(ls)ls.value=settings.labelSize||'medium';
  const lf=document.getElementById('setting-labelfont');if(lf)lf.value=settings.labelFont||'12';
  const lsn=document.getElementById('label-show-name');if(lsn)lsn.checked=settings.labelShowName!==false&&settings.labelShowName!=='false';
  const lsb=document.getElementById('label-show-batch');if(lsb)lsb.checked=settings.labelShowBatch!==false&&settings.labelShowBatch!=='false';
  const lse=document.getElementById('label-show-expiry');if(lse)lse.checked=settings.labelShowExpiry!==false&&settings.labelShowExpiry!=='false';
  const lso=document.getElementById('label-show-org');if(lso)lso.checked=settings.labelShowOrg===true||settings.labelShowOrg==='true';
}

function refreshAll(){
  try{renderDashboard();}catch(e){console.warn('Dashboard:',e);}
  try{renderStock();}catch(e){console.warn('Stock:',e);}
  try{renderInstitutes();}catch(e){console.warn('Institutes:',e);}
  try{renderDispatchDropdowns();}catch(e){console.warn('Dispatch:',e);}
  try{renderRecords();}catch(e){console.warn('Records:',e);}
  try{renderReports();}catch(e){console.warn('Reports:',e);}
  try{renderAdjustments();}catch(e){console.warn('Adjustments:',e);}
  try{renderExpiredStock();}catch(e){console.warn('Expired:',e);}
  try{renderDistributionCentre();}catch(e){console.warn('Distribution:',e);}
  try{
    const rsel=document.getElementById('remove-item-id');
    if(rsel){
      const rcur=rsel.value;
      rsel.innerHTML='<option value="">— Select Item —</option>'+activeStock().map(s=>`<option value="${s.id}" ${rcur==s.id?'selected':''}>${s.name} (${s.qty} ${s.unit||''})</option>`).join('');
    }
    const rd=document.getElementById('remove-date');
    if(rd&&!rd.value)rd.value=getLocalDateStr();
  }catch(e){console.warn('Remove stock dropdown:',e);}
}

// ── Tab Switching ───────────────────────────────────────────────
function switchTab(t,btn){
  try{
    document.querySelectorAll('.tab-content').forEach(el=>el.classList.remove('active'));
    document.querySelectorAll('.tab-btn').forEach(el=>el.classList.remove('active'));
    const tab=document.getElementById('tab-'+t);
    if(tab){tab.classList.add('active');}else{console.warn('Tab not found:',t);return;}
    if(btn)btn.classList.add('active');
    if(t==='records')try{renderRecords();}catch(e){}
    if(t==='stock')try{renderStock();}catch(e){}
    if(t==='reports')try{renderReports();}catch(e){}
  }catch(e){console.warn('switchTab:',e);}
}
function dcSwitchTab(t,btn){
  document.querySelectorAll('.dc-tab-content').forEach(el=>el.classList.remove('active'));
  document.querySelectorAll('.dc-tab-btn').forEach(el=>el.classList.remove('active'));
  document.getElementById('dc-tab-'+t).classList.add('active');btn.classList.add('active');
  if(t==='progress')renderProgressDashboard();
  if(t==='instview')renderInstituteViewSelects();
  if(t==='export')renderExportSelects();
}
function showLoading(v){document.getElementById('loading').className='loading-overlay'+(v?' show':'');}

// ── Settings Save ───────────────────────────────────────────────
async function saveSettings(){
  const name=document.getElementById('setting-sysname').value.trim();
  const issuedBy=document.getElementById('setting-issuedby').value.trim();
  const newUrl=document.getElementById('setting-scripturl').value.trim();
  const nearExpiry=parseInt(document.getElementById('setting-nearexpiry').value)||90;
  const highExpiry=parseInt(document.getElementById('setting-highexpiry').value)||30;
  if(newUrl&&newUrl!==SCRIPT_URL){SCRIPT_URL=newUrl;safeStorage.set('inv_script_url',newUrl);}
  showLoading(true);
  await api({action:'saveSetting',key:'systemName',value:name});
  await api({action:'saveSetting',key:'issuedBy',value:issuedBy});
  await api({action:'saveSetting',key:'nearExpiry',value:nearExpiry});
  const showSerial=document.getElementById('setting-showserial').value;
  await api({action:'saveSetting',key:'highExpiry',value:highExpiry});
  await api({action:'saveSetting',key:'showSerial',value:showSerial});
  showLoading(false);
  settings.showSerial=showSerial;
  const labelSize=document.getElementById('setting-labelsize').value;
  const labelFont=document.getElementById('setting-labelfont').value;
  const labelShowName=document.getElementById('label-show-name').checked;
  const labelShowBatch=document.getElementById('label-show-batch').checked;
  const labelShowExpiry=document.getElementById('label-show-expiry').checked;
  const labelShowOrg=document.getElementById('label-show-org').checked;
  await api({action:'saveSetting',key:'labelSize',value:labelSize});
  await api({action:'saveSetting',key:'labelFont',value:labelFont});
  await api({action:'saveSetting',key:'labelShowName',value:labelShowName});
  await api({action:'saveSetting',key:'labelShowBatch',value:labelShowBatch});
  await api({action:'saveSetting',key:'labelShowExpiry',value:labelShowExpiry});
  await api({action:'saveSetting',key:'labelShowOrg',value:labelShowOrg});
  settings={...settings,labelSize,labelFont,labelShowName,labelShowBatch,labelShowExpiry,labelShowOrg};
  settings={...settings,systemName:name,issuedBy,nearExpiry,highExpiry};
  applySettings();showAlert('settings-alert','success','Settings saved.');
}

// ── Helpers ─────────────────────────────────────────────────────
function getLocalDateStr(){
  const d=new Date();
  const y=d.getFullYear();
  const m=('0'+(d.getMonth()+1)).slice(-2);
  const day=('0'+d.getDate()).slice(-2);
  return y+'-'+m+'-'+day;
}
function formatDate(d){
  if(!d||d===''||d==='-'||d===null||d===undefined)return'-';
  if(d instanceof Date){
    if(isNaN(d.getTime()))return'-';
    // Use local date methods for Date objects
    return String(d.getDate()).padStart(2,'0')+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+d.getFullYear();
  }
  if(typeof d==='number'){
    const dt=d>100000?new Date(d):new Date(Math.round((d-25569)*86400*1000));
    if(isNaN(dt.getTime()))return'-';
    return String(dt.getDate()).padStart(2,'0')+'-'+String(dt.getMonth()+1).padStart(2,'0')+'-'+dt.getFullYear();
  }
  const s=d.toString().trim();
  if(!s||s==='-')return'-';
  // GS always returns YYYY-MM-DD — split directly, never parse with new Date()
  const iso=s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if(iso)return iso[3]+'-'+iso[2]+'-'+iso[1];
  // DD-MM-YYYY already formatted
  if(/^\d{2}-\d{2}-\d{4}$/.test(s))return s;
  return s;
}
function showAlert(id,type,msg){const el=document.getElementById(id);if(!el)return;el.className=`alert alert-${type} show`;el.textContent=msg;setTimeout(()=>el.classList.remove('show'),4500);}
function exportCSV(rows,filename){
  const csv=rows.map(r=>r.map(c=>`"${String(c).replace(/"/g,'""')}"`).join(',')).join('\n');
  const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([csv],{type:'text/csv'}));a.download=filename;a.click();
}

// ── Delegated print button handler ─────────────────────────────
document.addEventListener('click',function(e){
  var btn=e.target.closest?e.target.closest('.print-voucher-btn'):null;
  if(!btn&&e.target.classList&&e.target.classList.contains('print-voucher-btn'))btn=e.target;
  if(btn){var vNo=btn.getAttribute('data-voucher');if(vNo)printVoucher(vNo);}
});

// ── Init ─────────────────────────────────────────────────────────
checkSetup();
