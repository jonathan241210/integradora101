# Tareas · 013 · enclosure-qr-printing

- Spec: `apps/dashboard/specs/013-enclosure-qr-printing.md`
- Plan: `apps/dashboard/plan/013-enclosure-qr-printing.md` (Borrador)
- Dependencias: `apps/api/tasks/020-enclosure-qr-management.md` T-04 a T-07 y T-15 (endpoints y cliente). Ninguna tarea de esta lista empieza antes.
- Estado de estas tareas: **Aprobadas**. Ninguna tarea se marca hecha sin evidencia de la sesión principal.
- Solicitada: 2026-11-18
- Aprobada: 2026-11-18

## Implementación
Evidencia de implementación: `npm test` en `apps/dashboard` = 61 archivos, 586 tests en verde; `npm run types` sin errores; `npm run build` correcto. Tests en `src/tests/enclosure-qr-printing.test.tsx` (CA-01 a CA-23) y registro en `src/tests/administration-coverage.test.tsx`. Pendientes: evidencia manual de impresión en Chrome y Edge (T-06, T-16) y lint (el dashboard no define script de lint).


- [x] **T-01** (CA-01, CA-02): hook `src/viewmodels/useEnclosureQr.ts` (carga con `api.admin.enclosures.qr(id)`, estados) y botones «Ver QR» o «Generar QR» con insignia «Sin QR» en `src/views/EnclosuresView.tsx`, según `has_active_qr`. Nombres accesibles con el recinto. Solo con `enclosures.manage`. Tests `describe("CA-01 enclosure-qr-printing")` y `describe("CA-02 enclosure-qr-printing")`.
- [x] **T-02** (CA-03, CA-07, CA-15): componente `src/components/EnclosureQrDialog.tsx` con título «QR del recinto «X»», imagen (data URI con `encodeURIComponent`, RN-03), código en texto, aviso de recinto inactivo (texto confirmado), botones «Imprimir», «Regenerar QR» y «Cerrar». `role="dialog"`, `aria-modal`, foco inicial en «Imprimir», Esc y Tab. Tests CA-03, CA-07 y CA-15.
- [x] **T-03** (CA-04, CA-06, CA-12): en el hook, «Generar QR» llama una vez a `generateQr(id)` sin confirmación; «Regenerar QR» tras confirmar llama una vez a `regenerateQr(id)` y muestra «Código QR regenerado. Imprime y coloca el nuevo.» en `role="status"`. Errores de generar y regenerar según CA-12. Tests CA-04, CA-06 y CA-12.
- [x] **T-04** (CA-05, CA-23): `ConfirmDialog` de variante peligro para regenerar con el título y el texto exactos de CA-05. Enmienda a `dashboard-012` CA-03: el texto de eliminar recibe «Sus códigos QR dejarán de funcionar.» (CA-23). Tests CA-05 (no llama a la API hasta confirmar; cancelar devuelve el foco) y CA-23.
- [x] **T-05** (CA-08, CA-09): «Imprimir» llama una vez a `window.print()`. Bloque `#enclosure-qr-print` con nombre, QR y código, sin botones ni navegación. Tests CA-08 y CA-09.
- [x] **T-06** (código y tests; falta evidencia manual de impresión) (CA-10, CA-17): reglas `@media print` en `src/styles.css` (oculta la interfaz, muestra la hoja, QR de al menos 70 mm) y bloques de estilo con tokens semánticos, sin hex ni `rgb(`. Tests de lectura de `styles.css` para CA-10 y CA-17. Evidencia manual de impresión en Chrome y Edge, aportada por la sesión principal.
- [x] **T-07** (CA-11): mapeo de errores en el hook: 403 → «No tienes permiso para realizar esta acción.»; 404 → «Recinto no encontrado.» y cierre del diálogo; 500 o sin red → «No pudimos cargar el QR. Inténtalo de nuevo.» con «Reintentar» que solo llama a `qr(id)`. Test CA-11.
- [x] **T-08** (CA-13, CA-14): comprobar que la lista y los resultados del buscador no muestran el código. Test de DOM y test de lectura estática de hook y vista (sin `localStorage`, `sessionStorage`, cookies, URL ni logs). Tests CA-13 y CA-14.
- [x] **T-09** (CA-16): tras generar o regenerar, la página y el orden no cambian (`dashboard-012` CA-09) y `has_active_qr` de la tarjeta se actualiza. Test CA-16.
- [x] **T-10** (CA-18, CA-19, CA-20): entrada «QR del recinto» en `src/viewmodels/search-actions.ts` (sección Recintos, permiso `enclosures.manage`, abre diálogo, sinónimos del plan). Foco según término («imprimir» → «Imprimir»; «regenerar» → «Regenerar QR»; otros → «Ver QR»). Abrir la acción no genera, no imprime y no regenera. Permisos filtrados según `profile.permissions`. La etiqueta «QR del recinto» aparece en el código de `EnclosuresView` (regla de `dashboard-012` CA-32). Tests CA-18, CA-19 y CA-20 (cuatro combinaciones de permisos).
- [x] **T-11** (CA-22): test de lectura de los archivos de vista y hook: sin `fetch(` ni `axios`; la vista usa solo `useEnclosureQr`. Test CA-22.
- [x] **T-12** (CA-21): un `describe("CA-xx enclosure-qr-printing")` por cada CA-01 a CA-23 en `src/tests/enclosure-qr-printing.test.tsx`, y registro de la spec 013 en `src/tests/administration-coverage.test.tsx`. Test CA-21 (cobertura).

## Enmiendas a dashboard-012 (aprobadas, mismo PR)

- [x] **T-13** (CA-18, CA-20): aplicar en `apps/dashboard/specs/012-enclosure-actions-global-search.md` la enmienda (c) ya registrada (CA-32, CA-38, RN-07, CA-03). Actualizar el test de catálogo de `dashboard-012` CA-32 si cuenta entradas o etiquetas de Recintos. Sin cambio de CA-41.

## Calidad y entrega

- [x] **T-14**: documentación local: `apps/dashboard/docs/manual-demo.md` (flujo de QR, impresión) y `apps/dashboard/docs/arquitectura.md` (diálogo y hook), si cambia la referencia.
- [ ] **T-15**: verificaciones del dashboard: lint, `tsc`, Vitest completo y la suite de cobertura. Registrar resultados con salida real aportada por la sesión principal. Sin evidencia no se marca como hecho. El PR enlaza `apps/dashboard/specs/013-enclosure-qr-printing.md`, su plan y sus tasks, y `apps/api/specs/020-enclosure-qr-management.md`. El commit cita `dashboard-013`. Los commits los hace el equipo con el comando acordado.
- [ ] **T-16**: estado de la spec a «En progreso» al iniciar y «Implementada» solo con enlace a PR, resultados de Vitest y evidencia de impresión manual.

Cada tarea de código nombra sus CA-xx y cada CA-xx tiene al menos un test. El panel no añade dependencias npm ni llama a `fetch` o `axios` desde componentes.
