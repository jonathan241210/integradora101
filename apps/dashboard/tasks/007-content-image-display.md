# Tareas · 007 · content-image-display

- Spec: `apps/dashboard/specs/007-content-image-display.md` (Estado: **Aprobada**, Jonathan, 2026-11-07)
- Plan: `apps/dashboard/plan/007-content-image-display.md` (Estado: **Aprobado**, Jonathan, 2026-11-07)
- Checklist: aprobado por Jonathan, 2026-11-07. Ninguna tarea está marcada como hecha; cada T-xx se marca solo con evidencia.

Sin datos, sin DBR, sin cambios de API ni de permisos. Solo marcado y CSS de presentación.

## Trazabilidad

| Criterio / regla | Tareas que lo cubren |
|---|---|
| CA-01 / RN-02 | T-02, T-07, T-08 |
| CA-02 / RN-03 | T-02, T-07, T-08 |
| CA-03 / RN-04 | T-03, T-04, T-07, T-08 |
| CA-04 | T-02, T-04, T-07, T-08 |
| CA-05 | T-01, T-07, T-08 |
| CA-06 | T-05, T-06 |
| CA-07 / RN-03 | T-02, T-04, T-07, T-08 |
| CA-08 | T-08 |
| CA-09 | T-07 |

## Implementación

- [x] **T-01** (CA-05; RN-04): en `apps/dashboard/src/components/ContentThumbnail.tsx`, envolver la imagen en `div.content-card__thumb` con `img.content-card__thumb-img` dentro (`alt="Imagen de {nombre}"`, `loading="lazy"`). El marcador «Sin imagen» conserva `role="img"`, `aria-label` y la misma caja de 130 px.
- [x] **T-02** (CA-01, CA-02, CA-04, CA-07; RN-02, RN-03): en `apps/dashboard/src/styles.css`, en el bloque de `dashboard-004`, cambiar `.content-card__thumb` a caja (`display: grid; place-items: center; width: 100%; height: 130px; overflow: hidden; background: var(--surface-subtle)`) y añadir `.content-card__thumb-img` (`width: auto; height: auto; max-width: 100%; max-height: 100%; object-fit: contain; object-position: center`). Quitar `object-fit: cover`. Sin hex ni `rgb()`.
- [x] **T-03** (CA-03; RN-04): en `apps/dashboard/src/components/ImageUploadBox.tsx`, en `ImageUploadBoxView`, envolver la vista previa en `span.upload-box__preview` con `img.upload-box__preview-img` dentro. Props, `alt`, manejadores y textos no cambian.
- [x] **T-04** (CA-03, CA-04, CA-07; RN-04): en `styles.css`, cambiar `.upload-box__preview` a caja (`display: grid; place-items: center; width: 100%; max-width: 260px; max-height: 160px; background: var(--surface-subtle); overflow: hidden`) y añadir `.upload-box__preview-img` (`width: auto; height: auto; max-width: 100%; max-height: 160px; object-fit: contain; object-position: center`). Mantener `max-width: 260px` (la prueba CA-18 lo fija). Quitar `object-fit: cover`.
- [x] **T-05** (CA-06): revisar las reglas `@media` que afectan a `.event-card-grid` (alrededor de la línea 1269 de `styles.css`), a `.content-card-grid` y `.event-card-grid` con una columna (alrededor de la línea 1418) y las cajas en 360 px. Ajustar solo si hay desbordamiento; si no, registrar «sin cambios».
- [x] **T-07** (CA-01 a CA-05, CA-07, CA-09): crear `apps/dashboard/src/tests/content-image-display.test.tsx` con tests `CA-01 content-image-display: …` hasta `CA-08 content-image-display: …` y `CA-09 content-image-display: cada criterio tiene su prueba`. Las reglas se leen de `styles.css`; el marcado se comprueba con render a marcado estático, como en `ticket-print-settings.test.tsx`. Sin dependencias nuevas.
- [x] **T-08** (CA-08): confirmar que `apps/dashboard/src/tests/administration-quality.test.tsx` sigue en verde (CA-18: `max-width: 260px` en `.upload-box__preview` y `width: 100%` en `.content-card__thumb`), y que `inline-content-forms.test.tsx` y `content-management.test.tsx` no cambian su resultado. No modificar esas pruebas sin autorización.

## Calidad y entrega

- [ ] **T-06** (CA-06; manual): verificación en navegador con una imagen vertical, una horizontal y una cuadrada, en noticias y en eventos, y en la vista previa al crear y al editar: a 360, 768, 1024 y 1366 px sin desbordamiento horizontal, sin recorte, centrada, con el fondo del token visible en los sobrantes. Confirmar el diagnóstico (la causa observada es el `object-fit: cover` con alto fijo). Evidencia en el PR: capturas o notas.
- [x] **T-09**: ejecutar `npm test` del dashboard (`vitest run`) y los scripts de tipos, lint y build que declare `apps/dashboard/package.json`; registrar número de pruebas, aprobadas, fallidas y fallos preexistentes.
- [ ] **T-10**: ejecutar `git diff --check` y `/verify` del dashboard; registrar el resultado.
- [x] **T-11**: documentación: no hay referencia duradera nueva; registrar «sin cambios en `apps/dashboard/docs/`» o, si el equipo lo pide en la aprobación, actualizar la referencia.
- [ ] **T-12**: enlazar spec, plan y tasks en el PR; citar `dashboard-007` en el commit. Actualizar el estado de la spec solo con evidencia de T-06 y T-09; no marcar Implementada si algún CA carece de test.
