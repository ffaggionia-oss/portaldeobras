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
    <div class="section">
      <div class="section-title">🔄 Actualizar desde tu Excel maestro</div>
      <div class="small-note">El Excel manda: editás la hoja de materiales y mano de obra directo en Google Sheets — nada de subir/bajar archivos ni tocar el portal para dar de alta o quitar un producto. "Leer del Excel en vivo" trae los datos actuales de esa hoja (cache de hasta 10 min; "Forzar relectura" lo salta). Compara contra el Maestro: agrega los ítems que falten, actualiza consumos y precios de los que ya existen, y te muestra el detalle ANTES de guardar nada. Los ítems que están en el Maestro pero no en el Excel no se tocan — solo se listan para que los revises.</div>
      <div style="margin-top:10px; display:flex; gap:10px; align-items:center; flex-wrap:wrap;">
        <button type="button" class="btn-primary" onclick="leerPlanillaH3EnVivo_(false)">🔄 Leer del Excel en vivo</button>
        <button type="button" class="btn-ghost" onclick="leerPlanillaH3EnVivo_(true)">Forzar relectura (saltea el cache)</button>
        <button type="button" class="btn-primary" onclick="previsualizarSyncPlanilla()">Comparar Maestro vs Excel</button>
      </div>
      <div class="small-note" id="sync_planilla_status" style="margin-top:8px;">${PLANILLA_META ? '✓ ' + (PLANILLA_META.origen === 'vivo' ? 'Leído en vivo de la hoja "' + escapeHtml(PLANILLA_META.hoja) + '"' : 'Último archivo leído: ' + escapeHtml(PLANILLA_META.archivo)) + ' (' + PLANILLA_META.leidoEn.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' }) + ')' : 'Todavía no leíste el Excel en esta sesión.'}</div>
      <details style="margin-top:10px;">
        <summary style="cursor:pointer; font-size:12px; color:var(--muted, #888);">O subir el .xlsx a mano (por si no podés acceder al Google Sheet)</summary>
        <div style="margin-top:8px; display:flex; gap:10px; align-items:center; flex-wrap:wrap;">
          <input type="file" id="sync_planilla_file" accept=".xlsx,.xls" onchange="manejarArchivoExcelPlanilla_(this)">
        </div>
      </details>
      <div id="sync_planilla_out" style="margin-top:10px;"></div>
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
  // Ancho según el contenido de la columna: el nombre del insumo necesita
  // espacio para leerse completo; los números no.
  const ANCHOS = { insumo: 280, tipo: 260, condicion: 240, nombre: 180, proveedor: 170, calculo: 140, categoria: 120 };
  const minw = c.type === 'number' ? 80 : (ANCHOS[c.key] || 120);
  const v = valor !== undefined ? valor : '';
  return `<input type="${c.type}" ${c.type === 'number' ? `step="${c.step || 'any'}"` : ''} ${oninput}
    id="${id}" value="${escapeAttr(v)}" title="${escapeAttr(v)}" style="width:100%; min-width:${minw}px;">`;
}

const ADM_CATS_ABIERTAS = {};

function filaAdminHtml_(def, it, i, esTipos, sinCategoria) {
  const cols = sinCategoria ? def.columnas.filter(c => c.key !== 'categoria') : def.columnas;
  return `
    <tr style="${it.activo === false ? 'opacity:0.5;' : ''}">
      ${cols.map(c => `<td>${inputCeldaAdmin_(def, c, i, it[c.key])}</td>`).join('')}
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
    </tr>`;
}

