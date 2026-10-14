# 005 · visitor-progress

- App dueña: `api`
- Apps/paquetes afectados: `api`, `mobile` (consumidor), `packages/api-client`
- Estado: Borrador
- Solicitante / responsable funcional: Aksel
- Responsable de BD: Victor Adrian
- Aprobación funcional: pendiente de aprobación

## Problema y contexto

Con la cuenta del visitante definida en `api-004` (ADR 0011), el progreso se guarda en el servidor: la colección es **por especie** — el QR del recinto descubre las especies de sus animales en exhibición —, los puntos se registran en un libro mayor sin duplicados, el nivel y el rango se derivan en el servidor, y los logros y misiones son catálogos estáticos cargados por seeders. El QR contiene un código opaco aleatorio (p. ej. `ARCA-7F3K9Q2M`) en `enclosure_qr_codes.code`, y los escaneos sin señal se encolan en la app y se validan en el servidor con máximo 24 h de antigüedad.

Los cambios de esquema se solicitan en DBR-004 (`visitor-progress`, depende de DBR-001 y DBR-003). El código consumidor solo se implementa cuando las DBR estén en `Lista para backend`.

## Objetivos

- `POST /api/v1/visitor/discoveries` idempotente por `client_scan_id`, con ventana de validez y límite de frecuencia.
- Descubrimiento por especie con puntos por especie nueva, evaluación de logros/misiones y respuesta completa de resultado.
- Consultas de progreso, colección, logros y misiones con estado calculado por el servidor.
- Niveles configurables en `config/visitor_progress.php` y catálogos por seeders idempotentes.
- Comando `arca:generate-qr-codes` para generar códigos opacos de recinto.

## Fuera de alcance

- Tabla de líderes, premios físicos y contenido social entre visitantes (decisión confirmada: sin líderes ni premios).
- Actualización dinámica de misiones: son contenido estático definido una vez por seeder.
- Impresión y colocación física de los QR (pregunta abierta).
- La interfaz móvil del progreso (spec `mobile-005`) ni el escaneo de cámara (spec `mobile-006`).
- Favoritos y recorrido 3D real.

## Actores y permisos

| Actor/rol | Necesidad | Permisos requeridos |
|---|---|---|
| Visitante adulto (tutor) | Registrar descubrimientos y consultar progreso | Token `visitor` válido (spec `api-004`) |
| Personal del zoológico | Generar códigos QR de recintos | Comando artisan en servidor |

## Historias de usuario

- Como visitante, quiero escanear el QR de un recinto para descubrir sus especies y ganar puntos, aunque esté sin señal.
- Como visitante, quiero ver mis puntos, nivel, rango y cuántas especies me faltan para seguir mi colección.
- Como equipo, quiero que puntos y logros se calculen en el servidor para que nadie pueda alterarlos desde la app.

## Criterios de aceptación

- **CA-01:** Dado un visitante autenticado, cuando envía `POST /api/v1/visitor/discoveries` con `{ code, scanned_at, client_scan_id }`, entonces la API responde de forma idempotente por `client_scan_id`: un segundo envío con el mismo `client_scan_id` devuelve el resultado ya registrado sin duplicar puntos ni especies.
- **CA-02:** Dado un escaneo, cuando `scanned_at` tiene más de 24 h de antigüedad o más de 5 minutos en el futuro, entonces la API lo rechaza con `expired_scan` y lo registra en `visitor_scans`.
- **CA-03:** Dado un visitante, cuando supera 30 escaneos por minuto, entonces la API responde 429 con mensaje en español.
- **CA-04:** Dado un código QR válido y activo, cuando se procesa el descubrimiento, entonces la API registra en la colección las especies de los animales con `can_receive_visits=1` de ese recinto y otorga puntos por cada especie nueva (cantidad configurable, 100 por defecto) en `visitor_point_entries`.
- **CA-05:** Dada una respuesta de `discoveries`, cuando el cliente la consume, entonces tiene la forma `{ result, new_species[], already_known_species[], points_awarded, unlocked_achievements[], completed_missions[], progress }` con `201` para `discovered`, `200` para `already_discovered` y `422` para `invalid_code`, `expired_scan` o `inactive_code`.
- **CA-06:** Dado un visitante autenticado, cuando consulta `GET /api/v1/visitor/progress`, entonces recibe puntos totales (suma del libro mayor), nivel, rango, siguiente umbral y especies descubiertas / total disponibles (especies con al menos un animal en exhibición en un recinto con QR activo).
- **CA-07:** Dado un visitante autenticado, cuando consulta `GET /api/v1/visitor/collection`, entonces recibe las especies con `discovered` y `discovered_at`.
- **CA-08:** Dado un visitante autenticado, cuando consulta `GET /api/v1/visitor/achievements` y `GET /api/v1/visitor/missions`, entonces recibe los catálogos con estado (desbloqueado/completado o pendiente) y progreso calculado por el servidor.
- **CA-09:** Dado un evento de progreso, cuando `EvaluateVisitorProgressAction` evalúa reglas, entonces soporta `species_count`, `category_species_count` (con `rule_param` = categoría), `enclosure_count` y `missions_completed`; los logros y las misiones otorgan sus puntos y el libro mayor (UNIQUE por `visitor_id, source_type, source_id`) garantiza que no se dupliquen; todo ocurre dentro de una transacción.
- **CA-10:** Dada la configuración de niveles en `config/visitor_progress.php`, cuando se calcula el nivel, entonces aplica los umbrales: 1 Explorador novato (0), 2 Explorador (500), 3 Explorador avanzado (1500), 4 Explorador experto (3000), 5 Guardián de la fauna (6000).
- **CA-11:** Dados los seeders, cuando se ejecutan `AchievementSeeder` y `MissionSeeder`, entonces cargan los catálogos de forma idempotente por `code`, basados en los mocks actuales de la app; las recompensas tipo «Certificado» se convierten en puntos o logros porque no hay premios.
- **CA-12:** Dado el comando `php artisan arca:generate-qr-codes {enclosure}`, cuando el personal lo ejecuta, entonces genera códigos opacos aleatorios para los QR del recinto (la impresión queda como pregunta abierta).
- **CA-13:** Dada la suite de PHPUnit, cuando se ejecuta `php artisan test`, entonces corre contra `arca_pruebas` (nunca `arca_zoo`) y existe al menos un test que nombra cada CA-xx.

