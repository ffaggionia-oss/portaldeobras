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
 */

const SHEET_NAME = 'Obras';
const USERS_SHEET_NAME = 'Usuarios';
const LOGS_SHEET_NAME = 'Logs';
const HEADERS = ['obraId', 'cliente', 'estado', 'fechaCreacion', 'fechaActualizacion', 'h1_json', 'h2_json', 'h3_json', 'h4_json', 'h5_json', 'fotos_json', 'eliminada', 'codigo'];
const COL = { obraId:1, cliente:2, estado:3, fechaCreacion:4, fechaActualizacion:5, h1:6, h2:7, h3:8, h4:9, h5:10, fotos:11, eliminada:12, codigo:13 };
const DRIVE_ROOT_FOLDER_NAME = 'Kokkai Obras - Archivos';

// ---- Tablas usadas SOLO server-side para el cálculo financiero (H4) ----
// No se exponen nunca al frontend en texto plano; sólo se devuelve el resultado calculado.
const H3_TIPOS_COLOCACION = [
  { tipo:'Imprimación de Muro Previo', costoMt2:5 },
  { tipo:'Colocación de Revestimiento', costoMt2:20 },
  { tipo:'Colocación de Decks Sobre Carpeta Directa', costoMt2:20 },
  { tipo:'Colocación de Decks + Estructura Galv./Madera', costoMt2:38 },
  { tipo:'Remoción Deck Existente', costoMt2:5 },
  { tipo:'Remoción Piso Existente', costoMt2:9 },
  { tipo:'Colocación Piso Pegado + Zócalos', costoMt2:16 },
  { tipo:'Colocación Piso Flotante + Zócalos', costoMt2:14 }
];

const H3_SEGMENTOS = [
  { nombre:'PREMIUM +', margen:0.50 },
  { nombre:'PREMIUM', margen:0.45 },
  { nombre:'MEDIUM', margen:0.40 },
  { nombre:'MÍNIMO', margen:0.35 },
  { nombre:'MUY MÍNIMO', margen:0.30 }
];

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

// ---- Logs de impresión / descarga por obra + hito ----
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
// Cálculo financiero (H4) — vive sólo acá
// ============================================
function h3CostoCalc_(d) {
  d = d || {};
  const mt2 = parseFloat(d.mt2) || 0;

  let costoMateriales = 0;
  (d.materiales || []).forEach(m => { if (m.incluye) costoMateriales += (parseFloat(m.unMt2) || 0) * (parseFloat(m.costoUn) || 0); });

  let costoPerifericos = 0;
  (d.perifericos || []).forEach(p => { if (p.incluye && mt2 > 0) costoPerifericos += ((parseFloat(p.costoUn) || 0) * (parseFloat(p.cantidad) || 0)) / mt2; });

  const tipo = H3_TIPOS_COLOCACION[d.tipoColocacionIdx] || H3_TIPOS_COLOCACION[0];
  const moBase = tipo.costoMt2;

  let totalAmpliacion = 0;
  (d.escaladores || []).forEach(e => { if (e.aplica) totalAmpliacion += e.pct; });
  totalAmpliacion = Math.min(totalAmpliacion, 0.40);

  let totalReduccion = 0;
  (d.reductores || []).forEach(r => { if (r.aplica) totalReduccion += r.pct; });

  const moAjustada = moBase * (1 + totalAmpliacion + totalReduccion);

  const fiscalPct = typeof d.fiscalPct === 'number' ? d.fiscalPct : 0.15;
  const fiscalMinimo = typeof d.fiscalMinimo === 'number' ? d.fiscalMinimo : 300;
  const fiscalCalculadoTotal = moAjustada * mt2 * fiscalPct;
  const fiscalTotal = d.fiscalIncluido ? Math.max(fiscalCalculadoTotal, fiscalMinimo) : 0;
  const fiscalMt2 = mt2 > 0 ? fiscalTotal / mt2 : 0;

  const costoTotalMt2 = costoMateriales + costoPerifericos + moAjustada + fiscalMt2;

  return {
    mt2, costoMateriales, costoPerifericos, moAjustada, fiscalMt2, fiscalTotal, costoTotalMt2,
    totalMateriales: costoMateriales * mt2, totalPerifericos: costoPerifericos * mt2, totalColocadores: moAjustada * mt2
  };
}

function financiero_(h3data, h4data) {
  const costos = h3CostoCalc_(h3data);
  const segmentoActivo = (h4data && typeof h4data.segmentoActivo === 'number') ? h4data.segmentoActivo : 2;

  const segmentos = H3_SEGMENTOS.map(s => {
    const precioMt2 = s.margen < 1 ? costos.costoTotalMt2 / (1 - s.margen) : 0;
    return { nombre: s.nombre, margen: s.margen, precioMt2, totalObra: precioMt2 * costos.mt2 };
  });

  const seg = segmentos[segmentoActivo] || segmentos[2];
  const rentabilidadMt2 = seg.precioMt2 - costos.costoTotalMt2;
  const rentabilidadTotal = rentabilidadMt2 * costos.mt2;

  return Object.assign({}, costos, {
    segmentos, segmentoActivo, precioFinalMt2: seg.precioMt2, totalObra: seg.totalObra,
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

    const user = getUsuario_(e.parameter.token);
    if (!user) return jsonResponse_({ ok: false, error: 'No autorizado' });
    const sheet = getSheet_();

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
// Ambas son seguras de correr más de una vez: si no hay nada para
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
    const nuevoIdx = H3_TIPOS_COLOCACION.findIndex(t => t.tipo === nombre);
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
