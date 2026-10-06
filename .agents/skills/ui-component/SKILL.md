---
name: ui-component
description: Diseñar un componente compartido accesible para @arca/ui
argument-hint: "<componente> [comportamiento]"
allowed-tools:
  - read
  - edit
  - grep
  - glob
  - exec
---

Crea un componente compartido solo con spec/plan/tasks aprobados.

1. Lee Constitution, `packages/ui/README.md`, `packages/tokens/README.md`, la spec/plan/tasks y el sistema de diseño.
2. Implementa dentro de `packages/ui/src/`; no agregues manifests ni dependencias sin aprobación/ADR.
3. Reutiliza primitivas accesibles de shadcn/ui estilo `new-york`/Radix cuando estén disponibles; usa `lucide-react` para iconos web.
4. Expón una API pequeña, tipada y composable; no incluyas llamadas HTTP ni lógica de negocio.
5. Usa tokens semánticos, nunca hex de marca. Textos visibles en español; nombres de componentes/props en inglés.
6. Considera teclado, foco, etiquetas, contraste, lector de pantalla y estados de interacción.
7. Agrega tests automatizados para criterios CA-xx y actualiza tasks/docs de paquete si cambió su contrato.
8. Ejecuta verificaciones disponibles; reporta expresamente si el paquete aún no está inicializado.
