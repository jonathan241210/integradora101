# Plan técnico · 015 · Ocultar el formulario «Calcula tus boletos»

- Spec: `apps/web/specs/015-hide-payment-demo.md`
- Revisión del alcance: se aplica el mecanismo ya aprobado de comentar HTML a la franja completa y al botón, según la corrección de la persona solicitante.

Comentar `#boletos` completo y su botón de cabecera. Inicializar el formulario solo si existe. Enlazar «Planear mi visita» a Ubicación y «Consulta boletos y precios» a Preguntas frecuentes. Cubrir CA-01 y CA-02 con el runner existente de Node.

## Constitution Check

- I. HTML y JavaScript con la excepción del ADR 0024, sin nuevas dependencias.
- II. Spec aprobada con plan y tareas trazables.
- III. Se condiciona la inicialización de la lógica de demostración existente.
- IV. Una prueba automatizada por criterio.
- V. Cambio de presentación sin acceso a datos persistidos.
- VI. Identificadores en inglés y textos del portal en español.
