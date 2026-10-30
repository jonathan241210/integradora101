# Tareas · 007 · map-location

- Spec: `apps/mobile/specs/007-map-location.md`
- Plan: `apps/mobile/plan/007-map-location.md`
- ADR: `docs/adr/0015-mobile-svg-map-rendering.md`
- Brief del SVG: `apps/mobile/docs/007-svg-brief.md`
- Estado: Implementación y validación visual completadas; listo para commit local
 
 ## Prerrequisitos
 
 - [x] Aprobar el plan `apps/mobile/plan/007-map-location.md`.
 - [x] Aceptar el ADR 0015 `docs/adr/0015-mobile-svg-map-rendering.md`.
 - [ ] Confirmar la revisión técnica de Aksel.
 - [x] Confirmar el SVG esquemático V1 y sus IDs de sección (borrador `apps/mobile/docs/007-map-v1-draft.svg` validado en pantalla).

## Implementación

### Fase 1: Dependencia y datos

- [ ] **T-01** (CA-01, RN-07, ADR 0015): Instalar `react-native-svg` con `npx expo install react-native-svg` y verificar que renderiza en Expo Go y en el build Android.
  - Dependencia instalada (`15.15.4`). Se alinearon `react-native-worklets@0.10.1` y `react-native-reanimated@4.5.1` con Expo SDK 57 y se actualizaron `expo@57.0.31`/`expo-router@57.0.29`. El bundle Android compila; la verificación visual en Expo Go/Android queda en T-17.

- [x] **T-02** (CA-02, RN-02): Actualizar `apps/mobile/src/models/index.ts` con `MapPlace`, `MapSection`, `MapPlaceKind` y `MapFilter`; reemplazar `left`/`top` por `mapX`/`mapY` normalizados y retirar `MapRoute` del flujo del mapa.

- [x] **T-03** (CA-02, CA-06, RN-05, RN-09): Crear el fixture de 8–10 puntos en `apps/mobile/src/mocks/zoo.ts` y actualizar `MapRepository` en `apps/mobile/src/repositories/index.ts` para exponer `getPlaces(): Promise<MapPlace[]>`; eliminar `getActiveRoute` y `MOCK_MAP_ROUTE` del mapa.

### Fase 2: SVG y presentación

- [x] **T-04** (CA-01, RN-01, RN-08): Crear `apps/mobile/src/components/map/ZooMapSvg.tsx` con el plano esquemático, las secciones `zone-*`, senderos, agua y etiquetas; usar tokens semánticos y permitir resaltar una sección.
  - Basado en `apps/mobile/docs/007-map-v1-draft.svg`; el SVG final sigue pendiente.

- [x] **T-05** (CA-02, CA-07, RN-02): Crear `apps/mobile/src/components/map/MapMarker.tsx` con posicionamiento por `mapX`/`mapY`, etiqueta accesible en español y estado seleccionado.

- [x] **T-06** (CA-03, CA-07): Crear `apps/mobile/src/components/map/MapPlaceCard.tsx` para mostrar nombre, tipo, sección y descripción, con cierre accesible.

- [x] **T-07** (CA-01, CA-02, CA-03): Actualizar `apps/mobile/src/viewmodels/useMapViewModel.ts` para cargar puntos, exponer `isLoading`, `error`, `retry`, `filteredPlaces`, `selectedPlace`, `selectPlace`, `setFilter` y `focusPlace`.

- [x] **T-08** (CA-01, CA-02, CA-03): Actualizar `apps/mobile/src/screens/MapScreen.tsx` para integrar `ZooMapSvg`, marcadores, detalle, filtros y estados; retirar la tarjeta de ruta simulada y el botón de recorrido 3D del flujo principal.
  - Si se conserva el acceso 3D, debe quedar como placeholder claramente marcado y no formar parte de los CA.

- [x] **T-09** (CA-04): Implementar los filtros “Todo”, “Animales” y “Servicios” y el estado vacío cuando no haya resultados, sin ocultar el mapa.

- [x] **T-10** (CA-06): Implementar los estados `loading`, `empty` y `error` con reintento; confirmar que el SVG y el fixture funcionan sin conexión.

### Fase 3: Búsqueda y accesibilidad

