# 09 · Guía de ejecución local

Cómo levantar en desarrollo la API, la PWA veterinaria, el dashboard y el portal público, de forma que el flujo entre ellos funcione. Todo lo que aparece como comando o valor se verificó contra los archivos citados el 2026-11-11. Lo que no pudo verificarse se marca como tal.

Esta guía es operativa. No define requisitos: los requisitos viven en cada `specs/` y en `CONSTITUTION.md`.

## 1. Reglas que no se negocian

- **Solo `arca_pruebas`.** La base de trabajo es `arca_pruebas` (Aiven, [ADR 0013](adr/0013-aiven-managed-mysql.md)). `arca_zoo` es producción y ningún agente ni equipo de desarrollo la usa. Ver [infra/README.md](../infra/README.md).
- **No cambies el esquema.** No ejecutes `php artisan migrate`, `migrate:fresh` ni `RefreshDatabase`. El esquema lo crea, prueba y aplica el responsable de BD tras una DBR aprobada ([docs/database/README.md](database/README.md)).
- **Secretos fuera del repo.** `.env` es local y no se versiona. Contraseñas, `DB_PASSWORD` y `DEMO_STAFF_PASSWORD` se comparten por un canal externo; esta guía no las contiene.
- **Sin Docker.** `infra/README.md` prevé un `docker-compose`, pero hoy no existe. Todo se ejecuta en procesos locales.
- **Usa `localhost`, no `127.0.0.1`,** para abrir la PWA, el dashboard y el portal. Las cookies de Sanctum solo funcionan con los hosts de `SANCTUM_STATEFUL_DOMAINS` (ver §7 y §9).

## 2. Piezas, puertos y comandos

| Pieza | Carpeta | Comando (desde la carpeta indicada) | Dirección para abrir | Puerto | Notas |
|---|---|---|---|---|---|
| API Laravel | `apps/api/src` | `php artisan serve --host=127.0.0.1 --port=8000` | Sin interfaz; rutas bajo `http://127.0.0.1:8000/api/v1/...` | 8000 | Única dueña de BD y lógica. Alternativa: `composer dev` (ver §5.1). |
| PWA veterinaria | `apps/pwa` | `npm run dev` (script: `vite --config vite.config.ts --host 0.0.0.0`) | `http://localhost:5173/` | 5173 | Sin `strictPort`. Rol requerido: `veterinarian`. |
| Dashboard | `apps/dashboard` | `npm run dev` (script: `vite --host 0.0.0.0`) | `http://localhost:5174/` | 5174 | `strictPort: true`. Roles `admin` y `zoo-admin` con 2FA. |
| Portal público | `apps/web` (raíz del repo) | `php -S localhost:8080 -t apps/web/src apps/web/src/router.php` | `http://localhost:8080/` | 8080 | Sitio estático. No tiene `package.json`. |
| App móvil | `apps/mobile` | `npm start` (tras `npm ci` en la raíz) | Expo Go | Metro (no verificado) | Opcional para este flujo. Ver §5.5. |

Fuentes: [apps/api/src/composer.json](../apps/api/src/composer.json), [apps/pwa/package.json](../apps/pwa/package.json), [apps/dashboard/package.json](../apps/dashboard/package.json), [apps/pwa/vite.config.ts](../apps/pwa/vite.config.ts), [apps/dashboard/vite.config.ts](../apps/dashboard/vite.config.ts), [apps/web/README.md](../apps/web/README.md).

## 3. Requisitos previos

- **PHP 8.4 o posterior** con CLI, `pdo_mysql`, `mbstring`, `xml`, `bcmath`, `curl`, `fileinfo`, `openssl`, `tokenizer` y `ctype`. `apps/api/src/composer.json` exige `php ^8.4`. Ver la lista completa en [apps/api/docs/requisitos-entorno.md](../apps/api/docs/requisitos-entorno.md), que todavía dice PHP 8.2 (contradicción, ver §11).
- **Composer 2.**
- **Node.js 22+** y npm (PWA: [apps/pwa/README.md](../apps/pwa/README.md)). Mobile pide Node 22.x ([apps/mobile/README.md](../apps/mobile/README.md)).
- **Certificado CA de Aiven** (`DB_SSL_CA`), con ruta absoluta en tu máquina.
- **Credenciales de `arca_pruebas`** entregadas por el equipo.

