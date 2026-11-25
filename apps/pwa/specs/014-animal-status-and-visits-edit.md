# 014 · Edición de estatus de estancia y permiso de visitas

- App dueña: `pwa`
- Apps/paquetes afectados: `pwa`, `api`
- Estado: Aprobada
- Solicitante / responsable funcional: Usuario solicitante (confirmación en chat)
- Aprobación funcional: Aprobada por usuario solicitante, 2026-11-24

## Problema y contexto

El alta de animales (pwa-013) ya captura `can_receive_visits` y la API asigna `stay_status = Cuarentena_Ingreso`. Después del ingreso, el personal necesita actualizar el permiso de visitas y el estatus de estancia cuando el ejemplar cambia de condición (p. ej. pasa a permanente, resguardo, traslado o liberación). Hoy no existe flujo de edición: la API solo expone alta, consulta y foto; la PWA muestra `stay_status` en el perfil sin permitir cambios.

## Objetivos

- Permitir que personal autorizado edite `can_receive_visits` y `stay_status` de un animal existente.
- Aplicar validación, permisos, auditoría y reglas de transición en la API.
- Reflejar el cambio en el perfil PWA y conservar coherencia con catálogo público y catálogo móvil de visita.

## Fuera de alcance

- Edición completa del expediente del animal (nombre, especie, recinto, fechas, etc.), salvo que se defina en otra spec.
- Guardado offline de la edición; esta acción requiere confirmación del servidor.
- Cambios de esquema BD: se reutilizan columnas existentes `animals.stay_status` y `animals.can_receive_visits` (DBR-001).
- Publicación de especies (api-014/015), que es un flujo independiente.

## Actores y permisos

| Actor/rol | Necesidad | Permisos requeridos |
|---|---|---|
| Personal veterinario/staff autorizado | Cambiar permiso de visitas y estatus de estancia de un ejemplar | Permiso Spatie `animals.update`; sesión Sanctum válida |

## Historias de usuario

Como personal autorizado, quiero editar si un animal puede recibir visitas y su estatus de estancia desde su perfil, para que la información de exhibición y estancia refleje su situación real.

## Criterios de aceptación

- **CA-01:** Dado un animal existente y un usuario con permiso, cuando abre el perfil del animal en PWA, entonces ve el `stay_status` actual y el valor actual de `can_receive_visits` con una acción clara para editar.
- **CA-02:** Dado el formulario/modal de edición, cuando el usuario cambia `can_receive_visits` a Sí o No y guarda con éxito, entonces la API persiste el valor (`0/1`), la PWA muestra confirmación y el perfil refleja el nuevo valor.
- **CA-03:** Dado el formulario/modal de edición, cuando el usuario cambia `stay_status` a un valor permitido y guarda con éxito, entonces la API persiste el valor, la PWA muestra confirmación y el perfil refleja el nuevo valor.
- **CA-04:** Dado un valor inválido, transición no permitida, falta de permiso o sesión inválida, cuando se intenta guardar, entonces la API rechaza el cambio sin modificar el animal y la PWA muestra un mensaje en español sin éxito falso.
- **CA-05:** Dado un cambio exitoso, cuando se consulta catálogo público/móvil según reglas vigentes, entonces la visibilidad del ejemplar respeta `stay_status`, `can_receive_visits`, recinto activo y publicación de especie.

## Reglas de negocio

- **RN-01:** La API es autoridad de validación, transición y persistencia. La PWA solo presenta y envía la intención.
- **RN-02:** `can_receive_visits` solo acepta `0` o `1`.
- **RN-03:** `stay_status` solo acepta valores del CHECK vigente: `Permanente`, `Cuarentena_Ingreso`, `Resguardo_Profepa`, `Liberado`, `Trasladado`.
- **RN-04:** `Trasladado`, `Liberado` y `Resguardo_Profepa` fuerzan `can_receive_visits = 0`.
- **RN-05:** Transiciones de `stay_status` controladas: `Cuarentena_Ingreso -> Permanente|Resguardo_Profepa`; `Permanente -> Resguardo_Profepa|Trasladado|Liberado`; `Resguardo_Profepa -> Permanente|Trasladado|Liberado`; `Trasladado` y `Liberado` son finales.
- **RN-06:** El cambio de `stay_status` requiere motivo obligatorio. Toda edición exitosa queda auditada (usuario, fecha, valores anteriores/nuevos y motivo cuando aplique) según el mecanismo definido por Constitución V.
- **RN-07:** Alcance inicial solo PWA (perfil del animal); la API queda preparada para consumidores futuros con el mismo contrato y permiso.

## Datos, privacidad y auditoría

- Datos: `animals.id`, `animals.stay_status`, `animals.can_receive_visits`, `updated_at`; contexto de actor autenticado; motivo del cambio de estatus.
- No son datos clínicos ni financieros, pero son datos operativos sensibles que afectan exhibición pública. Requiere auditoría de cambios.
- SoftDeletes vigente en `animals`; no borrar físicamente.
- No requiere DBR nueva para reutilizar `stay_status` y `can_receive_visits`. El motivo se persiste en `activity_log.properties.reason` mediante `LogAdminActivityAction` (auditoría existente), sin cambio de esquema. Confirmado en solo lectura en `arca_pruebas` el 2026-11-24.

## Flujos y errores

1. **Edición exitosa**: perfil carga datos → usuario abre edición → cambia valores → confirma → API valida/autoriza/persiste/audita → responde 200 → PWA actualiza perfil.
2. **Sin permiso/401/403**: mensaje en español; no cambiar UI optimistamente como éxito.
3. **Validación/422**: mostrar motivo; conservar selección para corregir.
4. **Conectividad**: sin guardado offline; si falla la red, mostrar error y permitir reintentar.
5. **Conflicto de transición**: si el negocio define transiciones no permitidas, responder 422/409 con mensaje claro.

## Dependencias, riesgos y preguntas

- Dependencias/ADR: pwa-013, pwa-004, DBR-001, reglas de catálogo público/móvil (api-028, visitor progress).
- Riesgos: cambios afectan visibilidad pública/móvil; persistencia del motivo puede requerir DBR; transiciones mal aplicadas pueden dejar datos incoherentes.
- Decisiones cerradas (2026-11-24, usuario solicitante):
  1. Permiso Spatie: `animals.update`.
  2. `Resguardo_Profepa`, `Trasladado` y `Liberado` fuerzan `can_receive_visits = 0`.
  3. `Trasladado` y `Liberado` fuerzan `can_receive_visits = 0`.
  4. Transiciones controladas según RN-05.
  5. Alcance inicial solo PWA; API preparada para futuros consumidores.
  6. Motivo obligatorio al cambiar `stay_status`.
  7. Visibilidad pública/móvil: se mantiene la regla vigente; cualquier alineación adicional se trata en spec separada si el negocio lo pide.

## Revisión

- Aprobadores y fecha: Usuario solicitante, 2026-11-24
- Evidencia/enlaces: `apps/pwa/specs/013-animal-stay-and-visits.md`, `docs/database/requests/DBR-001-english-schema-normalization.md`, `apps/api/src/app/Models/Animal.php`, `apps/api/src/app/Actions/Visitor/VisitorProgressQuery.php`
