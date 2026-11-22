# 024 · pending-review-counts (conteos de pendientes para avisos del personal)

- App dueña: `api`
- Apps/paquetes afectados: `api` (dueña: endpoint de conteos, permisos, cálculo desde estados existentes, pruebas); `dashboard` (`dashboard-018`, consumidor: aviso al iniciar sesión y puntito en el menú); `packages/api-client` (método y tipo de la respuesta; sin lógica de negocio).
- Estado: Aprobada (2026-11-20). Sin plan, sin tasks, sin DBR: la feature no cambia el esquema.
- Solicitante / responsable funcional: Jonathan (responsable funcional y de backend).
- Aprobación funcional: Jonathan, 2026-11-20
- Responsable de BD: no requerido por esta spec (no crea índices nuevos; ver «Datos, privacidad y auditoría»).
- Dependencias de contrato: `api-014` (estados de `species_publication_requests`), `api-010` (estados de `visitor_memories`), `api-007` (rutas bajo `/api/v1/admin` con 2FA), `api-023` (rol «Comunicación», solo citado: verá estos conteos porque tendrá `memories.review` y `species.review`).

## Problema y contexto

La Dirección (`zoo-admin`) revisa dos colas que no avisan por sí solas: las solicitudes de publicación de especies para TulanPedia (`api-014`, revisadas en `dashboard-010`) y los momentos enviados por visitantes (`api-010`, revisados en `dashboard-008`). Hoy, quien revisa tiene que entrar a cada sección para saber si hay algo que atender, y las solicitudes pueden esperar días sin que nadie lo note.

Esta spec define un endpoint de conteos, de solo lectura, que devuelve cuántos elementos están pendientes de revisión, solo para los permisos que la persona tiene. No crea estados, no guarda avisos y no notifica por correo ni por tiempo real. La presentación (aviso al iniciar sesión y puntito en el menú) vive en `dashboard-018`.

## Objetivos

- Exponer `GET /api/v1/admin/pending-counts` con el número de solicitudes de especie pendientes y de momentos pendientes de revisión, sin datos de nadie.
- Calcular los conteos solo con los estados que ya existen (`api-014` y `api-010`), sin tabla, columna ni DBR nueva.
- Devolver solo las cifras que el permiso de quien llama permite ver.
- Mantener la carga del servidor baja: consultas de conteo, sin caché persistente, con límite de frecuencia.

## Fuera de alcance

- Tiempo real, websockets, colas, notificaciones push o por correo.
- Estado «leído» o «visto» de cada pendiente. El conteo baja solo cuando la solicitud sale de la cola (decisión, retirada o eliminación).
- Avisos de otros flujos (cancelaciones, pagos, arqueo, cuentas, recuerdos de visitantes sin revisar, etc.). Solo se cubren solicitudes de especie y momentos.
- Un registro propio de avisos o tabla de notificaciones para este endpoint.
- Cambiar los estados, las transiciones o los listados de `api-014` y `api-010`.
- Conteos históricos, por periodo o por revisor.

## Actores y permisos

| Actor/rol | Necesidad | Permisos requeridos |
|---|---|---|
| `zoo-admin` (Dirección) | Ver ambos conteos | `species.review` y `memories.review`, más 2FA confirmado (ruta bajo `/api/v1/admin`) |
| Rol «Comunicación» (`api-023`) | Ver ambos conteos, para revisar momentos y TulanPedia | `memories.review` y `species.review`, más 2FA |
| Quien tenga solo uno de los dos permisos | Ver solo el conteo de su permiso | El permiso correspondiente, más 2FA |
| `admin` (Presidencia) | Sin acceso | Ninguno: se excluye de `species.review` y `memories.review` (`api-014`, `api-010`) |
| `executive`, `cashier`, `veterinarian` | Sin acceso | — |
| Visitante | Sin acceso (rutas de personal) | — |

## Historias de usuario

- Como `zoo-admin`, quiero saber al entrar al panel cuántas solicitudes de especie y cuántos momentos esperan mi revisión, para atenderlos sin buscarlos en cada sección.
- Como miembro de Comunicación, quiero ver los pendientes de TulanPedia y de momentos que me corresponden, y no los de otras áreas.

## Criterios de aceptación

- **CA-01 (ambos permisos):** Dado un usuario con sesión, 2FA confirmado y `species.review` y `memories.review`, cuando llama `GET /api/v1/admin/pending-counts`, entonces responde `200` con las dos claves `species_requests` y `memories`, cada una con un entero mayor o igual que 0, en la raíz del JSON y sin envoltorio `data` (enmienda técnica 2026-11-20, pregunta 3 del plan).
  - Verificación: `test_ca01_counts_both_keys_for_both_permissions`.

