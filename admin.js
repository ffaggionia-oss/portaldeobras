// ============================================
// ⚙ PRECIOS Y MATERIALES — panel de administración del Maestro de Precios
// Sólo Gerencia. Acá se editan tipos de colocación, materiales, periféricos,
// escaladores, reductores y segmentos de margen SIN tocar código ni GitHub.
// Cada tabla se guarda por separado; nunca se borra una fila del Sheet: se
// desactiva (checkbox "Activo"), así las obras viejas que la referencian no
// se rompen. Las filas nuevas (sin ID todavía) sí se pueden quitar antes de
// guardarlas.
//
// v4: la unidad es un desplegable (para que no convivan "mt/l", "ML" y
// "metro lineal" como cosas distintas) y los tipos de colocación muestran
// la JUSTIFICACIÓN del precio: costo del equipo por día ÷ rendimiento
// (m²/día) = precio sugerido por m². El precio que rige sigue siendo el
// que vos cargues en "Costo USD/m²".
// ============================================

let ADMIN_MAESTRO = null;
let ADMIN_PARAMS = null;

// Opciones del desplegable de unidad. Si hace falta una nueva, se agrega acá.
const UNIDADES_OPCIONES = [
  'Mt²', 'Mt/L', 'M³', 'Unidades', 'Pares', 'Kg', 'Lts', 'Bolsa', 'Caja',
  'Juego', 'Rollo', 'Viaje', 'Pomo', 'Total', 'Tanque 400 lt'
];

