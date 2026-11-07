# Plan técnico · 009 · Recorrido Guiado 3D y Cámara AR con Senderos, Bifurcaciones y Modo Offline (`ar-3d-map-guide`)

- Spec: `apps/mobile/specs/009-ar-3d-map-guide.md`
- Estado de spec: Aprobada (Víctor Adrián, 2026-11-05)
- Estado del plan: Aprobado (Víctor Adrián, 2026-11-05)
- Responsable técnico: Víctor Adrián
- ADR habilitador: `docs/adr/0022-mobile-ar-3d-camera-threejs.md` (Aceptado)

---

## Diseño de solución

La feature `mobile-009` añade un **Recorrido Guiado 3D y de Realidad Aumentada con Cámara** directamente accesible desde la pantalla del Mapa 2D (`MapScreen.tsx`), siguiendo la arquitectura **MVVM** de `apps/mobile` y operando **100 % Offline**:

1. **Planificador de Recorrido y Bifurcaciones (`src/utils/tourPlanner.ts`):**
   - `buildSequentialTour(places, startSvg)`: Ordena los recintos visibles formando un circuito continuo sobre la red de senderos (`zooPaths.ts`) comenzando desde la Entrada Principal (o posición actual del visitante) hacia el primer recinto, luego al segundo, y así sucesivamente (`RN-03`).
   - `computeTourForks(routePoints, targetPlace, allPlaces, nodes, edges)`: Inspecciona los nodos del tramo actual en `ZOO_PATH_EDGES`; cuando detecta un nodo de intersección (grado $\ge 3$), identifica el **ramal principal** (hacia el recinto objetivo actual) y los **ramales secundarios** (calculando su ángulo de desviación $\Delta \theta$ y el recinto/sección al que conducen) (`CA-04`, `RN-04`).
2. **Motor Matemático 3D/AR y Proyección en Perspectiva (`src/utils/arMath.ts`):**
   - `computeBearingDegrees(from, to)`: Calcula el acimut en grados $[0^\circ, 360^\circ)$ entre dos puntos del plano.
   - `computeRelativeAngleDegrees(targetBearing, currentHeading)`: Calcula el giro relativo normalizado en $[-180^\circ, +180^\circ]$.
   - `smoothHeadingDegrees(previousHeading, rawHeading, alpha)`: Filtro de paso bajo circular para estabilizar las lecturas de brújula en el cruce $359^\circ \leftrightarrow 0^\circ$.
   - `computeArGuidance(userSvg, routePoints, headingDegrees)`: Devuelve el ángulo relativo hacia el siguiente nodo del sendero, la distancia al siguiente giro, la instrucción textual en español (*"Sigue de frente por el sendero"*, *"Gira a la derecha en la bifurcación"*, etc.) y las coordenadas proyectadas en perspectiva 3D de los segmentos, flechas (chevrons) y ramales de bifurcación (`CA-03`, `CA-04`).
3. **ViewModel del Recorrido 3D (`src/viewmodels/useArTourViewModel.ts`):**
   - Gestiona el ciclo de vida del recorrido (`isTourOpen`, `isCameraEnabled`, `cameraPermissionGranted`, `headingDegrees`, `currentStopIndex`, `tourStops`, `visitedStopIds`, `forks`, `guidance`, `walkRoute`).
   - Avanza automáticamente a la siguiente parada (`nextStop()`) cuando `haversineMeters` detecta llegada ($\le 10\text{ m}$) al recinto actual, o manualmente mediante botones accesibles (`nextStop`, `prevStop`, `selectForkDestination`).
   - Gestiona la suscripción opcional de brújula y los controles manuales accesibles (`rotateLeft`, `rotateRight`, `alignFront`) (`CA-06`).
4. **Escena 3D de Senderos, Flechas en Movimiento y Bifurcaciones (`src/components/map/ThreeTourScene.tsx`):**
   - Renderiza en perspectiva 3D (compatible con WebGL / Three.js y proyección vectorial 3D de alta velocidad para Expo Go y Jest) el corredor tridimensional sobre el suelo:
     - **Líneas de conexión 3D** entre nodos con perspectiva de profundidad.
     - **Corriente de flechas (chevrons 3D) animadas** que avanzan continuamente hacia el recinto objetivo.
     - **Ramales de bifurcación 3D** que se abren a izquierda/derecha en las intersecciones con etiquetas flotantes de los recintos conectados.
   - Se superpone con fondo transparente sobre `CameraView` (cuando la cámara está activa) o sobre el escenario 3D virtual estilizado (cuando está en Modo Escena 3D sin cámara).
