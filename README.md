# Nombre del equipo
Equipo ZOO

## Objetivo del repositorio
El objetivo es versionamiento del proyecto integrador, el cual va a contener, app móvil, app web, videojuego

## Flujo de trabajo elegido
Github Flow

## Portal web
La página web y sus recursos locales están organizados en `portal-web/`. Las imágenes, el logo, el visor y el modelo 3D están en `portal-web/assets/`.

Para abrirla con el servidor PHP integrado desde la raíz del repositorio:

```sh
php -S 127.0.0.1:8000 -t .
```

Después visita `http://127.0.0.1:8000/`; la página principal redirige a `portal-web/`. También se puede iniciar con `docker compose up --build` y abrir `http://localhost:8080/`.

El formulario de pago es solo una demostración visual. No introduzcas datos de una tarjeta real: el sitio no procesa pagos, ni envía ni almacena esos datos.