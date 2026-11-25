# Búsqueda global del portal

El formulario «Buscar en todo el portal» de la portada localiza texto visible de sus secciones y contenido público publicado de Zoopedia, noticias, eventos y momentos.

## Uso

Escribe una palabra o frase (hasta 120 caracteres) y pulsa Enter o el botón de búsqueda. Los resultados aparecen debajo del campo, agrupados por tipo, sin mover la página. Cada resultado muestra su título, un fragmento y un enlace al contenido.

El panel se sitúa debajo de toda la cabecera, sin cubrir el menú. Un aviso suave comunica las fuentes no disponibles y los botones de reintento se agrupan en dos columnas. Las tarjetas separan tipo, título y fragmento; si no caben todas, el panel permite desplazamiento interno.

Al pulsar el enlace, el panel se cierra y se abre su sección, tarjeta o página. Si una especie estaba oculta por filtros, se restablecen para mostrarla. Las noticias abren la página que contiene su tarjeta. Un clic fuera del campo y del panel también lo cierra; Escape desde el campo o los resultados lo cierra y devuelve el foco al campo. Una carga pendiente no vuelve a abrirlo.

El encabezado de la sección o la tarjeta elegida se resalta con dos pulsos suaves y la marca desaparece a los 2,4 segundos. Volver a elegir el mismo resultado reinicia el efecto. Con «Reducir movimiento» se muestra un borde temporal sin animación.

La comparación ignora mayúsculas, espacios repetidos y tildes. Una consulta vacía o mayor de 120 caracteres muestra un mensaje. Si una fuente falla, el portal conserva los resultados de las demás y permite reintentar la fuente afectada.

## Fuentes y privacidad

- Texto visible de secciones estáticas de la portada, especies publicadas, noticias publicadas (incluido su contenido), eventos vigentes y momentos publicados.
- Los datos dinámicos se leen con las funciones públicas de `js/api.js`; la búsqueda no envía el texto consultado.
- Los resultados y respuestas se conservan solo en memoria mientras la página está abierta. No se usan cookies ni almacenamiento persistente.
- La visibilidad editorial la deciden los endpoints públicos existentes. El portal no busca borradores ni datos privados.
- El texto de resultados se inserta como texto plano; no se procesa como HTML.

## Mantenimiento

La implementación está en `src/js/search.js`; su módulo de red sigue siendo `src/js/api.js`. `src/js/search-target.js` comparte el resaltado entre portada, noticias y eventos. El formulario usa un único controlador en fase captura para impedir desplazamientos de manejadores heredados y cancela el enfoque inicial pendiente del catálogo al buscar.

Las URLs de los recursos afectados incluyen una versión para actualizar copias previamente cacheadas: CSS compartido y renderizador de búsqueda usan `?v=web-012-4`; navegación, catálogo y helper de resaltado conservan `web-012-3`. Mantener alineadas entre páginas las referencias a un mismo archivo. Una pestaña abierta debe recargarse para descargar la corrección.

Las pruebas identificadas por criterio se ejecutan con:

```sh
node apps/web/src/tests/search.test.mjs
node apps/web/src/tests/search-target.test.mjs
```

La búsqueda global es una excepción limitada de arquitectura autorizada por el ADR 0031 y la spec `web-012`.
