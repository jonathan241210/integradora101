# 019 · single-business-timezone

- App dueña: `dashboard` (presentación); la lógica de zona es de `api` (`api-025`, dueña).
- Apps/paquetes afectados: `dashboard` (`src/viewmodels/formatters.ts`, `src/viewmodels/ticket-history.ts`, `src/viewmodels/ticket-report.ts` y las pantallas de panel, reporte e historial); `packages/api-client` (`admin.ts`, `ticket-sales.ts` y sus tipos; `README.md`); `api` (fuente de la zona, `api-025`, sin cambios en esta spec).
- Estado: Aprobada
- Solicitante / responsable funcional: Jonathan
- Responsable de BD: no aplica. Sin DBR (solo presentación y cliente HTTP).
- Aprobación funcional: Jonathan, 2026-11-20 (decisión 5 de `api-025`; la sesión principal aporta la evidencia)
- Dependencias de orden: después de `api-025`. La API ya debe informar `timezone` y `period.timezone` con la zona de negocio.
- Sustituye, cuando se implemente: `dashboard-005` CA-13 y RN-13 (presentación en la zona del dispositivo); la aclaración de `dashboard-005` sobre el `timezone` del historial para filtros; `dashboard-003` RN-11 y CA-19 en lo que se refiere a la zona del dispositivo.

## Problema y contexto

El dashboard formatea fechas y horas con `Intl` sin zona explícita, es decir, con la zona del navegador. Además envía `timezone` del dispositivo en panel, reporte, exportación e historial. Con `api-025`, la API decide el día con una sola zona de negocio. Si el dashboard sigue presentando en la zona del navegador, una venta de las 23:30 puede aparecer como «07/11» en un equipo y como «06/11» en otro, aunque la API la cuente en el mismo día.

Afectados: personal de taquilla (historial), directivos y `executive` (panel y reporte), y equipo que mantiene el dashboard y su cliente HTTP.

## Objetivos

- Presentar fechas y horas en la zona que devuelve la API, no en la del navegador.
- Dejar de enviar `timezone` desde el dashboard y desde `@arca/api-client`.
- Eliminar la lectura de la zona del dispositivo en la interfaz y en el cliente.
- Cubrir cada CA-xx con un test Vitest que lo nombre.

## Fuera de alcance

- Cálculo de periodos, días, totales, cancelación o vigencia en el dashboard (siguen en la API, `api-025`).
- Selector de zona en la interfaz o texto que muestre la zona usada (`dashboard-003` pregunta 4: la interfaz no la muestra).
- Cambios de contrato de la API (`api-025` decide).
- Formato de fecha nuevo: se mantiene `dd/mm/aaaa HH:mm` (`dashboard-005` CA-13).
- Cambios en `apps/web`, `apps/mobile` y `apps/pwa`.

## Actores y permisos

| Actor/rol | Necesidad | Permisos requeridos |
|---|---|---|
| `admin`, `zoo-admin`, `executive` | Ver panel y reporte con fechas del zoológico | `dashboard.view`, `reports.view` (sin cambio) |
| `cashier` | Ver historial con fechas del zoológico | Sin cambio (`api-009`) |
| Equipo del dashboard | Mantener el cliente sin lógica de zona | Ninguno |

La interfaz no añade permisos. La autorización sigue en la API.

## Historias de usuario

- Como personal de taquilla, quiero ver la fecha y hora de cada compra en el horario de Tulancingo, aunque mi equipo esté configurado en otra zona, para que coincidan con el corte del día.
- Como directivo, quiero que las fechas del panel y del reporte coincidan con las cifras que muestra la API, para no tener que corregirlas a mano.

## Criterios de aceptación

