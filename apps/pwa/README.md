# PWA veterinaria - ZooHealth

Aplicación frontend de demostración del módulo veterinario ZooHealth. La interfaz
incluye inicio, listado de animales y formularios visuales para registrar animales,
diagnósticos y revisiones.

**⚡ Acceso rápido:** Consulta [EJECUCION_RAPIDA.md](./EJECUCION_RAPIDA.md) para comandos frecuentes.

**📖 Guía completa:** Consulta [docs/GUIA_EJECUCION.md](./docs/GUIA_EJECUCION.md) para una guía paso a paso detallada.

## Requisitos

- Node.js 22+
- npm o pnpm

## Instalación

Desde la raíz del repositorio:

```bash
cd apps/pwa
corepack pnpm install --frozen-lockfile
```

O con npm:

```bash
cd apps/pwa
npm install
```

## Ejecución de la PWA

La PWA puede ejecutarse en tres modos diferentes según tus necesidades:

### 1. Desarrollo (Recomendado para desarrollo local)

Inicia el servidor de desarrollo con recarga en vivo:

```bash
cd apps/pwa
npm run dev
```

O con soporte de red local (accede desde otros dispositivos):

```bash
cd apps/pwa
npm run dev -- --host 0.0.0.0
```

Accede en el navegador:

```text
http://localhost:5173/
```

En modo desarrollo, Vite proporciona:
- Recarga en vivo (HMR) cuando cambias archivos
- Reenrutamiento automático de `/api` y `/sanctum` a la API Laravel
- Soporte TypeScript sin necesidad de compilación previa

### 2. Compilación para producción

Compila la aplicación para despliegue optimizado:

```bash
cd apps/pwa
npm run build
```

Esto genera:
- Código TypeScript compilado
- Archivos optimizados y minificados
- Salida en la carpeta `dist/`

### 3. Vista previa de producción

Después de compilar, prueba la versión optimizada localmente:

```bash
cd apps/pwa
npm run preview
```

O con soporte de red local:

```bash
cd apps/pwa
npm run preview -- --host 0.0.0.0
```

Accede en el navegador:

```text
http://localhost:4173/
```

**Nota:** Este modo simula cómo se vería la app en producción, pero sin actualizaciones en vivo.

---

## Configuración de puertos

| Modo | Puerto | Uso |
|------|--------|-----|
| `dev` | 5173 | Desarrollo con recarga en vivo |
| `preview` | 4173 | Simulación de producción |

Si necesitas cambiar el puerto, edita `vite.config.ts` en las secciones `server.port` y `preview.port`.

---

## Acceso institucional en desarrollo

### Requisitos previos

1. **Levanta la API** desde `apps/api/src`:
   ```bash
   php artisan serve --host=127.0.0.1 --port=8000
   ```

2. **Configura las variables de entorno** de la API (`.env`):
   - Incluye `localhost:5173` y `127.0.0.1:5173` en `SANCTUM_STATEFUL_DOMAINS`
   - Usa la base de datos `arca_pruebas` para las pruebas

3. **Inicia ZooHealth**:
   ```bash
   npm run dev -- --host 0.0.0.0
   ```

4. **Accede y autentica**:
   - Abre en el navegador: `http://127.0.0.1:5173/`
   - Inicia sesión con una cuenta veterinaria activa
   - Ejemplo: `veterinario@arca.local` con la contraseña demo vigente

### Configuración del proxy

Vite reenvía automáticamente:
- `/api` → API Laravel
- `/sanctum` → Endpoints de autenticación

**Si la API escucha en otro puerto**, inicia Vite especificando el destino:

```bash
ARCA_API_PROXY_TARGET=http://127.0.0.1:9000 npm run dev -- --host 0.0.0.0
```

**En producción**, el servidor debe reenviar `/api` y `/sanctum` hacia la API bajo el mismo origen de la PWA.

### Autenticación y sesión

ZooHealth usa la cookie de sesión de Sanctum. Ten en cuenta:

