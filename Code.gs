/**
 * KOKKAI OBRAS — Backend (Google Apps Script)
 *
 * INSTALACIÓN:
 * 1. En el mismo Google Sheet "Kokkai - Obras DB" → Extensiones → Apps Script
 * 2. Borrá el contenido de Code.gs y pegá este archivo completo
 * 3. Implementar → Nueva implementación → Tipo: Aplicación web
 *    - Ejecutar como: Yo (tu cuenta)
 *    - Quién tiene acceso: Cualquier usuario
 * 4. Copiá la URL ("Web app URL") a CONFIG.API_URL en config.js si cambió
 * 5. Cada vez que edites este script: "Nueva implementación" (o "Administrar
 *    implementaciones" → editar → nueva versión) para que los cambios se vean.
 *
 * USUARIOS Y ROLES:
 * Se crea automáticamente una pestaña "Usuarios" en el Sheet la primera vez
 * que corre el script. Completala a mano con columnas: nombre | token | rol
 * Roles válidos: colocador | compras_admin | project_manager | gerencia
 * El "token" es simplemente una clave de acceso que vos definís para cada
 * persona (ej: "SANDRA2026"). Se la compartís por privado, no por el link
 * del sitio.
 *
 * MAESTRO DE PRECIOS (nuevo):
 * Los precios de tipos de colocación, materiales, periféricos, escaladores,
 * reductores y segmentos de margen viven en pestañas "Maestro_*" del Sheet.
 * Se crean y siembran solas la primera vez que se piden. Gerencia las edita
 * desde el panel "⚙ Precios y Materiales" del portal — no hace falta tocar
 * código para cambiar un precio o dar de alta un producto nuevo.
 * IMPORTANTE: después de instalar este Code.gs por primera vez, correr UNA
 * VEZ (a mano, desde el editor) la función migrarAMaestroV3_() para que las
 * obras que ya tenían H3/H4 cargado usen los mismos IDs del Maestro.
 */

const SHEET_NAME = 'Obras';
const USERS_SHEET_NAME = 'Usuarios';
const LOGS_SHEET_NAME = 'Logs';
const HEADERS = ['obraId', 'cliente', 'estado', 'fechaCreacion', 'fechaActualizacion', 'h1_json', 'h2_json', 'h3_json', 'h4_json', 'h5_json', 'fotos_json', 'eliminada', 'codigo'];
const COL = { obraId:1, cliente:2, estado:3, fechaCreacion:4, fechaActualizacion:5, h1:6, h2:7, h3:8, h4:9, h5:10, fotos:11, eliminada:12, codigo:13 };
const DRIVE_ROOT_FOLDER_NAME = 'Kokkai Obras - Archivos';

// ---- Roles: qué hitos puede ver/editar cada rol ----
const ROLE_ACCESS = {
  colocador:        ['h1', 'fotos'],
  compras_admin:    ['h1', 'h2', 'h3', 'h5', 'fotos'],
  project_manager:  ['h1', 'h2', 'h3', 'h5', 'fotos'],
  gerencia:         ['h1', 'h2', 'h3', 'h4', 'h5', 'fotos']
};
const ROLES_QUE_CREAN_OBRA = ['compras_admin', 'project_manager', 'gerencia'];

function puedeVer_(rol, hito) {
  return (ROLE_ACCESS[rol] || []).indexOf(hito) !== -1;
}

// ============================================
// MAESTRO DE PRECIOS
// ============================================
// Valores "semilla": SOLO se usan para poblar las pestañas Maestro_* la
// primera vez que se crean, y como respaldo si una obra vieja todavía no
// fue migrada. Una vez creado el Sheet, la fuente de verdad es el Sheet,
// no estas constantes.
const SEED_TIPOS = [
  { id:'tip01', tipo:'Imprimación de Muro Previo', costoMt2:5 },
  { id:'tip02', tipo:'Colocación de Revestimiento', costoMt2:20 },
  { id:'tip03', tipo:'Colocación de Decks Sobre Carpeta Directa', costoMt2:20 },
  { id:'tip04', tipo:'Colocación de Decks + Estructura Galv./Madera', costoMt2:38 },
  { id:'tip05', tipo:'Remoción Deck Existente', costoMt2:5 },
  { id:'tip06', tipo:'Remoción Piso Existente', costoMt2:9 },
  { id:'tip07', tipo:'Colocación Piso Pegado + Zócalos', costoMt2:16 },
  { id:'tip08', tipo:'Colocación Piso Flotante + Zócalos', costoMt2:14 }
];

