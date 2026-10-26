# Tareas · 005 · visitor-progress

- Spec: `apps/mobile/specs/005-visitor-progress.md` (Aprobada, Aksel, 2026-10-22)
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
- [x] **T-08**: Actualizar el roadmap de la app: la spec 5 queda en progreso al implementar, no Implementada hasta el PR.

No hay tarea de base de datos. La cámara queda en la spec 006.

- [x] **T-09** (CA-01, CA-03): Enmienda 2026-10-23. Con sesión, el perfil muestra «Cargando perfil…» hasta que responde el progreso. «Logros recientes» solo lista desbloqueados. «Todos los logros» abre en «Por obtener» cuando no hay ninguno desbloqueado. La aventura lista las misiones pendientes.
- [x] **T-10** (CA-01): Enmienda 2026-10-23. Las pantallas comparten una lectura de progreso. Guardar el perfil no la repite. `bootstrap()` no vuelve a pedir la sesión si ya está autenticada. Al cerrar sesión se descarta la copia.
