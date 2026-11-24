# 020 · enclosure-qr-management

- App dueña: `api`
- Apps/paquetes afectados: `api` (dueña de la lógica, las rutas, los permisos, la generación del SVG, el comando y el borrado lógico de códigos); `dashboard` (consumidor: `dashboard-013`); `packages/api-client` (métodos y tipos, sin lógica). `mobile` y `web` no cambian: el escaneo sigue regido por `api-005` y `api-019`, y la entrada manual por `mobile-006`.
- Estado: Implementada (PR y verificación final fuera de alcance de esta entrega)
- Solicitada: 2026-11-18
- Aprobada: 2026-11-18
- Aprobación funcional: Aprobada.
- Dependencias: `api-005` (generación de códigos y escaneo; enmiendas CA-12 y «Fuera de alcance» de esta spec); `api-019` (estado del recinto, 404 «Recinto no encontrado.», borrado de recinto y escaneo; enmiendas a CA-05, CA-10 y CA-18 y «Fuera de alcance» de esta spec); `api-007` (permisos y registro de actividad); `mobile-006` (entrada manual de códigos; sin cambios de código); ADR 0019 (precedente de SVG con `bacon/bacon-qr-code`; no se modifica); **DBR-021** (`enclosure_qr_codes.deleted_at` y su índice, «Lista para backend», aplicada en `arca_pruebas`).

## Problema y contexto

Los códigos QR de los recintos hoy solo se crean con `php artisan arca:generate-qr-codes {enclosure}`, en el servidor. La impresión quedó fuera de alcance en `api-005` y en `mobile-006`. Por eso el personal no puede:

- ver el código activo de un recinto desde el panel;
- generar el código de un recinto que no tiene uno activo;
- reemplazar el código si el QR físico se pierde o se daña.

Además, el comando crea un código nuevo cada vez que se ejecuta, aunque el recinto ya tenga uno activo. El resultado puede ser varios códigos válidos a la vez. Verificado en `arca_pruebas` (solo lectura, ver «Estado actual de datos»): 3 de 67 recintos no eliminados tienen un código activo, y los recintos 1, 2 y 3 tienen entre 2 y 3 códigos activos cada uno.

`api-019` deja fuera de alcance la gestión de códigos QR y solo decide si un código se acepta según el estado de su recinto. Esta spec cubre esa gestión y añade el borrado lógico de los códigos cuando se elimina su recinto.

## Objetivos

- Consultar, generar y regenerar el código QR de un recinto con el permiso `enclosures.manage`.
- Mantener un único código activo visible por recinto, sin borrar el historial de códigos.
- Eliminar lógicamente los códigos de un recinto cuando el recinto se elimina, sin perder el progreso de los visitantes.
- Entregar el SVG del QR generado en el servidor, para que el panel lo imprima (`dashboard-013`).
- Usar la misma Action desde el comando y desde los endpoints.
- Cubrir cada CA-xx con al menos un test PHPUnit que lo nombre, con `DatabaseTransactions` sobre `arca_pruebas`.

## Fuera de alcance

- La hoja de impresión. La API no genera PDF ni archivos; la hoja la compone el panel (`dashboard-013`).
- Colocación y reposición física de los QR. Es operación del zoológico.
- Rotación automática o caducidad de códigos.
- Historial de códigos en la interfaz. El historial queda en la base de datos y en Activitylog.
- Restaurar un código desactivado o eliminado. Regenerar crea uno nuevo; reactivar un código anterior no existe en esta spec.
- Mostrar la fecha de generación de un código. La tabla no tiene columna de fecha de creación (ver «Datos»).
- Códigos de boletos (`api-009`) y de animales.
- Cambios en `apps/mobile` y `apps/web`.
- Cambios de esquema distintos de DBR-021.

## Actores y permisos