const SEED_MATERIALES = [
  { id:'mat01', categoria:'Revestimientos', insumo:'Perfil PGO 37 x 0,94 mm x 6,00 mts', proveedor:'CMP / EnSeco', calculo:'', unMt2:3, unidad:'Mt/L', costoUn:2.80 },
  { id:'mat02', categoria:'Revestimientos', insumo:'Perfil PGO 22 x 0,94 mm x 3,00 mts', proveedor:'CMP / EnSeco', calculo:'', unMt2:3, unidad:'Mt/L', costoUn:2.05 },
  { id:'mat03', categoria:'Revestimientos', insumo:'Pino CCA 1x3', proveedor:'Maderera Newton', calculo:'', unMt2:3, unidad:'Mt/L', costoUn:2.00 },
  { id:'mat04', categoria:'Revestimientos', insumo:'Pino CCA 2x2', proveedor:'Maderera Newton', calculo:'', unMt2:3, unidad:'Mt/L', costoUn:2.00 },
  { id:'mat05', categoria:'Revestimientos', insumo:'Tornillo Ø8 × 70 mm + Tarugo Nylon 8 (Par)', proveedor:'Bulonera Tigre', calculo:'', unMt2:3, unidad:'Pares', costoUn:0.03 },
  { id:'mat06', categoria:'Revestimientos', insumo:'Tornillo Ø8 × 50 mm + Tarugo Nylon 8 (Par)', proveedor:'Bulonera Tigre', calculo:'', unMt2:3, unidad:'Pares', costoUn:0.03 },
  { id:'mat07', categoria:'Revestimientos', insumo:'Tornillo KKTN Negro 5x40 mm', proveedor:'Rothoblaas', calculo:'', unMt2:25, unidad:'Unidades', costoUn:0.15 },
  { id:'mat08', categoria:'Revestimientos', insumo:'Tornillo KKAN 5x40 mm', proveedor:'Rothoblaas', calculo:'', unMt2:25, unidad:'Unidades', costoUn:0.30 },
  { id:'mat09', categoria:'Revestimientos', insumo:'Tornillo SHS 3,5x30 mm', proveedor:'Rothoblaas', calculo:'', unMt2:15, unidad:'Unidades', costoUn:0.05 },
  { id:'mat10', categoria:'Revestimientos', insumo:'Grampas (cualquier tamaño)', proveedor:'Colocador', calculo:'', unMt2:0, unidad:'', costoUn:0 },
  { id:'mat11', categoria:'Decks', insumo:'PCG Galvanizado 80x40x15x1,6 mm — Viguetas', proveedor:'En Seco / Mundo Hierro / CMP', calculo:'Cada 0,40 mt', unMt2:3, unidad:'Mt/L', costoUn:3.65 },
  { id:'mat12', categoria:'Decks', insumo:'PCG Galvanizado 80x40x15x1,6 mm — Perímetro', proveedor:'En Seco / Mundo Hierro / CMP', calculo:'Perímetro/Mt²', unMt2:1.33, unidad:'Mt/L', costoUn:3.65 },
  { id:'mat13', categoria:'Decks', insumo:'PCG Galvanizado 80x40x15x1,6 mm — Patas', proveedor:'En Seco / Mundo Hierro / CMP', calculo:'3,5 patas x Mt²', unMt2:0.52, unidad:'Mt/L', costoUn:3.65 },
  { id:'mat14', categoria:'Decks', insumo:'PCG Galvanizado 80x40x15x1,6 mm — Bloqueos y desperdicio', proveedor:'En Seco / Mundo Hierro / CMP', calculo:'2 × Espacio Interno', unMt2:0.80, unidad:'Mt/L', costoUn:3.65 },
  { id:'mat15', categoria:'Decks', insumo:'Clip Thermory T4 o PC Clips', proveedor:'Thermory', calculo:'3 U. x Mt/l', unMt2:25, unidad:'Unidades', costoUn:0.30 },
  { id:'mat16', categoria:'Decks', insumo:'Tornillo P/Clip KKAN 4x30 mm', proveedor:'Rothoblaas / Bulonera', calculo:'', unMt2:25, unidad:'Unidades', costoUn:0.15 },
  { id:'mat17', categoria:'Pisos', insumo:'Manta', proveedor:'MercadoLibre', calculo:'', unMt2:1, unidad:'Mt²', costoUn:2.21 },
  { id:'mat18', categoria:'Pisos', insumo:'Nylon 200 Micrones', proveedor:'MercadoLibre', calculo:'', unMt2:1, unidad:'Mt²', costoUn:1.00 },
  { id:'mat19', categoria:'Pisos', insumo:'Pegamento Elástico Base Xilano', proveedor:'Bona / Kekol / Mapei', calculo:'1 kg/mt²', unMt2:1, unidad:'Kg', costoUn:7.50 },
  { id:'mat20', categoria:'Pisos', insumo:'Zócalo 10 cm', proveedor:'AlpaMat / Parky', calculo:'', unMt2:0.7, unidad:'Mt/l', costoUn:6.00 }
];

const SEED_PERIFERICOS = [
  { id:'per01', insumo:'Transporte a Obra', proveedor:'Gargano', unidad:'Viaje', costoUn:250 },
  { id:'per02', insumo:'Andamios — 2 cuerpos/mes + 3 tablones', proveedor:'Amaplac', unidad:'Total', costoUn:95 },
  { id:'per03', insumo:'Andamios — 3 cuerpos/mes + 3 tablones', proveedor:'Amaplac', unidad:'Total', costoUn:120 },
  { id:'per04', insumo:'Pintura Asfáltica al Agua Protex 400 Lt', proveedor:'Protex', unidad:'Tanque 400 lt', costoUn:300 },
  { id:'per05', insumo:'Volquete', proveedor:'-', unidad:'Unidad', costoUn:70 },
  { id:'per06', insumo:'Silicona PU 40', proveedor:'Unipega', unidad:'Pomo', costoUn:7 }
];

const SEED_ESCALADORES = [
  { id:'esc01', condicion:'Desarraigo', pct:0.25 },
  { id:'esc02', condicion:'Cieloraso con estructura', pct:0.12 },
  { id:'esc03', condicion:'Trabajo en Altura', pct:0.12 },
  { id:'esc04', condicion:'Acceso Difícil', pct:0.10 },
  { id:'esc05', condicion:'Trabajo Nocturno', pct:0.15 },
  { id:'esc06', condicion:'Extra Zona (3er Cordón)', pct:0.08 },
  { id:'esc07', condicion:'Diseño Complejo', pct:0.10 },
  { id:'esc08', condicion:'Obra < 20 mt²', pct:0.25 },
  { id:'esc09', condicion:'Obra < 40 mt²', pct:0.15 }
];

const SEED_REDUCTORES = [
  { id:'red01', condicion:'Obra 200–300 mt²', pct:-0.08 },
  { id:'red02', condicion:'Obra 300–500 mt²', pct:-0.10 },
  { id:'red03', condicion:'Obra 500–1000 mt²', pct:-0.125 }
];

