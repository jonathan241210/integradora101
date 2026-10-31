# 006 · public-catalog-read

- App dueña: `api`
- Apps/paquetes afectados: `api`, `mobile` (consumidor), `packages/api-client`
- Estado: Aprobada
- Solicitante / responsable funcional: Víctor Adrián
- Aprobación funcional: Víctor Adrián (2026-10-22)

## Problema y contexto

La app móvil implementó la integración de lectura `mobile-003` contra cuatro endpoints públicos (`GET /species`, `GET /species/{id}`, `GET /events`, `GET /events/{id}`), pero la API central nunca los expuso: hoy responden `404` y la aplicación cae al estado de error aunque existan datos en `arca_pruebas` (`species=5`, `animals=5`, `enclosures=3`, `events=3`).

El esquema actual no guarda en `species` todos los campos que consume la ficha móvil: la foto, la longevidad, la dieta y las características viven en `animals`; el recinto solo tiene `name`. Por eso la API debe **componer** la respuesta con el animal representativo de cada especie y su recinto, sin modificar el esquema.

## Objetivos

- Exponer cuatro endpoints públicos de solo lectura bajo `/api/v1` con rutas nombradas: `species.index`, `species.show`, `events.index`, `events.show`.
- Entregar un contrato en `snake_case` que el mapper de `apps/mobile` ya consume, sin cambios de esquema ni DBR.
- Responder `404` con mensaje en español cuando el recurso no exista o el identificador no sea numérico.
- Mostrar en la cartelera solo eventos activos y vigentes, ocultando los que ya terminaron.
- Evitar N+1 con carga anticipada de `animals` y `enclosure`.
- Cubrir cada CA-xx con al menos un test PHPUnit ejecutado contra `arca_pruebas`.

## Fuera de alcance

- Escrituras, altas, ediciones o borrados del catálogo (quedan para el dashboard administrativo).
- `GET /news` y cualquier contenido editorial: no está en `mobile-003` ni en esta spec.
- Filtros, búsqueda, paginación u ordenamiento configurable por el cliente.
- Servir imágenes, archivos `model_3d_path` o modelos 3D.
- Autenticación de visitante, progreso, códigos QR o mapas.
- Cambios de esquema, migraciones o DBR: esta spec solo lee el esquema existente.
- Caché del lado del servidor o CDN.

## Actores y permisos

| Actor/rol | Necesidad | Permisos requeridos |
|---|---|---|
| Visitante anónimo | Consultar catálogo y eventos desde la app | Ninguno; lectura pública |
| App móvil (`mobile-003`) | Consumir el contrato tipado | Ninguno |
| Responsable de BD | Confirmar que no hay cambio de esquema | No aplica: sin DBR |

## Historias de usuario

- Como visitante, quiero ver las especies del zoológico con foto, zona, dieta y datos de conservación para conocer a los animales antes de mi visita.
- Como visitante, quiero ver el detalle de una especie o de un evento para decidir si me interesa.
- Como visitante, quiero consultar la cartelera de eventos vigentes para planear mi recorrido.

## Criterios de aceptación

- **CA-01:** Dado que existe al menos una especie, cuando se llama `GET /api/v1/species`, entonces responde `200` con `{"data": [...]}` ordenado por `common_name` ascendente; cada elemento incluye `id`, `common_name`, `scientific_name`, `category`, `distribution`, `conservation_status`, `habitat`, `gestation_period`, `size_cm`, `model_3d_path`, `photo_path`, `longevity`, `diet`, `characteristics` y `zone_name`, con `null` donde no haya dato.
- **CA-02:** Dado un identificador numérico existente, cuando se llama `GET /api/v1/species/{id}`, entonces responde `200` con el mismo objeto de CA-01; si no existe responde `404` con `{"message": "Especie no encontrada."}`.
- **CA-03:** Dado que existen eventos, cuando se llama `GET /api/v1/events`, entonces responde `200` con `{"data": [...]}` que solo incluye eventos con `is_active = 1` y vigentes (`end_date` nulo o mayor o igual a la fecha actual), ordenados por `start_date` y `start_time` ascendentes; cada elemento incluye `id`, `name`, `description`, `image_path`, `start_date`, `end_date`, `start_time`, `end_time`, `location` e `is_active`.
- **CA-04:** Dado un identificador numérico existente, activo y vigente, cuando se llama `GET /api/v1/events/{id}`, entonces responde `200` con el objeto de CA-03; si no existe, está inactivo o ya terminó (`end_date` anterior a la fecha actual) responde `404` con `{"message": "Evento no encontrado."}`.
- **CA-05:** Dada una especie, cuando se compone su respuesta, entonces `photo_path`, `longevity`, `diet` y `characteristics` provienen del **animal representativo** —el primero con `photo_path` no nulo; si ninguno lo tiene, el de menor `id`— y `zone_name` proviene de `enclosures.name` de ese animal; si la especie no tiene animales, esos campos son `null`.
- **CA-06:** Dado un identificador no numérico (`/species/abc`, `/events/abc`), cuando se llama al endpoint, entonces responde `404` sin ejecutar consultas a la base de datos.
- **CA-07:** Dado cualquier cliente sin sesión ni token, cuando llama a los cuatro endpoints, entonces obtiene `200` sin cookies, sin `Authorization` y sin exponer `author_id`, `responsible_id` ni datos personales.
- **CA-08:** Dada la suite de PHPUnit, cuando se ejecuta `php artisan test`, entonces corre contra `arca_pruebas` (nunca `arca_zoo`) y existe al menos un test que nombra cada CA-01 a CA-07.

