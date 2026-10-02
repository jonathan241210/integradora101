# Análisis de PLANTILLA_V4_Con colores

Documento de referencia generado a partir de la plantilla del equipo.
Sirve como base para crear **skills**, **rules (AGENTS.md)** y **hooks** de agentes de IA (Devin CLI), y como guía de estándares para desarrollar la página web y la app web del proyecto.

---

## 1. Resumen ejecutivo

La plantilla es el **Laravel React Starter Kit** (Laravel 12) personalizado por el equipo:

- **Backend:** Laravel 12, PHP 8.2+, Fortify (auth completa con 2FA), Spatie Permission (roles/permisos), Spatie Activitylog (auditoría).
- **Frontend:** React 19 + TypeScript + Inertia.js v2 (no es API REST ni Blade: las vistas son componentes React renderizados por Inertia).
- **Estilos:** Tailwind CSS v4 (config CSS-first, sin `tailwind.config.js`) + shadcn/ui estilo `new-york` + Radix UI + Lucide.
- **Build:** Vite 7 con SSR, React Compiler, Laravel Wayfinder (rutas PHP tipadas en TS).
- **Tema dinámico:** los colores de marca se leen desde una segunda base de datos MySQL (`settings_colores`) y se inyectan como CSS variables en runtime.
- **Idioma de UI y dominio:** español (`"Administración de usuarios"`, permisos tipo `'ver usuarios'`, roles `admin` / `usuario`).

---

## 2. Stack y versiones (referencia exacta)

### Backend (`composer.json`)

| Paquete | Versión | Uso |
|---|---|---|
| `laravel/framework` | ^12.0 | Framework |
| `inertiajs/inertia-laravel` | ^2.0 | Puente Laravel ↔ React |
| `laravel/fortify` | ^1.30 | Login, registro, 2FA, reset password, verificación email |
| `laravel/wayfinder` | ^0.1.9 | Genera `resources/js/actions` y `resources/js/routes` (rutas tipadas) |
| `spatie/laravel-permission` | ^6.24 | Roles y permisos |
| `spatie/laravel-activitylog` | ^4.12 | Bitácora de cambios en modelos |
| `laravel/pint` | ^1.24 | Lint PHP (preset `laravel`) |
| `phpunit/phpunit` | ^11.5.3 | Tests |

### Frontend (`package.json`)

| Paquete | Versión | Uso |
|---|---|---|
| `react` / `react-dom` | ^19.2 | UI |
| `@inertiajs/react` | ^2.3.7 | Páginas, `<Link>`, `router`, `usePage`, `<Head>` |
| `tailwindcss` | ^4.0 | Estilos (v4, CSS-first con `@theme`) |
| `tw-animate-css` | ^1.4 | Animaciones |
| `@radix-ui/react-*` | varios | Primitivas accesibles (dialog, select, dropdown…) |
| `class-variance-authority` + `clsx` + `tailwind-merge` | — | Patrón `cn()` de shadcn (`@/lib/utils`) |
| `lucide-react` | ^0.475 | Iconos (única librería de iconos permitida por `components.json`) |
| `ziggy-js` | ^2.6 | Rutas nombradas de Laravel en JS |
| `vite` | ^7.0.4 | Build + dev server + SSR |
| `typescript` | ^5.7.2 | Tipado estricto |
| `babel-plugin-react-compiler` | ^1.0 | React Compiler activado en `vite.config.ts` |

> Nota: `@headlessui/react` también está instalado (viene del starter kit) pero los componentes `ui/` son Radix/shadcn. Preferir los componentes de `@/components/ui`.

---

## 3. Estructura de carpetas relevante

