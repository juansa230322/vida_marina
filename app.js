/**
 * ================================================================
 * CONTROLADOR PRINCIPAL DE LA INTERFAZ (ODS 14 VIDA MARINA)
 * ================================================================
 * Maneja la navegación, autenticación reactiva, perfiles por rol,
 * panel de administración, calendario del backlog y modales interactivos.
 */

const App = {
  currentView: 'home',
  currentUser: null,
  interestsCatalog: [],
  selectedInterests: new Set(),

  async init() {
    this.currentUser = API.getCurrentUser();
    this.setupEventListeners();
    await this.loadInterestsCatalog();
    this.updateUserInterface();
    this.navigate('home');
  },

  async loadInterestsCatalog() {
    try {
      const data = await API.getInterests();
      this.interestsCatalog = data.interests || [];
    } catch (e) {
      console.warn('Error al cargar catálogo de intereses:', e);
    }
  },

  updateUserInterface() {
    const user = this.currentUser;
    const authActions = document.getElementById('nav-auth-actions');
    const userProfileNav = document.getElementById('nav-user-profile');
    const adminLink = document.getElementById('nav-admin-link');
    const mobileAdminLink = document.getElementById('mobile-admin-link');
    const profileLinkText = document.getElementById('profile-link-text');

    if (user) {
      if (authActions) authActions.classList.add('hidden');
      if (userProfileNav) userProfileNav.classList.remove('hidden');

      const nameEl = document.getElementById('user-display-name');
      const roleBadgeEl = document.getElementById('user-display-role');
      if (nameEl) nameEl.textContent = user.name;
      if (roleBadgeEl) {
        roleBadgeEl.textContent = this.formatRole(user.role);
        roleBadgeEl.className = `text-[10px] font-black px-2 py-0.5 rounded-full border uppercase ${this.getRoleBadgeColor(user.role)}`;
      }

      // Mostrar enlace de administración solo a Administrador General
      if (user.role === 'administrador') {
        if (adminLink) adminLink.classList.remove('hidden');
        if (mobileAdminLink) mobileAdminLink.classList.remove('hidden');
      } else {
        if (adminLink) adminLink.classList.add('hidden');
        if (mobileAdminLink) mobileAdminLink.classList.add('hidden');
      }

      if (profileLinkText) {
        profileLinkText.textContent = user.role === 'administrador' ? 'Panel Admin' : 'Mi Perfil';
      }
    } else {
      if (authActions) authActions.classList.remove('hidden');
      if (userProfileNav) userProfileNav.classList.add('hidden');
      if (adminLink) adminLink.classList.add('hidden');
      if (mobileAdminLink) mobileAdminLink.classList.add('hidden');
    }
  },

  formatRole(role) {
    const map = {
      administrador: 'Admin General',
      experto: 'Investigador Marino',
      voluntario: 'Voluntario Oceánico',
      ciudadano: 'Ciudadano Colaborador'
    };
    return map[role] || role;
  },

  getRoleBadgeColor(role) {
    const map = {
      administrador: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
      experto: 'bg-purple-500/20 text-purple-300 border-purple-500/40',
      voluntario: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
      ciudadano: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40'
    };
    return map[role] || 'bg-slate-700 text-slate-300';
  },

  navigate(view) {
    this.currentView = view;
    document.querySelectorAll('.view-section').forEach(el => el.classList.add('hidden'));

    const targetEl = document.getElementById(`view-${view}`);
    if (targetEl) {
      targetEl.classList.remove('hidden');
    }

    // Actualizar botones de navegación activos
    document.querySelectorAll('[data-nav-view]').forEach(btn => {
      const btnView = btn.getAttribute('data-nav-view');
      if (btnView === view) {
        btn.classList.add('text-cyan-400', 'border-cyan-400');
        btn.classList.remove('text-slate-300', 'border-transparent');
      } else {
        btn.classList.remove('text-cyan-400', 'border-cyan-400');
        btn.classList.add('text-slate-300', 'border-transparent');
      }
    });

    // Cargar datos específicos de la vista
    if (view === 'calendar') this.loadCalendarView();
    if (view === 'admin') this.loadAdminView();
    if (view === 'profile') this.loadProfileView();
    if (view === 'forum') this.loadForumView();
    if (view === 'citizen') this.loadCitizenView();

    window.scrollTo({ top: 0, behavior: 'smooth' });
  },

  showToast(message, type = 'success') {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    const colors = {
      success: 'bg-emerald-950/90 border-emerald-500 text-emerald-200',
      error: 'bg-red-950/90 border-red-500 text-red-200',
      info: 'bg-[#07192f]/90 border-cyan-500 text-cyan-200'
    };

    toast.className = `p-4 rounded-2xl border backdrop-blur-md shadow-2xl flex items-center gap-3 transition-all transform duration-300 translate-y-2 opacity-0 text-sm font-medium ${colors[type] || colors.info}`;
    toast.innerHTML = `
      <span class="text-xl">${type === 'success' ? '✅' : type === 'error' ? '❌' : 'ℹ️'}</span>
      <p class="flex-1">${message}</p>
      <button class="text-slate-400 hover:text-white" onclick="this.parentElement.remove()">✕</button>
    `;

    container.appendChild(toast);
    setTimeout(() => {
      toast.classList.remove('translate-y-2', 'opacity-0');
    }, 10);

    setTimeout(() => {
      toast.classList.add('opacity-0', 'translate-y-2');
      setTimeout(() => toast.remove(), 300);
    }, 4500);
  },

  // -------------------------------------------------------------
  // AUTENTICACIÓN
  // -------------------------------------------------------------
  openAuthModal(tab = 'login', forcedRole = null) {
    const modal = document.getElementById('auth-modal');
    if (!modal) return;
    modal.classList.remove('hidden');
    this.switchAuthTab(tab);

    if (forcedRole) {
      const roleRadio = document.querySelector(`input[name="reg-role"][value="${forcedRole}"]`);
      if (roleRadio) {
        roleRadio.checked = true;
        this.updateRegisterFormFields(forcedRole);
      }
    }
  },

  closeAuthModal() {
    const modal = document.getElementById('auth-modal');
    if (modal) modal.classList.add('hidden');
  },

  switchAuthTab(tab) {
    const loginForm = document.getElementById('auth-login-form');
    const registerForm = document.getElementById('auth-register-form');
    const tabLoginBtn = document.getElementById('tab-btn-login');
    const tabRegisterBtn = document.getElementById('tab-btn-register');

    if (tab === 'login') {
      loginForm?.classList.remove('hidden');
      registerForm?.classList.add('hidden');
      tabLoginBtn?.classList.add('bg-cyan-500', 'text-slate-950');
      tabLoginBtn?.classList.remove('text-slate-300');
      tabRegisterBtn?.classList.remove('bg-cyan-500', 'text-slate-950');
      tabRegisterBtn?.classList.add('text-slate-300');
    } else {
      loginForm?.classList.add('hidden');
      registerForm?.classList.remove('hidden');
      tabRegisterBtn?.classList.add('bg-cyan-500', 'text-slate-950');
      tabRegisterBtn?.classList.remove('text-slate-300');
      tabLoginBtn?.classList.remove('bg-cyan-500', 'text-slate-950');
      tabLoginBtn?.classList.add('text-slate-300');
      this.updateRegisterFormFields();
    }
  },

  updateRegisterFormFields(selectedRole = null) {
    const role = selectedRole || document.querySelector('input[name="reg-role"]:checked')?.value || 'voluntario';
    const expertFields = document.getElementById('reg-fields-expert');
    const volunteerFields = document.getElementById('reg-fields-volunteer');
    const citizenFields = document.getElementById('reg-fields-citizen');

    if (expertFields) expertFields.classList.toggle('hidden', role !== 'experto');
    if (volunteerFields) volunteerFields.classList.toggle('hidden', role !== 'voluntario');
    if (citizenFields) citizenFields.classList.toggle('hidden', role !== 'ciudadano');

    if (role === 'voluntario') {
      this.renderInterestChips();
    }
  },

  renderInterestChips() {
    const container = document.getElementById('volunteer-interests-chips');
    if (!container) return;

    container.innerHTML = '';
    this.interestsCatalog.forEach(interest => {
      const isSelected = this.selectedInterests.has(interest);
      const chip = document.createElement('button');
      chip.type = 'button';
      chip.className = `px-3 py-1.5 rounded-xl text-xs font-semibold transition-all border text-left ${
        isSelected
          ? 'bg-cyan-500 text-slate-950 border-cyan-400 shadow-md shadow-cyan-500/20'
          : 'bg-[#0b2545] text-slate-300 border-cyan-500/30 hover:border-cyan-400'
      }`;
      chip.innerHTML = `${isSelected ? '✓ ' : '+ '} ${interest}`;
      chip.onclick = () => {
        if (this.selectedInterests.has(interest)) {
          this.selectedInterests.delete(interest);
        } else {
          this.selectedInterests.add(interest);
        }
        this.renderInterestChips();
      };
      container.appendChild(chip);
    });

    const helperText = document.getElementById('interests-helper-text');
    if (helperText) {
      helperText.textContent = `Seleccionados: ${this.selectedInterests.size} de ${this.interestsCatalog.length}`;
    }
  },

  async handleLogin(email, password) {
    try {
      const res = await API.login(email, password);
      this.currentUser = res.user;
      this.updateUserInterface();
      this.closeAuthModal();
      this.showToast(`¡Bienvenido(a) ${res.user.name}! Sesión iniciada como ${this.formatRole(res.user.role)}.`);

      if (res.user.role === 'administrador') {
        this.navigate('admin');
      } else {
        this.navigate('profile');
      }
    } catch (err) {
      this.showToast(err.message, 'error');
    }
  },

  async handleRegister(formData) {
    try {
      const res = await API.register(formData);
      this.currentUser = res.user;
      this.updateUserInterface();
      this.closeAuthModal();
      this.showToast(res.message || 'Registro exitoso.');
      this.navigate('profile');
    } catch (err) {
      this.showToast(err.message, 'error');
    }
  },

  logout() {
    API.clearSession();
    this.currentUser = null;
    this.updateUserInterface();
    this.showToast('Sesión cerrada correctamente. Modo visitante activo.', 'info');
    this.navigate('home');
  },

  // Acceso rápido de prueba para evaluadores
  quickFillLogin(role) {
    const creds = {
      admin: { email: 'admin@vidamarina.org', pass: 'Admin123!' },
      experto: { email: 'dr.marina@vidamarina.org', pass: 'Experto123!' },
      voluntario: { email: 'voluntario.activo@vidamarina.org', pass: 'Voluntario123!' },
      ciudadano: { email: 'ciudadano@vidamarina.org', pass: 'Ciudadano123!' }
    };
    const c = creds[role];
    if (c) {
      document.getElementById('login-email').value = c.email;
      document.getElementById('login-password').value = c.pass;
      this.handleLogin(c.email, c.pass);
    }
  },

  // -------------------------------------------------------------
  // VISTA: PERFILES (RF02)
  // -------------------------------------------------------------
  async loadProfileView() {
    if (!this.currentUser) {
      this.openAuthModal('login');
      return;
    }

    if (this.currentUser.role === 'administrador') {
      this.navigate('admin');
      return;
    }

    const container = document.getElementById('profile-content-container');
    if (!container) return;
    container.innerHTML = `<div class="p-8 text-center text-slate-400">Cargando perfil...</div>`;

    if (this.currentUser.role === 'experto') {
      await this.renderExpertProfile(container);
    } else if (this.currentUser.role === 'voluntario') {
      await this.renderVolunteerProfile(container);
    } else if (this.currentUser.role === 'ciudadano') {
      await this.renderCitizenProfile(container);
    }
  },

  async renderExpertProfile(container) {
    try {
      const data = await API.getExpertProfile(this.currentUser.id);
      const user = data.user;
      const profile = data.profile || {};
      const publications = data.publications || [];

      container.innerHTML = `
        <div class="space-y-8 animate-in fade-in duration-300">
          <!-- Tarjeta Superior Perfil Experto -->
          <div class="ocean-glass-card rounded-3xl p-6 sm:p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div class="flex items-center gap-4 sm:gap-6">
              <div class="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-tr from-purple-600 to-cyan-400 flex items-center justify-center text-3xl shadow-lg ring-2 ring-purple-400/50">
                🔬
              </div>
              <div>
                <div class="flex flex-wrap items-center gap-2">
                  <h2 class="text-2xl sm:text-3xl font-black text-white">${user.name}</h2>
                  <span class="text-xs font-black px-2.5 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/40">
                    Investigador Marino Certificado
                  </span>
                </div>
                <p class="text-sm text-cyan-300 mt-1 font-semibold">${profile.biological_specialty || 'Especialidad biológica no registrada'}</p>
                <p class="text-xs text-slate-400 mt-0.5">🏛️ ${profile.institution || 'Institución'} • 📜 ${profile.professional_credentials || 'Credenciales'}</p>
              </div>
            </div>
          </div>

          <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <!-- Columna Izquierda: Biografía y Áreas de Investigación -->
            <div class="lg:col-span-2 space-y-6">
              <!-- Biografía Científica Editable (CP-HU-002-1-01) -->
              <div class="ocean-glass-card rounded-3xl p-6 space-y-4">
                <div class="flex items-center justify-between">
                  <h3 class="text-lg font-black text-white flex items-center gap-2">
                    <span>📖</span> Biografía Científica
                  </h3>
                  <button id="btn-edit-bio" onclick="App.toggleBioEditor(true)" class="px-3 py-1.5 rounded-xl bg-[#0b2545] border border-cyan-500/30 hover:border-cyan-400 text-cyan-300 text-xs font-bold transition-all">
                    ✏️ Editar Biografía
                  </button>
                </div>

                <div id="bio-display" class="text-sm text-slate-300 leading-relaxed bg-[#07192f]/60 p-4 rounded-2xl border border-slate-800">
                  ${profile.scientific_bio ? profile.scientific_bio : '<em class="text-slate-500">Sin biografía científica registrada aún. Haz clic en "Editar Biografía" para agregar tu trayectoria.</em>'}
                </div>

                <div id="bio-editor" class="hidden space-y-3">
                  <textarea id="bio-input" rows="4" class="w-full bg-[#07192f] border border-cyan-400 rounded-2xl p-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-cyan-500">${profile.scientific_bio || ''}</textarea>
                  <div class="flex gap-2 justify-end">
                    <button onclick="App.toggleBioEditor(false)" class="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-bold hover:bg-slate-700">Cancelar</button>
                    <button onclick="App.saveBio()" class="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-black uppercase">Guardar Cambios</button>
                  </div>
                </div>
              </div>

              <!-- Publicaciones Científicas (CP-HU-002-1-02) -->
              <div class="ocean-glass-card rounded-3xl p-6 space-y-4">
                <div class="flex items-center justify-between">
                  <div>
                    <h3 class="text-lg font-black text-white flex items-center gap-2">
                      <span>📚</span> Publicaciones y Artículos Científicos
                    </h3>
                    <p class="text-xs text-slate-400">Total registradas: ${publications.length}</p>
                  </div>
                  <button onclick="App.openAddPublicationModal()" class="px-3.5 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black text-xs uppercase shadow-md shadow-cyan-500/20">
                    ➕ Nueva Publicación
                  </button>
                </div>

                <div class="space-y-3">
                  ${publications.length > 0 ? publications.map(pub => `
                    <div class="p-4 rounded-2xl bg-[#07192f]/80 border border-slate-800 hover:border-cyan-500/30 transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                      <div class="space-y-1">
                        <h4 class="text-sm font-bold text-white">${pub.title}</h4>
                        <p class="text-xs text-cyan-300">📖 ${pub.journal || 'Revista no especificada'} • Año: <strong>${pub.year}</strong></p>
                        ${pub.url ? `<a href="${pub.url}" target="_blank" class="text-xs text-cyan-400 underline block truncate max-w-md">🔗 ${pub.url}</a>` : ''}
                      </div>
                      <button onclick="App.deletePublication(${pub.id})" class="p-2 rounded-xl bg-red-500/20 hover:bg-red-500/40 text-red-300 text-xs font-bold transition-all self-end sm:self-center" title="Eliminar publicación">
                        🗑️ Eliminar
                      </button>
                    </div>
                  `).join('') : `
                    <div class="p-6 text-center text-slate-400 bg-[#07192f]/40 rounded-2xl border border-dashed border-slate-800 text-xs">
                      No tienes publicaciones registradas en tu perfil. Haz clic en "Nueva Publicación" para incorporar tus investigaciones.
                    </div>
                  `}
                </div>
              </div>
            </div>

            <!-- Columna Derecha: Áreas de Investigación (CP-HU-002-1-03) -->
            <div class="space-y-6">
              <div class="ocean-glass-card rounded-3xl p-6 space-y-4">
                <div class="flex items-center justify-between">
                  <h3 class="text-base font-black text-white flex items-center gap-2">
                    <span>🪸</span> Áreas de Investigación
                  </h3>
                  <button onclick="App.openEditAreasModal()" class="text-xs text-cyan-400 hover:underline">
                    Editar
                  </button>
                </div>
                <div class="flex flex-wrap gap-2">
                  ${(profile.research_areas && profile.research_areas.length > 0)
                    ? profile.research_areas.map(area => `<span class="px-3 py-1 rounded-xl bg-[#0b2545] border border-cyan-500/30 text-cyan-200 text-xs font-semibold">${area}</span>`).join('')
                    : `<span class="text-xs text-slate-500">Sin áreas definidas.</span>`
                  }
                </div>
              </div>

              <div class="p-5 rounded-3xl bg-cyan-950/40 border border-cyan-500/30 text-xs text-slate-300 space-y-2">
                <h4 class="font-bold text-cyan-300 flex items-center gap-1.5">
                  <span>🛡️</span> Permisos de tu Rol (HU-009-1-02)
                </h4>
                <ul class="list-disc list-inside space-y-1 text-slate-400">
                  <li>Crear y liderar debates en el Foro Comunitario.</li>
                  <li>Publicar y gestionar tus artículos científicos.</li>
                  <li>Perfil público verificable por la comunidad oceánica.</li>
                  <li class="text-amber-400/90 font-medium">Acceso restringido al Panel de Administración General.</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      `;
    } catch (e) {
      container.innerHTML = `<div class="p-8 text-center text-red-400">Error al cargar perfil de experto: ${e.message}</div>`;
    }
  },

  toggleBioEditor(show) {
    document.getElementById('bio-display')?.classList.toggle('hidden', show);
    document.getElementById('bio-editor')?.classList.toggle('hidden', !show);
    document.getElementById('btn-edit-bio')?.classList.toggle('hidden', show);
  },

  async saveBio() {
    const input = document.getElementById('bio-input');
    if (!input) return;
    try {
      await API.updateBio(this.currentUser.id, input.value);
      this.showToast('Biografía científica actualizada exitosamente.');
      this.loadProfileView();
    } catch (e) {
      this.showToast(e.message, 'error');
    }
  },

  openAddPublicationModal() {
    const modal = document.getElementById('publication-modal');
    if (modal) modal.classList.remove('hidden');
  },

  closeAddPublicationModal() {
    const modal = document.getElementById('publication-modal');
    if (modal) modal.classList.add('hidden');
  },

  async handleAddPublication(e) {
    e.preventDefault();
    const title = document.getElementById('pub-title').value;
    const year = document.getElementById('pub-year').value;
    const journal = document.getElementById('pub-journal').value;
    const url = document.getElementById('pub-url').value;

    try {
      await API.addPublication(this.currentUser.id, { title, year, journal, url });
      this.showToast('Publicación científica agregada exitosamente.');
      this.closeAddPublicationModal();
      this.loadProfileView();
    } catch (err) {
      this.showToast(err.message, 'error');
    }
  },

  async deletePublication(pubId) {
    if (confirm('¿Estás seguro de que deseas eliminar esta publicación científica?')) {
      try {
        await API.deletePublication(this.currentUser.id, pubId);
        this.showToast('Publicación científica eliminada correctamente.');
        this.loadProfileView();
      } catch (e) {
        this.showToast(e.message, 'error');
      }
    }
  },

  openEditAreasModal() {
    const currentAreas = prompt('Ingresa las áreas de investigación separadas por coma:', 'Restauración de corales, Acidificación oceánica, Áreas marinas protegidas');
    if (currentAreas !== null) {
      const areasArray = currentAreas.split(',').map(s => s.trim()).filter(s => s.length > 0);
      API.updateResearchAreas(this.currentUser.id, areasArray)
        .then(() => {
          this.showToast('Áreas de investigación actualizadas con éxito.');
          this.loadProfileView();
        })
        .catch(err => this.showToast(err.message, 'error'));
    }
  },

  // -------------------------------------------------------------
  // PERFIL DE VOLUNTARIO (RF02 - HU-002-2)
  // -------------------------------------------------------------
  async renderVolunteerProfile(container) {
    try {
      const data = await API.getVolunteerProfile(this.currentUser.id);
      const user = data.user;
      const participations = data.participations || [];
      const totalHours = data.totalHours || 0;
      const badges = data.badges || [];
      const interests = data.interests || [];

      container.innerHTML = `
        <div class="space-y-8 animate-in fade-in duration-300">
          <!-- Cabecera Perfil Voluntario -->
          <div class="ocean-glass-card rounded-3xl p-6 sm:p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div class="flex items-center gap-4 sm:gap-6">
              <div class="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-tr from-emerald-500 to-cyan-400 flex items-center justify-center text-3xl shadow-lg ring-2 ring-emerald-400/50">
                🌿
              </div>
              <div>
                <div class="flex flex-wrap items-center gap-2">
                  <h2 class="text-2xl sm:text-3xl font-black text-white">${user.name}</h2>
                  <span class="text-xs font-black px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                    Voluntario del Océano Activo
                  </span>
                </div>
                <p class="text-xs text-slate-400 mt-1">📍 ${user.location || 'Costas de Colombia'} • Miembro voluntario ODS 14</p>
                <div class="flex flex-wrap gap-1.5 mt-2">
                  ${interests.map(i => `<span class="text-[10px] bg-[#0b2545] text-cyan-300 px-2 py-0.5 rounded-md border border-cyan-500/20">${i}</span>`).join('')}
                </div>
              </div>
            </div>

            <!-- Métricas Clave (CP-HU-002-2-02) -->
            <div class="flex items-center gap-4 w-full md:w-auto justify-around md:justify-end bg-[#07192f]/60 p-4 rounded-2xl border border-cyan-500/20">
              <div class="text-center">
                <span class="text-3xl sm:text-4xl font-black text-cyan-400 font-heading" id="volunteer-total-hours">${totalHours}h</span>
                <p class="text-[11px] text-slate-400 uppercase font-bold tracking-wider">Horas Aportadas</p>
              </div>
              <div class="h-10 w-px bg-slate-800"></div>
              <div class="text-center">
                <span class="text-3xl sm:text-4xl font-black text-emerald-400 font-heading">${participations.length}</span>
                <p class="text-[11px] text-slate-400 uppercase font-bold tracking-wider">Actividades</p>
              </div>
              <div class="h-10 w-px bg-slate-800"></div>
              <div class="text-center">
                <span class="text-3xl sm:text-4xl font-black text-amber-400 font-heading">${badges.length}</span>
                <p class="text-[11px] text-slate-400 uppercase font-bold tracking-wider">Insignias</p>
              </div>
            </div>
          </div>

          <!-- Insignias de Reconocimiento (CP-HU-002-2-03) -->
          <div class="ocean-glass-card rounded-3xl p-6 space-y-4">
            <h3 class="text-lg font-black text-white flex items-center gap-2">
              <span>🏆</span> Insignias por Metas Alcanzadas
            </h3>
            <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
              ${badges.length > 0 ? badges.map(b => `
                <div class="p-4 rounded-2xl bg-gradient-to-br from-[#0b2545] to-[#07192f] border border-amber-500/40 text-center space-y-2 shadow-lg">
                  <div class="text-4xl animate-bounce">${b.icon}</div>
                  <h4 class="text-sm font-bold text-white">${b.name}</h4>
                  <p class="text-xs text-slate-300 leading-tight">${b.description}</p>
                  <span class="text-[10px] font-black text-amber-300 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/30 inline-block">
                    Meta: ${b.required_hours} Horas
                  </span>
                </div>
              `).join('') : `
                <div class="sm:col-span-3 p-6 text-center text-slate-400 bg-[#07192f]/40 rounded-2xl border border-dashed border-slate-800 text-xs">
                  Sin insignias desbloqueadas aún. ¡Completa tu primera jornada o acumula 10 horas de servicio para obtener la insignia de "Defensor del Arrecife"!
                </div>
              `}
            </div>
          </div>

          <!-- Historial de Participaciones (CP-HU-002-2-01) -->
          <div class="ocean-glass-card rounded-3xl p-6 space-y-4">
            <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 class="text-lg font-black text-white flex items-center gap-2">
                  <span>📅</span> Historial de Participación en Conservación
                </h3>
                <p class="text-xs text-slate-400">Registro cronológico de jornadas y horas validadas</p>
              </div>

              <!-- Simulador de Nueva Participación (CP-HU-002-2-05) -->
              <button onclick="App.simulateNewParticipation()" class="px-3.5 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black text-xs uppercase shadow-md shadow-cyan-500/20 flex items-center gap-1.5 self-start sm:self-auto">
                <span>⚡</span> Registrar Jornada (+2h)
              </button>
            </div>

            ${participations.length > 0 ? `
              <div class="divide-y divide-slate-800 overflow-hidden">
                ${participations.map(p => `
                  <div class="py-3.5 flex items-center justify-between gap-4">
                    <div class="space-y-0.5">
                      <h4 class="text-sm font-bold text-white">${p.activity_name}</h4>
                      <p class="text-xs text-slate-400">Registrado el ${new Date(p.registered_at).toLocaleDateString()} • Estado: <span class="text-emerald-400 font-semibold">${p.status}</span></p>
                    </div>
                    <span class="px-3 py-1 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 font-black text-xs whitespace-nowrap">
                      +${p.hours} Horas
                    </span>
                  </div>
                `).join('')}
              </div>
            ` : `
              <!-- Mensaje para voluntario sin actividad (CP-HU-002-2-04) -->
              <div class="p-8 text-center bg-cyan-950/20 rounded-2xl border border-dashed border-cyan-500/30 space-y-3">
                <span class="text-4xl">🌊</span>
                <h4 class="text-base font-bold text-white">¡Bienvenido(a) a la comunidad marina!</h4>
                <p class="text-xs text-slate-300 max-w-md mx-auto">
                  ${data.emptyMessage || 'Aún no has participado en actividades de conservación marina. ¡Te invitamos a explorar las convocatorias abiertas y unirte a la acción!'}
                </p>
                <button onclick="App.navigate('calendar')" class="px-4 py-2 rounded-xl bg-cyan-500 text-slate-950 text-xs font-bold uppercase hover:bg-cyan-400">
                  Explorar Calendario de Actividades
                </button>
              </div>
            `}
          </div>
        </div>
      `;
    } catch (e) {
      container.innerHTML = `<div class="p-8 text-center text-red-400">Error al cargar perfil de voluntario: ${e.message}</div>`;
    }
  },

  async simulateNewParticipation() {
    try {
      const res = await API.addParticipation(this.currentUser.id, {
        activity_name: 'Jornada Comunitaria de Siembra de Corales 2026',
        hours: 2
      });
      this.showToast('¡Nueva participación registrada con éxito! Total de horas actualizado a ' + res.totalHours + 'h.');
      this.loadProfileView();
    } catch (e) {
      this.showToast(e.message, 'error');
    }
  },

  // -------------------------------------------------------------
  // PERFIL DE CIUDADANO (RF01 / RF09)
  // -------------------------------------------------------------
  async renderCitizenProfile(container) {
    container.innerHTML = `
      <div class="space-y-6 animate-in fade-in duration-300">
        <div class="ocean-glass-card rounded-3xl p-6 sm:p-8">
          <div class="flex items-center gap-4">
            <div class="w-16 h-16 rounded-2xl bg-cyan-500/20 text-cyan-300 flex items-center justify-center text-3xl border border-cyan-500/40">
              🌊
            </div>
            <div>
              <h2 class="text-2xl font-black text-white">${this.currentUser.name}</h2>
              <p class="text-xs text-cyan-300 font-semibold">Ciudadano / Colaborador ODS 14</p>
              <p class="text-xs text-slate-400 mt-0.5">📍 Ubicación: ${this.currentUser.location || 'No registrada'}</p>
            </div>
          </div>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div class="ocean-glass-card rounded-3xl p-6 space-y-3 text-center">
            <span class="text-4xl">🚨</span>
            <h3 class="text-base font-black text-white">Denuncias Ambientales</h3>
            <p class="text-xs text-slate-300">Reporta vertimientos, basura marina o daño a fauna en costas y manglares.</p>
            <button onclick="App.navigate('citizen')" class="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs uppercase">
              Registrar Denuncia
            </button>
          </div>

          <div class="ocean-glass-card rounded-3xl p-6 space-y-3 text-center">
            <span class="text-4xl">💙</span>
            <h3 class="text-base font-black text-white">Campañas de Donación</h3>
            <p class="text-xs text-slate-300">Contribuye directamente a la adquisición de guarderías de coral y equipos de limpieza.</p>
            <button onclick="App.navigate('citizen')" class="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs uppercase">
              Aportar a Campaña
            </button>
          </div>
        </div>
      </div>
    `;
  },

  // -------------------------------------------------------------
  // VISTA: PANEL DE ADMINISTRACIÓN GENERAL (RF09 - HU-009-2)
  // -------------------------------------------------------------
  async loadAdminView() {
    if (!this.currentUser || this.currentUser.role !== 'administrador') {
      this.showToast('Permiso insuficiente. Esta sección está reservada exclusivamente para el Administrador General.', 'error');
      this.navigate('home');
      return;
    }

    await this.fetchAndRenderAdminUsers();
  },

  async fetchAndRenderAdminUsers() {
    const search = document.getElementById('admin-search-input')?.value || '';
    const role = document.getElementById('admin-role-filter')?.value || '';
    const tableBody = document.getElementById('admin-users-table-body');
    const emptyMsgEl = document.getElementById('admin-empty-message');

    if (!tableBody) return;
    tableBody.innerHTML = `<tr><td colspan="5" class="p-6 text-center text-slate-400">Cargando usuarios...</td></tr>`;

    try {
      const data = await API.getAdminUsers(search, role);
      const users = data.users || [];

      if (users.length === 0) {
        tableBody.innerHTML = '';
        if (emptyMsgEl) {
          emptyMsgEl.classList.remove('hidden');
          emptyMsgEl.textContent = data.emptyMessage || 'No se encontraron usuarios coincidentes.';
        }
        return;
      }

      if (emptyMsgEl) emptyMsgEl.classList.add('hidden');

      tableBody.innerHTML = users.map(u => `
        <tr class="border-b border-slate-800 hover:bg-[#07192f]/60 transition-colors">
          <td class="p-4">
            <div class="font-bold text-white text-sm">${u.name}</div>
            <div class="text-xs text-slate-400">${u.email}</div>
          </td>
          <td class="p-4">
            <span class="text-xs font-black px-2.5 py-1 rounded-full border ${this.getRoleBadgeColor(u.role)}">
              ${this.formatRole(u.role)}
            </span>
          </td>
          <td class="p-4">
            <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${
              u.status === 'activo'
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                : 'bg-red-500/20 text-red-300 border border-red-500/40'
            }">
              <span class="w-1.5 h-1.5 rounded-full ${u.status === 'activo' ? 'bg-emerald-400' : 'bg-red-400'}"></span>
              ${u.status === 'activo' ? 'Activo' : 'Suspendido'}
            </span>
          </td>
          <td class="p-4 text-xs text-slate-400 hidden sm:table-cell">
            ${u.location || 'No especificada'}
          </td>
          <td class="p-4 text-right">
            <div class="flex items-center justify-end gap-1.5">
              <!-- Cambiar Rol (CP-HU-009-2-03) -->
              <button onclick="App.openChangeRoleModal(${u.id}, '${u.name}', '${u.role}')" class="px-2.5 py-1 rounded-lg bg-cyan-950 hover:bg-cyan-900 border border-cyan-500/30 text-cyan-300 text-xs font-bold transition-all" title="Cambiar Rol">
                🔄 Rol
              </button>

              <!-- Suspender / Reactivar (CP-HU-009-2-04) -->
              <button onclick="App.toggleUserStatus(${u.id}, '${u.name}', '${u.status}')" class="px-2.5 py-1 rounded-lg ${
                u.status === 'activo'
                  ? 'bg-amber-950/60 hover:bg-amber-900 border border-amber-500/30 text-amber-300'
                  : 'bg-emerald-950/60 hover:bg-emerald-900 border border-emerald-500/30 text-emerald-300'
              } text-xs font-bold transition-all" title="${u.status === 'activo' ? 'Suspender cuenta' : 'Reactivar cuenta'}">
                ${u.status === 'activo' ? '⏸️ Suspender' : '▶️ Reactivar'}
              </button>

              <!-- Eliminar con confirmación (CP-HU-009-2-04) -->
              <button onclick="App.confirmDeleteUser(${u.id}, '${u.name}')" class="px-2.5 py-1 rounded-lg bg-red-950/60 hover:bg-red-900 border border-red-500/30 text-red-300 text-xs font-bold transition-all" title="Eliminar usuario">
                🗑️
              </button>
            </div>
          </td>
        </tr>
      `).join('');
    } catch (e) {
      tableBody.innerHTML = `<tr><td colspan="5" class="p-6 text-center text-red-400">${e.message}</td></tr>`;
    }
  },

  openChangeRoleModal(userId, name, currentRole) {
    const modal = document.getElementById('change-role-modal');
    if (!modal) return;
    document.getElementById('change-role-user-id').value = userId;
    document.getElementById('change-role-user-name').textContent = name;
    document.getElementById('change-role-select').value = currentRole;
    modal.classList.remove('hidden');
  },

  closeChangeRoleModal() {
    document.getElementById('change-role-modal')?.classList.add('hidden');
  },

  async submitChangeRole() {
    const userId = document.getElementById('change-role-user-id').value;
    const newRole = document.getElementById('change-role-select').value;
    try {
      const res = await API.changeUserRole(userId, newRole);
      this.showToast(res.message);
      this.closeChangeRoleModal();
      this.fetchAndRenderAdminUsers();
    } catch (e) {
      this.showToast(e.message, 'error');
    }
  },

  async toggleUserStatus(userId, name, currentStatus) {
    const nextStatus = currentStatus === 'activo' ? 'suspendido' : 'activo';
    const actionText = nextStatus === 'suspendido' ? 'suspender' : 'reactivar';

    if (confirm(`¿Deseas ${actionText} la cuenta de "${name}"?`)) {
      try {
        const res = await API.changeUserStatus(userId, nextStatus);
        this.showToast(res.message);
        this.fetchAndRenderAdminUsers();
      } catch (e) {
        this.showToast(e.message, 'error');
      }
    }
  },

  async confirmDeleteUser(userId, name) {
    if (confirm(`¿Deseas eliminar definitivamente al usuario "${name}"? Esta acción borrará todas sus participaciones y registros asociados.`)) {
      try {
        const res = await API.deleteUser(userId);
        this.showToast(res.message);
        this.fetchAndRenderAdminUsers();
      } catch (e) {
        this.showToast(e.message, 'error');
      }
    }
  },

  // -------------------------------------------------------------
  // VISTA: CALENDARIO DE ACTIVIDADES (HU-P-01 BACKLOG)
  // -------------------------------------------------------------
  async loadCalendarView() {
    const container = document.getElementById('calendar-activities-list');
    const adminCreateBtn = document.getElementById('btn-admin-create-activity');

    if (adminCreateBtn) {
      adminCreateBtn.classList.toggle('hidden', !(this.currentUser && this.currentUser.role === 'administrador'));
    }

    if (!container) return;
    container.innerHTML = `<div class="p-8 text-center text-slate-400">Cargando actividades del calendario...</div>`;

    try {
      const data = await API.getActivities();
      const activities = data.activities || [];

      if (activities.length === 0) {
        container.innerHTML = `<div class="p-8 text-center text-slate-400">No hay actividades programadas.</div>`;
        return;
      }

      container.innerHTML = activities.map(act => `
        <div class="ocean-glass-card rounded-3xl p-6 flex flex-col justify-between space-y-4 hover:border-cyan-400 transition-all">
          <div class="space-y-2">
            <div class="flex items-center justify-between">
              <span class="text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                ${act.activity_type}
              </span>
              <span class="text-xs text-slate-400 flex items-center gap-1">
                📅 ${act.date}
              </span>
            </div>
            <h3 class="text-lg font-bold text-white leading-snug">${act.title}</h3>
            <p class="text-xs text-slate-300 line-clamp-2 leading-relaxed">${act.description}</p>
          </div>

          <div class="pt-3 border-t border-slate-800 space-y-2 text-xs text-slate-400">
            <div class="flex items-center justify-between">
              <span>🕒 ${act.time}</span>
              <span>📍 ${act.location}</span>
            </div>
            <div class="flex items-center justify-between">
              <span class="text-cyan-300 font-bold">Cupos: ${act.volunteer_spots} voluntarios</span>
              <div class="flex gap-2">
                <button onclick="App.openActivityDetailModal(${act.id})" class="px-3 py-1.5 rounded-xl bg-[#0b2545] border border-cyan-500/30 text-cyan-300 hover:text-white font-bold">
                  Detalles
                </button>
                ${(this.currentUser && this.currentUser.role === 'voluntario') ? `
                  <button onclick="App.enrollInActivity(${act.id})" class="px-3 py-1.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black">
                    Postularme
                  </button>
                ` : ''}
              </div>
            </div>
          </div>
        </div>
      `).join('');
    } catch (e) {
      container.innerHTML = `<div class="p-8 text-center text-red-400">Error al cargar actividades: ${e.message}</div>`;
    }
  },

  async openActivityDetailModal(actId) {
    try {
      const data = await API.getActivity(actId);
      const act = data.activity;
      const modal = document.getElementById('activity-detail-modal');
      const content = document.getElementById('activity-detail-content');

      if (content) {
        content.innerHTML = `
          <div class="space-y-4">
            <div class="flex items-center justify-between">
              <span class="text-xs font-black uppercase px-2.5 py-1 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                ${act.activity_type}
              </span>
              <span class="text-xs font-bold text-slate-400">Cupos restantes: <strong class="text-emerald-400">${data.remainingSpots}</strong> de ${act.volunteer_spots}</span>
            </div>
            <h3 class="text-2xl font-black text-white">${act.title}</h3>
            <p class="text-sm text-slate-300 leading-relaxed">${act.description}</p>
            <div class="p-4 rounded-2xl bg-[#0b2545]/60 border border-cyan-500/20 space-y-2 text-xs text-slate-300">
              <p>📅 <strong>Fecha:</strong> ${act.date}</p>
              <p>🕒 <strong>Horario:</strong> ${act.time}</p>
              <p>📍 <strong>Lugar de encuentro:</strong> ${act.location}</p>
            </div>
            ${(this.currentUser && this.currentUser.role === 'voluntario') ? `
              <button onclick="App.enrollInActivity(${act.id})" class="w-full py-3 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black text-xs uppercase shadow-lg shadow-cyan-500/20">
                Confirmar Postulación como Voluntario
              </button>
            ` : ''}
          </div>
        `;
      }
      modal?.classList.remove('hidden');
    } catch (e) {
      this.showToast(e.message, 'error');
    }
  },

  closeActivityDetailModal() {
    document.getElementById('activity-detail-modal')?.classList.add('hidden');
  },

  openCreateActivityModal() {
    if (!this.currentUser || this.currentUser.role !== 'administrador') {
      this.showToast('Permiso insuficiente. Solo el Administrador General puede crear actividades.', 'error');
      return;
    }
    document.getElementById('create-activity-modal')?.classList.remove('hidden');
  },

  closeCreateActivityModal() {
    document.getElementById('create-activity-modal')?.classList.add('hidden');
  },

  async handleCreateActivitySubmit(e) {
    e.preventDefault();
    const title = document.getElementById('act-title').value;
    const description = document.getElementById('act-description').value;
    const date = document.getElementById('act-date').value;
    const time = document.getElementById('act-time').value;
    const location = document.getElementById('act-location').value;
    const volunteer_spots = document.getElementById('act-spots').value;
    const activity_type = document.getElementById('act-type').value;

    try {
      const res = await API.createActivity({
        title,
        description,
        date,
        time,
        location,
        volunteer_spots,
        activity_type
      });
      this.showToast(res.message);
      this.closeCreateActivityModal();
      this.loadCalendarView();
    } catch (err) {
      this.showToast(err.message, 'error');
    }
  },

  async enrollInActivity(actId) {
    try {
      const res = await API.enrollActivity(actId);
      this.showToast(res.message);
      this.closeActivityDetailModal();
    } catch (e) {
      this.showToast(e.message, 'error');
    }
  },

  // -------------------------------------------------------------
  // VISTA: FORO Y ARTÍCULOS (RF09)
  // -------------------------------------------------------------
  async loadForumView() {
    const list = document.getElementById('forum-threads-list');
    if (!list) return;
    list.innerHTML = `<div class="p-8 text-center text-slate-400">Cargando debates científicos...</div>`;

    try {
      const data = await API.getForumThreads();
      const threads = data.threads || [];

      if (threads.length === 0) {
        list.innerHTML = `<div class="p-8 text-center text-slate-400">No hay hilos en el foro actualmente.</div>`;
        return;
      }

      list.innerHTML = threads.map(t => `
        <div class="ocean-glass-card rounded-3xl p-6 space-y-3">
          <div class="flex items-center justify-between">
            <span class="text-xs font-bold text-cyan-300 bg-cyan-950 px-2.5 py-0.5 rounded-full border border-cyan-500/30">
              ${t.category}
            </span>
            <span class="text-xs text-slate-400">${new Date(t.created_at).toLocaleDateString()}</span>
          </div>
          <h3 class="text-xl font-bold text-white">${t.title}</h3>
          <p class="text-sm text-slate-300 leading-relaxed">${t.content}</p>
          <div class="flex items-center justify-between pt-3 border-t border-slate-800 text-xs text-slate-400">
            <span>✍️ Publicado por: <strong class="text-purple-300">${t.author_name}</strong> (${this.formatRole(t.author_role)})</span>
            ${(this.currentUser && this.currentUser.role === 'administrador') ? `
              <button onclick="App.deleteForumThread(${t.id})" class="px-2.5 py-1 rounded-lg bg-red-500/20 text-red-300 font-bold hover:bg-red-500/30">
                🗑️ Moderar / Eliminar
              </button>
            ` : ''}
          </div>
        </div>
      `).join('');
    } catch (e) {
      list.innerHTML = `<div class="p-8 text-center text-red-400">${e.message}</div>`;
    }
  },

  openNewThreadModal() {
    if (!this.currentUser) {
      this.openAuthModal('login');
      return;
    }
    if (this.currentUser.role !== 'experto' && this.currentUser.role !== 'administrador') {
      this.showToast('Permiso insuficiente. Solo los expertos e investigadores marinos pueden crear hilos en el foro.', 'error');
      return;
    }
    document.getElementById('new-thread-modal')?.classList.remove('hidden');
  },

  closeNewThreadModal() {
    document.getElementById('new-thread-modal')?.classList.add('hidden');
  },

  async handleNewThreadSubmit(e) {
    e.preventDefault();
    const title = document.getElementById('thread-title').value;
    const category = document.getElementById('thread-category').value;
    const content = document.getElementById('thread-content').value;

    try {
      const res = await API.createForumThread({ title, category, content });
      this.showToast(res.message);
      this.closeNewThreadModal();
      this.loadForumView();
    } catch (err) {
      this.showToast(err.message, 'error');
    }
  },

  async deleteForumThread(id) {
    if (confirm('¿Estás seguro de que deseas moderar y eliminar este hilo del foro?')) {
      try {
        const res = await API.deleteForumThread(id);
        this.showToast(res.message);
        this.loadForumView();
      } catch (e) {
        this.showToast(e.message, 'error');
      }
    }
  },

  // -------------------------------------------------------------
  // VISTA: ACCIONES CIUDADANAS (DENUNCIAS Y DONACIONES)
  // -------------------------------------------------------------
  async loadCitizenView() {
    this.loadCitizenReports();
    this.loadCitizenDonations();
  },

  async loadCitizenReports() {
    const list = document.getElementById('citizen-reports-list');
    if (!list) return;
    try {
      const data = await API.getReports();
      const reports = data.reports || [];
      if (reports.length === 0) {
        list.innerHTML = '<p class="text-xs text-slate-400">No hay denuncias ambientales registradas.</p>';
        return;
      }
      list.innerHTML = reports.map(r => `
        <div class="p-4 rounded-2xl bg-[#07192f]/70 border border-slate-800 space-y-1.5">
          <div class="flex items-center justify-between">
            <h4 class="text-sm font-bold text-white">${r.title}</h4>
            <span class="text-[10px] font-bold px-2 py-0.5 rounded-full ${r.status === 'pendiente' ? 'bg-amber-500/20 text-amber-300' : 'bg-emerald-500/20 text-emerald-300'}">${r.status}</span>
          </div>
          <p class="text-xs text-slate-300">${r.description}</p>
          <p class="text-[11px] text-slate-400">📍 ${r.location} • Reportado por: ${r.citizen_name}</p>
        </div>
      `).join('');
    } catch (e) {
      list.innerHTML = `<p class="text-xs text-red-400">${e.message}</p>`;
    }
  },

  async loadCitizenDonations() {
    const list = document.getElementById('citizen-donations-list');
    if (!list) return;
    try {
      const data = await API.getDonations();
      const donations = data.donations || [];
      if (donations.length === 0) {
        list.innerHTML = '<p class="text-xs text-slate-400">No hay campañas registradas.</p>';
        return;
      }
      list.innerHTML = donations.map(d => `
        <div class="p-4 rounded-2xl bg-[#07192f]/70 border border-slate-800 space-y-1.5">
          <div class="flex items-center justify-between">
            <h4 class="text-sm font-bold text-white">${d.campaign_name}</h4>
            <span class="text-xs font-black text-emerald-400">$${d.amount} USD</span>
          </div>
          <p class="text-[11px] text-slate-400">Aporte de: ${d.citizen_name} • Estado: <span class="${d.status === 'aprobada' ? 'text-emerald-300' : 'text-amber-300'} font-semibold">${d.status}</span></p>
        </div>
      `).join('');
    } catch (e) {
      list.innerHTML = `<p class="text-xs text-red-400">${e.message}</p>`;
    }
  },

  async handleReportSubmit(e) {
    e.preventDefault();
    if (!this.currentUser) {
      this.openAuthModal('login');
      return;
    }
    const title = document.getElementById('rep-title').value;
    const location = document.getElementById('rep-location').value;
    const description = document.getElementById('rep-description').value;

    try {
      const res = await API.createReport({ title, location, description });
      this.showToast(res.message);
      document.getElementById('rep-title').value = '';
      document.getElementById('rep-location').value = '';
      document.getElementById('rep-description').value = '';
      this.loadCitizenReports();
    } catch (err) {
      this.showToast(err.message, 'error');
    }
  },

  async handleDonationSubmit(e) {
    e.preventDefault();
    if (!this.currentUser) {
      this.openAuthModal('login');
      return;
    }
    const campaign_name = document.getElementById('don-campaign').value;
    const amount = document.getElementById('don-amount').value;

    try {
      const res = await API.createDonation({ campaign_name, amount });
      this.showToast(res.message);
      document.getElementById('don-amount').value = '';
      this.loadCitizenDonations();
    } catch (err) {
      this.showToast(err.message, 'error');
    }
  },

  // -------------------------------------------------------------
  // EVENT LISTENERS GLOBALES
  // -------------------------------------------------------------
  setupEventListeners() {
    // Formulario Login
    document.getElementById('form-login')?.addEventListener('submit', (e) => {
      e.preventDefault();
      const email = document.getElementById('login-email').value;
      const pass = document.getElementById('login-password').value;
      this.handleLogin(email, pass);
    });

    // Formulario Registro
    document.getElementById('form-register')?.addEventListener('submit', (e) => {
      e.preventDefault();
      const role = document.querySelector('input[name="reg-role"]:checked')?.value || 'voluntario';
      const name = document.getElementById('reg-name').value;
      const email = document.getElementById('reg-email').value;
      const password = document.getElementById('reg-password').value;

      const payload = { role, name, email, password };

      if (role === 'experto') {
        payload.institution = document.getElementById('reg-institution').value;
        payload.biological_specialty = document.getElementById('reg-specialty').value;
        payload.professional_credentials = document.getElementById('reg-credentials').value;
      } else if (role === 'voluntario') {
        payload.interests = Array.from(this.selectedInterests);
      } else if (role === 'ciudadano') {
        payload.location = document.getElementById('reg-location').value;
      }

      this.handleRegister(payload);
    });

    // Cambio de rol en formulario de registro
    document.querySelectorAll('input[name="reg-role"]').forEach(radio => {
      radio.addEventListener('change', (e) => {
        this.updateRegisterFormFields(e.target.value);
      });
    });

    // Búsqueda y filtrado en admin
    document.getElementById('admin-search-input')?.addEventListener('input', () => {
      this.fetchAndRenderAdminUsers();
    });
    document.getElementById('admin-role-filter')?.addEventListener('change', () => {
      this.fetchAndRenderAdminUsers();
    });

    // Formularios Modales
    document.getElementById('form-add-publication')?.addEventListener('submit', (e) => this.handleAddPublication(e));
    document.getElementById('form-create-activity')?.addEventListener('submit', (e) => this.handleCreateActivitySubmit(e));
    document.getElementById('form-new-thread')?.addEventListener('submit', (e) => this.handleNewThreadSubmit(e));
    document.getElementById('form-citizen-report')?.addEventListener('submit', (e) => this.handleReportSubmit(e));
    document.getElementById('form-citizen-donation')?.addEventListener('submit', (e) => this.handleDonationSubmit(e));
  }
};

// Iniciar aplicación al cargar el DOM
window.addEventListener('DOMContentLoaded', () => {
  App.init();
});
