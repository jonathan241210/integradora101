# 017 · canonical-zoo-map-svg

- App dueña: `mobile`
- Apps/paquetes afectados: `mobile`; `apps/api` (solo consumo de datos existentes `map_x/map_y` en `enclosures`/`zoo_places`); `docs/database/requests/DBR-019-zoo-places-and-path-nodes.md` (evidencia/carga de datos, sin cambio de esquema previsto)
- Estado: Aprobada
- Solicitante / responsable funcional: Víctor Adrián
- Aprobación funcional: Víctor Adrián (2026-11-22)

## Problema y contexto

El mapa 2D actual de mobile (`ZooMapSvg.tsx`) es un SVG esquemático hardcodeado con `viewBox="0 0 1000 1400"`, zonas rectangulares ficticias (`zone-*`) y un grafo de rutas/transformación GPS calibrado a ese plano de prueba. En paralelo, el levantamiento de campo DBR-019 ya cargó GPS para recintos, `zoo_places` y `path_nodes`, y existen columnas `map_x/map_y` en BD para posicionamiento sobre un mapa canónico.

Se cuenta con un SVG mejorado basado en el croquis real del zoológico (`1600x1200`, capas `caminos`, `Recintos`, `zoo_places`, `contorno`), ya revisado visualmente por el solicitante. También se extrajeron y cargaron coordenadas `map_x/map_y` iniciales para 60 recintos y 5 lugares en `arca_pruebas` mediante seeder controlado DBR-019.

Esta spec define la integración del SVG canónico en mobile, el contrato de coordenadas normalizadas, el mapeo de IDs SVG a datos de BD, y la recalibración de capas que dependen del viewBox anterior. La ruta azul 2D se mantiene; no se rediseña su UX.

## Objetivos

- Reemplazar el mapa esquemático hardcodeado por el SVG canónico `1600x1200` del zoológico en la pestaña Mapa.
- Usar `map_x/map_y` normalizados como fuente principal para posicionar marcadores de recintos y `zoo_places` visibles; mantener fallback GPS solo cuando falten coordenadas de mapa.
- Definir un contrato estable de IDs/capas SVG para relacionar formas con datos (`enclosures` / `zoo_places`).
- Recalibrar `geoTransform`, viewport, overlays y grafo de ruta al nuevo viewBox, preservando pan/zoom, punto azul, ruta azul, estados de carga/vacío/error y accesibilidad.
- Mantener la integración mobile compatible con datos parciales: recintos/lugares sin `map_x/map_y` o sin forma SVG no bloquean el mapa.

## Fuera de alcance

- Rediseño de la ruta azul 2D o navegación paso a paso nueva.
- Implementación de `path_edges`/ruteo DB completo (fase 2 DBR-019).
- Edición del mapa desde web/admin.
- Captura automática en tiempo real de `map_x/map_y` desde la app.
- Cambios de esquema BD (las columnas `map_x/map_y` ya existen). Cualquier columna nueva de mapeo requerirá DBR aparte.
- Eliminación física de datos clínicos/financieros; no aplica.
- iOS, salvo compatibilidad incidental no verificada.

## Actores y permisos

| Actor/rol | Necesidad | Permisos requeridos |
|---|---|---|
| Visitante | Ver el mapa canónico del zoológico, ubicar recintos/lugares y orientarse con marcadores/ruta azul | Ninguno adicional; ubicación solo si ya fue otorgada (flujo existente) |
| Responsable de BD | Cargar/actualizar `map_x/map_y` y evidencia de mapeo | Proceso DBR/controlado; no desde mobile |
| Equipo mobile/backend | Mantener contrato de IDs y coordenadas | Acceso de desarrollo normal; sin secretos en cliente |

## Historias de usuario

- **HU-01 (Mapa canónico):** Como visitante, quiero ver el mapa real esquematizado del zoológico para ubicarme con una referencia fiel al recorrido.
- **HU-02 (Marcadores por datos):** Como visitante, quiero que los recintos y lugares visibles aparezcan en su posición del mapa para identificar dónde están.
- **HU-03 (Datos parciales):** Como visitante, quiero que el mapa funcione aunque falten coordenadas de algunos puntos, sin pantalla rota.
- **HU-04 (Compatibilidad de navegación):** Como visitante, quiero seguir usando zoom, pan, centrar ubicación y ruta azul sobre el nuevo mapa.

## Criterios de aceptación

