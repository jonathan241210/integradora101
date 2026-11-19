# 019 · enclosure-status-and-global-search

- App dueña: `api`
- Apps/paquetes afectados: `api` (dueña de la lógica, las rutas y los permisos); `dashboard` (consumidor: `dashboard-012`); `mobile` y `web` (consumidores del catálogo público, sin cambio de código en esta spec); `packages/api-client` (métodos y tipos, sin lógica de negocio).
- Estado: Aprobada (Jonathan, 2026-11-18). La parte de recintos queda bloqueada hasta que DBR-020 esté «Lista para backend»; la búsqueda global puede implementarse con plan y tasks aprobados.
- Solicitante / responsable funcional: usuario del proyecto (nombre por registrar)
- Aprobación funcional: Jonathan, 2026-11-18. Decisiones de producto registradas el 2026-11-18 (Jonathan).
- Dependencias: DBR-020 (Borrador; necesaria solo para la parte de recintos). La búsqueda global no necesita DBR. Enmienda `api-007` (CA-18), `api-010` (fuera de alcance) y `api-005` (CA-06); ver «Enmiendas».
- **Enmienda 2026-11-18 (b), aprobada por Jonathan:** búsqueda tolerante, campos buscables por grupo, `match` con fragmento, tope de candidatos y límite de peticiones. Modifica CA-23, CA-24, CA-26 a CA-32, CA-34 y RN-09, RN-10, RN-12; añade CA-36 a CA-49 y RN-15 a RN-19. No retira ningún número. Ver «Enmienda 2026-11-18 (b)» en «Enmiendas».
- **Enmienda 2026-11-18 (d), aprobada por Jonathan:** relevancia de la búsqueda global: coincidencia parcial de palabras, orden por tupla de relevancia y `best_score` por grupo. Modifica CA-37 y CA-41 (conservan número) y RN-16; añade CA-50 a CA-54. Ver «Enmienda 2026-11-18 (d)» en «Enmiendas».

## Problema y contexto

- **Recintos.** El zoológico necesita dejar un recinto fuera de servicio (mantenimiento, obra o clausura temporal) sin perder su historial ni los animales que tiene asignados. Hoy `api-007` CA-18 declara que «no existe operación de eliminación» y `api-010` deja fuera de alcance el cambio de estatus. Tampoco hay forma de impedir que un recinto cerrado reciba animales, escaneos QR o cuente en el progreso de los visitantes.
- **Búsqueda.** El encabezado del panel tiene un campo de búsqueda demostrativo que no hace nada. El personal necesita encontrar usuarios, noticias, eventos, recintos, momentos, especies y boletos desde cualquier sección, solo entre lo que su rol puede ver.

## Enmiendas

Se aplican solo al aprobarse esta spec. No se modifican ahora.

| Spec | Texto actual | Enmienda |
|---|---|---|
| `api-007` CA-18 | «No existe operación de eliminación.» | Sustituido por CA-05 y CA-06 de esta spec: los recintos se eliminan con borrado lógico. El renombrado y la creación no cambian. |
| `api-007` (alcance, línea de recintos) | «recintos (crear y renombrar)» | Se amplía con desactivar, activar y eliminar, según esta spec. |
| `api-010` (fuera de alcance) | «Creación, edición, cambio de estatus o borrado de recintos» | El cambio de estatus y el borrado pasan a `api-019` (rutas admin). `api-010` sigue siendo solo lectura pública, pero el catálogo público filtra según RN-05 de esta spec. |
| `api-005` CA-06 (progreso) | «especies descubiertas / total disponibles (especies con al menos un animal en exhibición, aunque su recinto aún no tenga QR)» | El total «disponibles» y el numerador «descubiertas» excluyen las especies cuyos animales en exhibición están solo en recintos inactivos o eliminados; los registros de descubrimiento no se borran (CA-35 y RN-14 de esta spec). |

### Enmienda 2026-11-18 (b), aprobada por Jonathan

Alcance: búsqueda global tolerante (sin mayúsculas ni acentos, varias palabras en cualquier orden, prefijos, errores de escritura), campos buscables por grupo, `match` con fragmento, tope de candidatos, límite de peticiones y reglas de datos. No cambia recintos (bloque B), no requiere DBR (solo lee columnas existentes) y no añade permisos. El grupo «Acciones» no es de la API: es un catálogo del dashboard (`apps/dashboard/specs/012`, enmienda (b)).

| Elemento | Antes | Después |
|---|---|---|
| CA-23, CA-24 | Sin `match`; orden por título e `id`. | `match` opcional (CA-42); orden por puntuación, título, `kind` (solo `tulanpedia`) e `id` (CA-41). |
| CA-26 a CA-28 | Nombre, correo o título con LIKE. | Campos de CA-43 con tolerancia (CA-36 a CA-41). |
| CA-29 | Solo número de momento; nunca opinión; cualquier otro carácter, sin grupo. | Revertido en la parte de «solo número»: se busca por opinión, motivo de rechazo y estado. El fragmento de opinión solo llega a `memories.review` (decisión de Jonathan, 2026-11-18). |
| CA-30 | Nombre común de especie y solicitudes. | Campos de especie de CA-43 y solicitudes `submitted`. |
| CA-31 | Solo folio exacto. | Folio exacto más estado, forma de pago, motivo de cancelación y fecha (CA-43, CA-45). |
| CA-32, CA-34 | LIKE escapado; cobertura CA-01 a CA-35. | Comparación en PHP (sigue sin interpretar `%` ni `_`); cobertura CA-01 a CA-49. |
| RN-09, RN-10, RN-12 | Opiniones fuera del alcance; LIKE; lógica en `Search/`. | Opiniones solo en `match` a `memories.review`; tope y límite (RN-17, RN-18); motor en `Search/Matching/` (RN-15). |
| Fuera de alcance | Excluía la búsqueda del texto de opiniones de momentos. | Exclusión retirada. Siguen fuera: FULLTEXT, sugerencias, historial, paginación, animales individuales, cuentas de visitantes, códigos QR y especies no publicadas. |
| D-13 (plan) | Sin throttle en la búsqueda. | Limitador `admin-search` de 30 por minuto y usuario (CA-47; D-29 del plan). |

