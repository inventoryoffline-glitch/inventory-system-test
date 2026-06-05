// ============================================================
// print.js — printVoucher, printStock, printLabels, editSerial
// ============================================================

function getPrintStyles(){
  return`<style>
    *{box-sizing:border-box;margin:0;padding:0}
    body{font-family:sans-serif;padding:20px;color:#000;background:#fff}
    .voucher-box{max-width:720px;margin:0 auto;border:2px solid #333;padding:36px;background:#fff}
    .voucher-org{text-align:center;margin-bottom:6px}
    .voucher-org h2{font-size:1.5rem;letter-spacing:.02em}
    .voucher-title-bar{text-align:center;background:#2d5016;color:#fff;padding:8px 0;margin:14px 0 20px;font-weight:700;font-size:1rem;letter-spacing:.08em;text-transform:uppercase;-webkit-print-color-adjust:exact;print-color-adjust:exact}
    .voucher-meta-grid{display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;margin-bottom:20px;font-size:.88rem}
    .voucher-meta-grid .vm-item strong{display:block;font-size:.72rem;text-transform:uppercase;letter-spacing:.05em;color:#777;margin-bottom:2px}
    .voucher-meta-grid .vm-item span{font-weight:600}
    .voucher-table{width:100%;border-collapse:collapse;margin-bottom:24px}
    .voucher-table th{background:#f0f0f0;padding:9px 12px;text-align:left;border:1px solid #bbb;font-size:.82rem;text-transform:uppercase;-webkit-print-color-adjust:exact;print-color-adjust:exact}
    .voucher-table td{padding:9px 12px;border:1px solid #bbb;font-size:.9rem}
    .voucher-table tfoot td{font-weight:700;background:#f9f9f9}
    .voucher-footer{display:grid;grid-template-columns:1fr 1fr;gap:30px;margin-top:36px;font-size:.85rem}
    .voucher-footer .sig-block{text-align:center}
    .voucher-footer .sig-line{border-top:1px solid #333;margin:0 auto 6px;width:180px}
    .voucher-footer .sig-name{font-weight:700;font-size:.9rem}
    .voucher-footer .sig-label{font-size:.75rem;color:#666;margin-top:2px}
    .voucher-remarks{background:#f9f9f9;border-left:3px solid #2d5016;padding:8px 12px;margin-bottom:18px;font-size:.85rem}
    .ledger-table{width:100%;border-collapse:collapse;font-size:.88rem}
    .ledger-table th{background:#2d5016;color:#fff;padding:9px 12px;text-align:left;font-size:.75rem;text-transform:uppercase;border:1px solid #1a3a0a;-webkit-print-color-adjust:exact;print-color-adjust:exact}
    .ledger-table td{padding:10px 12px;border:1px solid #ccc;vertical-align:middle}
    .ledger-table tr.opening td{background:#e8f5e9;font-weight:600;-webkit-print-color-adjust:exact;print-color-adjust:exact}
    .ledger-table tr.writeoff td{background:#fff8f0}
    .ledger-table tr.cancelled-row td{opacity:.55;text-decoration:line-through}
    .no-print{display:none!important}
    @media print{.no-print{display:none!important}}
  </style>`;
}

function openPrintWindow(htmlBody){
  // Remove any existing print frame
  var old=document.getElementById('_printFrame');
  if(old)old.parentNode.removeChild(old);

  var full='<!DOCTYPE html><html><head><title>Print</title>'+getPrintStyles()+'</head><body>'+htmlBody+
    '<div style="text-align:center;margin-top:24px;padding:16px">'+
    '<button onclick="window.print()" style="padding:10px 24px;background:#2d5016;color:#fff;border:none;border-radius:6px;font-size:1rem;cursor:pointer;margin-right:10px">🖨 Print</button>'+
    '<button onclick="document.getElementById(\'_printFrame\').style.display=\'none\'" style="padding:10px 24px;background:#eee;border:none;border-radius:6px;font-size:1rem;cursor:pointer">✕ Close</button>'+
    '</div></body></html>';

  var frame=document.createElement('iframe');
  frame.id='_printFrame';
  frame.style.cssText='position:fixed;top:0;left:0;width:100%;height:100%;border:none;z-index:99999;background:#fff';
  document.body.appendChild(frame);

  frame.contentDocument.open();
  frame.contentDocument.write(full);
  frame.contentDocument.close();

  // Auto-print after content loads
  frame.onload=function(){
    setTimeout(function(){
      try{frame.contentWindow.print();}catch(e){}
    },400);
  };
}

