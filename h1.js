// ============================================
// H1 — Diagnóstico Inicial de Obra
// ============================================

const H1_CHECKLIST_REVESTIMIENTO = [
  'Sistema de alfajías a tabique — ¿Madera, plástica o PGO? Definir espesor',
  'Sistema de colocación — ¿Tornillería frontal, oculta o clips?',
  'Estado del muro — ¿Necesita imprimación previa? Siempre necesita a menos que esté con tarquini o imprimado.',
  '¿Zonas en altura? → Especificar cuáles',
  '¿Necesita andamios? → ¿Para cuántos m²? ¿Doble o triple?',
  '¿Reviste cielorraso? → ¿Cuántos m²? ¿Tiene complejidad especial?',
  '¿El diseño tiene alguna complejidad especial?',
  'Remates de vanos y ventanas — Chequear altura de aberturas. ¿Siliconamos y atornillamos? ¿O tiene alguna complejidad especial?',
  'Remates de esquinas — Proponer perfil CP3 siempre. Sino una muere contra la otra y pintamos, nunca engletado.',
  '¿Necesita perfil metálico arriba o abajo? ¿Lo pide el arquitecto?',
  '¿Tiene parasoles? ¿Cómo se anclan? ¿Sistema GRAD o tornillería? ¿Estructura de hierro o de madera?'
];

const H1_CHECKLIST_DECK = [
  '¿Estructura básica sobre carpeta? Tipo terraza. Complejidad mínima',
  '¿Estructura compleja con altura máx. 15–20 cm? Complejidad media',
  '¿Estructura muy compleja, altura superior a 20 cm y desniveles? Complejidad alta',
  '¿Estructura de madera o steel? ¿Qué propones?',
  '¿El deck tiene desniveles o escalones?',
  '¿Necesita movimiento de tierra previo?',
  '¿Necesita remoción de deck anterior?',
  '¿El diseño tiene alguna complejidad rara?',
  '¿Las aberturas exteriores tienen altura suficiente para la estructura?'
];

const H1_CHECKLIST_PISOS = [
  '¿La carpeta está sana? ¿Necesita reparaciones?',
  '¿La carpeta está nivelada? (máx. 3 mm)',
  '¿Es PB? ¿Hay humedad visible desde afuera o adentro?',
  '¿Necesita desmonte de piso anterior? ¿Qué hay abajo? ¿Hay brea? → FOTO OBLIGATORIA',
  '¿Hay desnivel importante a compensar? ¿Cómo estaba compensado antes?',
  '¿Hay algún diseño complejo?'
];

const H1_SISTEMA_PISOS = [
  'Colocación sobre contrapiso directo → Pegado',
  'Flotante → Manta + nylon',
  '¿Incluye colocación de zócalos?'
];

const H1_PROBLEMAS_COMUNES = [
  'Acceso complejo (edificio, escalera, obra difícil)',
  'Tercer cordón del conurbano',
  'Interior del país',
  '¿Precisa volquete? → ¿Cuántos aprox?',
  'Obra compleja (muchos rubros / arquitecto complejo / etc.) → Detallar',
  '¿Precisa trabajo nocturno?'
];

function h1Default() {
  return {
    cliente: '', colocador: '', fechaVisita: '', direccion: '',
    contacto: '', telefono: '', email: '', estudio: '', telefonoArquitecto: '',
    mt2Franco: '', mt2Relevados: '', barrioPrivado: '', casaODepto: '', tipoProducto: '', productos: [],
    tipoInstalacion: { revestimiento: false, deck: false, pisos: false, sauna: false, otro: false, otroEspecificar: '' },
    interiorExterior: '',
    revestimientoChecklist: H1_CHECKLIST_REVESTIMIENTO.map(item => ({ item, marcado: false, nota: '' })),
    revestimientoNotas: '',
    deckChecklist: H1_CHECKLIST_DECK.map(item => ({ item, marcado: false, nota: '' })),
    deckNotas: '',
    pisosChecklist: H1_CHECKLIST_PISOS.map(item => ({ item, marcado: false, nota: '' })),
    humedad: [],
    sistemaPropuestoPisos: H1_SISTEMA_PISOS.map(item => ({ item, marcado: false, nota: '' })),
    pisosNotas: '',
    problemasComunes: H1_PROBLEMAS_COMUNES.map(item => ({ item, detalle: '' })),
    notasGenerales: '',
    firmaFiscal: '', fechaEntrega: '',
    _completo: false
  };
}