const SEED_SEGMENTOS = [
  { id:'seg01', nombre:'PREMIUM +', margen:0.50 },
  { id:'seg02', nombre:'PREMIUM', margen:0.45 },
  { id:'seg03', nombre:'MEDIUM', margen:0.40 },
  { id:'seg04', nombre:'MÍNIMO', margen:0.35 },
  { id:'seg05', nombre:'MUY MÍNIMO', margen:0.30 }
];

const MAESTRO_DEFS = {
  tipos:       { sheetName:'Maestro_Tipos',       prefix:'tip', headers:['id','tipo','costoMt2','activo'],                                        seed: SEED_TIPOS },
  materiales:  { sheetName:'Maestro_Materiales',  prefix:'mat', headers:['id','categoria','insumo','proveedor','calculo','unMt2','unidad','costoUn','activo'], seed: SEED_MATERIALES },
  perifericos: { sheetName:'Maestro_Perifericos', prefix:'per', headers:['id','insumo','proveedor','unidad','costoUn','activo'],                   seed: SEED_PERIFERICOS },
  escaladores: { sheetName:'Maestro_Escaladores', prefix:'esc', headers:['id','condicion','pct','activo'],                                         seed: SEED_ESCALADORES },
  reductores:  { sheetName:'Maestro_Reductores',  prefix:'red', headers:['id','condicion','pct','activo'],                                         seed: SEED_REDUCTORES },
  segmentos:   { sheetName:'Maestro_Segmentos',   prefix:'seg', headers:['id','nombre','margen','activo'],                                         seed: SEED_SEGMENTOS }
};

function getMaestroSheet_(tabla) {
  const def = MAESTRO_DEFS[tabla];
  if (!def) throw new Error('Tabla de maestro inválida: ' + tabla);
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(def.sheetName);
  if (!sheet) {
    sheet = ss.insertSheet(def.sheetName);
    sheet.appendRow(def.headers);
    sheet.setFrozenRows(1);
    const filas = def.seed.map(item => def.headers.map(h => h === 'activo' ? true : (item[h] !== undefined ? item[h] : '')));
    if (filas.length) sheet.getRange(2, 1, filas.length, def.headers.length).setValues(filas);
  }
  return sheet;
}

function leerMaestroTabla_(tabla, soloActivos) {
  const def = MAESTRO_DEFS[tabla];
  const sheet = getMaestroSheet_(tabla);
  const data = sheet.getDataRange().getValues();
  const headers = def.headers;
  let rows = data.slice(1).filter(r => r[0]).map(r => {
    const obj = {};
    headers.forEach((h, i) => { obj[h] = r[i]; });
    obj.activo = obj.activo !== false;
    return obj;
  });
  if (soloActivos) rows = rows.filter(r => r.activo);
  return rows;
}

function leerMaestroCompleto_(soloActivos) {
  const out = {};
  Object.keys(MAESTRO_DEFS).forEach(tabla => { out[tabla] = leerMaestroTabla_(tabla, soloActivos); });
  return out;
}

function siguienteIdMaestro_(prefix, idsExistentes) {
  let max = 0;
  const re = new RegExp('^' + prefix + '(\\d+)$');
  idsExistentes.forEach(id => {
    const m = String(id).match(re);
    if (m) max = Math.max(max, parseInt(m[1], 10));
  });
  return prefix + String(max + 1).padStart(2, '0');
}

// Reemplaza por completo el contenido de una tabla del Maestro. A los items
// nuevos (sin id) se les asigna un id automáticamente. Nunca se borran filas
// del Sheet en sí — lo que llega en `items` reemplaza todo, así que el
// front manda siempre la tabla completa (activos + inactivos).
function escribirMaestroTabla_(tabla, items, usuario) {
  const def = MAESTRO_DEFS[tabla];
  if (!def) throw new Error('Tabla de maestro inválida: ' + tabla);
  if (!Array.isArray(items)) throw new Error('Items inválidos');

  const sheet = getMaestroSheet_(tabla);
  const idsExistentes = leerMaestroTabla_(tabla, false).map(r => r.id);

  items.forEach(it => {
    if (!it.id) {
      const nuevo = siguienteIdMaestro_(def.prefix, idsExistentes);
      it.id = nuevo;
      idsExistentes.push(nuevo);
    }
  });

  if (sheet.getLastRow() > 1) {
    sheet.getRange(2, 1, sheet.getLastRow() - 1, def.headers.length).clearContent();
  }
  const filas = items.map(it => def.headers.map(h => h === 'activo' ? (it.activo !== false) : (it[h] !== undefined ? it[h] : '')));
  if (filas.length) sheet.getRange(2, 1, filas.length, def.headers.length).setValues(filas);

  const logsSheet = getLogsSheet_();
  logsSheet.appendRow(['-', 'maestro', 'editar tabla: ' + tabla + ' (' + items.length + ' items)', usuario, new Date().toISOString()]);

  return items;
}

// ============================================
// Sheets
// ============================================
function getSheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
    sheet.appendRow(HEADERS);
    sheet.setFrozenRows(1);
  }
  const currentHeaders = sheet.getRange(1, 1, 1, sheet.getLastColumn() || 1).getValues()[0];
  if (currentHeaders.length < HEADERS.length) {
    sheet.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]);
  }
  return sheet;
}

function getUsersSheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(USERS_SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(USERS_SHEET_NAME);
    sheet.appendRow(['nombre', 'token', 'rol']);
    sheet.setFrozenRows(1);
    sheet.getRange(2, 1, 1, 3).setValues([['Ejemplo Colocador', 'CAMBIAR-ESTE-TOKEN', 'colocador']]);
  }
  return sheet;
}

function getUsuario_(token) {
  if (!token) return null;
  const sheet = getUsersSheet_();
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (data[i][1] !== '' && String(data[i][1]).trim() === String(token).trim()) {
      return { nombre: data[i][0], rol: data[i][2] };
    }
  }
  return null;
}

