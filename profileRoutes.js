/**
 * ================================================================
 * RUTAS DE GESTIÓN DE PERFILES DE EXPERTO Y VOLUNTARIO (RF02)
 * ================================================================
 */
const express = require('express');
const { getDatabase } = require('../config/database');
const { verifyToken, requireRole, requireProfileOwnership } = require('../middleware/auth');

const router = express.Router();

/**
 * Función auxiliar para verificar y otorgar insignias automáticamente según metas
 * @param {object} db - Instancia de la base de datos
 * @param {number} userId - ID del voluntario
 */
function checkAndAwardBadges(db, userId) {
  const participations = db.prepare('SELECT hours FROM volunteer_participations WHERE user_id = ?').all(userId);
  const totalHours = participations.reduce((sum, p) => sum + (p.hours || 0), 0);
  const totalActivities = participations.length;

  const allBadges = db.prepare('SELECT * FROM badges').all();
  const userBadges = db.prepare('SELECT badge_id FROM user_badges WHERE user_id = ?').all(userId).map(ub => ub.badge_id);

  const insertUserBadge = db.prepare('INSERT OR IGNORE INTO user_badges (user_id, badge_id) VALUES (?, ?)');

  for (const badge of allBadges) {
    const meetsHours = totalHours >= badge.required_hours;
    const meetsActivities = totalActivities >= badge.required_activities;

    if (meetsHours && meetsActivities && !userBadges.includes(badge.id)) {
      insertUserBadge.run(userId, badge.id);
    }
  }
}

// ================================================================
// HU-002-1: GESTIÓN DE PERFIL DE EXPERTO
// ================================================================

/**
 * Consultar perfil público del experto (CP-HU-002-1-01)
 */
router.get('/expert/:id', (req, res) => {
  const db = getDatabase();
  const expertId = parseInt(req.params.id, 10);

  const user = db.prepare('SELECT id, name, email, role, location FROM users WHERE id = ?').get(expertId);
  if (!user || user.role !== 'experto') {
    return res.status(404).json({ error: 'Perfil de experto no encontrado.' });
  }

  const profile = db.prepare('SELECT * FROM expert_profiles WHERE user_id = ?').get(expertId);
  const publications = db.prepare('SELECT * FROM expert_publications WHERE user_id = ? ORDER BY year DESC').all(expertId);

  res.json({
    user,
    profile: profile ? {
      ...profile,
      research_areas: JSON.parse(profile.research_areas || '[]')
    } : null,
    publications
  });
});

/**
 * Editar biografía científica (CP-HU-002-1-01, CP-HU-002-1-04, CP-HU-002-1-05)
 * Restringido estrictamente al propietario mediante requireProfileOwnership
 */
router.put('/expert/:id/bio', verifyToken, requireRole(['experto', 'administrador']), requireProfileOwnership, (req, res) => {
  const db = getDatabase();
  const expertId = parseInt(req.params.id, 10);
  const { scientific_bio } = req.body;

  if (scientific_bio === undefined) {
    return res.status(400).json({ error: 'El campo scientific_bio es requerido.' });
  }

  db.prepare(`
    UPDATE expert_profiles 
    SET scientific_bio = ? 
    WHERE user_id = ?
  `).run(scientific_bio.trim(), expertId);

  const updatedProfile = db.prepare('SELECT * FROM expert_profiles WHERE user_id = ?').get(expertId);

  res.json({
    message: 'Biografía científica actualizada exitosamente.',
    profile: {
      ...updatedProfile,
      research_areas: JSON.parse(updatedProfile.research_areas || '[]')
    }
  });
});

/**
 * Agregar publicación científica al perfil del experto (CP-HU-002-1-02, CP-HU-002-1-04)
 */
router.post('/expert/:id/publications', verifyToken, requireRole(['experto', 'administrador']), requireProfileOwnership, (req, res) => {
  const db = getDatabase();
  const expertId = parseInt(req.params.id, 10);
  const { title, year, journal, url } = req.body;

  if (!title || !title.trim() || !year) {
    return res.status(400).json({ error: 'El título y el año de la publicación son obligatorios.' });
  }

  const insertStmt = db.prepare(`
    INSERT INTO expert_publications (user_id, title, year, journal, url)
    VALUES (?, ?, ?, ?, ?)
  `);
  const result = insertStmt.run(expertId, title.trim(), parseInt(year, 10), journal ? journal.trim() : '', url ? url.trim() : '');
  const publicationId = Number(result.lastInsertRowid);

  const newPublication = db.prepare('SELECT * FROM expert_publications WHERE id = ?').get(publicationId);

  res.status(201).json({
    message: 'Publicación científica agregada con éxito.',
    publication: newPublication
  });
});

/**
 * Eliminar publicación científica del perfil (CP-HU-002-1-02, CP-HU-002-1-04)
 */
