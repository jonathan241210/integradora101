# 004 · visitor-account

- App dueña: `mobile`
- Apps/paquetes afectados: `mobile`, `packages/api-client`
- Estado: Implementada (2026-10-21; aprobación funcional 2026-10-20)
- Solicitante / responsable funcional: Aksel
- Aprobación funcional: Aksel, 2026-10-20
- Equivalencia en el documento de decisiones previas: 004a

## Problema y contexto

La spec `mobile-002` dejó el prototipo visual de acceso: login, registro, recuperación de contraseña y ajustes, con datos solo en memoria. Esta spec integra sobre esas pantallas la cuenta real del visitante definida en `api-004` (ADR 0011): registro de adulto, verificación por código, inicio de sesión, recuperación de contraseña, edición de perfil, cambio de contraseña, borrado de cuenta y cierre de sesión, guardando los tokens en el almacenamiento seguro del teléfono.

La web, el dashboard y el login de personal no son fuente de código. El visitante usa Bearer y `/api/v1/visitor/*`, aislado de la sesión por cookie del personal.

## Objetivos

- Flujo completo de cuenta del visitante (adulto 18+) en español, accesible y conforme a MVVM.
- Tokens en `expo-secure-store`; refresh automático ante 401 con una sola petición en vuelo (single-flight); si el refresh falla, vuelve al login.
- Todas las llamadas a la API por `@arca/api-client` en modo Bearer con refresh; ningún `fetch` en componentes ni ViewModels.
- Solo HTTPS en producción (`usesCleartextTraffic=false`); sin claves ni secretos dentro del paquete.

## Fuera de alcance

- Implementar en esta app la lógica de servidor. Los endpoints viven en `api-004`; este equipo puede añadirlos ahí, sin convertir esta spec en spec de API.
- Cambios en `apps/web`, `apps/dashboard`, el login de personal (`api-003`) y el módulo de personal de `@arca/api-client` (`auth.ts`). Si hace falta cliente HTTP, es un modo visitante nuevo, no una edición de ese módulo.
- «Entrar como invitado» del prototipo 002. La cuenta es obligatoria (ADR 0011). Se retira al integrar esta spec, no antes de spec, plan y tasks aprobados.
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