// Materiales: agrupados por categoría en pestañas plegables. El resto de las
// tablas (más cortas) siguen como tabla simple.
function cuerpoMaterialesAgrupado_(def) {
  const items = (ADMIN_MAESTRO && ADMIN_MAESTRO[def.tabla]) || [];
  const cats = [];
  const porCat = {};
  items.forEach((it, i) => {
    const c = it.categoria || '— Sin categoría (completar) —';
    if (!porCat[c]) { porCat[c] = []; cats.push(c); }
    porCat[c].push({ it, i });
  });
  // El grupo 'Sin categoría' (filas nuevas) va primero, como dice la ayuda.
  cats.sort((a, b) => (a.indexOf('Sin categoría') !== -1 ? -1 : (b.indexOf('Sin categoría') !== -1 ? 1 : 0)));
  // OJO: dentro de un grupo la columna Categoría se sigue mostrando (angosta)
  // para poder mover un ítem de grupo editándola.
  const thead = `<thead><tr>${def.columnas.map(c => `<th>${escapeHtml(c.label)}</th>`).join('')}<th>Activo</th><th>ID</th></tr></thead>`;
  return cats.map(cat => {
    const arr = porCat[cat];
    const inactivos = arr.filter(x => x.it.activo === false).length;
    const esNueva = cat.indexOf('Sin categoría') !== -1;
    const abierta = esNueva ? true : (typeof ADM_CATS_ABIERTAS[cat] === 'boolean' ? ADM_CATS_ABIERTAS[cat] : false);
    return `
    <details ${abierta ? 'open' : ''} ontoggle="ADM_CATS_ABIERTAS['${escapeAttr(cat)}']=this.open" style="border:1px solid var(--line,#555); border-radius:8px; margin-bottom:10px; padding:0 10px;">
      <summary style="cursor:pointer; padding:12px 4px; font-weight:700; font-size:14px; list-style-position:inside;">
        ${escapeHtml(cat)} <span class="small-note" style="font-weight:400; margin-left:8px;">${arr.length} ítem${arr.length === 1 ? '' : 's'}${inactivos ? ' · ' + inactivos + ' inactivo' + (inactivos === 1 ? '' : 's') : ''}</span>
      </summary>
      <div style="overflow-x:auto;">
      <table class="calc-table" style="margin-bottom:10px;">
        ${thead}
        <tbody>${arr.map(x => filaAdminHtml_(def, x.it, x.i, false, false)).join('')}</tbody>
      </table>
      </div>
    </details>`;
  }).join('') || `<div class="small-note">Sin ítems todavía.</div>`;
}

function renderTablaAdmin(def) {
  const items = (ADMIN_MAESTRO && ADMIN_MAESTRO[def.tabla]) || [];
  const esTipos = def.tabla === 'tipos';

  if (def.tabla === 'materiales') {
    return `
    <div class="section">
      <div class="section-title">${escapeHtml(def.titulo)} <span class="small-note" style="font-weight:400;">— por categoría: abrí la que necesites</span></div>
      ${cuerpoMaterialesAgrupado_(def)}
      <div style="display:flex; gap:10px; margin-top:12px; flex-wrap:wrap;">
        <button type="button" class="add-row-btn" onclick="agregarFilaAdmin('${def.tabla}')">+ Agregar</button>
        <button type="button" class="btn-primary" onclick="guardarTablaAdmin('${def.tabla}')">Guardar cambios</button>
      </div>
      <div class="small-note" style="margin-top:6px;">Al agregar, la fila nueva aparece arriba en "Sin categoría": completale la categoría y al guardar se acomoda en su grupo.</div>
      <div class="small-note" id="adm_status_${def.tabla}" style="margin-top:8px;"></div>
      <div class="small-note" style="margin-top:14px; font-weight:600; text-transform:uppercase; letter-spacing:0.5px;">Últimos cambios</div>
      <div id="adm_logs_${def.tabla}" class="small-note" style="margin-top:6px;">Cargando...</div>
    </div>`;
  }

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
  status.textContent = 'Guardando…';
  let msg;
  try {
    const res = await API.saveMaestro(tabla, ADMIN_MAESTRO[tabla] || [], currentUser.token);
    if (res.ok) {
      ADMIN_MAESTRO[tabla] = res.items;
      // El refresco del caché global (H3/H4/calculadora) corre en segundo
      // plano: no hace falta esperarlo para confirmar el guardado.
      try { cargarMaestro().catch(() => {}); } catch (e) {}
      renderAdminContent();
      msg = '✓ Guardado ' + new Date().toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
    } else {
      msg = '⚠ Error al guardar: ' + (res.error || '');
    }
  } catch (err) {
    msg = '⚠ Error de conexión al guardar — los cambios NO se aplicaron, probá de nuevo';
  }
  // El re-dibujado recrea el elemento de estado vacío: el mensaje se escribe
  // DESPUÉS, así la confirmación (o el error) queda a la vista.
  const st2 = document.getElementById(`adm_status_${tabla}`);
  if (st2) st2.textContent = msg;
}


