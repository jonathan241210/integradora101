# ARCA-NB

Sistema multiplataforma para el Zoológico Municipal Nicolás Bravo, de la Presidencia Municipal de Tulancingo. El zoológico es un centro de rescate, conservación y rehabilitación de fauna silvestre, incluidos ejemplares decomisados por maltrato o tráfico ilegal.

**Estado actual: fase inicial.** Este repositorio contiene el análisis y la estructura documental; las aplicaciones aún no están inicializadas. En V1 la venta de boletos es solo en efectivo. Payments queda FUTURO/INACTIVO: no está implementado ni activable y ahora no hay código, tablas, endpoints, SDK ni feature flag de pagos.

## Necesidades que atiende
1. **Administración y finanzas:** venta digital de boletos en taquilla, cierre/arqueo diario automático e informes para la Dirección de Ingresos.
2. **Atención médico-veterinaria:** expediente clínico digital respaldado en la nube para vacunas, dietas y tratamientos, sin interrumpir el trabajo de campo. El personal veterinario puede registrar en papel y transcribir después.
3. **Experiencia del visitante (phygital y gamificación):** QR en recintos para consultar fichas pedagógicas y modelos 3D, conectados con Zoopedia, un juego educativo móvil de baja poligonización que desbloquea especies y hábitats durante la visita.

## Componentes
- `apps/web`: portal institucional público con noticias, eventos y catálogo.
- `apps/dashboard`: taquilla, cierre de caja, panel ejecutivo y administración.
- `apps/pwa`: módulo veterinario con captura y sincronización de borradores offline.
- `apps/mobile`: app de visitantes con mapa interactivo, lector QR y visores 3D.
- **Juego educativo:** decisión tecnológica pendiente (ADR 0005 abierto); todavía no tiene carpeta.
- `apps/api`: API Laravel central, única autoridad de negocio y datos.
- `packages/`: propuesta de tokens, UI compartida, cliente tipado de API, configuración y recursos institucionales autorizados (`assets`, solo documentación por ahora).

## Roles de negocio
`admin` (Administrador General / Dirección de Informática), `executive` (Altos Directivos, métricas de solo lectura), `cashier` (Cajero), `veterinarian` (Médico Veterinario) y visitantes/niños desde 6 años como público anónimo. Los roles describen acceso al sistema, no asignan responsabilidades al equipo de desarrollo.

## Arquitectura propuesta

```mermaid
flowchart LR
  Visitor[Visitante] --> Mobile[apps/mobile<br/>React Native]
  Visitor --> Web[apps/web<br/>React 19 + Vite]
  Staff[Personal del zoológico] --> Dashboard[apps/dashboard<br/>React 19 + Vite]
  Vet[Personal veterinario] --> PWA[apps/pwa<br/>React 19 + Vite + offline]
  Mobile --> Client[@arca/api-client]
  Web --> Client
  Dashboard --> Client
  PWA --> Client
  Client --> API[apps/api<br/>Laravel 12 API]
  API --> MySQL[(MySQL 8<br/>Cloud SQL administrado)]
  API -.solo lectura.-> ThemeDB[(MySQL externo<br/>settings_colores / mysql2)]
  API -.disco intercambiable.-> Storage[Almacenamiento Google Cloud<br/>detrás de Laravel Filesystem]
  Local[MySQL Server local] -.migración portable<br/>solo cambia .env.-> API
```

La API centraliza autenticación, permisos y lógica; las SPAs usan Sanctum con cookie y la app móvil usa tokens. `settings_colores` se consulta con la conexión `mysql2` en solo lectura. La BD principal usa MySQL 8 estándar, con configuración exclusiva por `.env`; no se incorporan SDK de Google Cloud a la lógica de negocio. Almacenamiento cloud, si se añade, queda detrás de un disco de Laravel intercambiable.

## Stack y versiones de referencia

| Área | Tecnología | Versión / criterio |
|---|---|---|
| API | PHP, Laravel | PHP 8.2+; Laravel 12 |
| Autenticación | Sanctum, Fortify headless | cookie para SPA; tokens para mobile; Fortify ^1.30 |
| Permisos y auditoría | Spatie Permission / Activitylog | ^6.24 / ^4.12 |
| Base de datos | MySQL | 8 estándar; Cloud SQL al inicio, portable a MySQL Server local |
| SPAs | React, React DOM, TypeScript | 19 / 19 / 5.7+ |
| Tooling SPA | Vite, Tailwind CSS | 7 / 4 |
| UI e iconos | shadcn/ui `new-york`, Radix, Lucide | componentes comunes propuestos en `@arca/ui` |
| Calidad | Laravel Pint, PHPUnit, Prettier, ESLint, Vitest | Pint ^1.24; PHPUnit ^11.5; configuración en `docs/06-convenciones.md` |
| Mobile | React Native | Expo propuesto, ADR 0004 pendiente de aprobación |
| PWA offline | IndexedDB con `idb`, `vite-plugin-pwa` | propuestas, ADR 0003 |
| Runtime JS | Node.js | 22 |

