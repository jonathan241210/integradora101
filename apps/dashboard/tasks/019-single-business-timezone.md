# Tareas · 019 · single-business-timezone

- Solicitada: 2026-11-20
- Aprobada: 2026-11-20
- Spec: `apps/dashboard/specs/019-single-business-timezone.md`
- Plan: `apps/dashboard/plan/019-single-business-timezone.md` (Aprobado)
- API (dueña de la zona): `apps/api/specs/025-single-business-timezone.md`, `apps/api/tasks/025-single-business-timezone.md`

Plan aprobado. Las tareas de implementación siguen condicionadas a T-01 (`api-025` implementada). Ninguna tarea está marcada. Una tarea solo se marca con evidencia aportada por la sesión principal. Esta sesión no tiene shell y no afirma que Vitest, tipos, lint ni CI pasen.

Sin DBR: no hay tareas de BD. Sin dependencias nuevas.

## Precondiciones

- [ ] **T-01** (todos los CA): `api-025` implementada y verificada: el historial responde `timezone` en el nivel superior, el panel `data.timezone` y el reporte `data.period.timezone`, todos con `ARCA_TIMEZONE`. Evidencia: salida de la sesión principal. Sin esto, el dashboard usaría el respaldo fijo y no cumple CA-01.
- [x] **T-02a** (bloqueante de T-09 y T-10): cerrar D-01 (precios programados, misma decisión que `api-025` P-03) y D-02 (recibo y precio vigente, `api-025` P-04) con el responsable funcional. Resultado: decisión registrada en la spec y en el plan. D-03 no bloquea. *Estado: resuelta; T-09 y T-10 quedan desbloqueadas, sujetas a T-01.*

## Implementación: cliente HTTP sin zona del dispositivo (RN-03; CA-04, CA-05, CA-07, CA-08)

- [x] **T-02** (CA-04; RN-03): `packages/api-client/ticket-sales.ts`: eliminar `browserTimeZone`, `CreateTicketSalesApiOptions.deviceTimeZone` y el `zone()` de `createTicketSalesApi`; `history.list` deja de enviar `timezone`. `normalizeHistory` conserva el `timezone` de la respuesta en el resultado. Resultado: ninguna URL del historial contiene `timezone`.
- [x] **T-03** (CA-04, CA-07, CA-08): `apps/dashboard/src/tests/ticket-sales-api-client.test.tsx`: reescribir `it("history.list envía timezone del dispositivo y filtros")`, `it("el llamador puede sobrescribir timezone en el historial")` y `it("history.cancel envía solo reason, sin timezone, y history.list sí envía la zona")` (líneas 65-108). Nombres: `CA-04: history.list no envía timezone aunque el llamador lo pase`, `CA-07: historial envía from y to como Y-m-d sin timezone`, `CA-08: cancelar envía solo reason` (cuerpo exacto). Resultado: tests en verde (salida de la sesión principal).
- [x] **T-04** (CA-04; RN-03): `packages/api-client/admin.ts`: eliminar `browserTimeZone`, `CreateAdminApiOptions.deviceTimeZone`, el parámetro `timezone` de `reportParams` y `queryString({ timezone: zone() })` del panel. `packages/api-client/ticket-sales-types.ts` (`TicketHistoryQuery`, línea 73, con su comentario «por defecto la del dispositivo»): quitar `timezone`. `packages/api-client/admin-types.ts`: quitar `timezone` de `TicketReportQuery` (línea 220). Los tipos de respuesta lo conservan: `DashboardSummaryDto` (línea 205), `TicketReportDto.period` (línea 241) y el nuevo `timezone` de la página del historial. Resultado: TypeScript rechaza que un llamador pase `timezone`.
- [x] **T-05** (CA-04): `apps/dashboard/src/tests/api-client-admin.test.tsx`: reescribir `it("envía timezone con la zona del dispositivo en panel, reporte y exportación")`, `it("no envía timezone si el navegador no informa la zona")` y `it("un timezone explícito prevalece y el predeterminado usa la zona de Intl")` (líneas 220-277) por `CA-04: panel, reporte y exportación no envían timezone aunque el navegador informe otra zona`. Resultado: ninguna URL del bloque contiene `timezone`.
- [x] **T-06** (CA-05; RN-03): `apps/dashboard/src/viewmodels/ticket-report.ts` (líneas 118-121): la exportación deja de añadir `timezone` desde `query.timezone` o `report.period.timezone`; envía solo periodo y formato. Reescribir `apps/dashboard/src/tests/ticket-report.test.tsx`, `it("exporta con la zona del reporte visible y respeta un timezone explícito")` (líneas 148-170), como `CA-05: la exportación envía solo periodo y formato (CSV, XLSX y PDF)`. Resultado: la petición de exportación no contiene `timezone`.

