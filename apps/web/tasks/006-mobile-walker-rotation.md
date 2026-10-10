# Tareas · 006 · mobile-walker-rotation

- Spec: `apps/web/specs/006-mobile-walker-rotation.md` (Estado: **Aprobada**)
- Plan: `apps/web/plan/006-mobile-walker-rotation.md` (Estado técnico: **Aprobado para tareas**)
- Checklist: Aprobado por el solicitante, 2026-10-08

## Trazabilidad

| Criterio / regla | Tareas que lo cubren |
|---|---|
| CA-01 / RN-01 / RN-02 | T-02, T-03, T-04 |
| CA-02 / RN-03 | T-02, T-03, T-05 |
| CA-03 / RN-04 | T-02, T-03, T-06 |
| CA-04 | T-07, T-08 |

## Implementación

- [x] **T-01** (preparación para CA-01..CA-04): agregar a `apps/web/src/tests/relocation.test.mjs` un entorno controlado con módulos integrados de Node para ejecutar `animations.js`, simular elementos DOM, media queries y avance de temporizadores. No agregar paquetes.
- [x] **T-02** (CA-01, CA-02, CA-03; RN-01..RN-04): actualizar `apps/web/src/animations.js` para seleccionar la pareja consecutiva activa hasta 560 px, iniciar con la primera pareja, cambiar cada 8 segundos, repetir el ciclo y responder a cambios de viewport sin duplicar timers. En escritorio deben mostrarse los seis animales; al volver a móvil se reinicia con la primera pareja. Mantener el control actual y no crear animales si está activa la preferencia de movimiento reducido.
- [x] **T-03** (CA-01, CA-02, CA-03; RN-01, RN-03, RN-04): confirmar que la regla global existente `[hidden]` en `apps/web/src/styles.css` oculta efectivamente los animales inactivos; no se modificó `animations.css` porque no hace falta duplicar ese estilo.
- [x] **T-04** (CA-01; RN-01, RN-02): agregar un test llamado `CA-01 mobile-walker-rotation` que compruebe el límite de dos, la pareja inicial, el cambio cada 8 segundos, el orden de las tres parejas, el reinicio del ciclo y el límite en el instante del intercambio.
- [x] **T-05** (CA-02; RN-03): agregar un test llamado `CA-02 mobile-walker-rotation` que compruebe que un viewport mayor de 560 px presenta los seis animales, que los ajustes originales de su recorrido se mantienen y que un cambio hacia escritorio restaura la visibilidad y cancela el ciclo móvil.
- [x] **T-06** (CA-03; RN-04): agregar un test llamado `CA-03 mobile-walker-rotation` que compruebe el control actual de mostrar/ocultar, el límite al volver a mostrar en móvil, la transición entre breakpoints, el caso de movimiento reducido y las reglas de ocultación para impresión.
- [x] **T-07** (CA-04): agregar un test llamado `CA-04 mobile-walker-rotation` que compruebe que la suite nombra CA-01..CA-04, ejecuta con `node --test` y no declara dependencias nuevas; conservar los tests preexistentes.

## Calidad y entrega

- [x] **T-08** (CA-01..CA-04): ejecutar `node --test apps/web/src/tests/relocation.test.mjs`, resolver fallos causados por este cambio y registrar cualquier fallo preexistente; ejecutar `/verify` para `apps/web` y dejar explícito si la app no está inicializada.
- [x] **T-09** (CA-01..CA-04): ejecutar `git diff --check`, revisar que el diff solo incluya los archivos autorizados por la spec, y actualizar los estados y la evidencia de spec, plan y tasks después de verificar los criterios. No crear commits como parte de estas tareas ni marcar la spec Implementada mientras la suite completa siga bloqueada.

## Aprobación y dependencias

- T-01 precede a T-02..T-07 porque provee el entorno para probar comportamiento, viewport y temporizadores.
- T-02 y T-03 preceden a T-04..T-06.
- T-07 confirma la cobertura de todos los criterios y se integra después de escribir sus pruebas.
- T-08 y T-09 cierran la validación.
- Aprobación funcional: Solicitante, 2026-10-08.
- Aprobación técnica del plan: Solicitante, 2026-10-08.

## Evidencia parcial

- T-01..T-07 implementadas; las cuatro pruebas enfocadas (`--test-name-pattern='mobile-walker-rotation'`) pasan.
- La suite completa ejecuta 33 pruebas: 32 pasan y una prueba ajena a esta feature falla en `CA-04 visit-info-icons-and-favicon`, que espera encontrar una regla `margin-top: 8px` en `.infobar .info-icon` en `styles.css`. No se modificó esa funcionalidad preexistente.
- En navegador real a 390 px: dos animalitos visibles, cuatro ocultos, y sin desbordamiento horizontal; después de 8 segundos siguen visibles exactamente dos.
- T-08 completada: `/verify` informa que `apps/web` aún no está inicializada porque no existe `apps/web/src/package.json`; no hay scripts npm de formato, lint, tipos o pruebas. La verificación manual disponible usa `node --test`.
- T-09 completada: `git diff --check` y el chequeo de espacios finales no reportan errores. La revisión confirma que no se modificaron menú, API, assets ni otras apps.
- La feature no se marca Implementada porque la suite completa tiene un fallo preexistente fuera de alcance; la spec queda En progreso hasta que se corrija y vuelva a verificarse ese bloqueo.
