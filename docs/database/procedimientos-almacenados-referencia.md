# Catálogo de Procedimientos Almacenados de Referencia · ARCA-NB

- **Responsable de base de datos:** Victor Adrian
- **Fecha de registro:** 2026-10-14
- **Estado:** Referencia documental (Pendiente de solicitud formal vía DBR)
- **Ubicación:** `docs/database/procedimientos-almacenados-referencia.md`

---

## 1. Propósito y gobernanza

Este documento almacena las propuestas de **6 Stored Procedures** diseñados para encapsular reglas de negocio de fauna, clínica veterinaria, taquilla y colección digital.

### Reglas para su adopción futura:
1. **No ejecutados directamente:** Ningún procedimiento se ejecuta manualmente en MySQL (`CREATE PROCEDURE` directo está prohibido por la Constitución).
2. **Activación vía DBR:** Cuando el equipo de backend o la app respectiva (Dashboard de taquilla, PWA veterinaria o App móvil) desarrolle su feature, evaluará si necesita el procedimiento almacenado o si la lógica se maneja en Actions de Laravel. De requerirse, se solicitará mediante una **DBR formal** en `docs/database/requests/`.
3. **Adaptación a inglés:** Al implementarse mediante una DBR aprobada, el responsable de BD (Victor Adrian) adaptará los identificadores y tablas al esquema normalizado en inglés (ej. `animals`, `tickets`, `clinical_evaluations`) y los empaquetará en una **Migración Laravel**.

---

## 2. Resumen de procedimientos registrados

| # | Procedimiento propuesto | Módulo | Objetivo principal |
|---|---|---|---|
| 1 | `sp_registrar_ingreso_animal` | Fauna y Colección | Alta de ejemplares, validación de especie y cuarentena inicial. |
| 2 | `sp_registrar_evaluacion_clinica` | Salud y Veterinaria | Registro médico, validación de tipo de examen y condición corporal (1-5). |
| 3 | `sp_registrar_salida_animal` | Movimientos de Fauna | Transacción atómica: registro de baja y actualización de estatus del ejemplar. |
| 4 | `sp_registrar_venta_boleto` | Taquilla y Boletaje | Venta de boletos adulto/niño, cálculo de importe y registro de QR y cajero. |
| 5 | `sp_desbloquear_recinto_coleccion` | Móvil / Visitantes | Registro de QR escaneado con prevención de duplicados (`UNIQUE`). |
| 6 | `sp_obtener_expediente_completo_animal` | Consultas / Reportes | Consulta combinada (JOIN) de ficha biológica e historial de evaluaciones. |

---

## 3. Definición y código SQL de referencia (Esquema base)

> **Nota:** El siguiente código es el diseño original de referencia con nombres legados. Al ser adoptado en una DBR, se traducirá al esquema normalizado en inglés.

