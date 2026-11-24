# 018 · production-build-hardening (build de producción y datos reales del visitante)

- App dueña: `mobile`
- Apps/paquetes afectados: `mobile`. Consume endpoints existentes de `api-004` y `api-005`; sin cambios en la API.
- Estado: Implementada
- Solicitada: 2026-11-23
- Aprobada: 2026-11-23
- Aprobación funcional: Aprobada (spec, plan y tasks aprobados por el equipo)

## Problema y contexto

La revisión final previa a las pruebas reales encontró en la app móvil:

1. `eas.json` no tiene perfil `production`. Los perfiles `development` y `preview` permiten HTTP sin cifrar y, si falta `EXPO_PUBLIC_API_URL`, los repositorios usan `http://10.0.2.2:8000/api/v1` (emulador local).
2. Inicio, perfil, juego, misiones, logros, colección y los detalles de misión o logro muestran un usuario, misiones, logros e hitos falsos (`UserRepositoryImpl` devuelve `MOCK_USER`, `MOCK_MISSIONS`, `MOCK_ACHIEVEMENTS` y `MOCK_MILESTONES`). La cuenta (`visitorAccessRepository.getAccount`) devuelve `MOCK_VISITOR_ACCOUNT`. La API ya ofrece `/visitor/me`, `/visitor/progress`, `/visitor/achievements`, `/visitor/missions` y `/visitor/collection`, y el móvil ya tiene `useVisitorProfile` y `useVisitorProgress`.
3. La ficha de recinto (`utils/enclosureAnimals.ts`) rellena con ejemplares y estados veterinarios inventados (`ENCLOSURE_ANIMALS_CATALOG`, `MOCK_ANIMALS`) cuando la API no trae ejemplares.

## Objetivos

- Que exista un build de producción que solo hable HTTPS con la API configurada.
- Que el visitante vea solo sus datos reales o un estado vacío claro, nunca datos inventados.

## Fuera de alcance

- Las coordenadas y el plano del mapa: `MOCK_MAP_PLACES` es la geometría fija del zoológico y sigue como respaldo sin conexión (`mobile-007` CA-23 y `mobile-017`).
- Los servicios del mapa (baños, comida, etc.) siguen siendo datos fijos de la app, porque no hay endpoint de servicios.
- Publicar en tiendas.

## Actores y permisos

| Actor/rol | Necesidad | Permisos requeridos |
|---|---|---|
| Visitante sin sesión | Explorar el zoológico | Ninguno |
| Visitante con sesión | Ver su progreso real | Token de visitante (`api-004`) |

## Criterios de aceptación

- **CA-01:** Dado `eas.json`, cuando se revisa, entonces existe el perfil `production` sin `EXPO_USE_CLEARTEXT` y con `EXPO_PUBLIC_API_URL` en `https://`.
- **CA-02:** Dado un build sin `EXPO_PUBLIC_API_URL`, cuando se resuelve la URL de la API, entonces no usa `10.0.2.2`: en desarrollo usa la URL local configurada y en producción falla con un mensaje claro en español. En producción, una URL que no use `https://` también falla.
- **CA-03:** Dado un visitante con sesión, cuando abre inicio, perfil, juego, misiones, logros o colección, entonces ve su nombre, progreso, misiones, logros y colección obtenidos de la API.
- **CA-04:** Dado un visitante sin sesión, cuando abre esas pantallas, entonces ve un estado vacío que lo invita a iniciar sesión, sin datos inventados.
- **CA-05:** Dado un error de red, cuando se cargan esas pantallas, entonces se muestra un mensaje de error en español con opción de reintentar.
- **CA-06:** Dada la pantalla de cuenta, cuando se muestra, entonces el correo y el nombre son los del visitante autenticado (`/visitor/me`), no los de `MOCK_VISITOR_ACCOUNT`.
- **CA-07:** Dado un recinto sin ejemplares en la respuesta de la API, cuando se abre su ficha, entonces se muestra «Sin ejemplares para mostrar» y no ejemplares ni estados veterinarios inventados.
- **CA-08:** Dado `EXPO_PUBLIC_USE_MOCKS=true` o el entorno de pruebas, cuando se ejecuta la app, entonces los mocks siguen disponibles solo para desarrollo y pruebas.

## Reglas de negocio

- **RN-01:** En producción, ninguna pantalla muestra datos de `src/mocks/` salvo la geometría del mapa y los servicios fijos.

## Datos, privacidad y auditoría

Sin cambios de esquema ni de API; no requiere DBR. Los datos del visitante se leen con el token existente en `expo-secure-store`.

## Flujos y errores

- Sin sesión: estado vacío con botón «Iniciar sesión».
- Sin conexión: se usa la caché existente de `useVisitorProgress`, si la hay; si no, mensaje de error.

## Dependencias, riesgos y decisiones

- Dependencias: `api-004`, `api-005`, `mobile-004`, `mobile-005`, `mobile-007`, `mobile-008`, `mobile-017`.
- Decisiones:
  - Se conectan las pantallas a la API real en lugar de ocultarlas, porque los endpoints y hooks ya existen.
  - Se conserva la geometría fija del mapa sin conexión, porque es el plano físico del zoológico, no un dato del visitante.

## Revisión

- Evidencia/enlaces: `docs/auditoria-final-entrega.md` (se crea en esta misma revisión).
