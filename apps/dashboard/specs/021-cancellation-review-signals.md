# 021 · cancellation-review-signals (semáforo, leyenda, revisión y aviso en Cancelaciones)

- App dueña: `dashboard`
- Apps/paquetes afectados: `dashboard` (sección del semáforo en la pestaña «Cancelaciones», diálogo de revisión, historial, aviso y puntito); `api` (`api-027`, dueña de las señales, niveles, textos, revisiones y conteo; `api-024` para la clave `cancellation_days`; `api-022` para el reporte); `packages/api-client` (tipos y métodos del semáforo, de la revisión, del historial y de la clave nueva; sin lógica).
- Estado: Implementada
- Solicitada: 2026-11-21
- Aprobada: 2026-11-21
- Aprobación funcional: Aprobada
- Dependencias de esta spec: `dashboard-016` (página de cancelaciones, dentro de «Reportes», `dashboard-020`), `dashboard-018` (aviso y puntito; amplía su clave de pendientes), `dashboard-020` (pestañas de Reportes y paginación), `api-027`, `api-024`, `api-022`, DBR-026.
- Última edición:

## Problema y contexto

`dashboard-016` muestra las cancelaciones y su conciliación, pero no dice cuáles días merecen atención ni permite dejar constancia de que se revisaron. `api-027` calcula el semáforo por cajero y día, el porqué, la acción, la leyenda, la revisión vigente y el conteo de días pendientes. Esta spec define cómo lo presenta el dashboard y cómo se registra una revisión.

El dashboard **no calcula nada**: no decide niveles, no interpreta señales, no fija umbrales ni combina textos. Todo viene de la API.

## Objetivos

- Que `admin` vea en la pestaña «Cancelaciones» el nivel de cada cajero y día (Normal, Revisar, Atención) con su porqué y su qué hacer.
- Que la leyenda explique cada señal, su límite y que una alerta no prueba nada.
- Que `admin` pueda registrar «Revisado: todo en orden» o «Requiere aclaración» con una nota, y ver el historial.
- Que `admin` vea al entrar y en el menú cuántos días en Atención siguen sin revisar.

## Fuera de alcance

- Cualquier cálculo de señales, niveles, porcentajes, medianas o umbrales en el cliente (`api-027` RN-01).
- Editar o borrar una revisión (no hay ruta).
- Notificaciones por correo, tiempo real o sondeo nuevo (el aviso sigue la regla de `dashboard-018`).
- Acceso para `zoo-admin`, `executive`, `cashier` o `veterinarian`.
- Cambios de texto de procedimiento fuera de los que devuelve la API. Esta página no pide entregar boletos físicos.
- Cambios en `apps/web`, `apps/pwa` y `apps/mobile`.

## Actores y permisos

| Actor/rol | Necesidad | Permisos requeridos (API) |
|---|---|---|
| `admin` | Ver semáforo, leyenda, revisión e historial; registrar revisiones; recibir el aviso y el puntito | Sesión + 2FA; `reports.cancellations.view` (`api-027`) |
| `zoo-admin`, `executive`, `cashier`, `veterinarian` | Sin acceso a la pestaña, al semáforo ni al aviso de cancelaciones | — |

La página solo oculta opciones; la API autoriza (RN-01).

## Historias de usuario

- Como `admin`, quiero ver por cajero y día si hay algo que revisar, con el porqué y qué hacer, para decidir sin interpretar cifras.
- Como `admin`, quiero leer qué significa cada señal y su límite, para entender el semáforo.
- Como `admin`, quiero marcar un día como revisado o como que requiere aclaración con una nota, y ver quién y cuándo lo hizo.
- Como `admin`, quiero que al entrar se me avise de los días en Atención sin revisar.

## Criterios de aceptación

### Semáforo y explicación