5. **Visor Superpuesto y Controles HUD (`src/components/map/ArTourOverlay.tsx`):**
   - Se abre desde `MapScreen.tsx` mediante el botón accesible **«Iniciar Recorrido 3D»** (`testID="start-ar-tour-button"`).
   - Muestra el progreso del recorrido (*"Parada 1 de N: [Nombre]"*), la instrucción de giro en español, metros y minutos a pie, botones de bifurcación para desviarse a otro recinto si el visitante lo desea, controles manuales de orientación (`⟲`, ` Frente `, `⟳`), interruptor **«Cámara AR / Escena 3D»** y botón **«Volver al mapa 2D»**.

---

## Cambios por área

| Área/app | Archivos o módulos previstos | Propósito |
|---|---|---|
| API / datos | Ninguno (reutiliza `DBR-008` y caché local `AsyncStorage`) | Operación 100 % Offline sin bloqueo de red (`CA-05`, `RN-01`) |
| Utilidades (`apps/mobile/src/utils/`) | `src/utils/arMath.ts` (**nuevo**)<br>`src/utils/tourPlanner.ts` (**nuevo**) | Matemática de rumbo/acimut, suavizado circular, proyección 3D, ordenamiento secuencial de paradas y detección de bifurcaciones en `zooPaths.ts` |
| ViewModels (`apps/mobile/src/viewmodels/`) | `src/viewmodels/useArTourViewModel.ts` (**nuevo**) | Estado del recorrido secuencial, permisos/modo de cámara, orientación manual/brújula y avance automático por llegada ($\le 10\text{ m}$) |
| Componentes (`apps/mobile/src/components/map/`) | `src/components/map/ThreeTourScene.tsx` (**nuevo**)<br>`src/components/map/ArTourOverlay.tsx` (**nuevo**)<br>`src/components/map/index.ts` (**modificado**) | Renderizado en perspectiva 3D de sendero conectado, flechas animadas y bifurcaciones + HUD accesible en español |
| Pantalla (`apps/mobile/src/screens/`) | `src/screens/MapScreen.tsx` (**modificado**) | Botón accesible «Iniciar Recorrido 3D» e integración de `ArTourOverlay` conservando estado 2D ↔ 3D |
| Pruebas (`apps/mobile/__tests__/`) | `__tests__/arMathAndTour.test.ts` (**nuevo**)<br>`__tests__/arTourOverlay.test.tsx` (**nuevo**) | Pruebas unitarias y de integración para `CA-01` a `CA-08` |
| Documentación | `docs/adr/0022-mobile-ar-3d-camera-threejs.md`<br>`apps/mobile/docs/009-guia-mapa-3d-ar-threejs.md` | ADR 0022 y guía técnica de arquitectura 3D/AR |

---

## Contrato y datos

- **Sin nuevos endpoints ni DBR:** Reutiliza los modelos `MapPlace`, `MapSection`, `UserPosition` y el grafo `ZOO_PATH_NODES` / `ZOO_PATH_EDGES` de `mobile-007`.
- **Operación 100 % Offline (`CA-05`):**
  - El recorrido toma los `places` ya cargados por `MapRepository` (desde `AsyncStorage` o `MOCK_MAP_PLACES`) y el grafo en memoria `zooPaths.ts`. No ejecuta ninguna petición HTTP durante el recorrido.

---

## Seguridad, offline y operación

- **Privacidad de cámara (`RN-02`):** Cuando el modo cámara está activo, la vista de cámara se emplea únicamente como fondo efímero en primer plano; no se invoca ningún método de captura ni grabación.
- **Liberación de recursos (`CA-07`):** El ciclo de animación de las flechas 3D y cualquier suscripción de sensores se limpian en el `cleanup` de `useEffect` al cerrar el visor 3D o desmontar la pantalla.
- **Accesibilidad (`CA-06`, `RN-05`):** Todos los controles tienen `accessibilityRole="button"`, `accessibilityLabel` en español y área táctil mínima recomendada; el recorrido es 100 % operable sin cámara y sin brújula mediante los botones de orientación y navegación de paradas.

---

## Mapeo de criterios a pruebas