```sql
-- =============================================================================
-- PROCEDIMIENTOS ALMACENADOS DE REFERENCIA (MYSQL 8.0 / 8.4)
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. MÓDULO VETERINARIO Y FAUNA
-- -----------------------------------------------------------------------------

-- Procedimiento 1: Registrar el ingreso de un nuevo animal
DROP PROCEDURE IF EXISTS sp_registrar_ingreso_animal;
DELIMITER //
CREATE PROCEDURE sp_registrar_ingreso_animal(
    IN p_no_marcaje VARCHAR(50),
    IN p_id_empleado INT,
    IN p_nombre_animal VARCHAR(50),
    IN p_sexo VARCHAR(50),
    IN p_edad VARCHAR(50),
    IN p_origen VARCHAR(50),
    IN p_longevidad VARCHAR(50),
    IN p_reproduccion TEXT,
    IN p_dieta TEXT,
    IN p_caracteristicas TEXT,
    IN p_ruta_fotografia VARCHAR(255),
    IN p_fecha_entrada DATE,
    IN p_hora_entrada TIME,
    IN p_id_recinto INT,
    IN p_id_especie INT,
    IN p_puede_recibir_visitas TINYINT(1),
    IN p_estatus_estancia VARCHAR(50),
    OUT p_id_animal_generado INT
)
BEGIN
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        RESIGNAL;
    END;

    START TRANSACTION;

    IF p_estatus_estancia IS NULL OR p_estatus_estancia = '' THEN
        SET p_estatus_estancia = 'Cuarentena_Ingreso';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM especies WHERE id_especie = p_id_especie) THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Error: La especie especificada no existe en el catálogo.';
    END IF;

    INSERT INTO animales (
        no_marcaje, id_empleado, nombre_animal, sexo, edad, origen,
        longevidad, reproduccion, dieta, caracteristicas, ruta_fotografia,
        fecha_entrada, hora_entrada, id_recinto, id_especie,
        puede_recibir_visitas, estatus_estancia
    ) VALUES (
        p_no_marcaje, p_id_empleado, p_nombre_animal, p_sexo, p_edad, p_origen,
        p_longevidad, p_reproduccion, p_dieta, p_caracteristicas, p_ruta_fotografia,
        p_fecha_entrada, p_hora_entrada, p_id_recinto, p_id_especie,
        IFNULL(p_puede_recibir_visitas, 0), p_estatus_estancia
    );

    SET p_id_animal_generado = LAST_INSERT_ID();

    COMMIT;
END //
DELIMITER ;


-- Procedimiento 2: Registrar una evaluación clínica (expediente médico unificado)
DROP PROCEDURE IF EXISTS sp_registrar_evaluacion_clinica;
DELIMITER //
CREATE PROCEDURE sp_registrar_evaluacion_clinica(
    IN p_id_animal INT,
    IN p_id_empleado_mvz INT,
    IN p_tipo_evaluacion VARCHAR(50),
    IN p_motivo_evaluacion VARCHAR(50),
    IN p_dictamen_destino VARCHAR(50),
    IN p_motivo_valoracion TEXT,
    IN p_fecha DATE,
    IN p_hora_entrada TIME,
    IN p_hora_salida TIME,
    IN p_temperatura_c DOUBLE,
    IN p_frecuencia_cardiaca INT,
    IN p_frecuencia_respiratoria INT,
    IN p_tiempo_llenado_capilar DOUBLE,
    IN p_peso_kg DOUBLE,
    IN p_actitud VARCHAR(30),
    IN p_condicion_corporal_puntaje INT,
    IN p_diagnostico_presuntivo TEXT,
    IN p_diagnostico_definitivo TEXT,
    IN p_recomendaciones TEXT,
    IN p_optimo_liberacion_silvestre BOOLEAN,
    OUT p_id_evaluacion_generado INT
)
BEGIN
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        RESIGNAL;
    END;

    IF p_tipo_evaluacion NOT IN ('Revision_Rapida', 'Historia_Clinica_Completa') THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Error: tipo_evaluacion debe ser Revision_Rapida o Historia_Clinica_Completa.';
    END IF;

    IF p_condicion_corporal_puntaje IS NOT NULL AND (p_condicion_corporal_puntaje < 1 OR p_condicion_corporal_puntaje > 5) THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Error: condicion_corporal_puntaje debe estar entre 1 y 5.';
    END IF;

    START TRANSACTION;

    INSERT INTO evaluaciones_clinicas (
        id_animal, id_empleado_mvz, tipo_evaluacion, motivo_evaluacion, dictamen_destino,
        motivo_valoracion, fecha, hora_entrada, hora_salida, temperatura_c,
        frecuencia_cardiaca, frecuencia_respiratoria, tiempo_llenado_capilar, peso_kg,
        actitud, condicion_corporal_puntaje, diagnostico_presuntivo, diagnostico_definitivo,
        recomendaciones, optimo_liberacion_silvestre
    ) VALUES (
        p_id_animal, p_id_empleado_mvz, p_tipo_evaluacion, IFNULL(p_motivo_evaluacion, 'Revision_Rutinaria'), p_dictamen_destino,
        p_motivo_valoracion, p_fecha, p_hora_entrada, p_hora_salida, p_temperatura_c,
        p_frecuencia_cardiaca, p_frecuencia_respiratoria, p_tiempo_llenado_capilar, p_peso_kg,
        p_actitud, p_condicion_corporal_puntaje, p_diagnostico_presuntivo, p_diagnostico_definitivo,
        p_recomendaciones, p_optimo_liberacion_silvestre
    );

    SET p_id_evaluacion_generado = LAST_INSERT_ID();

    COMMIT;
END //
DELIMITER ;


-- Procedimiento 3: Registrar la salida de un animal y actualizar su estatus de estancia
DROP PROCEDURE IF EXISTS sp_registrar_salida_animal;
DELIMITER //
CREATE PROCEDURE sp_registrar_salida_animal(
    IN p_id_animal INT,
    IN p_fecha_salida DATE,
    IN p_hora_salida TIME,
    IN p_estado_salida VARCHAR(50)
)
BEGIN
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        RESIGNAL;
    END;

    START TRANSACTION;

    IF NOT EXISTS (SELECT 1 FROM animales WHERE id_animal = p_id_animal) THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Error: El animal especificado no existe.';
    END IF;

    INSERT INTO salida_animales (id_animal, fecha_salida, hora_salida, estado_salida)
    VALUES (p_id_animal, p_fecha_salida, p_hora_salida, p_estado_salida);

    UPDATE animales
    SET estatus_estancia = IFNULL(p_estado_salida, 'Trasladado')
    WHERE id_animal = p_id_animal;

    COMMIT;
END //
DELIMITER ;


-- -----------------------------------------------------------------------------
-- 2. MÓDULO ADMINISTRATIVO Y BOLETAJE
-- -----------------------------------------------------------------------------

-- Procedimiento 4: Registrar la venta de boletos de entrada
DROP PROCEDURE IF EXISTS sp_registrar_venta_boleto;
DELIMITER //
CREATE PROCEDURE sp_registrar_venta_boleto(
    IN p_boleto_adulto INT,
    IN p_boleto_nino INT,
    IN p_costo_total DECIMAL(8,2),
    IN p_codigo_qr VARCHAR(255),
    IN p_id_empleado INT,
    OUT p_no_folio_generado INT
)
BEGIN
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        RESIGNAL;
    END;

    START TRANSACTION;

    INSERT INTO boleto (
        boleto_adulto, boleto_nino, costo_total, fecha_compra, codigo_qr, id_empleado
    ) VALUES (
        IFNULL(p_boleto_adulto, 0), IFNULL(p_boleto_nino, 0), p_costo_total, CURRENT_TIMESTAMP, p_codigo_qr, p_id_empleado
    );

    SET p_no_folio_generado = LAST_INSERT_ID();

    COMMIT;
END //
DELIMITER ;


-- -----------------------------------------------------------------------------
-- 3. MÓDULO VISITANTES, APP MÓVIL Y VIDEOJUEGO
-- -----------------------------------------------------------------------------

-- Procedimiento 5: Desbloquear recinto en la colección digital del usuario
DROP PROCEDURE IF EXISTS sp_desbloquear_recinto_coleccion;
DELIMITER //
CREATE PROCEDURE sp_desbloquear_recinto_coleccion(
    IN p_id_usuario INT,
    IN p_id_recinto_qr INT,
    OUT p_resultado VARCHAR(100)
)
BEGIN
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        RESIGNAL;
    END;

    START TRANSACTION;

    IF NOT EXISTS (SELECT 1 FROM recintos_qr WHERE id_recinto_qr = p_id_recinto_qr AND activo = 1) THEN
        SET p_resultado = 'ERROR: El código QR no existe o no está activo.';
        ROLLBACK;
    ELSEIF EXISTS (SELECT 1 FROM usuarios_coleccion WHERE id_usuario = p_id_usuario AND id_recinto_qr = p_id_recinto_qr) THEN
        SET p_resultado = 'INFO: El recinto ya había sido desbloqueado por este usuario.';
        COMMIT;
    ELSE
        INSERT INTO usuarios_coleccion (fecha_desbloqueo, id_recinto_qr, id_usuario)
        VALUES (CURDATE(), p_id_recinto_qr, p_id_usuario);
        
        SET p_resultado = 'EXITO: Recinto desbloqueado correctamente en la colección.';
        COMMIT;
    END IF;
END //
DELIMITER ;


-- -----------------------------------------------------------------------------
-- 4. CONSULTAS Y REPORTES CONSOLIDADOS (READ)
-- -----------------------------------------------------------------------------

-- Procedimiento 6: Obtener expediente clínico completo e información general de un ejemplar
DROP PROCEDURE IF EXISTS sp_obtener_expediente_completo_animal;
DELIMITER //
CREATE PROCEDURE sp_obtener_expediente_completo_animal(
    IN p_id_animal INT
)
BEGIN
    SELECT 
        a.id_animal,
        a.no_marcaje,
        a.nombre_animal,
        a.sexo,
        a.edad,
        a.estatus_estancia,
        a.puede_recibir_visitas,
        e.nombre_especie,
        e.nombre_cientifico,
        r.nombre_recinto
    FROM animales a
    INNER JOIN especies e ON a.id_especie = e.id_especie
    LEFT JOIN recintos r ON a.id_recinto = r.id_recinto
    WHERE a.id_animal = p_id_animal;

    SELECT 
        ec.id_evaluacion,
        ec.fecha,
        ec.tipo_evaluacion,
        ec.motivo_evaluacion,
        ec.dictamen_destino,
        ec.peso_kg,
        ec.temperatura_c,
        ec.condicion_corporal_puntaje,
        ec.diagnostico_presuntivo,
        ec.diagnostico_definitivo,
        ec.recomendaciones,
        CONCAT(u.nombre, ' ', u.primer_apellido) AS mvz_responsable
    FROM evaluaciones_clinicas ec
    LEFT JOIN usuarios_admins u ON ec.id_empleado_mvz = u.id_empleado
    WHERE ec.id_animal = p_id_animal
    ORDER BY ec.fecha DESC, ec.hora_entrada DESC;
END //
DELIMITER ;
```
