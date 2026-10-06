---
name: api-endpoint
description: Diseñar e implementar un endpoint JSON Laravel de ARCA-NB conforme al SDD
argument-hint: "<app> <NNN-slug> <endpoint>"
allowed-tools:
  - read
  - edit
  - grep
  - glob
  - exec
---

Implementa endpoint solamente si `/sdd-implement` confirma spec Aprobada y tasks vigentes.

1. Lee reglas de `apps/api/AGENTS.md`, spec/plan/tasks del cambio y ADR aplicables.
2. Limita código nuevo a `apps/api/src/`. No abras ni modifiques manifiestos/dependencias sin aprobación.
3. Añade ruta JSON Laravel con nombre en inglés; documenta método, autorización, request/response y errores en el plan o docs de API si corresponde.
4. Valida con Form Request, delega toda regla/cálculo en una Action, transforma salida con API Resource y protege con Policy y permiso `<resource>.<action>`.
5. Cambios de esquema solo por migración MySQL 8 estándar. Usa `BaseModel` y columnas de auditoría cuando aplique; SoftDeletes/Activitylog para datos clínicos o financieros.
6. Mantén Sanctum para sesiones SPA/tokens mobile, configuración por `.env` y sin SDK GCP en dominio.
7. Agrega tests Feature con `RefreshDatabase`: autorización permitida/denegada, validación y al menos una prueba nombrada por cada CA-xx.
8. No usar Inertia ni Wayfinder. Ejecuta `/verify` para API y reporta evidencia, fallos y archivos tocados.
