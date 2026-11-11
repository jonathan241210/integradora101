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
corepack pnpm install --frozen-lockfile
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

## Acceso institucional en desarrollo

1. Levanta la API desde `apps/api/src` con `php artisan serve --host=127.0.0.1 --port=8000`.
2. Incluye `localhost:5173` y `127.0.0.1:5173` en `SANCTUM_STATEFUL_DOMAINS` del `.env` local de la API. Usa `arca_pruebas` para las pruebas.
3. Abre ZooHealth en `http://127.0.0.1:5173/` e inicia sesión con la cuenta veterinaria activa, por ejemplo `veterinario@arca.local` con la contraseña demo vigente.

Vite reenvía `/api` y `/sanctum` a Laravel. Si la API escucha en otro puerto, inicia Vite con `ARCA_API_PROXY_TARGET=http://127.0.0.1:9000`. Si cambia el origen de ZooHealth, registra su host y puerto en Sanctum. Fuera de desarrollo, el servidor anfitrión debe reenviar esas rutas bajo el mismo origen de la PWA.

ZooHealth usa la cookie de sesión de Sanctum. Puedes recargar la pestaña mientras la sesión esté vigente y cerrarla desde el menú. El directorio, los perfiles y el registro de animales usan esa sesión con la API. Para registrar un animal, selecciona un recinto existente: la API requiere ese vínculo. El guardado de diagnósticos y revisiones clínicas permanece fuera del alcance aprobado y no envía esos datos al servidor.

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