router.delete('/expert/:id/publications/:pubId', verifyToken, requireRole(['experto', 'administrador']), requireProfileOwnership, (req, res) => {
  const db = getDatabase();
  const expertId = parseInt(req.params.id, 10);
  const pubId = parseInt(req.params.pubId, 10);

  const pub = db.prepare('SELECT * FROM expert_publications WHERE id = ? AND user_id = ?').get(pubId, expertId);
  if (!pub) {
    return res.status(404).json({ error: 'Publicación no encontrada o no pertenece a este perfil.' });
  }

  db.prepare('DELETE FROM expert_publications WHERE id = ?').run(pubId);

  res.json({
    message: 'Publicación científica eliminada correctamente de la base de datos.',
    deletedPublicationId: pubId
  });
});

/**
 * Modificar áreas de investigación (CP-HU-002-1-03, CP-HU-002-1-04)
 */
router.put('/expert/:id/research-areas', verifyToken, requireRole(['experto', 'administrador']), requireProfileOwnership, (req, res) => {
  const db = getDatabase();
  const expertId = parseInt(req.params.id, 10);
  const { research_areas } = req.body;

  if (!Array.isArray(research_areas)) {
    return res.status(400).json({ error: 'research_areas debe ser un array de áreas de investigación.' });
  }

  const cleanAreas = research_areas.map(a => String(a).trim()).filter(a => a.length > 0);

  db.prepare(`
    UPDATE expert_profiles 
    SET research_areas = ? 
    WHERE user_id = ?
  `).run(JSON.stringify(cleanAreas), expertId);

  res.json({
    message: 'Áreas de investigación actualizadas con éxito.',
    research_areas: cleanAreas
  });
});

// ================================================================
// HU-002-2: PERFIL DE VOLUNTARIO: HISTORIAL, HORAS E INSIGNIAS
// ================================================================

/**
 * Visualizar perfil de voluntario: historial, cálculo de horas e insignias (CP-HU-002-2-01 a 04)
 */
router.get('/volunteer/:id', verifyToken, (req, res) => {
  const db = getDatabase();
  const volunteerId = parseInt(req.params.id, 10);

  const user = db.prepare('SELECT id, name, email, role, status, location FROM users WHERE id = ?').get(volunteerId);
  if (!user || user.role !== 'voluntario') {
    return res.status(404).json({ error: 'Perfil de voluntario no encontrado.' });
  }

  // Comprobar y otorgar insignias si corresponde
  checkAndAwardBadges(db, volunteerId);

  const participations = db.prepare('SELECT * FROM volunteer_participations WHERE user_id = ? ORDER BY registered_at DESC').all(volunteerId);
  const totalHours = participations.reduce((sum, p) => sum + (p.hours || 0), 0);

  const badges = db.prepare(`
    SELECT b.*, ub.awarded_at 
    FROM user_badges ub 
    JOIN badges b ON ub.badge_id = b.id 
    WHERE ub.user_id = ?
    ORDER BY b.required_hours ASC
  `).all(volunteerId);

  const interests = db.prepare('SELECT interest FROM volunteer_interests WHERE user_id = ?').all(volunteerId).map(r => r.interest);

  // Manejo de voluntario sin actividad (CP-HU-002-2-04)
  const hasActivities = participations.length > 0;
  const emptyMessage = hasActivities
    ? null
    : 'Aún no has participado en actividades de conservación marina. ¡Te invitamos a explorar las convocatorias abiertas y unirte a la acción por nuestros océanos!';

  res.json({
    user,
    interests,
    participations,
    totalHours,
    badges,
    hasActivities,
    emptyMessage
  });
});

/**
 * Registrar nueva participación de voluntario (CP-HU-002-2-05)
 * Recalcula en tiempo real las horas acumuladas y asigna insignias alcanzadas
 */
router.post('/volunteer/:id/participations', verifyToken, (req, res) => {
  const db = getDatabase();
  const volunteerId = parseInt(req.params.id, 10);
  const { activity_id, activity_name, hours } = req.body;

  if (!activity_name || !hours || isNaN(hours) || Number(hours) <= 0) {
    return res.status(400).json({ error: 'El nombre de la actividad y un número válido de horas son obligatorios.' });
  }

  const numericHours = parseFloat(hours);

  // 1. Insertar la participación
  const insertStmt = db.prepare(`
    INSERT INTO volunteer_participations (user_id, activity_id, activity_name, hours, status)
    VALUES (?, ?, ?, ?, 'completada')
  `);
  insertStmt.run(volunteerId, activity_id ? parseInt(activity_id, 10) : null, activity_name.trim(), numericHours);

  // 2. Comprobar y otorgar nuevas insignias si se alcanzó la meta
  checkAndAwardBadges(db, volunteerId);

  // 3. Obtener totales recalculados
  const participations = db.prepare('SELECT * FROM volunteer_participations WHERE user_id = ? ORDER BY registered_at DESC').all(volunteerId);
  const totalHours = participations.reduce((sum, p) => sum + (p.hours || 0), 0);

  const badges = db.prepare(`
    SELECT b.*, ub.awarded_at 
    FROM user_badges ub 
    JOIN badges b ON ub.badge_id = b.id 
    WHERE ub.user_id = ?
  `).all(volunteerId);

  res.status(201).json({
    message: 'Participación registrada exitosamente. Horas e insignias actualizadas.',
    totalHours,
    participations,
    badges
  });
});

module.exports = router;
