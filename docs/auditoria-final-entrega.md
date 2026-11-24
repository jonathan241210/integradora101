# Auditoría final previa a la entrega

Revisión completa de seguridad, puertas traseras, rendimiento, buenas prácticas y escalabilidad de todo el monorepo, hecha antes de iniciar las pruebas reales. Los hallazgos altos se corrigieron mediante `api-028`, `pwa-012` y `mobile-018`; los demás quedan registrados aquí como pendientes priorizados para el equipo que continúe el proyecto.

Severidad: **Alta** (riesgo real de fuga de datos, abuso o pérdida de información), **Media** (riesgo acotado o problema de escala), **Baja** (higiene o mejora).

## Resumen

- No se encontraron vulnerabilidades críticas ni puertas traseras: no hay `dd`, `dump`, `eval`, `exec`, `unserialize`, rutas de depuración ni credenciales versionadas; el SQL crudo usa parámetros; `.env` y `google-services.json` están ignorados.
- Se corrigieron 10 hallazgos altos (catálogo público, permisos de personal, sincronización y su reintento, script destructivo, seeders, subida de fotos, datos offline, build móvil y datos de prueba en el móvil) y 9 medios o bajos.
- Quedan pendientes mejoras medias de rendimiento y escala que no bloquean las pruebas reales.

## Lo que ya está bien

- Taquilla: ventas y cancelaciones en transacción con `lockForUpdate`; la cancelación verifica que el boleto sea del mismo cajero.
- Los datos de cada visitante están acotados a su cuenta (memorias, favoritos, progreso).
- CORS sin comodín; cookie de sesión `secure` en producción; `APP_DEBUG=false` por defecto en `config/app.php`.
- El seeder demo se bloquea en producción, en `arca_zoo` y sin contraseña demo fuerte.
- Contraseñas y secretos 2FA ocultos en los modelos; 2FA obligatorio en roles del panel y confirmación reforzada (step-up) en acciones sensibles.
- Imágenes de memorias, especies y noticias se re-codifican (sin metadatos); imágenes privadas con `nosniff`.
- Los tests verifican que la base sea `arca_pruebas` y usan `DatabaseTransactions`.
- Dashboard con cookie Sanctum y `X-XSRF-TOKEN`; móvil con tokens en `expo-secure-store`.
- Dependencias al día (React 19, Vite 7, Expo 57, jspdf 4, dompurify 3).

## Hallazgos corregidos

| # | Severidad | Hallazgo | Corrección |
|---|---|---|---|
| 1 | Alta | El catálogo público (`/species`, `/enclosures`) exponía observaciones internas del personal, fecha de nacimiento exacta y ejemplares en cuarentena | `api-028` CA-01, CA-02 |
| 2 | Alta | `/staff/*` solo exigía sesión de personal, sin permiso de expediente médico ni límite de peticiones | `api-028` CA-03 a CA-06 |
| 3 | Alta | `sync/operations` aceptaba lotes ilimitados y guardaba errores transitorios como rechazos definitivos (pérdida de evaluaciones) | `api-028` CA-07, CA-08; `pwa-012` trata `retry` como pendiente |
| 4 | Alta | `docs/database/backups/reset-and-init.php` borraba todas las tablas sin confirmación ni bloqueo de producción | `api-028` CA-13 |
| 5 | Alta | Seeders `Dbr019*` ejecutables en producción | `api-028` CA-12 |
| 6 | Alta | Subida de fotos de la PWA con `fetch` directo, sin `X-XSRF-TOKEN` y fuera de `@arca/api-client` | `pwa-012` CA-01, CA-02, CA-08 |
| 7 | Alta | Datos clínicos offline de la PWA quedaban en IndexedDB al cerrar sesión; el service worker cacheaba `/storage` y errores | `pwa-012` CA-03 a CA-07 |
| 8 | Alta | Sin perfil de producción móvil: HTTP sin cifrar y respaldo a `http://10.0.2.2` | `mobile-018` CA-01, CA-02 |
| 9 | Alta | Pantallas del móvil mostraban usuario, misiones, logros, cuenta y ejemplares inventados | `mobile-018` CA-03 a CA-08 |
| 10 | Media | Rutas de visitante sin límite (`verify`, `refresh`, `reset`) y «olvidé mi contraseña» solo por correo | `api-028` CA-09 |
| 11 | Media | Modelos clínicos con `$guarded = []` | `api-028` CA-10 |
| 12 | Media | Sin proxies de confianza: los límites por IP se vuelven globales detrás de un balanceador | `api-028` CA-11 |
| 13 | Media | `.env.example` con `APP_DEBUG=true`, `LOG_LEVEL=debug` y host real del proveedor | `api-028` CA-14 |
| 14 | Media | Sin CSP, HSTS, X-Frame-Options ni Referrer-Policy | Documentado en el checklist de `infra/README.md` (se configura en el proxy) |
| 15 | Alta | Un error inesperado en la sincronización quedaba como rechazo que la PWA reintentaba sin fin | `api-028` RN-04; la PWA trata todo `rejected` como definitivo |
| 16 | Media | La cola offline se enviaba en un solo lote; con el nuevo tope de 100 una cola grande quedaba rechazada | `pwa-012` CA-09 (lotes de 100 en orden) |
| 17 | Media | Login de personal y de visitante sin límite solo por IP (una contraseña probada contra muchos correos) | `api-028` CA-16 |
| 18 | Baja | Un `operation_uuid` de otro usuario devolvía su resultado; un `cursor` inválido provocaba error 500 | `api-028` CA-15, CA-17 |
| 19 | Media | El build de producción móvil aceptaba una URL de API `http://` | `mobile-018` CA-02 |