- **CA-01 (semáforo visible):** Dada la pestaña «Cancelaciones» con datos, cuando se muestra la sección «Semáforo por día y cajero», entonces hay una fila por cada cajero y día que devuelve `reconciliation.cashier_days`, con el nivel escrito como texto («Normal», «Revisar» o «Atención») además de cualquier color o icono. Test: `test_ca01_traffic_light_table_shows_level_as_text`.
- **CA-02 (porqué y qué hacer de la API):** Dado un día en Revisar o Atención, cuando se presenta, entonces muestra `reason_sentence` y `action` tal como llegan de la API. La página no compara cifras ni interpreta `reasons[]` para escribir texto propio. Test: `test_ca02_reason_and_action_are_shown_as_received`.
- **CA-03 (leyenda):** Dada la respuesta del reporte, cuando se muestra la leyenda, entonces lista cada elemento de `legend[]` con su etiqueta, su explicación y su límite, y muestra `disclaimer` («Una alerta no prueba nada: solo indica qué revisar.») en texto visible, no en un título oculto. Test: `test_ca03_legend_renders_api_items_and_disclaimer`.
- **CA-04 (revisión vigente):** Dada una fila con `review`, cuando se muestra, entonces aparece el estado (`status_label`), la nota, quién revisó (`reviewed_by_name`) y cuándo (`reviewed_at` en la zona que devuelve la API). Con `review: null`, aparece «Sin revisar». Test: `test_ca04_current_review_or_sin_revisar`.

### Registro de revisión

- **CA-05 (acceso al botón):** Dada una sesión con `reports.cancellations.view`, cuando se ve una fila del semáforo con nivel distinto de Normal o con revisión, entonces aparece el botón «Registrar revisión». Sin ese permiso, la pestaña no aparece y el botón no existe. Test: `test_ca05_review_button_only_with_reports_cancellations_view`.
- **CA-06 (diálogo):** Dado el diálogo «Registrar revisión», cuando se abre, entonces ofrece dos opciones con las etiquetas «Revisado: todo en orden» y «Requiere aclaración», un campo «Nota» con contador de caracteres (15 a 255) y los botones «Guardar revisión» y «Cancelar». Con nota de menos de 15 caracteres tras recortar, muestra «Escribe una nota de entre 15 y 255 caracteres.», no llama a la API y deja el foco en el campo. Test: `test_ca06_review_dialog_options_and_local_length_check`.
- **CA-07 (éxito):** Dada una revisión guardada (201), cuando la API responde, entonces el diálogo se cierra, aparece un aviso accesible «Revisión guardada.» y la fila se actualiza con los datos que devuelve la API; la página no recalcula el nivel. Test: `test_ca07_success_closes_dialog_and_refreshes_from_api`.
- **CA-08 (errores):** Dada una respuesta de error del registro, cuando llega, entonces: 422 muestra el mensaje de la API junto al campo correspondiente; 422 de «ya tiene esa decisión» muestra el mensaje en el diálogo; 403 muestra el mensaje de la API y cierra la acción; 429 muestra el mensaje de la API; 5xx o red muestran error sin reintento automático. Test: `test_ca08_review_errors_show_api_messages_without_retry`.
- **CA-09 (historial):** Dada una fila con revisiones previas, cuando se pulsa «Ver historial», entonces se listan todas las decisiones de la más reciente a la más antigua, con su estado, nota, autor y fecha, desde `GET` del historial. Sin filas, muestra «Sin revisiones registradas.». Test: `test_ca09_history_is_loaded_from_api_newest_first`.

### Aviso y puntito

- **CA-10 (aviso al entrar):** Dado un `admin` que inicia sesión y `cancellation_days` mayor que 0 en `GET /api/v1/admin/pending-counts`, cuando termina la carga inicial, entonces aparece el aviso «Tienes N días de cancelaciones en Atención sin revisar.» (con «Tienes 1 día de cancelaciones en Atención sin revisar.» en singular), con el mismo estilo, cola FIFO y cierre de `dashboard-018` RN-03, RN-14. Test: `test_ca10_admin_sees_cancellation_notice_once_per_start`.
- **CA-11 (puntito):** Dado un `admin` con `cancellation_days` mayor que 0, cuando mira el menú, entonces el puntito aparece junto a «Reportes» y en la pestaña «Cancelaciones», con el nombre accesible «Reportes, con días de cancelaciones pendientes de revisión». A cero desaparece. Test: `test_ca11_dot_on_reports_and_tab_with_accessible_name`.
- **CA-12 (sin permiso no hay consulta de este aviso):** Dado un usuario sin `reports.cancellations.view`, cuando inicia sesión, entonces no aparece ningún aviso ni puntito de cancelaciones y la clave `cancellation_days` no se pide ni se muestra. Test: `test_ca12_no_permission_no_cancellation_notice`.

