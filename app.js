// ============================================
// APP — navegación, helpers, guardado
// ============================================

let currentObraData = null;
let currentHito = 'h1';
let saveTimer = null;

// ---- helpers ----
function val(id) { const el = document.getElementById(id); return el ? el.value : ''; }
function chipVal(groupId) { const el = document.getElementById(groupId); return el ? el.getAttribute('data-value') || '' : ''; }
function escapeHtml(str) { return (str || '').toString().replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
function escapeAttr(str) { return escapeHtml(str); }

document.addEventListener('click', (e) => {
  const chip = e.target.closest('.radio-chip');
  if (chip) {
    const group = chip.parentElement;
    group.querySelectorAll('.radio-chip').forEach(c => c.classList.remove('selected'));
    chip.classList.add('selected');
    group.setAttribute('data-value', chip.getAttribute('data-val'));
    scheduleAutosave();
  }
});
document.addEventListener('change', (e) => {
  if (e.target.matches('input, textarea, select')) scheduleAutosave();
});
document.addEventListener('input', (e) => {
  if (e.target.matches('textarea, input[type=text]')) scheduleAutosave();
});

function scheduleAutosave() {
  clearTimeout(saveTimer);
  setSaveStatus('Editando...', '');
  // Capturamos EN ESTE MOMENTO a qué hito pertenece este guardado.
  // Si el usuario cambia de pestaña antes de que dispare el timer,
  // igual va a guardar los datos del hito correcto (no el que esté
  // activo cuando finalmente se ejecute el timeout).
  const hitoAlProgramar = currentHito;
  saveTimer = setTimeout(() => {
    saveTimer = null;
    saveCurrentHito(false, hitoAlProgramar);
  }, 1500);
}

// Si hay un guardado pendiente (timer corriendo), lo cancela y lo
// ejecuta de inmediato. Se usa antes de cambiar de pestaña/obra para
// no perder ediciones que todavía no se guardaron.
async function flushPendingSave() {
  if (saveTimer) {
    const hitoPendiente = currentHito;
    clearTimeout(saveTimer);
    saveTimer = null;
    if (currentObraData) {
      await saveCurrentHito(false, hitoPendiente);
    }
  }
}

function setSaveStatus(text, cls) {
  const el = document.getElementById('saveStatus');
  if (el) { el.textContent = text; el.className = 'save-status ' + cls; }
}

// ---- routing ----
async function goHome() {
  await flushPendingSave();
  currentObraData = null;
  location.hash = '';
  renderHome();
}

async function renderHome() {
  const app = document.getElementById('app');
  app.innerHTML = `
    <div class="list-header">
      <h1>Obras activas</h1>
      <button class="btn-primary" onclick="openNuevaObraModal()">+ Nueva obra</button>
    </div>
    <div id="obrasList"><div class="empty-state">Cargando...</div></div>
  `;

  if (!isConfigured()) {
    document.getElementById('obrasList').innerHTML = `
      <div class="empty-state">
        <div class="big">Falta configurar la conexión</div>
        <p>Pegá la URL de tu Apps Script en <code>config.js</code> (variable CONFIG.API_URL) y recargá la página.</p>
      </div>`;
    document.getElementById('connStatus').textContent = '⚠ sin configurar';
    return;
  }

  try {
    const res = await API.listObras();
    document.getElementById('connStatus').textContent = '● conectado';
    if (!res.ok) throw new Error(res.error);
    if (res.obras.length === 0) {
      document.getElementById('obrasList').innerHTML = `
        <div class="empty-state">
          <div class="big">Todavía no hay obras cargadas</div>
          <p>Creá la primera para empezar el diagnóstico H1.</p>
        </div>`;
      return;
    }
    document.getElementById('obrasList').innerHTML = res.obras
      .sort((a,b) => new Date(b.fechaActualizacion) - new Date(a.fechaActualizacion))
      .map(o => `
        <div class="obra-card" onclick="openObra('${o.obraId}')">
          <div>
            <div class="nombre">${escapeHtml(o.cliente)}</div>
            <div class="sub">Actualizado ${formatDate(o.fechaActualizacion)}</div>
          </div>
          <div class="estado-pill estado-${o.estado}">${estadoLabel(o.estado)}</div>
        </div>
      `).join('');
  } catch (err) {
    document.getElementById('connStatus').textContent = '⚠ error de conexión';
    document.getElementById('obrasList').innerHTML = `<div class="empty-state"><div class="big">No se pudo conectar</div><p>${escapeHtml(err.message)}</p></div>`;
  }
}

function estadoLabel(e) {
  return { diagnostico: 'Diagnóstico', sistema_definido: 'Sistema definido', compras_validadas: 'Compras validadas', en_obra: 'En obra', cerrada: 'Cerrada' }[e] || e;
}

function formatDate(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleDateString('es-AR', { day:'2-digit', month:'short', year:'numeric' }) + ' ' + d.toLocaleTimeString('es-AR', {hour:'2-digit', minute:'2-digit'});
}

function openNuevaObraModal() {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `
    <div class="modal">
      <h2>Nueva obra</h2>
      <div class="field">
        <label>Nombre del cliente / obra</label>
        <input type="text" id="nuevoClienteInput" placeholder="Ej: Pichot Cerramiento" autofocus>
      </div>
      <div style="display:flex; gap:10px; margin-top:18px;">
        <button class="btn-secondary" onclick="this.closest('.modal-overlay').remove()">Cancelar</button>
        <button class="btn-primary btn-block" onclick="crearObra()">Crear obra</button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);
  document.getElementById('nuevoClienteInput').focus();
}

async function crearObra() {
  const nombre = document.getElementById('nuevoClienteInput').value.trim();
  if (!nombre) return;
  const res = await API.createObra(nombre);
  if (res.ok) {
    document.querySelector('.modal-overlay').remove();
    openObra(res.obraId);
  } else {
    alert('Error al crear obra: ' + res.error);
  }
}

async function openObra(obraId) {
  const app = document.getElementById('app');
  app.innerHTML = `<div class="empty-state">Cargando obra...</div>`;
  const res = await API.getObra(obraId);
  if (!res.ok) { app.innerHTML = `<div class="empty-state">Error: ${escapeHtml(res.error)}</div>`; return; }
  currentObraData = res.obra;
  currentHito = 'h1';
  renderObraView();
}

function renderObraView() {
  const o = currentObraData;
  const app = document.getElementById('app');
  app.innerHTML = `
    <div class="obra-header">
      <div class="back-link" onclick="goHome()">← Volver a obras</div>
      <div class="obra-title">${escapeHtml(o.cliente)}</div>
      <div class="estado-pill estado-${o.estado}">${estadoLabel(o.estado)}</div>
    </div>
    <div class="hito-tabs">
      <div class="hito-tab ${currentHito==='h1'?'active':''}" onclick="switchHito('h1')">H1 · Diagnóstico</div>
      <div class="hito-tab ${currentHito==='h2'?'active':''}" onclick="switchHito('h2')">H2 · Sistema constructivo</div>
      <div class="hito-tab ${currentHito==='h3'?'active':''}" onclick="switchHito('h3')">H3 · Compras y pago</div>
    </div>
    <div id="hito-content"></div>
    <div class="save-bar">
      <div class="save-status" id="saveStatus"></div>
      <button class="btn-primary" onclick="saveCurrentHito(true)">Guardar ahora</button>
    </div>
  `;
  renderCurrentHito();
}

async function switchHito(hito) {
  await flushPendingSave();
  currentHito = hito;
  renderObraView();
}

function renderCurrentHito() {
  const content = document.getElementById('hito-content');
  if (currentHito === 'h1') content.innerHTML = renderH1(currentObraData);
  if (currentHito === 'h2') content.innerHTML = renderH2(currentObraData);
  if (currentHito === 'h3') content.innerHTML = renderH3(currentObraData);
}

async function saveCurrentHito(manual, hitoOverride) {
  if (!currentObraData) return;
  const hito = hitoOverride || currentHito;
  setSaveStatus('Guardando...', '');
  let data, estado;
  if (hito === 'h1') { data = collectH1(); currentObraData.h1 = data; }
  if (hito === 'h2') { data = collectH2(); currentObraData.h2 = data; estado = 'sistema_definido'; }
  if (hito === 'h3') { data = collectH3(); currentObraData.h3 = data; estado = 'compras_validadas'; }

  try {
    const res = await API.saveHito(currentObraData.obraId, hito, data, estado);
    if (res.ok) {
      setSaveStatus('✓ Guardado ' + new Date().toLocaleTimeString('es-AR', {hour:'2-digit', minute:'2-digit'}), 'ok');
      if (estado) currentObraData.estado = estado;
    } else {
      setSaveStatus('Error al guardar: ' + res.error, 'error');
    }
  } catch (err) {
    setSaveStatus('Error de conexión', 'error');
  }
}

// ---- init ----
renderHome();
