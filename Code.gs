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
const HEADERS = ['obraId', 'cliente', 'estado', 'fechaCreacion', 'fechaActualizacion', 'h1_json', 'h2_json', 'h3_json', 'h4_json', 'h5_json', 'fotos_json'];
const COL = { obraId:1, cliente:2, estado:3, fechaCreacion:4, fechaActualizacion:5, h1:6, h2:7, h3:8, h4:9, h5:10, fotos:11 };
const DRIVE_ROOT_FOLDER_NAME = 'Kokkai Obras - Archivos';

// ---- Tablas usadas SOLO server-side para el cálculo financiero (H4) ----
// No se exponen nunca al frontend en texto plano; sólo se devuelve el resultado calculado.
const H3_TIPOS_COLOCACION = [
  { tipo:'Imprimación de Muro Previo', costoMt2:5 },
  { tipo:'Colocación de Revestimiento', costoMt2:20 },
  { tipo:'Colocación de Decks Sobre Carpeta Directa', costoMt2:20 },
  { tipo:'Colocación de Decks + Estructura Galv./Madera', costoMt2:37.5 },
  { tipo:'Remoción Piso Existente', costoMt2:9.09 },
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

function findRow_(sheet, obraId) {
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === obraId) return { rowIndex: i + 1, row: data[i] };
  }
  return null;
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
    rentabilidadMt2, rentabilidadTotal
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
      const rows = data.slice(1).filter(r => r[0]);
      const obras = rows.map(r => ({
        obraId: r[COL.obraId - 1], cliente: r[COL.cliente - 1], estado: r[COL.estado - 1],
        fechaCreacion: r[COL.fechaCreacion - 1], fechaActualizacion: r[COL.fechaActualizacion - 1]
      }));
      return jsonResponse_({ ok: true, obras, rol: user.rol, nombre: user.nombre });
    }

    if (action === 'get') {
      const found = findRow_(sheet, e.parameter.obraId);
      if (!found) return jsonResponse_({ ok: false, error: 'Obra no encontrada' });
      const row = found.row;
      const obra = {
        obraId: row[COL.obraId - 1], cliente: row[COL.cliente - 1], estado: row[COL.estado - 1],
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
      sheet.appendRow([finalId, cliente, 'diagnostico', now, now, '', '', '', '', '', '']);
      return jsonResponse_({ ok: true, obraId: finalId });
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

    return jsonResponse_({ ok: false, error: 'Acción desconocida' });
  } catch (err) {
    return jsonResponse_({ ok: false, error: err.toString() });
  }
}
