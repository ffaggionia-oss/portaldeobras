// ============================================
// ⚙ PRECIOS Y MATERIALES — panel de administración del Maestro de Precios
// Sólo Gerencia. Acá se editan tipos de colocación, materiales, periféricos,
// escaladores, reductores y segmentos de margen SIN tocar código ni GitHub.
// Cada tabla se guarda por separado; nunca se borra una fila del Sheet: se
// desactiva (checkbox "Activo"), así las obras viejas que la referencian no
// se rompen. Las filas nuevas (sin ID todavía) sí se pueden quitar antes de
// guardarlas.
// ============================================

let ADMIN_MAESTRO = null;

const ADMIN_TABLAS = [
  { tabla: 'tipos', titulo: 'Tipos de colocación (mano de obra)', columnas: [
      { key: 'tipo', label: 'Tipo', type: 'text' },
      { key: 'costoMt2', label: 'Costo USD/m²', type: 'number' }
    ]},
  { tabla: 'materiales', titulo: 'Materiales', columnas: [
      { key: 'categoria', label: 'Categoría', type: 'text' },
      { key: 'insumo', label: 'Insumo', type: 'text' },
      { key: 'proveedor', label: 'Proveedor', type: 'text' },
      { key: 'calculo', label: 'Cálculo', type: 'text' },
      { key: 'unMt2', label: 'Un/Mt²', type: 'number' },
      { key: 'unidad', label: 'Unidad', type: 'text' },
      { key: 'costoUn', label: 'Costo x Un (USD)', type: 'number' }
    ]},
  { tabla: 'perifericos', titulo: 'Periféricos y servicios', columnas: [
      { key: 'insumo', label: 'Insumo', type: 'text' },
      { key: 'proveedor', label: 'Proveedor', type: 'text' },
      { key: 'unidad', label: 'Unidad', type: 'text' },
      { key: 'costoUn', label: 'Costo x Un (USD)', type: 'number' }
    ]},
  { tabla: 'escaladores', titulo: 'Escaladores de dificultad (% ampliación sobre mano de obra, tope 40% acumulado)', columnas: [
      { key: 'condicion', label: 'Condición', type: 'text' },
      { key: 'pct', label: '% en decimal (ej: 0.12 = 12%)', type: 'number', step: '0.01' }
    ]},
  { tabla: 'reductores', titulo: 'Reductores por volumen (% negativo sobre mano de obra)', columnas: [
      { key: 'condicion', label: 'Condición', type: 'text' },
      { key: 'pct', label: '% en decimal (ej: -0.10 = -10%)', type: 'number', step: '0.01' }
    ]},
  { tabla: 'segmentos', titulo: '⚠ Segmentos de margen (define el precio a cliente) — información sensible', columnas: [
      { key: 'nombre', label: 'Segmento', type: 'text' },
      { key: 'margen', label: 'Margen en decimal (ej: 0.45 = 45%)', type: 'number', step: '0.01' }
    ]}
];

function abrirAdminMaestro() {
  if (currentUser.rol !== 'gerencia') return;
  currentObraData = null;
  location.hash = 'admin';
  renderAdminMaestro();
}

async function renderAdminMaestro() {
  const app = document.getElementById('app');
  if (!currentUser || currentUser.rol !== 'gerencia') { renderHome(); return; }
  app.innerHTML = `
    <div class="list-header">
      <h1>⚙ Precios y Materiales</h1>
      <span class="btn-ghost" onclick="goHome()">← Volver a Obras</span>
    </div>
    <div id="adminContent"><div class="empty-state">Cargando...</div></div>
  `;
  try {
    const res = await API.getMaestroAdmin(currentUser.token);
    if (!res.ok) throw new Error(res.error || 'Error al cargar');
    ADMIN_MAESTRO = res.maestro;
    renderAdminContent();
  } catch (err) {
    document.getElementById('adminContent').innerHTML = `<div class="empty-state"><div class="big">No se pudo cargar</div><p>${escapeHtml(err.message)}</p></div>`;
  }
}

function renderAdminContent() {
  const html = ADMIN_TABLAS.map(def => renderTablaAdmin(def)).join('');
  document.getElementById('adminContent').innerHTML = `
    <div class="small-note" style="margin-bottom:14px;">
      Los cambios acá impactan obras nuevas y obras que todavía no llegaron a H3 (costos) o H4 (financiero).
      Las obras que ya tenían un costo o margen guardado no se recalculan solas — quedan con el valor histórico.
    </div>
    ${html}
  `;
  ADMIN_TABLAS.forEach(def => cargarLogsMaestro(def.tabla));
}

async function cargarLogsMaestro(tabla) {
  const el = document.getElementById(`adm_logs_${tabla}`);
  if (!el) return;
  el.textContent = 'Cargando historial...';
  try {
    const res = await API.getLogsMaestro(tabla, currentUser.token);
    if (!res.ok) { el.textContent = 'No se pudo cargar el historial.'; return; }
    if (!res.logs || res.logs.length === 0) {
      el.innerHTML = 'Todavía no hay cambios registrados en esta tabla.';
      return;
    }
    el.innerHTML = res.logs.map(l => `<div>${escapeHtml(l.accion)} — ${escapeHtml(l.usuario)} · ${formatDate(l.fecha)}</div>`).join('');
  } catch (err) {
    el.textContent = 'Error de conexión al cargar el historial.';
  }
}