### Arquitectura y transversales

- **CA-13 (MVVM y api-client):** Las views (`CancellationTrafficLightTable`, `CancellationLegend`, `CancellationReviewDialog`, `CancellationReviewHistory`) solo presentan. El estado y las llamadas viven en hooks ViewModel que usan `@arca/api-client`: `useCancellationReview` (alta e historial). No hay `fetch` ni `axios` en `views/` ni en `components/`. Test: `test_ca13_views_do_not_call_fetch_and_hooks_use_api_client` (con mock de `@arca/api-client`).
- **CA-14 (accesibilidad y diseño):** El diálogo tiene foco inicial en la primera opción, cierra con Escape y devuelve el foco al botón que lo abrió; la tabla del semáforo tiene `caption`; el nivel se lee como texto; de 360 a 1366 px la página no tiene desbordamiento horizontal (desplazamiento propio de la tabla). Test: `test_ca14_dialog_focus_and_escape_and_no_horizontal_overflow`.
- **CA-15 (tokens):** Los componentes nuevos usan tokens semánticos y no fijan hex de marca; modo claro. Test: `test_ca15_new_components_use_semantic_tokens`.
- **CA-16 (cobertura de tests):** Cada CA-01 a CA-15 tiene al menos un test Vitest que lo nombra (Constitución IV). Test de cobertura: `test_ca16_every_ca_has_a_named_test`.
- **CA-17 (sin texto de procedimiento propio):** Ninguna view ni hook de esta spec escribe texto de «qué hacer» ni de procedimiento: solo muestra el que devuelve la API, y el diálogo no pide entregar boletos físicos. Test: `test_ca17_no_physical_ticket_text_in_new_views`.

## Revisión (aprobada): semáforo en tabla

El responsable funcional pidió que la sección «Semáforo por cajero y día» se vea como una tabla clara. Solo cambia la presentación; la API sigue decidiendo niveles, señales, textos y revisiones (RN-01). Los CA-01 a CA-17 siguen vigentes; donde su redacción nombra «Ver historial» o el «qué hacer» en la fila, ahora se leen en la fila de detalle («Ver detalle»).

- **CA-18 (columnas):** La tabla usa el estilo de tabla de Reportes (`DataTable`, `.table-card`, encabezado fijo y desplazamiento horizontal propio) con las columnas, en este orden: Fecha, Cajero, Nivel (`Badge` con icono y texto), Vendidos, Cancelados, % cancelado, Señales (`signals_count` y debajo `reason_sentence` en texto pequeño muted), Revisión vigente (estado y fecha, o «Sin revisar») y Acción (botón «Registrar revisión» con `aria-label` por cajero y fecha). Las cifras son las de la API (`sold_tickets`, `cancelled_tickets`, `cancel_percent`). Test: `test_ca18_traffic_light_table_columns_in_order`.
- **CA-19 (orden):** Por defecto, primero Atención, luego Revisar, luego Normal; dentro de cada nivel, fecha descendente; el grupo «Sin cajero registrado» va al final. Es orden de presentación sobre el nivel que manda la API. Test: `test_ca19_order_by_level_then_date_descending_without_cashier_last`.
- **CA-20 (detalle expandible):** «Ver detalle» (con `aria-expanded`) abre una fila de detalle con el «qué hacer» (`action`, tal como llega) y, con permiso de revisión, el historial. Cerrada, la fila no muestra el detalle. Test: `test_ca20_detail_row_shows_action_and_history_only_when_expanded`.
- **CA-21 (filtro rápido):** Casilla «Mostrar solo días por revisar» que oculta los días Normal; es solo presentación. Sin días por revisar muestra «No hay días por revisar en el periodo.». Test: `test_ca21_only_days_to_review_filter_hides_normal`.
- **CA-22 (sin cajero y medidas):** El grupo «Sin cajero registrado» muestra «No aplica» en revisión y acción, sin botón de revisión. Los estilos de la sección usan `rem` y tokens, sin anchos fijos en px. Test: `test_ca22_no_cashier_group_says_no_aplica_and_styles_use_rem`.

