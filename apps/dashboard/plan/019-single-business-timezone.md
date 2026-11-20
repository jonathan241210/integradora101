# Plan técnico · 019 · single-business-timezone

- Spec: `apps/dashboard/specs/019-single-business-timezone.md` (Estado: Aprobada, Jonathan, 2026-11-20; decisión final 1: respaldo fijo a `America/Mexico_City`)
- Estado de spec: Aprobada
- Estado del plan: **Borrador — pendiente de aprobación técnica (equipo/Jonathan)**. No autoriza implementación hasta aprobarse.
- Responsable técnico: por identificar en la aprobación técnica
- Spec de la API (dueña de la zona): `apps/api/specs/025-single-business-timezone.md`, plan `apps/api/plan/025-single-business-timezone.md`
- DBR relacionada: ninguna (solo presentación y cliente HTTP).
- ADR relacionados: ninguno nuevo. ADR 0002 no aplica (no se añade React Router).
- Orden: después de `dashboard-015` (confirmación) y **después de implementar `api-025`**, porque la API debe informar `timezone` (historial, panel) y `period.timezone` (reporte). Antes de `dashboard-016`.

## Diseño de solución

El dashboard no tiene zona propia. Presenta cada instante UTC en la zona que devuelve la API en la misma respuesta: `timezone` en el historial y el panel, `period.timezone` en el reporte (RN-01). Si una respuesta no trae zona, usa el respaldo fijo `America/Mexico_City` (decisión final 1), nunca la del navegador.

Tres piezas:

1. **Cliente HTTP (`packages/api-client`):** deja de enviar `timezone` en panel, reporte, exportación, historial y cancelación (RN-03). Deja de leer `Intl.DateTimeFormat().resolvedOptions().timeZone`. El historial conserva el `timezone` de la respuesta en el resultado (`{ data, meta, timezone }`). No hay lógica de negocio en el cliente.
2. **Presentación (`apps/dashboard/src/viewmodels`):** `formatTicketDateTime(iso, timeZone)` pasa a exigir la zona. El estado del historial guarda la zona de la última respuesta y la usa en la tabla. `formatters.ts` concentra el respaldo `BUSINESS_TIMEZONE_FALLBACK = "America/Mexico_City"`. El dashboard no recalcula días, totales, cancelación ni vigencia (RN-02).
3. **Vistas (`apps/dashboard/src/views`):** `TicketHistoryView` recibe la zona del estado. Recibo de venta, precios y `ticket-prices.ts` dependen de respuestas que no traen zona: quedan bloqueados por las preguntas D-01 y D-02 (ver «Riesgos y decisiones»).

El formato `dd/mm/aaaa HH:mm` se mantiene (RN-04, `dashboard-005` CA-13). No hay selector de zona ni texto que la muestre (RN-05).

Flujo: el usuario abre historial, panel o reporte → el cliente llama sin `timezone` → la API responde con su zona → la vista formatea cada instante con esa zona → si falta la zona, se usa el respaldo fijo.

## Cambios por área

