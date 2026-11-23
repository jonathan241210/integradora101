# 027 · cancellation-review-signals (semáforo de cancelaciones, revisión y aviso)

- App dueña: `api`
- Apps/paquetes afectados: `api` (dueña: semáforo, señales, revisión auditada, conteo de días pendientes, demo); `dashboard` (`dashboard-021`, consumidor: sección del semáforo, registro de revisión y aviso; notas de revisión en `dashboard-016` y `dashboard-018`); `packages/api-client` (tipos y métodos; sin lógica); `docs/database/requests/DBR-026-cancellation-reviews.md` (tabla `cancellation_reviews`). Notas de revisión en `apps/api/specs/022-ticket-cancellation-report.md` y `apps/api/specs/024-pending-review-counts.md`.
- Estado: Aprobada
- Aprobación funcional: Jonathan, 2026-11-21. Decisiones de la sesión de 2026-11-21 registradas en «Decisiones de Jonathan (2026-11-21)», que cierran todas las preguntas de esta spec. Los valores de RN-04 quedan aprobados como configuración del servidor; cualquier cambio de valor se registra en «Revisión» sin renumerar.
- Solicitante / responsable funcional: Jonathan
- Responsable de BD: Jonathan, por delegación de Víctor Adrián (DBR-026).
- Responsable backend: Jonathan.
- Dependencias de esta spec: `api-022` (reporte de cancelaciones, catálogo de motivos, reglas de periodo y conciliación), `api-024` (conteos de pendientes, al que se añade una clave), `api-025` (zona de negocio `arca.timezone`), `api-021` (2FA y confirmación en el panel), `api-009` (cancelación; sin cambio), `api-007` (2FA de rutas admin y tope de exportación), DBR-024 (columna `cancellation_reason_code`, ya aplicada en `arca_pruebas`), DBR-026 (tabla nueva de revisiones).
- Última edición: 2026-11-21 (notas de la revisión de calidad y seguridad).

## Problema y contexto

`api-022` deja a `admin` ver las cancelaciones y su conciliación, pero no dice cuáles merecen atención. Con el reporte solo, quien revisa tiene que leer cada fila y adivinar qué es normal. Además, no hay forma de dejar constancia de que un día ya se revisó ni de qué se decidió.

Esta spec agrega, en la API:

- Un **semáforo por cajero y día** con tres niveles (Normal, Revisar, Atención), calculado en el servidor a partir de señales fijas y de comparaciones con lo normal.
- Para cada día con nivel distinto de Normal, el **porqué** (qué señales saltaron y cuántas) y el **qué hacer**, en español y en una frase.
- Una **leyenda** que explica cada señal, su límite y que una alerta no prueba nada: solo indica qué revisar.
- **Registro de revisión** por cajero y día («Revisado: todo en orden» o «Requiere aclaración»), con nota, auditado, sin borrado y con historial.
- Un **conteo de días pendientes** para el aviso al entrar, dentro de `GET /api/v1/admin/pending-counts` (`api-024`).

El semáforo no bloquea nada: no cambia boletos, no cambia el reporte de `api-022` y no impide cancelar.

Corrección de procedimiento (decisión 1 de 2026-11-21): el cajero entrega **solo el dinero** al cierre de la taquilla, no el boleto físico cancelado. Esta spec sustituye la recomendación de `api-022` RN-13 (ver «Revisión»). Ningún texto de «qué hacer» de esta spec ni de sus consumidores pide boletos físicos.

## Objetivos

- Que `admin` distinga en un vistazo qué cajero y qué día necesitan revisión, con un criterio comprobable y el mismo en todas las pantallas.
- Que cada nivel distinto de Normal diga por qué y qué hacer, sin que la interfaz calcule nada.
- Que la comparación contra lo normal use el propio histórico del cajero y el de sus compañeros, además de los límites fijos.
- Que cada decisión de revisión quede auditada, con quién y cuándo, y sin borrado físico.
- Que `admin` vea al entrar cuántos días en Atención siguen sin revisar, sin notificaciones nuevas.

## Fuera de alcance

- **Validación del QR en la entrada.** Es futura: no existe registro de entrada en el sistema. No hay señal por ese concepto.
- **Método de pago.** En `arca_pruebas`, todos los boletos tienen `payment_method = cash` (consulta de 2026-11-21). La señal no aportaría nada y no se implementa.
- Reclasificar cancelaciones anteriores a la feature (siguen como «Sin clasificar (anterior)», `api-022` CA-08).
- Deshacer, editar o borrar una cancelación o una revisión. No hay ruta para ello.
- Bloquear una cancelación, un reporte o una exportación por un nivel del semáforo.
- Excluir los datos de demostración de los reportes (decisión de 2026-11-21, ver RN-16).
- Notificaciones por correo, tiempo real o avisos fuera de `pending-counts`.
- Permisos para `zoo-admin`, `executive`, `cashier` o `veterinarian`.
- Cambios de la zona horaria, de la cancelación o del catálogo de motivos.

