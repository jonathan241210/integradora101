# API central — reglas de la app

Lee `../../CONSTITUTION.md`, `../../AGENTS.md` y `../../docs/05-flujo-sdd.md` antes de trabajar.

## Carpetas
- `specs/`: qué y por qué; CA-xx, RN-xx y estado.
- `plan/`: solución técnica y Constitution Check.
- `tasks/`: pasos T-xx vinculados con CA-xx.
- `docs/`: referencia específica de la API.
- `src/`: único lugar de código de esta app.
Los tres artefactos usan el mismo `NNN-slug.md`; lee la spec aprobada y el plan antes de implementar.

## Reglas técnicas
- API Laravel 12, PHP 8.2+; única dueña de datos, persistencia y reglas de negocio.
- Mantén controladores JSON delgados: Form Requests → Actions → API Resources.
- Declara rutas en inglés con `->name()`; no uses Inertia ni Wayfinder.
- Autoriza en servidor con Policies y permisos Spatie `<resource>.<action>`.
- Sanctum gestiona cookies para SPAs y tokens para mobile; Fortify funciona headless.
- Los modelos de dominio extienden `BaseModel` cuando requieren auditoría.
- Agrega `created_by`/`updated_by` a la migración cuando el modelo lo requiera.
- Usa SoftDeletes y Activitylog para datos clínicos y financieros; nunca los borres físicamente.
- El esquema cambia solo mediante migraciones Laravel sobre MySQL 8 estándar.
- Configura conexiones únicamente mediante `.env`; la lógica debe ser portable GCP/local.
- `settings_colores` en `mysql2` es fuente externa de solo lectura; no escribir ni migrar esa tabla.
- Protege producción con `DB::prohibitDestructiveCommands` y conserva los controles de seguridad.
- Tests Feature con `RefreshDatabase`; cada CA-xx aparece en al menos un test PHPUnit.
- La lógica de negocio no se traslada a SPAs ni a paquetes clientes.
- No instalar dependencias ni generar manifests sin spec, plan, tasks y aprobación.
