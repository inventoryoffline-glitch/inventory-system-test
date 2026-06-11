// ============================================================
// sticky-panel.js — Global Sticky Notes Panel & Calculator
// ============================================================

let stickyPanelOpen = false;
let calcExpression = '';
let calcResult = 0;

// ── PANEL TOGGLE ───────────────────────────────────────────
function toggleStickyPanel() {
  const panel = document.getElementById('sticky-notes-panel');
  const btn = document.getElementById('sticky-notes-btn');
  stickyPanelOpen = !stickyPanelOpen;
  
  if (stickyPanelOpen) {
    panel.classList.add('open');
    btn.classList.add('open');
    try { renderStickyNotesTab(); } catch(e) {}
  } else {
    panel.classList.remove('open');
    btn.classList.remove('open');
  }
}

function switchStickyTab(tab, btn) {
  document.querySelectorAll('.sticky-tab-content').forEach(el => el.classList.remove('active'));
  document.querySelectorAll('.sticky-tab-btn').forEach(el => el.classList.remove('active'));
  
  const tabEl = document.getElementById('sticky-' + tab + '-tab');
  if (tabEl) tabEl.classList.add('active');
  if (btn) btn.classList.add('active');
}

// ── STICKY NOTES ───────────────────────────────────────────
function renderStickyNotesTab() {
  const instSelect = document.getElementById('sticky-notes-inst-select');
  if (!instSelect) return;
  instSelect.innerHTML = '<option value="">— Select Institute —</option>' + 
    (institutes || []).map(i => `<option value="${i.id}">${i.name}</option>`).join('');
}

async function onStickyNotesInstituteSelect() {
  const instId = document.getElementById('sticky-notes-inst-select').value;
  if (!instId) {
    document.getElementById('sticky-notes-list').innerHTML = '<p class="empty-msg" style="font-size:.8rem">Select an institute to view notes.</p>';
    return;
  }
  
  showLoading(true);
  const res = await api({ action: 'getInstituteNotes', instituteId: instId });
  showLoading(false);
  
  if (!res) return;
  
  const notes = res.notes || [];
  const listEl = document.getElementById('sticky-notes-list');
  
  if (notes.length === 0) {
    listEl.innerHTML = '<p class="empty-msg" style="font-size:.8rem">No notes yet.</p>';
  } else {
    listEl.innerHTML = notes.map(note => {
      const date = new Date(note.timestamp);
      const dateStr = date.toLocaleDateString('en-IN') + ' ' + date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
      return `
        <div class="note-item">
          <div class="note-item-time">${dateStr}</div>
          <div class="note-item-text">${escapeHtml(note.noteText)}</div>
          <button class="note-item-delete" onclick="deleteStickyNote('${note.id}', '${instId}')">Delete</button>
        </div>
      `;
    }).join('');
  }
}

async function saveStickyNote() {
  const instId = document.getElementById('sticky-notes-inst-select').value;
  const noteText = document.getElementById('sticky-notes-input').value.trim();
  
  if (!instId) {
    alert('Please select an institute first.');
    return;
  }
  
  if (!noteText) {
    alert('Please enter a note.');
    return;
  }
  
  const inst = institutes.find(i => i.id === instId);
  showLoading(true);
  const res = await api({
    action: 'saveInstituteNote',
    instituteId: instId,
    instituteName: inst ? inst.name : '',
    noteText: noteText
  });
  showLoading(false);
  
  if (!res) return;
  
  document.getElementById('sticky-notes-input').value = '';
  await onStickyNotesInstituteSelect();
}

async function deleteStickyNote(noteId, instId) {
  if (!confirm('Delete this note?')) return;
  
  showLoading(true);
  const res = await api({ action: 'deleteInstituteNote', noteId: noteId });
  showLoading(false);
  
  if (!res) return;
  await onStickyNotesInstituteSelect();
}

function escapeHtml(text) {
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  return text.replace(/[&<>"']/g, m => map[m]);
}

// ── CALCULATOR ─────────────────────────────────────────────
function calcInput(val) {
  const display = document.getElementById('calc-display');
  
  if (val === 'C') {
    calcExpression = '';
    calcResult = 0;
    display.textContent = '0';
    return;
  }
  
  if (val === '=') {
    calcEquals();
    return;
  }
  
  // Handle operators
  if (['+', '-', '*', '/', '%'].includes(val)) {
    if (calcExpression === '') {
      calcExpression = calcResult + val;
    } else if (!calcExpression.match(/[+\-*/%]$/)) {
      calcExpression += val;
    }
  } else {
    // Handle numbers and decimal
    if (calcExpression === '' && calcResult !== 0) {
      calcExpression = val;
    } else {
      calcExpression += val;
    }
  }
  
  display.textContent = calcExpression || '0';
}

function calcEquals() {
  const display = document.getElementById('calc-display');
  
  if (!calcExpression) return;
  
  try {
    // Replace display symbols with operators
    let expr = calcExpression
      .replace(/÷/g, '/')
      .replace(/×/g, '*')
      .replace(/−/g, '-');
    
    // Evaluate the expression
    calcResult = Function('"use strict"; return (' + expr + ')')();
    calcExpression = '';
    display.textContent = calcResult;
  } catch (e) {
    display.textContent = 'Error';
    calcExpression = '';
    calcResult = 0;
  }
}

function calcClear() {
  const display = document.getElementById('calc-display');
  calcExpression = '';
  calcResult = 0;
  display.textContent = '0';
}

// ── INIT ────────────────────────────────────────────────────
function initStickyPanel() {
  try { renderStickyNotesTab(); } catch(e) {}
}

// Initialize on load
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initStickyPanel);
} else {
  initStickyPanel();
}
