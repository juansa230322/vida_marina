/**
 * ================================================================
 * RUTAS DE AUTENTICACIÓN Y REGISTRO POR ROL (RF01)
 * ================================================================
 */
const express = require('express');
const bcrypt = require('bcryptjs');
const { getDatabase } = require('../config/database');
const { validateRegistration } = require('../middleware/validation');
const { generateToken, verifyToken } = require('../middleware/auth');
const { INTERESTS_CATALOG } = require('../seed/seedData');

const router = express.Router();

/**
 * Catálogo de intereses de conservación para voluntarios (CP-HU-001-2-02)
 */
router.get('/interests', (req, res) => {
  res.json({
    interests: INTERESTS_CATALOG
  });
});

/**
 * Registro de nuevos usuarios según su rol (HU-001-1, HU-001-2, HU-001-3)
 */
router.post('/register', validateRegistration, (req, res) => {
  const db = getDatabase();
  const {
    role,
    name,
    email,
    password,
    location,
    institution,
    biological_specialty,
    professional_credentials,
    interests
  } = req.body;

  const normalizedEmail = email.trim().toLowerCase();

  // 1. Verificar si el correo ya está registrado (CP-HU-001-1-04, CP-HU-001-2-04, CP-HU-001-3-02)
  const existingUser = db.prepare('SELECT id FROM users WHERE email = ?').get(normalizedEmail);
  if (existingUser) {
    return res.status(400).json({
      error: 'El correo electrónico ya se encuentra registrado en el sistema. Por favor utiliza otro correo o inicia sesión.'
    });
  }

  // 2. Hash de contraseña seguro (CP-HU-001-1-05)
  const salt = bcrypt.genSaltSync(10);
  const passwordHash = bcrypt.hashSync(password.trim(), salt);

  try {
    // 3. Insertar usuario base
    const insertUserStmt = db.prepare(`
      INSERT INTO users (name, email, password_hash, role, status, location)
      VALUES (?, ?, ?, ?, 'activo', ?)
    `);
    const userResult = insertUserStmt.run(name.trim(), normalizedEmail, passwordHash, role, location ? location.trim() : null);
    const userId = Number(userResult.lastInsertRowid);

    // 4. Inserción según rol específico
    if (role === 'experto') {
      // Perfil de experto (CP-HU-001-1-01)
      db.prepare(`
        INSERT INTO expert_profiles (user_id, institution, biological_specialty, professional_credentials, scientific_bio, research_areas)
        VALUES (?, ?, ?, ?, '', '[]')
      `).run(
        userId,
        institution.trim(),
        biological_specialty.trim(),
        professional_credentials.trim()
      );
    } else if (role === 'voluntario') {
      // Guardar intereses seleccionados con el voluntario (CP-HU-001-2-01, CP-HU-001-2-05)
      const insertInterestStmt = db.prepare(`
        INSERT INTO volunteer_interests (user_id, interest)
        VALUES (?, ?)
      `);
      for (const interest of interests) {
        insertInterestStmt.run(userId, interest.trim());
      }
    }

    const createdUser = db.prepare('SELECT id, name, email, role, status, location, created_at FROM users WHERE id = ?').get(userId);
    const token = generateToken(createdUser);

    return res.status(201).json({
      message: 'Registro completado exitosamente en la plataforma Vida Marina.',
      token,
      user: createdUser
    });
  } catch (error) {
    return res.status(500).json({
      error: 'Error interno al registrar el usuario: ' + error.message
    });
  }
});

/**
 * Inicio de sesión de usuarios (todos los roles)
 */
router.post('/login', (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({
      error: 'Por favor ingresa tanto tu correo electrónico como tu contraseña.'
    });
  }

  const db = getDatabase();
  const normalizedEmail = email.trim().toLowerCase();
  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(normalizedEmail);

  if (!user) {
    return res.status(401).json({
      error: 'Credenciales inválidas. No se encontró ninguna cuenta con ese correo electrónico.'
    });
  }

  // Comprobar si la cuenta está suspendida (CP-HU-009-2-04)
  if (user.status === 'suspendido') {
    return res.status(403).json({
      error: 'Tu cuenta ha sido suspendida por la administración de la plataforma. Contacta al Administrador General para más información.'
    });
  }

  // Validar contraseña contra el hash de bcrypt
  const passwordMatch = bcrypt.compareSync(password.trim(), user.password_hash);
  if (!passwordMatch) {
    return res.status(401).json({
      error: 'Credenciales inválidas. Contraseña incorrecta.'
    });
  }

  const token = generateToken(user);
  const userClean = {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    status: user.status,
    location: user.location,
    created_at: user.created_at
  };

  return res.json({
    message: 'Inicio de sesión exitoso.',
    token,
    user: userClean
  });
});

/**
 * Obtener datos del usuario autenticado actual
 */
router.get('/me', verifyToken, (req, res) => {
  const db = getDatabase();
  const user = db.prepare('SELECT id, name, email, role, status, location, created_at FROM users WHERE id = ?').get(req.user.id);

  let extraData = {};
  if (user.role === 'experto') {
    const profile = db.prepare('SELECT * FROM expert_profiles WHERE user_id = ?').get(user.id);
    const publications = db.prepare('SELECT * FROM expert_publications WHERE user_id = ? ORDER BY year DESC').all(user.id);
    extraData = {
      profile: profile ? {
        ...profile,
        research_areas: JSON.parse(profile.research_areas || '[]')
      } : null,
      publications
    };
  } else if (user.role === 'voluntario') {
    const interests = db.prepare('SELECT interest FROM volunteer_interests WHERE user_id = ?').all(user.id).map(r => r.interest);
    const participations = db.prepare('SELECT * FROM volunteer_participations WHERE user_id = ? ORDER BY registered_at DESC').all(user.id);
    const totalHours = participations.reduce((sum, p) => sum + (p.hours || 0), 0);
    const badges = db.prepare(`
      SELECT b.*, ub.awarded_at 
      FROM user_badges ub 
      JOIN badges b ON ub.badge_id = b.id 
      WHERE ub.user_id = ?
    `).all(user.id);

    extraData = {
      interests,
      participations,
      totalHours,
      badges
    };
  }

  res.json({
    user,
    ...extraData
  });
});

module.exports = router;
