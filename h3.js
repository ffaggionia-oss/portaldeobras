// ============================================
// H3 — Cálculo de Costos / Pedido de Compras / Orden de Pago
// La parte financiera (precio a cliente, márgenes, rentabilidad) vive en H4 (Financiero),
// visible sólo para Gerencia. Acá sólo hay costos, no ganancia.
//
// Los precios de tipos de colocación, materiales, periféricos, escaladores y
// reductores YA NO están hardcodeados acá: vienen del Maestro de Precios
// (variable global MAESTRO, cargada por app.js al iniciar sesión) y Gerencia
// los edita desde el panel "⚙ Precios y Materiales" sin tocar código.
// ============================================

function h3TipoDefaultId() {
  const tipos = MAESTRO.tipos || [];
  return (tipos[1] && tipos[1].id) || (tipos[0] && tipos[0].id) || '';
}

function h3Default() {
  return {
    cliente: '', mt2: '',
    materiales: mergeMateriales([]),
    perifericos: mergePerifericos([]),
    tipoColocacionId: h3TipoDefaultId(),
    costoCapataz: 150, costoAyudante: 75, cantAyudantes: 2,
    escaladores: mergeEscaladores([]),
    reductores: mergeReductores([]),
    fiscalIncluido: true, fiscalMinimo: 300, fiscalPct: 0.15,
    _completo: false
  };
}

// ---- Combina lo que Gerencia definió en el Maestro con lo que ya estaba
// guardado en esta obra en particular (para no perder selecciones hechas
// antes de que cambiara el Maestro). Se referencia siempre por `id`, nunca
// por posición, así que agregar/reordenar productos en el Maestro no rompe
// obras existentes.
function mergeMateriales(obraMateriales) {
  const porId = {};
  (obraMateriales || []).forEach(m => { if (m.id) porId[m.id] = m; });
  const usados = {};
  const result = (MAESTRO.materiales || []).map(mm => {
    usados[mm.id] = true;
    const ex = porId[mm.id];
    return {
      id: mm.id, categoria: mm.categoria, insumo: mm.insumo, proveedor: mm.proveedor, calculo: mm.calculo, unidad: mm.unidad,
      // Precio y consumo vienen SIEMPRE del Maestro: en el hito nadie los edita,
      // ni siquiera Gerencia. Se cambian desde ⚙ Precios y Materiales.
      unMt2: mm.unMt2,
      costoUn: mm.costoUn,
      incluye: ex ? !!ex.incluye : false
    };
  });
  (obraMateriales || []).forEach(m => {
    if (m.id && !usados[m.id] && m.incluye) result.push(Object.assign({}, m, { _inactivo: true }));
  });
  return result;
}

function mergePerifericos(obraPerifericos) {
  const porId = {};
  (obraPerifericos || []).forEach(p => { if (p.id) porId[p.id] = p; });
  const usados = {};
  const result = (MAESTRO.perifericos || []).map(mp => {
    usados[mp.id] = true;
    const ex = porId[mp.id];
    return {
      id: mp.id, insumo: mp.insumo, proveedor: mp.proveedor, unidad: mp.unidad,
      costoUn: mp.costoUn, // siempre del Maestro
      cantidad: ex ? ex.cantidad : 0,
      incluye: ex ? ((parseFloat(ex.cantidad) || 0) > 0) : false
    };
  });
  (obraPerifericos || []).forEach(p => {
    if (p.id && !usados[p.id] && (parseFloat(p.cantidad) || 0) > 0) result.push(Object.assign({}, p, { _inactivo: true, incluye: true }));
  });
  return result;
}

function mergeEscaladores(obraEsc) {
  const porId = {};
  (obraEsc || []).forEach(e => { if (e.id) porId[e.id] = e; });
  const usados = {};
  const result = (MAESTRO.escaladores || []).map(me => {
    usados[me.id] = true;
    const ex = porId[me.id];
    return { id: me.id, condicion: me.condicion, pct: me.pct, aplica: ex ? !!ex.aplica : false };
  });
  (obraEsc || []).forEach(e => {
    if (e.id && !usados[e.id] && e.aplica) result.push(Object.assign({}, e, { _inactivo: true }));
  });
  return result;
}

