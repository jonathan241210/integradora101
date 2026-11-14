# Tareas · 006 · diagnostico-intenso-parte1-precarga

- Spec: `apps/pwa/specs/006-diagnostico-intenso-parte1-precarga.md`
- Plan: `apps/pwa/plan/006-diagnostico-intenso-parte1-precarga.md`

> Precondiciones satisfechas: spec 006 aprobada y ajustada (2026-11-13). Decisiones vigentes: MVZ y datos del animal (nombre, especie, identificación, sexo, edad) precargados y **editables** (sin sombreado visual); edad calculada desde `birth_date` o `estimated_age`; peso/fecha editables. Sin cambios de BD ni persistencia.

## Implementación

- [x] **T-01** (CA-01, RN-01): `useStaffSession` expone perfil y `getStaffDisplayName` (`first_name` + `last_name` + `second_last_name`); `App`/`AppShell` pasan `mvzName` y `DiagnosisIntenseView` precarga “MVZ” como valor sugerido **editable**.
- [x] **T-02** (CA-02, RN-02): Al seleccionar animal se precargan nombre, especie, identificación, sexo y **edad** (calculada/estimada) en inputs como valores sugeridos **editables** (campos conservados).
- [x] **T-03** (CA-03, RN-03): “Peso (kg)” y “Fecha” editables con comportamiento actual; no se agrega snapshot de edad en BD (`evaluation_date` marca el momento).
- [x] **T-04** (CA-04): Sin animal seleccionado los campos dependientes permanecen vacíos (MVZ puede seguir precargado). Se limpian/reinician al reset/guardado.
- [x] **T-05** (CA-05, RN-04): Se reutiliza manejo de errores existente de carga (`AnimalPicker` muestra error; sesión requerida para acceso) sin romper el formulario.
- [x] **T-06** (CA-02): `AnimalPicker` acepta `onSelect` y entrega el `AnimalSummary` seleccionado.

## Pruebas automatizadas

- [ ] **T-07** (CA-01): Prueba de precarga y no editabilidad de MVZ. (Pendiente en entorno sin ejecución de Vitest)
- [ ] **T-08** (CA-02): Prueba de precarga y no editabilidad de nombre/especie/identificación/sexo al seleccionar animal.
- [ ] **T-09** (CA-03): Prueba de edad editable no precargada y peso/fecha editables.
- [ ] **T-10** (CA-04): Prueba de estado vacío sin selección.
- [ ] **T-11** (CA-05): Prueba de manejo de error de carga.
- [ ] **T-12** (CA-06): Ejecutar/verificar suite de diagnóstico/PWA y registrar resultados. (Pendiente: sin `pnpm/npm` en PATH en este entorno)

## Calidad y entrega

- [x] **T-13**: Spec/plan/tasks actualizados a aprobados con decisiones confirmadas; se documenta relación con spec 002 y que la persistencia clínica sigue fuera de alcance. Evidencia de pruebas pendiente en entorno de ejecución PWA.