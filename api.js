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
  }
};

function isConfigured() {
  return CONFIG.API_URL && CONFIG.API_URL.indexOf('http') === 0;
}
