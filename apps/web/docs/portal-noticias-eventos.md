# Portal: noticias y eventos dinámicos

Referencia local de `web-009` (`specs/009-dynamic-news-events.md`). Excepción de arquitectura: `docs/adr/0024-web-static-portal-exception.md` (HTML y JavaScript estático, sin `@arca/api-client`, sin build, pruebas con `node --test`).

Cambios del 2026-11-08 (aprobados por Jonathan el 2026-11-08): la portada muestra dos eventos, y el contenido completo de cada noticia se muestra en su tarjeta sin botón.

## Qué hace

- `index.html`: `#noticias` muestra hasta tres noticias y `#eventos` hasta dos eventos de la API.
- `noticias.html`: listado paginado (10 por página, «Cargar más»); cada tarjeta muestra su contenido completo en el bloque «Contenido:», que se pide automáticamente una vez al mostrarse la tarjeta (`GET /news/{id}`). No hay botón de expandir.
- `eventos.html`: lista completa de eventos vigentes.
- Estados de carga, vacío y error en español; el error incluye «Reintentar» en las tres páginas. En el bloque de contenido, «Reintentar» vuelve a pedir solo ese detalle.
- Imágenes completas y centradas (`object-fit: contain`) dentro de una caja de proporción fija.

Archivos: `src/js/api.js` (único módulo de red), `src/js/news-events.js` (presentación), `src/news-events.css`.

## Peticiones por visita

- Portada: 1 listado de noticias (`limit=3`), 1 listado de eventos (`limit=2`) y 1 detalle por noticia mostrada (hasta 3).
- `noticias.html`: 1 listado por página (`limit=10`) y 1 detalle por tarjeta mostrada.

Los detalles no se guardan entre visitas ni se repiten en la misma página. Las peticiones de detalle de una página se lanzan todas a la vez, una por tarjeta, sin esperar a las demás (decisión de Jonathan, 2026-11-08): en `noticias.html` pueden salir hasta 10 a la vez.

## Base URL de la API

Cada página declara `<meta name="arca-api-base" content="…/api/v1">`. Las tres páginas deben tener el mismo valor (lo verifica CA-16). Si la meta está vacía o falta, se usa la ruta relativa `/api/v1`, que requiere que el servidor del portal reenvíe esa ruta a la API.

| Ambiente | Valor de la meta |
|---|---|
| Desarrollo | `http://localhost:8000/api/v1` |
| Producción | Pendiente (pregunta 2 de la spec): URL absoluta de la API o proxy `/api/v1` en el mismo origen |

Al cambiar de ambiente se edita la meta en `index.html`, `noticias.html` y `eventos.html`.

## Ejecutar en local

```bash
php -S localhost:8080 -t apps/web/src
```

Abre `http://localhost:8080`. La API debe estar en el puerto de la meta (por ejemplo `php artisan serve` en `localhost:8000`).

## Orígenes permitidos (CORS)

`CORS_ALLOWED_ORIGINS` de la API debe incluir el origen exacto del portal: en desarrollo `http://localhost:8080`. `http://127.0.0.1:8080` es otro origen. Si el origen no está permitido, el navegador bloquea la lectura y el portal muestra el estado de error. Diagnóstico: `curl -i -H "Origin: http://localhost:8080" <API>/api/v1/news?limit=3`.

## Limitaciones

- Sin JavaScript, las secciones se quedan en «Cargando…». No hay contenido de muestra de respaldo.
- El contenido no se guarda en el navegador.
- Si el detalle de una noticia falla, esa tarjeta muestra el error y «Reintentar»; el resto de la página no cambia.
- La verificación manual en navegador (T-11) y la integración del modo Bionic Reading con contenido dinámico (T-12) están pendientes.

## Pruebas

```bash
node --test apps/web/src/tests/news-events.test.mjs
```
