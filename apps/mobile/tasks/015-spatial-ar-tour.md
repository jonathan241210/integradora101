# Tareas · 015 · Recorrido AR location-based con recintos, `zoo_places` y ruteo por nodos

- Solicitada: 2026-11-20
- Aprobada: 2026-11-20
- Spec: `apps/mobile/specs/015-spatial-ar-tour.md` (Aprobada)
- Plan: `apps/mobile/plan/015-spatial-ar-tour.md` (Borrador técnico presentado, pendiente aprobación técnica)

## Base de datos (responsable de BD)

- [x] **T-01** (CA-05, CA-06, RN-02): Confirmar estado de DBR-019/DBR-008 como fuente para `enclosures`, `zoo_places`, `path_nodes`. Evidencia (consulta en solo lectura a `arca_pruebas`): existen `zoo_places` y `path_nodes`; `path_edges` no existe; `enclosures` tiene `gps_lat/gps_lon/map_x/map_y`.
- [ ] **T-02** (CA-06, RN-06): Crear DBR aprobada para `path_edges` (fase 2) con responsable de BD: conectividad, bidireccionalidad, peso/distancia, estado activo/bloqueado, FKs, índices, SoftDeletes/auditoría según aplique. **Bloquea CA-06 completo por BD**; no implementar migración desde mobile.

## Contrato API / datos (coordinación con `apps/api`)

- [x] **T-03** (CA-03, CA-05, CA-09, RN-02): Contrato de lectura inicial implementado en API: `GET /api/v1/enclosures` (existente), `GET /api/v1/zoo-places`, `GET /api/v1/path-nodes` (nuevos, rutas nombradas). Filtros: `enclosures.is_active`, `zoo_places.is_visible`, soft deletes.
- [~] **T-04** (CA-05, CA-09): Endpoints/modelos/resources/actions creados en `apps/api` (`ZooPlace`, `PathNode`, resources, actions, controllers, rutas). **Pendiente:** tests PHPUnit que nombren CA afectados y spec/contrato API formal si se requiere.

## Implementación mobile

- [x] **T-05** (CA-03, CA-04, CA-05, RN-03, RN-04, RN-07): Creadas utilidades location-based puras en `apps/mobile/src/utils/arLocationMath.ts`: bearing GPS, FOV 50°, rango 5-80 m, máx. 6 puntos, prioridad por cercanía/centro FOV, etiqueta ≤40 m, validación de coords/heading.
- [x] **T-06** (CA-03, CA-04): Agregados tests `apps/mobile/__tests__/arLocationMath.test.ts` que nombran **CA-03** y **CA-04** (4 pruebas, PASS).
- [~] **T-07** (CA-05, CA-09, RN-02): `ApiMapRepository` extendido con `getZooPlaces()`/`getPathNodes()`, caché y claves (`@arca:zoo_places_cache`, `@arca:path_nodes_cache`); `useMapViewModel` carga `zooPlaces` y `pathNodes`. **Pendiente:** payload offline mínimo de animales por recinto explícitamente versionado y pruebas dedicadas.
- [ ] **T-08** (CA-05, CA-09): Agregar tests que nombren **CA-05** y **CA-09** para mapeo de contrato, caché offline, datos faltantes y exclusión de registros no visibles/eliminados.
- [x] **T-09** (CA-01, CA-07, CA-08, RN-08): `MapScreen`/overlay actualizados a solo **Mapa 2D** y **AR**; eliminado toggle/modo 3D sin cámara y `ArVisualMode`. Botón actualizado a "Iniciar AR".
- [x] **T-10** (CA-01, CA-07): `arTourOverlay.test.tsx` actualizado con tests que nombran **CA-01** y **CA-07** (modos disponibles, cierre/vuelta a Mapa 2D).
- [x] **T-11** (CA-02, CA-03, CA-04, CA-08, RN-01, RN-03, RN-04, RN-05): Reemplazado `ThreeTourScene` por `LocationArScene` (cámara + puntos azules location-based). Sin línea azul/flechas SVG antiguas; aviso de baja precisión/calibración; render progresivo por FOV/rango.
- [x] **T-12** (CA-02, CA-03, CA-08): `arTourOverlay.test.tsx` incluye tests que nombran **CA-02**, **CA-03** y **CA-08** (sin overlay antiguo, puntos de recintos cercanos, cierre/liberación de flujo).
- [x] **T-13** (CA-06, RN-06): Fallback temporal confirmado: ruteo sigue usando `zooPaths.ts` (`pathfinding.ts`); no se inventan aristas. `path_nodes` se cargan desde API/caché para integración futura; `path_edges` queda diferido.
- [x] **T-14** (CA-06): `pathfinding.test.ts` incluye test que nombra **CA-06** para fallback con `zooPaths.ts` y grafo inválido/sin aristas sin ruta inventada. CA-06 completo por BD diferido hasta T-02.
- [ ] **T-15** (CA-07, CA-08, RN-01): Revisar permisos, textos en español, accesibilidad de controles AR/Mapa 2D, y privacidad (sin captura/grabación). Ajustar labels/hints y estados de error.
- [ ] **T-16** (CA-07, CA-08): Agregar tests que nombren **CA-07** y **CA-08** para mensajes de permiso denegado, fallback, y ausencia de APIs de captura/grabación en el flujo AR.
- [~] **T-20** (CA-04b, CA-04c, RN-07): Implementar panel dinámico "Cerca de ti" en AR con recintos/`zoo_places` cercanos (GPS/FOV), selección por toque, tarjeta simple, llegada <=20 m y visitados en sesión. Quitar botones Anterior/Siguiente y flujo estático de tour. **En progreso (enmienda).**
- [x] **T-22** (CA-03, CA-05): Mostrar `path_nodes` cercanos como tarjeta contextual (no punto AR físico), usando datos GPS cargados desde API/caché. Evidencia: `nearbyPathNode` en `MapScreen` + `ar-nearby-path-node-card` en `ArTourOverlay`.
- [ ] **T-21** (CA-04b, CA-04c): Agregar tests que nombren **CA-04b** y **CA-04c** para panel cercano, selección, llegada y visitados en sesión.

## Calidad y entrega

- [ ] **T-17** (CA-10): Ejecutar verificaciones de `apps/mobile` (typecheck/lint/tests disponibles) y registrar resultados; agregar/ajustar test o chequeo automatizado que nombre **CA-10** para trazabilidad de criterios, y listar limitaciones de prueba en dispositivo real (GPS/brújula/cámara).
- [ ] **T-18** (CA-10): Actualizar docs de mobile afectadas (mapa/AR/009-015), registrar decisión de fallback `path_edges` y enlazar spec, plan y tasks en PR.
- [ ] **T-19**: Revisión final de trazabilidad: cada CA-01..CA-10/CA-04b/CA-04c tiene al menos un test que lo nombra; estado de CA-06 parcial por BD claramente documentado.