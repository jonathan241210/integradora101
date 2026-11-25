# 017 · canonical-zoo-map-svg

- App dueña: `mobile`
- Apps/paquetes afectados: `mobile`; `apps/api` (solo consumo de datos existentes `map_x/map_y` en `enclosures`/`zoo_places`); `docs/database/requests/DBR-019-zoo-places-and-path-nodes.md` (evidencia/carga de datos, sin cambio de esquema previsto)
- Estado: Implementada
- Solicitada: 2026-11-22
- Aprobada: 2026-11-22
- Aprobación funcional: Aprobada

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
- **CA-04 (Zoo places visibles):** Dado un `zoo_place` visible con `map_x/map_y`, cuando el mapa carga, entonces se muestra un marcador cuyo nombre y tipo se identifican en la ficha y en la etiqueta accesible. Los `zoo_places` sin forma SVG pero con datos válidos pueden mostrarse como marcador de datos si tienen `map_x/map_y` o GPS calibrado, según regla definida en plan. La apariencia común de los marcadores está descrita en CA-13.
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
  - SVG canónico: fuente visual revisada por el solicitante, versionada en `apps/mobile/src/assets/map/zoo-map-canonical.svg` (la copia de trabajo para RN-SVG está en `apps/mobile/src/data/zooMapCanonicalSvg.ts`).
- **Riesgos:**
  - Desalineación de `geoTransform`/ruta por cambio de viewBox.
  - Mapeos ambiguos SVG↔BD (tigre2/codorniz/herbívoros/lugares duplicados).
  - `zooPaths.ts` y `SVG_UNIT_TO_METERS` quedan obsoletos con 1600x1200.
  - Render RN-SVG de SVG grande/convertido puede afectar rendimiento.
  - `icons_auto` del SVG mejorado contiene texto/íconos decorativos; si se conserva sin control, duplica marcadores.
## Decisiones

- Se optó por versionar el SVG canónico en `apps/mobile/src/assets/map/zoo-map-canonical.svg` y consumirlo desde el componente RN-SVG, porque es la fuente visual revisada y queda bajo control de versiones.
- Se optó por versionar el mapeo `svg_id` ↔ BD como artefacto JSON/CSV en el repositorio, porque no hace falta cambio de esquema; cualquier columna o tabla nueva requiere DBR aparte.
- Se optó por mostrar los 13 `zoo_places` sin forma SVG como marcador de datos cuando tengan `map_x/map_y` o GPS calibrado, porque no deben bloquear el mapa.
- Se optó por recalibrar manualmente `zooPaths.ts` al viewBox `1600x1200` manteniendo la ruta azul 2D, porque la ruta desde BD (`path_edges`) no está implementada; la calibración queda como provisional.
- Se optó por recalibrar `ZOO_BOUNDS` y la entrada de forma provisional y documentada, porque no hay medición real en campo; si se obtiene una medición, reemplaza esta calibración.

## Revisión

- Aprobación: Aprobada.
- Evidencia/enlaces:
  - `apps/mobile/specs/007-map-location.md`
  - `apps/mobile/specs/015-spatial-ar-tour.md`
  - `docs/database/requests/DBR-019-zoo-places-and-path-nodes.md`
  - `apps/api/src/database/data/dbr019-enclosures-gps-update.json`
  - `apps/api/src/database/data/dbr019-zoo-places-normalized.json`
  - `apps/api/src/database/seeders/Dbr019MapCoordinatesSeeder.php`

## Enmienda · Etiquetas, lugares y zoom táctil del mapa 2D

- Estado: Aprobada
- App dueña y afectada: `mobile`.
- Aprobación funcional: persona solicitante, 2026-11-24.

### Problema y alcance

Los nombres que acompañan a los marcadores saturan el plano. Aparece un punto de comida fuera del área esperada, los puntos de lugar se presentan como botones sin acción y el zoom se limita a `2.5×` mediante botones. El ajuste cubre la pestaña Mapa en 2D y reutiliza el trazado existente para todos los marcadores. El mapa en AR, los permisos, el cálculo de rutas, los contratos de API y la persistencia quedan fuera de alcance.

