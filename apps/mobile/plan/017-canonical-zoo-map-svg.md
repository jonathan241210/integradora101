# Plan técnico · 017 · canonical-zoo-map-svg

- Spec: `apps/mobile/specs/017-canonical-zoo-map-svg.md`
- Estado de spec: Aprobada
- Responsable técnico: Por confirmar

## Diseño de solución

Se reemplaza el mapa esquemático hardcodeado (`ZooMapSvg`, `1000x1400`) por un mapa canónico basado en el SVG mejorado del zoológico (`1600x1200`). El SVG canónico se versiona en el repo y se renderiza como componente React Native SVG, manteniendo la capa visual (caminos, recintos, zoo_places, contorno) y eliminando marcadores decorativos `icons_auto` como fuente de verdad.

La posición 2D usa `map_x/map_y` normalizados (0..1) desde API/BD como fuente principal; cuando faltan, se usa fallback `geoTransform` recalibrado al nuevo viewBox. Los overlays existentes (`MapMarker`, `UserLocationMarker`, `DestinationRouteLine`) y el viewport/pan/zoom se recalibran al contrato único `SVG_WIDTH=1600`, `SVG_HEIGHT=1200`.

La ruta azul 2D se conserva. `zooPaths.ts` se recalibra manualmente al nuevo viewBox para evitar desalineación, con calibración provisional documentada hasta contar con ruta DB/artefacto aprobado.

## Cambios por área

| Área/app | Archivos o módulos previstos | Propósito |
|---|---|---|
| Mobile / asset y mapa | `apps/mobile/src/assets/map/zoo-map-canonical.svg` (o fuente equivalente), `apps/mobile/src/components/map/ZooMapSvg.tsx` | Versionar SVG canónico y renderizarlo con viewBox `1600x1200`, IDs estables y sin `icons_auto` decorativo. |
| Mobile / constantes y geo | `apps/mobile/src/constants/zoo.ts`, `apps/mobile/src/utils/geoTransform.ts`, `apps/mobile/src/utils/mapViewport.ts` | Actualizar contrato de viewBox, calibración provisional GPS (`ZOO_BOUNDS`, entrada) y límites de pan/zoom. |
| Mobile / datos y mapeo | `apps/mobile/src/repositories/mappers.ts`, `apps/mobile/src/models/index.ts`, `apps/mobile/src/repositories/apiMapRepository.ts` | Normalizar `map_x/map_y`, fallback GPS, y exponer `zoo_places`/recintos para marcadores de datos; evitar posición falsa. |
| Mobile / UI mapa | `apps/mobile/src/screens/MapScreen.tsx`, `apps/mobile/src/components/map/MapMarker.tsx`, `DestinationRouteLine.tsx`, `UserLocationMarker.tsx`, `index.ts` | Renderizar marcadores de recintos y `zoo_places` con `map_x/map_y`, mantener ruta azul, pan/zoom, estados y accesibilidad. |
| Mobile / ruta | `apps/mobile/src/constants/zooPaths.ts`, `apps/mobile/src/utils/pathfinding.ts`, `apps/mobile/src/utils/tourPlanner.ts` | Recalibrar grafo/ruta azul a 1600x1200; mantener fallback temporal documentado. |
| Mobile / tests | `apps/mobile/__tests__/**` (map, geoTransform, mappers, MapScreen, route/viewport) | Cobertura por CA-xx y regresión de viewBox/coords. |
| Datos/DBR | `apps/api/src/database/data/dbr019-*.json`, `apps/api/src/database/seeders/Dbr019MapCoordinatesSeeder.php`, `docs/database/requests/DBR-019-zoo-places-and-path-nodes.md` | Evidencia y carga controlada de `map_x/map_y`; sin cambio de esquema. |
| Docs | `apps/mobile/docs/` (nota de calibración/mapa canónico), spec/plan/tasks 017 | Trazabilidad, calibración provisional y limitaciones. |

## Contrato y datos

- **ViewBox canónico:** `0 0 1600 1200`. Constantes únicas: `SVG_WIDTH=1600`, `SVG_HEIGHT=1200`.
- **Coordenadas:** `map_x/map_y` son normalizados 0..1 sobre el viewBox canónico. Si existen, tienen prioridad. Si no existen y hay GPS, usar `geoTransform` recalibrado. Si no hay datos confiables, no renderizar marcador 2D falso.
- **Endpoints existentes:** `GET /api/v1/enclosures`, `GET /api/v1/zoo-places`, `GET /api/v1/path-nodes` (ya presentes en API). No se agregan endpoints nuevos salvo necesidad aprobada.
- **DBR:** DBR-019/DBR-008 cubren columnas `map_x/map_y`. No hay cambio de esquema. Carga/actualización de `map_x/map_y` por seeder/comando controlado, ejecutado por responsable de BD, con evidencia en DBR-019. No SQL manual.
- **Mapeo `svg_id`↔BD:** artefacto versionado en repo (JSON/CSV) con estado `claro/ambiguo/pendiente`. `svg_id` no se persiste en BD en esta fase.
- **Compatibilidad:** clientes toleran `map_x/map_y` null; API sigue siendo autoridad.

## Seguridad, offline y operación

- Sin datos personales nuevos. Ubicación solo con permiso ya existente.
- No exponer secretos; SVG y artefactos de mapeo no contienen credenciales.
- Offline: mapa base SVG empaquetado en app; datos de recintos/lugares usan caché local existente cuando aplica.
- Rendimiento: evitar recalcular bboxes en runtime; el SVG canónico se convierte a JSX estático/optimizado. Revisar tamaño del componente.
- Portabilidad: sin dependencias de mapa externas; RN-SVG ya aprobado por ADR 0015.

