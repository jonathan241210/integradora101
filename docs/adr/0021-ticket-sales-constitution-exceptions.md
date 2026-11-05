# 0021 · Excepciones a la Constitución en la feature de ventas de boletos

- Estado: Aceptado
- Fecha: 2026-11-02
- Spec relacionada: `apps/api/specs/009-ticket-sales.md` (principio V, CA-13 y RN-13). Planes que lo enlazan en su Constitution Check: `apps/api/plan/009-ticket-sales.md` y `apps/dashboard/plan/005-ticket-sales.md`.

> Estado **Aceptado** (2026-11-02, Jonathan): Jonathan, responsable funcional y técnico de backend de `api-009`, acepta las excepciones de este ADR y la decisión de no crear `BaseModel` en esta feature. La Constitución exige además el acuerdo del equipo para cambiar sus principios. No consta en el repositorio un acuerdo expreso del resto del equipo. **El equipo debe enterarse leyendo este documento.** Cualquier objeción se registra como revisión de este mismo ADR, sin borrarlo.

## Contexto

La feature de ventas (`api-009`, con su consumidor `dashboard-005`) choca con tres reglas de la Constitución y de `AGENTS.md`:

- **Principio V (y `AGENTS.md` raíz):** los modelos de negocio extienden `BaseModel` y usan SoftDeletes. `BaseModel` no existe: en `apps/api/src/app/Models/` no hay ningún `BaseModel.php`, observación ya registrada en DBR-007 y en la brecha de `api-007`. Además, `tickets` no tiene `created_by` en DBR-006; su creador es `cashier_id`.
- **Principio V, SoftDeletes en avisos:** `staff_notifications` (DBR-006) guarda avisos operativos, no datos clínicos ni financieros. DBR-006 (resolución 6) la deja sin SoftDeletes. La Constitución habla de «modelos de negocio» y `AGENTS.md` raíz limita el SoftDeletes obligatorio a datos clínicos y financieros. DBR-007 ya señaló esta contradicción textual.
- **Regla de autorización de `apps/api/AGENTS.md`:** la autorización se hace con Policies y permisos Spatie. `api-009` CA-13 exige que un `cashier` que intenta cancelar un boleto que no vendió reciba **404**, no 403, igual que `api-007` CA-02. Una Policy por registro respondería 403 y contradiría CA-13.

No se excepcionan los principios III y VI. La lógica de precios, totales, token, SVG, cancelabilidad y alcance vive en Actions (III). Identificadores en inglés y mensajes en español (VI).

La feature deja fuera de alcance varios elementos que podrían parecer parte de la solución. Se documentan aquí para que el equipo sepa qué se difiere y cómo retomarlo.

## Decisión

### a) `Ticket` y `TicketPrice` no extienden `BaseModel`

- Ambos usan SoftDeletes (columna `deleted_at` de DBR-006). Ninguno se borra físicamente; cancelar un boleto no ejecuta `deleted_at`.
- Auditoría propia, sin `BaseModel`:
  - `tickets`: el creador es `cashier_id`; se registran `updated_by`, `cancelled_by` y `cancellation_reason`.
  - `ticket_prices`: se registran `created_by` y `updated_by`.
  - Activitylog registra las operaciones desde las Actions (`ticket-sold`, `ticket-cancelled`, `ticket-price-changed`).
- `Ticket` mantiene `$timestamps = false`, porque DBR-006 no le da marcas de tiempo. `TicketPrice` usa `created_at` y `updated_at` (DBR-006, resolución 8).
- No se crea `app/Models/BaseModel.php` en esta feature.

### b) `staff_notifications` no usa SoftDeletes

- La tabla queda creada por DBR-006 y **sin uso en esta iteración**: no tiene modelo, Action ni ruta (`api-009`, decisión 5 de su plan).
- Al reactivar los avisos, la revisión de la spec decide si la tabla necesita `deleted_at`. Ese cambio de esquema exige una DBR nueva del responsable de BD; no se hace por código.

### c) Cancelación e historial: alcance por consulta, con 404 y sin Policy

- Un `cashier` que pide un boleto que no vendió recibe **404** «Boleto no encontrado.» (`api-009` CA-13). El historial aplica el mismo alcance: nunca responde 403 por registro.
- La regla vive en la consulta acotada por `cashier_id` de `CancelTicketRequest::authorize()` y de `ListTicketHistoryAction`. No hay `TicketPolicy` para boletos.
- El permiso por rol (`tickets.view`, `tickets.create`, `tickets.cancel`, `ticket-prices.manage`) sigue en middleware `permission:`. Un rol sin permiso recibe 403. Lo que cambia es solo el alcance por registro.
- Motivo: lo fija CA-13, con el mismo criterio que `api-007` CA-02. Efecto: un 403 confirmaría que el boleto ajeno existe; el 404 no lo revela.
- Esta excepción es a la regla de `apps/api/AGENTS.md`, no a la Constitución.

### d) Preferencias de impresión guardadas en el navegador (`localStorage`)