No se retira ningún CA ni RN. Los CA modificados conservan su número con la marca «(modificado por enmienda (b))».

Reglas de la enmienda:
- Normalización (RN-15): minúsculas, y quitar acentos y diéresis con una tabla fija (á, é, í, ó, ú, ü, ñ). No requiere extensiones de PHP nuevas.
- La consulta se divide por espacios. Los datos se dividen por cualquier carácter que no sea letra ni dígito. «Longitud» de una palabra = número de letras y dígitos.
- Un campo vacío o nulo nunca coincide.

Preguntas de la enmienda (b), con redacción propuesta; pendientes de confirmación de Jonathan:
1. ¿El tope de 2000 candidatos toma los más recientes por `id` descendente? (propuesta: sí; CA-46).
2. ¿La puntuación de un elemento es el peor nivel de sus palabras? (propuesta: sí; CA-41).
3. ¿Se omite `match` cuando la coincidencia está solo en el título? (propuesta: sí; CA-42).
4. ¿El rol se busca por su etiqueta en español y no por el identificador interno? (propuesta: sí; CA-43).
5. ¿Texto del 429: «Demasiadas búsquedas. Espera un minuto e inténtalo de nuevo.»? (propuesta; CA-47).

### Enmienda 2026-11-18 (d), aprobada por Jonathan

Alcance: mejorar la relevancia de la búsqueda global (`GET /api/v1/admin/search`). Sin DBR, sin migraciones, sin permisos nuevos.

| Elemento | Antes | Después |
|---|---|---|
| CA-37 | Todas las palabras debían coincidir. | Coincidencia parcial: al menos `m` palabras (todas con 1 o 2; ceil(n/2) con 3 o más). |
| CA-41 | Puntuación = peor nivel de las palabras; empate por título. | Tupla de relevancia (CA-50 a CA-53); empate por título, `kind` e `id`. |
| RN-16 | Se descarta si alguna palabra no coincide. | Se descarta si coinciden menos palabras de las exigidas. |
| CA-50 a CA-54 | No existían. | Literal, frase en título, frase en otro campo, palabras y niveles, `best_score`. |

`best_score` se añade a cada grupo de la respuesta y se tipa en `packages/api-client` (`GlobalSearchGroup.best_score?: number`). El dashboard (`dashboard-012`) lo consume para ordenar los grupos.

## Objetivos

- Desactivar, activar y eliminar (borrado lógico) un recinto con el permiso `enclosures.manage`, sin perder su historial ni mover a sus animales.
- Ocultar los recintos inactivos y eliminados en el catálogo público, en su detalle y en el escaneo QR.
- Excluir del progreso de los visitantes las especies que solo están en recintos cerrados.
- Impedir que un recinto inactivo o eliminado reciba animales nuevos.
- Ofrecer una búsqueda global de solo lectura, en un solo endpoint, que devuelve solo los grupos que el rol puede ver.
- Cubrir cada CA-xx con al menos un test PHPUnit que lo nombre, con `DatabaseTransactions` sobre `arca_pruebas`.

## Fuera de alcance

- Restaurar recintos eliminados. No existe esa operación: solo desactivar es reversible (RN-02).
- Reasignar en bloque los animales de un recinto a otro. No existe hoy y requiere su propia spec.
- Borrado físico de recintos, en cualquier caso.
- Gestión de códigos QR (generar, rotar o desactivar `enclosure_qr_codes`): pasa a `api-020`. Esta spec solo decide si un QR se acepta según el estado de su recinto.
- Búsqueda en otros recursos (animales individuales, cuentas de visitantes, códigos QR, especies no publicadas).
- Búsqueda de texto completo (`FULLTEXT`), sugerencias, paginación de resultados, historial de búsquedas o persistencia.
- ~~Buscar o mostrar el texto de las opiniones de momentos (RN-09).~~ *Retirado por la enmienda 2026-11-18 (b): la opinión y el motivo de rechazo se buscan, y el fragmento se muestra solo a `memories.review` (CA-29, CA-44).*
- Nuevos permisos o cambios en roles. Se usan los permisos existentes del seeder.
- Cambios de código en `mobile`, `web` o `pwa`.

## Actores y permisos

| Actor/rol | Necesidad | Permisos requeridos |
|---|---|---|
| Personal con `enclosures.manage` (roles a los que el seeder asigna el permiso) | Listar, desactivar, activar y eliminar recintos | `enclosures.manage` |
| Personal con permisos de búsqueda | Buscar en las secciones que puede ver | Un permiso por grupo (ver RN-07) |
| Personal sin ningún permiso de búsqueda | Usa el buscador sin resultados | Ninguno; recibe `groups: []` |
| Visitante anónimo | Ver el catálogo público de recintos activos | Ninguno |
| Visitante con sesión | Escanear el QR de un recinto y ver su progreso | Token `visitor` (`api-004`) |
| Sin sesión | Ninguna de las rutas admin ni de búsqueda | 401 |

## Historias de usuario

- Como responsable de recintos, quiero desactivar un recinto en mantenimiento para que deje de mostrarse y de recibir animales, sin perder su historial.
- Como responsable de recintos, quiero eliminar un recinto que ya no existe para que deje de aparecer en el panel, el portal y la app.
- Como visitante, quiero que los recintos cerrados no aparezcan en el mapa ni en el escaneo, para no recibir indicaciones a un lugar cerrado.
- Como visitante, quiero que mi progreso no cuente especies que hoy no puedo visitar.
- Como personal del panel, quiero buscar un usuario, una noticia, un recinto, una especie, un momento o un boleto desde cualquier sección, para llegar rápido a lo que necesito.