## Mapeo de criterios a pruebas

| Criterio | Prueba automatizada | App/ubicación |
|---|---|---|
| CA-01 SVG canónico 1600x1200 | Render test de `ZooMapSvg` verifica `viewBox="0 0 1600 1200"` y presencia de capas/caminos/recintos; no referencia 1000x1400 | `apps/mobile/__tests__/components/map/ZooMapSvg.test.tsx` |
| CA-02 Contrato de coordenadas | Unit test de mapper: usa `map_x/map_y` normalizados cuando existen; no usa GPS fallback | `apps/mobile/__tests__/repositories/mappers.test.ts` |
| CA-03 Fallback GPS | Unit test de mapper/geoTransform: sin `map_x/map_y` y con GPS usa `geoTransform` 1600x1200; sin coords no genera marcador falso | `apps/mobile/__tests__/repositories/mappers.test.ts`, `__tests__/utils/geoTransform.test.ts` |
| CA-04 Zoo places visibles | UI test MapScreen/ZooMapSvg/marker: renderiza `zoo_places` con `map_x/map_y` y diferenciación visual/accesible | `apps/mobile/__tests__/screens/MapScreen.test.tsx` |
| CA-05 IDs SVG estables | Test de componente/artefacto: formas mapeables exponen IDs estables; artefacto de mapeo contiene `svg_id` y estado | `apps/mobile/__tests__/components/map/ZooMapSvg.test.tsx`, `__tests__/data/canonicalMapMapping.test.ts` |
| CA-06 Sin capa decorativa engañosa | Render test: no existen nodos `icons_auto`/marcadores decorativos en el SVG canónico renderizado | `apps/mobile/__tests__/components/map/ZooMapSvg.test.tsx` |
| CA-07 Recalibración de overlays | Tests de viewport/ruta/marker: `DestinationRouteLine` viewBox 1600x1200, `UserLocationMarker` y pan/zoom usan nuevas constantes | `apps/mobile/__tests__/components/map/DestinationRouteLine.test.tsx`, `__tests__/utils/mapViewport.test.ts` |
| CA-08 GeoTransform y constantes | Unit test: `SVG_WIDTH/HEIGHT` 1600/1200, `geoTransform` dentro de rango y fallback entrada | `apps/mobile/__tests__/utils/geoTransform.test.ts`, `__tests__/constants/zoo.test.ts` |
| CA-09 Estados y accesibilidad | Screen test: loading/error/empty/retry en español; labels accesibles en marcadores/controles | `apps/mobile/__tests__/screens/MapScreen.test.tsx` |
| CA-10 Pruebas por criterio | Suite mobile pasa; nombres de test referencian CA-xx; limitaciones visuales/device registradas en docs | `apps/mobile/__tests__/**`, `apps/mobile/docs/017-canonical-zoo-map-svg.md` |

## Constitution Check

| Principio | Cumple | Evidencia o excepción propuesta |
|---|---|---|
| I. Stack mínimo y portable | Sí | RN-SVG ya aprobado; sin proveedor de mapas externo. Datos por MySQL/API/`.env`. |
| II. La spec manda | Sí | Spec `017-canonical-zoo-map-svg.md` Aprobada 2026-11-22; plan/tasks con mismo NNN. |
| III. Lógica separada de la interfaz | Sí | Transformación/calibración en utils/constants/mappers; ViewModel orquesta; componentes renderizan. |
| IV. Un test por criterio | Sí | CA-01..CA-10 mapeados a pruebas automatizadas Jest. |
| V. Una sola fuente de verdad para los datos | Sí | BD/API autoritativa; `map_x/map_y` en DBR-019/008; artefacto SVG-mapeo versionado; no SQL manual. |
| VI. Código en inglés, personas en español | Sí | Código/rutas/IDs en inglés; UI, docs, spec/plan/tasks en español. |

Ninguna excepción se implementa sin revisión y acuerdo requeridos. Si algo no cumple, detenerse y resolverlo antes del código.

## Riesgos y decisiones

- **ADR requerido/aprobado:** No se prevé ADR nuevo; RN-SVG cubierto por ADR 0015. Si se introduce transformador SVG o dependencia nueva, ADR antes de implementar.
- **Riesgo calibración:** `ZOO_BOUNDS` provisional puede desplazar punto azul. Mitigar con constantes centralizadas, prueba de transformación y nota de calibración.
- **Riesgo mapeo ambiguo:** algunos `svg_id` tienen match probable; mantener artefacto con estado y no sobrescribir sin revisión.
- **Riesgo regresión AR/ruta:** AR usa GPS; 2D usa `map_x/map_y`/viewBox. Validar que cambio de viewBox no rompe overlays AR existentes.
- **Riesgo tamaño SVG:** componente grande; limpiar metadatos Inkscape innecesarios y evitar duplicación de estilos.

## Orden y aprobación

1. Versionar SVG canónico en repo y definir artefacto de mapeo `svg_id`↔BD.
2. Actualizar constantes/geoTransform/mapViewport a `1600x1200`.
3. Convertir `ZooMapSvg` al mapa canónico (sin `icons_auto`, con IDs estables).
4. Actualizar mappers/markers para `map_x/map_y` + fallback GPS + `zoo_places`.
5. Recalibrar `DestinationRouteLine`, `UserLocationMarker`, `zooPaths/tourPlanner`.
6. Actualizar/crear tests CA-01..CA-10 y ejecutar suite mobile.
7. Registrar evidencia DBR-019 y limitaciones de calibración/dispositivo.

- **Aprobación requerida:** técnica y funcional. Con spec aprobada, este plan queda listo para aprobación técnica antes de `/sdd-tasks` e implementación.