- [x] **T-11** (CA-05, RN-04): Ajustar `apps/mobile/src/app/(tabs)/map.tsx` para leer `focus` y `apps/mobile/src/app/(tabs)/search.tsx` para que `returnTo=map` vuelva al mapa con `focus=<animalId>`, sin abrir el recorrido 3D ni mostrar rutas inventadas.

- [x] **T-12** (CA-07, RN-06): Revisar accesibilidad y tokens: etiquetas en español, contraste, foco, tamaño de texto, `accessibilityRole` y ausencia de imports de repositorios/mocks en `screens/` y `components/`.

### Fase 4: Pruebas

- [x] **T-13** (CA-01, CA-02, CA-03): Crear `apps/mobile/__tests__/mapRepository.test.ts` y `apps/mobile/__tests__/mapScreen.test.tsx` para cubrir render del SVG, puntos visibles, posiciones y detalle.

- [x] **T-14** (CA-04, CA-05, CA-06): Ampliar `mapScreen.test.tsx` y crear `apps/mobile/__tests__/mapViewModel.test.ts` para filtros, estado vacío, búsqueda/focus, error y reintento.

- [x] **T-15** (CA-07, CA-08): Crear `apps/mobile/__tests__/mapAccessibility.test.tsx` y ajustar `apps/mobile/jest.setup.js` con el mock de `react-native-svg` si es necesario; asegurar que cada CA-01 a CA-08 esté nombrado en al menos una prueba.
  - No fue necesario mockear `react-native-svg`; `jest-expo` lo renderiza. La prueba CA-08 verifica los ocho criterios nombrados.

## Calidad y entrega

- [x] **T-16**: Ejecutar `npx jest --runInBand` y `npx tsc --noEmit` en `apps/mobile`; corregir fallos sin ampliar el alcance.
  - Verificado con `npx jest --runInBand` (27 suites, 132 pruebas) y `npx tsc --noEmit` sin errores.

- [x] **T-17**: Ejecutar `/verify`, revisar que no haya dependencias no aprobadas ni cambios de BD, y validar visualmente el mapa en Android/Expo Go.
  - Validación visual en dispositivo Android con Expo Go SDK 57 confirmada exitosamente por el responsable funcional (Víctor Adrián, 2026-10-25). El plano SVG renderiza nítido, los marcadores caen en sus posiciones, los filtros responden y la navegación con Búsqueda enfoca correctamente.

- [x] **T-18**: Actualizar `apps/mobile/docs/003-008-roadmap-y-asignacion.md` y la documentación local de la app con el estado de la V1, el ADR 0015 y las limitaciones (sin GPS, sin API, sin DBR).

## Evidencia

- `npx jest --runInBand` en `apps/mobile`: 27 suites y 132 pruebas aprobadas; suites de mapa (`mapRepository`, `mapViewModel`, `mapScreen`, `mapAccessibility`) cubren CA-01 a CA-08 en verde.
- `npx tsc --noEmit` en `apps/mobile`: 0 errores de TypeScript.
- Prueba de arquitectura (`architecture.test.ts`): aprobada sin infracciones de MVVM ni colores fijos.
- Validación visual en dispositivo físico Android: comprobada en Expo Go (SDK 57).
- Dependencia aprobada: `react-native-svg@15.15.4` (ADR 0015 aceptado).
- Dependencias transitivas alineadas con Expo SDK 57: `react-native-worklets@0.10.1` y `react-native-reanimated@4.5.1`.
- Sin cambios de base de datos, API, GPS ni permisos de ubicación en esta V1.

---

## Enmienda V2 — GPS, Punto Azul (CA-08 a CA-11)

- Spec: `apps/mobile/specs/007-map-location.md` (enmienda V2, Aprobada 2026-10-29)
- Plan: `apps/mobile/plan/007-map-location.md` (enmienda V2, Aprobado 2026-10-29)
- ADR: `docs/adr/0016-expo-location-gps-blue-dot.md` — Aceptado
- Alcance: **solo punto azul** — CA-08, CA-09, CA-10, CA-11
- Fuera de alcance aquí: línea al destino, detección de llegada (CA-12) → V2.1

> Continúa la numeración desde T-18 (última tarea de V1).

