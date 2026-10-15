# Esquema de Base de Datos · Legado (Español)

> **Ubicación:** `docs/database/esquema-espanol.md`  
> **Propósito:** Documento de referencia del esquema original antes de la normalización.  
> **Modo de revisión:** Abrir este archivo en el panel izquierdo del IDE y comparar contra `esquema-ingles.md` en el panel derecho.

---

## 1. Tabla: `usuarios_admins` (Personal del zoológico)
Representa al personal institucional: directores, administradores de TI, taquilleros y veterinarios.

| Columna | Tipo | Descripción | Clave / Restricción |
|---|---|---|---|
| `id_empleado` | INT AUTO_INCREMENT | Identificador único del empleado | PRIMARY KEY |
| `nombre` | VARCHAR(100) | Nombre de pila | NOT NULL |
| `primer_apellido` | VARCHAR(100) | Primer apellido | NOT NULL |
| `segundo_apellido` | VARCHAR(100) | Segundo apellido | NULL |
| `id_area` | INT | Departamento / área del zoológico | FOREIGN KEY → `areas(id_area)` |
| `ultimo_acceso` | DATETIME | Fecha y hora del último login | NULL |
| `contrasena_hash` | VARCHAR(255) | Hash de la contraseña | NOT NULL |

---

## 2. Tabla: `areas` (Departamentos organizativos)
Áreas de trabajo del personal del zoológico.

| Columna | Tipo | Descripción | Clave / Restricción |
|---|---|---|---|
| `id_area` | INT AUTO_INCREMENT | Identificador del departamento | PRIMARY KEY |
| `nombre_area` | VARCHAR(100) | Nombre del departamento | NOT NULL |
| `descripcion` | TEXT | Descripción de funciones del área | NULL |

---

## 3. Tabla: `usuarios` (Cuentas de visitantes de la App Móvil)
Visitantes públicos registrados mediante la app móvil.

| Columna | Tipo | Descripción | Clave / Restricción |
|---|---|---|---|
| `id_usuario` | INT AUTO_INCREMENT | Identificador único del visitante | PRIMARY KEY |
| `nickname` | VARCHAR(50) | Apodo público en la app | NOT NULL |
| `correo_electronico` | VARCHAR(150) | Correo electrónico de acceso | UNIQUE, NOT NULL |
| `nombre` | VARCHAR(100) | Nombre del visitante | NOT NULL |
| `primer_apellido` | VARCHAR(100) | Primer apellido | NOT NULL |
| `segundo_apellido` | VARCHAR(100) | Segundo apellido | NULL |
| `contrasena_hash` | VARCHAR(255) | Hash de la contraseña | NOT NULL |
| `estado_actividad` | TINYINT(1) | Estado de la cuenta (activo/inactivo) | NOT NULL, DEFAULT 1 |

---

## 4. Tabla: `usuarios_coleccion` (Colección de descubrimientos de visitantes)
Registro de elementos descubiertos por los visitantes.

| Columna | Tipo | Descripción | Clave / Restricción |
|---|---|---|---|
| `id_coleccion` | INT AUTO_INCREMENT | Identificador del registro | PRIMARY KEY |
| `fecha_desbloqueo` | DATETIME | Fecha y hora de desbloqueo | NOT NULL |
| `id_recinto_qr` | INT | Código QR escaneado | FOREIGN KEY → `recintos_qr(id_recinto_qr)` |
| `id_usuario` | INT | Visitante que desbloqueó | FOREIGN KEY → `usuarios(id_usuario)` |

---

## 5. Tabla: `recintos` (Hábitats e instalaciones)
Instalaciones físicas donde habitan los animales.

| Columna | Tipo | Descripción | Clave / Restricción |
|---|---|---|---|
| `id_recinto` | INT AUTO_INCREMENT | Identificador del recinto | PRIMARY KEY |
| `nombre_recinto` | VARCHAR(100) | Nombre del recinto | NOT NULL |

---

## 6. Tabla: `recintos_qr` (Puntos de escaneo QR de recintos)
Códigos QR físicos colocados en los recintos.