| Actor/rol | Necesidad | Permisos requeridos |
|---|---|---|
| Personal con `enclosures.manage` | Consultar, generar y regenerar el QR de un recinto | `enclosures.manage` (grupo admin con `administrator.two-factor`, como `api-019`) |
| Personal sin `enclosures.manage` | No aplica | Respuesta 403; no cambia nada |
| Sin sesión | No aplica | Respuesta 401 |
| Visitante o cliente anónimo | Escanear el QR (flujo de `api-005`) | Sin cambio en esta spec. Las respuestas públicas no incluyen códigos (CA-15) |
| Operador en el servidor | Generar códigos desde el comando | Acceso al servidor (`arca:generate-qr-codes`) |

## Historias de usuario

- Como responsable de recintos, quiero ver el código QR de un recinto para imprimirlo y colocarlo en su entrada.
- Como responsable de recintos, quiero generar el QR de un recinto que todavía no tiene uno.
- Como responsable de recintos, quiero regenerar el QR si el físico se pierde o se daña, sabiendo que el anterior deja de funcionar.
- Como responsable de recintos, quiero que al eliminar un recinto sus QR dejen de funcionar, sin que los visitantes pierdan su progreso.

## Criterios de aceptación

### Consulta, generación y regeneración

- **CA-01 (consultar código activo):** Dado un recinto no eliminado con un código activo y un usuario con `enclosures.manage`, cuando llama `GET /api/v1/admin/enclosures/{enclosure}/qr`, entonces responde 200 con `enclosure` (`id`, `name`, `is_active`) y `qr` (`code`, el código guardado; `svg`, un documento SVG válido), y no escribe nada en la base de datos ni en Activitylog.
- **CA-02 (sin código activo):** Dado un recinto no eliminado sin código activo, cuando se consulta, entonces responde 200 con `"qr": null` y no crea ninguna fila.
- **CA-03 (generar):** Dado un recinto no eliminado sin código activo, cuando se llama `POST /api/v1/admin/enclosures/{enclosure}/qr`, entonces responde 201 con el mismo cuerpo que CA-01, crea exactamente una fila con `is_active = 1` y registra «Código QR generado» en Activitylog (CA-10).
- **CA-04 (generar no duplica):** Dado un recinto con código activo, cuando se llama el `POST` de generar, entonces responde 200 con el mismo `code` que daría CA-01, no crea fila y no registra nada en Activitylog.
- **CA-05 (regenerar):** Dado un recinto con un código activo A, cuando se llama `POST /api/v1/admin/enclosures/{enclosure}/qr/regenerate`, entonces responde 200 con un código B distinto de A; B es el único activo del recinto; A sigue en la tabla con `is_active = 0` y sin `deleted_at`; la respuesta incluye `deactivated: 1`; y Activitylog registra «Código QR regenerado».
- **CA-06 (regenerar sin código previo):** Dado un recinto sin código activo, cuando se regenera, entonces responde 200, crea un único código activo y devuelve `deactivated: 0`.
- **CA-07 (varios activos heredados):** Dado un recinto con dos códigos activos A (`id` menor) y B (`id` mayor), cuando se consulta o se genera, entonces `qr.code` es B y ambos siguen activos. Cuando se regenera, entonces A y B quedan inactivos, el nuevo código es el único activo y la respuesta incluye `deactivated: 2`.
- **CA-08 (formato):** Dado cualquier código nuevo generado por la API, cuando se guarda, entonces cumple `^ARCA-[ABCDEFGHJKMNPQRSTUVWXYZ23456789]{8}$` (RN-03): no contiene `0`, `O`, `1`, `I` ni `L`, y su longitud es menor o igual que 100 caracteres (límite de la columna). Los códigos existentes con `^ARCA-[A-Z0-9]{8}$` siguen siendo válidos para el escaneo y la consulta.
- **CA-09 (colisión):** Dado un generador de pruebas que devuelve primero un código ya existente y después uno libre, cuando se genera, entonces la Action reintenta y guarda el libre. Dado un generador que siempre devuelve códigos existentes, cuando se genera, entonces responde 500 con «No pudimos generar el código QR. Inténtalo de nuevo.» y no crea fila.
- **CA-10 (registro sin el código):** Dada una generación o una regeneración correctas, cuando se registra la actividad, entonces Activitylog guarda actor, acción («Código QR generado» o «Código QR regenerado»), recurso (el recinto) y propiedades con `qr_code_id` y, si aplica, `deactivated_ids`. Ni el registro de actividad ni los logs de la aplicación contienen el valor del código.