- **CA-01 (fecha de compra en la zona de la API):** Dado un historial cuya respuesta trae `timezone: "America/Mexico_City"` y una compra con `purchased_at` `2026-11-07T05:30:00Z`, cuando se presenta con el navegador configurado en `America/Tijuana`, entonces la fecha y hora se muestran como `06/11/2026 23:30`. Test Vitest con la zona del navegador inyectada.
- **CA-02 (el navegador no cambia la presentación):** Dado el mismo historial, cuando se presenta con el navegador configurado en `Europe/Madrid` y luego en `America/Mexico_City`, entonces el texto mostrado es idéntico en ambos casos (`06/11/2026 23:30`).
- **CA-03 (panel y reporte):** Dada una respuesta de panel con `timezone` y una de reporte con `period.timezone` `America/Mexico_City`, cuando se presentan fechas y horas (fecha de compra, periodo e intervalos de días), entonces usan esa zona y el dashboard no recalcula días ni totales. Test Vitest con respuesta fija. *Enmienda técnica 2026-11-20 (D-02): lo mismo para el recibo de venta y los precios vigentes, que informan `timezone` (`api-025` P-04, RN-13).*
- **CA-04 (sin `timezone` en las peticiones):** Dado un `@arca/api-client` con la sesión activa, cuando el dashboard llama panel, reporte, exportación de reporte, historial (listado) y cancelación de boleto, entonces ninguna URL ni cuerpo contiene `timezone`. Test Vitest en `packages/api-client` o en `apps/dashboard/src/tests`.
- **CA-05 (exportación sin zona del cliente):** Dada la exportación de reporte (CSV, XLSX o PDF) desde la pantalla, cuando se inicia la descarga, entonces la petición usa solo el periodo y el formato, sin `timezone`; el nombre y el contenido del archivo los decide la API (`api-025` CA-05). Test Vitest de `ticket-report.ts`.
- **CA-06 (sin lectura de la zona del dispositivo):** Dado el código de `apps/dashboard/src` y `packages/api-client`, cuando se revisa, entonces no hay lectura de `Intl.DateTimeFormat().resolvedOptions().timeZone` ni llamada equivalente para decidir fechas o parámetros. Verificable por revisión de PR y por un test Vitest que comprueba que el cliente no envía zona aunque el entorno la informe.
- **CA-07 (historial con filtros del zoológico):** Dado el historial con filtros `from` y `to` en una fecha, cuando se envían al API, entonces se envían como fechas `Y-m-d` sin `timezone`; la interpretación del día la hace la API (`api-025` CA-06). Test Vitest.
- **CA-08 (cancelación sin zona):** Dada la acción de cancelar un boleto con motivo, cuando se envía, entonces el cuerpo contiene solo `reason` (`dashboard-005` RN-13; `api-009` CA-31). Test Vitest.
- **CA-09 (cobertura de pruebas):** Dada la suite Vitest del dashboard y del api-client, cuando se ejecuta, entonces existe al menos un test que nombra cada CA-01 a CA-08. Los tests que hoy esperan `timezone` del dispositivo se actualizan.

## Reglas de negocio

- **RN-01 (zona de la API):** La zona de presentación es la que devuelve la API en la respuesta (`timezone` o `period.timezone`). El dashboard no tiene zona propia.
- **RN-02 (solo presentación):** Convertir un instante UTC a texto en la zona de la API es presentación. No calcula periodos, días, totales, cancelación ni vigencia (`dashboard-005` CA-13; `api-025` RN-02).
- **RN-03 (sin `timezone` en el cliente):** `@arca/api-client` deja de enviar `timezone` en panel, reporte, exportación, historial y cancelación. Si un llamador pasa `timezone`, el cliente no lo reenvía (la API lo ignora de todos modos, `api-025` RN-04).
- **RN-04 (formato):** Se mantiene `dd/mm/aaaa HH:mm` para fecha y hora de presentación.
- **RN-05 (sin configuración de usuario):** La zona no es preferencia del usuario ni se muestra en la interfaz (`dashboard-003` pregunta 4).
- **RN-06 (precios programados; enmienda técnica 2026-11-20, decisión D-01):** la fecha de «entrada en vigor» se envía a la API sin desfase del navegador; la API la interpreta en `arca.timezone` (`api-025` RN-12, CA-16). `ticket-prices.ts` deja de usar `getTimezoneOffset`. Cierra la brecha de CA-06 para precios.
- **RN-07 (respaldo en momentos, especies y publicaciones; enmienda técnica 2026-11-20, decisión D-03):** `formatDateTime` mantiene `America/Mexico_City` como zona fija para momentos, especies y publicaciones, porque esas respuestas no informan `timezone`. Divergencia aceptada: si `ARCA_TIMEZONE` cambia, esas vistas no la siguen hasta que informen su zona.

