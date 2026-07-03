// ============================================
// API — comunicación con Apps Script
// ============================================

const API = {
  async login(token) {
    const res = await fetch(`${CONFIG.API_URL}?action=login&token=${encodeURIComponent(token)}`);
    return res.json();
  },

  async listObras(token) {
    const res = await fetch(`${CONFIG.API_URL}?action=list&token=${encodeURIComponent(token)}`);
    return res.json();
  },

  async getObra(obraId, token) {
    const res = await fetch(`${CONFIG.API_URL}?action=get&obraId=${encodeURIComponent(obraId)}&token=${encodeURIComponent(token)}`);
    return res.json();
  },

  async createObra(cliente, token) {
    const res = await fetch(CONFIG.API_URL, {
      method: 'POST',
      body: JSON.stringify({ action: 'create', cliente, token })
    });
    return res.json();
  },

  async saveHito(obraId, hito, data, estado, token) {
    const res = await fetch(CONFIG.API_URL, {
      method: 'POST',
      body: JSON.stringify({ action: 'save', obraId, hito, data, estado, token })
    });
    return res.json();
  },

  async updateEstado(obraId, estado, token) {
    const res = await fetch(CONFIG.API_URL, {
      method: 'POST',
      body: JSON.stringify({ action: 'updateEstado', obraId, estado, token })
    });
    return res.json();
  },

  async uploadFile(obraId, hito, filename, mimeType, base64Data, token) {
    const res = await fetch(CONFIG.API_URL, {
      method: 'POST',
      body: JSON.stringify({ action: 'uploadFile', obraId, hito, filename, mimeType, base64Data, token })
    });
    return res.json();
  },

  async deleteFile(obraId, hito, url, token) {
    const res = await fetch(CONFIG.API_URL, {
      method: 'POST',
      body: JSON.stringify({ action: 'deleteFile', obraId, hito, url, token })
    });
    return res.json();
  },

  async logAccion(obraId, hito, accion, token) {
    const res = await fetch(CONFIG.API_URL, {
      method: 'POST',
      body: JSON.stringify({ action: 'logAccion', obraId, hito, accion, token })
    });
    return res.json();
  },

  async getLogs(obraId, hito, token) {
    const res = await fetch(`${CONFIG.API_URL}?action=logs&obraId=${encodeURIComponent(obraId)}&hito=${encodeURIComponent(hito)}&token=${encodeURIComponent(token)}`);
    return res.json();
  },

  async listEliminadas(token) {
    const res = await fetch(`${CONFIG.API_URL}?action=listEliminadas&token=${encodeURIComponent(token)}`);
    return res.json();
  },

  async deleteObra(obraId, token) {
    const res = await fetch(CONFIG.API_URL, {
      method: 'POST',
      body: JSON.stringify({ action: 'deleteObra', obraId, token })
    });
    return res.json();
  },

  async restaurarObra(obraId, token) {
    const res = await fetch(CONFIG.API_URL, {
      method: 'POST',
      body: JSON.stringify({ action: 'restaurarObra', obraId, token })
    });
    return res.json();
  },

  async eliminarPermanente(obraId, token) {
    const res = await fetch(CONFIG.API_URL, {
      method: 'POST',
      body: JSON.stringify({ action: 'eliminarPermanente', obraId, token })
    });
    return res.json();
  },

  // ---- Maestro de Precios ----

  // Tipos, materiales, periféricos, escaladores, reductores (sólo activos).
  // Para roles con acceso a H3 (compras_admin, project_manager, gerencia).
  async getMaestro(token) {
    const res = await fetch(`${CONFIG.API_URL}?action=getMaestro&token=${encodeURIComponent(token)}`);
    return res.json();
  },

  // Todas las tablas completas (activos + inactivos). Sólo Gerencia.
  async getMaestroAdmin(token) {
    const res = await fetch(`${CONFIG.API_URL}?action=getMaestroAdmin&token=${encodeURIComponent(token)}`);
    return res.json();
  },

  // Sin login: sólo tipos/escaladores/reductores, para la calculadora pública.
  async getMaestroPublico() {
    const res = await fetch(`${CONFIG.API_URL}?action=getMaestroPublico`);
    return res.json();
  },

  // Reemplaza por completo una tabla del Maestro. Sólo Gerencia.
  // tabla: 'tipos' | 'materiales' | 'perifericos' | 'escaladores' | 'reductores' | 'segmentos'
  async saveMaestro(tabla, items, token) {
    const res = await fetch(CONFIG.API_URL, {
      method: 'POST',
      body: JSON.stringify({ action: 'saveMaestro', tabla, items, token })
    });
    return res.json();
  },

  // Historial de cambios de una tabla del Maestro (o de todas si se omite tabla). Sólo Gerencia.
  async getLogsMaestro(tabla, token) {
    const res = await fetch(`${CONFIG.API_URL}?action=logsMaestro&tabla=${encodeURIComponent(tabla || '')}&token=${encodeURIComponent(token)}`);
    return res.json();
  }
};

function isConfigured() {
  return CONFIG.API_URL && CONFIG.API_URL.indexOf('http') === 0;
}
