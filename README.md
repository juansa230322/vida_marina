# Plataforma ODS 14: Vida Marina (Sprint 2 & Backlog)
**Basada en: Casos de Aceptación Sprint 2 – ODS 14 (Universidad Manuela Beltrán)**

Plataforma web integral, funcional y moderna desarrollada con arquitectura cliente-servidor real, base de datos relacional persistente SQLite (`node:sqlite`), autenticación con contraseñas cifradas en `bcrypt`, tokens JWT y control de acceso basado en roles (RBAC).

---

## 1. Alcance y Separación de Módulos

El proyecto mantiene una separación estricta entre los requisitos del **Sprint 2** y la **historia pendiente del backlog**, tal como fue especificado:

### Módulos del Sprint 2:
1. **RF01 – Registro e Inicio de Sesión por Rol:**
   * **HU-001-1:** Experto / Investigador marino (6 campos: nombre, institución, especialidad biológica, credenciales profesionales, correo y contraseña segura).
   * **HU-001-2:** Voluntario (nombre, correo, contraseña y selector interactivo con catálogo de intereses de conservación).
   * **HU-001-3:** Ciudadano / Colaborador (formulario simplificado: solo nombre, correo, contraseña y ubicación costera).
   * Protección contra selección no autorizada del rol de Administrador en el registro público.
   * Validación estricta de campos obligatorios, correos duplicados, formato inválido y política de contraseñas.
2. **RF02 – Gestión de Perfiles:**
   * **HU-002-1 (Experto):** Edición de biografía científica, agregar y eliminar publicaciones científicas, modificar áreas de investigación, persistencia y restricción estricta de edición a terceros (HTTP 403 "permiso insuficiente").
   * **HU-002-2 (Voluntario):** Historial cronológico de participaciones, cálculo matemático exacto de horas acumuladas, asignación automática de insignias según metas, vista de voluntario sin actividad con mensaje motivacional y recálculo en tiempo real al registrar nuevas actividades.
3. **RF09 – Roles de Usuario y Panel de Administración:**
   * **HU-009-1 (Diferenciación de Roles y Control de Permisos):**
     * **Administrador:** Control total, gestión de usuarios, moderación de foros, aprobación de donaciones y revisión de denuncias.
     * **Experto:** Perfil científico, creación de hilos en el foro y publicaciones. Acceso denegado al panel admin (HTTP 403).
     * **Voluntario:** Postulación a actividades y registro de horas. Acceso denegado a artículos y panel admin (HTTP 403).
     * **Ciudadano:** Consulta de contenidos, reporte de denuncias ambientales y aportes a donaciones. Acceso denegado a funciones ajenas (HTTP 403).
     * Cada usuario posee un único rol activo y todas las rutas/servicios del backend están protegidas.
   * **HU-009-2 (Panel de Administración General):**
     * Listado completo con nombre, correo, rol y estado (`activo` o `suspendido`).
     * Búsqueda en vivo por nombre o correo y filtrado por rol (con mensaje de lista vacía cuando no hay coincidencias).
     * Cambio de rol de usuario con actualización instantánea de permisos.
     * Suspensión de cuentas (bloquea inicio de sesión), reactivación y eliminación definitiva con confirmación.
     * Bloqueo absoluto de acceso a usuarios no administradores y anónimos (HTTP 401/403).

### Historia Pendiente del Backlog (No incluida en Sprint 2):
* **HU-P-01 – Creación de actividades en el calendario (Rol Administrador):**
  * Marcada e identificada en la interfaz con un distintivo visual de Backlog.
  * Creación de actividades con título, descripción, fecha, horario, lugar, cupos y tipo de actividad.
  * Validación de campos obligatorios y rechazo de fechas no válidas o inexistentes en el calendario (ej. `2026-02-31`).
  * Visualización en cuadrícula mensual y listado de convocatorias.
  * Modal interactivo con los detalles completos de la actividad.
  * Restricción exclusiva de creación al Administrador General (HTTP 403 para demás roles).

---

## 2. Usuarios de Prueba Preconfigurados (4 Roles)

El sistema incluye un semillero de datos inicial (`database.sqlite`) con cuentas listas para pruebas:

