# Plan técnico · 017 · canonical-zoo-map-svg

- Spec: `apps/mobile/specs/017-canonical-zoo-map-svg.md`
- Estado de spec: Implementada
- Solicitada: 2026-11-22
- Aprobada: 2026-11-22
- Estado del plan: Pendiente de registro de aprobación técnica
- Responsable técnico: Frontend

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

Nota de cierre: las rutas de prueba de esta tabla son las previstas por el plan. A la fecha de revisión no existen con esos nombres ni hay casos `CA-xx` de 017 en `apps/mobile/__tests__/`; las tareas T-08 a T-11 quedan como fuera de alcance de esta entrega (ver `tasks/017-canonical-zoo-map-svg.md`).

| Criterio | Prueba automatizada | App/ubicación |
|---|---|---|
| CA-01 SVG canónico 1600x1200 | Render test de `ZooMapSvg` verifica `viewBox="0 0 1600 1200"` y presencia de capas/caminos/recintos; no referencia 1000x1400 | `apps/mobile/__tests__/components/map/ZooMapSvg.test.tsx` |
| CA-02 Contrato de coordenadas | Unit test de mapper: usa `map_x/map_y` normalizados cuando existen; no usa GPS fallback | `apps/mobile/__tests__/repositories/mappers.test.ts` |
| CA-03 Fallback GPS | Unit test de mapper/geoTransform: sin `map_x/map_y` y con GPS usa `geoTransform` 1600x1200; sin coords no genera marcador falso | `apps/mobile/__tests__/repositories/mappers.test.ts`, `__tests__/utils/geoTransform.test.ts` |
| CA-04 Zoo places visibles | UI test MapScreen/ZooMapSvg/marker: renderiza `zoo_places` con `map_x/map_y` y nombre y tipo accesibles | `apps/mobile/__tests__/mapScreen.test.tsx` |
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
| II. La spec manda | Sí | Spec `017-canonical-zoo-map-svg.md` aprobada funcionalmente y en estado Implementada; plan/tasks con mismo NNN. |
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

- **Aprobación:** funcional aprobada (spec). La aprobación técnica de este plan no está registrada en el repositorio; debe registrarse para cerrar el plan.

## Enmienda · Etiquetas, lugares y zoom táctil del mapa 2D

- Spec de la enmienda: Aprobada por la persona solicitante el 2026-11-24.
- Estado del plan: Aprobado.
- Aprobación técnica de la enmienda: persona solicitante, 2026-11-24.

### Diseño y cambios por área

1. **Marcadores.** Retirar el texto que agrega `ZooMapSvg` debajo de los puntos. Los servicios locales y los tipos de servicio al visitante de la API (baños, comida y boletaje) usan el token vino. El resto usa el verde de los recintos y todos comparten el halo azul. `MapMarker` mantiene el nombre y tipo en la etiqueta accesible. Acotar el ancho táctil según el vecino más próximo para que ambos centros sigan disponibles. El ViewModel resuelve cualquier marcador seleccionable desde la misma selección usada por `MapPlaceCard` y por el destino existente. Con GPS se reutilizan la polilínea y su halo de destino. Al cerrar la ficha se conserva el encuadre y cualquier destino fijado.
2. **Comida.** Compartir el anclaje existente de `establecimientos_comida` entre el mapper de `zoo_places` y el respaldo móvil `food-court`. Mostrar el marcador de la API cuando esté visible y tenga coordenadas utilizables, incluidas las respuestas en caché. La presencia de otros lugares no afecta al respaldo de comida. Corregir al renderizar las coordenadas antiguas del respaldo que pueda contener la caché.
3. **Zoom.** Ampliar el rango común a `1×`–`4×` en `constants/zoo.ts`. Reutilizar `PanResponder` y registrar el punto medio y la distancia inicial de los dedos. Calcular el desplazamiento en coordenadas del visor, compensar el cambio de escala alrededor del punto medio y acotarlo con el tamaño medido del plano y del visor. Al añadir o retirar un dedo, tomar la transformación vigente como origen para evitar saltos. El visor captura el arrastre y el gesto con dos dedos y deja que los toques simples lleguen a los marcadores. Aplicar una sola transformación al SVG, marcadores, GPS y ruta. El botón de restablecer conserva la vista inicial vigente de `2.2×`.