// ============================================
// 🔄 ACTUALIZAR DESDE EL EXCEL MAESTRO (H3)
// Antes esta sección tenía los datos de la planilla pegados a mano acá
// (SYNC_PLANILLA), y había que editar código cada vez que cambiaba el Excel.
// Ahora Gerencia sube el .xlsx del "Calculador de Instalaciones" directo en
// el panel: se lee en el navegador con SheetJS (hoja "CALCULO"), se arma el
// mismo plan de comparación de siempre, y se aplica con un click.
// Regla: el Excel manda en consumos (Un/Mt²) y precios; el Maestro conserva
// sus IDs (las obras viejas no se rompen). Lo que falta se agrega, lo que
// sobra en el Maestro NO se borra: solo se informa.
// ============================================

let PLANILLA_ACTUAL = null; // { tipos, materiales, perifericos, escaladores, reductores, segmentos }
let PLANILLA_META = null;   // { origen: 'vivo'|'archivo', archivo?, hoja, leidoEn }

// Lee la planilla EN VIVO desde el Google Sheet maestro (mismo patrón que
// el catálogo de madera Thermory): sin subir nada, Gerencia edita la hoja
// directo y esto trae los datos actuales. forzar=true saltea el cache de
// 10 min del servidor (action=getPlanillaH3&refresh=1).
async function leerPlanillaH3EnVivo_(forzar) {
  const status = document.getElementById('sync_planilla_status');
  const out = document.getElementById('sync_planilla_out');
  if (status) status.textContent = forzar ? 'Forzando relectura del Excel…' : 'Leyendo el Excel en vivo…';
  if (out) out.innerHTML = '';
  try {
    const res = await API.getPlanillaH3(currentUser.token, forzar);
    if (!res.ok) {
      if (status) status.textContent = '⚠ ' + (res.error || 'No pude leer la planilla en vivo.');
      return;
    }
    const datos = res.planilla || {};
    const total = (datos.tipos || []).length + (datos.materiales || []).length + (datos.perifericos || []).length +
      (datos.escaladores || []).length + (datos.reductores || []).length + (datos.segmentos || []).length;
    if (!total) {
      if (status) status.textContent = '⚠ Leí la hoja "' + (res.hoja || '') + '" pero no encontré las tablas esperadas (¿es la hoja correcta del Excel?).';
      return;
    }
    PLANILLA_ACTUAL = datos;
    PLANILLA_META = { origen: 'vivo', hoja: res.hoja || '', leidoEn: new Date() };
    if (status) {
      status.textContent = '✓ Leído en vivo de "' + (res.hoja || '') + '"' + (res.cache ? ' (cache, hasta 10 min de atraso)' : ' (recién ahora)') + ' — ' +
        datos.materiales.length + ' materiales, ' + datos.perifericos.length + ' periféricos, ' +
        datos.tipos.length + ' tipos, ' + datos.escaladores.length + ' escaladores, ' +
        datos.reductores.length + ' reductores, ' + datos.segmentos.length + ' segmentos.';
    }
    previsualizarSyncPlanilla();
  } catch (err) {
    if (status) status.textContent = '⚠ Error de conexión al leer la planilla en vivo.';
  }
}

function syncCelda_(v) { return String(v === null || v === undefined ? '' : v).trim(); }
function syncHeader_(v) { return syncCelda_(v).toUpperCase(); }
function syncNum_(v) { const n = parseFloat(v); return isNaN(n) ? 0 : n; }

