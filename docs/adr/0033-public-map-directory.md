# 0033 · Directorio público del mapa del zoológico

**Estado** — Aceptado por la persona solicitante el 24 de noviembre de 2026 junto con el plan y la implementación de web-004.

## Contexto

El mapa de la portada está implementado en HTML y JavaScript. El directorio agrega dos lecturas públicas al portal. Los ADR 0024, 0027, 0028 y 0031 documentan excepciones limitadas a otros módulos de esta misma página.

## Decisión

Extender al directorio de web-004 el patrón de la portada. El único módulo de red será `src/js/api.js`. El panel presentará los nombres como texto del DOM y consultará los catálogos públicos sin credenciales. La suite estática del portal cubrirá los criterios con `node --test`. La API conservará la responsabilidad sobre la visibilidad de los registros.

## Consecuencias y revisión

Se reutilizan el visor, el cliente público y las herramientas de prueba instaladas. Introducir React en esta sección exigiría distribuir un segundo entorno de ejecución para presentar dos listas. El alcance de la excepción termina en el directorio de lectura de la portada. Si cambia su audiencia o permite editar registros, se revisará la decisión.
