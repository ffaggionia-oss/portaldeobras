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
      <div style="text-align:center; margin-top:16px;">
        <span class="btn-ghost" onclick="renderCalculadoraPublica()">🧮 Calculadora de colocadores (sin código de acceso)</span>
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

    const activas = res.obras.filter(o => o.estado !== 'cerrada').sort((a, b) => new Date(b.fechaActualizacion) - new Date(a.fechaActualizacion));
    const archivadas = res.obras.filter(o => o.estado === 'cerrada').sort((a, b) => new Date(b.fechaActualizacion) - new Date(a.fechaActualizacion));

    let html = activas.length === 0
      ? `<div class="empty-state"><div class="big">No hay obras activas</div><p>Todas las obras están archivadas, o todavía no creaste ninguna.</p></div>`
      : activas.map(renderObraCard).join('');

    html += `
      <div class="archive-toggle" id="archiveToggle" onclick="toggleArchivadas()">
        <span class="arrow">▸</span> Obras archivadas / terminadas (${archivadas.length})
      </div>
      <div class="archivadas-list" id="archivadasList" style="display:none;">
        ${archivadas.length === 0 ? '<div class="small-note" style="padding:10px 0;">Todavía no hay obras marcadas como terminadas. Se marcan desde la solapa H5 dentro de cada obra.</div>' : archivadas.map(renderObraCard).join('')}
      </div>
    `;

    document.getElementById('obrasList').innerHTML = html;
  } catch (err) {
    document.getElementById('connStatus').textContent = '⚠ error de conexión';
    document.getElementById('obrasList').innerHTML = `<div class="empty-state"><div class="big">No se pudo conectar</div><p>${escapeHtml(err.message)}</p></div>`;
  }
}

function renderObraCard(o) {
  return `
    <div class="obra-card" onclick="openObra('${o.obraId}')">
      <div>
        <div class="nombre">${escapeHtml(o.cliente)}</div>
        <div class="sub">Actualizado ${formatDate(o.fechaActualizacion)}</div>
        ${renderProgresoDots(o.progreso)}
      </div>
      <div class="estado-pill estado-${o.estado}">${estadoLabel(o.estado)}</div>
    </div>
  `;
}

function toggleArchivadas() {
  const list = document.getElementById('archivadasList');
  const toggle = document.getElementById('archiveToggle');
  if (!list) return;
  const abierto = list.style.display !== 'none';
  list.style.display = abierto ? 'none' : 'block';
  toggle.classList.toggle('open', !abierto);
}

function hitoCompleto(obra, hito) {
  if (hito === 'h1' || hito === 'h2' || hito === 'h3') return !!(obra[hito] && obra[hito]._completo);
  if (hito === 'h4') return !!(obra.h4 && obra.h4.completo);
  if (hito === 'h5') return !!(obra.h5 && obra.h5.length > 0);
  if (hito === 'fotos') return !!(obra.fotos && obra.fotos.length > 0);
  return false;
}

function estadoLabel(e) {
  return { diagnostico: 'Diagnóstico', sistema_definido: 'Sistema definido', compras_validadas: 'Compras validadas', en_obra: 'En obra', cerrada: 'Terminada' }[e] || e;
}

// Secuencia de hitos "de progreso" (excluye Fotos, que no es un hito secuencial),
// filtrada según lo que puede ver el rol actual.
function pasosProgreso() {
  return HITO_ORDER.filter(h => h !== 'fotos' && (ROLE_TABS[currentUser.rol] || []).indexOf(h) !== -1);
}

// Stepper compacto: usado en cada tarjeta de la lista de obras.
function renderProgresoDots(progreso) {
  if (!progreso) return '';
  const tabs = pasosProgreso();
  if (tabs.length === 0) return '';
  const hechos = tabs.filter(h => progreso[h]).length;
  const parts = tabs.map((h, i) => {
    const completo = !!progreso[h];
    const lineCompleta = i > 0 && completo && progreso[tabs[i - 1]];
    return (i > 0 ? `<span class="sc-line ${lineCompleta ? 'completo' : ''}"></span>` : '') +
           `<span class="sc-dot ${completo ? 'completo' : ''}" title="${HITO_LABELS[h]}"></span>`;
  }).join('');
  return `<div class="stepper-compact">${parts}<span class="sc-count">${hechos}/${tabs.length}</span></div>`;
}