// Recorre la matriz (array de filas) de la hoja "CALCULO" del Excel y arma
// el mismo formato que usaba antes SYNC_PLANILLA. Busca las tablas por el
// texto de sus encabezados, no por número de fila fijo, así aguanta que se
// agreguen/saquen filas en el Excel de una versión a otra.
function parseCalculoMatriz_(matriz) {
  const buscarFila = (matcher, desde) => {
    for (let i = desde || 0; i < matriz.length; i++) {
      if (matcher(matriz[i] || [])) return i;
    }
    return -1;
  };

  // ---- Materiales (categoría "Molduras" se separa como periférico: se
  // compran por cantidad según la obra, no por m², igual que antes) ----
  const matHeaderIdx = buscarFila(r => syncHeader_(r[0]) === 'CATEGORÍA' && syncHeader_(r[1]) === 'INSUMO');
  const materiales = [];
  const moldurasComoPerifericos = [];
  if (matHeaderIdx !== -1) {
    for (let i = matHeaderIdx + 1; i < matriz.length; i++) {
      const r = matriz[i] || [];
      if (!syncCelda_(r[0]) || syncHeader_(r[0]).indexOf('TOTAL') === 0) break;
      const categoria = syncCelda_(r[0]);
      if (categoria.toUpperCase() === 'MOLDURAS') {
        moldurasComoPerifericos.push({
          insumo: syncCelda_(r[1]), proveedor: syncCelda_(r[2]),
          unidad: syncCelda_(r[5]) || 'Unidades', costoUn: syncNum_(r[6])
        });
        continue;
      }
      materiales.push({
        categoria, insumo: syncCelda_(r[1]), proveedor: syncCelda_(r[2]), calculo: syncCelda_(r[3]),
        unMt2: syncNum_(r[4]), unidad: syncCelda_(r[5]), costoUn: syncNum_(r[6])
      });
    }
  }

  // ---- Periféricos y servicios ----
  const perHeaderIdx = buscarFila(r => syncHeader_(r[0]) === 'INSUMO' && syncHeader_(r[2]) === 'PROVEEDOR', matHeaderIdx + 1);
  const perifericos = moldurasComoPerifericos.slice();
  if (perHeaderIdx !== -1) {
    for (let i = perHeaderIdx + 1; i < matriz.length; i++) {
      const r = matriz[i] || [];
      if (!syncCelda_(r[0]) || syncHeader_(r[0]).indexOf('TOTAL') === 0) break;
      perifericos.push({ insumo: syncCelda_(r[0]), proveedor: syncCelda_(r[2]), unidad: syncCelda_(r[5]), costoUn: syncNum_(r[6]) });
    }
  }

  // ---- Tipos de colocación (mano de obra) ----
  const tipHeaderIdx = buscarFila(r => syncHeader_(r[0]) === 'TIPO DE COLOCACIÓN', (perHeaderIdx === -1 ? matHeaderIdx : perHeaderIdx) + 1);
  const tipos = [];
  if (tipHeaderIdx !== -1) {
    for (let i = tipHeaderIdx + 1; i < matriz.length; i++) {
      const r = matriz[i] || [];
      if (!syncCelda_(r[0]) || syncHeader_(r[0]).indexOf('COLOCADORES') === 0) break;
      tipos.push({ tipo: syncCelda_(r[0]), rendimiento: syncNum_(r[1]), costoMt2: syncNum_(r[3]) });
    }
  }

  // ---- Escaladores y Reductores (van en columnas paralelas, misma fila) ----
  const condHeaderIdx = buscarFila(r => syncHeader_(r[0]) === 'CONDICIÓN', tipHeaderIdx + 1);
  const escaladores = [], reductores = [];
  if (condHeaderIdx !== -1) {
    for (let i = condHeaderIdx + 1; i < matriz.length; i++) {
      const r = matriz[i] || [];
      const c0 = syncCelda_(r[0]), c4 = syncCelda_(r[4]);
      const sigueEsc = c0 && syncHeader_(c0).indexOf('TOTAL') !== 0;
      const sigueRed = c4 && syncHeader_(c4).indexOf('TOTAL') !== 0;
      if (sigueEsc) escaladores.push({ condicion: c0, pct: syncNum_(r[1]) });
      if (sigueRed) reductores.push({ condicion: c4, pct: syncNum_(r[5]) });
      if (!sigueEsc && !sigueRed) break;
    }
  }

  // ---- Segmentos de margen ----
  const segHeaderIdx = buscarFila(r => syncHeader_(r[0]) === 'SEGMENTO', condHeaderIdx + 1);
  const segmentos = [];
  if (segHeaderIdx !== -1) {
    for (let i = segHeaderIdx + 1; i < matriz.length; i++) {
      const r = matriz[i] || [];
      if (!syncCelda_(r[0])) break;
      segmentos.push({ nombre: syncCelda_(r[0]), margen: syncNum_(r[2]) });
    }
  }

  return { tipos, materiales, perifericos, escaladores, reductores, segmentos };
}

