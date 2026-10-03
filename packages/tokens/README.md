# @arca/tokens

**Estado:** propuesta documental; paquete y `package.json` aún no existen.

Centraliza valores semánticos de marca para SPAs y React Native. Las apps consumen tokens, no copian colores directos en componentes. Los valores de respaldo provienen del contrato externo de `settings_colores` y se pueden actualizar desde `GET /api/theme` tras validación.

| Clave externa | Default | Token/CSS |
|---|---|---|
| `color-base` | `#661a2f` | `--sidebar` |
| `color-primario` | `#87293a` | `--primary`, `--sidebar-primary`, `--footer-*` |
| `color-secundario` | `#b79159` | `--secondary`, `--footer` |
| `color-complemento` | `#DEC9A3` | `--accent` |
| `colorFuenteB` | `#ffffff` | `--foreground` y variantes `*-foreground` según contraste |
| `colorFuenteN` | `#000000` | `--foreground` / `--primary-foreground` según superficie |
| `tamanio-texto` | `16px` | tamaño de fuente base |
| `fuente` | `Lato`, sans-serif; peso 400 | familia y peso tipográfico |
| `anio` | `2023` | metadato, sin token CSS |
| `extra` | `variable comodin` | valor reservado, sin token CSS |

Los hex son valores de fallback centralizados, no clases ni literales para vistas. Mantener modo claro como tema inicial y verificar contraste/accesibilidad. Mapeo normativo: `docs/04-sistema-de-diseno.md`.
