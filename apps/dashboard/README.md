# Dashboard del Zoológico Nicolás Bravo

SPA de demostración para recorrer las pantallas de administración y taquilla. La interfaz está construida con React, TypeScript y CSS; React genera el HTML en el navegador.

> Esta SPA se conecta a la API Laravel (`apps/api`): el inicio de sesión es real (`dashboard-002`) y las secciones de administración y taquilla leen y escriben datos de la API mediante `/api/v1`. Para usarla necesitas la API en marcha. El buscador y el botón de notificaciones de la barra superior siguen siendo de demostración (ver [`docs/manual-demo.md`](./docs/manual-demo.md)). Orden de arranque completo: [`docs/09-guia-ejecucion-local.md`](../../docs/09-guia-ejecucion-local.md).

## Requisitos

- Node.js y npm.
- Desde la carpeta `apps/dashboard`, acceso a los paquetes locales `packages/ui` y `packages/tokens`, declarados como dependencias del proyecto.

## Instalar y ejecutar

Desde la raíz del repositorio:

```bash
cd apps/dashboard
npm ci
npm run dev
```

Antes, inicia la API (`apps/api/src`, `php artisan serve --host=127.0.0.1 --port=8000`); la configuración de `.env` está en la [guía de ejecución local](../../docs/09-guia-ejecucion-local.md).

Abre **`http://localhost:5174/`** (puerto fijo: `strictPort`; si está ocupado, Vite falla en lugar de cambiar de puerto). Usa `localhost`, no `127.0.0.1`: la API solo emite la cookie de sesión para los hosts de `SANCTUM_STATEFUL_DOMAINS`, y ese valor incluye `localhost:5174`. Vite reenvía `/api` y `/sanctum` a `http://localhost:8000`; para otro destino, define `ARCA_API_PROXY_TARGET` en el entorno antes de `npm run dev`.

## Perfiles de demostración

- **Administración:** panel, noticias, eventos, reporte, modificación de recintos y usuarios de taquilla.
- **Taquilla:** inicia sesión para acceder a venta e historial.

Credenciales ficticias iniciales:

```text
Administración:
Usuario:     administrador@demo.local
Contraseña:  demo1234

Taquilla:
Usuario:     taquilla@demo.local
Contraseña:  demo1234
```

Desde Administración se puede crear un usuario de muestra y probarlo en Taquilla durante la misma carga de la página. Los cambios y cuentas están solo en memoria; se pierden al recargar.

Ambos accesos son simulaciones locales. Las credenciales están incluidas en el código público de la demo y no sirven como autenticación real.

## Diseño

La SPA usa la paleta institucional documentada en [`docs/04-sistema-de-diseno.md`](../../docs/04-sistema-de-diseno.md), mediante los tokens semánticos de `@arca/tokens`. `index.html` es el documento de entrada de Vite y monta React; la interfaz está en `src/`, y los estilos y mapeos de color centralizados en `src/styles.css`. No se consulta `settings_colores` ni la API de tema en este prototipo.

## Comandos

Ejecuta los comandos desde `apps/dashboard`:

```bash
npm run dev       # Iniciar el servidor de desarrollo
npm run types     # Revisar los tipos de TypeScript
npm run build     # Generar la compilación de producción en dist/
npm test          # Ejecutar las pruebas automatizadas con Vitest
```

`npm run lint` y `npm run format:check` no están definidos en este proyecto.

## Arquitectura y documentación

- [Arquitectura de la aplicación](./docs/arquitectura.md): stack, módulos, límites y organización.
- [Manual de la demostración](./docs/manual-demo.md): recorridos de las pantallas, login de prueba y restricciones.
- `src/views/`: componentes de presentación (Views).
- `src/viewmodels/`: estado local y acciones de interfaz (ViewModels).
- `src/data/`: datos estáticos ficticios.
- `src/tests/`: pruebas por criterio de aceptación.
- `src/styles.css`: estilos y adaptación a distintos anchos.

La validación de ambos perfiles es únicamente una simulación de interfaz: no autentica personas ni protege rutas o datos. No se utiliza API, persistencia local, cookies ni base de datos.
