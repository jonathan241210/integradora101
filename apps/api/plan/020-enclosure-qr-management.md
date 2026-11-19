# Plan técnico · 020 · enclosure-qr-management

- Spec: `apps/api/specs/020-enclosure-qr-management.md`
- Estado de spec: Aprobada (Jonathan, 2026-11-18)
- Estado del plan: **Aprobado** (Jonathan, 2026-11-18). Autoriza la implementación según sus tasks.
- Responsable técnico: Jonathan (backend, según DBR-021)
- DBR relacionada: `docs/database/requests/DBR-021-enclosure-qr-codes-soft-deletes.md` (Lista para backend, aplicada en `arca_pruebas` el 2026-11-18)
- ADR relacionados: ADR 0021 (excepción de `BaseModel`, cubre `EnclosureQrCode`), ADR 0019 (SVG con `bacon/bacon-qr-code`). No se requiere ADR nuevo.

## Diseño de solución

El flujo sigue la cadena de `AGENTS.md` de la API: ruta admin con `permission:enclosures.manage` → controlador delgado → Action → modelo. La API es la única autoridad sobre códigos; el panel y el comando solo consumen las mismas Actions.

Componentes:

- **Modelo `EnclosureQrCode`:** añade `SoftDeletes` (columna `deleted_at` de DBR-021). Sigue sin `BaseModel` y con `timestamps = false`. No usa el trait `LogsActivity`: el registro de actividad se escribe a mano desde las Actions para no volcar el atributo `code`.
- **Modelo `Enclosure`:** añade la relación `qrCodes()` (`hasMany`). Sin otros cambios.
- **Generador de códigos:** clase `EnclosureQrCodeGenerator` que devuelve un valor nuevo `ARCA-` + 8 caracteres del alfabeto `ABCDEFGHJKMNPQRSTUVWXYZ23456789`, con `random_int`. Está detrás de un contrato `QrCodeValueGenerator` para que los tests simulen colisiones (CA-09) sin tocar la lógica de reintento.
- **Actions** en `app/Actions/Admin/Enclosures/`:
  - `GetEnclosureQrAction`: devuelve el código activo de `id` mayor (RN-01), o `null`. Solo lectura (RN-13).
  - `GenerateEnclosureQrAction`: en transacción, bloquea la fila del recinto (`lockForUpdate`, RN-05). Si hay activo, devuelve el de `id` mayor sin crear nada (CA-04, CA-07). Si no, crea uno con hasta 5 intentos ante colisión (CA-09) y registra «Código QR generado».
  - `RegenerateEnclosureQrAction`: en transacción con bloqueo; obtiene los `id` de los activos, los pone a `is_active = 0` (nunca `deleted_at`, RN-04), crea el nuevo y registra «Código QR regenerado» con `deactivated_ids`.
  - `RenderEnclosureQrSvgAction`: genera el SVG en memoria con `SvgImageBackEnd` (mismo patrón que `RenderTicketQrSvgAction`, RN-08). No persiste nada.
  - `DeleteEnclosureAction` (existente, `api-019`): se modifica para marcar `deleted_at` en los códigos del recinto dentro de su transacción (RN-16).
