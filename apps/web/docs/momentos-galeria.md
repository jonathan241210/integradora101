# Portal: galería «Momentos para recordar» dinámica

Referencia local de `web-010` (`specs/010-dynamic-memories.md`). Excepción de arquitectura: `docs/adr/0027-dynamic-public-memories-gallery.md` (con la enmienda del carrusel); el patrón común es el de `docs/adr/0024-web-static-portal-exception.md`.

## 1. Qué muestra y de dónde sale

`#galeria` de `index.html` muestra hasta seis momentos (foto y opinión) aceptados por el zoológico y vigentes, en el orden de la API. Pide `GET /api/v1/memories?limit=6` (`api-012`) una sola vez por carga, sin «Cargar más». El portal no decide qué es visible ni filtra por vencimiento. No muestra nombre, correo ni apodo del visitante.

Archivos: `src/js/api.js` (único módulo de red, `getMemories`), `src/js/memories.js` (contenido y estados), `src/js/memories-carousel.js` (comportamiento del carrusel) y `src/memories.css` (clases `mem-*`).

## 2. Configuración

- Base de la API: `<meta name="arca-api-base">` de `index.html`, `noticias.html` y `eventos.html` (`http://localhost:8000/api/v1` en desarrollo).
- CORS: el origen del portal (`http://localhost:8080` en desarrollo) debe estar en `CORS_ALLOWED_ORIGINS`. `127.0.0.1:8080` es otro origen.

## 3. Plazo de siete días

Cada foto se publica solo 7 días (`api-010` RN-21), así que la galería puede tener pocos momentos o ninguno. Es normal: no se rellenan huecos. Un solo momento se ve sin controles; ninguno muestra «Aún no hay momentos publicados.».

## 4. Carrusel

- Avance automático cada 5 segundos (de 2 a 6 momentos); desde el último vuelve al primero.
- Se detiene mientras el cursor o el foco de teclado estén dentro; al salir se reanuda.
- Sin botón de pausa, sin paginación numérica, sin contador y sin botones de texto: el avance se detiene solo al pasar el cursor o con el foco dentro del carrusel (se reanuda al salir).
- Dos flechas grandes y circulares superpuestas a los lados de la foto, con nombre accesible «Momento anterior» y «Momento siguiente» (solo icono, mínimo 44 px, 56 px en escritorio y 48 px en móvil). También funcionan las teclas ← y → con el foco dentro del carrusel. Ninguna mueve el foco; pulsar reinicia la cuenta de 5 s.
- Cambio de momento con fundido cruzado de 600 ms (opacidad) y acercamiento sutil de 0,96 a 1,00 durante el ciclo de 5 s, sin recortar la foto.
- Un cambio pedido por el visitante (flecha o teclado) se anuncia «Momento n de N» en un elemento visualmente oculto para lectores de pantalla; el avance automático no se anuncia.
- Con la preferencia de movimiento reducido del sistema: sin avance automático, sin fundido y sin acercamiento; las flechas y el teclado siguen funcionando y el cambio es inmediato.
- Con un solo momento: sin flechas ni avance.
- Orden de tabulación: «Momento anterior» y «Momento siguiente».

## 5. Estados

- **Carga:** «Cargando momentos…» (`role="status"`), `#memGallery` con `aria-busy="true"`.
- **Vacío:** «Aún no hay momentos publicados.».
- **Error:** «No pudimos cargar los momentos. Inténtalo más tarde.» con «Reintentar»; vuelve a pedir la lista, muestra la carga y mueve el foco (al contenido si funciona; al botón si vuelve a fallar). No se muestran fotos de muestra.

## 6. Seguridad

Todo dato de la API se escribe como texto (`textContent`). Las URLs de imagen se aceptan solo si son `http:`, `https:` o rutas que empiezan por `/` (no `//`); si no, o si la imagen falla, se muestra un marcador decorativo en la misma caja. Solo `GET`, `credentials: 'omit'`, sin cookies ni almacenamiento del navegador, sin datos del visitante. La foto se ve completa (`object-fit: contain`) sobre `--surface-subtle`.

## 7. Excepción de arquitectura

ADR 0027 (Aceptado 2026-11-12, condiciones 1 a 7 y enmienda del carrusel): sin React, TypeScript, Vite ni `@arca/api-client`; sin `package.json`, build ni librerías de carrusel. Separar el código en dos archivos no añade alcance. Si la galería necesita paginación, filtros, página propia o visor, se reevalúa el ADR.

## 8. Cómo probar

```
node --test apps/web/src/tests/memories.test.mjs
curl -i -H "Origin: http://localhost:8080" "http://localhost:8000/api/v1/memories?limit=6"
```

Las pruebas usan respuestas simuladas y temporizadores simulados; el `curl` y la verificación en navegador requieren `api-012` implementada.

## 9. Limitaciones

- Sin JavaScript, la galería queda en «Cargando momentos…».
- Una foto retirada del dashboard puede seguir visible hasta recargar la página (`api-010` pregunta 1).
- Los momentos vencidos dejan de mostrarse sin aviso.
- El bloque heredado de `script.js` que escuchaba `.foto` queda sin efecto; no se eliminó para no alterar `relocation.test.mjs`.