- **CA-01:** Dada la app sin sesión, cuando arranca, entonces muestra la pantalla de inicio de sesión (marca, formulario y enlace «Regístrate»). La ruta `/welcome` no forma parte del flujo: redirige a inicio de sesión si alguien la abre. Un segundo toque en «Regístrate» o en el envío del formulario no apila otra copia de la misma pantalla. Enmienda de Aksel, 2026-10-23.
- **CA-02:** Dada la pantalla de registro, cuando se muestra el formulario, entonces pide correo, nombre, apodo, contraseña y confirmación, incluye la casilla «Soy mayor de 18 años», la aceptación del aviso de privacidad con enlace a su texto (servido por la API) y un selector de avatar con unas 8 ilustraciones del catálogo incluido en la app.
- **CA-03:** Dado un registro enviado, cuando la API responde 201, entonces la app muestra la pantalla de verificación con un campo para el código de 6 dígitos y la opción de reenviarlo (con espera según los límites de la API).
- **CA-04:** Dados errores de la API, cuando el registro, la verificación o el login fallan, entonces los mensajes se muestran en español de forma accesible: 422 muestra «Correo o contraseña incorrectos.» o el mensaje de validación; 403 `email_not_verified` lleva a la pantalla de verificación; 429 muestra la espera indicada.
- **CA-05:** Dado un visitante registrado, cuando inicia sesión con correo y contraseña, entonces la app guarda el par de tokens en `expo-secure-store` (nunca en almacenamiento común) y entra al flujo principal una sola vez. Mientras la petición sigue en curso, un indicador tapa la pantalla y un segundo toque no lanza otra petición ni otra navegación. Lo mismo vale para registro, verificación, reenvío, olvido y restablecimiento. Enmienda de Aksel, 2026-10-23.
- **CA-06:** Dada una respuesta 401 por token vencido, cuando la app renueva la sesión, entonces ejecuta `auth/refresh` con una sola petición en vuelo (las llamadas concurrentes esperan el mismo refresh); si el refresh falla o es revocado, cierra la sesión y vuelve al login.
- **CA-07:** Dado el flujo de recuperación, cuando el visitante pide restablecer la contraseña, entonces la app solicita el correo (respuesta genérica 202), captura el código recibido y la nueva contraseña con confirmación, y vuelve al login al completar.
- **CA-08:** Dada una sesión activa, cuando el visitante abre la edición de perfil (el botón de configuración de cuenta lleva aquí), entonces puede cambiar apodo, nombre y avatar del catálogo, y guarda con `PATCH me` solo si hubo cambios respecto al perfil cargado; si no hubo cambios, muestra «No has hecho cambios.» sin llamar a la API ni encender el indicador de guardado. Un envío con cambios solo corre una vez. Mientras espera, un indicador tapa la pantalla y el botón queda desactivado. La validación local no enciende el indicador. Al salir de la pantalla y volver, no persisten avisos de éxito ni error. Perfil, ajustes y edición comparten la copia en memoria de la sesión: si ya existe, no repiten `GET /me`. Un `PATCH` exitoso actualiza esa copia con el perfil devuelto y la interfaz lo muestra sin otra lectura. Ajustes no muestra la ficha de demostración mientras llega el perfil real. Enmienda de Aksel, 2026-10-23.
- **CA-09:** Dada la pantalla de cambio de contraseña, cuando el visitante envía contraseña actual, nueva y confirmación, entonces la app llama `PUT me/password` y mantiene la sesión actual (la API revoca las demás). Un envío solo corre una vez. Mientras espera, un indicador tapa la pantalla y el botón queda desactivado. La validación local no enciende el indicador. Al salir de la pantalla y volver, no persisten avisos ni las contraseñas escritas. Enmienda de Aksel, 2026-10-23.
- **CA-10:** Dada la opción de borrar cuenta, cuando el visitante confirma con su contraseña, entonces la app llama `DELETE me`, limpia el almacenamiento seguro y la cola local, y regresa al inicio de sesión una sola vez. Mientras espera, un indicador tapa la pantalla y el botón queda desactivado. La validación local no enciende el indicador. Enmienda de Aksel, 2026-10-23.
- **CA-11:** Dada una sesión activa, cuando el visitante cierra sesión, entonces la app llama `auth/logout` una sola vez, borra los tokens del dispositivo y regresa al inicio de sesión una sola vez. Mientras espera, un indicador tapa la pantalla y el botón queda desactivado. Enmienda de Aksel, 2026-10-23.
- **CA-12:** Dado el código de la app, cuando se revise, entonces se cumple MVVM: pantallas → ViewModels → `AuthRepository` → `@arca/api-client` (modo Bearer); ningún componente usa `fetch`/`axios` ni guarda tokens fuera del almacenamiento seguro.
- **CA-13:** Dado el build de Android, cuando se revise su configuración, entonces `usesCleartextTraffic=false` y toda comunicación sale por HTTPS fuera de desarrollo.
- **CA-14:** Dada la suite de Jest, cuando se ejecute, entonces hay pruebas que nombran cada CA-xx: renderizado de pantallas, estados del ViewModel de sesión y comportamiento del refresh ante 401 (con cliente simulado).

## Reglas de negocio

- **RN-01:** Solo adultos (18+) crean cuenta: la casilla de mayoría de edad y la aceptación del aviso son obligatorias para registrarse; la versión del aviso aceptada se envía a la API.
- **RN-02:** El avatar se elige solo del catálogo incluido en la app. Los códigos aceptados son `jaguar`, `lion`, `elephant`, `macaw`, `monkey`, `turtle`, `deer` y `wolf`. No se admiten fotos. El arte final del zoológico puede sustituir los placeholders sin cambiar los códigos.
- **RN-03:** El perfil visible del menor (cuenta del tutor) muestra solo apodo y avatar.
- **RN-04:** Los tokens viven solo en `expo-secure-store`; la cola de escaneos y el caché no sensible usan `@react-native-async-storage/async-storage` (spec `mobile-005`). ADR 0011 aceptó ambas dependencias el 2026-10-21. `expo-secure-store` se instala con el checklist HTTP de esta spec, cuando ese checklist esté aprobado. AsyncStorage se instala en `mobile-005`.
- **RN-05:** La app no lleva claves ni secretos con privilegios: todo lo que va dentro del paquete puede extraerse.
- **RN-06:** Mensajes y textos en español; identificadores en inglés (Constitución VI).
- **RN-07:** El borrado de cuenta es definitivo e inmediato; la app lo comunica claramente antes de pedir la contraseña.
- **RN-08:** DBR-001 y DBR-003 ya están en `Lista para backend`. El cliente puede avanzar con repositorio simulado en cuanto esta spec, su plan y sus tasks estén aprobados. La fase HTTP espera a que `api-004` esté aprobada y sus endpoints existan. Login y registro no se encolan sin red: se muestra «Sin conexión».

