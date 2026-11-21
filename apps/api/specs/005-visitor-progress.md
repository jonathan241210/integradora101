# 005 · visitor-progress

- App dueña: `api`
- Apps/paquetes afectados: `api`, `mobile` (consumidor), `packages/api-client`
- Estado: Implementada (2026-11-01; aprobación funcional 2026-10-22)
- Solicitante / responsable funcional: Aksel
- Responsable de BD: Victor Adrian
- Aprobación funcional: Aksel, 2026-10-22

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
- Colocación y reposición física de los QR (operación del zoológico). La hoja imprimible pasa a `dashboard-013` (la API no imprime) y la regeneración por API a `api-020`.
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

Las consultas de progreso, logros y misiones acreditan las reglas que ya cumplen los descubrimientos guardados, incluidos los anteriores a un logro nuevo. El registro del logro o misión y sus puntos se confirman en la misma transacción (CA-09).

**Estado actual del esquema (2026-11-21).** En `arca_pruebas`, `db:table` confirmó que `visitor_achievements`, `visitor_mission_completions` y `visitor_point_entries` usan InnoDB y tienen las claves primaria o única de DBR-004. `migrate:status` confirmó que la migración `2026_10_15_000004_visitor_progress_schema` se aplicó en el lote 1. La corrección reutiliza esas tablas y no requiere DBR ni migración.

- **CA-01:** Dado un visitante autenticado, cuando envía `POST /api/v1/visitor/discoveries` con `{ code, scanned_at, client_scan_id }`, entonces la API responde de forma idempotente por `client_scan_id`: un segundo envío con el mismo `client_scan_id` devuelve el resultado ya registrado sin duplicar puntos ni especies.
- **CA-02:** Dado un escaneo, cuando `scanned_at` tiene más de 24 h de antigüedad o más de 5 minutos en el futuro, entonces la API lo rechaza con `expired_scan` y lo registra en `visitor_scans`.
- **CA-03:** Dado un visitante, cuando supera 30 escaneos por minuto, entonces la API responde 429 con mensaje en español.
- **CA-04:** Dado un código QR válido y activo, cuando se procesa el descubrimiento, entonces la API registra en la colección las especies de los animales con `can_receive_visits=1` de ese recinto y otorga puntos por cada especie nueva (cantidad configurable, 100 por defecto) en `visitor_point_entries`.
- **CA-05:** Dada una respuesta de `discoveries`, cuando el cliente la consume, entonces tiene la forma `{ result, new_species[], already_known_species[], points_awarded, unlocked_achievements[], completed_missions[], progress }` con `201` para `discovered`, `200` para `already_discovered` y para `empty_enclosure`, y `422` para `invalid_code`, `expired_scan` o `inactive_code`.
- **CA-06:** Dado un visitante autenticado, cuando consulta `GET /api/v1/visitor/progress`, entonces recibe puntos totales (suma del libro mayor), nivel, rango, siguiente umbral y especies descubiertas / total disponibles (especies con al menos un animal en exhibición, aunque su recinto aún no tenga QR). *Enmienda `api-019` (2026-11-18):* el total «disponibles» y el numerador «descubiertas» excluyen las especies cuyos animales en exhibición están solo en recintos inactivos o eliminados; los registros de descubrimiento no se borran y vuelven a contar si el recinto se reactiva (CA-35 y RN-14 de `api-019`).
- **CA-07:** Dado un visitante autenticado, cuando consulta `GET /api/v1/visitor/collection`, entonces recibe las especies con `discovered` y `discovered_at`.
- **CA-08:** Dado un visitante autenticado, cuando consulta `GET /api/v1/visitor/achievements` y `GET /api/v1/visitor/missions`, entonces recibe los catálogos con estado (desbloqueado/completado o pendiente), progreso calculado por el servidor y `rule_param` cuando la regla depende de una categoría. Enmienda de Aksel, 2026-11-01.
- **CA-09:** Dado un evento de progreso, cuando `EvaluateVisitorProgressAction` evalúa reglas, entonces soporta `species_count`, `category_species_count` (con `rule_param` = categoría), `enclosure_count`, `missions_completed` y `species_keyword` (una palabra completa del nombre común, sin acentos; varias palabras separadas por coma). Los logros y las misiones otorgan sus puntos y el libro mayor (UNIQUE por `visitor_id, source_type, source_id`) garantiza que no se dupliquen; todo ocurre dentro de una transacción. Los logros y las misiones cómicos usan `species_keyword` y el seeder los deja activos. CA-15 y CA-16 definen cuándo se muestran y cómo avanzan.
- **CA-10:** Dada la configuración de niveles en `config/visitor_progress.php`, cuando se calcula el nivel, entonces aplica los umbrales: 1 Explorador novato (0), 2 Explorador (500), 3 Explorador avanzado (1500), 4 Explorador experto (3000), 5 Guardián de la fauna (4450). Enmienda 2026-11-20: 4450 es 18 especies a 100 puntos, más 850 de los logros por cantidad, 900 de los 18 logros por animal y 900 de las misiones, incluidas las 18 que repiten la meta de cada animal. A partir de ahí el rango no cambia.
- **CA-11:** Dados los seeders, cuando se ejecutan `AchievementSeeder` y `MissionSeeder`, entonces cargan los catálogos de forma idempotente por `code`, basados en los mocks actuales de la app; las recompensas tipo «Certificado» se convierten en puntos o logros porque no hay premios.
- **CA-12:** Dado el comando `php artisan arca:generate-qr-codes {enclosure}`, cuando el personal lo ejecuta, entonces reutiliza el código QR activo del recinto y solo crea uno nuevo si no hay ninguno; con `--regenerate` desactiva los activos y crea uno nuevo (enmienda `api-020` CA-18, misma Action que los endpoints). La impresión no forma parte de este comando.
- **CA-13:** Dada la suite de PHPUnit, cuando se ejecuta `php artisan test`, entonces corre contra `arca_pruebas` (nunca `arca_zoo`) y existe al menos un test que nombra cada criterio de esta spec.
- **CA-14 (recinto sin animales en exhibición, Aksel, 2026-11-14):** Dado un código QR válido y activo cuyo recinto no tiene animales con `can_receive_visits = 1`, cuando se escanea, entonces responde `200` con `result` `empty_enclosure`, `points_awarded` `0`, listas vacías y `message` «Este recinto no tiene animales en exhibición.». No crea filas en `visitor_collections` ni en `visitor_point_entries`. Un escaneo posterior del mismo recinto, ya con un animal en exhibición, responde `discovered`. No es `already_discovered`.

