# Tareas · 017 · canonical-zoo-map-svg

- Spec: `apps/mobile/specs/017-canonical-zoo-map-svg.md`
- Plan: `apps/mobile/plan/017-canonical-zoo-map-svg.md`

## Base de datos / datos (responsable de BD)

- [x] **T-01** (CA-02, CA-04, RN-01): Registrar evidencia de carga `map_x/map_y` DBR-019 en `arca_pruebas` usando seeder controlado `Dbr019MapCoordinatesSeeder`; mantener mapeos ambiguos como pendientes de revisión. No SQL manual.

## Implementación

- [x] **T-02** (CA-01, CA-05, CA-06): Versionar SVG canónico en `apps/mobile/src/assets/map/` y convertir `ZooMapSvg.tsx` a viewBox `1600x1200` con capas canónicas, IDs estables y sin `icons_auto` decorativo.
- [x] **T-03** (CA-07, CA-08, RN-02): Actualizar `constants/zoo.ts`, `geoTransform.ts` y `mapViewport.ts` al contrato 1600x1200 con calibración provisional documentada.
- [x] **T-04** (CA-02, CA-03, CA-04, RN-01, RN-05): Actualizar mappers/modelos/repositorio para priorizar `map_x/map_y`, fallback GPS recalibrado, y marcadores de `zoo_places`; omitir posiciones falsas.
- [x] **T-05** (CA-04, CA-07, CA-09): Actualizar `MapScreen`, `MapMarker`, `DestinationRouteLine`, `UserLocationMarker` para nuevo viewBox, marcadores de datos, accesibilidad y estados en español.
- [x] **T-06** (CA-07, RN-07): Recalibrar `zooPaths.ts`/`pathfinding`/`tourPlanner` al viewBox 1600x1200 manteniendo ruta azul 2D; documentar calibración provisional.
- [x] **T-07** (CA-05): Crear artefacto versionado de mapeo `svg_id`↔BD con estado claro/ambiguo/pendiente.

## Pruebas (CA-xx)

- [ ] **T-08** (CA-01, CA-05, CA-06): Test `ZooMapSvg` renderiza viewBox 1600x1200, IDs estables y ausencia de `icons_auto`. (pendiente crear/ejecutar)
- [ ] **T-09** (CA-02, CA-03): Tests de mappers/geoTransform para prioridad `map_x/map_y`, fallback GPS 1600x1200 y no marcador falso. (geoTransform existente compatible por constantes; faltan casos 017)
- [ ] **T-10** (CA-04, CA-09): Tests de MapScreen/markers para `zoo_places`, estados loading/error/empty/retry y accesibilidad. (pendiente)
- [ ] **T-11** (CA-07, CA-08): Tests de viewport, DestinationRouteLine, UserLocationMarker y constantes/geoTransform con viewBox 1600x1200. (pendiente)
- [ ] **T-12** (CA-10): Ejecutar suite mobile relevante/completa, registrar resultados y limitaciones visuales/dispositivo. **Bloqueado en este entorno: `node`/`npm`/`jest` no disponibles en PATH.**

## Calidad y entrega

- [ ] **T-13** (CA-10): Actualizar docs mobile/DBR evidencia afectada y preparar resumen con trazabilidad spec/plan/tasks.