## Esquema vivo y verificación previa

Consulta de solo lectura sobre `arca_pruebas`, aportada por la sesión principal el 2026-11-21 (`php artisan db:table`, `information_schema`; sin escrituras):

- No existen `cancellation_reviews` ni `ticket_cancellation_reviews`.
- `tickets`: 37 filas, 4 canceladas, 1 con `cancellation_reason_code`. Todas con `payment_method = cash`.
- Zona de sesión de la base: `+00:00`. La zona de negocio la define `arca.timezone` (`America/Mexico_City`).
- `users.id` y `tickets.cashier_id` son de tipo `int` (FK a `users`), confirmado en la consulta de solo lectura del 2026-11-21 por Jonathan.
- Diferencia respecto a DBR-024 (2026-11-20: 34 boletos y 3 canceladas): crecimiento de datos de prueba, no una divergencia de esquema.
- `activity_log` existe (confirmado en la consulta de solo lectura del 2026-11-21).

Resultado: el cambio necesita una tabla nueva (DBR-026). El resto usa columnas y datos existentes.

## Actores y permisos

| Actor/rol | Necesidad | Permisos requeridos |
|---|---|---|
| `admin` (Presidencia) | Ver el semáforo, la leyenda, la revisión y su historial; registrar revisiones; recibir el conteo de días pendientes | Sesión + 2FA; `reports.cancellations.view` (`api-022`) |
| `zoo-admin`, `executive`, `cashier`, `veterinarian` | Sin acceso a semáforo, revisiones ni conteo de días pendientes | — (403) |
| Responsable de BD | Crear, probar y aplicar la tabla de DBR-026 | Flujo DBR de `docs/database/` |

Decisión 8 (2026-11-21): solo `admin` ve y hace todo esto, con `reports.cancellations.view`. No se crea un permiso de escritura aparte (pregunta 3 abierta, ver «Preguntas»).

## Historias de usuario

- Como `admin`, quiero ver por cajero y día si hay señales que revisar, para no tener que leer cada cancelación.
- Como `admin`, quiero leer en una frase por qué un día está en Revisar o Atención y qué hacer, para decidir sin interpretar cifras.
- Como `admin`, quiero marcar un día como revisado o como que requiere aclaración, con una nota, y que quede constancia de quién lo hizo y cuándo.
- Como `admin`, quiero que al entrar se me avise de los días en Atención sin revisar de la última semana.
- Como `admin`, quiero una leyenda que explique cada señal y su límite, para entender el semáforo.

## Criterios de aceptación

### Acceso y lectura

- **CA-01:** Dado un `admin` con `reports.cancellations.view` y 2FA confirmado, cuando llama `GET /api/v1/admin/reports/cancellations` con un periodo válido, entonces responde 200 con los bloques de `api-022` más `reconciliation.cashier_days[]` (semáforo por cajero y día, RN-04 a RN-14) y `legend[]` (CA-26). Test: `test_ca01_admin_gets_cashier_day_traffic_light_and_legend`.
- **CA-02:** Dado un usuario sin `reports.cancellations.view` (`zoo-admin`, `executive`, `cashier`, `veterinarian`), cuando llama el reporte, la exportación, el registro de revisión o su historial, entonces responde 403 sin datos; sin sesión responde 401. Test: `test_ca02_roles_without_permission_get_403_on_all_review_routes`.
- **CA-03:** Dada cualquier llamada de lectura (reporte, exportación o historial), cuando termina, entonces no se crea ni cambia ninguna fila de `cancellation_reviews` ni de `tickets`, y Activitylog no registra nada nuevo. Test: `test_ca03_read_routes_write_nothing`.

### Señales por cajero y día

Definiciones comunes (RN-02, RN-03): para un cajero `c` y un día de negocio `d`, `gross_d` son las cantidades brutas (adultos más niños) vendidas ese día, `cancelled_d` las cantidades canceladas ese día, y `p_d = cancelled_d / gross_d`. El día es el de la venta (`api-022` RN-06).

