// ============================================================
// notes.js — Institute Notes Management
// ============================================================

let instituteNotes = {};

async function renderNotesTab() {
  // Notes tab no longer exists - moved to sticky panel
  return;
}

async function onNotesInstituteSelect() {
  console.log('onNotesInstituteSelect triggered');
  const instId = document.getElementById('notes-inst-select').value;
  console.log('Selected Institute ID:', instId);
  if (!instId) {
    document.getElementById('notes-container').innerHTML = '<p class="empty-msg">Select an institute to view notes.</p>';
    return;
  }
  
  showLoading(true);
  const res = await api({ action: 'getInstituteNotes', instituteId: instId });
  showLoading(false);
  
  if (!res) return;
  
  const inst = institutes.find(i => i.id === instId);
  const notes = res.notes || [];
  
  let html = `
    <div style="margin-bottom:20px">
      <h3 style="font-size:1rem;color:var(--accent);margin-bottom:12px">📝 Notes for ${inst ? inst.name : 'Unknown'}</h3>
      <div style="display:flex;gap:10px;margin-bottom:16px">
        <textarea id="notes-input" placeholder="Add a new note..." style="flex:1;padding:10px 14px;border:1px solid var(--border);border-radius:8px;font-family:'DM Sans',sans-serif;font-size:.9rem;min-height:80px;resize:vertical;background:var(--surface2)"></textarea>
        <button class="btn btn-primary" style="align-self:flex-start;height:fit-content" onclick="saveNewNote('${instId}', '${inst ? inst.name.replace(/'/g, "\\'") : ''}')">+ Add Note</button>
      </div>
    </div>
  `;
  
  if (notes.length === 0) {
    html += '<p class="empty-msg">No notes yet. Add one above.</p>';
  } else {
    html += '<div style="display:flex;flex-direction:column;gap:12px">';
    notes.forEach(note => {
      const date = new Date(note.timestamp);
      const dateStr = date.toLocaleDateString('en-IN') + ' ' + date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
      html += `
        <div style="background:var(--surface2);border:1px solid var(--border);border-radius:8px;padding:14px;position:relative">
          <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:8px">
            <div style="font-size:.75rem;color:var(--muted);font-weight:600">${dateStr}</div>
            <button class="btn btn-danger btn-sm" onclick="deleteNote('${note.id}', '${instId}')">Delete</button>
          </div>
          <div style="font-size:.9rem;line-height:1.5;color:var(--text);white-space:pre-wrap;word-break:break-word">${escapeHtml(note.noteText)}</div>
        </div>
      `;
    });
    html += '</div>';
  }
  
  document.getElementById('notes-container').innerHTML = html;
}

async function saveNewNote(instId, instName) {
  const noteText = document.getElementById('notes-input').value.trim();
  if (!noteText) {
    showAlert('notes-alert', 'error', 'Please enter a note.');
    return;
  }
  
  showLoading(true);
  const res = await api({
    action: 'saveInstituteNote',
    instituteId: instId,
    instituteName: instName,
    noteText: noteText
  });
  showLoading(false);
  
  if (!res) return;
  
  showAlert('notes-alert', 'success', 'Note saved.');
  document.getElementById('notes-input').value = '';
  await onNotesInstituteSelect();
}

async function deleteNote(noteId, instId) {
  if (!confirm('Delete this note?')) return;
  
  showLoading(true);
  const res = await api({ action: 'deleteInstituteNote', noteId: noteId });
  showLoading(false);
  
  if (!res) return;
  
  showAlert('notes-alert', 'success', 'Note deleted.');
  await onNotesInstituteSelect();
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
