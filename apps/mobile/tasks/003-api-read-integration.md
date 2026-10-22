# Tareas · 003 · api-read-integration

- Spec: `apps/mobile/specs/003-api-read-integration.md`
- Plan: `apps/mobile/plan/003-api-read-integration.md`
- ADR de caché y conectividad: `docs/adr/0014-mobile-offline-cache-and-connectivity.md` (Aceptado, 2026-10-22)

## Base de datos y datos de prueba (Responsable de BD)

- [x] **T-01** (CA-01, CA-03): Crear script de datos de prueba en `docs/database/fixtures/sample-catalog-events.sql` con 5 especies (`species`, `animals`, `enclosures`) y 3 eventos (`events`) para entorno local y de desarrollo en `arca_pruebas`.

## Implementación

### Fase 1: Capa de Red, Mapeadores y Repositorios
- [x] **T-02** (CA-01, CA-02, RN-02): Crear adaptadores de mapeo en `apps/mobile/src/repositories/mappers.ts` para normalizar respuestas de la API de `snake_case` a modelos de dominio en `camelCase` (`mapSpeciesToAnimalModel`, `mapEventToZooEventModel`), tolerando el contrato de `api-006` (`photo_path`, `size_cm`, `longevity`, `diet`, `characteristics`, `zone_name`) y campos legados.
- [x] **T-03** (CA-01, CA-02, CA-05, RN-01, RN-03): Implementar `ApiAnimalRepository` en `apps/mobile/src/repositories/apiAnimalRepository.ts` usando `createHttpClient` de `@arca/api-client` y persistencia con `AsyncStorage` bajo estrategia *Stale-While-Revalidate* (TTL de 5 minutos).
- [x] **T-04** (CA-03, CA-05, RN-01, RN-03): Implementar `ApiZooRepository` en `apps/mobile/src/repositories/apiZooRepository.ts` ampliando la interfaz con `getEvents()` y `getEventById(id: string)` consumiendo la API y manejando caché local en `AsyncStorage`.
- [x] **T-05** (CA-01, CA-03, RN-01): Actualizar `apps/mobile/src/repositories/index.ts` para exponer interfaces extendidas y alternar entre implementaciones mock y API según la variable `EXPO_PUBLIC_USE_MOCKS`.
- [x] **T-06** (CA-05, ADR 0014): Reemplazar el almacenamiento en memoria por `AsyncStorage` real en `apps/mobile/src/repositories/storage.ts`; conservar `MemoryKeyValueStorage` solo para inyección en pruebas.
  - 2026-10-22: `npx expo install @react-native-async-storage/async-storage expo-network` (4 paquetes); `defaultStorage` apunta a `AsyncStorage`.

### Fase 2: Componentes Reutilizables de Presentación
- [x] **T-07** (CA-04, RN-04, RN-06): Crear componente de banner offline `apps/mobile/src/components/ui/OfflineBanner.tsx` para advertir sutilmente al usuario cuando la información proviene de caché local sin conexión.
- [x] **T-08** (CA-04, RN-04, RN-06): Crear vistas de estado en `apps/mobile/src/components/ui/StateViews.tsx` (carga, lista vacía amigable en español y vista de error con botón accesible de reintento).
- [x] **T-09** (CA-06): Crear componente `RemoteImage` tolerante a fallos en `apps/mobile/src/components/ui/RemoteImage.tsx` con indicador de carga, fallback predeterminado y color temático de respaldo (`placeholderTint`).

