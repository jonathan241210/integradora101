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
