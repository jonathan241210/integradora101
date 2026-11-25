# Tareas · 029 · Limpieza de animales de prueba

- Estado: aprobado por el solicitante. La aplicación real queda a cargo del solicitante.
- Alcance: 14 bajas lógicas en `arca_pruebas` para conservar únicamente los 63 ejemplares de DBR-019.

- [x] **T-01 · CA-01, CA-03 y RN-01.** Implementar el comando Artisan y su Action. Previsualizar por defecto, validar identidad y base, y mostrar las referencias clínicas y de egresos.
- [x] **T-02 · CA-02, CA-03 y RN-01, RN-02.** Implementar la baja lógica transaccional. Emitir el operador, autorización, IDs y fechas de baja para que el operador conserve la evidencia.
- [x] **T-03 · CA-01, CA-02 y CA-03.** Agregar y ejecutar pruebas PHPUnit de previsualización sin escrituras, baja exclusiva del lote con conservación de referencias, rechazo de base o identidad incorrecta e idempotencia.
- [x] **T-04 · CA-01, CA-02 y CA-03.** Pint, 15 pruebas unitarias y 2 pruebas específicas aprobadas. La previsualización en vivo confirmó 14 candidatos y 63 registros protegidos.
- [x] **T-05 · CA-02.** La verificación de solo lectura del 25 de noviembre de 2026 confirmó la baja lógica de los 14 IDs, sus 9 evaluaciones y 5 egresos vinculados y los 63 animales activos de DBR-019.
