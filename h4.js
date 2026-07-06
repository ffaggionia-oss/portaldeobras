// ============================================
// H4 — FINANCIERO (solo Gerencia)
// Todo lo que se ve acá viene YA CALCULADO desde Code.gs (backend).
// A propósito este archivo no contiene fórmulas de margen ni tablas de
// segmentos: eso vive únicamente en el servidor (y en las pestañas
// Maestro_Tipos / Maestro_Segmentos del Sheet, editables por Gerencia desde
// ⚙ Precios y Materiales) para que un colocador o cualquier visitante que
// abra el código fuente del sitio no pueda verlo.
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
        ${f.segmentos.map(s => `
          <div class="segmento-chip ${f.segmentoId===s.id?'selected':''}" onclick="setSegmentoH4('${s.id}')">
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
          <tr><td>Mano de obra (colocadores)</td><td class="num">$${f.moAjustada.toFixed(0)}</td><td class="num">$${f.totalColocadores.toFixed(0)}</td></tr>
          <tr><td>Fiscal técnico</td><td class="num">$${f.fiscalMt2.toFixed(2)}</td><td class="num">$${f.fiscalTotal.toFixed(2)}</td></tr>
          <tr class="total-row"><td>Rentabilidad Kokkai</td><td class="num">$${f.rentabilidadMt2.toFixed(2)}</td><td class="num">$${f.rentabilidadTotal.toFixed(2)}</td></tr>
        </tbody>
      </table>
      <div class="small-note" style="margin-top:8px;">Los márgenes por segmento se calculan en el servidor a partir del Maestro de Precios. Cambiar de segmento acá actualiza el precio guardado para esta obra. Para cambiar los % de margen de cada segmento, usá <span class="btn-ghost" style="padding:0;" onclick="abrirAdminMaestro()">⚙ Precios y Materiales</span>.</div>
    </div>

    <div class="section">
      <div class="section-title">Estado del hito</div>
      <div class="check-row">
        <input type="checkbox" id="h4_completo" ${f.completo?'checked':''} onchange="toggleCompletoH4(this.checked)">
        <div class="check-text">Marcar H4 · Financiero como completo</div>
      </div>
    </div>

    ${renderFacturasH4(obra)}

    ${renderPlanVsReal(obra)}
  `;
}

// ============================================
// PLAN vs REAL — solo Gerencia (Nicolás y Franco).
// Expectativa: el costo y la ganancia planificados que quedaron CONGELADOS
// en la cotización al aprobarse. Realidad: las facturas de compra cargadas
// en H5 y el financiero actual de la obra. Sirve para cerrar la obra
// comparando qué se esperaba contra qué pasó.
// ============================================
function renderPlanVsReal(obra) {
  const pvr = obra.planVsReal;
  if (!pvr || !pvr.plan) {
    return pvr ? `
    <div class="section">
      <div class="section-title">Plan vs Real — solo Gerencia</div>
      <div class="small-note">Esta obra no vino de una cotización aprobada (o la cotización no tenía costo planificado), así que no hay expectativa congelada para comparar.${pvr.cantFacturas ? ' Compras reales cargadas hasta ahora: <b>USD ' + pvr.comprasReales.toFixed(2) + '</b> (' + pvr.cantFacturas + ' factura' + (pvr.cantFacturas===1?'':'s') + ').' : ''}</div>
    </div>` : '';
  }
  const p = pvr.plan;
  const f = obra.h4 || {};
  const mt2 = (obra.h3 && parseFloat(obra.h3.mt2)) || 0;
  const costoActual = (f.costoTotalMt2 || 0) * mt2;            // costo H3 con datos de hoy
  const desvCompras = pvr.comprasReales - (p.costoTotal || 0);
  const desvPct = p.costoTotal ? (desvCompras / p.costoTotal) * 100 : 0;
  const gananciaEsperada = p.gananciaNominal || 0;
  const gananciaActual = f.rentabilidadTotal || 0;
  const colorDesv = desvCompras > 0 ? 'var(--warn, #c77700)' : 'var(--ok, #1a7f37)';
  const fmt2 = (n) => (Math.round(n * 100) / 100).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const ejecPct = p.costoTotal ? Math.min((pvr.comprasReales / p.costoTotal) * 100, 999) : 0;
  const barW = Math.min(ejecPct, 100);
  const resultadoActual = (p.precioTotal || 0) - pvr.comprasReales; // margen bruto hoy: precio cotizado − comprado
  const cerrada = obra.estado === 'cerrada';
  return `
    <div class="section" style="${cerrada ? 'border-color:var(--ok, #1a7f37);' : ''}">
      <div class="section-title">${cerrada ? '📋 Informe de cierre de obra' : '📊 ¿Cómo viene la obra? — informe en tiempo real'} <span class="small-note" style="font-weight:400;">solo Gerencia</span></div>
      <div class="small-note">Presupuesto congelado al aprobar la cotización <b>${escapeHtml(pvr.origenCot || p.cotId || '')}</b>${p.fecha ? ' (' + escapeHtml(p.fecha) + ')' : ''} vs lo realmente comprado (facturas de arriba). ${cerrada ? 'La obra está cerrada: este es el informe final.' : 'Se actualiza con cada factura.'}</div>

      <div style="margin:14px 0 4px;display:flex;justify-content:space-between;font-size:11px;">
        <span>Ejecución del presupuesto de compras</span>
        <b style="color:${ejecPct > 100 ? 'var(--warn, #c77700)' : 'inherit'};">${ejecPct.toFixed(0)}%</b>
      </div>
      <div style="height:10px;border:1px solid var(--line,#555);border-radius:6px;overflow:hidden;">
        <div style="height:100%;width:${barW}%;background:${ejecPct > 100 ? 'var(--warn, #c77700)' : 'var(--rust-bright, #B9943E)'};"></div>
      </div>

      <table class="calc-table" style="margin-top:14px;">
        <thead><tr><th>Concepto</th><th>Presupuesto (cotización)</th><th>Real</th><th>Desvío</th></tr></thead>
        <tbody>
          <tr>
            <td>Compras de la obra</td>
            <td class="num">USD ${fmt2(p.costoTotal || 0)}</td>
            <td class="num">USD ${fmt2(pvr.comprasReales)} <span class="small-note">(${pvr.cantFacturas} factura${pvr.cantFacturas===1?'':'s'})</span></td>
            <td class="num" style="color:${colorDesv};font-weight:700;">${desvCompras>=0?'+':''}USD ${fmt2(desvCompras)} (${desvPct>=0?'+':''}${desvPct.toFixed(1)}%)</td>
          </tr>
          <tr>
            <td>Costo según H3 hoy</td>
            <td class="num">USD ${fmt2(p.costoTotal || 0)}</td>
            <td class="num">USD ${fmt2(costoActual)}</td>
            <td class="num">${costoActual - (p.costoTotal||0) >= 0 ? '+' : ''}USD ${fmt2(costoActual - (p.costoTotal||0))}</td>
          </tr>
          <tr>
            <td>Precio de instalación al cliente</td>
            <td class="num">USD ${fmt2(p.precioTotal || 0)}</td>
            <td class="num">USD ${fmt2(f.totalObra || 0)}</td>
            <td class="num">${(f.totalObra||0) - (p.precioTotal||0) >= 0 ? '+' : ''}USD ${fmt2((f.totalObra||0) - (p.precioTotal||0))}</td>
          </tr>
          <tr>
            <td>Ganancia nominal</td>
            <td class="num">USD ${fmt2(gananciaEsperada)}</td>
            <td class="num">USD ${fmt2(gananciaActual)} <span class="small-note">(recalculada H3/H4)</span></td>
            <td class="num">${gananciaActual - gananciaEsperada >= 0 ? '+' : ''}USD ${fmt2(gananciaActual - gananciaEsperada)}</td>
          </tr>
          <tr class="total-row">
            <td>Resultado actual contra caja</td>
            <td class="num">USD ${fmt2(gananciaEsperada)}</td>
            <td class="num" style="font-weight:700;color:${resultadoActual >= gananciaEsperada ? 'var(--ok, #1a7f37)' : 'inherit'};">USD ${fmt2(resultadoActual)}</td>
            <td class="num" style="font-weight:700;">${resultadoActual - gananciaEsperada >= 0 ? '+' : ''}USD ${fmt2(resultadoActual - gananciaEsperada)}</td>
          </tr>
        </tbody>
      </table>
      <div class="small-note" style="margin-top:8px;">"Resultado actual contra caja" = precio de instalación cotizado − facturas cargadas. Se acerca al real a medida que Nicolás carga todas las compras (incluida la mano de obra si se factura). Con la obra ${cerrada ? 'cerrada, este cuadro es el informe final — imprimible con el botón 🖨 de abajo.' : 'en curso, es la foto del momento.'}</div>
    </div>
  `;
}

async function toggleCompletoH4(checked) {
  setSaveStatus('Guardando...', '');
  const res = await API.saveHito(currentObraData.obraId, 'h4', { segmentoId: currentObraData.h4.segmentoId, _completo: checked }, null, currentUser.token);
  if (res.ok) {
    await reloadObra();
    setSaveStatus('✓ Guardado ' + new Date().toLocaleTimeString('es-AR', {hour:'2-digit', minute:'2-digit'}), 'ok');
  } else {
    setSaveStatus('Error al guardar: ' + res.error, 'error');
  }
}

async function setSegmentoH4(segmentoId) {
  setSaveStatus('Guardando...', '');
  const res = await API.saveHito(currentObraData.obraId, 'h4', { segmentoId, _completo: currentObraData.h4.completo }, null, currentUser.token);
  if (res.ok) {
    await reloadObra();
    setSaveStatus('✓ Guardado ' + new Date().toLocaleTimeString('es-AR', {hour:'2-digit', minute:'2-digit'}), 'ok');
  } else {
    setSaveStatus('Error al guardar: ' + res.error, 'error');
  }
}


// ============================================
// 🧾 FACTURAS DE COMPRA — se cargan acá, en Financiero (solo Gerencia).
// Al elegir el archivo, el OCR lee la factura y precarga proveedor,
// monto, fecha y concepto: Nicolás solo confirma. Cada factura alimenta
// el comparativo presupuesto vs real de abajo.
// ============================================
function renderFacturasH4(obra) {
  const facturas = obra.facturas || [];
  const totalFact = facturas.reduce((s, f) => s + (f.monto || 0), 0);
  return `
    <div class="section">
      <div class="section-title">🧾 Facturas de compra</div>
      <div class="small-note">Cargá cada factura real de la obra. Elegí el archivo primero: el sistema lo lee y te precarga los datos para confirmar.</div>
      <div class="field" style="margin-top:10px;"><label>Archivo de la factura (foto o PDF)</label><input type="file" id="fact_file" accept="image/*,application/pdf" onchange="leerFacturaOCR()"></div>
      <div class="small-note" id="fact_ocr_status" style="margin:4px 0 8px;"></div>
      <div class="field"><label>Proveedor</label><input type="text" id="fact_prov" placeholder="Ej: Rothoblaas"></div>
      <div class="field"><label>Concepto</label><input type="text" id="fact_conc" placeholder="Ej: tornillería 5x40"></div>
      <div class="field"><label>Monto (USD)</label><input type="number" id="fact_monto" min="0" step="0.01" placeholder="0.00"></div>
      <button type="button" class="btn-primary" onclick="subirFactura()">＋ Cargar factura</button>
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
          <tr class="total-row"><td colspan="3">TOTAL COMPRADO</td><td class="num">USD ${totalFact.toFixed(2)}</td><td colspan="3"></td></tr>
        </tbody>
      </table>`}
    </div>`;
}

let _factB64 = null; // archivo leído, listo para subir con los datos confirmados

async function leerFacturaOCR() {
  const input = document.getElementById('fact_file');
  const file = input.files[0];
  const status = document.getElementById('fact_ocr_status');
  _factB64 = null;
  if (!file) return;
  status.textContent = '🔍 Leyendo la factura…';
  try {
    const base64Data = await new Promise((res, rej) => {
      const r = new FileReader();
      r.onload = () => res(r.result.split(',')[1]);
      r.onerror = rej;
      r.readAsDataURL(file);
    });
    _factB64 = { filename: file.name, mimeType: file.type || 'application/octet-stream', base64Data };
    const res = await API.facturaLeer(file.name, _factB64.mimeType, base64Data, currentUser.token);
    if (res.ok && res.sugerencias) {
      const s = res.sugerencias;
      if (s.proveedor && !document.getElementById('fact_prov').value) document.getElementById('fact_prov').value = s.proveedor;
      if (s.concepto && !document.getElementById('fact_conc').value) document.getElementById('fact_conc').value = s.concepto;
      if (s.monto && !document.getElementById('fact_monto').value) document.getElementById('fact_monto').value = s.monto;
      status.textContent = '✓ Leída' + (s.monto ? ' — total detectado USD ' + s.monto : '') + (s.cuit ? ' · CUIT ' + s.cuit : '') + (s.fecha ? ' · ' + s.fecha : '') + '. Revisá y confirmá.';
    } else {
      status.textContent = 'No pude leer los datos (' + (res.error || 'sin texto') + '). Cargalos a mano — el archivo se sube igual.';
    }
  } catch (e) {
    status.textContent = 'No pude leer el archivo. Cargá los datos a mano.';
  }
}

async function subirFactura() {
  const prov = document.getElementById('fact_prov').value.trim();
  const conc = document.getElementById('fact_conc').value.trim();
  const monto = parseFloat(document.getElementById('fact_monto').value);
  const status = document.getElementById('fact_status');
  if (isNaN(monto) || monto <= 0) { status.textContent = 'Cargá el monto de la factura.'; return; }
  status.textContent = 'Cargando factura…';
  const f = _factB64 || {};
  const res = await API.facturaSubir(currentObraData.obraId, prov, conc, monto, f.filename || null, f.mimeType || null, f.base64Data || null, currentUser.token);
  if (res.ok) { _factB64 = null; await reloadObra(); }
  else { status.textContent = 'Error: ' + res.error; }
}

async function borrarFactura(id) {
  if (!confirm('¿Eliminar esta factura? (también se mueve a la papelera del Drive)')) return;
  const res = await API.facturaBorrar(id, currentUser.token);
  if (res.ok) { await reloadObra(); }
  else { alert('Error al eliminar: ' + res.error); }
}
