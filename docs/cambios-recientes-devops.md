# Cambios recientes de DevOps: progreso del visitante

**Fecha de integración:** 2026-10-26

**Origen:** PR #48, commits `ee8055b` y `10ce81e`

**Alcance:** API y aplicación móvil para la spec 005 de progreso del visitante.

## API

- Registra descubrimientos QR vinculados a visitantes y recintos; repetir el mismo `client_scan_id` es idempotente.
- Calcula puntos y nivel, actualiza la colección y evalúa misiones y logros.
- Expone operaciones para consultar el progreso, colección, logros y misiones del visitante.
- Valida códigos QR y limita los escaneos nuevos a 30 por minuto.
- Añade modelos, Actions, controlador, solicitudes, configuración, seeders idempotentes y el comando `arca:generate-qr-codes`.
- Incorpora pruebas Feature que cubren los criterios CA-01 a CA-13.

## Aplicación móvil

- Conecta el perfil, colección, logros y misiones con el progreso devuelto por la API.
- Añade una cola local de escaneos para procesarlos cuando vuelve la conexión y vaciarla al eliminar la cuenta.
- Agrega la pantalla de resultado del QR, con estados para descubrimiento nuevo, repetido, código inválido y escaneo vencido.
- Retira los datos simulados de tabla de líderes y recompensas, y agrega pruebas para progreso, sesión, navegación y cola de escaneos.

## Base de datos

Esta integración no crea migraciones. Usa el esquema de progreso ya aprobado en DBR-004 y existente en `apps/api/src/database/migrations/2026_10_15_000004_visitor_progress_schema.php`.

## Verificación local del 2026-10-26

- API: `php artisan test` — 72 pruebas aprobadas y 936 aserciones, usando `arca_pruebas`. No se ejecutaron migraciones.
- Mobile: `npm test -- --runInBand` no inició los casos; Jest no encontró `@react-native-async-storage/async-storage` en `node_modules`. La dependencia figura en `apps/mobile/package.json`, pero no estaba instalada localmente. No se instalaron paquetes.

## Artefactos SDD

- API: `apps/api/specs/005-visitor-progress.md`, `apps/api/plan/005-visitor-progress.md` y `apps/api/tasks/005-visitor-progress.md`.
- Mobile: `apps/mobile/specs/005-visitor-progress.md`, `apps/mobile/plan/005-visitor-progress.md` y `apps/mobile/tasks/005-visitor-progress.md`.
