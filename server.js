/**
 * ================================================================
 * SERVIDOR PRINCIPAL: PLATAFORMA ODS 14 VIDA MARINA
 * ================================================================
 * Backend completo Node.js + Express con base de datos SQLite nativa
 * Cumple con los Casos de Aceptación del Sprint 2 y Backlog HU-P-01.
 */
const express = require('express');
const cors = require('cors');
const path = require('path');
const { getDatabase } = require('./src/config/database');
const { seedDatabase } = require('./src/seed/seedData');

// Rutas
const authRoutes = require('./src/routes/authRoutes');
const profileRoutes = require('./src/routes/profileRoutes');
const adminRoutes = require('./src/routes/adminRoutes');
const activityRoutes = require('./src/routes/activityRoutes');
const forumRoutes = require('./src/routes/forumRoutes');
const citizenRoutes = require('./src/routes/citizenRoutes');

const app = express();
const PORT = process.env.PORT || 3000;

// Middlewares globales
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Servir frontend estático
app.use(express.static(path.join(__dirname, 'public')));

// Inicializar base de datos y semillero de datos
const db = getDatabase();
seedDatabase(db);

// Montaje de APIs
app.use('/api/auth', authRoutes);
app.use('/api/profiles', profileRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/activities', activityRoutes);
app.use('/api/forum', forumRoutes);
app.use('/api/citizen', citizenRoutes);

// Ruta de estado de la API
app.get('/api/health', (req, res) => {
  res.json({
    status: 'online',
    platform: 'ODS 14: Vida Marina',
    version: 'Sprint 2 + Backlog HU-P-01',
    timestamp: new Date().toISOString()
  });
});

// Fallback SPA
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Manejador global de errores
app.use((err, req, res, next) => {
  console.error('[Error no controlado]:', err);
  res.status(err.status || 500).json({
    error: err.message || 'Error interno del servidor.'
  });
});

// Iniciar servidor si es ejecutado directamente
if (require.main === module) {
  const server = app.listen(PORT, () => {
    console.log(`================================================================`);
    console.log(`🌊 PLATAFORMA ODS 14: VIDA MARINA (Sprint 2 & Backlog)`);
    console.log(`🚀 Servidor ejecutándose en: http://localhost:${PORT}`);
    console.log(`📂 Base de datos SQLite activa con migraciones y semillero.`);
    console.log(`================================================================`);
  });
}

module.exports = app;