```
app/
  Actions/Fortify/         # CreateNewUser, ResetUserPassword
  Concerns/                # Traits de validación (PasswordValidationRules, ProfileValidationRules)
  Http/
    Controllers/           # UserController + Settings/*
    Middleware/            # AdminMiddleware (alias 'admin'), HandleAppearance, HandleInertiaRequests
    Requests/Settings/     # Form requests de settings
  Listeners/               # LogFailedLogin, LogSuccessfulLogin, LogSuccessfulLogout (auditoría)
  Models/                  # BaseModel, User, Setting, images
  Providers/               # AppServiceProvider, EventServiceProvider, FortifyServiceProvider

resources/
  css/app.css              # TEMA: tokens CSS variables (light + dark) — archivo central de diseño
  js/
    app.tsx                # Bootstrap Inertia + ThemeProvider
    ssr.tsx                # Entry SSR
    actions/               # GENERADO por Wayfinder (en .gitignore, no editar)
    routes/                # GENERADO por Wayfinder (en .gitignore, no editar)
    wayfinder/             # GENERADO (no editar)
    components/            # Componentes de la app (app-*, nav-*, etc.)
    components/ui/         # Componentes shadcn/ui (button, card, dialog, sidebar…)
    hooks/                 # use-appearance, use-mobile, use-clipboard, use-initials…
    layouts/               # app-layout, auth-layout, settings/layout + variantes
    lib/utils.ts           # cn()
    pages/                 # Páginas Inertia (welcome, dashboard, auth/*, settings/*, Usuarios/Index)
    types/index.d.ts       # SharedData, User, Auth, NavItem, BreadcrumbItem
  views/app.blade.php      # Root template (único blade)

routes/
  web.php                  # home, dashboard, /usuarios (admin)
  settings.php             # perfil, password, appearance, two-factor

database/
  migrations/              # users, cache, jobs, 2FA, permission tables, activity_log
  seeders/                 # DatabaseSeeder → RolesAndPermissionsSeeder + UsersSeeder
  factories/UserFactory.php
```

---

## 4. Sistema de diseño (colores, tema, UI)

### 4.1 Arquitectura del tema

Hay **dos capas** de tema:

1. **Tema estático** en `resources/css/app.css`:
   - Tailwind v4 con `@theme` que mapea tokens semánticos a CSS variables.
   - `:root` define el tema claro, `.dark` el oscuro (variante `@custom-variant dark (&:is(.dark *))`).
   - Todos los colores en formato **oklch**.
   - Fuente: **Instrument Sans** (Bunny Fonts, cargada en `app.blade.php`).
   - Radio base: `--radius: 0.625rem`.
   - Tokens personalizados del equipo además de los estándar shadcn: `sidebar-*` y **`footer-*`** (footer es un bloque propio con su propia paleta).

2. **Tema dinámico desde BD** (lo "Con colores" de la plantilla):
   - `Setting` (modelo) apunta a la conexión **`mysql2`**, tabla **`settings_colores`** (`key` / `value`).
   - `HandleInertiaRequests` comparte la prop `theme` a TODAS las páginas (cacheada 1 hora con `Cache::remember`).
   - `ThemeProvider.tsx` la aplica con `document.documentElement.style.setProperty`.

### 4.2 Claves de `settings_colores` (convención del equipo)

| Key en BD | CSS variable que controla | Uso |
|---|---|---|
| `color-base` | `--sidebar` | Fondo del sidebar |
| `color-primario` | `--primary`, `--sidebar-primary`, `--footer-*` | Color de marca principal |
| `color-secundario` | `--secondary`, `--footer` | Secundario / fondo footer |
| `color-complemento` | `--accent` | Acentos |
| `colorFuenteB` | `--foreground` (claro), `-foreground` varios | "Fuente Blanca" / texto claro |
| `colorFuenteN` | `--foreground` / `--primary-foreground` | "Fuente Negra" / texto oscuro |
| `tamanio-texto` | `font-size` del root | Tamaño base de texto |
| `fuente` | cssText de `body` | Familia tipográfica |

> Regla práctica: en componentes **nunca usar hex/oklch directos** para colores de marca; usar clases semánticas (`bg-primary`, `text-foreground`, `border-border`, `bg-sidebar`, `bg-footer`, `text-muted-foreground`, `bg-destructive`…) para que el tema dinámico funcione.
>
> **Precisión importante:** la app **fuerza el modo claro siempre**. En `resources/js/hooks/use-appearance.tsx`, `currentAppearance`, `getStoredAppearance()` y `updateAppearance()` están hardcodeados a `'light'`, por lo que el selector de apariencia y el cookie `appearance` se ignoran. Los tokens `.dark` en `app.css` existen pero **no se activan** salvo que se modifique ese hook.

### 4.3 Dark mode

- Controlado por cookie `appearance` (`light` / `dark` / `system`) vía middleware `HandleAppearance` + hook `use-appearance` + `appearance-tabs.tsx`.
- `app.blade.php` tiene script inline anti-flash que aplica `.dark` antes de pintar.
- Al escribir variantes dark en clases: `dark:bg-green-900` (patrón usado en `Usuarios/Index.tsx`).

### 4.4 Componentes UI

- shadcn/ui estilo **new-york**, `baseColor: neutral`, con CSS variables, alias `@/components`, `@/components/ui`, `@/lib/utils`, `@/hooks`.
- Ya instalados: alert, avatar, badge, breadcrumb, button, card, checkbox, collapsible, dialog, dropdown-menu, icon, input, input-otp, label, navigation-menu, select, separator, sheet, sidebar, skeleton, spinner, toggle, toggle-group, tooltip.
- Para agregar nuevos: `npx shadcn@latest add <componente>` (respeta `components.json`).
- Iconos: **solo `lucide-react`**.
- Helper de clases: `cn()` desde `@/lib/utils` (Prettier ordena clases Tailwind dentro de `cn` y `clsx`).