- **Resultado interno:** las Actions devuelven un objeto de lectura (`EnclosureQrResult`: recinto, código o nulo, `deactivated`, `created`). El controlador lo pasa a `EnclosureQrResource` junto con el SVG. Ningún recurso calcula reglas.
- **Controlador `EnclosureQrController`:** tres métodos (`show`, `generate`, `regenerate`), sin cuerpo que validar, así que no hay Form Request. Las respuestas de error 404 salen de la resolución del modelo, igual que en `api-019`.
- **Comando `arca:generate-qr-codes {enclosure} {--regenerate}`:** sustituye la lógica actual por `GenerateEnclosureQrAction`; con `--regenerate` llama a `RegenerateEnclosureQrAction`. Imprime solo el valor. En consola no hay usuario autenticado: el registro de actividad guarda `causer` vacío (pregunta de implementación, ver «Riesgos»).
- **Listado admin:** `ListEnclosuresAction` añade `withExists(['qrCodes as has_active_qr' => fn ($q) => $q->where('is_active', true)])`. `withExists` respeta el scope de borrado del modelo relacionado, así que solo cuentan códigos no eliminados (CA-14).
- **Escaneo (`api-005`):** `RecordVisitorDiscoveryAction` no cambia de lógica. Como `EnclosureQrCode` usa `SoftDeletes`, la búsqueda por `code` ya excluye los eliminados y responde `invalid_code` (CA-20). El rechazo `inactive_code` sigue para códigos desactivados (CA-17, CA-23).
- **Progreso (`api-005`):** `VisitorProgressQuery` no cambia. Su join crudo sobre `enclosure_qr_codes` no filtra `deleted_at`, y así debe seguir (RN-17). Un test lo fija.
- **Cliente (`packages/api-client`):** `admin.ts` añade `enclosures.qr(id)`, `enclosures.generateQr(id)` y `enclosures.regenerateQr(id)`; `admin-types.ts` añade `EnclosureQr` y `has_active_qr` en el tipo de recinto admin. Sin lógica de negocio.
- **Rutas** (en `routes/api.php`, dentro del grupo admin existente con `permission:enclosures.manage`):
  - `GET /api/v1/admin/enclosures/{enclosure}/qr` → `enclosures.qr.show`
  - `POST /api/v1/admin/enclosures/{enclosure}/qr` → `enclosures.qr.generate`
  - `POST /api/v1/admin/enclosures/{enclosure}/qr/regenerate` → `enclosures.qr.regenerate`

## Cambios por área

| Área/app | Archivos o módulos previstos | Propósito |
|---|---|---|
| API / modelos | `app/Models/EnclosureQrCode.php` (SoftDeletes), `app/Models/Enclosure.php` (`qrCodes()`) | Borrado lógico y relación (CA-19, CA-20) |
| API / generación | `app/Actions/Admin/Enclosures/Qr/EnclosureQrCodeGenerator.php`, contrato `QrCodeValueGenerator` | Alfabeto, CSPRNG, reintento (CA-08, CA-09) |
| API / Actions | `app/Actions/Admin/Enclosures/GetEnclosureQrAction.php`, `GenerateEnclosureQrAction.php`, `RegenerateEnclosureQrAction.php`, `RenderEnclosureQrSvgAction.php`, `EnclosureQrResult.php`; modificar `DeleteEnclosureAction.php` y `ListEnclosuresAction.php` | Lógica de QR, borrado en cascada lógica, `has_active_qr` (CA-01 a CA-07, CA-14, CA-19) |
| API / HTTP | `app/Http/Controllers/Admin/EnclosureQrController.php`, `app/Http/Resources/Admin/EnclosureQrResource.php`, `routes/api.php` | Endpoints delgados (CA-01 a CA-13) |
| API / consola | `app/Console/Commands/GenerateQrCodesCommand.php` | Comando que reutiliza las Actions (CA-18) |
| API / visitante | Sin cambio de código: `app/Actions/Visitor/RecordVisitorDiscoveryAction.php`, `app/Actions/Visitor/VisitorProgressQuery.php` | Verificados por tests (CA-17, CA-20 a CA-24) |
| API / pruebas | `tests/Feature/Admin/EnclosureQrTest.php`, `tests/Unit/Enclosures/EnclosureQrCodeGeneratorTest.php`, `tests/Feature/Console/GenerateQrCodesCommandTest.php`, `tests/Feature/Visitor/EnclosureQrLifecycleTest.php` | Un test por CA (CA-26) |
| Cliente | `packages/api-client/admin.ts`, `packages/api-client/admin-types.ts` | Métodos y tipos (sin lógica) |
| Documentación | `apps/api/docs/administracion.md` (endpoints de QR), `apps/api/specs/019-*.md`, `apps/api/specs/005-*.md`, `apps/mobile/specs/006-*.md` (texto de fuera de alcance) | Enmiendas aprobadas (T-18) y referencia vigente |

