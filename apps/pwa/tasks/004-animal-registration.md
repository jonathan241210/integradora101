# Tareas · 004 · animal-registration

- Spec: `apps/pwa/specs/004-animal-registration.md`
- Plan: `apps/pwa/plan/004-animal-registration.md`

## Implementación

- [x] **T-01** (CA-01, RN-02): enviar el registro por el cliente compartido con sesión Sanctum y CSRF.
- [x] **T-02** (CA-01, CA-02): conservar el formulario ante error y mostrar confirmación solo tras respuesta exitosa.
- [x] **T-03** (RN-04): mantener deshabilitado el guardado clínico.
- [x] **T-07** (CA-03, RN-03): cargar los recintos existentes y exigir una selección explícita en el formulario.
- [x] **T-08** (CA-03, RN-01, RN-03): validar y persistir `enclosure_id` en la API sin modificar el esquema.

## Pruebas y entrega

- [x] **T-04** (CA-01): probar método, ruta, cookie, CSRF y datos enviados mediante Vitest.
- [x] **T-05** (CA-02): probar manejo de errores HTTP y conectividad mediante Vitest.
- [x] **T-06**: actualizar documentación y verificar tests y compilación de la PWA.
- [x] **T-09** (CA-03): cubrir selección/requisito de recinto y rechazo de referencias faltantes o inexistentes.
- [x] **T-10**: actualizar la spec, el plan y el manual de la PWA con la selección obligatoria de recinto.

## Evidencia

- Autorización explícita para persistir registros de animales en `arca_pruebas`, 2026-11-10.
- `corepack pnpm --filter pwa-veterinaria test`: 38 pruebas aprobadas en 9 archivos.
- `corepack pnpm --filter pwa-veterinaria build`: TypeScript y Vite correctos. Vite reporta la advertencia preexistente del chunk grande `html2pdf`.
- `php artisan test --filter=AnimalRegistrationTest`: 1 prueba aprobada, con 8 aserciones; usa transacción en `arca_pruebas`.
- `php -l` en el controlador y el test Feature: sin errores de sintaxis.
- Verificación local: PWA `http://localhost:5173/` HTTP 200, API `/up` HTTP 200 y proxy Sanctum CSRF HTTP 204.
- `GET http://localhost:5173/api/v1/enclosures`: carga los 3 recintos disponibles para la selección.
- No se creó un registro real desde la PWA: no se usó ni solicitó la contraseña de una cuenta veterinaria.
- BD `arca_pruebas`: `animals.enclosure_id` es obligatorio y sin default; hay recintos existentes disponibles. La solución no crea recintos ni cambia el esquema.
