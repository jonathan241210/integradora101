# 0019 · Generación del QR del boleto en SVG desde la API

- Estado: Aceptado
- Fecha: 2026-11-01 (propuesto); aceptado el 2026-11-02 por Jonathan; ratificado con visto bueno de BD por Víctor Adrián el 2026-11-04
- Aprobado por: Jonathan (Backend / Autor spec `api-009`) y Víctor Adrián (Responsable de BD)
- Spec relacionada: `apps/api/specs/009-ticket-sales.md` (CA-09, RN-07, pregunta 4). Vinculado a `docs/database/requests/DBR-006-ticket-sales.md`; este ADR no cambia el esquema.

---

## Contexto

La especificación `api-009` (ventas de boletos en taquilla) exige que, al registrar una venta exitosa en efectivo (`POST /api/v1/admin/tickets`), la respuesta incluya `qr_svg`: un documento SVG válido generado por la API a partir del token criptográfico único almacenado en `tickets.qr_code` (CA-09, RN-07).

Restricciones normativas aplicables:
- **Constitución I:** El stack de la API está fijado en Laravel 12, PHP 8.4+ (ADR 0018) y MySQL 8.0.x administrado (ADR 0013). Toda dependencia nueva exige evaluación, justificación y un ADR aprobado.
- **Constitución V y DBR-006:** La base de datos es de datos financieros y solo almacena la cadena alfanumérica única (`tickets.qr_code`). **No se persisten archivos SVG, imágenes ni binarios en base de datos ni en disco.**
- **`dashboard-005` RN-07:** El dashboard no añade librerías de generación de QR; el SVG se entrega directamente renderizado por la API listo para impresión en el navegador.
- **`api-009` regla técnica:** No se implementa un codificador de código QR artesanal o propio; se debe utilizar una solución sólida, testeada y estándar en la industria.

---

## Decisión aceptada

**Librería: `bacon/bacon-qr-code`, versión `^3.1` (verificada: v3.1.1, publicada el 2026-04-05, licencia BSD-2-Clause).**

Se aprueba y adopta la **Opción B: `bacon/bacon-qr-code` en versión `v3.1.1`** para la generación del código QR en SVG dentro de la API.

### Justificación de la elección

1. **Cero nuevas dependencias (Constitución I):** `bacon/bacon-qr-code` ya se encuentra presente en el proyecto en versión `v3.1.1` (bloqueada en `apps/api/src/composer.lock` a través de `laravel/fortify` para la autenticación 2FA). Su adopción no agrega paquetes adicionales al árbol de dependencias ni altera el `composer.json`.
2. **Generación pura en memoria:** Mediante su backend `SvgImageBackEnd`, produce el código QR como un documento vectorial SVG (XML estructurado) directamente en memoria, sin requerir extensiones nativas pesadas de imagen (`ext-gd` ni `imagick`).
3. **Compatibilidad total verificada:** Plenamente compatible con PHP 8.4, Laravel 12 y probado dentro del ecosistema Laravel.
4. **Encapsulamiento en Action (Constitución III):** La generación se implementa dentro de una Action (`GenerateTicketQrSvgAction` / `RenderTicketQrSvgAction`) que recibe el token `tickets.qr_code` y retorna el string SVG; el controlador de venta permanece delgado.
5. **No persistencia:** El SVG generado se devuelve exclusivamente en el payload HTTP `201` y se descarta de la memoria; la base de datos conserva únicamente el token único en la columna `tickets.qr_code`.

---

## Alternativas evaluadas

| Alternativa | Análisis | Motivo de resolución |
|---|---|---|
| **A. `endroid/qr-code`** | Paquete popular con API orientada a objetos (Builder pattern). | **Descartada:** Exige instalar un paquete nuevo con Composer y dependencias adicionales en `composer.json`, resultando redundante cuando `bacon/bacon-qr-code` ya está instalado en el proyecto. |
| **B. `bacon/bacon-qr-code`** (Elegida) | Port oficial de ZXing en PHP puro con backend SVG nativo. | **Aceptada:** Ya instalada (`v3.1.1`), cero dependencias adicionales, soporte probado en Laravel Fortify y generación de SVG liviana y sin extensiones binarias. |
| **Generación en el cliente** | Librería JS en React para renderizar el QR en el dashboard. | **Descartada:** Añade dependencias a los clientes web, compromete la consistencia entre clientes y complica la impresión directa. |
| **Servicio externo por URL** | Enviar el token a una API pública externa para obtener la imagen. | **Rechazada rotundamente:** Compromete la privacidad de los tokens de validación y vulnera la autonomía offline del zoológico (Constitución I). |

---

## Consecuencias

### Positivas
- Cero dependencias adicionales añadidas a `composer.json`.
- La API genera el SVG del QR en milisegundos en memoria sin consumir espacio en disco ni en la base de datos MySQL.
- Máxima portabilidad y cumplimiento de los principios constitucionales I, III y V de ARCA-NB.

### Riesgos o costos
- La API de `bacon/bacon-qr-code` requiere instanciar `RendererStyle`, `SvgImageBackEnd` y `Writer`. Esto se mitiga al 100% aislándolo en la Action `RenderTicketQrSvgAction`.
- El token QR viaja en texto legible dentro del SVG; esto es por diseño vectorial y se valida que solo el personal autorizado con `tickets.create` tenga acceso a la respuesta de emisión del boleto.

---

## Validación y revisión

- **Estado actual:** **Aceptado**.
- **Aprobado por:**
  - Jonathan (Backend / Autor spec `api-009`) — 2026-11-02
  - Víctor Adrián (Responsable de Base de Datos) — 2026-11-04
- **Resolución técnica:** Implementación completada en `RenderTicketQrSvgAction` utilizando `BaconQrCode\Writer` y `BaconQrCode\Renderer\Image\SvgImageBackEnd`.
