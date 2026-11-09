# 0025 · Recorrido Guiado 3D y Realidad Aumentada Offline con Cámara, Three.js y Sensores

- Estado: Propuesto (listo para aceptación en `mobile-009`)
- Fecha: 2026-11-05
- Spec relacionada: `apps/mobile/specs/009-ar-3d-map-guide.md`
- Autor / Responsable: Víctor Adrián
- Nota: Renumerado desde 0022 el 2026-11-09. El 0022 quedó para el escaneo QR (`mobile-006`). El 0023 y el 0024 los ocupan el checklist de despliegue y el portal estático.

---

## Contexto

Con el Mapa 2D (`mobile-007` V1 a V3) el visitante cuenta con plano esquemático, punto azul GPS (`expo-location`, ADR 0016), controles de zoom/desplazamiento y grafo peatonal (`zooPaths.ts` + Dijkstra).

Para el componente 3D previsto en `AGENTS.md` (*"React Native para visitantes: mapa, QR y 3D"*), se requiere un **Recorrido Guiado 3D con Cámara AR** que:
1. Inicie desde la pantalla del Mapa 2D y guíe al visitante en un **recorrido secuencial desde la Entrada Principal hacia el primer recinto, luego al segundo, y así sucesivamente**.
2. Sea **visualmente dinámico (no estático)**: proyectando con **Three.js** sobre la imagen de la cámara líneas 3D de conexión entre nodos, una corriente de flechas (chevrons 3D) animadas sobre el suelo y **bifurcaciones 3D** cuando el pasillo se divide hacia distintos recintos.
3. Funcione **100 % Offline (sin conexión a internet)** dentro del zoológico, ya que muchos visitantes no cuentan con datos móviles o cobertura estable durante el recorrido.

---

## Decisión

Adoptar el stack **100 % local y offline-first** basado en **Expo + Three.js**:

1. **Motor 3D procedural (`three` + `expo-gl` + `expo-three`):**
   - Renderiza en la GPU del teléfono las cintas de sendero, la corriente de chevrons/flechas 3D animadas, las líneas de bifurcación en cada intersección y las balizas de recintos sobre un `<GLView>` con fondo transparente (`alpha: true`).
   - Al usar geometrías procedurales (`THREE.TubeGeometry`, `THREE.ConeGeometry`, `THREE.BufferGeometry`), **no necesita descargar activos `.glb`/`.gltf` por internet**; pesa pocos kilobytes y funciona instantáneamente sin red.
2. **Fondo de cámara en vivo (`expo-camera`):**
   - `CameraView` trasera en primer plano como fondo visual sobre el que se superpone la red 3D de senderos y bifurcaciones. No graba ni guarda imágenes.
3. **Orientación espacial (`expo-sensors`):**
   - `Magnetometer` con filtro de paso bajo circular para alinear el ángulo de la red de caminos 3D con la dirección real hacia la que apunta el visitante, complementado con botones manuales accesibles.
4. **Datos y Rutas 100 % Offline:**
   - Reutiliza `expo-location` (GPS satelital que no requiere datos móviles), el caché `AsyncStorage` (ADR 0014) y el grafo `src/constants/zooPaths.ts` + `src/utils/pathfinding.ts` empaquetado en la app.

---

## Alternativas consideradas

| Alternativa | ¿Funciona 100 % Offline? | Evaluación |
|---|---|---|
| **Three.js procedural + `expo-gl` + `expo-camera` + `expo-sensors` + `zooPaths.ts` (Elegida)** | **Sí (100 % Offline)** | Cero costo, compatible con Expo SDK 57, dibuja líneas conectadas, flechas en movimiento y bifurcaciones 3D directamente desde el grafo local. |
| **Google ARCore Geospatial API / Street View Live View** | **No** (requiere internet continuo y VPS en la nube) | Descartado: falla sin datos móviles, requiere API Key de pago y no tiene cobertura de los pasillos internos del zoológico. |
| **Modelos 3D externos pesados (`.gltf` en CDN) o Unity** | **Parcial / Pesado** | Descartado: requiere descargas grandes o rompe los límites de tamaño y `ADR 0005`. |

---

## Consecuencias

### Positivas
- **Operación garantizada sin internet:** Todo el recorrido 3D (cámara + GPS + brújula + Three.js + grafo de bifurcaciones) se ejecuta localmente en el teléfono.
- **Experiencia viva y conectada:** El visitante ve el camino completo conectándose entre recintos y ve las bifurcaciones antes de llegar a cada cruce.
- **Modo Escena 3D de respaldo:** Si el visitante no da permiso de cámara, ve exactamente las mismas líneas 3D, flechas animadas y bifurcaciones sobre un suelo 3D virtual.

### Riesgos o costos
- **Deriva de brújula magnética en algunos teléfonos:** Mitigado con suavizado exponencial circular y botones accesibles de ajuste de rumbo en pantalla.
- **Consumo de energía:** Mitigado liberando `CameraView`, `GLView` y sensores en cuanto el usuario cierra el recorrido 3D.

---

## Validación y revisión

- [ ] Aprobación funcional de `apps/mobile/specs/009-ar-3d-map-guide.md`.
- [ ] Instalación de paquetes compatibles con Expo SDK 57 (`three`, `@types/three`, `expo-gl`, `expo-three`, `expo-camera`, `expo-sensors`) durante `/sdd-implement`.
