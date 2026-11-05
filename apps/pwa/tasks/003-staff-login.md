# Tareas · 003 · staff-login

- Spec: `apps/pwa/specs/003-staff-login.md`
- Plan: `apps/pwa/plan/003-staff-login.md`
- Aprobación del checklist: solicitante, 2026-11-04, en esta conversación.

## Implementación

- [x] **T-01** (CA-01, RN-01, RN-02): declarar `@arca/api-client` como paquete local de la PWA y configurar el proxy de `/api` y `/sanctum` en Vite para que el navegador use su mismo origen.
- [x] **T-02** (CA-01, CA-02, RN-01, RN-02): conectar el formulario y la restauración de sesión al cliente compartido mediante un hook. Retirar el almacenamiento del token anterior y mostrar errores de credenciales y red en español.
- [x] **T-03** (CA-03, RN-01, RN-03): abrir ZooHealth solo para perfiles con destino `pwa`. Gestionar perfiles rechazados, retos de segundo factor, expiración y cierre de sesión según el plan. Conservar la auditoría de la API existente.

## Pruebas automatizadas

- [x] **T-04** (CA-01): comprobar que un perfil veterinario abre el módulo tras el login y al restaurar una sesión vigente.
- [x] **T-05** (CA-02): comprobar que las credenciales rechazadas y un fallo de red muestran mensajes distintos y permiten reintentar.
- [x] **T-06** (CA-03): comprobar que otro destino o un reto de segundo factor no abre el módulo. Cubrir también la expiración, el cierre confirmado y el reintento si falla el cierre.

## Calidad y entrega

- [x] **T-07** (CA-01, CA-02, CA-03): documentar la configuración local y el alcance del acceso. Ejecutar `/verify`, las comprobaciones disponibles de la PWA y un recorrido de login, recarga y cierre desde ZooHealth con `veterinario@arca.local` en `arca_pruebas`.

## Evidencia

- Vitest: 36 pruebas aprobadas en 9 archivos. Compilación TypeScript y Vite correcta.
- Se ejecutaron los scripts desde el workspace `apps/pwa`, donde está el manifiesto. La ruta `apps/pwa/src/package.json` que espera `/verify` no existe.
- Recorrido HTTP por el origen local de ZooHealth en `arca_pruebas` con la cuenta veterinaria: CSRF 204, login 200, dos consultas de perfil 200 con destino `pwa`, cierre 204 y perfil 401 después de cerrar. El recorrido usó un cliente HTTP con cookies.