- **CA-04 (S1 `over_limit_percent`):** Dado un cajero con `p_d > 10 %` y `gross_d ≥ 10`, cuando se calcula el día, entonces la señal se dispara. Con `p_d = 10,00 %` exacto, o con `gross_d = 9`, no se dispara. Test: `test_ca04_over_limit_percent_needs_more_than_10_and_10_sold`.
- **CA-05 (S2 `late_cancellations`):** Dado el instante `L` de la última venta del cajero ese día (completadas o canceladas), cuando un boleto cancelado de ese día tiene `cancelled_at` dentro de `[L − 30 min, L]`, entonces cuenta como tardío; la señal se dispara con 2 o más tardíos. Un boleto cancelado exactamente a `L − 30 min` cuenta; a `L − 30 min − 1 s` no. Test: `test_ca05_late_cancellations_window_is_inclusive_30_min_before_last_sale`.
- **CA-06 (S3 `repeated_other`):** Dado un cajero con 2 o más cancelaciones del día con motivo `other`, cuando se calcula el día, entonces la señal se dispara; con una sola no. Test: `test_ca06_two_other_reason_cancellations_fire_signal`.
- **CA-07 (S4 `same_amount`):** Dado un cajero con 2 o más cancelaciones del día con el mismo `total_amount` (comparado en centavos), cuando se calcula el día, entonces la señal se dispara; importes distintos no cuentan. Test: `test_ca07_two_cancellations_with_same_amount_fire_signal`.
- **CA-08 (S5 `long_cancellations`):** Dado un cajero con 2 o más cancelaciones del día de más de 30 minutos entre venta y cancelación (`api-022` RN-08: más de 1800 s), cuando se calcula el día, entonces la señal se dispara. Test: `test_ca08_two_cancellations_over_30_minutes_fire_signal`.
- **CA-09 (C1 `own_baseline`):** Dado el histórico del propio cajero en las 4 semanas anteriores a `d` (28 días antes de `d`, sin incluir `d`) con al menos 3 días con actividad, cuando `p_d ≥ 2 × B`, `p_d ≥ 5 %` y `cancelled_d ≥ 2`, donde `B = Σ cancelled / Σ gross` de esa ventana, entonces la señal se dispara. Con menos de 3 días con actividad en la ventana, la comparación no se evalúa y la señal no aparece. Test: `test_ca09_own_baseline_fires_only_with_history_and_floors`.
- **CA-10 (C2 `peer_comparison`):** Dado el conjunto de cajeros distintos de `c` con al menos 10 cantidades brutas en los 7 días que terminan en `d` (incluido), cuando hay 2 o más de ellos, entonces `M` es la mediana de sus `p` en esa ventana; la señal se dispara con `p_d ≥ 2 × M`, `p_d ≥ 5 %` y `cancelled_d ≥ 2`. Con menos de 2 compañeros, la comparación no se evalúa. Test: `test_ca10_peer_median_fires_only_with_two_peers_and_floors`.

### Nivel del semáforo

- **CA-11 (combinación):** Dado `k` el número de señales (S1 a S5, C1 y C2; cada una cuenta como máximo una vez por cajero y día), cuando se calcula el nivel, entonces `k = 0` es Normal, `k = 1` es Revisar y `k ≥ 2` es Atención. Tres casos de test: `test_ca11_zero_signals_normal`, `test_ca11_one_signal_review`, `test_ca11_two_signals_attention`.
- **CA-12 (independencia de filtros):** Dado un cajero y un día, cuando el reporte se pide con `cashier_id`, con `reason_code` o con ambos, entonces el nivel, las señales y el porqué de ese día son idénticos a los que se obtienen sin filtros, porque las comparaciones usan todos los datos (no solo los filtrados). Test: `test_ca12_filters_do_not_change_traffic_light`.

### Porqué, qué hacer y leyenda

- **CA-13 (porqué):** Dado un día en Revisar o Atención, cuando se presenta, entonces trae `reasons[]` (código, etiqueta, cantidad y detalle de cada señal disparada) y `reason_sentence` en una frase en español que nombra las señales y sus cantidades. Ejemplo que se prueba literalmente: cajero con `p_d = 16 %`, `gross_d = 25`, `cancelled_d = 4`, `B = 3 %`, 2 cancelaciones de motivo `other` → `reason_sentence` contiene «3 señales: 16 % cancelado frente a 3 % habitual de las últimas 4 semanas, 2 cancelaciones con motivo «Otro»…» (el texto exacto lo fija el plan). Test: `test_ca13_reason_sentence_lists_signals_and_counts`.
- **CA-14 (qué hacer):** Dado un nivel, cuando se presenta `action`, entonces el texto es el de RN-05 de su nivel. Los textos no piden boletos físicos. Test: `test_ca14_action_texts_per_level_and_no_physical_ticket_request`.
- **CA-15 (días y cajeros):** Dado un cajero con cantidades brutas en un día del periodo, cuando se lista, entonces aparece en `cashier_days[]` con su nivel (también Normal). Un día sin actividad no aparece. Un boleto sin cajero registrado forma el grupo «Sin cajero registrado» con `level: null` y `action` «No aplica: el día no tiene cajero registrado.» (RN-10). Test: `test_ca15_lists_every_active_cashier_day_including_normal`.
- **CA-16 (umbrales en configuración):** Dado un valor de umbral cambiado en la configuración del servidor, cuando se calcula el semáforo, entonces el nivel sigue el valor nuevo sin cambiar código. Test: `test_ca16_thresholds_follow_config_value`.
- **CA-26 (leyenda):** Dada la respuesta del reporte, cuando se lee `legend[]`, entonces hay un elemento por señal (S1 a S5, C1, C2) con `code`, `label`, `explanation` y `limit` (texto calculado desde la configuración), y un `disclaimer` con el texto «Una alerta no prueba nada: solo indica qué revisar.». Test: `test_ca26_legend_lists_each_signal_with_limit_and_disclaimer`.
- **CA-27 (paginación):** Dadas varias páginas de `rows`, cuando se comparan, entonces `reconciliation.cashier_days` es idéntico en todas (`api-022` CA-28). Test: `test_ca27_cashier_days_identical_across_pages`.

