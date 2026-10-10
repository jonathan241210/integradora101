# Guía de la demostración del dashboard

## Iniciar la aplicación

Desde la raíz del repositorio, ejecuta:

```bash
cd apps/dashboard
npm run dev
```

Abre la dirección local que indique Vite. No se requiere un servidor API ni una conexión a la base de datos.

## Elegir un perfil

La pantalla inicial ofrece dos perfiles ficticios:

- **Administración:** solicita un usuario y una contraseña antes de mostrar el panel de muestra. Puede recorrer Dashboard, Noticias, Eventos, Reporte de boletos, Modificación de recintos y Usuarios de taquilla.
- **Taquilla:** solicita un usuario y una contraseña antes de mostrar Venta de boletos e Historial de boletos.

Credenciales públicas de demostración:

- Administración:
  - Usuario: `administrador@demo.local`
  - Contraseña: `demo1234`
- Taquilla:
  - Usuario: `taquilla@demo.local`
  - Contraseña: `demo1234`

No son credenciales reales y no deben reutilizarse en ningún otro sistema.

## Recintos y usuarios ficticios

En el perfil de Administración:

1. Abre **Modificación de recintos**.
2. Cambia el nombre, la descripción o el estado de un recinto de muestra y selecciona **Guardar cambios de muestra**.
3. Abre **Usuarios de taquilla** y captura un nombre, un usuario y una contraseña ficticios.
4. Selecciona **Crear usuario de muestra**. La cuenta queda disponible en el perfil de Taquilla mientras esta página siga abierta.
5. Sal del perfil administrativo, selecciona Taquilla e inicia sesión con la cuenta creada.

Los formularios muestran feedback local. Los recintos y usuarios no se guardan en el navegador ni en un servidor: al recargar la página regresan los datos iniciales. Cerrar sesión permite cambiar de perfil y no borra las cuentas creadas durante la carga actual.

## Venta e historial

Tras iniciar sesión en Taquilla, **Venta de boletos** recorre estados visuales de confirmación, procesamiento y resultado. No se cobra, calcula un importe operativo ni registra una venta. **Historial de boletos** presenta filas ficticias y filtros locales de muestra. El perfil administrativo conserva **Reporte de boletos**, separado del historial de taquilla.

Todos los importes, estados, folios, fechas y cuentas son ficticios. Ninguna pantalla consulta o persiste datos del zoológico.

## Verificación

Desde `apps/dashboard`, ejecuta:

```bash
npm run types
npm run build
npm test
```

La navegación también debe revisarse con teclado y a 360, 390, 768, 1024 y 1366 px de ancho, comprobando que no haya desbordamiento horizontal.

## Organización del código

- `src/App.tsx`: shell, navegación por perfil y composición de vistas.
- `src/views/`: vistas de administración, taquilla, recintos, cuentas e historial.
- `src/viewmodels/dashboard-demo.ts`: estado local y transiciones de demostración.
- `src/viewmodels/useDashboardDemo.ts`: hook que expone las acciones del ViewModel.
- `src/data/demo-data.ts`: indicadores, recintos, cuentas, ventas e historial ficticios.
- `src/styles.css`: estilos responsive con tokens semánticos.
- `src/tests/`: pruebas Vitest nombradas por criterio de aceptación.

La selección de perfil y los logins de Administración y Taquilla solo controlan qué interfaz se presenta. No son autenticación, autorización ni protección de datos; todo el código y los fixtures están disponibles en el cliente.

## Diseño institucional

El dashboard toma los colores y tipografía de [`../../../docs/04-sistema-de-diseno.md`](../../../docs/04-sistema-de-diseno.md) por medio de tokens semánticos: borgoña para la navegación, vino para acciones, dorado/beige como acentos, blanco/negro según contraste, tamaño base de 16px y Lato 400. `index.html` conserva su función de entrada de Vite/React; la vista se compone en React y los mapeos centrales de estilo están en `src/styles.css`. La demo no lee ni modifica `settings_colores` ni llama a `GET /api/theme`.