## Criterios de aceptación

### Recintos (administración)

- **CA-01 (desactivar):** Dado un recinto activo y un usuario con `enclosures.manage`, cuando llama `PATCH /api/v1/admin/enclosures/{enclosure}/status` con `{"is_active": false}`, entonces responde 200 con el recurso (`is_active: false`), la fila sigue sin `deleted_at` y el cambio queda registrado (CA-08).
- **CA-02 (activar):** Dado un recinto inactivo, cuando se envía el mismo `PATCH` con `{"is_active": true}`, entonces responde 200 con `is_active: true`, vuelve a aparecer en el catálogo público y el cambio queda registrado.
- **CA-03 (mismo estado):** Dado un recinto que ya tiene el estado pedido, cuando se envía el `PATCH` con ese mismo valor, entonces responde 200, no cambia ningún dato y no crea entrada nueva en el registro de actividad.
- **CA-04 (validación del estado):** Dado un cuerpo sin `is_active` o cuyo valor no sea booleano JSON (`"1"`, `"0"` o `"sí"` no se aceptan), cuando se envía el `PATCH`, entonces responde 422 con el mensaje en español del campo y no cambia nada.
- **CA-05 (eliminar):** Dado un recinto activo o inactivo, cuando se llama `DELETE /api/v1/admin/enclosures/{enclosure}`, entonces responde 200 con `{"message": "Recinto eliminado."}`, la fila se marca con `deleted_at` y no se borra físicamente, deja de aparecer en el listado admin, en el catálogo público y en la búsqueda, y la eliminación queda registrada (CA-08). Enmienda `api-020` (RN-16, CA-19): además marca `deleted_at` en todos los códigos QR del recinto en la misma transacción, sin borrar filas.
- **CA-06 (eliminar con animales):** Dado un recinto con N animales asignados (N ≥ 1), cuando se elimina, entonces responde 200, los N animales conservan su `enclosure_id` sin cambio, no se borra ni se reasigna ningún animal, y la respuesta no bloquea la operación.
- **CA-07 (no encontrado):** Dado un identificador inexistente o de un recinto ya eliminado, cuando se llama `PATCH` o `DELETE`, entonces responde 404 con `{"message": "Recinto no encontrado."}` y no cambia nada.
- **CA-08 (registro de actividad):** Dada una activación, desactivación o eliminación correcta, cuando se completa, entonces Activitylog registra actor, acción y recurso afectado, con las acciones «Recinto activado», «Recinto desactivado» o «Recinto eliminado». Un intento rechazado no registra nada. No se registran datos sensibles.
- **CA-09 (permisos):** Dado un usuario sin sesión, cuando llama `GET`, `PATCH` o `DELETE` de recintos admin, entonces responde 401. Dado un usuario con sesión pero sin `enclosures.manage`, entonces responde 403 en esas mismas rutas y no cambia nada. El grupo `admin` ya aplica el middleware `administrator.two-factor`; esta spec no lo cambia.
- **CA-10 (listado admin):** Dado un usuario con `enclosures.manage`, cuando llama `GET /api/v1/admin/enclosures`, entonces recibe los recintos activos e inactivos, cada uno con `is_active` y `animals_count`, y no recibe los eliminados. Enmienda `api-020` (CA-14): añade `has_active_qr` (booleano), sin `code` ni `svg`.
- **CA-11 (nombre único):** Dado que existe un recinto eliminado llamado «X», cuando se crea un recinto «X», entonces responde 201. Dado que existe un recinto inactivo llamado «X», cuando se crea o renombra otro recinto como «X», entonces responde 422 con el mensaje en español que hoy da la API para nombres repetidos.

### Catálogo y escaneo público

- **CA-12 (listado público):** Dados recintos activos, inactivos y eliminados, cuando un cliente anónimo llama `GET /api/v1/enclosures`, entonces solo aparecen los activos no eliminados, con la forma y el orden de `api-010` CA-01.
- **CA-13 (detalle público):** Dado un recinto inactivo o eliminado, cuando un cliente anónimo llama `GET /api/v1/enclosures/{enclosure}`, entonces responde 404 con `{"message": "Recinto no encontrado."}`, igual que para un id inexistente. La respuesta no revela que el recinto existe.
- **CA-14 (reactivación pública):** Dado un recinto que vuelve a estar activo, cuando se consulta el catálogo público, entonces aparece de nuevo sin otros cambios.

### Asignación, escaneo QR y progreso

- **CA-15 (no asignable):** Dado un recinto inactivo o eliminado, cuando se registra un animal con ese `enclosure_id` mediante `POST /api/v1/staff/animals` (nombre `staff.animals.store`), entonces responde 422 con mensaje en español en el campo `enclosure_id` y no crea el animal.
- **CA-16 (regla en todo punto de escritura):** Dado cualquier punto que escriba `enclosure_id` en `animals` (hoy solo `AnimalController::store`, verificado el 2026-11-18), cuando recibe un recinto, entonces aplica la regla de RN-04. Cada punto nuevo debe tener un test que lo cubra y que use `POST /api/v1/staff/animals` como caso de referencia.
- **CA-17 (QR de recinto inactivo):** Dado un código QR válido cuyo recinto está inactivo, cuando el visitante lo escanea (`api-005` CA-04), entonces la API rechaza el escaneo con 422 y el mensaje «Este recinto no está disponible en este momento.», y no registra descubrimiento, especies ni puntos.
- **CA-18 (QR de recinto eliminado):** Dado un código QR cuyo recinto está eliminado, cuando el visitante lo escanea, entonces se aplica el mismo rechazo que en CA-17 y no se registra nada. Enmienda `api-020` (CA-20): al eliminar el recinto sus códigos quedan eliminados, así que el escaneo responde 422 `invalid_code` («El código no es válido.»); `inactive_enclosure` solo aplica a códigos que siguen activos.
- **CA-19 (reactivación del QR):** Dado un recinto reactivado, cuando el visitante escanea su QR, entonces el escaneo vuelve a registrar las especies según `api-005` CA-04.
- **CA-20 (sin revelar datos):** El rechazo de CA-17 y CA-18 no revela el nombre del recinto, el código QR ni los animales. Cumple `api-005` RN-02.
- **CA-35 (progreso sin recintos cerrados):** Dado un visitante con sesión y especies cuyos animales en exhibición están solo en recintos inactivos o eliminados, cuando consulta `GET /api/v1/visitor/progress`, entonces el total de especies disponibles no cuenta esas especies, y el numerador de especies descubiertas tampoco las cuenta, de modo que el numerador nunca supera al total (enmienda a `api-005` CA-06). Los registros de descubrimiento no se borran. Una especie con al menos un animal en un recinto activo sigue contando. Cuando el recinto se reactiva, vuelve a contar. El numerador «descubiertas» aplica el mismo criterio (solo cuenta especies disponibles), de modo que nunca supera al total; los registros de descubrimiento no se borran y vuelven a contar si el recinto se reactiva (decisión técnica de la sesión principal, 2026-11-18).

