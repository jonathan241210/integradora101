# @arca/tokens

**Estado:** paquete CSS semántico inicializado; la actualización dinámica desde `GET /api/theme` queda pendiente de integración aprobada.

Centraliza valores semánticos de marca para SPAs y React Native. Las apps consumen tokens, no copian colores directos en componentes. Los valores de respaldo provienen del contrato externo de `settings_colores` y se pueden actualizar desde `GET /api/theme` tras validación.

| Clave externa | Default | Token/CSS |
|---|---|---|
| `color-base` | `#661a2f` | `--sidebar` |
| `color-primario` | `#87293a` | `--primary` |
| `color-secundario` | `#b79159` | `--secondary` |
| `color-complemento` | `#DEC9A3` | `--accent` |
| `colorFuenteB` | `#ffffff` | `--foreground-light` y variantes `*-foreground` según contraste |
| `colorFuenteN` | `#000000` | `--foreground` / `--primary-foreground` según superficie |
| `tamanio-texto` | `16px` | tamaño de fuente base |
| `fuente` | `Lato`, sans-serif; peso 400 | familia y peso tipográfico |
| `anio` | `2023` | metadato, sin token CSS |
| `extra` | `variable comodin` | valor reservado, sin token CSS |

Los hex son valores de fallback centralizados, no clases ni literales para vistas. Mantener modo claro como tema inicial y verificar contraste/accesibilidad. Mapeo normativo: `docs/04-sistema-de-diseno.md`.

### Tokens del prototipo administrativo

El paquete conserva los defaults del contrato institucional y proporciona aliases `--dashboard-*` como valores base para la UI compartida. La SPA de administración puede mapear esos aliases a `--sidebar`, `--primary`, `--secondary`, `--accent` y tokens semánticos desde su hoja de estilos; ese mapeo no cambia los defaults globales del paquete ni la fuente externa `settings_colores`. En la demo del dashboard, los aliases se enlazan a la paleta institucional en `apps/dashboard/src/styles.css`. Una integración operativa futura deberá definir cómo aplicar el tema validado por `GET /api/theme`.
