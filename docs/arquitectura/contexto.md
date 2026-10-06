# Contexto — C4 nivel 1 conceptual

ARCA-NB sirve al público y al personal del zoológico. La Dirección de Ingresos recibe información mediante el sistema municipal después de un cierre confirmado; el mecanismo permanece por confirmar. El proveedor/banco es futuro y no participa en V1.

```mermaid
flowchart LR
  Publico[Visitantes y público] --> ARCA[ARCA-NB]
  Personal[Personal del zoológico] --> ARCA
  Veterinaria[Personal veterinario] --> ARCA
  Directivos[Dirección y administración] --> ARCA
  ARCA --> Servicios[Servicios externos autorizados<br/>archivos y operación]
  ARCA --> Municipal[Sistema municipal<br/>ingresos y cortes tras cierre confirmado]
  Municipal --> Ingresos[Dirección de Ingresos]
  ARCA -. futuro; no activo en v1 .-> Proveedor[Proveedor o banco<br/>por seleccionar]
```

## Límites

- V1 vende boletos **solo en efectivo**.
- El enlace municipal se activa conceptualmente tras el cierre confirmado, pero BD directa o servicio interno, protocolo y contrato están por confirmar.
- El enlace discontinuo al proveedor representa una extensión **FUTURA/INACTIVA**, no software desplegado ni autorizado.
- Servicios externos deben permanecer detrás de interfaces portables y sin secretos en clientes.