### Registro de revisión

- **CA-17 (alta):** Dado un `admin` con 2FA, cuando envía `POST /api/v1/admin/reports/cancellations/reviews` con `cashier_id`, `business_date`, `status` y `note` válidos, entonces responde 201 con la revisión creada (`id`, `status`, `status_label`, `note`, `reviewed_by_name`, `reviewed_at`) y crea una fila nueva. Test: `test_ca17_admin_records_review_row`.
- **CA-18 (validación):** Dado un envío inválido, cuando se valida, entonces responde 422 en español y no crea fila: `status` fuera de `reviewed_ok` y `clarification_required`; `note` con menos de 15 o más de 255 caracteres tras recortar espacios; `cashier_id` que no es cajero (un cajero eliminado lógicamente sí es válido, RN-09); `business_date` mal formada, posterior al día de negocio de hoy, o sin actividad de ese cajero ese día. Test: `test_ca18_invalid_review_returns_422_and_no_row`.
- **CA-19 (sin repetir decisión):** Dado un día que ya tiene revisiones, cuando se envía de nuevo el mismo `status`, entonces se guarda como una entrada nueva del historial (no se rechaza), y la vigente pasa a ser esa entrada. Test: `test_ca19_same_status_repeated_creates_new_history_entry`.
- **CA-20 (historial sin borrado):** Dado un día con varias revisiones, cuando se consulta `GET /api/v1/admin/reports/cancellations/reviews?cashier_id=…&business_date=…`, entonces devuelve todas las filas, de la más reciente a la más antigua; la revisión vigente en el semáforo es la última. Las filas anteriores no cambian al crear una nueva (snapshot de columnas). Test: `test_ca20_history_newest_first_and_no_row_changed`.
- **CA-21 (auditoría):** Dada una revisión creada, cuando se registra, entonces Activitylog registra `cashier-day-reviewed` con actor, `cashier_id`, `business_date`, `status`, `note` y `review_id`, sin datos de contraseña. Si el registro falla, la fila no se guarda y la respuesta es error (no 201). Test: `test_ca21_review_is_audited_and_rolled_back_if_audit_fails`.
- **CA-22 (frecuencia):** Dado un usuario, cuando envía más de 20 revisiones por minuto, entonces la llamada que supera el límite responde 429. Test: `test_ca22_review_post_throttled_20_per_minute`.
- **CA-28 (revisión en el semáforo):** Dado un día con revisión vigente, cuando se presenta, entonces `review` trae `status`, `status_label` («Revisado: todo en orden» o «Requiere aclaración»), `note`, `reviewed_by_name` y `reviewed_at`; sin revisión, `review` es `null`. Test: `test_ca28_traffic_light_shows_current_review_or_null`.

### Aviso y conteo de pendientes

- **CA-23 (clave `cancellation_days`):** Dado un usuario con `reports.cancellations.view` y 2FA, cuando llama `GET /api/v1/admin/pending-counts`, entonces la respuesta incluye `cancellation_days` con el número de pares cajero-día en Atención de los últimos 7 días de negocio cerrados (excluido hoy) que no tienen revisión vigente o cuya revisión vigente es `clarification_required` (RN-11). Test: `test_ca23_cancellation_days_counts_attention_without_review`.
- **CA-24 (permisos del conteo):** Dado `admin` con solo `reports.cancellations.view`, cuando llama la ruta, entonces responde solo con `cancellation_days`. Dado un usuario con solo `species.review` o `memories.review`, la clave `cancellation_days` no aparece. Dado un usuario sin ninguno de los tres permisos, responde 403 sin cifras. Test: `test_ca24_pending_counts_keys_follow_each_permission`.

### Exportación y demostración

