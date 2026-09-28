// ============================================
// 💬 FEEDBACK — pedidos y sugerencias del equipo (2026-09-28)
// ============================================
// Tablero ANÓNIMO: nadie ve quién cargó qué (ni gerencia). Lo que se muestra
// es la versión despersonalizada que arma el backend con IA; cada uno ve
// además su propio texto original en lo que cargó él ("mío").
// Lo resuelto aparece tachado con "Se resolvió con: …" y desaparece solo a
// los 30 días si nadie lo objeta. Los cambios los prepara un agente y NO se
// publica nada sin la aprobación de Franco.

API.feedbackList = async function(token) {
  const res = await fetch(`${CONFIG.API_URL}?action=feedbackList&token=${encodeURIComponent(token)}`);
  return res.json();
};
API.feedbackCrear = async function(texto, prioridad, token) {
  const res = await fetch(CONFIG.API_URL, {
    method: 'POST',
    body: JSON.stringify({ action: 'feedbackCrear', texto, prioridad, origen: 'portal', token })
  });
  return res.json();
};
API.feedbackObjetar = async function(id, texto, token) {
  const res = await fetch(CONFIG.API_URL, {
    method: 'POST',
    body: JSON.stringify({ action: 'feedbackObjetar', id, texto, token })
  });
  return res.json();
};

async function abrirFeedback() {
  if (hayCambiosSinGuardar() && !confirm('Tenés cambios SIN GUARDAR en esta obra. Si salís se descartan. ¿Salir igual?')) return;
  h3Dirty = false; hitoDirty = { h1: false, h2: false };
  currentObraData = null;
  const app = document.getElementById('app');
  app.innerHTML = `
    <div class="back-link" onclick="goHome()">← Volver a obras</div>
    <div class="list-header"><h1>💬 Feedback</h1></div>
    <div class="small-note" style="margin-bottom:14px;">
      Contá qué necesitás o qué mejorarías del Portal o del cotizador. <b>Es anónimo</b>: nadie ve quién escribió cada pedido,
      y el texto se reescribe en tono neutro antes de mostrarse. Lo resuelto queda tachado 30 días por si hace falta objetarlo.
    </div>
    <div class="fb-form">
      <textarea id="fbTexto" rows="4" maxlength="2000" placeholder="Ej: En H3 sería útil poder duplicar un material en vez de cargarlo de nuevo"></textarea>
      <div class="fb-form-row">
        <label class="fb-prio"><input type="radio" name="fbPrio" value="urgente"> 🔴 Urgente</label>
        <label class="fb-prio"><input type="radio" name="fbPrio" value="no_urgente" checked> 🟢 No tan urgente</label>
        <button class="btn-primary" id="fbEnviarBtn" onclick="enviarFeedback()">Enviar</button>
      </div>
    </div>
    <div id="fbLista"><div class="empty-state">Cargando…</div></div>
  `;
  await cargarFeedbackLista_();
}

async function cargarFeedbackLista_() {
  const cont = document.getElementById('fbLista');
  try {
    const res = await API.feedbackList(currentUser.token);
    if (!res.ok) throw new Error(res.error);
    cont.innerHTML = res.items.length
      ? res.items.map(renderFeedbackItem_).join('')
      : '<div class="empty-state">Todavía no hay pedidos. ¡Sé el primero!</div>';
  } catch (err) {
    cont.innerHTML = `<div class="empty-state">No pude cargar el feedback: ${escapeHtml(String(err.message || err))}</div>`;
  }
}

function renderFeedbackItem_(it) {
  const cerrado = it.estado === 'resuelto' || it.estado === 'descartado';
  const texto = it.procesando ? '<i>Procesando el texto…</i>' : escapeHtml(it.texto);
  return `
    <div class="fb-item ${cerrado ? 'fb-cerrado' : ''}">
      <div class="fb-meta">
        <span>${it.prioridad === 'urgente' ? '🔴 Urgente' : '🟢 No tan urgente'}</span>
        <span class="fb-estado fb-est-${it.estado}">${escapeHtml(it.estadoLabel)}</span>
        ${it.mio ? '<span class="fb-mio">mío</span>' : ''}
        <span class="fb-fecha">${escapeHtml(it.id)} · ${formatDate(it.fecha)}</span>
      </div>
      <div class="fb-texto">${texto}</div>
      ${it.mio && it.textoOriginal && it.textoOriginal !== it.texto ? `<div class="small-note">Lo que escribiste (solo lo ves vos): ${escapeHtml(it.textoOriginal)}</div>` : ''}
      ${cerrado && it.resolucion ? `<div class="fb-resolucion">${it.estado === 'resuelto' ? 'Se resolvió con' : 'Motivo'}: ${escapeHtml(it.resolucion)}</div>` : ''}
      ${cerrado ? `<div class="fb-acciones"><span class="btn-ghost" onclick="objetarFeedback('${escapeAttr(it.id)}')">No quedó bien → objetar</span></div>` : ''}
    </div>`;
}

async function enviarFeedback() {
  const texto = document.getElementById('fbTexto').value.trim();
  const prio = (document.querySelector('input[name="fbPrio"]:checked') || {}).value;
  if (!texto) { alert('Escribí tu pedido o sugerencia.'); return; }
  const btn = document.getElementById('fbEnviarBtn');
  btn.disabled = true; btn.textContent = 'Enviando…';
  try {
    const res = await API.feedbackCrear(texto, prio, currentUser.token);
    if (!res.ok) throw new Error(res.error);
    document.getElementById('fbTexto').value = '';
    await cargarFeedbackLista_();
  } catch (err) {
    alert('No se pudo enviar: ' + (err.message || err));
  } finally {
    btn.disabled = false; btn.textContent = 'Enviar';
  }
}

async function objetarFeedback(id) {
  const texto = prompt('¿Qué no quedó bien? (es anónimo)');
  if (!texto || !texto.trim()) return;
  const res = await API.feedbackObjetar(id, texto.trim(), currentUser.token);
  if (res.ok) cargarFeedbackLista_();
  else alert('No se pudo objetar: ' + (res.error || ''));
}
