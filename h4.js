// ============================================
// H4 — FINANCIERO (solo Gerencia)
// Todo lo que se ve acá viene YA CALCULADO desde Code.gs (backend).
// A propósito este archivo no contiene fórmulas de margen ni tablas de
// segmentos: eso vive únicamente en el servidor para que un colocador o
// cualquier visitante que abra el código fuente del sitio no pueda verlo.
// ============================================

function renderH4(obra) {
  const f = obra.h4;
  if (!f) {
    return `<div class="section"><div class="empty-state">Todavía no hay datos de H3 cargados para calcular el financiero de esta obra.</div></div>`;
  }

  return `
    <div class="section">
      <div class="section-title">⚠ Información sensible — solo Gerencia</div>
      <div class="small-note">Estos datos no son visibles para Compras/Admin, Project Manager ni Colocadores.</div>
    </div>

    <div class="section">
      <div class="section-title">Segmento de precio</div>
      <div class="segmento-tabs">
        ${f.segmentos.map((s, i) => `
          <div class="segmento-chip ${f.segmentoActivo===i?'selected':''}" onclick="setSegmentoH4(${i})">
            <div class="seg-name">${escapeHtml(s.nombre)}</div>
            <div class="seg-price">$${s.precioMt2.toFixed(0)}</div>
          </div>
        `).join('')}
      </div>

      <div class="stat-grid">
        <div class="stat-box"><div class="label">Costo Total x Mt²</div><div class="value">$${f.costoTotalMt2.toFixed(2)}</div></div>
        <div class="stat-box accent"><div class="label">Precio a Cliente x Mt²</div><div class="value">$${f.precioFinalMt2.toFixed(2)}</div></div>
        <div class="stat-box accent"><div class="label">Total Obra (USD)</div><div class="value">$${f.totalObra.toFixed(0)}</div></div>
        <div class="stat-box"><div class="label">Rentabilidad Kokkai</div><div class="value">$${f.rentabilidadTotal.toFixed(0)}</div></div>
      </div>
    </div>

    <div class="section">
      <div class="section-title">Resumen de rentabilidad</div>
      <table class="calc-table">
        <thead><tr><th>Concepto</th><th>Costo x Mt²</th><th>Total</th></tr></thead>
        <tbody>
          <tr><td>Materiales</td><td class="num">$${f.costoMateriales.toFixed(2)}</td><td class="num">$${f.totalMateriales.toFixed(2)}</td></tr>
          <tr><td>Periféricos</td><td class="num">$${f.costoPerifericos.toFixed(2)}</td><td class="num">$${f.totalPerifericos.toFixed(2)}</td></tr>
          <tr><td>Mano de obra (colocadores)</td><td class="num">$${f.moAjustada.toFixed(2)}</td><td class="num">$${f.totalColocadores.toFixed(2)}</td></tr>
          <tr><td>Fiscal técnico</td><td class="num">$${f.fiscalMt2.toFixed(2)}</td><td class="num">$${f.fiscalTotal.toFixed(2)}</td></tr>
          <tr class="total-row"><td>Rentabilidad Kokkai</td><td class="num">$${f.rentabilidadMt2.toFixed(2)}</td><td class="num">$${f.rentabilidadTotal.toFixed(2)}</td></tr>
        </tbody>
      </table>
      <div class="small-note" style="margin-top:8px;">Los márgenes por segmento se calculan y almacenan en el servidor. Cambiar de segmento acá actualiza el precio guardado para esta obra.</div>
    </div>
  `;
}

async function setSegmentoH4(i) {
  setSaveStatus('Guardando...', '');
  const res = await API.saveHito(currentObraData.obraId, 'h4', { segmentoActivo: i }, null, currentUser.token);
  if (res.ok) {
    await reloadObra();
    setSaveStatus('✓ Guardado ' + new Date().toLocaleTimeString('es-AR', {hour:'2-digit', minute:'2-digit'}), 'ok');
  } else {
    setSaveStatus('Error al guardar: ' + res.error, 'error');
  }
}
