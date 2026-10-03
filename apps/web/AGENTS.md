# Portal institucional — reglas de la app

Lee `../../CONSTITUTION.md`, `../../AGENTS.md` y `../../docs/05-flujo-sdd.md` antes de trabajar.

## Carpetas
- `specs/`: requisitos, alcance público y CA-xx/RN-xx.
- `plan/`: diseño y contrato técnico aprobado.
- `tasks/`: pasos T-xx relacionados con criterios.
- `docs/`: referencia local y manuales editoriales.
- `src/`: único lugar de código de esta app.
Los artefactos de una feature comparten `NNN-slug.md`; exige spec aprobada antes de implementar.

## Reglas del portal
- SPA pública con React 19, TypeScript, Vite 7 y Tailwind CSS 4.
- Interfaz y contenido al público en español.
- Presenta noticias, eventos, catálogo y contenido pedagógico autorizado en la spec.
- Usa alias `@/`, `@arca/ui`, `@arca/api-client` y tokens semánticos de marca.
- No incrustes lógica de negocio ni peticiones `fetch`/`axios` directamente en componentes.
- Limita endpoints públicos a contenido publicado y autorizado como público.
- Nunca expongas datos personales, clínicos o de caja.
- Aplica accesibilidad, diseño adaptable y optimización de medios según CA-xx.
- Protege estados editoriales en servidor; la interfaz pública no publica contenido.
- No usar Inertia ni Wayfinder.
- Cada CA-xx debe tener cobertura de test automatizado apropiada.
- Actualiza documentación local si cambia el proceso editorial o una referencia estable.
- No crear manifests ni instalar dependencias sin spec, plan, tasks y aprobación.
