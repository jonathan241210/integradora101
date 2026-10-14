# 0011 · Identidad del visitante y sesión móvil

- Estado: Propuesto
- Fecha: 2026-10-13
- Autor / solicitante: Aksel
- Spec relacionada: `apps/api/specs/004-visitor-authentication.md`, `apps/mobile/specs/004-visitor-account.md`

## Contexto

La app móvil (`apps/mobile`) muestra hoy un prototipo visual con datos simulados (spec `mobile-002`). Para que el público use la app con progreso real hay que decidir cómo se identifica al visitante y cómo se mantiene su sesión en el teléfono. El equipo confirmó el 12 de octubre de 2026 que habrá cuenta con inicio de sesión y que el progreso se guarda en el servidor bajo la cuenta; el 13 de octubre se confirmó el método de acceso y el modelo de sesión.

Con cuenta, el visitante entrega datos personales (al menos correo y nombre), así que hacen falta aviso de privacidad, recuperación de acceso y almacenamiento seguro de la sesión en el teléfono. Sin premios ni tabla de líderes, no se muestra nada a otros visitantes y el riesgo se limita a proteger esos datos.

Este ADR retoma el documento de decisiones previas de Aksel (2026-10-09) y las decisiones confirmadas del 2026-10-13.

## Decisión

1. **Cuenta obligatoria (opción B).** El visitante se registra antes de usar las funciones de progreso. El progreso vive en el servidor bajo la cuenta y sobrevive al cambiar de teléfono. Como los puntos no dan premios, no hace falta una validación antifraude sofisticada.
2. **Método de acceso: correo + contraseña**, sin Google. La comparación queda registrada en alternativas; Google queda descartado por ahora y puede reevaluarse si el zoológico lo pide.
3. **Solo adultos (18+)** crean la cuenta y aceptan el aviso de privacidad y los términos. El niño juega con la cuenta del tutor; el perfil visible muestra solo apodo (`nickname`) y avatar elegible de un catálogo de ilustraciones incluidas en la app (sin fotos).
4. **Sesión móvil:** token de acceso Sanctum con ability `visitor` y vigencia de 15 minutos, más refresh token opaco rotatorio de 30 días con detección de reuso (lógica propia sobre Sanctum). El refresh se guarda en el servidor solo como hash SHA-256; al reusarse un refresh revocado se revoca toda la familia de tokens.
5. **Dependencias móviles nuevas a aprobar:** `expo-secure-store` (tokens en el almacenamiento seguro del teléfono) y `@react-native-async-storage/async-storage` (cola de escaneos sin conexión y caché no sensible).
6. **Sin dependencias nuevas en backend:** Sanctum ya está aprobado en ADR 0001; el correo sale por SMTP nativo de Laravel (servicio transaccional tipo Brevo/Mailgun configurado en `.env`, sin SDK; `MAIL_MAILER=log` en desarrollo).
7. **Borrado de cuenta:** borrado físico inmediato, confirmado con contraseña (derecho de supresión del titular; no son datos clínicos ni financieros).

## Alternativas consideradas

Identidad del visitante (tabla del documento de decisiones previas):

|  | A. Sin cuenta, solo en el dispositivo | B. Cuenta obligatoria | C. Anónimo con ID de la API, cuenta opcional después |
|---|---|---|---|
| Cómo funciona | El progreso vive en el teléfono; la API no sabe quién es el visitante | Registro con correo u otro método antes de usar la app | La API emite un ID anónimo al primer uso; el progreso se guarda en el servidor bajo ese ID |
| Esfuerzo | Bajo | Alto (registro, recuperación de acceso, seguridad) | Medio |
| Fricción para el visitante | Ninguna | Alta: muchos no se registran en una visita corta | Ninguna al inicio |
| Progreso al cambiar o perder el teléfono | Se pierde | Se conserva | Se pierde, salvo que luego se vincule una cuenta |
| Puntos validados en servidor (importa solo si hay premios) | No: el cliente podría manipularlos | Sí | Sí |
| Datos personales | Ninguno | Correo, nombre | Ninguno, o solo un nombre opcional para el perfil |
| Privacidad | Riesgo mínimo | Requiere aviso y manejo de datos personales | Riesgo bajo; no se muestra nada a otros visitantes |

- **Opción A (sin cuenta):** descartada; deja el progreso fuera de la API, se pierde al cambiar de teléfono y no ofrece inicio de sesión.
- **Opción C (anónimo con ID de la API):** descartada; el progreso se pierde salvo vinculación posterior y tampoco ofrece inicio de sesión real.

Método de acceso — comparación registrada:

|  | Google | Correo y contraseña |
|---|---|---|
| Contraseñas que el equipo debe guardar | Ninguna | Sí, con las medidas de seguridad de las specs |
| Esfuerzo de seguridad propio | Menor | Mayor: recuperación de acceso, verificación del correo y límite de intentos |
| Dependencias externas | Google (proyecto con credenciales OAuth) | Un servicio para enviar correos |
| Efecto en el build | Hay que registrar la huella del certificado de firma de la app, que se define al final; puede exigir un build de desarrollo en lugar de Expo Go | Ninguno |
| Visitantes que no pueden usarlo | Quien no tenga cuenta de Google | Casi ninguno |

## Consecuencias

### Positivas

- Progreso conservado al cambiar de teléfono y puntos validados en el servidor.
- Sin dependencia de Google ni de la configuración de su firma en el build.
- Modelo de privacidad claro: cuenta solo de adultos; el perfil del menor se limita a apodo y avatar.
- El acceso del visitante queda aislado del personal: tokens con ability `visitor`, sin roles de Spatie.

### Riesgos o costos

- Mayor esfuerzo de seguridad propio: verificación de correo, recuperación de contraseña y límites de intentos.
- La cuenta solo para adultos reduce las altas espontáneas de familias; se mitiga con un registro corto.
- El refresh rotatorio es lógica propia sobre Sanctum: necesita pruebas de reuso y de concurrencia (dos refresh simultáneos).
- Dos dependencias móviles nuevas por aprobar antes de implementar.
- Requiere servicio SMTP en producción y HTTPS obligatorio fuera de `local`.

## Validación y revisión

Se aprueba junto con las specs `api-004` y `mobile-004` y las solicitudes DBR-003/DBR-004. La implementación debe incluir pruebas de rotación, detección de reuso y concurrencia de refresh tokens, y de la cola de escaneos sin conexión.
