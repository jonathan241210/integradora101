# 018 · pending-review-badges (aviso al iniciar sesión y puntito de pendientes)

- App dueña: `dashboard`
- Apps/paquetes afectados: `dashboard` (aviso al iniciar sesión, puntito en el menú, consulta de conteos); `api` (`api-024`, dueña de los conteos y de los permisos; no se modifica desde esta spec); `packages/api-client` (método y tipo de los conteos; sin lógica de negocio); `packages/ui` (solo si falta un componente compartido).
- Estado: Aprobada (2026-11-20). Sin plan, sin tasks, sin código.
- Solicitante / responsable funcional: Jonathan.
- Aprobación funcional: Jonathan, 2026-11-20.
- Dependencias de contrato: `api-024` (Aprobada 2026-11-20; endpoint `GET /api/v1/admin/pending-counts`). Depende de los permisos de `api-023` (rol «Comunicación», solo citado).

## Problema y contexto

El personal de Dirección y de Comunicación revisa solicitudes de especie en TulanPedia (`dashboard-010`, sección «TulanPedia», pestaña «Solicitudes») y momentos de visitantes (`dashboard-008`, sección «Momentos»). Nada en el panel indica que hay trabajo pendiente: hay que entrar a cada sección para saberlo.

Esta spec añade dos avisos simples, sin tiempo real:

1. Al iniciar sesión (o al cargar el panel con sesión activa), si hay pendientes, un aviso con el mismo estilo de los avisos actuales del panel.
2. Un puntito en el menú junto a «TulanPedia» y «Momentos» mientras haya pendientes.

Los números los decide la API (`api-024`). El dashboard solo los presenta.

## Objetivos

- Avisar al iniciar sesión de cuántas solicitudes de especie y momentos esperan revisión, solo si hay alguna.
- Mostrar un puntito junto a la sección correspondiente en el menú mientras haya pendientes, y quitarlo cuando lleguen a cero.
- Actualizar los conteos al iniciar sesión y al cambiar de pantalla, sin tiempo real.
- Que el aviso y el puntito sean accesibles y no dependan solo del color.
- Que un fallo al consultar no impida usar el panel.

## Fuera de alcance

- Tiempo real, websockets, sondeo en segundo plano, notificaciones del sistema, correo o push.
- Estado «leído», «visto» o «descartado» del puntito o del aviso. El puntito solo baja cuando la API reporta cero.
- Avisos de otros tipos (cancelaciones, arqueo, cuentas, noticias, eventos, recintos).
- Cifras en el puntito. El número solo aparece en el aviso y en el nombre accesible.
- Cambios de la API, de permisos o de roles (`api-024`, `api-023`).
- Cambios en las pantallas de revisión (`dashboard-008`, `dashboard-010`).

## Actores y permisos

| Actor/rol | Necesidad | Permisos requeridos |
|---|---|---|
| `zoo-admin` | Ver aviso y puntitos de ambas secciones | `species.review` y `memories.review` (perfil ya entregado por la API) |
| Rol «Comunicación» (`api-023`) | Ver aviso y puntitos de ambas secciones | `memories.review` y `species.review` |
| Usuario con solo uno de los permisos | Ver solo el aviso y el puntito de su sección | El permiso correspondiente |
| `admin`, `executive`, `cashier`, `veterinarian` y el rol de consulta directiva (`api-023`) | No hay consulta ni puntito | — |

La decisión se toma por permiso (`profile.permissions`), no por nombre de rol.

## Historias de usuario

- Como `zoo-admin`, quiero que el panel me avise al entrar de cuántas solicitudes y momentos esperan mi revisión, para atenderlos a tiempo.
- Como miembro de Comunicación, quiero ver un puntito en «TulanPedia» o «Momentos» cuando haya algo pendiente, para no tener que revisar cada sección.

## Criterios de aceptación

