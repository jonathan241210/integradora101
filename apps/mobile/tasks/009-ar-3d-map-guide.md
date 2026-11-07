# Tareas · 009 · Recorrido Guiado 3D y Cámara AR con Senderos, Bifurcaciones y Modo Offline (`ar-3d-map-guide`)

- Spec: `apps/mobile/specs/009-ar-3d-map-guide.md` (Aprobada, 2026-11-05)
- Plan: `apps/mobile/plan/009-ar-3d-map-guide.md` (Aprobado, 2026-11-05)
- ADR: `docs/adr/0022-mobile-ar-3d-camera-threejs.md` (Aceptado, 2026-11-05)

---

## Base de datos (responsable de BD)

- No requiere cambios de base de datos ni nueva DBR (reutiliza `DBR-008` y el grafo local `zooPaths.ts` para operación 100 % Offline).

---

## Implementación

### Bloque 1 — Matemática 3D/AR, Planificador de Recorrido y Bifurcaciones (`CA-01`, `CA-03`, `CA-04`, `CA-05`, `CA-06`, `CA-08`)

- [x] **T-01** (`CA-03`, `CA-06`, `CA-08`): Crear `src/utils/arMath.ts` con funciones puras:
  - `computeBearingDegrees(from, to)`
  - `computeRelativeAngleDegrees(targetBearing, currentHeading)`
  - `smoothHeadingDegrees(prevHeading, rawHeading, alpha)`
  - `project3DPointToScreen(point3D, viewportWidth, viewportHeight)` (proyección en perspectiva 3D con matriz de cámara e inclinación)
  - `computeArGuidance(userSvg, routePoints, headingDegrees)` (instrucción en español, distancia al siguiente nodo, segmentos 3D y chevrons/flechas 3D).
- [x] **T-02** (`CA-01`, `CA-04`, `CA-05`, `RN-03`, `RN-04`): Crear `src/utils/tourPlanner.ts` con funciones puras:
  - `buildSequentialTour(places, startSvg)`: construye el circuito ordenado de paradas desde la entrada por cercanía sobre el grafo de senderos.
  - `computeTourForks(routePoints, currentTargetPlace, allPlaces, headingDegrees)`: detecta las bifurcaciones en los nodos de intersección de `ZOO_PATH_EDGES` y devuelve tanto el ramal principal como los ramales secundarios con su ángulo 3D y recinto asociado.

### Bloque 2 — ViewModel del Recorrido 3D (`CA-01`, `CA-02`, `CA-05`, `CA-06`, `CA-07`)

- [x] **T-03** (`CA-01`, `CA-02`, `CA-05`, `CA-06`, `CA-07`): Crear `src/viewmodels/useArTourViewModel.ts`:
  - Estado de apertura (`isTourOpen`), modo visual (`visualMode: 'camera-ar' | 'scene-3d'`), parada actual (`currentStopIndex`, `currentStop`), lista de paradas (`tourStops`) y paradas visitadas (`visitedStopIds`).
  - Integración con `computeWalkRoute`, `computeArGuidance` y `computeTourForks`.
  - Avance automático al siguiente recinto cuando la distancia Haversine es $\le 10\text{ m}$ (`checkTourArrival`), más acciones manuales (`startTour`, `closeTour`, `nextStop`, `prevStop`, `selectStopById`, `rotateLeft`, `rotateRight`, `alignFront`, `toggleVisualMode`).

### Bloque 3 — Escena 3D y Visor Superpuesto (`CA-01`, `CA-02`, `CA-03`, `CA-04`, `CA-06`, `CA-07`, `CA-08`)

- [x] **T-04** (`CA-03`, `CA-04`, `CA-07`, `CA-08`): Crear `src/components/map/ThreeTourScene.tsx`:
  - Renderiza en perspectiva 3D el piso/horizonte, las líneas de conexión entre nodos del sendero, la corriente de flechas (chevrons 3D) animadas hacia el objetivo, los ramales 3D de las bifurcaciones y las balizas flotantes de los recintos.
  - Utiliza exclusivamente tokens semánticos (`colors` de `src/theme/tokens.ts` o constantes de `src/constants/zoo.ts`).
- [x] **T-05** (`CA-01`, `CA-02`, `CA-03`, `CA-04`, `CA-06`, `CA-08`): Crear `src/components/map/ArTourOverlay.tsx`:
  - Cabecera con estado Offline/3D, indicador de parada (*"Parada k de N: [Nombre]"*), interruptor accesible **«Cámara AR / Escena 3D»** y botón **«Volver al mapa 2D»**.
  - Tarjeta de instrucción 3D en español (ej. *"Sigue de frente por el sendero"*, *"~120 m • 2 min a pie"*).
  - Panel de **Bifurcaciones detectadas** en el camino permitiendo ver hacia dónde lleva cada ramal o tocar un ramal para desviarse a ese recinto.
  - Controles accesibles de orientación (`Girar vista a la izquierda`, `Alinear al frente`, `Girar vista a la derecha`) y de avance de recorrido (`Recinto anterior`, `Siguiente recinto`).
- [x] **T-06** (`CA-01`, `CA-08`): Exportar `ThreeTourScene` y `ArTourOverlay` en `src/components/map/index.ts` e integrarlos en `src/screens/MapScreen.tsx` mediante el botón accesible **«Iniciar Recorrido 3D»**.

### Bloque 4 — Pruebas Automatizadas por Criterio (`CA-01` a `CA-08`)

- [x] **T-07** (`CA-04`, `CA-05`, `CA-06`): Crear `__tests__/arMathAndTour.test.ts` validando:
  - `test-ca-04`: detección de bifurcaciones y ramales secundarios sobre el grafo `zooPaths.ts`.
  - `test-ca-05`: construcción del circuito secuencial `buildSequentialTour` desde la entrada 100 % offline.
  - `test-ca-06`: cálculo de rumbo, ángulo relativo, suavizado circular `smoothHeadingDegrees` ($359^\circ \leftrightarrow 0^\circ$) y proyección 3D.
- [x] **T-08** (`CA-01`, `CA-02`, `CA-03`, `CA-04`, `CA-06`, `CA-07`, `CA-08`): Crear `__tests__/arTourOverlay.test.tsx` validando:
  - `test-ca-01`: abrir el Recorrido 3D desde `MapScreen`, verificar Parada 1 y volver al Mapa 2D.
  - `test-ca-02`: avanzar al siguiente recinto, retroceder y desvío en bifurcación.
  - `test-ca-03`: renderizado del sendero 3D conectado, flechas animadas y cambio entre Modo Cámara AR y Escena 3D.
  - `test-ca-06` y `test-ca-07`: controles manuales de giro y desmontaje limpio sin fugas.

---

## Calidad y entrega

- [x] **T-09**: Ejecutar `npx tsc --noEmit` y Jest (`__tests__/arMathAndTour.test.ts`, `__tests__/arTourOverlay.test.tsx`, `__tests__/architecture.test.ts` y suites de mapa) verificando 0 errores.
- [x] **T-10**: Actualizar `apps/mobile/docs/003-008-roadmap-y-asignacion.md` y `apps/mobile/docs/007-roadmap-mapa-gps-ar.md` con el estado implementado de `mobile-009`.
