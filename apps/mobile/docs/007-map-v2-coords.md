# Coordenadas de Referencia V2 — Mapa y GPS

Documento de correspondencia entre el espacio geográfico real y el plano esquemático SVG de `apps/mobile`.

## Bounding Box del Zoológico Nicolás Bravo

| Vértice / Punto | Latitud (Prueba) | Longitud (Prueba) | Latitud (Real) | Longitud (Real) |
|---|---|---|---|---|
| Esquina Noroeste | 20.0850 | -98.7250 | *Pendiente medición* | *Pendiente medición* |
| Esquina Noreste | 20.0850 | -98.7190 | *Pendiente medición* | *Pendiente medición* |
| Esquina Suroeste | 20.0800 | -98.7250 | *Pendiente medición* | *Pendiente medición* |
| Esquina Sureste | 20.0800 | -98.7190 | *Pendiente medición* | *Pendiente medición* |
| Entrada Principal | 20.0800 | -98.7220 | *Pendiente medición* | *Pendiente medición* |

## Puntos de Interés (MOCK_MAP_PLACES)

| ID | Nombre | Tipo | mapX | mapY | Latitud (Prueba) | Longitud (Prueba) | Lat/Lon (Real) |
|---|---|---|---|---|---|---|---|
| `juan` | Hábitat del Tigre | animal | 0.23 | 0.25 | 20.0838 | -98.7236 | *Pendiente* |
| `simba` | Zona del León | animal | 0.31 | 0.36 | 20.0832 | -98.7231 | *Pendiente* |
| `penguin` | Cala de Pingüinos | animal | 0.23 | 0.55 | 20.0823 | -98.7236 | *Pendiente* |
| `monkey` | Bosque de Monos | animal | 0.31 | 0.83 | 20.0809 | -98.7231 | *Pendiente* |
| `elephant` | Zona de Elefantes | animal | 0.23 | 0.76 | 20.0812 | -98.7236 | *Pendiente* |
| `bird-aviary` | Aviario | animal | 0.77 | 0.25 | 20.0838 | -98.7204 | *Pendiente* |
| `reptile-house` | Herpetario | animal | 0.77 | 0.55 | 20.0823 | -98.7204 | *Pendiente* |
| `restrooms` | Baños | service | 0.77 | 0.76 | 20.0812 | -98.7204 | *Pendiente* |
| `food-court` | Comida | service | 0.70 | 0.83 | 20.0809 | -98.7208 | *Pendiente* |
| `main-entrance` | Entrada principal | entrance | 0.50 | 0.90 | 20.0800 | -98.7220 | *Pendiente* |

> **Nota:** Las coordenadas reales se integrarán una vez se cuente con la foto/video del zoológico y la medición GPS en campo. No se requiere alterar la arquitectura ni los componentes para actualizar los valores (únicamente `src/constants/zoo.ts` y `src/mocks/zoo.ts`).
