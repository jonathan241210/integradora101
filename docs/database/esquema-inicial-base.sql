-- ==============================================================================
-- ARCA-NB · Esquema Legado Inicial (Baseline de 16 tablas en español)
-- Propósito: Inicializar las 16 tablas preexistentes del zoológico Nicolás Bravo
-- en una instancia limpia de MySQL 8.0.x / 8.4.x para permitir la ejecución
-- secuencial de las migraciones Laravel (DBR-001 a DBR-008).
-- ==============================================================================

SET NAMES utf8mb4;
SET @OLD_FOREIGN_KEY_CHECKS = @@FOREIGN_KEY_CHECKS;
SET FOREIGN_KEY_CHECKS = 0;

-- 1. Áreas / Departamentos
CREATE TABLE IF NOT EXISTS `areas` (
  `id_area` INT NOT NULL AUTO_INCREMENT,
  `nombre_area` VARCHAR(100) NOT NULL,
  `descripcion` TEXT NULL,
  PRIMARY KEY (`id_area`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- 2. Personal Administrativo y Operativo
CREATE TABLE IF NOT EXISTS `usuarios_admins` (
  `id_empleado` INT NOT NULL AUTO_INCREMENT,
  `nombre` VARCHAR(100) NOT NULL,
  `primer_apellido` VARCHAR(100) NOT NULL,
  `segundo_apellido` VARCHAR(100) NULL,
  `id_area` INT NULL,
  `ultimo_acceso` DATETIME NULL,
  `contrasena_hash` VARCHAR(255) NOT NULL,
  PRIMARY KEY (`id_empleado`),
  CONSTRAINT `fk_usuarios_admins_area` FOREIGN KEY (`id_area`) REFERENCES `areas` (`id_area`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- 3. Cuentas de Visitantes (App Móvil)
CREATE TABLE IF NOT EXISTS `usuarios` (
  `id_usuario` INT NOT NULL AUTO_INCREMENT,
  `nickname` VARCHAR(50) NOT NULL,
  `correo_electronico` VARCHAR(150) NOT NULL,
  `nombre` VARCHAR(100) NOT NULL,
  `primer_apellido` VARCHAR(100) NULL,
  `segundo_apellido` VARCHAR(100) NULL,
  `contrasena_hash` VARCHAR(255) NOT NULL,
  `estado_actividad` TINYINT(1) NOT NULL DEFAULT 1,
  PRIMARY KEY (`id_usuario`),
  UNIQUE KEY `uk_usuarios_correo` (`correo_electronico`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- 4. Recintos
CREATE TABLE IF NOT EXISTS `recintos` (
  `id_recinto` INT NOT NULL AUTO_INCREMENT,
  `nombre_recinto` VARCHAR(100) NOT NULL,
  PRIMARY KEY (`id_recinto`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- 5. Códigos QR en Recintos
CREATE TABLE IF NOT EXISTS `recintos_qr` (
  `id_recinto_qr` INT NOT NULL AUTO_INCREMENT,
  `codigo` VARCHAR(100) NOT NULL,
  `activo` TINYINT(1) NOT NULL DEFAULT 1,
  `id_recinto` INT NOT NULL,
  PRIMARY KEY (`id_recinto_qr`),
  UNIQUE KEY `uk_recintos_qr_codigo` (`codigo`),
  CONSTRAINT `fk_rqr_recinto` FOREIGN KEY (`id_recinto`) REFERENCES `recintos` (`id_recinto`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- 6. Colección de Descubrimientos de Visitantes
CREATE TABLE IF NOT EXISTS `usuarios_coleccion` (
  `id_coleccion` INT NOT NULL AUTO_INCREMENT,
  `fecha_desbloqueo` DATETIME NOT NULL,
  `id_recinto_qr` INT NOT NULL,
  `id_usuario` INT NOT NULL,
  PRIMARY KEY (`id_coleccion`),
  CONSTRAINT `fk_uc_recinto_qr` FOREIGN KEY (`id_recinto_qr`) REFERENCES `recintos_qr` (`id_recinto_qr`) ON DELETE CASCADE,
  CONSTRAINT `fk_uc_usuario` FOREIGN KEY (`id_usuario`) REFERENCES `usuarios` (`id_usuario`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- 7. Catálogo de Especies
CREATE TABLE IF NOT EXISTS `especies` (
  `id_especie` INT NOT NULL AUTO_INCREMENT,
  `nombre_especie` VARCHAR(100) NOT NULL,
  `nombre_cientifico` VARCHAR(150) NOT NULL,
  `distribucion` VARCHAR(255) NULL,
  `estatus_conservacion` VARCHAR(100) NULL,
  `habitat` VARCHAR(255) NULL,
  `gestacion_periodo` VARCHAR(100) NULL,
  `talla_cm` DECIMAL(8,2) NULL,
  `modelo_3d_ruta` VARCHAR(255) NULL,
  PRIMARY KEY (`id_especie`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- 8. Animales en Exhibición / Albergue
CREATE TABLE IF NOT EXISTS `animales` (
  `id_animal` INT NOT NULL AUTO_INCREMENT,
  `no_marcaje` VARCHAR(50) NOT NULL,
  `id_empleado` INT NOT NULL,
  `nombre_animal` VARCHAR(100) NOT NULL,
  `sexo` VARCHAR(20) NOT NULL,
  `edad` VARCHAR(50) NULL,
  `origen` VARCHAR(100) NULL,
  `longevidad` VARCHAR(50) NULL,
  `reproduccion` VARCHAR(100) NULL,
  `dieta` TEXT NULL,
  `caracteristicas` TEXT NULL,
  `ruta_fotografia` VARCHAR(255) NULL,
  `fecha_entrada` DATE NOT NULL,
  `hora_entrada` TIME NULL,
  `id_recinto` INT NOT NULL,
  `id_especie` INT NOT NULL,
  `puede_recibir_visitas` TINYINT(1) NOT NULL DEFAULT 1,
  `estatus_estancia` VARCHAR(50) NOT NULL,
  PRIMARY KEY (`id_animal`),
  UNIQUE KEY `uk_animales_marcaje` (`no_marcaje`),
  CONSTRAINT `fk_animales_empleado` FOREIGN KEY (`id_empleado`) REFERENCES `usuarios_admins` (`id_empleado`) ON DELETE RESTRICT,
  CONSTRAINT `fk_animales_recinto` FOREIGN KEY (`id_recinto`) REFERENCES `recintos` (`id_recinto`) ON DELETE RESTRICT,
  CONSTRAINT `fk_animales_especie` FOREIGN KEY (`id_especie`) REFERENCES `especies` (`id_especie`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- 9. Bajas y Salidas de Animales
CREATE TABLE IF NOT EXISTS `salida_animales` (
  `id_salida` INT NOT NULL AUTO_INCREMENT,
  `id_animal` INT NOT NULL,
  `fecha_salida` DATE NOT NULL,
  `hora_salida` TIME NULL,
  `estado_salida` VARCHAR(100) NOT NULL,
  PRIMARY KEY (`id_salida`),
  CONSTRAINT `fk_salida_animal` FOREIGN KEY (`id_animal`) REFERENCES `animales` (`id_animal`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- 10. Evaluaciones Clínicas Veterinarias
CREATE TABLE IF NOT EXISTS `evaluaciones_clinicas` (
  `id_evaluacion` INT NOT NULL AUTO_INCREMENT,
  `id_animal` INT NOT NULL,
  `id_empleado_mvz` INT NOT NULL,
  `tipo_evaluacion` VARCHAR(100) NOT NULL,
  `motivo_evaluacion` VARCHAR(100) NOT NULL,
  `dictamen_destino` VARCHAR(100) NULL,
  `motivo_valoracion` TEXT NULL,
  `fecha` DATE NOT NULL,
  `hora_entrada` TIME NULL,
  `hora_salida` TIME NULL,
  `temperatura_c` DECIMAL(4,2) NULL,
  `frecuencia_cardiaca` INT NULL,
  `frecuencia_respiratoria` INT NULL,
  `tiempo_llenado_capilar` INT NULL,
  `peso_kg` DECIMAL(8,2) NULL,
  `actitud` VARCHAR(100) NULL,
  `condicion_corporal_puntaje` VARCHAR(50) NULL,
  `diagnostico_presuntivo` TEXT NULL,
  `diagnostico_definitivo` TEXT NULL,
  `recomendaciones` TEXT NULL,
  `optimo_liberacion_silvestre` TINYINT(1) NOT NULL DEFAULT 0,
  PRIMARY KEY (`id_evaluacion`),
  CONSTRAINT `fk_ec_animal` FOREIGN KEY (`id_animal`) REFERENCES `animales` (`id_animal`) ON DELETE RESTRICT,
  CONSTRAINT `fk_ec_veterinario` FOREIGN KEY (`id_empleado_mvz`) REFERENCES `usuarios_admins` (`id_empleado`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- 11. Hallazgos Clínicos por Sistema
CREATE TABLE IF NOT EXISTS `evaluacion_sistemas_hallazgos` (
  `id_hallazgo` INT NOT NULL AUTO_INCREMENT,
  `id_evaluacion` INT NOT NULL,
  `sistema_organico` VARCHAR(100) NOT NULL,
  `estado` VARCHAR(50) NOT NULL,
  `descripcion_hallazgo` TEXT NULL,
  PRIMARY KEY (`id_hallazgo`),
  CONSTRAINT `fk_esh_evaluacion` FOREIGN KEY (`id_evaluacion`) REFERENCES `evaluaciones_clinicas` (`id_evaluacion`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- 12. Contención y Manejo de Animales
CREATE TABLE IF NOT EXISTS `contencion_animal` (
  `id_contencion` INT NOT NULL AUTO_INCREMENT,
  `id_evaluacion` INT NOT NULL,
  `tipo_movilizacion` VARCHAR(100) NOT NULL,
  `metodo_fisico` VARCHAR(100) NULL,
  `medicamento` VARCHAR(100) NULL,
  `dosis_mg_kg` DECIMAL(8,2) NULL,
  `dosis_ml` DECIMAL(8,2) NULL,
  `hora_aplicacion` TIME NULL,
  `observaciones` TEXT NULL,
  PRIMARY KEY (`id_contencion`),
  CONSTRAINT `fk_ca_evaluacion` FOREIGN KEY (`id_evaluacion`) REFERENCES `evaluaciones_clinicas` (`id_evaluacion`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- 13. Muestras de Laboratorio
CREATE TABLE IF NOT EXISTS `muestras_laboratorio` (
  `id_muestra` INT NOT NULL AUTO_INCREMENT,
  `id_evaluacion` INT NOT NULL,
  `tipo_muestra` VARCHAR(100) NOT NULL,
  `ruta_archivo` VARCHAR(255) NULL,
  `resultado_observaciones` TEXT NULL,
  PRIMARY KEY (`id_muestra`),
  CONSTRAINT `fk_ml_evaluacion` FOREIGN KEY (`id_evaluacion`) REFERENCES `evaluaciones_clinicas` (`id_evaluacion`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- 14. Noticias Institucionales
CREATE TABLE IF NOT EXISTS `noticias` (
  `id_noticia` INT NOT NULL AUTO_INCREMENT,
  `titulo` VARCHAR(200) NOT NULL,
  `descripcion` TEXT NULL,
  `contenido` LONGTEXT NOT NULL,
  `imagen_noticia` VARCHAR(255) NULL,
  `fecha_publicacion` DATE NOT NULL,
  `fecha_inicio` DATE NULL,
  `fecha_fin` DATE NULL,
  `categoria` VARCHAR(100) NOT NULL,
  `estado` TINYINT(1) NOT NULL DEFAULT 1,
  `id_empleado` INT NOT NULL,
  PRIMARY KEY (`id_noticia`),
  CONSTRAINT `fk_noticias_empleado` FOREIGN KEY (`id_empleado`) REFERENCES `usuarios_admins` (`id_empleado`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- 15. Eventos Institucionales
CREATE TABLE IF NOT EXISTS `eventos` (
  `id_evento` INT NOT NULL AUTO_INCREMENT,
  `nombre_evento` VARCHAR(200) NOT NULL,
  `descripcion` TEXT NULL,
  `imagen_evento` VARCHAR(255) NULL,
  `fecha_inicio` DATE NOT NULL,
  `fecha_fin` DATE NULL,
  `hora_inicio` TIME NULL,
  `hora_fin` TIME NULL,
  `ubicacion` VARCHAR(255) NULL,
  `estado` TINYINT(1) NOT NULL DEFAULT 1,
  `id_empleado` INT NOT NULL,
  PRIMARY KEY (`id_evento`),
  CONSTRAINT `fk_eventos_empleado` FOREIGN KEY (`id_empleado`) REFERENCES `usuarios_admins` (`id_empleado`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- 16. Boletos de Taquilla
CREATE TABLE IF NOT EXISTS `boleto` (
  `no_folio` INT NOT NULL AUTO_INCREMENT,
  `boleto_adulto` INT NULL,
  `boleto_nino` INT NULL,
  `costo_total` DECIMAL(8,2) NULL,
  `fecha_compra` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  `codigo_qr` VARCHAR(255) NULL,
  `id_empleado` INT NULL,
  PRIMARY KEY (`no_folio`),
  CONSTRAINT `fk_boleto_empleado` FOREIGN KEY (`id_empleado`) REFERENCES `usuarios_admins` (`id_empleado`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

SET FOREIGN_KEY_CHECKS = @OLD_FOREIGN_KEY_CHECKS;
