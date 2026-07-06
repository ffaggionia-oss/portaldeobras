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
    mt2Franco: '', mt2Relevados: '', barrioPrivado: '', casaODepto: '', tipoProducto: '',
    tipoInstalacion: { revestimiento: false, deck: false, pisos: false },
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

  const checklistHtml = (arr, keyPrefix) => arr.map((row, i) => `
    <div class="check-row">
      <input type="checkbox" id="${keyPrefix}_chk_${i}" ${row.marcado ? 'checked' : ''}>
      <div class="check-label">
        <div class="check-text">${row.item}</div>
        <div class="check-note">
          <input type="text" id="${keyPrefix}_nota_${i}" placeholder="Nota / especificación" value="${escapeAttr(row.nota || '')}">
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
      <div class="field-grid">
        <div class="field"><label>Cliente</label><input type="text" id="h1_cliente" value="${escapeAttr(d.cliente)}"></div>
        <div class="field"><label>Colocador</label><input type="text" id="h1_colocador" value="${escapeAttr(d.colocador)}"></div>
        <div class="field"><label>Fecha de visita</label><input type="date" id="h1_fechaVisita" value="${escapeAttr(d.fechaVisita)}"></div>
        <div class="field"><label>Dirección / Lote</label><input type="text" id="h1_direccion" value="${escapeAttr(d.direccion)}"></div>
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
        <div class="field full"><label>Tipo de producto/s</label><input type="text" id="h1_tipoProducto" value="${escapeAttr(d.tipoProducto)}"></div>
      </div>
    </div>

    <div class="section">
      <div class="section-title">2 · Tipo de instalación</div>
      <div class="check-row"><input type="checkbox" id="h1_ti_revestimiento" ${d.tipoInstalacion.revestimiento?'checked':''}><div class="check-text">Revestimiento</div></div>
      <div class="check-row"><input type="checkbox" id="h1_ti_deck" ${d.tipoInstalacion.deck?'checked':''}><div class="check-text">Deck</div></div>
      <div class="check-row"><input type="checkbox" id="h1_ti_pisos" ${d.tipoInstalacion.pisos?'checked':''}><div class="check-text">Pisos</div></div>
    </div>

    <div class="section">
      <div class="section-title">3 · Interior / Exterior</div>
      <div class="radio-group" id="h1_interiorExterior" data-value="${escapeAttr(d.interiorExterior)}">
        ${['Interior','Exterior'].map(v => `<div class="radio-chip ${d.interiorExterior===v?'selected':''}" data-val="${v}">${v}</div>`).join('')}
      </div>
    </div>

    <div class="section">
      <div class="section-title">4 · Revestimiento</div>
      ${checklistHtml(d.revestimientoChecklist, 'rev')}
      <div class="field full" style="margin-top:14px;"><label>Notas sobre revestimientos</label><textarea id="h1_revestimientoNotas">${escapeHtml(d.revestimientoNotas)}</textarea></div>
    </div>

    <div class="section">
      <div class="section-title">5 · Deck</div>
      ${checklistHtml(d.deckChecklist, 'deck')}
      <div class="field full" style="margin-top:14px;"><label>Notas sobre deck</label><textarea id="h1_deckNotas">${escapeHtml(d.deckNotas)}</textarea></div>
    </div>

    <div class="section">
      <div class="section-title">6 · Pisos</div>
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
    </div>

    <div class="section">
      <div class="section-title">7 · Problemas comunes (todas las obras)</div>
      ${problemasHtml(d.problemasComunes)}
    </div>

    <div class="section">
      <div class="section-title">8 · Notas y observaciones generales</div>
      <textarea id="h1_notasGenerales" style="min-height:100px;">${escapeHtml(d.notasGenerales)}</textarea>
    </div>

    <div class="section">
      <div class="section-title">9 · Cierre</div>
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
  const collectChecklist = (arr, keyPrefix) => arr.map((row, i) => ({
    item: row.item,
    marcado: document.getElementById(`${keyPrefix}_chk_${i}`).checked,
    nota: document.getElementById(`${keyPrefix}_nota_${i}`).value
  }));

  const humedad = Array.from(document.querySelectorAll('[data-humedad-row]')).map(rowEl => ({
    zona: rowEl.querySelector('.hum_zona').value,
    descripcion: rowEl.querySelector('.hum_desc').value,
    pct: rowEl.querySelector('.hum_pct').value
  }));

  const problemasComunes = H1_PROBLEMAS_COMUNES.map((item, i) => ({
    item, detalle: document.getElementById(`prob_detalle_${i}`).value
  }));

  return {
    cliente: val('h1_cliente'), colocador: val('h1_colocador'), fechaVisita: val('h1_fechaVisita'),
    direccion: val('h1_direccion'), mt2Franco: val('h1_mt2Franco'), mt2Relevados: val('h1_mt2Relevados'),
    barrioPrivado: chipVal('h1_barrioPrivado'), casaODepto: chipVal('h1_casaODepto'), tipoProducto: val('h1_tipoProducto'),
    tipoInstalacion: {
      revestimiento: document.getElementById('h1_ti_revestimiento').checked,
      deck: document.getElementById('h1_ti_deck').checked,
      pisos: document.getElementById('h1_ti_pisos').checked
    },
    interiorExterior: chipVal('h1_interiorExterior'),
    revestimientoChecklist: collectChecklist(H1_CHECKLIST_REVESTIMIENTO.map(item=>({item})), 'rev'),
    revestimientoNotas: val('h1_revestimientoNotas'),
    deckChecklist: collectChecklist(H1_CHECKLIST_DECK.map(item=>({item})), 'deck'),
    deckNotas: val('h1_deckNotas'),
    pisosChecklist: collectChecklist(H1_CHECKLIST_PISOS.map(item=>({item})), 'pisos'),
    humedad,
    sistemaPropuestoPisos: collectChecklist(H1_SISTEMA_PISOS.map(item=>({item})), 'sispisos'),
    pisosNotas: val('h1_pisosNotas'),
    problemasComunes,
    notasGenerales: val('h1_notasGenerales'),
    firmaFiscal: val('h1_firmaFiscal'), fechaEntrega: val('h1_fechaEntrega'),
    _completo: document.getElementById('h1_completo') ? document.getElementById('h1_completo').checked : false
  };
}
