# Plan técnico · 007 · content-image-display

- Spec: `apps/dashboard/specs/007-content-image-display.md`
- Estado de spec: Aprobada (Jonathan, 2026-11-07).
- Estado del plan: Aprobado (Jonathan, 2026-11-07).
- Responsable técnico: por identificar (frontend del dashboard)
- Dependencias de API: ninguna (`image_url` ya existe, `api-008`).

## Diseño de solución

El problema es de presentación. La API guarda el archivo tal como se subió (`api-008` RN-13 solo quita metadatos; no recorta ni redimensiona), así que el dashboard debe mostrar la imagen completa. No hay cambios de datos, permisos ni rutas.

La solución tiene tres piezas:

1. **Caja envolvente.** Cada imagen (miniatura y vista previa) va dentro de una caja de tamaño fijo con fondo neutro del token (`--surface-subtle`) y contenido centrado. La caja es un `div` o `span` con clase propia; la imagen queda dentro.
2. **Imagen sin ampliar y sin recorte.** Dentro de la caja, la imagen usa `width: auto; height: auto; max-width: 100%; max-height: 100%`. Con esas reglas la imagen cabe en la caja, no se estira y no se recorta. `object-fit: contain` se mantiene como garantía de proporción.
3. **Misma regla en miniatura y vista previa.** Así una imagen se ve igual en la lista y al editarla (RN-04 de la spec).

Por qué una caja envolvente y no solo `object-fit: contain` en la imagen: con `width: 100%` y `object-fit: contain`, una imagen pequeña se ampliaría hasta llenar el ancho de la tarjeta (sensación de zoom, CA-04). Con `width: auto` y `max-width: 100%` la imagen mantiene su tamaño natural como máximo. La caja pone el fondo y la altura.

Pruebas de regla visual: como las pruebas no ven el resultado en navegador, las reglas se comprueban como texto de CSS (como hace `administration-quality.test.tsx` con `inlineStyles`) y el marcado se comprueba con render a marcado estático. La verificación del aspecto real se hace a mano (T-06).

## Cambios por área

| Área/app | Archivos o módulos previstos | Propósito |
|---|---|---|
| Dashboard (componente) | `apps/dashboard/src/components/ContentThumbnail.tsx` (ajuste) | Miniatura con imagen: `div.content-card__thumb` (caja) con `img.content-card__thumb-img` dentro (`alt="Imagen de {nombre}"`, `loading="lazy"`). El marcador «Sin imagen» no cambia salvo que ocupe la misma caja. |
| Dashboard (componente) | `apps/dashboard/src/components/ImageUploadBox.tsx` (ajuste) | `ImageUploadBoxView`: la vista previa va en `span.upload-box__preview` (caja) con `img.upload-box__preview-img` dentro. Los props, `alt`, manejadores y textos no cambian. |
| Dashboard (estilos) | `apps/dashboard/src/styles.css` (ajuste en el bloque de `dashboard-004`) | Reglas de `.content-card__thumb`, `.content-card__thumb-img`, `.upload-box__preview` y `.upload-box__preview-img`: caja con fondo token y centrado; imagen con `contain`, `max-width/max-height: 100%` y sin `cover`. Ajustes responsive si hace falta (T-04). Se edita la regla existente; no se duplican bloques. |
| Dashboard (vistas) | `apps/dashboard/src/views/NewsView.tsx`, `apps/dashboard/src/views/EventsView.tsx` | Sin cambios de código previstos: usan `ContentThumbnail` y `ImageUploadBox`. Solo se tocan si T-04 lo requiere. |
| Dashboard (pruebas) | `apps/dashboard/src/tests/content-image-display.test.tsx` (nuevo) | Tests `CA-01` a `CA-08` sobre reglas CSS (leídas de `styles.css`) y marcado de `ContentThumbnail` e `ImageUploadBoxView`. |
| Dashboard (pruebas existentes) | `apps/dashboard/src/tests/administration-quality.test.tsx` | Sin cambios. Debe seguir en verde (CA-08): `max-width: 260px` en `.upload-box__preview` y `width: 100%` en `.content-card__thumb`. |
| Paquetes | `packages/ui` | Sin cambios. |
| API | Ninguno | Sin cambios. |
| Documentación | `apps/dashboard/docs/` | Sin cambios previstos: no cambia una referencia duradera del dashboard. Si se decide documentarlo, se registra en la aprobación. |

