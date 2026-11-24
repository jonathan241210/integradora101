# 0012 · Canal de distribución Android

- Estado: Aceptado
- Solicitada: 2026-10-09
- Aprobada: 2026-10-09
- Spec relacionada: `apps/mobile/specs/008-build-distribution.md` (Implementada) y `apps/mobile/specs/018-production-build-hardening.md`
- Implementación: `apps/mobile/eas.json` define los perfiles `preview` (APK de respaldo) y `production` (build firmado para Play Store). La publicación en Play Console es un paso de despliegue, no de código.

## Contexto

La app móvil es solo Android y Expo Go no se puede entregar a los visitantes: hace falta un build firmado y un canal de distribución. Este ADR complementa ADR 0004 (React Native/Expo aceptado) y recoge las decisiones previas sobre distribución.

## Decisión

Distribuir con **Play Store en pruebas** (cerradas o abiertas) como canal principal y mantener un **APK de descarga directa como respaldo**. Da instalación y actualizaciones normales sin exigir una publicación completa. Los requisitos actuales de Play Console deben verificarse antes de comprometer fechas, porque han cambiado para cuentas nuevas.

## Alternativas consideradas

|  | APK por descarga directa | Distribución interna de EAS | Play Store en pruebas o producción |
|---|---|---|---|
| Instalación por el visitante | Descarga y permiso de "origen desconocido" | Enlace de instalación; mismo aviso de Android | Instalación normal desde la tienda |
| Confianza del visitante | Baja: advertencias del sistema | Baja a media | Alta |
| Actualizaciones | Manuales (el visitante descarga otro APK) | Manuales o por enlace | Automáticas desde la tienda |
| Esfuerzo inicial | Bajo | Bajo a medio | Medio a alto (cuenta de desarrollador, ficha, política de privacidad, revisión) |
| Alcance real | Cualquiera con el enlace | Cualquiera con el enlace | Descubrible en la tienda (en pruebas, solo quien tenga acceso) |
| Firma y claves | Hay que guardar la clave de firma | Gestionada por EAS o propia | Firma de la tienda, con respaldo de la clave de subida |

## Consecuencias

### Positivas

- Instalación y actualizaciones normales para el visitante; mayor confianza que un APK suelto.
- El APK de respaldo cubre a quien no pueda o no quiera usar la tienda.

### Riesgos o costos

- Se necesita un build firmado en cualquiera de los tres canales; Expo Go no se puede entregar a los visitantes.
- Hay que fijar y respaldar la clave de firma desde el primer build público, porque cambiarla después rompe las actualizaciones.
- La estrategia de actualización (reinstalar o actualizar sin reinstalar) debe quedar decidida antes del primer build público.
- Una política o aviso de privacidad es necesario en Play Store y recomendable en los otros dos canales.
- La firma y el build de producción quedan a cargo del responsable de despliegue.

## Validación y revisión

Su aceptación depende de la spec `mobile-008`. El primer build público registra la clave de firma usada y su respaldo, y verifica los requisitos vigentes de Play Console.
