# 016 · clinical-records

- App dueña: `api`.
- Apps afectadas: `api`, `pwa` y, si corresponde, `packages/api-client`.
- Estado: Borrador.
- Solicitante: usuario de esta conversación.
- Alcance funcional: confirmado por el solicitante el 2026-11-12: guardar y
  consultar los tres tipos de registro y conservar todo lo capturado en la PWA.
- Acceso propuesto por el solicitante: solo veterinarios.
- Primera entrega parcial: solicitada el 2026-11-12; los campos que no puedan
  conservarse se deshabilitan y se indican en la interfaz. El solicitante
  autorizó preparar la propuesta para revisión de BD y del área veterinaria.
- Aprobación de la spec completa y responsable veterinario: pendientes.

## Problema y objetivos

El personal veterinario captura diagnósticos rápidos, diagnósticos intensos y
revisiones en la PWA, pero el cliente impide enviar registros clínicos. Se
necesita guardar y consultar esos registros por animal mediante la API, con
conexión a internet. Como primera entrega, el solicitante acepta guardar un
subconjunto seguro y bloquear los campos que aún no puedan conservarse; el
objetivo posterior sigue siendo conservar todo.

Existe un controlador clínico y una consulta de evaluaciones en el perfil del
animal, pero su presencia no demuestra que todos los campos se conserven ni que
se cumplan autorización y auditoría. La especificación `pwa-002` excluye
persistencia; `pwa-004` también la excluye para diagnósticos y revisiones.
Esta propuesta no modifica esos alcances hasta su aprobación.

## Inventario clínico de `arca_pruebas` (2026-11-12)

Se consultaron únicamente metadatos de las cuatro tablas clínicas; no se
consultaron registros de pacientes ni se modificó la base. Existen:

- `clinical_evaluations`: animal, veterinario, tipo, motivo, fecha, signos
  vitales, diagnósticos, recomendaciones y decisión de liberación.
- `clinical_evaluation_findings`: hallazgos por sistema.
- `animal_restraints`: contención física y química.
- `lab_samples`: muestras y observaciones de laboratorio.

Las tres tablas de detalle se relacionan con `clinical_evaluations`, que a su
vez se relaciona con `animals` y `users`. Existe la tabla `activity_log`, pero
eso por sí solo no demuestra que se auditen estas operaciones. Ninguna de las
cuatro tablas clínicas inspeccionadas tiene columna `deleted_at`.

El esquema y el controlador existentes necesitan revisión antes de habilitar el
guardado completo:

- El controlador no almacena, entre otros campos, especie, edad y sexo
  capturados en ambos diagnósticos; tampoco nombre e identificación del
  formulario intenso ni la respuesta a «toma de muestra». Debe decidirse
  cómo conservar cada dato y si representa una captura histórica.
- La condición corporal seleccionada en el diagnóstico rápido no se guarda;
  las casillas de un mismo sistema se concatenan, por lo que se debe comprobar
  que puedan reconstruirse sin pérdida.
- El tiempo de llenado capilar admite decimales en la PWA, pero la columna
  es entera y el controlador redondea. La decisión de liberación no respondida
  termina como negativa en el controlador actual.
- La próxima revisión se combina con observaciones en texto; se requiere
  comprobar una recuperación fiel y distinguirla de los diagnósticos rápidos.
- El controlador actual no valida todos los campos clínicos y los modelos
  clínicos inspeccionados no usan `BaseModel` ni SoftDeletes. No debe
  habilitarse simplemente el envío existente.

La capacidad final de almacenamiento y cualquier necesidad de DBR se decidirán
con BD y backend; la existencia de las tablas no garantiza que el flujo actual
guarde todo.

### Comparación de formularios con el esquema y el código actual

La columna «mapeo actual» describe el controlador existente, **no un guardado
ya disponible**: la PWA bloquea el envío. El inventario verificó columnas y
relaciones, no todos los límites, restricciones o reglas clínicas.