### Estado del recinto

- **CA-11 (recinto inactivo):** Dado un recinto no eliminado e inactivo, cuando se consulta, se genera o se regenera, entonces la respuesta tiene la misma forma que para un recinto activo y `enclosure.is_active` es `false`. El escaneo de ese código sigue rechazado según `api-019` CA-17.
- **CA-12 (recinto eliminado o inexistente):** Dado un identificador inexistente o de un recinto eliminado, cuando se llama cualquiera de las tres rutas, entonces responde 404 con `{"message": "Recinto no encontrado."}` y no cambia nada.

### Permisos

- **CA-13 (permisos):** Dado un usuario sin sesión, cuando llama cualquiera de las tres rutas, entonces responde 401. Dado un usuario con sesión y sin `enclosures.manage`, cuando llama esas mismas rutas, entonces responde 403 y no cambia nada.

### Listado, público, búsqueda y escaneo

- **CA-14 (indicador en el listado admin):** Dado un usuario con `enclosures.manage`, cuando llama `GET /api/v1/admin/enclosures`, entonces cada recinto incluye `has_active_qr` (booleano), que es verdadero si tiene al menos un código activo y no eliminado. El listado no incluye `code` ni `svg`. Es una adición a `api-019` CA-10.
- **CA-15 (sin exposición pública):** Dado un cliente anónimo, cuando llama `GET /api/v1/enclosures` o `GET /api/v1/enclosures/{enclosure}`, entonces ninguna respuesta contiene `code`, `svg`, `qr` ni `has_active_qr` (`api-005` RN-02).
- **CA-16 (búsqueda global):** Dado un usuario con `enclosures.manage` y el código activo de un recinto, cuando busca ese código en `GET /api/v1/admin/search`, entonces ningún grupo devuelve el recinto por ese código. El código no se busca en ningún grupo (`api-019` CA-43 y CA-48).
- **CA-17 (escaneo tras regenerar):** Dado un recinto regenerado, cuando un visitante escanea el código A (ya desactivado), entonces responde 422 con `inactive_code` y el mensaje «El código no está activo.», y no registra descubrimiento ni puntos. Cuando escanea el código B activo, entonces sigue el flujo de `api-005` CA-04.
- **CA-18 (comando):** Dado `php artisan arca:generate-qr-codes {enclosure}`, cuando el recinto tiene un código activo, entonces imprime ese código sin crear otro. Cuando no tiene ninguno, entonces crea uno e imprime su valor. Con `--regenerate`, se comporta como `POST.../qr/regenerate` (CA-05). Si el recinto no existe o está eliminado, muestra «El recinto no existe.» y termina con código de fallo. Es una enmienda a `api-005` CA-12.

### Eliminación del recinto y escaneo

- **CA-19 (eliminar recinto elimina sus códigos lógicamente):** Dado un recinto con un código activo A y un código inactivo B, cuando se llama `DELETE /api/v1/admin/enclosures/{enclosure}` (`api-019` CA-05), entonces A y B tienen `deleted_at` no nulo en la misma transacción, siguen existiendo en la tabla y no se borran físicamente. Ninguna otra fila cambia (RN-16).
- **CA-20 (escaneo de código eliminado):** Dado un código A con `deleted_at` no nulo porque su recinto se eliminó, cuando un visitante lo escanea, entonces responde 422 con `invalid_code`, mensaje «El código no es válido.», y no registra descubrimiento ni puntos. No revela que el recinto existió (`api-019` CA-20). Es un cambio de `api-019` CA-18 (enmienda propuesta en «Enmiendas»).

### Efecto de regenerar y de eliminar sobre el progreso y el escaneo