function printVoucher(voucherNo){
  var vNo=(voucherNo||'').toString().trim();
  var vRecs=records.filter(function(r){return r.voucherNo===vNo;});
  if(!vRecs.length){
    // Try loose match in case of encoding diff
    vRecs=records.filter(function(r){return r.voucherNo&&r.voucherNo.trim()===vNo;});
  }
  if(!vRecs.length){showAlert('records-alert','error','Voucher "'+vNo+'" not found. Please refresh and try again.');return;}
  var first=vRecs[0],ic=(first.status||'active')==='cancelled';
  var orgName=settings.systemName||'Inventory Management System',issuedBy=settings.issuedBy||'________________________';
  var showSer=settings.showSerial||'yes';
  var itemRows=vRecs.map(function(r,i){
    var itemCell=r.itemName;
    if(showSer==='yes'&&r.serialNotes){itemCell+='<br><span style="font-size:.75rem;color:#555;font-family:monospace">'+(r.serialType||'Serial')+': '+r.serialNotes+'</span>';}
    return'<tr><td style="text-align:center">'+(i+1)+'</td><td>'+itemCell+'</td><td style="text-align:center">'+r.qty+'</td><td style="text-align:center">'+( r.unit||'-')+'</td></tr>';
  }).join('');
  var html='<div class="voucher-box">'+
    '<div class="voucher-org"><h2>'+orgName+'</h2>'+(ic?'<p style="color:#c62828;font-weight:700;font-size:1rem;margin-top:6px">&#9888; CANCELLED VOUCHER</p>':'')+'</div>'+
    '<div class="voucher-title-bar">Item Issuance Voucher</div>'+
    '<div class="voucher-meta-grid">'+
      '<div class="vm-item"><strong>Voucher No.</strong><span>'+vNo+'</span></div>'+
      '<div class="vm-item"><strong>Date</strong><span>'+formatDate(first.date)+'</span></div>'+
      '<div class="vm-item"><strong>Issued To</strong><span>'+first.instName+'</span></div>'+
    '</div>'+
    (first.remarks?'<div class="voucher-remarks"><strong>Remarks:</strong> '+first.remarks+'</div>':'')+
    '<table class="voucher-table">'+
      '<thead><tr><th style="text-align:center;width:50px">S.No.</th><th>Item Description</th><th style="text-align:center;width:80px">Qty</th><th style="text-align:center;width:80px">Unit</th></tr></thead>'+
      '<tbody>'+itemRows+'</tbody>'+
    '</table>'+
    '<div class="voucher-footer">'+
      '<div class="sig-block">'+
        '<div style="margin-bottom:8px"><div style="font-weight:600;font-size:.88rem">'+(first.receivedBy||'________________________')+'</div>'+(first.receivedPhone?'<div style="font-size:.75rem;color:#555">'+first.receivedPhone+'</div>':'')+'</div>'+
        '<div class="sig-line"></div><div class="sig-name">Received By</div>'+
        '<div class="sig-label">(Authorized Representative &mdash; '+first.instName+')</div>'+
      '</div>'+
      '<div class="sig-block">'+
        '<div style="margin-bottom:8px"><div style="font-weight:600;font-size:.88rem">'+issuedBy+'</div></div>'+
        '<div class="sig-line"></div><div class="sig-name">Issued By</div>'+
        '<div class="sig-label">('+orgName+')</div>'+
      '</div>'+
    '</div>'+
    '<p style="text-align:center;margin-top:28px;font-size:.72rem;color:#aaa;border-top:1px dashed #ddd;padding-top:10px">Generated: '+new Date().toLocaleString('en-IN')+' | '+vNo+'</p>'+
  '</div>';
  openPrintWindow(html);
}

