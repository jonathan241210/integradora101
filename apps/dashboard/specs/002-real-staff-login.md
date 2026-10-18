# 002 · real-staff-login

- App dueña: `dashboard`
- Apps/paquetes afectados: `dashboard`, `packages/api-client`
- Estado: Aprobada · En progreso (implementación iniciada 2026-10-17)
- Solicitante / responsable funcional: Jonathan
- Aprobación funcional: Jonathan, 2026-10-15

## Problema y contexto

El prototipo del dashboard (`dashboard-001`) usa un selector de perfil y credenciales ficticias en memoria. Con la autenticación real del personal definida en `api-003`, el dashboard debe reemplazar ese acceso simulado por un único formulario de correo institucional + contraseña que consuma la API, resuelva el reto/enrolamiento de 2FA de los administradores (`admin` y `zoo-admin`) y presente las secciones según el `home` y los permisos devueltos por `GET /api/v1/auth/me`. El `veterinarian` que entra por error al dashboard se redirige a la PWA; la PWA tendrá su propia pantalla de login en una spec futura de `apps/pwa`.

El prototipo sigue siendo una demostración en sus demás secciones: venta, historial, reportes, recintos y usuarios conservan datos ficticios hasta que sus propias specs los conecten con la API.

## Objetivos

- Un solo formulario de inicio de sesión (correo + contraseña) contra la API; sin selector de perfil ni credenciales ficticias.
- Manejo accesible de errores de autenticación (422 genérico, 429 con espera, 401 «Tu sesión expiró»).
- Flujo de reto 2FA y de enrolamiento 2FA para `admin` y `zoo-admin` (QR SVG de la API, confirmación y códigos de recuperación mostrados una vez).
- Navegación por `home` y permisos: `administration`, `executive` (solo lectura), `ticket`; `pwa` redirige fuera del dashboard.
- Todas las llamadas a la API mediante `@arca/api-client` desde hooks (MVVM), sin `fetch` en componentes.

## Fuera de alcance

- Gestión de usuarios desde el dashboard (la vista «Usuarios de taquilla» queda demostrativa).
- Registro, recuperación de contraseña ni cambio de contraseña en la interfaz.
- Conectar a la API las secciones de venta, historial, reportes, noticias, eventos ni recintos (siguen con datos ficticios hasta sus specs).
- La pantalla de login propia de la PWA veterinaria (spec futura de `apps/pwa`).
- React Router ni nuevas dependencias (ADR 0002).
- Cambios en `apps/web`, `apps/pwa` ni `apps/mobile`.

## Actores y permisos

| Actor/rol | Necesidad | Permisos requeridos |
|---|---|---|
| `admin` (Administrador general, Presidencia) | Entrar al panel de administración y enrolar 2FA | Cuenta activa; la API decide acceso por permisos |
| `zoo-admin` (Administrador del zoológico) | Entrar al panel de administración con las secciones de sus permisos y enrolar 2FA | Cuenta activa; la API decide acceso por permisos |
| `executive` | Ver Dashboard y Reporte en solo lectura | Cuenta activa; `dashboard.view`, `reports.view` |
| `cashier` | Ver Venta e Historial de taquilla | Cuenta activa; `tickets.*`, `cash-closings.*` |
| `veterinarian` | Ser redirigido a la PWA | Cuenta activa; `home: pwa` con `pwa_url` |

## Historias de usuario

- Como integrante del personal, quiero escribir solo mi correo y contraseña para entrar directamente a las secciones que me corresponden.
- Como `admin` o `zoo-admin`, quiero activar mi segundo factor la primera vez y usarlo después para proteger mi acceso.
- Como persona con la sesión vencida, quiero ver «Tu sesión expiró» y volver al login para entender por qué me pidieron entrar de nuevo.
- Como `veterinarian`, quiero ser llevado a la PWA para no ver un dashboard que no es para mí.

## Criterios de aceptación

