# 🚀 Referencia Rápida - Ejecución PWA ZooHealth

## Instalación (primera vez)

```bash
cd apps/pwa
npm install
```

---

## Modos de ejecución

### 💻 Desarrollo (Con recarga en vivo)
```bash
npm run dev
```
**URL:** http://localhost:5173/

### 🔗 Desarrollo (Acceso desde otros dispositivos)
```bash
npm run dev -- --host 0.0.0.0
```
**URL:** http://[tu-ip]:5173/

### 🏗️ Compilar para producción
```bash
npm run build
```
**Salida:** Archivos en `dist/`

### 👁️ Previsualizar producción
```bash
npm run preview
```
**URL:** http://localhost:4173/

---

## Con API Local (Recomendado para desarrollo)

### Terminal 1: Inicia la API
```bash
cd apps/api
php artisan serve --host=127.0.0.1 --port=8000
```

### Terminal 2: Inicia la PWA
```bash
cd apps/pwa
npm run dev -- --host 0.0.0.0
```

### Accede a:
```
http://127.0.0.1:5173/
```

### Credenciales de prueba:
- Email: `veterinario@arca.local`
- Contraseña: (según tu configuración)

---

## Configuración avanzada

### Cambiar puerto de la API
```bash
ARCA_API_PROXY_TARGET=http://127.0.0.1:9000 npm run dev
```

### Cambiar puerto local
```bash
npm run dev -- --port 3000
```

---

## Otros comandos

### Ejecutar pruebas
```bash
npm test
```

### Pruebas con watch
```bash
npm test -- --watch
```

---

## 📖 Documentación completa

Para una guía paso a paso detallada, consulta:
→ [GUIA_EJECUCION.md](./docs/GUIA_EJECUCION.md)

---

## Puertos por defecto

| Modo | Puerto | Descripción |
|------|--------|-------------|
| `dev` | 5173 | Desarrollo con HMR |
| `preview` | 4173 | Previsualización de producción |
| API | 8000 | Laravel (desarrollo) |

---

## Troubleshooting rápido

| Problema | Solución |
|----------|----------|
| Puerto ocupado | `npm run dev -- --port 3000` |
| Módulos faltantes | `npm install` |
| API no responde | Verifica que corra `php artisan serve` |
| CORS error | Revisa `SANCTUM_STATEFUL_DOMAINS` en `.env` |
| Cambios no se ven | Presiona F5 para recargar |

---

**Última actualización:** Noviembre 2026