## Contrato y datos

- **Endpoints:** los tres de «Diseño de solución». Autenticación: sesión Sanctum/SPA del grupo admin con `administrator.two-factor` (existente). Permiso: `enclosures.manage`.
- **Respuesta de consulta y generación:** `{ "enclosure": { "id", "name", "is_active" }, "qr": { "code", "svg" } | null }`. Generar responde 201 si creó, 200 si reutilizó (CA-03, CA-04).
- **Respuesta de regenerar:** mismo cuerpo más `"deactivated": N` (CA-05 a CA-07). `qr` nunca es nulo en regenerar.
- **Validación:** no hay cuerpo en ninguna de las tres rutas. Un cuerpo enviado se ignora.
- **Form Requests, Policies:** no hay Form Request. La autorización es el middleware `permission:enclosures.manage`; no se añade Policy porque no hay recurso por propietario.
- **DBR:** DBR-021 aplicada. Esta implementación no crea migraciones ni SQL.
- **Errores:** 401 sin sesión; 403 sin permiso; 404 `{"message": "Recinto no encontrado."}`; 500 `{"message": "No pudimos generar el código QR. Inténtalo de nuevo."}` tras cinco colisiones (CA-09). Ningún mensaje contiene el código.
- **Compatibilidad:** `GET /api/v1/admin/enclosures` gana `has_active_qr` (campo aditivo). Las rutas públicas de `api-010` no cambian. El comando conserva su nombre y su argumento; cambia su comportamiento por defecto (CA-18), registrado como enmienda a `api-005` CA-12.
- **Auditoría:** Activitylog con `log_name` de recintos, `causer` = usuario (o vacío desde consola), `subject` = recinto, `description` en español («Código QR generado», «Código QR regenerado») y `properties` = `{ qr_code_id, deactivated_ids }`. Nunca el valor del código (RN-10).

## Seguridad, offline y operación

- **Mínimo privilegio:** solo `enclosures.manage`; ocultar botones en el panel no sustituye esta comprobación.
- **Datos sensibles:** el código no aparece en listados públicos (CA-15), búsqueda global (CA-16), logs de aplicación ni Activitylog (CA-10). Ninguna `Log::` ni excepción incluye el valor. El SVG solo se devuelve en las tres rutas admin.
- **Aleatoriedad:** `random_int` por carácter (CSPRNG). No se usa `rand`, `mt_rand` ni `Str::random` para códigos nuevos.
- **Concurrencia:** `lockForUpdate` sobre la fila del recinto en generar, regenerar y eliminar (RN-05). En MySQL 8.0 es estándar y portable entre Aiven y local.
- **Rate limit:** no se añade. Los escaneos ya tienen su límite (`api-005` CA-03). Riesgo de enumeración recogido en la spec.
- **Offline:** no aplica en esta spec. La app móvil valida siempre en la API (`mobile-006`).
- **Observabilidad:** solo contadores y `qr_code_id` en Activitylog.
- **Portabilidad:** sin funciones, triggers ni vistas. Índice `idx_enclosure_qr_codes_deleted_at` de DBR-021. Sin variables de entorno nuevas; sin cambios en `infra/README.md` (bacon ya instalado, sin requisitos de servidor nuevos).

## Mapeo de criterios a pruebas

Todas las pruebas usan `DatabaseTransactions` sobre `arca_pruebas`. Nombres: docblock `/** CA-xx enclosure-qr-management */` y método `test_caNN_...`.

