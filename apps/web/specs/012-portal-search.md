# 012 · portal-search

- App dueña: `web`
- Apps/paquetes afectados: `apps/web` (buscador, fuentes y navegación). La API y `packages/api-client` no cambian; se consumen los endpoints públicos existentes.
- Estado: Implementada (2026-11-18; ajuste visual del panel solicitado por Jonathan completado y verificado).
- Solicitante / responsable funcional: Jonathan
- Aprobación funcional: aprobada por Jonathan en esta conversación, 2026-11-18. Alcance: todas las secciones públicas de la portada, especies publicadas, noticias y eventos publicados, incluyendo sus páginas de listado; panel bajo el buscador; resultados parciales con aviso por fuente si alguna carga falla.

## Problema y contexto

El formulario de búsqueda de la cabecera (`#searchForm`, `#searchInput`) actualmente solo desplaza a la sección de animales. Su placeholder y etiqueta también indican que busca animales. El visitante no puede encontrar contenido buscando desde una sola entrada en las distintas secciones y páginas del portal.

La búsqueda abarca el contenido público de las secciones de portada y el contenido publicado de especies, noticias, eventos y momentos. Debe presentar resultados útiles con enlaces a su ubicación. Noticias y eventos también tienen páginas de listado propias.

## Objetivos

- Convertir el buscador de cabecera en un punto de entrada para localizar contenido público en el portal.
- Permitir identificar el tipo de resultado y abrir la sección, tarjeta o página que contiene la coincidencia.
- Mantener el uso accesible por teclado y tecnologías de asistencia, con mensajes y resultados en español.

## Fuera de alcance

- Buscar en la web pública o en sitios externos.
- Mostrar contenido privado, clínico, financiero, borrador o no publicado.
- Cambiar la gestión editorial de especies, noticias o eventos.
- Añadir dependencias sin ADR aprobado.

## Actores y permisos

| Actor/rol | Necesidad | Permisos requeridos |
|---|---|---|
| Visitante | Encontrar información pública del zoológico desde la cabecera | Ninguno |
| Visitante con teclado o lector de pantalla | Buscar y recorrer resultados sin depender del puntero | Ninguno |

## Historias de usuario

- Como visitante, quiero buscar desde la cabecera para localizar información sin recorrer manualmente todas las secciones.
- Como visitante, quiero abrir un resultado y llegar al contenido correspondiente para continuar la lectura.

## Criterios de aceptación

- **CA-01 (alcance global):** Dada una consulta, cuando se ejecuta la búsqueda, entonces se buscan coincidencias en todas las fuentes públicas incluidas en el alcance aprobado, no solo en especies.
- **CA-02 (resultados):** Dada una consulta con coincidencias, cuando termina la búsqueda, entonces se muestran resultados en español con título, tipo y enlace a su ubicación.
  - El panel queda bajo la cabecera, sin superponerse al menú; tiene título, aviso compacto, acciones de reintento agrupadas y tarjetas con jerarquía tipográfica legible, adaptadas a móvil y escritorio.
- **CA-03 (sin resultados):** Dada una consulta sin coincidencias, cuando termina la búsqueda, entonces se informa «No encontramos resultados» y se permite cambiar la consulta.
- **CA-04 (coincidencia y navegación):** Dado un resultado, cuando el visitante lo activa, entonces el panel se cierra y el portal navega a la sección, tarjeta o página correspondiente dejando visible el contenido coincidente, incluso si una especie estaba oculta por filtros o la noticia pertenece a una página posterior. El encabezado o tarjeta destino se resalta con un pulso breve, repetible al volver a elegirlo. Enviar la consulta solo muestra resultados y no desplaza automáticamente a Animales, incluso con manejadores heredados o una carga pendiente del catálogo.
- **CA-05 (accesibilidad):** Dada la búsqueda y su lista de resultados, cuando se usan teclado o lector de pantalla, entonces el campo, estados y resultados tienen etiquetas, foco visible, orden de foco predecible y anuncios accesibles. Escape desde el campo o panel cierra y devuelve el foco al campo. Un clic fuera del formulario y del panel lo cierra sin alterar el destino pulsado; una carga pendiente no vuelve a abrirlo.
  - El pulso no oculta contenido y termina en menos de tres segundos; con movimiento reducido se sustituye por un borde temporal sin animación.
