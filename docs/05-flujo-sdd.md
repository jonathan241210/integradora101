# Flujo de Spec-Driven Development

Esta guía es obligatoria para cada cambio funcional o técnico que afecte aplicaciones. Los documentos registran decisiones verificables y son la fuente del alcance de implementación.

## Carpetas y responsabilidad

Cada app (`api`, `dashboard`, `pwa`, `web`, `mobile`) tiene esta estructura. `src/` es el único lugar para código de la aplicación; las demás carpetas contienen documentos o archivos de estructura.

| Ruta | Propósito | Contenido |
|---|---|---|
| `apps/<app>/specs/` | **Qué y por qué** | necesidad, actores, alcance, historias, CA-xx, RN-xx y estado |
| `apps/<app>/plan/` | **Cómo** | arquitectura afectada, contrato, datos, seguridad, pruebas, mapeo CA→test y Constitution Check |
| `apps/<app>/tasks/` | **Pasos** | checklist implementable con T-xx y relación a CA-xx |
| `apps/<app>/docs/` | **Referencia local** | decisiones locales, manuales, endpoints o pantallas ya vigentes |
| `apps/<app>/src/` | **Código** | fuentes de esa aplicación; no poner código en otra carpeta |
| `apps/<app>/AGENTS.md` | **Reglas locales** | restricciones técnicas que complementan la raíz |

## Identificadores y numeración

- Los tres artefactos comparten nombre: `NNN-slug.md`; por ejemplo `specs/003-ticket-sale.md`, `plan/003-ticket-sale.md` y `tasks/003-ticket-sale.md`.
- NNN es un entero secuencial de tres dígitos asignado independientemente en cada app. Para una spec nueva, inspecciona únicamente los nombres existentes en `apps/<app>/specs/` y elige el siguiente número libre. No reutilices ni renumeres identificadores publicados.
- El slug es breve, descriptivo y en inglés, kebab-case. Una feature transversal se documenta en la app dueña de su lógica (normalmente `api`) y la spec enumera todas las apps afectadas.
- `CA-xx` identifica un criterio de aceptación, `RN-xx` una regla de negocio y `T-xx` una tarea. Los números se rellenan con dos dígitos dentro de cada feature (`CA-01`, `RN-01`, `T-01`). Cada CA debe relacionarse con una o más tareas y al menos un test automatizado.

## Estados

Las specs transitan por **Borrador → Aprobada → En progreso → Implementada**. No se empieza a programar mientras esté en Borrador. Aprobada significa que alcance, CA, RN y exclusiones fueron validados; En progreso indica trabajo iniciado; Implementada requiere criterios verificados y enlaces a PR/tests. Si se bloquea o cambia el alcance, registra la razón y solicita actualizar la spec antes de continuar; no inventes estados alternos sin acuerdo.

## Procedimiento obligatorio en cada cambio

1. **Clasificar:** identifica la app dueña de la lógica y las demás apps/paquetes afectados. Lee `CONSTITUTION.md`, el `AGENTS.md` raíz y el `apps/<app>/AGENTS.md`.
2. **Localizar:** busca una spec existente. Confirma que cubre el cambio y que está Aprobada o En progreso. No dupliques una feature con otra spec.
3. **Especificar:** si no existe una spec aprobada, elabora un borrador con `/sdd-spec`, el siguiente NNN, actores, problema, alcance/no alcance, preguntas, CA verificables y RN. Pregunta lo que falte y detente para aprobación. No avances al plan antes de aprobarse.
4. **Planificar:** usa `/sdd-plan` para definir solución, rutas/endpoints, autorización, persistencia, UI, offline, compatibilidad, riesgos, pruebas y mapeo de cada CA a test(s). Completa Constitution Check I–VI. Obtén aprobación del plan antes de ejecutar tareas.
5. **Desglosar:** usa `/sdd-tasks` para escribir T-xx atómicas, ordenadas y relacionadas con CA-xx, incluyendo pruebas, documentación y verificación.
6. **Implementar:** `/sdd-implement` solo acepta spec aprobada. Realiza las tareas en orden; el código vive en `src/`; cada CA tiene al menos un test que lo nombra. No añadas alcance no aprobado.
7. **Mantener la fuente de verdad:** al descubrir una divergencia, actualiza spec, plan y tasks en el mismo cambio y registra la decisión; actualiza `docs/` de la app si cambia una referencia duradera.
8. **Verificar y entregar:** corre `/verify` para las apps tocadas, revisa seguridad, permisos y migraciones, enlaza los tres artefactos en PR y actualiza el estado a Implementada al cumplir la definición de terminado.

## Aprobaciones

La persona solicitante o responsable funcional valida el problema, alcance, CA y RN; el equipo valida la solución técnica y el Constitution Check. La persona responsable del dominio confirma reglas especializadas (por ejemplo, ingresos para caja o veterinaria para clínica). El plan no asigna funciones internas a integrantes por nombre: el aprobador concreto debe quedar identificado en el artefacto/PR según el acuerdo del equipo. La Constitución solo cambia con acuerdo del equipo y ADR.

## Definición de terminado

- Spec aprobada y estado actualizado; plan y tasks con el mismo NNN-slug.
- Todos los T-xx aplicables marcados; cada CA-xx cubierto por uno o más tests automatizados.
- Verificación de formato, lint, tipos y pruebas reportada para cada app inicializada; las apps aún no inicializadas se identifican explícitamente.
- Sin violaciones a los seis principios, permisos comprobados en servidor, datos sensibles auditados y cambios de BD en migraciones.
- Documentación local actualizada cuando corresponde; PR referencia spec, plan y tasks; no hay secretos ni artefactos generados comprometidos.