## Reglas de negocio

- **RN-01:** La unidad de descubrimiento es la **especie**: el QR del recinto descubre las especies de sus animales en exhibición (`can_receive_visits=1`).
- **RN-02:** El contenido del QR es un código opaco aleatorio en `enclosure_qr_codes.code`; nunca revela datos del recinto ni del animal.
- **RN-03:** Puntos, nivel y rango los deriva el servidor; el cliente solo los muestra.
- **RN-04:** `visitor_scans` es la fuente de idempotencia (`client_scan_id` único por visitante) y de auditoría/antiabuso (`scanned_at` vs `received_at`, `result`).
- **RN-05:** Misiones y logros son contenido estático cargado por seeders idempotentes por `code`, no por migración; no hay actualizaciones dinámicas ni premios.
- **RN-06:** La implementación está bloqueada hasta que DBR-001, DBR-003 y DBR-004 estén en `Lista para backend`; depende además de `api-004` (tokens `visitor`) y del catálogo de especies.
- **RN-07:** Rutas nombradas bajo `/api/v1/visitor`; identificadores en inglés y mensajes en español.
- **RN-08:** Ningún secreto se versiona; los ajustes de puntos y umbrales viven en `config/visitor_progress.php`.
- **RN-09:** Los tests PHPUnit corren contra `arca_pruebas`.

## Datos, privacidad y auditoría

- El progreso es dato personal ligado a la cuenta del visitante; al borrar la cuenta se elimina en cascada (DBR-003/DBR-004).
- `visitor_scans` audita cada intento con código enviado, horas declarada/recibida y resultado; nunca contraseñas ni tokens.
- Requiere la DBR acompañante: `docs/database/requests/DBR-004-visitor-progress.md`. La DBR no sustituye esta spec.

## Flujos y errores

### Flujo principal

1. La app escanea el QR → envía `discoveries` (o encola sin señal) → la API valida código, ventana y frecuencia.
2. La API registra especies nuevas, puntos en el libro mayor y evalúa logros/misiones en una transacción.
3. Responde con el resultado y el progreso actualizado; la app muestra la pantalla de resultado.

### Errores esperados

- Código inexistente → 422 `invalid_code`; código desactivado → 422 `inactive_code`.
- Escaneo >24 h o >5 min en el futuro → 422 `expired_scan`.
- Ya descubierto → 200 `already_discovered` (sin puntos nuevos).
- >30 escaneos/minuto → 429; sin sesión → 401.

## Dependencias, riesgos y preguntas

- **Dependencias/ADR:** `api-004` (autenticación `visitor`), DBR-001, DBR-003 y DBR-004 (`Lista para backend`), ADR 0011, ADR 0010, catálogo de especies en la base.
- **Riesgos:** la cola sin conexión admite escaneos hasta 24 h después (se acepta porque no hay premios); el ajuste fino de puntos y umbrales puede requerir cambios de configuración.
- **Preguntas pendientes:**
  - Quién imprime y coloca los QR, y su reposición.
  - Ajuste fino de los puntos por especie y los umbrales de nivel.
  - Valor exacto de `enclosure_count` en las reglas (¿recintos distintos con especies descubiertas?).

## Revisión

- Aprobadores y fecha: pendiente de aprobación.
- Evidencia/enlaces: `docs/adr/0011-visitor-identity-and-mobile-session.md`, `docs/database/requests/DBR-004-visitor-progress.md`, `apps/api/specs/004-visitor-authentication.md`, `apps/mobile/specs/005-visitor-progress.md`.