// Stepper completo: usado arriba de las solapas dentro de una obra.
function renderStepperCompleto(obra) {
  const tabs = pasosProgreso();
  if (tabs.length === 0) return '';
  return `<div class="stepper">
    ${tabs.map((h, i) => {
      const completo = hitoCompleto(obra, h);
      const activo = currentHito === h;
      const label = (HITO_LABELS[h] || h).replace(/^H\d+\s*·\s*/, '');
      return `<div class="stepper-step ${completo ? 'completo' : ''} ${activo ? 'activo' : ''}" onclick="switchHito('${h}')">
        ${i > 0 ? '<div class="stepper-line"></div>' : ''}
        <div class="stepper-circle">${completo ? '✓' : (i + 1)}</div>
        <div class="stepper-label">${escapeHtml(label)}</div>
      </div>`;
    }).join('')}
  </div>`;
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
    ${o.estado === 'cerrada' ? `<div class="obra-finalizada-banner">✓ Esta obra está marcada como terminada y archivada.</div>` : ''}
    ${renderStepperCompleto(o)}
    <div class="hito-tabs">
      ${tabs.map(h => `<div class="hito-tab ${currentHito===h?'active':''} ${hitoCompleto(o, h)?'completo':'pendiente'}" onclick="switchHito('${h}')">${HITO_LABELS[h]}</div>`).join('')}
    </div>
    <div id="hito-content"></div>
    <div class="section no-print">
      <div class="section-title">Imprimir / Historial de esta solapa</div>
      <button type="button" class="btn-secondary" onclick="imprimirHitoActual()">🖨 Imprimir / Guardar como PDF</button>
      <div class="small-note" style="margin-top:12px;">Últimas impresiones o descargas de <strong>${escapeHtml(HITO_LABELS[currentHito] || currentHito)}</strong>:</div>
      <div id="logPanelList" class="small-note" style="margin-top:6px;">Cargando...</div>
    </div>
    <div class="save-bar">
      <div class="save-status" id="saveStatus"></div>
      ${(currentHito!=='h4' && currentHito!=='h5' && currentHito!=='fotos') ? `<button class="btn-primary" onclick="saveCurrentHito(true)">Guardar ahora</button>` : ''}
    </div>
  `;
  renderCurrentHito();
  cargarLogsHito(currentHito);
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

// ---- Marcar / desmarcar obra como terminada (archivo) ----
async function toggleObraFinalizada(checked) {
  if (!currentObraData) return;
  if (checked) {
    if (!confirm('¿Marcar "' + currentObraData.cliente + '" como obra Terminada? Pasará a Obras archivadas en la pantalla principal.')) {
      const chk = document.getElementById('h5_finalizada');
      if (chk) chk.checked = false;
      return;
    }
  }
  setSaveStatus('Guardando...', '');
  const nuevoEstado = checked ? 'cerrada' : 'en_obra';
  try {
    const res = await API.updateEstado(currentObraData.obraId, nuevoEstado, currentUser.token);
    if (res.ok) {
      currentObraData.estado = nuevoEstado;
      renderObraView();
      setSaveStatus('✓ Guardado ' + new Date().toLocaleTimeString('es-AR', {hour:'2-digit', minute:'2-digit'}), 'ok');
    } else {
      setSaveStatus('Error al guardar: ' + res.error, 'error');
    }
  } catch (err) {
    setSaveStatus('Error de conexión', 'error');
  }
}

// ---- Imprimir / Historial por solapa ----
async function imprimirHitoActual() {
  if (!currentObraData) return;
  try {
    await API.logAccion(currentObraData.obraId, currentHito, 'imprimir', currentUser.token);
  } catch (err) { /* si falla el log, igual dejamos imprimir */ }
  window.print();
  cargarLogsHito(currentHito);
}

async function cargarLogsHito(hito) {
  const el = document.getElementById('logPanelList');
  if (!el || !currentObraData) return;
  el.textContent = 'Cargando...';
  try {
    const res = await API.getLogs(currentObraData.obraId, hito, currentUser.token);
    if (!res.ok) { el.textContent = 'No se pudo cargar el historial.'; return; }
    if (!res.logs || res.logs.length === 0) {
      el.innerHTML = 'Todavía no hay impresiones registradas para esta solapa.';
      return;
    }
    el.innerHTML = res.logs.map(l => `<div>${escapeHtml(l.usuario)} · ${formatDate(l.fecha)}</div>`).join('');
  } catch (err) {
    el.textContent = 'Error de conexión al cargar el historial.';
  }
}

// ---- init ----
initApp();
