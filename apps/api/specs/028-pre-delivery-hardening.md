# 028 · pre-delivery-hardening (endurecimiento de seguridad antes de la entrega)

- App dueña: `api`
- Apps/paquetes afectados: `api`; `docs/database/backups/` (scripts de mantenimiento); `infra/README.md` (checklist de despliegue). Sin cambios en los clientes: el contrato público conserva sus campos visibles.
- Estado: Aprobada
- Solicitada: 2026-11-23
- Aprobada: 2026-11-23
- Aprobación funcional: Aprobada (spec, plan y tasks aprobados por el equipo)

## Problema y contexto

La revisión final previa a las pruebas reales encontró fallas de seguridad en la API y en los scripts de mantenimiento de la base:

1. El catálogo público (`GET /api/v1/species`, `/species/{id}`, `/enclosures`, `/enclosures/{id}`) expone datos internos: las observaciones que escribe el personal al registrar un ejemplar (`characteristics`), la fecha de nacimiento exacta y los ejemplares en cuarentena de ingreso.
2. El grupo `/api/v1/staff/*` (ejemplares, evaluaciones clínicas, sincronización) solo exige sesión de personal; no exige permiso de expediente médico ni límite de peticiones.
3. `POST /api/v1/staff/sync/operations` no limita el tamaño del lote y guarda como rechazo definitivo cualquier error, incluso uno transitorio de la base; el reintento idempotente devuelve ese rechazo y la evaluación se pierde.
4. Algunas rutas de visitante no tienen límite de peticiones (`auth/email/verify`, `auth/refresh`, `auth/password/reset`) y «olvidé mi contraseña» limita solo por correo.
5. Modelos clínicos con `$guarded = []`.
6. Sin proxies de confianza: detrás de un balanceador, los límites por IP se vuelven globales.
7. `docs/database/backups/reset-and-init.php` borra todas las tablas de la base de `DB_DATABASE` sin confirmación ni bloqueo de producción; los seeders `Dbr019MapCoordinatesSeeder` y `Dbr019InsertEnclosuresAndTestAnimalsSeeder` pueden ejecutarse en producción.
8. `.env.example` trae `APP_DEBUG=true`, `LOG_LEVEL=debug` y el host real del proveedor de base de datos.

## Objetivos

- Que ningún dato interno o clínico salga por endpoints públicos.
- Que las rutas de personal exijan permiso explícito y tengan límite de peticiones.
- Que la sincronización offline no pierda evaluaciones por errores transitorios ni acepte lotes ilimitados.
- Que ningún script ni seeder destructivo o de datos de prueba pueda correr contra producción por accidente.

## Fuera de alcance

- Filtrar `/species` a solo especies publicadas: se conserva el catálogo completo (decisión del equipo) y `/published-species` sigue siendo el catálogo curado.
- Paginación, caché y colas (informe `docs/auditoria-final-entrega.md`).
- Cabeceras CSP/HSTS en código: se configuran en el proxy y se documentan en `infra/README.md`.

## Actores y permisos

| Actor/rol | Necesidad | Permisos requeridos |
|---|---|---|
| Visitante / público | Consultar catálogo | Ninguno |
| Veterinario | Registrar ejemplares, evaluaciones y sincronizar | `medical-records.view` (lectura), `medical-records.create` (escritura) |
| Responsable de BD | Ejecutar respaldos y reinicios | Acceso local; confirmación explícita |

## Criterios de aceptación

