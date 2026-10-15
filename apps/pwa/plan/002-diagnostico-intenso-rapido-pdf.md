# Plan técnico · 002 · diagnostico-intenso-rapido-pdf

- Spec: `apps/pwa/specs/002-diagnostico-intenso-rapido-pdf.md`
- Estado de spec: Aprobada
- Responsable técnico: Por identificar

## Diseño de solución

- `PwaSection` incorpora `diagnosis-intense` y `diagnosis-quick`, que no aparecen en la navegación; `diagnosis-form` pasa a ser el selector de modalidad y el elemento de navegación «Registrar diagnóstico» permanece activo en las tres.
- ViewModel `viewmodels/diagnosisForms.ts`: datos tipados de los formatos (campos por sistema, grupos de casillas) y `usePrintDocument`, que llama a `window.print()` y reporta error si no está disponible.
- Vistas: `DiagnosisChooserView`, `DiagnosisIntenseView` (dos pasos en pantalla, ambos visibles al imprimir), `DiagnosisQuickView` y `DiagnosisPrint` (encabezado, pie y botón «Descargar PDF» compartidos).
- PDF: reglas `@media print` en `styles.css` ocultan shell, navegación y acciones; el encabezado y el pie institucionales solo se ven al imprimir. Los valores capturados se imprimen desde el DOM vivo.
- Inicio añade accesos directos a ambas modalidades.

## Constitution Check

- Sin dependencias nuevas ni ADR (RN-02). Datos solo en memoria (RN-01). Sin colores de marca fijos; tokens semánticos. UI en español; código en inglés. Lógica fuera de componentes (RN-05).

## Pruebas

Vitest con `renderToStaticMarkup` y acciones simuladas de `window.print`, una por CA-01 a CA-07 más cobertura CA-08.
