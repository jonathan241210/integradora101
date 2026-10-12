# Plan técnico · 002 · initial-db-connection

- Spec: `apps/api/specs/002-initial-db-connection.md`
- Estado de spec: Aprobada
- Responsable técnico: Victor Adrian (BD) / Jonathan (backend)

## Diseño de solución

Se inicializa el proyecto Laravel 12 en `apps/api/src/` usando `composer create-project`.
La conexión a la instancia MySQL 8.0.x de Aiven se configura exclusivamente mediante `.env`.
Aiven requiere SSL con CA certificate (`ca.pem`); el archivo se descarga del panel de Aiven
y se referencia por ruta local absoluta en `.env`; nunca se versiona en el repositorio.

El `.env.example` incluirá todas las claves necesarias con valores de ejemplo (no reales).
La verificación de conectividad se realiza con `php artisan db:show`. El resultado del
inventario (versión, charset, collation, modo SQL, tablas) se documenta en
`apps/api/docs/inventario-bd-inicial.md` sin incluir credenciales.

Dos usuarios de Aiven:
- `avnadmin` → Victor Adrian (responsable de BD, privilegios completos de administración)
- `desarrollador` → resto del equipo (acceso de lectura/consulta; permisos exactos a definir por Victor Adrian en el panel de Aiven)

## Cambios por área

| Área/app | Archivos o módulos previstos | Propósito |
|---|---|---|
| `apps/api/src/` | Proyecto Laravel 12 completo (`composer create-project`) | Base del backend; sin esta instalación no existe la API |
| `apps/api/src/.env.example` | Plantilla de variables de entorno | Documentar claves requeridas sin valores reales |
| `apps/api/src/config/database.php` | Sección `mysql`, clave `options` con `PDO::MYSQL_ATTR_SSL_CA` | Activar SSL con CA certificate de Aiven |
| `apps/api/docs/inventario-bd-inicial.md` | Inventario inicial de la instancia | Versión servidor, charset, collation, modo SQL, tablas existentes |
| `apps/api/src/tests/Feature/DbConnectionTest.php` | Test PHPUnit Feature | Cubrir CA-01 a CA-05 |

## Contrato y datos

- **Endpoints:** ninguno en esta feature.
- **Migraciones / DBR:** no se crean; esta feature no altera el esquema.
- **CA certificate SSL:** archivo `ca.pem` descargado del panel de Aiven por cada integrante;
  ruta referenciada en `.env` como `DB_SSL_CA=/ruta/absoluta/local/ca.pem`.
  El archivo **no se versiona**; se añade al `.gitignore`.
- **Usuarios Aiven:**
  - `avnadmin` para Victor Adrian (responsable de BD).
  - `desarrollador` para el resto del equipo; Victor Adrian configura sus permisos en el panel.

## Configuración `.env` y `database.php`

### Variables requeridas en `.env.example`

```dotenv
DB_CONNECTION=mysql
DB_HOST=mysql-230c9986-arcannb.a.aivencloud.com
DB_PORT=15280
DB_DATABASE=arca_pruebas
DB_USERNAME=avnadmin
DB_PASSWORD=
DB_SSL_CA=/ruta/absoluta/a/ca.pem
```

> `DB_HOST`, `DB_PORT` y `DB_DATABASE` no son secretos y pueden ir en `.env.example` con valores reales.
> `DB_USERNAME` puede ir como ejemplo; `DB_PASSWORD` siempre vacío en `.env.example`.
> `DB_SSL_CA` debe ser una ruta absoluta local; cada integrante pone la suya.

### Ajuste en `config/database.php`

La conexión `mysql` debe incluir la opción PDO para el CA cert:

```php
'options' => extension_loaded('pdo_mysql') ? array_filter([
    PDO::MYSQL_ATTR_SSL_CA => env('DB_SSL_CA'),
]) : [],
```

Esto activa SSL con el CA certificate de Aiven sin necesitar certificado de cliente.

## Seguridad, offline y operación

