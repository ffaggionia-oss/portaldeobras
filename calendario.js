// ============================================
// 📅 CALENDARIO DE COLOCADORES
// Vista general (no es por obra): qué obras y postventas tiene asignadas
// cada colocador y con qué fecha de entrada estimada. La ASIGNACIÓN vive
// en H2 (o en el resumen de la postventa) — si cambia allá, cambia acá.
// La FECHA sí se edita desde acá, sin abrir la obra.
//
// ★ (22/08/2026) Dos vistas: Lista (como antes, agrupada por colocador) y
// Mes (grilla tipo calendario). Fechas se pueden marcar como APROXIMADAS
// (línea punteada, sin compromiso firme) y cada trabajo muestra su
// BANDERITA de alertas abiertas (viene de action=calendario, campo
// `banderas`) sin tener que entrar a la obra.
// ============================================

let calVista_ = 'lista'; // 'lista' | 'mes'
let calMesActual_ = new Date();
let calItemsCache_ = [];

async function abrirCalendario() {
  const app = document.getElementById('app');
  app.innerHTML = `
    <div class="back-link" onclick="goHome()">← Volver a obras</div>
    <div class="list-header"><h1>📅 Calendario de colocadores</h1></div>
    <div class="small-note" style="margin-bottom:14px;">
      La asignación de colocador se define en <b>H2 · Sistema constructivo</b> (o en el resumen de la postventa) y acá se refleja sola.
      Lo que sí se carga acá es la <b>fecha de entrada estimada</b> de cada trabajo — con eso los chicos ven qué tiene pendiente cada uno y en qué orden.
      Si todavía no está confirmada, marcala como <b>aproximada</b>.
    </div>
    <div class="cal-toggle">
      <button type="button" class="btn-secondary ${calVista_==='lista'?'active':''}" onclick="calCambiarVista('lista')">☰ Lista</button>
      <button type="button" class="btn-secondary ${calVista_==='mes'?'active':''}" onclick="calCambiarVista('mes')">📆 Mes</button>
    </div>
    <div id="calContenido"><div class="empty-state">Cargando…</div></div>
  `;
  try {
    const res = await API.calendario(currentUser.token);
    if (!res.ok) throw new Error(res.error);
    calItemsCache_ = res.items || [];
    calRenderVistaActual_();
  } catch (err) {
    document.getElementById('calContenido').innerHTML = `<div class="empty-state">No pude cargar el calendario: ${escapeHtml(String(err.message || err))}</div>`;
  }
}

function calCambiarVista(v) {
  calVista_ = v;
  document.querySelectorAll('.cal-toggle .btn-secondary').forEach(b => b.classList.remove('active'));
  event.target.classList.add('active');
  calRenderVistaActual_();
}