## Datos, privacidad y auditoría

- No se crean datos. Se presentan fechas de boletos (dato financiero de solo lectura) con la misma información que hoy.
- No se guarda la zona del dispositivo en ningún almacenamiento del navegador por esta feature.
- Requiere DBR: no.
- Auditoría: sin cambios.

## Flujos y errores

**Flujo principal:**

1. El usuario abre panel, reporte o historial.
2. El cliente llama la API sin `timezone` (CA-04).
3. La API responde con su zona (`timezone` o `period.timezone`).
4. La vista da formato a cada fecha y hora con esa zona (CA-01 a CA-03).

**Errores y casos alternos:**

- Si la respuesta no trae zona, ver pregunta 1.
- Un error `403 two_factor_setup_required` o de permiso sigue el flujo actual de `dashboard-004` y `dashboard-002`; no cambia.
- Cargas y errores de red: sin cambio.

## Dependencias, riesgos y preguntas

- **Dependencias/ADR:** `api-025` (fuente de la zona; debe estar implementada antes). `dashboard-005` (historial, cancelación y reporte; CA-13 y RN-13 se sustituyen). `dashboard-003` (panel y reporte; RN-11 y CA-19 se sustituyen). `api-009` (historial y cancelación), `api-007` (panel y reporte). ADR 0002 no aplica. Sin dependencias nuevas.
- **Riesgos:**
  - **Pruebas actuales que esperan zona del dispositivo:** `apps/dashboard/src/tests/api-client-admin.test.tsx` (CA-04 y bloque de `timezone` por defecto con `Intl`), `apps/dashboard/src/tests/ticket-report.test.tsx` (exportación con zona del reporte y `timezone` explícito) y `apps/dashboard/src/tests/ticket-sales-api-client.test.tsx` (historial con `timezone` del dispositivo y cancelación). Deben cambiar para CA-04, CA-05 y CA-06.
  - **Compatibilidad del api-client:** `packages/api-client/admin.ts` (`reportParams`, `zone()` en el panel) y `packages/api-client/ticket-sales.ts` (`zone()` en el historial) leen `Intl` hoy. La API ya ignora el parámetro, así que una versión antigua del cliente no rompe nada, pero el cambio debe hacerse en el mismo PR que la spec de `api-025` o después.
  - **Otras lecturas de fecha en el dashboard:** `apps/dashboard/src/viewmodels/ticket-prices.ts` usa `getTimezoneOffset()` para la fecha efectiva de precios. Debe revisarse en el plan: si presenta un instante de boletos o precios, entra en esta spec.
  - **Formateadores sin zona:** `formatters.ts` (`shortDate`, `zonedDateTime`, `weekday`) y `ticket-history.ts` no fijan `timeZone`; cualquier vista nueva debe pasar la zona de la API.
  - **Cambio visible:** un usuario en otra zona verá horas distintas a las que ve hoy; es el efecto esperado.
- **Preguntas pendientes:**
  1. Si una respuesta no trae `timezone` (por ejemplo, si `api-025` pregunta 1 se resuelve en «no»), ¿el dashboard muestra la fecha sin conversión, usa `America/Mexico_City` como respaldo fijo o muestra un error? Esta decisión no está cubierta por las decisiones cerradas.

## Decisiones finales 2026-11-20 (Jonathan)
1. Si una respuesta no trae `timezone`, el dashboard presenta las fechas en `America/Mexico_City` como respaldo fijo (nunca la zona del navegador).

## Enmienda técnica 2026-11-20

- Decisiones de la aprobación técnica de `apps/dashboard/plan/019-single-business-timezone.md`: D-01 (propuesta A: la API interpreta la hora de precios en `arca.timezone`; RN-06), D-02 (recibo y precios con `timezone` de la API; CA-03 enmendado) y D-03 (respaldo fijo en momentos, especies y publicaciones; RN-07).
- Ningún CA cambia de número. Los CA de la spec de `api-025` que sirven de base son CA-12, CA-16 y RN-13.
