# @arca/config

**Estado:** propuesta documental; no existe implementación.

Paquete opcional para configuración compartida y verificable de tooling (por ejemplo, ESLint, Prettier y TypeScript) en apps/packages cuando los workspaces estén aprobados. Debe permitir ajustes específicos por plataforma sin relajar reglas comunes.

Conservar formato acordado en `docs/06-convenciones.md`, evitar dependencias duplicadas y validar que las configuraciones funcionen con React Native y Vite antes de adoptarlas. No guardar secretos ni valores de ambiente en este paquete.

npm workspaces y cualquier paquete de configuración se decidirán antes de crear manifests o código.
