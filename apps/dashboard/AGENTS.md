# Dashboard — reglas de la app

Lee `../../CONSTITUTION.md`, `../../AGENTS.md` y `../../docs/05-flujo-sdd.md` antes de trabajar.

## Carpetas
- `specs/`: alcance funcional y criterios CA-xx/RN-xx.
- `plan/`: diseño técnico aprobado para la feature.
- `tasks/`: pasos T-xx ligados a criterios de aceptación.
- `docs/`: referencia local vigente del dashboard.
- `src/`: único lugar de código de esta app.
Los documentos usan el mismo `NNN-slug.md`; sigue el SDD antes de editar código.

## Specs vigentes
- 001 prototipo, 002 login real, 003 secciones de administración, 004 formularios en línea con imágenes, 005 venta de boletos y 007 content-image-display: Aprobadas.
- 006 configuración del sistema: Borrador (solo documentada, sin plan ni tasks).
- 008 moderación de momentos: Aprobada (2026-11-12), spec propia y vigente (separada de 010 el 2026-11-12). La implementación empieza cuando su plan y tasks estén aprobados.
- 009 revisión de solicitudes de especie: Borrador, integrada en 010.
- 010 public-content-management: En progreso (aprobada 2026-11-12; enmienda 2026-11-13: sección única TulanPedia con pestañas «Solicitudes» y «Publicadas»); publicación de especies, solo `zoo-admin`. DBR-013 está «Lista para backend».

## Reglas de interfaz
- SPA interna con React 19, TypeScript, Vite 7 y Tailwind CSS 4.
- El código visible, los mensajes y las etiquetas de UI son en español.
- Usa alias `@/`, componentes de `@arca/ui` y hooks de `@arca/api-client`.
- No llames a `fetch`/`axios` directamente desde componentes.
- No implementes cálculos, permisos ni lógica de negocio en la interfaz.
- El alcance incluye taquilla, ventas, arqueos, panel ejecutivo y administración según spec.
- Aplica permisos entregados por la API; ocultar una pantalla no reemplaza autorización del servidor.
- Usa tokens semánticos; no fijes hex de marca en componentes.
- Respeta accesibilidad, teclado, estados de carga/error y diseño adaptable.
- React Router es propuesta del ADR 0002; no añadirlo hasta aprobación.
- No usar Inertia ni Wayfinder.
- Cada CA-xx requiere test automatizado de cliente cuando corresponda.
- Actualiza documentación local si una feature cambia una referencia duradera.
- No instalar dependencias ni crear `package.json` sin SDD y aprobación.