function mergeReductores(obraRed) {
  const porId = {};
  (obraRed || []).forEach(r => { if (r.id) porId[r.id] = r; });
  const usados = {};
  const result = (MAESTRO.reductores || []).map(mr => {
    usados[mr.id] = true;
    const ex = porId[mr.id];
    return { id: mr.id, condicion: mr.condicion, pct: mr.pct, aplica: ex ? !!ex.aplica : false };
  });
  (obraRed || []).forEach(r => {
    if (r.id && !usados[r.id] && r.aplica) result.push(Object.assign({}, r, { _inactivo: true }));
  });
  return result;
}

// ---- Cálculo de COSTOS (sin margen ni precio a cliente — eso está en H4).
// Es sólo para la vista previa en el navegador; el cálculo que realmente
// se guarda y usa para el financiero se hace en el servidor (Code.gs), que
// es la fuente de verdad de precios.
function h3CostoCalcular(d) {
  const mt2 = parseFloat(d.mt2) || 0;

  let costoMateriales = 0;
  d.materiales.forEach(m => { if (m.incluye) costoMateriales += (parseFloat(m.unMt2) || 0) * (parseFloat(m.costoUn) || 0); });

  let costoPerifericos = 0;
  d.perifericos.forEach(p => { if ((parseFloat(p.cantidad) || 0) > 0 && mt2 > 0) costoPerifericos += ((parseFloat(p.costoUn) || 0) * (parseFloat(p.cantidad) || 0)) / mt2; });

  const tipo = (MAESTRO.tipos || []).find(t => t.id === d.tipoColocacionId) || (MAESTRO.tipos || [])[0] || { costoMt2: 0 };
  const moBase = parseFloat(tipo.costoMt2) || 0;

  let totalAmpliacion = 0;
  d.escaladores.forEach(e => { if (e.aplica) totalAmpliacion += parseFloat(e.pct) || 0; });
  totalAmpliacion = Math.min(totalAmpliacion, 0.40);

  let totalReduccion = 0;
  d.reductores.forEach(r => { if (r.aplica) totalReduccion += parseFloat(r.pct) || 0; });

  const moAjustada = moBase * (1 + totalAmpliacion + totalReduccion);

  const fiscalCalculadoTotal = moAjustada * mt2 * d.fiscalPct;
  const fiscalTotal = d.fiscalIncluido ? Math.max(fiscalCalculadoTotal, d.fiscalMinimo) : 0;
  const fiscalMt2 = mt2 > 0 ? fiscalTotal / mt2 : 0;

  const costoTotalMt2 = costoMateriales + costoPerifericos + moAjustada + fiscalMt2;

  return {
    mt2, costoMateriales, costoPerifericos, moBase, totalAmpliacion, totalReduccion, moAjustada,
    fiscalMt2, fiscalTotal, costoTotalMt2,
    totalMateriales: costoMateriales * mt2, totalPerifericos: costoPerifericos * mt2,
    totalColocadores: moAjustada * mt2
  };
}

