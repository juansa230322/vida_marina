/**
 * ================================================================
 * RUTAS DEL FORO COMUNITARIO Y ARTÍCULOS CIENTÍFICOS (RF09)
 * ================================================================
 * Experto: puede crear hilos y publicar artículos (HU-009-1-02).
 * Administrador: control total y moderación (HU-009-1-01).
 * Voluntario y Ciudadano: pueden leer, pero se les deniega crear hilos (HU-009-1-03, HU-009-1-04).
 */
const express = require('express');
const { getDatabase } = require('../config/database');
const { verifyToken, requireRole } = require('../middleware/auth');

const router = express.Router();

/**
 * Consultar todos los hilos del foro (acceso público)
 */
router.get('/threads', (req, res) => {
  const db = getDatabase();
  const threads = db.prepare(`
    SELECT f.*, u.name as author_name, u.role as author_role
    FROM forum_threads f
    JOIN users u ON f.author_id = u.id
    ORDER BY f.created_at DESC
  `).all();

  res.json({ threads });
});

/**
 * Crear hilo en el foro (CP-HU-009-1-02)
 * Restringido a Experto y Administrador.
 * Voluntario (CP-HU-009-1-03) y Ciudadano (CP-HU-009-1-04) reciben 403 con "permiso insuficiente".
 */
router.post('/threads', verifyToken, requireRole(['experto', 'administrador']), (req, res) => {
  const { title, content, category } = req.body;

  if (!title || !title.trim() || !content || !content.trim()) {
    return res.status(400).json({ error: 'Título y contenido son obligatorios.' });
  }

  const db = getDatabase();
  const insertStmt = db.prepare(`
    INSERT INTO forum_threads (title, content, category, author_id)
    VALUES (?, ?, ?, ?)
  `);

  const result = insertStmt.run(title.trim(), content.trim(), category ? category.trim() : 'General', req.user.id);
  const newThreadId = Number(result.lastInsertRowid);
  const createdThread = db.prepare('SELECT * FROM forum_threads WHERE id = ?').get(newThreadId);

  res.status(201).json({
    message: 'Hilo de debate científico publicado con éxito en el foro.',
    thread: createdThread
  });
});

/**
 * Moderar / eliminar hilo del foro (CP-HU-009-1-01)
 * Restringido exclusivamente al Administrador General.
 */
router.delete('/threads/:id', verifyToken, requireRole(['administrador']), (req, res) => {
  const db = getDatabase();
  const threadId = parseInt(req.params.id, 10);

  const thread = db.prepare('SELECT id, title FROM forum_threads WHERE id = ?').get(threadId);
  if (!thread) {
    return res.status(404).json({ error: 'Hilo de foro no encontrado.' });
  }

  db.prepare('DELETE FROM forum_threads WHERE id = ?').run(threadId);

  res.json({
    message: `El hilo "${thread.title}" ha sido moderado y eliminado por la administración.`,
    deletedThreadId: threadId
  });
});

module.exports = router;
