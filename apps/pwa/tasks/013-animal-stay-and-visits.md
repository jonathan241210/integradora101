# Tareas · 013 · Permiso de visitas

- [Spec](../specs/013-animal-stay-and-visits.md)
- [Plan](../plan/013-animal-stay-and-visits.md)

- [x] **T-01 (CA-01 a CA-03).** Capturar y enviar el permiso de visitas por las rutas en línea y offline.
- [x] **T-02 (CA-02 a CA-05).** Validar y guardar el permiso de visitas en ambos caminos de la API con compatibilidad para omisiones.
- [x] **T-03 (CA-01 a CA-05).** Agregar pruebas de formulario, envío, persistencia, rechazo y compatibilidad.
- [ ] **T-04.** Completar la verificación integrada con el esquema vivo de `arca_pruebas` disponible.

Vitest pasó 176 pruebas y TypeScript pasó. PHPUnit ejecutó 3 pruebas unitarias sin la configuración de integración; Pint pasó en la regla nueva y su prueba, y señaló formato en los dos controladores. La configuración habitual de PHPUnit no pudo abrir el bootstrap y MySQL local sigue sin responder. La verificación de persistencia queda pendiente.
