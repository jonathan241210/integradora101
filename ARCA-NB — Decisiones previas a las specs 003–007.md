# ARCA-NB — Decisiones previas a las specs 003–007

Registro de las decisiones tomadas antes de las specs móviles 003 a 007. Las versiones formales y completas, con alternativas y consecuencias, están en [ADR 0011](docs/adr/0011-visitor-identity-and-mobile-session.md) (identidad del visitante) y [ADR 0012](docs/adr/0012-android-distribution-channel.md) (distribución Android).

## Decisiones de alcance

- **Solo Android.** Se optó por no publicar versión para iPhone en esta versión porque el público objetivo y el presupuesto de pruebas se concentran en Android (ADR 0004).
- **Fotos del catálogo.** Se optó por que la app use las mismas fotos que el zoológico publica en el catálogo, para mantener una sola fuente de imágenes.
- **Sin tabla de líderes ni premios.** Se optó por mostrar solo puntos y logros desbloqueables, porque no hay premios que justifiquen una validación antifraude ni exponer datos de un visitante a otros.
- **Misiones como contenido estático.** Se optó por definirlas una vez sin actualizaciones posteriores, para no requerir administración de contenido en esta versión.

## Decisión 1: identidad del visitante

- **Cuenta obligatoria (opción B).** Se optó por cuenta con inicio de sesión porque conserva el progreso al cambiar de teléfono y deja los puntos validados en el servidor. Se descartaron la opción sin cuenta (el progreso se pierde) y el ID anónimo (no ofrece inicio de sesión).
- **Correo y contraseña.** Se optó por este método, sin Google, porque no depende de la firma del build ni de que el visitante tenga cuenta de Google; implica verificación de correo, recuperación por código y límite de intentos, implementados en `api-004`.
- **Avatar elegible.** Se optó por un avatar elegido de un catálogo de ilustraciones incluidas en la app (`avatar_code`), porque permite personalizar el perfil sin subir fotos de personas.

## Decisión 2: canal de distribución Android

- **Play Store en pruebas con APK de respaldo.** Se optó por Play Store como canal principal por la confianza y las actualizaciones automáticas, y por el APK de descarga directa (perfil `preview` de EAS) como respaldo. El perfil `production` de `apps/mobile/eas.json` genera el build firmado (`mobile-008`, `mobile-018`).

## Seguridad de la cuenta

Implementado en `api-004` y `mobile-004`:

- Todo el tráfico va por HTTPS en producción; el build de producción no acepta tráfico sin cifrar (`mobile-018`).
- La sesión se guarda en `expo-secure-store`; los tokens de acceso duran 15 minutos y el refresh es rotatorio y revocable.
- Las contraseñas se guardan solo como hash; los códigos de verificación y recuperación son de un solo uso, caducan y tienen límite de intentos.
- La app no lleva secretos con privilegios; puntos y descubrimientos se registran en el servidor con límite de frecuencia.
- El visitante puede cerrar sesión y borrar su cuenta; el aviso de privacidad explica qué se guarda.

## Orden de las specs móviles

Se siguió el orden: integración de lectura con la API (003), cuenta (004), progreso (005), escaneo QR (006), mapa y ubicación (007) y build y distribución (008). Recorrido 3D real e iOS quedaron fuera del primer lanzamiento; el recorrido con realidad aumentada se incorporó después en `mobile-009`, `mobile-015` y `mobile-016`.