function renderH1(obra) {
  const d = Object.assign(h1Default(), obra.h1 || {}); // merge: un H1 parcial (precargado desde la cotización) completa con los defaults

  // Escribir en la nota activa el checkbox solo
  const checklistHtml = (arr, keyPrefix) => arr.map((row, i) => `
    <div class="check-row">
      <input type="checkbox" id="${keyPrefix}_chk_${i}" ${row.marcado ? 'checked' : ''}>
      <div class="check-label">
        <div class="check-text">${row.item}</div>
        <div class="check-note">
          <input type="text" id="${keyPrefix}_nota_${i}" placeholder="Nota / especificación" value="${escapeAttr(row.nota || '')}"
            oninput="if(this.value.trim())document.getElementById('${keyPrefix}_chk_${i}').checked=true">
        </div>
      </div>
    </div>
  `).join('');

  const problemasHtml = arr => arr.map((row, i) => `
    <div class="check-row">
      <div class="check-label" style="display:flex; gap:10px; align-items:flex-start;">
        <div class="check-text" style="flex:1;">${row.item}</div>
        <input type="text" id="prob_detalle_${i}" placeholder="Detalle" value="${escapeAttr(row.detalle || '')}" style="flex:1;">
      </div>
    </div>
  `).join('');

  return `
    <div class="section">
      <div class="section-title">1 · Datos generales</div>
      <div class="small-note" style="margin-bottom:10px;">La ficha del cliente se carga UNA sola vez acá (o llega precargada de la cotización) y se muestra en el Inicio de la obra. Los demás hitos no la repiten.</div>
      <div class="field-grid">
        <div class="field"><label>Cliente</label><input type="text" id="h1_cliente" value="${escapeAttr(d.cliente)}"></div>
        <div class="field"><label>Fecha de visita</label><input type="date" id="h1_fechaVisita" value="${escapeAttr(d.fechaVisita)}"></div>
        <div class="field"><label>Dirección / Lote</label><input type="text" id="h1_direccion" value="${escapeAttr(d.direccion || (d._clienteFicha&&d._clienteFicha.direccion) || '')}"></div>
        <div class="field"><label>Contacto</label><input type="text" id="h1_contacto" value="${escapeAttr(d.contacto || (d._clienteFicha&&d._clienteFicha.contacto) || '')}"></div>
        <div class="field"><label>Teléfono</label><input type="text" id="h1_telefono" value="${escapeAttr(d.telefono || (d._clienteFicha&&d._clienteFicha.telefono) || '')}"></div>
        <div class="field"><label>Email</label><input type="text" id="h1_email" value="${escapeAttr(d.email || (d._clienteFicha&&d._clienteFicha.email) || '')}"></div>
        <div class="field"><label>Estudio / Arquitecto</label><input type="text" id="h1_estudio" value="${escapeAttr(d.estudio)}"></div>
        <div class="field"><label>Teléfono arquitecto</label><input type="text" id="h1_telefonoArquitecto" value="${escapeAttr(d.telefonoArquitecto)}"></div>
        <div class="field"><label>Mt² (Franco)</label><input type="number" id="h1_mt2Franco" value="${escapeAttr(d.mt2Franco)}"></div>
        <div class="field"><label>Mt² relevados</label><input type="number" id="h1_mt2Relevados" value="${escapeAttr(d.mt2Relevados)}"></div>
        <div class="field"><label>¿Barrio privado?</label>
          <div class="radio-group" id="h1_barrioPrivado" data-value="${escapeAttr(d.barrioPrivado)}">
            ${['Sí','No'].map(v => `<div class="radio-chip ${d.barrioPrivado===v?'selected':''}" data-val="${v}">${v}</div>`).join('')}
          </div>
        </div>
        <div class="field"><label>¿Casa o depto?</label>
          <div class="radio-group" id="h1_casaODepto" data-value="${escapeAttr(d.casaODepto)}">
            ${['Casa','Depto'].map(v => `<div class="radio-chip ${d.casaODepto===v?'selected':''}" data-val="${v}">${v}</div>`).join('')}
          </div>
        </div>
        <div class="field full"><label>Tipo de producto/s <span class="small-note" style="font-weight:400;">(del catálogo — pueden ser varios; si la obra vino de una cotización ya están cargados)</span></label>
          <div id="h1_productos_chips" style="display:flex;flex-wrap:wrap;gap:6px;margin:6px 0;">
            ${(d.productos||[]).map((p,i)=>`<span class="estado-pill" style="display:inline-flex;align-items:center;gap:6px;">${escapeHtml(p)} <span style="cursor:pointer;font-weight:700;" onclick="h1QuitarProducto(${i})">✕</span></span>`).join('') || '<span class="small-note">Sin productos cargados.</span>'}
          </div>
          <div style="display:flex;gap:8px;">
            <input type="text" id="h1_producto_input" list="dlProductos" placeholder="Buscar en el catálogo o escribir libre…" style="flex:1;">
            <button type="button" class="btn-secondary" onclick="h1AgregarProducto()">＋ Agregar</button>
          </div>
          <datalist id="dlProductos">${(typeof PRODUCTOS_NOMBRES!=='undefined'?PRODUCTOS_NOMBRES:[]).map(n=>`<option value="${escapeAttr(n)}">`).join('')}</datalist>
          ${d.tipoProducto ? `<div class="small-note" style="margin-top:4px;">Texto anterior: ${escapeHtml(d.tipoProducto)}</div>` : ''}
        </div>
      </div>
    </div>

    <div class="section">
      <div class="section-title">2 · Tipo de instalación <span class="small-note" style="font-weight:400;">(activa solo las secciones que apliquen — nada de ruido)</span></div>
      <div class="check-row"><input type="checkbox" id="h1_ti_revestimiento" ${d.tipoInstalacion.revestimiento?'checked':''} onchange="h1ToggleTipo()"><div class="check-text">Revestimiento</div></div>
      <div class="check-row"><input type="checkbox" id="h1_ti_deck" ${d.tipoInstalacion.deck?'checked':''} onchange="h1ToggleTipo()"><div class="check-text">Deck</div></div>
      <div class="check-row"><input type="checkbox" id="h1_ti_pisos" ${d.tipoInstalacion.pisos?'checked':''} onchange="h1ToggleTipo()"><div class="check-text">Pisos</div></div>
      <div class="check-row"><input type="checkbox" id="h1_ti_sauna" ${d.tipoInstalacion.sauna?'checked':''} onchange="h1ToggleTipo()"><div class="check-text">Sauna</div></div>
      <div class="check-row">
        <input type="checkbox" id="h1_ti_otro" ${d.tipoInstalacion.otro?'checked':''} onchange="h1ToggleTipo()">
        <div class="check-label"><div class="check-text">Otro</div>
          <div class="check-note"><input type="text" id="h1_ti_otroEspecificar" placeholder="Especificar" value="${escapeAttr(d.tipoInstalacion.otroEspecificar||'')}" oninput="if(this.value.trim())document.getElementById('h1_ti_otro').checked=true"></div>
        </div>
      </div>
    </div>

    <div class="section">
      <div class="section-title">3 · Interior / Exterior</div>
      <div class="radio-group" id="h1_interiorExterior" data-value="${escapeAttr(d.interiorExterior)}">
        ${['Interior','Exterior'].map(v => `<div class="radio-chip ${d.interiorExterior===v?'selected':''}" data-val="${v}">${v}</div>`).join('')}
      </div>
    </div>

    ${!d.tipoInstalacion.revestimiento ? '' : `<div class="section">
      <div class="section-title">Revestimiento</div>
      ${checklistHtml(d.revestimientoChecklist, 'rev')}
      <div class="field full" style="margin-top:14px;"><label>Notas sobre revestimientos</label><textarea id="h1_revestimientoNotas">${escapeHtml(d.revestimientoNotas)}</textarea></div>
    </div>`}

    ${!d.tipoInstalacion.deck ? '' : `<div class="section">
      <div class="section-title">Deck</div>
      ${checklistHtml(d.deckChecklist, 'deck')}
      <div class="field full" style="margin-top:14px;"><label>Notas sobre deck</label><textarea id="h1_deckNotas">${escapeHtml(d.deckNotas)}</textarea></div>
    </div>`}

    ${!d.tipoInstalacion.pisos ? '' : `<div class="section">
      <div class="section-title">Pisos</div>
      ${checklistHtml(d.pisosChecklist, 'pisos')}
      <div class="small-note" style="margin-top:14px; font-weight:600; text-transform:uppercase; letter-spacing:0.5px;">Toma de humedad por zona</div>
      <div id="humedad_container">
        ${(d.humedad || []).map((h, i) => `
          <div class="field-grid" style="margin-top:8px;" data-humedad-row="${i}">
            <div class="field"><input type="text" placeholder="Zona" class="hum_zona" value="${escapeAttr(h.zona||'')}"></div>
            <div class="field"><input type="text" placeholder="Descripción" class="hum_desc" value="${escapeAttr(h.descripcion||'')}"></div>
            <div class="field"><input type="number" placeholder="Humedad %" class="hum_pct" value="${escapeAttr(h.pct||'')}"></div>
          </div>
        `).join('')}
      </div>
      <button type="button" class="add-row-btn" onclick="addHumedadRow()">+ Agregar zona de humedad</button>

      <div class="small-note" style="margin-top:18px; font-weight:600; text-transform:uppercase; letter-spacing:0.5px;">Sistema de colocación propuesto</div>
      ${checklistHtml(d.sistemaPropuestoPisos, 'sispisos')}
      <div class="field full" style="margin-top:14px;"><label>Notas sobre pisos</label><textarea id="h1_pisosNotas">${escapeHtml(d.pisosNotas)}</textarea></div>
    </div>`}

    ${!d.tipoInstalacion.sauna ? '' : `<div class="section">
      <div class="section-title">Sauna</div>
      <div class="field full"><label>Relevamiento de sauna (medidas, equipamiento, ventilación, banco, estufa…)</label><textarea id="h1_saunaNotas" style="min-height:90px;">${escapeHtml(d.saunaNotas||'')}</textarea></div>
    </div>`}

    <div class="section">
      <div class="section-title">Problemas comunes (todas las obras)</div>
      ${problemasHtml(d.problemasComunes)}
    </div>

    <div class="section">
      <div class="section-title">Notas y observaciones generales</div>
      <textarea id="h1_notasGenerales" style="min-height:100px;">${escapeHtml(d.notasGenerales)}</textarea>
    </div>

    <div class="section">
      <div class="section-title">Cierre</div>
      <div class="field-grid">
        <div class="field"><label>Firma fiscal técnico</label><input type="text" id="h1_firmaFiscal" value="${escapeAttr(d.firmaFiscal)}"></div>
        <div class="field"><label>Fecha entrega diagnóstico</label><input type="date" id="h1_fechaEntrega" value="${escapeAttr(d.fechaEntrega)}"></div>
      </div>
    </div>

    <div class="section">
      <div class="section-title">Estado del hito</div>
      <div class="check-row">
        <input type="checkbox" id="h1_completo" ${d._completo?'checked':''} onchange="scheduleAutosave()">
        <div class="check-text">Marcar H1 · Diagnóstico como completo</div>
      </div>
    </div>
  `;
}