function calRenderVistaActual_() {
  if (calVista_ === 'mes') renderCalendarioMes_(calItemsCache_);
  else renderCalendario_(calItemsCache_);
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

// ★ Banderita compacta a partir del resumen que manda el backend
// ({ abiertas, urgenciaMax, vencidas }). null/0 abiertas => no se dibuja nada.
function calBanderaBadge_(banderas) {
  if (!banderas || !banderas.abiertas) return '';
  const urg = banderas.urgenciaMax || 'media';
  const vencidaCls = banderas.vencidas ? ' bandera-vencida' : '';
  const emoji = urg === 'alta' ? '🔴' : (urg === 'baja' ? '🟢' : '🟡');
  return `<span class="bandera-badge bandera-${urg}${vencidaCls}" title="${banderas.abiertas} alerta(s) abierta(s)${banderas.vencidas ? ' — ' + banderas.vencidas + ' vencida(s)' : ''}">${emoji} ${banderas.abiertas}</span>`;
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
        <thead><tr><th>Trabajo</th><th>Cliente</th><th>Estado</th><th>m²</th><th>Fecha de entrada</th><th>Aprox.</th><th></th><th></th><th></th></tr></thead>
        <tbody>
        ${arr.map(x => `
          <tr>
            <td style="white-space:nowrap;">${x.tipo === 'postventa' ? '🔧 ' : ''}<span style="font-family:var(--font-mono); font-size:12px;">${escapeHtml(x.codigo || x.obraId)}</span></td>
            <td>${escapeHtml(x.cliente)}${x.direccion ? `<div class="small-note">${escapeHtml(x.direccion)}</div>` : ''}</td>
            <td><span class="estado-pill estado-${x.estado}">${typeof estadoLabel === 'function' ? estadoLabel(x.estado) : escapeHtml(x.estado)}</span></td>
            <td class="num">${x.mt2 ? escapeHtml(String(x.mt2)) : '—'}</td>
            <td><input type="date" value="${escapeAttr(x.fechaEntrada || '')}" onblur="calSetFecha('${x.obraId}', this)" onkeydown="if(event.key==='Enter') this.blur()" style="${x.fechaAproximada ? 'border-style:dashed;' : ''}"></td>
            <td style="text-align:center;"><input type="checkbox" ${x.fechaAproximada ? 'checked' : ''} title="Fecha aproximada (sin confirmar)" onchange="calSetAproximada('${x.obraId}', this)"></td>
            <td>${calDiasBadge_(x.fechaEntrada, x.estado)}</td>
            <td>${calBanderaBadge_(x.banderas)}</td>
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
  const item = calItemsCache_.find(x => x.obraId === obraId);
  if (!item) return;
  const aproximada = !!item.fechaAproximada;
  if (fecha === (item.fechaEntrada || '')) return; // sin cambios reales: no molestamos con un refresco
  input.disabled = true;
  try {
    const res = await API.setFechaEntrada(obraId, fecha, currentUser.token, aproximada);
    if (!res.ok) { alert('No se pudo guardar la fecha: ' + (res.error || '')); }
    else { await abrirCalendario(); return; } // re-dibuja con el badge de días actualizado
  } catch (err) {
    alert('Error de conexión al guardar la fecha — probá de nuevo.');
  }
  input.disabled = false;
}

async function calSetAproximada(obraId, checkbox) {
  const item = calItemsCache_.find(x => x.obraId === obraId);
  const fecha = item ? item.fechaEntrada : '';
  checkbox.disabled = true;
  try {
    const res = await API.setFechaEntrada(obraId, fecha, currentUser.token, checkbox.checked);
    if (!res.ok) { alert('No se pudo guardar: ' + (res.error || '')); }
    else { await abrirCalendario(); return; }
  } catch (err) {
    alert('Error de conexión — probá de nuevo.');
  }
  checkbox.disabled = false;
}

// ============================================
// Vista Mes — grilla tipo calendario
// ============================================
const CAL_DIAS_SEMANA = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
const CAL_MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

function calMesCambiar_(delta) {
  calMesActual_ = new Date(calMesActual_.getFullYear(), calMesActual_.getMonth() + delta, 1);
  renderCalendarioMes_(calItemsCache_);
}

function renderCalendarioMes_(items) {
  const activos = items.filter(x => x.fechaEntrada && x.estado !== 'cerrada');
  const porDia = {};
  activos.forEach(x => {
    if (!porDia[x.fechaEntrada]) porDia[x.fechaEntrada] = [];
    porDia[x.fechaEntrada].push(x);
  });

  const anio = calMesActual_.getFullYear();
  const mes = calMesActual_.getMonth();
  const primerDiaMes = new Date(anio, mes, 1);
  // Lunes = 0 ... Domingo = 6
  const offsetInicio = (primerDiaMes.getDay() + 6) % 7;
  const diasEnMes = new Date(anio, mes + 1, 0).getDate();
  const hoy = new Date(); hoy.setHours(0, 0, 0, 0);

  const celdas = [];
  for (let i = 0; i < offsetInicio; i++) celdas.push(null);
  for (let d = 1; d <= diasEnMes; d++) celdas.push(d);
  while (celdas.length % 7 !== 0) celdas.push(null);

  const fechaISO = (d) => `${anio}-${String(mes + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;

  const grid = celdas.map(d => {
    if (!d) return `<div class="cal-day fuera-mes"></div>`;
    const iso = fechaISO(d);
    const esHoy = new Date(iso + 'T00:00:00').getTime() === hoy.getTime();
    const eventos = (porDia[iso] || []).sort((a, b) => (b.banderas && b.banderas.abiertas ? 1 : 0) - (a.banderas && a.banderas.abiertas ? 1 : 0));
    return `
      <div class="cal-day ${esHoy ? 'hoy' : ''}">
        <div class="cal-day-num">${d}</div>
        ${eventos.map(x => {
          const urg = x.banderas && x.banderas.abiertas ? (x.banderas.urgenciaMax || 'media') : '';
          return `<span class="cal-evento ${x.fechaAproximada ? 'aproximada' : ''} ${urg ? 'urgencia-' + urg : ''}" title="${escapeAttr(x.cliente)}${x.fechaAproximada ? ' (fecha aproximada)' : ''}" onclick="openObra('${x.obraId}')">${x.tipo === 'postventa' ? '🔧 ' : ''}${escapeHtml(x.cliente)}${x.banderas && x.banderas.abiertas ? ' 🚩' : ''}</span>`;
        }).join('')}
      </div>`;
  }).join('');

  document.getElementById('calContenido').innerHTML = `
    <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:12px;">
      <span class="btn-ghost" onclick="calMesCambiar_(-1)">← anterior</span>
      <div class="section-title" style="margin:0;">${CAL_MESES[mes]} ${anio}</div>
      <span class="btn-ghost" onclick="calMesCambiar_(1)">siguiente →</span>
    </div>
    <div class="cal-grid">
      ${CAL_DIAS_SEMANA.map(d => `<div class="cal-grid-head">${d}</div>`).join('')}
      ${grid}
    </div>
    <div class="small-note" style="margin-top:12px;">Los bordes punteados son fechas <b>aproximadas</b> (sin confirmar). 🚩 = tiene alertas abiertas — abrí la obra para verlas.</div>
  `;
}
