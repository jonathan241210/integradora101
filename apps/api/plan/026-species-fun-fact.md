# Plan técnico · 026 · species-fun-fact

- Spec: `apps/api/specs/026-species-fun-fact.md` (Aprobada, Jonathan, 2026-11-21)
- Estado de spec: Aprobada
- Estado del plan: **Aprobado — aprobación técnica: Jonathan, 2026-11-21**. Las tareas de `tasks/026-species-fun-fact.md` se ejecutan en su orden y solo cuando DBR-025 esté en «Lista para backend».
- Responsable técnico: Jonathan (aprobación técnica, 2026-11-21)
- Responsable de BD: Víctor Adrián (pendiente de confirmar; en DBR-024 la delegó Jonathan)
- DBR relacionada: `docs/database/requests/DBR-025-species-fun-fact.md`, estado **Lista para backend** (aprobada por Jonathan por delegación, 2026-11-21).
- Consumidores: `pwa-005`, `dashboard-010` y `web-011` (revisiones en sus specs, ver `apps/api/specs/026-species-fun-fact.md`). Sus planes y tareas no se crean en este documento (ver «Riesgos y decisiones»).
- ADR relacionados: ADR 0013 (portabilidad MySQL). No se requiere ADR nuevo.

## Decisiones técnicas

- **Clave `fun_fact`** (recomendada y aprobada en el plan). Se usa en `published_fields`, en el enum `App\Enums\PublishedSpeciesField` (caso `FunFact`), en las respuestas de la API y en la columna de BD. El nombre en español («Dato curioso») existe solo en la UI.
- **Columnas:** `species.fun_fact` y `species_publication_requests.fun_fact`, `VARCHAR(500) NULL`, sin valor por defecto, sin índice, sin FK (DBR-025).
- **Validación en dos niveles.** El Form Request valida formato y longitud de lo que llega (CA-03, texto). La regla que depende del estado final («con el campo marcado, mínimo 20 caracteres», CA-02, CA-05, CA-08) se evalúa en la Action con el registro bloqueado (`api-014` CA-19, `LocksSpeciesPublication`), porque en una edición el valor final puede venir de la base de datos.
- **Presencia del campo:** el texto solo se guarda si `fun_fact` está en `published_fields` (RN-02). Al aceptar, `species.fun_fact` toma el valor de la solicitud, igual que `published_fields` (RN-03).

## Diseño de solución

El flujo sigue la cadena de la API que ya existe para `published_fields` (`api-014`): Form Request → Action (con bloqueo) → Resource. El trait `ValidatesPublishedFields` ya rechaza claves fuera de `PublishedSpeciesField::implementedValues()`, así que añadir el caso al enum y a `implemented()` basta para aceptar `fun_fact` en todos los puntos de entrada. La API es la única autoridad de la regla; los clientes solo presentan y avisan.

Puntos de cambio (lo que hoy trabaja con `published_fields` y las correcciones):

1. **Enum.** `FunFact` en `PublishedSpeciesField`, incluido en `implemented()`. `defaults()` no lo incluye (la selección por defecto de `api-014` RN-13 no cambia).
2. **Texto del campo.** Una constante o helper compartido (por ejemplo `App\Support\FunFactRules` o un método en el trait) con: recorte de espacios, `mb_strlen` para contar caracteres, mínimo 20 y máximo 500, y el mensaje de cada caso (ver la tabla de mensajes de la spec).
3. **Envío.** `StoreSpeciesPublicationRequest` añade `fun_fact` como `nullable|string|max:500` (en Laravel, `max` sobre cadenas cuenta caracteres; el mínimo tras recortar lo valida el helper, porque depende de `published_fields`). `SubmitSpeciesPublicationRequestAction` guarda `fun_fact` solo si `published_fields` lo incluye; si no, NULL (RN-02).
4. **Edición de solicitud.** `ValidatesSpeciesSheetEdit` añade `fun_fact` a `EDITABLE` y al formato. `UpdateSpeciesPublicationRequestAction` aplica la regla de estado final dentro del bloqueo (CA-05), compara antes y después para la auditoría (CA-06) y guarda NULL si el campo queda desmarcado.
5. **Aceptación.** `AcceptSpeciesPublicationRequestAction` copia `fun_fact` a `species` junto con `published_fields` (CA-07). No hay cambio de body en `POST .../accept`.
6. **Especie despublicada.** `UpdateUnpublishedSpeciesAction` aplica las mismas reglas sobre `species.fun_fact` (CA-08).
7. **Republicar.** `RepublishSpeciesAction` comprueba el campo cuando está seleccionado (CA-09). Sigue exigiendo `image_path` y `published_fields` no nulos (`api-014` CA-36).
8. **Eliminar.** `DeleteSpeciesPublicationAction` no toca `fun_fact` (RN-05). Ya pone `published_fields` a NULL.
9. **Pública.** `ListPublishedSpeciesAction` añade `species.fun_fact` a la selección. `PublishedSpeciesResource` añade `fun_fact` solo si la clave está en `published_fields` (la tabla `FIELD_COLUMNS` pasa a tener `'fun_fact' => 'fun_fact'`). No es filtro (RN-06).
10. **Selector y detalle.** `SelectableSpeciesResource` añade `fun_fact` (valor vigente, CA-14). `SpeciesPublicationRequestDetailResource` y `SpeciesPublicationDetailResource` añaden `fun_fact` en `current` y `proposed` (CA-15). Los listados no lo incluyen (CA-13).