## Pendientes priorizados

### Seguridad

| Severidad | Hallazgo | Ubicación | Recomendación |
|---|---|---|---|
| Media | La expiración de tokens Sanctum (15 min) aplica también a la PWA offline; la sincronización puede fallar con 401 frecuente | `apps/api/src/config/sanctum.php:47` | Confirmar el valor con el uso real en campo |
| Media | Las pruebas corren en el mismo servidor de Aiven que producción, solo con otra base | `phpunit.xml` | Servidor separado o MySQL local para CI |
| Baja | Fotos de ejemplares sin re-codificar (conservan EXIF/GPS); el archivo se escribe dentro de la transacción y `updatePhoto` no borra la anterior | `AnimalController.php:150,183` | Re-codificar como las demás imágenes y escribir tras el commit |
| Baja | No se purgan tokens vencidos (`sanctum:prune-expired`, `visitor_refresh_tokens`, `sync_operations`) | `routes/console.php` | Programar limpieza |
| Baja | Se registra el mensaje de Expo, que puede incluir el token push | `Push/ExpoPushGateway.php:46` | Enmascarar el token |
| Baja | `SESSION_ENCRYPT=false` | `.env.example` | Evaluar activarlo en producción |
| Baja | `router.php` de web sirve cualquier archivo de `src/`, incluidos los tests | `apps/web/src/router.php:19` | Desplegar solo archivos públicos |
| Baja | `index.html`, `eventos.html` y `noticias.html` de web traen la API en `localhost` y `tudominio.com` en canonical/og | `apps/web/src/*.html` | Sustituir en el despliegue |

### Pruebas y tipos detectados en la revisión

Las pruebas web desactualizadas por el rediseño del mapa y por los cambios de íconos y del asistente cognitivo se ajustaron (`web-004` T-25, `web-005` CA-04, `web-008` CA-05).


| Severidad | Hallazgo | Ubicación | Recomendación |
|---|---|---|---|
| Media | `apps/web` no corre en CI, por eso estas regresiones pasaron sin aviso | `.github/workflows/ci.yml` | Agregar `node --test apps/web/src/tests/*.mjs` |
| Media | `mobile-017` (mapa SVG canónico) no tiene pruebas con nombre de sus CA (Constitución IV) | `apps/mobile/__tests__` | Agregar pruebas por CA |
| Media | `tsc --noEmit` del móvil marca 5 errores de tipos en archivos del mapa y de AR (`ArTourOverlay.tsx`, `MapPlaceCard.tsx`, `ViroArAnchorScene.tsx`, `MapScreen.tsx`); el CI no ejecuta el chequeo de tipos del móvil | `apps/mobile/src` | Corregir los tipos y agregar `tsc` al CI |
| Media | 22 pruebas de la API ya fallaban antes de esta revisión (misma lista en la rama `copia_proyecto`): imágenes de noticias y eventos (disco `media` frente a `storage`, metadatos ICC), búsqueda global y conteos de avisos push (dependen de datos compartidos de `arca_pruebas`), `PublicCatalogTest` ca01/ca02/ca05 (columnas `diet` y `longevity` que ya no existen), `EnclosuresAdminTest` ca17 (inserta animales sin `stay_status`), `EnclosureQrTest` ca10, `MemoriesReviewVisibilityTest` ca17, `Visitor/CoverageTest` ca21 y `ContentImageCoverageTest` rn03 | `apps/api/src/tests/Feature` | Actualizar las pruebas al esquema actual y aislar sus datos; correr la suite Feature en CI |
| Baja | La suite completa de la API supera el límite de 128 MB de PHP y tarda ~2.5 h contra Aiven | `apps/api/src/phpunit.xml` | Usar `-d memory_limit=1G` y una base MySQL local para pruebas |
| Baja | `TRUSTED_PROXIES=*` permitiría falsificar la IP y evadir los límites | `infra/README.md` | Usar siempre el CIDR del proxy |

