// ============================================
// H5 — REMITO FINAL
// Subida de archivos (remito firmado, comprobantes de entrega, etc).
// Acceso: Compras/Admin, Project Manager, Gerencia. No Colocadores.
// ============================================

function renderH5(obra) {
  const archivos = obra.h5 || [];
  return `
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
