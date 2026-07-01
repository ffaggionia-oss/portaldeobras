// ============================================
// H2 — Sistema Constructivo / Orden de Servicio Colocadores
// ============================================

function h2Default() {
  return {
    cliente: '', estudio: '', telefonoArquitecto: '', direccion: '', localidad: '', barrioPrivado: '',
    mt2: '', producto: '', colocador: '', fiscal: '', inicioEstimado: '',
    tipoObra: { revestimiento: false, parasoles: false, deck: false, piso: false, sauna: false, otro: false, otroEspecificar: '' },
    rev_tipo: '', rev_tipoCantidad: '',
    rev_fijaA: '', rev_fijaEspecificar: '',
    rev_tratamiento: '', rev_tratamientoEspecificar: '',
    rev_estructura: '', rev_estructuraEspecificar: '',
    rev_aplicacion: [], rev_aplicacionEspecificar: '',
    rev_remates: [], rev_remateAltura: '',
    rev_notas: '',
    par_perfil: '', par_link: '', par_mt2Vanos: '', par_anclaje: '', par_anclajeEspecificar: '', par_notas: '',
    deck_apoyo: '', deck_apoyoEspecificar: '',
    deck_estructura: '', deck_estructuraEspecificar: '',
    deck_fijacionTabla: '',
    piso_estadoSoporte: '', piso_estadoEspecificar: '',
    piso_sistema: [], piso_sistemaEspecificar: '',
    piso_problemasPrevios: [],
    piso_notas: '',
    driveLink: '',
    _completo: false
  };
}

const H2_REV_FIJA_OPTS = ['Mampostería sólida (ladrillo / hormigón)', 'Tabique de durlock o similar', 'Estructura metálica existente', 'Estructura Metálica a Fabricar'];
const H2_REV_TRATAMIENTO_OPTS = ['Imprimación de muro previo', 'Siliconado de tarugos'];
const H2_REV_ESTRUCTURA_OPTS = ['Fachada Ventilada', 'Alfajías de Madera Pino CCA', 'Alfajías metálicas PGO galvanizado', 'Madera plástica WoodPlast', 'Estructura de Hierro', 'Otro'];
const H2_REV_APLICACION_OPTS = ['Clip (Revestimiento o Deck)', 'Tornillería', 'Pegamento', 'Grampado', 'Clavo oculto (Tipin)', 'Revestimiento pegado a Tabique'];
const H2_REV_REMATES_OPTS = ['Dinteles Ventanas c/silicona PU + Tornillo a Mampostería', 'Esquinas con perfil Thermory CP3', 'Esquinas a 90° (No englete) + Pintado', 'Provisión de zinguería / plegado'];
const H2_PISO_SISTEMA_OPTS = ['Pegado con pegamento elástico base xilano', 'Flotante con manta acústica + nylon 200 micrones', 'Incluye Aplicación de Zócalos'];
const H2_PISO_PROBLEMAS_OPTS = ['Requiere Aplicación de Barrera de Humedad Química', 'Requiere Nivelación', 'Requiere Reparación de Carpeta', 'Requiere Remoción de Brea'];

function multiCheckGroup(options, selectedArr, idPrefix) {
  return options.map((opt, i) => `
    <div class="check-row">
      <input type="checkbox" id="${idPrefix}_${i}" data-opt="${escapeAttr(opt)}" ${selectedArr.includes(opt) ? 'checked' : ''}>
      <div class="check-text">${opt}</div>
    </div>
  `).join('');
}

function collectMultiCheck(options, idPrefix) {
  return options.filter((opt, i) => document.getElementById(`${idPrefix}_${i}`).checked);
}