Fuera de alcance de esta revisión: cambios en `apps/api`, en la leyenda, el diálogo o el aviso.

## Reglas de negocio

- **RN-01 (la API decide):** Niveles, señales, porqué, acción, leyenda, revisión vigente y conteo vienen de `api-027`. El dashboard no reinterpreta ni recalcula.
- **RN-02 (consulta por permiso):** El historial, el registro y el conteo solo se piden con `reports.cancellations.view`. Ocultar no reemplaza la autorización del servidor.
- **RN-03 (sin escritura local):** La revisión se guarda solo en la API. No hay `localStorage` ni caché persistente (`dashboard-016` RN-09).
- **RN-04 (validación local):** El cliente valida la longitud de la nota solo para dar un aviso temprano (CA-06). La regla de la API (`api-027` RN-08) es la autoridad y su 422 se muestra tal cual.
- **RN-05 (refresco):** Después de registrar una revisión, la página vuelve a pedir el reporte con los mismos filtros para que el semáforo muestre la revisión vigente (no recalcula en el cliente).
- **RN-06:** Solo `admin` ve y registra revisiones (`api-027` decisión 8). La decisión de un permiso de escritura aparte queda como pregunta en `api-027`.
- **RN-07 (fuera de la cola de avisos):** El aviso de cancelaciones usa la cola FIFO de `dashboard-018` (RN-14) y no tiene estado de «leído».
- **RN-08 (estilo):** Tokens semánticos y componentes de `@arca/ui`; sin dependencias nuevas (`dashboard-016` RN-07).

## Datos, privacidad y auditoría

- Se muestran folios, importes, nombres de cajeros y de quien revisa, notas de revisión y niveles. Las notas las escribe `admin`.
- La API audita cada revisión (`cashier-day-reviewed`). La página no escribe auditoría.
- No se guardan filas ni archivos fuera de la memoria de la sesión.

## Flujos y errores

1. **Ver semáforo (admin):** pestaña «Cancelaciones» → periodo y filtros → la API devuelve filas, totales, conciliación, semáforo y leyenda (CA-01 a CA-04).
2. **Registrar revisión (admin):** «Registrar revisión» → elige opción y escribe nota → «Guardar revisión» → 201 o error (CA-06 a CA-08) → refresco (RN-05).
3. **Historial (admin):** «Ver historial» → lista de la API (CA-09).
4. **Aviso (admin):** inicio de sesión → conteo → aviso y puntito (CA-10, CA-11).
5. **Errores:** 401 → login con «Tu sesión expiró» (`dashboard-016` CA-03); 403 → mensaje de la API; 422, 429 y 5xx según CA-08.
6. **Sin conexión:** no hay modo offline; sin respuesta no se registra ni se muestra revisión.

## Dependencias, riesgos y preguntas

- **Dependencias:** `api-027` (semáforo, revisión, historial y leyenda), `api-024` (clave `cancellation_days`), `api-022` (reporte), DBR-026 (tabla), `dashboard-016`, `dashboard-018`, `dashboard-020`.
- **Orden de despliegue:** DBR-026 → API (`api-027`) → dashboard. Sin la API, el botón de revisión responde error y la sección muestra el estado de error de la pestaña.
- **Riesgos:**
  - Un cliente que llame al registro sin 2FA recibirá 403: lo muestra la página (CA-08).
  - Notas largas o con datos de visitantes: la API limita a 255 caracteres; la página no las interpreta.
  - Sondeo del aviso: sigue la regla de 15 s de `dashboard-018` (RN-07 de esa spec).
- **Preguntas:** las de `api-027` (preguntas 1 a 8) afectan a esta spec; no se abren preguntas nuevas aquí.

## Decisiones