## 4. Configuración de la API (`apps/api/src/.env`)

Comandos de [apps/api/docs/requisitos-entorno.md](../apps/api/docs/requisitos-entorno.md):

```bash
cd apps/api/src
composer install
cp .env.example .env
php artisan key:generate
php artisan db:show
```

`php artisan db:show` solo verifica la conexión. No ejecutes `php artisan migrate` contra Aiven: el propio documento lo prohíbe.

### Variables que debes revisar en `.env`

Plantilla: [apps/api/src/.env.example](../apps/api/src/.env.example).

| Variable | Valor de desarrollo | Para qué sirve |
|---|---|---|
| `DB_CONNECTION` | `mysql` | Conexión por `.env` (Constitución I y V). |
| `DB_HOST`, `DB_PORT`, `DB_USERNAME` | Los que entregó el equipo | Host de Aiven. El ejemplo del `.env.example` no es para usar tal cual. |
| `DB_DATABASE` | `arca_pruebas` | Nunca `arca_zoo`. |
| `DB_PASSWORD` | Fuera del repo | Secreto. |
| `DB_SSL_CA` | Ruta absoluta al `ca.pem` | TLS con Aiven. |
| `APP_URL` | `http://localhost:8000` | Base de las URLs de imágenes (`image_url`), ver [infra/README.md](../infra/README.md). |
| `SANCTUM_STATEFUL_DOMAINS` | `localhost:5173,localhost:5174` | Hosts que reciben cookie de sesión y CSRF. Ver [config/sanctum.php](../apps/api/src/config/sanctum.php). |
| `CORS_ALLOWED_ORIGINS` | `http://localhost:5173,http://localhost:5174,http://localhost:8080` | Orígenes exactos que pueden llamar a `api/*` y `sanctum/csrf-cookie` desde el navegador. Ver [config/cors.php](../apps/api/src/config/cors.php). |
| `PWA_URL` | `http://localhost:5173` | Destino de redirección para el rol veterinario desde el dashboard. El `.env.example` la deja vacía; si está vacía, el dashboard informa que la PWA no está disponible. Ver [StaffProfileResource.php](../apps/api/src/app/Http/Resources/StaffProfileResource.php) y [manual-demo.md](../apps/dashboard/docs/manual-demo.md). |
| `SESSION_DRIVER` | `database` | Sesiones en la tabla `sessions` (creada por la migración `2026_10_14_000002_staff_authentication_schema.php`, que aplica el responsable de BD). Si la tabla no existe, las sesiones en base de datos no funcionan (no probado). |
| `SESSION_DOMAIN` | `null` | No compartir la cookie entre subdominios. |
| `DEMO_STAFF_PASSWORD` | Fuera del repo | Contraseña común de las cuentas demo. Lo exige `DemoStaffSeeder`: mínimo 12 caracteres con mayúsculas, minúsculas, números y símbolos. Ver [config/arca.php](../apps/api/src/config/arca.php). |

Después de cambiar `.env`, reinicia `php artisan serve`. Si un cambio no surte efecto y hay caché de configuración, ejecuta `php artisan config:clear` (comando estándar de Laravel; no aparece en el repo). `php artisan config:cache` se usa en despliegue, según [infra/README.md](../infra/README.md).

### Imágenes de noticias y eventos

```bash
cd apps/api/src
php artisan storage:link
```

Sin el enlace `public/storage`, las imágenes no se ven ([infra/README.md](../infra/README.md), sección de imágenes). Además, `php.ini` debe permitir subidas mayores de 5 MB (`upload_max_filesize` y `post_max_size`), según el mismo checklist.

**Pendiente, no aplicar todavía:** la infra prevé `PUBLIC_MEDIA_DISK=media` y `PRIVATE_MEDIA_DISK=media` para los medios de prueba compartidos ([ADR 0026](adr/0026-object-storage-s3-images.md), propuesto; [api-013](../apps/api/specs/013-object-storage-images.md), en Borrador). Hoy estas variables no tienen efecto: no se leen en `apps/api/src/config/`. Las imágenes van a `storage/` y el enlace es `public/storage`. Cuando se aprueben, esta sección cambiará.