| Criterio | Prueba automatizada | App/ubicación |
|---|---|---|
| **CA-01** Acceso desde Mapa 2D y secuencia del recorrido | `test-ca-01`: abrir Recorrido 3D desde `MapScreen`, iniciar en Parada 1 desde entrada y volver al Mapa 2D conservando estado | `apps/mobile/__tests__/arTourOverlay.test.tsx` |
| **CA-02** Transición automática y manual entre recintos | `test-ca-02`: avanzar al siguiente recinto con botón o al llegar a $\le 10\text{ m}$ y retroceder parada | `apps/mobile/__tests__/arTourOverlay.test.tsx` |
| **CA-03** Sendero 3D conectado y flechas animadas | `test-ca-03`: renderiza segmentos de conexión 3D, corriente de flechas (chevrons) y conmuta entre modo Cámara AR y Escena 3D | `apps/mobile/__tests__/arTourOverlay.test.tsx` |
| **CA-04** Generación de bifurcaciones 3D en intersecciones | `test-ca-04`: `computeTourForks` detecta ramales en nodos con múltiples salidas y permite desviarse a un ramal en la UI | `apps/mobile/__tests__/arMathAndTour.test.ts` y `arTourOverlay.test.tsx` |
| **CA-05** Funcionamiento 100 % Offline | `test-ca-05`: `buildSequentialTour` y el recorrido completo operan sin red con datos locales | `apps/mobile/__tests__/arMathAndTour.test.ts` |
| **CA-06** Orientación suavizada y controles manuales accesibles | `test-ca-06`: `smoothHeadingDegrees` maneja cruce $359^\circ \leftrightarrow 0^\circ$ y botones accesibles giran la escena 3D | `apps/mobile/__tests__/arMathAndTour.test.ts` y `arTourOverlay.test.tsx` |
| **CA-07** Limpieza de recursos al cerrar visor | `test-ca-07`: desmontar o cerrar el visor 3D detiene timers/animaciones sin errores ni fugas | `apps/mobile/__tests__/arTourOverlay.test.tsx` |
| **CA-08** Separación MVVM, tokens e idioma | `test-ca-08` + `architecture.test.ts`: sin colores hex/rgba en vistas y textos en español | `apps/mobile/__tests__/architecture.test.ts` |

---

## Constitution Check

| Principio | Cumple | Evidencia o excepción propuesta |
|---|---|---|
| **I. Stack mínimo y portable** | ✅ | Usa primitivas y bibliotecas compatibles con Expo SDK 57 sin servicios externos de nube ni API keys de pago (ADR 0022). |
| **II. La spec manda** | ✅ | Spec `009-ar-3d-map-guide.md` aprobada antes del plan y tasks; trazabilidad 1:1 de `CA-01` a `CA-08`. |
| **III. Lógica separada de la interfaz** | ✅ | Planificación de paradas y bifurcaciones en `tourPlanner.ts`, matemática 3D en `arMath.ts`, estado en `useArTourViewModel.ts` y presentación en `ThreeTourScene.tsx` / `ArTourOverlay.tsx`. |
| **IV. Un test por criterio** | ✅ | Cada criterio `CA-01` a `CA-08` cuenta con test explícito en Jest. |
| **V. Una sola fuente de verdad para los datos** | ✅ | Reutiliza el grafo `zooPaths.ts` y los lugares de `MapRepository` sin duplicar catálogos. |
| **VI. Código en inglés, personas en español** | ✅ | Identificadores, tipos y archivos en inglés; interfaz, instrucciones de giro y documentación en español. |

---

## Riesgos y decisiones

- **ADR requerido/aprobado:** `docs/adr/0022-mobile-ar-3d-camera-threejs.md` (Aceptado).
- **Compatibilidad con Expo Go y Jest sin binarios adicionales bloqueantes:**
  - Para garantizar que el Recorrido 3D funcione inmediatamente en Expo Go SDK 57, en dispositivos sin soporte ARCore y en el runner de Jest sin fallos nativos, `ThreeTourScene.tsx` proyecta matemáticamente los vectores 3D $(X, Y, Z)$ de la cámara en perspectiva tridimensional (`project3DPointToViewport` en `arMath.ts`) sobre el lienzo vectorial de alta velocidad y soporta la capa de cámara/escena 3D sin requerir compilación nativa personalizada.

---

## Orden y aprobación

1. Crear utilidades puras `src/utils/arMath.ts` y `src/utils/tourPlanner.ts`.
2. Crear ViewModel `src/viewmodels/useArTourViewModel.ts`.
3. Crear componentes `src/components/map/ThreeTourScene.tsx` y `src/components/map/ArTourOverlay.tsx`.
4. Integrar botón de inicio y visor en `src/screens/MapScreen.tsx`.
5. Crear suites de pruebas `__tests__/arMathAndTour.test.ts` y `__tests__/arTourOverlay.test.tsx`.
6. Ejecutar `tsc --noEmit` y Jest (`architecture.test.ts` incluido).

- **Aprobador funcional y técnico:** Víctor Adrián (2026-11-05).