| Formulario y campos | Esquema y mapeo actual | Diferencia que debe resolverse |
|---|---|---|
| Los tres: animal | `clinical_evaluations.animal_id` enlaza `animals`. | Confirmar que el animal exista y que quien consulta o guarda tenga autorización. |
| Los tres: responsable | `veterinarian_id` enlaza `users`; la API usa la sesión. | La ruta actual exige sesión de personal, pero no limita expresamente la operación al rol veterinario. La lectura del perfil también debe proteger la información clínica. |
| Rápido e intenso: fecha | `evaluation_date` es `DATE`. | El controlador sustituye fecha ausente o inválida por la fecha actual. Debe acordarse la validación sin inventar una fecha. |
| Rápido: motivo | `evaluation_reason` es `VARCHAR(100)`. | El controlador lo trunca a 100 caracteres y asigna un valor predeterminado cuando está vacío; el formulario no limita su longitud. |
| Rápido: especie, edad y sexo; intenso: nombre, especie, identificación, edad y sexo | Existen datos del ejemplar en `animals` y `species`, pero el controlador no almacena los valores escritos en estos campos. | Decidir si se conservan como datos históricos de la evaluación o si se muestran los datos vigentes del animal; estos pueden diferir de lo capturado. |
| Intenso: MVZ | El responsable autenticado se guarda en `veterinarian_id`; el texto escrito se agrega a `assessment_reason`. | Decidir cómo conservar y mostrar por separado el nombre capturado y el responsable autenticado. |
| Rápido e intenso: peso, temperatura, frecuencias cardiaca y respiratoria | `weight_kg`, `temperature_c`, `heart_rate` y `respiratory_rate`. | Validar rangos y precisión: las columnas decimales tienen límites y el formulario de peso permite valores con más de dos decimales. |
| Intenso: TLC y condición corporal numérica | `capillary_refill_time` es entero y `body_condition_score` existe. | TLC permite decimales en pantalla, pero el controlador lo redondea. Evitar la pérdida de precisión. |
| Rápido: puntaje de condición corporal | `body_condition_score`. | Verificar validación y recuperación fiel del puntaje opcional. |
| Rápido: casillas de actitud y condición corporal | `attitude` es `VARCHAR(100)`; hay tabla de hallazgos. | El controlador concatena actitudes y no guarda las opciones marcadas de condición corporal. La cadena puede exceder la columna; se necesita conservar cada selección sin ambigüedad. |
| Rápido: casillas de ojos, orejas, cavidad oral y demás sistemas | `clinical_evaluation_findings` tiene sistema, estado y descripción. | El controlador concatena selecciones en una descripción e infiere el estado. Comprobar reconstrucción exacta de múltiples opciones y no inventar una clasificación clínica. |
| Rápido: diagnóstico y recomendaciones | `presumptive_diagnosis` y `recommendations`. | El controlador los asigna a esas columnas; validar su significado con veterinaria y mostrarlos al consultar. |
| Rápido: apto para liberación, sí/no | `is_fit_for_wild_release` no admite NULL y tiene valor predeterminado 0. | Actualmente una respuesta vacía se guarda como «no»; debe distinguirse «sin responder» de «no». |
| Intenso: movilización física y métodos físicos | `animal_restraints` contiene tipo, método y notas. | Se combinan valores en notas y el método se trunca. Definir una representación que recupere cada campo sin ambigüedad. |
| Intenso: movilización química y 12 filas de medicamento, dosis, hora y observaciones | `animal_restraints` contiene medicamento, dosis, hora y notas. | El texto de movilización química se omite si ya hay filas químicas. Las dosis tienen dos decimales en BD aunque la PWA permite más; evitar pérdida y validar la hora. |
| Intenso: observaciones generales y número de animales afectados | El controlador combina ambos y el MVZ en `assessment_reason`. | Definir cómo recuperarlos por separado, sin interpretar texto libre como estructura. |
| Intenso: evaluación de los 12 sistemas | `clinical_evaluation_findings`. | El controlador crea un hallazgo por sistema con texto; validar campos, límites y lectura en el historial. |
| Intenso: toma de muestra sí/no y tipos de muestra | `lab_samples` almacena tipos y notas; el controlador no guarda la respuesta sí/no. | Distinguir sí, no y sin respuesta y conservar cada tipo seleccionado. |
| Intenso: biopsia, rayos X y muestra de laboratorio | `lab_samples.sample_type` y `result_notes`. | El texto de laboratorio solo se guarda asociado a tipos seleccionados; si no se selecciona ninguno, se pierde. Verificar límites y conservar cada campo. |
| Intenso: diagnósticos presuntivo y definitivo | `presumptive_diagnosis` y `definitive_diagnosis`. | Verificar validación y consulta completa sin transformación silenciosa. |
| Revisión: motivo y estado del animal | `evaluation_reason` y `destination_ruling`. | Se utilizan para representar estos valores, pero el perfil actual no los muestra y usa el mismo tipo que el diagnóstico rápido. Deben distinguirse y consultarse. |
| Revisión: próxima revisión y observaciones | `assessment_reason` contiene una concatenación de ambos; la fecha de evaluación se asigna al día actual. | Conservar y consultar cada valor de forma inequívoca; definir la fecha de la revisión. |

### ADR y gobierno aplicables

- ADR 0001: la PWA usa la API; validación y autorización corresponden al
  servidor. ADR 0018 actualiza el mínimo de PHP mencionado en ADR 0001.
- ADR 0010: toda modificación de esquema requiere DBR; el responsable de BD
  crea, prueba y aplica la migración, y backend espera «Lista para backend».
- ADR 0013: `arca_pruebas` es la base de trabajo; `arca_zoo` queda excluida.
- ADR 0003 está **Propuesto** en su propio documento: el modo offline no está
  aprobado ni forma parte de este alcance, aunque el índice lo liste aceptado.
- ADR 0021 describe excepciones de ventas, no autoriza extrapolarlas a clínica.
  DBR-001 dejó explícitamente la auditoría y SoftDeletes clínicos para una DBR
  de la feature correspondiente.

