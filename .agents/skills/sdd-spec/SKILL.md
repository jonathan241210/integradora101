---
name: sdd-spec
description: Redactar una especificación de feature ARCA-NB con criterios verificables y aprobación explícita
argument-hint: "<app> <necesidad>"
allowed-tools:
  - read
  - edit
  - grep
  - glob
  - exec
---

Redacta una spec, no código.

1. Confirma `<app>` en `api`, `dashboard`, `pwa`, `web` o `mobile`; identifica apps afectadas y lee sus `AGENTS.md`, `CONSTITUTION.md` y `docs/05-flujo-sdd.md`.
2. Inspecciona `apps/<app>/specs/` para elegir el siguiente NNN libre. No leas ni explores `PLANTILLA_V4_Con colores/`.
3. Confirma si una spec existente ya cubre la necesidad. Si sí, propón actualizarla en vez de duplicar.
4. Lee `docs/templates/spec.md` y redacta `apps/<app>/specs/NNN-slug.md` con estado `Borrador`, problema, objetivos, exclusiones, actores, permisos, CA-xx observables, RN-xx, datos, privacidad, flujos, riesgos y preguntas.
5. Identifica al responsable funcional que debe validar reglas y alcance; no inventes aprobadores ni roles del equipo.
6. Haz preguntas concretas cuando falten decisiones que cambien alcance, privacidad, permisos o aceptación. Deja los vacíos explícitos.
7. Detente en Borrador y solicita aprobación funcional. No redactes plan ni tasks ni implementes hasta que la spec esté aprobada.
