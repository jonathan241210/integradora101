# 005 · visitor-progress

- App dueña: `mobile`
- Apps/paquetes afectados: `mobile`, `packages/api-client`
- Estado: Implementada (2026-11-01; aprobación funcional 2026-10-22)
- Solicitante / responsable funcional: Aksel
- Aprobación funcional: Aksel, 2026-10-22
- Equivalencia en el documento de decisiones previas: 004b

## Problema y contexto

Con la cuenta del visitante (spec `mobile-004`, API en `api-004`) y el progreso en servidor (`api-005`), la app debe mostrar puntos, nivel, rango, colección por especie, logros y misiones reales, y soportar escaneos sin señal mediante una cola local que se sincroniza después. La colección pasa a ser por **especie**: el QR del recinto descubre las especies de sus animales en exhibición. Se eliminan los mocks de tabla de líderes y de recompensas, porque no habrá líderes ni premios.

## Objetivos

- Perfil con puntos, nivel, rango y especies descubiertas / total, servidos por la API.
- Colección por especie con `discovered` y `discovered_at`; logros y misiones con estado y progreso calculados por el servidor.
- Cola de escaneos sin conexión en AsyncStorage con `client_scan_id` (UUID) y estado «pendiente».
- Pantallas de resultado del escaneo: nuevo descubrimiento, ya descubierto, código inválido y escaneo vencido.
- Retiro de los mocks `MOCK_LEADERBOARD` y `MOCK_REWARDS` (y su modelo) de la app.

## Fuera de alcance

- Lógica de servidor y motor de reglas (spec `api-005`).
- Captura del QR con cámara (spec `mobile-006` entrega el código leído a la cola de esta spec).
- Tabla de líderes, premios físicos y actualización dinámica de misiones.
- Cuenta y sesión (spec `mobile-004`).

## Actores y permisos

| Actor/rol | Necesidad | Permisos requeridos |
|---|---|---|
| Visitante (cuenta del tutor) | Ver su progreso, colección, logros y misiones | Sesión `visitor` activa |

## Historias de usuario

- Como visitante, quiero escanear el QR del recinto aunque no tenga señal, para descubrir sus especies cuando vuelva la conexión.
- Como visitante, quiero ver en mi perfil mis puntos, nivel y rango, y cuántas especies me faltan.
- Como visitante, quiero ver qué logros y misiones completé y qué me falta para cada uno.

## Criterios de aceptación