No se ejecutó una prueba de guardado real ni se verificaron todas las
restricciones CHECK. El diseño físico concreto y el inventario de restricciones
quedan sujetos a revisión del responsable de BD.

## Alcance propuesto para la primera entrega

- Guardar diagnósticos rápidos e intensos y revisiones, asociados a un animal
  existente y a la persona autenticada responsable, solo cuando se cumplan
  autorización, validación, conservación fiel y auditoría.
- Definir con BD, backend y el área veterinaria la lista exacta de campos
  habilitados de cada formulario. Son candidatos los campos que tienen una
  correspondencia comprobable en las tablas existentes, sujetos a sus
  restricciones y a validación; tener columna no basta para habilitarlos.
- Deshabilitar los campos que no puedan guardarse fielmente e indicar en
  español que todavía no están disponibles. La API debe rechazar valores
  no admitidos en lugar de descartarlos silenciosamente.
- Conservar y consultar todos los datos de los campos habilitados, sin pérdida
  silenciosa de valores ni selecciones.
- Mostrar el historial y detalle de los registros autorizados en el perfil del
  animal; conservar la descarga o impresión de los diagnósticos.
- Informar los errores y conservar la captura cuando no se confirme el guardado.
- Validar y autorizar las operaciones en la API y auditar los registros clínicos.

## Fuera de alcance

- Borradores sin conexión y sincronización.
- Guardar los campos deshabilitados en la primera entrega. Se mantienen como
  pendientes para la entrega completa, sin afirmar que ya fueron guardados.
- Edición o eliminación de registros clínicos, salvo decisión posterior.
- Cambios directos de esquema o migraciones por parte del solicitante o agente.

## Criterios de aceptación propuestos

- **CA-01:** Al guardar un diagnóstico rápido válido para un animal existente,
  la API confirma su persistencia y el historial permite consultar todos los
  datos y selecciones de los campos habilitados.
- **CA-02:** Al guardar un diagnóstico intenso válido, se conservan y pueden
  consultarse todos los datos habilitados de ambas secciones.
- **CA-03:** Al guardar una revisión válida, se conservan y pueden consultarse
  todos los datos habilitados de la revisión.
- **CA-04:** Cada registro indica el animal y la persona responsable; el
  historial muestra el tipo y fecha y permite distinguir los tres formularios.
- **CA-05:** Si falla la conexión, la sesión, la autorización o la validación,
  no se comunica éxito y la captura permanece disponible para corrección o
  reintento; los mensajes son claros y están en español.
- **CA-06:** La API rechaza operaciones clínicas de usuarios no autorizados,
  valida los datos recibidos y no registra parcialmente una solicitud fallida.
- **CA-07:** Los registros clínicos quedan auditados y no se borran físicamente;
  la solución cumple las reglas de gobierno de base de datos.
- **CA-08:** La impresión o descarga de los diagnósticos sigue funcionando y
  los datos guardados se pueden consultar tras recargar la aplicación.
- **CA-09:** Cada criterio cuenta con pruebas automatizadas; la integración se
  verifica en `arca_pruebas` sin reconstruir ni modificar directamente su esquema.
- **CA-10:** Los campos que la primera entrega no puede conservar fielmente
  están deshabilitados e identificados; si una solicitud intenta enviarlos, la
  API la rechaza con un error claro, sin guardar parcialmente el registro.

## Reglas y privacidad

- **RN-01:** MySQL administrado por la API es la fuente de verdad; la PWA no
  accede directamente a la base de datos.
- **RN-02:** Solo se confirma el guardado cuando el servidor confirma la
  operación; no se promete funcionamiento sin conexión.
- **RN-03:** No se inventan valores clínicos ni se descartan campos en silencio.
  Los campos opcionales sin respuesta se distinguen de una respuesta negativa.
- **RN-03a:** La lista de campos habilitados y sus restricciones se acuerda
  antes de implementar. Los campos deshabilitados y sus limitaciones se
  documentan para una entrega posterior.
- **RN-04:** Solo veterinarios autorizados pueden consultar y registrar datos
  clínicos; la API aplica la autorización. La interfaz no la sustituye.
- **RN-05:** Datos clínicos auditados y conservados conforme a la Constitución V.
  Si se requieren cambios al esquema, el responsable de BD los gestionará
  mediante una DBR; backend espera el estado «Lista para backend».
- **RN-06:** Durante desarrollo y pruebas se usa `arca_pruebas`; nunca `arca_zoo`.

## Decisiones pendientes

1. Validar el acceso exclusivo para veterinarios con la persona responsable
   del área veterinaria.
2. Confirmar con el área veterinaria los campos obligatorios y las reglas de
   validación de cada formulario, sin alterar los valores capturados.
3. Decidir con BD, backend y veterinaria qué campos pueden habilitarse y
   consultarse fielmente en la primera entrega, y cuáles quedan bloqueados.
4. Completar el inventario de restricciones y determinar, con BD y backend,
   los cambios necesarios para cumplir auditoría y SoftDeletes.
5. Aprobar esta spec y, posteriormente, el plan técnico antes de implementar.