- **CA-21 (progreso conservado al regenerar):** Dado un visitante que descubrió especies del recinto R mediante el código A, cuando R se regenera (A queda inactivo y B activo), entonces `GET /api/v1/visitor/progress` devuelve el mismo `species_count` y el mismo `enclosure_count` que antes de regenerar. Ningún punto se resta. `visitor_collections` conserva `enclosure_qr_code_id` apuntando a A, y la fila de A sigue existiendo con su `enclosure_id`.
- **CA-22 (descubrimiento por especie tras regenerar):** Dado un visitante que ya descubrió la especie E en el recinto R, cuando escanea el código nuevo B de R y E sigue en exhibición, entonces responde `already_discovered` con `points_awarded` 0 y no crea fila nueva en `visitor_collections` ni en `visitor_point_entries`. Si R tiene además una especie E2 que el visitante no conocía, entonces E2 se registra con sus puntos (`api-005` CA-04).
- **CA-23 (escaneos pendientes del código anterior):** Dado un escaneo del código A encolado sin señal antes de regenerar, cuando se sincroniza después de la regeneración y dentro de la ventana de 24 h de `api-005` CA-02, entonces responde 422 con `inactive_code`, mensaje «El código no está activo.», y no registra descubrimiento ni puntos. El escaneo queda en `visitor_scans` con `result` `inactive_code`.
- **CA-24 (progreso conservado al eliminar el recinto):** Dado un visitante que descubrió especies del recinto R mediante el código A, cuando R se elimina, entonces `enclosure_count` no cambia y los puntos y el libro mayor no cambian. `visitor_collections` y la fila de A (con `deleted_at`) siguen existiendo. `species_count` sigue la regla de `api-019` CA-35: una especie sin animales en exhibición en recintos activos deja de contar; ningún registro se borra (RN-17).
- **CA-25 (fuera de la cadena de QR):** Dado el portal web (`api-010`), la búsqueda global (`api-019`) y el mapa público (`api-006`), cuando se regenera un recinto, entonces ninguna de sus respuestas cambia por el código: no usan `enclosure_qr_codes` (RN-15). La app móvil no guarda códigos: valida siempre en la API (`mobile-006`).

### Cobertura

- **CA-26 (cobertura):** Dada la suite PHPUnit, cuando se ejecuta contra `arca_pruebas`, entonces hay al menos un test por cada CA-01 a CA-25, con el identificador en el nombre del test, en `tests/Feature/Admin/EnclosureQrTest.php` (y `tests/Feature/Console/` para CA-18; `tests/Feature/Visitor/` para CA-20 a CA-24). Usan `DatabaseTransactions` y no usan `RefreshDatabase`.

## Reglas de negocio