## Implementación: presentación en la zona de la API (RN-01, RN-02, RN-04; CA-01, CA-02)

- [x] **T-07** (CA-01, CA-02; RN-01, RN-04): `apps/dashboard/src/viewmodels/formatters.ts`: exportar `BUSINESS_TIMEZONE_FALLBACK = "America/Mexico_City"` (respaldo fijo, decisión final 1). `apps/dashboard/src/viewmodels/ticket-history.ts`: `formatTicketDateTime(iso, timeZone: string)` con zona obligatoria (sin valor por defecto); `TicketHistoryState` gana `timezone` (inicial: `BUSINESS_TIMEZONE_FALLBACK`); la acción `loaded` lleva `timezone`; `loadTicketHistory` usa `page.timezone ?? BUSINESS_TIMEZONE_FALLBACK`. Crear `apps/dashboard/src/tests/business-timezone.test.tsx` con `CA-01: fecha de compra en la zona de la API aunque el navegador esté en America/Tijuana` (`purchased_at`:00Z con `timezone` `America/Mexico_City` → `06/11/2026 23:30`) y `CA-02: el navegador no cambia la presentación` (Europe/Madrid y America/Mexico_City → mismo texto). Simular el navegador con `process.env.TZ` restaurado después (confirmar en la primera ejecución). Resultado: tests en verde.
- [x] **T-08** (CA-01): `apps/dashboard/src/views/TicketHistoryView.tsx`: la columna «Fecha de compra» (línea 41) usa `state.timezone`. Ajustar `apps/dashboard/src/tests/ticket-history.test.tsx`: líneas 74 y 207-219 con la zona explícita; el caso `formatTicketDateTime(null)` pasa una zona. Mantener el test de línea 224-228 (no importar `formatDateTime`). Resultado: historial presenta en la zona de la API.
- [x] **T-09** (CA-01, CA-02; desbloqueada por la decisión D-02): `apps/dashboard/src/components/TicketReceipt.tsx` (línea 40) y `apps/dashboard/src/views/TicketPricesView.tsx` (línea 10, con `formatTicketDateTime` en el resultado de precios): pasar la zona que decida D-02. La decisión D-02 está tomada; la tarea depende solo de T-01. Resultado: recibo y precios presentan con la zona de la API o con la solución aprobada.
- [x] **T-10** (CA-06; desbloqueada por la decisión D-01): `apps/dashboard/src/viewmodels/ticket-prices.ts`: quitar `getTimezoneOffset` de `localDateTimeToIso` (líneas 170-196) según la decisión D-01 (propuesta A: el dashboard envía fecha y hora sin desfase y la API la interpreta en `arca.timezone`; requiere `api-025` P-03). Ajustar `apps/dashboard/src/tests/ticket-prices.test.tsx` (líneas 158-162). Resultado: ninguna lectura de la zona del dispositivo en `ticket-prices.ts`.
- [x] **T-11** (CA-03): verificar `apps/dashboard/src/views/TicketReportView.tsx` y `apps/dashboard/src/sections/TicketReportSection.tsx` y el panel: las fechas y horas de `period`, `daily` y `purchased_at` se muestran tal como llegan (la API ya las entrega en su zona); el dashboard no recalcula totales ni días. Test `CA-03: panel y reporte presentan con su zona sin recalcular` en `business-timezone.test.tsx` con respuesta fija (`timezone` y `period.timezone` `America/Mexico_City`). Ajustar `apps/dashboard/src/tests/admin-fixtures.ts` (añadir `timezone` y `period.timezone`) y `apps/dashboard/src/tests/ticket-sales-fixtures.ts` si hace falta. Resultado: test en verde y sin cambios de cifras en la vista.
- [x] **T-12** (CA-06; RN-05): en `business-timezone.test.tsx`: `CA-06: el cliente no lee la zona del dispositivo` (Intl simulado con otra zona; ninguna URL de panel, reporte, exportación, historial ni cancelación contiene `timezone`) y `CA-06: el código de src y api-client no usa resolvedOptions ni getTimezoneOffset` (lectura del código fuente con el patrón de `ticket-history.test.tsx` línea 224, excluyendo `tests/`). Resultado: ninguna lectura de zona del dispositivo fuera de las pruebas.