- **CA-25 (exportación):** Dado el reporte, cuando se exporta en CSV, Excel o PDF, entonces el archivo incluye, por cada cajero y día, nivel, porqué, qué hacer y revisión vigente, junto a las filas, totales y conciliación de `api-022` CA-19, y la leyenda. El tope de PDF de `api-022` RN-10 no cambia. Test: `test_ca25_three_formats_include_traffic_light_and_legend`.
- **CA-29 (comando de demostración, negativa):** Dado el comando `arca:demo:cancellation-reviews`, cuando `DB_DATABASE` no es `arca_pruebas` o `APP_ENV` es `production`, entonces termina con error sin escribir nada. Test: `test_ca29_demo_command_refuses_other_database_or_production`.
- **CA-30 (demostración, idempotencia):** Dado el comando ya ejecutado, cuando se ejecuta de nuevo, entonces no crea cajeros, boletos ni cancelaciones duplicados (se comprueba por correo `demo-cancel-*@arca.local` y por `qr_code` con prefijo `DEMO-CANCEL-`). Test: `test_ca30_demo_command_is_idempotent`.
- **CA-31 (demostración, cobertura):** Dado el comando ejecutado en `arca_pruebas`, cuando el semáforo se calcula con el mismo servicio que la producción, entonces hay al menos un cajero-día de demostración en cada nivel (Normal, Revisar, Atención). Test: `test_ca31_demo_data_covers_all_three_levels`.
- **CA-32 (demostración, fechas relativas):** Dado el comando con la opción `--days=N`, cuando se ejecuta, entonces agrega días nuevos hasta hoy en zona de negocio sin modificar ni borrar filas anteriores (snapshot de las filas existentes). Test: `test_ca32_demo_extends_days_without_changing_existing_rows`.
- **CA-33 (demostración visible):** Dado un cajero de demostración, cuando se pide el reporte, entonces sus boletos y su nivel aparecen como los de cualquier cajero (sin filtro que los excluya). Test: `test_ca33_demo_cashiers_appear_in_reports_as_normal_data`.

## Reglas de negocio

- **RN-01 (dueña):** Todo el cálculo de señales, niveles, porqué, textos de acción, pendientes y leyenda vive en Actions de la API (Constitución III). Los controladores solo delegan. El dashboard solo presenta.
- **RN-02 (día y zona):** El día de cada boleto es el día de negocio de `purchased_at` en `arca.timezone` (`api-022` RN-06, RN-09, `api-025`). Un boleto cancelado cuenta en el día de su venta.
- **RN-03 (unidades):** Los porcentajes se comparan sin redondear; se muestran con dos decimales. Las cantidades son adultos más niños.
- **RN-04 (señales y umbrales):** Cada señal usa valores de `config/arca.php`, bloque `cancellation_review`, con valores por defecto; nunca se editan desde el panel. Valores aprobados el 2026-11-21 (N = 4 semanas para C1, 7 días para C2, mínimo de 10 boletos):

  | Señal (código) | Tipo | Regla | Clave de configuración (propuesta) |
  |---|---|---|---|
  | S1 `over_limit_percent` | Límite fijo | `p_d > 10 %` y `gross_d ≥ 10` | `over_limit_percent` = 10 (reutiliza `cashier_cancel_percent`), `daily_min_sold_tickets` = 10 |
  | S2 `late_cancellations` | Límite fijo | ≥ 2 cancelaciones en `[L − 30 min, L]` | `late_window_minutes` = 30, `late_min_count` = 2 |
  | S3 `repeated_other` | Límite fijo | ≥ 2 cancelaciones con motivo `other` | `repeated_other_min` = 2 |
  | S4 `same_amount` | Límite fijo | ≥ 2 cancelaciones con el mismo importe | `same_amount_min` = 2 |
  | S5 `long_cancellations` | Límite fijo | ≥ 2 cancelaciones de más de 30 min | `long_cancel_minutes` = 30 (reutiliza `cancel_after_minutes`), `long_cancel_min_count` = 2 |
  | C1 `own_baseline` | Comparación | `p_d ≥ 2 × B` (4 semanas, mín. 3 días activos), `p_d ≥ 5 %`, `cancelled_d ≥ 2` | `baseline_weeks` = 4, `baseline_min_active_days` = 3, `baseline_multiplier` = 2 |
  | C2 `peer_comparison` | Comparación | `p_d ≥ 2 × M` (mediana de compañeros, ventana de 7 días que termina en `d`), `p_d ≥ 5 %`, `cancelled_d ≥ 2` | `peer_window_days` = 7, `peer_min_cashiers` = 2, `peer_min_sold_tickets` = 10, `baseline_multiplier` = 2 |

  Comunes: `comparison_min_percent` = 5, `comparison_min_cancelled` = 2. Las comparaciones usan todos los cajeros y todos los motivos, sin filtros (RN-06).
- **RN-05 (combinación y textos):** Cada señal cuenta una sola vez por cajero y día. `k = 0` Normal; `k = 1` Revisar; `k ≥ 2` Atención (`attention_min_signals` = 2). Textos de `action`:
  - Normal: «Sin acción: no hay señales que revisar.»
  - Revisar: «Revisa las cancelaciones marcadas y pide al cajero que explique cada una.»
  - Atención: «Compara el neto con el dinero entregado y pide al cajero que explique las cancelaciones marcadas.»
  Ningún texto pide boletos físicos (decisión 1 de 2026-11-21).
