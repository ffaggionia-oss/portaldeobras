// ============================================
// VISITAS
// Timeline por obra: resúmenes de texto (ej. resumen IA de un audio grabado
// por Telegram) y fotos, mezclados en orden cronológico. Al agregar un
// resumen, el backend notifica por mail a colocador asignado + fiscal +
// Nico + Sandra (no es el mismo circuito que el chat interno de la obra).
// Acceso: todos los roles con obra (no ventas). Compartido con el bot.
// ============================================

const VISITAS_MAX_MB = 30;

function renderVisitas(obra) {
  const items = (obra.visitas || []).slice().reverse();
  const carpeta = obra.carpetaUrl || '';
  return `
    <div class="section">
      <div class="section-title">Agregar resumen de visita</div>
      <div class="field">
        <label>Resumen (texto, o pegá acá el resumen que te mande el bot por Telegram)</label>
        <textarea id="visitas_texto" rows="4" placeholder="Ej: Visita técnica del jueves — cliente pidió mover el desagüe 30cm, coordinar con colocador antes de empezar..."></textarea>
      </div>
      <button type="button" class="btn-primary" onclick="agregarResumenVisita()">Agregar resumen</button>
      <div class="small-note" id="visitas_resumenStatus" style="margin-top:8px;"></div>
      <div class="small-note" style="margin-top:8px;">
        Al agregar un resumen se avisa por mail al colocador asignado, a Paco (fiscal de obra), Nico y Sandra.
      </div>
    </div>

    <div class="section">
      <div class="section-title">Agregar fotos de la visita</div>
      <div class="field">
        <label>Archivo (imagen, video o PDF). Podés seleccionar varios. Máx. ${VISITAS_MAX_MB} MB por archivo.</label>
        <input type="file" id="visitas_fileInput" multiple accept="image/*,video/*,application/pdf" onchange="subirFotosVisita()">
      </div>
      <div class="small-note" id="visitas_uploadStatus" style="margin-top:8px;"></div>
      <div class="small-note" style="margin-top:8px;">
        Las fotos NO disparan el mail de aviso (solo el resumen) — quedan guardadas en el Drive de la obra${carpeta ? ` — <a href="${escapeAttr(carpeta)}" target="_blank">📂 abrir carpeta</a>` : ''}.
      </div>
    </div>

    <div class="section">
      <div class="section-title">Historial (${items.length})</div>
      ${items.length === 0 ? '<div class="small-note">Todavía no hay visitas registradas para esta obra.</div>' : `
      <div style="display:flex; flex-direction:column; gap:10px;">
        ${items.map(v => renderVisitaEntry(v)).join('')}
      </div>`}
    </div>
  `;
}

function renderVisitaEntry(v) {
  if (v.tipo === 'foto') {
    const esImagen = /\.(jpe?g|png|gif|webp|heic|heif)$/i.test(v.name || '');
    const thumb = esImagen ? driveThumb_(v.url, 300) : '';
    const thumbAlt = esImagen ? driveThumbAlt_(v.url, 300) : '';
    return `
      <div style="border:1px solid var(--line); border-radius:6px; padding:10px; background:var(--bg); display:flex; gap:10px; align-items:center;">
        ${thumb ? `<img src="${escapeAttr(thumb)}" data-alt="${escapeAttr(thumbAlt)}" data-h="60" loading="lazy" style="width:60px; height:60px; object-fit:cover; border-radius:4px; flex-shrink:0;" onerror="fotoImgFallback(this,'🖼')">` : `<div style="width:60px; height:60px; display:flex; align-items:center; justify-content:center; font-size:22px; flex-shrink:0;">📎</div>`}
        <div style="flex:1; min-width:0;">
          <a href="${escapeAttr(v.url)}" target="_blank" style="color:var(--rust-bright); overflow:hidden; text-overflow:ellipsis; white-space:nowrap; display:block;">${escapeHtml(v.name || '')}</a>
          <div class="small-note">📷 ${escapeHtml(v.uploadedBy||'')} · ${formatDate(v.uploadedAt)}</div>
        </div>
      </div>`;
  }
  return `
    <div style="border:1px solid var(--line); border-radius:6px; padding:10px; background:var(--bg);">
      <div class="small-note">📝 ${escapeHtml(v.registradoPor||'')} · ${escapeHtml(v.fecha||'')}</div>
      <div style="margin-top:4px; white-space:pre-wrap;">${escapeHtml(v.texto||'')}</div>
    </div>`;
}

async function agregarResumenVisita() {
  const el = document.getElementById('visitas_texto');
  const texto = (el.value || '').trim();
  const status = document.getElementById('visitas_resumenStatus');
  if (!texto) { status.textContent = 'Escribí el resumen antes de agregarlo.'; return; }
  status.textContent = 'Guardando...';
  const res = await API.agregarVisitaResumen(currentObraData.obraId, texto, currentUser.token);
  if (res.ok) {
    el.value = '';
    status.textContent = '';
    await reloadObra();
  } else {
    status.textContent = 'Error: ' + res.error;
  }
}

function subirFotosVisita() {
  const input = document.getElementById('visitas_fileInput');
  const files = Array.from(input.files || []);
  if (files.length === 0) return;
  const status = document.getElementById('visitas_uploadStatus');

  const grandes = files.filter(f => f.size > VISITAS_MAX_MB * 1024 * 1024);
  const ok = files.filter(f => f.size <= VISITAS_MAX_MB * 1024 * 1024);
  if (grandes.length) {
    status.innerHTML = '⚠ ' + grandes.map(f => '<b>' + escapeHtml(f.name) + '</b> (' + (f.size/1048576).toFixed(0) + ' MB)').join(', ') +
      ' supera' + (grandes.length === 1 ? '' : 'n') + ' los ' + VISITAS_MAX_MB + ' MB.' +
      (ok.length ? '<br>Subiendo el resto…' : '');
  }
  if (ok.length) subirFotosVisitaSecuencial(ok, status, grandes.length > 0);
}

async function subirFotosVisitaSecuencial(files, status, mantenerAviso) {
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
      const res = await API.uploadFile(currentObraData.obraId, 'visitas', file.name, file.type || 'application/octet-stream', base64Data, currentUser.token);
      if (!res.ok) { status.innerHTML = avisoPrevio + 'Error al subir ' + escapeHtml(file.name) + ': ' + escapeHtml(res.error || ''); return; }
    } catch (err) {
      status.innerHTML = avisoPrevio + 'Error al leer ' + escapeHtml(file.name);
      return;
    }
  }
  status.innerHTML = avisoPrevio;
  await reloadObra();
}