## Datos, privacidad y auditoría

La app transporta correo, contraseña y códigos hacia la API por HTTPS; guarda solo los tokens en el almacenamiento seguro y no registra secretos en logs ni pantallas. El aviso de privacidad se muestra desde `GET /api/v1/visitor/legal/privacy-notice` (`version` y contenido). El texto lo aporta el zoológico; la app envía `privacy_notice_version` al registrarse y no bloquea esta spec por el redactado final.

## Flujos y errores

1. Inicio de sesión → Registro → Verificación por código → sesión → flujo principal.
2. Login → sesión; `email_not_verified` → pantalla de verificación.
3. 401 → refresh single-flight → reintento; refresh fallido → login.
4. Perfil: editar datos/avatar, cambiar contraseña, cerrar sesión, borrar cuenta.
5. Sin red en registro o login: mensaje accesible «Sin conexión»; no se guardan ni se encolan credenciales.
6. El prototipo 002 se conserva hasta integrar esta spec. Al integrar, desaparece «Entrar como invitado».
7. Tras iniciar sesión, verificar el correo o arrancar con tokens, una sola lectura de red de `GET /api/v1/visitor/me` alimenta perfil, ajustes y edición. Guardar el perfil actualiza esa copia con el cuerpo del `PATCH` y las pantallas la muestran sin otro `GET`. Si la sesión ya está autenticada, un nuevo arranque no vuelve a pedir el perfil. Cerrar sesión, borrar la cuenta o perder el refresh vacían la copia. Enmienda de Aksel, 2026-10-23.

## Dependencias, riesgos y preguntas

- **Dependencias/ADR:** `api-004` (endpoints del visitante ya implementados; no se toca el login de personal), ADR 0011 (Aceptado, Aksel, 2026-10-21; `expo-secure-store` se instala con el checklist HTTP, no antes de aprobarlo), ADR 0004 (Expo/Android). `@arca/api-client` recibe un modo Bearer de visitante con refresh, sin editar el módulo de personal.
- **Base visual:** rutas y pantallas de `(auth)` y ajustes de la spec 002. La integración sustituye el repositorio en memoria por `AuthRepository`. Las pantallas que el prototipo no tiene (bienvenida, verificación de correo, edición de cuenta, cambio de contraseña y borrado) se agregan en esta spec.
- **Riesgos:** el refresh single-flight requiere pruebas de concurrencia; la fricción del registro adulto puede reducir altas (registro corto como mitigación).
- **Decisiones cerradas (2026-10-20):** códigos de avatar de RN-02; el texto del aviso lo sirve la API y lo redacta el zoológico; no hay acceso de invitado en la cuenta real; la web no se reutiliza.
- **Preguntas pendientes:** ninguna que bloquee la aprobación funcional.

## Revisión

- Aprobadores y fecha: Aksel, 2026-10-20. Aprobó la spec y el plan técnico de `mobile-004`. La spec de API `api-004` quedó aprobada en el mismo acto. ADR 0011 fue aceptado por Aksel el 2026-10-21. El checklist HTTP (T-31 a T-44) lo aprobó Aksel el 2026-10-21 y quedó implementado el mismo día.
- Cierre: Implementada el 2026-10-21. La suite Jest de `apps/mobile` quedó en 95 pruebas en verde y `npx tsc --noEmit` sin errores. Con sesión, Perfil muestra el apodo y el animal del catálogo; Ajustes muestra el nombre y el correo. Sin sesión se conserva la ficha de demostración. Puntos, nivel, rango y logros siguen en el prototipo de la spec 005. El PR de esta entrega enlaza spec, plan y tasks.
- Evidencia/enlaces: `docs/adr/0011-visitor-identity-and-mobile-session.md`, `apps/api/specs/004-visitor-authentication.md`, `apps/mobile/specs/002-mobile-ui-base-visitor-journey.md`, `docs/database/requests/DBR-003-visitor-accounts.md`.