### Búsqueda global

- **CA-21 (acceso):** Dado un usuario sin sesión, cuando llama `GET /api/v1/admin/search`, entonces responde 401. Dado un usuario con sesión y sin ningún permiso de búsqueda, cuando la llama con un `q` válido, entonces responde 200 con `{"groups": []}`. La ruta se llama `admin.search`.
- **CA-22 (validación de `q`):** Dado un `q` ausente, vacío, con menos de 2 caracteres o con más de 100, medidos después de recortar espacios, cuando se llama la búsqueda, entonces responde 422 con un mensaje en español en el campo `q` y no consulta nada.
- **CA-23 (forma de la respuesta):** Dada una búsqueda válida, cuando responde 200, entonces el cuerpo es `{"groups": [{"section": "...", "label": "...", "items": [{"id": ..., "title": "...", "subtitle": "...", "kind": "..."}]}]}`; `kind` es opcional y solo lo lleva el grupo `tulanpedia` (CA-30). `match` es opcional y lo describe CA-42. Solo aparecen grupos con al menos un resultado y en el orden de RN-07. *(Modificado por enmienda (b): añade `match`.)*
- **CA-24 (límite y orden):** Dado un grupo con más de 5 coincidencias, cuando se busca, entonces el grupo devuelve exactamente 5 elementos, ordenados por puntuación (CA-41) y, a igual puntuación, por título ascendente, `kind` en `tulanpedia` y `id` ascendente. *(Modificado por enmienda (b); antes solo título e `id`.)*
- **CA-25 (permisos por grupo):** Dado un usuario con `tickets.view` y sin los demás permisos de búsqueda, cuando busca un término que coincide con nombres de usuarios, noticias o recintos, entonces la respuesta solo puede contener el grupo `ticket-history`. Un usuario sin `users.manage` nunca recibe el grupo `users`, aunque su término coincida con una cuenta.
- **CA-26 (usuarios):** Dado un usuario con `users.manage`, cuando busca, entonces recibe las cuentas no eliminadas, activas e inactivas, cuyos campos buscables (nombre, apellidos, correo, área y rol, CA-43) coinciden con el término según CA-36 a CA-41. El `title` es el nombre completo y el `subtitle` es el correo. *(Modificado por enmienda (b).)* Ningún elemento incluye contraseña, secretos de 2FA ni tokens.
- **CA-27 (noticias y eventos):** Dado un usuario con `news.manage` o `events.manage`, cuando busca, entonces recibe las noticias o eventos no eliminados, activos e inactivos, cuyos campos buscables (CA-43) coinciden según CA-36 a CA-41. Cada grupo exige su propio permiso (noticias: `news.manage`; eventos: `events.manage`). El `subtitle` indica «Activa» o «Inactiva» en noticias y «Activo» o «Inactivo» en eventos, como ya implementa T-06. *(Modificado por enmienda (b); corrige la redacción original, que pedía «Activa» para ambos.)*
- **CA-28 (recintos):** Dado un usuario con `enclosures.manage`, cuando busca, entonces recibe los recintos no eliminados, activos e inactivos, cuyo nombre coincide con el término según CA-36 a CA-41. El `subtitle` indica «Activo» o «Inactivo». *(Modificado por enmienda (b): tolerancia.)*
- **CA-29 (momentos):** Dado un usuario con `memories.review`, cuando busca, entonces recibe los momentos no eliminados cuyo identificador (`visitor_memories.id`) es exactamente el número buscado (si `q` solo tiene dígitos) o cuya opinión, motivo de rechazo o estado en español coinciden según CA-36 a CA-41, dentro del grupo `memories`. El `title` es «Momento #N» y el `subtitle` es el estado en español («Enviado», «En revisión», «Aceptado» o «Rechazado»). El `match` puede mostrar la opinión o el motivo de rechazo, solo a quien tiene `memories.review`. No se busca ni se muestra ningún dato del visitante (RN-09). *(Modificado por enmienda (b): revierte la decisión de solo número.)*
- **CA-30 (TulanPedia):** Dado un usuario con `species.review`, cuando busca, entonces el grupo `tulanpedia` incluye las especies publicadas (`is_published = 1`, no eliminadas) y solo las solicitudes en estado `submitted` (las únicas accionables) cuyo nombre común, nombre científico, categoría, hábitat, distribución o estado de conservación coincide según CA-36 a CA-41 (campos de la especie, CA-43). Un solo grupo, máximo 5 elementos en total. *(Modificado por enmienda (b).)* El `subtitle` es «Publicada» para una especie publicada y «Solicitud · <estado>» para una solicitud, con el estado en español (hoy `submitted` se muestra como «Enviada»). Cada elemento de `tulanpedia` incluye `kind`: `published-species` para una especie publicada o `species-request` para una solicitud. Decisión técnica de la sesión principal (2026-11-18), pendiente de aprobación de Jonathan. Cada elemento lleva `kind`: `published-species` o `species-request`, para que el panel abra la pestaña correcta. Solo se incluyen solicitudes `submitted`, las únicas accionables (decisión técnica de la sesión principal, 2026-11-18).
- **CA-31 (boletos):** Dado un usuario con `tickets.view`, cuando busca, entonces recibe el boleto cuyo folio (`tickets.id`) es exactamente el número buscado (si `q` solo tiene dígitos) o cuyos campos buscables coinciden según CA-43 (estado, forma de pago, motivo de cancelación y fecha de compra), dentro del grupo `ticket-history`. *(Modificado por enmienda (b): revierte «solo folio».)* El `subtitle` muestra la fecha de compra y el estado (vigente o cancelado), sin nombre ni correo del comprador.
- **CA-32 (comodines):** Dado un término con `%` o `_`, cuando se busca, entonces esos caracteres se tratan como literales y no como comodines. Un término como `%%` no devuelve todas las filas. Como la comparación se hace en PHP (enmienda (b)), `%` y `_` no tienen efecto especial.
- **CA-33 (solo lectura):** La búsqueda no escribe en la base de datos ni en el registro de actividad.
- **CA-34 (cobertura):** Dada la suite PHPUnit contra `arca_pruebas`, cuando se ejecuta, entonces hay al menos un test por cada CA-01 a CA-54 que se implemente, en `tests/Feature/Admin/` o donde corresponda, que usa `DatabaseTransactions` y no usa `RefreshDatabase`.

