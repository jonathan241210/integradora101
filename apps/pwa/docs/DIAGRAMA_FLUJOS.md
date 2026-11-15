# 📊 Diagrama de Flujo de Ejecución PWA ZooHealth

## Flujo de ejecución por escenario

```
┌─────────────────────────────────────────────────────────────────┐
│                    EJECUCIÓN DE LA PWA ZOOHEALTH                 │
└─────────────────────────────────────────────────────────────────┘

                              INICIO
                                │
                                ▼
                    ┌───────────────────────┐
                    │  ¿Primera ejecución?  │
                    └───────────────────────┘
                         │            │
                    SÍ ──┘            └── NO
                    │                     │
                    ▼                     ▼
            npm install           ¿Qué quieres hacer?
                    │              │      │      │      │
                    └──────┬───────┴──────┴──────┴──────┘
                           │
                    npm run dev  ◄─────────────────────────┐
                           │                               │
                ┌──────────┴──────────┬────────────────────┘
                │                     │
        ¿Usar API?                 ¿Compilar?
         │      │                  │        │
     SÍ  │      │ NO             SÍ │        │ NO
        │       │                  │        │
        ▼       ▼                  ▼        ▼
    Inicia    Accede          npm run   npm run
    API       a:              build     preview
    │         http://             │        │
    │         localhost:5173      ▼        ▼
    │             │           Genera   Vista previa
    │             │           dist/    (puerto 4173)
    │             │               │
    ▼             ▼               ▼
   Inicia      Sin API       Archivos
   PWA con     (local)       optimizados
   proxy
    │
    ▼
Accede a:
http://127.0.0.1:5173/

┌─────────────────────────────┐
│    ¿Iniciar sesión?        │
└─────────────────────────────┘
        │           │
        SÍ          NO
        │           │
        ▼           ▼
    Autentica   Explora app
    con API     (sin datos)
        │
        ▼
    Accede a:
    - Directorio
    - Registros
    - Diagnósticos
```

---

## Matriz de decisión: Qué comando usar

```
┌────────────────────────────────────────────────────────────────────┐
│                   ¿QUÉ COMANDO DEBO USAR?                         │
├────────────────────────────────────────────────────────────────────┤
│                                                                    │
│  SITUACIÓN                          COMANDO                       │
│  ──────────────────────────────────────────────────────────────── │
│                                                                    │
│  ✏️ Desarrollando, cambios activos  npm run dev                  │
│                                                                    │
│  🔗 Pruebas en red local             npm run dev -- --host 0.0.0.0│
│                                                                    │
│  📱 Pruebas en móvil de la red       npm run dev -- --host 0.0.0.0│
│                                                                    │
│  ✅ API en puerto diferente          ARCA_API_PROXY_TARGET=...    │
│                                      npm run dev                  │
│                                                                    │
│  🏗️ Preparar para producción         npm run build                │
│                                                                    │
│  👁️ Ver cómo se vería en prod       npm run preview              │
│     (después de npm run build)                                    │
│                                                                    │
│  🧪 Ejecutar tests                  npm test                     │
│                                                                    │
│  🔄 Tests con auto-recarga           npm test -- --watch         │
│                                                                    │
└────────────────────────────────────────────────────────────────────┘
```

---

## Configuración típica de desarrollo

```
TERMINAL 1: API
┌────────────────────────────────────────┐
│ $ cd apps/api                          │
│ $ php artisan serve                    │
│ > Running on http://127.0.0.1:8000     │
│ > (NO CIERRES ESTA TERMINAL)           │
└────────────────────────────────────────┘

TERMINAL 2: PWA
┌────────────────────────────────────────┐
│ $ cd apps/pwa                          │
│ $ npm run dev -- --host 0.0.0.0        │
│ > VITE ready in xxx ms                 │
│ > Local: http://localhost:5173/        │
│ > Network: http://[tu-ip]:5173/        │
└────────────────────────────────────────┘

NAVEGADOR
┌────────────────────────────────────────┐
│ http://127.0.0.1:5173/                 │
│ > Inicia sesión con veterinario@...    │
│ > ¡Listo para desarrollar!             │
└────────────────────────────────────────┘
```

