// ============================================
// APP — login, navegación, helpers, guardado
// ============================================

let currentUser = null; // { token, nombre, rol }
let currentObraData = null;
let currentHito = 'h1';
let saveTimer = null;

const ROLE_LABELS = {
  colocador: 'Colocador',
  compras_admin: 'Compras / Admin',
  project_manager: 'Project Manager',
  gerencia: 'Gerencia'
};

const HITO_LABELS = {
  h1: 'H1 · Diagnóstico',
  h2: 'H2 · Sistema constructivo',
  h3: 'H3 · Costos y compras',
  h4: 'H4 · Financiero',
  h5: 'H5 · Remito final',
  fotos: 'Fotos y Planos'
};
const HITO_ORDER = ['h1', 'h2', 'h3', 'h4', 'h5', 'fotos'];
const ROLE_TABS = {
  colocador:       ['h1', 'fotos'],
  compras_admin:   ['h1', 'h2', 'h3', 'h5', 'fotos'],
  project_manager: ['h1', 'h2', 'h3', 'h5', 'fotos'],
  gerencia:        ['h1', 'h2', 'h3', 'h4', 'h5', 'fotos']
};

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
  if (e.target.matches('input, textarea, select') && e.target.type !== 'file') scheduleAutosave();
});
document.addEventListener('input', (e) => {
  if (e.target.matches('textarea, input[type=text]')) scheduleAutosave();
});

function scheduleAutosave() {
  // H4/H5/fotos no usan autosave de texto (H4 guarda al elegir segmento, H5/fotos al subir archivo)
  if (currentHito === 'h4' || currentHito === 'h5' || currentHito === 'fotos') return;
  clearTimeout(saveTimer);
  setSaveStatus('Editando...', '');
  const hitoAlProgramar = currentHito;
  saveTimer = setTimeout(() => {
    saveTimer = null;
    saveCurrentHito(false, hitoAlProgramar);
  }, 1500);
}

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

// ---- auth ----
function renderLogin(errorMsg) {
  const app = document.getElementById('app');
  document.getElementById('connStatus').textContent = '';
  app.innerHTML = `
    <div style="max-width:380px; margin:60px auto 0;">
      <div class="section">
        <div class="section-title">Acceso</div>
        <div class="field">
          <label>Código de acceso</label>
          <input type="text" id="loginTokenInput" placeholder="Tu código personal" autofocus>
        </div>
        ${errorMsg ? `<div class="small-note" style="color:var(--danger); margin-top:8px;">${escapeHtml(errorMsg)}</div>` : ''}
        <button class="btn-primary btn-block" style="margin-top:14px;" onclick="intentarLogin()">Entrar</button>
      </div>
    </div>
  `;
  const input = document.getElementById('loginTokenInput');
  input.focus();
  input.addEventListener('keydown', (e) => { if (e.key === 'Enter') intentarLogin(); });
}

async function intentarLogin() {
  const token = document.getElementById('loginTokenInput').value.trim();
  if (!token) return;
  const res = await API.login(token);
  if (res.ok) {
    currentUser = { token, nombre: res.nombre, rol: res.rol };
    localStorage.setItem('kokkai_token', token);
    renderTopbarUser();
    renderHome();
  } else {
    renderLogin(res.error || 'Código inválido');
  }
}

function cerrarSesion() {
  localStorage.removeItem('kokkai_token');
  currentUser = null;
  currentObraData = null;
  document.getElementById('topbarUser').innerHTML = '';
  renderLogin();
}

function renderTopbarUser() {
  const el = document.getElementById('topbarUser');
  if (!el || !currentUser) return;
  el.innerHTML = `
    <span>${escapeHtml(currentUser.nombre)} · ${escapeHtml(ROLE_LABELS[currentUser.rol] || currentUser.rol)}</span>
    <span class="btn-ghost" style="margin-left:8px;" onclick="cerrarSesion()">Salir</span>
  `;
}

