# Brief del SVG base · mobile-007 V1

- Feature: `mobile-007 map-location`
- Versión: V1 sin GPS
- Artefacto esperado: `zoo-map-v1.svg`
- Uso: fondo del mapa de la app; los marcadores se superponen desde datos (`MapPlace`).
- No es: mapa geográfico, imagen aérea, Google Maps, satélite, mapa con calles ni recorrido 3D.

## Objetivo visual

Crear un plano esquemático de bajo detalle, tipo parque temático, que permita orientarse dentro del zoológico. Debe verse claro en una pantalla de teléfono, con secciones bien diferenciadas y senderos simples. No pretende ser exacto geográficamente.

## Lienzo y estructura

- `viewBox="0 0 1000 1400"`.
- Orientación vertical.
- Margen visual de 24–40 px.
- Formas simples: rectángulos redondeados, elipses y senderos con curvas suaves.
- Sin sombras complejas, sin gradientes, sin texturas, sin imágenes externas.
- Etiquetas como texto editable, no como trazos convertidos a curvas.

## Zonas de la V1

| ID | Etiqueta | Posición aproximada | Color de referencia |
|---|---|---|---|
| `zone-felines` | FELINOS | x=70, y=140, w=330, h=330 | `#E6D8C6` |
| `zone-birds` | AVES | x=600, y=140, w=330, h=330 | `#DDE8D5` |
| `zone-aquatic` | ACUARIO | x=70, y=540, w=330, h=300 | `#D6E7EA` |
| `zone-reptiles` | REPTILES | x=600, y=540, w=330, h=300 | `#E8DCCB` |
| `zone-herbivores` | HERBÍVOROS | x=70, y=920, w=330, h=280 | `#DDE8D5` |
| `zone-services` | SERVICIOS | x=600, y=920, w=330, h=280 | `#E6E1D6` |
| `zone-entrance` | ACCESO | x=350, y=1180, w=300, h=160 | `#F0D9C8` |
| `zone-plaza` | PLAZA | elipse cx=500, cy=760, rx=120, ry=100 | `#F7E8C8` |

Estos nombres y posiciones son provisionales. Cuando el zoológico confirme su distribución, se actualiza el SVG, no el contrato de datos.

## Senderos y agua

- Sendero principal desde `ACCESO` hasta la plaza central.
- Senderos radiales desde la plaza hacia cada sección.
- Un estanque dentro de `ACUARIO`.
- Los senderos deben ser claros, continuos y con extremos redondeados.
- No dibujar calles, banquetas, estacionamiento, autos ni edificios externos.

## Capas y IDs

El SVG debe organizarse así:

```xml
<svg viewBox="0 0 1000 1400" xmlns="http://www.w3.org/2000/svg">
  <g id="background">...</g>
  <g id="water">...</g>
  <g id="paths">...</g>
  <g id="zones">...</g>
  <g id="labels">...</g>
  <g id="landmarks">...</g>
</svg>
```

Cada zona debe ser una forma cerrada con el `id` exacto de la tabla. Las etiquetas deben ser elementos `<text>` con `text-anchor="middle"`.

## Reglas de exportación

- Formato: SVG limpio, sin `<image>`, sin base64, sin fuentes externas, sin `<foreignObject>`.
- Elementos permitidos: `<svg>`, `<g>`, `<rect>`, `<path>`, `<circle>`, `<ellipse>`, `<line>`, `<polyline>`, `<text>`.
- Colores de referencia sustituibles por tokens; evitar hexadecimales de marca definitivos.
- Nombres de capas/grupos en inglés y con los IDs indicados.
- Debe importarse a Figma sin perder grupos ni capas principales.
- Si se exporta desde Figma, activar la opción de incluir atributos `id` si está disponible; si no, se agregan al integrar.

## Qué NO debe incluir el SVG

- Marcadores, pines, animales, iconos de servicios o botones.
- Textos de interfaz como “Buscar”, “Todo” o “Mi ubicación”.
- GPS, rutas, flechas de navegación o el punto “tú estás aquí”.
- 3D, perspectiva, sombras realistas o texturas.
- Calles, autos, estacionamiento o zonas fuera del zoológico.