## Contrato y datos

- **Endpoints afectados (sin rutas nuevas):**
  - `POST /api/v1/veterinarian/species-publication-requests` (multipart): admite `fun_fact` (texto) junto a `published_fields`.
  - `PATCH /api/v1/admin/species-publication-requests/{id}`: admite `fun_fact`.
  - `PATCH /api/v1/admin/species/{id}/publication` (especie despublicada): admite `fun_fact`.
  - `POST .../{id}/accept`, `POST .../species/{id}/publication/republish`, `DELETE .../publication`: cambian de comportamiento según RN-03, CA-09 y RN-05; sin cambio de body.
  - `GET /api/v1/published-species`: añade la clave `fun_fact` cuando está seleccionada (aditivo).
  - `GET /api/v1/veterinarian/species`: añade `fun_fact` (aditivo).
  - Detalles de administración: añade `fun_fact` en `current` y `proposed` (aditivo).
- **Autenticación y permisos:** sin cambio. Veterinario por rol; administración con `species.review` y 2FA (`api-014` CA-07, CA-12).
- **Form Requests, Actions, Resources, Policies:** Form Requests existentes, un helper de texto compartido y las Actions indicadas arriba. Los controladores no calculan nada. No hay Policy nueva.
- **DBR y migraciones:** DBR-025 (Lista para backend). Migración idempotente bajo `apps/api/src/database/migrations/` (propuesta de nombre: `2026_11_21_000025_species_fun_fact.php`), creada por el responsable de BD. Backend no la escribe. Migración: `Schema::hasColumn` antes de `ALTER`, `down()` que retira las dos columnas.
- **Errores y compatibilidad:**
  - Mensajes en español (tabla de la spec). Campos en `errors.fun_fact`.
  - `422` si el texto no cumple; ningún cambio en el `422`.
  - Despliegue: DBR-025 → API → consumidores. Antes de la migración, `fun_fact` es una clave desconocida (422, CA-01). Después, la API acepta el campo y los clientes antiguos siguen funcionando (no lo envían).
  - La respuesta pública no cambia para ninguna especie existente (columna NULL, RN-10).

## Seguridad, offline y operación

- **Datos:** texto público, sin datos clínicos ni personales por diseño (RN-08). La API no lo transforma (RN-07). Los clientes lo muestran como texto. No se usa `innerHTML` (`web-011` CA-11).
- **Mínimo privilegio:** sin permiso nuevo. Los campos de administración siguen detrás de `species.review` y 2FA.
- **Auditoría:** Activitylog con valor anterior y nuevo (CA-06), igual que `api-014`.
- **Secretos:** ninguno.
- **Offline:** no aplica. El envío y la revisión son en línea (`api-014`).
- **Portabilidad (ADR 0013):** `VARCHAR(500)` nullable, sin funciones, vistas ni triggers. Conexión solo por `.env`.
- **Observabilidad:** la traza es Activitylog. No se registra el contenido en logs de aplicación.
- **Operación (`infra/README.md`):** sin requisito de servidor ni de ambiente nuevo.