| Rol | Correo Electrónico | Contraseña | Estado | Descripción y Uso en Casos de Prueba |
| :--- | :--- | :--- | :---: | :--- |
| **Administrador General** | `admin@vidamarina.org` | `Admin123!` | `activo` | Control total del sistema, gestión de usuarios, moderación y creación de actividades en calendario. |
| **Experto / Investigador** | `dr.marina@vidamarina.org` | `Experto123!` | `activo` | Dra. Marina Ríos (INVEMAR), biografía y publicaciones editables. |
| **Experto B (Control)** | `dr.carlos@vidamarina.org` | `Experto123!` | `activo` | Dr. Carlos Ortiz, utilizado para validar la restricción de edición a terceros (`CP-HU-002-1-04`). |
| **Voluntario (Activo)** | `voluntario.activo@vidamarina.org` | `Voluntario123!` | `activo` | 12 horas acumuladas, 2 participaciones e insignias desbloqueadas (`CP-HU-002-2-02/03`). |
| **Voluntario (Sin Actividad)** | `voluntario.nuevo@vidamarina.org` | `Voluntario123!` | `activo` | 0 horas, mensaje invitacional sin errores en pantalla (`CP-HU-002-2-04`). |
| **Voluntario (Meta Inminente)** | `voluntario.meta@vidamarina.org` | `Voluntario123!` | `activo` | 8 horas acumuladas; al registrar 2h alcanza la meta de 10h y desbloquea insignia (`CP-HU-002-2-05`). |
| **Ciudadano / Colaborador** | `ciudadano@vidamarina.org` | `Ciudadano123!` | `activo` | Reportes ambientales y donaciones (`CP-HU-009-1-04`). |
| **Usuario Suspendido** | `suspendido@vidamarina.org` | `Suspendido123!` | `suspendido` | Cuenta bloqueada para validar que el login sea rechazado (`CP-HU-009-2-04`). |

> **Nota:** En la interfaz web también cuentas con una **barra superior de acceso rápido** con botones de 1 solo clic (`[Admin]`, `[Experto]`, `[Voluntario]`, `[Ciudadano]`) para autenticarte al instante.

---

## 3. Requisitos del Sistema e Instalación

### Requisitos:
* **Node.js:** Versión 22 o superior (probado y certificado en Node.js v24.20.0).
* **Navegador Web:** Google Chrome, Microsoft Edge, Mozilla Firefox o Safari (tanto en computadores como en celulares/móviles).

### Pasos de Instalación:

1. Abre una terminal de comandos en la carpeta raíz del proyecto:
   ```bash
   cd C:\Users\juans\.gemini\antigravity\scratch\ods14-vida-marina
   ```

2. Instala las dependencias del proyecto:
   ```bash
   npm install
   ```

3. Inicia el servidor de la aplicación:
   ```bash
   npm start
   ```

4. Abre tu navegador web e ingresa a:
   ```
   http://localhost:3000
   ```

---

## 4. Ejecución de la Suite de Pruebas Automatizadas

Para validar los **21 casos de prueba del documento PDF** de manera 100% automatizada e independiente, ejecuta:

```bash
npm test
```

### Resultados de la Suite Automatizada (`tests/acceptance_tests.js`):
* **Total de Pasos / Casos de Prueba Ejecutados:** 40
* **Casos Aprobados (PASSED):** 40 / 40 (100%)
* **Casos Fallidos (FAILED):** 0