// ---- Logs de impresión / descarga / cambios de maestro ----
function getLogsSheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(LOGS_SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(LOGS_SHEET_NAME);
    sheet.appendRow(['obraId', 'hito', 'accion', 'usuario', 'fecha']);
    sheet.setFrozenRows(1);
  }
  return sheet;
}

function jsonResponse_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function slugify_(str) {
  return str.toString().toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

function parseArr_(val) {
  if (!val) return [];
  try { const p = JSON.parse(val); return Array.isArray(p) ? p : []; } catch (e) { return []; }
}

function completoFlag_(jsonStr) {
  if (!jsonStr) return false;
  try { const p = JSON.parse(jsonStr); return !!(p && p._completo); } catch (e) { return false; }
}

function arrCount_(jsonStr) {
  return parseArr_(jsonStr).length;
}

function findRow_(sheet, obraId) {
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === obraId) return { rowIndex: i + 1, row: data[i] };
  }
  return null;
}

// Código identificatorio corto (ej: OB-0007). Se busca el número más alto ya
// usado (incluso en filas eliminadas) para no repetir códigos aunque se
// borren obras definitivamente.
function siguienteCodigoObra_(sheet) {
  const data = sheet.getDataRange().getValues();
  let maxNum = 0;
  for (let i = 1; i < data.length; i++) {
    const cod = data[i][COL.codigo - 1];
    if (cod) {
      const m = String(cod).match(/(\d+)\s*$/);
      if (m) maxNum = Math.max(maxNum, parseInt(m[1], 10));
    }
  }
  return 'OB-' + String(maxNum + 1).padStart(4, '0');
}

// Borra (a la papelera de Drive) la carpeta de archivos de una obra. Se usa
// sólo en el borrado DEFINITIVO (Gerencia), nunca en el borrado normal.
function eliminarCarpetaObra_(obraId) {
  try {
    const root = DriveApp.getFoldersByName(DRIVE_ROOT_FOLDER_NAME);
    if (!root.hasNext()) return;
    const rootFolder = root.next();
    const obraIter = rootFolder.getFoldersByName(obraId);
    if (obraIter.hasNext()) obraIter.next().setTrashed(true);
  } catch (e) { /* si falla no bloqueamos el borrado de la fila */ }
}

// ============================================
// Cálculo financiero (H4) — vive sólo acá.
// Usa el Maestro de Precios (tipos y segmentos) en vez de constantes fijas,
// con respaldo a las SEED_* para obras viejas que todavía no fueron
// migradas a IDs del Maestro.
// ============================================
function h3CostoCalc_(d) {
  d = d || {};
  const mt2 = parseFloat(d.mt2) || 0;

  let costoMateriales = 0;
  (d.materiales || []).forEach(m => { if (m.incluye) costoMateriales += (parseFloat(m.unMt2) || 0) * (parseFloat(m.costoUn) || 0); });

  let costoPerifericos = 0;
  (d.perifericos || []).forEach(p => { if (p.incluye && mt2 > 0) costoPerifericos += ((parseFloat(p.costoUn) || 0) * (parseFloat(p.cantidad) || 0)) / mt2; });

  const tiposMaestro = leerMaestroTabla_('tipos', false);
  let tipo = d.tipoColocacionId ? tiposMaestro.find(t => t.id === d.tipoColocacionId) : null;
  if (!tipo && typeof d.tipoColocacionIdx === 'number') tipo = SEED_TIPOS[d.tipoColocacionIdx]; // obras no migradas
  if (!tipo) tipo = tiposMaestro[0] || SEED_TIPOS[0];
  const moBase = parseFloat(tipo.costoMt2) || 0;

  let totalAmpliacion = 0;
  (d.escaladores || []).forEach(e => { if (e.aplica) totalAmpliacion += parseFloat(e.pct) || 0; });
  totalAmpliacion = Math.min(totalAmpliacion, 0.40);

  let totalReduccion = 0;
  (d.reductores || []).forEach(r => { if (r.aplica) totalReduccion += parseFloat(r.pct) || 0; });

  const moAjustada = moBase * (1 + totalAmpliacion + totalReduccion);

  const fiscalPct = typeof d.fiscalPct === 'number' ? d.fiscalPct : 0.15;
  const fiscalMinimo = typeof d.fiscalMinimo === 'number' ? d.fiscalMinimo : 300;
  const fiscalCalculadoTotal = moAjustada * mt2 * fiscalPct;
  const fiscalTotal = d.fiscalIncluido ? Math.max(fiscalCalculadoTotal, fiscalMinimo) : 0;
  const fiscalMt2 = mt2 > 0 ? fiscalTotal / mt2 : 0;

  const costoTotalMt2 = costoMateriales + costoPerifericos + moAjustada + fiscalMt2;

  return {
    mt2, costoMateriales, costoPerifericos, moBase, totalAmpliacion, totalReduccion, moAjustada,
    fiscalMt2, fiscalTotal, costoTotalMt2,
    totalMateriales: costoMateriales * mt2, totalPerifericos: costoPerifericos * mt2, totalColocadores: moAjustada * mt2
  };
}

