# Portal público para visitantes

El portal es un sitio estático ubicado en `src/`. En la sección **Mapa del zoológico**, el plano SVG y el modelo 3D se sirven desde el propio portal. El directorio consulta los recintos activos y lugares de interés visibles en la API pública (`/api/v1/enclosures` y `/api/v1/zoo-places`). Las noticias, los eventos, TulanPedia y la galería también consumen la API.

Los mapas 2D y 3D muestran en su posición los registros públicos con coordenadas válidas. El modelo 3D se exportó de `zoo_3d(3).blend`. Los círculos indican recintos y los cuadrados, lugares de interés. Al tocar un marcador, pasar el puntero o enfocarlo con el teclado se muestra el nombre completo. Los registros sin coordenadas se pueden consultar en el directorio.

El directorio permite buscar por nombre y filtrar recintos o lugares de interés. Al elegir un resultado con ubicación, el portal muestra su marcador en el plano o centra la cámara del modelo 3D al 200 %. Tocar un marcador 3D produce el mismo acercamiento. La flecha y el rótulo con el nombre completo identifican el área seleccionada hasta elegir otra o pulsar **Restablecer**.

Los controles **−**, **+** y **Restablecer** aparecen debajo del mapa. Cada vista conserva su nivel de zoom al alternar. En el plano 2D ampliado puedes desplazarte hasta los bordes manteniendo presionado el botón izquierdo del mouse y arrastrando, o con las barras, el teclado o el tacto.

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