### Usuarios demo y seeders

Las cuentas demo las siembra el responsable de BD ([manual-demo.md, requisitos previos](../apps/dashboard/docs/manual-demo.md)). Si necesitas repetir la siembra en `arca_pruebas`, pide la autorización al responsable y usa `--class`:

```bash
php artisan db:seed --class=DepartmentSeeder
php artisan db:seed --class=RolesAndPermissionsSeeder
php artisan db:seed --class=DemoStaffSeeder
```

- No ejecutes `php artisan db:seed` sin `--class`: `DatabaseSeeder` también llama a `DemoStaffSeeder` ([infra/README.md](../infra/README.md)).
- `DemoStaffSeeder` se niega a correr en `production` y en `arca_zoo`. Necesita que existan los departamentos (`firstOrFail`), así que `DepartmentSeeder` va antes. Crea o actualiza cuentas por correo (`updateOrCreate`). Si `ticket_prices` está vacía, inserta las tarifas iniciales de [DBR-006](database/requests/DBR-006-ticket-sales.md) ($25 adulto y $16 niño).
- `RolesAndPermissionsSeeder` no define `species.review` ni `memories.review` (verificado con búsqueda en el archivo). Mientras no se agreguen, `zoo-admin` no puede revisar solicitudes de especie.

### Cuentas demo

Correos y roles según [DemoStaffSeeder.php](../apps/api/src/database/seeders/DemoStaffSeeder.php). La contraseña es la de `DEMO_STAFF_PASSWORD` y no se documenta aquí. Referencia de cuentas de prueba de BD: [apps/api/docs/credenciales-desarrollo.md](../apps/api/docs/credenciales-desarrollo.md); no copies contraseñas de ahí a la documentación.

| Correo | Rol | Dónde entra | Segundo factor |
|---|---|---|---|
| `presidencia@arca.local` | `admin` | Dashboard, administración completa | Sí (2FA obligatorio) |
| `admin@arca.local` | `admin` | Dashboard, administración completa | Sí |
| `direccion_zoo@arca.local` | `zoo-admin` | Dashboard, sin Usuarios | Sí |
| `ejecutivo@arca.local` | `executive` | Panel y reporte, solo lectura | No |
| `boletaje@arca.local` | `cashier` | Dashboard, venta e historial | No |
| `veterinario@arca.local` | `veterinarian` | PWA veterinaria (`home = pwa`) | No |

Fuente de la tabla de 2FA y de accesos: [manual-demo.md](../apps/dashboard/docs/manual-demo.md). Para el rol veterinario, [ResolveStaffHomeAction.php](../apps/api/src/app/Actions/Auth/ResolveStaffHomeAction.php) asigna `pwa`.

## 5. Arranque por aplicación

### 5.1 API

```bash
cd apps/api/src
php artisan serve --host=127.0.0.1 --port=8000
```

Alternativa: `composer dev` ([composer.json](../apps/api/src/composer.json)) levanta a la vez `php artisan serve`, un worker de colas, `pail` (logs) y `npm run dev` (Vite de la API, [vite.config.js](../apps/api/src/vite.config.js)). Requiere las dependencias Node de `apps/api/src`, que no están documentadas en `requisitos-entorno.md` (por confirmar). Para PWA, dashboard y portal basta con `php artisan serve`.

La API responde en `http://127.0.0.1:8000/api/v1/...`. Como ruta pública de prueba existe `GET /api/v1/species` ([routes/api.php](../apps/api/src/routes/api.php)); no se ejecutó, así que su respuesta exacta no está verificada.

### 5.2 PWA veterinaria (`apps/pwa`)

```bash
cd apps/pwa
npm install            # o: corepack pnpm install --frozen-lockfile
npm run dev
```

Abre **`http://localhost:5173/`**. Entra con `veterinario@arca.local`. Si el perfil no tiene `home = pwa`, la PWA muestra acceso denegado ([useStaffSession.ts](../apps/pwa/src/viewmodels/useStaffSession.ts)).