### Fase 3: ViewModels y Pantallas Móviles
- [x] **T-10** (CA-01, CA-03, CA-04): Actualizar `useHomeViewModel` y `HomeScreen` en `apps/mobile/src/viewmodels/useHomeViewModel.ts` y `apps/mobile/src/screens/HomeScreen.tsx` para manejar los 5 estados de vista (`loading`, `success`, `empty`, `error`, `offline`) al mostrar animales destacados y eventos.
- [x] **T-11** (CA-02, CA-04, CA-06): Actualizar `useAnimalViewModel` y `AnimalDetailScreen` en `apps/mobile/src/viewmodels/useAnimalViewModel.ts` y `apps/mobile/src/screens/AnimalDetailScreen.tsx` para soportar consumo del detalle vía API con manejo de 404, fallback de imagen y estados visuales.
- [x] **T-12** (CA-03, CA-04): Actualizar la pantalla de detalle de evento `apps/mobile/src/app/(tabs)/event-detail.tsx` para consultar `getEventById` desde `ZooRepository`, soportando estados de carga, error y visualización completa.
- [x] **T-13** (CA-04, ADR 0014): Crear `apps/mobile/src/viewmodels/useNetworkStatus.ts` con `expo-network`; mostrar `OfflineBanner` en Inicio, Colección, Búsqueda y detalles de animal y evento.
  - 2026-10-22: `isOffline` se pasa desde `(tabs)/index.tsx`, `(tabs)/collection.tsx`, `(tabs)/search.tsx`, `animal/[id].tsx` y `(tabs)/event-detail.tsx`.
- [x] **T-14** (CA-02, UX): ocultar la tarjeta «Peso» y cualquier estadística vacía en `AnimalDetailScreen` en lugar de mostrar un valor en blanco.

### Fase 4: Pruebas Automatizadas Unitarias (Jest)
- [x] **T-15** (CA-01, CA-02, CA-05, CA-07): Crear suite de pruebas `apps/mobile/__tests__/apiAnimalRepository.test.ts` con cliente simulado (`createHttpClient`), verificando mapeo `snake_case` a `camelCase`, detalle por ID y comportamiento de caché SWR con TTL de 5 minutos.
- [x] **T-16** (CA-03, CA-05, CA-07): Crear suite de pruebas `apps/mobile/__tests__/apiZooRepository.test.ts` verificando listado y detalle de eventos y fallback a caché.
- [x] **T-17** (CA-04, CA-06, CA-07): Crear suite de pruebas `apps/mobile/__tests__/catalogUiStates.test.tsx` validando el renderizado de los 5 estados (`loading`, `empty`, `error` con reintento, `success` y banner `offline`) y fallback de imágenes.
- [x] **T-18** (CA-04, ADR 0014): Agregar `apps/mobile/__tests__/networkStatus.test.tsx` para verificar que `useNetworkStatus` marca offline con `isConnected === false` o `isInternetReachable === false`, y que el banner se renderiza en los detalles.
  - 2026-10-22: 5 tests en verde (3 del hook y 2 de los detalles).
- [x] **T-19** (CA-05): Ajustar `jest.setup.js` con los mocks oficiales de `AsyncStorage` y `expo-network`, y limpiar la caché entre pruebas.

## Calidad y entrega

- [x] **T-20** (CA-07): Ejecutar la suite completa de pruebas unitarias de la app móvil con `--runInBand` y `npx tsc --noEmit`; confirmar todo en verde.
  - 2026-10-22: 15 suites y 86 tests en verde; `tsc --noEmit` sin errores.
- [x] **T-21**: Ejecutar verificación con `/verify` sin instalar dependencias no autorizadas y validar que no existan violaciones constitucionales.
  - 2026-10-22: `npm test -- --runInBand` (15 suites, 86 tests) y `npx tsc --noEmit` en verde; `pint --test` dirigido a los archivos de `api-006` pasa; `git diff --check` sin errores (solo avisos LF/CRLF). `apps/mobile/package.json` no define `format:check`, `lint` ni `types`; se ejecutó `tsc` directamente.
- [x] **T-22**: Actualizar la documentación local de la app en `apps/mobile/docs/` para reflejar AsyncStorage, `expo-network` y el contrato real de `api-006`.
  - 2026-10-22: actualizados `arquitectura.md`, `estandares-integracion-api.md` y `003-008-roadmap-y-asignacion.md`.

## Evidencia

- 2026-10-20: spec aprobada y primeras fases implementadas con almacenamiento en memoria.
- 2026-10-22: ADR 0014 aceptado; `AsyncStorage` y `expo-network` instalados, hook de conectividad y banner integrados; pendiente cerrar pruebas y verificación.