- **CA-02 (solo `species.review`):** Dado un usuario con `species.review` y sin `memories.review`, cuando llama la ruta, entonces responde `200` solo con la clave `species_requests`. La clave `memories` no aparece (ni como `null` ni como `0`).
  - Verificación: `test_ca02_only_species_key_without_memories_permission`.

- **CA-03 (solo `memories.review`):** Dado un usuario con `memories.review` y sin `species.review`, cuando llama la ruta, entonces responde `200` solo con la clave `memories`. La clave `species_requests` no aparece.
  - Verificación: `test_ca03_only_memories_key_without_species_permission`.

- **CA-04 (cero pendientes):** Dado un usuario con permisos y sin elementos pendientes, cuando llama la ruta, entonces responde `200` con las claves permitidas en `0`, no con ausencia de clave.
  - Verificación: `test_ca04_zero_when_nothing_pending`.

- **CA-05 (conteo exacto por estado):** Dadas solicitudes de especie en `submitted` (de tipo `publish` y de tipo `update`), `accepted` y `rejected`, y momentos en `submitted`, `in_review`, `accepted` y `rejected`, cuando se llama la ruta, entonces `species_requests` cuenta solo las `submitted` (ambos tipos) y `memories` cuenta solo las `submitted` e `in_review`. El número coincide con el total que devuelven los listados existentes filtrados por esos estados (`api-014` CA-05 con `status=submitted`; `api-010` CA-07 para `submitted` e `in_review`).
  - Verificación: `test_ca05_counts_only_pending_states_and_matches_lists`.

- **CA-06 (eliminados fuera):** Dadas solicitudes de especie o momentos con borrado lógico (`deleted_at` no nulo) en un estado pendiente, cuando se llama la ruta, entonces no cuentan.
  - Verificación: `test_ca06_soft_deleted_rows_are_not_counted`.

- **CA-07 (sin permisos):** Dado un usuario sin `species.review` ni `memories.review` (`admin`, `executive`, `cashier`, `veterinarian`), cuando llama la ruta, entonces responde `403` sin ninguna clave ni cifra. Sin sesión responde `401`. Con sesión de personal sin 2FA confirmado responde lo que ya responde el middleware `administrator.two-factor` (`api-007`), y no devuelve cifras.
  - Verificación: `test_ca07_403_without_either_permission_and_no_data`.

- **CA-08 (sin datos de personas):** Dada cualquier respuesta `200`, cuando se revisa, entonces solo contiene las claves de CA-01 a CA-03 con enteros. No contiene identificadores de solicitud o momento, nombres de especie, nombres de visitantes o veterinarios, correos, rutas ni URLs de imágenes.
  - Verificación: `test_ca08_response_contains_only_integer_counts`.

- **CA-09 (solo lectura):** Dada cualquier llamada a la ruta, cuando termina, entonces ninguna fila de `species_publication_requests`, `species`, `visitor_memories` o `visitor_memory_reviews` cambia, y Activitylog no registra nada.
  - Verificación: `test_ca09_read_only_no_rows_or_activity_changed`.

- **CA-10 (frecuencia):** Dado un usuario autenticado, cuando hace más de 60 llamadas a la ruta en un minuto (decisión 2026-11-20: 60 por minuto y por usuario), entonces la llamada que supera el límite responde `429` con la cabecera `Retry-After`, y las llamadas dentro del límite responden normal. *Enmienda técnica 2026-11-20: quien no tiene `species.review` ni `memories.review` no consume cuota (`Limit::none()`; recibe el 403 de CA-07). El 429 lleva el mensaje «Demasiadas consultas. Espera un minuto e inténtalo de nuevo.» en la raíz del JSON, sin `data`.*
  - Verificación: `test_ca10_throttle_per_user_returns_429`.

- **CA-11 (cobertura):** Dada la suite PHPUnit, cuando se ejecuta contra `arca_pruebas` con `DatabaseTransactions`, entonces existe al menos un test que nombra cada CA-01 a CA-12 (Constitución IV). Ningún test usa `RefreshDatabase` ni migra.
  - Verificación: revisión de nombres de test por CA y ejecución de la suite; sin evidencia aún.

- **CA-12 (solicitudes de especie de especies eliminadas):** Dada una solicitud de especie en `submitted` cuya especie (`species`) tiene `deleted_at` no nulo, cuando se llama la ruta, entonces no cuenta (decisión 2026-11-20), igual que no aparece en la cola de `api-014`.
  - Verificación: `test_ca12_species_request_of_soft_deleted_species_is_not_counted`.

## Reglas de negocio