## Mapeo de criterios a pruebas

Convención: `test_caNN_…` en el nombre del método, bajo `apps/api/src/tests/` (Feature para HTTP; Unit para el helper). Todas las pruebas de feature usan `DatabaseTransactions` sobre `arca_pruebas`.

| Criterio | Prueba automatizada | App/ubicación |
|---|---|---|
| CA-01 | `test_ca01_fun_fact_is_an_accepted_published_field` | API / `Unit/PublishedSpeciesFieldTest.php` |
| CA-02 | `test_ca02_required_and_min_20_when_selected` | API / `Feature/SpeciesPublication/FunFactValidationTest.php` |
| CA-03 | `test_ca03_max_500_plain_text_trimmed` | API / `Feature/SpeciesPublication/FunFactValidationTest.php` y `Unit/FunFactRulesTest.php` |
| CA-04 | `test_ca04_text_is_discarded_when_field_not_selected` | API / `Feature/SpeciesPublication/SubmitFunFactTest.php` |
| CA-05 | `test_ca05_patch_validates_fun_fact_on_final_state` | API / `Feature/SpeciesPublication/EditFunFactTest.php` |
| CA-06 | `test_ca06_fun_fact_change_is_audited_with_before_and_after` | API / `Feature/SpeciesPublication/EditFunFactTest.php` |
| CA-07 | `test_ca07_accept_copies_fun_fact_to_species` | API / `Feature/SpeciesPublication/AcceptFunFactTest.php` |
| CA-08 | `test_ca08_unpublished_species_sheet_validates_fun_fact` | API / `Feature/SpeciesPublication/UnpublishedFunFactTest.php` |
| CA-09 | `test_ca09_republish_requires_valid_fun_fact_when_selected` | API / `Feature/SpeciesPublication/RepublishFunFactTest.php` |
| CA-10 | `test_ca10_delete_keeps_fun_fact_hidden_from_public` | API / `Feature/SpeciesPublication/RepublishFunFactTest.php` |
| CA-11 | `test_ca11_public_returns_fun_fact_only_when_selected_and_visible` | API / `Feature/Catalog/PublishedSpeciesFunFactTest.php` |
| CA-12 | `test_ca12_public_fun_fact_keeps_published_version_during_pending_update` | API / `Feature/Catalog/PublishedSpeciesFunFactTest.php` |
| CA-13 | `test_ca13_fun_fact_absent_from_lists_and_mobile_responses` | API / `Feature/SpeciesPublication/FunFactScopeTest.php` (incluye `api-006`) |
| CA-14 | `test_ca14_selector_exposes_current_fun_fact_to_veterinarian` | API / `Feature/Veterinarian/SelectableSpeciesFunFactTest.php` |
| CA-15 | `test_ca15_admin_detail_shows_current_and_proposed_fun_fact` | API / `Feature/SpeciesPublication/FunFactScopeTest.php` |
| CA-16 | Búsqueda de `test_ca01` a `test_ca15` en `apps/api/src/tests/` (evidencia con la salida de la búsqueda) | API / tests |

Regresión: las pruebas existentes de `api-014` (publicación de especies) y de `api-015` (lectura pública) deben seguir en verde, sin cambiar sus aserciones de claves salvo en las que se añade `fun_fact` de forma aditiva. Ninguna prueba previa se relaja.

## Constitution Check

| Principio | Cumple | Evidencia o excepción propuesta |
|---|---|---|
| I. Stack mínimo y portable | Sí | Sin dependencia nueva. `VARCHAR(500)` nullable, sin funciones ni triggers. Conexión solo por `.env`. |
| II. La spec manda | Sí | Spec 026 Aprobada (2026-11-21) con plan y tasks del mismo NNN-slug. Código condicionado a DBR-025. Las revisiones de consumidores quedan en sus propias specs. |
| III. Lógica separada de la interfaz | Sí | Reglas de texto, obligatoriedad y copia en Actions y en el helper de API. Las interfaces solo muestran el mensaje y el contador. |
| IV. Un test por criterio | Sí, al implementar | Mapeo de CA-01 a CA-16 (tabla anterior). Verificación por búsqueda de `test_caNN`. |
| V. Una sola fuente de verdad para los datos | Sí, con condición | Esquema solo por migración tras DBR-025 aprobada. Auditoría en Activitylog. Sin borrado físico. Sin SoftDeletes nuevos. |
| VI. Código en inglés, personas en español | Sí | Identificadores `fun_fact`, `FunFact`; mensajes y textos de ayuda en español. |