- **RN-01 (código visible):** Si un recinto tiene varios códigos activos, la consulta y la generación muestran el de `id` mayor (CA-07). Los demás siguen activos hasta que se regenere.
- **RN-02 (estable):** Consultar o generar con código activo no cambia el código. Un QR impreso sigue válido mientras sea un código activo de su recinto.
- **RN-03 (generación):** Un código nuevo tiene el formato `ARCA-` seguido de 8 caracteres elegidos uno a uno con `random_int` (CSPRNG) sobre el alfabeto `ABCDEFGHJKMNPQRSTUVWXYZ23456789` (31 caracteres, sin `0`, `O`, `1`, `I` ni `L`). Hay unas 8,5·10¹¹ combinaciones. La columna `code` es `UNIQUE` en la base. Si hay colisión, se reintenta hasta 5 veces (CA-09). Los códigos existentes con otros caracteres siguen válidos.
- **RN-04 (regenerar desactiva, no elimina):** Regenerar desactiva todos los códigos activos del recinto (`is_active = 0`) y crea uno nuevo, en la misma transacción. Regenerar nunca marca ni borra filas (`deleted_at` queda nulo); el historial se conserva.
- **RN-05 (concurrencia):** Generar, regenerar y eliminar un recinto se ejecutan en una transacción que bloquea la fila del recinto (`lockForUpdate`). Dos peticiones simultáneas no pueden crear dos códigos activos. El plan define cómo se verifica.
- **RN-06 (aceptación del escaneo):** Un código se acepta en el escaneo solo si está activo, no tiene `deleted_at`, y su recinto está activo y no eliminado (`api-019` RN-05 y CA-17). Un código eliminado o inexistente responde `invalid_code` (CA-20). Desactivar un código no afecta a los demás códigos del recinto.
- **RN-07 (SoftDeletes y excepción de BaseModel):** `enclosure_qr_codes` tiene `deleted_at` (DBR-021). El modelo `EnclosureQrCode` usa `SoftDeletes` y extiende `Model`, no `BaseModel` (que no existe en el repositorio). La tabla no tiene `created_at`, `created_by` ni `updated_by`; la trazabilidad queda en Activitylog. La excepción de `BaseModel` queda cubierta por ADR 0021, igual que `Enclosure`; no se requiere ADR nuevo.
- **RN-08 (SVG efímero):** El SVG se genera en memoria con `bacon/bacon-qr-code` (`SvgImageBackEnd`) en cada respuesta. No se guarda en la base de datos ni en disco (criterio de ADR 0019).
- **RN-09 (datos devueltos):** Las rutas devuelven solo `enclosure` (`id`, `name`, `is_active`), `qr` (`code`, `svg`) y los contadores de la regeneración (`deactivated`). No devuelven animales ni datos de la persona que generó el código.
- **RN-10 (tratamiento del código):** El código no es un secreto criptográfico, pero es un dato operativo restringido. Solo lo ven quienes tienen `enclosures.manage`. No aparece en listados públicos, búsqueda global, logs de la aplicación ni Activitylog.
- **RN-11 (arquitectura):** Controlador delgado → Action. Las Actions viven en `app/Actions/Admin/Enclosures/` (nombres finales en el plan). El comando llama a la misma Action que el endpoint de generar y, con `--regenerate`, a la de regenerar. No hay lógica de códigos en el controlador ni en el comando.
- **RN-12 (dependencias):** No hay paquete nuevo. `bacon/bacon-qr-code` ya es dependencia directa de `apps/api` (usada también por `RenderTicketQrSvgAction` y por Fortify). `composer.json` no cambia y no se requiere ADR nuevo por dependencia.
- **RN-13 (lectura sin efectos):** `GET .../qr` no escribe en la base de datos ni en Activitylog.
- **RN-14 (rutas):** Rutas en inglés, con nombre y bajo el grupo admin existente con `permission:enclosures.manage`: `enclosures.qr.show`, `enclosures.qr.generate` y `enclosures.qr.regenerate`.
- **RN-15 (regenerar no toca el progreso):** Regenerar cambia solo `enclosure_qr_codes.is_active` y crea una fila nueva. No modifica `visitor_collections`, `visitor_point_entries`, `visitor_scans` ni `animals`. El progreso ya obtenido se conserva (CA-21 a CA-23). Un visitante que escanea el código nuevo de un recinto ya conocido recibe `already_discovered` (CA-22).
- **RN-16 (eliminar el recinto elimina sus códigos):** Al eliminar un recinto (`api-019` CA-05, `DeleteEnclosureAction`), todos sus códigos en `enclosure_qr_codes`, activos o no, reciben `deleted_at` en la misma transacción. No se borra ninguna fila físicamente. Es una enmienda a `api-019` CA-05.
- **RN-17 (progreso intacto al eliminar):** `VisitorProgressQuery::enclosure_count` une `visitor_collections` con `enclosure_qr_codes` mediante un join crudo que no filtra `deleted_at`. Ese join se mantiene a propósito, para que el progreso ya obtenido se conserve (CA-24). No se debe añadir un filtro `deleted_at IS NULL` a esa consulta. La regla de `api-019` CA-35 para el numerador de especies sigue vigente y no se cambia aquí.

## Impacto de regenerar y de eliminar

Verificado en código por la sesión principal.