- **CA-01:** Dado un visitante con sesión, cuando abre su perfil, entonces muestra puntos totales, nivel, rango, siguiente umbral y especies descubiertas / total disponibles, obtenidos de `GET /api/v1/visitor/progress`. Hasta que esa respuesta llega, la pantalla muestra «Cargando perfil…» y no pinta el progreso vacío. Perfil, colección, aventura y logros comparten una sola lectura: si ya hay una en curso, esperan esa promesa; si ya hay datos, abrir otra pantalla no vuelve a pedirlos. Esa lectura se repite al entrar con sesión o al refrescar a propósito. Guardar el perfil no la repite. Al cerrar sesión se descarta la copia. En el perfil, avatar, apodo, rango, descubiertos, puntos, nivel y umbral van en una sola ficha `surface` con borde `border` y una franja `primary`. El rango es una pastilla `accent` con texto `text`. La barra del umbral usa el relleno vino. Los números siguen en el tamaño del título. «Logros recientes» muestra como máximo 5 desbloqueados, los más nuevos primero. Esa lista deja ver unos dos y el inicio del siguiente; el resto aparece al desplazarla. El historial de hitos no se muestra aquí. Enmienda visual, 2026-11-11. El siguiente umbral es una barra chica de los puntos actuales contra ese umbral. El avatar sigue en el círculo claro. «Ver todos» es un enlace. Con sesión, el inicio saluda con el apodo y cuántos animales faltan. Ese faltante, y el total de «Descubiertos» en el perfil, se cuentan con la misma lista de especies que muestra la colección, no con `total_species` cuando ese total deja fuera especies que la colección sí lista. Si nadie está descubierto, el saludo dice cuántos hay en esa lista. En la aventura, la barra y el premio de la misión van en vino; el dorado queda en los logros. Enmienda de Aksel, 2026-11-01.
- **CA-02:** Dada la colección, cuando el visitante la abre, entonces lista las especies con su estado `discovered` y `discovered_at`; las especies no descubiertas conservan la vista previa con bloqueo de características definida en `mobile-002`. La foto de la tarjeta es el elemento grande. El estado se lee en una pastilla: «Descubierto» o «Por descubrir». «Descubierto» usa el token `text` sobre `accent`. El borde de cada tarjeta usa `border`. El recuadro de progreso conserva el conteo y la barra, y no repite cuántos animales faltan. Enmienda visual, 2026-11-11.
- **CA-03:** Dados los catálogos, cuando el visitante abre logros o misiones, entonces muestra cada elemento con estado (desbloqueado/completado o pendiente) y progreso calculado por el servidor (`GET achievements` / `GET missions`), sin calcular reglas en el cliente. «Logros recientes» lista solo los desbloqueados. «Todos los logros» abre en «Por obtener» cuando no hay ninguno desbloqueado. El orden se cambia con un solo botón en vino, «Ordenar», que muestra el orden actual y al pulsarlo pasa al siguiente: más recientes, más antiguos, nombre A–Z y nombre Z–A. En «Por obtener» solo alterna el nombre. Enmienda visual, 2026-11-11. Las misiones de la aventura muestran una barra de progreso en vino y el premio en una pastilla vino; el recuadro de presentación es una línea, no un bloque grande. El botón «Ordenar» de los logros va en vino. La ficha del logro explica en español cómo se obtiene, a partir de `rule_type`, `rule_target` y `rule_param` que ya envió el servidor: en pasado si está desbloqueado y en infinitivo si sigue pendiente. Enmienda de Aksel, 2026-11-01.
- **CA-04:** Dado un escaneo sin conexión, cuando la app no puede enviarlo, entonces lo encola en AsyncStorage con `code`, `scanned_at` y `client_scan_id` (UUID), marcado como «pendiente», y lo muestra como pendiente en la interfaz.
- **CA-05:** Dada la cola con pendientes, cuando la app vuelve al primer plano, termina cualquier llamada exitosa a la API o la persona pulsa «Reintentar», entonces reenvía los escaneos pendientes a `POST /api/v1/visitor/discoveries` en orden; se sincroniza sin librería de red adicional.
- **CA-06:** Dado un reenvío de la cola, cuando la API responde, entonces la app retira el elemento de la cola y muestra la pantalla de resultado correspondiente; los errores de red mantienen el elemento pendiente.
- **CA-07:** Dada una respuesta de `discoveries`, cuando llega el resultado, entonces la app muestra la pantalla correspondiente: nuevo descubrimiento (`discovered`, con especies nuevas y puntos), ya descubierto (`already_discovered`), código inválido (`invalid_code`/`inactive_code`) o escaneo vencido (`expired_scan`), todas en español y accesibles. Cada resultado usa un recuadro de color con un icono grande, pensado para un niño: vino en un descubrimiento, dorado si ya estaba en la colección y crema en un aviso. Los puntos se leen grandes. En un descubrimiento, el recuadro muestra el festejo, el título, los puntos y el mensaje, sin repetir el nombre de la especie ni la frase «Se desbloqueó»; el nombre queda en el botón «Ver {nombre}». Esos botones van uno debajo del otro, a lo ancho de la pantalla, para que el nombre no se recorte. Enmienda visual, 2026-11-11. Cada animal nuevo se abre con un botón compacto del mismo vino, sin marcar uno como principal. Volver desde esa ficha regresa al mismo resultado para abrir otro animal. Si el visitante pasa a otra pantalla principal, ese resultado ya no queda en el retroceso. Enmienda de Aksel, 2026-11-01.
- **CA-08:** Dado el código de la app, cuando se revise, entonces no existen los mocks ni el modelo de tabla de líderes (`LeaderboardEntry`) ni de recompensas (`Reward`/`MOCK_REWARDS`); los puntos, logros y misiones provienen solo de la API o de mocks de Repositorio que reflejen su contrato.
- **CA-09:** Dado el código de la app, cuando se revise, entonces se cumple MVVM: pantallas → ViewModels → Repositorio de progreso → `@arca/api-client`; ningún componente llama a la red directamente.
- **CA-10:** Dada la suite de Jest, cuando se ejecute, entonces hay pruebas que nombran cada CA-xx: renderizado de resultados, comportamiento de la cola (encolar, reintentar, drenar) y retiro de los mocks eliminados.