`dashboard-005` RN-12 (CA-27 a CA-29) permite que cada taquilla guarde en su navegador el formato de impresión del boleto (térmica 58/80 mm o carta), el tamaño de fuente, los márgenes, los campos visibles y el pie. Es una excepción acotada a `dashboard-001` RN-09 («nada se guarda en el cliente»). Motivo: la impresora es de cada puesto, la preferencia es solo de presentación, no contiene datos de negocio y no justifica una tabla ni un endpoint. Reglas: acceso siempre con `try/catch`, valores por defecto si falla, y folio y QR obligatorios e inalterables. No se guardan en el navegador datos de ventas, precios ni credenciales. Retomarlo: si el equipo quiere que la preferencia siga al usuario entre equipos, se abre una spec y, si hay cambio de esquema, una DBR.

### Diferido (no se implementa en esta iteración)

1. **Avisos de cambio de precio en el dashboard.** Afecta a `api-009` CA-23 a CA-26, CA-32, CA-33; RN-10, RN-11, RN-19; y a `dashboard-005` CA-18 a CA-20, CA-26, RN-04 y RN-11.
   - Cómo retomarlo: una revisión de `api-009` los reactiva. Antes hay que resolver su pregunta 10 (deduplicación por `ticket_price_id` y destinatario) y la idempotencia de la creación de avisos al consultar, que la spec marca como riesgo. Si `staff_notifications` se usa, se revisa la excepción b).
2. **Correo de avisos de precio.** Afecta a ADR 0020 (Propuesto), `api-009` CA-35 a CA-41, RN-20 a RN-28 y `dashboard-005` CA-30 y RN-14.
   - Cómo retomarlo: aprobar ADR 0020 con su proveedor SMTP, remitente, retención de `failed_jobs` y operación de la cola (preguntas 11 a 17 de `api-009`) antes de cualquier código. Sin ADR aprobado no se implementa.
3. **`BaseModel` unificado.** Afecta a `Ticket`, `TicketPrice` y a los modelos de negocio existentes; `News` y `Event` extienden `Model` (DBR-007).
   - Cómo retomarlo: el equipo decide si crea `BaseModel` y lo aplica a los modelos de negocio. Cualquier columna nueva, como `created_by` en `tickets`, exige DBR aprobada. Hasta entonces, la excepción a) sigue vigente.
4. **Arqueo y cierres de caja** (`cash-closings.*`; `api-009` RN-15).
   - Cómo retomarlo: spec propia. Debe leer las ventas `completed` y excluir las canceladas (`api-009` RN-18). El arqueo se calcula solo en la API (Constitución III).
5. **Validación del QR en el torniquete.**
   - Cómo retomarlo: spec y ADR de hardware y protocolo. El token va dentro del SVG (ADR 0019) y debe tratarse como dato sensible.

## Alternativas consideradas

- **Crear `BaseModel` ahora.** Descartada para esta feature: obligaría a tocar modelos de otras features (`News`, `Event`) y a añadir `created_by` a `tickets`, que requiere DBR. El creador ya está en `cashier_id`.
- **Añadir `created_by` a `tickets` mediante DBR nueva.** Descartada: duplicaría `cashier_id` sin beneficio funcional.
- **`TicketPolicy` con 403.** Descartada: contradice CA-13.
- **`staff_notifications` con SoftDeletes.** Descartada por ahora: añadiría una columna a una tabla sin datos ni flujo en esta iteración. El responsable de BD lo decidió así en DBR-006 (resolución 6).
- **Registrar las excepciones solo en el plan.** Descartada: `AGENTS.md` exige ADR para toda excepción y la Constitución pide ADR para cambiar un principio.

## Consecuencias

### Positivas
- Las excepciones quedan en un único documento, enlazado desde spec, planes y tareas.
- La lista de diferidos evita reabrir la feature sin saber qué falta.
- `TicketPrice` sigue el mismo patrón que `Ticket`.

### Riesgos o costos
- Divergencia de patrón: `Ticket`, `TicketPrice`, `News` y `Event` no extienden `BaseModel`. La auditoría depende de que cada Action escriba en Activitylog; el modelo no lo garantiza.
- Si `staff_notifications` se reactiva sin revisar la excepción b), quedará una tabla de avisos sin borrado lógico.
- Un `cashier` no distingue «no existe» de «es ajeno». Es efecto intencional de c) y debe tenerse en cuenta en soporte.
- Cada modelo de negocio nuevo debe documentar su propia excepción mientras no exista `BaseModel`.

## Validación y revisión

- Aprobación: Jonathan, 2026-11-02 (responsable funcional y técnico de backend en `api-009`; planes aprobados el mismo día).
- Acuerdo del equipo: pendiente de lectura por el equipo. No consta en el repositorio un acuerdo expreso adicional.
- Responsable de BD: DBR-006, aprobada por BD el 2026-11-02, ya refleja la falta de `created_by` en `tickets` y `staff_notifications` sin SoftDeletes (resolución 6). Este ADR no cambia el esquema.
- Revisión obligatoria: al reactivar cualquiera de los diferidos, o al decidir crear `BaseModel`.
- Enlaces: `apps/api/plan/009-ticket-sales.md` (Constitution Check y decisiones 1 y 5), `apps/api/tasks/009-ticket-sales.md` (T-05 y T-56), `apps/dashboard/plan/005-ticket-sales.md` (enlaza este ADR por el alcance de `api-009`; no tiene excepción propia), `docs/adr/0019-qr-svg-generation-api.md` y `docs/adr/0020-price-change-email-notifications.md`.
