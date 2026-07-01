// ============================================
// H3 — Cálculo de Costos / Pedido de Compras / Orden de Pago
// La parte financiera (precio a cliente, márgenes, rentabilidad) vive en H4 (Financiero),
// visible sólo para Gerencia. Acá sólo hay costos, no ganancia.
// ============================================

const H3_MATERIALES_DEFAULT = [
  {categoria:'Revestimientos', insumo:'Perfil PGO 37 x 0,94 mm x 6,00 mts', proveedor:'CMP / EnSeco', unMt2:3, unidad:'Mt/L', costoUn:2.80, incluye:false},
  {categoria:'Revestimientos', insumo:'Perfil PGO 22 x 0,94 mm x 3,00 mts', proveedor:'CMP / EnSeco', unMt2:3, unidad:'Mt/L', costoUn:2.05, incluye:false},
  {categoria:'Revestimientos', insumo:'Pino CCA 1x3', proveedor:'Maderera Newton', unMt2:3, unidad:'Mt/L', costoUn:2.00, incluye:false},
  {categoria:'Revestimientos', insumo:'Pino CCA 2x2', proveedor:'Maderera Newton', unMt2:3, unidad:'Mt/L', costoUn:2.00, incluye:false},
  {categoria:'Revestimientos', insumo:'Tornillo Ø8 × 70 mm + Tarugo Nylon 8 (Par)', proveedor:'Bulonera Tigre', unMt2:3, unidad:'Pares', costoUn:0.03, incluye:false},
  {categoria:'Revestimientos', insumo:'Tornillo Ø8 × 50 mm + Tarugo Nylon 8 (Par)', proveedor:'Bulonera Tigre', unMt2:3, unidad:'Pares', costoUn:0.03, incluye:false},
  {categoria:'Revestimientos', insumo:'Tornillo KKTN Negro 5x40 mm', proveedor:'Rothoblaas', unMt2:25, unidad:'Unidades', costoUn:0.15, incluye:false},
  {categoria:'Revestimientos', insumo:'Tornillo KKAN 5x40 mm', proveedor:'Rothoblaas', unMt2:25, unidad:'Unidades', costoUn:0.30, incluye:false},
  {categoria:'Revestimientos', insumo:'Tornillo SHS 3,5x30 mm', proveedor:'Rothoblaas', unMt2:15, unidad:'Unidades', costoUn:0.05, incluye:false},
  {categoria:'Revestimientos', insumo:'Grampas (cualquier tamaño)', proveedor:'Colocador', unMt2:0, unidad:'', costoUn:0, incluye:false},
  {categoria:'Decks', insumo:'PCG Galvanizado 80x40x15x1,6 mm — Viguetas', proveedor:'En Seco / Mundo Hierro / CMP', calculo:'Cada 0,40 mt', unMt2:3, unidad:'Mt/L', costoUn:3.65, incluye:false},
  {categoria:'Decks', insumo:'PCG Galvanizado 80x40x15x1,6 mm — Perímetro', proveedor:'En Seco / Mundo Hierro / CMP', calculo:'Perímetro/Mt²', unMt2:1.33, unidad:'Mt/L', costoUn:3.65, incluye:false},
  {categoria:'Decks', insumo:'PCG Galvanizado 80x40x15x1,6 mm — Patas', proveedor:'En Seco / Mundo Hierro / CMP', calculo:'3,5 patas x Mt²', unMt2:0.52, unidad:'Mt/L', costoUn:3.65, incluye:false},
  {categoria:'Decks', insumo:'PCG Galvanizado 80x40x15x1,6 mm — Bloqueos y desperdicio', proveedor:'En Seco / Mundo Hierro / CMP', calculo:'2 × Espacio Interno', unMt2:0.80, unidad:'Mt/L', costoUn:3.65, incluye:false},
  {categoria:'Decks', insumo:'Clip Thermory T4 o PC Clips', proveedor:'Thermory', calculo:'3 U. x Mt/l', unMt2:25, unidad:'Unidades', costoUn:0.30, incluye:false},
  {categoria:'Decks', insumo:'Tornillo P/Clip KKAN 4x30 mm', proveedor:'Rothoblaas / Bulonera', unMt2:25, unidad:'Unidades', costoUn:0.15, incluye:false},
  {categoria:'Pisos', insumo:'Manta', proveedor:'MercadoLibre', unMt2:1, unidad:'Mt²', costoUn:2.21, incluye:false},
  {categoria:'Pisos', insumo:'Nylon 200 Micrones', proveedor:'MercadoLibre', unMt2:1, unidad:'Mt²', costoUn:1.00, incluye:false},
  {categoria:'Pisos', insumo:'Pegamento Elástico Base Xilano', proveedor:'Bona / Kekol / Mapei', calculo:'1 kg/mt²', unMt2:1, unidad:'Kg', costoUn:7.50, incluye:false},
  {categoria:'Pisos', insumo:'Zócalo 10 cm', proveedor:'AlpaMat / Parky', unMt2:0.7, unidad:'Mt/l', costoUn:6.00, incluye:false}
];