## Reglas de negocio

- **RN-01:** La colección es por especie: el QR del recinto descubre las especies de sus animales en exhibición; el cliente no decide qué se descubre.
- **RN-02:** Puntos, nivel, rango, logros y misiones los calcula el servidor; la app solo presenta lo que la API devuelve.
- **RN-03:** La cola admite escaneos de hasta 24 h de antigüedad (el servidor rechaza los más viejos con `expired_scan`); se acepta porque no hay premios.
- **RN-04:** `client_scan_id` es un UUID generado por la app al escanear; la idempotencia del servidor evita duplicar puntos ante reintentos.
- **RN-05:** No hay tabla de líderes ni premios: las recompensas de los mocks pasan a puntos o logros del servidor.
- **RN-06:** La cola y el caché no sensible usan AsyncStorage, dependencia autorizada por ADR 0011 (aceptado el 2026-10-21). Se instala en esta spec, no en `mobile-004`. Los tokens siguen en `expo-secure-store`.
- **RN-07:** Con `EXPO_PUBLIC_API_URL` y `api-005` en producción de pruebas, las lecturas y `discoveries` usan la API; sin esa variable, y en Jest, el repositorio simulado conserva el mismo contrato.

## Datos, privacidad y auditoría

La cola local guarda solo `code`, `scanned_at` y `client_scan_id` (datos no sensibles) en AsyncStorage; los tokens no salen del almacenamiento seguro. El progreso pertenece a la cuenta. Las pantallas comparten una sola copia en memoria y se descarta al cerrar sesión, para que la cuenta siguiente no vea los datos anteriores.

## Flujos y errores

1. Escaneo (spec `mobile-006`) entrega el código → se envía o encola → resultado.
2. Sincronización: al primer plano, tras llamada exitosa o con «Reintentar».
3. Errores: sin conexión → pendiente; `expired_scan`/`invalid_code`/`inactive_code` → pantalla de resultado correspondiente; 401 → refresh (spec `mobile-004`); 429 → mensaje de espera.
4. Tras una respuesta HTTP de `discoveries` con resultado `discovered` (spec `mobile-006` → cola), se vuelve a leer el progreso una sola vez y se sustituye la copia compartida. Un código inválido, inactivo, vencido o ya descubierto no vuelve a pedir progreso, colección, logros ni misiones. Colección, perfil y aventura escuchan esa copia: no vuelven a pedirla al abrirse y no muestran otra pantalla de carga si ya tenían datos. El total de especies cuenta las que tienen un animal en exhibición, aunque el recinto aún no tenga QR. El cruce con el catálogo usa el id de especie y, si no coincide, el nombre común. La ficha del animal usa esa misma copia: si la especie está descubierta, quita el desenfoque y muestra la fecha del descubrimiento junto con características, alimentación y curiosidades. Enmienda de Aksel, 2026-11-01.

## Dependencias, riesgos y preguntas

- **Dependencias/ADR:** `api-005` (endpoints de progreso), `api-004`/`mobile-004` (sesión), `mobile-006` (entrega del código escaneado), ADR 0011 (AsyncStorage), DBR-004.
- **Riesgos:** escaneos tardíos rechazados por antigüedad; consistencia de la cola ante cierres abruptos de la app.
- **Preguntas cerradas (Aksel, 2026-10-22):** los puntos y umbrales son los de `api-005` (100 por especie y los cinco niveles de CA-10). Al borrar la cuenta, la app vacía la cola local, como ya dice `mobile-004` CA-10.

## Revisión

- Aprobadores y fecha: Aksel, 2026-10-22.
- Cierre: Implementada el 2026-11-01 tras merge a `DevOps`. Checklist T-01 a T-10 completado. Suites Jest de cuenta y progreso (`__tests__/auth/`, `__tests__/progress/`): 17 suites, 58 pruebas en verde. Validación manual en Android con API de pruebas (`EXPO_PUBLIC_API_URL`) y escaneo vía `submitScan` / simulación de desarrollo. La cámara queda en `mobile-006`. El PR enlaza spec, plan y tasks.
- Evidencia/enlaces: `apps/api/specs/005-visitor-progress.md`, `apps/mobile/specs/004-visitor-account.md`, `apps/mobile/specs/006-qr-scan.md`, `docs/database/requests/DBR-004-visitor-progress.md`.