- **RN-01 (fuente de verdad):** Los conteos se calculan en una Action de lectura desde los estados existentes. No hay tabla, columna, contador persistente ni caché de conteos en esta versión.
- **RN-02 (solicitudes de especie):** Una solicitud de especie está pendiente si `status = submitted`, sea de tipo `publish` o `update` (`api-014` RN-18 y tipos de envío). `accepted` y `rejected` no cuentan. Si la especie tiene `deleted_at`, la solicitud no cuenta (CA-12).
- **RN-03 (momentos):** Un momento está pendiente de revisión si `status` es `submitted` o `in_review` (`api-010` RN-01 y RN-02; decisión 2026-11-20: `in_review` cuenta porque sigue esperando decisión). `accepted` (ya revisado) y `rejected` (esperando corrección del visitante) no cuentan.
- **RN-04 (borrado lógico):** Las filas con `deleted_at` no cuentan (Constitución V; `api-010` CA-20 para `visitor_memories`), y tampoco las solicitudes cuya especie tiene `deleted_at` (RN-02, CA-12).
- **RN-05 (permiso decide la clave):** `species.review` habilita `species_requests`; `memories.review` habilita `memories`. Una clave sin permiso no se incluye en la respuesta.
- **RN-06 (sin permisos):** Si quien llama no tiene ninguno de los dos permisos, la respuesta es `403` sin cifras (CA-07). La decisión evita dar pistas sobre la existencia de colas a quien no las revisa (decisión 2026-11-20).
- **RN-07 (solo lectura):** La ruta no cambia estados, no crea filas y no escribe auditoría; no es una acción de negocio.
- **RN-08 (roles):** Quien tiene los permisos ve los conteos, sin importar el nombre del rol. `admin` no tiene ninguno de los dos permisos y recibe `403` (`api-014` RN-10 y `api-010` RN-07).
- **RN-09 (mínimo dato):** Solo cifras. Nunca se devuelven datos de solicitudes, momentos ni personas (`api-010` RN-09).
- **RN-10 (nombre de la ruta):** La ruta es `GET /api/v1/admin/pending-counts` con nombre `admin.pending-counts.show` (decisión 2026-11-20).

## Datos, privacidad y auditoría

- **Datos consultados (solo lectura):** `species_publication_requests` (`status`, `deleted_at`), `visitor_memories` (`status`, `deleted_at`) y `species` (`deleted_at`, para RN-02). Los valores de estado se toman del código: `SpeciesRequestStatus` (`submitted`, `accepted`, `rejected`) y `MemoryStatus` (`submitted`, `in_review`, `accepted`, `rejected`). Los modelos usan SoftDeletes.
- **Esquema vivo de `arca_pruebas` (consulta en solo lectura con `php artisan db:table`, 2026-11-20):**
  - `species_publication_requests`: `status varchar(20)` (default `submitted`) y `deleted_at timestamp` nullable existen. Índices `idx_species_publication_requests_status_created (status, created_at)` e `idx_species_publication_requests_species_status (species_id, status)`.
  - `visitor_memories`: `status varchar(20)` (default `submitted`) y `deleted_at timestamp` nullable existen. Índices `idx_visitor_memories_status_created (status, created_at)` e `idx_visitor_memories_status_publication (status, published_until, published_at, id)`.
  - Conclusión: los conteos por `status` ya tienen índice que empieza por `status` en ambas tablas. **No hace falta DBR ni índice nuevo** (decisión 2026-11-20, pregunta 6).
- **Esquema:** esta spec no crea ni modifica esquema. Si el plan encuentra que el conteo necesita un índice nuevo, el plan abre una DBR en `docs/database/requests/` antes de cualquier migración; con la verificación de hoy, no es necesario.
- **Clasificación:** los conteos no son datos personales ni clínicos ni financieros.
- **Auditoría:** no se audita la lectura de conteos (no es una decisión). Las decisiones que cambian los conteos ya se auditan en `api-014` y `api-010`.
- **Privacidad:** respuesta con enteros solamente (CA-08). El nombre de la persona que llama no se devuelve ni se registra aquí.

## Flujos y errores

1. **Consulta:** el dashboard llama la ruta al iniciar sesión y al cambiar de pantalla (`dashboard-018`). La API comprueba sesión, 2FA y límite de frecuencia; calcula solo las claves permitidas y responde `200`.
2. **Sin permisos:** `403` sin cifras (CA-07). El dashboard no debe llamar sin permisos (`dashboard-018` lo impide), pero la API lo rechaza si se llama directo.
3. **Sin sesión:** `401`.
4. **Sin 2FA confirmado:** la respuesta la da el middleware `administrator.two-factor`, como en el resto de `/api/v1/admin`.
5. **Frecuencia excedida:** `429` con `Retry-After` (CA-10).
6. **Error interno o de base:** `5xx` estándar. La API no devuelve cifras parciales. El dashboard no bloquea su navegación por este error (`dashboard-018` CA-10).

## Dependencias, riesgos y preguntas