// Busca la hoja "CALCULO" (o algo parecido) dentro del Excel subido.
function hojaCalculo_(workbook) {
  const exacta = workbook.SheetNames.find(n => n.toUpperCase() === 'CALCULO');
  if (exacta) return { hoja: workbook.Sheets[exacta], nombre: exacta, exacta: true };
  const parecida = workbook.SheetNames.find(n => n.toUpperCase().indexOf('CALCULO') !== -1);
  if (parecida) return { hoja: workbook.Sheets[parecida], nombre: parecida, exacta: false };
  return { hoja: workbook.Sheets[workbook.SheetNames[0]], nombre: workbook.SheetNames[0], exacta: false };
}

// Dispara al elegir un archivo en el input. Lee el .xlsx en el navegador
// (no sube nada a ningún lado todavía) y arma PLANILLA_ACTUAL.
function manejarArchivoExcelPlanilla_(input) {
  const status = document.getElementById('sync_planilla_status');
  const out = document.getElementById('sync_planilla_out');
  const file = input.files && input.files[0];
  if (!file) return;
  if (typeof XLSX === 'undefined') {
    if (status) status.textContent = '⚠ No se pudo cargar el lector de Excel (SheetJS). Revisá tu conexión y volvé a intentar.';
    return;
  }
  if (status) status.textContent = 'Leyendo "' + file.name + '"…';
  if (out) out.innerHTML = '';
  const reader = new FileReader();
  reader.onload = function (e) {
    try {
      const wb = XLSX.read(new Uint8Array(e.target.result), { type: 'array' });
      const { hoja, nombre, exacta } = hojaCalculo_(wb);
      const matriz = XLSX.utils.sheet_to_json(hoja, { header: 1, defval: '', raw: true });
      const datos = parseCalculoMatriz_(matriz);
      const total = datos.tipos.length + datos.materiales.length + datos.perifericos.length + datos.escaladores.length + datos.reductores.length + datos.segmentos.length;
      if (total === 0) {
        if (status) status.textContent = '⚠ No encontré las tablas esperadas en la hoja "' + nombre + '". ¿Es el Excel del Calculador de Instalaciones (hoja "CALCULO")?';
        return;
      }
      PLANILLA_ACTUAL = datos;
      PLANILLA_META = { origen: 'archivo', archivo: file.name, hoja: nombre, leidoEn: new Date() };
      if (status) {
        status.textContent = '✓ "' + file.name + '"' + (exacta ? '' : ' (hoja "' + nombre + '")') + ' leído a las ' +
          PLANILLA_META.leidoEn.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' }) + ' — ' +
          datos.materiales.length + ' materiales, ' + datos.perifericos.length + ' periféricos, ' +
          datos.tipos.length + ' tipos, ' + datos.escaladores.length + ' escaladores, ' +
          datos.reductores.length + ' reductores, ' + datos.segmentos.length + ' segmentos.';
      }
      previsualizarSyncPlanilla();
    } catch (err) {
      if (status) status.textContent = '⚠ No pude leer el archivo: ' + err.message;
    }
  };
  reader.onerror = function () { if (status) status.textContent = '⚠ Error al leer el archivo.'; };
  reader.readAsArrayBuffer(file);
}