function addHumedadRow() {
  const container = document.getElementById('humedad_container');
  const i = container.children.length;
  const div = document.createElement('div');
  div.className = 'field-grid';
  div.style.marginTop = '8px';
  div.setAttribute('data-humedad-row', i);
  div.innerHTML = `
    <div class="field"><input type="text" placeholder="Zona" class="hum_zona"></div>
    <div class="field"><input type="text" placeholder="Descripción" class="hum_desc"></div>
    <div class="field"><input type="number" placeholder="Humedad %" class="hum_pct"></div>
  `;
  container.appendChild(div);
}

function collectH1() {
  const prev = (currentObraData && currentObraData.h1) || h1Default();
  const el = (id) => document.getElementById(id);
  const valS = (id, fb) => { const e = el(id); return e ? e.value : fb; };
  const chkS = (id, fb) => { const e = el(id); return e ? e.checked : fb; };
  const chipS = (id, fb) => { const e = el(id); return e ? (e.getAttribute('data-value') || '') : fb; };

  // checklists: si la sección está oculta (tipo no tildado) se conserva lo guardado
  const collectChecklist = (items, keyPrefix, prevArr) => {
    if (!el(keyPrefix + '_chk_0')) return prevArr || items.map(item => ({ item, marcado: false, nota: '' }));
    return items.map((item, i) => ({
      item,
      marcado: chkS(`${keyPrefix}_chk_${i}`, false),
      nota: valS(`${keyPrefix}_nota_${i}`, '')
    }));
  };

  const humedad = document.querySelector('[data-humedad-row]')
    ? Array.from(document.querySelectorAll('[data-humedad-row]')).map(rowEl => ({
        zona: rowEl.querySelector('.hum_zona').value,
        descripcion: rowEl.querySelector('.hum_desc').value,
        pct: rowEl.querySelector('.hum_pct').value
      }))
    : (prev.humedad || []);

  const problemasComunes = el('prob_detalle_0')
    ? H1_PROBLEMAS_COMUNES.map((item, i) => ({ item, detalle: valS(`prob_detalle_${i}`, '') }))
    : (prev.problemasComunes || H1_PROBLEMAS_COMUNES.map(item => ({ item, detalle: '' })));

  return {
    cliente: valS('h1_cliente', prev.cliente), colocador: prev.colocador || '', fechaVisita: valS('h1_fechaVisita', prev.fechaVisita),
    direccion: valS('h1_direccion', prev.direccion),
    contacto: valS('h1_contacto', prev.contacto || ''), telefono: valS('h1_telefono', prev.telefono || ''),
    email: valS('h1_email', prev.email || ''), estudio: valS('h1_estudio', prev.estudio || ''),
    telefonoArquitecto: valS('h1_telefonoArquitecto', prev.telefonoArquitecto || ''),
    mt2Franco: valS('h1_mt2Franco', prev.mt2Franco), mt2Relevados: valS('h1_mt2Relevados', prev.mt2Relevados),
    barrioPrivado: chipS('h1_barrioPrivado', prev.barrioPrivado), casaODepto: chipS('h1_casaODepto', prev.casaODepto),
    tipoProducto: prev.tipoProducto || '',
    productos: (prev.productos || []).slice(),   // se manejan con h1AgregarProducto / h1QuitarProducto
    tipoInstalacion: {
      revestimiento: chkS('h1_ti_revestimiento', prev.tipoInstalacion.revestimiento),
      deck: chkS('h1_ti_deck', prev.tipoInstalacion.deck),
      pisos: chkS('h1_ti_pisos', prev.tipoInstalacion.pisos),
      sauna: chkS('h1_ti_sauna', !!prev.tipoInstalacion.sauna),
      otro: chkS('h1_ti_otro', !!prev.tipoInstalacion.otro),
      otroEspecificar: valS('h1_ti_otroEspecificar', prev.tipoInstalacion.otroEspecificar || '')
    },
    interiorExterior: chipS('h1_interiorExterior', prev.interiorExterior),
    revestimientoChecklist: collectChecklist(H1_CHECKLIST_REVESTIMIENTO, 'rev', prev.revestimientoChecklist),
    revestimientoNotas: valS('h1_revestimientoNotas', prev.revestimientoNotas),
    deckChecklist: collectChecklist(H1_CHECKLIST_DECK, 'deck', prev.deckChecklist),
    deckNotas: valS('h1_deckNotas', prev.deckNotas),
    pisosChecklist: collectChecklist(H1_CHECKLIST_PISOS, 'pisos', prev.pisosChecklist),
    humedad,
    sistemaPropuestoPisos: collectChecklist(H1_SISTEMA_PISOS.map(x=>x), 'sispisos', prev.sistemaPropuestoPisos),
    pisosNotas: valS('h1_pisosNotas', prev.pisosNotas),
    saunaNotas: valS('h1_saunaNotas', prev.saunaNotas || ''),
    problemasComunes,
    notasGenerales: valS('h1_notasGenerales', prev.notasGenerales),
    firmaFiscal: valS('h1_firmaFiscal', prev.firmaFiscal), fechaEntrega: valS('h1_fechaEntrega', prev.fechaEntrega),
    _completo: chkS('h1_completo', prev._completo)
  };
}

