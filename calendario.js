// ============================================
// 📅 CALENDARIO DE COLOCADORES
// Vista general (no es por obra): qué obras y postventas tiene asignadas
// cada colocador y con qué fecha de entrada estimada. La ASIGNACIÓN vive
// en H2 (o en el resumen de la postventa) — si cambia allá, cambia acá.
// La FECHA sí se edita desde acá, sin abrir la obra.
// ============================================

async function abrirCalendario() {
  const app = document.getElementById('app');
  app.innerHTML = `
    <div class="back-link" onclick="goHome()">← Volver a obras</div>
    <div class="list-header"><h1>📅 Calendario de colocadores</h1></div>
    <div class="small-note" style="margin-bottom:14px;">
      La asignación de colocador se define en <b>H2 · Sistema constructivo</b> (o en el resumen de la postventa) y acá se refleja sola.
      Lo que sí se carga acá es la <b>fecha de entrada estimada</b> de cada trabajo — con eso los chicos ven qué tiene pendiente cada uno y en qué orden.
    </div>
    <div id="calContenido"><div class="empty-state">Cargando…</div></div>
  `;
  try {
    const res = await API.calendario(currentUser.token);
    if (!res.ok) throw new Error(res.error);
    renderCalendario_(res.items || []);
  } catch (err) {
    document.getElementById('calContenido').innerHTML = `<div class="empty-state">No pude cargar el calendario: ${escapeHtml(String(err.message || err))}</div>`;
  }
}

function calOrdenFecha_(a, b) {
  // Con fecha primero (más próxima arriba); sin fecha al final
  if (a.fechaEntrada && b.fechaEntrada) return a.fechaEntrada < b.fechaEntrada ? -1 : 1;
  if (a.fechaEntrada) return -1;
  if (b.fechaEntrada) return 1;
  return 0;
}

function calDiasBadge_(fecha, estado) {
  if (estado === 'cerrada') return '<span class="estado-pill">✓ terminada</span>';
  if (!fecha) return '<span class="estado-pill" style="opacity:.7;">sin fecha</span>';
  const hoy = new Date(); hoy.setHours(0, 0, 0, 0);
  const f = new Date(fecha + 'T00:00:00');
  const dias = Math.round((f - hoy) / 86400000);
  if (dias < 0) return `<span class="estado-pill" style="background:var(--danger,#b33); color:#fff;">entró hace ${-dias} día${dias === -1 ? '' : 's'}</span>`;
  if (dias === 0) return '<span class="estado-pill" style="background:var(--warn,#c77700); color:#fff;">ENTRA HOY</span>';
  return `<span class="estado-pill">en ${dias} día${dias === 1 ? '' : 's'}</span>`;
}

function renderCalendario_(items) {
  // Trabajos pendientes (no cerrados) agrupados por colocador; sin colocador al final
  const activos = items.filter(x => x.estado !== 'cerrada');
  const grupos = [];
  const porColoc = {};
  activos.forEach(x => {
    const c = x.colocador || '— Sin colocador asignado —';
    if (!porColoc[c]) { porColoc[c] = []; grupos.push(c); }
    porColoc[c].push(x);
  });
  grupos.sort((a, b) => {
    if (a.indexOf('Sin colocador') !== -1) return 1;
    if (b.indexOf('Sin colocador') !== -1) return -1;
    return a.localeCompare(b);
  });

  const html = grupos.map(coloc => {
    const arr = porColoc[coloc].slice().sort(calOrdenFecha_);
    const sinFecha = arr.filter(x => !x.fechaEntrada).length;
    const esSinColoc = coloc.indexOf('Sin colocador') !== -1;
    return `
    <div class="section">
      <div class="section-title">${esSinColoc ? '⚠ ' : '👷 '}${escapeHtml(coloc)}
        <span class="small-note" style="font-weight:400;">— ${arr.length} pendiente${arr.length === 1 ? '' : 's'}${sinFecha ? ' · ' + sinFecha + ' sin fecha' : ''}</span>
      </div>
      ${esSinColoc ? '<div class="small-note" style="margin-bottom:8px;">Estos trabajos todavía no tienen colocador: se asigna en H2 (obras) o en el resumen (postventas).</div>' : ''}
      <div style="overflow-x:auto;">
      <table class="calc-table">
        <thead><tr><th>Trabajo</th><th>Cliente</th><th>Estado</th><th>m²</th><th>Fecha de entrada</th><th></th><th></th></tr></thead>
        <tbody>
        ${arr.map(x => `
          <tr>
            <td style="white-space:nowrap;">${x.tipo === 'postventa' ? '🔧 ' : ''}<span style="font-family:var(--font-mono); font-size:12px;">${escapeHtml(x.codigo || x.obraId)}</span></td>
            <td>${escapeHtml(x.cliente)}${x.direccion ? `<div class="small-note">${escapeHtml(x.direccion)}</div>` : ''}</td>
            <td><span class="estado-pill estado-${x.estado}">${typeof estadoLabel === 'function' ? estadoLabel(x.estado) : escapeHtml(x.estado)}</span></td>
            <td class="num">${x.mt2 ? escapeHtml(String(x.mt2)) : '—'}</td>
            <td><input type="date" value="${escapeAttr(x.fechaEntrada || '')}" onchange="calSetFecha('${x.obraId}', this)"></td>
            <td>${calDiasBadge_(x.fechaEntrada, x.estado)}</td>
            <td><span class="btn-ghost" onclick="openObra('${x.obraId}')">Abrir →</span></td>
          </tr>`).join('')}
        </tbody>
      </table>
      </div>
    </div>`;
  }).join('');

  document.getElementById('calContenido').innerHTML = html || '<div class="empty-state">No hay trabajos pendientes.</div>';
}

async function calSetFecha(obraId, input) {
  const fecha = input.value;
  input.disabled = true;
  try {
    const res = await API.setFechaEntrada(obraId, fecha, currentUser.token);
    if (!res.ok) { alert('No se pudo guardar la fecha: ' + (res.error || '')); }
    else { await abrirCalendario(); return; } // re-dibuja con el badge de días actualizado
  } catch (err) {
    alert('Error de conexión al guardar la fecha — probá de nuevo.');
  }
  input.disabled = false;
}