// Clave de match por tabla (para emparejar Excel ↔ Maestro sin depender de IDs)
const SYNC_KEYS = {
  tipos: it => syncNorm_(it.tipo),
  materiales: it => syncNorm_(it.categoria) + '|' + syncNorm_(it.insumo),
  perifericos: it => syncNorm_(it.insumo),
  escaladores: it => syncNorm_(it.condicion),
  reductores: it => syncNorm_(it.condicion),
  segmentos: it => syncNorm_(it.nombre)
};
// Campos que la planilla pisa al sincronizar (los IDs y "activo" no se tocan)
const SYNC_CAMPOS = {
  tipos: ['rendimiento', 'costoMt2'],
  materiales: ['proveedor', 'calculo', 'unMt2', 'unidad', 'costoUn'],
  perifericos: ['proveedor', 'unidad', 'costoUn'],
  escaladores: ['pct'],
  reductores: ['pct'],
  segmentos: ['margen']
};

function syncNorm_(s) {
  return String(s || '')
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // saca tildes
    .replace(/[—–]/g, '-')
    .replace(/[×]/g, 'x')
    .replace(/\s+/g, ' ')
    .trim();
}

// Compara y arma el plan de cambios sin tocar nada todavía
function calcularSyncPlanilla_() {
  const plan = {};
  Object.keys(SYNC_KEYS).forEach(tabla => {
    const existentes = (ADMIN_MAESTRO && ADMIN_MAESTRO[tabla]) || [];
    const porClave = {};
    existentes.forEach(it => { porClave[SYNC_KEYS[tabla](it)] = it; });
    const clavesPlanilla = {};
    const agregar = [], actualizar = [];
    ((PLANILLA_ACTUAL && PLANILLA_ACTUAL[tabla]) || []).forEach(cn => {
      const k = SYNC_KEYS[tabla](cn);
      clavesPlanilla[k] = true;
      const ex = porClave[k];
      if (!ex) { agregar.push(cn); return; }
      const difs = [];
      SYNC_CAMPOS[tabla].forEach(campo => {
        const vNuevo = cn[campo], vViejo = ex[campo];
        const esNum = typeof vNuevo === 'number';
        const igual = esNum ? (Math.abs((parseFloat(vViejo) || 0) - vNuevo) < 0.0001) : (String(vViejo || '') === String(vNuevo || ''));
        if (!igual) difs.push({ campo, de: vViejo, a: vNuevo });
      });
      if (difs.length) actualizar.push({ existente: ex, nuevo: cn, difs });
    });
    const noEnPlanilla = existentes.filter(it => !clavesPlanilla[SYNC_KEYS[tabla](it)]);
    plan[tabla] = { agregar, actualizar, noEnPlanilla };
  });
  return plan;
}