function printStock(){
  const orgName=settings.systemName||'Inventory Management System';
  const rows=stock.map((it,i)=>{
    const exp=it.expiry?formatDate(it.expiry):'—';
    const status=it.qty===0?'Out of Stock':it.qty<=it.low?'Low Stock':'In Stock';
    return`<tr style="background:${it.qty===0?'#ffebee':it.qty<=it.low?'#fff8e1':'#fff'}">
      <td style="padding:8px 10px;border:1px solid #ddd;text-align:center">${i+1}</td>
      <td style="padding:8px 10px;border:1px solid #ddd"><strong>${it.name}</strong></td>
      <td style="padding:8px 10px;border:1px solid #ddd">${it.cat||'-'}</td>
      <td style="padding:8px 10px;border:1px solid #ddd;text-align:center">${it.unit||'-'}</td>
      <td style="padding:8px 10px;border:1px solid #ddd;text-align:right;font-weight:700">${it.qty}</td>
      <td style="padding:8px 10px;border:1px solid #ddd;text-align:center">${exp}</td>
      <td style="padding:8px 10px;border:1px solid #ddd;text-align:center">${status}</td>
    </tr>`;
  }).join('');
  const html=`<div style="max-width:900px;margin:0 auto">
    <div style="text-align:center;margin-bottom:20px;border-bottom:2px solid #333;padding-bottom:14px">
      <h2 style="font-size:1.4rem;font-family:serif">${orgName}</h2>
      <div style="font-size:.85rem;color:#555;margin-top:4px">Current Stock Report</div>
      <div style="font-size:.78rem;color:#888;margin-top:2px">Generated: ${new Date().toLocaleString('en-IN')}</div>
    </div>
    <table style="width:100%;border-collapse:collapse;font-size:.88rem">
      <thead><tr style="background:#2d5016;color:#fff;-webkit-print-color-adjust:exact;print-color-adjust:exact">
        <th style="padding:9px 10px;border:1px solid #1a3a0a;text-align:center">#</th>
        <th style="padding:9px 10px;border:1px solid #1a3a0a">Item Name</th>
        <th style="padding:9px 10px;border:1px solid #1a3a0a">Category</th>
        <th style="padding:9px 10px;border:1px solid #1a3a0a;text-align:center">Unit</th>
        <th style="padding:9px 10px;border:1px solid #1a3a0a;text-align:right">Qty in Hand</th>
        <th style="padding:9px 10px;border:1px solid #1a3a0a;text-align:center">Expiry</th>
        <th style="padding:9px 10px;border:1px solid #1a3a0a;text-align:center">Status</th>
      </tr></thead>
      <tbody>${rows}</tbody>
    </table>
    <div style="margin-top:16px;font-size:.78rem;color:#888;text-align:right">Total items: ${stock.length}</div>
  </div>`;
  openPrintWindow(html);
}

function downloadStockCSV(){
  const rows=[['#','Item Name','Category','Unit','Qty in Hand','Low Stock At','Expiry Date','Status']];
  stock.forEach((it,i)=>{
    const status=it.qty===0?'Out of Stock':it.qty<=it.low?'Low Stock':'In Stock';
    rows.push([i+1,it.name,it.cat||'',it.unit||'',it.qty,it.low,it.expiry?formatDate(it.expiry):'',status]);
  });
  exportCSV(rows,'stock_report_'+getLocalDateStr()+'.csv');
}

