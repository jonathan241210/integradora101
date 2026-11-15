# Guía Completa de Ejecución de la PWA - ZooHealth

Este documento proporciona una guía detallada y paso a paso sobre cómo ejecutar la Aplicación Web Progresiva (PWA) ZooHealth en diferentes escenarios.

---

## 📋 Tabla de contenidos

1. [Requisitos previos](#requisitos-previos)
2. [Instalación inicial](#instalación-inicial)
3. [Modos de ejecución](#modos-de-ejecución)
4. [Ejecución con API local](#ejecución-con-api-local)
5. [Despliegue y producción](#despliegue-y-producción)
6. [Instalación en móviles](#instalación-en-móviles)
7. [Troubleshooting](#troubleshooting)

---

## Requisitos previos

Antes de comenzar, asegúrate de tener instalado:

### Software necesario

- **Node.js** 22.0 o superior
  - Descarga desde: https://nodejs.org/
  - Verifica la instalación:
    ```bash
    node --version  # Debe mostrar v22.x.x o superior
    npm --version   # Debe mostrar 10.x.x o superior
    ```

- **Git** (para clonar/actualizar el repositorio)
  - Descarga desde: https://git-scm.com/

- **Editor de código** (recomendado: VS Code)
  - Descarga desde: https://code.visualstudio.com/

### Ubicación del proyecto

```
integradora101/
└── apps/
    └── pwa/  ← Tu proyecto está aquí
```

---

## Instalación inicial

### Paso 1: Navega a la carpeta del proyecto

```bash
# Desde la raíz del repositorio
cd integradora101/apps/pwa
```

O si estás en otra ubicación:

```bash
cd C:\Users\[TuUsuario]\OneDrive\Desktop\Integradora101\integradora101\apps\pwa
```

### Paso 2: Instala las dependencias

**Opción A: Con pnpm (recomendado)**

```bash
corepack pnpm install --frozen-lockfile
```

**Opción B: Con npm**

```bash
npm install
```

### Paso 3: Verifica la instalación

```bash
npm run dev
```

Deberías ver un mensaje similar a:

```
VITE v7.x.x  ready in xxx ms

➜  Local:   http://localhost:5173/
➜  press h to show help
```

Si ves este mensaje, la instalación fue exitosa. Presiona `Ctrl + C` para detener el servidor.

---

## Modos de ejecución

La PWA puede ejecutarse en tres modos diferentes, cada uno con su propósito:

### 1️⃣ Modo Desarrollo (Development)

**Cuándo usarlo:**
- Durante el desarrollo activo de la aplicación
- Cuando necesitas ver cambios en tiempo real
- Para depurar código TypeScript y React

**Comando básico:**

```bash
npm run dev
```

**Comando con acceso desde red local:**

```bash
npm run dev -- --host 0.0.0.0
```

**Qué ocurre:**
- ✅ Vite compila TypeScript bajo demanda
- ✅ Recarga automática en vivo (HMR - Hot Module Replacement)
- ✅ Reenrutamiento automático de `/api` y `/sanctum` a la API
- ✅ Mensajes de error detallados en la consola del navegador

**Acceso:**

```text
http://localhost:5173/
```

**Ports habituales:**
- `localhost:5173` - Acceso local desde tu máquina
- Desde otra máquina de la red: `http://[tu-ip]:5173/`

---

### 2️⃣ Modo Compilación (Build)

**Cuándo usarlo:**
- Antes de desplegar a producción
- Para generar archivos optimizados
- Para verificar que no hay errores de compilación

**Comando:**

```bash
npm run build
```

**Qué ocurre:**
- ✅ Compila TypeScript a JavaScript
- ✅ Minifica y optimiza el código
- ✅ Genera archivos estáticos en `dist/`
- ✅ Crea mapas de fuentes para depuración
- ⏱️ Tarda algunos segundos (depende de tu máquina)

**Salida:**

```text
apps/pwa/dist/
├── index.html
├── assets/
│   ├── *.js
│   ├── *.css
│   └── *.svg
└── ...
```

**Monitorear la compilación:**

Si deseas ver qué se está compilando, usa:

```bash
npm run build -- --debug
```

---

### 3️⃣ Modo Preview (Previsualización de producción)

**Cuándo usarlo:**
- Después de compilar con `npm run build`
- Para verificar que la app se vea igual en producción
- Para probar en un entorno similar a producción pero local

**Comando básico:**

```bash
npm run preview
```

**Comando con acceso desde red local:**

```bash
npm run preview -- --host 0.0.0.0
```

**Diferencias respecto a Desarrollo:**
- ❌ No hay recarga automática en vivo
- ❌ No hay reenrutamiento de `/api` (en el preview solo)
- ✅ Los archivos se sirven desde `dist/` (archivos optimizados)
- ✅ Es más cercano a cómo verá el usuario la app

**Acceso:**

```text
http://localhost:4173/
```

**Nota importante:** Necesitas compilar primero con `npm run build` antes de poder usar `npm run preview`.

---

### 🔄 Flujo típico de desarrollo

```
1. npm run dev              # Trabajas en la app
   ↓
2. Haces cambios en el código
   ↓
3. HMR recarga automáticamente
   ↓
4. Verificas cambios en http://localhost:5173/
   ↓
5. npm run build            # Compilas para producción
   ↓
6. npm run preview          # Verificas que se vea bien
   ↓
7. Listo para desplegar
```

---

## Ejecución con API local

Si quieres usar ZooHealth con la API local (Laravel), sigue estos pasos:

### Paso 1: Inicia la API

En una terminal separada:

```bash
cd integradora101/apps/api
php artisan serve --host=127.0.0.1 --port=8000
```

Deberías ver:

```
Starting Laravel development server: http://127.0.0.1:8000
```

**Importante:** No cierres esta terminal, la API debe estar corriendo mientras usas la PWA.

### Paso 2: Configura las variables de entorno

En `integradora101/apps/api/.env`, asegúrate de tener:

```env
SANCTUM_STATEFUL_DOMAINS=localhost:5173,127.0.0.1:5173
```

Si usas otro puerto:

```env
SANCTUM_STATEFUL_DOMAINS=localhost:5173,127.0.0.1:5173,[tu-ip]:5173
```

### Paso 3: Inicia la PWA

En otra terminal:

```bash
cd integradora101/apps/pwa
npm run dev -- --host 0.0.0.0
```

### Paso 4: Autentica

1. Abre http://127.0.0.1:5173/ en tu navegador
2. Inicia sesión con una cuenta veterinaria, por ejemplo:
   - Email: `veterinario@arca.local`
   - Contraseña: (la configurada en la base de datos)

### Paso 5: Usa la aplicación

- ✅ Puedes ver el directorio de animales
- ✅ Puedes registrar nuevos animales
- ✅ Puedes ver y editar diagnósticos (local)
- ✅ Los datos guardados se envían a la API

---

## Cambiar el puerto de la API

Si la API corre en un puerto diferente (ej: 9000), especifícalo así:

```bash
ARCA_API_PROXY_TARGET=http://127.0.0.1:9000 npm run dev -- --host 0.0.0.0
```

O en Windows PowerShell:

```powershell
$env:ARCA_API_PROXY_TARGET = "http://127.0.0.1:9000"
npm run dev -- --host 0.0.0.0
```

---

## Despliegue y producción

### Generar archivos para producción

```bash
# 1. Compila la app
npm run build

# 2. Verifica que se ve bien
npm run preview

# 3. Los archivos están listos en dist/
```

### Desplegar en un servidor

Los archivos compilados en `dist/` son archivos estáticos. Puedes desplegarlos en:

- **Vercel**: Detecta automáticamente que es un proyecto Vite
- **Netlify**: Conecta tu repositorio y configura el build
- **Google Cloud**: Sube los archivos a Cloud Storage + Cloud CDN
- **Servidor web propio**: Copia `dist/` a tu servidor (Apache, Nginx, etc.)

### Configuración en producción

En producción, tu servidor debe:

1. **Servir `dist/index.html`** en la raíz
2. **Reenviar `/api` y `/sanctum`** a la API backend
3. **Usar HTTPS**
4. **Configurar CORS** correctamente

#### Ejemplo con Nginx

```nginx
server {
    listen 443 ssl http2;
    server_name zoohealth.example.com;

    # SSL certificates...

    root /var/www/zoohealth/dist;
    index index.html;

    # Reenrutar SPA
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Proxy a la API
    location /api {
        proxy_pass http://api-backend:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    location /sanctum {
        proxy_pass http://api-backend:8000;
        proxy_set_header Host $host;
    }
}
```

---

## Instalación en móviles

### Requisitos

- **HTTPS obligatorio** en producción
- Navegador compatible con PWA (Chrome, Edge, Firefox en Android; Safari en iOS 16.4+)

### En Android (Chrome/Edge/Firefox)

1. Abre la PWA en el navegador del teléfono
2. Toca el ícono de menú (⋮)
3. Selecciona "Instalar app" o "Añadir a pantalla de inicio"
4. Confirma la instalación

### En iPhone/iPad (Safari)

1. Abre la PWA en **Safari**
2. Toca el ícono de Compartir (↗)
3. Desplázate y selecciona "Añadir a pantalla de inicio"
4. Confirma con "Añadir"

### Comportamiento de la app instalada

- ✅ Abre en ventana independiente (sin barra de dirección)
- ✅ Acceso rápido desde la pantalla de inicio
- ⚠️ **No tiene modo sin conexión** (requiere conexión con la API para guardar)

---

## Pruebas

### Ejecutar las pruebas unitarias

```bash
npm test
```

### Ejecutar con modo watch

```bash
npm test -- --watch
```

---

## Troubleshooting

### ❌ "Puerto 5173 ya está en uso"

**Solución 1:** Cambia el puerto manualmente

```bash
npm run dev -- --port 3000
```

**Solución 2:** Mata el proceso que usa el puerto

En Windows PowerShell:

```powershell
Get-Process -Id (Get-NetTCPConnection -LocalPort 5173).OwningProcess | Stop-Process
```

### ❌ "Cannot find module"

**Causa:** Las dependencias no están instaladas

**Solución:**

```bash
npm install
```

### ❌ "API no responde" / "Error 502"

**Causa:** La API no está corriendo

**Solución:**

1. Verifica que la API esté iniciada:
   ```bash
   cd integradora101/apps/api
   php artisan serve --host=127.0.0.1 --port=8000
   ```

2. Abre http://127.0.0.1:8000/api en el navegador. Deberías ver una respuesta JSON.

### ❌ "CORS error" en la consola

**Causa:** La API no acepta solicitudes desde el navegador

**Solución:**

1. En el `.env` de la API, verifica `SANCTUM_STATEFUL_DOMAINS`:
   ```env
   SANCTUM_STATEFUL_DOMAINS=localhost:5173,127.0.0.1:5173
   ```

2. Si usas otro origen, agrégalo:
   ```env
   SANCTUM_STATEFUL_DOMAINS=localhost:5173,127.0.0.1:5173,192.168.1.100:5173
   ```

### ❌ "No puedo iniciar sesión"

**Causa:** Credenciales incorrectas o usuario no existe

**Solución:**

1. Verifica que el usuario existe en la base de datos `arca_pruebas`
2. Usa credenciales válidas:
   - Email: `veterinario@arca.local`
   - Contraseña: (según tu configuración)

3. En desarrollo, puedes crear usuarios con:
   ```bash
   cd integradora101/apps/api
   php artisan tinker
   # En la consola de tinker:
   User::create(['name' => 'Veterinario', 'email' => 'vet@example.com', 'password' => bcrypt('password')])
   ```

### ❌ Los cambios en el código no se reflejan

**Causa:** HMR (recarga en vivo) no está funcionando

**Solución:**

1. Verifica que estés en modo desarrollo: `npm run dev`
2. Recarga manualmente con F5
3. Borra la carpeta `.vite` si existe:
   ```bash
   rm -r .vite
   npm run dev
   ```

### ❌ "TypeScript error" durante la compilación

**Causa:** Errores de tipo en el código

**Solución:**

1. Lee el mensaje de error en la terminal
2. Verifica el archivo y línea indicados
3. Asegúrate de que los tipos sean correctos:
   ```typescript
   // ❌ Incorrecto
   const nombre: string = 123;

   // ✅ Correcto
   const nombre: string = "Juan";
   ```

4. Si necesitas ignorar un error temporalmente:
   ```typescript
   // @ts-ignore
   const resultado = operacionDudosa();
   ```

---

## 🆘 ¿Aún tienes problemas?

1. Consulta el archivo [README.md](../README.md)
2. Revisa los logs de la API: `php artisan log`
3. Abre la consola del navegador (F12) para ver errores
4. Verifica que Node.js, npm y PHP estén correctamente instalados

---

## 📚 Documentación relacionada

- [README.md](../README.md) - Guía general del proyecto
- [Arquitectura del sistema](../../docs/02-arquitectura.md)
- [Sistema de diseño](../../docs/04-sistema-de-diseno.md)
- [Convenciones del código](../../docs/06-convenciones.md)

---

**Última actualización:** Noviembre 2026
