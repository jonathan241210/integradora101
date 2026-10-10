# DBR-NNN · <slug>

- Estado: Borrador
- Feature/spec origen: `apps/<app>/specs/NNN-slug.md`
- Solicitante: <rol y nombre>
- Responsable de BD: <nombre>
- Responsable backend: <nombre>
- Fecha: AAAA-MM-DD

## Problema y justificación

Qué dato falta, es incorrecto o necesita estructurarse distinto, y por qué la feature lo necesita.

## Estado actual

Descripción del esquema u objeto afectado hoy (o “no existe”).

## Contrato solicitado

Qué espera consumir la API o el cliente: campos, tipos, nulabilidad, defaults, unicidad, índices, claves, orden esperado de respuesta.

## Elementos afectados

| Tipo | Nombre | Cambio |
|---|---|---|
| tabla / columna / índice / función / procedimiento | `<nombre_en_ingles>` | |

## SQL de referencia (MySQL 8.0)

> **Referencia para revisión; no ejecutar directamente.** El cambio real se implementará como migración Laravel creada por el responsable de BD.

```sql
-- propuesta ilustrativa
```

## Datos existentes y migración de datos

Cómo tratar registros previos: default, backfill, NULL permitido o no aplica.

## Privacidad, auditoría y retención

Clasificación (público / personal / clínico / financiero), SoftDeletes, `created_by`/`updated_by` y Activitylog cuando aplique.

## Impacto, rendimiento y reversión

Tablas grandes, bloqueos esperados, índices, plan de reversión de la migración (`down()`), respaldo previo.

## Compatibilidad MySQL 8.0

Sintaxis y funciones usadas compatibles con la revisión mínima registrada; sin extensiones propietarias.

## Objeto almacenado (si aplica)

Justificación frente a una Action Laravel, entradas, salidas, permisos requeridos y prueba prevista. Las reglas principales siguen en Actions.

## Orden de despliegue

Qué debe existir antes de que el código consumidor se active; cambios expansivos antes que destructivos.

## Pruebas y evidencia

- Pruebas de esquema/objeto ejecutadas por BD en base MySQL 8.0 aislada:
- Resultado y evidencia (sin secretos ni datos sensibles):
- Pruebas integradas del backend:

## Aprobaciones

| Rol | Nombre | Fecha | Resultado |
|---|---|---|---|
| Responsable de BD | | | |
| Responsable backend | | | |

## Aplicación por ambiente

| Ambiente | Estado | Fecha | Evidencia |
|---|---|---|---|
| desarrollo/pruebas | pendiente | | |
| staging | pendiente | | |
| producción | pendiente | | |
