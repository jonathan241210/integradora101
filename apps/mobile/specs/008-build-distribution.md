# 008 · build-distribution

- App dueña: `mobile`
- Apps/paquetes afectados: `mobile`
- Estado: Borrador
- Solicitante / responsable funcional: Aksel (redacción provisional hasta acuerdo del equipo)
- Aprobación funcional: pendiente de aprobación
- Equivalencia en el documento de decisiones previas: 007

## Problema y contexto

Para que los visitantes instalen la app hace falta un build firmado y un canal de distribución: Expo Go solo sirve para desarrollo. ADR 0012 propone Play Store en pruebas como canal principal con APK de descarga directa de respaldo. Esta spec cubre el build, los metadatos, la privacidad, la accesibilidad, las pruebas en dispositivos y la estrategia de actualización.

## Objetivos

- Build Android firmado según el canal de ADR 0012 (Play Store en pruebas + APK de respaldo).
- Clave de firma fija y respaldada desde el primer build público.
- Íconos, metadatos y ficha; política/aviso de privacidad publicado.
- Estrategia de actualización decidida antes del primer build público.
- Los botones sin destino definido (notificaciones, pantalla de juego) se ocultan o se les asigna destino antes de publicar; el botón de configuración de cuenta lleva a la edición de perfil (`mobile-004`); favoritos ya está oculto para una spec posterior.

## Fuera de alcance

- iOS y su distribución.
- Publicación completa en producción de Play Store (solo pruebas cerradas/abiertas al inicio).
- Funciones pendientes de otras specs (mapa, 3D).

## Criterios de aceptación (preliminares)

- **CA-01:** Dado el primer build público, cuando se genera, entonces queda firmado con una clave fija cuyo respaldo queda registrado, y la estrategia de actualización (reinstalar o actualizar sin reinstalar) está decidida y documentada.
- **CA-02:** Dado el canal elegido, cuando se prepare la distribución, entonces la ficha incluye íconos, metadatos y el enlace a la política/aviso de privacidad.
- **CA-03:** Dada la app empaquetada, cuando se revisen sus pantallas, entonces ningún botón queda sin destino: notificaciones y juego se ocultan o conectan; configuración abre la edición de perfil.
- **CA-04:** Dado el build, cuando se pruebe en varios dispositivos Android, entonces se verifican accesibilidad, textos en español y ausencia de regresiones frente a las specs implementadas.
- **CA-05:** Dado el proceso, cuando se documente, entonces queda registrado quién firma y genera el build (pendiente de definir) y los requisitos vigentes de Play Console verificados.

## Dependencias, riesgos y preguntas

- **Dependencias/ADR:** ADR 0012 (canal), ADR 0004 (Expo/Android), specs de funciones publicadas (`mobile-003` a `mobile-007` según alcance del lanzamiento).
- **Riesgos:** los requisitos de Play Console para cuentas nuevas han cambiado y deben verificarse antes de comprometer fechas; perder la clave de firma rompe las actualizaciones.
- **Preguntas pendientes:**
  - Persona responsable de la firma y del build (se define al final).
  - Cuenta de desarrollador de Play Console y validación del dominio del aviso de privacidad.

## Revisión

- Aprobadores y fecha: pendiente de aprobación.
- Evidencia/enlaces: `docs/adr/0012-android-distribution-channel.md`, `docs/adr/0004-mobile-react-native.md`.
