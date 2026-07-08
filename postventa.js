// ============================================
// 🔧 POSTVENTA
// Arreglos post-obra: misma base que una obra pero con un resumen SINTÉTICO
// (sin H2/H3/H4/materiales). Puede nacer de una obra madre (hereda ficha del
// cliente, queda linkeada) o suelta. Tiene fotos y conversación como cualquier
// obra, y una orden de postventa que se le manda al colocador con un clic.
// ============================================

// ---- Creación ----
function openNuevaPostventaModal(obraMadreId, obraMadreNombre) {
  const prev = document.getElementById('modalNuevaPV');
  if (prev) prev.remove();
  const div = document.createElement('div');
  div.id = 'modalNuevaPV';
  div.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.55);z-index:900;display:flex;align-items:center;justify-content:center;padding:16px;';
  div.innerHTML = `
    <div style="background:var(--panel, #fff);color:inherit;border-radius:12px;max-width:520px;width:100%;max-height:90vh;overflow:auto;padding:22px;border:1px solid var(--line, #ddd);">
      <h3 style="margin:0 0 10px;">🔧 Nueva postventa</h3>
      ${obraMadreId
        ? `<div class="small-note" style="margin-bottom:10px;">De la obra <b>${escapeHtml(obraMadreNombre || obraMadreId)}</b> — hereda cliente, dirección, contacto y colocador. Después se puede cambiar.</div>`
        : `<label style="font-size:12px;font-weight:700;">Cliente</label>
           <input type="text" id="pvNuevoCliente" style="width:100%;margin:4px 0 12px;padding:8px;border:1px solid var(--line,#ddd);border-radius:8px;font:inherit;background:transparent;color:inherit;" placeholder="Nombre del cliente">`}
      <label style="font-size:12px;font-weight:700;">¿Qué hay que arreglar?</label>
      <textarea id="pvNuevoDesc" rows="4" style="width:100%;margin:4px 0 14px;padding:8px;border:1px solid var(--line,#ddd);border-radius:8px;font:inherit;background:transparent;color:inherit;" placeholder="Ej: se levantaron 3 tablas del deck en la esquina de la pileta"></textarea>
      <div style="display:flex;gap:10px;justify-content:flex-end;">
        <button type="button" class="btn-ghost" onclick="document.getElementById('modalNuevaPV').remove()">Cancelar</button>
        <button type="button" class="btn-primary" id="pvCrearBtn" onclick="crearPostventa('${escapeAttr(obraMadreId || '')}')">✓ Crear postventa</button>
      </div>
    </div>`;
  document.body.appendChild(div);
}

async function crearPostventa(obraMadreId) {
  const btn = document.getElementById('pvCrearBtn');
  btn.disabled = true; btn.textContent = 'Creando…';
  const payload = { descripcion: (document.getElementById('pvNuevoDesc') || {}).value || '' };
  if (obraMadreId) payload.obraMadreId = obraMadreId;
  else payload.cliente = (document.getElementById('pvNuevoCliente') || {}).value || '';
  try {
    const res = await API.crearPostventa(payload, currentUser.token);
    const modal = document.getElementById('modalNuevaPV');
    if (modal) modal.remove();
    if (res.ok) { await openObra(res.obraId); }
    else { alert('No se pudo crear la postventa: ' + (res.error || '')); }
  } catch (err) {
    btn.disabled = false; btn.textContent = '✓ Crear postventa';
    alert('Error de conexión al crear la postventa — probá de nuevo.');
  }
}

// ---- Resumen sintético (se guarda en la columna h1 de la fila) ----
function pvDefault() {
  return {
    _pv: true, cliente: '', direccion: '', telefono: '', contacto: '', email: '',
    descripcion: '', urgencia: '', colocador: '', fechaEstimada: '',
    pagoAcordado: '', notas: '', _obraMadre: null, _completo: false
  };
}