### 4.5 Layouts disponibles

| Layout | Archivo | Uso |
|---|---|---|
| `AppLayout` | `layouts/app-layout.tsx` | Layout autenticado; recibe `breadcrumbs`; variante sidebar (`app-sidebar-layout`) o header (`app-header-layout`) |
| `AuthLayout` | `layouts/auth-layout.tsx` | Login/registro/etc.; variantes simple / card / split |
| `SettingsLayout` | `layouts/settings/layout.tsx` | Secciones internas con nav lateral de settings |
| `Heading` | `components/heading.tsx` | Título + descripción de sección (`variant="small"`) |

---

## 5. Base de datos y backend

### 5.1 Dos conexiones de BD

| Conexión | Driver | Para qué |
|---|---|---|
| `default` (`DB_CONNECTION`) | `mysql` en `.env` real (`sqlite` en `.env.example`) | App: users, roles, permisos, activity_log, cache, jobs, sessions |
| `mysql2` | mysql (`DB_HOST2`, `DB_DATABASE2`, `DB_USERNAME2`, `DB_PORT2`, `DB_PASSWORD2`) | **Tablas de configuración visual externas**: `settings_colores`, `settings_imagenes` |

> OJO: `.env` actual **no define** las variables `DB_*2`, así que `mysql2` cae a defaults (`127.0.0.1` / `database2`). Al levantar el proyecto hay que agregarlas. Las tablas `settings_*` **no tienen migraciones** en el repo (viven en la BD externa).

### 5.2 Convenciones de modelos

- `BaseModel` (`app/Models/BaseModel.php`): modelo base que auto-rellena `created_by` / `updated_by` con `auth()->id()` en `creating`/`updating`, y define `getActivitylogOptions()` (`logName: system`, `logAll`, `logOnlyDirty`). **Los modelos de negocio nuevos deberían extender `BaseModel`** si se quiere auditoría (requiere columnas `created_by`/`updated_by` en la tabla).
- `User`: `HasRoles` (Spatie) + `TwoFactorAuthenticatable` (Fortify) + `HasFactory`, `Notifiable`. `password => 'hashed'` en casts.
- `Setting`: `key`/`value` con helpers estáticos `Setting::get($key, $default)` y `Setting::set($key, $value)`.
- `images` (nombre de clase en minúscula, tabla `settings_imagenes` en mysql2).

### 5.3 Roles y permisos (Spatie, en español)

- Roles semilla: **`admin`** (todos los permisos) y **`usuario`** (solo `ver usuarios`).
- Permisos semilla: `ver usuarios`, `crear usuarios`, `editar usuarios`, `eliminar usuarios`.
- Patrón para módulos nuevos: permisos `ver|crear|editar|eliminar <recurso>` en español, creados con `firstOrCreate`, asignados con `givePermissionTo`.
- Protección de rutas admin: middleware alias **`admin`** (`AdminMiddleware`: chequea `roles->contains('name','admin')`, abort 403). Registrado en `bootstrap/app.php`.
- Roles compartidos al frontend: `auth.roles` en props de Inertia (`HandleInertiaRequests`).

### 5.4 Patrón controlador → página Inertia

```php
return inertia('Usuarios/Index', [
    'usuarios' => fn () => $usuarios,          // closures para props lazy
    'filters'  => ['search' => $search],
]);
```

- `Inertia::render('carpeta/pagina')` resuelve a `resources/js/pages/carpeta/pagina.tsx`.
- Paginación: `->paginate(20)->appends($request->query())`.
- Flash messages: `->with('success', '...')` — el front los lee con `usePage().props`.
- Rutas **siempre con nombre** (`->name('usuarios.index')`) — Wayfinder genera helpers TS por ruta nombrada.
- Validación: Form Requests en `app/Http/Requests` (patrón Settings).
- Auth scaffolding: Fortify ya monta login, registro, 2FA (QR + recovery codes), reset password, verificación de email, confirmación de password.

### 5.5 Auditoría

- Listeners `LogSuccessfulLogin`, `LogFailedLogin`, `LogSuccessfulLogout` (registrados en `EventServiceProvider`).
- Activity log en tablas `activity_log` (Spatie). Modelos que extiendan `BaseModel` quedan logueados.

---

## 6. Convenciones de frontend (React/Inertia)