// ---- Tipos de instalación: re-render mostrando solo las secciones activas ----
function h1ToggleTipo() {
  currentObraData.h1 = collectH1();
  hitoDirty.h1 = true;
  document.getElementById('hito-content').innerHTML = renderH1(currentObraData);
  setSaveStatus('● Cambios sin guardar — tocá Guardar para aplicar y notificar', 'error');
}

// ---- Productos referenciados al catálogo ----
function h1AgregarProducto() {
  const inp = document.getElementById('h1_producto_input');
  const v = (inp.value || '').trim();
  if (!v) return;
  const h = collectH1();
  if (h.productos.indexOf(v) === -1) h.productos.push(v);
  currentObraData.h1 = h;
  hitoDirty.h1 = true;
  document.getElementById('hito-content').innerHTML = renderH1(currentObraData);
  setSaveStatus('● Cambios sin guardar — tocá Guardar para aplicar y notificar', 'error');
  const inp2 = document.getElementById('h1_producto_input');
  if (inp2) inp2.focus();
}
function h1QuitarProducto(i) {
  const h = collectH1();
  h.productos.splice(i, 1);
  currentObraData.h1 = h;
  hitoDirty.h1 = true;
  document.getElementById('hito-content').innerHTML = renderH1(currentObraData);
  setSaveStatus('● Cambios sin guardar — tocá Guardar para aplicar y notificar', 'error');
}

