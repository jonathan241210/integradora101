---
name: verify
description: Detectar apps modificadas y ejecutar sus verificaciones disponibles sin instalar dependencias
argument-hint: "[apps]"
allowed-tools:
  - read
  - edit
  - grep
  - glob
  - exec
---

Verifica solo apps afectadas; no instales herramientas ni generes archivos de manifiesto.

1. Detecta cambios mediante `git status --short` y `git diff --name-only` (incluye staged, unstaged y no rastreados) o usa las apps que indicó el usuario. Mapea `apps/<nombre>/` y `packages/<nombre>/`.
2. Para `apps/api`, revisa si existe `apps/api/src/composer.json`. Si existe, ejecuta desde `apps/api/src`: `composer lint` y `composer test` (o comandos exactos disponibles si los scripts difieren). Si no existe, reporta **app aún no inicializada** y no simules resultados.
3. Para cada app JS/TS afectada, si no existe `apps/<app>/src/package.json`, reporta **app aún no inicializada**. Si existe, ejecuta desde `apps/<app>/src` los scripts disponibles: `npm run format:check`, `npm run lint`, `npm run types` y `npm test`; informa cualquier script inexistente sin ocultarlo.
4. Si cambia un paquete, verifica sus scripts solo si tiene manifiesto propio/configuración válida; no expandas a apps no tocadas salvo dependencia directa necesaria.
5. Resume comandos, códigos de salida, tests omitidos y fallidos, y evidencia. No corrijas ni declares verde algo que no se ejecutó.
6. Nunca ejecutes instalaciones, migraciones destructivas ni comandos contra producción como parte de la verificación.
