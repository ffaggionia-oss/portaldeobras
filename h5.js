// ============================================
// H5 — REMITO FINAL
// Subida de archivos (remito firmado, comprobantes de entrega, etc).
// Acceso: Compras/Admin, Project Manager, Gerencia. No Colocadores.
// ============================================

function renderH5(obra) {
  const archivos = obra.h5 || [];
  const facturas = obra.facturas || [];
  const totalFact = facturas.reduce((s, f) => s + (f.monto || 0), 0);
  return `
    <div class="section">
      <div class="section-title">Facturas de compra</div>
      <div class="small-note">Cargá acá cada factura real de la obra (materiales, periféricos, servicios). El archivo va a la carpeta <b>facturas</b> del Drive de la obra y los montos alimentan el traqueo final de Gerencia.</div>
      <div class="field" style="margin-top:10px;"><label>Proveedor</label><input type="text" id="fact_prov" placeholder="Ej: Rothoblaas"></div>
      <div class="field"><label>Concepto</label><input type="text" id="fact_conc" placeholder="Ej: tornillería 5x40"></div>
      <div class="field"><label>Monto (USD)</label><input type="number" id="fact_monto" min="0" step="0.01" placeholder="0.00"></div>
      <div class="field"><label>Archivo de la factura (PDF o foto — opcional)</label><input type="file" id="fact_file"></div>
      <button type="button" class="btn" onclick="subirFactura()">＋ Cargar factura</button>
      <div class="small-note" id="fact_status" style="margin-top:8px;"></div>
    </div>

    <div class="section">
      <div class="section-title">Facturas cargadas ${facturas.length ? '· total <span style="color:var(--rust-bright);">USD ' + totalFact.toFixed(2) + '</span>' : ''}</div>
      ${facturas.length === 0 ? '<div class="small-note">Todavía no hay facturas cargadas para esta obra.</div>' : `
      <table class="calc-table">
        <thead><tr><th>Fecha</th><th>Proveedor</th><th>Concepto</th><th>Monto</th><th>Archivo</th><th>Cargó</th><th></th></tr></thead>
        <tbody>
          ${facturas.map(f => `
            <tr>
              <td>${formatDate(f.fecha)}</td>
              <td>${escapeHtml(f.proveedor||'')}</td>
              <td>${escapeHtml(f.concepto||'')}</td>
              <td class="num">USD ${(f.monto||0).toFixed(2)}</td>
              <td>${f.url ? '<a href="'+escapeAttr(f.url)+'" target="_blank" style="color:var(--rust-bright);">ver</a>' : '—'}</td>
              <td>${escapeHtml(f.usuario||'')}</td>
              <td><button type="button" class="btn-ghost" onclick="borrarFactura('${escapeAttr(f.id)}')">Eliminar</button></td>
            </tr>
          `).join('')}
          <tr class="total-row"><td colspan="3">TOTAL COMPRAS REALES</td><td class="num">USD ${totalFact.toFixed(2)}</td><td colspan="3"></td></tr>
        </tbody>
      </table>`}
    </div>

    <div class="section">
      <div class="section-title">Subir remito</div>
      <div class="field">
        <label>Archivo (PDF, foto, etc.)</label>
        <input type="file" id="h5_fileInput" onchange="subirArchivoH5()">
      </div>
      <div class="small-note" id="h5_uploadStatus" style="margin-top:8px;"></div>
    </div>

    <div class="section">
      <div class="section-title">Archivos cargados</div>
      ${archivos.length === 0 ? '<div class="small-note">Todavía no hay remitos cargados para esta obra.</div>' : `
      <table class="calc-table">
        <thead><tr><th>Archivo</th><th>Subido por</th><th>Fecha</th><th></th></tr></thead>
        <tbody>
          ${archivos.map(f => `
            <tr>
              <td><a href="${escapeAttr(f.url)}" target="_blank" style="color:var(--rust-bright);">${escapeHtml(f.name)}</a></td>
              <td>${escapeHtml(f.uploadedBy||'')}</td>
              <td>${formatDate(f.uploadedAt)}</td>
              <td><button type="button" class="btn-ghost" onclick="borrarArchivoH5('${escapeAttr(f.url)}')">Eliminar</button></td>
            </tr>
          `).join('')}
        </tbody>
      </table>`}
    </div>

    <div class="section" style="border-color: ${obra.estado === 'cerrada' ? 'var(--ok)' : 'var(--line)'};">
      <div class="section-title">Estado final de la obra</div>
      <div class="check-row">
        <input type="checkbox" id="h5_finalizada" ${obra.estado === 'cerrada' ? 'checked' : ''} onchange="toggleObraFinalizada(this.checked)">
        <div class="check-label">
          <div class="check-text">Marcar esta obra como <strong>Terminada</strong></div>
          <div class="check-note small-note">Al marcarla, la obra pasa a "Obras archivadas" en la pantalla principal. Se puede desmarcar para reabrirla si hace falta.</div>
        </div>
      </div>
    </div>
  `;
}

function subirArchivoH5() {
  const input = document.getElementById('h5_fileInput');
  const file = input.files[0];
  if (!file) return;
  const status = document.getElementById('h5_uploadStatus');
  status.textContent = 'Subiendo ' + file.name + '...';

  const reader = new FileReader();
  reader.onload = async () => {
    const base64Data = reader.result.split(',')[1];
    const res = await API.uploadFile(currentObraData.obraId, 'h5', file.name, file.type || 'application/octet-stream', base64Data, currentUser.token);
    if (res.ok) {
      await reloadObra();
    } else {
      status.textContent = 'Error al subir: ' + res.error;
    }
  };
  reader.onerror = () => { status.textContent = 'Error al leer el archivo'; };
  reader.readAsDataURL(file);
}

async function borrarArchivoH5(url) {
  if (!confirm('¿Eliminar este archivo?')) return;
  const res = await API.deleteFile(currentObraData.obraId, 'h5', url, currentUser.token);
  if (res.ok) {
    await reloadObra();
  } else {
    alert('Error al eliminar: ' + res.error);
  }
}

// ---- Facturas de compra ----
async function subirFactura() {
  const prov = document.getElementById('fact_prov').value.trim();
  const conc = document.getElementById('fact_conc').value.trim();
  const monto = parseFloat(document.getElementById('fact_monto').value);
  const input = document.getElementById('fact_file');
  const status = document.getElementById('fact_status');
  if (isNaN(monto) || monto <= 0) { status.textContent = 'Cargá el monto de la factura.'; return; }
  const file = input.files[0] || null;

  const enviar = async (filename, mimeType, base64Data) => {
    status.textContent = 'Cargando factura...';
    const res = await API.facturaSubir(currentObraData.obraId, prov, conc, monto, filename, mimeType, base64Data, currentUser.token);
    if (res.ok) { await reloadObra(); }
    else { status.textContent = 'Error: ' + res.error; }
  };

  if (!file) { enviar(null, null, null); return; }
  const reader = new FileReader();
  reader.onload = () => enviar(file.name, file.type || 'application/octet-stream', reader.result.split(',')[1]);
  reader.onerror = () => { status.textContent = 'Error al leer el archivo'; };
  reader.readAsDataURL(file);
}

async function borrarFactura(id) {
  if (!confirm('¿Eliminar esta factura? (también se mueve a la papelera del Drive)')) return;
  const res = await API.facturaBorrar(id, currentUser.token);
  if (res.ok) { await reloadObra(); }
  else { alert('Error al eliminar: ' + res.error); }
}