- **CA-01 (aviso al iniciar sesión con pendientes):** Dado un usuario con `species.review` que inicia sesión y la API informa `species_requests` mayor que 0, cuando termina la carga inicial del panel, entonces aparece un aviso con el estilo de los avisos actuales del panel (`DashboardNotifications`, mismo contenedor y botón de cierre) y el texto «Tienes N solicitudes de especies pendientes.». Con `memories` mayor que 0 y `memories.review`, el texto es «Tienes N momentos pendientes de revisión.». Si hay ambos, se muestra un aviso por cada tipo.
  - Verificación: `pending-review-badges.test.tsx`, caso «aviso al iniciar con pendientes».

- **CA-02 (sin aviso sin pendientes):** Dado un usuario cuyos conteos son 0, o que no tiene ninguno de los dos permisos, cuando inicia sesión, entonces no aparece ningún aviso de pendientes.
  - Verificación: `pending-review-badges.test.tsx`, caso «sin aviso con cero».

- **CA-03 (singular y plural):** Con 1 pendiente, el texto es «Tienes 1 solicitud de especie pendiente.» o «Tienes 1 momento pendiente de revisión.». Con 2 o más, los textos usan el plural de CA-01. Los textos están aprobados (decisión 2026-11-20).
  - Verificación: `pending-review-badges.test.tsx`, caso «singular y plural».

- **CA-04 (aviso una vez por inicio):** Dado un aviso ya mostrado en el inicio, cuando el usuario cambia de pantalla, entonces el aviso no vuelve a aparecer; solo se actualiza el puntito (CA-07).
  - Verificación: `pending-review-badges.test.tsx`, caso «aviso no se repite al cambiar de pantalla».

- **CA-05 (puntito en la sección correcta):** Dado un usuario con permisos y conteos mayores que 0, cuando mira el menú, entonces el puntito aparece junto a «TulanPedia» si `species_requests` es mayor que 0 y junto a «Momentos» si `memories` es mayor que 0. No aparece en otras opciones del menú.
  - Verificación: `pending-review-badges.test.tsx`, caso «puntito por sección».

- **CA-06 (puntito desaparece a cero):** Dado un puntito visible, cuando una consulta posterior devuelve 0 para esa clave, entonces el puntito desaparece en la siguiente pintura del menú, sin recargar la página.
  - Verificación: `pending-review-badges.test.tsx`, caso «puntito baja a cero».

- **CA-07 (actualización al cambiar de pantalla):** Dado un usuario con permisos, cuando cambia de sección por el menú, por la búsqueda global o por un enlace interno, entonces el panel vuelve a consultar los conteos (sujeto al intervalo mínimo de RN-07) y actualiza el puntito. No hay consultas en segundo plano entre cambios de pantalla.
  - Verificación: `pending-review-badges.test.tsx`, caso «consulta al cambiar de sección».

- **CA-08 (sin tiempo real):** El panel no abre websockets, no usa `setInterval` para consultar conteos y no pide conteos cuando la pestaña no cambia de pantalla.
  - Verificación: `pending-review-badges.test.tsx`, caso «sin sondeo».

- **CA-09 (accesibilidad del puntito):** El puntito es decorativo (`aria-hidden="true"`) y no transmite información solo por color. El nombre accesible del botón del menú incluye el estado en español: «TulanPedia, con solicitudes pendientes» o «Momentos, con momentos pendientes de revisión». Sin pendientes, el nombre accesible es solo el de la sección. El aviso usa `role="status"`.
  - Verificación: `pending-review-badges.test.tsx`, caso «nombre accesible y puntito decorativo».

- **CA-10 (fallo no bloquea):** Dado un error de red o un `5xx` al consultar conteos, cuando ocurre, entonces el panel sigue usable: no se bloquea la navegación ni las acciones, no se muestra un error de pantalla completa, no aparece puntito ni aviso y no se reintenta en bucle. La siguiente pantalla vuelve a intentar la consulta.
  - Verificación: `pending-review-badges.test.tsx`, caso «fallo no bloquea».

- **CA-11 (sin permisos no hay consulta):** Dado un usuario sin `species.review` ni `memories.review`, cuando inicia sesión y cambia de pantalla, entonces el panel no llama a `GET /api/v1/admin/pending-counts` y no muestra ningún puntito ni aviso.
  - Verificación: `pending-review-badges.test.tsx`, caso «sin permisos no consulta».

