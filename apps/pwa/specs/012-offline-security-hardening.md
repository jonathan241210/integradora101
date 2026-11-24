# 012 · offline-security-hardening (fotos con CSRF, limpieza offline y service worker)

- App dueña: `pwa`
- Apps/paquetes afectados: `pwa`; `packages/api-client` (método de subida multipart si hace falta, sin lógica).
- Estado: Implementada
- Solicitada: 2026-11-23
- Aprobada: 2026-11-23
- Aprobación funcional: Aprobada (spec, plan y tasks aprobados por el equipo)

## Problema y contexto

La revisión final previa a las pruebas reales encontró en la PWA veterinaria:

1. `createAnimalWithPhoto` y `uploadAnimalPhoto` (`src/services/apiClient.ts`) usan `fetch` directo sin el encabezado `X-XSRF-TOKEN` que exige Sanctum en modo sesión, y fuera de `@arca/api-client` (Constitución III).
2. Al cerrar sesión solo se limpian avisos; los borradores clínicos y catálogos en IndexedDB (`arca-pwa-offline`) quedan legibles para el siguiente usuario del equipo.
3. Con el límite de 100 operaciones por lote que agrega `api-028`, la cola completa se enviaba en una sola petición y una cola grande quedaría rechazada.
4. El service worker (`public/sw.js`) cachea cualquier archivo del mismo origen, incluidas fotos de `/storage`, guarda respuestas de error y usa un nombre de caché fijo que no cambia entre versiones.

## Objetivos

- Que la subida de fotos funcione con la protección CSRF y pase por el cliente compartido.
- Que cerrar sesión no deje datos clínicos del usuario en el equipo.
- Que el service worker solo guarde el shell de la app y respuestas correctas.

## Fuera de alcance

- Cifrar IndexedDB: se opta por borrar al cerrar sesión, porque cifrar exige gestionar llaves en el navegador sin beneficio real si la sesión está abierta.
- Borrar datos cuando la sesión expira sin cerrar sesión: se conservan para que el veterinario pueda sincronizar al volver a entrar (comportamiento offline de `pwa-009`).

## Actores y permisos

| Actor/rol | Necesidad | Permisos requeridos |
|---|---|---|
| Veterinario | Registrar ejemplares con foto y trabajar sin conexión | `medical-records.create` |

## Criterios de aceptación

- **CA-01:** Dado un veterinario con sesión, cuando registra un ejemplar con foto o cambia la foto de un ejemplar, entonces la petición se hace con `@arca/api-client` y lleva `X-XSRF-TOKEN`.
- **CA-02:** Dado un error de la API al subir la foto, cuando se responde, entonces se muestra el mismo mensaje en español que hoy.
- **CA-03:** Dado un veterinario con operaciones ya sincronizadas, cuando cierra sesión, entonces se borran sus datos de IndexedDB (evaluaciones, catálogos y operaciones) y los de otros usuarios no se tocan.
- **CA-04:** Dado un veterinario con operaciones pendientes de sincronizar, cuando pulsa cerrar sesión, entonces se le avisa cuántas hay y debe confirmar antes de borrarlas.
- **CA-05:** Dada una petición a `/storage/*`, `/api/*` o `/sanctum/*`, cuando pasa por el service worker, entonces no se guarda en caché.
- **CA-06:** Dada una respuesta con estado distinto de 2xx, cuando pasa por el service worker, entonces no se guarda en caché.
- **CA-07:** Dada una nueva versión del service worker, cuando se activa, entonces usa un nombre de caché nuevo y borra los anteriores.
- **CA-08:** Dadas las vistas `AnimalFormView`, `AnimalProfileView` y `DiagnosisIntenseView`, cuando se revisan, entonces no importan `@/services/apiClient` directamente sino un hook (viewmodel).

- **CA-09:** Dada una cola con más de 100 operaciones pendientes, cuando se sincroniza, entonces se envía en lotes de máximo 100 en orden (límite de `api-028` RN-03); si un lote falla, ese lote y los siguientes quedan pendientes con su error.

## Reglas de negocio

- **RN-01:** Los datos offline pertenecen al usuario que los creó (`userScope`) y se borran al cerrar sesión.
- **RN-02:** Nunca se borran operaciones pendientes sin confirmación explícita.

## Datos, privacidad y auditoría

Sin cambios de esquema; no requiere DBR. Reduce la exposición de datos clínicos en equipos compartidos.

## Flujos y errores

Si el borrado de IndexedDB falla, la sesión se cierra igual y se muestra un aviso para cerrar el navegador.

## Dependencias, riesgos y decisiones

- Dependencias: `pwa-009`, `pwa-004`, `pwa-010`, `api-028`.
- Decisiones:
  - Se borra en lugar de cifrar porque protege igual en el caso real (equipo compartido) y no agrega dependencias.
  - Se pide confirmación con pendientes para no perder evaluaciones clínicas.

## Revisión

- Evidencia/enlaces: `docs/auditoria-final-entrega.md` (se crea en esta misma revisión).
