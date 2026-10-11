# Tareas · 001 · database-change-governance

- Spec: `apps/api/specs/001-database-change-governance.md`
- Plan: `apps/api/plan/001-database-change-governance.md`
- Estado del checklist: Aprobado por Jonathan, 2026-10-09

## Preparación

- [x] **T-01** (CA-02, CA-03): crear `docs/database/README.md` con política, flujo, estados DBR y responsables.
- [x] **T-02** (CA-02, CA-03): crear `docs/database/templates/change-request.md` con todos los campos obligatorios de CA-03.
- [x] **T-03** (CA-02, CA-05, CA-06): crear `docs/database/requests/README.md` con numeración `DBR-NNN-slug.md`, estados por ambiente y reglas de archivo.

## Decisiones y reglas normativas

- [x] **T-04** (CA-01, CA-04, CA-05, CA-06): crear `docs/adr/0010-mysql-8-0-database-change-governance.md` como Aceptado y actualizar `docs/adr/README.md`.
- [x] **T-05** (CA-01, CA-04): actualizar `CONSTITUTION.md` — MySQL 8.0.x y migraciones bajo ownership de BD tras DBR.
- [x] **T-06** (CA-02, CA-04, CA-08): actualizar `AGENTS.md` raíz — DBR obligatoria, límites de agentes, conexión sin DBR pero con SDD.
- [x] **T-07** (CA-04, CA-05, CA-08, CA-09): actualizar `apps/api/AGENTS.md` — responsabilidades BD/backend, conexión, funciones/procedimientos, protección del esquema existente.

## Referencias y consistencia

- [x] **T-08** (CA-01, CA-10): actualizar `README.md` — MySQL 8.0.x, enlace a `docs/database/` y revisión mínima pendiente.
- [x] **T-09** (CA-01, CA-05, CA-10): actualizar `docs/02-arquitectura.md` — flujo de persistencia, roles BD/backend y ambientes.
- [x] **T-10** (CA-02, CA-10): actualizar `docs/05-flujo-sdd.md` — relación spec funcional ↔ DBR sin sustitución.
- [x] **T-11** (CA-01, CA-07, CA-10): actualizar `docs/06-convenciones.md` — MySQL 8.0.x, ownership de migraciones, objetos almacenados excepcionales.
- [x] **T-12** (CA-10): actualizar `docs/README.md` — índice con la sección `database/`.
- [x] **T-13** (CA-01, CA-09): actualizar `infra/README.md` — inventario inicial, rango 8.0.x, bases aisladas por ambiente.
- [x] **T-14** (CA-02, CA-05, CA-10): actualizar `docs/templates/spec.md`, `docs/templates/plan.md` y `docs/templates/tasks.md` — referencia DBR y separación de tareas BD/backend.

## Pruebas automatizadas

- [x] **T-15** (CA-01..CA-10): crear `apps/api/src/tests/database-governance.test.mjs` con un test `node:test` nombrado por cada CA-01 a CA-10.
- [x] **T-16** (CA-01..CA-10): ejecutar `node --test apps/api/src/tests/database-governance.test.mjs` hasta pasar todos los tests.

## Calidad y entrega

- [x] **T-17**: ejecutar `git diff --check`, revisar diff completo y confirmar que no se modificaron código, la spec web 003 ni archivos fuera del alcance.
- [x] **T-18**: actualizar la spec a `Implementada`, marcar tareas y registrar evidencia de verificación.

## Trazabilidad

| Criterio | Implementación | Prueba | Verificación |
|---|---|---|---|
| CA-01 | T-04, T-05, T-08, T-09, T-11, T-13 | T-15, T-16 | T-17 |
| CA-02 | T-01, T-02, T-03, T-06, T-10, T-14 | T-15, T-16 | T-17 |
| CA-03 | T-02 | T-15, T-16 | T-17 |
| CA-04 | T-04, T-05, T-06, T-07 | T-15, T-16 | T-17 |
| CA-05 | T-03, T-07, T-09, T-14 | T-15, T-16 | T-17 |
| CA-06 | T-03, T-04, T-06 | T-15, T-16 | T-17 |
| CA-07 | T-11 | T-15, T-16 | T-17 |
| CA-08 | T-06, T-07 | T-15, T-16 | T-17 |
| CA-09 | T-07, T-13 | T-15, T-16 | T-17 |
| CA-10 | T-08..T-14 | T-15, T-16 | T-17 |

## Evidencia de verificación

- Fecha: 2026-10-09
- Comando: `node --test apps/api/src/tests/database-governance.test.mjs`
- Resultado: 10 tests, 10 pass, 0 fail (CA-01 a CA-10 cubiertos).
- `git diff --check`: limpio, sin errores de espacios ni conflictos.
- Alcance confirmado: no se tocó `apps/web` ni ningún archivo fuera de los previstos en este checklist.