### Rendimiento y escalabilidad

| Severidad | Hallazgo | Ubicación | Recomendación |
|---|---|---|---|
| Media | `/species` y `/enclosures` cargan todos los ejemplares y no tienen caché | `Actions/Catalog/*` | Caché con invalidación al editar, o paginación |
| Media | `sync/bootstrap` trae todos los ejemplares, recintos y especies | `StaffSyncController::bootstrap` | Paginar o sincronizar por cambios |
| Media | Listas de noticias y eventos del panel sin paginar | `Admin/Content/ListNewsAction.php`, `ListEventsAdminAction.php` | Paginar |
| Media | Correo de códigos de visitante síncrono: un fallo de SMTP devuelve 500 | `SendVisitorCodeAction.php:39` | Enviar en cola |
| Media | Avisos push con `whereIn` gigante y reenvío del lote completo al reintentar | `Jobs/SendPushJob.php` | `chunkById` y marcar bloques enviados |
| Media | `mapa_corregido.glb` pesa 29 MB | `apps/web/src/assets/` | Comprimir con Draco o meshopt |
| Baja | Avatares móviles de 0.8 a 1.5 MB cada uno (~9 MB) | `apps/mobile/src/assets/avatars/` | Redimensionar o WebP |
| Baja | Dashboard en un solo bundle de ~408 KB | `apps/dashboard` | `React.lazy` por ruta |
| Baja | `SyncStatusView` consulta IndexedDB cada 3 s | `apps/pwa/src/views/SyncStatusView.tsx:32` | Suscripción a cambios |

### Buenas prácticas

| Severidad | Hallazgo | Ubicación | Recomendación |
|---|---|---|---|
| Media | Controladores gruesos con validación y lógica en línea; `StaffSyncController` llama a otro controlador con un `Request` interno | `Api/ClinicalEvaluationController.php`, `Api/StaffSyncController.php` | Mover a Actions y FormRequests |
| Media | El CI solo corre la suite Unit de la API, no prueba `apps/web` ni ejecuta `npm audit` | `.github/workflows/ci.yml` | Agregar Feature, web y auditoría de dependencias |
| Media | La PWA tiene pocas pruebas para el flujo offline clínico (sin tests con nombre CA en `pwa-009`) | `apps/pwa` | Completar pruebas del outbox y la sincronización |
| Baja | `packages/*` sin pruebas propias | `packages/` | Pruebas del cliente HTTP |
| Baja | Restos: vista `welcome`, comando `inspire`, `ExampleTest`, clases CSS `demo-*`, dependencia `dexie` sin usar, imagen de WhatsApp sin referencia, logos sueltos en `packages/ui` | Varios | Eliminar |
| Baja | Colores fijos en lugar de tokens (35 en `apps/web/src/styles.css`, pocos en la PWA y `app.json`) | Varios | Migrar a tokens |
| Baja | Migraciones con prefijo duplicado (`2026_11_18_000020_*`, `_000021_*`) | `apps/api/src/database/migrations` | Sin acción: renombrar migraciones aplicadas es más riesgoso |
| Baja | Números de spec duplicados (api 007, 008, 010, 019; mobile 009; web 010) y DBR-020/021 duplicados | `apps/*/specs`, `docs/database/requests` | Sin acción: renombrar rompería referencias |
| Baja | `AGENTS.md` menciona `GET /api/theme`, pero esa ruta no existe en la API | `AGENTS.md` | Actualizar la regla cuando se defina el tema |

## Fuera de alcance de esta entrega

- Política de respaldo y retención de imágenes en producción, y limpieza de archivos huérfanos.
- Aplicación de las DBR en staging y producción: está pendiente del despliegue (ver `infra/README.md`).
- Videojuego Zoopedia (ADR 0005).