function renderH3(obra) {
  const raw = obra.h3 || h3Default();
  const d = {
    ...raw,
    materiales: mergeMateriales(raw.materiales),
    perifericos: mergePerifericos(raw.perifericos),
    escaladores: mergeEscaladores(raw.escaladores),
    reductores: mergeReductores(raw.reductores)
  };
  const calc = h3CostoCalcular(d);

  const tipoSeleccionadoExiste = (MAESTRO.tipos || []).some(t => t.id === d.tipoColocacionId);

  // Sólo Gerencia puede editar precios y parámetros de cálculo. El resto de
  // los roles los ve como texto fijo (y como no existe el <input>, collectH3
  // conserva automáticamente el valor guardado — no hay forma de pisarlo desde la UI).
  const esGerencia = currentUser.rol === 'gerencia';

  const materialesRows = d.materiales.map(m => `
    <tr ${m._inactivo ? 'style="opacity:0.55;"' : ''}>
      <td>${escapeHtml(m.categoria || '')}</td>
      <td>${escapeHtml(m.insumo)}${m._inactivo ? ' <span class="small-note">(dado de baja del Maestro)</span>' : ''}<div class="small-note">${escapeHtml(m.proveedor || '')}</div></td>
      <td class="num">${m.unMt2}</td>
      <td>${escapeHtml(m.unidad || '')}</td>
      <td class="num">$${(parseFloat(m.costoUn) || 0).toFixed(2)}</td>
      <td class="num">$${((parseFloat(m.unMt2) || 0) * (parseFloat(m.costoUn) || 0)).toFixed(2)}</td>
      <td style="text-align:center;"><input type="checkbox" id="mat_inc_${m.id}" ${m.incluye ? 'checked' : ''} onchange="refreshH3()"></td>
    </tr>
  `).join('');

  const perifericosRows = d.perifericos.map(p => `
    <tr ${p._inactivo ? 'style="opacity:0.55;"' : ''}>
      <td>${escapeHtml(p.insumo)}${p._inactivo ? ' <span class="small-note">(dado de baja del Maestro)</span>' : ''}<div class="small-note">${escapeHtml(p.proveedor || '')}</div></td>
      <td>${escapeHtml(p.unidad || '')}</td>
      <td class="num">$${(parseFloat(p.costoUn) || 0).toFixed(2)}</td>
      <td class="num"><input type="number" step="any" min="0" id="per_cant_${p.id}" value="${p.cantidad}" style="width:70px;" onchange="refreshH3()"></td>
    </tr>
  `).join('');

  const escaladoresRows = d.escaladores.map(e => `
    <tr ${e._inactivo ? 'style="opacity:0.55;"' : ''}>
      <td>${escapeHtml(e.condicion)}${e._inactivo ? ' <span class="small-note">(dado de baja)</span>' : ''}</td>
      <td class="num">${(e.pct * 100).toFixed(0)}%</td>
      <td style="text-align:center;"><input type="checkbox" id="esc_aplica_${e.id}" ${e.aplica ? 'checked' : ''} onchange="refreshH3()"></td>
    </tr>
  `).join('');

  const reductoresRows = d.reductores.map(r => `
    <tr ${r._inactivo ? 'style="opacity:0.55;"' : ''}>
      <td>${escapeHtml(r.condicion)}${r._inactivo ? ' <span class="small-note">(dado de baja)</span>' : ''}</td>
      <td class="num">${(r.pct * 100).toFixed(1)}%</td>
      <td style="text-align:center;"><input type="checkbox" id="red_aplica_${r.id}" ${r.aplica ? 'checked' : ''} onchange="refreshH3()"></td>
    </tr>
  `).join('');

  const compras = d.materiales.filter(m => m.incluye).map(m => ({
    ...m, cantidad: Math.round((parseFloat(m.unMt2) || 0) * calc.mt2 * 100) / 100,
    total: (parseFloat(m.unMt2) || 0) * calc.mt2 * (parseFloat(m.costoUn) || 0)
  }));
  const comprasServicios = d.perifericos.filter(p => (parseFloat(p.cantidad) || 0) > 0).map(p => ({
    ...p, total: (parseFloat(p.costoUn) || 0) * (parseFloat(p.cantidad) || 0)
  }));
  const totalCompras = compras.reduce((s, m) => s + m.total, 0) + comprasServicios.reduce((s, p) => s + p.total, 0);

  const _dirty = (typeof h3Dirty !== 'undefined' && h3Dirty);
  const _histo = renderHistorialObra(obra);
  return `
    <div class="section" style="border-color:${_dirty ? 'var(--warn, #c77700)' : 'var(--line)'};">
      <div class="section-title">Guardado de cambios</div>
      <div class="small-note">Los cambios de esta pantalla <b>no se aplican hasta que guardes</b>. Al guardar se te pide un comentario y se avisa por mail a Nicolás y Sandra con el detalle del cambio${'' /* + PDF si cambió la lista */} — si cambió la lista de compras, va adjunta en PDF con lo agregado marcado.</div>
      <div style="display:flex;align-items:center;gap:14px;margin-top:10px;">
        <button type="button" class="btn" onclick="abrirModalGuardarH3()">💾 Guardar cambios de compras</button>
        <span class="small-note" style="color:${_dirty ? 'var(--warn, #c77700)' : 'var(--ok, #1a7f37)'};font-weight:700;">${_dirty ? '● Hay cambios sin guardar' : '✓ Sin cambios pendientes'}</span>
      </div>
    </div>
  ` + `
    <div class="section">
      <div class="section-title">Datos de obra</div>
      <div class="field-grid">
        <div class="field"><label>Cliente</label><input type="text" id="h3_cliente" value="${escapeAttr(d.cliente)}"></div>
        <div class="field"><label>Mt² a colocar</label><input type="number" id="h3_mt2" value="${escapeAttr(d.mt2)}" onchange="refreshH3()"></div>
      </div>
    </div>

    <div class="section">
      <div class="section-title">Materiales</div>
      <table class="calc-table">
        <thead><tr><th>Categ.</th><th>Insumo</th><th>Un/Mt²</th><th>Unidad</th><th>Costo x Un</th><th>Costo x Mt²</th><th>Incl.</th></tr></thead>
        <tbody>${materialesRows}</tbody>
      </table>
      <div class="small-note" style="margin-top:10px;">Total materiales x Mt²: <strong>$${calc.costoMateriales.toFixed(2)}</strong></div>
      ${esGerencia ? `<div class="small-note" style="margin-top:6px;">Los precios y consumos no se editan acá: se cambian desde <span class="btn-ghost" style="padding:0;" onclick="abrirAdminMaestro()">⚙ Precios y Materiales</span> y toda obra activa los toma automáticamente.</div>` : `<div class="small-note" style="margin-top:6px;">Los precios y parámetros los define Gerencia. Si algo está desactualizado, avisale a Gerencia.</div>`}
    </div>

    <div class="section">
      <div class="section-title">Periféricos y servicios</div>
      <table class="calc-table">
        <thead><tr><th>Insumo</th><th>Unidad</th><th>Costo x Un</th><th>Cantidad</th></tr></thead>
        <tbody>${perifericosRows}</tbody>
      </table>
      <div class="small-note" style="margin-top:10px;">Total periféricos x Mt²: <strong>$${calc.costoPerifericos.toFixed(2)}</strong> — se incluye todo lo que tenga cantidad mayor a 0.</div>
    </div>

    <div class="section">
      <div class="section-title">Mano de obra</div>
      <div class="field-grid">
        <div class="field"><label>Tipo de colocación</label>
          <select id="h3_tipoColocacion" onchange="refreshH3()">
            ${(MAESTRO.tipos || []).map(t => `<option value="${t.id}" ${d.tipoColocacionId === t.id ? 'selected' : ''}>${escapeHtml(t.tipo)} ($${t.costoMt2}/m²)</option>`).join('')}
            ${!tipoSeleccionadoExiste && d.tipoColocacionId ? `<option value="${escapeAttr(d.tipoColocacionId)}" selected>(tipo dado de baja del Maestro — elegí uno nuevo)</option>` : ''}
          </select>
        </div>
        <div class="field"><label>Costo capataz/día</label><div class="small-note" style="padding:10px 0;">$${d.costoCapataz}</div></div>
        <div class="field"><label>Costo ayudante/día</label><div class="small-note" style="padding:10px 0;">$${d.costoAyudante}</div></div>
        <div class="field"><label>Cant. ayudantes</label><input type="number" id="h3_cantAyudantes" value="${d.cantAyudantes}"></div>
      </div>
      <div class="small-note" style="margin-top:10px;">Costo base MO x Mt²: <strong>$${calc.moBase.toFixed(0)}</strong> → Ajustado: <strong>$${calc.moAjustada.toFixed(0)}</strong></div>
    </div>

    <div class="section">
      <div class="section-title">Escaladores de dificultad (afectan sólo MO, tope 40%)</div>
      <table class="calc-table">
        <thead><tr><th>Condición</th><th>% Ampliación</th><th>Aplica</th></tr></thead>
        <tbody>${escaladoresRows}</tbody>
      </table>
      <div class="small-note" style="margin-top:10px;">Total ampliación aplicada: <strong>${(calc.totalAmpliacion * 100).toFixed(1)}%</strong></div>
    </div>

    <div class="section">
      <div class="section-title">Reductores por volumen</div>
      <table class="calc-table">
        <thead><tr><th>Condición</th><th>% Reducción</th><th>Aplica</th></tr></thead>
        <tbody>${reductoresRows}</tbody>
      </table>
      <div class="small-note" style="margin-top:10px;">Total reducción aplicada: <strong>${(calc.totalReduccion * 100).toFixed(1)}%</strong></div>
    </div>

    <div class="section">
      <div class="section-title">Fiscal técnico</div>
      <div class="check-row">
        <input type="checkbox" id="h3_fiscalIncluido" ${d.fiscalIncluido ? 'checked' : ''} onchange="refreshH3()">
        <div class="check-text">Incluir fiscal técnico en esta obra (15% sobre MO, mínimo USD 300)</div>
      </div>
      <div class="small-note" style="margin-top:8px;">Fiscal x Mt²: <strong>$${calc.fiscalMt2.toFixed(2)}</strong> — Total: <strong>$${calc.fiscalTotal.toFixed(2)}</strong></div>
    </div>

    <div class="section">
      <div class="section-title">Costo total x Mt²</div>
      <div class="stat-grid">
        <div class="stat-box accent"><div class="label">Costo Total x Mt²</div><div class="value">$${calc.costoTotalMt2.toFixed(2)}</div></div>
      </div>
      <div class="small-note" style="margin-top:8px;">Este es el costo de producción. El precio a cliente y la rentabilidad se definen en la solapa Financiero (sólo Gerencia).</div>
    </div>

    <div class="section">
      <div class="section-title">📋 Pedido de compras (auto-generado)</div>
      <table class="calc-table">
        <thead><tr><th>Insumo</th><th>Unidad</th><th>Cantidad</th><th>Costo x Un</th><th>Total</th></tr></thead>
        <tbody>
          ${compras.map(m => `<tr><td>${escapeHtml(m.insumo)}</td><td>${escapeHtml(m.unidad || '')}</td><td class="num">${m.cantidad}</td><td class="num">$${(parseFloat(m.costoUn) || 0).toFixed(2)}</td><td class="num">$${m.total.toFixed(2)}</td></tr>`).join('')}
          ${comprasServicios.map(p => `<tr><td>${escapeHtml(p.insumo)} <span class="small-note">(servicio)</span></td><td>${escapeHtml(p.unidad || '')}</td><td class="num">${p.cantidad}</td><td class="num">$${(parseFloat(p.costoUn) || 0).toFixed(2)}</td><td class="num">$${p.total.toFixed(2)}</td></tr>`).join('')}
          <tr class="total-row"><td colspan="4">TOTAL PEDIDO DE COMPRAS</td><td class="num">$${totalCompras.toFixed(2)}</td></tr>
        </tbody>
      </table>
      <div class="small-note" style="margin-top:8px;">⚠ Este pedido no incluye mano de obra ni márgenes. Solo materiales y servicios a contratar externamente.</div>
      <button type="button" class="btn-secondary" style="margin-top:12px;" onclick="window.print()">Imprimir / Exportar PDF</button>
    </div>

    <div class="section">
      <div class="section-title">💵 Orden de pago — Colocadores y Fiscal</div>
      <table class="calc-table">
        <thead><tr><th>Concepto</th><th>Costo x Mt²</th><th>Mt²</th><th>Total a pagar (USD)</th></tr></thead>
        <tbody>
          <tr><td>Colocadores</td><td class="num">$${calc.moAjustada.toFixed(0)}</td><td class="num">${calc.mt2}</td><td class="num">$${calc.totalColocadores.toFixed(0)}</td></tr>
          <tr><td>Fiscal técnico</td><td class="num">$${calc.fiscalMt2.toFixed(2)}</td><td class="num">${calc.mt2}</td><td class="num">$${calc.fiscalTotal.toFixed(2)}</td></tr>
          <tr class="total-row"><td colspan="3">TOTAL A PAGAR</td><td class="num">$${(calc.totalColocadores + calc.fiscalTotal).toFixed(2)}</td></tr>
        </tbody>
      </table>
      <div class="small-note" style="margin-top:8px;">⚠ Los montos de colocadores incluyen escaladores y reducciones activos. El fiscal cobra mínimo USD 300 por obra.</div>
    </div>

    <div class="section">
      <div class="section-title">Estado del hito</div>
      <div class="check-row">
        <input type="checkbox" id="h3_completo" ${d._completo ? 'checked' : ''} onchange="refreshH3()">
        <div class="check-text">Marcar H3 · Costos y compras como completo</div>
      </div>
    </div>
  ` + _histo;
}

