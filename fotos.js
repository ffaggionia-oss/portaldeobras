// ============================================
// FOTOS Y PLANOS
// No es un hito (H1..H5), es una instancia aparte. Acceso: TODOS los roles.
// ============================================

function renderFotos(obra) {
  const items = obra.fotos || [];
  return `
    <div class="section">
      <div class="section-title">Subir foto o plano</div>
      <div class="field">
        <label>Archivo (imagen o PDF). Podés seleccionar varios.</label>
        <input type="file" id="fotos_fileInput" multiple accept="image/*,application/pdf" onchange="subirFotos()">
      </div>
      <div class="small-note" id="fotos_uploadStatus" style="margin-top:8px;"></div>
    </div>

    <div class="section">
      <div class="section-title">Galería (${items.length})</div>
      ${items.length === 0 ? '<div class="small-note">Todavía no hay fotos ni planos cargados para esta obra.</div>' : `
      <div style="display:grid; grid-template-columns:repeat(auto-fill, minmax(140px,1fr)); gap:12px;">
        ${items.map(f => {
          const esImagen = /\.(jpe?g|png|gif|webp)$/i.test(f.name);
          return `
          <div style="border:1px solid var(--line); border-radius:6px; overflow:hidden; background:var(--bg);">
            <a href="${escapeAttr(f.url)}" target="_blank">
              ${esImagen
                ? `<img src="${escapeAttr(f.url)}" style="width:100%; height:110px; object-fit:cover; display:block;">`
                : `<div style="width:100%; height:110px; display:flex; align-items:center; justify-content:center; font-family:var(--font-mono); font-size:11px; color:var(--paper-dim);">📄 PDF</div>`}
            </a>
            <div style="padding:8px; font-size:12px;">
              <div style="overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${escapeHtml(f.name)}</div>
              <div class="small-note">${escapeHtml(f.uploadedBy||'')} · ${formatDate(f.uploadedAt)}</div>
              <button type="button" class="btn-ghost" style="padding:4px 0;" onclick="borrarFoto('${escapeAttr(f.url)}')">Eliminar</button>
            </div>
          </div>`;
        }).join('')}
      </div>`}
    </div>
  `;
}

function subirFotos() {
  const input = document.getElementById('fotos_fileInput');
  const files = Array.from(input.files || []);
  if (files.length === 0) return;
  const status = document.getElementById('fotos_uploadStatus');
  subirFotosSecuencial(files, status);
}

async function subirFotosSecuencial(files, status) {
  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    status.textContent = `Subiendo ${i+1}/${files.length}: ${file.name}...`;
    try {
      const base64Data = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result.split(',')[1]);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      const res = await API.uploadFile(currentObraData.obraId, 'fotos', file.name, file.type || 'application/octet-stream', base64Data, currentUser.token);
      if (!res.ok) { status.textContent = 'Error al subir ' + file.name + ': ' + res.error; return; }
    } catch (err) {
      status.textContent = 'Error al leer ' + file.name;
      return;
    }
  }
  status.textContent = '';
  await reloadObra();
}

async function borrarFoto(url) {
  if (!confirm('¿Eliminar este archivo?')) return;
  const res = await API.deleteFile(currentObraData.obraId, 'fotos', url, currentUser.token);
  if (res.ok) {
    await reloadObra();
  } else {
    alert('Error al eliminar: ' + res.error);
  }
}
