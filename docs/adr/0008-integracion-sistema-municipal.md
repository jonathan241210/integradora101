# 0008 · Integración con el sistema municipal

- Estado: Abierto
- Fecha: 2026-10-06
- Spec relacionada: Por definir con la Dirección de Ingresos

## Contexto

ARCA-NB debe comunicar ingresos y cortes a la Dirección de Ingresos. Está confirmado que el evento disparador será un **cierre de caja confirmado** y que en V1 los ingresos de boletaje provienen solo de efectivo. No está confirmado si el sistema municipal ofrece BD directa o servicio interno.

## Decisión abierta

Mantener la integración detrás de un Adapter/Anti-Corruption Layer para evitar que el modelo municipal contamine el dominio. Evaluar Outbox, idempotencia y conciliación cuando se conozca el contrato. No afirmar ni implementar todavía un mecanismo.

## Alternativas consideradas

- Acceso a BD directa: puede ser disponible, pero aumenta acoplamiento, privilegios y riesgo de esquema.
- Servicio interno: contrato más explícito, pero su existencia, operación y SLA deben confirmarse.
- Exportación manual temporal: reduce integración, pero aumenta retraso y error operativo.

## Consecuencias

### Positivas

El disparador de negocio queda estable y el dominio permanece aislado de una decisión institucional pendiente.

### Riesgos o costos

Sin protocolo confirmado no pueden cerrarse seguridad, disponibilidad, pruebas ni soporte. Inventar una BD o API produciría un contrato falso.

## Pendientes para decidir

- Protocolo y mecanismo: BD directa o servicio interno.
- Autenticación, autorización, red y gestión de secretos.
- Esquema, versionado, acuse y semántica de errores.
- Disponibilidad, reintentos, idempotencia y orden.
- Conciliación, observabilidad, soporte y pruebas conjuntas.

## Validación y revisión

Obtener evidencia del sistema municipal y aprobación de Dirección de Ingresos e Informática. Después, una spec define contrato y pruebas; el ADR se actualiza sin cambiar que el envío ocurre tras cierre confirmado.