- **CA-12 (sin datos de personas):** El aviso y el puntito solo muestran el texto y el número de CA-01 y CA-03. No muestran nombres de especies, de visitantes ni de veterinarios.
  - Verificación: `pending-review-badges.test.tsx`, caso «solo cifras».

- **CA-13 (MVVM y api-client):** Los componentes (views y menú) solo presentan. La consulta vive en un hook (ViewModel) que llama a `@arca/api-client`. No hay `fetch` ni `axios` en componentes ni cálculos de pendientes en la interfaz.
  - Verificación: revisión de código y test de cliente con mock de `@arca/api-client`.

- **CA-14 (cobertura):** Cada CA-01 a CA-16 tiene al menos un test Vitest que lo nombra (Constitución IV).
  - Verificación: revisión de nombres de test por CA; sin evidencia aún.

- **CA-15 (espera si hay otro aviso):** Dado un aviso visible al iniciar sesión (de éxito o de error), cuando también hay pendientes, entonces el aviso de pendientes espera a que el anterior termine (se cierre solo o con su botón) y después se muestra, sin solapar avisos.
  - Verificación: `pending-review-badges.test.tsx`, caso «espera a otro aviso».

- **CA-16 (intervalo mínimo de 15 segundos):** Dadas dos consultas de conteos separadas por menos de 15 segundos, cuando se cambia de pantalla la segunda vez, entonces el panel no vuelve a llamar a la API y usa el último resultado; pasados 15 segundos, la siguiente pantalla sí consulta.
  - Verificación: `pending-review-badges.test.tsx`, caso «intervalo mínimo de 15 s».

## Reglas de negocio

- **RN-01 (la API decide):** Los conteos y su significado los decide `api-024`. El dashboard no reinterpreta estados ni calcula pendientes a partir de otros datos.
- **RN-02 (consulta por permiso):** La consulta se hace solo si el perfil ya entregado por la API incluye `species.review` o `memories.review`. Ocultar el puntito no reemplaza la autorización del servidor (`apps/dashboard/AGENTS.md`).
- **RN-03 (aviso de inicio):** El aviso de pendientes se muestra una vez por inicio, cuando los conteos llegan con valores mayores que 0. Ocurre tanto al escribir credenciales como al cargar el panel con una sesión ya activa (decisión 2026-11-20). Se comporta como el aviso actual: se cierra solo a los 5 segundos y tiene botón de cierre. Una vez cerrado, no vuelve a aparecer en esa sesión, aunque cambie de pantalla.
- **RN-04 (puntito):** El puntito aparece cuando el último conteo recibido de esa clave es mayor que 0 y desaparece cuando es 0. No hay número visible en el menú.
- **RN-05 (sin estado de leído):** Abrir la sección no oculta el puntito. Solo lo oculta un conteo de 0, es decir, que la solicitud o el momento salió de la cola.
- **RN-06 (sin tiempo real):** La actualización ocurre al iniciar sesión y al cambiar de pantalla. No hay sondeo, websockets, correo ni notificaciones del sistema.
- **RN-07 (intervalo mínimo):** Entre dos consultas seguidas, el panel espera al menos 15 segundos (decisión 2026-11-20). Un cambio de pantalla dentro de ese intervalo usa el último resultado (CA-16). *Enmienda técnica 2026-11-20 (pregunta 4 del plan): solo las consultas con éxito actualizan el intervalo; un fallo no cuenta para él.*
- **RN-08 (fallo):** Si la consulta falla, no se muestra puntito ni aviso nuevo (CA-10). El fallo no bloquea la navegación ni las acciones.
- **RN-09 (menú contraído y móvil):** El puntito se ve también con el menú contraído (`dashboard-011` CA-01), sobre el icono, y en el menú móvil, con el mismo texto accesible.
- **RN-10 (sin cambio de decisiones de revisión):** Las acciones de revisión (`dashboard-008`, `dashboard-010`) no cambian. Tras una decisión, el puntito se actualiza al cambiar de pantalla, no en la misma pantalla (decisión 2026-11-20).
- **RN-11 (estilo):** Usa tokens semánticos y los componentes de `@arca/ui` y los avisos existentes. No fija colores de marca. Modo claro.
- **RN-12 (tono):** El aviso de pendientes usa tono informativo neutro dentro de `DashboardNotifications`, sin dependencia nueva (decisión 2026-11-20). No usa el tono de éxito. *Enmienda técnica 2026-11-20 (pregunta 2 del plan): el encabezado del tono informativo es «Aviso».*
- **RN-13 (clic en la sección abierta; enmienda técnica 2026-11-20, pregunta 3):** Un clic en la sección que ya está abierta no vuelve a consultar los conteos. Solo un cambio de sección consulta (CA-07).
- **RN-14 (cola de avisos; enmienda técnica 2026-11-20, pregunta 1):** `DashboardNotifications` muestra los avisos en orden de llegada, en cola FIFO para todos los tonos: un aviso espera a que termine el anterior (por tiempo o por su botón) y después se muestra. Sustituye la ranura única de la versión anterior (CA-15).