---

## Implementación

### Bloque 1 — Utilidades puras (sin dependencias entre sí)

- [x] **T-19** (RN-12, RN-13): Crear `src/constants/zoo.ts` con:
  - `ZOO_BOUNDS = { latMin, latMax, lonMin, lonMax }` (valores sintéticos de prueba, comentados como `// TODO: reemplazar con medición real`)
  - `ZOO_ENTRANCE_SVG = { svgX: 500, svgY: 1320 }` (entrada principal, prueba)
  - `ARRIVAL_RADIUS_METERS = 10`
  - `SVG_WIDTH = 1000`, `SVG_HEIGHT = 1400`
  - Resultado comprobable: archivo existe, exporta todas las constantes, TypeScript sin errores.

- [x] **T-20** (CA-11): Crear `src/utils/geoTransform.ts`:
  - Función `geoTransform(lat, lon): { svgX, svgY }` usando transformación afín sobre `ZOO_BOUNDS`.
  - Si `lat`/`lon` cae fuera de los bounds → devuelve `ZOO_ENTRANCE_SVG`.
  - Resultado comprobable: función exportada, sin efectos secundarios, TypeScript limpio.

- [x] **T-21** (CA-11): Crear `__tests__/geoTransform.test.ts`:
  - Caso: esquina noroeste del bounding-box → `{ svgX ≈ 0, svgY ≈ 0 }`.
  - Caso: esquina sureste → `{ svgX ≈ 1000, svgY ≈ 1400 }`.
  - Caso: punto fuera de bounds → `ZOO_ENTRANCE_SVG`.
  - Caso: punto central → resultado dentro del rango SVG.
  - Resultado comprobable: 4 tests en verde, sin mocks de GPS.

### Bloque 2 — Mock de expo-location para Jest

- [x] **T-22** (CA-08, CA-09, CA-10): Crear `test-support/locationMocks.ts`:
  - `mockGranted(accuracy, lat, lon)` — simula permiso concedido con posición.
  - `mockDenied()` — simula permiso denegado.
  - `mockSearching()` — simula permiso concedido pero accuracy = 50 m (señal débil).
  - Mockea `expo-location` completo (permiso, `watchPositionAsync`, cancelación).
  - Resultado comprobable: el mock se importa y no lanza errores en Jest.

### Bloque 3 — ViewModel de ubicación

- [x] **T-23** (CA-08, CA-09, CA-10, CA-11): Crear `src/viewmodels/useLocationViewModel.ts`:
  - `requestPermission()` → llama `requestForegroundPermissionsAsync`.
  - Si concedido: abre suscripción `watchPositionAsync` (accuracy `BestForNavigation`, `distanceInterval: 3`).
  - Si `accuracy >= 20` → `userPosition.searching = true`, svgX/Y desde `ZOO_ENTRANCE_SVG`.
  - Si `accuracy < 20` → `userPosition.searching = false`, svgX/Y desde `geoTransform(lat, lon)`.
  - Al desmontar → cancela suscripción.
  - Si denegado → `permissionGranted = false`, `userPosition = null`.
  - Resultado comprobable: hook exportado, TypeScript sin errores.

### Bloque 4 — Modelo de datos

- [x] **T-24** (CA-11, RN-13): Actualizar `MapPlace` en `src/models/index.ts`:
  - Añadir campos opcionales `gpsLat?: number` y `gpsLon?: number`.
  - Resultado comprobable: `tsc --noEmit` sin errores, ningún archivo existente se rompe.

- [x] **T-25** (RN-13): Actualizar `MOCK_MAP_PLACES` en `src/mocks/zoo.ts`:
  - Añadir `gpsLat` y `gpsLon` sintéticos a cada POI (coordenadas dentro de `ZOO_BOUNDS`).
  - Comentar cada valor con `// TODO: reemplazar con medición real`.
  - Resultado comprobable: Jest sigue en verde, sin errores de tipo.

### Bloque 5 — Componentes visuales