- El proxy de [vite.config.ts](../apps/pwa/vite.config.ts) envía `/api` y `/sanctum` a `ARCA_API_PROXY_TARGET`, con valor por defecto `http://127.0.0.1:8000`.
- La PWA llama a `POST /api/v1/auth/login`, la ruta de Fortify ([packages/api-client/auth.ts](../packages/api-client/auth.ts); prefijo en [fortify.php](../apps/api/src/config/fortify.php)).
- Hoy registra animales contra la API y exige un recinto existente ([pwa-004](../apps/pwa/specs/004-animal-registration.md)). Según el README de la PWA, diagnósticos y revisiones clínicas no envían datos al servidor. La solicitud de especie es [pwa-005](../apps/pwa/specs/005-species-request-submission.md), en Borrador.

### 5.3 Dashboard (`apps/dashboard`)

```bash
cd apps/dashboard
npm ci
npm run dev
```

Abre **`http://localhost:5174/`**. El puerto está fijado con `strictPort`: si está ocupado, Vite falla. El proxy de [vite.config.ts](../apps/dashboard/vite.config.ts) envía `/api` y `/sanctum` a `ARCA_API_PROXY_TARGET`, con valor por defecto `http://localhost:8000`. Ten en cuenta que el valor por defecto de la PWA es `127.0.0.1` y el del dashboard es `localhost`.

Entra con una cuenta de la tabla de §4. `admin` y `zoo-admin` configuran su 2FA en el primer acceso ([manual-demo.md](../apps/dashboard/docs/manual-demo.md)). Login real: [dashboard-002](../apps/dashboard/specs/002-real-staff-login.md), Aprobada y en progreso.

### 5.4 Portal público (`apps/web`)

Desde la raíz del repositorio:

```bash
php -S localhost:8080 -t apps/web/src apps/web/src/router.php
```

Abre **`http://localhost:8080/`**. El router [router.php](../apps/web/src/router.php) devuelve `404` sin redirigir cuando la ruta no existe.

- Las tres páginas (`index.html`, `noticias.html`, `eventos.html`) declaran `<meta name="arca-api-base" content="http://localhost:8000/api/v1">` ([index.html](../apps/web/src/index.html)). Esa base apunta a la API.
- El portal no envía cookies (`credentials: 'omit'`); no necesita `SANCTUM_STATEFUL_DOMAINS`, pero sí `http://localhost:8080` en `CORS_ALLOWED_ORIGINS`. `http://127.0.0.1:8080` es otro origen y no funciona sin añadirlo ([apps/web/README.md](../apps/web/README.md)).
- Noticias y eventos: [web-009](../apps/web/specs/009-dynamic-news-events.md), Aprobada, implementación en curso. Documentación: [portal-noticias-eventos.md](../apps/web/docs/portal-noticias-eventos.md).
- Comprobación de estados HTTP, según el README del portal:

```bash
curl -I http://localhost:8080/ruta-inexistente   # 404
curl -I http://localhost:8080/index.html         # 200
```

### 5.5 App móvil (`apps/mobile`), resumen

Requiere pasos propios; no participa en el flujo de especies. Resumen de [apps/mobile/README.md](../apps/mobile/README.md):

- Desde la raíz: `npm ci`. Después, en `apps/mobile`: `npm start` y escanear el QR con Expo Go (SDK 57).
- Con API, la app necesita `apps/mobile/.env` con `EXPO_PUBLIC_API_URL=http://IP-LAN:8000/api/v1`, no `127.0.0.1`. La API debe escuchar en `--host=0.0.0.0`. El archivo `.env` no se versiona.
- Sin `EXPO_PUBLIC_API_URL` la app usa datos simulados.

## 6. Orden de arranque

1. `php artisan db:show` en `apps/api/src`: confirma la conexión a `arca_pruebas`.
2. API en `:8000`.
3. PWA en `:5173` y dashboard en `:5174`, en cualquier orden.
4. Portal en `:8080`.
5. Abre las pantallas con `localhost`.
6. Mobile solo si lo necesitas.

Después de cambiar `.env` de la API, reinicia `php artisan serve`. Después de cambiar `vite.config.ts`, reinicia Vite.