### Búsqueda tolerante, campos y límites (enmienda 2026-11-18 (b), aprobada por Jonathan)

- **CA-36 (sin mayúsculas ni acentos):** Dado el término «ÉLEFANTE» o «elefante», cuando se busca, entonces coincide con un elemento cuyo campo dice «Elefante». La comparación usa RN-15.
- **CA-37 (palabras en cualquier orden; coincidencia parcial):** Dado un término, cuando se busca, entonces un elemento coincide si al menos `m` palabras de la consulta coinciden con algún campo buscable del elemento, con `m` = todas las palabras si la consulta tiene 1 o 2, y `m` = ceil(n/2) si tiene n ≥ 3. El orden no importa y las palabras pueden estar en campos distintos. «lopez juan» coincide con «Juan López Pérez»; «juan zebra» (2 palabras) no coincide; con 4 palabras de las que coinciden 3, el elemento aparece, después de los que coinciden con las 4 (CA-53). *(Modificado por enmienda (d); antes exigía todas las palabras.)*
- **CA-38 (prefijos):** Dado un término cuya palabra es el inicio de una palabra del campo, cuando se busca, entonces coincide. «elef» coincide con «Elefante». Aplica con dos o más caracteres en total.
- **CA-39 (errores de escritura):** Dada una palabra de 4 a 6 letras, cuando su distancia de Levenshtein con una palabra completa de un campo es 1 o menos, entonces coincide. Dada una palabra de 7 o más letras, la distancia permitida es 2 o menos. «lovo» coincide con «lobo»; «elefnte» coincide con «elefante»; «jrafa» coincide con «jirafa». Una palabra de menos de 4 letras no admite errores: «osa» no coincide con «oso».
- **CA-40 (contiene y mínimo de letras):** Dada una palabra de 4 o más letras que aparece dentro de una palabra del campo, sin estar al inicio, cuando se busca, entonces coincide con nivel «contiene». Las palabras de menos de 4 letras solo coinciden por exacta o prefijo: «os» no coincide con «lobos»; «obos» sí.
- **CA-41 (puntuación y orden):** Cada palabra toma su mejor nivel en cualquier campo (exacta 4, prefijo 3, contiene 2, aproximada 1). La relevancia del elemento es una tupla comparada en este orden (CA-50 a CA-53): título literal, frase en el título, frase en otro campo, número de palabras que coinciden, suma de niveles y peor nivel. Los empates se desempatan por título normalizado ascendente, `kind` en `tulanpedia` e `id` ascendente. *(Modificado por enmienda (d).)* Con «lobo», «Lobo» (exacta) va antes que «Lobos» (prefijo), que va antes que «Pelobo» (contiene), que va antes que «Lovo» (aproximada). *(Propuesta de redacción; ver preguntas 2.)*
- **CA-50 (coincidencia literal):** Dado un elemento cuyo título normalizado es igual a la consulta normalizada, cuando se busca, entonces va antes que cualquier otro. «noticia de prueba nuevo» ordena «Noticia de prueba nuevo» antes que «Noticia de prueba» y que «Noticia para prueba de móvil».
- **CA-51 (frase contigua en el título):** Dada una consulta de 2 o más palabras, cuando el título contiene la consulta completa como frase contigua que empieza al inicio de una palabra, entonces va antes que los elementos sin ella; si el título empieza con la frase va antes que el que la contiene en medio.
- **CA-52 (frase contigua en otro campo):** Dada una consulta de 2 o más palabras, cuando algún campo distinto del título contiene la frase completa, entonces va antes que los elementos con solo palabras sueltas y después de los de CA-51.
- **CA-53 (palabras y niveles):** Después de CA-50 a CA-52, el orden es: más palabras de la consulta que coinciden; mayor suma de niveles por palabra (exacta 4, prefijo 3, contiene 2, aproximada 1); mayor peor nivel; título normalizado, `kind` e `id`. Con 1 o 2 palabras sigue exigiéndose que coincidan todas; los que coinciden con todas las palabras van siempre antes que los parciales.
- **CA-54 (`best_score` por grupo):** Cada grupo de la respuesta incluye `best_score`, entero comparable con la relevancia de su mejor elemento (mayor = más relevante), para que el cliente ordene los grupos. Formato de 9 dígitos decimales `A B C DD EEE F`: A = 1 si hay título literal (CA-50); B = 2 si el título empieza con la frase, 1 si la contiene (CA-51); C = 1 si otro campo la contiene (CA-52); DD = palabras que coinciden (máx. 99); EEE = suma de niveles (máx. 999); F = peor nivel. Una coincidencia solo por identificador exacto (momentos y boletos) vale 100010044. El orden de los grupos en la API sigue siendo el de RN-07.
- **CA-42 (fragmento de coincidencia):** Dado un elemento con coincidencia en un campo distinto del título, cuando se devuelve, entonces lleva `match` con `field` (etiqueta en español del campo de CA-43) y `snippet` de como máximo 120 caracteres centrado en la primera coincidencia. Si se recorta, los extremos llevan «…» dentro del límite. Si la coincidencia está solo en el título, el elemento no lleva `match` *(propuesta; ver preguntas 3)*. El fragmento solo contiene texto de ese campo.
- **CA-43 (campos buscables por grupo):** Solo se buscan estos campos, de registros no eliminados:
  - `users`: nombre, apellido paterno y apellido materno (título); correo («Correo»); nombre del área (`departments.name`, «Área»); etiqueta en español del rol («Rol»; propuesta, pregunta 4).
  - `news`: título (título); descripción («Descripción»); contenido («Contenido»); categoría («Categoría»).
  - `events`: nombre (título); descripción («Descripción»); ubicación («Ubicación»).
  - `enclosures`: nombre (título).
  - `memories`: identificador exacto (solo si `q` es un número); opinión («Opinión»); motivo de rechazo («Motivo del rechazo»); estado en español («Estado»).
  - `tulanpedia`: nombre común (título); nombre científico («Nombre científico»); categoría («Categoría»); hábitat («Hábitat»); distribución («Distribución»); estado de conservación («Estado de conservación»). Las solicitudes `submitted` usan los campos de su especie.
  - `ticket-history`: folio exacto (solo si `q` es un número); estado en español («Estado»: «Vigente» y «Completado» para `completed`; «Cancelado» para `cancelled`); forma de pago en español («Forma de pago»: `cash` = «Efectivo»); motivo de cancelación («Motivo de cancelación»); fecha de compra en dd/mm/aaaa en `config('app.timezone')` («Fecha de compra»).
