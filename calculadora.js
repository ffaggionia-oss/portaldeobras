// ============================================
// CALCULADORA DE COLOCADORES — pública, sin login
// Usa exactamente la misma fórmula que H3 (tipo de trabajo + escaladores/
// reductores) para que un colocador pueda estimar cuánto le corresponde
// cobrar por una obra, sin necesitar código de acceso ni ver datos de
// obras reales. No calcula margen ni precio a cliente (eso es H4/Gerencia).
//
// Los tipos de trabajo, escaladores y reductores YA NO están hardcodeados
// acá: se piden al backend (action=getMaestroPublico, sin token) que sólo
// devuelve esos tres — nunca materiales, periféricos ni márgenes.
// ============================================

let CALC_PUBLICA_DATA = null;

async function renderCalculadoraPublica() {
  const app = document.getElementById('app');
  document.getElementById('connStatus').textContent = '';
  document.getElementById('topbarUser').innerHTML = `<span class="btn-ghost" onclick="renderLogin()">← Volver al login</span>`;

  app.innerHTML = `<div style="max-width:640px; margin:0 auto;"><div class="empty-state">Cargando calculadora...</div></div>`;

  if (!CALC_PUBLICA_DATA) {
    try {
      const res = await API.getMaestroPublico();
      if (!res.ok) throw new Error(res.error || 'No se pudo cargar la calculadora');
      CALC_PUBLICA_DATA = res;
    } catch (err) {
      app.innerHTML = `<div class="empty-state"><div class="big">No se pudo cargar la calculadora</div><p>${escapeHtml(err.message)}</p></div>`;
      return;
    }
  }

  const { tipos, escaladores, reductores } = CALC_PUBLICA_DATA;

  app.innerHTML = `
    <div style="max-width:640px; margin:0 auto;">
      <div class="list-header"><h1>Calculadora de Colocadores</h1></div>
      <div class="small-note" style="margin-bottom:16px;">
        Calculá cuánto corresponde cobrar por una obra según el tipo de trabajo y las condiciones del lugar.
        No hace falta código de acceso. Este cálculo es orientativo — el monto final lo confirma Franco antes de empezar la obra.
      </div>

      <div class="section">
        <div class="section-title">Datos de obra</div>
        <div class="field">
          <label>Mt² a colocar</label>
          <input type="number" id="calc_mt2" step="any" placeholder="Ej: 386.45" oninput="refreshCalcPublica()">
        </div>
      </div>

      <div class="section">
        <div class="section-title">Tipo de trabajo — elegí uno solo</div>
        <select id="calc_tipo" onchange="refreshCalcPublica()">
          ${tipos.map((t, i) => `<option value="${escapeAttr(t.id)}" ${i === 1 ? 'selected' : ''}>${escapeHtml(t.tipo)} ($${t.costoMt2}/m²)</option>`).join('')}
        </select>
      </div>

      <div class="section">
        <div class="section-title">Condiciones de obra — marcá todas las que apliquen</div>
        ${escaladores.map(e => `
          <div class="check-row">
            <input type="checkbox" id="calc_esc_${e.id}" onchange="refreshCalcPublica()">
            <div class="check-text">${escapeHtml(e.condicion)} <span style="color:var(--warn);">(+${(e.pct * 100).toFixed(0)}%)</span></div>
          </div>
        `).join('')}
        <div class="small-note" style="margin:14px 0 4px; font-weight:600; text-transform:uppercase; letter-spacing:0.5px;">Reducciones por volumen</div>
        ${reductores.map(r => `
          <div class="check-row">
            <input type="checkbox" id="calc_red_${r.id}" onchange="refreshCalcPublica()">
            <div class="check-text">${escapeHtml(r.condicion)} <span style="color:var(--ok);">(${(r.pct * 100).toFixed(1)}%)</span></div>
          </div>
        `).join('')}
        <div class="small-note" style="margin-top:10px;">⚠ Marcá solo un tipo de trabajo. La ampliación total está topeada en 40%, igual que en el sistema interno.</div>
      </div>

      <div class="section">
        <div class="section-title">Resumen — lo que cobrás</div>
        <div class="stat-grid">
          <div class="stat-box"><div class="label">Costo base x Mt²</div><div class="value" id="calc_base">$0.00</div></div>
          <div class="stat-box"><div class="label">Costo ajustado x Mt²</div><div class="value" id="calc_ajustado">$0.00</div></div>
          <div class="stat-box accent"><div class="label">Total a cobrar</div><div class="value" id="calc_total">$0.00</div></div>
        </div>
        <div class="small-note" style="margin-top:10px;">⚠ Este cálculo es orientativo. El monto final lo confirma Franco antes del inicio de obra.</div>
      </div>
    </div>
  `;
  refreshCalcPublica();
}

function refreshCalcPublica() {
  if (!CALC_PUBLICA_DATA) return;
  const { tipos, escaladores, reductores } = CALC_PUBLICA_DATA;

  const mt2 = parseFloat(document.getElementById('calc_mt2').value) || 0;
  const tipoId = document.getElementById('calc_tipo').value;
  const tipo = tipos.find(t => t.id === tipoId) || tipos[0] || { costoMt2: 0 };

  let totalAmpliacion = 0;
  escaladores.forEach(e => {
    const chk = document.getElementById('calc_esc_' + e.id);
    if (chk && chk.checked) totalAmpliacion += parseFloat(e.pct) || 0;
  });
  totalAmpliacion = Math.min(totalAmpliacion, 0.40);

  let totalReduccion = 0;
  reductores.forEach(r => {
    const chk = document.getElementById('calc_red_' + r.id);
    if (chk && chk.checked) totalReduccion += parseFloat(r.pct) || 0;
  });

  const ajustado = (parseFloat(tipo.costoMt2) || 0) * (1 + totalAmpliacion + totalReduccion);
  const total = ajustado * mt2;

  document.getElementById('calc_base').textContent = '$' + Math.round(tipo.costoMt2);
  document.getElementById('calc_ajustado').textContent = '$' + Math.round(ajustado);
  document.getElementById('calc_total').textContent = '$' + Math.round(total).toLocaleString('es-AR');
}
