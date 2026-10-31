# PWA veterinaria - ZooHealth

Aplicación frontend de demostración del módulo veterinario ZooHealth. La interfaz
incluye inicio, listado de animales y formularios visuales para registrar animales,
diagnósticos y revisiones.

## Requisitos

- Node.js 22+
- npm

## Instalación

Desde la raíz del repositorio:

```bash
cd apps/pwa
npm install
```

## Ejecutar en modo desarrollo

```bash
cd apps/pwa
npm run dev -- --host 0.0.0.0
```

Luego abre en el navegador:

```text
http://localhost:5173/
```

## Cómo ejecutar todo (paso a paso)

Se necesitan **dos terminales abiertas al mismo tiempo**: una para la API y otra
para la PWA.

1. **API** (PHP 8.4+), terminal 1:

   ```bash
   cd apps/api/src
   php artisan serve --host=0.0.0.0 --port=8000
   ```

2. **PWA**, terminal 2:

   ```bash
   cd apps/pwa
   npm install          # solo la primera vez
   npm run dev -- --host 0.0.0.0 --port 5173
   ```

3. Abre `http://localhost:5173/` e inicia sesión con una cuenta de la tabla `users`
   (se crea con `php artisan arca:create-staff`).

Si al iniciar sesión aparece "No se pudo conectar", casi siempre es que la API
(terminal 1) no está corriendo o `VITE_API_URL` apunta a otra dirección.

### Usar otro puerto

Sí se puede. Los dos puertos son independientes:

| Servicio | Puerto por defecto | Cómo cambiarlo |
|----------|--------------------|----------------|
| PWA | 5173 | `npm run dev -- --port 3000` |
| API | 8000 | `php artisan serve --port=9000` |

- **Cambiar el puerto de la PWA** no requiere nada más: la API acepta peticiones de
  cualquier origen (CORS abierto), así que basta abrir `http://localhost:3000/`.
- **Cambiar el puerto de la API** exige decirle a la PWA dónde está. Crea o edita
  `apps/pwa/.env`:

  ```text
  VITE_API_URL=http://localhost:9000/api/v1
  ```

  y **reinicia** `npm run dev` (Vite solo lee `.env` al arrancar).
- Si el puerto está ocupado, `php artisan serve` falla; Vite en cambio elige el
  siguiente libre (5174…) salvo que uses `--strictPort`.
- Desde el teléfono (misma red Wi-Fi) usa la IP de tu PC en ambos lados, por
  ejemplo `http://192.168.1.50:5173/` y `VITE_API_URL=http://192.168.1.50:9000/api/v1`.
  Puede ser necesario permitir esos puertos en el firewall de Windows.

## Conexión con la API

La PWA guarda animales, diagnósticos (intenso y rápido) y revisiones en la API
Laravel (`apps/api/src`). Define la URL en `apps/pwa/.env` (por defecto
`http://localhost:8000/api/v1`):

```text
VITE_API_URL=http://localhost:8000/api/v1
```

Desde un teléfono usa la IP de tu PC en lugar de `localhost`. Para levantar la API
(requiere PHP 8.4):

```bash
cd apps/api/src
php artisan arca:create-staff correo@ejemplo.com Nombre Apellido   # departamento: --department=veterinary
php artisan serve --host=0.0.0.0
```

Inicia sesión con el correo y la contraseña de esa cuenta del tabla `users`. El
token se guarda en `sessionStorage` y se descarta al cerrar la pestaña o la sesión.
Los diagnósticos y revisiones se asocian a un animal ya registrado; el panel de
Inicio todavía muestra datos de muestra.

En el panel se puede navegar entre Inicio, Animales, Registrar animal, Registrar
diagnóstico y Registrar revisión. En computadora la navegación aparece en el
menú lateral; en teléfono está en la barra inferior.

## Instalar en un teléfono

Despliega la app en un sitio con HTTPS y ábrelo desde el navegador del teléfono.
En navegadores compatibles, usa **Instalar app** para abrir la confirmación nativa.
En iPhone/iPad, abre la página en Safari, toca **Compartir**, elige **Añadir a
pantalla de inicio** y confirma con **Añadir**. En otros navegadores, abre su menú
y selecciona **Instalar aplicación** o **Añadir a pantalla de inicio**.

La aplicación abre en una ventana independiente cuando la plataforma lo permite.
Esta instalación no agrega modo sin conexión: guardar requiere conexión con la API. En desarrollo,
`localhost` es válido para pruebas; una dirección HTTP de red local no es un
contexto seguro para instalar desde otro teléfono.

## Pruebas

```bash
cd apps/pwa
npm test
```

## Compilar para producción

```bash
cd apps/pwa
npm run build
```

La salida se genera en:

```text
apps/pwa/dist
```

## Vista previa de producción

```bash
cd apps/pwa
npm run preview -- --host 0.0.0.0
```

## Estructura principal

```text
apps/pwa/
├── src/
│   ├── App.tsx
│   ├── tests/
│   ├── viewmodels/
│   ├── views/
│   ├── main.tsx
│   └── styles.css
├── index.html
├── package.json
├── tsconfig.json
├── tsconfig.app.json
├── tsconfig.node.json
├── vite.config.ts
└── README.md
```
