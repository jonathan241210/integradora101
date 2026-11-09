# 0023 · Checklist de despliegue en la Constitución

- Estado: Propuesto (2026-11-05); pendiente del acuerdo del equipo
- Fecha: 2026-11-05
- Spec relacionada: N/A (decisión transversal). Motivada por `apps/api/specs/008-event-news-images.md` y `apps/api/specs/009-ticket-sales.md`.

## Contexto

El 2026-11-05, durante las pruebas en `arca_pruebas`, aparecieron dos fallos con el código correcto y la configuración del ambiente incompleta:

- Las imágenes de noticias y eventos no se veían tras subirlas, porque `APP_URL` no tenía el puerto y faltaba `storage:link`.
- Presidencia veía «Venta» en lugar de «Precios», porque `RolesAndPermissionsSeeder` no se había aplicado a esa base.

Las pruebas automatizadas no detectaron ninguno de los dos. Además, el límite de subida de PHP (2 MB por defecto) rechaza fotos que la app permite (5 MB). Estos requisitos no viajan con el código y volverán a aparecer en producción si nadie los revisa.

Jonathan pidió que esto quede también en la Constitución. Para cambiarla se requiere el acuerdo del equipo y un ADR.

## Decisión

Agregar a la Constitución I, una vez aprobado este ADR, el siguiente texto:

> Todo despliegue cumple el checklist de `infra/README.md`. Un cambio que agregue un requisito de servidor o de ambiente lo anota ahí en el mismo PR.
> **Verificable:** cada despliegue registra el checklist con su evidencia; el PR que agrega un requisito de ambiente actualiza el checklist.

El detalle se queda en `infra/README.md`, para poder actualizarlo sin reformar la Constitución.

## Consecuencias

- Nadie despliega sin revisar los requisitos de ambiente, y el checklist se vuelve condición para mergear los PR que agreguen uno nuevo.
- Cada despliegue suma un paso manual con evidencia.
- Mientras este ADR no se acepte, la regla vive en `AGENTS.md` y en `infra/README.md`, sin cambios en la Constitución.
