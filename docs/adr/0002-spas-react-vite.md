# 0002 · SPAs React y Vite

- Estado: Aceptado
- Fecha: 2026-10-03
- Spec relacionada: Por definir al iniciar la implementación

## Contexto
El portal, la administración y el módulo veterinario tienen flujos distintos, aunque comparten identidad visual y API. Deben desplegarse como clientes independientes de un backend central.

## Decisión
`apps/web`, `apps/dashboard` y `apps/pwa` serán SPAs con React 19, TypeScript, Vite 7 y Tailwind CSS 4. Usarán componentes compartidos propuestos en `@arca/ui`, iconografía Lucide y contratos de `@arca/api-client`. No usar Inertia ni Wayfinder. La navegación se resolverá en el cliente; React Router es la propuesta inicial pendiente de aprobación técnica antes de instalarse.

## Alternativas consideradas
- Inertia junto con Laravel, descartado porque acopla presentación y API.
- Un único frontend para todos los perfiles, descartado en favor de apps con responsabilidades diferenciadas.

## Consecuencias
### Positivas
Separación clara de despliegue y experiencia por rol; API reutilizable también por mobile.
### Riesgos o costos
Autenticación cookie/CSRF debe configurarse entre orígenes; las apps comparten paquetes y estándares para evitar divergencia.

## Validación y revisión
Validar integración Sanctum por ambiente y accesibilidad con las specs de cada cliente. Aprobar el router y sus dependencias antes de agregarlos.
