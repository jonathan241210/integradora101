---
name: sdd-plan
description: Preparar un plan técnico trazable desde una spec ARCA-NB aprobada
argument-hint: "<app> <NNN-slug>"
allowed-tools:
  - read
  - edit
  - grep
  - glob
  - exec
---

Prepara el diseño técnico; no implementes código.

1. Lee `CONSTITUTION.md`, las reglas de `apps/<app>/AGENTS.md`, `docs/05-flujo-sdd.md` y la spec `apps/<app>/specs/NNN-slug.md`.
2. Verifica que la spec indique exactamente `Estado: Aprobada`. Si no, detente y solicita aprobación; no continúes con plan.
3. Lee `docs/templates/plan.md`. Conserva el mismo NNN-slug para `apps/<app>/plan/NNN-slug.md`.
4. Diseña cambios por área; describe rutas Laravel nombradas, API contract, Actions, Requests, Resources, autorización, datos/migraciones, auditoría, UI, offline y errores según aplique.
5. Incluye seguridad, portabilidad MySQL 8/GCP/local, dependencias/ADR y riesgos. No des por aprobadas tecnologías propuestas.
6. Mapea cada CA-xx a test automatizado, app y ubicación esperada. Completa la tabla Constitution Check I–VI con evidencia; marca y resuelve toda brecha antes de implementar.
7. Registra secuencia, dependencias y quién debe aprobar según acuerdo del equipo. Presenta el plan para aprobación técnica y detente antes de programar.
