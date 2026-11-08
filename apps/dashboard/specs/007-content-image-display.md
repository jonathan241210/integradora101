# 007 · content-image-display

- App dueña: `dashboard`
- Apps/paquetes afectados: `dashboard` (dueña: `ContentThumbnail`, `ImageUploadBoxView` y las reglas CSS de tarjetas y caja de imagen); `api` (sin cambios: `image_url` ya existe, `api-008`); `packages/ui` (sin cambios; `Card` se reutiliza tal como está).
- Estado: Aprobada (Jonathan, 2026-11-07)
- Solicitante / responsable funcional: Jonathan
- Aprobación funcional: aprobada por Jonathan, 2026-11-07
- Responsable de BD: no aplica. Sin DBR ni migración: solo marcado y CSS del dashboard.
- Dependencias: `api-008` (subida, `image_url` y RN-13, que quita metadatos al guardar; el redimensionado en servidor está fuera de alcance de `api-008`, así que el problema se resuelve en la presentación); `dashboard-004` (formularios en línea y caja de imagen); `dashboard-003` (secciones de administración de noticias y eventos).
- Relación: mismo criterio de imagen completa que `web-009` CA-15 (portal público). Son independientes entre sí.

## Problema y contexto

En el dashboard, las imágenes de noticias y eventos se recortan en dos sitios:

- **Tarjetas de la lista** (Noticias y Eventos): la miniatura ocupa una franja fija de 130 px de alto y la imagen se ajusta con recorte.
- **Vista previa de la caja de imagen** al crear o editar: la imagen se limita a 260 px de ancho y 160 px de alto, y se ajusta con recorte.

Resultado: un cartel vertical o una foto cuadrada pierde gran parte de su contenido, y la vista previa al subir no coincide con la imagen tal como se guardó. El personal publica sin ver la imagen completa.

**Causa observada** (revisión del código el 2026-11-07; no verificada en navegador):

1. `apps/dashboard/src/styles.css`, regla `.content-card__thumb` (alrededor de la línea 2398): `height: 130px; object-fit: cover;`. Cualquier imagen se llena a 130 px de alto y los bordes sobrantes se cortan.
2. `apps/dashboard/src/styles.css`, regla `.upload-box__preview` (alrededor de la línea 2390): `max-width: 260px; max-height: 160px; object-fit: cover;`. La vista previa se recorta igual.
3. `apps/dashboard/src/components/ContentThumbnail.tsx` (línea 11) renderiza la miniatura con `<img className="content-card__thumb">` sin ninguna regla de centrado ni de fondo: con `cover` no queda espacio sobrante donde se vea el fondo.
4. `apps/dashboard/src/components/ImageUploadBox.tsx` (línea 96) renderiza la vista previa con `<img className="upload-box__preview">` y la misma regla.
5. Las tarjetas de eventos (`EventsView.tsx`, `.event-card-grid`) usan la misma miniatura en cuatro columnas en escritorio: las tarjetas son más estrechas y el recorte se nota más.
6. La prueba `apps/dashboard/src/tests/administration-quality.test.tsx` (líneas 299 y 300) fija `max-width: 260px` en `.upload-box__preview` y `width: 100%` en `.content-card__thumb`. No fija `cover`, así que el cambio debe mantener esos dos valores.

Afectados: `admin` y `zoo-admin` (publican y revisan contenido), `executive` (solo consulta).

## Objetivos

- Ver la imagen completa, sin recorte, en las tarjetas de noticias y de eventos.
- Centrar la imagen y mostrar el fondo neutro del token en los espacios sobrantes.
- Que la vista previa de la caja de imagen muestre el mismo encuadre completo que la tarjeta.
- No ampliar las imágenes por encima de su tamaño natural (sin sensación de zoom).
- Mantener la accesibilidad, la estructura de las tarjetas y los estados actuales.
- Cubrir cada CA-xx con al menos un test automatizado de cliente o verificación manual registrada.

## Fuera de alcance

