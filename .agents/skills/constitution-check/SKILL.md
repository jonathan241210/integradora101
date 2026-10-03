---
name: constitution-check
description: Revisar cambios contra los seis principios de CONSTITUTION.md sin modificar archivos
argument-hint: "[<app> o diff]"
allowed-tools:
  - read
  - grep
  - glob
  - exec
permissions:
  deny:
    - edit
---

Revisión estrictamente de solo lectura: no edites archivos ni corrijas el diff.

1. Lee `CONSTITUTION.md` y la spec/plan/tasks relacionados. Inspecciona el diff solicitado; si no se indica, consulta `git diff` y estado de cambios.
2. Evalúa por separado los principios I–VI: stack y portabilidad; spec/plan/tasks aprobados; separación API/UI; un test por CA; autoridad/datos/auditoría; idioma.
3. Para cada principio reporta **Cumple**, **No cumple** o **No verificable**, con evidencia concreta (archivo/línea, CA/test, migración o contrato).
4. Busca dependencias sin ADR, reglas de negocio en clientes, falta de test por CA, escrituras no migradas, datos sensibles sin trazabilidad, literales de marca y strings de UI fuera de español.
5. No inventes evidencia. Indica preguntas o artefactos necesarios para resolver cada punto no verificable.
6. Emite una conclusión y bloqueos. No modifiques el código, documentación, spec ni tareas.