function financiero_(h3data, h4data) {
  const costos = h3CostoCalc_(h3data);

  const segmentosMaestro = leerMaestroTabla_('segmentos', true);
  const base = segmentosMaestro.length ? segmentosMaestro : SEED_SEGMENTOS;
  const segmentos = base.map(s => {
    const margen = parseFloat(s.margen) || 0;
    const precioMt2 = margen < 1 ? costos.costoTotalMt2 / (1 - margen) : 0;
    return { id: s.id, nombre: s.nombre, margen, precioMt2, totalObra: precioMt2 * costos.mt2 };
  });

  let seg = (h4data && h4data.segmentoId) ? segmentos.find(s => s.id === h4data.segmentoId) : null;
  if (!seg && h4data && typeof h4data.segmentoActivo === 'number') seg = segmentos[h4data.segmentoActivo]; // obras no migradas
  if (!seg) seg = segmentos[Math.min(2, segmentos.length - 1)] || segmentos[0];

  const rentabilidadMt2 = seg.precioMt2 - costos.costoTotalMt2;
  const rentabilidadTotal = rentabilidadMt2 * costos.mt2;

  return Object.assign({}, costos, {
    segmentos, segmentoId: seg.id, precioFinalMt2: seg.precioMt2, totalObra: seg.totalObra,
    rentabilidadMt2, rentabilidadTotal, completo: !!(h4data && h4data._completo)
  });
}

// ============================================
// Drive (H5 y Fotos)
// ============================================
function getObraFolder_(obraId, sub) {
  const root = DriveApp.getFoldersByName(DRIVE_ROOT_FOLDER_NAME);
  const rootFolder = root.hasNext() ? root.next() : DriveApp.createFolder(DRIVE_ROOT_FOLDER_NAME);
  const obraIter = rootFolder.getFoldersByName(obraId);
  const obraFolder = obraIter.hasNext() ? obraIter.next() : rootFolder.createFolder(obraId);
  const subIter = obraFolder.getFoldersByName(sub);
  return subIter.hasNext() ? subIter.next() : obraFolder.createFolder(sub);
}

function extractDriveId_(url) {
  const m = String(url).match(/[-\w]{25,}/);
  return m ? m[0] : null;
}

// ============================================
// GET
// ============================================
function doGet(e) {
  try {
    const action = e.parameter.action || 'list';

    if (action === 'login') {
      const user = getUsuario_(e.parameter.token);
      if (!user) return jsonResponse_({ ok: false, error: 'Código de acceso inválido' });
      return jsonResponse_({ ok: true, nombre: user.nombre, rol: user.rol });
    }

    // Calculadora pública: sin token, sólo tipos/escaladores/reductores.
    // No expone materiales, periféricos ni segmentos (margen).
    if (action === 'getMaestroPublico') {
      const m = leerMaestroCompleto_(true);
      return jsonResponse_({ ok: true, tipos: m.tipos, escaladores: m.escaladores, reductores: m.reductores });
    }

    const user = getUsuario_(e.parameter.token);
    if (!user) return jsonResponse_({ ok: false, error: 'No autorizado' });
    const sheet = getSheet_();

    if (action === 'getMaestro') {
      if (!puedeVer_(user.rol, 'h3')) return jsonResponse_({ ok: false, error: 'Tu rol no tiene acceso' });
      const m = leerMaestroCompleto_(true);
      return jsonResponse_({ ok: true, tipos: m.tipos, materiales: m.materiales, perifericos: m.perifericos, escaladores: m.escaladores, reductores: m.reductores });
    }

    if (action === 'getMaestroAdmin') {
      if (user.rol !== 'gerencia') return jsonResponse_({ ok: false, error: 'Sólo Gerencia puede administrar el Maestro de Precios' });
      const m = leerMaestroCompleto_(false);
      return jsonResponse_({ ok: true, maestro: m });
    }

    if (action === 'list') {
      const data = sheet.getDataRange().getValues();
      const rows = data.slice(1).filter(r => r[0] && r[COL.eliminada - 1] !== true);
      const obras = rows.map(r => ({
        obraId: r[COL.obraId - 1], cliente: r[COL.cliente - 1], estado: r[COL.estado - 1],
        codigo: r[COL.codigo - 1] || '',
        fechaCreacion: r[COL.fechaCreacion - 1], fechaActualizacion: r[COL.fechaActualizacion - 1],
        progreso: {
          h1: completoFlag_(r[COL.h1 - 1]),
          h2: completoFlag_(r[COL.h2 - 1]),
          h3: completoFlag_(r[COL.h3 - 1]),
          h4: completoFlag_(r[COL.h4 - 1]),
          h5: arrCount_(r[COL.h5 - 1]) > 0,
          fotos: arrCount_(r[COL.fotos - 1]) > 0
        }
      }));
      return jsonResponse_({ ok: true, obras, rol: user.rol, nombre: user.nombre });
    }

    if (action === 'listEliminadas') {
      if (user.rol === 'colocador') return jsonResponse_({ ok: false, error: 'No autorizado' });
      const data = sheet.getDataRange().getValues();
      const obras = data.slice(1)
        .filter(r => r[0] && r[COL.eliminada - 1] === true)
        .map(r => ({
          obraId: r[COL.obraId - 1], cliente: r[COL.cliente - 1], estado: r[COL.estado - 1],
          codigo: r[COL.codigo - 1] || '', fechaActualizacion: r[COL.fechaActualizacion - 1]
        }));
      return jsonResponse_({ ok: true, obras });
    }

    if (action === 'get') {
      const found = findRow_(sheet, e.parameter.obraId);
      if (!found) return jsonResponse_({ ok: false, error: 'Obra no encontrada' });
      const row = found.row;
      const obra = {
        obraId: row[COL.obraId - 1], cliente: row[COL.cliente - 1], estado: row[COL.estado - 1],
        codigo: row[COL.codigo - 1] || '',
        fechaCreacion: row[COL.fechaCreacion - 1], fechaActualizacion: row[COL.fechaActualizacion - 1]
      };
      const h1raw = row[COL.h1 - 1] ? JSON.parse(row[COL.h1 - 1]) : null;
      const h2raw = row[COL.h2 - 1] ? JSON.parse(row[COL.h2 - 1]) : null;
      const h3raw = row[COL.h3 - 1] ? JSON.parse(row[COL.h3 - 1]) : null;
      const h4raw = row[COL.h4 - 1] ? JSON.parse(row[COL.h4 - 1]) : null;

      if (puedeVer_(user.rol, 'h1')) obra.h1 = h1raw;
      if (puedeVer_(user.rol, 'h2')) obra.h2 = h2raw;
      if (puedeVer_(user.rol, 'h3')) obra.h3 = h3raw;
      if (puedeVer_(user.rol, 'h4')) obra.h4 = financiero_(h3raw, h4raw);
      if (puedeVer_(user.rol, 'h5')) obra.h5 = parseArr_(row[COL.h5 - 1]);
      if (puedeVer_(user.rol, 'fotos')) obra.fotos = parseArr_(row[COL.fotos - 1]);

      return jsonResponse_({ ok: true, obra, rol: user.rol, nombre: user.nombre });
    }

    if (action === 'logs') {
      const hito = e.parameter.hito;
      if (!puedeVer_(user.rol, hito)) return jsonResponse_({ ok: false, error: 'Tu rol no tiene acceso a ' + hito });
      const logsSheet = getLogsSheet_();
      const data = logsSheet.getDataRange().getValues();
      const logs = data.slice(1)
        .filter(r => r[0] === e.parameter.obraId && r[1] === hito)
        .sort((a, b) => new Date(b[4]) - new Date(a[4]))
        .slice(0, 5)
        .map(r => ({ accion: r[2], usuario: r[3], fecha: r[4] }));
      return jsonResponse_({ ok: true, logs });
    }

    // Historial de cambios del Maestro de Precios. Sólo Gerencia. Si se
    // manda `tabla`, filtra sólo los cambios de esa tabla (tipos, materiales,
    // perifericos, escaladores, reductores, segmentos); si no, trae todos.
    if (action === 'logsMaestro') {
      if (user.rol !== 'gerencia') return jsonResponse_({ ok: false, error: 'Sólo Gerencia puede ver este historial' });
      const tabla = e.parameter.tabla || '';
      const logsSheet = getLogsSheet_();
      const data = logsSheet.getDataRange().getValues();
      let logs = data.slice(1).filter(r => r[1] === 'maestro');
      if (tabla) logs = logs.filter(r => String(r[2]).indexOf('tabla: ' + tabla + ' ') !== -1);
      logs = logs
        .sort((a, b) => new Date(b[4]) - new Date(a[4]))
        .slice(0, 8)
        .map(r => ({ accion: r[2], usuario: r[3], fecha: r[4] }));
      return jsonResponse_({ ok: true, logs });
    }

    return jsonResponse_({ ok: false, error: 'Acción desconocida' });
  } catch (err) {
    return jsonResponse_({ ok: false, error: err.toString() });
  }
}

