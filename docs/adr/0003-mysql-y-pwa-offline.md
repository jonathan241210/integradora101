# 0003 · MySQL y borradores offline de la PWA

- Estado: Aceptado
- Solicitada: 2026-10-03
- Aprobada: 2026-11-18
- Spec relacionada: `apps/pwa/specs/009-offline-first-sync.md` (Aprobada)
- Aprobación: Equipo ARCA-NB (aceptación para implementación de `pwa-009` según decisiones documentadas)

## Contexto

La API requiere almacenamiento relacional portable. El personal veterinario puede trabajar en campo con conectividad limitada o intermitente, pero los datos clínicos y operativos requieren validación, trazabilidad y una única fuente de verdad. La PWA (`apps/pwa`) actualmente opera en modo online para consulta y guardado; el trabajo de campo requiere capturar y consultar información sin conexión, sin pérdida de datos y con sincronización confiable cuando haya conectividad.

## Decisión propuesta

Usar **MySQL 8.0.x** como base de datos principal de Laravel y **migraciones** como única fuente de esquema (cambios solo por DBR aprobada y ejecución del responsable de BD). La PWA implementa un modo **offline-first** con las siguientes decisiones:

- **Almacenamiento local:** **IndexedDB** mediante **Dexie.js** (esquema versionado local, catálogos, borradores/pendientes, outbox, mapeo de IDs y metadatos de sync), aislado por usuario/organización.
- **Identificadores e idempotencia:** **UUID** para identificadores locales de operaciones/registros creados offline y para idempotencia de sincronización (evitar duplicados en reintentos).
- **Service Worker:** Service Worker manual para disponibilidad del **app shell/estáticos** en arranque offline y soporte del flujo offline, alineado al enfoque de ADR 0003 sin sustituir Vite PWA ni introducir `vite-plugin-pwa` sin justificación técnica adicional.
- **Sincronización (Sync Manager/outbox):** cola persistente con ejecución exclusiva (sin concurrencia), sincronización automática al **iniciar/reanudar** la app y al **recuperar conectividad**, más disparo manual; backoff exponencial **5 s, 15 s, 30 s, 1 min, 5 min y luego cada 15 min**, con reintentos sin límite fijo para fallos temporales mientras existan pendientes.
- **Bootstrap y consistencia:** **descarga completa inicial** de catálogos operativos requeridos al iniciar sesión; **sincronización incremental/delta** en reconexiones posteriores (cursor/`updated_since` con paginación), aplicando upserts y bajas expuestas por la API (`deleted_at` o tombstone equivalente) sin eliminar historial clínico.
- **Autoridad y confirmación:** la **API/MySQL es la fuente de verdad**. Los datos locales son borradores/operaciones pendientes hasta validación y confirmación individual del servidor. Errores no temporales (validación/permisos) se conservan localmente para intervención manual; no se sobrescriben automáticamente evaluaciones clínicas.
- **Dependencias y orden:** la cola soporta dependencias **padre→dependiente** (p. ej. alta de animal antes que diagnósticos asociados) con mapeo `local_id -> server_id` tras confirmación.
- **Visibilidad:** la app informa el estado de sincronización/registros pendientes mediante interfaz dentro de la PWA (y avisos según defina la spec), con prioridad operativa en Chrome/Android.

Dependencias candidatas previas (`vite-plugin-pwa`, `idb`) quedan reemplazadas por la decisión anterior para `pwa-009`, sujeta a aprobación formal de dependencias/contratos y a la spec.

## Alternativas consideradas

- **Requerir conectividad para cada captura/consulta:** descartada por impedir trabajo de campo.
- **Copia local autoritativa (cliente como fuente de verdad):** descartada por duplicar autoridad, romper validación/auditoría y dificultar resolución de conflictos.
- **`idb` + `vite-plugin-pwa` como stack principal:** evaluado inicialmente; se prefiere **Dexie.js** y Service Worker manual para el control requerido por el outbox/sync y el MVP, manteniendo alineación con el objetivo de ADR 0003.
- **Solo recarga completa en cada sync:** descartada como estrategia única por costo en reconexiones; se adopta bootstrap completo + delta incremental (con fallback/refresh cuando sea necesario).

## Consecuencias

### Positivas

- Captura y consulta resiliente en campo sin transferir autoridad del dato fuera de la API.
- Sincronización trazable e idempotente, con menor riesgo de duplicados y pérdida de información.
- Menor consumo de datos en reconexiones mediante delta incremental.

### Riesgos o costos

- Complejidad adicional (almacén local, cola, conflictos, reconexión, expiración de sesión en campo).
- Exposición de datos clínicos en dispositivos compartidos: requiere aislamiento por cuenta, retención/limpieza definida y controles de privacidad.
- Requiere contratos API y posiblemente **DBR** para delta, `deleted_at`/tombstones e idempotencia/unicidad por UUID; las migraciones las crea/aplica el responsable de BD.
- Variabilidad de comportamiento en segundo plano/SW según plataforma (prioridad Chrome/Android).

## Validación y revisión

- No implementar sincronización ni agregar dependencias sin spec aprobada, ADR/dependencias aprobadas y contratos/DBR necesarios resueltos.
- `pwa-009` define política de bootstrap, delta, reintentos/backoff, conflictos, retención, aislamiento y criterios verificables (CA con pruebas).
- Revisar y actualizar este ADR si cambian el stack offline, el protocolo de sync o las garantías de consistencia/privacidad.