function renderH2(obra) {
  const d = obra.h2 || h2Default();

  return `
    <div class="section">
      <div class="section-title">01 · Datos de la obra</div>
      <div class="field-grid">
        <div class="field"><label>Cliente</label><input type="text" id="h2_cliente" value="${escapeAttr(d.cliente)}"></div>
        <div class="field"><label>Estudio / Arquitecto</label><input type="text" id="h2_estudio" value="${escapeAttr(d.estudio)}"></div>
        <div class="field"><label>Teléfono arquitecto</label><input type="text" id="h2_telefonoArquitecto" value="${escapeAttr(d.telefonoArquitecto)}"></div>
        <div class="field"><label>Dirección de obra</label><input type="text" id="h2_direccion" value="${escapeAttr(d.direccion)}"></div>
        <div class="field"><label>Localidad</label><input type="text" id="h2_localidad" value="${escapeAttr(d.localidad)}"></div>
        <div class="field"><label>¿Barrio privado?</label>
          <div class="radio-group" id="h2_barrioPrivado" data-value="${escapeAttr(d.barrioPrivado)}">
            ${['Sí','No'].map(v => `<div class="radio-chip ${d.barrioPrivado===v?'selected':''}" data-val="${v}">${v}</div>`).join('')}
          </div>
        </div>
        <div class="field"><label>Mt² a colocar</label><input type="number" id="h2_mt2" value="${escapeAttr(d.mt2)}"></div>
        <div class="field"><label>Producto a colocar</label><input type="text" id="h2_producto" value="${escapeAttr(d.producto)}"></div>
        <div class="field"><label>Colocador asignado</label><input type="text" id="h2_colocador" value="${escapeAttr(d.colocador)}"></div>
        <div class="field"><label>Fiscal de obra</label><input type="text" id="h2_fiscal" value="${escapeAttr(d.fiscal)}"></div>
        <div class="field full"><label>Inicio estimado de obra</label><input type="text" id="h2_inicioEstimado" value="${escapeAttr(d.inicioEstimado)}"></div>
      </div>
    </div>

    <div class="section">
      <div class="section-title">02 · Tipo de obra (puede ser más de uno)</div>
      ${['revestimiento','parasoles','deck','piso','sauna'].map(k => `
        <div class="check-row"><input type="checkbox" id="h2_tipoObra_${k}" ${d.tipoObra[k]?'checked':''}><div class="check-text">${k.charAt(0).toUpperCase()+k.slice(1)}</div></div>
      `).join('')}
      <div class="check-row">
        <input type="checkbox" id="h2_tipoObra_otro" ${d.tipoObra.otro?'checked':''}>
        <div class="check-label">
          <div class="check-text">Otro</div>
          <div class="check-note"><input type="text" id="h2_tipoObra_otroEspecificar" placeholder="Especificar" value="${escapeAttr(d.tipoObra.otroEspecificar)}"></div>
        </div>
      </div>
    </div>

    <div class="section">
      <div class="section-title">03 · Revestimiento (completar sólo si aplica)</div>
      <label>Tipo de revestimiento</label>
      <div class="radio-group" id="h2_rev_tipo" data-value="${escapeAttr(d.rev_tipo)}" style="margin-bottom:14px;">
        ${['Interior','Exterior — fachada','Cielorraso / revestimiento de techo'].map(v => `<div class="radio-chip ${d.rev_tipo===v?'selected':''}" data-val="${v}">${v}</div>`).join('')}
      </div>
      <div class="field full"><label>Indicar cantidad</label><input type="text" id="h2_rev_tipoCantidad" value="${escapeAttr(d.rev_tipoCantidad)}"></div>

      <div class="small-note" style="margin:16px 0 8px; font-weight:600; text-transform:uppercase;">¿A qué se fija?</div>
      <div class="radio-group" id="h2_rev_fijaA" data-value="${escapeAttr(d.rev_fijaA)}">
        ${H2_REV_FIJA_OPTS.map(v => `<div class="radio-chip ${d.rev_fijaA===v?'selected':''}" data-val="${v}">${v}</div>`).join('')}
      </div>
      <div class="field full" style="margin-top:8px;"><label>Especificar</label><input type="text" id="h2_rev_fijaEspecificar" value="${escapeAttr(d.rev_fijaEspecificar)}"></div>

      <div class="small-note" style="margin:16px 0 8px; font-weight:600; text-transform:uppercase;">Tratamiento previo del muro</div>
      <div class="radio-group" id="h2_rev_tratamiento" data-value="${escapeAttr(d.rev_tratamiento)}">
        ${H2_REV_TRATAMIENTO_OPTS.map(v => `<div class="radio-chip ${d.rev_tratamiento===v?'selected':''}" data-val="${v}">${v}</div>`).join('')}
      </div>
      <div class="field full" style="margin-top:8px;"><label>Especificar</label><input type="text" id="h2_rev_tratamientoEspecificar" value="${escapeAttr(d.rev_tratamientoEspecificar)}"></div>

      <div class="small-note" style="margin:16px 0 8px; font-weight:600; text-transform:uppercase;">Estructura portante</div>
      <div class="radio-group" id="h2_rev_estructura" data-value="${escapeAttr(d.rev_estructura)}">
        ${H2_REV_ESTRUCTURA_OPTS.map(v => `<div class="radio-chip ${d.rev_estructura===v?'selected':''}" data-val="${v}">${v}</div>`).join('')}
      </div>
      <div class="field full" style="margin-top:8px;"><label>Espesor / Ancho</label><input type="text" id="h2_rev_estructuraEspecificar" value="${escapeAttr(d.rev_estructuraEspecificar)}"></div>

      <div class="small-note" style="margin:16px 0 8px; font-weight:600; text-transform:uppercase;">Aplicación de la tabla</div>
      ${multiCheckGroup(H2_REV_APLICACION_OPTS, d.rev_aplicacion, 'h2_rev_apl')}
      <div class="field full" style="margin-top:8px;"><label>Especificar / modelo de clip</label><input type="text" id="h2_rev_aplicacionEspecificar" value="${escapeAttr(d.rev_aplicacionEspecificar)}"></div>

      <div class="small-note" style="margin:16px 0 8px; font-weight:600; text-transform:uppercase;">Remates</div>
      ${multiCheckGroup(H2_REV_REMATES_OPTS, d.rev_remates, 'h2_rev_rem')}
      <div class="field full" style="margin-top:8px;"><label>Altura de revestimiento a piso</label><input type="text" id="h2_rev_remateAltura" value="${escapeAttr(d.rev_remateAltura)}"></div>

      <div class="field full" style="margin-top:14px;"><label>Notas sobre revestimiento</label><textarea id="h2_rev_notas" style="min-height:90px;">${escapeHtml(d.rev_notas)}</textarea></div>
    </div>

    <div class="section">
      <div class="section-title">04 · Parasoles (completar sólo si aplica)</div>
      <div class="field-grid">
        <div class="field"><label>Perfil a utilizar</label><input type="text" id="h2_par_perfil" value="${escapeAttr(d.par_perfil)}"></div>
        <div class="field"><label>Link producto</label><input type="text" id="h2_par_link" value="${escapeAttr(d.par_link)}"></div>
        <div class="field"><label>Mt² de vanos a colocar</label><input type="text" id="h2_par_mt2Vanos" value="${escapeAttr(d.par_mt2Vanos)}"></div>
      </div>
      <div class="small-note" style="margin:16px 0 8px; font-weight:600; text-transform:uppercase;">Anclaje y estructura</div>
      <div class="radio-group" id="h2_par_anclaje" data-value="${escapeAttr(d.par_anclaje)}">
        ${['Colocación con Clip','Colocación con Tornillería Directo','Estructura Portante Hierro'].map(v => `<div class="radio-chip ${d.par_anclaje===v?'selected':''}" data-val="${v}">${v}</div>`).join('')}
      </div>
      <div class="field full" style="margin-top:8px;"><label>Especificar</label><input type="text" id="h2_par_anclajeEspecificar" value="${escapeAttr(d.par_anclajeEspecificar)}"></div>
      <div class="field full" style="margin-top:14px;"><label>Notas sobre parasoles</label><textarea id="h2_par_notas">${escapeHtml(d.par_notas)}</textarea></div>
    </div>

    <div class="section">
      <div class="section-title">05 · Deck (completar sólo si aplica)</div>
      <div class="small-note" style="margin-bottom:8px; font-weight:600; text-transform:uppercase;">¿Cómo va apoyado?</div>
      <div class="radio-group" id="h2_deck_apoyo" data-value="${escapeAttr(d.deck_apoyo)}">
        ${['Estructura sobre carpeta directo','Necesita Nivelación de Carpeta','Sobre patas hasta 15 cm','Sobre patas más de 15 cm','Con desniveles / escalones','Necesita movimiento de tierra previo','Necesita remoción de deck anterior','Superficie requiere albañilería previa'].map(v => `<div class="radio-chip ${d.deck_apoyo===v?'selected':''}" data-val="${v}">${v}</div>`).join('')}
      </div>
      <div class="field full" style="margin-top:8px;"><label>Especificar</label><input type="text" id="h2_deck_apoyoEspecificar" value="${escapeAttr(d.deck_apoyoEspecificar)}"></div>

      <div class="small-note" style="margin:16px 0 8px; font-weight:600; text-transform:uppercase;">Estructura</div>
      <div class="radio-group" id="h2_deck_estructura" data-value="${escapeAttr(d.deck_estructura)}">
        ${['PCG galvanizado','Madera Pino CCA','Aluminio'].map(v => `<div class="radio-chip ${d.deck_estructura===v?'selected':''}" data-val="${v}">${v}</div>`).join('')}
      </div>
      <div class="field full" style="margin-top:8px;"><label>Especificar</label><input type="text" id="h2_deck_estructuraEspecificar" value="${escapeAttr(d.deck_estructuraEspecificar)}"></div>

      <div class="small-note" style="margin:16px 0 8px; font-weight:600; text-transform:uppercase;">Fijación de tabla</div>
      <div class="radio-group" id="h2_deck_fijacionTabla" data-value="${escapeAttr(d.deck_fijacionTabla)}">
        ${['Clip Thermory','Otro Clip','Tornillería'].map(v => `<div class="radio-chip ${d.deck_fijacionTabla===v?'selected':''}" data-val="${v}">${v}</div>`).join('')}
      </div>
    </div>

    <div class="section">
      <div class="section-title">06 · Piso (completar sólo si aplica)</div>
      <div class="small-note" style="margin-bottom:8px; font-weight:600; text-transform:uppercase;">Estado del soporte</div>
      <div class="radio-group" id="h2_piso_estadoSoporte" data-value="${escapeAttr(d.piso_estadoSoporte)}">
        ${['Hay piso existente — requiere remoción','Carpeta sana y nivelada','Carpeta requiere nivelación o reparación','Aplicación sobre piso anterior sin remoción'].map(v => `<div class="radio-chip ${d.piso_estadoSoporte===v?'selected':''}" data-val="${v}">${v}</div>`).join('')}
      </div>
      <div class="field full" style="margin-top:8px;"><label>Especificar</label><input type="text" id="h2_piso_estadoEspecificar" value="${escapeAttr(d.piso_estadoEspecificar)}"></div>

      <div class="small-note" style="margin:16px 0 8px; font-weight:600; text-transform:uppercase;">Sistema</div>
      ${multiCheckGroup(H2_PISO_SISTEMA_OPTS, d.piso_sistema, 'h2_piso_sis')}
      <div class="field full" style="margin-top:8px;"><label>Especificar</label><input type="text" id="h2_piso_sistemaEspecificar" value="${escapeAttr(d.piso_sistemaEspecificar)}"></div>

      <div class="small-note" style="margin:16px 0 8px; font-weight:600; text-transform:uppercase;">Problemas previos</div>
      ${multiCheckGroup(H2_PISO_PROBLEMAS_OPTS, d.piso_problemasPrevios, 'h2_piso_prob')}

      <div class="field full" style="margin-top:14px;"><label>Notas sobre pisos</label><textarea id="h2_piso_notas">${escapeHtml(d.piso_notas)}</textarea></div>
    </div>

    <div class="section">
      <div class="section-title">08 · Planos y documentación adjunta</div>
      <div class="small-note" style="margin-bottom:10px;">⚠ Planos, fotos y documentación se deben encontrar en el Drive del cliente.</div>
      <div class="field full"><label>Carpeta de Drive del cliente</label><input type="text" id="h2_driveLink" placeholder="https://drive.google.com/..." value="${escapeAttr(d.driveLink)}"></div>
    </div>

    <div class="section">
      <div class="section-title">Estado del hito</div>
      <div class="check-row">
        <input type="checkbox" id="h2_completo" ${d._completo?'checked':''} onchange="scheduleAutosave()">
        <div class="check-text">Marcar H2 · Sistema constructivo como completo</div>
      </div>
    </div>
  `;
}