// ============================================
// POST
// ============================================
function doPost(e) {
  try {
    const body = JSON.parse(e.postData.contents);
    const action = body.action;
    const user = getUsuario_(body.token);
    if (!user) return jsonResponse_({ ok: false, error: 'No autorizado' });

    if (action === 'saveMaestro') {
      if (user.rol !== 'gerencia') return jsonResponse_({ ok: false, error: 'Sólo Gerencia puede editar el Maestro de Precios' });
      const tabla = body.tabla;
      if (!MAESTRO_DEFS[tabla]) return jsonResponse_({ ok: false, error: 'Tabla inválida' });
      const items = escribirMaestroTabla_(tabla, body.items || [], user.nombre);
      return jsonResponse_({ ok: true, items });
    }

    const sheet = getSheet_();

    if (action === 'create') {
      if (ROLES_QUE_CREAN_OBRA.indexOf(user.rol) === -1) return jsonResponse_({ ok: false, error: 'Tu rol no puede crear obras' });
      const cliente = body.cliente;
      if (!cliente) return jsonResponse_({ ok: false, error: 'Falta cliente' });
      let obraId = slugify_(cliente);
      const data = sheet.getDataRange().getValues();
      const existingIds = data.slice(1).map(r => r[0]);
      let suffix = 1;
      let finalId = obraId;
      while (existingIds.indexOf(finalId) !== -1) { suffix++; finalId = obraId + '-' + suffix; }
      const now = new Date().toISOString();
      const codigo = siguienteCodigoObra_(sheet);
      sheet.appendRow([finalId, cliente, 'diagnostico', now, now, '', '', '', '', '', '', false, codigo]);
      return jsonResponse_({ ok: true, obraId: finalId, codigo });
    }

    if (action === 'save') {
      const hito = body.hito; // h1 | h2 | h3 | h4
      if (!puedeVer_(user.rol, hito)) return jsonResponse_({ ok: false, error: 'Tu rol no tiene acceso a ' + hito });
      const found = findRow_(sheet, body.obraId);
      if (!found) return jsonResponse_({ ok: false, error: 'Obra no encontrada' });
      const col = COL[hito];
      if (!col) return jsonResponse_({ ok: false, error: 'Hito inválido' });

      sheet.getRange(found.rowIndex, col).setValue(JSON.stringify(body.data));
      sheet.getRange(found.rowIndex, COL.fechaActualizacion).setValue(new Date().toISOString());
      if (body.estado) sheet.getRange(found.rowIndex, COL.estado).setValue(body.estado);

      return jsonResponse_({ ok: true });
    }

    if (action === 'updateEstado') {
      if (user.rol === 'colocador') return jsonResponse_({ ok: false, error: 'Tu rol no puede cambiar el estado' });
      const found = findRow_(sheet, body.obraId);
      if (!found) return jsonResponse_({ ok: false, error: 'Obra no encontrada' });
      sheet.getRange(found.rowIndex, COL.estado).setValue(body.estado);
      sheet.getRange(found.rowIndex, COL.fechaActualizacion).setValue(new Date().toISOString());
      return jsonResponse_({ ok: true });
    }

    if (action === 'uploadFile') {
      const hito = body.hito; // 'h5' | 'fotos'
      if (!puedeVer_(user.rol, hito)) return jsonResponse_({ ok: false, error: 'Tu rol no tiene acceso a ' + hito });
      const found = findRow_(sheet, body.obraId);
      if (!found) return jsonResponse_({ ok: false, error: 'Obra no encontrada' });

      const blob = Utilities.newBlob(Utilities.base64Decode(body.base64Data), body.mimeType, body.filename);
      const folder = getObraFolder_(body.obraId, hito === 'h5' ? 'remitos' : 'fotos');
      const file = folder.createFile(blob);
      file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

      const meta = { name: body.filename, url: file.getUrl(), uploadedAt: new Date().toISOString(), uploadedBy: user.nombre };
      const col = COL[hito];
      const current = parseArr_(sheet.getRange(found.rowIndex, col).getValue());
      current.push(meta);
      sheet.getRange(found.rowIndex, col).setValue(JSON.stringify(current));
      sheet.getRange(found.rowIndex, COL.fechaActualizacion).setValue(new Date().toISOString());

      return jsonResponse_({ ok: true, file: meta });
    }

    if (action === 'deleteFile') {
      const hito = body.hito; // 'h5' | 'fotos'
      if (!puedeVer_(user.rol, hito)) return jsonResponse_({ ok: false, error: 'Tu rol no tiene acceso a ' + hito });
      const found = findRow_(sheet, body.obraId);
      if (!found) return jsonResponse_({ ok: false, error: 'Obra no encontrada' });
      const col = COL[hito];
      const current = parseArr_(sheet.getRange(found.rowIndex, col).getValue());
      const remaining = current.filter(f => f.url !== body.url);
      sheet.getRange(found.rowIndex, col).setValue(JSON.stringify(remaining));
      try {
        const id = extractDriveId_(body.url);
        if (id) DriveApp.getFileById(id).setTrashed(true);
      } catch (errTrash) { /* si falla el borrado en Drive, igual sacamos la referencia */ }
      return jsonResponse_({ ok: true });
    }

    if (action === 'logAccion') {
      const hito = body.hito;
      if (!puedeVer_(user.rol, hito)) return jsonResponse_({ ok: false, error: 'Tu rol no tiene acceso a ' + hito });
      const logsSheet = getLogsSheet_();
      logsSheet.appendRow([body.obraId, hito, body.accion || 'imprimir', user.nombre, new Date().toISOString()]);
      return jsonResponse_({ ok: true });
    }

    if (action === 'deleteObra') {
      if (user.rol === 'colocador') return jsonResponse_({ ok: false, error: 'Tu rol no puede eliminar obras' });
      const found = findRow_(sheet, body.obraId);
      if (!found) return jsonResponse_({ ok: false, error: 'Obra no encontrada' });
      sheet.getRange(found.rowIndex, COL.eliminada).setValue(true);
      sheet.getRange(found.rowIndex, COL.fechaActualizacion).setValue(new Date().toISOString());
      return jsonResponse_({ ok: true });
    }

    if (action === 'restaurarObra') {
      if (user.rol === 'colocador') return jsonResponse_({ ok: false, error: 'Tu rol no puede restaurar obras' });
      const found = findRow_(sheet, body.obraId);
      if (!found) return jsonResponse_({ ok: false, error: 'Obra no encontrada' });
      sheet.getRange(found.rowIndex, COL.eliminada).setValue(false);
      sheet.getRange(found.rowIndex, COL.fechaActualizacion).setValue(new Date().toISOString());
      return jsonResponse_({ ok: true });
    }

    if (action === 'eliminarPermanente') {
      if (user.rol !== 'gerencia') return jsonResponse_({ ok: false, error: 'Solo Gerencia puede eliminar definitivamente' });
      const found = findRow_(sheet, body.obraId);
      if (!found) return jsonResponse_({ ok: false, error: 'Obra no encontrada' });
      eliminarCarpetaObra_(body.obraId);
      sheet.deleteRow(found.rowIndex);
      return jsonResponse_({ ok: true });
    }

    return jsonResponse_({ ok: false, error: 'Acción desconocida' });
  } catch (err) {
    return jsonResponse_({ ok: false, error: err.toString() });
  }
}