- Recorte, redimensionado o miniaturas generadas en el servidor (`api-008` lo deja fuera; cambiarlo requiere spec y ADR si añade biblioteca).
- Cambios en `api`, permisos, rutas, datos o `image_url`.
- Galería, visor a pantalla completa o edición de la imagen (rotar, recortar) desde el dashboard.
- Re-subir o reprocesar las imágenes ya guardadas.
- Cambiar el diseño general de tarjetas (títulos, badges, botones, rejilla de columnas).
- Cambios en `packages/ui` o en `apps/web`.
- Respaldo visual para imágenes rotas (hoy no existe; se registra como riesgo).

## Actores y permisos

| Actor/rol | Necesidad | Permisos requeridos |
|---|---|---|
| `admin` (Presidencia) | Ver y verificar la imagen completa al listar y al subir | `news.manage` (noticias), `events.manage` (eventos); sin cambios |
| `zoo-admin` (Dirección) | Lo mismo que `admin` | `news.manage`, `events.manage`; sin cambios |
| `executive` | Ver la imagen completa en las listas | Sin cambios; solo lectura |

Esta feature no crea permisos ni roles (RN-01).

## Historias de usuario

- Como `admin`, quiero ver en la lista la imagen completa de cada noticia o evento, para reconocer el cartel tal como se publicó.
- Como `admin`, quiero que la vista previa al subir o editar coincida con la imagen guardada, para no publicar una imagen recortada sin darme cuenta.
- Como `admin` con teclado o lector de pantalla, quiero que las miniaturas sigan teniendo texto alternativo y que los marcadores «Sin imagen» no muevan el diseño.

## Criterios de aceptación

- **CA-01 (miniatura completa):** Dada una noticia o un evento con imagen gestionada (`image_url`) de cualquier proporción (horizontal, vertical o cuadrada), cuando se listan en `NewsView` o `EventsView`, entonces la imagen se ve completa dentro de la miniatura de la tarjeta (`object-fit: contain`), sin recorte en ningún borde.
- **CA-02 (centrado y fondo):** Dada una miniatura con imagen, cuando se muestra, entonces la imagen queda centrada horizontal y verticalmente dentro de su caja de 130 px de alto y el ancho de la tarjeta, y los espacios sobrantes muestran el fondo neutro del token `--surface-subtle`, sin colores fijos en las reglas.
- **CA-03 (vista previa):** Dada una imagen elegida en `ImageUploadBox` (nueva o ya guardada), cuando se muestra la vista previa, entonces se ve completa y centrada con la misma regla de CA-01 y CA-02, sin `object-fit: cover`.
- **CA-04 (sin zoom):** Dada una miniatura o una vista previa, cuando se muestra, entonces la imagen no se amplía por encima de su tamaño natural (`width: auto; height: auto; max-width: 100%; max-height: 100%`) y no tiene `transform` ni efectos de escala al pasar el cursor.
- **CA-05 (estructura y accesibilidad):** Dada una tarjeta con imagen, cuando se renderiza, entonces la imagen conserva `alt="Imagen de {nombre}"` y `loading="lazy"`; el marcador «Sin imagen» conserva `role="img"` y `aria-label="Sin imagen: {nombre}"` y ocupa la misma caja de 130 px, de modo que la altura de la tarjeta no cambia al cambiar de con imagen a sin imagen. Los botones de la tarjeta no cambian.
- **CA-06 (adaptable):** Dadas las listas de noticias y eventos y la caja de imagen, cuando se usan a 360, 768, 1024 y 1366 px, entonces no hay desbordamiento horizontal, ninguna imagen supera el ancho de su tarjeta o caja y la rejilla de tarjetas sigue las reglas responsive actuales. Verificación automática de reglas CSS y verificación manual en navegador (T-06).
- **CA-07 (tokens):** Dadas las reglas CSS de las miniaturas y de la vista previa, cuando se revisan, entonces usan `var(--surface-subtle)` para el fondo, no contienen colores hexadecimales ni `rgb()` fijos y no usan `object-fit: cover` ni `fill`.
- **CA-08 (no regresión):** Dadas las pruebas existentes, cuando se ejecutan después del cambio, entonces `administration-quality.test.tsx` (CA-18 de `dashboard-004`, en especial `max-width: 260px` en `.upload-box__preview` y `width: 100%` en `.content-card__thumb`) sigue en verde, y las pruebas de formularios en línea y de contenido (`inline-content-forms.test.tsx`, `content-management.test.tsx`) no cambian su resultado.
- **CA-09 (cobertura de pruebas):** Dada la suite de Vitest del dashboard, cuando se ejecuta `npm test` (`vitest run`), entonces existe un archivo `apps/dashboard/src/tests/content-image-display.test.tsx` con tests nombrados `CA-01` a `CA-08` que verifican las reglas CSS y el marcado de `ContentThumbnail` e `ImageUploadBoxView`. CA-06 se verifica además manualmente (T-06).