- `DB_PASSWORD` y `DB_SSL_CA` (ruta local) solo existen en el `.env` de cada integrante; nunca en el repo.
- El archivo `ca.pem` se agrega a `.gitignore` raíz y a `apps/api/src/.gitignore`.
- `apps/api/src/.env` se agrega a `.gitignore` (Laravel lo hace por defecto; verificar).
- El usuario `avnadmin` es solo para Victor Adrian; los demás usan `desarrollador` con mínimo privilegio.
- No se ejecuta ninguna migración ni comando destructivo en esta feature.
- Portabilidad: la configuración funciona igual en Aiven Cloud y con MySQL Server local cambiando solo `.env`.

## Mapeo de criterios a pruebas

La API se inicializará con PHPUnit en esta feature (primer `composer.json`).
Los tests son Feature tests con `RefreshDatabase` desactivado (solo se prueba conectividad, no esquema).

| Criterio | Prueba automatizada | App/ubicación |
|---|---|---|
| CA-01 | Test: el `.env.example` contiene las claves requeridas y `DB_PASSWORD` vacío | `apps/api/src/tests/Feature/DbConnectionTest.php` |
| CA-02 | Test: la conexión a MySQL responde sin excepción (`DB::connection()->getPdo()`) | mismo archivo |
| CA-03 | Test: `inventario-bd-inicial.md` existe y contiene versión del servidor | mismo archivo |
| CA-04 | Test estructural: `.env` no existe en el repositorio (`.gitignore` lo excluye) | mismo archivo |
| CA-05 | Test: `php artisan about` no lanza excepción (Laravel 12 + PHP 8.2+) | mismo archivo |

## Constitution Check

| Principio | Cumple | Evidencia o excepción propuesta |
|---|---|---|
| I. Stack mínimo y portable | Sí | Laravel 12 / PHP 8.2+ / MySQL 8.0.x; configuración por `.env`; sin SDK propietario en código |
| II. La spec manda | Sí | Spec `002` aprobada por Victor Adrian; plan y tasks con mismo identificador |
| III. Lógica separada de la interfaz | Sí | No hay lógica de negocio en esta feature; solo configuración de infraestructura |
| IV. Un test por criterio | Sí | Un test PHPUnit nombrado por cada CA-01 a CA-05 |
| V. Una sola fuente de verdad para los datos | Sí | No se altera el esquema; MySQL de `apps/api` sigue siendo la autoridad |
| VI. Código en inglés, personas en español | Sí | Claves de `.env`, nombres de archivo y código en inglés; inventario y docs en español |

## Riesgos y decisiones

- **ADR requerido:** ninguno nuevo; esta feature usa ADR 0001, 0006 y 0010 ya aceptados.
- **Riesgo principal:** commit accidental de `.env` o `ca.pem` con credenciales. Mitigación: `.gitignore` verificado en T-01 y hook `protect-paths.mjs` ya activo en el repo.
- **SSL CA cert:** cada integrante descarga `ca.pem` del panel de Aiven. Victor Adrian comparte el enlace de descarga por canal externo; no se versiona el archivo.
- **Permisos del usuario `desarrollador`:** Victor Adrian los configura en el panel de Aiven antes de compartir credenciales al equipo.

## Orden y aprobación

1. T-01: verificar `.gitignore` y preparar estructura.
2. T-02: inicializar Laravel 12 con `composer create-project`.
3. T-03: crear `.env.example` con todas las claves.
4. T-04: ajustar `config/database.php` para SSL CA.
5. T-05: Victor Adrian configura su `.env` local (credenciales `avnadmin`) y verifica conectividad.
6. T-06: ejecutar inventario y redactar `docs/inventario-bd-inicial.md`.
7. T-07: escribir tests PHPUnit para CA-01 a CA-05.
8. T-08: ejecutar `composer test` y verificar verde.
9. T-09: Victor Adrian comparte credenciales de `desarrollador` por canal externo.
10. T-10: cada integrante configura su `.env` y verifica con `php artisan db:show`.

Aprobación técnica: Victor Adrian, 2026-10-11.
