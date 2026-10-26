/**
 * ================================================================
 * SUITE DE PRUEBAS DE ACEPTACIÓN AUTOMATIZADAS
 * BASADA EN: Casos de aceptación Sprint 2 - ODS 14 (Universidad Manuela Beltrán)
 * ================================================================
 * Ejecuta y valida programáticamente el 100% de los casos de prueba del PDF.
 */
const assert = require('assert');
const path = require('path');
const http = require('http');
const fs = require('fs');

// Configuración de base de datos de prueba aislada y limpia
const testDbPath = path.join(__dirname, 'test_database.sqlite');
if (fs.existsSync(testDbPath)) {
  try { fs.unlinkSync(testDbPath); } catch (e) {}
}
process.env.DB_PATH = testDbPath;

const app = require('../server');
const { getDatabase } = require('../src/config/database');
const { seedDatabase } = require('../src/seed/seedData');

let server;
let baseUrl;

const results = [];

function recordTest(id, name, passed, details = '') {
  results.push({ id, name, passed, details });
  const symbol = passed ? '✅' : '❌';
  console.log(`${symbol} [${id}] ${name} ${details ? '(' + details + ')' : ''}`);
}

async function request(endpoint, options = {}) {
  const url = `${baseUrl}${endpoint}`;
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {})
  };
  const response = await fetch(url, {
    ...options,
    headers
  });
  let data;
  try {
    data = await response.json();
  } catch (e) {
    data = null;
  }
  return { status: response.status, data };
}