- **CA-44 (momentos sin datos del visitante):** Dado un término buscado por un usuario con `memories.review`, cuando busca, entonces ningún campo del visitante (nombre, correo o identificador de cuenta) se consulta ni aparece en `match`. El `match` solo puede venir de opinión, motivo de rechazo o estado.
- **CA-45 (boletos sin datos del comprador):** Dado un término que coincide con un dato del comprador de un boleto, cuando se busca en `ticket-history`, entonces el boleto no aparece por ese dato. Ningún campo del comprador se consulta ni aparece en `match`.
- **CA-46 (tope de candidatos):** Cada grupo compara como máximo 2000 registros candidatos, los más recientes por `id` descendente (propuesta; ver preguntas 1). Un registro más antiguo que el tope no aparece en la búsqueda. El valor es una constante de la Action y se documenta en el plan. Dado un tope de 3 en la prueba, cuando se busca, entonces solo se comparan los 3 registros más recientes.
- **CA-47 (límite de peticiones):** `admin.search` admite 30 peticiones por minuto y usuario (limitador `admin-search`). La petición 31 responde 429 con «Demasiadas búsquedas. Espera un minuto e inténtalo de nuevo.» (propuesta; ver preguntas 5) y no consulta nada.
- **CA-48 (datos ocultos y forma de respuesta):** La búsqueda nunca consulta ni devuelve `password`, `remember_token`, `two_factor_secret`, `two_factor_recovery_codes`, `tickets.qr_code`, `image_sha256`, rutas de imagen ni datos de visitantes. Cada elemento solo contiene `id`, `title`, `subtitle`, `kind` (solo `tulanpedia`) y `match` (opcional). Buscar el valor de un hash o de un token no devuelve resultados.
- **CA-49 (sin registro del término):** El término buscado no se escribe en los logs de la aplicación ni en Activitylog, y la búsqueda no crea registros (refuerza CA-33).

## Reglas de negocio

