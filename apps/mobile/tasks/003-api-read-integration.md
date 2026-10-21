# Tareas · 003 · api-read-integration

- Spec: `apps/mobile/specs/003-api-read-integration.md`
- Plan: `apps/mobile/plan/003-api-read-integration.md`

## Base de datos y datos de prueba (Responsable de BD)

- [x] **T-01** (CA-01, CA-03): Crear script de datos de prueba en `docs/database/fixtures/sample-catalog-events.sql` con 5 especies (`species`, `animals`, `enclosures`) y 3 eventos (`events`) para entorno local y de desarrollo en `arca_pruebas`.

## Implementación

### Fase 1: Capa de Red, Mapeadores y Repositorios
- [x] **T-02** (CA-01, CA-02, RN-02): Crear adaptadores de mapeo en `apps/mobile/src/repositories/mappers.ts` para normalizar respuestas de la API de `snake_case` a modelos de dominio en `camelCase` (`mapSpeciesToAnimalModel`, `mapEventToZooEventModel`).
- [x] **T-03** (CA-01, CA-02, CA-05, RN-01, RN-03): Implementar `ApiAnimalRepository` en `apps/mobile/src/repositories/apiAnimalRepository.ts` usando `createHttpClient` de `@arca/api-client` y persistencia con `AsyncStorage` bajo estrategia *Stale-While-Revalidate* (TTL de 5 minutos).
- [x] **T-04** (CA-03, CA-05, RN-01, RN-03): Implementar `ApiZooRepository` en `apps/mobile/src/repositories/apiZooRepository.ts` ampliando la interfaz con `getEvents()` y `getEventById(id: string)` consumiendo la API y manejando caché local en `AsyncStorage`.
- [x] **T-05** (CA-01, CA-03, RN-01): Actualizar `apps/mobile/src/repositories/index.ts` para exponer interfaces extendidas y alternar entre implementaciones mock y API según la variable `EXPO_PUBLIC_USE_MOCKS`.

### Fase 2: Componentes Reutilizables de Presentación
- [x] **T-06** (CA-04, RN-04, RN-06): Crear componente de banner offline `apps/mobile/src/components/ui/OfflineBanner.tsx` para advertir sutilmente al usuario cuando la información proviene de caché local sin conexión.
- [x] **T-07** (CA-04, RN-04, RN-06): Crear vistas de estado en `apps/mobile/src/components/ui/StateViews.tsx` (carga, lista vacía amigable en español y vista de error con botón accesible de reintento).
- [x] **T-08** (CA-06): Crear componente `RemoteImage` tolerante a fallos en `apps/mobile/src/components/ui/RemoteImage.tsx` con indicador de carga, fallback predeterminado y color temático de respaldo (`placeholderTint`).

### Fase 3: ViewModels y Pantallas Móviles
- [x] **T-09** (CA-01, CA-03, CA-04): Actualizar `useHomeViewModel` y `HomeScreen` en `apps/mobile/src/viewmodels/useHomeViewModel.ts` y `apps/mobile/src/screens/HomeScreen.tsx` para manejar los 5 estados de vista (`loading`, `success`, `empty`, `error`, `offline`) al mostrar animales destacados y eventos.
- [x] **T-10** (CA-02, CA-04, CA-06): Actualizar `useAnimalViewModel` y `AnimalDetailScreen` en `apps/mobile/src/viewmodels/useAnimalViewModel.ts` y `apps/mobile/src/screens/AnimalDetailScreen.tsx` para soportar consumo del detalle vía API con manejo de 404, fallback de imagen y estados visuales.
- [x] **T-11** (CA-03, CA-04): Actualizar la pantalla de detalle de evento `apps/mobile/src/app/(tabs)/event-detail.tsx` para consultar `getEventById` desde `ZooRepository`, soportando estados de carga, error y visualización completa.

### Fase 4: Pruebas Automatizadas Unitarias (Jest)
- [x] **T-12** (CA-01, CA-02, CA-05, CA-07): Crear suite de pruebas `apps/mobile/src/__tests__/apiAnimalRepository.test.ts` con cliente simulado (`createHttpClient`), verificando mapeo `snake_case` a `camelCase`, detalle por ID y comportamiento de caché SWR con TTL de 5 minutos.
- [x] **T-13** (CA-03, CA-05, CA-07): Crear suite de pruebas `apps/mobile/src/__tests__/apiZooRepository.test.ts` verificando listado y detalle de eventos y fallback a caché.
- [x] **T-14** (CA-04, CA-06, CA-07): Crear suite de pruebas `apps/mobile/src/__tests__/catalogUiStates.test.ts` validando el renderizado de los 5 estados (`loading`, `empty`, `error` con reintento, `success` y banner `offline`) y fallback de imágenes.

## Calidad y entrega

- [x] **T-15** (CA-07): Ejecutar la suite completa de pruebas unitarias de la app móvil con `--runInBand` (`npm test -- --runInBand`) y confirmar 100% de tests en verde.
- [x] **T-16**: Ejecutar verificación con `/verify` sin instalar dependencias no autorizadas y validar que no existan violaciones constitucionales.
- [x] **T-17**: Actualizar la documentación local de la app en `apps/mobile/docs/` y enlazar spec, plan y tasks en la rama de trabajo.