const H3_PERIFERICOS_DEFAULT = [
  {insumo:'Transporte a Obra', proveedor:'Gargano', unidad:'Viaje', costoUn:250, cantidad:1, incluye:true},
  {insumo:'Andamios — 2 cuerpos/mes + 3 tablones', proveedor:'Amaplac', unidad:'Total', costoUn:95, cantidad:0, incluye:false},
  {insumo:'Andamios — 3 cuerpos/mes + 3 tablones', proveedor:'Amaplac', unidad:'Total', costoUn:120, cantidad:0, incluye:false},
  {insumo:'Pintura Asfáltica al Agua Protex 400 Lt', proveedor:'Protex', unidad:'Tanque 400 lt', costoUn:300, cantidad:0, incluye:false},
  {insumo:'Volquete', proveedor:'-', unidad:'Unidad', costoUn:70, cantidad:0, incluye:false},
  {insumo:'Silicona PU 40', proveedor:'Unipega', unidad:'Pomo', costoUn:7, cantidad:0, incluye:false}
];

const H3_TIPOS_COLOCACION = [
  {tipo:'Imprimación de Muro Previo', rendimiento:60, costoMt2:5},
  {tipo:'Colocación de Revestimiento', rendimiento:15, costoMt2:20},
  {tipo:'Colocación de Decks Sobre Carpeta Directa', rendimiento:15, costoMt2:20},
  {tipo:'Colocación de Decks + Estructura Galv./Madera', rendimiento:8, costoMt2:37.5},
  {tipo:'Remoción Piso Existente', rendimiento:33, costoMt2:9.09},
  {tipo:'Colocación Piso Pegado + Zócalos', rendimiento:18.75, costoMt2:16},
  {tipo:'Colocación Piso Flotante + Zócalos', rendimiento:21.43, costoMt2:14},
];

const H3_ESCALADORES_DEFAULT = [
  {condicion:'Desarraigo', pct:0.25, aplica:false},
  {condicion:'Cieloraso con estructura', pct:0.12, aplica:false},
  {condicion:'Trabajo en Altura', pct:0.12, aplica:false},
  {condicion:'Acceso Difícil', pct:0.10, aplica:false},
  {condicion:'Trabajo Nocturno', pct:0.15, aplica:false},
  {condicion:'Extra Zona (3er Cordón)', pct:0.08, aplica:false},
  {condicion:'Diseño Complejo', pct:0.10, aplica:false},
  {condicion:'Obra < 20 mt²', pct:0.25, aplica:false},
  {condicion:'Obra < 40 mt²', pct:0.15, aplica:false}
];

const H3_REDUCTORES_DEFAULT = [
  {condicion:'Obra 200–300 mt²', pct:-0.08, aplica:false},
  {condicion:'Obra 300–500 mt²', pct:-0.10, aplica:false},
  {condicion:'Obra 500–1000 mt²', pct:-0.125, aplica:false}
];

