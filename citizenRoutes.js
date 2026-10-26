/**
 * ================================================================
 * RUTAS DE ACCIONES CIUDADANAS: DENUNCIAS Y DONACIONES (RF09)
 * ================================================================
 * Ciudadano: puede visualizar contenidos, reportar denuncias ambientales
 * marinas y realizar donaciones (HU-009-1-04).
 */
const express = require('express');
const { getDatabase } = require('../config/database');
const { verifyToken } = require('../middleware/auth');

const router = express.Router();

/**
 * Reportar denuncia ambiental marina (CP-HU-009-1-04)
 */
router.post('/reports', verifyToken, (req, res) => {
  const { title, description, location } = req.body;

  if (!title || !title.trim() || !description || !description.trim() || !location || !location.trim()) {
    return res.status(400).json({ error: 'Título, descripción y ubicación son obligatorios para registrar la denuncia.' });
  }

  const db = getDatabase();
  const insertStmt = db.prepare(`
    INSERT INTO environmental_reports (citizen_id, title, description, location, status)
    VALUES (?, ?, ?, ?, 'pendiente')
  `);

  const result = insertStmt.run(req.user.id, title.trim(), description.trim(), location.trim());
  const newReportId = Number(result.lastInsertRowid);
  const createdReport = db.prepare('SELECT * FROM environmental_reports WHERE id = ?').get(newReportId);

  res.status(201).json({
    message: 'Denuncia ambiental registrada con éxito. Será revisada por la administración.',
    report: createdReport
  });
});

/**
 * Listar denuncias ambientales
 */
router.get('/reports', (req, res) => {
  const db = getDatabase();
  const reports = db.prepare(`
    SELECT r.*, u.name as citizen_name
    FROM environmental_reports r
    JOIN users u ON r.citizen_id = u.id
    ORDER BY r.created_at DESC
  `).all();
  res.json({ reports });
});

/**
 * Realizar donación a campaña de conservación (CP-HU-009-1-04)
 */
router.post('/donations', verifyToken, (req, res) => {
  const { campaign_name, amount } = req.body;

  if (!campaign_name || !amount || isNaN(amount) || Number(amount) <= 0) {
    return res.status(400).json({ error: 'El nombre de la campaña y un monto positivo son obligatorios.' });
  }

  const db = getDatabase();
  const insertStmt = db.prepare(`
    INSERT INTO donation_campaigns (citizen_id, campaign_name, amount, status)
    VALUES (?, ?, ?, 'pendiente')
  `);

  const result = insertStmt.run(req.user.id, campaign_name.trim(), parseFloat(amount));
  const newDonationId = Number(result.lastInsertRowid);
  const createdDonation = db.prepare('SELECT * FROM donation_campaigns WHERE id = ?').get(newDonationId);

  res.status(201).json({
    message: 'Aporte de donación registrado con éxito. Gracias por contribuir a la conservación marina.',
    donation: createdDonation
  });
});

/**
 * Listar campañas de donación
 */
router.get('/donations', (req, res) => {
  const db = getDatabase();
  const donations = db.prepare(`
    SELECT d.*, u.name as citizen_name
    FROM donation_campaigns d
    JOIN users u ON d.citizen_id = u.id
    ORDER BY d.created_at DESC
  `).all();
  res.json({ donations });
});

module.exports = router;
