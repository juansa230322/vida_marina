/**
 * ================================================================
 * RUTAS DE ACTIVIDADES EN EL CALENDARIO (HU-P-01 - HISTORIA DEL BACKLOG)
 * ================================================================
 * Funcionalidad identificada y aislada como pendiente del backlog,
 * no perteneciente al alcance estricto del Sprint 2.
 */
const express = require('express');
const { getDatabase } = require('../config/database');
const { verifyToken, requireRole } = require('../middleware/auth');
const { isValidCalendarDate } = require('../middleware/validation');

const router = express.Router();

/**
 * Consultar todas las actividades para el calendario (CP-HU-P-01-04)
 * Consulta abierta para todos los usuarios y visitantes
 */
router.get('/', (req, res) => {
  const db = getDatabase();
  const activities = db.prepare(`
    SELECT a.*, u.name as creator_name
    FROM activities a
    LEFT JOIN users u ON a.created_by = u.id
    ORDER BY a.date ASC, a.time ASC
  `).all();

  res.json({
    module: 'HU-P-01 - Calendario de Actividades (Funcionalidad adicional del Backlog)',
    activities
  });
});

/**
 * Consultar detalle de una actividad específica (CP-HU-P-01-04)
 */
router.get('/:id', (req, res) => {
  const db = getDatabase();
  const actId = parseInt(req.params.id, 10);
  const activity = db.prepare('SELECT * FROM activities WHERE id = ?').get(actId);

  if (!activity) {
    return res.status(404).json({ error: 'Actividad de conservación no encontrada.' });
  }

  // Contar participantes inscritos
  const enrolledCount = db.prepare('SELECT COUNT(*) as count FROM volunteer_participations WHERE activity_id = ?').get(actId).count;

  res.json({
    activity,
    enrolledCount,
    remainingSpots: Math.max(0, activity.volunteer_spots - enrolledCount)
  });
});

/**
 * Crear actividad en el calendario (CP-HU-P-01-01, 02, 03, 05)
 * Restringido EXCLUSIVAMENTE al rol Administrador General.
 */
router.post('/', verifyToken, requireRole(['administrador']), (req, res) => {
  const { title, description, date, time, location, volunteer_spots, activity_type } = req.body;

  // 1. Validar campos obligatorios faltantes (CP-HU-P-01-02)
  const missing = [];
  if (!title || !title.trim()) missing.push('título');
  if (!description || !description.trim()) missing.push('descripción');
  if (!date || !date.trim()) missing.push('fecha');
  if (!time || !time.trim()) missing.push('hora');
  if (!location || !location.trim()) missing.push('lugar');
  if (volunteer_spots === undefined || volunteer_spots === null || isNaN(volunteer_spots) || Number(volunteer_spots) <= 0) {
    missing.push('cupos de voluntarios');
  }
  if (!activity_type || !activity_type.trim()) missing.push('tipo de actividad');

  if (missing.length > 0) {
    return res.status(400).json({
      error: `Faltan campos obligatorios para crear la actividad: ${missing.join(', ')}.`
    });
  }

  // 2. Validar fecha válida (CP-HU-P-01-03)
  if (!isValidCalendarDate(date.trim())) {
    return res.status(400).json({
      error: 'La fecha ingresada no es válida o no existe en el calendario (debe tener formato AAAA-MM-DD y ser una fecha real, ej. 2026-11-20).'
    });
  }

  // 3. Insertar en la base de datos (CP-HU-P-01-01)
  const db = getDatabase();
  const insertStmt = db.prepare(`
    INSERT INTO activities (title, description, date, time, location, volunteer_spots, activity_type, created_by)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const result = insertStmt.run(
    title.trim(),
    description.trim(),
    date.trim(),
    time.trim(),
    location.trim(),
    parseInt(volunteer_spots, 10),
    activity_type.trim(),
    req.user.id
  );

  const newActivityId = Number(result.lastInsertRowid);
  const createdActivity = db.prepare('SELECT * FROM activities WHERE id = ?').get(newActivityId);

  res.status(201).json({
    message: 'Actividad de conservación marina creada y agendada exitosamente en el calendario.',
    module: 'HU-P-01 - Backlog',
    activity: createdActivity
  });
});

/**
 * Postulación de voluntarios a una actividad (HU-009-1-03)
 */
router.post('/:id/enroll', verifyToken, requireRole(['voluntario']), (req, res) => {
  const db = getDatabase();
  const actId = parseInt(req.params.id, 10);
  const activity = db.prepare('SELECT * FROM activities WHERE id = ?').get(actId);

  if (!activity) {
    return res.status(404).json({ error: 'Actividad no encontrada.' });
  }

  // Verificar si ya está inscrito
  const existing = db.prepare('SELECT id FROM volunteer_participations WHERE user_id = ? AND activity_id = ?').get(req.user.id, actId);
  if (existing) {
    return res.status(400).json({ error: 'Ya te encuentras postulado a esta actividad.' });
  }

  // Inscribir con 4 horas estimadas
  db.prepare(`
    INSERT INTO volunteer_participations (user_id, activity_id, activity_name, hours, status)
    VALUES (?, ?, ?, ?, 'inscrita')
  `).run(req.user.id, actId, activity.title, 4);

  res.json({
    message: `¡Te has postulado con éxito a la actividad "${activity.title}"!`,
    activityId: actId
  });
});

module.exports = router;
