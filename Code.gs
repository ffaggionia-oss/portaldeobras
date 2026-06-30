/**
 * KOKKAI OBRAS — Backend (Google Apps Script)
 *
 * INSTALACIÓN:
 * 1. Creá un Google Sheet nuevo (vacío), llamalo "Kokkai - Obras DB"
 * 2. Extensiones → Apps Script
 * 3. Borrá el contenido de Code.gs y pegá este archivo completo
 * 4. Implementar → Nueva implementación → Tipo: Aplicación web
 *    - Ejecutar como: Yo (tu cuenta)
 *    - Quién tiene acceso: Cualquier usuario
 * 5. Copiá la URL que te da ("Web app URL") y pegala en CONFIG.API_URL del HTML
 * 6. Cada vez que edites este script, tenés que hacer "Nueva implementación" de nuevo
 *    (o "Administrar implementaciones" → editar → nueva versión) para que los cambios se vean.
 */

const SHEET_NAME = 'Obras';
const HEADERS = ['obraId', 'cliente', 'estado', 'fechaCreacion', 'fechaActualizacion', 'h1_json', 'h2_json', 'h3_json'];

function getSheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
    sheet.appendRow(HEADERS);
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

function doGet(e) {
  try {
    const action = e.parameter.action || 'list';
    const sheet = getSheet_();

    if (action === 'list') {
      const data = sheet.getDataRange().getValues();
      const rows = data.slice(1).filter(r => r[0]); // skip header, skip empty rows
      const obras = rows.map(r => ({
        obraId: r[0],
        cliente: r[1],
        estado: r[2],
        fechaCreacion: r[3],
        fechaActualizacion: r[4]
      }));
      return jsonResponse_({ ok: true, obras });
    }

    if (action === 'get') {
      const obraId = e.parameter.obraId;
      const data = sheet.getDataRange().getValues();
      const row = data.find((r, i) => i > 0 && r[0] === obraId);
      if (!row) return jsonResponse_({ ok: false, error: 'Obra no encontrada' });
      return jsonResponse_({
        ok: true,
        obra: {
          obraId: row[0],
          cliente: row[1],
          estado: row[2],
          fechaCreacion: row[3],
          fechaActualizacion: row[4],
          h1: row[5] ? JSON.parse(row[5]) : null,
          h2: row[6] ? JSON.parse(row[6]) : null,
          h3: row[7] ? JSON.parse(row[7]) : null
        }
      });
    }

    return jsonResponse_({ ok: false, error: 'Acción desconocida' });
  } catch (err) {
    return jsonResponse_({ ok: false, error: err.toString() });
  }
}

function doPost(e) {
  try {
    const body = JSON.parse(e.postData.contents);
    const action = body.action;
    const sheet = getSheet_();

    if (action === 'create') {
      const cliente = body.cliente;
      if (!cliente) return jsonResponse_({ ok: false, error: 'Falta cliente' });
      let obraId = slugify_(cliente);
      const data = sheet.getDataRange().getValues();
      const existingIds = data.slice(1).map(r => r[0]);
      let suffix = 1;
      let finalId = obraId;
      while (existingIds.indexOf(finalId) !== -1) {
        suffix++;
        finalId = obraId + '-' + suffix;
      }
      const now = new Date().toISOString();
      sheet.appendRow([finalId, cliente, 'diagnostico', now, now, '', '', '']);
      return jsonResponse_({ ok: true, obraId: finalId });
    }

    if (action === 'save') {
      const obraId = body.obraId;
      const hito = body.hito; // 'h1' | 'h2' | 'h3'
      const payload = body.data;
      const estado = body.estado; // optional estado override

      const data = sheet.getDataRange().getValues();
      let rowIndex = -1;
      for (let i = 1; i < data.length; i++) {
        if (data[i][0] === obraId) { rowIndex = i + 1; break; }
      }
      if (rowIndex === -1) return jsonResponse_({ ok: false, error: 'Obra no encontrada' });

      const colMap = { h1: 6, h2: 7, h3: 8 };
      const col = colMap[hito];
      if (!col) return jsonResponse_({ ok: false, error: 'Hito inválido' });

      sheet.getRange(rowIndex, col).setValue(JSON.stringify(payload));
      sheet.getRange(rowIndex, 5).setValue(new Date().toISOString());
      if (estado) sheet.getRange(rowIndex, 3).setValue(estado);

      return jsonResponse_({ ok: true });
    }

    if (action === 'updateEstado') {
      const obraId = body.obraId;
      const estado = body.estado;
      const data = sheet.getDataRange().getValues();
      let rowIndex = -1;
      for (let i = 1; i < data.length; i++) {
        if (data[i][0] === obraId) { rowIndex = i + 1; break; }
      }
      if (rowIndex === -1) return jsonResponse_({ ok: false, error: 'Obra no encontrada' });
      sheet.getRange(rowIndex, 3).setValue(estado);
      sheet.getRange(rowIndex, 5).setValue(new Date().toISOString());
      return jsonResponse_({ ok: true });
    }

    return jsonResponse_({ ok: false, error: 'Acción desconocida' });
  } catch (err) {
    return jsonResponse_({ ok: false, error: err.toString() });
  }
}
