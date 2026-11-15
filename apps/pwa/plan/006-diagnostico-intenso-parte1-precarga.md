# Plan técnico · 006 · diagnostico-intenso-parte1-precarga

- Spec: `apps/pwa/specs/006-diagnostico-intenso-parte1-precarga.md`
- Estado de spec: Aprobada (Victor Adrian, 2026-11-13)
- Responsable técnico: Victor Adrian (implementación asistida)

## Diseño de solución

Precargar la parte 1 del diagnóstico intenso (online) usando datos ya disponibles: perfil del staff autenticado y catálogo/listado de animales. La UI mantiene los inputs pero los marca no editables/sombreados cuando el valor proviene de precarga (MVZ, nombre, especie, identificación, sexo).

- **Sesión:** exponer el perfil de staff en el flujo de sesión de la PWA (extender `useStaffSession`/consumo de `auth.me()` para disponer de `full_name` o `first_name/last_name/second_last_name`).
- **Animales:** reutilizar `listAnimals`/`useAnimals` (ya incluye `name`, `species`, `tag_number`, `sex`, `birth_date`, `estimated_age`) y propagar el objeto seleccionado desde el picker al formulario.
- **Formulario (`DiagnosisIntenseView`):** controlar/precargar valores de MVZ y campos del paciente; MVZ y campos de identidad/sexo en `readOnly` (y estilo sombreado/disabled visual coherente con accesibilidad); edad sin precarga y editable; peso y fecha editables como hoy.
- **Sin persistencia:** se mantiene el alcance de 002 (memoria/PDF, sin guardado) salvo cambio aprobado posterior.

## Cambios por área

| Área/app | Archivos o módulos previstos | Propósito |
|---|---|---|
| PWA sesión | `src/viewmodels/useStaffSession.ts`, `src/App.tsx`/shell (si aplica) | Exponer perfil/nombre del usuario autenticado |
| PWA datos/UI | `src/views/DiagnosisIntenseView.tsx`, `src/views/AnimalPicker.tsx`, `src/viewmodels/useApiData.ts` (si aplica) | Precargar campos al seleccionar animal y MVZ; controlar editabilidad |
| PWA estilos/pruebas | `src/styles.css` (si aplica), `src/tests/*diagnosis*` | Estado visual de solo lectura y cobertura CA-01..CA-06 |
| API | ninguno (lectura vía endpoints existentes) | `auth.me`, `staff.animals` ya disponibles |

## Contrato y datos

- Lectura: `GET /api/v1/auth/me` (perfil staff), `GET /api/v1/staff/animals` (resumen con nombre/especie/tag/sexo/birth_date/estimated_age).
- Sin DBR ni migraciones. Sin cambios de persistencia clínica.

## Seguridad, offline y operación

- Requiere sesión válida (Sanctum). Solo online. No exponer datos fuera del contexto autenticado.

## Mapeo de criterios a pruebas

| Criterio | Prueba automatizada | App/ubicación |
|---|---|---|
| CA-01 | MVZ precargado desde perfil y no editable | PWA Vitest (`diagnosis`/nueva) |
| CA-02 | Selección de animal precarga nombre/especie/identificación/sexo no editables | PWA Vitest |
| CA-03 | Edad y peso editables; edad no precargada | PWA Vitest |
| CA-04 | Sin selección, campos dependientes vacíos | PWA Vitest |
| CA-05 | Error de carga informado sin romper formulario | PWA Vitest |
| CA-06 | Cobertura por criterio | Suite PWA |

## Constitution Check

| Principio | Cumple | Evidencia o excepción propuesta |
|---|---|---|
| I. Stack mínimo y portable | Sí | Sin dependencias nuevas |
| II. La spec manda | Condicionado | Requiere aprobación de spec 006 (Borrador) antes de implementar |
| III. Lógica separada de la interfaz | Sí | Datos vía viewmodels/hooks (`useStaffSession`, `useAnimals`), UI presenta |
| IV. Un test por criterio | Sí (plan) | CA-01..CA-06 en Vitest |
| V. Una sola fuente de verdad para los datos | Sí | MVZ desde sesión, paciente desde registro de animal/API |
| VI. Código en inglés, personas en español | Sí | UI/labels en español, código en inglés |

## Riesgos y decisiones

- Campos antes libres pasan a bloqueados (cambio de UX respecto a 002): documentar en spec y validar con usuario.
- Sin conexión no habrá precarga: mostrar estado/error claro.

## Orden y aprobación

1. Aprobar spec 006. 2. Cerrar decisiones (MVZ/identidad solo lectura, edad editable sin precarga). 3. Implementar sesión+formulario+pruebas. 4. `/verify` en PWA.