| Elemento | Efecto al regenerar | Efecto al eliminar el recinto | Criterio |
|---|---|---|---|
| App móvil (`apps/mobile`) | Sin cambios. No guarda códigos: envía el código escaneado o escrito y la API valida. | Sin cambios. | `mobile-006`; CA-23 |
| Escaneo con el código anterior | 422 `inactive_code`, «El código no está activo.». No registra nada. | 422 `invalid_code`, «El código no es válido.». No registra nada. | CA-23; CA-20 |
| Progreso ya obtenido | Se conserva. `visitor_collections` sigue apuntando al código anterior, que se desactiva pero no se borra. `enclosure_count` y `species_count` no cambian. | Se conserva. `enclosure_count` no cambia. `species_count` sigue `api-019` CA-35. | CA-21; CA-24 |
| Escaneo con el código nuevo | Si las especies ya están descubiertas: `already_discovered`, sin puntos. Si hay especies nuevas: se registran con sus puntos. | No aplica: no hay código nuevo. | CA-22 |
| Escaneos offline encolados | Del código anterior: `inactive_code` al sincronizar, si llegan dentro de la ventana de 24 h. | Del recinto eliminado: `invalid_code` al sincronizar. | CA-23; CA-20 |
| Portal web, buscador global y mapa | Sin cambios: no usan `enclosure_qr_codes`. | Sin cambios en códigos; el recinto deja de aparecer según `api-019`. | CA-25 |
| QR físico impreso | Deja de funcionar. Hay que imprimir y colocar el nuevo. | Deja de funcionar, porque el recinto ya no existe. | `dashboard-013` CA-05 |

Aviso de confirmación de regenerar en el panel (`dashboard-013` CA-05), texto acordado: «Los QR impresos anteriormente dejarán de funcionar, incluidos los escaneos pendientes de sincronizar. El progreso que los visitantes ya obtuvieron se conserva. Tendrás que imprimir y colocar el nuevo.»

## Datos, privacidad y auditoría

- **Tabla:** `enclosure_qr_codes` (`id`, `code` VARCHAR(100) `UNIQUE`, `is_active` TINYINT(1) con valor por defecto 1, `enclosure_id` INT NOT NULL, `deleted_at` TIMESTAMP NULL con índice `idx_enclosure_qr_codes_deleted_at`). Dos FK a `enclosures` con reglas distintas (RESTRICT y CASCADE; ver DBR-020). La columna `deleted_at` la añade DBR-021.
- **Datos personales:** ninguno en la tabla. Activitylog guarda al usuario que actúa, como en `api-019` CA-08.
- **Auditoría:** generar, regenerar y eliminar el recinto quedan en Activitylog (CA-10 y `api-019` CA-08). Consultar no deja rastro (RN-13).
- **Borrado:** la aplicación nunca borra físicamente códigos. Regenerar desactiva (RN-04). Eliminar el recinto marca `deleted_at` (RN-16). Cualquier borrado físico futuro requiere nueva DBR.
- **Retención:** los códigos desactivados y eliminados se conservan. Propuesta: sin plazo hasta que exista una política; no se decide en esta spec.
- **DBR:** DBR-021 «Lista para backend» (aplicada en `arca_pruebas`; staging y producción pendientes). La DBR no sustituye esta spec.

### Estado actual de datos

Consulta de la sesión principal, en solo lectura sobre `arca_pruebas`. No se ha consultado producción (`arca_zoo`).

- Antes de DBR-021: `enclosure_qr_codes` sin `deleted_at`, `created_at`, `created_by` ni `updated_by`. 8 filas, todas con formato `ARCA-` + 8 caracteres `[A-Z0-9]`.
- Recintos no eliminados: 67. De ellos, 3 tienen un código activo.
- Recintos 1, 2 y 3: entre 2 y 3 códigos activos cada uno (datos de prueba). RN-01 y CA-07 los cubren.
- Después de DBR-021 (migración `2026_11_18_000021_enclosure_qr_codes_soft_deletes`, aplicada con `php artisan migrate --force`): `deleted_at timestamp NULL DEFAULT NULL` e índice `idx_enclosure_qr_codes_deleted_at`; 8 filas; 0 eliminadas. `down()` no ejecutado (ver DBR-021).
- Modelo: `apps/api/src/app/Models/EnclosureQrCode.php` (`extends Model`, `timestamps = false`, `is_active` booleano). Pendiente de cambio: añadir `SoftDeletes` (backend).

