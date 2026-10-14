# 004 · visitor-account

- App dueña: `mobile`
- Apps/paquetes afectados: `mobile`, `packages/api-client`
- Estado: Borrador
- Solicitante / responsable funcional: Aksel
- Aprobación funcional: pendiente de aprobación
- Equivalencia en el documento de decisiones previas: 004a

## Problema y contexto

La app muestra hoy un prototipo con datos simulados (spec `mobile-002`). Con la autenticación de visitantes definida en `api-004` (ADR 0011), la app necesita las pantallas y el flujo completos de cuenta: registro de adulto, verificación por código, inicio de sesión, recuperación de contraseña, edición de perfil, cambio de contraseña, borrado de cuenta y cierre de sesión, guardando los tokens en el almacenamiento seguro del teléfono.

## Objetivos

- Flujo completo de cuenta del visitante (adulto 18+) en español, accesible y conforme a MVVM.
- Tokens en `expo-secure-store`; refresh automático ante 401 con una sola petición en vuelo (single-flight); si el refresh falla, vuelve al login.
- Todas las llamadas a la API por `@arca/api-client` en modo Bearer con refresh; ningún `fetch` en componentes ni ViewModels.
- Solo HTTPS en producción (`usesCleartextTraffic=false`); sin claves ni secretos dentro del paquete.

## Fuera de alcance

- Lógica de servidor, endpoints y validaciones (spec `api-004`).
- Progreso, colección, logros y misiones (spec `mobile-005`).
- Escaneo QR con cámara (spec `mobile-006`) y mapa/ubicación (spec `mobile-007`).
- Login con Google u otros proveedores.
- iOS (solo Android, confirmado 2026-10-12).

## Actores y permisos

| Actor/rol | Necesidad | Permisos requeridos |
|---|---|---|
| Visitante adulto (tutor) | Crear cuenta, entrar, editar perfil, borrar cuenta | Ninguno del dispositivo; correo accesible para códigos |
| Niño/niña | Jugar con la cuenta del tutor | Sin cuenta propia |

## Historias de usuario

- Como visitante adulto, quiero crear mi cuenta, confirmar que soy mayor de edad y aceptar el aviso de privacidad para guardar mi progreso.
- Como visitante, quiero elegir un avatar del catálogo y un apodo para que el perfil del niño no muestre datos personales.
- Como visitante, quiero recuperar mi contraseña con un código enviado a mi correo para no perder mi cuenta.
- Como titular, quiero borrar mi cuenta y mis datos confirmando con mi contraseña.

## Criterios de aceptación

- **CA-01:** Dada la app sin sesión, cuando arranca, entonces muestra una pantalla de bienvenida con opciones de crear cuenta o iniciar sesión.
- **CA-02:** Dada la pantalla de registro, cuando se muestra el formulario, entonces pide correo, nombre, apodo, contraseña y confirmación, incluye la casilla «Soy mayor de 18 años», la aceptación del aviso de privacidad con enlace a su texto (servido por la API) y un selector de avatar con unas 8 ilustraciones del catálogo incluido en la app.
- **CA-03:** Dado un registro enviado, cuando la API responde 201, entonces la app muestra la pantalla de verificación con un campo para el código de 6 dígitos y la opción de reenviarlo (con espera según los límites de la API).
- **CA-04:** Dados errores de la API, cuando el registro, la verificación o el login fallan, entonces los mensajes se muestran en español de forma accesible: 422 muestra «Correo o contraseña incorrectos.» o el mensaje de validación; 403 `email_not_verified` lleva a la pantalla de verificación; 429 muestra la espera indicada.
- **CA-05:** Dado un visitante registrado, cuando inicia sesión con correo y contraseña, entonces la app guarda el par de tokens en `expo-secure-store` (nunca en almacenamiento común) y entra al flujo principal.
- **CA-06:** Dada una respuesta 401 por token vencido, cuando la app renueva la sesión, entonces ejecuta `auth/refresh` con una sola petición en vuelo (las llamadas concurrentes esperan el mismo refresh); si el refresh falla o es revocado, cierra la sesión y vuelve al login.
- **CA-07:** Dado el flujo de recuperación, cuando el visitante pide restablecer la contraseña, entonces la app solicita el correo (respuesta genérica 202), captura el código recibido y la nueva contraseña con confirmación, y vuelve al login al completar.
- **CA-08:** Dada una sesión activa, cuando el visitante abre la edición de perfil (el botón de configuración de cuenta lleva aquí), entonces puede cambiar apodo, nombre y avatar del catálogo, y guarda con `PATCH me`.
- **CA-09:** Dada la pantalla de cambio de contraseña, cuando el visitante envía contraseña actual, nueva y confirmación, entonces la app llama `PUT me/password` y mantiene la sesión actual (la API revoca las demás).
- **CA-10:** Dada la opción de borrar cuenta, cuando el visitante confirma con su contraseña, entonces la app llama `DELETE me`, limpia el almacenamiento seguro y la cola local, y vuelve a la bienvenida.
- **CA-11:** Dada una sesión activa, cuando el visitante cierra sesión, entonces la app llama `auth/logout`, borra los tokens del dispositivo y regresa a la bienvenida.
- **CA-12:** Dado el código de la app, cuando se revise, entonces se cumple MVVM: pantallas → ViewModels → `AuthRepository` → `@arca/api-client` (modo Bearer); ningún componente usa `fetch`/`axios` ni guarda tokens fuera del almacenamiento seguro.
- **CA-13:** Dado el build de Android, cuando se revise su configuración, entonces `usesCleartextTraffic=false` y toda comunicación sale por HTTPS fuera de desarrollo.
- **CA-14:** Dada la suite de Jest, cuando se ejecute, entonces hay pruebas que nombran cada CA-xx: renderizado de pantallas, estados del ViewModel de sesión y comportamiento del refresh ante 401 (con cliente simulado).