## Reglas de negocio

- **RN-01 (solo presentación):** El cambio solo toca marcado y CSS de presentación. No cambia permisos, datos, llamadas a la API ni la lógica de los formularios.
- **RN-02 (sin cambio en el archivo):** El archivo guardado no cambia: la API no recorta ni redimensiona (`api-008`). Solo cambia cómo se muestra.
- **RN-03 (tokens):** El fondo y el color de texto usan tokens semánticos (`--surface-subtle`, `--muted-foreground`). No se fijan colores de marca (`AGENTS.md` del dashboard).
- **RN-04 (una sola regla visual):** La miniatura de tarjeta y la vista previa de la caja usan el mismo criterio visual (imagen completa, centrada, sin zoom). Se implementa con la misma estructura de caja y la misma regla de imagen.

## Datos, privacidad y auditoría

- No hay datos nuevos, ni consultas nuevas, ni cambios de auditoría.
- No requiere DBR ni cambios de esquema.
- Las imágenes siguen siendo públicas por diseño (`api-008`).

## Flujos y errores

- Sin cambios funcionales en el flujo de alta, edición, reemplazo, quitar imagen o eliminación (`dashboard-004`).
- Imagen que no carga: el comportamiento actual (texto alternativo del `<img>`) no cambia. Se registra como riesgo (no hay respaldo visual hoy).
- Sin imagen: el marcador «Sin imagen» conserva su texto y su caja (CA-05).

## Dependencias, riesgos y preguntas

- **Dependencias/ADR:** ninguna dependencia nueva; no requiere ADR. `api-008` (`image_url`) y `dashboard-004` (formularios en línea).
- **Riesgos:**
  - **Verificación visual:** el diagnóstico se hizo leyendo el CSS y el marcado. Hay que confirmarlo y verificar el resultado en navegador (T-06), porque las pruebas automáticas no comprueban el aspecto real.
  - **Imágenes pequeñas:** con la regla de no ampliar (CA-04), una imagen menor que la caja se verá pequeña y centrada. Es intencional.
  - **Imágenes muy altas o muy anchas en tarjetas estrechas:** se verán completas, con más fondo visible. Es el efecto buscado; la pregunta 2 decide si la altura de 130 px se mantiene.
  - **Imagen rota:** sin cambio. No hay respaldo visual en el dashboard hoy; se puede tratar en una spec aparte.
- **Preguntas (estado tras la aprobación del 2026-11-07):**
  1. **Resuelta (2026-11-07):** las imágenes no se amplían por encima de su tamaño natural (CA-04).
  2. **Resuelta (2026-11-07, con la propuesta):** se mantiene la altura fija de 130 px; no se adopta proporción fija.
  3. **Resuelta (2026-11-07):** el mismo criterio de imagen completa, centrada y sin ampliar aplica a la vista previa de la caja de imagen.

## Revisión

- Aprobadores y fecha: Jonathan, 2026-11-07 (aprobación explícita del usuario sobre spec, plan y tasks). Estado Aprobada.
- Evidencia/enlaces: `apps/dashboard/specs/004-inline-content-forms.md` (caja de imagen y miniaturas), `apps/api/specs/008-event-news-images.md` (subida, `image_url`, sin recorte en servidor), `apps/web/specs/009-dynamic-news-events.md` (CA-15, mismo criterio en el portal), `apps/dashboard/src/tests/administration-quality.test.tsx` (CA-18, valores fijados).
