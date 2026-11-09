# Plan técnico · 010 · public-enclosures-read

- Spec: `apps/api/specs/010-public-enclosures-read.md`
- Estado de spec: Aprobada (Víctor Adrián, 2026-11-07)
- Responsable técnico: Víctor Adrián
- Consumidores: `mobile-007` (Enmienda V4), `@arca/api-client`

---

## Diseño de solución

La API central expone dos rutas públicas de solo lectura bajo el prefijo `/api/v1` para la consulta de recintos del zoológico y sus coordenadas geográficas y relativas al mapa SVG:
- `GET /api/v1/enclosures`
- `GET /api/v1/enclosures/{enclosure}`

No hay autenticación obligatoria ni mutaciones. Los datos son consultados directamente desde la tabla `enclosures` (alimentada con las columnas `gps_lat`, `gps_lon`, `map_x`, `map_y` de `DBR-008`).

La arquitectura sigue estrictamente el patrón de la API central de ARCA-NB:
`Ruta nombrada` $\rightarrow$ `Controlador HTTP delgado` $\rightarrow$ `Action de catálogo` $\rightarrow$ `API Resource`.

Para optimizar el rendimiento y evitar problemas de N+1 consultas, las Actions realizan carga ansiosa (`with(['animals.species'])`), resolviendo en una sola consulta estructurada los animales que habitan en cada recinto.

---

## Cambios por área

| Área/app | Archivos o módulos previstos | Propósito |
|---|---|---|
| Rutas API | `apps/api/src/routes/api.php` | Registrar rutas `enclosures.index` y `enclosures.show` |
| HTTP Controller | `apps/api/src/app/Http/Controllers/Catalog/EnclosureController.php` | Controlador delgado de catálogo público con validación de ID numérico |
| Actions | `apps/api/src/app/Actions/Catalog/ListEnclosuresAction.php`, `GetEnclosureAction.php` | Consultas Eloquent con carga ansiosa |
| Resource | `apps/api/src/app/Http/Resources/Catalog/EnclosureResource.php` | Transformación a contrato JSON estandarizado con floats y animales asociados |
| Modelo | `apps/api/src/app/Models/Enclosure.php` | Ya cuenta con los casts `float` para coordenadas y relación `animals()` |
| Pruebas Backend | `apps/api/src/tests/Feature/Catalog/PublicEnclosuresTest.php` | Cobertura Feature con `DatabaseTransactions` para CA-01 a CA-05 |
| Cliente Móvil | `apps/mobile/src/repositories/apiMapRepository.ts` | Repositorio que consume el endpoint con caché offline en `AsyncStorage` |
| Cliente Móvil | `apps/mobile/src/repositories/index.ts` | Exportación e inyección transparente según `EXPO_PUBLIC_API_URL` |
| Pruebas Móvil | `apps/mobile/__tests__/apiMapRepository.test.ts` | Pruebas de integración para CA-21 a CA-23 |

---

## Contrato y datos

### Endpoints

| Método | Ruta | Nombre | Auth | Éxito | Error |
|---|---|---|---|---|---|
| `GET` | `/api/v1/enclosures` | `enclosures.index` | Ninguna | `200 {"data":[...]}` | `500` error de servidor |
| `GET` | `/api/v1/enclosures/{id}` | `enclosures.show` | Ninguna | `200 {"data":{...}}` | `404 {"message": "Recinto no encontrado."}` |

`{id}` se valida en el controlador con `ctype_digit`: valores alfanuméricos como `/enclosures/abc` responden inmediatamente `404` sin consultar la base de datos.

### Estructura de `EnclosureResource`

```json
{
  "id": 1,
  "name": "Hábitat del Tigre",
  "gps_lat": 20.0838,
  "gps_lon": -98.7236,
  "map_x": 0.23,
  "map_y": 0.25,
  "animals_count": 1,
  "animals": [
    {
      "id": 1,
      "name": "Juan",
      "species_id": 1,
      "species_name": "Tigre de Bengala"
    }
  ]
}
```

- Si un recinto no tiene coordenadas asignadas todavía, `gps_lat`, `gps_lon`, `map_x` y `map_y` devuelven `null`.
- Si un recinto no tiene animales asignados, `animals_count` devuelve `0` y `animals` devuelve `[]`.

