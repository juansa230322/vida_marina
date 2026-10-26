/**
 * ================================================================
 * CONFIGURACIÓN DE BASE DE DATOS SQLITE NATIVA (ODS 14: Vida Marina)
 * ================================================================
 * Utiliza DatabaseSync de node:sqlite (disponible en Node.js 22+)
 * Base de datos relacional persistente con soporte para claves foráneas y transacciones.
 */
const { DatabaseSync } = require('node:sqlite');
const path = require('path');
const fs = require('fs');

const DB_PATH = process.env.DB_PATH || path.join(__dirname, '..', '..', 'database.sqlite');

let dbInstance = null;

function getDatabase() {
  if (!dbInstance) {
    dbInstance = new DatabaseSync(DB_PATH);
    dbInstance.exec('PRAGMA foreign_keys = ON;');
    initializeSchema(dbInstance);
  }
  return dbInstance;
}

function initializeSchema(db) {
  db.exec(`
    -- Tabla de Usuarios
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL COLLATE NOCASE,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('administrador', 'experto', 'voluntario', 'ciudadano')),
      status TEXT NOT NULL DEFAULT 'activo' CHECK(status IN ('activo', 'suspendido')),
      location TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Perfiles de Expertos / Investigadores Marinos (1:1)
    CREATE TABLE IF NOT EXISTS expert_profiles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER UNIQUE NOT NULL,
      institution TEXT NOT NULL,
      biological_specialty TEXT NOT NULL,
      professional_credentials TEXT NOT NULL,
      scientific_bio TEXT DEFAULT '',
      research_areas TEXT DEFAULT '[]',
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    -- Publicaciones Científicas de Expertos (1:N)
    CREATE TABLE IF NOT EXISTS expert_publications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      year INTEGER NOT NULL,
      journal TEXT DEFAULT '',
      url TEXT DEFAULT '',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    -- Intereses de Conservación de Voluntarios (1:N)
    CREATE TABLE IF NOT EXISTS volunteer_interests (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      interest TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    -- Actividades de Conservación (Backlog HU-P-01)
    CREATE TABLE IF NOT EXISTS activities (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      date TEXT NOT NULL,
      time TEXT NOT NULL,
      location TEXT NOT NULL,
      volunteer_spots INTEGER NOT NULL,
      activity_type TEXT NOT NULL,
      created_by INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
    );

    -- Participaciones de Voluntarios en Actividades
    CREATE TABLE IF NOT EXISTS volunteer_participations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      activity_id INTEGER,
      activity_name TEXT NOT NULL,
      hours REAL NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'completada',
      registered_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (activity_id) REFERENCES activities(id) ON DELETE SET NULL
    );

    -- Catálogo de Insignias por Metas
    CREATE TABLE IF NOT EXISTS badges (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      code TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      description TEXT NOT NULL,
      icon TEXT NOT NULL,
      required_hours REAL NOT NULL DEFAULT 0,
      required_activities INTEGER NOT NULL DEFAULT 0
    );

    -- Insignias Asignadas a Usuarios
    CREATE TABLE IF NOT EXISTS user_badges (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      badge_id INTEGER NOT NULL,
      awarded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(user_id, badge_id),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (badge_id) REFERENCES badges(id) ON DELETE CASCADE
    );

    -- Foros Comunitarios
    CREATE TABLE IF NOT EXISTS forum_threads (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      category TEXT NOT NULL,
      author_id INTEGER NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE CASCADE
    );

    -- Denuncias Ambientales Marinas
    CREATE TABLE IF NOT EXISTS environmental_reports (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      citizen_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      location TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pendiente' CHECK(status IN ('pendiente', 'revisada')),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (citizen_id) REFERENCES users(id) ON DELETE CASCADE
    );

    -- Campañas de Donación
    CREATE TABLE IF NOT EXISTS donation_campaigns (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      citizen_id INTEGER NOT NULL,
      campaign_name TEXT NOT NULL,
      amount REAL NOT NULL,
      status TEXT NOT NULL DEFAULT 'pendiente' CHECK(status IN ('pendiente', 'aprobada')),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (citizen_id) REFERENCES users(id) ON DELETE CASCADE
    );
  `);
}

module.exports = {
  getDatabase,
  DB_PATH
};