async function initApp() {
  const savedToken = localStorage.getItem('kokkai_token');
  if (!savedToken) { renderLogin(); return; }
  const res = await API.login(savedToken);
  if (res.ok) {
    currentUser = { token: savedToken, nombre: res.nombre, rol: res.rol };
    renderTopbarUser();
    renderHome();
  } else {
    localStorage.removeItem('kokkai_token');
    renderLogin();
  }
}

// ---- routing ----
async function goHome() {
  if (!currentUser) return;
  await flushPendingSave();
  currentObraData = null;
  location.hash = '';
  renderHome();
}

async function renderHome() {
  const app = document.getElementById('app');
  const puedeCrear = currentUser.rol !== 'colocador';
  app.innerHTML = `
    <div class="list-header">
      <h1>Obras activas</h1>
      ${puedeCrear ? `<button class="btn-primary" onclick="openNuevaObraModal()">+ Nueva obra</button>` : ''}
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
    const res = await API.listObras(currentUser.token);
    document.getElementById('connStatus').textContent = '● conectado';
    if (!res.ok) throw new Error(res.error);
    if (res.obras.length === 0) {
      document.getElementById('obrasList').innerHTML = `
        <div class="empty-state">
          <div class="big">Todavía no hay obras cargadas</div>
          <p>${puedeCrear ? 'Creá la primera para empezar el diagnóstico H1.' : 'Todavía no hay obras asignadas.'}</p>
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
  const res = await API.createObra(nombre, currentUser.token);
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
  const res = await API.getObra(obraId, currentUser.token);
  if (!res.ok) { app.innerHTML = `<div class="empty-state">Error: ${escapeHtml(res.error)}</div>`; return; }
  currentObraData = res.obra;
  const tabs = ROLE_TABS[currentUser.rol] || ['h1'];
  currentHito = tabs[0];
  renderObraView();
}

// Recarga la obra actual sin resetear la pestaña activa (usado tras subir
// archivos o cambiar el segmento en Financiero, donde el backend recalcula).
async function reloadObra() {
  if (!currentObraData) return;
  const res = await API.getObra(currentObraData.obraId, currentUser.token);
  if (res.ok) {
    currentObraData = res.obra;
    renderObraView();
  }
}

function renderObraView() {
  const o = currentObraData;
  const app = document.getElementById('app');
  const tabs = HITO_ORDER.filter(h => (ROLE_TABS[currentUser.rol] || []).indexOf(h) !== -1);
  app.innerHTML = `
    <div class="obra-header">
      <div class="back-link" onclick="goHome()">← Volver a obras</div>
      <div class="obra-title">${escapeHtml(o.cliente)}</div>
      <div class="estado-pill estado-${o.estado}">${estadoLabel(o.estado)}</div>
    </div>
    <div class="hito-tabs">
      ${tabs.map(h => `<div class="hito-tab ${currentHito===h?'active':''}" onclick="switchHito('${h}')">${HITO_LABELS[h]}</div>`).join('')}
    </div>
    <div id="hito-content"></div>
    <div class="save-bar">
      <div class="save-status" id="saveStatus"></div>
      ${(currentHito!=='h4' && currentHito!=='h5' && currentHito!=='fotos') ? `<button class="btn-primary" onclick="saveCurrentHito(true)">Guardar ahora</button>` : ''}
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
  if (currentHito === 'h4') content.innerHTML = renderH4(currentObraData);
  if (currentHito === 'h5') content.innerHTML = renderH5(currentObraData);
  if (currentHito === 'fotos') content.innerHTML = renderFotos(currentObraData);
}

async function saveCurrentHito(manual, hitoOverride) {
  if (!currentObraData) return;
  const hito = hitoOverride || currentHito;
  if (hito === 'h4' || hito === 'h5' || hito === 'fotos') return; // se guardan solos
  setSaveStatus('Guardando...', '');
  let data, estado;
  if (hito === 'h1') { data = collectH1(); currentObraData.h1 = data; }
  if (hito === 'h2') { data = collectH2(); currentObraData.h2 = data; estado = 'sistema_definido'; }
  if (hito === 'h3') { data = collectH3(); currentObraData.h3 = data; estado = 'compras_validadas'; }

  try {
    const res = await API.saveHito(currentObraData.obraId, hito, data, estado, currentUser.token);
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
initApp();
