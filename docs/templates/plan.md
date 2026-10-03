# Plan técnico · NNN · <slug>

- Spec: `apps/<app>/specs/NNN-<slug>.md`
- Estado de spec: Aprobada
- Responsable técnico: `<por identificar>`

## Diseño de solución
Resumen del flujo, límites y responsabilidades. La API es autoridad de negocio; los clientes consumen `@arca/api-client`.

## Cambios por área
| Área/app | Archivos o módulos previstos | Propósito |
|---|---|---|
| API / datos | | |
| Cliente(s) | | |
| Paquetes/documentación | | |

## Contrato y datos
- Endpoints con rutas nombradas, autenticación y permisos:
- Validación/Form Requests, Actions, Resources y Policies:
- Migraciones, `BaseModel`, auditoría y SoftDeletes:
- Errores y compatibilidad:

## Seguridad, offline y operación
Datos sensibles, mínimo privilegio, rate limits, almacenamiento, sincronización, conflictos, secretos, observabilidad y portabilidad GCP/local.

## Mapeo de criterios a pruebas
| Criterio | Prueba automatizada | App/ubicación |
|---|---|---|
| CA-01 | | |

## Constitution Check

| Principio | Cumple | Evidencia o excepción propuesta |
|---|---|---|
| I. Stack mínimo y portable | | |
| II. La spec manda | | |
| III. Lógica separada de la interfaz | | |
| IV. Un test por criterio | | |
| V. Una sola fuente de verdad para los datos | | |
| VI. Código en inglés, personas en español | | |

Ninguna excepción se implementa sin revisión y acuerdo requeridos. Si algo no cumple, detenerse y resolverlo antes del código.

## Riesgos y decisiones
- ADR requerido/aprobado:
- Alternativas y mitigaciones:

## Orden y aprobación
Dependencias, secuencia de implementación, revisión técnica, aprobador funcional, fecha y evidencias.
