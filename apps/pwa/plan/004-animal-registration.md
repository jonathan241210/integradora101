# Plan técnico · 004 · animal-registration

- Spec: `apps/pwa/specs/004-animal-registration.md`
- Estado de spec: Implementada

## Diseño

- Reutilizar `createHttpClient` de `@arca/api-client` con URL relativa para enviar cookies y el token XSRF al endpoint de desarrollo reenviado por Vite.
- Restaurar únicamente `createAnimal` como operación de escritura y llamar al endpoint ya existente `POST /api/v1/staff/animals`.
- Cargar las opciones del campo recinto desde el endpoint público existente `GET /api/v1/enclosures`. La PWA solo necesita `id` y `name`.
- Incluir el recinto seleccionado como `enclosure_id`; la API valida que sea entero y exista antes de persistir, y no asigna un recinto por defecto.
- Mantener el tratamiento de errores HTTP de la PWA. El formulario solo se limpia después de un `201`; los errores permanecen visibles mediante `SaveFeedback` y conservan los campos.
- Mantener deshabilitada la escritura de diagnósticos y revisiones.

## Mapeo a pruebas

| Criterio | Verificación |
|---|---|
| CA-01 | `apps/pwa/src/tests/apiClient.test.ts`: comprueba `POST`, ruta, cookie de sesión, token CSRF y cuerpo. |
| CA-02 | `apps/pwa/src/tests/apiClient.test.ts`: comprueba errores HTTP y de conexión al guardar; `AnimalFormView` solo reinicia el formulario tras éxito. |
| CA-03 | `apps/pwa/src/tests/screens.test.tsx` y `apps/pwa/src/tests/apiClient.test.ts`: campo requerido y carga de recintos. `apps/api/src/tests/Feature/AnimalRegistrationTest.php`: validación y persistencia de la relación. |

## Seguridad y datos

- No leer ni escribir credenciales o configuración del `.env` desde el cliente.
- No modificar esquema ni crear recintos automáticamente. La API valida el FK existente.
- Las pruebas PWA no crean registros reales. El test Feature usa una transacción en `arca_pruebas` y revierte sus datos de prueba.

## Constitution Check

- **I. Stack mínimo y portable:** se reutilizan React, Sanctum y el cliente HTTP ya instalado.
- **II. La spec manda:** alcance aprobado y acotado en `pwa-004`.
- **III. Lógica separada:** la API valida y persiste; React solo envía y presenta estados.
- **IV. Un test por criterio:** CA-01 a CA-03 tienen pruebas Vitest; la persistencia y el rechazo de recintos inválidos se prueban en PHPUnit.
- **V. Una sola fuente de verdad:** la API/MySQL conserva el registro; no hay caché offline.
- **VI. Idioma:** código en inglés y mensajes al usuario en español.