## 7. Puertos, orígenes y variables

| Variable | Dónde | Valor de desarrollo | Quién la lee |
|---|---|---|---|
| `APP_URL` | `apps/api/src/.env` | `http://localhost:8000` | API (URLs de imagen) |
| `SANCTUM_STATEFUL_DOMAINS` | `apps/api/src/.env` | `localhost:5173,localhost:5174` | API (cookie y CSRF de PWA y dashboard) |
| `CORS_ALLOWED_ORIGINS` | `apps/api/src/.env` | `http://localhost:5173,http://localhost:5174,http://localhost:8080` | API (navegador, sin proxy: portal) |
| `SESSION_DRIVER` | `apps/api/src/.env` | `database` | API (sesiones en la tabla `sessions`; si falta, no funciona; no probado) |
| `SESSION_DOMAIN` | `apps/api/src/.env` | `null` | API |
| `PWA_URL` | `apps/api/src/.env` | `http://localhost:5173` | API (redirección del rol veterinario) |
| `ARCA_API_PROXY_TARGET` | Entorno de Vite (PWA, dashboard) | PWA: `http://127.0.0.1:8000`; dashboard: `http://localhost:8000` (defaults) | Vite (proxy `/api` y `/sanctum`) |
| `meta arca-api-base` | `apps/web/src/*.html` | `http://localhost:8000/api/v1` | Portal (`js/api.js`) |
| `PUBLIC_MEDIA_DISK`, `PRIVATE_MEDIA_DISK` | `apps/api/src/.env` | `media` (**pendiente**, sin efecto hoy) | API (propuesto, api-013) |

Orígenes de navegador (los que ve el usuario): `http://localhost:5173` (PWA), `http://localhost:5174` (dashboard), `http://localhost:8080` (portal). La API escucha en `http://127.0.0.1:8000`.

Los proxies de PWA y dashboard reenvían con `changeOrigin: false`, así que la API ve el host del navegador (`localhost:5173` o `localhost:5174`) y lo compara con `SANCTUM_STATEFUL_DOMAINS`.

## 8. Flujo de prueba extremo a extremo: solicitud de especie

Caso: un veterinario solicita una especie en la PWA, `zoo-admin` la revisa en el dashboard y, si se aprueba, aparece en TulanPedia del portal.

**Hoy no se puede ejecutar de punta a punta.** El flujo está en Borrador y no tiene código en ninguna app (búsqueda sin coincidencias en `apps/api`, `apps/pwa`, `apps/dashboard` y `apps/web`).

| Paso | Quién / dónde | Qué debe pasar | Estado |
|---|---|---|---|
| 1 | `veterinario@arca.local` en `http://localhost:5173` | Inicia sesión y entra a la PWA (`home = pwa`). | Implementado: [pwa-003](../apps/pwa/specs/003-staff-login.md), Aprobada. |
| 2 | Veterinario en la PWA | Envía una solicitud de especie. | **Por crear.** [pwa-005](../apps/pwa/specs/005-species-request-submission.md) en Borrador. Depende de [api-014](../apps/api/specs/014-species-requests.md) (Borrador) y de [DBR-013](database/requests/DBR-013-species-requests.md) (Borrador, sin migración). |
| 3 | `direccion_zoo@arca.local` en `http://localhost:5174` | Inicia sesión con 2FA y revisa la solicitud. | **Por crear.** [dashboard-009](../apps/dashboard/specs/009-species-request-review.md) y [dashboard-010](../apps/dashboard/specs/010-public-content-management.md), ambas en Borrador. Requiere `species.review`, que [api-014](../apps/api/specs/014-species-requests.md) asigna en su tarea futura T-SEED; hoy el seeder no lo define. |
| 4 | Visitante en `http://localhost:8080` | La especie aprobada aparece en TulanPedia. | **Por crear.** [web-011](../apps/web/specs/011-dynamic-tulanpedia.md) en Borrador. Depende de [ADR 0028](adr/0028-dynamic-tulanpedia-catalog.md) (Propuesto). Hoy TulanPedia muestra fichas de muestra fijas en `index.html`. |