## Flujos y errores

### Flujo principal: ver y generar
1. El panel pide `GET .../qr` del recinto.
2. Si hay código activo, la API responde 200 con `code` y `svg` (CA-01), el de `id` mayor (RN-01).
3. Si no lo hay, responde 200 con `qr: null` (CA-02). El panel ofrece generar.
4. `POST .../qr` crea el código y responde 201 (CA-03).

### Flujo principal: regenerar
1. `POST .../qr/regenerate` se ejecuta en transacción con bloqueo del recinto (RN-05).
2. Desactiva los activos, crea el nuevo y registra la actividad (CA-05).
3. El código anterior deja de aceptarse en el escaneo (CA-23).

### Flujo principal: eliminar el recinto
1. `DELETE /api/v1/admin/enclosures/{enclosure}` (`api-019` CA-05) se ejecuta en transacción con bloqueo del recinto (RN-05).
2. Marca el recinto y todos sus códigos con `deleted_at` (CA-19, RN-16).
3. Los escaneos posteriores responden `invalid_code` (CA-20). El progreso se conserva (CA-24).

### Errores esperados

| Caso | Respuesta |
|---|---|
| Sin sesión | 401 |
| Sin `enclosures.manage` | 403, sin cambios |
| Recinto inexistente o eliminado | 404 «Recinto no encontrado.» |
| Consulta sin código activo | 200 con `qr: null` |
| Generar con código activo | 200 con el mismo código |
| Generar sin código activo | 201 |
| Regenerar | 200 con `deactivated` |
| Escaneo de código eliminado | 422 `invalid_code` «El código no es válido.» |
| Cinco colisiones seguidas al generar | 500 «No pudimos generar el código QR. Inténtalo de nuevo.» |

## Dependencias, riesgos y preguntas

- **Dependencias/ADR:** `api-005`, `api-007`, `api-019`, `mobile-006`, ADR 0019 (precedente), DBR-021 (aplicada), ADR 0021 (excepción de `BaseModel`, que cubre también `EnclosureQrCode`). No hay dependencia nueva ni ADR nuevo.
- **Riesgos:**
  - **Código y enumeración:** con el alfabeto de 31 caracteres, un código nuevo tiene unas 8,5·10¹¹ combinaciones. Un visitante con varias cuentas podría probar códigos. El límite de `api-005` CA-03 (30 escaneos por minuto por visitante) reduce el riesgo, pero no lo elimina.
  - **Códigos activos heredados:** los recintos 1, 2 y 3 tienen varios códigos activos y todos siguen aceptando escaneos. RN-01 muestra el de `id` mayor; el resto sigue activo hasta regenerar.
  - **Impresiones anteriores:** tras regenerar o eliminar, los QR impresos dejan de funcionar. El panel lo advierte (`dashboard-013` CA-05). Es un riesgo operativo, no técnico.
  - **Concurrencia:** cubierta por RN-05; el plan define la prueba.
  - **Progreso y numerador de especies:** al eliminar un recinto, el numerador de especies puede bajar según `api-019` CA-35. Es una regla ya aprobada; esta spec la mantiene (CA-24).
  - **Join crudo en el progreso:** cualquier cambio futuro que añada `deleted_at IS NULL` a `VisitorProgressQuery` rompería el progreso ya obtenido (RN-17). Lo cubre CA-24.
- **Preguntas:** ninguna pendiente. La excepción de `BaseModel` para `EnclosureQrCode` queda cubierta por ADR 0021, igual que `Enclosure` (decisión de la sesión principal, aprobada por el responsable funcional).

