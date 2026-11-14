# Portal: TulanPedia dinámica

Referencia local de `web-011` (`specs/011-dynamic-tulanpedia.md`). Excepción de arquitectura: `docs/adr/0028-dynamic-tulanpedia-catalog.md`, que extiende el patrón de `docs/adr/0024-web-static-portal-exception.md` (HTML y JavaScript estático, sin `@arca/api-client`, sin build, pruebas con `node --test`).

## 1. Qué muestra y de dónde sale

`#animales` de `index.html` muestra las especies publicadas por el zoológico. Pide `GET /api/v1/published-species` (`api-015`), sin parámetros, una vez por carga. El portal no decide qué especies son visibles ni su orden: dibuja lo que recibe. No hay fichas de muestra.

Archivos: `src/js/api.js` (único módulo de red, función `getSpecies()`), `src/js/animals.js` (presentación), `src/animals.css` (estilos con prefijo `tp-`).

## 2. Configuración

- Base de la API: `<meta name="arca-api-base">` de `index.html` (`http://localhost:8000/api/v1` en desarrollo). La sección no define otra base.
- CORS: el origen del portal (`http://localhost:8080` en desarrollo) debe estar en `CORS_ALLOWED_ORIGINS`. `127.0.0.1:8080` es otro origen.

## 3. Filtros

Las opciones salen solo de la respuesta; no hay valores fijos en el HTML. El filtrado es en memoria y no hace peticiones nuevas.

- **Tipo de animal:** una opción por cada `category` distinta, con la etiqueta de la sección 4. Siempre visible. Si ninguna especie trae `category`, solo muestra «Todos los tipos» y queda deshabilitado.
- **Especie:** una opción por cada `common_name` distinto, en orden alfabético.
- **Hábitat:** una opción por cada `habitat` distinto (se quitan espacios sobrantes y no se distinguen mayúsculas; se muestra la primera forma recibida; no se quitan acentos). Se oculta si ninguna especie trae `habitat`.
- «Limpiar filtros» restablece los tres. El contador `#animalCount` (`aria-live="polite"`) indica «1 especie encontrada» o «N especies encontradas».

## 4. Etiquetas de `category`

| Clave recibida | Etiqueta |
|---|---|
| `mammal` | Mamífero |
| `bird` | Ave |
| `reptile` | Reptil |
| `amphibian` | Anfibio |
| `fish` | Pez |
| `invertebrate` | Invertebrado |

Una clave fuera de la tabla se muestra tal como llega. Un tipo nuevo exige actualizar la API y esta tabla (`CATEGORY_LABELS` en `src/js/animals.js`).

## 5. Estados

- **Carga:** «Cargando especies…» (`role="status"`), `#animalGrid` con `aria-busy="true"`.
- **Vacío:** «Aún no hay especies publicadas.», sin tarjetas, filtros ni contador.
- **Error:** «No pudimos cargar las especies. Inténtalo más tarde.» con el botón «Reintentar», que vuelve a pedir la lista, muestra la carga y mueve el foco (al contenido si funciona; al botón si vuelve a fallar).
- La tarjeta muestra siempre el nombre común (`h3`) y la foto; los demás campos solo si la API los trae, en el bloque «Conocer más sobre la especie».

## 6. Seguridad

Todo dato de la API se escribe como texto (`textContent`). Las URLs de imagen se aceptan solo si son `http:`, `https:` o rutas que empiezan por `/` (no `//`); si no, o si la imagen falla, se muestra un marcador. Solo `GET`, `credentials: 'omit'`, sin cookies ni almacenamiento del navegador. No se muestran datos del veterinario ni del revisor.

## 7. Excepción de arquitectura

ADR 0028 (Aceptado 2026-11-12): sin React, TypeScript, Vite ni `@arca/api-client` para esta sección; sin `package.json` ni build. Se reevalúa con la spec de pagos o si el catálogo crece.

## 8. Cómo probar

```
node --test apps/web/src/tests/animals.test.mjs
curl -i -H "Origin: http://localhost:8080" http://localhost:8000/api/v1/published-species
```

Las pruebas usan respuestas simuladas; el `curl` y la prueba en navegador requieren `api-015` implementada.

## 9. Limitaciones

- Sin JavaScript, la sección queda en «Cargando especies…».
- La sección queda vacía hasta la primera publicación.
- Los campos extra (`conservation_status`, `size_cm`, `gestation_period`, `diet`, `longevity`, `characteristics`) no llegan mientras esté vigente la decisión «no por ahora» (`api-015` CA-13).
- Los assets de las fichas retiradas (`macaw-*`, `turtle-*` y `nyilonelycompany-nature-51.glb`, entre otros) ya no se referencian en `#animales` y no se borraron; algunos (`giraffe`, `lion-hero`, `icon-3d-56.webp`) siguen en uso en otras partes del portal. La limpieza es una tarea futura.