Brechas abiertas: ninguna que requiera ADR. Condiciones: DBR-025 en «Lista para backend» (T-04).

## Riesgos y decisiones

- **ADR requerido/aprobado:** ninguno nuevo.
- **Dependencia bloqueante:** DBR-025 en «Lista para backend» desde 2026-11-21.
- **Contenido inadecuado:** la API no lo detecta (RN-08). Mitigación: revisión de la Dirección antes de aceptar y texto de ayuda en el formulario. Riesgo residual aceptado por diseño.
- **Deriva `diet`/`feeding` (no corregida aquí):**
  - La columna de `species` se llama `feeding` (DBR-014). Las claves de `PublishedSpeciesField`, de `api-014` RN-13, de `api-015`, de `apps/web/src/js/animals.js` (`FIELDS`) y de `apps/web/src/js/search.js` usan `diet`.
  - Esta spec no añade nada que dependa de esa clave y no la corrige. Se abre spec propia.
- **Consumidores sin plan ni tareas:** las revisiones de `pwa-005`, `dashboard-010` y `web-011` son enmiendas a specs ya aprobadas. Según la convención, la app que implemente el cambio necesita plan y tareas con el mismo NNN-slug de su spec. Como esas specs no tienen número nuevo, no se crean aquí. La decisión queda abierta (pregunta 2 de «Preguntas pendientes para el plan»).
- **Alternativas consideradas:**
  - `TEXT` en vez de `VARCHAR(500)`: descartado (sin default, sin límite de longitud en BD, mayor coste de fila fuera de línea). Ver DBR-025.
  - Clave `dato_curioso`: descartada; el resto de claves va en inglés (Constitución VI).
  - Guardar el texto aunque el campo no esté marcado: descartado; evita texto oculto (RN-02).

## Orden y aprobación

1. DBR-025 revisada por BD (responsable por confirmar) y backend (Jonathan); evidencia y estado «Lista para backend» (T-01 a T-04).
2. Backend (T-05 en adelante), en el orden de `tasks/026-species-fun-fact.md`.
3. Tipos en `packages/api-client` y revisiones de consumidores, tras las revisiones aprobadas de `pwa-005`, `dashboard-010` y `web-011` (fuera de este plan).
4. Verificación de la API: Pint, `php artisan test` filtrado contra `arca_pruebas`, `migrate:status`. Evidencia aportada por la sesión principal.

- Revisión técnica: Jonathan, 2026-11-21.
- Aprobador funcional: Jonathan (spec aprobada 2026-11-21).
- Evidencias: pendientes (DBR-025, pruebas de la migración, salida de tests).

## Preguntas pendientes para el plan

1. Confirmar la clave `fun_fact` (decisión 4 de la spec). Propuesta: sí.
2. Confirmar que los consumidores no tienen plan ni tareas en esta etapa (ver «Riesgos»). Si Jonathan prefiere planes por app, se abren con el mismo NNN-slug en cada app o con números nuevos siguiendo `api-022` / `dashboard-016`.

## Divergencias de implementación

- Helper compartido: `App\Support\FunFactRules` (`normalize`, `isSelected`, `isValidLength`, `resolve`). `resolve` aplica RN-02 (NULL si el campo no está seleccionado) y lanza el `422` de CA-02/CA-03 con `errors.fun_fact`.
- `ValidatesSpeciesSheetEdit::editableData()` incluye `fun_fact` (ya recortado); las Actions de edición lo separan antes del bucle de correcciones.
- El error de republicar (CA-09) usa la clave `errors.fun_fact` (no `species`), según la tabla de mensajes de la spec.
- `GET /api/v1/admin/species/{id}/publication` (detalle de especie) no tiene `current`/`proposed`: `fun_fact` va en la raíz.
- `PublishedSpeciesField::defaults()` lista explícitamente las tres claves previas (no deriva de `implemented()`), para no cambiar la selección por defecto.
