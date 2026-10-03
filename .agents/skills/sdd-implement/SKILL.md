---
name: sdd-implement
description: Implementar tareas aprobadas de una feature ARCA-NB desde su spec, plan y checklist
argument-hint: "<app> <NNN-slug> [T-xx]"
allowed-tools:
  - read
  - edit
  - grep
  - glob
  - exec
---

Implementa solo tareas aprobadas de una feature.

1. Lee `CONSTITUTION.md`, AGENTS raíz y de la app, y los tres artefactos `apps/<app>/{specs,plan,tasks}/NNN-slug.md`.
2. **Rechaza iniciar** si la spec no contiene `Estado: Aprobada` o los artefactos no comparten el mismo NNN-slug. No asumas aprobación por tener plan/tasks.
3. Selecciona las tareas pendientes solicitadas o autorizadas. Respeta dependencias y no amplíes alcance sin actualizar/aprobar spec, plan y tasks.
4. Escribe código de la app solo bajo `apps/<app>/src/`; los clientes usan `@arca/api-client`, no implementan lógica de negocio ni hacen peticiones ad hoc.
5. Cumple seguridad, permisos en servidor, migraciones, auditoría, tokens y dependencias aprobadas. Para API sigue Actions, Form Requests, API Resources, rutas nombradas y Policies.
6. Implementa al menos un test automatizado que nombre/cubra cada CA-xx afectado; PHPUnit en API y Vitest para lógica de front.
7. Marca cada T-xx solo al terminarla. Actualiza spec/plan/tasks en el mismo cambio si hubo divergencia y documenta la decisión.
8. Ejecuta `/verify`, informa tareas realizadas, tests y pendientes. No marques Implementada hasta satisfacer la definición de terminado.
