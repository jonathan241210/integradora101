# Plan técnico · 005 · visitor-progress

- Spec: `apps/mobile/specs/005-visitor-progress.md`
- Estado de spec: Aprobada (Aksel, 2026-10-22)
- Estado del plan: Aprobado (Aksel, 2026-10-22)
- Responsable técnico: Aksel
- Depende de `apps/api/plan/005-visitor-progress.md` (Aprobado, Aksel, 2026-10-22)

## Diseño de solución

La app presenta el progreso que devuelve la API y guarda solo la cola de escaneos sin señal. La cámara no entra: un puerto `submitScan(code)` recibe el código que más adelante entregará la spec 006. Con `EXPO_PUBLIC_API_URL` (ya terminada en `/api/v1`) las lecturas y el alta salen por `createVisitorApi`. Sin esa variable, y en Jest, un repositorio simulado cumple el mismo contrato.

Perfil sustituye puntos, nivel y rango de demostración cuando hay sesión. La colección lista especies con `discovered`. Logros y misiones muestran el estado del servidor. Se retiran líderes y recompensas.

Enmienda 2026-10-23: `readSharedProgress` guarda una copia por repositorio. Las pantallas esperan la lectura en curso y no repiten la petición si ya hay datos. La copia se tira al cerrar sesión y al entrar en otra. `bootstrap()` regresa de inmediato si el estado ya es `authenticated`. Guardar el perfil avisa a la sesión, pero no dispara otra lectura de progreso. Ajustes sigue pidiendo el perfil una vez para mostrar nombre y correo.

## Cambios por área

| Área | Archivos | Propósito |
|---|---|---|
| Cliente | `packages/api-client/visitor.ts` | `discoveries`, `progress`, `collection`, `achievements`, `missions`. La base ya incluye `/api/v1` |
| App / datos | `src/repositories/progressRepository.ts`, cola en `src/services/scanQueue.ts` | Contrato y AsyncStorage. Los tokens no se mueven de `expo-secure-store` |
| App / sesión | `accountSession` o el repositorio de cuenta | Al borrar la cuenta se vacía la cola |
| App / UI | Perfil, colección, logros, misiones y pantalla de resultado del escaneo | Español, estados de resultado de CA-07 |
| Pruebas | `__tests__/progress/` | Una prueba por CA-01 a CA-10 |
| Fuera | Cámara, mapa, migraciones | Spec 006 y la API |

AsyncStorage ya está instalado por el ADR 0014 para el catálogo. Esta spec lo reutiliza para la cola. No se instala otra dependencia. RN-06 de la spec decía instalarlo aquí; el plan registra que ya está y no se vuelve a instalar.

## Contrato y datos

`POST /visitor/discoveries` con `{ code, scanned_at, client_scan_id }` sobre la base `EXPO_PUBLIC_API_URL`. Si la red falla, la cola guarda `code`, `scanned_at` y `client_scan_id` con estado pendiente. Al volver al primer plano, tras una llamada exitosa o al pulsar «Reintentar», se reenvían en orden. Un 401 usa el refresh ya existente. Un 429 muestra la espera. `expired_scan`, `invalid_code` e `inactive_code` sacan el elemento de la cola y abren la pantalla de resultado.

## Seguridad, offline y operación

La cola no guarda tokens ni contraseñas. El UUID nace en el teléfono al aceptar el código. HTTPS en el APK; Expo Go de desarrollo sigue el `http://` ya documentado.

## Mapeo de criterios a pruebas

| Criterio | Prueba | Ubicación |
|---|---|---|
| CA-01 | `test-ca-01-progress-profile` | `__tests__/progress/profile.test.tsx`. Muestra «Cargando perfil…» hasta que llega el progreso y «Aún no tienes logros» si no hay desbloqueados. Enmienda 2026-10-23. |
| CA-01 | `una sola lectura de progreso` | `__tests__/progress/single-load.test.tsx`. Dos pantallas disparan `load()` una vez y guardar el perfil no lo repite. `__tests__/auth/http-bootstrap.test.ts` comprueba que `bootstrap()` no vuelve a pedir el perfil si la sesión ya está autenticada. |
| CA-02 | `test-ca-02-progress-collection` | `__tests__/progress/collection.test.tsx` |
| CA-03 | `test-ca-03-progress-achievements-missions` | `__tests__/progress/catalogs.test.tsx`. Sin desbloqueados, «Todos los logros» abre en «Por obtener». Enmienda 2026-10-23. |
| CA-04 | `test-ca-04-progress-queue-offline` | `__tests__/progress/scan-queue.test.ts` |
| CA-05 | `test-ca-05-progress-queue-flush` | `__tests__/progress/scan-queue.test.ts` |
| CA-06 | `test-ca-06-progress-queue-result` | `__tests__/progress/scan-queue.test.ts` |
| CA-07 | `test-ca-07-progress-result-screens` | `__tests__/progress/result.test.tsx` |
| CA-08 | `test-ca-08-progress-no-leaderboard-rewards` | `__tests__/progress/retired-mocks.test.ts` |
| CA-09 | `test-ca-09-progress-mvvm` | `__tests__/progress/retired-mocks.test.ts` |
| CA-10 | `test-ca-10-progress-suite-names-criteria` | `__tests__/progress/retired-mocks.test.ts` |

## Constitution Check

| Principio | Cumple | Evidencia |
|---|---|---|
| I. Stack mínimo y portable | Sí | Sin dependencia nueva. AsyncStorage ya aprobado |
| II. La spec manda | Sí | No incluye cámara ni líderes |
| III. Lógica separada de la interfaz | Sí | Pantallas → ViewModel → repositorio → `createVisitorApi` |
| IV. Un test por criterio | Sí | Tabla CA-01 a CA-10 |
| V. Una sola fuente de verdad | Sí | Puntos y reglas salen de la API. La cola solo guarda el intento |
| VI. Código en inglés, personas en español | Sí | |

## Riesgos y decisiones

- La spec 006 aún no entrega el código. `submitScan` es el punto de entrada y las pruebas lo llaman directo.
- Borrar la cuenta limpia la cola en el mismo flujo de `mobile-004`.

## Orden y aprobación

1. Spec aprobada por Aksel el 2026-10-22, después de `api-005`.
2. Este plan, aprobado por Aksel el 2026-10-22.
3. El código de la app espera los endpoints de la API descritos en el plan de `api-005`.

Aprobador funcional: Aksel. Fecha: 2026-10-22.