| Columna | Tipo | Descripción | Clave / Restricción |
|---|---|---|---|
| `id_recinto_qr` | INT AUTO_INCREMENT | Identificador del QR | PRIMARY KEY |
| `codigo` | VARCHAR(100) | Cadena o payload del código QR | UNIQUE, NOT NULL |
| `activo` | TINYINT(1) | Estado del QR (activo/inactivo) | NOT NULL, DEFAULT 1 |
| `id_recinto` | INT | Recinto asociado | FOREIGN KEY → `recintos(id_recinto)` |

---

## 7. Tabla: `especies` (Catálogo biológico de especies)
Catálogo taxonómico y biológico de especies del zoológico.

| Columna | Tipo | Descripción | Clave / Restricción |
|---|---|---|---|
| `id_especie` | INT AUTO_INCREMENT | Identificador de la especie | PRIMARY KEY |
| `nombre_especie` | VARCHAR(100) | Nombre común | NOT NULL |
| `nombre_cientifico` | VARCHAR(150) | Nombre científico en latín | NOT NULL |
| `distribucion` | VARCHAR(255) | Distribución geográfica natural | NULL |
| `estatus_conservacion` | VARCHAR(100) | Estado de conservación (UICN) | NULL |
| `habitat` | VARCHAR(255) | Tipo de hábitat natural | NULL |
| `gestacion_periodo` | VARCHAR(100) | Periodo de gestación o incubación | NULL |
| `talla_cm` | DECIMAL(8,2) | Talla promedio en centímetros | NULL |
| `modelo_3d_ruta` | VARCHAR(255) | Ruta al modelo 3D para la app móvil | NULL |

---

## 8. Tabla: `animales` (Ejemplares bajo cuidado)
Individuos bajo resguardo del zoológico.

| Columna | Tipo | Descripción | Clave / Restricción |
|---|---|---|---|
| `id_animal` | INT AUTO_INCREMENT | Identificador del ejemplar | PRIMARY KEY |
| `no_marcaje` | VARCHAR(50) | Número de marcaje / microchip / anillo | UNIQUE, NOT NULL |
| `id_empleado` | INT | Empleado responsable del ejemplar | FOREIGN KEY → `usuarios_admins(id_empleado)` |
| `nombre_animal` | VARCHAR(100) | Nombre del ejemplar | NOT NULL |
| `sexo` | VARCHAR(20) | Sexo (Macho / Hembra / Indeterminado) | NOT NULL |
| `edad` | VARCHAR(50) | Edad estimada o exacta | NULL |
| `origen` | VARCHAR(100) | Procedencia (donación, decomiso, rescate) | NULL |
| `longevidad` | VARCHAR(50) | Esperanza de vida estimada | NULL |
| `reproduccion` | VARCHAR(100) | Datos reproductivos | NULL |
| `dieta` | TEXT | Régimen alimenticio | NULL |
| `caracteristicas` | TEXT | Rasgos físicos y señas particulares | NULL |
| `ruta_fotografia` | VARCHAR(255) | Fotografía del ejemplar | NULL |
| `fecha_entrada` | DATE | Fecha de ingreso al zoológico | NOT NULL |
| `hora_entrada` | TIME | Hora de ingreso | NULL |
| `id_recinto` | INT | Recinto donde habita | FOREIGN KEY → `recintos(id_recinto)` |
| `id_especie` | INT | Especie biológica | FOREIGN KEY → `especies(id_especie)` |
| `puede_recibir_visitas` | TINYINT(1) | En exhibición para el público | NOT NULL, DEFAULT 1 |
| `estatus_estancia` | VARCHAR(50) | Estado de estancia (ej. Cuarentena_Ingreso) | NOT NULL |

---

## 9. Tabla: `salida_animales` (Bajas y traslados de ejemplares)
Registro de salidas, bajas o transferencias de animales.

| Columna | Tipo | Descripción | Clave / Restricción |
|---|---|---|---|
| `id_salida` | INT AUTO_INCREMENT | Identificador de la salida | PRIMARY KEY |
| `id_animal` | INT | Ejemplar que causa baja | FOREIGN KEY → `animales(id_animal)` |
| `fecha_salida` | DATE | Fecha de salida | NOT NULL |
| `hora_salida` | TIME | Hora de salida | NULL |
| `estado_salida` | VARCHAR(100) | Motivo o estatus (traslado, deceso) | NOT NULL |

---

