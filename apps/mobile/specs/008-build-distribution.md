# 008 · build-distribution

- App dueña: `mobile`
- Apps/paquetes afectados: `mobile`
- Estado: Implementada (alcance parcial: `eas.json` con perfiles `development` y `preview`; el perfil `production` lo completa [`mobile-018`](018-production-build-hardening.md))
- Solicitada: 2026-10-13
- Aprobada: 2026-11-23
- Aprobación funcional: Aprobada
- Equivalencia en el documento de decisiones previas: 007

## Problema y contexto

Para que los visitantes instalen la app hace falta un build firmado y un canal de distribución: Expo Go solo sirve para desarrollo. ADR 0012 propone Play Store en pruebas como canal principal con APK de descarga directa de respaldo. Esta spec cubre el build, los metadatos, la privacidad, la accesibilidad, las pruebas en dispositivos y la estrategia de actualización.

## Objetivos

- Build Android firmado según el canal de ADR 0012 (Play Store en pruebas + APK de respaldo).
- Clave de firma fija y respaldada desde el primer build público.
- Íconos, metadatos y ficha; política/aviso de privacidad publicado.
- Estrategia de actualización decidida antes del primer build público.
- Incluir en la primera entrega para visitantes la versión del mapa definida para el lanzamiento en [`mobile-007`](007-map-location.md).
- Los botones sin destino definido (notificaciones, pantalla de juego) se ocultan o se les asigna destino antes de publicar; el botón de configuración de cuenta lleva a la edición de perfil (`mobile-004`). El corazón de favoritos ya tiene destino en la ficha y en el inicio (`mobile-002` CA-16). El favorito de cuenta y el filtro de Colección siguen fuera.

## Fuera de alcance

- iOS y su distribución.
- Publicación completa en producción de Play Store (solo pruebas cerradas/abiertas al inicio).
- Recorrido 3D.

## Criterios de aceptación (preliminares)

- **CA-01:** Dado el primer build público, cuando se genera, entonces queda firmado con una clave fija cuyo respaldo queda registrado, y la estrategia de actualización (reinstalar o actualizar sin reinstalar) está decidida y documentada.
- **CA-02:** Dado el canal elegido, cuando se prepare la distribución, entonces la ficha incluye íconos, metadatos y el enlace a la política/aviso de privacidad.
- **CA-03:** Dada la app empaquetada, cuando se revisen sus pantallas, entonces ningún botón queda sin destino: notificaciones y juego se ocultan o conectan; configuración abre la edición de perfil.
- **CA-04:** Dado el build, cuando se pruebe en varios dispositivos Android, entonces se verifican accesibilidad, textos en español y ausencia de regresiones frente a las specs implementadas.
- **CA-05:** Dado el proceso, cuando se documente, entonces queda registrado quién firma y genera el build (pendiente de definir) y los requisitos vigentes de Play Console verificados.
- **CA-06:** Dada la build Android candidata a la primera entrega para visitantes, cuando se revise en un dispositivo Android, entonces se puede abrir el mapa y se registra evidencia de que cumple los criterios de aceptación de `mobile-007` aplicables al lanzamiento. Esa validación es requisito para autorizar la entrega inicial.

## Dependencias, riesgos y decisiones

- **Dependencias/ADR:** ADR 0012 (canal), ADR 0004 (Expo/Android), specs de las funciones incluidas y `mobile-007` (mapa para la primera entrega). La preparación de firma, canal y proceso de build puede avanzar en paralelo con el mapa.
- **Riesgos:** los requisitos de Play Console para cuentas nuevas han cambiado y deben verificarse antes de comprometer fechas; perder la clave de firma rompe las actualizaciones.
- **Decisiones:**
  - Se optó por dejar `eas.json` con los perfiles `development` y `preview` como alcance implementado, porque es lo que existe en el repositorio; el perfil `production` (HTTPS obligatorio y `EXPO_PUBLIC_API_URL`) lo completa [`mobile-018`](018-production-build-hardening.md).
  - Responsable de la firma y del build: Fuera de alcance de esta entrega. No hay evidencia en el repositorio de quién firma; se define antes del primer build público.
  - Cuenta de desarrollador de Play Console y validación del dominio del aviso de privacidad: Fuera de alcance de esta entrega. Dependen de trámites externos al repositorio.

## Revisión

- Aprobación: Aprobada
- Evidencia/enlaces: `docs/adr/0012-android-distribution-channel.md`, `docs/adr/0004-mobile-react-native.md`, `apps/mobile/eas.json`.