## Reglas de negocio

- **RN-01:** La unidad de descubrimiento es la **especie**: el QR del recinto descubre las especies de sus animales en exhibición (`can_receive_visits=1`).
- **RN-02:** El contenido del QR es un código opaco aleatorio en `enclosure_qr_codes.code`; nunca revela datos del recinto ni del animal.
- **RN-03:** Puntos, nivel y rango los deriva el servidor; el cliente solo los muestra.
- **RN-04:** `visitor_scans` es la fuente de idempotencia (`client_scan_id` único por visitante) y de auditoría/antiabuso (`scanned_at` vs `received_at`, `result`).
- **RN-05:** Misiones y logros son contenido estático cargado por seeders idempotentes por `code`, no por migración; no hay actualizaciones dinámicas ni premios.
- **RN-06:** DBR-001, DBR-003 y DBR-004 están en `Lista para backend`; la implementación depende de `api-004` (tokens `visitor`) y del catálogo de especies en la base de pruebas.
- **RN-07:** Rutas nombradas bajo `/api/v1/visitor`; identificadores en inglés y mensajes en español.
- **RN-08:** Ningún secreto se versiona; los ajustes de puntos y umbrales viven en `config/visitor_progress.php`.
- **RN-09:** Los tests PHPUnit corren contra `arca_pruebas`.
- **RN-10:** `enclosure_count` cuenta recintos distintos en los que el visitante descubrió al menos una especie. El recinto sale del código QR que originó la fila de `visitor_collections`. Un recinto cuenta una sola vez aunque aporte varias especies. Si el código ya no apunta a un recinto, ese descubrimiento no suma.
- **RN-11:** Los puntos por especie nueva son 100 y los umbrales de nivel son los de CA-10. Un ajuste posterior solo cambia `config/visitor_progress.php`; no abre otra spec.

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
- Recinto sin animales en exhibición (`can_receive_visits = 1`) → 200 `empty_enclosure`, mensaje «Este recinto no tiene animales en exhibición.», sin puntos (CA-14, Aksel, 2026-11-14).
- >30 escaneos/minuto → 429; sin sesión → 401.