| Área/app | Archivos o módulos previstos | Propósito |
|---|---|---|
| Paquete `packages/api-client` | `ticket-sales.ts` (`history.list`, `browserTimeZone`, `CreateTicketSalesApiOptions.deviceTimeZone`, `normalizeHistory`), `ticket-sales-types.ts` (`TicketHistoryQuery` pierde `timezone`; `TicketHistoryPage` gana `timezone?`), `admin.ts` (`reportParams`, `browserTimeZone`, `CreateAdminApiOptions.deviceTimeZone`, panel `queryString({ timezone: zone() })`), `admin-types.ts` (tipos de consulta sin `timezone`; de respuesta, con) y `README.md` (líneas 72-77) | RN-03, CA-04, CA-07, CA-08 |
| Dashboard / viewmodels | `src/viewmodels/formatters.ts` (`BUSINESS_TIMEZONE_FALLBACK`, `formatDateTime` sin cambio de zona), `src/viewmodels/ticket-history.ts` (`formatTicketDateTime(iso, timeZone: string)` obligatorio; `TicketHistoryState.timezone`; acción `loaded` con `timezone`; `loadTicketHistory` usa el respaldo), `src/viewmodels/ticket-report.ts` (la exportación deja de añadir `timezone` desde `report.period.timezone`) | RN-01, RN-02, CA-01, CA-02, CA-05 |
| Dashboard / vistas | `src/views/TicketHistoryView.tsx` (columna «Fecha de compra» con `state.timezone`); `src/views/TicketReportView.tsx` y `src/sections/TicketReportSection.tsx` (sin conversión adicional; la hora de cada fila ya llega en la zona de la API, `PresentTicketRow`) | CA-01, CA-03 |
| Dashboard / pendientes de decisión | `src/components/TicketReceipt.tsx` (línea 40), `src/views/TicketPricesView.tsx` (línea 10), `src/viewmodels/ticket-prices.ts` (`localDateTimeToIso`, líneas 170-196, con `getTimezoneOffset`, línea 187; `formatTicketDateTime` en líneas 244 y 259) | Bloqueado por D-01 y D-02 |
| Dashboard / fixtures | `src/tests/admin-fixtures.ts`, `src/tests/ticket-sales-fixtures.ts` | Añadir `timezone` y `period.timezone` a las respuestas simuladas |
| Dashboard / pruebas | `src/tests/business-timezone.test.tsx` (nuevo); reescribir `src/tests/api-client-admin.test.tsx` (líneas 220-277), `src/tests/ticket-report.test.tsx` (líneas 148-170), `src/tests/ticket-sales-api-client.test.tsx` (líneas 65-108); actualizar `src/tests/ticket-history.test.tsx` (líneas 74, 207-219) y `src/tests/ticket-prices.test.tsx` (líneas 158-162, pendiente de D-01) | Un test por CA (CA-09) |
| Documentación | `packages/api-client/README.md` (líneas 72-77) | Referencia vigente |
| Specs (notas de revisión, en implementación) | `apps/dashboard/specs/005-ticket-sales.md` (CA-13, RN-13), `apps/dashboard/specs/003-administration-sections.md` (RN-11, CA-19) | Trazabilidad de sustituciones |
| API | Sin cambio en esta app (`api-025`) | Fuente de la zona |
| Otras apps | `apps/web`, `apps/mobile`, `apps/pwa`: sin cambio | Fuera de alcance |

## Contrato y datos

- **Rutas y permisos:** sin cambio. El dashboard sigue llamando las rutas de `api-007` (panel y reporte), `api-009` (historial, cancelación) y la exportación. Ningún permiso nuevo; la interfaz no añade permisos (`dashboard-003`, `api-009`).
- **Peticiones:** ninguna URL ni cuerpo contiene `timezone` (CA-04). La exportación envía solo periodo y formato (CA-05). El historial envía `from`/`to` como `Y-m-d` (CA-07). La cancelación envía solo `reason` (CA-08).
- **Respuestas que consume:**
  - Historial: `timezone` en el nivel superior (nuevo en `api-025`). El cliente lo expone como `timezone` en la página normalizada.
  - Panel: `data.timezone`.
  - Reporte: `data.period.timezone` (`period.timezone` en el contrato del cliente).
  - Venta y precio vigente: sin zona (D-01, D-02).
- **Errores:** sin cambio. `two_factor_setup_required` y 403 siguen `dashboard-004` y `dashboard-002`.
- **Compatibilidad:** versiones antiguas del cliente que envían `timezone` no rompen: la API lo ignora (`api-025` CA-10). Este cambio debe entrar en el mismo PR que `api-025` o después.
- **Datos:** no se crean datos ni se guarda la zona del dispositivo en el navegador. Se presentan boletos (financieros, solo lectura) con la misma información.
- **Auditoría:** sin cambio.

## Seguridad, offline y operación

- **Mínimo privilegio:** la interfaz no añade permisos; la autorización sigue en la API.
- **Datos:** la zona no es sensible. No se guarda en `localStorage` ni en cookies (la spec lo prohíbe).
- **Accesibilidad:** sin cambio. El texto de fecha se mantiene; no hay control nuevo.
- **Offline:** no aplica. El dashboard no usa datos offline.
- **Portabilidad:** sin dependencias nuevas. Funciona igual con MySQL en Aiven y local, porque la zona viene de la API.
- **Riesgo técnico de prueba (CA-01 y CA-02):** para simular la zona del navegador se usa `process.env.TZ` durante la prueba y se restaura después. Hay que confirmar en la primera ejecución de Vitest que el cambio surte efecto en el proceso del worker; esta sesión no puede comprobarlo. Alternativa si no funciona: inyectar `timeZone` del navegador como parámetro del formateador de prueba. El código de producción no lee la zona del navegador en ningún caso.
- **Observabilidad:** sin cambio.