| Criterio | Prueba automatizada | App/ubicación | Tareas |
|---|---|---|---|
| CA-01 | `test_ca01_consultar_codigo_activo_sin_efectos` | API `tests/Feature/Admin/EnclosureQrTest.php` | T-04, T-16 |
| CA-02 | `test_ca02_consulta_sin_codigo_devuelve_null` | idem | T-04 |
| CA-03 | `test_ca03_generar_crea_una_fila_y_registra_actividad` | idem | T-05 |
| CA-04 | `test_ca04_generar_con_activo_no_duplica` | idem | T-05 |
| CA-05 | `test_ca05_regenerar_desactiva_y_no_elimina` | idem | T-06 |
| CA-06 | `test_ca06_regenerar_sin_codigo_previo` | idem | T-06 |
| CA-07 | `test_ca07_varios_activos_muestra_el_mayor_y_regenerar_desactiva_todos` | idem | T-04, T-06 |
| CA-08 | `test_ca08_formato_sin_caracteres_ambiguos` (1000 códigos) | `tests/Unit/Enclosures/EnclosureQrCodeGeneratorTest.php` | T-03 |
| CA-09 | `test_ca09_colision_reintenta_y_luego_responde_500` | idem | T-03, T-05 |
| CA-10 | `test_ca10_activitylog_sin_valor_del_codigo` | `EnclosureQrTest.php` | T-05, T-06 |
| CA-11 | `test_ca11_recinto_inactivo_responde_igual_con_is_active_false` | `EnclosureQrTest.php` | T-04, T-05, T-06 |
| CA-12 | `test_ca12_recinto_eliminado_o_inexistente_responde_404` | `EnclosureQrTest.php` | T-04 a T-06 |
| CA-13 | `test_ca13_sin_sesion_401_y_sin_permiso_403` | `EnclosureQrTest.php` | T-07 |
| CA-14 | `test_ca14_listado_admin_incluye_has_active_qr_sin_codigo` | `EnclosureQrTest.php` | T-08 |
| CA-15 | `test_ca15_rutas_publicas_no_exponen_codigo` | `EnclosureQrTest.php` | T-09 |
| CA-16 | `test_ca16_busqueda_global_no_encuentra_por_codigo` | `EnclosureQrTest.php` | T-09 |
| CA-17 | `test_ca17_escaneo_de_codigo_desactivado_responde_inactive_code` | `tests/Feature/Visitor/EnclosureQrLifecycleTest.php` | T-12 |
| CA-18 | `test_ca18_comando_reutiliza_activo_y_regenerate_crea_nuevo` | `tests/Feature/Console/GenerateQrCodesCommandTest.php` | T-11 |
| CA-19 | `test_ca19_eliminar_recinto_marca_deleted_at_en_sus_codigos` | `EnclosureQrTest.php` (con `EnclosureDeleteTest` de `api-019` como regresión) | T-10 |
| CA-20 | `test_ca20_escaneo_de_codigo_eliminado_responde_invalid_code` | `EnclosureQrLifecycleTest.php` | T-12 |
| CA-21 | `test_ca21_regenerar_conserva_progreso` | `EnclosureQrLifecycleTest.php` | T-13 |
| CA-22 | `test_ca22_codigo_nuevo_con_especies_conocidas_responde_already_discovered` | idem | T-13 |
| CA-23 | `test_ca23_escaneo_encolado_del_codigo_anterior_responde_inactive_code` | idem | T-12 |
| CA-24 | `test_ca24_eliminar_recinto_conserva_enclosure_count_y_puntos` | idem | T-13 |
| CA-25 | `test_ca25_portal_busqueda_y_mapa_no_cambian_al_regenerar` | idem | T-14 |
| CA-26 | Verificación de cobertura: cada `test_caNN_` existe y cada CA-01 a CA-25 tiene al menos uno | `EnclosureQrTest.php` y revisión en PR | T-16 |

## Constitution Check