async function runAllTests() {
  console.log('\n================================================================');
  console.log('🧪 INICIANDO SUITE DE CASOS DE ACEPTACIÓN - SPRINT 2 Y BACKLOG');
  console.log('================================================================\n');

  // Inicializar servidor de prueba
  server = http.createServer(app);
  await new Promise(resolve => server.listen(0, resolve));
  const port = server.address().port;
  baseUrl = `http://localhost:${port}`;

  const db = getDatabase();

  try {
    // -------------------------------------------------------------
    // RF01 – HU-001-1: Registro de experto / investigador marino
    // -------------------------------------------------------------
    console.log('\n--- RF01: REGISTRO DE EXPERTO (HU-001-1) ---');

    // CP-HU-001-1-01: Registro exitoso de experto
    {
      const res = await request('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          role: 'experto',
          name: 'Dra. Elena Coralina',
          email: 'elena.coral@investigacion.org',
          password: 'Password123!',
          institution: 'Instituto de Biodiversidad Marina',
          biological_specialty: 'Arrecifes Coralinos',
          professional_credentials: 'PhD en Oceanografía #10492'
        })
      });
      const passed = res.status === 201 && res.data.user && res.data.user.role === 'experto';
      recordTest('CP-HU-001-1-01', 'Registro exitoso de experto con 6 campos válidos', passed);
    }

    // CP-HU-001-1-02: Campos obligatorios vacíos (experto)
    {
      const res = await request('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          role: 'experto',
          name: 'Dr. Sin Institucion',
          email: 'sin.inst@correo.org',
          password: 'Password123!',
          biological_specialty: 'Ictiología',
          // falta institucion y credenciales
        })
      });
      const passed = res.status === 400 && res.data.error.includes('obligatorios');
      recordTest('CP-HU-001-1-02', 'Campos obligatorios vacíos (experto)', passed, res.data?.error);
    }

    // CP-HU-001-1-03: Correo con formato inválido
    {
      const res1 = await request('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          role: 'experto',
          name: 'Dr. Test Formato',
          email: 'experto@',
          password: 'Password123!',
          institution: 'Univ Mar',
          biological_specialty: 'Microbiología',
          professional_credentials: 'PhD #1'
        })
      });
      const res2 = await request('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          role: 'experto',
          name: 'Dr. Test Formato',
          email: 'expertocorreo.com',
          password: 'Password123!',
          institution: 'Univ Mar',
          biological_specialty: 'Microbiología',
          professional_credentials: 'PhD #1'
        })
      });
      const passed = res1.status === 400 && res2.status === 400 && res1.data.error.includes('formato');
      recordTest('CP-HU-001-1-03', 'Correo con formato inválido (experto@ y expertocorreo.com)', passed);
    }

    // CP-HU-001-1-04: Correo duplicado
    {
      const res = await request('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          role: 'experto',
          name: 'Duplicada',
          email: 'elena.coral@investigacion.org', // ya registrada en CP-HU-001-1-01
          password: 'Password123!',
          institution: 'Otra Univ',
          biological_specialty: 'Corales',
          professional_credentials: 'PhD #2'
        })
      });
      const passed = res.status === 400 && res.data.error.includes('registrado');
      recordTest('CP-HU-001-1-04', 'Validación de correo único / duplicado', passed, res.data?.error);
    }

    // CP-HU-001-1-05: Requisitos de contraseña y almacenamiento cifrado
    {
      // Contraseña débil
      const resDebil = await request('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          role: 'experto',
          name: 'Dr. Clave Débil',
          email: 'clave.debil@correo.org',
          password: '123',
          institution: 'Inst Test',
          biological_specialty: 'Botánica',
          professional_credentials: 'Lic #10'
        })
      });
      // Contraseña válida
      const resValida = await request('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          role: 'experto',
          name: 'Dr. Clave Fuerte',
          email: 'clave.fuerte@correo.org',
          password: 'PasswordSegura2026!',
          institution: 'Inst Test',
          biological_specialty: 'Botánica',
          professional_credentials: 'Lic #10'
        })
      });
      // Comprobar que en la base de datos se guardó el hash de bcrypt y no la contraseña en texto plano
      const dbUser = db.prepare('SELECT password_hash FROM users WHERE email = ?').get('clave.fuerte@correo.org');
      const isHashed = dbUser && dbUser.password_hash.startsWith('$2') && !dbUser.password_hash.includes('PasswordSegura2026!');
      const passed = resDebil.status === 400 && resValida.status === 201 && isHashed;
      recordTest('CP-HU-001-1-05', 'Requisitos de contraseña y almacenamiento con hash seguro', passed);
    }

    // -------------------------------------------------------------
    // RF01 – HU-001-2: Registro de voluntario
    // -------------------------------------------------------------
    console.log('\n--- RF01: REGISTRO DE VOLUNTARIO (HU-001-2) ---');

    // CP-HU-001-2-01: Registro exitoso de voluntario
    {
      const res = await request('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          role: 'voluntario',
          name: 'Camilo Voluntario',
          email: 'camilo.vol@mar.org',
          password: 'Voluntario2026!',
          interests: ['Limpieza de playas y fondos marinos', 'Restauración y siembra de corales']
        })
      });
      const passed = res.status === 201 && res.data.user && res.data.user.role === 'voluntario';
      recordTest('CP-HU-001-2-01', 'Registro exitoso de voluntario con datos válidos', passed);
    }

    // CP-HU-001-2-02: Selector de intereses de conservación
    {
      const res = await request('/api/auth/interests');
      const passed = res.status === 200 && Array.isArray(res.data.interests) && res.data.interests.length >= 4;
      recordTest('CP-HU-001-2-02', 'Selector de lista de intereses de conservación marina', passed, `${res.data?.interests?.length} intereses disponibles`);
    }

    // CP-HU-001-2-03: Campos obligatorios vacíos (voluntario sin intereses o sin nombre)
    {
      const res = await request('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          role: 'voluntario',
          name: 'Voluntario Sin Intereses',
          email: 'sin.intereses@mar.org',
          password: 'Voluntario2026!',
          interests: [] // vacío
        })
      });
      const passed = res.status === 400 && res.data.error.includes('intereses');
      recordTest('CP-HU-001-2-03', 'Validación de campos obligatorios e intereses vacíos en voluntario', passed);
    }

    // CP-HU-001-2-04: Correo inválido o duplicado (voluntario)
    {
      const resInvalido = await request('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          role: 'voluntario',
          name: 'Vol Correo Invalido',
          email: 'voluntariocorreo.com',
          password: 'Voluntario2026!',
          interests: ['Limpieza de playas']
        })
      });
      const resDuplicado = await request('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          role: 'voluntario',
          name: 'Vol Duplicado',
          email: 'camilo.vol@mar.org', // ya registrado
          password: 'Voluntario2026!',
          interests: ['Limpieza de playas']
        })
      });
      const passed = resInvalido.status === 400 && resDuplicado.status === 400;
      recordTest('CP-HU-001-2-04', 'Rechazo de correo inválido o duplicado en voluntario', passed);
    }

    // CP-HU-001-2-05: Intereses guardados con el voluntario
    {
      const selectedInterests = [
        'Limpieza de playas y fondos marinos',
        'Restauración y siembra de corales',
        'Monitoreo y rescate de tortugas marinas'
      ];
      const resReg = await request('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          role: 'voluntario',
          name: 'Voluntaria Con Tres Intereses',
          email: 'tres.intereses@mar.org',
          password: 'Voluntario2026!',
          interests: selectedInterests
        })
      });
      const userId = resReg.data.user.id;
      const rows = db.prepare('SELECT interest FROM volunteer_interests WHERE user_id = ?').all(userId);
      const savedInterests = rows.map(r => r.interest);
      const passed = savedInterests.length === 3 && selectedInterests.every(i => savedInterests.includes(i));
      recordTest('CP-HU-001-2-05', 'Almacenamiento exacto de los intereses seleccionados en la base de datos', passed);
    }

    // -------------------------------------------------------------
    // RF01 – HU-001-3: Registro de ciudadano / colaborador
    // -------------------------------------------------------------
    console.log('\n--- RF01: REGISTRO DE CIUDADANO (HU-001-3) ---');

    // CP-HU-001-3-01: Registro exitoso de ciudadano
    {
      const res = await request('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          role: 'ciudadano',
          name: 'Mariana Ciudadana',
          email: 'mariana.ciudad@oceano.org',
          password: 'Ciudadano2026!',
          location: 'Santa Marta, Colombia'
        })
      });
      const passed = res.status === 201 && res.data.user && res.data.user.role === 'ciudadano';
      recordTest('CP-HU-001-3-01', 'Registro exitoso de ciudadano con datos válidos', passed);
    }

    // CP-HU-001-3-02: Correo ya registrado (ciudadano)
    {
      const res = await request('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          role: 'ciudadano',
          name: 'Mariana Duplicada',
          email: 'mariana.ciudad@oceano.org', // ya registrado
          password: 'Ciudadano2026!',
          location: 'Santa Marta'
        })
      });
      const passed = res.status === 400 && res.data.error.includes('registrado');
      recordTest('CP-HU-001-3-02', 'Validación de correo ya registrado en ciudadano', passed);
    }

    // CP-HU-001-3-03: Campos obligatorios vacíos (falta ubicación)
    {
      const res = await request('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          role: 'ciudadano',
          name: 'Ciudadano Sin Ubicacion',
          email: 'sin.ubicacion@oceano.org',
          password: 'Ciudadano2026!',
          location: '' // vacía
        })
      });
      const passed = res.status === 400 && res.data.error.includes('ubicación');
      recordTest('CP-HU-001-3-03', 'Validación de campos obligatorios en ciudadano (incluida ubicación)', passed);
    }

    // CP-HU-001-3-04: Correo y contraseña con formato inválido
    {
      const res = await request('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          role: 'ciudadano',
          name: 'Ciudadano Formatos',
          email: 'ciudadano@invalido',
          password: '123',
          location: 'Bogotá'
        })
      });
      const passed = res.status === 400;
      recordTest('CP-HU-001-3-04', 'Rechazo de correo inválido y contraseña que no cumple política', passed);
    }

    // CP-HU-001-3-05: Formulario simplificado del ciudadano (no exige campos de experto ni de voluntario)
    {
      const res = await request('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          role: 'ciudadano',
          name: 'Colaborador Sencillo',
          email: 'sencillo@oceano.org',
          password: 'Colaborador2026!',
          location: 'Buenaventura, Valle del Cauca'
        })
      });
      const passed = res.status === 201;
      recordTest('CP-HU-001-3-05', 'Formulario simplificado de ciudadano sin campos de experto ni intereses', passed);
    }

    // -------------------------------------------------------------
    // RF02 – HU-002-1: Gestión de perfil de experto
    // -------------------------------------------------------------
    console.log('\n--- RF02: PERFIL DE EXPERTO (HU-002-1) ---');

    // Login del Experto 1 (Dra. Marina Ríos)
    const loginMarina = await request('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: 'dr.marina@vidamarina.org', password: 'Experto123!' })
    });
    const tokenMarina = loginMarina.data.token;
    const marinaUserId = loginMarina.data.user.id;

    // Login del Experto 2 (Dr. Carlos Ortiz)
    const loginCarlos = await request('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: 'dr.carlos@vidamarina.org', password: 'Experto123!' })
    });
    const tokenCarlos = loginCarlos.data.token;
    const carlosUserId = loginCarlos.data.user.id;

    // CP-HU-002-1-01: Editar biografía científica
    {
      const nuevaBio = 'Investigadora especializada en restauración de corales y resiliencia climática del Caribe 2026.';
      const res = await request(`/api/profiles/expert/${marinaUserId}/bio`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${tokenMarina}` },
        body: JSON.stringify({ scientific_bio: nuevaBio })
      });
      const pubRes = await request(`/api/profiles/expert/${marinaUserId}`);
      const passed = res.status === 200 && pubRes.data?.profile?.scientific_bio === nuevaBio;
      recordTest('CP-HU-002-1-01', 'Edición de biografía científica e impacto inmediato en perfil público', passed);
    }

    // CP-HU-002-1-02: Agregar y eliminar publicaciones
    {
      // 1. Agregar publicación
      const resAdd = await request(`/api/profiles/expert/${marinaUserId}/publications`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${tokenMarina}` },
        body: JSON.stringify({
          title: 'Genómica y adaptación de corales en aguas someras',
          year: 2025,
          journal: 'Marine Ecology Progress Series',
          url: 'https://doi.org/10.3354/meps14920'
        })
      });
      const pubId = resAdd.data?.publication?.id;

      // 2. Eliminar publicación
      let resDel = { status: 500 };
      if (pubId) {
        resDel = await request(`/api/profiles/expert/${marinaUserId}/publications/${pubId}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${tokenMarina}` }
        });
      }

      // Verificar en BD que fue eliminada
      const deletedCheck = pubId ? db.prepare('SELECT id FROM expert_publications WHERE id = ?').get(pubId) : true;
      const passed = resAdd.status === 201 && resDel.status === 200 && !deletedCheck;
      recordTest('CP-HU-002-1-02', 'Alta y baja de publicaciones científicas en perfil y base de datos', passed);
    }

    // CP-HU-002-1-03: Modificar áreas de investigación
    {
      const nuevasAreas = ['Arrecifes coralinos', 'Microplásticos en corales', 'Restauración asistida'];
      const res = await request(`/api/profiles/expert/${marinaUserId}/research-areas`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${tokenMarina}` },
        body: JSON.stringify({ research_areas: nuevasAreas })
      });
      const pubRes = await request(`/api/profiles/expert/${marinaUserId}`);
      const passed = res.status === 200 && JSON.stringify(pubRes.data.profile.research_areas) === JSON.stringify(nuevasAreas);
      recordTest('CP-HU-002-1-03', 'Modificación y guardado de áreas de investigación', passed);
    }

    // CP-HU-002-1-04: Restricción de edición a terceros
    {
      // Experto A (Marina) intenta editar la bio de Experto B (Carlos)
      const resAjeno = await request(`/api/profiles/expert/${carlosUserId}/bio`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${tokenMarina}` },
        body: JSON.stringify({ scientific_bio: 'Intento de modificación no autorizada' })
      });
      // Usuario sin sesión intenta editar
      const resSinSesion = await request(`/api/profiles/expert/${carlosUserId}/bio`, {
        method: 'PUT',
        body: JSON.stringify({ scientific_bio: 'Intento anónimo' })
      });
      const passed = resAjeno.status === 403 && resSinSesion.status === 401;
      recordTest('CP-HU-002-1-04', 'Restricción de edición a terceros (deniega con permiso insuficiente)', passed);
    }

    // CP-HU-002-1-05: Persistencia de los cambios del perfil
    {
      // 1. Simular cierre de sesión y reingreso con nuevas credenciales
      const reLogin = await request('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email: 'dr.marina@vidamarina.org', password: 'Experto123!' })
      });
      const reToken = reLogin.data.token;
      const resProfile = await request(`/api/profiles/expert/${marinaUserId}`, {
        headers: { Authorization: `Bearer ${reToken}` }
      });
      const bioSaved = resProfile.data.profile.scientific_bio.includes('resiliencia climática');
      recordTest('CP-HU-002-1-05', 'Persistencia de los cambios del perfil tras reiniciar sesión', bioSaved);
    }

    // -------------------------------------------------------------
    // RF02 – HU-002-2: Perfil de voluntario: historial, horas e insignias
    // -------------------------------------------------------------
    console.log('\n--- RF02: PERFIL DE VOLUNTARIO (HU-002-2) ---');

    // Login Voluntario Activo (12h, con insignias)
    const loginVolActivo = await request('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: 'voluntario.activo@vidamarina.org', password: 'Voluntario123!' })
    });
    const tokenVolActivo = loginVolActivo.data.token;
    const volActivoUserId = loginVolActivo.data.user.id;

    // Login Voluntario Nuevo (0h, sin actividad)
    const loginVolNuevo = await request('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: 'voluntario.nuevo@vidamarina.org', password: 'Voluntario123!' })
    });
    const tokenVolNuevo = loginVolNuevo.data.token;
    const volNuevoUserId = loginVolNuevo.data.user.id;

    // Login Voluntario Meta (8h, le faltan 2h para meta de 10h)
    const loginVolMeta = await request('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: 'voluntario.meta@vidamarina.org', password: 'Voluntario123!' })
    });
    const tokenVolMeta = loginVolMeta.data.token;
    const volMetaUserId = loginVolMeta.data.user.id;

    // CP-HU-002-2-01: Visualizar historial de participación
    {
      const res = await request(`/api/profiles/volunteer/${volActivoUserId}`, {
        headers: { Authorization: `Bearer ${tokenVolActivo}` }
      });
      const passed = res.status === 200 && Array.isArray(res.data.participations) && res.data.participations.length === 2;
      recordTest('CP-HU-002-2-01', 'Visualización de historial de actividades de participación', passed);
    }

    // CP-HU-002-2-02: Total de horas acumuladas (6h + 6h = 12h)
    {
      const res = await request(`/api/profiles/volunteer/${volActivoUserId}`, {
        headers: { Authorization: `Bearer ${tokenVolActivo}` }
      });
      const passed = res.status === 200 && res.data.totalHours === 12;
      recordTest('CP-HU-002-2-02', 'Cálculo exacto del total de horas aportadas por el voluntario (12 horas)', passed);
    }

    // CP-HU-002-2-03: Asignación de insignias según metas
    {
      // Voluntario Activo (12h) tiene B01 (1h) y B02 (10h)
      const resActivo = await request(`/api/profiles/volunteer/${volActivoUserId}`, {
        headers: { Authorization: `Bearer ${tokenVolActivo}` }
      });
      // Voluntario Nuevo (0h) no tiene insignias
      const resNuevo = await request(`/api/profiles/volunteer/${volNuevoUserId}`, {
        headers: { Authorization: `Bearer ${tokenVolNuevo}` }
      });
      const passed = resActivo.data.badges.length >= 2 && resNuevo.data.badges.length === 0;
      recordTest('CP-HU-002-2-03', 'Asignación de insignias según metas cumplidas', passed);
    }

    // CP-HU-002-2-04: Voluntario sin actividad
    {
      const res = await request(`/api/profiles/volunteer/${volNuevoUserId}`, {
        headers: { Authorization: `Bearer ${tokenVolNuevo}` }
      });
      const passed = res.status === 200 &&
                     res.data.totalHours === 0 &&
                     res.data.badges.length === 0 &&
                     res.data.emptyMessage &&
                     res.data.emptyMessage.includes('invitamos');
      recordTest('CP-HU-002-2-04', 'Perfil de voluntario sin actividad (mensaje invitacional, 0 horas, sin errores)', passed);
    }

    // CP-HU-002-2-05: Actualización al registrar una nueva participación
    {
      // Voluntario Meta tenía 8h y solo insignia B01.
      // Se le agregan 2 horas en una nueva actividad -> acumula 10h y desbloquea B02 ("Defensor del Arrecife")
      const resAdd = await request(`/api/profiles/volunteer/${volMetaUserId}/participations`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${tokenVolMeta}` },
        body: JSON.stringify({
          activity_name: 'Censo de Tortugas en Playa Los Cocos',
          hours: 2
        })
      });
      const passed = resAdd.status === 201 &&
                     resAdd.data.totalHours === 10 &&
                     resAdd.data.badges.some(b => b.code === 'B02');
      recordTest('CP-HU-002-2-05', 'Recálculo en tiempo real de horas e insignias al registrar nueva participación', passed, 'Total horas: 10, Insignia B02 otorgada');
    }

    // -------------------------------------------------------------
    // RF09 – HU-009-1: Diferenciación de roles y control de permisos
    // -------------------------------------------------------------
    console.log('\n--- RF09: DIFERENCIACIÓN DE ROLES Y CONTROL DE ACCESO (HU-009-1) ---');

    // Login Administrador General
    const loginAdmin = await request('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: 'admin@vidamarina.org', password: 'Admin123!' })
    });
    const tokenAdmin = loginAdmin.data.token;

    // Login Ciudadano
    const loginCiudadano = await request('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: 'ciudadano@vidamarina.org', password: 'Ciudadano123!' })
    });
    const tokenCiudadano = loginCiudadano.data.token;

    // CP-HU-009-1-01: Acceso del Administrador General
    {
      const resUsers = await request('/api/admin/users', { headers: { Authorization: `Bearer ${tokenAdmin}` } });
      const resDonations = await request('/api/admin/donations', { headers: { Authorization: `Bearer ${tokenAdmin}` } });
      const resReports = await request('/api/admin/reports', { headers: { Authorization: `Bearer ${tokenAdmin}` } });
      const passed = resUsers.status === 200 && resDonations.status === 200 && resReports.status === 200;
      recordTest('CP-HU-009-1-01', 'Acceso pleno del Administrador General (usuarios, donaciones, denuncias)', passed);
    }

    // CP-HU-009-1-02: Acceso del rol Experto / Investigador
    {
      // 1. Experto crea hilo en el foro (permitido)
      const resThread = await request('/api/forum/threads', {
        method: 'POST',
        headers: { Authorization: `Bearer ${tokenMarina}` },
        body: JSON.stringify({
          title: 'Monitoreo acústico de mamíferos marinos',
          content: 'Registro de cantos de ballenas jorobadas en el Pacífico colombiano durante la temporada de cría.',
          category: 'Investigación'
        })
      });
      // 2. Experto intenta entrar al panel de administración (restringido -> 403)
      const resAdminTry = await request('/api/admin/users', { headers: { Authorization: `Bearer ${tokenMarina}` } });
      const passed = resThread.status === 201 && resAdminTry.status === 403;
      recordTest('CP-HU-009-1-02', 'Permisos de experto (crear hilo en foro) y bloqueo al panel admin (403)', passed);
    }

    // CP-HU-009-1-03: Acceso del rol Voluntario
    {
      // 1. Voluntario postula a actividad (permitido)
      const act1 = db.prepare('SELECT id FROM activities LIMIT 1').get();
      const resEnroll = await request(`/api/activities/${act1.id}/enroll`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${tokenVolNuevo}` }
      });
      // 2. Voluntario intenta crear hilo en el foro (restringido a experto/admin -> 403)
      const resForumTry = await request('/api/forum/threads', {
        method: 'POST',
        headers: { Authorization: `Bearer ${tokenVolNuevo}` },
        body: JSON.stringify({ title: 'Intento Voluntario', content: 'Contenido' })
      });
      // 3. Voluntario intenta entrar al panel de administración (restringido -> 403)
      const resAdminTry = await request('/api/admin/users', { headers: { Authorization: `Bearer ${tokenVolNuevo}` } });
      const passed = resEnroll.status === 200 && resForumTry.status === 403 && resAdminTry.status === 403;
      recordTest('CP-HU-009-1-03', 'Permisos de voluntario (postulación) y bloqueo a funciones no autorizadas (403)', passed);
    }

    // CP-HU-009-1-04: Acceso del rol Ciudadano
    {
      // 1. Ciudadano reporta denuncia ambiental (permitido)
      const resReport = await request('/api/citizen/reports', {
        method: 'POST',
        headers: { Authorization: `Bearer ${tokenCiudadano}` },
        body: JSON.stringify({
          title: 'Residuos plásticos en manglar',
          description: 'Acumulación de envases en la desembocadura del canal.',
          location: 'Ciénaga de la Virgen'
        })
      });
      // 2. Ciudadano realiza donación (permitido)
      const resDonation = await request('/api/citizen/donations', {
        method: 'POST',
        headers: { Authorization: `Bearer ${tokenCiudadano}` },
        body: JSON.stringify({
          campaign_name: 'Adopta un Coral 2026',
          amount: 25.00
        })
      });
      // 3. Ciudadano intenta postularse a evento de voluntario (restringido -> 403)
      const act1 = db.prepare('SELECT id FROM activities LIMIT 1').get();
      const resEnrollTry = await request(`/api/activities/${act1.id}/enroll`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${tokenCiudadano}` }
      });
      // 4. Ciudadano intenta crear hilo en foro (restringido -> 403)
      const resForumTry = await request('/api/forum/threads', {
        method: 'POST',
        headers: { Authorization: `Bearer ${tokenCiudadano}` },
        body: JSON.stringify({ title: 'Intento Ciudadano', content: 'Contenido' })
      });
      const passed = resReport.status === 201 && resDonation.status === 201 && resEnrollTry.status === 403 && resForumTry.status === 403;
      recordTest('CP-HU-009-1-04', 'Permisos de ciudadano (denuncia/donación) y denegación a funciones ajenas (403)', passed);
    }

    // CP-HU-009-1-05: Rol único y acceso directo por ruta/servicio
    {
      // Cada usuario tiene exactamente un solo rol en la tabla users
      const multipleRolesCheck = db.prepare('SELECT id FROM users GROUP BY id HAVING COUNT(role) > 1').all();
      // Petición no autenticada a ruta protegida de administración
      const resNoAuth = await request('/api/admin/users');
      // Petición con rol no autorizado
      const resCiudadanoAdmin = await request('/api/admin/users', { headers: { Authorization: `Bearer ${tokenCiudadano}` } });
      const passed = multipleRolesCheck.length === 0 && resNoAuth.status === 401 && resCiudadanoAdmin.status === 403;
      recordTest('CP-HU-009-1-05', 'Rol único por usuario y protección estricta en rutas y servicios de backend', passed);
    }

    // -------------------------------------------------------------
    // RF09 – HU-009-2: Panel de administración y gestión de usuarios
    // -------------------------------------------------------------
    console.log('\n--- RF09: PANEL DE ADMINISTRACIÓN Y GESTIÓN DE USUARIOS (HU-009-2) ---');

    // CP-HU-009-2-01: Listar usuarios con rol y estado
    {
      const res = await request('/api/admin/users', { headers: { Authorization: `Bearer ${tokenAdmin}` } });
      const allHaveRoleAndStatus = res.data.users.every(u => u.role && u.status);
      const passed = res.status === 200 && Array.isArray(res.data.users) && allHaveRoleAndStatus;
      recordTest('CP-HU-009-2-01', 'Listado de usuarios mostrando rol y estado (activo o suspendido)', passed);
    }

    // CP-HU-009-2-02: Buscar y filtrar usuarios
    {
      // Búsqueda por nombre
      const resSearch = await request('/api/admin/users?search=Marina', { headers: { Authorization: `Bearer ${tokenAdmin}` } });
      // Filtro por rol
      const resFilter = await request('/api/admin/users?role=voluntario', { headers: { Authorization: `Bearer ${tokenAdmin}` } });
      // Búsqueda sin coincidencia
      const resEmpty = await request('/api/admin/users?search=UsuarioInexistenteXYZ123', { headers: { Authorization: `Bearer ${tokenAdmin}` } });
      const passed = resSearch.data.users.length > 0 &&
                     resFilter.data.users.every(u => u.role === 'voluntario') &&
                     resEmpty.data.users.length === 0 &&
                     resEmpty.data.emptyMessage !== null;
      recordTest('CP-HU-009-2-02', 'Búsqueda por nombre/correo, filtro por rol y mensaje de lista vacía', passed);
    }

    // CP-HU-009-2-03: Cambiar el rol de un usuario
    {
      // Creamos un ciudadano temporal
      const tempUserRes = await request('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          role: 'ciudadano',
          name: 'Usuario Cambio Rol',
          email: 'cambio.rol@mar.org',
          password: 'Password123!',
          location: 'Tolú'
        })
      });
      const tempUserId = tempUserRes.data.user.id;

      // El admin le cambia el rol a voluntario
      const resChange = await request(`/api/admin/users/${tempUserId}/role`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${tokenAdmin}` },
        body: JSON.stringify({ newRole: 'voluntario' })
      });

      // El usuario inicia sesión y verifica sus nuevos permisos
      const loginUpdated = await request('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email: 'cambio.rol@mar.org', password: 'Password123!' })
      });
      const passed = resChange.status === 200 &&
                     resChange.data.user.role === 'voluntario' &&
                     loginUpdated.data.user.role === 'voluntario';
      recordTest('CP-HU-009-2-03', 'Cambio de rol por administrador y aplicación inmediata de nuevos permisos', passed);
    }

    // CP-HU-009-2-04: Suspender, reactivar y eliminar usuarios con confirmación
    {
      // 1. Crear usuario de prueba
      const regRes = await request('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          role: 'voluntario',
          name: 'Usuario Ciclo Vida',
          email: 'ciclo.vida@mar.org',
          password: 'Password123!',
          interests: ['Limpieza de playas']
        })
      });
      const targetId = regRes.data.user.id;

      // 2. Suspender cuenta
      const resSuspend = await request(`/api/admin/users/${targetId}/status`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${tokenAdmin}` },
        body: JSON.stringify({ status: 'suspendido' })
      });

      // 3. Usuario suspendido intenta acceder al sistema -> 403
      const resBlockedLogin = await request('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email: 'ciclo.vida@mar.org', password: 'Password123!' })
      });

      // 4. Reactivar cuenta
      const resReactivate = await request(`/api/admin/users/${targetId}/status`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${tokenAdmin}` },
        body: JSON.stringify({ status: 'activo' })
      });

      // 5. Usuario reactivado vuelve a ingresar con éxito
      const resOkLogin = await request('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email: 'ciclo.vida@mar.org', password: 'Password123!' })
      });

      // 6. Eliminar usuario
      const resDelete = await request(`/api/admin/users/${targetId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${tokenAdmin}` }
      });
      const checkDeleted = db.prepare('SELECT id FROM users WHERE id = ?').get(targetId);

      const passed = resSuspend.status === 200 &&
                     resBlockedLogin.status === 403 &&
                     resReactivate.status === 200 &&
                     resOkLogin.status === 200 &&
                     resDelete.status === 200 &&
                     !checkDeleted;
      recordTest('CP-HU-009-2-04', 'Suspensión (bloqueo login), reactivación y eliminación de usuario', passed);
    }

    // CP-HU-009-2-05: Bloqueo de acceso al panel de administración a no administradores
    {
      const resExp = await request('/api/admin/users', { headers: { Authorization: `Bearer ${tokenMarina}` } });
      const resVol = await request('/api/admin/users', { headers: { Authorization: `Bearer ${tokenVolActivo}` } });
      const resCiu = await request('/api/admin/users', { headers: { Authorization: `Bearer ${tokenCiudadano}` } });
      const resAnon = await request('/api/admin/users');
      const passed = resExp.status === 403 && resVol.status === 403 && resCiu.status === 403 && resAnon.status === 401;
      recordTest('CP-HU-009-2-05', 'Bloqueo de acceso al panel de administración a roles no administradores y anónimos', passed);
    }

    // -------------------------------------------------------------
    // HISTORIA PENDIENTE (BACKLOG, NO EN SPRINT 2): HU-P-01
    // -------------------------------------------------------------
    console.log('\n--- BACKLOG: CREACIÓN DE ACTIVIDADES EN EL CALENDARIO (HU-P-01) ---');

    // CP-HU-P-01-01: Crear actividad válida (Administrador)
    let createdActId = null;
    {
      const res = await request('/api/activities', {
        method: 'POST',
        headers: { Authorization: `Bearer ${tokenAdmin}` },
        body: JSON.stringify({
          title: 'Siembra de Manglares en Bahía Honda',
          description: 'Restauración de 500 plántulas de mangle rojo con la comunidad de pescadores.',
          date: '2026-11-28',
          time: '08:00 - 13:00',
          location: 'Bahía Honda, La Guajira',
          volunteer_spots: 30,
          activity_type: 'Reforestación de manglares'
        })
      });
      createdActId = res.data?.activity?.id;
      const passed = res.status === 201 && createdActId && res.data.activity.title.includes('Manglares');
      recordTest('CP-HU-P-01-01', 'Creación de actividad válida por administrador guardada en base de datos', passed);
    }

    // CP-HU-P-01-02: Datos obligatorios faltantes
    {
      const res = await request('/api/activities', {
        method: 'POST',
        headers: { Authorization: `Bearer ${tokenAdmin}` },
        body: JSON.stringify({
          title: '', // vacío
          description: 'Falta título y lugar',
          date: '2026-11-28',
          time: '08:00',
          location: '', // vacío
          volunteer_spots: 20,
          activity_type: 'Limpieza'
        })
      });
      const passed = res.status === 400 && res.data.error.includes('obligatorios');
      recordTest('CP-HU-P-01-02', 'Validación y rechazo por campos obligatorios faltantes en actividad', passed, res.data?.error);
    }

    // CP-HU-P-01-03: Fecha inválida (ejemplo 31 de febrero)
    {
      const res = await request('/api/activities', {
        method: 'POST',
        headers: { Authorization: `Bearer ${tokenAdmin}` },
        body: JSON.stringify({
          title: 'Actividad en Fecha Imposible',
          description: 'Probando fecha 31 de febrero',
          date: '2026-02-31', // fecha inexistente
          time: '09:00 - 12:00',
          location: 'Playa San Pedro',
          volunteer_spots: 15,
          activity_type: 'Conservación'
        })
      });
      const passed = res.status === 400 && res.data.error.includes('fecha');
      recordTest('CP-HU-P-01-03', 'Rechazo de fecha inexistente o inválida (ej. 2026-02-31)', passed, res.data?.error);
    }

    // CP-HU-P-01-04: Visualización en el calendario por fecha y consulta de detalle
    {
      const resAll = await request('/api/activities');
      const actFound = resAll.data?.activities?.find(a => a.id === createdActId);
      const resDetail = await request(`/api/activities/${createdActId}`);
      const passed = resAll.status === 200 &&
                     actFound &&
                     resDetail.status === 200 &&
                     resDetail.data.activity.location === 'Bahía Honda, La Guajira';
      recordTest('CP-HU-P-01-04', 'Consulta y visualización de actividad en calendario con detalle completo', passed);
    }

    // CP-HU-P-01-05: Restricción de creación de actividades por rol
    {
      const payload = {
        title: 'Intento No Autorizado',
        description: 'No debería crearse',
        date: '2026-12-01',
        time: '10:00 - 12:00',
        location: 'Playa',
        volunteer_spots: 10,
        activity_type: 'Limpieza'
      };
      // Experto intenta crear
      const resExp = await request('/api/activities', {
        method: 'POST',
        headers: { Authorization: `Bearer ${tokenMarina}` },
        body: JSON.stringify(payload)
      });
      // Voluntario intenta crear
      const resVol = await request('/api/activities', {
        method: 'POST',
        headers: { Authorization: `Bearer ${tokenVolActivo}` },
        body: JSON.stringify(payload)
      });
      // Ciudadano intenta crear
      const resCiu = await request('/api/activities', {
        method: 'POST',
        headers: { Authorization: `Bearer ${tokenCiudadano}` },
        body: JSON.stringify(payload)
      });
      const passed = resExp.status === 403 && resVol.status === 403 && resCiu.status === 403;
      recordTest('CP-HU-P-01-05', 'Restricción de creación de actividades exclusiva para Administrador (403 para demás roles)', passed);
    }

    // -------------------------------------------------------------
    // RESUMEN FINAL
    // -------------------------------------------------------------
    console.log('\n================================================================');
    console.log('📊 RESUMEN FINAL DE EJECUCIÓN DE PRUEBAS DE ACEPTACIÓN');
    console.log('================================================================');
    const total = results.length;
    const passedCount = results.filter(r => r.passed).length;
    const failedCount = total - passedCount;

    console.log(`Total de Casos de Prueba Ejecutados: ${total}`);
    console.log(`Aprobados (PASSED): ${passedCount}`);
    console.log(`Fallidos (FAILED):   ${failedCount}`);

    if (failedCount === 0) {
      console.log('🎉 ¡TODOS LOS CASOS DE PRUEBA DEL DOCUMENTO SPRINT 2 Y BACKLOG PASARON AL 100%!\n');
    } else {
      console.error('⚠️ ALGUNOS CASOS DE PRUEBA FALLARON.\n');
      process.exitCode = 1;
    }

  } catch (error) {
    console.error('Error durante la ejecución de pruebas:', error);
    process.exitCode = 1;
  } finally {
    if (server) {
      server.close();
    }
  }
}

runAllTests();