function refreshH3() {
  currentObraData.h3 = collectH3();
  h3Dirty = true;
  document.getElementById('hito-content').innerHTML = renderH3(currentObraData);
  setSaveStatus('● Cambios sin guardar', 'error');
}

function collectH3() {
  const prev = currentObraData.h3 || h3Default();
  const prevMateriales = mergeMateriales(prev.materiales);
  const prevPerifericos = mergePerifericos(prev.perifericos);
  const prevEscaladores = mergeEscaladores(prev.escaladores);
  const prevReductores = mergeReductores(prev.reductores);

  // Precios y consumos NO se leen del DOM: ya no hay inputs para ellos.
  // Vienen del Maestro vía mergeMateriales/mergePerifericos, así lo guardado
  // siempre refleja el Maestro vigente.
  const materiales = prevMateriales.map(m => ({
    id: m.id, categoria: m.categoria, insumo: m.insumo, proveedor: m.proveedor, calculo: m.calculo, unidad: m.unidad,
    unMt2: m.unMt2,
    costoUn: m.costoUn,
    incluye: document.getElementById(`mat_inc_${m.id}`) ? document.getElementById(`mat_inc_${m.id}`).checked : m.incluye
  }));
  const perifericos = prevPerifericos.map(p => {
    const cantidad = document.getElementById(`per_cant_${p.id}`) ? (parseFloat(val(`per_cant_${p.id}`)) || 0) : (parseFloat(p.cantidad) || 0);
    return {
      id: p.id, insumo: p.insumo, proveedor: p.proveedor, unidad: p.unidad,
      costoUn: p.costoUn,
      cantidad,
      incluye: cantidad > 0 // ya no hay checkbox: se incluye si tiene cantidad
    };
  });
  const escaladores = prevEscaladores.map(e => ({
    id: e.id, condicion: e.condicion, pct: e.pct,
    aplica: document.getElementById(`esc_aplica_${e.id}`) ? document.getElementById(`esc_aplica_${e.id}`).checked : e.aplica
  }));
  const reductores = prevReductores.map(r => ({
    id: r.id, condicion: r.condicion, pct: r.pct,
    aplica: document.getElementById(`red_aplica_${r.id}`) ? document.getElementById(`red_aplica_${r.id}`).checked : r.aplica
  }));

  return {
    cliente: val('h3_cliente') || prev.cliente,
    mt2: val('h3_mt2') || prev.mt2,
    materiales, perifericos, escaladores, reductores,
    tipoColocacionId: document.getElementById('h3_tipoColocacion') ? document.getElementById('h3_tipoColocacion').value : prev.tipoColocacionId,
    costoCapataz: prev.costoCapataz, // sin input en el hito: sólo informativo
    costoAyudante: prev.costoAyudante,
    cantAyudantes: parseFloat(val('h3_cantAyudantes')) || prev.cantAyudantes,
    fiscalIncluido: document.getElementById('h3_fiscalIncluido') ? document.getElementById('h3_fiscalIncluido').checked : prev.fiscalIncluido,
    fiscalMinimo: prev.fiscalMinimo, fiscalPct: prev.fiscalPct,
    _completo: document.getElementById('h3_completo') ? document.getElementById('h3_completo').checked : false
  };
}