function renderPV(obra) {
  const d = Object.assign(pvDefault(), obra.h1 || {});
  return `
    <div class="small-note" style="margin-bottom:14px;">
      <b>🔧 POSTVENTA.</b> Resumen corto y al pie: qué se arregla, quién va, cuándo.
      Las fotos del problema van en la pestaña <span class="btn-ghost" style="padding:0;" onclick="switchHito('fotos')">Fotos →</span> (son parte de la orden que recibe el colocador).
      ${d._obraMadre ? `Viene de la obra <span class="btn-ghost" style="padding:0;" onclick="openObra('${escapeAttr(d._obraMadre.id)}')">${escapeHtml(d._obraMadre.codigo || d._obraMadre.id)} →</span>` : ''}
    </div>

    <div class="section">
      <div class="section-title">Cliente y lugar</div>
      <div class="field-grid">
        <div class="field"><label>Cliente</label><input type="text" id="pv_cliente" value="${escapeAttr(d.cliente || obra.cliente || '')}"></div>
        <div class="field"><label>Dirección</label><input type="text" id="pv_direccion" value="${escapeAttr(d.direccion)}"></div>
        <div class="field"><label>Contacto</label><input type="text" id="pv_contacto" value="${escapeAttr(d.contacto)}"></div>
        <div class="field"><label>Teléfono</label>
          <div style="display:flex; gap:8px;">
            <input type="text" id="pv_telefono" value="${escapeAttr(d.telefono)}" style="flex:1;">
            <button type="button" class="btn-secondary" title="WhatsApp" onclick="abrirWhatsApp(document.getElementById('pv_telefono').value)">💬</button>
          </div>
        </div>
      </div>
    </div>

    <div class="section">
      <div class="section-title">Qué hay que arreglar</div>
      <textarea id="pv_descripcion" style="min-height:110px;" placeholder="Descripción clara del problema — esto es lo que lee el colocador">${escapeHtml(d.descripcion)}</textarea>
      <div class="field-grid" style="margin-top:12px;">
        <div class="field"><label>Urgencia</label>
          <div class="radio-group" id="pv_urgencia" data-value="${escapeAttr(d.urgencia)}">
            ${['Baja', 'Media', 'Alta'].map(v => `<div class="radio-chip ${d.urgencia === v ? 'selected' : ''}" data-val="${v}">${v}</div>`).join('')}
          </div>
        </div>
        <div class="field"><label>Notas (van en la orden al colocador)</label><input type="text" id="pv_notas" value="${escapeAttr(d.notas)}"></div>
      </div>
    </div>

    <div class="section">
      <div class="section-title">Quién va y cuándo</div>
      <div class="field-grid">
        <div class="field"><label>Colocador asignado</label>
          <select id="pv_colocador">
            <option value="">— Elegir —</option>
            ${(typeof COLOCADORES !== 'undefined' ? COLOCADORES : []).map(c => `<option value="${escapeAttr(c.nombre)}" ${d.colocador === c.nombre ? 'selected' : ''}>${escapeHtml(c.nombre)}${c.tieneEmail ? '' : ' (sin email)'}</option>`).join('')}
            ${d.colocador && !(typeof COLOCADORES !== 'undefined' ? COLOCADORES : []).some(c => c.nombre === d.colocador) ? `<option value="${escapeAttr(d.colocador)}" selected>${escapeHtml(d.colocador)}</option>` : ''}
          </select>
        </div>
        <div class="field"><label>Fecha estimada <span class="small-note" style="font-weight:400;">(aparece en el 📅 Calendario)</span></label><input type="date" id="pv_fechaEstimada" value="${escapeAttr(d.fechaEstimada)}"></div>
        <div class="field"><label>Pago acordado al colocador (USD, opcional)</label><input type="number" step="any" id="pv_pagoAcordado" value="${escapeAttr(d.pagoAcordado)}"></div>
      </div>
    </div>

    <div class="section">
      <div class="section-title">📤 Orden de postventa al colocador</div>
      <div class="small-note">PDF corto por mail: qué se arregla, dónde, urgencia, fecha, pago (si hay) y el link destacado a las <b>fotos del problema</b>. Guardá antes de enviar: la orden se arma con lo guardado.</div>
      ${currentUser.rol === 'gerencia'
        ? `<button type="button" class="btn-primary" style="margin-top:10px;" onclick="enviarOrdenPVClick()">📤 Enviar orden a ${escapeHtml(d.colocador || 'colocador')}</button>
           <div class="small-note" id="pv_orden_status" style="margin-top:6px;"></div>`
        : '<div class="small-note" style="margin-top:8px;">El envío de la orden lo hace Gerencia.</div>'}
    </div>

    <div class="section">
      <div class="section-title">Estado</div>
      <div class="check-row">
        <input type="checkbox" id="pv_completo" ${d._completo ? 'checked' : ''} onchange="scheduleAutosave()">
        <div class="check-text">Marcar postventa como resuelta</div>
      </div>
    </div>
  `;
}

function collectPV() {
  const prev = (currentObraData && currentObraData.h1) || pvDefault();
  const el = (id) => document.getElementById(id);
  const v = (id, fb) => { const e = el(id); return e ? e.value : fb; };
  return {
    _pv: true,
    cliente: v('pv_cliente', prev.cliente),
    direccion: v('pv_direccion', prev.direccion),
    telefono: v('pv_telefono', prev.telefono),
    contacto: v('pv_contacto', prev.contacto),
    email: prev.email || '',
    descripcion: v('pv_descripcion', prev.descripcion),
    urgencia: (el('pv_urgencia') ? el('pv_urgencia').getAttribute('data-value') || '' : prev.urgencia),
    colocador: v('pv_colocador', prev.colocador),
    fechaEstimada: v('pv_fechaEstimada', prev.fechaEstimada),
    pagoAcordado: v('pv_pagoAcordado', prev.pagoAcordado),
    notas: v('pv_notas', prev.notas),
    _obraMadre: prev._obraMadre || null,
    _completo: el('pv_completo') ? el('pv_completo').checked : prev._completo
  };
}

async function enviarOrdenPVClick() {
  if (typeof hayCambiosSinGuardar === 'function' && hitoDirty.h1 && !confirm('Tenés cambios sin guardar. La orden se arma con lo GUARDADO. ¿Enviar igual?')) return;
  const st = document.getElementById('pv_orden_status');
  st.textContent = 'Generando y enviando…';
  try {
    const res = await API.enviarOrdenPV(currentObraData.obraId, currentUser.token);
    if (res.ok) { st.textContent = '✓ Enviada a ' + res.colocador + ' (' + res.email + ')'; await reloadObra(); }
    else { st.textContent = '⚠ ' + (res.error || 'Error desconocido'); }
  } catch (err) {
    st.textContent = '⚠ Error de conexión al enviar la orden — probá de nuevo.';
  }
}
