---
name: sdd-tasks
description: Desglosar plan aprobado en tareas trazables y verificables por criterio
argument-hint: "<app> <NNN-slug>"
allowed-tools:
  - read
  - edit
  - grep
  - glob
  - exec
---

Crea un checklist ejecutable; no implementes código.

1. Lee la spec y plan del mismo NNN-slug en `apps/<app>/{specs,plan}/`, además de `docs/05-flujo-sdd.md` y `docs/templates/tasks.md`.
2. Confirma que la spec esté Aprobada y que el plan tenga aprobaciones y Constitution Check resuelto. Si falta cualquiera, detente.
3. Escribe `apps/<app>/tasks/NNN-slug.md`; usa T-01, T-02… y ordena por dependencias.
4. Relaciona cada tarea de implementación con los CA-xx/RN-xx que cubre. Cada CA-xx debe tener al menos una tarea explícita de prueba automatizada que lo nombre.
5. Incluye migraciones, autorización, accesibilidad, sincronización, docs y verificaciones cuando correspondan al plan.
6. Mantén pasos pequeños con un resultado comprobable y archivos/áreas esperados; no agregues alcance nuevo.
7. Revisa trazabilidad spec → plan → tasks y presenta el checklist para aprobación antes de implementar.