## 10. Tabla: `evaluaciones_clinicas` (Historial médico veterinario)
Expedientes y revisiones veterinarias realizadas a los animales.

| Columna | Tipo | Descripción | Clave / Restricción |
|---|---|---|---|
| `id_evaluacion` | INT AUTO_INCREMENT | Identificador de la evaluación | PRIMARY KEY |
| `id_animal` | INT | Ejemplar evaluado | FOREIGN KEY → `animales(id_animal)` |
| `id_empleado_mvz` | INT | Médico Veterinario responsable | FOREIGN KEY → `usuarios_admins(id_empleado)` |
| `tipo_evaluacion` | VARCHAR(100) | Tipo de revisión médica | NOT NULL |
| `motivo_evaluacion` | VARCHAR(100) | Motivo de la valoración | NOT NULL |
| `dictamen_destino` | VARCHAR(100) | Dictamen veterinario final | NULL |
| `motivo_valoracion` | TEXT | Justificación clínica detallada | NULL |
| `fecha` | DATE | Fecha de la valoración | NOT NULL |
| `hora_entrada` | TIME | Hora de inicio | NULL |
| `hora_salida` | TIME | Hora de conclusión | NULL |
| `temperatura_c` | DECIMAL(4,2) | Temperatura corporal en °C | NULL |
| `frecuencia_cardiaca` | INT | Latidos por minuto (LPM) | NULL |
| `frecuencia_respiratoria`| INT | Respiraciones por minuto (RPM) | NULL |
| `tiempo_llenado_capilar` | INT | Tiempo de llenado capilar en segundos | NULL |
| `peso_kg` | DECIMAL(8,2) | Peso corporal en kilogramos | NULL |
| `actitud` | VARCHAR(100) | Actitud clínica (alerta, deprimido) | NULL |
| `condicion_corporal_puntaje` | VARCHAR(50) | Condición corporal (ej. 3/5) | NULL |
| `diagnostico_presuntivo` | TEXT | Diagnóstico presuntivo inicial | NULL |
| `diagnostico_definitivo` | TEXT | Diagnóstico confirmado | NULL |
| `recomendaciones` | TEXT | Tratamiento y recomendaciones | NULL |
| `optimo_liberacion_silvestre` | TINYINT(1) | Apto para reintroducción silvestre | NOT NULL, DEFAULT 0 |

---

## 11. Tabla: `evaluacion_sistemas_hallazgos` (Hallazgos por sistema orgánico)
Detalle médico por órganos o aparatos anatómicos.

| Columna | Tipo | Descripción | Clave / Restricción |
|---|---|---|---|
| `id_hallazgo` | INT AUTO_INCREMENT | Identificador del hallazgo | PRIMARY KEY |
| `id_evaluacion` | INT | Evaluación médica asociada | FOREIGN KEY → `evaluaciones_clinicas(id_evaluacion)` |
| `sistema_organico` | VARCHAR(100) | Sistema evaluado (óseo, digestivo, etc.) | NOT NULL |
| `estado` | VARCHAR(50) | Estado (normal, anormal) | NOT NULL |
| `descripcion_hallazgo` | TEXT | Descripción médica de la anomalía | NULL |

---

## 12. Tabla: `contencion_animal` (Contención química o física)
Procedimientos de contención durante tratamientos médicos.

| Columna | Tipo | Descripción | Clave / Restricción |
|---|---|---|---|
| `id_contencion` | INT AUTO_INCREMENT | Identificador de la contención | PRIMARY KEY |
| `id_evaluacion` | INT | Evaluación clínica ligada | FOREIGN KEY → `evaluaciones_clinicas(id_evaluacion)` |
| `tipo_movilizacion` | VARCHAR(100) | Tipo de movilización | NOT NULL |
| `metodo_fisico` | VARCHAR(100) | Herramienta o método físico empleado | NULL |
| `medicamento` | VARCHAR(100) | Fármaco administrado | NULL |
| `dosis_mg_kg` | DECIMAL(8,2) | Dosis calculada en mg/kg | NULL |
| `dosis_ml` | DECIMAL(8,2) | Volumen administrado en ml | NULL |
| `hora_aplicacion` | TIME | Hora exacta de aplicación | NULL |
| `observaciones` | TEXT | Notas del procedimiento | NULL |