const ADMIN_TABLAS = [
  { tabla: 'tipos', titulo: 'Tipos de colocación (mano de obra)', columnas: [
      { key: 'tipo', label: 'Tipo', type: 'text' },
      { key: 'rendimiento', label: 'Rendimiento (m²/día)', type: 'number', step: '0.1' },
      { key: 'costoMt2', label: 'Costo USD/m²', type: 'number' }
    ]},
  { tabla: 'materiales', titulo: 'Materiales', columnas: [
      { key: 'categoria', label: 'Categoría', type: 'text' },
      { key: 'insumo', label: 'Insumo', type: 'text' },
      { key: 'proveedor', label: 'Proveedor', type: 'text' },
      { key: 'calculo', label: 'Cálculo', type: 'text' },
      { key: 'unMt2', label: 'Un/Mt²', type: 'number' },
      { key: 'unidad', label: 'Unidad', type: 'select', options: UNIDADES_OPCIONES },
      { key: 'costoUn', label: 'Costo x Un (USD)', type: 'number' }
    ]},
  { tabla: 'perifericos', titulo: 'Periféricos y servicios', columnas: [
      { key: 'insumo', label: 'Insumo', type: 'text' },
      { key: 'proveedor', label: 'Proveedor', type: 'text' },
      { key: 'unidad', label: 'Unidad', type: 'select', options: UNIDADES_OPCIONES },
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
    ADMIN_PARAMS = res.parametros || { costoEquipoDia: 300, equipoDescripcion: '1 capataz + 2 oficiales' };
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
  recalcularSugeridos();
}

// ---- Bloque de justificación de mano de obra (arriba de la tabla Tipos) ----
function bloqueParametrosHtml_() {
  const p = ADMIN_PARAMS || {};
  return `
    <div style="background:rgba(0,0,0,0.03); border:1px solid rgba(0,0,0,0.08); border-radius:8px; padding:14px; margin-bottom:14px;">
      <div style="font-weight:600; margin-bottom:8px;">Justificación del precio de mano de obra</div>
      <div style="display:flex; gap:14px; flex-wrap:wrap; align-items:flex-end;">
        <div>
          <div class="small-note">Costo del equipo por día (USD)</div>
          <input type="number" id="param_costoEquipoDia" value="${escapeAttr(p.costoEquipoDia !== undefined ? p.costoEquipoDia : 300)}"
            oninput="recalcularSugeridos()" style="width:140px;">
        </div>
        <div style="flex:1; min-width:220px;">
          <div class="small-note">Composición del equipo</div>
          <input type="text" id="param_equipoDescripcion" value="${escapeAttr(p.equipoDescripcion || '1 capataz + 2 oficiales')}" style="width:100%;">
        </div>
        <button type="button" class="btn-primary" onclick="guardarParametrosAdmin()">Guardar parámetros</button>
      </div>
      <div class="small-note" id="adm_status_parametros" style="margin-top:8px;"></div>
      <div class="small-note" style="margin-top:8px;">
        El <b>precio sugerido</b> de cada tipo = costo del equipo por día ÷ rendimiento (m²/día).
        Ejemplo: USD 300/día ÷ 15 m²/día = USD 20/m². El botón "Usar" copia el sugerido al costo;
        el precio que rige siempre es el de la columna "Costo USD/m²".
      </div>
    </div>
  `;
}

async function guardarParametrosAdmin() {
  const status = document.getElementById('adm_status_parametros');
  status.textContent = 'Guardando...';
  const costoEquipoDia = parseFloat(document.getElementById('param_costoEquipoDia').value) || 0;
  const equipoDescripcion = document.getElementById('param_equipoDescripcion').value;
  try {
    const res = await API.saveParametros(costoEquipoDia, equipoDescripcion, currentUser.token);
    if (res.ok) {
      ADMIN_PARAMS = res.parametros;
      status.textContent = '✓ Guardado ' + new Date().toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
      recalcularSugeridos();
    } else {
      status.textContent = 'Error al guardar: ' + res.error;
    }
  } catch (err) {
    status.textContent = 'Error de conexión al guardar';
  }
}

// Recalcula el sugerido de cada fila de tipos con lo que hay tipeado ahora
// (sin necesidad de guardar): costoEquipoDia / rendimiento.
function recalcularSugeridos() {
  const items = (ADMIN_MAESTRO && ADMIN_MAESTRO.tipos) || [];
  const costoEquipoEl = document.getElementById('param_costoEquipoDia');
  const costoEquipo = costoEquipoEl ? (parseFloat(costoEquipoEl.value) || 0) : 0;
  items.forEach((it, i) => {
    const rendEl = document.getElementById(`adm_tipos_rendimiento_${i}`);
    const span = document.getElementById(`adm_tipos_sugerido_${i}`);
    if (!span) return;
    const rend = rendEl ? (parseFloat(rendEl.value) || 0) : 0;
    if (costoEquipo > 0 && rend > 0) {
      const sugerido = costoEquipo / rend;
      span.textContent = 'USD ' + (Math.round(sugerido * 100) / 100).toFixed(2);
      span.setAttribute('data-sugerido', sugerido);
    } else {
      span.textContent = '—';
      span.removeAttribute('data-sugerido');
    }
  });
}

function usarSugerido(i) {
  const span = document.getElementById(`adm_tipos_sugerido_${i}`);
  const input = document.getElementById(`adm_tipos_costoMt2_${i}`);
  if (!span || !input) return;
  const val = parseFloat(span.getAttribute('data-sugerido'));
  if (!isNaN(val)) input.value = Math.round(val * 100) / 100;
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

function inputCeldaAdmin_(def, c, i, valor) {
  const id = `adm_${def.tabla}_${c.key}_${i}`;
  if (c.type === 'select') {
    // Si el valor actual no está en la lista (dato viejo), se agrega como
    // opción para no perderlo al guardar.
    const actual = valor !== undefined && valor !== null ? String(valor) : '';
    const opciones = c.options.slice();
    if (actual && opciones.indexOf(actual) === -1) opciones.unshift(actual);
    const opts = ['<option value=""></option>'].concat(
      opciones.map(o => `<option value="${escapeAttr(o)}" ${o === actual ? 'selected' : ''}>${escapeHtml(o)}</option>`)
    ).join('');
    return `<select id="${id}" style="width:100%; min-width:100px;">${opts}</select>`;
  }
  const oninput = (def.tabla === 'tipos' && c.key === 'rendimiento') ? 'oninput="recalcularSugeridos()"' : '';
  return `<input type="${c.type}" ${c.type === 'number' ? `step="${c.step || 'any'}"` : ''} ${oninput}
    id="${id}" value="${escapeAttr(valor !== undefined ? valor : '')}" style="width:100%; min-width:90px;">`;
}

function renderTablaAdmin(def) {
  const items = (ADMIN_MAESTRO && ADMIN_MAESTRO[def.tabla]) || [];
  const esTipos = def.tabla === 'tipos';

  const rows = items.map((it, i) => `
    <tr style="${it.activo === false ? 'opacity:0.5;' : ''}">
      ${def.columnas.map(c => `<td>${inputCeldaAdmin_(def, c, i, it[c.key])}</td>`).join('')}
      ${esTipos ? `<td style="text-align:center; white-space:nowrap;">
        <span id="adm_tipos_sugerido_${i}" class="small-note">—</span>
        <button type="button" class="btn-ghost" onclick="usarSugerido(${i})" title="Copiar el sugerido al costo">Usar</button>
      </td>` : ''}
      <td style="text-align:center;"><input type="checkbox" id="adm_${def.tabla}_activo_${i}" ${it.activo === false ? '' : 'checked'}></td>
      <td style="text-align:center; white-space:nowrap;">
        ${it.id
          ? `<span class="small-note">${escapeHtml(it.id)}</span>`
          : `<button type="button" class="btn-ghost" onclick="quitarFilaAdmin('${def.tabla}', ${i})">Quitar</button>`}
      </td>
    </tr>
  `).join('');

  const colCount = def.columnas.length + (esTipos ? 3 : 2);

  return `
    <div class="section">
      <div class="section-title">${escapeHtml(def.titulo)}</div>
      ${esTipos ? bloqueParametrosHtml_() : ''}
      <table class="calc-table">
        <thead><tr>${def.columnas.map(c => `<th>${escapeHtml(c.label)}</th>`).join('')}${esTipos ? '<th>Sugerido</th>' : ''}<th>Activo</th><th>ID</th></tr></thead>
        <tbody id="tabla_${def.tabla}">${rows || `<tr><td colspan="${colCount}" class="small-note">Sin ítems todavía.</td></tr>`}</tbody>
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
  // También conservar lo tipeado en los parámetros de mano de obra
  const ce = document.getElementById('param_costoEquipoDia');
  const ed = document.getElementById('param_equipoDescripcion');
  if (ce && ADMIN_PARAMS) ADMIN_PARAMS.costoEquipoDia = parseFloat(ce.value) || 0;
  if (ed && ADMIN_PARAMS) ADMIN_PARAMS.equipoDescripcion = ed.value;
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