- **CA-01 (SVG canónico 1600x1200):** Dado que el visitante abre la pestaña Mapa, cuando la pantalla carga, entonces se renderiza el SVG canónico con `viewBox 0 0 1600 1200`, fondo/caminos/recintos/lugares/contorno visibles, sin depender del SVG esquemático anterior de `1000x1400`.
- **CA-02 (Contrato de coordenadas):** Dado un recinto o `zoo_place` con `map_x` y `map_y` válidos (0..1), cuando se renderiza el mapa, entonces su marcador se posiciona usando esas coordenadas normalizadas sobre el viewBox canónico; no se usa GPS si `map_x/map_y` están presentes.
- **CA-03 (Fallback GPS):** Dado un recinto visible sin `map_x/map_y` pero con `gps_lat/gps_lon`, cuando se renderiza el mapa, entonces se usa `geoTransform` recalibrado al viewBox canónico; si no hay coordenadas utilizables, el punto no se dibuja en posición falsa y se registra/gestiona de forma controlada (sin crash).
- **CA-04 (Zoo places visibles):** Dado un `zoo_place` visible con `map_x/map_y`, cuando el mapa carga, entonces se muestra un marcador diferenciable de recinto; los `zoo_places` sin forma SVG pero con datos válidos pueden mostrarse como marcador de datos si tienen `map_x/map_y` o GPS calibrado, según regla definida en plan.
- **CA-05 (IDs SVG estables):** Dado el SVG canónico, cuando se inspecciona, entonces las formas mapeables tienen IDs estables (`svg_id`) para recintos y lugares; la relación `svg_id` ↔ registro DBR/BD queda documentada en artefacto de mapeo, no inferida por texto visible en UI.
- **CA-06 (Sin capa decorativa engañosa):** Dado el mapa canónico, cuando se renderiza, entonces no se muestran marcadores decorativos `icons_auto` como fuente de verdad; los marcadores visibles provienen de datos/mapeo.
- **CA-07 (Recalibración de overlays):** Dado el nuevo viewBox, cuando el usuario usa pan/zoom, centra ubicación, ve punto azul o ruta azul, entonces `DestinationRouteLine`, `UserLocationMarker`, viewport y cálculo de ruta operan en el mismo sistema de coordenadas `1600x1200` sin desplazamientos evidentes.
- **CA-08 (GeoTransform y constantes):** Dado el cambio de viewBox, cuando se revisa el código, entonces `SVG_WIDTH/SVG_HEIGHT` y calibración GPS (`ZOO_BOUNDS`/entrada) están actualizados y documentados como calibración vigente; las pruebas cubren la transformación.
- **CA-09 (Estados y accesibilidad):** Dado carga, vacío, error, sin conexión o datos parciales, cuando el visitante usa el mapa, entonces ve estados en español, puede reintentar, y los marcadores/controles mantienen etiquetas accesibles.
- **CA-10 (Pruebas por criterio):** Dada la suite de mobile, cuando se ejecuta, entonces existe al menos una prueba automatizada que nombra/cubre cada CA-xx aplicable y se registran limitaciones de validación visual/dispositivo.

## Reglas de negocio

- **RN-01 (Fuente de verdad):** La posición 2D de recintos/lugares proviene de `map_x/map_y` en BD cuando existe; GPS es fallback, no reemplazo silencioso.
- **RN-02 (Coordenadas normalizadas):** `map_x/map_y` se interpretan como valores normalizados 0..1 relativos al viewBox canónico del SVG. La convención se documenta en spec/plan/contrato.
- **RN-03 (SVG canónico congelado para captura):** Un cambio de geometría del SVG invalida coordenadas capturadas; cualquier recaptura requiere actualizar artefacto de mapeo y carga controlada DBR.
- **RN-04 (IDs estables):** Los IDs SVG usados para mapeo deben ser estables y no depender del nombre visible. El nombre visible se muestra en UI; el mapeo usa ID canónico.
- **RN-05 (Datos parciales):** Faltantes de `map_x/map_y` o de forma SVG no bloquean el mapa completo. Se prioriza no mostrar posición falsa.
- **RN-06 (Sin DBR de esquema implícita):** Esta spec no autoriza crear columnas/tablas. Si se requiere `svg_id` persistido u otra estructura, se tramita DBR separada aprobada antes de migración.
- **RN-07 (Ruta azul):** Se conserva la línea/ruta azul actual; solo se recalibra al nuevo sistema de coordenadas si es necesario para consistencia visual.

## Datos, privacidad y auditoría