## Mapeo de criterios a pruebas

Vitest, nombre de cada `it` con el identificador del CA al inicio (`CA-NN: ...`). Archivos en `apps/dashboard/src/tests/`.

| Criterio | Prueba automatizada | Ubicación | Tareas |
|---|---|---|---|
| CA-01 | `CA-01: fecha de compra en la zona de la API aunque el navegador esté en America/Tijuana` (`timezone: "America/Mexico_City"`, `purchased_at` 2026-11-07T05:30:00Z → `06/11/2026 23:30`) | `business-timezone.test.tsx` | T-07, T-08 |
| CA-02 | `CA-02: el navegador no cambia la presentación` (Europe/Madrid y America/Mexico_City → mismo texto `06/11/2026 23:30`) | `business-timezone.test.tsx` | T-07 |
| CA-03 | `CA-03: panel y reporte presentan con su zona sin recalcular` (respuesta de panel con `timezone` y reporte con `period.timezone` `America/Mexico_City`; `purchased_at` de la fila ya en esa zona no se convierte; totales sin cambio) | `business-timezone.test.tsx` | T-11 |
| CA-04 | `CA-04: panel, reporte, exportación, historial y cancelación no envían timezone` (con `@arca/api-client` y sesión activa, URLs y cuerpos sin `timezone`) y `CA-04: history.list no envía timezone aunque el llamador lo pase` | `api-client-admin.test.tsx`, `ticket-sales-api-client.test.tsx` | T-02 a T-05 |
| CA-05 | `CA-05: la exportación envía solo periodo y formato` (CSV, XLSX y PDF; el nombre lo decide la API) | `ticket-report.test.tsx` | T-06 |
| CA-06 | `CA-06: el cliente no lee la zona del dispositivo` (Intl con zona distinta; ninguna URL contiene `timezone`) y `CA-06: el código de src y api-client no usa resolvedOptions ni getTimezoneOffset` (búsqueda en el código fuente, excluido `tests/`) | `business-timezone.test.tsx` | T-12 |
| CA-07 | `CA-07: historial envía from y to como Y-m-d sin timezone` | `ticket-sales-api-client.test.tsx` | T-03 |
| CA-08 | `CA-08: cancelar envía solo reason` (cuerpo exacto `{ "reason": "..." }`) | `ticket-sales-api-client.test.tsx` | T-03 |
| CA-09 | Verificación de cobertura por búsqueda de `CA-01` a `CA-08` en `apps/dashboard/src/tests/` y `packages/api-client` (sin test propio) | Revisión en PR | T-13 |

## Constitution Check

| Principio | Cumple | Evidencia o excepción propuesta |
|---|---|---|
| I. Stack mínimo y portable | Sí | Sin dependencias nuevas (no se añade ninguna librería de zonas horarias). La zona se lee de la API, no de la nube. Pendiente D-01: si se decide convertir localmente, la solución no debe añadir una dependencia sin ADR. |
| II. La spec manda | Sí | Spec 019 Aprobada (2026-11-20). Plan y tasks con el mismo `019-single-business-timezone`. Requiere `api-025` implementada antes. |
| III. Lógica separada de la interfaz | Parcial (con brecha) | Las vistas solo presentan; el cliente no tiene reglas. Brecha: `ticket-prices.ts` convierte la hora de entrada en vigor con el desfase del navegador (`localDateTimeToIso`). Es lógica de viewmodel que depende de la zona del dispositivo (D-01). |
| IV. Un test por criterio | Sí | Mapeo de CA-01 a CA-08 con `it("CA-NN: ...")`. CA-09 por verificación de cobertura. Pendiente la evidencia de la sesión principal. |
| V. Una sola fuente de verdad para los datos | Sí | Sin datos nuevos ni escrituras. La zona de negocio es la de la API. |
| VI. Código en inglés, personas en español | Sí | Nombres de funciones en inglés; textos de UI y mensajes en español. |

## Riesgos y decisiones

