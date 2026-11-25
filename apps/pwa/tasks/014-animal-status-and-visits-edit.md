# Tareas · 014 · Edición de estatus de estancia y permiso de visitas

- Spec: `apps/pwa/specs/014-animal-status-and-visits-edit.md`
- Plan: `apps/pwa/plan/014-animal-status-and-visits-edit.md`

> Spec aprobada. Antes de backend, resolver la persistencia del motivo obligatorio y confirmar esquema vivo en solo lectura.

## Base de datos (responsable de BD)

- [x] **T-01** (CA-02, CA-03, RN-06): Esquema vivo `arca_pruebas` verificado en solo lectura (2026-11-24): `can_receive_visits tinyint(1) default 1`, `stay_status varchar(50) NOT NULL`, CHECKs `chk_animals_can_receive_visits` y `chk_animals_stay_status` coinciden con DBR-001. Sin DBR requerida para columnas existentes.
- [x] **T-01b** (RN-06): Motivo persistido en `activity_log.properties.reason` vía `LogAdminActivityAction` (auditoría existente). Sin cambio de esquema/DBR.

## Implementación — API

- [x] **T-02** (CA-02, CA-03, CA-04, RN-06): Form Request `UpdateAnimalStatusRequest` creado con validación, mensajes ES y regla “al menos un campo”.
- [x] **T-03** (CA-02, CA-03, CA-04, CA-05, RN-04, RN-05, RN-06): Action `UpdateAnimalStatusAction` con transiciones controladas, forzado de visitas en estatus no exhibibles y auditoría con motivo.
- [x] **T-04** (CA-02, CA-03, CA-04): Ruta `PATCH /api/v1/staff/animals/{animal}` (`staff.animals.update`) y método `AnimalController@update`.
- [x] **T-05** (CA-04): Permiso Spatie `animals.update` agregado a seeder y aplicado en middleware de ruta.

## Implementación — PWA

- [x] **T-06** (CA-01): `AnimalProfileView` muestra `can_receive_visits` y acción “Editar estado y exhibición”. (Visibilidad por permiso en UI queda pendiente de afinación; API ya lo exige.)
- [x] **T-07** (CA-02, CA-03, CA-04, RN-04, RN-06): Modal de edición con selects válidos, motivo obligatorio al cambiar `stay_status`, forzado UI de visitas en estatus no exhibibles, envío a API y manejo de éxito/error sin offline.
- [x] **T-08** (CA-02, CA-03): `apiClient.updateAnimalStatus` y `useAnimalActions` actualizados.

## Pruebas automatizadas

- [ ] **T-09** (CA-01): Prueba PWA de render de estado actual y acción de edición. (Pendiente; Node/npm no disponible en este entorno para ejecutar Vitest.)
- [x] **T-10** (CA-02, RN-04): API Feature cubre actualización de `can_receive_visits` y forzado a `0` en estatus no exhibible. `AnimalStatusUpdateTest` pasó.
- [x] **T-11** (CA-03, RN-05, RN-06): API Feature cubre actualización de `stay_status`, transición controlada y motivo obligatorio. `AnimalStatusUpdateTest` pasó.
- [x] **T-12** (CA-04): API Feature cubre rechazo por transición inválida, motivo faltante y falta de permiso; sin mutación. PWA muestra errores; prueba PWA automatizada pendiente por entorno.
- [ ] **T-13** (CA-05): Prueba API de impacto en visibilidad pública/móvil según reglas vigentes. Pendiente.

## Calidad y entrega

- [ ] **T-14**: Ejecutar `/verify` para `api` y `pwa`; registrar resultados. (API: `AnimalStatusUpdateTest`, `AnimalRegistrationTest`, `StaffSyncTest` pasaron en `arca_pruebas`. PWA: no ejecutado por falta de Node/npm en PATH.)
- [ ] **T-15**: Actualizar docs afectadas y enlazar spec, plan y tasks en el PR con evidencia.
