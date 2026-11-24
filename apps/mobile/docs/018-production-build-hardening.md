# 018 · Build de producción y datos reales del visitante

- [Spec 018](../specs/018-production-build-hardening.md)
- [Plan 018](../plan/018-production-build-hardening.md)
- [Tareas 018](../tasks/018-production-build-hardening.md)

## Perfil `production` de EAS

`eas.json` define el perfil `production`: sin `EXPO_USE_CLEARTEXT` (solo HTTPS) y con `EXPO_PUBLIC_API_URL` en `https://`.

El valor del repositorio es un marcador (`https://api.example.invalid/api/v1`) y no apunta a ningún servidor real. Antes de generar el build de producción hay que sustituirlo por la URL pública de la API, ya sea editando ese valor o definiendo `EXPO_PUBLIC_API_URL` en el entorno `production` de EAS. Con el marcador, la app arranca pero no conecta con ningún servicio.

## URL de la API

`src/config/runtime.ts` expone `resolveApiBaseUrl()`:

- Con `EXPO_PUBLIC_API_URL` definida, usa ese valor.
- Sin ella, en desarrollo y pruebas usa `http://localhost:8000/api/v1` (en un emulador Android: `adb reverse tcp:8000 tcp:8000`, o definir la variable con la IP de la máquina).
- Sin ella, en producción lanza «Falta la dirección de la API…».

## Datos de demostración

`isMockDataEnabled()` es verdadero solo con `EXPO_PUBLIC_USE_MOCKS=true` o en pruebas (salvo `EXPO_PUBLIC_USE_API=true`). Fuera de ahí, inicio, perfil, juego, misiones, logros, colección, cuenta y fichas de recinto leen la API. Sin sesión se muestra un estado vacío con «Iniciar sesión»; con error de red, un mensaje y «Reintentar».

Quedan como datos fijos de la app, por decisión de la spec: la geometría del mapa (`MOCK_MAP_PLACES`) y los servicios del mapa.

## Limitaciones

- Los hitos del perfil se derivan de los logros obtenidos (no hay endpoint de hitos).
- La ficha de recinto no muestra `characteristics` (observaciones del personal); la curiosidad sale de `fun_fact` de la especie o, si falta, de la descripción del recinto.