function previsualizarSyncPlanilla() {
  const out = document.getElementById('sync_planilla_out');
  if (!ADMIN_MAESTRO) { out.innerHTML = '<span class="small-note">Esperá a que cargue el Maestro y probá de nuevo.</span>'; return; }
  if (!PLANILLA_ACTUAL) { out.innerHTML = '<span class="small-note">Primero subí el Excel con el botón de arriba.</span>'; return; }
  const plan = calcularSyncPlanilla_();
  const nombres = { tipos: 'Tipos de colocación', materiales: 'Materiales', perifericos: 'Periféricos', escaladores: 'Escaladores', reductores: 'Reductores', segmentos: 'Segmentos de margen' };
  let totalCambios = 0;
  const bloques = Object.keys(plan).map(tabla => {
    const p = plan[tabla];
    totalCambios += p.agregar.length + p.actualizar.length;
    if (!p.agregar.length && !p.actualizar.length && !p.noEnPlanilla.length) return '';
    const nombreDe = it => it.insumo || it.tipo || it.condicion || it.nombre || '';
    return `
      <div style="margin-top:12px;">
        <div style="font-weight:700;">${nombres[tabla]}</div>
        ${p.agregar.length ? `<div class="small-note" style="margin-top:4px;"><b style="color:var(--ok, #1a7f37);">＋ Se agregan (${p.agregar.length}):</b><br>${p.agregar.map(it => '· ' + escapeHtml(nombreDe(it)) + (it.costoUn === 0 || it.costoMt2 === 0 ? ' <i>(precio 0 — completar)</i>' : '')).join('<br>')}</div>` : ''}
        ${p.actualizar.length ? `<div class="small-note" style="margin-top:4px;"><b style="color:var(--warn, #c77700);">✎ Se actualizan (${p.actualizar.length}):</b><br>${p.actualizar.map(u => '· ' + escapeHtml(nombreDe(u.existente)) + ' — ' + u.difs.map(df => df.campo + ': ' + escapeHtml(String(df.de === undefined || df.de === '' ? '∅' : df.de)) + ' → ' + escapeHtml(String(df.a))).join(', ')).join('<br>')}</div>` : ''}
        ${p.noEnPlanilla.length ? `<div class="small-note" style="margin-top:4px;"><b>👀 Están en el Maestro pero no en la planilla (no se tocan — revisar si son duplicados con otro nombre):</b><br>${p.noEnPlanilla.map(it => '· ' + escapeHtml(nombreDe(it)) + (it.activo === false ? ' <i>(inactivo)</i>' : '')).join('<br>')}</div>` : ''}
      </div>`;
  }).join('');

  out.innerHTML = `
    <div style="border:1px solid var(--line, #ddd);border-radius:8px;padding:12px;max-height:420px;overflow:auto;">
      ${totalCambios === 0 ? '<b style="color:var(--ok, #1a7f37);">✓ El Maestro ya está alineado con la planilla.</b>' : ''}
      ${bloques || ''}
    </div>
    ${totalCambios > 0 ? `
      <div style="display:flex;gap:10px;margin-top:10px;align-items:center;">
        <button type="button" class="btn-primary" id="btnAplicarSync" onclick="aplicarSyncPlanilla()">✓ Aplicar y guardar (${totalCambios} cambios)</button>
        <span class="small-note">Se guarda tabla por tabla y queda en el historial de cambios.</span>
      </div>` : ''}
  `;
}

async function aplicarSyncPlanilla() {
  const btn = document.getElementById('btnAplicarSync');
  if (btn) { btn.disabled = true; btn.textContent = 'Aplicando…'; }
  const plan = calcularSyncPlanilla_();
  const tablasTocadas = [];
  Object.keys(plan).forEach(tabla => {
    const p = plan[tabla];
    if (!p.agregar.length && !p.actualizar.length) return;
    tablasTocadas.push(tabla);
    // actualizar in-place (conserva id y activo)
    p.actualizar.forEach(u => { SYNC_CAMPOS[tabla].forEach(campo => { u.existente[campo] = u.nuevo[campo]; }); });
    // agregar sin id: el servidor les asigna id al guardar
    p.agregar.forEach(cn => { ADMIN_MAESTRO[tabla].push(Object.assign({ activo: true }, cn)); });
  });
  const errores = [];
  for (const tabla of tablasTocadas) {
    try {
      const res = await API.saveMaestro(tabla, ADMIN_MAESTRO[tabla] || [], currentUser.token);
      if (res.ok) { ADMIN_MAESTRO[tabla] = res.items; }
      else { errores.push(tabla + ': ' + (res.error || 'error')); }
    } catch (e) { errores.push(tabla + ': error de conexión'); }
  }
  try { cargarMaestro().catch(() => {}); } catch (e) {} // refresco del caché en segundo plano
  renderAdminContent();
  const out = document.getElementById('sync_planilla_out');
  if (out) {
    out.innerHTML = errores.length
      ? '<b style="color:#c00;">Hubo errores:</b><div class="small-note">' + errores.map(escapeHtml).join('<br>') + '</div>'
      : '<b style="color:var(--ok, #1a7f37);">✓ Maestro sincronizado con la planilla.</b> <span class="small-note">Los ítems con precio 0 quedaron marcados para completar en las tablas de abajo.</span>';
  }
}
