# Tareas · 005 · visitor-progress

- Spec: `apps/mobile/specs/005-visitor-progress.md` (Implementada, 2026-11-01; aprobación funcional Aksel, 2026-10-22)
- Plan: `apps/mobile/plan/005-visitor-progress.md` (Aprobado, Aksel, 2026-10-22)
- Estado del checklist: Aprobado por Aksel, 2026-10-22

## Implementación

- [x] **T-01** (CA-01, CA-07): Añadir a `createVisitorApi` las llamadas de progreso, colección, logros, misiones y `discoveries`. La base sigue siendo `EXPO_PUBLIC_API_URL` con `/api/v1` ya incluido.
- [x] **T-02** (CA-04, CA-05, CA-06, RN-04): Cola en `src/services/scanQueue.ts` con AsyncStorage ya instalado. No instalar otra dependencia. Al borrar la cuenta, vaciar la cola.
- [x] **T-03** (CA-01, CA-02, CA-03): Perfil, colección, logros y misiones leen el contrato. Sin sesión siguen el prototipo donde la spec 004 ya lo exige para el nombre.
- [x] **T-04** (CA-07): Pantalla de resultado: descubierto, ya descubierto, código inválido y escaneo vencido.
- [x] **T-05** (CA-08): Retirar `MOCK_LEADERBOARD`, `MOCK_REWARDS` y sus modelos de la app.

## Pruebas

- [x] **T-06** (CA-01 a CA-10): suites en `__tests__/progress/` que nombran cada criterio.

## Calidad y entrega

- [x] **T-07**: `npm test` desde `apps/mobile` para las suites nuevas.
- [x] **T-08**: Actualizar el roadmap de la app: spec 005 marcada **Implementada** tras merge a `DevOps` (2026-11-01).

No hay tarea de base de datos. La cámara queda en la spec 006.

- [x] **T-09** (CA-01, CA-03): Enmienda 2026-10-23. Con sesión, el perfil muestra «Cargando perfil…» hasta que responde el progreso. «Logros recientes» solo lista desbloqueados. «Todos los logros» abre en «Por obtener» cuando no hay ninguno desbloqueado. La aventura lista las misiones pendientes.
- [x] **T-10** (CA-01): Enmienda 2026-10-23. Las pantallas comparten una lectura de progreso. Guardar el perfil no la repite. `bootstrap()` no vuelve a pedir la sesión si ya está autenticada. Al cerrar sesión se descarta la copia.
- [x] **T-11** (CA-01, CA-02, CA-03, CA-07): Enmienda UX 2026-11-01. Resultado de escaneo en recuadro de color. Perfil con cifras en el tamaño del título, umbral en barra chica y enlace «Ver todos». Colección con pastilla «Descubierto» / «Por descubrir». Misiones con barra en vino. Inicio con saludo de progreso si hay sesión. Logros: «Ordenar» abre las opciones.
- [x] **T-12** (CA-01, CA-02, CA-03, CA-07): Enmienda visual 2026-11-11. Perfil: vino solo en identidad y umbral; cifras en franja `surface`; sin historial de hitos. Colección: sin la frase del faltante, pastilla «Descubierto» con `text` sobre `accent` y borde `border`. Logros: un botón «Ordenar» que recorre el orden. Descubrimiento: festejo, puntos y mensaje, sin repetir el nombre. Jest: profile, collection, result y exploration en verde el 2026-11-11.
- [x] **T-13** (CA-01, CA-07): El perfil pasa a una ficha. El total de descubiertos usa la lista de la colección. Logros recientes: 5, con desplazamiento. Botones del resultado, uno por renglón. Jest: profile, catalogs, result y navigation en verde el 2026-11-11.
