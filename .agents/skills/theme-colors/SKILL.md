---
name: theme-colors
description: Trabajar con settings_colores, tokens de marca y GET /api/theme con fuente externa de solo lectura
argument-hint: "<app|packages> <NNN-slug>"
allowed-tools:
  - read
  - edit
  - grep
  - glob
  - exec
---

Actualiza el tema solo mediante feature SDD aprobada. Nunca escribas en la tabla externa.

1. Lee `docs/04-sistema-de-diseno.md`, `packages/tokens/README.md`, Constitution, AGENTS de apps afectadas y artefactos SDD.
2. Conserva literalmente las keys externas: `color-base`, `color-primario`, `color-secundario`, `color-complemento`, `colorFuenteB`, `colorFuenteN`, `tamanio-texto`, `fuente`, `anio`, `extra`.
3. `settings_colores` se consulta por `mysql2` únicamente en lectura; no crearle migraciones ni escrituras. La API valida valores y los ofrece por `GET /api/theme`.
4. Mantén mapeos de tokens centralizados: `--sidebar`, `--primary`, `--sidebar-primary`, `--footer-*`, `--secondary`, `--footer`, `--accent`, foregrounds, tamaño y tipografía.
5. Usa defaults documentados (#661a2f, #87293a, #b79159, #DEC9A3, blanco/negro, 16px y Lato 400) como fallback; no los fijes dentro de componentes.
6. Maneja valores ausentes/malformados sin inyectar CSS arbitrario; conserva contraste, modo claro y adaptación de tokens en web/mobile.
7. Actualiza tests para validación/fallback y CA-xx, además de docs cuando cambie el contrato.
8. Verifica las apps/paquetes tocados y reporta el origen y resultado de cada valor sin revelar credenciales.
