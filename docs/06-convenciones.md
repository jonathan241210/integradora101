# Convenciones de desarrollo

## Idioma e identificadores

Código, nombres de paquetes, archivos fuente, rutas, permisos, tablas, ramas técnicas y mensajes de commit van en inglés. UI, textos al usuario, specs, planes, tareas y documentación van en español con acentos correctos. Se conservan sin traducir las keys externas de `settings_colores`.

Usa PascalCase para componentes/tipos/clases, camelCase para variables y funciones, kebab-case para slugs de artefactos y recursos de URL; nombres de permisos son `<resource>.<action>`. Mantén nombres de migración y tests descriptivos. Un paquete compartido usa scope `@arca/*`.

## Ramas y revisión

Las ramas de integración son `main` y `develop`. Las ramas de trabajo siguen `feat|fix/<app>-<NNN>-<slug>` (por ejemplo `feat/api-003-ticket-sale` y `fix/pwa-008-draft-sync`). NNN coincide con la spec de la app. No integrar sin PR revisado, aprobación de artefactos y CI en verde.

Usa Conventional Commits en inglés: `feat(api): add ticket sale`, `fix(pwa): preserve offline draft`, `docs(sdd): clarify acceptance criteria`. Incluye el identificador `<app>-NNN` en la descripción/cuerpo cuando el cambio implementa una feature. El PR incluye enlaces a spec, plan y tasks, resumen, pruebas y riesgos.

## Formato y calidad

| Herramienta | Convención de referencia |
|---|---|
| Laravel Pint | preset `laravel`, configuración equivalente a `pint.json` con `preset: laravel`; formato de API PHP |
| Prettier | `semi: true`, `singleQuote: true`, `printWidth: 80`, `tabWidth: 4`; YAML con indentación 2 |
| Prettier plugins | `prettier-plugin-organize-imports` y `prettier-plugin-tailwindcss`; funciones `clsx` y `cn` reconocidas |
| ESLint | flat config; reglas recomendadas de JS, TypeScript, React, React Hooks e imports |
| `import/order` | `builtin → external → internal → parent → sibling → index`, separado por línea vacía y alfabético ascendente |
| TypeScript | `strict: true`, `noEmit: true`, resolución `bundler` |
| EditorConfig | UTF-8, LF, cuatro espacios, newline final, recortar espacios finales (excepto Markdown); YAML con dos espacios |

Los comandos previstos se declararán en los manifiestos cuando las apps se inicialicen: API `composer lint`, `composer test:lint`, `composer test`; clientes `npm run format`, `npm run format:check`, `npm run lint`, `npm run types`, `npm test`. PHPUnit valida API; Vitest valida lógica de clientes. No ejecutar comandos inexistentes como si fueran verificación aprobada.

## Arquitectura de código

- Laravel: Actions para lógica de negocio; Form Requests, API Resources, Policies, permisos Spatie, rutas con `->name()`. Modelos de dominio extienden `BaseModel` si requieren auditoría `created_by`/`updated_by` y activity log; las migraciones crean las columnas necesarias. Usar SoftDeletes para información clínica y financiera y proteger comandos destructivos en producción.
- Fortify se integra headless; Sanctum gestiona autenticación de clientes. No usar Inertia ni Wayfinder.
- React SPA: alias `@/`, `@arca/ui`, hooks vía `@arca/api-client`, UI en español y componentes accesibles; React Router es propuesta del ADR 0002, no dependencia aprobada.
- PWA: persistir solo borradores offline y sincronizarlos mediante el contrato de API aprobado.
- MySQL: MySQL 8.0.x (revisión mínima pendiente del inventario inicial); migraciones Laravel como única fuente de esquema, creadas, probadas y aplicadas por el responsable de BD tras una DBR aprobada; funciones y procedimientos almacenados solo de forma excepcional, justificados, versionados en migraciones y con las reglas principales en Actions; vistas y triggers no autorizados; conexión externa `mysql2` de solo lectura y configuración por `.env`.
- UI: tokens semánticos; nunca colores de marca hex/oklch directos en componentes. Iconos `lucide-react` en web; `cn()` según convención de UI compartida.

## Política de dependencias y seguridad

Una librería o tecnología nueva requiere ADR aprobado. No añadir dependencias ni inicializar workspaces sin spec/plan/tasks y aprobación. No guardar secretos; `.env.example` contiene solo valores de muestra. No modificar `vendor/`, `node_modules/` ni código generado. No relajar validación, autenticación, rate limiting, auditoría o resguardos destructivos para conseguir que una tarea pase.