- **RN-06 (independencia de filtros):** Ni `cashier_id` ni `reason_code` cambian el nivel de un cajero y día (CA-12). Las filas y los totales de `api-022` sí se filtran, como antes. El semáforo se muestra completo; cuando hay filtro de motivo, el dashboard lo indica con la nota de `api-022`. *Nota de revisión 2026-11-21 (calidad): RN-06 queda acotado por `api-022` CA-34: `cashier_id` recorta `cashier_days` a ese cajero (el nivel se calcula con todos los datos); `reason_code` no lo filtra.*
- **RN-07 (revisión append-only):** Cada decisión es una fila nueva. Ninguna fila se edita ni se borra, ni física ni lógicamente, desde la API. La revisión vigente es la fila más reciente del par cajero-día (por `id`). La tabla tiene SoftDeletes por norma del modelo (Constitución V), pero no hay ruta que lo use.
- **RN-08 (nota y decisiones):** `status` ∈ {`reviewed_ok` («Revisado: todo en orden»), `clarification_required` («Requiere aclaración»)}. La nota se recorta y tiene entre 15 y 255 caracteres (propuesta, igual que `api-022` RN-04). Repetir el mismo estado crea una entrada nueva del historial (CA-19).
- **RN-09 (cajero eliminado):** Un cajero con `deleted_at` se puede revisar y su nombre aparece (`api-022` RN-12).
- **RN-10 (sin cajero registrado):** Los boletos sin `cashier_id` forman el grupo «Sin cajero registrado» (`api-022`). Ese grupo no recibe semáforo ni se puede revisar (decisión de 2026-11-21; `cashier_id` NOT NULL en DBR-026).
- **RN-11 (pendientes para el aviso):** `cancellation_days` cuenta pares cajero-día con nivel Atención dentro de los últimos 7 días de negocio cerrados (excluido hoy), sin revisión vigente o con `clarification_required`. Un día sale del aviso solo al cerrarse con «Revisado: todo en orden» (decisión de 2026-11-21). Revisar no entra en el aviso ni en el conteo; solo se ve en el reporte. La consulta usa la misma Action que el reporte.
- **RN-12 (visibilidad):** Todo el semáforo, la leyenda, las revisiones y el conteo son solo de quien tiene `reports.cancellations.view` (`admin`). `executive` no los ve (`dashboard-020` RN-10).
- **RN-13 (sin cambio de procedimiento en el sistema):** Entregar el dinero es un procedimiento fuera del sistema. La API no registra entregas de dinero ni boletos físicos.
- **RN-14 (no bloquea):** El semáforo, las señales y los pendientes nunca responden error ni impiden cancelar, consultar o exportar.
- **RN-15 (recalculo):** Los niveles se calculan al pedir la consulta. No hay tabla de niveles ni caché persistente en esta versión; la revisión sí se guarda (DBR-026).
- **RN-16 (datos de demostración):** Se crean cajeros de demostración con correo `demo-cancel-*@arca.local`, sus boletos y sus cancelaciones, con días Normal, Revisar y Atención, en `arca_pruebas` únicamente. Decisión de 2026-11-21: se quedan en la base, **no** se excluyen de ningún reporte y se ven como datos normales. El comando se niega a correr si `DB_DATABASE` no es `arca_pruebas` o si `APP_ENV = production`, y nunca se ejecuta contra `arca_zoo`. Es idempotente (CA-30).
- **RN-17 (demostración sin borrado físico):** Las fechas relativas se regeneran agregando días nuevos hasta hoy (CA-32); no se borran ni se modifican filas existentes. Si alguna vez hace falta retirar datos de demostración, se hace con borrado lógico (`deleted_at`), nunca físico (Constitución V). Por eso el comando no tiene opción de borrado.
- **RN-18 (generación de datos de demostración):** Las cancelaciones de demostración se escriben directamente en el seeder, no con `CancelTicketAction`, porque `api-009` RN-16 solo permite cancelar el mismo día y la demostración necesita días pasados. Cada cancelación de demostración cae en el mismo día de negocio de su venta (RN-02) y queda registrada en Activitylog con `ticket-cancelled` y la marca `demo = true`. Es una excepción acotada a la demostración, anotada aquí y en el plan.

## Datos, privacidad y auditoría

- **Clasificación:** financiero de solo lectura (boletos, importes, fechas) y personal de operación (nombres de cajeros y de quien revisa). La nota de revisión es texto de `admin`; no debe contener datos de visitantes (se recuerda en la leyenda del dashboard). No es dato clínico.
- **Esquema:** DBR-026 crea `cancellation_reviews` (historial de revisiones). Ninguna otra tabla cambia. La migración la crea y prueba el responsable de BD; backend no la escribe (DBR-026, «Estado»).
- **Índices previstos:** los de DBR-026 (por cajero y día, y por día). Las consultas del semáforo usan `idx_tickets_purchased_at` (`api-022`) y `idx_tickets_cashier_purchased`.
- **Retención:** nada se borra físicamente. Revisiones y boletos quedan.
- **Auditoría:** `cashier-day-reviewed` (CA-21), y `ticket-cancelled` existente (`api-022` CA-23) más la marca `demo` en datos de demostración. La lectura del reporte no se audita (`api-022`).
- **Permisos y secretos:** `DEMO_STAFF_PASSWORD` solo en `.env`; nunca en código, specs ni logs.