Las versiones son decisiones de referencia, no manifiestos instalados. React Router se propone para la navegación SPA; Laravel usa rutas con nombre y `@arca/api-client` tipado. No se usa Inertia ni Wayfinder.

## Estructura del monorepo

```text
apps/
  api/ dashboard/ pwa/ web/ mobile/
    AGENTS.md
    docs/       # documentación local
    specs/      # qué y por qué
    plan/       # diseño técnico
    tasks/      # pasos implementables
    src/        # único lugar de código de la app
packages/
  tokens/ ui/ api-client/ config/ assets/  # propuesta @arca/*; assets sin binarios
docs/          # visión, arquitectura, permisos, SDD, convenciones, glosario
  arquitectura/ adr/ templates/
infra/         # diseño de infraestructura, todavía no implementado
.agents/       # skills y hooks de agentes
.devin/        # configuración de hooks
```

Cada app numera sus features independientemente. Una feature usa el mismo `NNN-slug.md` en `specs/`, `plan/` y `tasks/`; el detalle está en [flujo SDD](docs/05-flujo-sdd.md).

## Flujo SDD resumido

Antes de cambiar código, se aprueba una spec; después se redactan el plan con revisión de los seis principios de la Constitución y las tareas T-xx vinculadas a criterios CA-xx. Se implementa en `src/`, con al menos un test automatizado por CA-xx, y se verifica antes del PR. La guía normativa está en [docs/05-flujo-sdd.md](docs/05-flujo-sdd.md); los formatos están en `docs/templates/`.

## Índice de documentación

- [Visión y alcance](docs/01-vision-y-alcance.md)
- [Arquitectura](docs/02-arquitectura.md)
- [Roles y permisos](docs/03-roles-y-permisos.md)
- [Sistema de diseño](docs/04-sistema-de-diseno.md)
- [Flujo SDD](docs/05-flujo-sdd.md)
- [Convenciones](docs/06-convenciones.md)
- [Glosario](docs/07-glosario.md)
- [Patrones arquitectónicos](docs/08-patrones-arquitectonicos.md)
- [Vistas de arquitectura](docs/arquitectura/README.md)
- [ADRs](docs/adr/README.md) · [Plantilla de spec](docs/templates/spec.md) · [Plantilla de arquitectura por app](docs/templates/arquitectura-app.md)

## Agentes de IA

- `AGENTS.md` y los `apps/<app>/AGENTS.md` establecen reglas breves por alcance; `CONSTITUTION.md` contiene los seis principios innegociables.
- `.agents/skills/` contiene flujos invocables: `sdd-spec`, `sdd-plan`, `sdd-tasks`, `sdd-implement`, `constitution-check`, `api-endpoint`, `spa-page`, `ui-component`, `theme-colors` y `verify`.
- `.agents/hooks/` aloja scripts Node ESM sin dependencias para contexto, guardarraíles, formato y control al finalizar.
- `.devin/hooks.v1.json` conecta esos scripts a Devin CLI. Los hooks no sustituyen el SDD ni la revisión del equipo.

## Trabajo y prerrequisitos

El equipo de seis integrantes usa las ramas indicadas `jonathan`, `ian`, `victor`, `Diego`, `Esteban` y `Felipe`; no se asignan responsabilidades por nombre en esta documentación. Las ramas de integración son `develop` y `main`; las ramas de cambio siguen `feat|fix/<app>-<NNN>-<slug>`. Commits Conventional Commits en inglés; PRs enlazan spec, plan y tasks.

Para iniciar desarrollo se requiere PHP 8.2+, Composer, Node.js 22 y MySQL 8. Docker Compose local se incorporará más adelante; las apps y dependencias aún no están inicializadas. No instales dependencias ni guardes secretos en el repositorio sin una tarea aprobada. Consulta [convenciones](docs/06-convenciones.md) e [infraestructura](infra/README.md).
