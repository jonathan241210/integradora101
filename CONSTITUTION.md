# Constitución de ARCA-NB

Principios innegociables. Un PR que viole alguno no se mergea. Para cambiarlos se requiere el acuerdo del equipo y un ADR.

### I. Stack mínimo y portable
Solo el stack declarado en `README.md` (Laravel 12/PHP 8.2+, React 19 + TS + Vite, React Native, MySQL 8.0.x). Nada propietario de la nube en el código: debe correr igual en Google Cloud y en local.
**Verificable:** cada dependencia nueva enlaza un ADR aprobado; la conexión a la BD solo se configura por `.env`.

### II. La spec manda
Ningún código sin `specs/NNN-slug.md` *Aprobada* con su `plan/` y `tasks/` del mismo nombre. El código implementa la spec y nada más; si difieren, se actualizan en el mismo PR.
**Verificable:** el PR enlaza los tres archivos y `tasks/NNN-slug.md` está marcado.

### III. Lógica separada de la interfaz
Reglas de negocio y cálculos (precios, arqueo, estados clínicos) solo en `apps/api` (Actions). La UI solo presenta y llama a `@arca/api-client` mediante hooks.
**Verificable:** no hay `fetch`/`axios` ni cálculos de negocio en `components/` o `pages/`; los controladores delegan en Actions.

### IV. Un test por criterio
Cada CA-xx tiene ≥1 test automatizado que lo nombra (PHPUnit en API, Vitest en front). CI en rojo no se mergea.
**Verificable:** buscar `CA-xx` en los tests cubre todos los CA de la spec, y el CI está en verde.

### V. Una sola fuente de verdad para los datos
MySQL 8.0.x de `apps/api` es la autoridad y cambia solo por migraciones Laravel que el responsable de BD crea, prueba y aplica tras una DBR aprobada (`docs/database/`). `settings_colores` es de solo lectura. Los datos offline de la PWA son borradores que se sincronizan. Lo clínico y lo financiero nunca se borra físicamente y queda auditado.
**Verificable:** toda tabla tiene migración ligada a una DBR aprobada; los modelos de negocio extienden `BaseModel` y usan SoftDeletes.
Cambio registrado en ADR 0010.

### VI. Código en inglés, personas en español
Identificadores, tablas, rutas, permisos y commits en inglés; UI, mensajes al usuario, specs y docs en español. Única excepción: las keys externas de `settings_colores`.
**Verificable:** revisión de PR; no hay strings de UI en inglés ni identificadores en español.