// ============================================
// MIGRACIONES — ejecutar UNA sola vez a mano desde el editor de Apps
// Script (elegir la función en el desplegable de arriba → ▶ Ejecutar).
// Todas son seguras de correr más de una vez: si no hay nada para
// migrar, no hacen nada.
// ============================================

// Reordenamos H3_TIPOS_COLOCACION (para que coincida con el Excel madre) y
// esto puede desalinear el índice guardado en obras que ya tenían un tipo
// de colocación elegido. Esta función re-mapea esos índices por NOMBRE de
// tipo, no por posición, así que no importa el orden anterior.
function migrarTiposColocacionV2_() {
  const NOMBRES_POSIBLES = [
    'Imprimación de Muro Previo',
    'Colocación de Revestimiento',
    'Colocación de Decks Sobre Carpeta Directa',
    'Colocación de Decks + Estructura Galv./Madera',
    'Remoción Piso Existente',
    'Colocación Piso Pegado + Zócalos',
    'Colocación Piso Flotante + Zócalos',
    'Remoción Deck Existente'
  ];
  const sheet = getSheet_();
  const data = sheet.getDataRange().getValues();
  let migradas = 0;
  for (let i = 1; i < data.length; i++) {
    const h3cell = data[i][COL.h3 - 1];
    if (!h3cell) continue;
    let h3data;
    try { h3data = JSON.parse(h3cell); } catch (e) { continue; }
    if (typeof h3data.tipoColocacionIdx !== 'number') continue;
    const nombre = NOMBRES_POSIBLES[h3data.tipoColocacionIdx];
    if (!nombre) continue;
    const nuevoIdx = SEED_TIPOS.findIndex(t => t.tipo === nombre);
    if (nuevoIdx === -1 || nuevoIdx === h3data.tipoColocacionIdx) continue;
    h3data.tipoColocacionIdx = nuevoIdx;
    sheet.getRange(i + 1, COL.h3).setValue(JSON.stringify(h3data));
    migradas++;
  }
  Logger.log('Tipos de colocación migrados: ' + migradas);
}

