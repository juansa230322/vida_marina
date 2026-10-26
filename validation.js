/**
 * ================================================================
 * MIDDLEWARE DE VALIDACIÓN DE FORMULARIOS Y CASOS DE PRUEBA
 * ================================================================
 */

/**
 * Valida formato estándar de correo electrónico
 * Rechaza formatos inválidos como 'experto@' o 'expertocorreo.com'
 */
function isValidEmail(email) {
  if (!email || typeof email !== 'string') return false;
  // Regex estricto RFC compatible
  const re = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;
  return re.test(email.trim());
}

/**
 * Política de contraseña segura:
 * - Mínimo 8 caracteres
 * - Al menos una letra (mayúscula o minúscula)
 * - Al menos un número o símbolo especial
 */
function isValidPassword(password) {
  if (!password || typeof password !== 'string') return false;
  if (password.length < 8) return false;
  const hasLetter = /[a-zA-Z]/.test(password);
  const hasNumberOrSpecial = /[0-9!@#$%^&*(),.?":{}|<>]/.test(password);
  return hasLetter && hasNumberOrSpecial;
}

const PASSWORD_REQUIREMENTS_MESSAGE =
  'La contraseña debe tener al menos 8 caracteres e incluir al menos una letra y un número o símbolo especial.';

/**
 * Validador para registro según el rol solicitado
 */
function validateRegistration(req, res, next) {
  const { role, name, email, password, location } = req.body;

  // 1. Validar que no se intente registrar directamente como Administrador
  if (role === 'administrador') {
    return res.status(403).json({
      error: 'El rol de Administrador no puede ser seleccionado durante el registro público.'
    });
  }

  // 2. Validar rol válido
  const validRoles = ['experto', 'voluntario', 'ciudadano'];
  if (!validRoles.includes(role)) {
    return res.status(400).json({
      error: 'Rol no válido. Los roles disponibles son: Experto / Investigador marino, Voluntario, Ciudadano / Colaborador.'
    });
  }

  const missingFields = [];

  // Campos comunes
  if (!name || !name.trim()) missingFields.push('nombre');
  if (!email || !email.trim()) missingFields.push('correo electrónico');
  if (!password || !password.trim()) missingFields.push('contraseña');

  // Campos específicos por rol
  if (role === 'experto') {
    const { institution, biological_specialty, professional_credentials } = req.body;
    if (!institution || !institution.trim()) missingFields.push('institución');
    if (!biological_specialty || !biological_specialty.trim()) missingFields.push('especialidad biológica');
    if (!professional_credentials || !professional_credentials.trim()) missingFields.push('credenciales profesionales');
  } else if (role === 'voluntario') {
    const { interests } = req.body;
    if (!interests || !Array.isArray(interests) || interests.length === 0) {
      missingFields.push('intereses de conservación');
    }
  } else if (role === 'ciudadano') {
    if (!location || !location.trim()) {
      missingFields.push('ubicación');
    }
  }

  if (missingFields.length > 0) {
    return res.status(400).json({
      error: `Faltan campos obligatorios sin completar: ${missingFields.join(', ')}.`
    });
  }

  // 3. Validar formato de correo (CP-HU-001-1-03, CP-HU-001-2-04, CP-HU-001-3-04)
  if (!isValidEmail(email)) {
    return res.status(400).json({
      error: 'El correo electrónico ingresado no tiene un formato válido (ejemplo: usuario@dominio.com).'
    });
  }

  // 4. Validar política de contraseña (CP-HU-001-1-05, CP-HU-001-3-04)
  if (!isValidPassword(password)) {
    return res.status(400).json({
      error: PASSWORD_REQUIREMENTS_MESSAGE
    });
  }

  next();
}

/**
 * Validador para fechas de actividades del calendario (HU-P-01 Backlog)
 * Valida formato YYYY-MM-DD y que el día exista en el calendario (rechaza 31/02)
 */
function isValidCalendarDate(dateString) {
  if (!dateString || typeof dateString !== 'string') return false;

  // Acepta formato YYYY-MM-DD
  const regex = /^(\d{4})-(\d{2})-(\d{2})$/;
  const match = dateString.match(regex);
  if (!match) return false;

  const year = parseInt(match[1], 10);
  const month = parseInt(match[2], 10);
  const day = parseInt(match[3], 10);

  if (month < 1 || month > 12) return false;
  if (day < 1 || day > 31) return false;

  // Validación astronómica exacta (bisiestos y días por mes)
  const dateObj = new Date(year, month - 1, day);
  return (
    dateObj.getFullYear() === year &&
    dateObj.getMonth() === month - 1 &&
    dateObj.getDate() === day
  );
}

module.exports = {
  isValidEmail,
  isValidPassword,
  PASSWORD_REQUIREMENTS_MESSAGE,
  validateRegistration,
  isValidCalendarDate
};
