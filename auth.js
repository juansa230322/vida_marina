/**
 * ================================================================
 * MIDDLEWARE DE AUTENTICACIÓN Y CONTROL DE ROLES (RBAC)
 * ================================================================
 */
const jwt = require('jsonwebtoken');
const { getDatabase } = require('../config/database');

const JWT_SECRET = process.env.JWT_SECRET || 'ods14_vida_marina_secret_key_2026_super_secure';

function generateToken(user) {
  return jwt.sign(
    {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      status: user.status
    },
    JWT_SECRET,
    { expiresIn: '24h' }
  );
}

/**
 * Middleware para validar el token JWT y comprobar estado activo de la cuenta
 */
function verifyToken(req, res, next) {
  const authHeader = req.headers['authorization'] || req.headers['x-auth-token'];
  let token = null;

  if (authHeader) {
    if (authHeader.startsWith('Bearer ')) {
      token = authHeader.slice(7).trim();
    } else {
      token = authHeader.trim();
    }
  }

  if (!token) {
    return res.status(401).json({
      error: 'Acceso no autorizado. Se requiere iniciar sesión con un token válido.'
    });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);

    // Verificar en la base de datos si el usuario existe y si sigue activo
    const db = getDatabase();
    const user = db.prepare('SELECT id, name, email, role, status FROM users WHERE id = ?').get(decoded.id);

    if (!user) {
      return res.status(401).json({ error: 'Usuario no encontrado en la base de datos.' });
    }

    if (user.status === 'suspendido') {
      return res.status(403).json({
        error: 'Tu cuenta ha sido suspendida. No puedes acceder a los servicios de la plataforma.'
      });
    }

    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({
      error: 'Sesión inválida o expirada. Por favor inicia sesión nuevamente.'
    });
  }
}

/**
 * Middleware para restringir el acceso según el rol del usuario
 * @param {string[]} allowedRoles - Array de roles permitidos
 */
function requireRole(allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Permiso insuficiente. No se ha autenticado ningún usuario.' });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        error: `Permiso insuficiente. Esta funcionalidad está restringida a: ${allowedRoles.join(', ')}.`
      });
    }

    next();
  };
}

/**
 * Middleware para verificar la propiedad del perfil (CP-HU-002-1-04)
 * Solo el propio usuario puede modificar su perfil de experto
 */
function requireProfileOwnership(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ error: 'Permiso insuficiente. Debes iniciar sesión.' });
  }

  const requestedUserId = parseInt(req.params.id, 10);
  if (req.user.id !== requestedUserId) {
    return res.status(403).json({
      error: 'Permiso insuficiente. Solo el propietario puede editar su propio perfil.'
    });
  }

  next();
}

module.exports = {
  JWT_SECRET,
  generateToken,
  verifyToken,
  requireRole,
  requireProfileOwnership
};