Partes que sí puedes probar hoy: el login del veterinario en la PWA, la lectura pública de especies (`GET /api/v1/species`, [api-006](../apps/api/specs/006-public-catalog-read.md), Aprobada) y las noticias y eventos del portal ([web-009](../apps/web/specs/009-dynamic-news-events.md)).

Pendiente de crear: **`api-015`** no tiene archivo en `apps/api/specs/` (verificado al 2026-11-11). Si se confirma que existe en el plan de otro agente, la guía debe actualizarse cuando aparezca.

## 9. Solución de problemas

| Síntoma | Causa probable | Qué hacer |
|---|---|---|
| Login falla con **419** (CSRF) o **401** tras el login | Abriste con `127.0.0.1`. La cookie se emite para `localhost` y no para `127.0.0.1`, que no está en `SANCTUM_STATEFUL_DOMAINS`. | Abre `http://localhost:5173` o `:5174`. Reinicia la API si cambiaste `.env`. |
| Login correcto pero la sesión no persiste | Cookies de otro host o `SESSION_DRIVER`/tabla `sessions` ausente | Revisa `SESSION_DRIVER=database`. Si falta la tabla `sessions`, avisa al responsable de BD; no migres tú. |
| **Cookies compartidas entre PWA y dashboard** | Las cookies no se aíslan por puerto: `localhost:5173` y `localhost:5174` comparten el mismo almacén de cookies del navegador. | Inicia sesión en un solo cliente a la vez, o usa perfiles o ventanas privadas distintos. |
| **CORS** en la consola del portal | El origen no coincide exacto (esquema, host y puerto). `127.0.0.1:8080` no es `localhost:8080`. | Revisa `CORS_ALLOWED_ORIGINS` y sirve el portal en `http://localhost:8080`. Ver [infra/README.md](../infra/README.md), sección de portal. |
| El portal no muestra noticias ni eventos | CORS, o la meta `arca-api-base` no apunta a la API, o la API no está en marcha | Revisa las tres causas. Prueba `curl -i -H "Origin: http://localhost:8080" http://localhost:8000/api/v1/news?limit=3`. |
| **`strictPort` ocupado** (dashboard no arranca) | Otro proceso usa 5174 | Cierra el proceso que lo usa. No cambies el puerto sin revisar `SANCTUM_STATEFUL_DOMAINS` y `CORS_ALLOWED_ORIGINS`. |
| La PWA arranca en otro puerto | Vite, sin `strictPort`, usa el siguiente puerto libre si 5173 está ocupado. Si cae en 5174, el dashboard no arranca | Libera el 5173 antes de iniciar la PWA. |
| **Proxy sin API** (502, `ECONNREFUSED` en la terminal de Vite) | La API no está en marcha o el destino del proxy no coincide | Arranca `php artisan serve` primero. Si la API escucha en otro puerto, define `ARCA_API_PROXY_TARGET`. Si el dashboard falla con `localhost` y la API responde en `127.0.0.1`, prueba `ARCA_API_PROXY_TARGET=http://127.0.0.1:8000` (posible causa, no reproducida). |
| Imágenes de noticias o eventos no se ven (404 en `/storage/...`) | Falta `storage:link` o `APP_URL` no es `http://localhost:8000` | Ejecuta `php artisan storage:link` en `apps/api/src`. Revisa `APP_URL`. |
| La PWA no entra y dice que no es para tu cuenta | El rol no es `veterinarian` o el perfil no tiene `home = pwa` | Usa `veterinario@arca.local`. |
| Dashboard dice que la PWA no está disponible | `PWA_URL` vacía | Define `PWA_URL=http://localhost:5173` en `.env` de la API y reinicia. |
| Admin o `zoo-admin` no pasa del 2FA | Primer acceso sin configurar, o código caducado | Sigue el flujo de [manual-demo.md](../apps/dashboard/docs/manual-demo.md). |
| `DemoStaffSeeder` falla | `DEMO_STAFF_PASSWORD` vacía, no cumple la política, o faltan departamentos | Define la variable fuera del repo, ejecuta `DepartmentSeeder` primero y pide autorización al responsable de BD. |

## 10. Qué está verificado y qué no