// ---- Historial de cambios y comentarios de la obra ----
function renderHistorialObra(obra) {
  const coms = obra.comentarios || [];
  const et = { h1:'H1', h2:'H2', h3:'Compras', h4:'Financiero', h5:'Remitos', cot:'Cotización', fotos:'Fotos' };
  return `
    <div class="section">
      <div class="section-title">📝 Historial de cambios y comentarios</div>
      ${coms.length === 0 ? '<div class="small-note">Sin movimientos registrados todavía. Cada guardado de compras con su comentario queda acá.</div>' :
        coms.map(c => `
        <div style="border-bottom:1px solid var(--line, #e5e5e5);padding:8px 0;">
          <div class="small-note"><b>${escapeHtml(c.usuario||'')}</b> · ${escapeHtml(String(c.fecha||''))} · ${et[c.hito]||escapeHtml(c.hito||'')}</div>
          <div style="font-size:12.5px;white-space:pre-wrap;margin-top:2px;">${escapeHtml(c.texto||'')}</div>
        </div>`).join('')}
    </div>`;
}

// ---- Diff local (vista previa en el modal, espejo del diff del servidor) ----
function diffH3Preview() {
  let viejo = null;
  try { viejo = h3Snapshot ? JSON.parse(h3Snapshot) : null; } catch(e) {}
  const nuevo = collectH3();
  const o = viejo || {};
  const t = [];
  const mt2o = parseFloat(o.mt2)||0, mt2n = parseFloat(nuevo.mt2)||0;
  if (mt2o !== mt2n) t.push('m²: ' + mt2o + ' → ' + mt2n);
  if ((o.tipoColocacionId||'') !== (nuevo.tipoColocacionId||'')) t.push('cambió el tipo de colocación');
  const om = {}; (o.materiales||[]).forEach(m=>{ om[m.id]=!!m.incluye; });
  (nuevo.materiales||[]).forEach(m=>{
    if (!om[m.id] && m.incluye) t.push('＋ ' + m.insumo);
    if (om[m.id] && !m.incluye) t.push('－ ' + m.insumo);
  });
  const op = {}; (o.perifericos||[]).forEach(p=>{ op[p.id]=parseFloat(p.cantidad)||0; });
  (nuevo.perifericos||[]).forEach(p=>{
    const a = op[p.id]||0, n = parseFloat(p.cantidad)||0;
    if (a===n) return;
    if (a===0 && n>0) t.push('＋ ' + p.insumo + ' × ' + n);
    else if (n===0) t.push('－ ' + p.insumo);
    else t.push(p.insumo + ': ' + a + ' → ' + n);
  });
  const togg = (oa, na, label) => {
    const m = {}; (oa||[]).forEach(x=>{ m[x.id]=!!x.aplica; });
    (na||[]).forEach(x=>{ if (!!m[x.id] !== !!x.aplica) t.push((x.aplica?'aplica ':'quita ') + label + ' "' + x.condicion + '"'); });
  };
  togg(o.escaladores, nuevo.escaladores, 'ampliación');
  togg(o.reductores, nuevo.reductores, 'reducción');
  if (!!o.fiscalIncluido !== !!nuevo.fiscalIncluido) t.push(nuevo.fiscalIncluido ? 'incluye fiscal de obra' : 'quita fiscal de obra');
  if (!!o._completo !== !!nuevo._completo) t.push(nuevo._completo ? 'marca H3 completo' : 'desmarca H3 completo');
  return t;
}