#### Desglose de Resultados por Caso de Prueba del PDF:
* ✅ `CP-HU-001-1-01`: Registro exitoso de experto con 6 campos válidos.
* ✅ `CP-HU-001-1-02`: Validación de campos obligatorios vacíos (experto).
* ✅ `CP-HU-001-1-03`: Validación de correo con formato inválido (`experto@` y `expertocorreo.com`).
* ✅ `CP-HU-001-1-04`: Validación de correo único / duplicado.
* ✅ `CP-HU-001-1-05`: Requisitos de contraseña segura y almacenamiento cifrado con hash `bcrypt`.
* ✅ `CP-HU-001-2-01`: Registro exitoso de voluntario con datos válidos.
* ✅ `CP-HU-001-2-02`: Selector de catálogo de intereses de conservación marina.
* ✅ `CP-HU-001-2-03`: Validación de campos obligatorios e intereses vacíos en voluntario.
* ✅ `CP-HU-001-2-04`: Rechazo de correo inválido o duplicado en voluntario.
* ✅ `CP-HU-001-2-05`: Almacenamiento exacto de los intereses seleccionados en base de datos.
* ✅ `CP-HU-001-3-01`: Registro exitoso de ciudadano con datos válidos.
* ✅ `CP-HU-001-3-02`: Validación de correo ya registrado en ciudadano.
* ✅ `CP-HU-001-3-03`: Validación de campos obligatorios en ciudadano (incluida ubicación).
* ✅ `CP-HU-001-3-04`: Rechazo de correo inválido y contraseña débil en ciudadano.
* ✅ `CP-HU-001-3-05`: Formulario simplificado de ciudadano sin campos de experto ni voluntario.
* ✅ `CP-HU-002-1-01`: Edición de biografía científica e impacto inmediato en perfil público.
* ✅ `CP-HU-002-1-02`: Alta y baja de publicaciones científicas en base de datos.
* ✅ `CP-HU-002-1-03`: Modificación y guardado de áreas de investigación.
* ✅ `CP-HU-002-1-04`: Restricción de edición a terceros (HTTP 403 con "permiso insuficiente").
* ✅ `CP-HU-002-1-05`: Persistencia de los cambios del perfil tras reiniciar sesión.
* ✅ `CP-HU-002-2-01`: Visualización de historial de actividades de participación del voluntario.
* ✅ `CP-HU-002-2-02`: Cálculo matemático exacto de horas acumuladas (12 horas).
* ✅ `CP-HU-002-2-03`: Asignación de insignias según metas cumplidas.
* ✅ `CP-HU-002-2-04`: Perfil de voluntario sin actividad (mensaje invitacional, 0 horas, sin errores).
* ✅ `CP-HU-002-2-05`: Recálculo en tiempo real de horas e insignias al registrar nueva participación.
* ✅ `CP-HU-009-1-01`: Acceso pleno del Administrador General a todas las funciones de administración.
* ✅ `CP-HU-009-1-02`: Permisos de experto (crear hilo en foro) y bloqueo al panel admin (HTTP 403).
* ✅ `CP-HU-009-1-03`: Permisos de voluntario (postulación) y bloqueo a funciones no autorizadas (HTTP 403).
* ✅ `CP-HU-009-1-04`: Permisos de ciudadano (denuncias/donaciones) y denegación a funciones ajenas (HTTP 403).
* ✅ `CP-HU-009-1-05`: Rol único por usuario y protección estricta en rutas y servicios de backend.
* ✅ `CP-HU-009-2-01`: Listado de usuarios mostrando rol y estado (`activo` o `suspendido`).
* ✅ `CP-HU-009-2-02`: Búsqueda por nombre/correo, filtro por rol y mensaje de lista vacía.
* ✅ `CP-HU-009-2-03`: Cambio de rol por administrador y aplicación inmediata de nuevos permisos.
* ✅ `CP-HU-009-2-04`: Suspensión (bloqueo login), reactivación y eliminación de usuario con confirmación.
* ✅ `CP-HU-009-2-05`: Bloqueo de acceso al panel de administración a roles no administradores y anónimos.
* ✅ `CP-HU-P-01-01`: Creación de actividad válida por administrador guardada en base de datos.
* ✅ `CP-HU-P-01-02`: Validación y rechazo por campos obligatorios faltantes en actividad.
* ✅ `CP-HU-P-01-03`: Rechazo de fecha inexistente o inválida (ej. 31 de febrero).
* ✅ `CP-HU-P-01-04`: Consulta y visualización de actividad en calendario con detalle completo.
* ✅ `CP-HU-P-01-05`: Restricción de creación de actividades exclusiva para Administrador (HTTP 403).

---

## 5. Diseño y Adaptabilidad Móvil

La plataforma cuenta con un diseño responsivo concebido para ofrecer la mejor experiencia tanto en pantallas de escritorio como en navegadores móviles (iOS Safari, Android Chrome):
* **Paleta ODS 14:** Azul abisal (`#051329`, `#07192f`), turquesa brillante (`#06b6d4`, `#22d3ee`), verde esmeralda y blanco puro.
* **Barra de Navegación Inferior Móvil:** En dispositivos celulares (< 768px), se despliega una barra inferior fija con accesos táctiles directos a Inicio, Calendario, Foro y Perfil.
* **Componentes Adaptativos:** Tablas con scroll horizontal suave, modales con scroll interno seguro (`max-h-[90vh]`) e inputs de al menos 16px para evitar auto-zoom indeseado en dispositivos iOS.