- **Datos consultados:** `enclosures` (`id`, `name`, `gps_lat/lon`, `map_x/map_y`, `is_active`, animales asociados según contrato actual), `zoo_places` (`id`, `name`, `place_type`, `gps_lat/lon`, `map_x/map_y`, `is_visible`), `path_nodes` solo si aplica a ruta/AR existente.
- **Datos generados por esta feature:** artefacto de mapeo SVG↔BD (`svg_id`, coordenadas, estado de match); evidencia de carga DBR. No datos personales.
- **Privacidad:** sin datos personales nuevos. Ubicación del visitante sigue el flujo/permiso existente.
- **Auditoría/BD:** `map_x/map_y` ya existen (DBR-008/DBR-019). La carga debe ser controlada por responsable de BD, con evidencia en DBR-019 o DBR de datos correspondiente. No SQL manual.
- **DBR:** No se prevé DBR de esquema. Se requiere registro de evidencia de carga/captura `map_x/map_y` y validación del mapeo; si aparece necesidad de esquema (p. ej. `svg_map_id`), abrir DBR antes de implementar.

## Flujos y errores

1. **Carga normal:** app obtiene recintos/lugares -> mapper normaliza `map_x/map_y` -> `MapScreen` renderiza SVG canónico y marcadores.
2. **Sin `map_x/map_y`, con GPS:** usar `geoTransform` recalibrado.
3. **Sin coordenadas:** omitir marcador 2D y conservar registro para diagnóstico; no bloquear mapa.
4. **Sin conexión:** usar caché local existente (AsyncStorage) si disponible; mapa base SVG sigue visible.
5. **Error de repositorio:** estado de error en español con reintentar.
6. **ViewBox desalineado:** detectado por pruebas/QA; se previene con constantes únicas y pruebas de transformación.

## Dependencias, riesgos y preguntas

- **Dependencias/ADR:**
  - `007-map-location.md` (base 2D), `015-spatial-ar-tour.md` (AR/location), `016-arcore-arkit-anchor-poc.md`.
  - DBR-019 (`zoo_places/path_nodes`, `map_x/map_y`) y DBR-008.
  - ADR 0015 `mobile-svg-map-rendering.md`; ADR 0016 `expo-location-gps-blue-dot.md`.
  - SVG canónico: `C:\Users\vic22\Downloads\WhatsApp Image 2026-11-04 at 10.07.17 AM-mejorado.svg` (fuente visual aprobada por usuario en conversación; debe copiarse/versionarse en ruta de repo definida en plan).
- **Riesgos:**
  - Desalineación de `geoTransform`/ruta por cambio de viewBox.
  - Mapeos ambiguos SVG↔BD (tigre2/codorniz/herbívoros/lugares duplicados).
  - `zooPaths.ts` y `SVG_UNIT_TO_METERS` quedan obsoletos con 1600x1200.
  - Render RN-SVG de SVG grande/convertido puede afectar rendimiento.
  - `icons_auto` del SVG mejorado contiene texto/íconos decorativos; si se conserva sin control, duplica marcadores.
- **Decisiones (2026-11-22, Víctor Adrián):**
  - SVG canónico versionado en repo: `apps/mobile/src/assets/map/zoo-map-canonical.svg` (o ruta equivalente bajo `apps/mobile/src/assets/map/`, definida en plan); se consume desde componente RN-SVG.
  - Mapeo `svg_id`<->BD versionado como artefacto JSON/CSV en repo mientras no se requiera cambio de esquema; cualquier columna/tabla nueva requiere DBR aparte.
  - Los 13 `zoo_places` sin forma SVG se muestran como marcador de datos cuando tengan `map_x/map_y` o GPS calibrado; no bloquean el mapa.
  - `zooPaths.ts` se recalibra manualmente al viewBox `1600x1200` en esta spec, manteniendo ruta azul 2D; calibración provisional hasta ruta DB/artefacto aprobado.
  - `ZOO_BOUNDS`/entrada se recalibran de forma provisional documentada para el SVG canónico y se validan antes de cerrar CA-03/CA-08; si existe medición real, se usa.

## Revisión

- Aprobadores y fecha: Víctor Adrián, aprobación funcional 2026-11-22.
- Evidencia/enlaces:
  - `apps/mobile/specs/007-map-location.md`
  - `apps/mobile/specs/015-spatial-ar-tour.md`
  - `docs/database/requests/DBR-019-zoo-places-and-path-nodes.md`
  - `apps/api/src/database/data/dbr019-enclosures-gps-update.json`
  - `apps/api/src/database/data/dbr019-zoo-places-normalized.json`
  - `apps/api/src/database/seeders/Dbr019MapCoordinatesSeeder.php`