---

## Ciclo de vida de una sesión de desarrollo

```
1️⃣ INICIO
   ├─ npm run dev
   └─ El navegador abre automáticamente http://localhost:5173/
      (o lo abres manualmente)

2️⃣ DESARROLLO
   ├─ Cambias código en src/
   ├─ Vite detecta cambios
   ├─ HMR recarga el módulo modificado
   └─ ¡Ves los cambios al instante!

3️⃣ AUTENTICACIÓN (si tiene API)
   ├─ Accedes a http://127.0.0.1:5173/
   ├─ Introduces credenciales
   ├─ API valida sesión
   └─ Sanctum crea cookie de sesión

4️⃣ TRABAJO CON DATOS
   ├─ Interactúas con la app
   ├─ Cambios se envían a /api
   ├─ API procesa y responde
   └─ Vite recarga si hay cambios en código

5️⃣ DEBUGGING
   ├─ Abre F12 (DevTools)
   ├─ Consola muestra logs y errores
   ├─ Network muestra llamadas a API
   └─ Elements muestra la estructura DOM

6️⃣ FINALIZACIÓN
   ├─ Ctrl + C para detener npm run dev
   ├─ Cierra sesión en la app (o navega lejos)
   └─ FIN: Código está listo para push
```

---

## Estados de puertos

```
┌────────────────────────────────────────────────────┐
│              VERIFICACIÓN DE PUERTOS               │
├────────────────────────────────────────────────────┤
│                                                    │
│  Puerto  Servicio         Estado      URL         │
│  ──────────────────────────────────────────────── │
│  5173    PWA (dev)        Corriendo   http://...  │
│  4173    PWA (preview)    Disponible   http://... │
│  8000    API (Laravel)    Corriendo   http://...  │
│  3000    Alternativo      Disponible   http://... │
│                                                    │
│  ❌ Si un puerto no está disponible:              │
│     npm run dev -- --port 3000                    │
│     npm run preview -- --port 3173                │
│                                                    │
└────────────────────────────────────────────────────┘
```

---

## Transición: Desarrollo → Producción

```
FASE 1: DESARROLLO
├─ npm run dev
├─ HMR activo
├─ Código sin compilar
└─ http://localhost:5173/
   │
   ▼

FASE 2: COMPILACIÓN
├─ npm run build
├─ TypeScript → JavaScript
├─ Minificación
├─ Tree-shaking
└─ Salida: dist/
   │
   ▼

FASE 3: VALIDACIÓN
├─ npm run preview
├─ Simula producción localmente
├─ Sin HMR
└─ http://localhost:4173/
   │
   ▼

FASE 4: DESPLIEGUE
├─ Subir dist/ al servidor
├─ Configurar proxy /api
├─ Habilitar HTTPS
└─ En producción

┌──────────────────────────────────────┐
│  ¡La app está lista para usuarios!   │
└──────────────────────────────────────┘
```

---

## Solución de problemas rápida

```
PROBLEMA                    SÍNTOMA                  SOLUCIÓN
─────────────────────────────────────────────────────────────────
Puerto ocupado              Error EADDRINUSE         npm run dev -- --port 3000
                            en puerto 5173           

Módulos no encontrados      "Cannot find module"     npm install

API no responde             ECONNREFUSED :8000       Inicia: php artisan serve

CORS bloqueado              Error en consola         Revisa SANCTUM_STATEFUL_DOMAINS

Cambios sin efecto          No se actualiza página   F5 o reinicia npm run dev

TypeScript error            Compilación falla        Revisa el archivo indicado

Sesión no persiste          Login desaparece         ¿API corriendo? ¿HTTPS en prod?

PWA no instala              Opción no aparece        Debe estar en HTTPS

Datos no se guardan         API retorna error        ¿Recinto seleccionado?
                                                      ¿API autorizó la sesión?
```

---

**Última actualización:** Noviembre 2026
