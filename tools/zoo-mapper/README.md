# ARCA-NB · Zoo Mapper (PWA)

Herramienta ligera y desacoplada para el levantamiento de coordenadas GPS en campo en el **Zoológico Municipal Nicolás Bravo (Tulancingo)**.

Diseñada para generar el archivo de coordenadas requerido por **`DBR-008`** y el mapa con navegación de `apps/mobile`.

---

## Características

* **100% Desacoplada:** HTML5, CSS3 y JavaScript vanilla. Sin Node.js, sin PHP, sin React Native.
* **Offline-First:** Después de la primera carga funciona sin internet ni datos móviles en medio del zoológico; persiste todo en `localStorage`.
* **Semáforo GPS en vivo:** Monitorea la precisión satelital continuamente (`navigator.geolocation.watchPosition`).
* **Flujo en 2 pasos:** Pegar coordenadas actuales $\rightarrow$ Previsualización tipo árbol $\rightarrow$ Confirmar (✔️) o Cancelar (❌).
* **Exportación Directa:** Descarga con 1 clic un archivo `.json` formateado exactamente como lo espera la base de datos de ARCA-NB (`name`, `gps_lat`, `gps_lon`).

---

## Cómo Probarla en la Computadora

```bash
# Desde tools/zoo-mapper:
npx serve . -l 3000
# o con python:
python -m http.server 3000
```

Abre `http://localhost:3000`. En `localhost` el Service Worker y el GPS sí funcionan; con doble clic (`file://`) **no**.

---

## Cómo Instalarla en el Teléfono (camino recomendado: GitHub Pages)

La app se publica automáticamente con `.github/workflows/deploy-zoo-mapper.yml` en cada push a `main` o `victor` que toque `tools/zoo-mapper/**`.

**URL estable:** `https://jonathan241210.github.io/integradora101/`

1. En GitHub: **Settings → Pages → Source: GitHub Actions** (una sola vez).
2. Pestaña **Actions → "Desplegar Zoo Mapper (PWA) a GitHub Pages" → Run workflow**.
3. Abre la URL en Chrome (Android) y espera a que cargue **una vez** con internet (un par de segundos).
4. Menú de Chrome → **"Instalar aplicación"** (no "Agregar a pantalla de inicio": si aparece solo esa opción, el manifest o los iconos no se cargaron bien).
5. Listo: ya aparece como app con su propio icono y abre a pantalla completa.

### Verificar que el modo offline quedó activo

1. Con la app abierta y con red, espera 5 segundos.
2. Activa **modo avión**.
3. Cierra la app y vuelve a abrirla. Debe cargar completa y seguir leyendo el GPS (el GPS no necesita internet, solo cielo despejado).

Si en modo avión ves una pantalla en blanco o un error, el Service Worker no se activó: vuelve a abrir la URL con red y revisa la consola (`chrome://inspect` desde la computadora).

---

## Por qué NO usar `cloudflared` / `ngrok`

Un túnel (`npx cloudflared tunnel --url http://localhost:3000`) **no es un hosting**: es un puente hacia la computadora. Consecuencias reales:

* Al apagar `serve` o `cloudflared`, la URL muere y el icono instalado deja de abrir (error 1033 de Cloudflare).
* El subdominio cambia en cada arranque, así que el icono viejo apunta a una URL muerta.
* Cada URL nueva **es un origen nuevo** para el navegador: el `localStorage` anterior queda invisible y parece que se perdieron los recintos.

Un túnel sirve para probar 5 minutos, nunca para el levantamiento real.

---

## Dónde viven los datos (importante)

* Las coordenadas se guardan en `localStorage`, dentro del origen publicado.
* **No se sincronizan con ningún servidor.** Son de ese teléfono y de ese navegador.
* Desinstalar la app, "borrar datos del sitio" o usar modo incógnito borra los recintos.
* Por eso la app muestra un aviso y hay que pulsar **"📥 Descargar JSON"** al terminar el recorrido.

La `app` usa la URL estable de Pages justamente para que ese almacenamiento no cambie de origen entre sesiones.

---

## Integración con ARCA-NB

Una vez terminado el recorrido en el zoológico:
1. Pulsa **"📥 Descargar JSON"** en la herramienta.
2. Copia el archivo descargado a `apps/api/src/database/data/` en este repositorio.
3. Se ejecuta el seeder de base de datos para poblar `enclosures.gps_lat` y `enclosures.gps_lon`.

---

## Estructura

| Archivo | Rol |
|---|---|
| `index.html` | UI: semáforo GPS, formulario, lista y exportación |
| `app.js` | Geolocalización, borradores, `localStorage` y descargas |
| `sw.js` | Service Worker: precarga del app shell y cache-first |
| `manifest.json` | Metadatos de instalación (iconos, `start_url`, `scope`) |
| `icons/` | Iconos PNG 192/512, variante *maskable* y SVG |
| `styles.css` | Estilos |
