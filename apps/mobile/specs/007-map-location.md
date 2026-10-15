# 007 · map-location

- App dueña: `mobile`
- Apps/paquetes afectados: `mobile`, `packages/api-client`
- Estado: Borrador
- Solicitante / responsable funcional: Víctor (redacción spec); equipo móvil ARCA-NB
- Aprobación funcional: pendiente de aprobación
- Equivalencia en el documento de decisiones previas: 006

## Problema y contexto

El mapa del prototipo (`mobile-002`) es una imagen estática con ubicaciones simuladas. Esta spec define el mapa real: proveedor de mapa, datos de recintos servidos por la API, ubicación GPS con permiso explícito y una alternativa usable sin ubicación. Puede empezar con una versión simple y crecer en iteraciones.

## Objetivos

- Mapa del zoológico con recintos y puntos de interés servidos por la API.
- Ubicación del visitante con permiso GPS explícito y alternativa sin ubicación.
- Integración con la búsqueda: seleccionar un animal destino desde el mapa.
- MVVM y tokens semánticos; accesibilidad y textos en español.

## Fuera de alcance

- Recorrido 3D real (depende de ADR 0005 y spec propia).
- Navegación paso a paso guiada (si se decide, será ampliación).
- iOS.

## Criterios de aceptación (preliminares)

- **CA-01:** Dado el mapa, cuando se abre, entonces muestra los recintos y puntos de interés obtenidos de la API vía `@arca/api-client`.
- **CA-02:** Dado el permiso de ubicación, cuando el visitante lo concede, entonces el mapa muestra su posición; si lo niega, la app ofrece la alternativa sin ubicación sin bloquear el mapa.
- **CA-03:** Dada la búsqueda de un animal, cuando el visitante lo elige como destino, entonces el mapa lo marca conforme al flujo definido en `mobile-002`.
- **CA-04:** Dada la suite de Jest, cuando se ejecute, entonces hay pruebas que nombran cada CA-xx en lo que el simulador permita, registrando sus limitaciones.

## Dependencias, riesgos y preguntas

- **Dependencias/ADR:** proveedor de mapa por decidir (puede exigir un build de desarrollo en lugar de Expo Go), ADR 0012 (canal de distribución y firma), endpoints de recintos de la API, ADR 0004.
- **Riesgos:** el proveedor de mapa puede implicar costos o claves; precisión del GPS en interiores.
- **Preguntas pendientes:**
  - Proveedor de mapa concreto y sus claves/costos.
  - Fuente de datos de ubicaciones de recintos y servicios.

## Revisión

- Aprobadores y fecha: pendiente de aprobación.
- Evidencia/enlaces: `docs/adr/0012-android-distribution-channel.md`, `apps/mobile/specs/002-mobile-ui-base-visitor-journey.md`.
