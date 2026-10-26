/**
 * ================================================================
 * CLIENTE API REST: PLATAFORMA ODS 14 VIDA MARINA
 * ================================================================
 * Manejo centralizado de peticiones HTTP, tokens JWT y endpoints
 */

const API_BASE = '/api';

const API = {
  getToken() {
    return localStorage.getItem('ods14_token') || null;
  },

  setSession(token, user) {
    if (token) localStorage.setItem('ods14_token', token);
    if (user) localStorage.setItem('ods14_user', JSON.stringify(user));
  },

  getCurrentUser() {
    const raw = localStorage.getItem('ods14_user');
    try {
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  },

  clearSession() {
    localStorage.removeItem('ods14_token');
    localStorage.removeItem('ods14_user');
  },

  async request(endpoint, options = {}) {
    const token = this.getToken();
    const headers = {
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
      ...(options.headers || {})
    };

    try {
      const response = await fetch(`${API_BASE}${endpoint}`, {
        ...options,
        headers
      });

      let data;
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        data = await response.json();
      } else {
        data = await response.text();
      }

      if (!response.ok) {
        const errorMsg = (data && data.error) ? data.error : `Error en la solicitud HTTP (${response.status})`;
        const error = new Error(errorMsg);
        error.status = response.status;
        error.data = data;
        throw error;
      }

      return data;
    } catch (err) {
      throw err;
    }
  },

  // Auth
  async login(email, password) {
    const data = await this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    });
    this.setSession(data.token, data.user);
    return data;
  },

  async register(payload) {
    const data = await this.request('/auth/register', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
    if (data.token) {
      this.setSession(data.token, data.user);
    }
    return data;
  },

  async getMe() {
    return this.request('/auth/me');
  },

  async getInterests() {
    return this.request('/auth/interests');
  },

  // Experto
  async getExpertProfile(id) {
    return this.request(`/profiles/expert/${id}`);
  },

  async updateBio(id, scientific_bio) {
    return this.request(`/profiles/expert/${id}/bio`, {
      method: 'PUT',
      body: JSON.stringify({ scientific_bio })
    });
  },

  async addPublication(id, pubData) {
    return this.request(`/profiles/expert/${id}/publications`, {
      method: 'POST',
      body: JSON.stringify(pubData)
    });
  },

  async deletePublication(id, pubId) {
    return this.request(`/profiles/expert/${id}/publications/${pubId}`, {
      method: 'DELETE'
    });
  },

  async updateResearchAreas(id, research_areas) {
    return this.request(`/profiles/expert/${id}/research-areas`, {
      method: 'PUT',
      body: JSON.stringify({ research_areas })
    });
  },

  // Voluntario
  async getVolunteerProfile(id) {
    return this.request(`/profiles/volunteer/${id}`);
  },

  async addParticipation(id, partData) {
    return this.request(`/profiles/volunteer/${id}/participations`, {
      method: 'POST',
      body: JSON.stringify(partData)
    });
  },

  // Administrador
  async getAdminUsers(search = '', role = '') {
    const params = new URLSearchParams();
    if (search) params.append('search', search);
    if (role) params.append('role', role);
    const qs = params.toString() ? `?${params.toString()}` : '';
    return this.request(`/admin/users${qs}`);
  },

  async changeUserRole(id, newRole) {
    return this.request(`/admin/users/${id}/role`, {
      method: 'PATCH',
      body: JSON.stringify({ newRole })
    });
  },

  async changeUserStatus(id, status) {
    return this.request(`/admin/users/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status })
    });
  },

  async deleteUser(id) {
    return this.request(`/admin/users/${id}`, {
      method: 'DELETE'
    });
  },

  async getAdminReports() {
    return this.request('/admin/reports');
  },

  async reviewReport(id, status) {
    return this.request(`/admin/reports/${id}/review`, {
      method: 'PATCH',
      body: JSON.stringify({ status })
    });
  },

  async getAdminDonations() {
    return this.request('/admin/donations');
  },

  async approveDonation(id) {
    return this.request(`/admin/donations/${id}/approve`, {
      method: 'PATCH'
    });
  },

  // Calendario y Actividades (HU-P-01 Backlog)
  async getActivities() {
    return this.request('/activities');
  },

  async getActivity(id) {
    return this.request(`/activities/${id}`);
  },

  async createActivity(actData) {
    return this.request('/activities', {
      method: 'POST',
      body: JSON.stringify(actData)
    });
  },

  async enrollActivity(id) {
    return this.request(`/activities/${id}/enroll`, {
      method: 'POST'
    });
  },

  // Foro y Artículos
  async getForumThreads() {
    return this.request('/forum/threads');
  },

  async createForumThread(threadData) {
    return this.request('/forum/threads', {
      method: 'POST',
      body: JSON.stringify(threadData)
    });
  },

  async deleteForumThread(id) {
    return this.request(`/forum/threads/${id}`, {
      method: 'DELETE'
    });
  },

  // Ciudadano
  async createReport(reportData) {
    return this.request('/citizen/reports', {
      method: 'POST',
      body: JSON.stringify(reportData)
    });
  },

  async getReports() {
    return this.request('/citizen/reports');
  },

  async createDonation(donationData) {
    return this.request('/citizen/donations', {
      method: 'POST',
      body: JSON.stringify(donationData)
    });
  },

  async getDonations() {
    return this.request('/citizen/donations');
  }
};