- **CA-06 (contenido permitido):** Dada una búsqueda, cuando se preparan resultados, entonces solo se consideran datos públicos y publicados; ninguna consulta envía datos personales del visitante.
- **CA-07 (consulta vacía y errores):** Dada una consulta vacía o una fuente que no se puede cargar, cuando se ejecuta la búsqueda, entonces la interfaz valida la consulta y comunica de forma comprensible el estado o el error sin bloquear las demás fuentes.
- **CA-08 (pruebas):** Cada criterio CA-01 a CA-07 tiene al menos un test automatizado identificado con su CA.

## Reglas de negocio

- **RN-01:** La búsqueda solo expone contenido que ya está autorizado para mostrarse públicamente en el portal.
- **RN-02:** Los resultados muestran texto como texto; el contenido encontrado no se interpreta como HTML.
- **RN-03:** El orden de resultados debe ser estable y coherente dentro de una misma búsqueda.
- **RN-04:** Las peticiones a la API, si son necesarias, siguen las reglas de lectura pública vigentes del portal (`web-009`, `web-011` y ADR aplicables).

## Datos, privacidad y auditoría

La búsqueda consulta texto editorial público del portal y metadatos necesarios para ubicar resultados. El texto de consulta se compara localmente y no se envía a servicios externos ni se guarda en la URL o almacenamiento persistente. Los datos dinámicos se leen de endpoints públicos existentes y se conservan en memoria mientras la página está abierta.

No se prevén cambios de esquema ni DBR en el alcance preliminar. La API podría requerir cambios si el alcance incluye un endpoint de búsqueda global.

## Flujos y errores

1. El visitante escribe una consulta en el formulario de cabecera y la envía.
2. El portal consulta las fuentes definidas en el alcance aprobado.
3. La interfaz muestra estado de carga, resultados, estado vacío o errores por fuente.
4. Al activar un resultado, el portal abre la ubicación correspondiente.

Las fuentes dinámicas se consultan de forma independiente. Si alguna falla, el panel conserva resultados de las demás y muestra un aviso parcial con opción de reintento para la fuente afectada. Los resultados de noticias y eventos enlazan a sus páginas de listado y a la tarjeta correspondiente; los de especies enlazan a su ficha en TulanPedia.

## Dependencias, riesgos y preguntas

- Dependencias/ADR: `web-009` (noticias y eventos dinámicos), `web-010` (momentos dinámicos), `web-011` (TulanPedia dinámica), ADR 0024, 0027, 0028 y ADR 0031 (Aceptado, 2026-11-18).
- Riesgos: recorrer noticias y momentos paginados y obtener detalles publicados de noticias puede requerir varias solicitudes. Los fallos se aíslan por fuente y se muestran como resultados parciales.
- Preguntas pendientes: ninguna funcional. Plan aprobado el 2026-11-18; ADR 0031 aceptado.

## Revisión

- Aprobadores y fecha: Jonathan aprobó alcance y criterios funcionales el 2026-11-18.
- Corrección autorizada por Jonathan, 2026-11-18: cerrar al hacer clic fuera, retirar el desplazamiento automático a Animales y abrir el destino del resultado seleccionado (CA-04/CA-05).
- Corrección adicional autorizada por Jonathan, 2026-11-18: hacer parpadear brevemente el destino y resolver el desplazamiento persistente a Animales en `http://localhost:8080/index.html`.
- Ajuste visual autorizado por Jonathan, 2026-11-18: mejorar aviso, reintentos, tarjetas y posicionamiento del panel mostrado en la captura.
- Evidencia/enlaces: `apps/web/src/js/search.js`, `apps/web/src/tests/search.test.mjs` y `apps/web/tasks/012-portal-search.md`; retirado el envío heredado de `script.js`. Las consultas muestran resultados sin desplazar a Animales y los enlaces conservan su destino.
