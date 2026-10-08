# Portal público para visitantes

El portal actual es un sitio estático ubicado en `src/`. No necesita la API ni una base de datos para ejecutarse localmente.

## Requisitos

- PHP CLI para iniciar el servidor local y atender la redirección de `index.php`.
- Node.js solo si se desea ejecutar la prueba estructural.

## Ejecutar en local

Desde la raíz del repositorio, inicia el servidor integrado de PHP:

```bash
php -S 127.0.0.1:8000 -t apps/web/src
```

Abre [http://127.0.0.1:8000](http://127.0.0.1:8000) en el navegador. Para detener el servidor, presiona `Ctrl+C` en la terminal.

El portal todavía no tiene `package.json` ni scripts de Vite; no es necesario ejecutar `npm install` ni `npm run dev`.

## Ejecutar la prueba estructural

Desde la raíz del repositorio:

```bash
node --test apps/web/src/tests/relocation.test.mjs
```