## Flujos y errores

1. **Consulta:** `admin` pide el reporte → la API calcula filas, totales, conciliación y semáforo → responde con la leyenda (CA-01, CA-13 a CA-16, CA-26).
2. **Revisión:** `admin` elige un día de un cajero → escribe la nota y elige el estado → `POST` → 201 o 422 (CA-17 a CA-19) → la siguiente consulta muestra la revisión vigente (CA-28).
3. **Historial:** `GET` de revisiones del cajero y día, más reciente primero (CA-20).
4. **Aviso:** `pending-counts` (CA-23, CA-24).
5. **Errores:** 401 sin sesión; 403 sin permiso o sin 2FA; 404 cajero inexistente; 422 en español (CA-18, CA-19); 429 en revisiones (CA-22); 5xx sin datos parciales.
6. **Sin conexión:** no aplica; es panel de personal.

## Dependencias, riesgos y preguntas

- **Dependencias/ADR:** `api-022`, `api-024`, `api-025`, `api-021`, `api-009`, `api-007`, DBR-024 (aplicada), DBR-026. Sin dependencia nueva de paquetes; sin ADR.
- **Riesgos:**
  - Coste de cálculo: el semáforo lee hasta 28 días anteriores al periodo para C1 y 7 días para C2. Con el volumen actual es bajo; se mide con datos reales antes de añadir caché (RN-15).
  - Coste del aviso: `pending-counts` se consulta cada 15 s por el panel (`dashboard-018`); el conteo recalcula 7 días y el histórico. Mitigado por el límite de 60/min de `api-024` (RN-15 y pregunta 7).
  - Falsos positivos: señales basadas en pocos boletos. Mitigado por los mínimos de RN-04 y por la leyenda.
  - Datos de demostración mezclados con reales: aceptado por decisión (RN-16); se identifican por el correo y el prefijo `DEMO-CANCEL-`.
- **Decisiones de Jonathan (2026-11-21):** todas las preguntas quedan cerradas.
  1. **Reglas del semáforo:** S1 a S5, C1 y C2 tal como están en RN-04; 0 señales = Normal, 1 = Revisar, 2 o más = Atención (RN-05). Valores en la configuración del servidor: N = 4 semanas, 7 días para C2 y mínimo de 10 boletos.
  2. **Aviso y punto:** cuentan los días en Atención sin revisar y los marcados «Requiere aclaración», hasta cerrarlos con «Revisado: todo en orden». Los días en Revisar solo se ven en el reporte (RN-11). El periodo es de los últimos 7 días de negocio cerrados.
  3. **Sin cajero registrado:** no lleva semáforo ni revisión; `cashier_id` NOT NULL en DBR-026 (RN-10).
  4. **Repetir el mismo estado:** se guarda como entrada nueva del historial; no se rechaza (CA-19).
  5. **Resto de preguntas, con la recomendación:**
     - C2 usa una ventana de 7 días que termina en el día evaluado (RN-04, CA-10).
     - S2 es literal: 30 minutos antes de la última venta del cajero ese día (RN-04, CA-05).
     - No hay permiso aparte: la revisión usa `reports.cancellations.view` (decisión 8, RN-12).
     - El límite de revisiones es de 20 por minuto (CA-22).
     - La nota tiene de 15 a 255 caracteres (RN-08).
  6. **Evidencia de base:** `users.id` es `int` y `activity_log` existe (consulta de solo lectura de 2026-11-21 en `arca_pruebas`).
  7. **DBR-026:** se queda en Aprobada; la sesión principal crea y aplica la migración y la pasa a «Lista para backend» con evidencia.

- Preguntas cerradas (referencia de la versión de propuesta):
  1. **Comparación entre compañeros (C2):** ¿la ventana es de 7 días que terminan en el día evaluado (propuesta, mantiene el semáforo independiente del filtro) o el periodo del reporte (literal, pero el nivel cambiaría según el periodo elegido)?
  2. **Ventana de «final de jornada» (S2):** ¿`[L − 30 min, L]` con `L` la última venta del cajero (literal, propuesta) o una franja fija de cierre del zoológico?
  3. **Permiso de escritura:** ¿la revisión sigue con `reports.cancellations.view` (decisión 8) o se crea `reports.cancellations.review` aparte para separar lectura y escritura?
  4. **«Sin cajero registrado»:** ¿confirmas que no recibe semáforo ni revisión (propuesta, RN-10)?
  5. **Aviso y «Requiere aclaración»:** ¿una aclaración pendiente sigue en el aviso hasta que se cierre con «Revisado: todo en orden» (propuesta, RN-11)?
  6. **Aviso y Revisar:** ¿el aviso incluye también Revisar, o solo Atención (propuesta)?
  7. **Límite de revisiones:** ¿20 por minuto por usuario (propuesta, CA-22) es suficiente?
  8. **Repetir decisión:** ¿repetir el mismo estado responde 422 (propuesta, CA-19) o se acepta como nueva fila con nota?