---

## 13. Tabla: `muestras_laboratorio` (Estudios clínicos de laboratorio)
Muestras biológicas analizadas.

| Columna | Tipo | Descripción | Clave / Restricción |
|---|---|---|---|
| `id_muestra` | INT AUTO_INCREMENT | Identificador de la muestra | PRIMARY KEY |
| `id_evaluacion` | INT | Evaluación clínica asociada | FOREIGN KEY → `evaluaciones_clinicas(id_evaluacion)` |
| `tipo_muestra` | VARCHAR(100) | Tipo de muestra (sangre, heces, orina) | NOT NULL |
| `ruta_archivo` | VARCHAR(255) | Archivo digital de resultados | NULL |
| `resultado_observaciones` | TEXT | Diagnóstico del laboratorio | NULL |

---

## 14. Tabla: `noticias` (Publicaciones y comunicados institucionales)
Noticias publicadas en el portal web institucional.

| Columna | Tipo | Descripción | Clave / Restricción |
|---|---|---|---|
| `id_noticia` | INT AUTO_INCREMENT | Identificador de la noticia | PRIMARY KEY |
| `titulo` | VARCHAR(200) | Título de la noticia | NOT NULL |
| `descripcion` | TEXT | Resumen o bajada editorial | NULL |
| `contenido` | LONGTEXT | Cuerpo de la noticia | NOT NULL |
| `ruta_imagen` | VARCHAR(255) | Imagen destacada | NULL |
| `fecha_publicacion` | DATE | Fecha formal de publicación | NOT NULL |
| `fecha_inicio` | DATE | Fecha de vigencia inicial | NULL |
| `fecha_fin` | DATE | Fecha de vigencia final | NULL |
| `categoria` | VARCHAR(100) | Categoría editorial | NOT NULL |
| `estado` | TINYINT(1) | Estado de publicación (1=activo, 0=inactivo)| NOT NULL, DEFAULT 1 |
| `id_empleado` | INT | Empleado autor de la nota | FOREIGN KEY → `usuarios_admins(id_empleado)` |

---

## 15. Tabla: `eventos` (Agenda y actividades del zoológico)
Eventos y talleres públicos del parque.

| Columna | Tipo | Descripción | Clave / Restricción |
|---|---|---|---|
| `id_evento` | INT AUTO_INCREMENT | Identificador del evento | PRIMARY KEY |
| `nombre_evento` | VARCHAR(200) | Título o nombre del evento | NOT NULL |
| `descripcion` | TEXT | Descripción de actividades | NULL |
| `imagen_evento` | VARCHAR(255) | Cartel o foto del evento | NULL |
| `fecha_inicio` | DATE | Fecha de inicio | NOT NULL |
| `fecha_fin` | DATE | Fecha de finalización | NULL |
| `hora_inicio` | TIME | Hora de apertura del evento | NULL |
| `hora_fin` | TIME | Hora de cierre del evento | NULL |
| `ubicacion` | VARCHAR(255) | Lugar específico dentro del parque | NULL |
| `estado` | TINYINT(1) | Estado (1=activo, 0=cancelado/inactivo) | NOT NULL, DEFAULT 1 |
| `id_empleado` | INT | Empleado coordinador | FOREIGN KEY → `usuarios_admins(id_empleado)` |

---

## 16. Tabla: `boleto` (Taquilla y boletos de entrada)
Venta física de boletos de acceso en taquilla.

| Columna | Tipo | Descripción | Clave / Restricción |
|---|---|---|---|
| `no_folio` | INT AUTO_INCREMENT | Número de folio impreso | PRIMARY KEY |
| `boleto_adulto` | INT | Cantidad de boletos de adulto | NOT NULL, DEFAULT 0 |
| `boleto_nino` | INT | Cantidad de boletos de niño | NOT NULL, DEFAULT 0 |
| `costo_total` | DECIMAL(10,2) | Importe total cobrado en MXN | NOT NULL |
| `fecha_compra` | DATETIME | Fecha y hora exacta de la compra | NOT NULL |
| `codigo_qr` | VARCHAR(255) | Código de validación para torniquete | NOT NULL |
| `id_empleado` | INT | Taquillero que realizó la venta | FOREIGN KEY → `usuarios_admins(id_empleado)` |
