# Manual de autenticación y demostración del dashboard

## Requisitos previos

- Las cuentas demo de `api-003` deben estar sembradas en `arca_pruebas` por la persona responsable de BD.
- La API local debe tener `.env` configurado para `arca_pruebas`, `SANCTUM_STATEFUL_DOMAINS` con `localhost:5174` y `CORS_ALLOWED_ORIGINS` con `http://localhost:5174`.
- La contraseña común de las cuentas demo se configura mediante `DEMO_STAFF_PASSWORD` fuera del repositorio. No se versiona y se comparte por un canal externo. Este manual no contiene contraseñas.

## Iniciar localmente

Terminal 1, API:

```bash
cd apps/api/src
php artisan serve --port=8000
```

Terminal 2, dashboard:

```bash
cd apps/dashboard
npm run dev
```

Abre la dirección que indique Vite, normalmente `http://localhost:5174`. El proxy envía `/api` y `/sanctum` a `http://localhost:8000`. Si la API usa otro destino local, configura `ARCA_API_PROXY_TARGET` en el proceso de Vite.

## Cuentas demo

Las seis cuentas comparten `DEMO_STAFF_PASSWORD`. No pegues ni guardes ese valor en el repo, documentación, capturas o tickets.

| Cuenta | Perfil | Resultado |
|---|---|---|
| `presidencia@arca.local` | `admin` | Administración; 2FA obligatorio |
| `admin@arca.local` | `admin` | Administración; 2FA obligatorio |
| `direccion_zoo@arca.local` | `zoo-admin` | Administración según permisos; 2FA obligatorio |
| `ejecutivo@arca.local` | `executive` | Panel y reporte de solo lectura |
| `boletaje@arca.local` | `cashier` | Venta e historial de muestra |
| `veterinario@arca.local` | `veterinarian` | Redirección a la PWA |

## Login y segundo factor

1. Escribe el correo institucional y la contraseña demo.
2. `admin` y `zoo-admin` configuran su segundo factor en el primer acceso: instala una app autenticadora, escanea el QR y confirma con el código de seis dígitos.
3. Guarda los códigos de recuperación cuando se muestran; el dashboard los descarta al seleccionar **Ya guardé mis códigos**.
4. En los siguientes accesos, completa el reto con un código TOTP o uno de recuperación.
5. «Salir» cierra la sesión de la API y devuelve al login.

El mensaje de credenciales incorrectas es genérico. Los errores de límite de intentos incluyen el tiempo de espera. Si la sesión expira, vuelve al login con «Tu sesión expiró».

## Navegación y límites de la demostración

La API entrega `home` y permisos; el dashboard solo muestra las secciones asociadas:

- `administration`: Panel, Noticias, Eventos, Reporte, Recintos y Usuarios según permisos.
- `executive`: Panel y Reporte.
- `ticket`: Venta e Historial, con fixtures de muestra.
- `pwa`: la sesión veterinaria se dirige a `pwa_url`. Si la URL no está configurada, se informa que la aplicación no está disponible y no se redirige.

Noticias, eventos, reporte, recintos, usuarios, venta e historial continúan siendo demostrativos. La lista de Usuarios de taquilla no crea cuentas ni habilita otro login real. Los cambios locales desaparecen al recargar la página; no se guardan en `localStorage` ni `sessionStorage`.

## Verificación local

Desde `apps/dashboard`:

```bash
npm run types
npm test
npm run build
```

Los tests usan Vitest en entorno `node`, con renderizado estático y clientes HTTP falsos; no requieren jsdom ni testing-library.