## Datos, privacidad y auditoría

- **Datos:** solo los dos enteros de `api-024` (CA-01 a CA-03 de esa spec). El dashboard no guarda historial de conteos ni los escribe en almacenamiento local.
- **Esquema:** esta spec no lee ni modifica tablas. La verificación de esquema de `api-024` (2026-11-20) confirma que no hace falta índice ni DBR.
- **Privacidad:** no se muestra ningún dato de personas (CA-12). Las pantallas de revisión mantienen sus propias reglas de privacidad.
- **Auditoría:** la consulta de conteos no se audita; las decisiones se auditan en las specs de revisión.

## Flujos y errores

1. **Inicio de sesión o carga con sesión activa:** el perfil llega con sus permisos. Si tiene `species.review` o `memories.review`, el hook consulta `api-024`. Si hay pendientes, se muestra el aviso (CA-01) y el puntito se pinta en el menú (CA-05).
2. **Cambio de pantalla:** si pasó el intervalo mínimo (RN-07), el hook consulta de nuevo y actualiza el puntito (CA-06, CA-07). Si no, usa el último resultado (CA-16).
3. **Sin permisos:** no hay consulta, aviso ni puntito (CA-11).
4. **Error de consulta:** sin puntito ni aviso nuevo; la navegación sigue; el siguiente cambio de pantalla vuelve a consultar (CA-10).
5. **Sesión caducada:** el manejo es el existente del panel (`dashboard-002`); los conteos no añaden un flujo nuevo.
6. **Aviso en curso:** si al iniciar sesión ya hay otro aviso visible (éxito o error), el de pendientes espera a que el anterior termine (CA-15).

## Dependencias, riesgos y preguntas

- **Dependencias/ADR:** `api-024` (conteos), `api-023` (rol «Comunicación» y permisos), `dashboard-003` (navegación por permisos), `dashboard-008` y `dashboard-010` (secciones que se señalan), `dashboard-011` (menú contraído), `dashboard-002` (sesión). No requiere dependencia nueva ni ADR.
- **Riesgos:**
  - Puntos o avisos que no coinciden con la cola real: mitigado por RN-01 y por `api-024` CA-05.
  - Aviso que se cierra antes de que el usuario lo lea (5 s en el aviso actual): se mantiene el comportamiento del aviso actual (RN-03) y el botón de cierre; si se quiere más tiempo, es un cambio de `dashboard-003`/`DashboardNotifications`.
  - Carga por cambios de pantalla frecuentes: mitigado por RN-07 y por el límite de `api-024` CA-10.
  - Pantallas que no pasan por la navegación habitual (enlaces directos): deben consultar también al cambiar de sección. Lo cubre CA-07 al cubrir la búsqueda y los enlaces internos.
  - El nombre accesible del botón del menú hoy se fija con `aria-label` igual a la etiqueta; el plan debe incluir el estado sin romper el nombre actual.
