# 0001 · API central Laravel

- Estado: Aceptado
- Fecha: 2026-10-03
- Spec relacionada: Por definir al iniciar la implementación

## Contexto
Las funciones administrativas, clínicas y de visitantes requieren reglas consistentes, permisos y un registro único de datos. Clientes web, PWA y móvil no deben duplicar lógica ni conectarse directamente a la BD.

## Decisión
Usar una API central en `apps/api` con Laravel 12 y PHP 8.2+. La API es la única autoridad de negocio y dueña del esquema principal MySQL. Usar Actions para lógica de negocio, Form Requests para validación, API Resources para respuestas, Policies y Spatie Permission para autorización, y auditoría para cambios relevantes. Sanctum cubre sesiones cookie de las SPAs y tokens para mobile; Fortify se integra headless.

Los endpoints JSON usan rutas Laravel nombradas. Los clientes acceden mediante `@arca/api-client` tipado. No usar Inertia ni Wayfinder.

## Alternativas consideradas
- API separada por cliente, con duplicación de reglas y permisos.
- Monolito Inertia, que no satisface la separación API central + SPAs requerida.

## Consecuencias
### Positivas
Autoridad única, contratos de API explícitos y seguridad coherente para todos los clientes.
### Riesgos o costos
Los contratos y compatibilidad deben administrarse; el trabajo inicial crea paquetes y API antes de consumirlos.

## Validación y revisión
Revisar límites y contratos por feature mediante SDD. Una nueva tecnología requiere ADR aprobado.