- El aviso y el puntito de «Reportes» cuentan los días en Atención sin revisar y los marcados «Requiere aclaración», hasta cerrarlos con «Revisado: todo en orden». Los días en Revisar solo se ven en el reporte (`api-027` RN-11, CA-10 y CA-11).
- Un día sin cajero registrado no muestra semáforo ni botón de revisión (`api-027` RN-10).
- Repetir el mismo estado en el registro se muestra como una entrada nueva del historial; la página no lo bloquea (`api-027` CA-19).
- Los textos de nivel, porqué y qué hacer son los que devuelve la API (CA-02, CA-17).

## Revisión

- Aprobadores: responsable funcional.
- Evidencia/enlaces: `apps/api/specs/027-cancellation-review-signals.md`, `apps/api/plan/027-cancellation-review-signals.md`, `apps/dashboard/specs/016-ticket-cancellation-report.md`, `apps/dashboard/specs/018-pending-review-badges.md`, `apps/dashboard/specs/020-unified-reports-and-feedback.md`, `docs/database/requests/DBR-026-cancellation-reviews.md`.
- Evidencia de tests, lint y CI: pendiente. Esta sesión no tiene shell y no afirma que pasen.

## Nota de revisión (, legibilidad y leyenda)

Aprobado por el responsable funcional. Sin renumerar CA-01 a CA-22.

- **CA-23:** La leyenda es una tabla con columnas Señal, Qué significa y Límite, a partir de `legend[]` de la API (reemplaza el formato de lista de CA-03).
- **CA-24:** Arriba de esa tabla hay una tabla de niveles con `Badge` y texto: Normal (0 señales), Revisar (1 señal), Atención (2 o más).
- **CA-25:** El `disclaimer` de la API se muestra como nota visible («Una alerta no prueba nada; indica qué revisar.»).
- **CA-26:** La leyenda es plegable («Cómo funciona el semáforo»), abierta la primera vez; la preferencia vive en `localStorage` con `try/catch` (nada en el servidor).
- **CA-27:** En la tabla del semáforo, el porqué, el «qué hacer» y el detalle usan 0.9375rem con contraste normal; columnas numéricas a la derecha con ancho mínimo, Nivel con `Badge` visible, Señales con más espacio, más relleno y botón sin partirse.
- **CA-28:** «Ver detalle» es un bloque con títulos «Qué hacer» e «Historial de revisiones»; el historial es una tabla pequeña (fecha, estado, nota, quién).

## Revisión (c) (aprobada)

El semáforo es la única alerta; se retiran las alertas viejas de `dashboard-016` (CA-14, sustituido por CA-35 de esa spec). Contrato: `api-022`/`api-027` revisión (c). Sin renumerar CA-01 a CA-28; la frase clara (`reason_sentence`) y las etiquetas se muestran tal cual llegan de la API (CA-02, RN-01).

- **CA-29 (ver boletos):** Dada una fila del semáforo con cajero, cuando se pulsa «Ver boletos», entonces se consulta la API con periodo `custom`, `from` = `to` = fecha del día y `cashier_id` del cajero (el motivo y la página se descartan), y la página queda en «cargando» hasta recibir la respuesta. El grupo sin cajero no tiene el botón. Test: `test_ca29_ver_boletos_filters_by_day_and_cashier_with_custom_period`.
- **CA-30 (quitar filtro):** Dado el filtro automático, cuando se muestra, entonces aparece el banner «Mostrando boletos de <cajero> del <fecha>» con «Quitar filtro», que restaura los filtros previos (los de antes del primer «Ver boletos»). Cambiar de página conserva el filtro; cambiar otro filtro lo descarta. Test: `test_ca30_quitar_filtro_restores_previous_filters_and_banner_text`.
- **CA-31 (resaltado y foco):** Dado el filtro automático, cuando carga el reporte, entonces se desplaza a «Boletos cancelados» y el foco pasa a su encabezado; los boletos con `signal_codes` se resaltan con borde, icono y el texto «Con señales» (no solo color); el banner es `role="status"`. Test: `test_ca31_highlight_is_not_color_only_and_focus_moves_to_table`.
- **CA-32 (señales con folios):** Dado «Ver detalle», cuando se abre, entonces cada señal de `reasons[]` es una línea con su etiqueta, su conteo («N boletos») y sus `folios` como chips. Test: `test_ca32_detail_lists_signal_label_count_and_folio_chips_from_api`.
- **CA-33 (chip a su fila):** Dado un chip de folio, cuando se pulsa, entonces lleva el foco a su fila de la tabla de boletos y la marca; si el folio no está en la página actual, aplica el filtro del día y cajero (CA-29) y luego lo lleva. Test: `test_ca33_folio_chip_goes_to_its_row_or_applies_day_and_cashier_filter`.
- **CA-34 (medidas y arquitectura):** Estilos nuevos en `rem` y tokens; sin `fetch`/`axios` ni `@arca/api-client` en las vistas nuevas. Test: `test_ca34_new_code_uses_rem_tokens_and_no_fetch`.