## Dependencias, riesgos y preguntas

- **Dependencias/ADR:** `api-004` (autenticación `visitor`), DBR-001, DBR-003 y DBR-004 (`Lista para backend`), ADR 0011, ADR 0010, catálogo de especies en la base.
- **Riesgos:** la cola sin conexión admite escaneos hasta 24 h después (se acepta porque no hay premios); el ajuste fino de puntos y umbrales puede requerir cambios de configuración.
- **Preguntas cerradas (Aksel, 2026-10-22):** la impresión y la reposición de los QR no son de esta spec. Los puntos y umbrales quedan en los valores de CA-04 y CA-10. `enclosure_count` queda definido en RN-10.

## Revisión

- Aprobadores y fecha: Aksel, 2026-10-22.
- Cierre: Implementada el 2026-11-01 tras merge a `DevOps`. Checklist T-01 a T-11 completado. `php artisan test --filter=ProgressTest` sobre `arca_pruebas`: 13 pruebas (CA-01 a CA-13), 98 aserciones en verde. Consumidor `mobile-005` implementado en el mismo ciclo de entrega.
- Evidencia/enlaces: `docs/adr/0011-visitor-identity-and-mobile-session.md`, `docs/database/requests/DBR-004-visitor-progress.md`, `apps/api/specs/004-visitor-authentication.md`, `apps/mobile/specs/005-visitor-progress.md`.

## Enmienda · Logros y misiones de especies visitables

- Estado: Aprobada. Aprobación funcional y autorización para continuar registradas en la conversación del 2026-11-21.
- Alcance: la regla `species_keyword` para mostrar logros y misiones y para acreditar su progreso. El visitante conserva la sesión y los contratos vigentes.
- Problema: la lista usa cualquier nombre de `species` y la acreditación usa cualquier descubrimiento guardado. Una especie de prueba o retirada puede mostrar una meta, sumar progreso y otorgar puntos.

**CA-15 (visibilidad).** Los endpoints de logros y misiones muestran una meta por palabra clave solo si coincide con una palabra completa del nombre común, sin distinguir mayúsculas ni acentos, de una especie publicada y no eliminada que tenga al menos un animal sin baja lógica con `can_receive_visits = 1` en un recinto activo y no eliminado. «León africano» coincide con «leon». «Camaleón» queda fuera. La publicación de otra especie o una coincidencia en un animal no visitable no basta.

**CA-16 (acreditación).** Una meta visible avanza y se acredita cuando la cuenta tiene en `visitor_collections` al menos una especie visitable cuyo nombre coincide. Los descubrimientos registrados por QR antes de la evaluación se pueden acreditar al consultar el progreso. Una especie descubierta que ya no es visitable queda fuera del cálculo. Se conservan las acreditaciones y sus puntos. Si la meta vuelve a ser visible, mantiene su estado adquirido y los puntos se otorgan una sola vez.

**RN-12.** La API usa el mismo conjunto de especies visitables para listar y evaluar las metas por palabra clave. La existencia de un QR activo no condiciona la visibilidad. El escaneo que origina el descubrimiento sigue sujeto a la validación vigente de QR y recinto. Las demás reglas de progreso mantienen sus propios criterios.

**Estado actual del esquema (2026-11-21).** En `arca_pruebas`, `Schema::getColumns` consultó en solo lectura `species`, `animals`, `enclosures`, `visitor_collections` y `enclosure_qr_codes`. Verificó los indicadores de publicación, exhibición y actividad, los campos de baja lógica y la relación entre visitante y especie. `migrate:status` confirmó aplicadas las migraciones de progreso, publicación y estado de recintos (DBR-004, DBR-013 y DBR-020). Se contrastaron las columnas con el diccionario de datos y las reglas de los modelos de catálogo. Los datos y las rutas existentes bastan. La enmienda no requiere DBR ni migración.