## Reglas de negocio

- **RN-01:** Solo adultos (18+) crean cuenta: la casilla de mayoría de edad y la aceptación del aviso son obligatorias para registrarse; la versión del aviso aceptada se envía a la API.
- **RN-02:** El avatar se elige solo del catálogo de ilustraciones incluido en la app (códigos propuestos: `jaguar`, `lion`, `elephant`, `macaw`, `monkey`, `turtle`, `deer`, `wolf`); no se admiten fotos.
- **RN-03:** El perfil visible del menor (cuenta del tutor) muestra solo apodo y avatar.
- **RN-04:** Los tokens viven solo en `expo-secure-store`; la cola de escaneos y el caché no sensible usan `@react-native-async-storage/async-storage` (spec `mobile-005`). Ambas dependencias requieren la aprobación de ADR 0011.
- **RN-05:** La app no lleva claves ni secretos con privilegios: todo lo que va dentro del paquete puede extraerse.
- **RN-06:** Mensajes y textos en español; identificadores en inglés (Constitución VI).
- **RN-07:** El borrado de cuenta es definitivo e inmediato; la app lo comunica claramente antes de pedir la contraseña.
- **RN-08:** La implementación espera a que `api-004` tenga sus DBR en `Lista para backend`; hasta entonces se trabaja con repositorio simulado.

## Datos, privacidad y auditoría

La app transporta correo, contraseña y códigos hacia la API por HTTPS; guarda solo los tokens en el almacenamiento seguro y no registra secretos en logs ni pantallas. El aviso de privacidad se muestra desde el contenido que sirve la API (`legal/privacy-notice`).

## Flujos y errores

1. Bienvenida → Registro → Verificación por código → sesión → flujo principal.
2. Login → sesión; `email_not_verified` → pantalla de verificación.
3. 401 → refresh single-flight → reintento; refresh fallido → login.
4. Perfil: editar datos/avatar, cambiar contraseña, cerrar sesión, borrar cuenta.

## Dependencias, riesgos y preguntas

- **Dependencias/ADR:** `api-004` (endpoints), ADR 0011 (modelo de sesión y dependencias nuevas `expo-secure-store`, `@react-native-async-storage/async-storage`), ADR 0004 (Expo/Android), `api-003` si define la base de `packages/api-client` (se amplía con modo Bearer con refresh).
- **Riesgos:** el refresh single-flight requiere pruebas de concurrencia; la fricción del registro adulto puede reducir altas (registro corto como mitigación).
- **Preguntas pendientes:**
  - Ilustraciones finales del catálogo de avatares (8 códigos propuestos).
  - Texto del aviso de privacidad y términos (lo provee el zoológico).

## Revisión

- Aprobadores y fecha: pendiente de aprobación.
- Evidencia/enlaces: `docs/adr/0011-visitor-identity-and-mobile-session.md`, `apps/api/specs/004-visitor-authentication.md`, `apps/mobile/specs/002-mobile-ui-base-visitor-journey.md`.
