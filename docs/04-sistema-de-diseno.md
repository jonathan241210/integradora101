# Sistema de diseño

## Origen y uso

La identidad visual se obtiene de la tabla externa `settings_colores`, consultada mediante la conexión `mysql2` de solo lectura. La API expone el tema a los clientes con `GET /api/theme`; la implementación de lectura y caché debe definirse en su spec. Las claves existentes en español se conservan literalmente como contrato externo. Ni clientes ni API deben escribir en esa tabla.

## Valores iniciales

| Clave `settings_colores` | Valor inicial | CSS / token controlado | Aplicación |
|---|---|---|---|
| `color-base` | `#661a2f` | `--sidebar` | Fondo del menú lateral |
| `color-primario` | `#87293a` | `--primary`, `--sidebar-primary`, `--footer-*` | Marca principal y elementos de énfasis |
| `color-secundario` | `#b79159` | `--secondary`, `--footer` | Color secundario y fondo del pie |
| `color-complemento` | `#DEC9A3` | `--accent` | Acentos |
| `colorFuenteB` | `#ffffff` | `--foreground` en superficies de texto claro y tokens `*-foreground` pertinentes | Texto blanco según contraste del fondo |
| `colorFuenteN` | `#000000` | `--foreground` y `--primary-foreground` en contextos de texto oscuro | Texto negro según contraste del fondo |
| `tamanio-texto` | `16px` | `font-size` de la raíz | Tamaño base de tipografía |
| `fuente` | `font-family: "Lato", sans-serif; font-weight: 400;` | `font-family`, `font-weight` | Familia y peso base |
| `anio` | `2023` | Sin variable CSS | Dato de configuración/visualización |
| `extra` | `variable comodin` | Sin variable CSS | Dato externo reservado |

Las claves de color de fuente identifican los valores blanco y negro de la fuente existente; el token efectivo se elige por superficie para conservar contraste accesible. No se concatenan valores arbitrarios de BD como CSS sin validar.

## Tokens semánticos

Los componentes utilizan tokens, no literales de marca: `bg-primary`, `text-foreground`, `bg-secondary`, `bg-accent`, `border-border`, `bg-muted`, `bg-sidebar`, `bg-footer` y `text-muted-foreground`. El paquete `@arca/tokens` documenta el contrato compartido. Los hex anteriores son defaults de respaldo, no autorización para fijarlos en componentes.

Tailwind CSS v4 usa CSS-first tokens. La capa de tema publica variables de marca y variables semánticas compatibles con web, dashboard y PWA. El modo inicial es claro; no agregar variantes de marca dark hasta aprobar e implementar soporte de tema oscuro.

## Aplicación multiplataforma

- En SPAs, la API entrega configuración validada y el cliente actualiza variables CSS globales una sola vez, manteniendo contraste y tipografía.
- En React Native, `@arca/tokens` adapta los mismos colores y escalas a valores de estilo nativos; no se copian hex dentro de pantallas.
- Los modelos 3D y fichas deben mantener legibilidad, contraste y uso adecuado en dispositivos de campo y exteriores.
- Si `settings_colores` no está disponible o un valor no pasa validación, se usan los valores iniciales de esta guía y se registra el estado sin exponer credenciales.

## Accesibilidad y cambios

Contraste de texto y controles, escalado de texto, áreas táctiles y estados de foco forman parte de los criterios de aceptación de cada interfaz. Un cambio en claves externas, paleta o sistema de tokens requiere spec y plan; si agrega tecnología, también requiere ADR aprobado.