- **Dependencia de orden:** si el dashboard se despliega antes que `api-025`, la presentación usa el respaldo fijo. El resultado es correcto para la zona por defecto, pero no sigue `ARCA_TIMEZONE`. Por eso va después.
- **Divergencias y brechas:**
  - **D-01 (precios programados):** `ticket-prices.ts` (`localDateTimeToIso`, líneas 170-196) convierte la fecha local de «entrada en vigor» con `getTimezoneOffset()` del navegador. La API exige `effective_at` con desfase (`SaveTicketPricesRequest`; `apps/api/docs/tickets.md`, línea 156). Viola CA-06 de esta spec. Dos opciones, que requieren decisión conjunta con `api-025` P-03:
    - A (propuesta): el dashboard envía la fecha y hora sin desfase y la API la interpreta en `arca.timezone`. Cambia el contrato de `api-009` (`api-025` P-03).
    - B: el dashboard conoce la zona de la API y calcula el desfase con esa zona. Requiere lógica de conversión en el cliente sin dependencia nueva; se descarta por complejidad y riesgo.
    - Mientras no se decida, T-10 queda bloqueada y `ticket-prices.test.tsx` (líneas 158-162) no cambia.
  - **D-02 (recibo de venta y precio vigente):** `formatTicketDateTime` se usa sin zona en `TicketReceipt.tsx` (línea 40) y `TicketPricesView.tsx` (líneas 244 y 259). Las respuestas de venta y de precio no informan `timezone`. Propuesta: que `api-025` P-04 añada `timezone` a esas respuestas. Mientras tanto, T-09 queda bloqueada.
  - **D-03 (presentación fija en otras vistas):** `formatDateTime` (`formatters.ts`, línea 42) fija `America/Mexico_City` para momentos, especies y publicaciones (`MemoriesView`, `MemoryReviewDetailView`, `PublishedSpeciesView`, `SpeciesRequestsView`). Coincide con el valor por defecto de la API, pero no sigue `ARCA_TIMEZONE` si un ambiente la cambia. Esas respuestas no traen `timezone`. Ver pregunta D-03.
  - **Respaldo en `formatTicketDateTime`:** la firma sin zona usaba la del navegador. Se elimina el valor por defecto de la firma; los llamadores pasan siempre zona.
- **Pruebas que cambian:** `api-client-admin.test.tsx` (CA-04, bloque de `Intl`), `ticket-report.test.tsx` (exportación con zona del reporte), `ticket-sales-api-client.test.tsx` (historial con zona del dispositivo y cancelación). Se reescriben con los nombres CA de esta spec. `ticket-history.test.tsx` (líneas 74, 207-219) y `ticket-prices.test.tsx` (líneas 158-162) se ajustan a la firma nueva.
- **Cambio visible:** un usuario en otra zona verá horas distintas. Es el efecto esperado y debe anunciarse antes del despliegue.
- **Alternativas descartadas:** guardar la zona en `localStorage` (prohibido por la spec); añadir una librería de zonas (sin ADR, descartado); mostrar la zona en la interfaz (fuera de alcance, `dashboard-003` pregunta 4).

## Preguntas abiertas para aprobar este plan

- **D-01 (precios programados):** ¿la hora de «entrada en vigor» la interpreta la API en `arca.timezone` (propuesta A, con enmienda del contrato de `api-009`) o se mantiene el desfase del navegador (incumple CA-06 de esta spec)? Esta decisión es la misma que `api-025` P-03; se toma una sola vez. Bloquea T-10.
- **D-02 (recibo y precio vigente):** ¿se añade `timezone` a las respuestas de venta y de precio (`api-025` P-04) para que el recibo y el precio se presenten en la zona de la API? Bloquea T-09.
- **D-03 (presentación fija en momentos, especies y publicaciones):** ¿se acepta que `formatDateTime` siga en `America/Mexico_City` fijo para esas vistas, con la divergencia registrada si `ARCA_TIMEZONE` cambia, o esas respuestas deben informar `timezone` (cambio en las specs de momentos y especies de la API)? Propuesta: aceptar el fijo como respaldo y registrar la divergencia; no bloquea las tareas de este plan.

## Orden y aprobación

1. `dashboard-015` (confirmación de la 2FA) cerrado.
2. `api-025` implementada (historial con `timezone`, panel y reporte con la zona de negocio) y verificada.
3. Respuestas a D-01, D-02 y D-03 registradas.
4. Implementación según `apps/dashboard/tasks/019-single-business-timezone.md` (T-02 en adelante). T-09 y T-10 solo al cerrar D-01 y D-02.
5. Verificación con evidencia de la sesión principal.

- Revisión técnica: pendiente.
- Aprobador funcional: Jonathan (spec aprobada 2026-11-20).
- Evidencias: pendientes de la sesión principal (salida de Vitest y de tipos, y de lint). Esta sesión no tiene shell y no afirma que pasen.
