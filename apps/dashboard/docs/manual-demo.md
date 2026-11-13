# Manual de autenticación y demostración del dashboard

## Requisitos previos

- Las cuentas demo de `api-003` deben estar sembradas en `arca_pruebas` por la persona responsable de BD.
- La API local debe tener `.env` configurado para `arca_pruebas`, `SANCTUM_STATEFUL_DOMAINS` con `localhost:5174` y `CORS_ALLOWED_ORIGINS` con `http://localhost:5174`.
- La contraseña común de las cuentas demo se configura mediante `DEMO_STAFF_PASSWORD` fuera del repositorio. No se versiona y se comparte por un canal externo. Este manual no contiene contraseñas.
- Imágenes de noticias y eventos (`api-008`), en la máquina local:
  - En el `.env` de la API, `APP_URL=http://localhost:8000`, para que `image_url` apunte a la API local.
  - Desde `apps/api/src`, ejecutar `php artisan storage:link`. Sin ese enlace las imágenes no se ven.
  - En `php.ini`, `upload_max_filesize` mayor que 5 MB. El valor por defecto de PHP es 2 MB: con ese valor, PHP rechaza antes de llegar a Laravel los archivos de más de 2 MB, aunque `api-008` admita hasta 5 MB. Revisar también que `post_max_size` no sea menor.

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
| `direccion_zoo@arca.local` | `zoo-admin` | Administración sin Usuarios (desde 2026-11-05); 2FA obligatorio |
| `ejecutivo@arca.local` | `executive` | Panel y reporte de solo lectura |
| `boletaje@arca.local` | `cashier` | Venta e historial reales (`api-009`) |
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

- `administration`: Panel principal, Noticias, Eventos, Reporte de boletos, Recintos y, solo con `users.manage`, Usuarios.
- `executive`: Panel y Reporte reales en solo lectura, con exportación.
- `ticket`: Venta e Historial reales (el cajero ve solo sus boletos).
- `pwa`: la sesión veterinaria se dirige a `pwa_url`. Si la URL no está configurada, se informa que la aplicación no está disponible y no se redirige.

En administración, el panel ejecutivo y taquilla, la navegación en computadora comienza contraída con sus iconos visibles y se despliega al acercar el cursor o al usar el teclado. El botón de la barra superior permite fijarla abierta o volver al despliegue automático. En celular se conserva el botón para abrir y cerrar el menú.

### Secciones conectadas a la API

Las secciones de administración usan datos reales de `arca_pruebas` mediante `api-007` y no muestran el aviso de demostración:

- **Usuarios:** tabla paginada con búsqueda y filtros por rol, área y estado; formulario fijo (minimizable) de alta y edición; activar/desactivar, eliminar, restablecer contraseña y restablecer 2FA con confirmación en línea en la propia fila, sin ventanas emergentes. Solo `admin` (con `users.manage`) ve esta sección; `zoo-admin` no la ve desde el 2026-11-05.
- **Noticias y Eventos:** listado de activos e inactivos, formulario fijo (minimizable) de alta y edición con caja de imagen (selector o arrastrar y soltar; JPG, PNG o WebP de hasta 5 MB; vista previa, «Quitar imagen» y miniatura en las tarjetas); activar/desactivar y eliminar con confirmación en línea en la tarjeta.
- **Paginación de Eventos:** se muestran hasta cuatro eventos por página, en el orden entregado por la API. «Anterior» y «Siguiente» cambian la página; si hay una confirmación abierta, hay que confirmarla o cancelarla antes de cambiar. La paginación organiza la lista recibida en el navegador; no reduce la descarga de datos.
- **Recintos:** lista con número de animales, alta y renombrado; no se eliminan.
- **Panel principal:** totales de hoy y de los últimos 7 días y serie diaria de ingresos. Sin ventas se muestra un estado vacío.
- **Reporte de boletos:** periodo semanal o mensual (rango personalizado como opción secundaria), navegación al periodo anterior/siguiente, totales, desglose diario, listado paginado y exportación.

**Exportación:** los botones «Exportar CSV», «Exportar Excel» y «Exportar PDF» siempre están visibles y la API genera los tres formatos. El PDF tiene un tope de boletos por periodo: si se supera, la API responde con un aviso y el reporte en pantalla se conserva.

### Taquilla y precios (`api-009`)

- **Venta (`cashier`):** cantidades de adultos y niños, precios unitarios vigentes de la API, confirmación, boleto con folio y QR y la lista de boletos, uno por unidad vendida, cada uno con su folio y su QR; «Imprimir boletos» imprime todos, sin salto forzado de página: los boletos fluyen según el formato y ninguno se parte entre hojas (revisión de boletos individuales, aprobada por Jonathan el 2026-11-06). «Configurar impresión» guarda la preferencia solo en el equipo.
- **Historial:** `cashier` ve sus boletos y puede cancelar los marcados como cancelables indicando el motivo; `admin` y `zoo-admin` lo ven en solo lectura.
- **Precios (`admin`):** precio vigente y próximo cambio, cambio inmediato o programado con confirmación; sin segundo factor confirmado la API responde 403 y se muestra un aviso.

Ninguna de estas secciones muestra aviso de demostración. Siguen siendo de demostración el buscador y el botón de notificaciones de la barra superior; el centro de notificaciones y los avisos de precio están diferidos.

## Verificación local

Desde `apps/dashboard`:

```bash
npm run types
npm test
npm run build
```

Los tests usan Vitest en entorno `node`, con renderizado estático y clientes HTTP falsos; no requieren jsdom ni testing-library.