## Prompt para Claude/Figma

Copiar y pegar:

```text
Actúa como diseñador de mapas esquemáticos para una aplicación móvil.

Necesito un único archivo SVG llamado zoo-map-v1.svg para el mapa 2D del Zoológico Municipal Nicolás Bravo. Es un plano esquemático de bajo detalle, tipo parque temático, NO un mapa geográfico. No uses imágenes aéreas, satélite, calles, autos, estacionamientos ni 3D.

Requisitos técnicos:
- viewBox="0 0 1000 1400".
- Orientación vertical.
- Sin imágenes externas, sin base64, sin fuentes externas, sin <foreignObject>.
- Usa solo: <svg>, <g>, <rect>, <path>, <circle>, <ellipse>, <line>, <polyline>, <text>.
- Organiza en grupos: background, water, paths, zones, labels, landmarks.
- Cada zona debe ser una forma cerrada con un id exacto.
- Las etiquetas deben ser <text>, no trazos convertidos a curvas.
- No dibujes marcadores, pines, animales, iconos, botones ni textos de interfaz.
- No dibujes rutas, flechas de navegación ni el punto "tú estás aquí".

Zonas y posiciones aproximadas:
- zone-felines, etiqueta FELINOS: rect x=70 y=140 width=330 height=330 rx=44.
- zone-birds, etiqueta AVES: rect x=600 y=140 width=330 height=330 rx=44.
- zone-aquatic, etiqueta ACUARIO: rect x=70 y=540 width=330 height=300 rx=44.
- zone-reptiles, etiqueta REPTILES: rect x=600 y=540 width=330 height=300 rx=44.
- zone-herbivores, etiqueta HERBÍVOROS: rect x=70 y=920 width=330 height=280 rx=44.
- zone-services, etiqueta SERVICIOS: rect x=600 y=920 width=330 height=280 rx=44.
- zone-entrance, etiqueta ACCESO: rect x=350 y=1180 width=300 height=160 rx=40.
- zone-plaza, etiqueta PLAZA: ellipse cx=500 cy=760 rx=120 ry=100.

Colores de referencia (se reemplazarán por tokens después):
- Fondo: #F4F1E8.
- Felinos: #E6D8C6.
- Aves: #DDE8D5.
- Acuario: #D6E7EA.
- Reptiles: #E8DCCB.
- Herbívoros: #DDE8D5.
- Servicios: #E6E1D6.
- Acceso: #F0D9C8.
- Plaza: #F7E8C8.
- Senderos: blanco #FFFFFF con borde suave #D8D2C4.
- Agua: #CFE3E8.
- Texto: #2E2A26.
- Bordes de zonas: un tono más oscuro que el relleno, con contraste suficiente.

Composición:
- El acceso está abajo al centro.
- Un sendero principal sube desde el acceso hasta la plaza central.
- Desde la plaza salen senderos hacia felinos, aves, acuario, reptiles, herbívoros y servicios.
- El estanque está dentro de acuario.
- Deja márgenes visuales y evita que los senderos crucen las etiquetas.
- Usa formas simples, esquinas redondeadas y buen contraste.
- El resultado debe verse bien en una pantalla de teléfono y ser editable en Figma.

Entrega:
- Devuelve únicamente el código SVG completo, sin explicación y sin bloques de markdown.
```

## Criterios de aceptación del SVG

- Se abre correctamente como SVG y mantiene la proporción 1000:1400.
- Contiene las ocho zonas con sus IDs exactos.
- Contiene etiquetas legibles en español.
- Tiene senderos y un estanque.
- No contiene imágenes, pines ni elementos de interfaz.
- Se puede importar a Figma y editar por capas.
- Los colores se pueden sustituir por tokens sin cambiar la estructura.

## Relación con la app

El SVG es solo el fondo. La app superpone los puntos desde `MapPlace` con `mapX`/`mapY`; por eso el SVG no debe incluir marcadores. Cuando exista una imagen aérea o un plano más detallado, se puede reemplazar el SVG y recalibrar las posiciones sin cambiar el contrato de datos.
