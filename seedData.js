/**
 * ================================================================
 * SEMILLERO DE DATOS INICIALES (ODS 14: Vida Marina)
 * ================================================================
 * Preconfigura los 4 roles con usuarios de prueba y datos relacionales
 * para la ejecución inmediata de los casos de prueba del Sprint 2 y Backlog.
 */
const bcrypt = require('bcryptjs');

const INTERESTS_CATALOG = [
  'Limpieza de playas y fondos marinos',
  'Restauración y siembra de corales',
  'Protección y reforestación de manglares',
  'Monitoreo y rescate de tortugas marinas',
  'Educación y sensibilización comunitaria',
  'Censo de biodiversidad marina'
];

function seedDatabase(db) {
  // Verificar si ya existen usuarios
  const countStmt = db.prepare('SELECT COUNT(*) as count FROM users');
  const { count } = countStmt.get();
  if (count > 0) {
    return; // Ya sembrado
  }

  const salt = bcrypt.genSaltSync(10);
  const hash = (pass) => bcrypt.hashSync(pass, salt);

  // 1. Sembrar Insignias
  const insertBadge = db.prepare(`
    INSERT INTO badges (code, name, description, icon, required_hours, required_activities)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  insertBadge.run('B01', 'Primer Voluntariado', 'Completó su primera jornada de conservación marina.', '🐚', 1, 1);
  insertBadge.run('B02', 'Defensor del Arrecife', 'Acumuló 10 o más horas de voluntariado en conservación.', '🪸', 10, 2);
  insertBadge.run('B03', 'Héroe de los Océanos', 'Superó 20 horas de contribución directa al ODS 14.', '🐋', 20, 4);

  const b01 = db.prepare('SELECT id FROM badges WHERE code = ?').get('B01').id;
  const b02 = db.prepare('SELECT id FROM badges WHERE code = ?').get('B02').id;
  const b03 = db.prepare('SELECT id FROM badges WHERE code = ?').get('B03').id;

  // 2. Sembrar Usuarios
  const insertUser = db.prepare(`
    INSERT INTO users (name, email, password_hash, role, status, location)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  // Administrador General
  insertUser.run('Administrador General', 'admin@vidamarina.org', hash('Admin123!'), 'administrador', 'activo', 'Bogotá D.C., Colombia');
  const adminId = db.prepare('SELECT id FROM users WHERE email = ?').get('admin@vidamarina.org').id;

  // Experto 1 (Dra. Marina Ríos)
  insertUser.run('Dra. Marina Ríos', 'dr.marina@vidamarina.org', hash('Experto123!'), 'experto', 'activo', 'Santa Marta, Colombia');
  const marinaId = db.prepare('SELECT id FROM users WHERE email = ?').get('dr.marina@vidamarina.org').id;

  db.prepare(`
    INSERT INTO expert_profiles (user_id, institution, biological_specialty, professional_credentials, scientific_bio, research_areas)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(
    marinaId,
    'Instituto de Investigaciones Marinas y Costeras (INVEMAR)',
    'Biología Marina y Arrecifes de Coral',
    'PhD en Ciencias del Mar, Reg. INVEMAR #4821',
    'Investigadora marina con más de 12 años liderando programas de reproducción asistida de corales y áreas marinas protegidas en el Caribe.',
    JSON.stringify(['Restauración de corales', 'Acidificación oceánica', 'Áreas marinas protegidas'])
  );

  db.prepare(`
    INSERT INTO expert_publications (user_id, title, year, journal, url)
    VALUES (?, ?, ?, ?, ?)
  `).run(
    marinaId,
    'Impacto del blanqueamiento térmico en comunidades coralinas someras',
    2024,
    'Revista de Biología Tropical',
    'https://doi.org/10.15517/rbt.v72i1.55432'
  );

  // Experto 2 (Dr. Carlos Ortiz - Para pruebas de restricción a terceros CP-HU-002-1-04)
  insertUser.run('Dr. Carlos Ortiz', 'dr.carlos@vidamarina.org', hash('Experto123!'), 'experto', 'activo', 'Cali, Colombia');
  const carlosId = db.prepare('SELECT id FROM users WHERE email = ?').get('dr.carlos@vidamarina.org').id;

  db.prepare(`
    INSERT INTO expert_profiles (user_id, institution, biological_specialty, professional_credentials, scientific_bio, research_areas)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(
    carlosId,
    'Centro de Oceanografía del Pacífico',
    'Ecología de Manglares y Estuarios',
    'MSc en Ecología Acuática, Reg. Col. #9302',
    'Especialista en flujos de carbono azul y reforestación de manglares rojos y negros.',
    JSON.stringify(['Manglares', 'Carbono azul'])
  );

  // Voluntario 1: Activo con horas e insignias
  insertUser.run('Juanita Voluntaria', 'voluntario.activo@vidamarina.org', hash('Voluntario123!'), 'voluntario', 'activo', 'Cartagena, Colombia');
  const volActivoId = db.prepare('SELECT id FROM users WHERE email = ?').get('voluntario.activo@vidamarina.org').id;

  const insertInterest = db.prepare('INSERT INTO volunteer_interests (user_id, interest) VALUES (?, ?)');
  insertInterest.run(volActivoId, 'Limpieza de playas y fondos marinos');
  insertInterest.run(volActivoId, 'Restauración y siembra de corales');
  insertInterest.run(volActivoId, 'Monitoreo y rescate de tortugas marinas');

  // Voluntario 2: Sin actividad (para CP-HU-002-2-04)
  insertUser.run('Pedro Nuevo', 'voluntario.nuevo@vidamarina.org', hash('Voluntario123!'), 'voluntario', 'activo', 'Barranquilla, Colombia');
  const volNuevoId = db.prepare('SELECT id FROM users WHERE email = ?').get('voluntario.nuevo@vidamarina.org').id;
  insertInterest.run(volNuevoId, 'Educación y sensibilización comunitaria');

  // Voluntario 3: Cercano a meta de 10h (para CP-HU-002-2-05)
  insertUser.run('Sofía Meta', 'voluntario.meta@vidamarina.org', hash('Voluntario123!'), 'voluntario', 'activo', 'San Andrés Islas, Colombia');
  const volMetaId = db.prepare('SELECT id FROM users WHERE email = ?').get('voluntario.meta@vidamarina.org').id;
  insertInterest.run(volMetaId, 'Restauración y siembra de corales');
  insertInterest.run(volMetaId, 'Protección y reforestación de manglares');

  // Ciudadano
  insertUser.run('Andrés Ciudadano', 'ciudadano@vidamarina.org', hash('Ciudadano123!'), 'ciudadano', 'activo', 'Cartagena, Colombia');
  const ciudadanoId = db.prepare('SELECT id FROM users WHERE email = ?').get('ciudadano@vidamarina.org').id;

  // Usuario Suspendido (para CP-HU-009-2-04)
  insertUser.run('Usuario Suspendido', 'suspendido@vidamarina.org', hash('Suspendido123!'), 'voluntario', 'suspendido', 'Santa Marta, Colombia');

  // 3. Sembrar Actividades del Calendario (Backlog HU-P-01)
  const insertActivity = db.prepare(`
    INSERT INTO activities (title, description, date, time, location, volunteer_spots, activity_type, created_by)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  insertActivity.run(
    'Siembra y Trasplante de Corales Cuerno de Ciervo',
    'Jornada subacuática de fijación de fragmentos de coral cultivados en guarderías hacia el arrecife natural.',
    '2026-11-15',
    '08:00 - 14:00',
    'Parque Nacional Natural Corales del Rosario',
    25,
    'Restauración de corales',
    adminId
  );
  const act1Id = db.prepare('SELECT id FROM activities WHERE title LIKE ?').get('%Siembra%').id;

  insertActivity.run(
    'Mega Jornada de Limpieza y Caracterización de Microplásticos',
    'Limpieza intensiva de orilla de playa y muestreo para clasificación de contaminantes poliméricos.',
    '2026-11-22',
    '07:30 - 13:30',
    'Playa Blanca, Isla Barú',
    40,
    'Limpieza de playas',
    adminId
  );
  const act2Id = db.prepare('SELECT id FROM activities WHERE title LIKE ?').get('%Mega Jornada%').id;

  insertActivity.run(
    'Monitoreo Nocturno y Censo de Anidación de Tortuga Carey',
    'Patrullaje nocturno para registro biométrico de hembras anidantes y protección de nidadas.',
    '2026-12-05',
    '19:00 - 01:00',
    'Bahía Solano, Chocó',
    15,
    'Monitoreo de fauna',
    adminId
  );

  // 4. Sembrar Participaciones de Voluntarios
  const insertPart = db.prepare(`
    INSERT INTO volunteer_participations (user_id, activity_id, activity_name, hours, status)
    VALUES (?, ?, ?, ?, ?)
  `);

  // Voluntario Activo: 6h + 6h = 12 horas acumuladas
  insertPart.run(volActivoId, act1Id, 'Siembra y Trasplante de Corales Cuerno de Ciervo', 6, 'completada');
  insertPart.run(volActivoId, act2Id, 'Mega Jornada de Limpieza y Caracterización de Microplásticos', 6, 'completada');

  // Asignar insignias al Voluntario Activo (B01 y B02)
  const insertUserBadge = db.prepare('INSERT INTO user_badges (user_id, badge_id) VALUES (?, ?)');
  insertUserBadge.run(volActivoId, b01);
  insertUserBadge.run(volActivoId, b02);

  // Voluntario Meta: 8 horas acumuladas (Le faltan 2h para la meta de 10h)
  insertPart.run(volMetaId, act1Id, 'Siembra y Trasplante de Corales Cuerno de Ciervo', 8, 'completada');
  insertUserBadge.run(volMetaId, b01); // Solo B01 (1h), no B02 (10h)

  // 5. Sembrar Hilo de Foro (Experto)
  db.prepare(`
    INSERT INTO forum_threads (title, content, category, author_id)
    VALUES (?, ?, ?, ?)
  `).run(
    'Estrategias de Adaptación Térmica en Comunidades Arrecifales',
    'El calentamiento anómalo del agua marina requiere la selección asistida de colonias resilientes para guarderías submarinas.',
    'Investigación Científica',
    marinaId
  );

  // 6. Sembrar Denuncia Ambiental (Ciudadano)
  db.prepare(`
    INSERT INTO environmental_reports (citizen_id, title, description, location, status)
    VALUES (?, ?, ?, ?, ?)
  `).run(
    ciudadanoId,
    'Presencia de red fantasma atrapando fauna marina',
    'En el sector de Bocachica se detectó una red de enmalle abandonada con peces y tortugas en riesgo.',
    'Bocachica, Bahía de Cartagena',
    'pendiente'
  );

  // 7. Sembrar Donación (Ciudadano)
  db.prepare(`
    INSERT INTO donation_campaigns (citizen_id, campaign_name, amount, status)
    VALUES (?, ?, ?, ?)
  `).run(
    ciudadanoId,
    'Campaña: Adopta y Siembra un Coral 2026',
    50.00,
    'pendiente'
  );
}

module.exports = {
  seedDatabase,
  INTERESTS_CATALOG
};
