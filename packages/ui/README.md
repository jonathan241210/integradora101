# @arca/ui

**Estado:** propuesta; componentes y workspace no implementados.

Paquete de componentes de interfaz para `apps/dashboard`, `apps/pwa` y `apps/web`. Referencia visual: shadcn/ui estilo `new-york`, primitivas accesibles Radix, iconos Lucide y Tailwind CSS v4. Mantiene API de componentes reutilizable; no conoce reglas de negocio ni realiza llamadas directas a endpoints.

Los componentes usan tokens semánticos de `@arca/tokens`, textos recibidos en español, estados accesibles y composición por props. Los cambios deben cubrir comportamiento, teclado, foco y contraste con tests apropiados. No copiar componentes ni hardcodear colores de marca en las apps consumidoras.

La selección de dependencias requiere spec/plan/tasks y ADR cuando aplique. No hay código ni `package.json` todavía.
