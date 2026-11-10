# ARCA-NB · Zoo Mapper (PWA)

Herramienta ligera y desacoplada para el levantamiento de coordenadas GPS en campo en el **Zoológico Municipal Nicolás Bravo (Tulancingo)**.

Diseñada para generar el archivo de coordenadas requerido por **`DBR-008`** y el mapa con navegación de `apps/mobile`.

---

## Características

* **100% Desacoplada:** HTML5, CSS3 y JavaScript vanilla. Sin Node.js, sin PHP, sin React Native.
* **Offline-First:** Funciona sin internet ni datos móviles en medio del zoológico; persiste todo en `localStorage`.
* **Semáforo GPS en vivo:** Monitorea la precisión satelital continuamente (`navigator.geolocation.watchPosition`).
* **Flujo en 2 pasos:** Pegar coordenadas actuales $\rightarrow$ Previsualización tipo árbol $\rightarrow$ Confirmar (✔️) o Cancelar (❌).
* **Exportación Directa:** Descarga con 1 clic un archivo `.json` formateado exactamente como lo espera la base de datos de ARCA-NB (`name`, `gps_lat`, `gps_lon`).

---

## Cómo Probar en la Computadora

Simplemente abre el archivo `tools/zoo-mapper/index.html` con doble clic en tu navegador favorito, o ejecuta un servidor estático local si lo prefieres:

```bash
# Desde la carpeta tools/zoo-mapper:
npx serve .
# o con python:
python -m http.server 8080
```

---

## Cómo Abrirlo en el Teléfono Celular (HTTPS Requerido)

Los navegadores móviles requieren **HTTPS** para habilitar el chip GPS satelital.

### Opción A (La más rápida — 1 minuto):
1. Sube la carpeta a un repositorio o rama de GitHub y activa **GitHub Pages**.
2. Te dará una URL con candado verde `https://tu-usuario.github.io/zoo-mapper/`.
3. Ábrela en Safari (iOS) o Chrome (Android) y pulsa **"Agregar a pantalla de inicio"** para usarla como app nativa.

### Opción B (Red Local con túnel):
1. Corre un servidor local y abre un túnel HTTPS temporal con `ngrok` o `cloudflared`:
   ```bash
   npx serve tools/zoo-mapper
   # En otra terminal:
   ngrok http 3000
   ```
2. Abre la URL `https://...ngrok-free.app` en tu celular.

---

## Integración con ARCA-NB

Una vez terminado el recorrido en el zoológico:
1. Pulsa **"📥 Descargar JSON"** en la herramienta.
2. Copia el archivo descargado a `apps/api/src/database/data/` en este repositorio.
3. Se ejecuta el seeder de base de datos para poblar `enclosures.gps_lat` y `enclosures.gps_lon`.