## Contrato y datos

- Sin endpoints nuevos ni cambios en el contrato. `image_url` sigue llegando en `NewsResource` y `EventResource` (admin).
- Sin datos, sin DBR, sin migraciones.

### Marcado propuesto

Miniatura con imagen:

```tsx
<div className="content-card__thumb">
  <img className="content-card__thumb-img" src={url} alt={`Imagen de ${name}`} loading="lazy" />
</div>
```

Miniatura sin imagen (sin cambio funcional; mismo alto de caja):

```tsx
<div className="content-card__thumb content-card__thumb--empty" role="img" aria-label={`Sin imagen: ${name}`}>
  <span aria-hidden="true">Sin imagen</span>
</div>
```

Vista previa en `ImageUploadBoxView` (dentro de la `label`, por eso `span` y no `div`):

```tsx
<span className="upload-box__preview">
  <img className="upload-box__preview-img" src={previewUrl} alt={previewAlt} />
</span>
```

### Reglas CSS propuestas

```css
.content-card__thumb {
  display: grid;
  place-items: center;
  width: 100%;
  height: 130px;
  overflow: hidden;
  background: var(--surface-subtle);
}

.content-card__thumb-img {
  display: block;
  width: auto;
  height: auto;
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
  object-position: center;
}

.upload-box__preview {
  display: grid;
  place-items: center;
  width: 100%;
  max-width: 260px;
  max-height: 160px;
  border-radius: 6px;
  background: var(--surface-subtle);
  overflow: hidden;
}

.upload-box__preview-img {
  display: block;
  width: auto;
  height: auto;
  max-width: 100%;
  max-height: 160px;
  object-fit: contain;
  object-position: center;
}
```

Notas:
- `.content-card__thumb` conserva `width: 100%`, que es lo que comprueba `administration-quality.test.tsx`.
- `.upload-box__preview` conserva `max-width: 260px`, la otra comprobación.
- Se quita `object-fit: cover` de las dos reglas.
- El `max-height` de la vista previa es 160 px (igual que hoy); la imagen de la caja no supera esa altura.
- Los colores son tokens. No hay `rgb()` ni hex.

## Seguridad, offline y operación

- Sin cambios de seguridad: no hay datos, permisos ni llamadas nuevas.
- `alt` se mantiene en todas las imágenes de contenido. El marcador «Sin imagen» sigue con `role="img"` y `aria-label`.
- Rendimiento: sin cambios; `loading="lazy"` se mantiene.
- Portabilidad: CSS y React sin dependencias nuevas.

## Mapeo de criterios a pruebas

| Criterio | Prueba automatizada | App/ubicación |
|---|---|---|
| CA-01 | `CA-01 content-image-display: la miniatura usa object-fit contain y no cover` (regla de `.content-card__thumb-img` en `styles.css`) | `apps/dashboard/src/tests/content-image-display.test.tsx` |
| CA-02 | `CA-02 …: la caja de miniatura centra la imagen y usa el fondo --surface-subtle` (`display: grid`, `place-items: center`, `height: 130px`, `background: var(--surface-subtle)`) | `content-image-display.test.tsx` |
| CA-03 | `CA-03 …: la vista previa es una caja centrada con contain y sin cover` (`.upload-box__preview` y `.upload-box__preview-img`); marcado de `ImageUploadBoxView` contiene `upload-box__preview-img` con `alt` | `content-image-display.test.tsx` |
| CA-04 | `CA-04 …: ninguna imagen de contenido se amplía ni usa transform` (`width: auto`, `max-width: 100%`, `max-height: 100%`; sin `transform` en las reglas de imagen) | `content-image-display.test.tsx` |
| CA-05 | `CA-05 …: la miniatura conserva alt y lazy; el marcador sin imagen conserva role img y la misma caja` (render de `ContentThumbnail` con y sin URL) | `content-image-display.test.tsx` |
| CA-06 | Reglas automáticas: `max-width: 100%` en imágenes de contenido y `min-width: 0` en tarjetas; verificación manual a 360, 768, 1024 y 1366 px (T-06) | `content-image-display.test.tsx` + manual |
| CA-07 | `CA-07 …: las reglas de imagen usan var(--surface-subtle) y no contienen hex, rgb() ni cover/fill` | `content-image-display.test.tsx` |
| CA-08 | `administration-quality.test.tsx` (CA-18) sigue en verde; `inline-content-forms.test.tsx` y `content-management.test.tsx` sin cambio de resultado | `apps/dashboard/src/tests/` (existentes) |
| CA-09 | Todos los tests `CA-01` a `CA-08` de `content-image-display.test.tsx` nombrados y ejecutados con `npm test` | `content-image-display.test.tsx` |

