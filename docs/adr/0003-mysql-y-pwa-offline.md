# 0003 · MySQL y borradores offline de la PWA

- Estado: Propuesto
- Fecha: 2026-10-03
- Spec relacionada: Por definir al iniciar la implementación

## Contexto
La API requiere almacenamiento relacional portable. El personal veterinario puede trabajar en campo con conectividad limitada, pero los datos clínicos requieren validación, trazabilidad y una única fuente de verdad.

## Decisión propuesta
Usar MySQL 8 estándar como BD principal de Laravel y migraciones como única fuente de esquema. La PWA mantendría borradores en IndexedDB y, cuando haya conectividad, los enviaría a la API para validación y confirmación. `vite-plugin-pwa` e `idb` son dependencias candidatas, todavía no aprobadas. Se debe definir resolución de conflictos, reintentos y protección de datos clínicos antes de implementar sincronización.

## Alternativas consideradas
- Requerir conectividad para cada captura, limitando trabajo de campo.
- Considerar la copia local autoritativa, lo que duplicaría la fuente de verdad y complicaría auditoría.

## Consecuencias
### Positivas
Interfaz de captura resiliente sin transferir autoridad del dato fuera de la API.
### Riesgos o costos
Persisten riesgos de pérdida, conflictos y exposición en dispositivos; cifrado, ciclo de vida y sincronización requieren análisis específico.

## Validación y revisión
No instalar plugins ni implementar sincronización hasta aprobación del ADR y de una spec con política de conflictos, retención y seguridad.