// Le asigna un código (OB-0001, OB-0002, ...) a las obras que ya existían
// antes de agregar la columna "codigo", en orden de fecha de creación.
function asignarCodigosFaltantes_() {
  const sheet = getSheet_();
  const data = sheet.getDataRange().getValues();
  let maxNum = 0;
  const sinCodigo = [];
  for (let i = 1; i < data.length; i++) {
    if (!data[i][0]) continue;
    const cod = data[i][COL.codigo - 1];
    if (cod) {
      const m = String(cod).match(/(\d+)\s*$/);
      if (m) maxNum = Math.max(maxNum, parseInt(m[1], 10));
    } else {
      sinCodigo.push({ rowIndex: i + 1, fechaCreacion: data[i][COL.fechaCreacion - 1] });
    }
  }
  sinCodigo.sort((a, b) => new Date(a.fechaCreacion) - new Date(b.fechaCreacion));
  sinCodigo.forEach(f => {
    maxNum++;
    sheet.getRange(f.rowIndex, COL.codigo).setValue('OB-' + String(maxNum).padStart(4, '0'));
  });
  Logger.log('Códigos asignados: ' + sinCodigo.length);
}

// MIGRACIÓN AL MAESTRO DE PRECIOS (v3).
// 1) Crea y siembra las 6 pestañas Maestro_* si todavía no existen (usa las
//    listas SEED_* de más arriba, en el mismo orden que tenían hasta ahora
//    en h3.js / calculadora.js, así los IDs quedan alineados por posición).
// 2) Recorre TODAS las obras (incluidas las eliminadas) y en cada h3_json /
//    h4_json agrega los IDs correspondientes:
//    - tipoColocacionIdx (número) → tipoColocacionId (ej: 'tip03')
//    - cada material/periférico/escalador/reductor guardado → le agrega
//      `id` según su posición en las listas SEED_* (mismo orden de siempre)
//    - h4: segmentoActivo (número) → segmentoId (ej: 'seg03')
// Es seguro correrla más de una vez: si un campo ya tiene id, no lo toca.
function migrarAMaestroV3_() {
  // Fuerza la creación/siembra de las 6 pestañas si todavía no existen.
  Object.keys(MAESTRO_DEFS).forEach(tabla => getMaestroSheet_(tabla));

  const sheet = getSheet_();
  const data = sheet.getDataRange().getValues();
  let obrasH3Migradas = 0;
  let obrasH4Migradas = 0;

  for (let i = 1; i < data.length; i++) {
    if (!data[i][0]) continue;
    let rowChanged = false;

    // ---- H3 ----
    const h3cell = data[i][COL.h3 - 1];
    if (h3cell) {
      let h3data;
      try { h3data = JSON.parse(h3cell); } catch (e) { h3data = null; }
      if (h3data) {
        let h3Changed = false;

        if (!h3data.tipoColocacionId && typeof h3data.tipoColocacionIdx === 'number') {
          const seedTipo = SEED_TIPOS[h3data.tipoColocacionIdx];
          if (seedTipo) { h3data.tipoColocacionId = seedTipo.id; h3Changed = true; }
        }

        if (Array.isArray(h3data.materiales)) {
          h3data.materiales.forEach((m, idx) => {
            if (!m.id && SEED_MATERIALES[idx]) { m.id = SEED_MATERIALES[idx].id; h3Changed = true; }
          });
        }
        if (Array.isArray(h3data.perifericos)) {
          h3data.perifericos.forEach((p, idx) => {
            if (!p.id && SEED_PERIFERICOS[idx]) { p.id = SEED_PERIFERICOS[idx].id; h3Changed = true; }
          });
        }
        if (Array.isArray(h3data.escaladores)) {
          h3data.escaladores.forEach((esc, idx) => {
            if (!esc.id && SEED_ESCALADORES[idx]) { esc.id = SEED_ESCALADORES[idx].id; h3Changed = true; }
          });
        }
        if (Array.isArray(h3data.reductores)) {
          h3data.reductores.forEach((r, idx) => {
            if (!r.id && SEED_REDUCTORES[idx]) { r.id = SEED_REDUCTORES[idx].id; h3Changed = true; }
          });
        }

        if (h3Changed) {
          sheet.getRange(i + 1, COL.h3).setValue(JSON.stringify(h3data));
          rowChanged = true;
          obrasH3Migradas++;
        }
      }
    }

    // ---- H4 ----
    const h4cell = data[i][COL.h4 - 1];
    if (h4cell) {
      let h4data;
      try { h4data = JSON.parse(h4cell); } catch (e) { h4data = null; }
      if (h4data && !h4data.segmentoId && typeof h4data.segmentoActivo === 'number') {
        const seedSeg = SEED_SEGMENTOS[h4data.segmentoActivo];
        if (seedSeg) {
          h4data.segmentoId = seedSeg.id;
          sheet.getRange(i + 1, COL.h4).setValue(JSON.stringify(h4data));
          rowChanged = true;
          obrasH4Migradas++;
        }
      }
    }

    if (rowChanged) sheet.getRange(i + 1, COL.fechaActualizacion).setValue(new Date().toISOString());
  }

  Logger.log('Migración a Maestro V3 — H3 actualizados: ' + obrasH3Migradas + ' | H4 actualizados: ' + obrasH4Migradas);
}
