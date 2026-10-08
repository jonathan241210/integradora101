# 0004 · Aplicación móvil con React Native

- Estado: Aprobado
- Fecha: 2026-10-07
- Spec relacionada: Por definir al iniciar la implementación

## Contexto
Los visitantes del Parque Ecológico Nicolás Bravo necesitan un mapa interactivo, lector QR para infografías, visores 3D y contenido pedagógico. El cliente consumirá la API central sin manejar lógica de negocio propia. El desarrollo del módulo enciclopédico ("Zoopedia") está sujeto al futuro ADR 0005.

## Decisión
1. **Framework y Flujo:** Usar React Native con **Expo**.
2. **Cámara y QR:** Usar `expo-camera` por su integración nativa y manejo centralizado de permisos, suficiente para lectura de códigos bidimensionales.
3. **Visor 3D:** Usar `@react-three/fiber` junto con `expo-gl` para renderizado utilizando los recursos gráficos del dispositivo (OpenGL ES).
4. **Compilación y Distribución:** Utilizar **Expo EAS** (Build/Submit), garantizando que el desarrollo y las pruebas locales se puedan ejecutar íntegramente de manera local (mediante `npx expo` y `expo-dev-client`) sin depender obligatoriamente de los servicios en la nube de EAS.
5. **Matriz de dispositivos mínima soportada:**
   - **OS:** Android 8.0 Oreo o superior.
   - **Procesador:** Snapdragon 665 / Helio G80 o equivalente.
   - **Memoria RAM:** 6 GB o superior.
   - **Almacenamiento:** 2 GB disponibles.
   - **Conectividad:** Wi-Fi 2.4 GHz o superior.
   - **Hardware:** Cámara trasera funcional.

## Alternativas consideradas
- **Visor 3D en WebView:** Rechazado debido a que consume más memoria y ofrece menor rendimiento de renderizado en comparación con WebGL/OpenGL nativo.
- **react-native-vision-camera:** Rechazado; aunque ofrece control de fotogramas de bajo nivel, `expo-camera` cubre el requerimiento de escaneo QR con menos overhead de mantenimiento y compatibilidad.
- **React Native CLI (Scaffolding puro) / Fastlane:** Rechazado para preservar el estándar de entorno portable (Principio I), sin obligar al equipo backend/web a configurar ecosistemas nativos completos localmente.
- **PWA móvil:** Rechazada como solución principal (se usará en otras apps de ARCA-NB, pero no para visitantes) porque limita drásticamente el rendimiento en renderización 3D y los controles de cámara.

## Consecuencias
### Positivas
- Compartirá lenguaje, componentes base (`@arca/tokens`) y cliente HTTP (`@arca/api-client`) con las SPAs.
- Reducción del trabajo de configuración nativa y manejo estandarizado de permisos a través del manifiesto de Expo (`app.json`).

### Riesgos o costos
- **Rendimiento 3D:** Los modelos deberán tener validaciones estrictas y optimización poligonal para operar fluidamente y no colapsar la memoria dentro de las limitaciones base acordadas (ej. 6 GB de RAM, Snapdragon 665).
- **Dependencia de Infraestructura EAS:** Riesgo moderado por las cuotas gratuitas en EAS; mitigado con la directriz de contar con soporte de compilación local en los equipos del desarrollador.

## Validación y revisión
Decisiones técnicas y matriz de hardware mínimo aprobadas formalmente por el equipo (2026-10-07). Queda pendiente vincular el proyecto a su especificación concreta cuando sea definida en el flujo SDD (`/sdd-spec`).