- **RN-01 (dos marcas independientes):** `is_active` controla la visibilidad pública y la asignación de animales. `deleted_at` controla el borrado lógico. Eliminar no exige desactivar antes.
- **RN-02 (eliminar es definitivo desde el sistema):** Eliminar marca `deleted_at` (SoftDeletes). No se borra la fila ni se emite `DELETE` físico. No existe restauración de recintos eliminados. Solo desactivar es reversible, con `PATCH` de estado.
- **RN-03 (los animales no se mueven):** Desactivar o eliminar un recinto no cambia `animals.enclosure_id` ni el estado de ningún animal. La advertencia «Tiene N animales asignados.» del panel usa el `animals_count` que ya devuelve el listado (`dashboard-012`).
- **RN-04 (asignable, en todo punto de escritura):** Un recinto es asignable solo si `is_active = true` y `deleted_at` es nulo. La regla es reutilizable y se aplica a todo punto que escriba `enclosure_id` en `animals`, hoy `POST /api/v1/staff/animals`, y a cualquier escritura futura (CA-16).
- **RN-05 (visibilidad pública):** Un recinto es visible en el catálogo, en su detalle y en el escaneo QR solo si está activo y no eliminado.
- **RN-06 (nombre único):** El nombre de un recinto es único entre recintos no eliminados. Los recintos inactivos cuentan para la unicidad; los eliminados no. La regla se valida en la aplicación. Si la base tiene un `UNIQUE` sobre el nombre, BD lo evalúa (DBR-020, verificación 1).
- **RN-07 (permisos por grupo):** Todas las rutas admin de recintos exigen `enclosures.manage`. La búsqueda devuelve un grupo solo si el usuario tiene su permiso. El orden de los grupos es: `users`, `news`, `events`, `enclosures`, `memories`, `tulanpedia`, `ticket-history`. Las etiquetas son «Usuarios», «Noticias», «Eventos», «Recintos», «Momentos», «TulanPedia» e «Historial de boletos».
- **RN-08 (auditoría):** Activar, desactivar y eliminar se registran en Activitylog con actor, acción y recurso (`api-007` CA-26). La búsqueda no se registra.
- **RN-09 (datos mínimos en la búsqueda):** La búsqueda no devuelve contraseñas, secretos de 2FA, tokens (`remember_token`, `two_factor_*`), `tickets.qr_code`, `image_sha256`, rutas de imagen, datos de visitantes ni datos personales del comprador de un boleto (CA-48, CA-45). El correo solo aparece en el grupo `users`, que exige `users.manage`. La opinión y el motivo de rechazo de un momento solo se devuelven en `match` a quien tiene `memories.review` (CA-29, CA-44). *(Modificado por enmienda (b).)*
- **RN-10 (límites):** `q` tiene de 2 a 100 caracteres tras recortar espacios. Cada grupo devuelve como máximo 5 elementos. El término se compara en PHP, sin `LIKE`, sobre como máximo 2000 candidatos por grupo (CA-46), y `admin.search` admite 30 peticiones por minuto y usuario (CA-47). *(Modificado por enmienda (b).)*
- **RN-11 (rutas):** Rutas y nombres en inglés con `->name()`: `admin.search` para la búsqueda y las rutas de recintos bajo el grupo admin existente. Sin Inertia ni Wayfinder.
- **RN-12 (arquitectura):** Controlador delgado → Form Request → Action. La lógica de visibilidad, asignación y búsqueda vive en Actions (`app/Actions/Admin/Enclosures/` y `app/Actions/Admin/Search/`, con el motor de coincidencia en `Search/Matching/`), no en el controlador ni en la interfaz.
- **RN-13 (modelo sin `BaseModel`):** `Enclosure` extiende `Model` y usa `SoftDeletes`. `BaseModel` no existe en el repositorio (ADR 0021). Esta excepción queda documentada aquí, como exige ADR 0021 mientras no exista `BaseModel`, y no añade `created_by`/`updated_by` (DBR-020).
- **RN-14 (progreso):** Una especie cuenta como disponible en el progreso del visitante si tiene al menos un animal en exhibición en un recinto activo y no eliminado; el numerador «descubiertas» usa el mismo criterio, y los registros de descubrimiento no se borran (enmienda a `api-005` CA-06; CA-35).

- **RN-15 (motor de coincidencia):** Normaliza a minúsculas, quita acentos y diéresis con tabla fija, divide la consulta por espacios y compara palabras de datos por letras y dígitos. Vive en `app/Actions/Admin/Search/Matching/`, sin `LIKE` y sin extensiones de PHP nuevas (CA-36 a CA-41; ADR 0013).
- **RN-16 (orden):** El mismo criterio de puntuación y desempate aplica a todos los grupos (CA-41). Un elemento se descarta si coinciden menos palabras de las que exige CA-37 (enmienda (d)).
- **RN-17 (tope de candidatos):** Cada grupo compara como máximo 2000 candidatos (CA-46). Límite conocido: los registros más antiguos del tope no aparecen en la búsqueda. Revisar si una tabla supera 2000 filas.
- **RN-18 (límite de peticiones):** `admin.search` admite 30 peticiones por minuto y usuario (CA-47).
- **RN-19 (términos y registros):** El término buscado no se registra ni se audita (CA-49), y la búsqueda sigue siendo de solo lectura (CA-33).

## Datos, privacidad y auditoría

- **Recintos:** datos geográficos y operativos públicos. No son datos personales, clínicos ni financieros.
- **Búsqueda:** devuelve nombres y correos de cuentas (solo con `users.manage`), área y rol de cuentas, títulos y campos de noticias, eventos y especies, identificadores, estado y, solo con `memories.review`, fragmentos de opinión y motivo de rechazo de momentos; folios, estado, forma de pago, motivo de cancelación y fecha de compra de boletos. No devuelve datos de visitantes ni del comprador. *(Modificado por enmienda (b).)*
- **Auditoría:** las acciones de recintos quedan en Activitylog. La eliminación lógica conserva la fila.
- **Modelo:** `Enclosure` extiende `Model` con SoftDeletes, sin `BaseModel` (RN-13).
- **Requiere DBR:** sí, para la parte de recintos (`docs/database/requests/DBR-020-enclosure-status-soft-delete.md`, Borrador). La búsqueda no requiere DBR, porque solo lee. La enmienda (b) tampoco requiere DBR: solo lee columnas existentes (campos registrados por la sesión principal en `arca_pruebas`, solo lectura, 2026-11-18; ver plan, «Estado actual de datos»).
- **Tablas que consulta la búsqueda:** `users`, `news`, `events` (con `deleted_at`, DBR-005, Aplicada en `arca_pruebas`), `enclosures` (DBR-020), `visitor_memories` (DBR-012, Lista para backend), `species` y `species_publication_requests` (DBR-013, Lista para backend), `tickets` (DBR-006). La enmienda (b) añade lecturas de `departments` (nombre del área), `model_has_roles` y `roles` (rol), y las columnas de CA-43 (`news.description`, `news.content`, `news.category`, `events.description`, `events.location`, `visitor_memories.opinion`, `visitor_memories.rejection_reason`, `tickets.payment_method`, `tickets.cancellation_reason`, `tickets.purchased_at` y las de la especie).

## Flujos y errores

