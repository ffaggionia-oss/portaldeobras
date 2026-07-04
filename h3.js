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
      unMt2: ex ? ex.unMt2 : mm.unMt2,
      costoUn: ex ? ex.costoUn : mm.costoUn,
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
      costoUn: ex ? ex.costoUn : mp.costoUn,
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
      <td class="num">${esGerencia ? `<input type="number" step="any" id="mat_unmt2_${m.id}" value="${m.unMt2}" style="width:70px;">` : `${m.unMt2}`}</td>
      <td>${escapeHtml(m.unidad || '')}</td>
      <td class="num">${esGerencia ? `<input type="number" step="any" id="mat_costo_${m.id}" value="${m.costoUn}" style="width:80px;">` : `$${(parseFloat(m.costoUn) || 0).toFixed(2)}`}</td>
      <td class="num">$${((parseFloat(m.unMt2) || 0) * (parseFloat(m.costoUn) || 0)).toFixed(2)}</td>
      <td style="text-align:center;"><input type="checkbox" id="mat_inc_${m.id}" ${m.incluye ? 'checked' : ''} onchange="refreshH3()"></td>
    </tr>
  `).join('');

  const perifericosRows = d.perifericos.map(p => `
    <tr ${p._inactivo ? 'style="opacity:0.55;"' : ''}>
      <td>${escapeHtml(p.insumo)}${p._inactivo ? ' <span class="small-note">(dado de baja del Maestro)</span>' : ''}<div class="small-note">${escapeHtml(p.proveedor || '')}</div></td>
      <td>${escapeHtml(p.unidad || '')}</td>
      <td class="num">${esGerencia ? `<input type="number" step="any" id="per_costo_${p.id}" value="${p.costoUn}" style="width:80px;">` : `$${(parseFloat(p.costoUn) || 0).toFixed(2)}`}</td>
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

  return `
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
      ${esGerencia ? `<div class="small-note" style="margin-top:6px;">¿Falta un material o cambió un precio? Se edita desde <span class="btn-ghost" style="padding:0;" onclick="abrirAdminMaestro()">⚙ Precios y Materiales</span>.</div>` : `<div class="small-note" style="margin-top:6px;">Los precios y parámetros los define Gerencia. Si algo está desactualizado, avisale a Gerencia.</div>`}
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
        <div class="field"><label>Costo capataz/día</label>${esGerencia ? `<input type="number" id="h3_costoCapataz" value="${d.costoCapataz}">` : `<div class="small-note" style="padding:10px 0;">$${d.costoCapataz}</div>`}</div>
        <div class="field"><label>Costo ayudante/día</label>${esGerencia ? `<input type="number" id="h3_costoAyudante" value="${d.costoAyudante}">` : `<div class="small-note" style="padding:10px 0;">$${d.costoAyudante}</div>`}</div>
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
        <input type="checkbox" id="h3_completo" ${d._completo ? 'checked' : ''} onchange="scheduleAutosave()">
        <div class="check-text">Marcar H3 · Costos y compras como completo</div>
      </div>
    </div>
  `;
}

function refreshH3() {
  currentObraData.h3 = collectH3();
  document.getElementById('hito-content').innerHTML = renderH3(currentObraData);
}

function collectH3() {
  const prev = currentObraData.h3 || h3Default();
  const prevMateriales = mergeMateriales(prev.materiales);
  const prevPerifericos = mergePerifericos(prev.perifericos);
  const prevEscaladores = mergeEscaladores(prev.escaladores);
  const prevReductores = mergeReductores(prev.reductores);

  const materiales = prevMateriales.map(m => ({
    id: m.id, categoria: m.categoria, insumo: m.insumo, proveedor: m.proveedor, calculo: m.calculo, unidad: m.unidad,
    unMt2: document.getElementById(`mat_unmt2_${m.id}`) ? (parseFloat(val(`mat_unmt2_${m.id}`)) || 0) : m.unMt2,
    costoUn: document.getElementById(`mat_costo_${m.id}`) ? (parseFloat(val(`mat_costo_${m.id}`)) || 0) : m.costoUn,
    incluye: document.getElementById(`mat_inc_${m.id}`) ? document.getElementById(`mat_inc_${m.id}`).checked : m.incluye
  }));
  const perifericos = prevPerifericos.map(p => {
    const cantidad = document.getElementById(`per_cant_${p.id}`) ? (parseFloat(val(`per_cant_${p.id}`)) || 0) : (parseFloat(p.cantidad) || 0);
    return {
      id: p.id, insumo: p.insumo, proveedor: p.proveedor, unidad: p.unidad,
      costoUn: document.getElementById(`per_costo_${p.id}`) ? (parseFloat(val(`per_costo_${p.id}`)) || 0) : p.costoUn,
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
    costoCapataz: parseFloat(val('h3_costoCapataz')) || prev.costoCapataz,
    costoAyudante: parseFloat(val('h3_costoAyudante')) || prev.costoAyudante,
    cantAyudantes: parseFloat(val('h3_cantAyudantes')) || prev.cantAyudantes,
    fiscalIncluido: document.getElementById('h3_fiscalIncluido') ? document.getElementById('h3_fiscalIncluido').checked : prev.fiscalIncluido,
    fiscalMinimo: prev.fiscalMinimo, fiscalPct: prev.fiscalPct,
    _completo: document.getElementById('h3_completo') ? document.getElementById('h3_completo').checked : false
  };
}