---

## Seguridad, offline y operación

- **Sin credenciales requeridas:** Endpoint público de solo lectura, seguro ante denegación de servicio por consultas ligeras y optimizadas.
- **Protección contra inyección:** Parámetro `{id}` validado numéricamente antes de la capa de persistencia.
- **Operación Offline:** La app móvil persiste la lista de recintos en `AsyncStorage` (`@arca:map_places_cache`) tras la primera descarga exitosa; las visitas en zonas de sombra o sin datos continúan operando con los recintos locales.
- **Portabilidad de base de datos:** Sin sintaxis propietaria; tipos `DECIMAL` estándar en MySQL 8.0.x portables entre Aiven y entornos locales.

---

## Mapeo de criterios a pruebas

| Criterio | Prueba automatizada | App/ubicación |
|---|---|---|
| **CA-01** | `test_ca_01_public_enclosures_index_lists_all_enclosures_with_coordinates` | `apps/api/src/tests/Feature/Catalog/PublicEnclosuresTest.php` |
| **CA-02** | `test_ca_02_public_enclosures_show_returns_single_enclosure_with_animals` | `apps/api/src/tests/Feature/Catalog/PublicEnclosuresTest.php` |
| **CA-03** | `test_ca_03_public_enclosures_show_returns_404_for_missing_or_non_numeric_id` | `apps/api/src/tests/Feature/Catalog/PublicEnclosuresTest.php` |
| **CA-04** | `test_ca_04_public_enclosures_accessible_without_authentication` | `apps/api/src/tests/Feature/Catalog/PublicEnclosuresTest.php` |
| **CA-05** | `test_ca_05_database_transactions_execution_against_test_db` | `apps/api/src/tests/Feature/Catalog/PublicEnclosuresTest.php` |
| **CA-21** | `test-ca-21: ApiMapRepository consulta /enclosures y mapea a MapPlace` | `apps/mobile/__tests__/apiMapRepository.test.ts` |
| **CA-22** | `test-ca-22: ApiMapRepository almacena y recupera recintos en AsyncStorage` | `apps/mobile/__tests__/apiMapRepository.test.ts` |
| **CA-23** | `test-ca-23: ApiMapRepository degrada a fixture si no hay red ni caché previa` | `apps/mobile/__tests__/apiMapRepository.test.ts` |

---

## Constitution Check

| Principio | Cumple | Evidencia o justificación |
|---|---|---|
| **I. Stack mínimo y portable** | SÍ | Usa Laravel 12 nativo, Eloquent y React Native AsyncStorage, sin dependencias externas pesadas ni servicios cloud de pago. |
| **II. La spec manda** | SÍ | Cada criterio CA-01 a CA-05 y CA-21 a CA-23 está trazado directamente desde las especificaciones aprobadas. |
| **III. Lógica separada de la interfaz** | SÍ | La API encapsula la consulta en `ListEnclosuresAction` y `GetEnclosureAction`; la app móvil desacopla el acceso mediante `MapRepository`. |
| **IV. Un test por criterio** | SÍ | Todas las pruebas Feature en PHPUnit y unitarias en Jest cubren explícitamente cada CA-xx. |
| **V. Una sola fuente de verdad para los datos** | SÍ | La tabla `enclosures` de `apps/api` es la única dueña de los datos; el cliente solo almacena una copia caché de lectura. |
| **VI. Código en inglés, personas en español** | SÍ | Código, rutas, modelos y variables en inglés; mensajes de error, UI y documentación en español. |

---

## Secuencia de tareas

1. **Backend API (`apps/api`)**:
   - Crear `ListEnclosuresAction.php` y `GetEnclosureAction.php`.
   - Crear `EnclosureResource.php` en catálogo público.
   - Crear `EnclosureController.php` y registrar rutas públicas en `routes/api.php`.
   - Implementar y ejecutar `PublicEnclosuresTest.php`.
2. **Cliente Móvil (`apps/mobile`)**:
   - Crear `ApiMapRepository.ts` con mapeo a `MapPlace` y persistencia en `AsyncStorage`.
   - Configurar factoría en `src/repositories/index.ts`.
   - Implementar y ejecutar `apiMapRepository.test.ts`.