Los tests leen `apps/dashboard/src/styles.css` con `node:fs` (o el mismo método que `administration-quality.test.tsx`) y no dependen del navegador.

## Constitution Check

| Principio | Cumple | Evidencia o excepción propuesta |
|---|---|---|
| I. Stack mínimo y portable | Sí | React 19, TS, Vite y CSS existentes. Sin dependencias nuevas. |
| II. La spec manda | Sí | Spec 007 Aprobada (Jonathan, 2026-11-07) con este plan. |
| III. Lógica separada de la interfaz | Sí | Solo presentación; no hay cálculos ni reglas de negocio. |
| IV. Un test por criterio | Sí | CA-01 a CA-09 mapeados a `content-image-display.test.tsx` y a la verificación manual de CA-06. |
| V. Una sola fuente de verdad para los datos | Sí | Sin datos nuevos ni escritura. |
| VI. Código en inglés, personas en español | Sí | Clases en inglés (`content-card__thumb-img`, `upload-box__preview-img`); textos visibles sin cambios (en español). |

Sin excepciones. No requiere ADR.

## Riesgos y decisiones

- **ADR requerido/aprobado:** no requiere.
- **Verificación visual:** el diagnóstico es de lectura de código. Antes de cerrar, se confirma en navegador (T-06) con una imagen vertical, una horizontal y una cuadrada.
- **Imágenes pequeñas:** no se amplían (CA-04). Pregunta 1 de la spec.
- **Altura fija de 130 px:** se mantiene (propuesta). Pregunta 2 de la spec.
- **Imagen rota:** sin cambio (no hay respaldo hoy). Fuera de alcance.
- **Alternativas consideradas:**
  - Solo `object-fit: contain` en la imagen con `width: 100%`: descartada; amplía las imágenes pequeñas (sensación de zoom).
  - Proporción fija con `aspect-ratio` en la miniatura: queda como alternativa si la pregunta 2 la elige; cambia la altura de las tarjetas.
  - Miniaturas generadas en el servidor: descartada en esta spec (fuera de alcance de `api-008`; requiere spec y, si añade biblioteca, ADR).

## Orden y aprobación

1. Spec 007 (preguntas 1 a 3 resueltas) y este plan con su Constitution Check, aprobados el 2026-11-07.
2. `ContentThumbnail.tsx`: caja y `img` interno; pruebas de CA-05.
3. `ImageUploadBox.tsx`: caja de vista previa; pruebas de CA-03 (marcado).
4. `styles.css`: reglas nuevas en el bloque de `dashboard-004`; quitar `cover`; pruebas de CA-01, CA-02, CA-03, CA-04, CA-07.
5. Responsive (CA-06): revisar las reglas `@media` que cambian `.event-card-grid` (alrededor de la línea 1269 de `styles.css`) y `.content-card-grid` y `.event-card-grid` a una columna (alrededor de la línea 1418), y las cajas en 360 px; ajustar solo si hace falta.
6. Pruebas: `npm test` del dashboard (`vitest run`); `administration-quality.test.tsx` en verde (CA-08).
7. Verificación manual (T-06) y `/verify` del dashboard.
8. Revisión técnica y aprobación funcional.

**Dependencias:** ninguna externa. Independiente de `web-009` (mismo criterio en el portal, otra app).

**Aprobaciones requeridas:**

| Rol | Aprueba | Estado |
|---|---|---|
| Responsable funcional | Spec 007 (preguntas 1 a 3) | Aprobado (Jonathan, 2026-11-07) |
| Equipo técnico | Este plan y el Constitution Check | Aprobado (Jonathan, 2026-11-07) |