- Páginas = `export default function` en `resources/js/pages/`, con `<Head title="..." />` y envueltas en `AppLayout breadcrumbs={...}`.
- Navegación: `<Link>` y `router.get/post(...)` de `@inertiajs/react` con `preserveState` + `replace` para filtros/búsquedas (ver `Usuarios/Index.tsx` como patrón de tabla + búsqueda + paginación).
- Confirmaciones destructivas: `confirm()` nativo antes de `router.post` (patrón actual del equipo).
- Tipos compartidos en `@/types` (`SharedData`, `User`, `BreadcrumbItem`, `NavItem`).
- Textos de UI en **español**.
- Wayfinder/Ziggy: preferir rutas tipadas generadas (`@/routes`, `@/actions`) — se regeneran con el plugin de Vite, están gitignored.
- SSR habilitado (`ssr.tsx`, `npm run build:ssr`, comando `dev:ssr`).

---

## 7. Estándares de código (valores exactos para agentes)

### PHP — Laravel Pint
- `pint.json`: `{ "preset": "laravel" }`. Comando: `composer lint` (auto-fix) / `composer test:lint` (check).

### JS/TS — Prettier (`.prettierrc`)
- `semi: true`, `singleQuote: true`, `printWidth: 80`, `tabWidth: 4` (YAML: 2).
- Plugins: `prettier-plugin-organize-imports` (ordena imports automáticamente) y `prettier-plugin-tailwindcss` (ordena clases; funciones reconocidas: `clsx`, `cn`; stylesheet: `resources/css/app.css`).
- Comandos: `npm run format` / `npm run format:check` (solo `resources/`).

### ESLint (`eslint.config.js`, flat config)
- Base: `js.configs.recommended` + `typescript-eslint` + `react` + `react-hooks` + `eslint-plugin-import`.
- Regla clave: **`import/order`** obligatorio — grupos `builtin → external → internal → parent → sibling → index`, línea en blanco entre grupos, alfabético ascendente.
- Desactivadas: `react/react-in-jsx-scope`, `react/prop-types`, `react/no-unescaped-entities`.
- Ignora: `vendor`, `node_modules`, `public`, `bootstrap/ssr`.
- Comando: `npm run lint` (con `--fix`), `npm run types` (`tsc --noEmit`).

### EditorConfig
- UTF-8, LF, indent 4 espacios, newline final, trim trailing whitespace (excepto `.md`); YAML indent 2.

### Tests
- PHPUnit (`phpunit.xml`), tests Feature (Auth, Settings, Dashboard) + Unit. Comando: `composer test` o `php artisan test`.

### CI (GitHub Actions)
- `lint.yml`: en push/PR a `develop`/`main` → `composer lint` + `npm run format` + `npm run lint`.
- `tests.yml`: matriz PHP 8.4/8.5, Node 22 → build + `phpunit`.
- **Regla derivada:** todo cambio debe pasar `composer lint`, `npm run format`, `npm run lint`, `npm run types` y `php artisan test` antes de subirse.

### Comandos del proyecto

```bash
composer setup          # instalación completa (composer + .env + key + migrate + npm + build)
composer dev            # serve + queue:listen + vite en paralelo
composer lint           # pint --parallel (fix PHP)
composer test           # config:clear + pint --test + artisan test
npm run dev|build|build:ssr|format|format:check|lint|types
```

---

## 8. Qué convertir en SKILL / RULE / HOOK para agentes de IA

Devin CLI soporta tres mecanismos (docs oficiales):

| Mecanismo | Archivo | Cuándo se aplica |
|---|---|---|
| **Rule** (always-on) | `AGENTS.md` en raíz o `.devin/rules/*.md`, `.devin/global_rules.md` | Siempre, en cada sesión. Mantener **corto** |
| **Skill** | `.devin/skills/<nombre>/SKILL.md` | Bajo demanda (`/nombre`) o cuando el modelo lo juzga relevante. Puede correr como subagente |
| **Hook** | `.devin/hooks.v1.json` | Eventos del ciclo de vida: `PreToolUse`, `PostToolUse`, `UserPromptSubmit`, `SessionStart`, `Stop`… |

Recomendación oficial de Devin: **reglas cortas + skills para lo demás** (las rules se inyectan siempre y consumen contexto).

### 8.1 `AGENTS.md` propuesto (raíz del proyecto)