- [x] **T-26** (CA-09, CA-10): Crear `src/components/map/UserLocationMarker.tsx`:
  - Círculo azul (token semántico `color.brand.primary` o equivalente; **no** color fijo hex).
  - Tamaño: 16 px de diámetro.
  - Cuando `searching = true`: anillo exterior con `Animated.loop` (pulsa).
  - Cuando `searching = false`: solo el círculo sólido.
  - `testID="user-location-marker"` y `testID="location-searching"` (anillo) para tests.
  - Se posiciona con `position: 'absolute'` usando `svgX`/`svgY` como porcentaje del contenedor (`svgX / SVG_WIDTH * 100 + '%'`).
  - Accesibilidad: `accessibilityLabel="Tu ubicación actual"`.
  - Resultado comprobable: componente renderiza sin errores con props de prueba.

- [x] **T-27** (CA-09, CA-10): Exportar `UserLocationMarker` desde `src/components/map/index.ts`.

### Bloque 6 — Integración en pantalla

- [x] **T-28** (CA-08, CA-09, CA-10, CA-13): Actualizar `src/screens/MapScreen.tsx`:
  - Importar y llamar `useLocationViewModel()`.
  - Renderizar `<UserLocationMarker>` solo cuando `permissionGranted && userPosition !== null`.
  - Si `!permissionGranted`: mapa funciona igual que V1, sin ningún mensaje de error GPS.
  - `useLocationViewModel` se inyecta como prop opcional para facilitar el test (igual que `repository` en el ViewModel del mapa).
  - Resultado comprobable: pantalla carga, sin regresiones en V1, TypeScript limpio.

### Bloque 7 — Tests de integración de pantalla

- [x] **T-29** (CA-08): Test en `__tests__/mapScreen.test.tsx` — permiso denegado:
  - Mock `mockDenied()` → renderizar `MapScreen`.
  - Verificar que `UserLocationMarker` **no** aparece en el árbol.
  - Verificar que los filtros, marcadores y cards de V1 siguen funcionando.

- [x] **T-30** (CA-09): Test en `__tests__/mapScreen.test.tsx` — GPS con buena señal:
  - Mock `mockGranted(5, lat, lon)` → renderizar `MapScreen`.
  - Verificar que `testID="user-location-marker"` está presente.
  - Verificar que `testID="location-searching"` **no** está presente.

- [x] **T-31** (CA-10): Test en `__tests__/mapScreen.test.tsx` — GPS buscando señal:
  - Mock `mockSearching()` (accuracy 50 m) → renderizar `MapScreen`.
  - Verificar que `testID="user-location-marker"` está presente.
  - Verificar que `testID="location-searching"` está presente (anillo pulsante).

- [x] **T-32** (CA-13): Test en `__tests__/mapScreen.test.tsx` — modo degradado:
  - Mock `mockDenied()` → renderizar `MapScreen` con un `focusedPlaceId`.
  - Verificar que CA-04 (filtros) y CA-05 (foco desde búsqueda) siguen pasando sin errores.

### Bloque 8 — Documentación y verificación final

- [x] **T-33**: Crear `apps/mobile/docs/007-map-v2-coords.md`:
  - Tabla con columnas: `POI`, `gpsLat (prueba)`, `gpsLon (prueba)`, `gpsLat (real)`, `gpsLon (real)`.
  - Una fila por POI del fixture + fila de entrada principal + fila de las 4 esquinas del zoo.
  - Columnas "real" vacías con nota "pendiente de medición en campo".

- [x] **T-34**: Ejecutar `npx tsc --noEmit` en `apps/mobile` → 0 errores.

- [x] **T-35**: Ejecutar suite completa de Jest en `apps/mobile` → todas las suites en verde (incluyendo T-29 a T-32 y T-21).

- [x] **T-36**: Actualizar `docs/003-008-roadmap-y-asignacion.md` → fila 007 refleja estado de V2 punto azul.

---

## Notas

- **CA-12 (llegada) y la línea al destino** quedan fuera de este bloque. Se implementarán en una enmienda V2.1 con su propio plan y tasks cuando se decida.
- **Coordenadas reales:** cuando el zoológico envíe foto/video, se actualizan únicamente `zoo.ts` y `MOCK_MAP_PLACES` — sin tocar ningún otro archivo de código.
- El test de arquitectura (`architecture.test.ts`) debe seguir aprobado: sin colores hex fijos ni lógica en componentes.
