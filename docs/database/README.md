# Gobierno de base de datos

Esta sección regula cualquier cambio al esquema u objetos almacenados de la base principal de ARCA-NB. La base autoritativa es **MySQL 8.0.x** administrada por `apps/api`. La revisión mínima exacta queda **pendiente del inventario inicial** de la instancia existente y se registrará aquí al conocerse.

> La instancia actual contiene esquema, pero no datos. No se borra, recrea ni adopta como baseline automáticamente; el inventario inicial decidirá la estrategia mediante una decisión aprobada.

## Regla central

Cualquier necesidad de crear, modificar o eliminar tablas, columnas, índices, claves, funciones o procedimientos requiere una **Database Change Request (DBR)** en `requests/` usando la [plantilla](templates/change-request.md). Quien solicita **no** crea migraciones ni ejecuta SQL. El responsable de BD crea, prueba y aplica siempre una **migración Laravel**; nunca SQL manual como flujo alternativo.

## Flujo obligatorio

```text
Solicitud DBR (Borrador)
→ En revisión
→ Aprobada por responsable de BD y responsable backend
→ Migración implementada (responsable BD)
→ Verificada por BD en desarrollo/pruebas (MySQL 8.0)
→ Lista para backend
→ Integrada por backend (modelos, Actions, endpoints, pruebas)
→ Aplicada en staging (BD)
→ Aplicada en producción (BD)
```

- **Solicitante:** cualquier integrante o agente que detecte una necesidad de datos. Redacta la DBR; no toca esquema.
- **Responsable de BD:** revisa diseño físico, crea la migración bajo `apps/api/src/database/migrations/`, la prueba en una base MySQL 8.0 aislada, documenta evidencia y aplica por ambiente con respaldo y plan de reversión.
- **Responsable backend:** valida el contrato desde la API, confirma `Lista para backend` e implementa el código consumidor. No modifica la migración aprobada: si hay divergencia, devuelve la DBR a revisión.
- **Clientes (web, dashboard, pwa, mobile):** nunca acceden a MySQL ni crean migraciones; generan la DBR con la necesidad.

## Estados de una DBR

`Borrador` → `En revisión` → `Aprobada` → `Migración implementada` → `Verificada por BD en desarrollo/pruebas` → `Lista para backend` → `Integrada por backend` → `Aplicada en staging` → `Aplicada en producción`. Puede terminar como `Rechazada` o `Reemplazada` con motivo y referencia.

- `Aprobada` autoriza crear la migración; **no** significa que la base ya cambió.
- No existe un estado global ambiguo llamado solo `Aplicada`: siempre se registra el ambiente.

## Funciones y procedimientos almacenados

Se admiten de forma excepcional, con justificación de consistencia, rendimiento o integración que no se resuelva mejor en Laravel. Se versionan dentro de migraciones (habitualmente `DB::statement()`), se prueban en MySQL 8.0 y se especifican entradas, salidas, permisos y reversión. Las **reglas principales de negocio permanecen en Actions**. Vistas y triggers no están autorizados por esta política.

## Conexión inicial

Conectar la API y probar conectividad **no requiere DBR** mientras no altere el esquema, pero sí su propio SDD (spec, plan y tasks), configuración mediante `.env` y variables de entorno, y cero secretos versionados. El inventario inicial registrará `SELECT VERSION()`, charset/collation, modo SQL, motor y esquema existente.

## Prohibiciones

- SQL manual sobre la base como flujo de cambio (incluida la base de pruebas).
- Migraciones o SQL ejecutable creados por clientes, solicitantes o agentes sin rol de BD.
- Secretos, credenciales o hosts privados en DBR, migraciones, pruebas o evidencias.
- Asumir `Aprobada` como “base ya modificada”.

## Índice

- [Solicitudes DBR](requests/README.md)
- [Plantilla de solicitud](templates/change-request.md)
- [ADR 0010 · MySQL 8.0 y gobierno de cambios](../adr/0010-mysql-8-0-database-change-governance.md)