- **Decisiones 2026-11-20** (las preguntas de la versión Borrador quedan cerradas):
  1. **¿Aviso al escribir credenciales, al cargar con sesión activa, o ambos?** Decisión 2026-11-20: ambos (RN-03).
  2. **¿Cierre automático o permanente?** Decisión 2026-11-20: igual que el aviso actual, con cierre automático a los 5 segundos y botón de cierre (RN-03).
  3. **¿Espera o se muestra a la vez si hay otro aviso?** Decisión 2026-11-20: espera (CA-15); tono informativo neutro dentro de `DashboardNotifications` (RN-12).
  4. **¿Intervalo mínimo?** Decisión 2026-11-20: 15 segundos entre consultas (RN-07, CA-16).
  5. **¿Textos de CA-01 y CA-03?** Decisión 2026-11-20: aprobados tal como están escritos.
  6. **¿Puntito al instante tras aceptar o rechazar?** Decisión 2026-11-20: se actualiza al cambiar de pantalla, no en la misma pantalla (RN-10).

## Revisión

- Aprobadores y fecha: Jonathan, 2026-11-20.
- Enmienda técnica 2026-11-20: decisiones de la aprobación técnica de `apps/dashboard/plan/018-pending-review-badges.md`. Enmienda RN-07 (fallo no cuenta) y RN-12 (etiqueta «Aviso»); añade RN-13 (clic sin consulta) y RN-14 (cola FIFO). CA sin cambio de número.
- Evidencia/enlaces: `apps/dashboard/src/components/DashboardNotifications.tsx` (aviso emergente, `NotificationAlert`, cierre automático de 5 s), `apps/dashboard/src/components/NoticeBar.tsx`, `apps/dashboard/src/components/PendingRequestNotice.tsx`, `apps/dashboard/src/App.tsx` (menú `sidebar-link`, `navigate`, perfil con `permissions`), `apps/dashboard/src/viewmodels/navigation.ts` (secciones `memories` y `tulanpedia` con sus permisos), `apps/dashboard/src/viewmodels/dashboard-shell.ts` (acción `navigate`); specs `apps/dashboard/specs/008-memory-moderation.md`, `apps/dashboard/specs/009-species-request-review.md`, `apps/dashboard/specs/010-public-content-management.md`, `apps/dashboard/specs/011-collapsible-menu-event-pagination.md`; `apps/api/specs/024-pending-review-counts.md`.
- Consulta de esquema vivo: no aplica a esta spec (no toca datos); ver `api-024`.

## Nota de revisión (2026-11-21, `dashboard-021` y `api-027`)

- **Clave nueva `cancellation_days`:** para quien tiene `reports.cancellations.view` (solo `admin`), el aviso al iniciar sesión y el puntito usan la clave `cancellation_days` de `GET /api/v1/admin/pending-counts` (`api-024` nota de 2026-11-21).
- **Texto del aviso:** «Tienes N días de cancelaciones en Atención sin revisar.» y, con 1, «Tienes 1 día de cancelaciones en Atención sin revisar.». Mismo tono informativo, cola FIFO (RN-14) y cierre de 5 s (RN-03).
- **Puntito:** aparece junto a «Reportes» (menú) y en la pestaña «Cancelaciones» cuando la clave es mayor que 0; el nombre accesible es «Reportes, con días de cancelaciones pendientes de revisión». Sustituye el criterio de CA-05 solo para esa sección; las secciones «TulanPedia» y «Momentos» no cambian.
- **Permisos:** RN-02 y CA-11 se amplían con `reports.cancellations.view`. Sin ese permiso no hay consulta de `cancellation_days`.
- **Intervalo y sondeo:** RN-07 y CA-16 sin cambio; la consulta sigue solo al iniciar sesión y al cambiar de pantalla.
- **CA y RN nuevos:** ninguno en esta spec. El detalle de la pestaña y el registro de revisión está en `apps/dashboard/specs/021-cancellation-review-signals.md` (CA-10 a CA-12 de esa spec).
