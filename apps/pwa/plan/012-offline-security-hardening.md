# Plan técnico · 012 · offline-security-hardening

- Spec: `apps/pwa/specs/012-offline-security-hardening.md`
- Estado de spec: Implementada
- Solicitada: 2026-11-23
- Aprobada: 2026-11-23
- Revisión técnica: aprobada por el equipo junto con la spec.
- Responsable técnico: por identificar

## Diseño de solución

| Área | Módulos previstos | Cambio |
|---|---|---|
| Subida de fotos | `src/services/apiClient.ts` | `createAnimalWithPhoto` y `uploadAnimalPhoto` dejan de usar `fetch` directo y pasan por el cliente compartido de `@arca/api-client`, que ya envía `X-XSRF-TOKEN` y acepta `FormData`. Se conservan los mensajes en español, incluido el de 404/405 al cambiar la foto. No hace falta cambiar `packages/api-client`. |
| Viewmodel de acciones | `src/viewmodels/useAnimalActions.ts` | Hook que expone las acciones de escritura (alta, foto, evaluaciones) y reexporta los tipos usados por las vistas. |
| Vistas | `AnimalFormView`, `AnimalProfileView`, `DiagnosisIntenseView`, `DiagnosisQuickView` | Dejan de importar `@/services/apiClient` y usan `useAnimalActions`. |
| Limpieza al cerrar sesión | `src/offline/session-cleanup.ts`, `src/viewmodels/useStaffSession.ts`, `src/views/LogoutConfirmDialog.tsx`, `src/App.tsx` | `countPendingOperations` cuenta las operaciones del `userScope` no sincronizadas. `clearUserOfflineData` borra por índice `userScope` evaluaciones, ejemplares locales, operaciones, mapa de ids, catálogos y metadatos, sin tocar otros usuarios. El cierre de sesión consulta los pendientes: si hay, muestra el aviso con el conteo y espera confirmación; después cierra sesión en la API y borra. Si el borrado falla, la sesión se cierra igual y se muestra un aviso. Si la API no confirma el cierre no se borra nada. |
| Estado `retry` | `src/offline/sync-manager.ts`, `src/services/apiClient.ts` | El resultado `retry` de `POST /api/v1/staff/sync/operations` (api-028) se trata como pendiente con reintento, no como rechazo. |
| Service worker | `public/sw.js` | Funciones puras `isCacheablePath`, `isCacheableResponse` y `staleCacheKeys`. No se cachea `/storage`, `/api` ni `/sanctum`; solo se guardan respuestas `ok`. El nombre de caché se deriva de `CACHE_VERSION`, que se sube en cada release, y `activate` borra las cachés anteriores del prefijo. |

## Contrato, datos y operación

Sin cambios de contrato, esquema ni permisos; no requiere consulta previa del esquema ni DBR. IndexedDB (`arca-pwa-offline`) conserva su versión y estructura. Expiración de sesión sin cierre no borra datos (fuera de alcance). `dexie` figura en `package.json` pero no se usa; se informa sin quitarlo. Operación: subir `CACHE_VERSION` en `public/sw.js` en cada release.

## Mapeo de criterios a pruebas

| Criterio | Prueba automatizada en `apps/pwa/src/tests/offline-security-hardening.test.tsx` |
|---|---|
| CA-01 | Alta con foto y cambio de foto con `fetch` simulado: método POST, cookies, `X-XSRF-TOKEN` y cuerpo `FormData`. |
| CA-02 | Mensajes de error de la API, genérico y de 404 al cambiar foto. |
| CA-03 | Borrado por usuario con IndexedDB simulada; otros usuarios intactos; fallo de borrado y fallo de cierre. |
| CA-04 | Conteo de pendientes, aviso con el número y acción de confirmar; sin borrado antes de confirmar. |
| CA-05 | `sw.js` cargado en un contexto aislado: `/storage`, `/api` y `/sanctum` no se atienden. |
| CA-06 | Respuesta no 2xx no se guarda. |
| CA-07 | `install` abre la caché versionada y `activate` borra las anteriores. |
| CA-08 | Revisión del código de las tres vistas: sin import directo del servicio y con el hook. |
| Estado `retry` | Revisión del tratamiento de `retry` como pendiente en el gestor de sincronización. |

## Constitution Check

| Principio | Cumple en el diseño | Evidencia prevista |
|---|---|---|
| I. Stack mínimo y portable | Sí | Sin dependencias nuevas. |
| II. La spec manda | Sí | Spec `pwa-012` aprobada con este plan y sus tasks. |
| III. Lógica separada de la interfaz | Sí | Las vistas usan hooks; las peticiones pasan por `@arca/api-client`. |
| IV. Un test por criterio | Sí | La tabla asigna prueba a los ocho CA. |
| V. Una sola fuente de verdad para los datos | Sí | Se borran los borradores locales; la API conserva la autoridad. |
| VI. Código en inglés, personas en español | Sí | Identificadores en inglés y textos visibles en español. |

## Riesgos y secuencia

1. Migrar las subidas de foto al cliente compartido y crear el hook de acciones.
2. Implementar la limpieza y la confirmación al cerrar sesión.
3. Endurecer el service worker y tratar `retry`.
4. Ejecutar pruebas y compilación con `/verify`. Riesgo: olvidar subir `CACHE_VERSION` en un release dejaría el shell anterior en caché hasta que cambie el nombre.