## Reglas de negocio

- **RN-01:** Todos los endpoints son de solo lectura (`GET`); no crean, modifican ni borran datos.
- **RN-02:** No se modifica el esquema ni se requieren migraciones: la spec se apoya en las tablas existentes `species`, `animals`, `enclosures` y `events`.
- **RN-03:** Los nombres de campos, rutas y recursos van en inglés y `snake_case`, como los consume el mapper de `mobile-003`.
- **RN-04:** Los mensajes de error visibles para el cliente van en español.
- **RN-05:** Los controladores son delgados y delegan en Actions (`ListSpeciesAction`, `GetSpeciesAction`, `ListEventsAction`, `GetEventAction`); la serialización vive en API Resources.
- **RN-06:** Una colección vacía responde `200` con `{"data": []}`, no `404`.
- **RN-07:** No hay paginación: el catálogo del zoológico es pequeño y la app móvil espera la lista completa en una sola respuesta.
- **RN-08:** La regla del animal representativo es determinista y estable entre llamadas.
- **RN-09:** Los eventos inactivos o vencidos no se exponen ni en el listado ni en el detalle.
- **RN-10:** `model_3d_path` se expone tal cual como referencia; servirlo o renderizarlo queda fuera de alcance.
- **RN-11:** No se exponen identificadores internos de personal (`author_id`, `responsible_id`) ni datos de auditoría.
- **RN-12:** La vigencia se evalúa con la fecha actual en la zona horaria configurada por la API; `end_date` nulo significa vigencia indefinida.

## Datos, privacidad y auditoría

- Solo se consultan datos públicos del catálogo y de la cartelera; no hay datos personales, clínicos ni financieros.
- No se registra auditoría: son lecturas públicas sin escritura.
- No se usan `SoftDeletes` en esta spec porque no hay borrado.
- **No requiere DBR ni cambio de esquema.** Los campos que no existen en `species` (`photo_path`, `longevity`, `diet`, `characteristics`, `zone_name`) se derivan de `animals` y `enclosures`. `avg_weight`, `fun_fact` y `placeholder_tint` no se exponen: decisión acordada de ocultarlos en la UI mientras no tengan columna de origen, sin crear DBR.

## Flujos y errores

### Flujo principal

1. La app llama `GET /species` y recibe la lista ordenada.
2. Al abrir una tarjeta, llama `GET /species/{id}` y recibe la ficha compuesta.
3. La app llama `GET /events` y recibe solo eventos activos y vigentes.
4. Al abrir un evento, llama `GET /events/{id}` y recibe su detalle.

### Errores esperados

- Recurso inexistente → `404` con mensaje en español.
- Evento vencido o inactivo → `404` en el detalle y ausencia en el listado.
- Identificador no numérico → `404` sin consultar la base.
- Colección vacía → `200` con `data: []`.
- Base de datos inaccesible → `500`; el cliente móvil aplica su fallback de caché (`mobile-003`).

## Dependencias, riesgos y decisiones

- **Dependencias/ADR:** ninguna dependencia nueva. Se apoya en Laravel 12, Eloquent y las tablas existentes (ADR 0001, ADR 0010). No hay DBR asociada.
- **Riesgos:**
  - El contrato depende de que exista un animal con `photo_path`; una especie sin animales pierde foto y datos de ficha.
  - La latencia de `arca_pruebas` en Aiven puede superar 1 s por petición en frío.
  - Sin paginación, el listado crecerá con el catálogo; hoy son 5 especies.
- **Decisiones acordadas el 2026-10-22 (Víctor Adrián):**
  1. La foto, longevidad, dieta y curiosidades salen del **animal representativo** de la especie; no se crean columnas propias en `species` ni DBR.
  2. La cartelera y el detalle **ocultan eventos vencidos** (`end_date` anterior a hoy); `end_date` nulo se considera vigente.
  3. `/news` queda para una **spec futura**; el móvil conserva su fallback local y esta spec no lo implementa.
  4. El peso (`avg_weight`) y el dato curioso (`fun_fact`) se **ocultan en la UI** mientras no existan columnas; no se crea DBR.
- Estas decisiones cierran las preguntas abiertas. La spec quedó **Aprobada** por Víctor Adrián el 2026-10-22.

## Revisión

- Aprobadores y fecha: Víctor Adrián (2026-10-22).
- Evidencia/enlaces: `apps/api/plan/006-public-catalog-read.md`, `apps/api/tasks/006-public-catalog-read.md`, `apps/api/src/tests/Feature/Catalog/PublicCatalogTest.php`, `apps/mobile/specs/003-api-read-integration.md`, `docs/database/fixtures/sample-catalog-events.sql`. Implementación probada de punta a punta contra `arca_pruebas` el 2026-10-22 (8 tests, 74 aserciones) y verificación manual de listados, detalles y `404`.