### Revisión 2026-11-21 (c) (aprobada por Jonathan): folios, frase y etiquetas claras

- **CA-34:** Dado un día con señales, cuando se presenta, entonces cada razón trae `folios[]`: para S2, S3, S4 y S5 solo los boletos que cumplen la señal; para S1, C1 y C2 todos los cancelados del cajero y día. Test: `test_ca34_reasons_list_the_right_folios_per_signal`.
- **CA-35:** Dado un día con una o más señales, cuando se presenta, entonces `reason_sentence` es «Se activó 1 señal: <etiqueta> (<n> boletos).» o «Se activaron N señales: <etiqueta> (<n> boletos); …». Esto cambia el texto de CA-13 (sustituye el ejemplo literal de CA-13). Test: `test_ca35_clear_sentence_with_one_and_two_signals`. *Nota de revisión 2026-11-21 (calidad): `count` de S1, C1 y C2 cuenta boletos (cantidad de adultos más niños), mientras `folios` lista boletos cancelados por folio; por eso `count` puede no coincidir con `folios.length` cuando un folio tiene varias cantidades.*
- **CA-36:** Dada la respuesta, cuando se lee `legend[]`, entonces sus `label` son los mismos que los de `reasons[]` (clarificados). Test: `test_ca36_legend_uses_the_same_clear_labels`.
- **CA-37:** Dada la exportación filtrada por cajero, cuando se genera, entonces el semáforo trae la columna «Folios» y solo al cajero filtrado (CA-25 se amplía). Test: `test_ca36_filtered_export_only_contains_filtered_cashier` (de `api-022` CA-36).

## Revisión

- Aprobadores y fecha: Jonathan (responsable funcional), 2026-11-21.
- Revisión 2026-11-21 (Jonathan): cierra las ocho preguntas (sección «Decisiones de Jonathan (2026-11-21)»). Cambios: CA-19 pasa a crear entrada nueva del historial en vez de rechazar el estado repetido; RN-11 incluye «Requiere aclaración» y excluye Revisar. Sin renumerar CA ni RN.
- Nota de revisión sobre `api-022` (2026-11-21): RN-13 y «Fuera de alcance» de `api-022` se corrigen en su nota de revisión; el cajero entrega solo el dinero, no el boleto físico (decisión 1). Sin renumerar.
- Nota de revisión sobre `api-024` (2026-11-21): añade la clave `cancellation_days` para quien tiene `reports.cancellations.view` (CA-23 y CA-24 de esta spec); ver la nota en `apps/api/specs/024-pending-review-counts.md`.
- Nota de revisión de calidad y seguridad (2026-11-21): CA-11 gana `data.levels[]` (`{code, label, condition}`, con `condition` calculada de `attention_min_signals`: «0 señales», «1 señal», «2 o más señales» por defecto); el dashboard ya lo consume. Sin renumerar. Las lecturas del reporte (`reports/cancellations`, `/cashiers`, `/reviews`) tienen el límite `cancellation-report` (60 por minuto y usuario).
- Nota de revisión sobre `dashboard-016` y `dashboard-018`: ver sus notas; consumen esta spec en `dashboard-021`.
- Evidencia/enlaces: `apps/api/specs/022-ticket-cancellation-report.md`, `apps/api/plan/022-ticket-cancellation-report.md`, `apps/api/specs/024-pending-review-counts.md`, `apps/api/specs/025-single-business-timezone.md`, `apps/dashboard/specs/020-unified-reports-and-feedback.md`, `docs/database/requests/DBR-024-ticket-cancellation-reason-code.md`, `docs/database/requests/DBR-026-cancellation-reviews.md`, `apps/api/src/app/Actions/Admin/Reports/BuildCancellationReportAction.php`, `apps/api/src/config/arca.php` (bloque `cancellation_alerts`), `apps/api/src/app/Actions/Admin/PendingReview/GetPendingReviewCountsAction.php`.
- Consulta de esquema vivo: 2026-11-21, aportada por la sesión principal (ver «Esquema vivo y verificación previa»).
- Evidencia de CI, tests y migraciones: pendiente. Esta sesión no tiene shell y no afirma que pasen.
- Revisión 2026-11-21 (c) (aprobada por Jonathan): añade CA-34 a CA-37 sin renumerar; `reasons[].folios`, frase y etiquetas claras, `cashier_days` con `cashier_id`. El ejemplo literal de CA-13 queda sustituido por CA-35. Ver `api-022`.