- **CA-01:** Dado el acceso al dashboard sin sesión, cuando se muestre la pantalla de entrada, entonces hay un único formulario con correo institucional y contraseña; no existe selector de perfil ni se muestran credenciales ficticias.
- **CA-02:** Dado el campo de contraseña, cuando la persona active el control de mostrar/ocultar, entonces alterna la visibilidad del texto con un control accesible (botón con etiqueta y estado anunciado a tecnologías de asistencia).
- **CA-03:** Dada una respuesta de error de la API, cuando el login falle, entonces el mensaje se muestra en un contenedor con `role="alert"` en español: el 422 muestra «Correo o contraseña incorrectos.» y el 429 muestra el mensaje de espera devuelto por la API con sus segundos.
- **CA-04:** Dada una respuesta `two_factor: true` del login, cuando se presente el reto, entonces el formulario acepta un código TOTP o un código de recuperación, muestra sus errores de forma accesible y, al completarlo, inicia la sesión.
- **CA-05:** Dado un `admin` o `zoo-admin` que recibe `two_factor_setup_required`, cuando entre a la vista de enrolamiento, entonces muestra el QR SVG devuelto por la API, permite confirmar con un código TOTP válido y presenta los códigos de recuperación una sola vez con aviso para guardarlos.
- **CA-06:** Dada una sesión autenticada, cuando `me` devuelve `home` y permisos, entonces el dashboard muestra las secciones correspondientes: `administration` → Dashboard, Noticias, Eventos, Reporte, Recintos y Usuarios, cada sección según el permiso correspondiente (Usuarios aparece con `users.manage` o `operational-staff.manage`), de modo que sirve igual para `admin` y `zoo-admin`; `executive` → Dashboard y Reporte en solo lectura; `ticket` → Venta e Historial.
- **CA-07:** Dado `home: pwa`, cuando la sesión de `veterinarian` queda autenticada, entonces el dashboard muestra una pantalla con el mensaje correspondiente y redirige a `pwa_url`.
- **CA-08:** Dada cualquier llamada a la API que responda 401, cuando el estado de sesión lo detecte, entonces el dashboard vuelve al login mostrando «Tu sesión expiró».
- **CA-09:** Dada una sesión activa, cuando la persona elija cerrar sesión, entonces se llama a `logout` de la API y el dashboard regresa al login sin dejar visibles las secciones protegidas.
- **CA-10:** Dadas las cuentas en memoria de «Usuarios de taquilla», cuando se intente iniciar sesión con ellas, entonces ya no pueden autenticarse; la vista permanece como demostrativa hasta la feature de gestión de usuarios.
- **CA-11:** Dado el código del dashboard, cuando se revise, entonces toda llamada a la API pasa por `@arca/api-client` desde hooks que actúan como ViewModels (MVVM); ningún componente usa `fetch`/`axios` directamente.
- **CA-12:** Dadas las vistas del login y la navegación, cuando se usen con teclado y a anchos de 360 a 1366 px, entonces conservan foco visible, controles operables, estados de carga y error, y no hay desbordamiento horizontal.
- **CA-13:** Dada la interfaz, cuando se revise su estilo, entonces usa tokens semánticos de `@arca/tokens` y no fija hex de marca en las vistas.
- **CA-14:** Dada la suite del dashboard, cuando se ejecuten los tests de Vitest con un cliente simulado de `@arca/api-client`, entonces existe al menos una prueba nombrada por cada CA-xx de esta spec.

## Reglas de negocio

- **RN-01:** El mapeo permiso → sección es solo presentación; la autorización real la aplican los middlewares y permisos de la API. Ocultar una sección nunca equivale a protegerla.
- **RN-02:** Las demás pantallas (venta, historial, reporte, noticias, eventos, recintos, usuarios) siguen con datos ficticios hasta que sus specs las conecten con la API.
- **RN-03:** Sin React Router: la navegación entre vistas se resuelve con estado de la SPA conforme a ADR 0002.
- **RN-04:** Se retiran las credenciales ficticias del prototipo (`administrador@demo.local`, `taquilla@demo.local` y las cuentas en memoria); ninguna cuenta de demostración puede iniciar sesión real.
- **RN-05:** Mensajes y textos visibles en español; identificadores del código en inglés (Constitución VI).
- **RN-06:** El estado de sesión lo gestiona un hook ViewModel (por ejemplo `useAuthSession`) con estados `checking | anonymous | two-factor-challenge | two-factor-setup | authenticated | redirecting-pwa`.
- **RN-07:** El `veterinarian` no ve las secciones del dashboard: tras autenticarse se muestra el mensaje y se redirige a `pwa_url`.

## Datos, privacidad y auditoría

El dashboard no almacena credenciales ni datos personales: solo transporta correo, contraseña y códigos 2FA hacia la API por la cookie de sesión con CSRF. Los códigos de recuperación se muestran una sola vez y no se guardan en el cliente. La bitácora de accesos la escribe la API (`api-003` CA-13).

## Flujos y errores

1. Sin sesión → formulario de login. Con sesión → `me` y navegación por `home`/permisos.
2. `two_factor: true` → reto 2FA. `two_factor_setup_required` → enrolamiento (QR, confirmación, códigos de recuperación).
3. `home: pwa` → mensaje y redirección a `pwa_url`.
4. Errores: 422 genérico y 429 con espera se muestran con `role="alert"`; cualquier 401 → login con «Tu sesión expiró»; logout vuelve al login.

## Dependencias, riesgos y preguntas

- **Dependencias/ADR:** `api-003` (endpoints de autenticación y `me`; DBR-001 y DBR-002 ya están en `Lista para backend`), ADR 0002 (stack SPA sin React Router), `@arca/api-client` con `credentials: include`, XSRF y módulo `auth` reutilizable por la PWA.
- **Riesgos:** la integración real depende de `api-003` implementada; mientras tanto el desarrollo puede avanzar con el cliente simulado en tests. La cookie Sanctum requiere dominio raíz compartido con la API y la PWA en producción y proxy de Vite en desarrollo; el dashboard usa el puerto fijo 5174 porque la PWA usa el 5173.
- **Preguntas pendientes:** ninguna; el copy exacto de la pantalla de redirección a la PWA puede afinarse en el plan.

## Revisión

- Aprobadores y fecha: Jonathan (responsable funcional), 2026-10-15.
- Evidencia/enlaces: `apps/api/specs/003-staff-authentication.md`, `apps/dashboard/specs/001-admin-dashboard-prototype.md` (criterios reemplazados marcados), `docs/03-roles-y-permisos.md`.
