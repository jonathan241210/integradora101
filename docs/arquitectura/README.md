# Guía de arquitectura general

- **Estado de la línea base:** Propuesta.
- **Aprobación:** PR revisado por todo el equipo; el merge deja evidencia.

Esta carpeta desglosa la [arquitectura normativa](../02-arquitectura.md). Después de aprobar la línea base, cada responsable copia la [plantilla](../templates/arquitectura-app.md) a `apps/<app>/docs/arquitectura.md`; API avanza primero o en paralelo y los clientes no inventan contratos. Cada arquitectura se aprueba en su propio PR.

## Vistas

- [Contexto](contexto.md)
- [Contenedores](contenedores.md)
- [Componentes](componentes.md)
- [Despliegue](despliegue.md)
- [Contratos](contratos.md)
- [Secuencias](secuencias.md)
- [Patrones](../08-patrones-arquitectonicos.md)

## Checklist temporal del equipo

| Entregable | Estado inicial | Validación mínima |
|---|---|---|
| Arquitectura de `apps/api` | Pendiente | Dominios, contratos, seguridad, componentes y ADRs |
| Arquitectura de `apps/dashboard` | Pendiente | MVVM, efectivo/caja, permisos y secuencias |
| Arquitectura de `apps/pwa` | Pendiente | MVVM, offline, privacidad, conflictos y ADR 0003 |
| Arquitectura de `apps/web` | Pendiente | MVVM, contenido público y pagos solo como futuro |
| Arquitectura de `apps/mobile` | Pendiente | MVVM, QR/3D, tokens y ADR 0004 |
| Contratos cruzados | Pendiente | API v1, errores, compatibilidad y ownership |
| Revisión de seguridad | Pendiente | Autenticación, autorización, secretos, privacidad y auditoría |
| Diagramas y secuencias | Pendiente | GitHub Mermaid y estados actual/propuesto/futuro |
| ADRs aplicables | Pendiente | Estado y decisión coherentes |

Cuando las cinco arquitecturas por app estén aprobadas, se elimina **únicamente este checklist temporal**. Se conservan esta guía, la línea base, patrones, contratos, diagramas, secuencias, ADRs y plantilla como documentación normativa.

Payments permanece **FUTURO/INACTIVO**: V1 solo efectivo y no hay código, tablas, endpoints, SDK ni feature flag de pagos ahora.