- **CA-01:** Dado un ejemplar con observaciones, cuando se consulta `GET /species`, `/species/{id}`, `/enclosures` o `/enclosures/{id}`, entonces la respuesta no incluye `characteristics` ni `birth_date`; sí incluye `age` (etiqueta) y `origin`.
- **CA-02:** Dado un ejemplar con `stay_status = Cuarentena_Ingreso`, cuando se consulta el catálogo público, entonces ese ejemplar no aparece ni cuenta en `animals_count`, y no se usa como ejemplar representativo de su especie.
- **CA-03:** Dado un usuario de personal sin `medical-records.view`, cuando llama `GET /staff/animals`, `/staff/animals/{id}`, `/staff/sync/bootstrap` o `/staff/sync/changes`, entonces recibe 403.
- **CA-04:** Dado un usuario de personal sin `medical-records.create`, cuando llama `POST /staff/animals`, `/staff/animals/{id}/photo`, `/staff/clinical-evaluations` o `/staff/sync/operations`, entonces recibe 403.
- **CA-05:** Dado un veterinario con los permisos, cuando usa las rutas de `/staff/*`, entonces funcionan igual que antes.
- **CA-06:** Dado un usuario que excede el límite configurado en `/staff/*`, cuando hace otra petición, entonces recibe 429.
- **CA-07:** Dado un lote con más de 100 operaciones, cuando se envía a `sync/operations`, entonces recibe 422 sin procesar ninguna.
- **CA-08:** Dado un error transitorio de base de datos al aplicar una operación, cuando se responde, entonces la operación queda con estado `retry` y no se guarda como `rejected`; al reintentarla con el mismo identificador se procesa de nuevo.
- **CA-09:** Dado que se superan los límites, cuando se llama `auth/email/verify`, `auth/refresh` o `auth/password/reset`, entonces se recibe 429; y `auth/password/forgot` también limita por IP.
- **CA-10:** Dado cualquier modelo clínico (`Animal`, `Species`, `ClinicalEvaluation`, `ClinicalEvaluationFinding`, `LabSample`, `AnimalRestraint`, `Department`), cuando se revisa, entonces declara `$fillable` explícito y no usa `$guarded = []`.
- **CA-11:** Dado `TRUSTED_PROXIES` en `.env`, cuando la petición llega por ese proxy, entonces `$request->ip()` es la IP del cliente.
- **CA-12:** Dado `APP_ENV=production` o `DB_DATABASE=arca_zoo`, cuando se ejecuta `Dbr019MapCoordinatesSeeder` o `Dbr019InsertEnclosuresAndTestAnimalsSeeder`, entonces se detiene sin escribir.
- **CA-13:** Dado `DB_DATABASE=arca_zoo` o `APP_ENV=production`, cuando se ejecuta `reset-and-init.php` (o `restore.php`), entonces termina sin tocar la base; en otra base, exige escribir el nombre de la base para confirmar.
- **CA-14:** Dado `.env.example`, cuando se revisa, entonces trae `APP_DEBUG=false`, `LOG_LEVEL=warning` y un host de ejemplo, no el real.

- **CA-15:** Dado un `operation_uuid` que ya usó otro usuario, cuando se envía en `sync/operations`, entonces la respuesta es `rejected` con `operation_conflict`, sin revelar `server_id` ni el resultado ajeno, y no se reprocesa.
- **CA-16:** Dados más de 20 intentos fallidos de inicio de sesión (personal o visitante) desde una misma IP con correos distintos, cuando se intenta de nuevo, entonces se recibe 429.
- **CA-17:** Dado un `cursor` que no es una fecha, cuando se llama `GET /staff/sync/changes`, entonces se recibe 422 en lugar de un error 500.

## Reglas de negocio

- **RN-01:** El catálogo público solo muestra ejemplares que no estén en cuarentena de ingreso.
- **RN-02:** Las observaciones del ejemplar son internas del personal.
- **RN-03:** El límite de `sync/operations` es 100 operaciones por lote.
- **RN-04:** Los errores de base de datos o de conexión permiten reintento (`retry`). Cualquier otro error es un rechazo definitivo (`rejected`), que el cliente muestra y no reintenta en bucle.

## Datos, privacidad y auditoría

No crea ni modifica esquema: `species.is_published` y `animals.stay_status` ya existen en `arca_pruebas` (consulta en solo lectura). No requiere DBR. Reduce la exposición de datos clínicos.

## Flujos y errores

- La PWA ya reintenta operaciones no confirmadas; el estado `retry` se trata como pendiente.
- 403 y 429 usan los mensajes en español existentes.

## Dependencias, riesgos y decisiones

- Dependencias: `api-006`, `api-019-offline-sync`, `api-004`, `pwa-009`.
- Riesgos: si algún usuario de personal distinto del veterinario usaba la PWA, pierde acceso; se mitiga porque solo `veterinarian` tiene `medical-records.*` y es el único rol que entra a la PWA.
- Decisiones:
  - Se conserva el catálogo completo de especies porque el móvil lo usa como guía del zoológico, y solo se ocultan datos internos.
  - `age` y `origin` siguen públicos porque el móvil los muestra en la ficha del recinto y no son datos clínicos.

## Revisión

- Evidencia/enlaces: `docs/auditoria-final-entrega.md` (se crea en esta misma revisión).