### Estado actual · 2026-11-24

- `ZooMapSvg` agrega texto con contorno claro debajo de los marcadores. El SVG base ya carece de texto y círculos decorativos.
- El plano tiene la forma `establecimientos_comida`. La app ya ubica el marcador del lugar de la API dentro de esa forma. El respaldo local `food-court`, correspondiente al plano anterior, conserva otras coordenadas y sigue visible cuando llega el lugar de la API, porque el filtro busca `food`.
- Los marcadores basados en `zoo_places` reciben un manejador vacío. La consulta de lugares visibles en `arca_pruebas` confirmó seis candidatos con coordenadas, incluido Establecimientos de comida. El color por sí solo no identifica los dos reportados.
- `php artisan db:table zoo_places --database=mysql` confirmó `map_x`, `map_y` e `is_visible` según la migración `2026_11_17_000019` y la DBR-019. La relación entre el lugar de comida y su forma ya existe en la app. La enmienda reutiliza los datos existentes y no requiere cambios de esquema ni DBR.

### Criterios de aceptación

- **CA-11:** Al abrir el mapa 2D, se ven los puntos sin nombres flotantes ni contornos claros de texto. Cada punto conserva un nombre accesible y al seleccionarlo se puede leer el nombre en la ficha.
- **CA-12:** Al abrir el mapa con el lugar de comida de la API disponible, se ve un solo punto de comida dentro de `establecimientos_comida`. Al abrirlo sin conexión y sin ese lugar en la caché, el respaldo local se muestra dentro del mismo rectángulo y sigue siendo seleccionable.
- **CA-13:** Los marcadores de servicios al visitante se muestran en vino y el resto en verde. Todos usan el mismo halo azul al seleccionarlos. La ficha empieza como una barra compacta con el nombre y «Ver detalles». Al desplegarla se muestra el tipo o descripción y la acción de fijar o cancelar el destino. Seleccionar otro punto reemplaza el contenido y conserva el modo expandido hasta tocar «Ver menos». El botón «Cerrar» o un toque en un espacio vacío cierran la ficha y conservan ese modo para la próxima selección, el encuadre y el destino fijado, si lo hay. Los gestos de arrastre y zoom siguen operando con la ficha visible. Con ubicación activa, el punto seleccionado se conecta a la ruta existente por los senderos.
- **CA-14:** El mapa permite ampliar y reducir con dos dedos y con los botones accesibles. El límite es `4×` y el mínimo sigue en `1×`. Al acercar con dos dedos, el mapa mantiene el área bajo el centro del gesto cuando lo permiten los bordes. Los marcadores, la ruta y la posición del visitante se mueven junto al plano. El arrastre con un dedo y el botón de restablecer siguen disponibles.

### Reglas y validación

- **RN-08:** Se conserva el plano canónico y su sistema de coordenadas. El punto de comida usa la forma ya identificada tanto con API como con el respaldo local. Se mantienen las reglas existentes de visibilidad de los demás lugares.
- **RN-09:** Se mantienen los botones de zoom como alternativa al gesto, conforme a [`mobile-007` CA-15 y RN-16](007-map-location.md). No se requieren nuevos permisos ni dependencias para el gesto.
- El zoom y los cambios del mapa se comprueban con pruebas automatizadas que nombren CA-11 a CA-14. En Android se verifica el gesto con dos dedos y se contrastan los puntos con el plano.
- Para verificar los dos puntos reportados en el teléfono, queda pendiente una captura con ambos marcados o sus nombres. La misma acción de abrir ficha se aplica a todos los puntos visibles de lugar.
- La persona solicitante confirmó el 2026-11-24 que el comportamiento de selección y ruta debe ser el mismo para los lugares y los recintos. La revisión en solo lectura de `arca_pruebas` confirmó 60 recintos y 6 lugares con coordenadas visibles, con centros distintos después de aplicar los anclajes de Inicio y Comida. Varias parejas están separadas por menos de 32 unidades del SVG.
- La persona solicitante aprobó la barra compacta con detalles desplegables y cierre al tocar un espacio vacío del mapa el 2026-11-24.