function printLabels(){
  if(!stock.length){alert('No items in stock to print labels for.');return;}
  const labelSizes={small:{w:'5cm',h:'3cm'},medium:{w:'7cm',h:'4cm'},large:{w:'10cm',h:'6cm'}};
  const size=labelSizes[settings.labelSize||'medium'];
  const fontSize=settings.labelFont||'12';
  const showName=settings.labelShowName!==false&&settings.labelShowName!=='false';
  const showBatch=settings.labelShowBatch!==false&&settings.labelShowBatch!=='false';
  const showExpiry=settings.labelShowExpiry!==false&&settings.labelShowExpiry!=='false';
  const showOrg=settings.labelShowOrg===true||settings.labelShowOrg==='true';
  const orgName=settings.systemName||'';
  const itemRows=stock.map(it=>`
    <div class="label-select-row">
      <input type="checkbox" id="lbl_${it.id}" value="${it.id}" checked>
      <label for="lbl_${it.id}" style="flex:1;cursor:pointer"><strong>${it.name}</strong> ${it.serialType?'<span style="font-size:.75rem;color:#777">('+it.serialType+': '+(it.serialValue||'—')+')</span>':''}</label>
      <span style="color:#777;font-size:.82rem">${it.expiry?formatDate(it.expiry):'No expiry'}</span>
      <input type="number" min="1" max="100" value="1" id="lbl_qty_${it.id}" style="width:55px;padding:4px 8px;border:1px solid #ddd;border-radius:4px;font-size:.85rem" title="Number of labels">
    </div>`).join('');
  const w=window.open('','_blank');
  if(!w){alert('Please allow popups to print labels.');return;}
  w.document.write(`<!DOCTYPE html><html><head><title>Print Labels</title>
  <style>
    *{box-sizing:border-box;margin:0;padding:0}
    body{font-family:sans-serif;padding:20px;background:#f5f5f5}
    .controls{background:#fff;padding:16px;border-radius:8px;margin-bottom:16px;box-shadow:0 2px 8px rgba(0,0,0,.1)}
    .controls h2{margin-bottom:12px;font-size:1.1rem}
    .label-select-row{display:flex;align-items:center;gap:8px;padding:8px 0;border-bottom:1px solid #eee;font-size:.88rem}
    .label-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(${size.w},1fr));gap:6px;padding:10px}
    .label-box{width:${size.w};min-height:${size.h};border:1px solid #333;padding:8px;background:#fff;display:flex;flex-direction:column;justify-content:center;page-break-inside:avoid}
    .label-name{font-size:${parseInt(fontSize)+2}pt;font-weight:700;line-height:1.2;margin-bottom:3px}
    .label-batch{font-size:${fontSize}pt;color:#333;margin-bottom:2px;font-family:monospace}
    .label-expiry{font-size:${parseInt(fontSize)-1}pt;color:#555;margin-bottom:2px}
    .label-org{font-size:${parseInt(fontSize)-2}pt;color:#777;margin-top:auto;border-top:1px dashed #ccc;padding-top:3px}
    .btn{padding:8px 18px;border:none;border-radius:6px;cursor:pointer;font-size:.9rem;font-weight:600}
    .btn-primary{background:#2d5016;color:#fff}.btn-secondary{background:#eee;color:#333}
    @media print{.controls{display:none!important}.label-grid{padding:0}}
  </style></head><body>
  <div class="controls">
    <h2>🏷 Select Items & Label Count</h2>
    <div id="item-list">${itemRows}</div>
    <div style="margin-top:12px;display:flex;gap:10px">
      <button class="btn btn-primary" onclick="generateLabels()">Generate Labels →</button>
      <button class="btn btn-secondary" onclick="document.querySelectorAll('[id^=lbl_]:not([id*=qty])').forEach(c=>c.checked=true)">Select All</button>
      <button class="btn btn-secondary" onclick="document.querySelectorAll('[id^=lbl_]:not([id*=qty])').forEach(c=>c.checked=false)">Deselect All</button>
    </div>
  </div>
  <div id="label-output"></div>
  <script>
    const stockData=${JSON.stringify(stock.map(s=>({id:s.id,name:s.name,serialType:s.serialType||'',serialValue:s.serialValue||'',expiry:s.expiry||''})))};
    const showName=${showName},showBatch=${showBatch},showExpiry=${showExpiry},showOrg=${showOrg};
    const orgName=${JSON.stringify(orgName)};
    function labelFormatExpiry(d){if(!d||d==='-')return'';try{const p=d.toString().split('-');if(p.length===3&&p[0].length===4){const months=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];return months[parseInt(p[1])-1]+' '+p[0];}return d;}catch(e){return d;}}
    function generateLabels(){
      const checks=document.querySelectorAll('[id^=lbl_]:not([id*=qty]):checked');
      if(!checks.length){alert('Select at least one item.');return;}
      let html='<div class="label-grid">';
      checks.forEach(cb=>{
        const itemId=cb.value;
        const qty=parseInt(document.getElementById('lbl_qty_'+itemId).value)||1;
        const item=stockData.find(s=>s.id==itemId);if(!item)return;
        for(let i=0;i<qty;i++){
          html+='<div class="label-box">';
          if(showName)html+='<div class="label-name">'+item.name+'</div>';
          if(showBatch&&item.serialValue)html+='<div class="label-batch">'+(item.serialType||'Batch')+': '+item.serialValue+'</div>';
          if(showExpiry&&item.expiry)html+='<div class="label-expiry">Exp: '+labelFormatExpiry(item.expiry)+'</div>';
          if(showOrg&&orgName)html+='<div class="label-org">'+orgName+'</div>';
          html+='</div>';
        }
      });
      html+='</div>';
      document.getElementById('label-output').innerHTML=html;
      setTimeout(()=>window.print(),400);
    }
  <\/script>
  </body></html>`);
  w.document.close();
}

function editSerialNumber(recordId,currentSerial,serialType){
  const newVal=prompt(`Edit ${serialType} for this record:\n(Current: ${currentSerial||'empty'})`,currentSerial||'');
  if(newVal===null)return;
  updateRecordSerial(recordId,newVal.trim());
}
async function updateRecordSerial(recordId,serialNotes){
  showLoading(true);
  const res=await api({action:'updateSerialNotes',recordId,serialNotes});
  showLoading(false);if(!res)return;
  showAlert('records-alert','success','Serial/Batch number updated.');
  await loadAll();
}
