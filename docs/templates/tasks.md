# Tareas · NNN · <slug>

- Spec: `apps/<app>/specs/NNN-<slug>.md`
- Plan: `apps/<app>/plan/NNN-<slug>.md`

## Base de datos (responsable de BD)

- [ ] **T-0N** (CA-xx): DBR aprobada, migración Laravel, pruebas en MySQL 8.0 y evidencia; estado `Lista para backend`.

## Implementación

- [ ] **T-01** (CA-01): <cambio verificable y acotado>
- [ ] **T-02** (CA-01): <test automatizado que nombra CA-01>

## Calidad y entrega

- [ ] **T-03**: ejecutar verificaciones para cada app inicializada y registrar resultados.
- [ ] **T-04**: actualizar documentación afectada y enlazar spec, plan y tasks en el PR.

Cada tarea de código debe nombrar uno o más CA-xx; todo CA-xx debe tener al menos una tarea de test. Agrega tareas para migraciones, permisos, accesibilidad, auditoría y sincronización cuando apliquen. Separa las tareas de BD (DBR, migración, pruebas, evidencia) de las de backend, que inician solo con `Lista para backend`.