```markdown
# Reglas del proyecto (PLANTILLA_V4)

- Stack: Laravel 12 + Inertia v2 + React 19 + TS + Tailwind v4 + shadcn/ui (new-york). PHP 8.2+.
- UI y dominio en español (labels, flash messages, roles: admin/usuario, permisos "ver usuarios").
- Nunca hardcodear colores de marca: usar tokens semánticos (bg-primary, text-foreground,
  bg-sidebar, bg-footer…). El tema real viene de la tabla settings_colores (conexión mysql2).
- Vistas = páginas Inertia en resources/js/pages dentro de AppLayout/AuthLayout/SettingsLayout.
- Rutas siempre con ->name(); usar helpers Wayfinder/Ziggy en el front (importar desde @/routes/...).
- Rutas de administración bajo middleware ['auth','admin']; permisos con Spatie.
- Modelos de negocio extienden App\Models\BaseModel (auditoría created_by/updated_by +
  activitylog) — crear esas columnas en la migración.
- Iconos solo lucide-react. Componentes solo @/components/ui (shadcn). Clases con cn().
- La app fuerza modo claro: no agregar lógica dark condicional hasta que se habilite en
  use-appearance.tsx.
- usePage().props.auth.user solo expone { id, name }; para más campos modificar
  HandleInertiaRequests::share() y @/types.
- No asumir Listeners de login/logout registrados; verificar EventServiceProvider si se pide auditoría.
- No bajar barreras de seguridad (DB::prohibitDestructiveCommands en prod, Fortify password rules).
- Antes de terminar: composer lint, npm run format, npm run lint, npm run types, php artisan test.
- No editar archivos generados: resources/js/{actions,routes,wayfinder}, vendor, public/build.
- No commitear .env ni secretos. Credenciales de seeders son solo para desarrollo.
```

### 8.2 Skills propuestas (`.devin/skills/`)

| Skill | Propósito | Contenido clave del SKILL.md |
|---|---|---|
| `pagina-inertia` | Crear página + ruta + controlador | Patrón: ruta nombrada en `web.php`, método en controller con `inertia()` + props lazy, página en `pages/` con `AppLayout` + `breadcrumbs` + `<Head>` + `Heading`, tipos en `@/types`, español en UI |
| `crud-modulo` | CRUD completo de un recurso | Migración (+`created_by`/`updated_by`), modelo extendiendo `BaseModel`, permisos `ver/crear/editar/eliminar <recurso>` en seeder, rutas `Route::resource` con nombre bajo `['auth','admin']` si aplica, páginas Index/Create/Edit siguiendo `Usuarios/Index.tsx` (búsqueda con `preserveState`, paginación, flash) |
| `componente-ui` | Agregar componente shadcn | `npx shadcn@latest add <comp>`, alias `@/`, `cn()`, tokens semánticos, lucide |
| `tema-colores` | Trabajar con el sistema de tema | Explicar `settings_colores` (keys en §4.2), `ThemeProvider`, tokens `sidebar-*`/`footer-*`, dark mode por clase `.dark`, oklch en `app.css` |
| `bd-modelo` | Modelo + migración + factory + seeder | Convenciones Laravel 12, `BaseModel`, casts como método, seeders con `firstOrCreate`, roles Spatie |
| `verificar` | Checklist pre-commit del equipo | Correr `composer lint`, `npm run format`, `npm run lint`, `npm run types`, `php artisan test`; reportar fallos |
| `auth-permisos` | Proteger rutas/acciones | Middleware `admin`, `$user->can('permiso')`, gates/policies, chequeo de `auth.roles` en front |

**Ejemplo de SKILL.md** (formato real Devin CLI):

```markdown
---
name: pagina-inertia
description: Crear una página Inertia siguiendo los estándares del equipo
argument-hint: "<NombrePagina> [ruta]"
allowed-tools:
  - read
  - edit
  - grep
  - glob
  - exec
---

Crea una página Inertia nueva con el nombre que indique el usuario:

1. Lee resources/js/pages/Usuarios/Index.tsx como referencia de patrón.
2. Crea resources/js/pages/<Nombre>.tsx: export default function, AppLayout con
   breadcrumbs, <Head title>, Heading con título y descripción en español.
3. Agrega la ruta en routes/web.php con ->name() y middleware adecuado
   (['auth','verified'] o ['auth','admin']).
4. Si necesita datos, crea el método en el controlador usando inertia() con
   props lazy (fn () => ...).
5. Usa solo componentes de @/components/ui, clases semánticas de tema
   (bg-primary, text-foreground, border-border) e iconos lucide-react.
6. Ejecuta npm run types y npm run format al final.
```

### 8.3 Hooks propuestos (`.devin/hooks.v1.json`)

Ideas útiles para este proyecto:

```json
{
  "PostToolUse": [
    {
      "matcher": "edit|write",
      "hooks": [
        {
          "type": "command",
          "command": "node ./scripts/format-changed.mjs",
          "timeout": 30
        }
      ]
    }
  ],
  "PreToolUse": [
    {
      "matcher": "exec",
      "hooks": [
        {
          "type": "command",
          "command": "node ./scripts/block-dangerous.mjs",
          "timeout": 10
        }
      ]
    }
  ],
  "SessionStart": [
    {
      "matcher": "",
      "hooks": [
        {
          "type": "prompt",
          "prompt": "Inject a short reminder: this repo is Laravel 12 + Inertia + React + Tailwind v4 + shadcn. UI in Spanish, theme tokens only, run pint/prettier/eslint before finishing."
        }
      ]
    }
  ]
}
```

- **PostToolUse → auto-format**: tras cada `edit`/`write`, correr `vendor/bin/pint` sobre `.php` tocados y `npx prettier --write` sobre `resources/` (script que lea `tool_input.file_path` del JSON de stdin).
- **PreToolUse → guardarraíl**: bloquear (exit `2` o `{"decision":"block"}`) comandos destructivos o escrituras en `vendor/`, `node_modules/`, `resources/js/actions|routes|wayfinder` (generados) y `.env`.
- **Stop → verificación**: al querer terminar, un hook que recuerde correr la suite (`composer lint`, `npm run lint`, `npm run types`, `php artisan test`) — o ejecutarla y bloquear el stop si falla.
- **UserPromptSubmit → contexto dinámico**: inyectar `additionalContext` con el branch actual o recordatorios según palabras clave del prompt.

Formato de bloqueo por stdout: `{"decision": "block", "reason": "..."}`. Inyección de contexto: `{"hookSpecificOutput": {"hookEventName": "...", "additionalContext": "..."}}`.

---

## 9. Observaciones y riesgos detectados (para discutir con el equipo)

1. **`UserController::resetPassword` fija la contraseña a `"12345"`** y `UsersSeeder` usa `12345` para admin y 30 usuarios — aceptable en dev, riesgo si llega a producción.
2. **Tablas `settings_colores` / `settings_imagenes` sin migraciones** y conexión `mysql2` sin variables `DB_*2` documentadas en `.env.example` — cualquier entorno nuevo fallará al leer el tema (aunque `ThemeProvider` tolera `theme` vacío).
3. **`usePage().props as any`** para `flash` en `Usuarios/Index.tsx` — falta tipar `flash` en `SharedData` y compartirlo en `HandleInertiaRequests` (hoy `with('success')` llega pero sin tipo).
4. **`BaseModel` existe pero `User`/`Setting`/`images` no lo extienden** — la auditoría `created_by`/`updated_by` solo aplica a modelos nuevos; requiere columnas en migración.
5. **Clase `images` en minúscula** rompe convención PSR-4/`StudlyCase` (Pint no lo corrige).
6. **Indentación inconsistente** en algunos PHP (`UserController`, `HandleInertiaRequests`) — se normaliza con `composer lint`.
7. `.env` está correctamente gitignored; `APP_URL=http://plantillaprincipal.test` sugiere Laravel Herd.
8. Permisos definidos (`crear/editar/eliminar usuarios`) **aún no se verifican** en ningún lado — solo existe el chequeo de rol `admin` por middleware.
9. **Modo oscuro deshabilitado en código:** `use-appearance.tsx` fuerza `'light'` siempre; los tokens `.dark` en CSS no se aplican actualmente.
10. **Conflicto en props compartidas:** `AppServiceProvider` intenta compartir `auth.user` completo, pero `HandleInertiaRequests` lo sobrescribe con `{ id, name }`; cualquier feature que necesite más datos del usuario debe actualizar ambos lados.
11. **Listeners de auditoría de login/logout no registrados** en `EventServiceProvider`, por lo que la bitácora de autenticación no funciona aunque las clases existan.
12. **Wayfinder genera helpers tipados** en `resources/js/routes`, pero `SettingsLayout` aún usa un `href` string literal (`/usuarios`) en lugar del helper generado.

---

## 10. Checklist para crear la web/app sobre esta plantilla

