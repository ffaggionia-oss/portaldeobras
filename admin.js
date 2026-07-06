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
      <div class="section-title">🔄 Sincronizar con la planilla de cálculo (${SYNC_PLANILLA.version})</div>
      <div class="small-note">Compara el Maestro con la última planilla de Excel: agrega los ítems que falten, actualiza consumos y precios de los que ya existen, y te muestra el detalle ANTES de guardar nada. Los ítems que están en el Maestro pero no en la planilla no se tocan — solo se listan para que los revises.</div>
      <button type="button" class="btn-primary" style="margin-top:10px;" onclick="previsualizarSyncPlanilla()">Comparar Maestro vs planilla</button>
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


// ============================================
// 🔄 SINCRONIZACIÓN CON LA PLANILLA DE CÁLCULO
// Dataset canónico tomado de "H3 Kokkai - Calculador de Instalaciones (9).xlsx".
// Regla: la planilla manda en consumos (Un/Mt²) y precios; el Maestro
// conserva sus IDs (las obras viejas no se rompen). Lo que falta se agrega,
// lo que sobra en el Maestro NO se borra: solo se informa.
// Los ítems con costoUn 0 quedan pendientes de precio (se completan acá mismo).
// ============================================

const SYNC_PLANILLA = {
  version: 'Planilla v9 · jul 2026',
  tipos: [
    { tipo: 'Imprimación de Muro Previo', rendimiento: 60, costoMt2: 5 },
    { tipo: 'Colocación de Revestimiento', rendimiento: 15, costoMt2: 20 },
    { tipo: 'Colocación de Decks Sobre Carpeta Directa', rendimiento: 15, costoMt2: 20 },
    { tipo: 'Colocación de Decks + Estructura Galv./Madera', rendimiento: 8, costoMt2: 37.5 },
    { tipo: 'Remoción Deck Existente', rendimiento: 60, costoMt2: 5 },
    { tipo: 'Remoción Piso Existente', rendimiento: 33, costoMt2: 9.09 },
    { tipo: 'Colocación Piso Pegado + Zocalos', rendimiento: 18.75, costoMt2: 16 },
    { tipo: 'Colocación Piso Flotante + Zocalos', rendimiento: 21.43, costoMt2: 14 }
  ],
  materiales: [
    // ---- Revestimientos ----
    { categoria: 'Revestimientos', insumo: 'Perfil PGO 37 x 0,94 mm x 6,00 mts', proveedor: 'CMP / EnSeco', calculo: '', unMt2: 3, unidad: 'Mt/L', costoUn: 2.8 },
    { categoria: 'Revestimientos', insumo: 'Perfil PGO 22 x 0,94 mm x 3,00 mts', proveedor: 'CMP / EnSeco', calculo: '', unMt2: 3, unidad: 'Mt/L', costoUn: 2.05 },
    { categoria: 'Revestimientos', insumo: 'Perfil Madera Plástica 24x34x2400 mm (Alfajías)', proveedor: 'WoodPlast', calculo: '', unMt2: 3, unidad: 'Mt/L', costoUn: 1.4 },
    { categoria: 'Revestimientos', insumo: 'Pino CCA 1x3', proveedor: 'Maderera Newton / Otros / Flavio', calculo: '', unMt2: 3, unidad: 'Mt/L', costoUn: 2 },
    { categoria: 'Revestimientos', insumo: 'Pino CCA 2x2', proveedor: 'Maderera Newton / Otros / Flavio', calculo: '', unMt2: 3, unidad: 'Mt/L', costoUn: 2 },
    { categoria: 'Revestimientos', insumo: 'Pino NO CCA 1/2 x 3', proveedor: 'Maderera Newton / Otros / Flavio', calculo: '', unMt2: 3, unidad: 'Mt/L', costoUn: 2 },
    { categoria: 'Revestimientos', insumo: 'Tornillo Ø8 × 70 mm + Tarugo Nylon 8 (Par)', proveedor: 'Bulonera Tigre', calculo: '', unMt2: 3, unidad: 'Pares', costoUn: 0.03 },
    { categoria: 'Revestimientos', insumo: 'Tornillo Ø8 × 50 mm + Tarugo Nylon 8 (Par)', proveedor: 'Bulonera Tigre', calculo: '', unMt2: 3, unidad: 'Pares', costoUn: 0.03 },
    { categoria: 'Revestimientos', insumo: 'Tornillo KKTN Negro 5x40 mm (Madera-Madera)', proveedor: 'Rothoblaas', calculo: '', unMt2: 25, unidad: 'Unidades', costoUn: 0.15 },
    { categoria: 'Revestimientos', insumo: 'Tornillo KKAN 5x40 mm (Madera-Metal)', proveedor: 'Rothoblaas', calculo: '', unMt2: 25, unidad: 'Unidades', costoUn: 0.3 },
    { categoria: 'Revestimientos', insumo: 'Tornillo KKA AISI 410 5x40 mm (Acero Inoxidable)', proveedor: 'Rothoblaas', calculo: '', unMt2: 25, unidad: 'Unidades', costoUn: 0.3 },
    { categoria: 'Revestimientos', insumo: 'Tornillo KKT A4 AISI 316 5x70 mm (Solo Vanos)', proveedor: 'Rothoblaas', calculo: 'Solo vanos', unMt2: 5, unidad: 'Unidades', costoUn: 0 },
    { categoria: 'Revestimientos', insumo: 'Parker Deck 10x2 Torx Ruspert', proveedor: 'Bulonera Tigre', calculo: 'Solo vanos', unMt2: 4, unidad: 'Unidades', costoUn: 0.07 },
    { categoria: 'Revestimientos', insumo: 'Tornillo SHS 3,5x30 mm (Madera-Madera)', proveedor: 'Rothoblaas', calculo: '', unMt2: 15, unidad: 'Unidades', costoUn: 0.05 },
    { categoria: 'Revestimientos', insumo: 'Autoperforante c/Alas - Cabeza Avellanada 4x70', proveedor: 'Bulonera Tigre', calculo: '', unMt2: 15, unidad: 'Unidades', costoUn: 0.05 },
    { categoria: 'Revestimientos', insumo: 'Tornillo SBS - Autoperforante c/ Alas — Cabeza Avellanada 4,2x25 Inox', proveedor: 'Rothoblaas', calculo: '', unMt2: 15, unidad: 'Unidades', costoUn: 0.05 },
    { categoria: 'Revestimientos', insumo: 'Recuplast Techos (Pintura Imprimación Previa x Tacho)', proveedor: 'Pinturería Minuto', calculo: '', unMt2: 1, unidad: 'Kg', costoUn: 6.8 },
    { categoria: 'Revestimientos', insumo: 'Grampas (cualquier tamaño)', proveedor: 'Colocador', calculo: 'Las provee el colocador', unMt2: 0, unidad: 'Unidades', costoUn: 0 },
    { categoria: 'Revestimientos', insumo: 'Clip B1-1', proveedor: 'Thermory', calculo: '', unMt2: 18, unidad: 'Unidades', costoUn: 0.38 },
    // ---- Cielo Raso ----
    { categoria: 'Cielo Raso', insumo: 'Montante galvanizado — Cielorraso', proveedor: 'EnSeco', calculo: 'Cada 0,40 mt', unMt2: 3.25, unidad: 'Mt/L', costoUn: 0 },
    { categoria: 'Cielo Raso', insumo: 'Solera galvanizada — Cielorraso', proveedor: 'EnSeco', calculo: 'Perímetro', unMt2: 1.28, unidad: 'Mt/L', costoUn: 0 },
    { categoria: 'Cielo Raso', insumo: 'Autoperforante c/ Alas — Cabeza Tanque Galv. 1x1/2', proveedor: 'Bulonera Tigre', calculo: '', unMt2: 4, unidad: 'Unidades', costoUn: 0.05 },
    // ---- Decks ----
    { categoria: 'Decks', insumo: 'Autoperforante c/ Alas — Cabeza Hexagonal Galv. (especificar medida)', proveedor: 'Bulonera Tigre', calculo: '', unMt2: 15, unidad: 'Unidades', costoUn: 0.05 },
    { categoria: 'Decks', insumo: 'Autoperforante c/ Alas — Cabeza Tanque Galv. (especificar medida)', proveedor: 'Bulonera Tigre', calculo: '', unMt2: 15, unidad: 'Unidades', costoUn: 0.05 },
    { categoria: 'Decks', insumo: 'Fresado con Alas (Madera-Metal)', proveedor: 'Bulonera Tigre', calculo: '', unMt2: 15, unidad: 'Unidades', costoUn: 0.05 },
    { categoria: 'Decks', insumo: 'PCG Galvanizado 80x40x15x1,6 mm — Viguetas', proveedor: 'En Seco / Mundo Hierro / CMP', calculo: 'Cada 0,40 mt', unMt2: 3, unidad: 'Mt/L', costoUn: 3.65 },
    { categoria: 'Decks', insumo: 'PCG Galvanizado 80x40x15x1,6 mm — Perímetro', proveedor: 'En Seco / Mundo Hierro / CMP', calculo: 'Perímetro / Mt²', unMt2: 1.33, unidad: 'Mt/L', costoUn: 3.65 },
    { categoria: 'Decks', insumo: 'PCG Galvanizado 80x40x15x1,6 mm — Patas', proveedor: 'En Seco / Mundo Hierro / CMP', calculo: '3,5 patas x Mt² (0,15 mt)', unMt2: 0.52, unidad: 'Mt/L', costoUn: 3.65 },
    { categoria: 'Decks', insumo: 'PCG Galvanizado 80x40x15x1,6 mm — Bloqueos y desperdicio', proveedor: 'En Seco / Mundo Hierro / CMP', calculo: '2 × Espacio Interno', unMt2: 0.8, unidad: 'Mt/L', costoUn: 3.65 },
    { categoria: 'Decks', insumo: 'Sistema Rothoblaas SUPM 95-130 mm + HEAD 2', proveedor: 'Rothoblaas', calculo: '3,5 patas x Mt²', unMt2: 3.5, unidad: 'Unidades', costoUn: 6 },
    { categoria: 'Decks', insumo: 'Sistema Rothoblaas SUP CORRECT (Cuña)', proveedor: 'Rothoblaas', calculo: '3,5 patas x Mt²', unMt2: 3.5, unidad: 'Unidades', costoUn: 2.4 },
    { categoria: 'Decks', insumo: 'Aluminio 20x60x1,5 mm Barra 6 mt/L — Contrapiso', proveedor: 'Perfiles de Aluminio', calculo: 'Cada 0,40 mt', unMt2: 3, unidad: 'Mt/L', costoUn: 6 },
    { categoria: 'Decks', insumo: 'Clip Thermory T4 o PC Clips', proveedor: 'Thermory', calculo: '3 U. x Mt/l', unMt2: 25, unidad: 'Unidades', costoUn: 0.3 },
    { categoria: 'Decks', insumo: 'Tornillo P/ Clip KKAN 4x30 mm', proveedor: 'Rothoblaas / Bulonera', calculo: '', unMt2: 25, unidad: 'Unidades', costoUn: 0.15 },
    { categoria: 'Decks', insumo: 'Tornillo Sobre Madera KKA 5x40 mm', proveedor: 'Rothoblaas', calculo: '', unMt2: 25, unidad: 'Unidades', costoUn: 0.3 },
    { categoria: 'Decks', insumo: 'Tornillo Autoperforante TEL-FIX Aguja 8x3 + Tarugo SX10', proveedor: 'Ferretería Industrial / Bulonera', calculo: '', unMt2: 40, unidad: 'Unidades', costoUn: 0.17 },
    { categoria: 'Decks', insumo: 'Bulón Expansión M10 × 80 mm — Contrapiso', proveedor: 'Ferretería Industrial / Bulonera', calculo: 'Cada 1 mt — 24 U / 10 mt²', unMt2: 2.4, unidad: 'Unidades', costoUn: 0.5 },
    { categoria: 'Decks', insumo: 'Bulón Expansión M10 × 80 mm', proveedor: 'Ferretería Industrial / Bulonera', calculo: '', unMt2: 7, unidad: 'Unidades', costoUn: 0.5 },
    { categoria: 'Decks', insumo: 'Placa 100×100×5 mm acero estructural S235 (Pata)', proveedor: 'Mundo Hierro / CMP', calculo: '', unMt2: 3.5, unidad: 'Unidades', costoUn: 0.7 },
    { categoria: 'Decks', insumo: 'PADS EPDM 100×100×3 mm Shore 60', proveedor: 'Ferretería Industrial / Bulonera', calculo: '', unMt2: 1.33, unidad: 'Unidades', costoUn: 2.25 },
    { categoria: 'Decks', insumo: 'Cinta Butílica 40 mm', proveedor: 'Ferretería Industrial / Bulonera', calculo: '', unMt2: 2.5, unidad: 'Mt/L', costoUn: 0 },
    { categoria: 'Decks', insumo: 'Goma Microporosa 5x45', proveedor: 'Nautigom', calculo: '', unMt2: 0.5, unidad: 'Mt/L', costoUn: 2.6 },
    { categoria: 'Decks', insumo: 'Goma Para Galvanizado y Tabla', proveedor: 'Nautigom', calculo: '', unMt2: 1, unidad: 'Mt/L', costoUn: 0 },
    { categoria: 'Decks', insumo: 'Esquinero ángulo reforzado zincado 50 x 50 mm', proveedor: 'En Seco / Mundo Hierro / CMP', calculo: '', unMt2: 3, unidad: 'Unidades', costoUn: 0 },
    // ---- Pisos ----
    { categoria: 'Pisos', insumo: 'Manta', proveedor: 'MercadoLibre', calculo: '', unMt2: 1, unidad: 'Mt²', costoUn: 2.21 },
    { categoria: 'Pisos', insumo: 'Nylon 200 Micrones', proveedor: 'MercadoLibre', calculo: '', unMt2: 1, unidad: 'Mt²', costoUn: 1 },
    { categoria: 'Pisos', insumo: 'Primer/Sellador', proveedor: 'Bona / Kekol', calculo: '', unMt2: 1, unidad: 'Kg', costoUn: 0 },
    { categoria: 'Pisos', insumo: 'Pegamento Elástico Base Xilano (Bona 820 / Kekol 831 / Mapei)', proveedor: 'Bona / Kekol / Mapei', calculo: '1 kg/mt²', unMt2: 1, unidad: 'Kg', costoUn: 7.5 },
    { categoria: 'Pisos', insumo: 'Zócalo 10 cm', proveedor: 'AlpaMat / Parky', calculo: '', unMt2: 0.7, unidad: 'Mt/L', costoUn: 6 },
    { categoria: 'Pisos', insumo: 'Zócalo 15 cm', proveedor: 'AlpaMat / Parky', calculo: '', unMt2: 0.7, unidad: 'Mt/L', costoUn: 6 },
    { categoria: 'Pisos', insumo: 'Zócalo 7 cm Curvo', proveedor: 'AlpaMat / Parky', calculo: '', unMt2: 0.7, unidad: 'Mt/L', costoUn: 6 },
    { categoria: 'Pisos', insumo: 'Zócalo 7 cm Recto', proveedor: 'AlpaMat / Parky', calculo: '', unMt2: 0.7, unidad: 'Mt/L', costoUn: 6 }
  ],
  // Las molduras Moldumet van como periféricos: se compran por cantidad
  // según la obra (no por m²) y el precio se completa cuando lo pasen.
  perifericos: [
    { insumo: 'Transporte a Obra', proveedor: 'Gargano', unidad: 'Viaje', costoUn: 250 },
    { insumo: 'Andamios — 2 cuerpos/mes + 3 tablones', proveedor: 'Amaplac', unidad: 'Total', costoUn: 95 },
    { insumo: 'Andamios — 3 cuerpos/mes + 3 tablones', proveedor: 'Amaplac', unidad: 'Total', costoUn: 120 },
    { insumo: 'Andamios — 4 cuerpos/mes + 3 tablones', proveedor: 'Amaplac', unidad: 'Total', costoUn: 167 },
    { insumo: 'Pintura Asfáltica al Agua Protex 400 Lt', proveedor: 'Protex', unidad: 'Tanque 400 lt', costoUn: 300 },
    { insumo: 'Volquete', proveedor: '-', unidad: 'Unidades', costoUn: 70 },
    { insumo: 'Silicona PU 40', proveedor: 'Unipega', unidad: 'Pomo', costoUn: 7 },
    { insumo: 'Moldura A3070 10 mm Anodizado Dorado Mate', proveedor: 'Moldumet', unidad: 'Unidades', costoUn: 0 },
    { insumo: 'Moldura A3071 10 mm Anodizado Bronce Mate', proveedor: 'Moldumet', unidad: 'Unidades', costoUn: 0 },
    { insumo: 'Moldura A3080 10 mm Anodizado Plata Brillo', proveedor: 'Moldumet', unidad: 'Unidades', costoUn: 0 },
    { insumo: 'Moldura A3090 10 mm Anodizado Dorado Brillo', proveedor: 'Moldumet', unidad: 'Unidades', costoUn: 0 },
    { insumo: 'Moldura A2B12 12 mm Blanco', proveedor: 'Moldumet', unidad: 'Unidades', costoUn: 0 },
    { insumo: 'Moldura A3BE12 12 mm Beige', proveedor: 'Moldumet', unidad: 'Unidades', costoUn: 0 },
    { insumo: 'Moldura A3C12 12 mm Champagne', proveedor: 'Moldumet', unidad: 'Unidades', costoUn: 0 },
    { insumo: 'Moldura A3G12 12 mm Gris', proveedor: 'Moldumet', unidad: 'Unidades', costoUn: 0 },
    { insumo: 'Moldura A3M12 12 mm Marfil', proveedor: 'Moldumet', unidad: 'Unidades', costoUn: 0 },
    { insumo: 'Moldura A23N12 12 mm Negro', proveedor: 'Moldumet', unidad: 'Unidades', costoUn: 0 },
    { insumo: 'Moldura A307012 12 mm Anodizado Dorado Mate', proveedor: 'Moldumet', unidad: 'Unidades', costoUn: 0 },
    { insumo: 'Moldura A307112 12 mm Anodizado Bronce Mate', proveedor: 'Moldumet', unidad: 'Unidades', costoUn: 0 },
    { insumo: 'Moldura A308012 12 mm Anodizado Plata Brillo', proveedor: 'Moldumet', unidad: 'Unidades', costoUn: 0 },
    { insumo: 'Moldura A309012 12 mm Anodizado Dorado Brillo', proveedor: 'Moldumet', unidad: 'Unidades', costoUn: 0 }
  ],
  escaladores: [
    { condicion: 'Desarraigo', pct: 0.25 },
    { condicion: 'Cieloraso con estructura', pct: 0.12 },
    { condicion: 'Trabajo en Altura', pct: 0.12 },
    { condicion: 'Acceso Difícil', pct: 0.10 },
    { condicion: 'Trabajo Nocturno', pct: 0.15 },
    { condicion: 'Extra Zona (3er Cordón)', pct: 0.08 },
    { condicion: 'Diseño Complejo', pct: 0.10 },
    { condicion: 'Obra < 20 mt²', pct: 0.25 },
    { condicion: 'Obra < 40 mt²', pct: 0.15 }
  ],
  reductores: [
    { condicion: 'Obra 200–300 mt²', pct: -0.08 },
    { condicion: 'Obra 300–500 mt²', pct: -0.10 },
    { condicion: 'Obra 500–1000 mt²', pct: -0.125 }
  ],
  segmentos: [
    { nombre: 'PREMIUM +', margen: 0.50 },
    { nombre: 'PREMIUM', margen: 0.45 },
    { nombre: 'MEDIUM', margen: 0.40 },
    { nombre: 'MÍNIMO', margen: 0.35 },
    { nombre: 'MUY MÍNIMO', margen: 0.30 }
  ]
};

// Clave de match por tabla (para emparejar planilla ↔ Maestro sin depender de IDs)
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
    (SYNC_PLANILLA[tabla] || []).forEach(cn => {
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
  await cargarMaestro(); // refresca el caché global de H3/H4/calculadora
  renderAdminContent();
  const out = document.getElementById('sync_planilla_out');
  if (out) {
    out.innerHTML = errores.length
      ? '<b style="color:#c00;">Hubo errores:</b><div class="small-note">' + errores.map(escapeHtml).join('<br>') + '</div>'
      : '<b style="color:var(--ok, #1a7f37);">✓ Maestro sincronizado con la planilla.</b> <span class="small-note">Los ítems con precio 0 quedaron marcados para completar en las tablas de abajo.</span>';
  }
}
