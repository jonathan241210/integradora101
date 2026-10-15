# 002 · diagnostico-intenso-rapido-pdf

- App dueña: `pwa`
- Apps/paquetes afectados: `apps/pwa`
- Estado: Aprobada
- Solicitante / responsable funcional: Solicitante de esta conversación; responsable veterinario por identificar
- Aprobación funcional: Solicitante, 2026-10-14

## Problema y contexto

La PWA tiene una sola pantalla «Registrar diagnóstico» con síntomas genéricos. El departamento médico veterinario usa formatos en papel: «Historia clínica del ejemplar» (anamnesis, contención química y física), «Evaluación clínica» (sistemas, signos vitales, sinología, diagnósticos) y el «Formato de historia clínica» de casillas para revisión rápida. Se pide reproducirlos como dos modalidades de diagnóstico y poder obtener cada uno en PDF.

## Objetivos

- Ofrecer dos opciones al iniciar el diagnóstico: **Diagnóstico intenso** y **Diagnóstico rápido**.
- Diagnóstico intenso: formulario en dos secciones equivalentes a los formatos en papel de «Historia clínica del ejemplar» y «Evaluación clínica».
- Diagnóstico rápido: formulario equivalente al «Formato de historia clínica» con casillas.
- Descargar cada diagnóstico como PDF con encabezado institucional y pie con dirección.

## Fuera de alcance

- Guardar, persistir o sincronizar datos clínicos; conexión con `apps/api`.
- Nuevas dependencias de generación de PDF; se usa la función de imprimir / «Guardar como PDF» del navegador.
- PDF en registro de animal, revisión o listado de animales.
- Firma electrónica, validación de cédula o reglas clínicas.

## Actores y permisos

| Actor/rol | Necesidad | Permisos requeridos |
|---|---|---|
| Personal veterinario de demostración | Capturar un diagnóstico y obtener su PDF | Ninguno (acceso demo de 001) |

## Historias de usuario

Como personal veterinario, quiero elegir entre diagnóstico intenso o rápido para capturar la información con el formato que corresponda al caso.

Como personal veterinario, quiero descargar el diagnóstico en PDF para imprimirlo o archivarlo.

## Criterios de aceptación

- **CA-01:** Dado el panel, cuando se abre «Registrar diagnóstico», entonces se presentan las opciones «Diagnóstico intenso» y «Diagnóstico rápido», y el inicio ofrece accesos a ambas.
- **CA-02:** Dado el diagnóstico intenso, cuando se muestra, entonces incluye los campos de la historia clínica del ejemplar (MVZ, fecha, nombre, especie, identificación, edad, sexo, peso, tipo de movilización física/química, tabla de contención química con medicamento, dosis mg/kg, dosis ml, hora y observaciones, contención física y observaciones generales).
- **CA-03:** Dado el diagnóstico intenso, cuando se avanza a la evaluación clínica, entonces incluye los sistemas (condición física general, piel y faneras, digestivo, urogenital, sentidos, musculoesquelético, nódulos linfáticos, cardiovascular, nervioso, respiratorio, endócrino, ojos), Temp., FR, FC, TLC, C.C. y la sinología (animales afectados, toma de muestra sí/no, tipos de muestra, muestra de laboratorio, diagnóstico presuntivo y definitivo).
- **CA-04:** Dado el diagnóstico rápido, cuando se muestra, entonces incluye motivo, fecha, especie, edad, sexo, peso, frecuencia cardiaca, respiratoria, temperatura, grupos de casillas por sistema (actitud, condición corporal con puntaje 1-5, ojos, orejas, cavidad oral, digestivo, piel, cardiovascular, respiratorio, musculoesquelético, urogenital), diagnóstico, recomendaciones y si está apto para liberación.
- **CA-05:** Dado cualquiera de los dos diagnósticos, cuando se pulsa «Descargar PDF», entonces se abre el diálogo de impresión con una versión imprimible que contiene los datos capturados, encabezado institucional y pie de dirección; los controles de la app no aparecen en el PDF.
- **CA-06:** Dado el diagnóstico intenso, cuando se descarga el PDF, entonces se imprimen ambas secciones (historia clínica y evaluación clínica).
- **CA-07:** Dados los formularios, cuando se recorren con teclado, entonces todos los controles tienen etiqueta y foco visible; son usables de 360 a 1366 px sin desbordamiento horizontal.
- **CA-08:** Dada la suite automatizada, entonces existe al menos una prueba por cada CA-01 a CA-07.

## Reglas de negocio

- **RN-01:** Los datos solo viven en memoria; no se guardan en almacenamiento y la interfaz no afirma que el registro fue guardado (heredado de 001 RN-04).
- **RN-02:** El PDF se genera con la impresión del navegador (`window.print`) mediante estilos de impresión; sin dependencias nuevas.
- **RN-03:** Encabezado del PDF: «Zoológico Municipal “Nicolás Bravo” · Departamento Médico Veterinario · Historia clínica de ejemplares». Pie: «Calle Pleasenton S/N, Colonia Lindavista, Tulancingo de Bravo Hidalgo. C.P. 43680».
- **RN-04:** El nombre y cédula del MVZ del formato rápido se toman de los datos de demostración y no constituyen firma válida.
- **RN-05:** Sin lógica clínica en componentes; la estructura de los formatos vive en un ViewModel/datos tipados. Colores mediante tokens semánticos; el logotipo solo se usa si existe un recurso aprobado.

## Datos, privacidad y auditoría

Se capturan datos clínicos de animales (no personales) solo en memoria, sin persistencia ni envío. El PDF queda en manos de quien lo descarga; en dispositivos compartidos se recomienda no guardarlo. No requiere esquema ni DBR.

## Flujos y errores

1. Diagnóstico → elegir intenso o rápido.
2. Intenso: paso 1 historia clínica → paso 2 evaluación clínica → Descargar PDF.
3. Rápido: formulario único → Descargar PDF.
4. Si el navegador bloquea la impresión, se muestra un mensaje; el formulario conserva sus datos.

## Dependencias, riesgos y preguntas

- Dependencias/ADR: ninguna nueva (sin librería PDF).
- Riesgos: el resultado depende del diálogo de impresión del navegador; se mitiga con estilos `@media print`.
- Preguntas pendientes: aprobar esta spec; confirmar si hay logotipo aprobado para el PDF.

## Revisión

- Aprobadores y fecha: Solicitante, 2026-10-14.
- Evidencia/enlaces: tres formatos adjuntos en la conversación.