- [ ] Copiar `.env.example` → `.env`, `php artisan key:generate`, configurar `DB_*` (app) y `DB_*2` (settings_colores).
- [ ] `composer install && npm install` (o `composer setup`).
- [ ] `php artisan migrate --seed` (crea admin@admin.com / 12345 + 30 usuarios de prueba).
- [ ] Verificar que `settings_colores` existe en la BD mysql2 y tiene las 8 keys (§4.2).
- [ ] `composer dev` → app + queue + vite; opcional `composer dev:ssr`.
- [ ] Crear `.devin/skills/` + `AGENTS.md` + `.devin/hooks.v1.json` según §8.
- [ ] Al agregar campos auth compartidos, actualizar `HandleInertiaRequests::share()` y `SharedData` en `@/types`.
```

---

---

## 11. Revisión adicional: precisiones críticas para SDD (Spec-Driven Development)

Tras una segunda pasada al código se encontraron detalles que deben regirse en las especificaciones y en las skills del agente:

### 11.1 Modo oscuro realmente deshabilitado

- `resources/js/hooks/use-appearance.tsx` fuerza `currentAppearance = 'light'`, `getStoredAppearance() => 'light'` e ignora el parámetro recibido en `updateAppearance()`.
- El cookie `appearance` y el middleware `HandleAppearance` existen, pero **no tienen efecto** en la UI actual.
- **Regla para SDD:** no agregar lógica condicional `dark:` para colores de marca ni esperar que el usuario cambie a dark mode hasta que el equipo modifique `use-appearance.tsx`. Sí se puede usar `dark:` para estados de error/flash (`dark:bg-green-900`) si se desea, pero la app siempre renderizará en modo claro.

### 11.2 Props compartidas de Inertia: conflicto en `auth`

- `AppServiceProvider::boot()` comparte `auth` con el usuario completo (`auth()->user()`).
- `HandleInertiaRequests::share()` **sobrescribe** esa clave con `auth.user` limitado a `id` y `name`.
- Resultado: en el frontend, `usePage().props.auth.user` solo tiene `{ id, name }`.
- Prop adicional real: `settings_imagenes` (compartida desde `AppServiceProvider`, proviene de `Setting::pluck('value','key')` en mysql2).
- `theme` sigue compartida desde `HandleInertiaRequests` y cacheada 1 hora.
- **Regla para SDD:** si un feature requiere más campos del usuario en el frontend, actualizar `HandleInertiaRequests::share()` **y** `resources/js/types/index.d.ts` (`User` / `SharedData`).

### 11.3 Listeners de auditoría no están registrados

- Existen `LogSuccessfulLogin`, `LogFailedLogin`, `LogSuccessfulLogout`, pero `app/Providers/EventServiceProvider.php` tiene `$listen = []`.
- **Regla para SDD:** si una especificación pide "auditoría de login/logout", registrar manualmente los eventos en `EventServiceProvider`.

### 11.4 Fortify: features y rate limiting

Features habilitadas (`config/fortify.php`):
- `registration()`
- `resetPasswords()`
- `emailVerification()`
- `twoFactorAuthentication(['confirm' => true, 'confirmPassword' => true])`

Rate limiting:
- Login: 5 intentos/min por combinación email+IP.
- Two-factor: 5 intentos/min.
- `home => '/dashboard'`.

### 11.5 Convenciones de rutas con Wayfinder / Ziggy

- Generar helpers tipados: se importan desde `@/routes/<nombre>` o `@/routes`.
- Ejemplos reales en la plantilla:
  - `import { dashboard } from '@/routes';` → `href: dashboard()`
  - `import { edit } from '@/routes/profile';` → `href: edit()`
  - `import { show } from '@/routes/two-factor';` → `href: show()`
- Uso con `<Link>`: `<Link href={dashboard()} prefetch>`.
- **Regla para SDD:** preferir helpers Wayfinder sobre strings literales para rutas nombradas. Ejemplo incorrecto: `href="/usuarios"` (usado hoy en `SettingsLayout` para admin, pero debería usar Wayfinder).

### 11.6 Estructura de layouts y navegación

- `AppLayout` → `app-sidebar-layout.tsx`: `AppShell` + `AppSidebar` (`NavMain`, `NavUser`, `NavFooter`) + `AppContent` + `AppSidebarHeader` (breadcrumbs) + `AppFooter`.
- `NavMain` recibe un array `NavItem[]` con `title`, `href` (helper Wayfinder o string), `icon` (Lucide).
- `SettingsLayout` recibe children; agrega nav lateral con items de perfil/contraseña/2FA + admin condicional por `auth.roles`.
- `SettingsLayout` incluye un **SSR safeguard**: `if (typeof window === 'undefined') return null;`.
- **Regla para SDD:** nuevas secciones autenticadas deben usar `AppLayout breadcrumbs={[...]}`. Secciones de configuración de cuenta deben usar `SettingsLayout`. Secciones de autenticación usan `AuthLayout` (simple/card/split).

### 11.7 Assets y logos

- `public/logo.svg` y `public/logo2.png` son los activos de marca.
- Fuentes se cargan desde Bunny Fonts: `Instrument Sans`.
- `PlaceholderPattern` (`@/components/ui/placeholder-pattern`) es el componente usado para tarjetas vacías en el dashboard.

### 11.8 TypeScript: aliases y strictness

- `tsconfig.json`:
  - `"baseUrl": "."`
  - `"paths": { "@/*": ["./resources/js/*"] }`
  - `"moduleResolution": "bundler"`
  - `"strict": true`, `"noEmit": true`
  - `"include": ["resources/js/**/*.ts", "resources/js/**/*.d.ts", "resources/js/**/*.tsx"]`
- **Regla para SDD:** todo el TS vive bajo `resources/js/`. No importar con rutas relativas largas; usar `@/`.

### 11.9 Seguridad y entorno

- `Date::use(CarbonImmutable::class)` en `AppServiceProvider`.
- `DB::prohibitDestructiveCommands(app()->isProduction())` → migraciones destructivas fallarán en producción.
- Fortify Password defaults: en producción mínimo 12 caracteres con mayúsculas, minúsculas, números, símbolos y sin compromisos (`uncompromised`). En dev no hay regla.
- **Regla para SDD:** no bajar ni modificar estas barreras de seguridad para "hacer que compile".

### 11.10 No hay directorio `lang/`

- Laravel translations no se usan. Todos los textos de UI están hardcodeados en español dentro de los componentes React.
- **Regla para SDD:** agregar textos directamente en el JSX en español.

### 11.11 Mapeo SDD: de especificación a archivos

Para una feature típica "Administrar X", el agente debe generar en este orden:

1. **Migración** (`database/migrations/YYYY_MM_DD_HHMMSS_create_x_table.php`)
   - Campos de negocio.
   - Si hereda de `BaseModel`: agregar `created_by`, `updated_by` nullable foreign key a `users.id`.
   - Timestamps.

2. **Modelo** (`app/Models/X.php`)
   - Extender `BaseModel` si requiere auditoría.
   - `$fillable`, casts como método `casts()`.
   - Relaciones y scopes.

3. **Factory** (`database/factories/XFactory.php`) y **Seeder** si aplica.

4. **Permisos** (`database/seeders/RolesAndPermissionsSeeder.php`)
   - `ver x`, `crear x`, `editar x`, `eliminar x`.
   - Asignar a `admin`; opcionalmente a `usuario` según especificación.

5. **Form Request** (`app/Http/Requests/XRequest.php`) si hay validación no trivial.

6. **Controlador** (`app/Http/Controllers/XController.php`)
   - Métodos CRUD.
   - Usar `inertia('X/Index', ['items' => fn () => ..., 'filters' => ...])`.
   - Búsqueda con `when($search, ...)` y `paginate(20)->appends($request->query())`.
   - Proteger con `middleware(['auth','admin'])` si es admin.

7. **Rutas** (`routes/web.php`)
   - `Route::resource('x', XController::class)->middleware(['auth','admin'])->name('x.')` o rutas individuales con `->name()`.

8. **Páginas Inertia** (`resources/js/pages/X/Index.tsx`, `Create.tsx`, `Edit.tsx`)
   - `AppLayout breadcrumbs={[...]}`.
   - `<Head title="..." />` en español.
   - `Heading title="..." description="..."`.
   - Componentes `@/components/ui/*`, clases semánticas, iconos `lucide-react`.
   - Tablas con `border-border`, `bg-muted` en thead, paginación manual o componente propio.
   - Formularios con validación de Inertia (`errors` de `usePage().props`).

9. **Tipos** (`resources/js/types/index.d.ts`)
   - Agregar interfaz `X` y actualizar `SharedData` si se comparten nuevas props globales.

10. **Tests** (`tests/Feature/XTest.php`)
    - `RefreshDatabase`, `actingAs(User::factory()->create())`.
    - Rutas nombradas, assertions `assertOk()`, `assertRedirect()`, `assertDatabaseHas()`.

11. **Verificación**
    - `composer lint`, `npm run format`, `npm run lint`, `npm run types`, `php artisan test`.

### 11.12 Anti-patrones a evitar (para skills/hooks)

- No usar strings literales para rutas nombradas; usar Wayfinder/Ziggy.
- No hardcodear colores hex/oklch para marca; usar tokens semánticos.
- No agregar columnas a `users` sin tocar `HandleInertiaRequests::share()` y `User` type.
- No extender `Model` directamente si se quiere auditoría; usar `BaseModel`.
- No editar `resources/js/{actions,routes,wayfinder}` (son generados).
- No asumir dark mode habilitado; la app fuerza light.
- No confiar en que los Listeners de login estén registrados; verificar `EventServiceProvider`.
- No commitear `.env` ni secrets.

---