### Contrato y datos

La ficha 2D empieza compacta al abrir el mapa. `MapScreen` conserva el modo expandido entre selecciones y cierres. La clave del punto reinicia el desplazamiento de la ficha cuando cambia el contenido. Un botón táctil de fondo cierra la ficha desde un espacio vacío, detrás de los marcadores y dentro del visor que captura los gestos. Los botones explícitos permiten desplegar, plegar y cerrar con lector de pantalla. Los detalles tienen desplazamiento propio cuando superan el espacio disponible.

El cliente reutiliza los endpoints y repositorios actuales. Consume los campos disponibles de `zoo_places` y la caché existente. La consulta en `arca_pruebas` documentada en la spec confirmó que se puede trabajar con el esquema vigente. No se requiere DBR nueva, cambio de permisos, almacenamiento adicional ni dependencias.

### Mapeo de criterios a pruebas

| Criterio | Prueba automatizada | Ubicación en móvil |
|---|---|---|
| CA-11 | El SVG carece de texto de marcador y el punto sigue siendo accesible y seleccionable. | `__tests__/mapAccessibility.test.tsx` |
| CA-12 | Se ve un solo punto de comida en el anclaje canónico con datos de API. El respaldo se usa si falta ese lugar aunque haya otros lugares, incluso con coordenadas antiguas en caché. | `__tests__/mapScreen.test.tsx` |
| CA-13 | Solo los servicios usan vino y todos los puntos usan el halo azul. Dos vecinos conservan áreas táctiles independientes y cada toque muestra su barra y conduce la polilínea al punto correcto. Se comprueba desplegar y plegar, reemplazar la ficha con otro punto, cerrar desde el fondo y conservar el encuadre y el destino fijado. | `__tests__/mapScreen.test.tsx`, `__tests__/mapAccessibility.test.tsx` |
| CA-14 | Separar y juntar los dedos cambia la escala, el centro del gesto conserva su anclaje dentro de los límites y ambos métodos respetan `1×`–`4×`. Se cubren el cambio de número de dedos, el arrastre, el toque simple y el restablecimiento. | `__tests__/mapViewport.test.tsx` |

La prueba manual en Android verificará el gesto con dos dedos y las fichas de los puntos señalados. Se ejecutarán TypeScript y la suite móvil.

### Constitution Check

| Principio | Cumple | Evidencia |
|---|---|---|
| I. Stack mínimo y portable | Sí | React Native y RN-SVG aprobados en ADR 0004 y ADR 0015. |
| II. La spec manda | Sí | Spec y plan de la enmienda aprobados. El checklist del mismo NNN registra las tareas y su revisión antes del código. |
| III. Lógica separada de la interfaz | Sí | Geometría en utilidades y estado de presentación en ViewModels. Los componentes muestran el plano y las fichas. |
| IV. Un test por criterio | Previsto | CA-11 a CA-14 tienen coberturas automatizadas identificadas. |
| V. Una sola fuente de verdad | Sí | Se reutilizan datos de API y caché. El respaldo se limita a la geometría fija del plano. |
| VI. Código en inglés, personas en español | Sí | Identificadores en inglés. Texto visible, accesibilidad y documentación en español. |

### Secuencia y aprobación

Implementar y probar primero los marcadores y las fichas, después el visor y sus gestos. El riesgo principal es que un arrastre intercepte el toque de un marcador o que el cambio de dedos produzca un salto. Las pruebas cubrirán ambos casos. La aprobación técnica corresponde al equipo de móvil o a la persona solicitante si ejerce ese rol.