Decisiones cerradas (el responsable funcional): alfabeto de 8 caracteres sin `0`, `O`, `1`, `I`, `L` en códigos nuevos (RN-03); el comando reutiliza el activo y solo regenera con `--regenerate` (CA-18); generar en recinto inactivo permitido (CA-11); `has_active_qr` en el listado (CA-14); eliminar recinto elimina sus códigos lógicamente (RN-16, CA-19); regenerar solo desactiva (RN-04).

## Enmiendas propuestas

Aprobadas por el responsable funcional con esta spec. Se aplican en el mismo PR de implementación de `api-020` mediante tareas explícitas en `apps/api/tasks/020-enclosure-qr-management.md` (T-18). Hasta ese PR, `api-005`, `api-019` y `mobile-006` no cambian.

| Spec | Texto actual | Enmienda |
|---|---|---|
| `api-005` CA-12 | «genera códigos opacos aleatorios para los QR del recinto. La impresión no forma parte de este comando.» | El comando usa la Action de esta spec (CA-18): reutiliza el código activo y crea uno nuevo solo con `--regenerate`. La impresión sigue sin ser del comando. |
| `api-005` (fuera de alcance) | «Impresión, colocación y reposición física de los QR.» | La hoja imprimible pasa a `dashboard-013` (la API no imprime). La colocación y la reposición física siguen fuera. La regeneración por API queda en esta spec. |
| `api-019` CA-05 (eliminar recinto) | Eliminación con `deleted_at` del recinto. | Además, marca `deleted_at` en todos sus códigos QR en la misma transacción (RN-16 y CA-19 de esta spec). |
| `api-019` CA-10 (listado admin) | Recibe `is_active` y `animals_count`. | Añade `has_active_qr` (booleano). Adición aditiva (CA-14). |
| `api-019` CA-18 (QR de recinto eliminado) | Rechazo como en CA-17 («Este recinto no está disponible en este momento.»). | Un código de recinto eliminado responde `invalid_code` («El código no es válido.») porque sus códigos ya están eliminados (CA-20). El rechazo por `inactive_enclosure` solo aplica si el código sigue activo (no ocurre al eliminar). |
| `api-019` (fuera de alcance) | «Gestión de códigos QR (generar, rotar o desactivar `enclosure_qr_codes`)» | Pasa a esta spec. `api-019` sigue decidiendo la aceptación del escaneo según el estado del recinto. |
| `mobile-006` (fuera de alcance) | «Impresión, colocación y reposición física de QR» | Sin cambio de código. La impresión queda en `dashboard-013`. Nota para el responsable de `mobile`. |

## Revisión

- Aprobación: el responsable funcional (aprobada). Plan y tasks en Borrador: `apps/api/plan/020-enclosure-qr-management.md`, `apps/api/tasks/020-enclosure-qr-management.md`. Decisiones de producto del responsable funcional: consulta sin efectos; generar solo si no hay activo; regenerar desactiva y no elimina; activitylog sin código; un activo visible (el de `id` mayor), desactivar los demás solo al regenerar; recinto inactivo visible con aviso; recinto eliminado 404; alfabeto sin `0`, `O`, `1`, `I`, `L`; comando reutiliza el activo; `has_active_qr` en el listado; eliminar recinto elimina sus códigos lógicamente; el progreso se conserva.
- Evidencia/enlaces: `docs/database/requests/DBR-021-enclosure-qr-codes-soft-deletes.md`; `apps/api/specs/005-visitor-progress.md` (CA-12, RN-02, fuera de alcance); `apps/api/specs/019-enclosure-status-and-global-search.md` (CA-05, CA-10, CA-17, CA-18, CA-35, RN-05); `apps/mobile/specs/006-qr-scan.md` (CA-03, fuera de alcance); `apps/dashboard/specs/012-enclosure-actions-global-search.md` (CA-32, CA-38); `docs/adr/0019-qr-svg-generation-api.md`; `apps/api/src/app/Console/Commands/GenerateQrCodesCommand.php`; `apps/api/src/app/Actions/Visitor/RecordVisitorDiscoveryAction.php`.
