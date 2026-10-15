# Tareas · 002 · diagnostico-intenso-rapido-pdf

- Spec: `apps/pwa/specs/002-diagnostico-intenso-rapido-pdf.md`
- Plan: `apps/pwa/plan/002-diagnostico-intenso-rapido-pdf.md`

## Implementación

- [x] **T-01** (CA-01): Añadir secciones ocultas `diagnosis-intense` y `diagnosis-quick`, selector de modalidad y accesos directos en Inicio.
- [x] **T-02** (CA-02, CA-03, CA-06): Crear el diagnóstico intenso en dos pasos con ambos visibles al imprimir.
- [x] **T-03** (CA-04): Crear el diagnóstico rápido con casillas.
- [x] **T-04** (CA-05, CA-06): Crear encabezado/pie imprimibles, botón «Descargar PDF» y estilos `@media print`.
- [x] **T-05** (CA-07): Ajustar estilos responsive, etiquetas y foco.

## Pruebas automatizadas

- [x] **T-06** (CA-01 a CA-08): Pruebas Vitest nombradas por criterio en `src/tests/diagnosis.test.tsx`.