## Cobertura, documentación y entrega

- [x] **T-13** (CA-09): verificación por búsqueda de `CA-01` a `CA-08` en `apps/dashboard/src/tests/` y `packages/api-client`. Resultado: tabla CA → test en el PR; ningún CA sin test.
- [x] **T-14** (documentación local): `packages/api-client/README.md` (líneas 72-77): `history.list` y `history.cancel` sin zona del dispositivo; `history.list` devuelve `timezone`; eliminar la frase «`timezone` usa la zona del dispositivo» (línea 77). No cambia `infra/README.md` (sin requisito de ambiente en el dashboard).
- [x] **T-15** (notas de revisión en specs afectadas; sin cambiar requisitos): añadir nota de revisión que apunte a `dashboard-019` en `apps/dashboard/specs/005-ticket-sales.md` (CA-13 y RN-13 sustituidos; aclaración sobre `timezone` del historial para filtros) y `apps/dashboard/specs/003-administration-sections.md` (RN-11 y CA-19 en lo que toca a la zona del dispositivo). Resultado: trazabilidad en las specs.
- [ ] **T-16** (calidad): los scripts existentes de Vitest, verificación de tipos y lint del dashboard y del paquete `api-client`, con salida real aportada por la sesión principal. Sin evidencia no se marca. Esta sesión no ejecuta comandos.
- [ ] **T-17** (entrega): PR que enlaza `apps/dashboard/specs/019-single-business-timezone.md`, `apps/dashboard/plan/019-single-business-timezone.md`, `apps/dashboard/tasks/019-single-business-timezone.md` y `apps/api/specs/025-single-business-timezone.md`. El commit cita `dashboard-019`. Los commits los hace el equipo con el comando acordado. Estado de la spec: «En progreso» al iniciar; «Implementada» solo con enlace a PR y resultados de CA-01 a CA-08. D-03 queda registrada como divergencia aceptada.

## Trazabilidad CA → tarea

| CA | Tareas | Estado de cobertura en tareas |
|---|---|---|
| CA-01 | T-07, T-08 (T-09 desbloqueada por D-02 para recibo y precios) | Cubierto para historial; recibo y precios según D-02 |
| CA-02 | T-07 | Cubierto |
| CA-03 | T-11 | Cubierto |
| CA-04 | T-02, T-03, T-04, T-05 | Cubierto |
| CA-05 | T-06 | Cubierto |
| CA-06 | T-12 (y T-10 con D-01) | Cubierto; D-01 resuelta |
| CA-07 | T-03 | Cubierto |
| CA-08 | T-03 | Cubierto |
| CA-09 | T-13 | Verificación de cobertura |

## Divergencias registradas (no corregidas en este cambio)

- **D-01:** `ticket-prices.ts` (`localDateTimeToIso`) usa el desfase del navegador y viola CA-06. Resuelta (propuesta A: la API interpreta `effective_at` en `arca.timezone`); T-10 desbloqueada.
- **D-02:** recibo de venta y precios sin zona de la API. Resuelta (`timezone` en recibo y precios, `api-025` P-04); T-09 desbloqueada.
- **D-03:** `formatDateTime` (`formatters.ts`) fija `America/Mexico_City` para momentos, especies y publicaciones. Coincide con el valor por defecto de la API, pero no sigue `ARCA_TIMEZONE`. Aceptada como respaldo fijo; divergencia registrada.