- ✅ Puedes recargar la pestaña mientras la sesión esté vigente
- ✅ Cierra la sesión desde el menú de usuario
- ✅ El directorio, perfiles y registro de animales usan la sesión con la API
- ⚠️ **Para registrar un animal**, selecciona un recinto existente (requerido por la API)
- ⚠️ **Diagnósticos y revisiones clínicas** no envían datos al servidor (fuera del alcance aprobado)

## Instalar en un dispositivo móvil

### Requisito: Despliegue con HTTPS

Despliega la app en un sitio con HTTPS y ábrelo desde el navegador del teléfono.

### En navegadores compatibles con PWA

Usa **Instalar app** para abrir la confirmación nativa de tu navegador.

### En iPhone/iPad (Safari)

1. Abre la página en **Safari**
2. Toca el botón **Compartir**
3. Elige **Añadir a pantalla de inicio**
4. Confirma con **Añadir**

### En otros navegadores

1. Abre el menú del navegador
2. Selecciona **Instalar aplicación** o **Añadir a pantalla de inicio**
3. Confirma la instalación

### Comportamiento tras la instalación

- ✅ La aplicación abre en una ventana independiente cuando la plataforma lo permite
- ✅ Funciona como app nativa en la pantalla de inicio
- ⚠️ **Sin modo sin conexión**: El guardado requiere conexión con la API
- ⚠️ **En desarrollo**: `localhost` es válido para pruebas; una dirección HTTP de red local **no es un contexto seguro** para instalar desde otro teléfono

## Pruebas automatizadas

Ejecuta las pruebas unitarias:

```bash
cd apps/pwa
npm test
```

---

## Estructura principal del proyecto

```text
apps/pwa/
├── src/
│   ├── App.tsx                 # Componente raíz
│   ├── main.tsx               # Punto de entrada de la app
│   ├── styles.css             # Estilos globales (Tailwind)
│   ├── tests/                 # Pruebas unitarias
│   ├── viewmodels/            # Lógica de negocio y estado
│   └── views/                 # Componentes React
├── public/                    # Archivos estáticos
├── dist/                      # Salida compilada (después de `npm run build`)
├── index.html                 # Archivo HTML principal
├── package.json               # Dependencias y scripts
├── vite.config.ts             # Configuración de Vite
├── tsconfig.json              # Configuración de TypeScript
├── tsconfig.app.json          # TypeScript específico de la app
├── tsconfig.node.json         # TypeScript para nodos (Vite)
└── README.md                  # Este archivo
```

---

## Variables de entorno

La PWA se configura mediante variables de entorno:

| Variable | Descripción | Valor por defecto |
|----------|-------------|-------------------|
| `ARCA_API_PROXY_TARGET` | URL destino del proxy de la API | `http://127.0.0.1:8000` |

**Ejemplo de uso:**

```bash
ARCA_API_PROXY_TARGET=http://api.example.com npm run dev
```

---

## Solución de problemas

### El servidor no inicia

1. Verifica que el puerto esté disponible (por defecto 5173 para dev, 4173 para preview)
2. Intenta cambiar el puerto manualmente en `vite.config.ts`
3. Revisa que Node.js 22+ esté instalado: `node --version`

### La API no responde

1. Verifica que la API Laravel esté ejecutándose: `php artisan serve`
2. Comprueba que `SANCTUM_STATEFUL_DOMAINS` en el `.env` de la API incluya tu host
3. Abre la consola del navegador (F12) y verifica que las llamadas a `/api` se hagan correctamente

### Problemas de CORS

- En desarrollo, Vite proxy maneja CORS automáticamente
- En producción, el servidor web debe estar configurado para permitir las solicitudes

### Cambios sin efecto en desarrollo

- La recarga en vivo (HMR) debería activarse automáticamente
- Si no ocurre, intenta recargar la página manualmente (F5)
- Verifica que hayas guardado los cambios en el editor

---

## Próximos pasos

- Revisa la [arquitectura del sistema](../../docs/02-arquitectura.md)
- Consulta el [sistema de diseño](../../docs/04-sistema-de-diseno.md)
- Explora los [patrones arquitectónicos](../../docs/08-patrones-arquitectonicos.md)