- Verificado en archivos: puertos y `strictPort` en ambos `vite.config`, proxies y sus defaults, `cors.php`, `sanctum.php`, `.env.example`, `DemoStaffSeeder.php`, `DatabaseSeeder.php`, `routes/api.php`, `fortify.php` (prefijo), `composer.json` (`dev`, `php ^8.4`), la existencia de `sessions` en las migraciones, y la ausencia de `PUBLIC_MEDIA_DISK` en `config/`.
- No verificado ejecutando: ningún comando de esta guía se corrió (no hay shell en esta sesión). No se probó conectividad con Aiven, ni `php -S` en macOS, ni `npm ci` en las apps.
- No verificado: `php artisan log` (aparece en la guía de la PWA, ver §11), dependencias Node de `apps/api/src` para `composer dev`, puerto de Metro de Expo, y el comportamiento exacto de `GET /api/v1/species` sin datos.

## 11. Contradicciones entre documentos (no corregidas aquí)

- [apps/pwa/README.md](../apps/pwa/README.md) y [apps/pwa/docs/GUIA_EJECUCION.md](../apps/pwa/docs/GUIA_EJECUCION.md) pide abrir `http://127.0.0.1:5173` y añadir `127.0.0.1:5173` a `SANCTUM_STATEFUL_DOMAINS`. Contradice el `.env.example` y esta guía (§1, §9).
- La guía de la PWA crea usuarios de prueba con `password('password')` en tinker. Contradice la política de `DemoStaffSeeder` y el checklist de secretos.
- La guía de la PWA dice «Puedes ver y editar diagnósticos (local)» y «Los datos guardados se envían a la API». El README de la PWA dice que los diagnósticos y revisiones no envían datos al servidor.
- La guía de la PWA menciona «Google Cloud» como opción de despliegue. `infra/README.md` dice que Google Cloud dejó de ser el destino.
- La guía de la PWA usa `php artisan log`, que no está verificado como comando de Artisan.
- El README de la PWA dice «Sin modo sin conexión», mientras `apps/pwa/AGENTS.md` describe borradores offline como parte del alcance. Puede ser estado actual vs. alcance futuro; no se resolvió.
- [apps/api/docs/requisitos-entorno.md](../apps/api/docs/requisitos-entorno.md) pide PHP 8.2 o posterior. `composer.json` y `AGENTS.md` piden PHP 8.4 o posterior.
- Dos rutas de login en la API: `POST /api/v1/auth/login` (Fortify, usado por api-client, PWA y dashboard) y `POST /api/v1/staff/auth/login` (`routes/api.php`, `AuthController::login`, sin consumidor en los clientes revisados). Posible duplicado; lo revisa backend.
- `infra/README.md` describe `PUBLIC_MEDIA_DISK` y `PRIVATE_MEDIA_DISK` como requisitos de `.env`, pero no hay código que los lea. La sección está marcada como pendiente de aprobación; conviene que lo indique en el propio checklist.
- La PWA tiene dos lockfiles, `pnpm-lock.yaml` y `package-lock.json`. El README acepta ambos instaladores, pero no dice cuál es la fuente de verdad.
- Los valores por defecto del proxy difieren: la PWA usa `127.0.0.1:8000` y el dashboard `localhost:8000`.
- `apps/web/src/index.html` apunta la meta a `http://localhost:8000/api/v1`, mientras la sección de origen de `web-009` habla de `8080`. No es contradicción de valor (8080 es el portal, 8000 la API), pero el texto de `web-009` CA-16 puede confundir. `web-011` ya lo marca como pregunta 8.
- [apps/dashboard/README.md](../apps/dashboard/README.md) sigue con las credenciales `administrador@demo.local` / `taquilla@demo.local` y «Perfiles de demostración» del prototipo (ver §12).

## 12. Cambios en documentos relacionados

- `docs/README.md`: se añadió el enlace a esta guía en «Guías».
- `apps/dashboard/README.md`: la advertencia inicial y «Instalar y ejecutar» deberían corregirse según el texto propuesto en el informe. La edición está bloqueada por el hook `documentador-paths.sh`, que solo permite `apps/<app>/{specs,plan,tasks,docs}/` y `docs/`.