| Principio | Cumple | Evidencia o excepción propuesta |
|---|---|---|
| I. Stack mínimo y portable | Sí | Sin dependencias nuevas; `bacon/bacon-qr-code` ya es dependencia directa (ADR 0019). Sin variables de nube. Índice y columna de DBR-021 portables. |
| II. La spec manda | Sí | Spec 020 Aprobada (2026-11-18). Plan y tasks con el mismo `020-enclosure-qr-management`. Enmiendas de `api-019`, `api-005` y `mobile-006` aprobadas y aplicadas en T-18. |
| III. Lógica separada de la interfaz | Sí | Reglas en Actions; controlador delgado; `api-client` sin lógica; el panel no calcula el código (`dashboard-013`). |
| IV. Un test por criterio | Sí | Mapeo de CA-01 a CA-26 con nombre `test_caNN_`. CI en verde: pendiente de evidencia de la sesión principal. |
| V. Una sola fuente de verdad para los datos | Sí, con excepción documentada | Esquema solo por DBR-021 (aplicada). `EnclosureQrCode` usa SoftDeletes y no `BaseModel`: excepción cubierta por ADR 0021, igual que `Enclosure`. Sin borrado físico. Activitylog en generar, regenerar y eliminar. |
| VI. Código en inglés, personas en español | Sí | Identificadores y rutas en inglés (`enclosures.qr.*`). Mensajes y `description` de Activitylog en español. |

Ninguna excepción nueva se implementa sin revisión. La única excepción (`BaseModel`) ya está cubierta por ADR 0021.

## Riesgos y decisiones

- **ADR requerido/aprobado:** ADR 0021 (cubre `EnclosureQrCode`) y ADR 0019 (SVG). Ninguno nuevo.
- **Registro de actividad desde consola:** el comando no tiene usuario. Propuesta: `causer` vacío y `properties.source = "console"`. Confirmar en revisión técnica; no altera la spec (CA-10 habla de actor cuando hay usuario).
- **Cambio de comportamiento del comando:** deja de crear un código cada vez. Está en la spec (CA-18) y en la enmienda a `api-005` CA-12.
- **Escaneo de recintos eliminados:** el código ya no se encuentra, así que responde `invalid_code` y no `inactive_enclosure`. Es la enmienda a `api-019` CA-18. El test actual de `api-019` (`EnclosureScanTest`, caso de recinto eliminado) debe actualizarse en el mismo PR (T-12).
- **Numerador de especies:** `api-019` CA-35 puede bajar `species_count` al eliminar un recinto que era la única exhibición de una especie. Se mantiene sin cambio (divergencia (a) aclarada a Jonathan). CA-24 solo garantiza `enclosure_count` y puntos.
- **Enumeración:** 8,5·10¹¹ combinaciones. El límite de escaneos por visitante reduce el riesgo; no se añade limitación nueva.
- **Alternativas descartadas:** guardar el SVG en disco (contradice ADR 0019); `Str::random` para el alfabeto nuevo (no permite excluir caracteres ambiguos de forma directa); añadir `deleted_at IS NULL` al join del progreso (rompería el progreso ya obtenido).

## Orden y aprobación

1. DBR-021 aplicada (hecho, evidencia en la DBR). Sin esto no se avanza.
2. Modelo con SoftDeletes, relación y generador (T-02, T-03).
3. Actions y endpoints de consulta, generación y regeneración (T-04 a T-07).
4. Listado, borrado en cascada lógica y comando (T-08, T-10, T-11).
5. Pruebas de escaneo y progreso (T-12 a T-14).
6. Cliente (`packages/api-client`, T-15). Desbloquea `dashboard-013`.
7. Cobertura, documentación, enmiendas y verificación (T-16 a T-19); PR (T-20).

- Revisión técnica: pendiente (Jonathan, responsable técnico).
- Aprobador funcional: Jonathan, spec aprobada el 2026-11-18.
- Evidencias: pendientes de la sesión principal (salida de `php artisan test` contra `arca_pruebas`, Pint y migraciones). Esta sesión no tiene shell y no afirma que pasen.