- **Dependencias/ADR:** `api-014` (estados y solicitudes), `api-010` (estados de momentos), `api-007` (2FA en rutas de administración), `api-023` (rol «Comunicación»). Sin dependencia nueva de PHP ni de paquetes (no requiere ADR).
- **Riesgos:**
  - Carga por sondeo al cambiar de pantalla: mitigado con CA-10 y con el intervalo mínimo que decide `dashboard-018` (15 s).
  - Cifras que no coinciden con los listados si un estado cambia de significado: mitigado con CA-05 y con la misma fuente de estados.
  - Cambios de permisos en `api-023`: si un rol gana o pierde `species.review` o `memories.review`, el aviso sigue sus permisos sin cambios en esta spec.
  - Pendientes de cuentas eliminadas con `keep` (`api-010` pregunta 8): cuentan igual, porque siguen en revisión.
- **Decisiones 2026-11-20** (las preguntas de la versión Borrador quedan cerradas):
  1. **¿`in_review` cuenta como pendiente de momentos?** Decisión 2026-11-20: sí (RN-03, CA-05).
  2. **¿Límite de frecuencia?** Decisión 2026-11-20: 60 llamadas por minuto y por usuario (CA-10).
  3. **¿Solicitud `submitted` de especie con `deleted_at` en la especie?** Decisión 2026-11-20: no cuenta (RN-02, RN-04, CA-12).
  4. **¿`403` sin cifras cuando no hay ningún permiso?** Decisión 2026-11-20: sí, `403` (RN-06, CA-07).
  5. **¿Ruta y nombre?** Decisión 2026-11-20: `GET /api/v1/admin/pending-counts` y `admin.pending-counts.show` (RN-10).
  6. **¿Hace falta índice sobre `status`?** Decisión 2026-11-20: no. La consulta de solo lectura de 2026-11-20 confirma que ya hay índices que empiezan por `status` en ambas tablas; no se abre DBR (Datos, privacidad y auditoría).

## Revisión

- Aprobadores y fecha: Jonathan, 2026-11-20.
- Enmienda técnica 2026-11-20: aprobación técnica del plan `apps/api/plan/024-pending-review-counts.md`. Enmienda CA-01 (forma sin `data`) y CA-10 (cuota para quien no tiene permiso y texto del 429). Sin CA ni RN nuevos.
- Evidencia/enlaces: `apps/api/specs/014-species-requests.md`, `apps/api/specs/010-visitor-memory-requests.md`, `apps/dashboard/specs/008-memory-moderation.md`, `apps/dashboard/specs/009-species-request-review.md`, `apps/dashboard/specs/011-collapsible-menu-event-pagination.md`; código: `apps/api/src/app/Enums/SpeciesRequestStatus.php`, `apps/api/src/app/Enums/MemoryStatus.php`, `apps/api/src/app/Models/SpeciesPublicationRequest.php`, `apps/api/src/app/Models/VisitorMemory.php`, `apps/api/src/routes/api.php` (grupo `admin`, middleware `administrator.two-factor`, rutas `species.review` y `memories.review`), `apps/api/src/database/seeders/RolesAndPermissionsSeeder.php`.
- Consulta de esquema vivo (`arca_pruebas`, solo lectura, 2026-11-20): realizada; resultados en «Datos, privacidad y auditoría».

## Nota de revisión (2026-11-21, `api-027`)

- Se añade la clave `cancellation_days` (entero ≥ 0) para quien tiene `reports.cancellations.view` (solo `admin`). Cuenta los pares cajero-día en Atención de los últimos 7 días de negocio cerrados sin revisión vigente o con `clarification_required` (`api-027` CA-23, RN-11). Sin envoltorio `data`.
- Excepción a «Fuera de alcance»: los avisos de cancelaciones dejan de estar fuera de alcance solo para esta clave. Los demás flujos (pagos, arqueo, cuentas, recuerdos sin revisar) siguen fuera.
- RN-06 y CA-07 se amplían: sin ninguno de los tres permisos (`species.review`, `memories.review`, `reports.cancellations.view`), la respuesta es 403 sin cifras. La ruta usa `permission:species.review|memories.review|reports.cancellations.view`.
- CA-10 se amplía: quien no tiene ninguno de los tres permisos no consume cuota (`Limit::none()`); el resto, 60/min por usuario, sin cambio.
- RN-05 se amplía: `reports.cancellations.view` habilita `cancellation_days`. CA-02 y CA-03 (solo una clave por permiso) siguen vigentes para sus permisos; `admin` solo recibe `cancellation_days`, porque no tiene los otros dos permisos.
- Sin cambio de esquema ni de índices (`api-027` no requiere índice nuevo en estas tablas; el cálculo reutiliza la Action de semáforo).
- RN-08 se matiza: `admin` ya no está excluido en general; recibe solo la clave de cancelaciones.