function renderTablaAdmin(def) {
  const items = (ADMIN_MAESTRO && ADMIN_MAESTRO[def.tabla]) || [];
  const rows = items.map((it, i) => `
    <tr style="${it.activo === false ? 'opacity:0.5;' : ''}">
      ${def.columnas.map(c => `
        <td><input type="${c.type}" ${c.type === 'number' ? `step="${c.step || 'any'}"` : ''}
          id="adm_${def.tabla}_${c.key}_${i}"
          value="${escapeAttr(it[c.key] !== undefined ? it[c.key] : '')}" style="width:100%; min-width:90px;"></td>
      `).join('')}
      <td style="text-align:center;"><input type="checkbox" id="adm_${def.tabla}_activo_${i}" ${it.activo === false ? '' : 'checked'}></td>
      <td style="text-align:center; white-space:nowrap;">
        ${it.id
          ? `<span class="small-note">${escapeHtml(it.id)}</span>`
          : `<button type="button" class="btn-ghost" onclick="quitarFilaAdmin('${def.tabla}', ${i})">Quitar</button>`}
      </td>
    </tr>
  `).join('');

  return `
    <div class="section">
      <div class="section-title">${escapeHtml(def.titulo)}</div>
      <table class="calc-table">
        <thead><tr>${def.columnas.map(c => `<th>${escapeHtml(c.label)}</th>`).join('')}<th>Activo</th><th>ID</th></tr></thead>
        <tbody id="tabla_${def.tabla}">${rows || `<tr><td colspan="${def.columnas.length + 2}" class="small-note">Sin ítems todavía.</td></tr>`}</tbody>
      </table>
      <div style="display:flex; gap:10px; margin-top:12px; flex-wrap:wrap;">
        <button type="button" class="add-row-btn" onclick="agregarFilaAdmin('${def.tabla}')">+ Agregar</button>
        <button type="button" class="btn-primary" onclick="guardarTablaAdmin('${def.tabla}')">Guardar cambios</button>
      </div>
      <div class="small-note" id="adm_status_${def.tabla}" style="margin-top:8px;"></div>
      <div class="small-note" style="margin-top:14px; font-weight:600; text-transform:uppercase; letter-spacing:0.5px;">Últimos cambios</div>
      <div id="adm_logs_${def.tabla}" class="small-note" style="margin-top:6px;">Cargando...</div>
    </div>
  `;
}

function recolectarFilaDesdeDom_(def, i, base) {
  const obj = Object.assign({}, base);
  def.columnas.forEach(c => {
    const el = document.getElementById(`adm_${def.tabla}_${c.key}_${i}`);
    if (!el) return;
    obj[c.key] = c.type === 'number' ? (parseFloat(el.value) || 0) : el.value;
  });
  const activoEl = document.getElementById(`adm_${def.tabla}_activo_${i}`);
  obj.activo = activoEl ? activoEl.checked : true;
  return obj;
}

// Antes de re-renderizar (agregar/quitar fila), guarda en memoria lo que el
// usuario ya tipeó en los inputs de esa tabla, para no perderlo.
function guardarEdicionEnMemoria_(tabla) {
  const def = ADMIN_TABLAS.find(d => d.tabla === tabla);
  if (!def || !ADMIN_MAESTRO) return;
  ADMIN_MAESTRO[tabla] = (ADMIN_MAESTRO[tabla] || []).map((it, i) => recolectarFilaDesdeDom_(def, i, it));
}

function agregarFilaAdmin(tabla) {
  guardarEdicionEnMemoria_(tabla);
  if (!ADMIN_MAESTRO[tabla]) ADMIN_MAESTRO[tabla] = [];
  ADMIN_MAESTRO[tabla].push({ activo: true });
  renderAdminContent();
}

function quitarFilaAdmin(tabla, i) {
  guardarEdicionEnMemoria_(tabla);
  ADMIN_MAESTRO[tabla].splice(i, 1);
  renderAdminContent();
}

async function guardarTablaAdmin(tabla) {
  guardarEdicionEnMemoria_(tabla);
  const status = document.getElementById(`adm_status_${tabla}`);
  status.textContent = 'Guardando...';
  try {
    const res = await API.saveMaestro(tabla, ADMIN_MAESTRO[tabla] || [], currentUser.token);
    if (res.ok) {
      ADMIN_MAESTRO[tabla] = res.items;
      await cargarMaestro(); // refresca el caché global que usan H3/H4/calculadora
      status.textContent = '✓ Guardado ' + new Date().toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
      renderAdminContent();
    } else {
      status.textContent = 'Error al guardar: ' + res.error;
    }
  } catch (err) {
    status.textContent = 'Error de conexión al guardar';
  }
}
