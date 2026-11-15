# Plan técnico · 004 · animal-registration (alineación DBR-014)

- Spec: `apps/pwa/specs/004-animal-registration.md`
- Estado de spec: Aprobada (Victor Adrian, 2026-11-13)
- Responsable técnico: Victor Adrian (implementación asistida)

## Diseño de solución

Alinear el alta y la ficha de animales al contrato post DBR-014: la API pasa a ser fuente de verdad con `species_id`, `birth_date`/`estimated_age` y datos de especie (`feeding/longevity/reproduction`) desde `species`; la PWA selecciona especie/recinto de catálogos y deja de enviar/leer campos retirados de `animals`.

- **API (autoridad):** `AnimalController@store` recibe `species_id` existente (no `species` texto), `birth_date`/`estimated_age` (y mantiene `tag_number` según comportamiento vigente), valida y persiste en `animals` sin `age/diet/longevity/reproduction`; `show/index` y recursos devuelven edad derivada/expuesta desde `birth_date`/`estimated_age` y datos de especie desde relación `species`.
- **PWA:** `AnimalFormView` carga especies (`GET /api/v1/species`) y recintos, envía `species_id`, `birth_date` y/o `estimated_age`; `apiClient`/tipos reflejan contrato; perfil (`AnimalProfileView`) y vistas de lista leen campos alineados.
- **Modelo/recursos:** `Animal`/`Species` y recursos API alinean atributos/relaciones a columnas vigentes.

## Cambios por área

| Área/app | Archivos o módulos previstos | Propósito |
|---|---|---|
| API / datos | `app/Http/Controllers/Api/AnimalController.php`, `app/Models/Animal.php`, `app/Models/Species.php`, `app/Http/Resources/*` (si aplica), rutas/requests según convención | Contrato de alta/consulta alineado a DBR-014; validación y serialización |
| Cliente(s) `pwa` | `src/views/AnimalFormView.tsx`, `src/views/AnimalProfileView.tsx`, `src/views/AnimalsView.tsx` (si aplica), `src/services/apiClient.ts`, `src/viewmodels/useApiData.ts`, tipos | Formulario con selección de especie y nacimiento/edad estimada; perfil leyendo especie/edad correcta |
| Documentación/DBR | `docs/database/requests/DBR-014*`, `docs/database/esquema-*.md` (actualización de referencia), `apps/pwa/docs/*` si aplica | Evidencia de DBR y esquema de referencia actualizado |

## Contrato y datos

- **Endpoints (nombrados, existentes):**
  - `GET /api/v1/species` (`species.index`): catálogo para selector.
  - `GET /api/v1/enclosures` (`enclosures.index`): selector de recinto.
  - `POST /api/v1/staff/animals` (`staff.animals.store`): alta (staff autenticado).
  - `GET /api/v1/staff/animals`, `GET /api/v1/staff/animals/{animal}` (`staff.animals.index/show`): listado/perfil.
- **Request alta (objetivo):** `name`, `species_id` (int, exists), `tag_number` (según decisión vigente), `enclosure_id`, `sex`, `birth_date` (date, nullable), `estimated_age` (string, nullable), `origin` (nullable), `notes`→`characteristics` (nullable). Reglas exactas supeditadas a Q1-Q4 de la spec.
- **Response:** datos de animal con `birth_date`, `estimated_age`, `species` (incl. `feeding/longevity/reproduction`), sin campos retirados de `animals`.
- **DBR:** DBR-014 “Lista para backend” (aplicada 2026-11-13, evidencia detallada pendiente). No se crean migraciones en este alcance.
- **Errores:** 401 sesión, 422 validación (mensajes en español), conflicto/unique por `tag_number`.

## Seguridad, offline y operación

- Sanctum sesión/CSRF para staff; autorización en servidor; sin secretos en cliente.
- Sin guardado offline. Datos de gestión zoológica (no clínicos/financieros).
- Portabilidad MySQL 8.0.x; cambios ya aplicados vía DBR-014.

## Mapeo de criterios a pruebas

| Criterio | Prueba automatizada | App/ubicación |
|---|---|---|
| CA-01 | Alta con `species_id` existente persiste FK y no crea especie; catálogo disponible | API Feature `AnimalRegistration`/similar (`apps/api/src/tests/Feature`) + PWA (form/envío) |
| CA-02 | Persiste/expone `birth_date` y/o `estimated_age`; perfil muestra edad calculada o estimada | API Feature + PWA (`screens`/perfil) |
| CA-03 | `tag_number` respeta comportamiento/validación vigente y unicidad | API Feature + PWA form |
| CA-04 | Rechaza recinto faltante/inexistente; exige selección | API Feature + PWA form |
| CA-05 | Perfil/listado exponen datos de `species` (feeding/longevity/reproduction) y omiten campos retirados de `animals` | API Feature/resource + PWA perfil |
| CA-06 | Errores muestran mensaje, no éxito, conservan datos | PWA (form/save feedback) |
| CA-07 | Cobertura por criterio | Suites Vitest/PHPUnit |

## Constitution Check

| Principio | Cumple | Evidencia o excepción propuesta |
|---|---|---|
| I. Stack mínimo y portable | Sí | React/Vite/Tailwind, Laravel 12/PHP 8.4, MySQL 8.0.x, sin deps nuevas previstas |
| II. La spec manda | Condicionado | Implementar solo tras aprobación funcional de spec 004 (Borrador) |
| III. Lógica separada de la interfaz | Sí | Validación/persistencia en API; PWA consume `@arca/api-client` y presenta estados |
| IV. Un test por criterio | Sí (plan) | Mapeo CA-01..CA-07 a Vitest/PHPUnit |
| V. Una sola fuente de verdad para los datos | Sí | MySQL/API autoridad; especie/edad desde columnas vigentes |
| VI. Código en inglés, personas en español | Sí | Identificadores/rutas en inglés; UI/mensajes/docs en español |

## Riesgos y decisiones

- Contrato breaking (`species` texto → `species_id`, `age` → `birth_date/estimated_age`): coordinar API+PWA en mismo cambio.
- Decisiones abiertas Q1-Q4 deben resolverse antes de cerrar implementación.
- DBR-014 evidencia detallada pendiente de adjuntar (no bloquea consumo si ya aplicado, pero debe completarse).

## Orden y aprobación

1. Spec 004 aprobada (2026-11-13) y decisiones 1A/2A/3/4 cerradas. 2. Actualizar API (contrato/modelos/recursos/tests). 3. Actualizar PWA (form/perfil/cliente/tests). 4. Actualizar docs/evidencia DBR. 5. `/verify`.

Decisiones aplicadas: especie seleccionable del catálogo o nombre nuevo con `firstOrCreate` (sin datos extra de especie); sexo solo Macho/Hembra (`M/F`); `birth_date` y `estimated_age` separados y opcionales (cualquier combinación); `tag_number` sin cambios de comportamiento/texto.