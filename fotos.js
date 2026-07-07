// ============================================
// FOTOS, VIDEOS Y PLANOS
// No es un hito (H1..H5), es una instancia aparte. Acceso: TODOS los roles.
// Todo se guarda automáticamente en el Drive de la obra
// (carpeta "Kokkai Obras - Archivos" → <obra> → fotos).
// ============================================

// Límite por archivo: el backend (Apps Script) acepta hasta ~50 MB por
// request y el archivo viaja en base64 (+33%), así que el tope práctico
// es 30 MB. Para videos más largos: comprimir o subir directo al Drive.
const FOTOS_MAX_MB = 30;

function driveFileId_(url) {
  const m = String(url || '').match(/[-\w]{25,}/);
  return m ? m[0] : '';
}
// Miniatura de Drive. El endpoint lh3 sirve la imagen directa (el link de
// Drive común NO se puede usar en <img>); si falla, se cae al endpoint
// /thumbnail y recién después al ícono. Funciona para imágenes y videos
// compartidos por link.
function driveThumb_(url, w) {
  const id = driveFileId_(url);
  return id ? 'https://lh3.googleusercontent.com/d/' + id + '=w' + (w || 400) : '';
}
function driveThumbAlt_(url, w) {
  const id = driveFileId_(url);
  return id ? 'https://drive.google.com/thumbnail?id=' + id + '&sz=w' + (w || 400) : '';
}
// Cadena de respaldo para <img>: lh3 → thumbnail → ícono
function fotoImgFallback(img, icono) {
  const alt = img.getAttribute('data-alt');
  if (alt) { img.removeAttribute('data-alt'); img.src = alt; return; }
  img.outerHTML = '<div style="width:100%;height:' + (img.getAttribute('data-h') || '110') + 'px;display:flex;align-items:center;justify-content:center;font-size:28px;">' + (icono || '🖼') + '</div>';
}

function renderFotos(obra) {
  const items = obra.fotos || [];
  const carpeta = obra.carpetaUrl || '';
  return `
    <div class="section">
      <div class="section-title">Subir foto, video o plano</div>
      <div class="field">
        <label>Archivo (imagen, video o PDF). Podés seleccionar varios. Máx. ${FOTOS_MAX_MB} MB por archivo.</label>
        <input type="file" id="fotos_fileInput" multiple accept="image/*,video/*,application/pdf" onchange="subirFotos()">
      </div>
      <div class="small-note" id="fotos_uploadStatus" style="margin-top:8px;"></div>
      <div class="small-note" style="margin-top:8px;">
        Todo queda guardado automáticamente en el Drive de la obra${carpeta ? ` — <a href="${escapeAttr(carpeta)}" target="_blank">📂 abrir carpeta</a>` : ''}.
      </div>
    </div>

    <div class="section">
      <div class="section-title">Galería (${items.length})</div>
      ${items.length === 0 ? '<div class="small-note">Todavía no hay fotos, videos ni planos cargados para esta obra.</div>' : `
      <div style="display:grid; grid-template-columns:repeat(auto-fill, minmax(140px,1fr)); gap:12px;">
        ${items.map(f => {
          const esImagen = /\.(jpe?g|png|gif|webp|heic|heif)$/i.test(f.name);
          const esVideo = /\.(mp4|mov|m4v|avi|mkv|webm|3gp)$/i.test(f.name);
          const thumb = driveThumb_(f.url, 400);
          const thumbAlt = driveThumbAlt_(f.url, 400);
          let preview;
          if (esImagen && thumb) {
            preview = `<img src="${escapeAttr(thumb)}" data-alt="${escapeAttr(thumbAlt)}" data-h="110" loading="lazy" style="width:100%; height:110px; object-fit:cover; display:block;" onerror="fotoImgFallback(this,'🖼')">`;
          } else if (esVideo) {
            preview = `<div style="position:relative;">
              ${thumb ? `<img src="${escapeAttr(thumb)}" data-alt="${escapeAttr(thumbAlt)}" data-h="110" loading="lazy" style="width:100%; height:110px; object-fit:cover; display:block;" onerror="fotoImgFallback(this,'🎬')">` : ''}
              <div style="position:absolute; inset:0; display:flex; align-items:center; justify-content:center; font-size:30px; text-shadow:0 0 8px rgba(0,0,0,.6);">▶️</div>
              ${!thumb ? '<div style="width:100%; height:110px;"></div>' : ''}
            </div>`;
          } else {
            preview = `<div style="width:100%; height:110px; display:flex; align-items:center; justify-content:center; font-family:var(--font-mono); font-size:11px; color:var(--paper-dim);">📄 PDF</div>`;
          }
          return `
          <div style="border:1px solid var(--line); border-radius:6px; overflow:hidden; background:var(--bg);">
            <a href="${escapeAttr(f.url)}" target="_blank" title="${esVideo ? 'Ver video en Drive' : 'Abrir en Drive'}">${preview}</a>
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

  // Filtro de tamaño ANTES de subir, con mensaje claro por archivo
  const grandes = files.filter(f => f.size > FOTOS_MAX_MB * 1024 * 1024);
  const ok = files.filter(f => f.size <= FOTOS_MAX_MB * 1024 * 1024);
  if (grandes.length) {
    status.innerHTML = '⚠ ' + grandes.map(f => '<b>' + escapeHtml(f.name) + '</b> (' + (f.size/1048576).toFixed(0) + ' MB)').join(', ') +
      ' supera' + (grandes.length === 1 ? '' : 'n') + ' los ' + FOTOS_MAX_MB + ' MB — comprimilo o subilo directo a la carpeta Drive de la obra.' +
      (ok.length ? '<br>Subiendo el resto…' : '');
  }
  if (ok.length) subirFotosSecuencial(ok, status, grandes.length > 0);
}

async function subirFotosSecuencial(files, status, mantenerAviso) {
  const avisoPrevio = mantenerAviso ? status.innerHTML + '<br>' : '';
  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    status.innerHTML = avisoPrevio + `Subiendo ${i+1}/${files.length}: ${escapeHtml(file.name)} (${(file.size/1048576).toFixed(1)} MB)…`;
    try {
      const base64Data = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result.split(',')[1]);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      const res = await API.uploadFile(currentObraData.obraId, 'fotos', file.name, file.type || 'application/octet-stream', base64Data, currentUser.token);
      if (!res.ok) { status.innerHTML = avisoPrevio + 'Error al subir ' + escapeHtml(file.name) + ': ' + escapeHtml(res.error || ''); return; }
    } catch (err) {
      status.innerHTML = avisoPrevio + 'Error al leer ' + escapeHtml(file.name);
      return;
    }
  }
  status.innerHTML = avisoPrevio;
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
