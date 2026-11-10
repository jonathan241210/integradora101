# Propuesta Técnica · Herramienta de Mapeo GPS en Campo (PWA Estática)

- **Documento:** Propuesta de herramienta utilitaria para levantamiento geográfico
- **Feature asociada:** `apps/mobile/specs/007-map-location.md` (Frente 1 / DBR-008)
- **Fecha:** 2026-11-09
- **Autor / Responsable:** Víctor Adrián
- **Estado:** Aprobada por Aksel (2026-11-09)

---

## 1. Contexto y Justificación

### 1.1. Antecedentes
El mapa 2D del visitante en `apps/mobile` (especificación `007-map-location.md`) cuenta con soporte para posicionamiento geográfico en tiempo real, trazado de rutas y geocercas de llegada ($\le 10\text{ m}$) mediante la fórmula de Haversine. La base de datos ya cuenta con las columnas necesarias en la tabla `enclosures` aprobadas mediante la solicitud [DBR-008](file:///c:/Users/vic22/OneDrive/Escritorio/ARCA-NB/docs/database/requests/DBR-008-enclosure-gps-coordinates.md):
- `gps_lat DECIMAL(10, 8)`
- `gps_lon DECIMAL(11, 8)`

Actualmente, los recintos utilizan coordenadas sintéticas de prueba definidas en `007-map-v2-coords.md`. Para poner en marcha la navegación real, se requiere realizar un **levantamiento físico en campo** en las instalaciones del Zoológico Municipal Nicolás Bravo (Tulancingo).

### 1.2. El problema del levantamiento manual
Anotar coordenadas a mano abriendo aplicaciones de mapas comerciales es lento, propenso a errores tipográficos al transcribir 8 decimales, y no ofrece una validación inmediata del margen de error del GPS en el momento de la captura.

### 1.3. La solución propuesta
Crear una herramienta utilitaria ligera e independiente tipo **PWA estática (HTML5 + CSS3 + JavaScript vanilla)** diseñada específicamente para ser operada desde un teléfono móvil en campo:
* **Desacoplada:** No requiere PHP, Laravel, Node.js, React Native ni conexión a bases de datos.
* **Cero deuda técnica:** No introduce código de administración temporal en las aplicaciones productivas.
* **Offline-first:** Opera sin conexión a internet y tolera bloqueos de pantalla o recargas accidentales sin pérdida de datos.
* **Exportación directa:** Genera un archivo `.json` listo para ser consumido por un seeder de base de datos o script de carga.

---

## 2. Arquitectura de la Herramienta

### 2.1. Ubicación en el repositorio
Se propone ubicar la herramienta en la raíz del proyecto dentro de una carpeta de utilidades de desarrollo:
```text
ARCA-NB/
└── tools/
    └── zoo-mapper/
        ├── index.html       # Estructura semántica accesible de alto contraste
        ├── styles.css       # Estilos móviles responsivos para uso bajo luz solar
        ├── app.js           # Lógica de geolocalización, semáforo, árbol y exportación
        ├── manifest.json    # Configuración PWA para instalación en pantalla de inicio
        └── sw.js            # Service Worker mínimo para funcionamiento offline
```

### 2.2. Principios de diseño
1. **Sin autenticación ni sesiones:** No hay inicio de sesión, usuarios ni tokens. La herramienta es de acceso directo e inmediato.
2. **Persistencia local inmediata:** Cada cambio o punto confirmado se sincroniza al instante en `localStorage`. Si la batería se agota o el navegador se cierra, los datos permanecen intactos.
3. **Requisito de HTTPS para Geolocation API:** Los navegadores móviles bloquean el acceso al GPS satelital en orígenes no seguros. Para su uso en el teléfono, la herramienta se servirá mediante una URL estática con SSL (ej. GitHub Pages, Vercel o Cloudflare Pages gratuito).

---

## 3. Flujo Operativo en Campo (UX/UI)

La interfaz estará optimizada para ser usada con una sola mano bajo luz solar intensa:

### 3.1. Semáforo GPS en vivo
En lugar de solicitar la posición una sola vez al presionar un botón, la herramienta utilizará `navigator.geolocation.watchPosition()` en segundo plano con `{ enableHighAccuracy: true, maximumAge: 0 }`.

Un indicador visual (semáforo) en la parte superior se actualizará en tiempo real conforme el desarrollador camina por el zoológico:
* 🟢 **Verde ($\le 5\text{ m}$):** Señal satelital óptima. Listo para capturar.
* 🟡 **Amarillo ($5\text{ m} - 15\text{ m}$):** Señal media. Se recomienda esperar unos segundos a que fije más satélites.
* 🔴 **Rojo ($> 15\text{ m}$):** Señal imprecisa (común bajo techumbres densas). Moverse a cielo despejado.

### 3.2. Proceso de captura paso a paso

```text
1. Escribir nombre del recinto
   [ Input: "Hábitat del Tigre" ]
   [ Semáforo en vivo: 🟢 ±2.8 m ]
                 │
                 ▼
2. Presionar botón "Pegar Coordenadas"
   (Captura la latitud y longitud actuales del GPS)
                 │
                 ▼
3. Despliegue en formato árbol (Borrador / Previsualización)
   Hábitat del Tigre
     └── Coordenadas: 20.08381234, -98.72361234
          [ ✔️ Guardar ]        [ ❌ Cancelar ]
                 │                     │
                 ▼                     ▼
   (Si presiona ✔️)              (Si presiona ❌)
   - Guarda en `localStorage`    - Descarta coordenadas
   - Vibración háptica (200ms)   - Mantiene nombre para reintentar
   - Pasa a la lista final
   - Limpia formulario
                 │
                 ▼
4. Caminar al siguiente recinto
   (El semáforo se sigue moviendo en vivo)
```

---

## 4. Contrato de Datos y Exportación

### 4.1. Formato de salida JSON
Al finalizar el recorrido, un botón flotante accesible **`Descargar JSON (N recintos)`** compila los registros locales y dispara la descarga de un archivo `.json` con el siguiente esquema exacto, compatible con `DBR-008`:

```json
[
  {
    "name": "Hábitat del Tigre",
    "gps_lat": 20.08381234,
    "gps_lon": -98.72361234
  },
  {
    "name": "Zona del León",
    "gps_lat": 20.08320000,
    "gps_lon": -98.72310000
  },
  {
    "name": "Entrada Principal",
    "gps_lat": 20.08000000,
    "gps_lon": -98.72200000
  }
]
```

> **Nota:** El dato de `accuracy` (precisión) se utiliza exclusivamente para el semáforo visual de control de calidad en pantalla; no se incluye en el JSON final para mantener el archivo completamente limpio y directo a la base de datos.

### 4.2. Exportación alternativa (CSV / TXT)
Se incluirá un botón secundario para descargar una versión tabular en texto plano o CSV para inspección rápida en bloc de notas u hojas de cálculo.

---

## 5. Integración con el Ecosistema ARCA-NB

Una vez concluido el levantamiento en el zoológico:
1. El archivo JSON exportado se coloca en `apps/api/src/database/data/enclosures_tulancingo.json` (o ruta similar de fixtures).
2. Se ejecuta un Seeder o comando Artisan en `apps/api` que actualiza los campos `gps_lat` y `gps_lon` en la tabla `enclosures` de `arca_pruebas`.
3. El endpoint `GET /api/v1/map/enclosures` comienza a servir las coordenadas reales.
4. La aplicación móvil `apps/mobile` consume los datos actualizados, logrando una navegación guiada y detección de llegada con precisión métrica real.

---

## 6. Próximos Pasos Recomendados

1. **Revisión y Aprobación:** Aksel aprobó esta propuesta el 2026-11-09.
2. **Implementación de la herramienta:** Creación de los archivos en `tools/zoo-mapper/`.
3. **Prueba local preliminar:** Probar la captura en calle/parque cercano para validar la respuesta del semáforo y la vibración en el teléfono.
4. **Levantamiento en Tulancingo:** Jornada de mapeo en el Zoológico Nicolás Bravo.