function collectH2() {
  return {
    cliente: val('h2_cliente'), estudio: val('h2_estudio'), telefonoArquitecto: val('h2_telefonoArquitecto'),
    direccion: val('h2_direccion'), localidad: val('h2_localidad'), barrioPrivado: chipVal('h2_barrioPrivado'),
    mt2: val('h2_mt2'), producto: val('h2_producto'), colocador: val('h2_colocador'), fiscal: val('h2_fiscal'),
    inicioEstimado: val('h2_inicioEstimado'),
    tipoObra: {
      revestimiento: document.getElementById('h2_tipoObra_revestimiento').checked,
      parasoles: document.getElementById('h2_tipoObra_parasoles').checked,
      deck: document.getElementById('h2_tipoObra_deck').checked,
      piso: document.getElementById('h2_tipoObra_piso').checked,
      sauna: document.getElementById('h2_tipoObra_sauna').checked,
      otro: document.getElementById('h2_tipoObra_otro').checked,
      otroEspecificar: val('h2_tipoObra_otroEspecificar')
    },
    rev_tipo: chipVal('h2_rev_tipo'), rev_tipoCantidad: val('h2_rev_tipoCantidad'),
    rev_fijaA: chipVal('h2_rev_fijaA'), rev_fijaEspecificar: val('h2_rev_fijaEspecificar'),
    rev_tratamiento: chipVal('h2_rev_tratamiento'), rev_tratamientoEspecificar: val('h2_rev_tratamientoEspecificar'),
    rev_estructura: chipVal('h2_rev_estructura'), rev_estructuraEspecificar: val('h2_rev_estructuraEspecificar'),
    rev_aplicacion: collectMultiCheck(H2_REV_APLICACION_OPTS, 'h2_rev_apl'), rev_aplicacionEspecificar: val('h2_rev_aplicacionEspecificar'),
    rev_remates: collectMultiCheck(H2_REV_REMATES_OPTS, 'h2_rev_rem'), rev_remateAltura: val('h2_rev_remateAltura'),
    rev_notas: val('h2_rev_notas'),
    par_perfil: val('h2_par_perfil'), par_link: val('h2_par_link'), par_mt2Vanos: val('h2_par_mt2Vanos'),
    par_anclaje: chipVal('h2_par_anclaje'), par_anclajeEspecificar: val('h2_par_anclajeEspecificar'), par_notas: val('h2_par_notas'),
    deck_apoyo: chipVal('h2_deck_apoyo'), deck_apoyoEspecificar: val('h2_deck_apoyoEspecificar'),
    deck_estructura: chipVal('h2_deck_estructura'), deck_estructuraEspecificar: val('h2_deck_estructuraEspecificar'),
    deck_fijacionTabla: chipVal('h2_deck_fijacionTabla'),
    piso_estadoSoporte: chipVal('h2_piso_estadoSoporte'), piso_estadoEspecificar: val('h2_piso_estadoEspecificar'),
    piso_sistema: collectMultiCheck(H2_PISO_SISTEMA_OPTS, 'h2_piso_sis'), piso_sistemaEspecificar: val('h2_piso_sistemaEspecificar'),
    piso_problemasPrevios: collectMultiCheck(H2_PISO_PROBLEMAS_OPTS, 'h2_piso_prob'),
    piso_notas: val('h2_piso_notas'),
    driveLink: val('h2_driveLink'),
    _completo: document.getElementById('h2_completo') ? document.getElementById('h2_completo').checked : false
  };
}