| Caso | Respuesta |
|---|---|
| Sin sesión en una ruta admin o de búsqueda | 401 |
| Sin permiso requerido | 403 |
| Recinto inexistente o eliminado | 404 «Recinto no encontrado.» |
| `is_active` inválido | 422 con mensaje por campo |
| `q` fuera de 2–100 caracteres | 422 en `q` |
| Animal con recinto inactivo o eliminado | 422 en `enclosure_id` (CA-15) |
| QR de recinto inactivo o eliminado | 422 «Este recinto no está disponible en este momento.» (CA-17) |
| Búsqueda sin permisos | 200 con `{"groups": []}` |

## Dependencias, riesgos y puntos abiertos

- **Dependencias:** DBR-020 (recintos); `api-004` (sesión de visitante); `api-005` (escaneo QR, CA-04 y RN-02; progreso, CA-06, enmendado); `api-007` (enmienda CA-18 y CA-26); `api-009` (folio = `tickets.id`); `api-010` (enmienda de alcance); `api-014` y DBR-013 (solicitudes de especie); DBR-012 (momentos); DBR-005 (`deleted_at` en noticias y eventos); ADR 0021 (excepción de `BaseModel`). Consumidor: `dashboard-012`.
- **Dependencias/ADR:** no hay paquete nuevo ni ADR nuevo.
- **Riesgos:**
  - **Único punto de escritura:** verificado el 2026-11-18 con búsqueda en `apps/api/src`: `enclosure_id` de `animals` solo se escribe en `AnimalController::store`. El plan previo suponía que no existía ningún punto; CA-15 y RN-04 cubren ese.
  - **Consultas sin SoftDeletes:** cualquier consulta cruda sobre `enclosures` puede mostrar recintos eliminados. Revisar en el plan.
  - **Carga:** LIKE sobre varias tablas; volumen actual bajo. Aceptado mientras no crezca.
- **Puntos abiertos:** ninguno. Cerrados el 2026-11-18 como decisiones técnicas de la sesión principal: numerador con el mismo criterio que el total (CA-35, RN-14); TulanPedia solo con solicitudes `submitted` y campo `kind` (CA-23, CA-30).

## Revisión

- Aprobadores y fecha: Jonathan, 2026-11-18 (DBR-020 sigue pendiente de BD).
- **Enmienda 2026-11-18 (d), aprobada por Jonathan (2026-11-18).** Relevancia de la búsqueda global (CA-37, CA-41, CA-50 a CA-54).
- **Enmienda 2026-11-18 (b), aprobada por Jonathan.** Las preguntas 1 a 5 de la sección «Enmienda 2026-11-18 (b)» son redacciones propuestas que Jonathan debe confirmar antes de implementarlas.
- Decisiones de producto de 2026-11-18 (Jonathan): momentos por identificador numérico (CA-29); progreso sin especies de recintos cerrados (CA-35 y enmienda a `api-005`); sin restauración de recintos eliminados (RN-02); aceptadas las propuestas de la versión anterior (activar sin confirmación, singular, grupo «Secciones» al final, unicidad solo entre no eliminados, búsqueda con inactivos, DELETE 200 con mensaje, 422 de QR con el texto indicado, textos de Activitylog, orden por título y máximo 5); TulanPedia en un solo grupo. Decisiones técnicas de la sesión principal (2026-11-18), para aprobación de Jonathan: numerador de progreso excluye recintos cerrados sin borrar registros; TulanPedia solo `submitted`; campo `kind` en los elementos de `tulanpedia`.
- Evidencia/enlaces: `docs/database/requests/DBR-020-enclosure-status-soft-delete.md`, `apps/api/specs/007-administration-management.md` (CA-18, CA-26), `apps/api/specs/010-public-enclosures-read.md`, `apps/api/specs/005-visitor-progress.md` (CA-04, CA-06, RN-02), `apps/api/specs/009-ticket-sales.md` (folio), `docs/adr/0021-ticket-sales-constitution-exceptions.md` (BaseModel), `docs/database/requests/DBR-012-visitor-memories.md`, `docs/database/requests/DBR-013-species-requests.md`, `apps/dashboard/specs/012-enclosure-actions-global-search.md`.

## Enmienda 2026-11-19 (e), aprobada por Jonathan

Pedida por Jonathan: «busco una noticia y salen primero eventos; solo toma algunas palabras».

- **Palabras vacías** (a, al, con, de, del, el, en, es, la, las, lo, los, o, para, por, que, se, su, sus, un, una, unas, unos, y): no se exigen ni cuentan como coincidencia; sí forman parte de la frase literal (CA-50 a CA-52). Si la consulta solo tiene palabras vacías, se usan todas. Implementado en `ItemMatcher` (API) y `search-tolerance.ts` (cliente, paridad).
- **Coincidencia parcial más estricta** (modifica CA-37 y la regla de ceil(n/2) de la enmienda d): con 1 a 3 palabras con contenido se exigen todas; con 4 o más, al menos 3 y al menos el 75 % (redondeado hacia arriba).
- **Sección nombrada en la consulta** (dashboard, `viewmodels/search-intent.ts`): si la consulta incluye una palabra de sección (noticia/s, nota/s; evento/s, actividad/es; recinto/s; usuario/s, cuenta/s, empleado/s, personal; momento/s, recuerdo/s; especie/s, tulanpedia; boleto/s, folio/s), esa palabra no se envía a la API (si queda texto suficiente) y el grupo de esa sección se muestra primero, antes que el de la sección actual.
- **Palabras de sección y vacías no son acciones** (dashboard, `splitSearchQuery`): antes una palabra como «noticia» se reconocía como parte de una acción («Publicar noticia») y se quitaba de la consulta enviada a la API, por lo que la búsqueda usaba una sola palabra. Ahora esas palabras siempre llegan a la búsqueda.
- **Tests:** pendientes por indicación de Jonathan (no correrlos en esta ronda). Afectan a CA-37, CA-41, CA-43 (dashboard) y CA-50 a CA-54 (API); deben actualizarse antes del PR.
