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

## Acceso de demostración

Usa estas credenciales ficticias en la pantalla de inicio:

- Usuario: `veterinario@demo.local`
- Contraseña: `demo1234`

El acceso solo sirve para recorrer la interfaz: no autentica ni protege datos. La
sesión vive en memoria y vuelve al login al recargar la página. Los animales son
datos ficticios y los formularios no envían ni guardan información.

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
Esta instalación no agrega modo sin conexión ni guarda formularios. En desarrollo,
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
