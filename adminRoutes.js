/**
 * ================================================================
 * RUTAS DEL PANEL DE ADMINISTRACIÓN GENERAL (RF09, HU-009-1, HU-009-2)
 * ================================================================
 * Control exclusivo para el Administrador General.
 * Permite gestión completa de usuarios, cambio de rol, suspensión/reactivación,
 * eliminación, moderación de foros, aprobación de donaciones y revisión de denuncias.
 */
const express = require('express');
const { getDatabase } = require('../config/database');
const { verifyToken, requireRole } = require('../middleware/auth');

const router = express.Router();

// Todas las rutas de administración están protegidas estrictamente para el Administrador General
router.use(verifyToken, requireRole(['administrador']));

/**
 * Listar usuarios con búsqueda y filtrado por rol (CP-HU-009-2-01, CP-HU-009-2-02)
 */
router.get('/users', (req, res) => {
  const db = getDatabase();
  const { search, role } = req.query;

  let query = 'SELECT id, name, email, role, status, location, created_at FROM users WHERE 1=1';
  const params = [];

  if (search && search.trim()) {
    query += ' AND (name LIKE ? OR email LIKE ?)';
    const term = `%${search.trim()}%`;
    params.push(term, term);
  }

  if (role && role.trim()) {
    query += ' AND role = ?';
    params.push(role.trim());
  }

  query += ' ORDER BY created_at DESC';

  const users = db.prepare(query).all(...params);

  const emptyMessage = users.length === 0
    ? 'No se encontraron usuarios que coincidan con los criterios de búsqueda y filtro seleccionados.'
    : null;

  res.json({
    users,
    total: users.length,
    emptyMessage
  });
});

/**
 * Cambiar el rol de un usuario (CP-HU-009-2-03)
 */
router.patch('/users/:id/role', (req, res) => {
  const db = getDatabase();
  const userId = parseInt(req.params.id, 10);
  const { newRole } = req.body;

  const validRoles = ['administrador', 'experto', 'voluntario', 'ciudadano'];
  if (!newRole || !validRoles.includes(newRole)) {
    return res.status(400).json({ error: 'Rol no válido. Debe ser: administrador, experto, voluntario o ciudadano.' });
  }

  const user = db.prepare('SELECT id, name, role FROM users WHERE id = ?').get(userId);
  if (!user) {
    return res.status(404).json({ error: 'Usuario no encontrado.' });
  }

  db.prepare('UPDATE users SET role = ? WHERE id = ?').run(newRole, userId);
  const updatedUser = db.prepare('SELECT id, name, email, role, status, location FROM users WHERE id = ?').get(userId);

  res.json({
    message: `Rol del usuario ${user.name} actualizado exitosamente de "${user.role}" a "${newRole}".`,
    user: updatedUser
  });
});

/**
 * Suspender o reactivar cuenta de usuario (CP-HU-009-2-04)
 */
router.patch('/users/:id/status', (req, res) => {
  const db = getDatabase();
  const userId = parseInt(req.params.id, 10);
  const { status } = req.body;

  if (!status || !['activo', 'suspendido'].includes(status)) {
    return res.status(400).json({ error: 'Estado no válido. Debe ser "activo" o "suspendido".' });
  }

  const user = db.prepare('SELECT id, name, role FROM users WHERE id = ?').get(userId);
  if (!user) {
    return res.status(404).json({ error: 'Usuario no encontrado.' });
  }

  // Prevenir que el admin se suspenda a sí mismo por error
  if (req.user.id === userId && status === 'suspendido') {
    return res.status(400).json({ error: 'El administrador no puede suspender su propia cuenta.' });
  }

  db.prepare('UPDATE users SET status = ? WHERE id = ?').run(status, userId);
  const updatedUser = db.prepare('SELECT id, name, email, role, status FROM users WHERE id = ?').get(userId);

  const actionMsg = status === 'suspendido' ? 'suspendida' : 'reactivada';
  res.json({
    message: `La cuenta de ${user.name} ha sido ${actionMsg} exitosamente.`,
    user: updatedUser
  });
});

/**
 * Eliminar usuario con confirmación (CP-HU-009-2-04)
 */
router.delete('/users/:id', (req, res) => {
  const db = getDatabase();
  const userId = parseInt(req.params.id, 10);

  const user = db.prepare('SELECT id, name FROM users WHERE id = ?').get(userId);
  if (!user) {
    return res.status(404).json({ error: 'Usuario no encontrado.' });
  }

  if (req.user.id === userId) {
    return res.status(400).json({ error: 'No puedes eliminar tu propia cuenta de administrador.' });
  }

  db.prepare('DELETE FROM users WHERE id = ?').run(userId);

  res.json({
    message: `Usuario "${user.name}" eliminado definitivamente del sistema.`,
    deletedUserId: userId
  });
});

/**
 * Gestión de denuncias ambientales (CP-HU-009-1-01)
 */
router.get('/reports', (req, res) => {
  const db = getDatabase();
  const reports = db.prepare(`
    SELECT r.*, u.name as citizen_name, u.email as citizen_email
    FROM environmental_reports r
    JOIN users u ON r.citizen_id = u.id
    ORDER BY r.created_at DESC
  `).all();
  res.json({ reports });
});

router.patch('/reports/:id/review', (req, res) => {
  const db = getDatabase();
  const reportId = parseInt(req.params.id, 10);
  const { status } = req.body;

  if (!['pendiente', 'revisada'].includes(status)) {
    return res.status(400).json({ error: 'Estado debe ser "pendiente" o "revisada".' });
  }

  db.prepare('UPDATE environmental_reports SET status = ? WHERE id = ?').run(status, reportId);
  const updatedReport = db.prepare('SELECT * FROM environmental_reports WHERE id = ?').get(reportId);

  res.json({
    message: `Estado de la denuncia ambiental actualizado a "${status}".`,
    report: updatedReport
  });
});

/**
 * Gestión y aprobación de campañas de donación (CP-HU-009-1-01)
 */
router.get('/donations', (req, res) => {
  const db = getDatabase();
  const donations = db.prepare(`
    SELECT d.*, u.name as citizen_name, u.email as citizen_email
    FROM donation_campaigns d
    JOIN users u ON d.citizen_id = u.id
    ORDER BY d.created_at DESC
  `).all();
  res.json({ donations });
});

router.patch('/donations/:id/approve', (req, res) => {
  const db = getDatabase();
  const donationId = parseInt(req.params.id, 10);

  db.prepare('UPDATE donation_campaigns SET status = "aprobada" WHERE id = ?').run(donationId);
  const updatedDonation = db.prepare('SELECT * FROM donation_campaigns WHERE id = ?').get(donationId);

  res.json({
    message: 'Campaña de donación aprobada oficialmente por la administración.',
    donation: updatedDonation
  });
});

module.exports = router;