// ---- Modal: comentario del cambio + vista previa del diff ----
function abrirModalGuardarH3() {
  const cambios = diffH3Preview();
  const prev = document.getElementById('modalGuardarH3');
  if (prev) prev.remove();
  const div = document.createElement('div');
  div.id = 'modalGuardarH3';
  div.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.55);z-index:900;display:flex;align-items:center;justify-content:center;padding:16px;';
  div.innerHTML = `
    <div style="background:var(--panel, #fff);color:inherit;border-radius:12px;max-width:520px;width:100%;max-height:90vh;overflow:auto;padding:22px;border:1px solid var(--line, #ddd);">
      <h3 style="margin:0 0 10px;">Guardar cambios de compras</h3>
      <div class="small-note" style="margin-bottom:6px;">Cambios detectados que se van a aplicar:</div>
      <div style="font-size:12.5px;background:rgba(185,148,62,.08);border:1px solid var(--line,#ddd);border-radius:8px;padding:10px;margin-bottom:12px;max-height:180px;overflow:auto;">
        ${cambios.length ? cambios.map(c=>'• '+escapeHtml(c)).join('<br>') : '(sin cambios detectados — se registra solo el comentario)'}
      </div>
      <label style="font-size:12px;font-weight:700;">Comentario del cambio (va en el mail y queda en el historial)</label>
      <textarea id="gh3Comentario" rows="3" style="width:100%;margin:4px 0 14px;padding:8px;border:1px solid var(--line,#ddd);border-radius:8px;font:inherit;background:transparent;color:inherit;" placeholder="Ej: el cliente sumó la pérgola, agrego alfajías y 10 salchichas más"></textarea>
      <div style="display:flex;gap:10px;justify-content:flex-end;">
        <button type="button" class="btn-ghost" onclick="document.getElementById('modalGuardarH3').remove()">Cancelar</button>
        <button type="button" class="btn" id="gh3Btn" onclick="confirmarGuardarH3()">✓ Guardar y notificar</button>
      </div>
    </div>`;
  document.body.appendChild(div);
}

async function confirmarGuardarH3() {
  const btn = document.getElementById('gh3Btn');
  btn.disabled = true; btn.textContent = 'Guardando…';
  const comentario = document.getElementById('gh3Comentario').value.trim();
  const res = await guardarH3ConComentario(comentario);
  const modal = document.getElementById('modalGuardarH3');
  if (modal) modal.remove();
  if (res.ok) { await reloadObra(); }
  else { alert('Error al guardar: ' + (res.error||'')); }
}
