# @arca/api-client

**Estado:** propuesta; el paquete no está implementado.

Cliente tipado compartido para las SPAs y mobile. Encapsulará URL base por ambiente, autenticación/CSRF para SPAs, envío de tokens Sanctum para mobile cuando aplique, tipos de request/response, errores y serialización. Los hooks de los clientes llaman a este paquete.

El cliente no contiene reglas de negocio, credenciales de servicio ni acceso directo a BD. La API Laravel es la autoridad; sus rutas se nombran en backend y los contratos se documentan/versionan sin Wayfinder. Evitar `fetch` o `axios` ad hoc en páginas/componentes.

Definir timeout, cancelación, errores, retry y estrategia de compatibilidad en specs antes de implementación. Aún no existe `package.json` ni dependencia instalada.