Los CA-01 a CA-34 se verifican en `test_ca16_every_ca_has_a_named_test`. Nota: el aviso «Una alerta no prueba nada» (CA-25) se mantiene; «alerta» aquí significa solo el semáforo.

## Notas de revisión de calidad

No cambian el estado de la spec ni agregan CA; aclaran contradicciones y precisan comportamiento.

- **Niveles de la leyenda (CA-24 y RN-01).** CA-24 pide una tabla de niveles («Normal», «Revisar», «Atención») con su condición y RN-01 prohíbe que el cliente decida umbrales; el umbral de «Atención» es configurable en la API (`attention_min_signals`). Se resuelve así: `GET reports/cancellations` envía `data.levels[]` con `{ code, label, condition }` (p. ej. `condition: "0 señales"`, `"1 señal"`, `"2 o más señales"`, calculada desde la configuración) y el dashboard solo lo pinta tal como llega (`CancellationLevelDto` en `@arca/api-client`, aditivo). Si `levels` falta o viene vacío, no se muestra la tabla de niveles y no se inventan umbrales; la tabla de señales sigue igual. Test: `test_ca24_levels_come_from_the_api_and_are_not_invented_when_missing`.
- **CA-27 sustituye a CA-18 en `reason_sentence`.** CA-18 describe la frase de la API en la columna «Señales»; CA-27 fija su estilo (0.9375rem, contraste normal). Para el estilo de `reason_sentence` rige CA-27; el contenido sigue siendo el de la API tal como llega.
- **Título unificado.** La sección se llama «Semáforo por cajero y día» en el `h2`, en el `caption` de la tabla, en esta spec y en los tests (antes el `h2` decía «Semáforo por día y cajero»). Test: `test_ca01_traffic_light_table_shows_level_as_text`.
- **Filtro «solo por revisar» (CA-21).** Además de los días Normal, oculta las filas «Sin cajero registrado» (no hay a quién revisar). Si no queda nada, muestra «No hay días por revisar en el periodo.». Test: `test_ca21_only_days_to_review_filter_hides_normal`.
- **Chip de folio (CA-33).** Si el folio no está en la página, tras aplicar el filtro de día y cajero se recorren las páginas en el orden de la API (fecha de venta e id), de la 1 en adelante, hasta hallarlo, con tope de 500 filas (`meta.per_page`) y `meta.last_page`; luego se enfoca la fila. Con los datos que ya llegan no se puede calcular la página (el folio no trae su fecha). Test: `test_ca33_folio_scan_finds_the_page_of_a_folio_with_a_reasonable_cap`.
- **Historial tras guardar (CA-07, CA-09).** Si el detalle de esa fila sigue abierto, su historial se vuelve a cargar tras `onSaved` (antes se cerraba). Test: `test_ca07_submit_reloads_history_when_the_row_detail_is_still_open`.
- **Contador de la nota (CA-06).** El contador ya no es `aria-live`; solo se anuncia, en una región `role="status"` oculta, al cruzar los límites de 15 y 255. Test: `test_ca06_counter_is_not_live_and_only_crossing_15_and_255_is_announced`.
- **Tipos nulables.** `reviewed_by_name` y `reviewed_at` de la revisión, y `purchased_at`, `cancelled_at` y `minutes_to_cancel` de cada boleto, pueden ser `null`; la vista muestra «—». Los folios de las señales son `tickets.id` como texto, no `qr_code`.
