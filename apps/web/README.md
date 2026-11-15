# Portal público para visitantes

El portal actual es un sitio estático ubicado en `src/`. Las secciones de noticias y eventos necesitan la API; el resto del portal funciona sin ella.

## Requisitos

- PHP CLI para iniciar el servidor local y atender la redirección de `index.php`.
- Node.js solo si se desea ejecutar la prueba estructural.

## Ejecutar en local

Desde la raíz del repositorio, inicia el servidor integrado de PHP:

```bash
php -S localhost:8080 -t apps/web/src apps/web/src/router.php
```

Abre [http://localhost:8080](http://localhost:8080) en el navegador. Para detener el servidor, presiona `Ctrl+C` en la terminal.

Las secciones de noticias y eventos leen la API pública (véase `docs/portal-noticias-eventos.md`). El origen exacto `http://localhost:8080` debe estar en `CORS_ALLOWED_ORIGINS` de la API; `http://127.0.0.1:8080` es otro origen y no funcionaría sin añadirlo.

El portal todavía no tiene `package.json` ni scripts de Vite; no es necesario ejecutar `npm install` ni `npm run dev`.

El router local entrega `404.html` sin redirigir cuando una ruta no existe. Puedes comprobar que conserva los estados HTTP correctos con:

```bash
curl -I http://localhost:8080/ruta-inexistente
curl -I http://localhost:8080/index.html
curl -I http://localhost:8080/noticias.html
curl -I http://localhost:8080/eventos.html
```

La primera respuesta debe ser `404 Not Found`; las tres páginas existentes deben responder `200 OK`.

## Ejecutar la prueba estructural

Desde la raíz del repositorio:

```bash
node --test apps/web/src/tests/relocation.test.mjs
node --test apps/web/src/tests/news-events.test.mjs
node --test apps/web/src/tests/not-found.test.mjs
```