function h3Default() {
  return {
    cliente: '', mt2: '',
    materiales: JSON.parse(JSON.stringify(H3_MATERIALES_DEFAULT)),
    perifericos: JSON.parse(JSON.stringify(H3_PERIFERICOS_DEFAULT)),
    tipoColocacionIdx: 1,
    costoCapataz: 150, costoAyudante: 75, cantAyudantes: 2,
    escaladores: JSON.parse(JSON.stringify(H3_ESCALADORES_DEFAULT)),
    reductores: JSON.parse(JSON.stringify(H3_REDUCTORES_DEFAULT)),
    fiscalIncluido: true, fiscalMinimo: 300, fiscalPct: 0.15,
    _completo: false
  };
}

// ---- Cálculo de COSTOS (sin margen ni precio a cliente — eso está en H4) ----
function h3CostoCalcular(d) {
  const mt2 = parseFloat(d.mt2) || 0;

  let costoMateriales = 0;
  d.materiales.forEach(m => {
    if (m.incluye) costoMateriales += (parseFloat(m.unMt2)||0) * (parseFloat(m.costoUn)||0);
  });

  let costoPerifericos = 0;
  d.perifericos.forEach(p => {
    if (p.incluye && mt2 > 0) costoPerifericos += ((parseFloat(p.costoUn)||0) * (parseFloat(p.cantidad)||0)) / mt2;
  });

  const tipo = H3_TIPOS_COLOCACION[d.tipoColocacionIdx] || H3_TIPOS_COLOCACION[0];
  const moBase = tipo.costoMt2;

  let totalAmpliacion = 0;
  d.escaladores.forEach(e => { if (e.aplica) totalAmpliacion += e.pct; });
  totalAmpliacion = Math.min(totalAmpliacion, 0.40);

  let totalReduccion = 0;
  d.reductores.forEach(r => { if (r.aplica) totalReduccion += r.pct; });

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
  const d = obra.h3 || h3Default();
  const calc = h3CostoCalcular(d);

  const materialesRows = d.materiales.map((m, i) => `
    <tr>
      <td>${escapeHtml(m.categoria||'')}</td>
      <td>${escapeHtml(m.insumo)}<div class="small-note">${escapeHtml(m.proveedor||'')}</div></td>
      <td class="num"><input type="number" step="any" id="mat_unmt2_${i}" value="${m.unMt2}" style="width:70px;"></td>
      <td>${escapeHtml(m.unidad||'')}</td>
      <td class="num"><input type="number" step="any" id="mat_costo_${i}" value="${m.costoUn}" style="width:80px;"></td>
      <td class="num">$${((parseFloat(m.unMt2)||0)*(parseFloat(m.costoUn)||0)).toFixed(2)}</td>
      <td style="text-align:center;"><input type="checkbox" id="mat_inc_${i}" ${m.incluye?'checked':''} onchange="refreshH3()"></td>
    </tr>
  `).join('');

  const perifericosRows = d.perifericos.map((p, i) => `
    <tr>
      <td>${escapeHtml(p.insumo)}<div class="small-note">${escapeHtml(p.proveedor||'')}</div></td>
      <td>${escapeHtml(p.unidad||'')}</td>
      <td class="num"><input type="number" step="any" id="per_costo_${i}" value="${p.costoUn}" style="width:80px;"></td>
      <td class="num"><input type="number" step="any" id="per_cant_${i}" value="${p.cantidad}" style="width:70px;" onchange="refreshH3()"></td>
      <td style="text-align:center;"><input type="checkbox" id="per_inc_${i}" ${p.incluye?'checked':''} onchange="refreshH3()"></td>
    </tr>
  `).join('');

  const escaladoresRows = d.escaladores.map((e, i) => `
    <tr>
      <td>${escapeHtml(e.condicion)}</td>
      <td class="num">${(e.pct*100).toFixed(0)}%</td>
      <td style="text-align:center;"><input type="checkbox" id="esc_aplica_${i}" ${e.aplica?'checked':''} onchange="refreshH3()"></td>
    </tr>
  `).join('');

  const reductoresRows = d.reductores.map((r, i) => `
    <tr>
      <td>${escapeHtml(r.condicion)}</td>
      <td class="num">${(r.pct*100).toFixed(1)}%</td>
      <td style="text-align:center;"><input type="checkbox" id="red_aplica_${i}" ${r.aplica?'checked':''} onchange="refreshH3()"></td>
    </tr>
  `).join('');

  const compras = d.materiales.filter(m => m.incluye).map(m => ({
    ...m, cantidad: Math.round((parseFloat(m.unMt2)||0) * calc.mt2 * 100)/100,
    total: (parseFloat(m.unMt2)||0) * calc.mt2 * (parseFloat(m.costoUn)||0)
  }));
  const comprasServicios = d.perifericos.filter(p => p.incluye).map(p => ({
    ...p, total: (parseFloat(p.costoUn)||0) * (parseFloat(p.cantidad)||0)
  }));
  const totalCompras = compras.reduce((s,m)=>s+m.total,0) + comprasServicios.reduce((s,p)=>s+p.total,0);

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
    </div>

    <div class="section">
      <div class="section-title">Periféricos y servicios</div>
      <table class="calc-table">
        <thead><tr><th>Insumo</th><th>Unidad</th><th>Costo x Un</th><th>Cantidad</th><th>Incl.</th></tr></thead>
        <tbody>${perifericosRows}</tbody>
      </table>
      <div class="small-note" style="margin-top:10px;">Total periféricos x Mt²: <strong>$${calc.costoPerifericos.toFixed(2)}</strong></div>
    </div>

    <div class="section">
      <div class="section-title">Mano de obra</div>
      <div class="field-grid">
        <div class="field"><label>Tipo de colocación</label>
          <select id="h3_tipoColocacion" onchange="refreshH3()">
            ${H3_TIPOS_COLOCACION.map((t,i) => `<option value="${i}" ${d.tipoColocacionIdx==i?'selected':''}>${t.tipo} ($${t.costoMt2}/m²)</option>`).join('')}
          </select>
        </div>
        <div class="field"><label>Costo capataz/día</label><input type="number" id="h3_costoCapataz" value="${d.costoCapataz}"></div>
        <div class="field"><label>Costo ayudante/día</label><input type="number" id="h3_costoAyudante" value="${d.costoAyudante}"></div>
        <div class="field"><label>Cant. ayudantes</label><input type="number" id="h3_cantAyudantes" value="${d.cantAyudantes}"></div>
      </div>
      <div class="small-note" style="margin-top:10px;">Costo base MO x Mt²: <strong>$${calc.moBase.toFixed(2)}</strong> → Ajustado: <strong>$${calc.moAjustada.toFixed(2)}</strong></div>
    </div>

    <div class="section">
      <div class="section-title">Escaladores de dificultad (afectan sólo MO, tope 40%)</div>
      <table class="calc-table">
        <thead><tr><th>Condición</th><th>% Ampliación</th><th>Aplica</th></tr></thead>
        <tbody>${escaladoresRows}</tbody>
      </table>
      <div class="small-note" style="margin-top:10px;">Total ampliación aplicada: <strong>${(calc.totalAmpliacion*100).toFixed(1)}%</strong></div>
    </div>

    <div class="section">
      <div class="section-title">Reductores por volumen</div>
      <table class="calc-table">
        <thead><tr><th>Condición</th><th>% Reducción</th><th>Aplica</th></tr></thead>
        <tbody>${reductoresRows}</tbody>
      </table>
      <div class="small-note" style="margin-top:10px;">Total reducción aplicada: <strong>${(calc.totalReduccion*100).toFixed(1)}%</strong></div>
    </div>

    <div class="section">
      <div class="section-title">Fiscal técnico</div>
      <div class="check-row">
        <input type="checkbox" id="h3_fiscalIncluido" ${d.fiscalIncluido?'checked':''} onchange="refreshH3()">
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
          ${compras.map(m => `<tr><td>${escapeHtml(m.insumo)}</td><td>${escapeHtml(m.unidad||'')}</td><td class="num">${m.cantidad}</td><td class="num">$${(parseFloat(m.costoUn)||0).toFixed(2)}</td><td class="num">$${m.total.toFixed(2)}</td></tr>`).join('')}
          ${comprasServicios.map(p => `<tr><td>${escapeHtml(p.insumo)} <span class="small-note">(servicio)</span></td><td>${escapeHtml(p.unidad||'')}</td><td class="num">${p.cantidad}</td><td class="num">$${(parseFloat(p.costoUn)||0).toFixed(2)}</td><td class="num">$${p.total.toFixed(2)}</td></tr>`).join('')}
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
          <tr><td>Colocadores</td><td class="num">$${calc.moAjustada.toFixed(2)}</td><td class="num">${calc.mt2}</td><td class="num">$${calc.totalColocadores.toFixed(2)}</td></tr>
          <tr><td>Fiscal técnico</td><td class="num">$${calc.fiscalMt2.toFixed(2)}</td><td class="num">${calc.mt2}</td><td class="num">$${calc.fiscalTotal.toFixed(2)}</td></tr>
          <tr class="total-row"><td colspan="3">TOTAL A PAGAR</td><td class="num">$${(calc.totalColocadores+calc.fiscalTotal).toFixed(2)}</td></tr>
        </tbody>
      </table>
      <div class="small-note" style="margin-top:8px;">⚠ Los montos de colocadores incluyen escaladores y reducciones activos. El fiscal cobra mínimo USD 300 por obra.</div>
    </div>

    <div class="section">
      <div class="section-title">Estado del hito</div>
      <div class="check-row">
        <input type="checkbox" id="h3_completo" ${d._completo?'checked':''} onchange="scheduleAutosave()">
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
  const materiales = H3_MATERIALES_DEFAULT.map((base, i) => ({
    ...base,
    unMt2: parseFloat(val(`mat_unmt2_${i}`)) || 0,
    costoUn: parseFloat(val(`mat_costo_${i}`)) || 0,
    incluye: document.getElementById(`mat_inc_${i}`) ? document.getElementById(`mat_inc_${i}`).checked : base.incluye
  }));
  const perifericos = H3_PERIFERICOS_DEFAULT.map((base, i) => ({
    ...base,
    costoUn: parseFloat(val(`per_costo_${i}`)) || 0,
    cantidad: parseFloat(val(`per_cant_${i}`)) || 0,
    incluye: document.getElementById(`per_inc_${i}`) ? document.getElementById(`per_inc_${i}`).checked : base.incluye
  }));
  const escaladores = H3_ESCALADORES_DEFAULT.map((base, i) => ({
    ...base,
    aplica: document.getElementById(`esc_aplica_${i}`) ? document.getElementById(`esc_aplica_${i}`).checked : base.aplica
  }));
  const reductores = H3_REDUCTORES_DEFAULT.map((base, i) => ({
    ...base,
    aplica: document.getElementById(`red_aplica_${i}`) ? document.getElementById(`red_aplica_${i}`).checked : base.aplica
  }));

  return {
    cliente: val('h3_cliente') || prev.cliente,
    mt2: val('h3_mt2') || prev.mt2,
    materiales, perifericos, escaladores, reductores,
    tipoColocacionIdx: document.getElementById('h3_tipoColocacion') ? parseInt(document.getElementById('h3_tipoColocacion').value) : prev.tipoColocacionIdx,
    costoCapataz: parseFloat(val('h3_costoCapataz')) || prev.costoCapataz,
    costoAyudante: parseFloat(val('h3_costoAyudante')) || prev.costoAyudante,
    cantAyudantes: parseFloat(val('h3_cantAyudantes')) || prev.cantAyudantes,
    fiscalIncluido: document.getElementById('h3_fiscalIncluido') ? document.getElementById('h3_fiscalIncluido').checked : prev.fiscalIncluido,
    fiscalMinimo: prev.fiscalMinimo, fiscalPct: prev.fiscalPct,
    _completo: document.getElementById('h3_completo') ? document.getElementById('h3_completo').checked : false
  };
}
