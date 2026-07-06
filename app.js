// ============================================
// APP — login, navegación, helpers, guardado
// ============================================

let currentUser = null; // { token, nombre, rol }
let currentObraData = null;
let h3Snapshot = null;   // H3 tal como está guardado en el servidor
let h3Dirty = false;     // hay cambios de compras sin guardar
let currentHito = 'h1';
let saveTimer = null;
let MAESTRO = null; // tipos, materiales, perifericos, escaladores, reductores — Maestro de Precios (H3.js/H4.js lo usan)

// Trae el Maestro de Precios visible para el rol actual. Colocador no ve H3,
// así que no necesita nada acá. Se llama al loguearse y cada vez que
// Gerencia guarda un cambio en el panel de administración.
async function cargarMaestro() {
  if (!currentUser || currentUser.rol === 'colocador') {
    MAESTRO = { tipos: [], materiales: [], perifericos: [], escaladores: [], reductores: [] };
    return;
  }
  try {
    const res = await API.getMaestro(currentUser.token);
    MAESTRO = res.ok ? res : { tipos: [], materiales: [], perifericos: [], escaladores: [], reductores: [] };
  } catch (err) {
    MAESTRO = { tipos: [], materiales: [], perifericos: [], escaladores: [], reductores: [] };
  }
}

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
  // H4/H5/fotos no usan autosave (H4 guarda al elegir segmento, H5/fotos al subir archivo).
  // H3 tampoco: la lista de compras se guarda EXPLÍCITAMENTE con el botón
  // "Guardar cambios" + comentario, y dispara mail con el diff y el PDF.
  if (currentHito === 'h3' || currentHito === 'h4' || currentHito === 'h5' || currentHito === 'fotos') return;
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
    await cargarMaestro();
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
    ${currentUser.rol === 'gerencia' ? `<span class="btn-ghost" style="margin-left:8px;" onclick="abrirAdminMaestro()">⚙ Precios y Materiales</span>` : ''}
    <span class="btn-ghost" style="margin-left:8px;" onclick="cerrarSesion()">Salir</span>
  `;
}

async function initApp() {
  const savedToken = localStorage.getItem('kokkai_token');
  if (!savedToken) { renderLogin(); return; }
  const res = await API.login(savedToken);
  if (res.ok) {
    currentUser = { token: savedToken, nombre: res.nombre, rol: res.rol };
    await cargarMaestro();
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
  if (h3Dirty && !confirm('Tenés cambios SIN GUARDAR en H3 · Compras. Si salís se descartan. ¿Salir igual?')) return;
  h3Dirty = false;
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
      <div class="archive-toggle" id="archiveToggle" onclick="toggleColapsable('archivadasList','archiveToggle')">
        <span class="arrow">▸</span> Obras archivadas / terminadas (${archivadas.length})
      </div>
      <div class="archivadas-list" id="archivadasList" style="display:none;">
        ${archivadas.length === 0 ? '<div class="small-note" style="padding:10px 0;">Todavía no hay obras marcadas como terminadas. Se marcan desde la solapa H5 dentro de cada obra.</div>' : archivadas.map(renderObraCard).join('')}
      </div>
    `;

    if (currentUser.rol !== 'colocador') {
      let eliminadas = [];
      try {
        const resDel = await API.listEliminadas(currentUser.token);
        if (resDel.ok) eliminadas = resDel.obras.sort((a, b) => new Date(b.fechaActualizacion) - new Date(a.fechaActualizacion));
      } catch (e) { /* si falla, mostramos la sección vacía */ }
      html += `
        <div class="archive-toggle" id="trashToggle" onclick="toggleColapsable('trashList','trashToggle')">
          <span class="arrow">▸</span> 🗑 Obras eliminadas (${eliminadas.length})
        </div>
        <div class="archivadas-list" id="trashList" style="display:none;">
          ${eliminadas.length === 0 ? '<div class="small-note" style="padding:10px 0;">No hay obras eliminadas.</div>' : eliminadas.map(renderObraEliminadaCard).join('')}
        </div>
      `;
    }

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
        <div class="nombre">${escapeHtml(o.cliente)} ${o.codigo ? `<span style="font-family:var(--font-mono); font-size:11px; color:var(--paper-dim);">· ${escapeHtml(o.codigo)}</span>` : ''}</div>
        <div class="sub">Actualizado ${formatDate(o.fechaActualizacion)}</div>
        ${renderProgresoDots(o.progreso)}
      </div>
      <div class="estado-pill estado-${o.estado}">${estadoLabel(o.estado)}</div>
    </div>
  `;
}

function renderObraEliminadaCard(o) {
  return `
    <div class="obra-card" style="cursor:default;">
      <div>
        <div class="nombre">${escapeHtml(o.cliente)} ${o.codigo ? `<span style="font-family:var(--font-mono); font-size:11px; color:var(--paper-dim);">· ${escapeHtml(o.codigo)}</span>` : ''}</div>
        <div class="sub">Eliminada · actualizado ${formatDate(o.fechaActualizacion)}</div>
      </div>
      <div style="display:flex; gap:8px; align-items:center; flex-wrap:wrap;">
        <button type="button" class="btn-secondary" onclick="restaurarObraId('${o.obraId}','${escapeAttr(o.cliente)}')">Restaurar</button>
        ${currentUser.rol === 'gerencia' ? `<button type="button" class="btn-primary" style="background:var(--danger);" onclick="eliminarPermanenteObraId('${o.obraId}','${escapeAttr(o.cliente)}')">Eliminar definitivamente</button>` : ''}
      </div>
    </div>
  `;
}

function toggleColapsable(listId, toggleId) {
  const list = document.getElementById(listId);
  const toggle = document.getElementById(toggleId);
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
  h3Snapshot = JSON.stringify(res.obra.h3 || null);
  h3Dirty = false;
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
    h3Snapshot = JSON.stringify(res.obra.h3 || null);
    h3Dirty = false;
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
      <div style="display:flex; align-items:center; gap:12px; flex-wrap:wrap; margin-top:2px;">
        <div class="estado-pill estado-${o.estado}">${estadoLabel(o.estado)}</div>
        ${o.codigo ? `<span class="sub" style="font-family:var(--font-mono);">${escapeHtml(o.codigo)}</span>` : ''}
        ${currentUser.rol !== 'colocador' ? `<span class="btn-ghost no-print" onclick="eliminarObraActual()">🗑 Eliminar obra</span>` : ''}
      </div>
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
  if (hito === 'h3' || hito === 'h4' || hito === 'h5' || hito === 'fotos') return; // h3 se guarda con guardarH3ConComentario(); h4/h5/fotos se guardan solos
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

// ---- Papelera de obras ----
async function eliminarObraActual() {
  if (!currentObraData) return;
  if (!confirm('¿Eliminar la obra "' + currentObraData.cliente + '"? Pasará a Obras eliminadas. Gerencia puede restaurarla o borrarla definitivamente desde ahí.')) return;
  const res = await API.deleteObra(currentObraData.obraId, currentUser.token);
  if (res.ok) {
    await goHome();
  } else {
    alert('Error al eliminar: ' + res.error);
  }
}

async function restaurarObraId(obraId, nombre) {
  if (!confirm('¿Restaurar la obra "' + nombre + '"? Volverá a Obras activas.')) return;
  const res = await API.restaurarObra(obraId, currentUser.token);
  if (res.ok) {
    renderHome();
  } else {
    alert('Error al restaurar: ' + res.error);
  }
}

async function eliminarPermanenteObraId(obraId, nombre) {
  if (!confirm('⚠ Esto borra "' + nombre + '" PARA SIEMPRE, incluidos sus archivos en Drive. No se puede deshacer. ¿Continuar?')) return;
  if (!confirm('Confirmá una vez más: ¿eliminar definitivamente "' + nombre + '"?')) return;
  const res = await API.eliminarPermanente(obraId, currentUser.token);
  if (res.ok) {
    renderHome();
  } else {
    alert('Error: ' + res.error);
  }
}

// ---- init ----
initApp();


// ---- Guardado explícito de H3 (lista de compras) con comentario ----
// El backend calcula el diff contra lo guardado, registra el comentario,
// manda el mail a Nicolás/Sandra (+Franco si guarda otro) y, si cambió la
// lista de compras, adjunta el PDF con lo agregado marcado.
async function guardarH3ConComentario(comentario) {
  if (!currentObraData) return { ok: false, error: 'Sin obra' };
  const data = collectH3();
  currentObraData.h3 = data;
  setSaveStatus('Guardando y notificando...', '');
  try {
    const res = await API.saveHito(currentObraData.obraId, 'h3', data, 'compras_validadas', currentUser.token, comentario);
    if (res.ok) {
      h3Snapshot = JSON.stringify(data);
      h3Dirty = false;
      currentObraData.estado = 'compras_validadas';
      setSaveStatus('✓ Guardado y notificado ' + new Date().toLocaleTimeString('es-AR', {hour:'2-digit', minute:'2-digit'}), 'ok');
    } else {
      setSaveStatus('Error al guardar: ' + res.error, 'error');
    }
    return res;
  } catch (err) {
    setSaveStatus('Error de conexión', 'error');
    return { ok: false, error: 'conexión' };
  }
}
