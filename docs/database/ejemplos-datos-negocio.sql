-- Datos de ejemplo para tablas sin registros en arca_pruebas (a la fecha del análisis)
-- Destino: arca_pruebas (revisar antes de ejecutar). No usar en arca_zoo.
-- Script manual: NO ejecutar automáticamente. Ajusta IDs/columnas al ambiente real y a las DBRs aplicadas.
-- Usa IDs 9001+ y ON DUPLICATE KEY UPDATE para reducir conflictos en re-ejecuciones.
-- Nota: aunque algunos registros normalmente los generarán los flujos (tickets, notificaciones, actividad de visitantes,
-- recuerdos, solicitudes), este script los incluye como datos de prueba porque las tablas están vacías.

START TRANSACTION;

-- IDs existentes a reutilizar
SET @u1 = (SELECT id FROM users ORDER BY id LIMIT 1 OFFSET 0);
SET @u2 = COALESCE((SELECT id FROM users ORDER BY id LIMIT 1 OFFSET 1), @u1);
SET @u3 = COALESCE((SELECT id FROM users ORDER BY id LIMIT 1 OFFSET 2), @u1);
SET @u4 = COALESCE((SELECT id FROM users ORDER BY id LIMIT 1 OFFSET 3), @u1);
SET @u5 = COALESCE((SELECT id FROM users ORDER BY id LIMIT 1 OFFSET 4), @u1);
SET @u6 = COALESCE((SELECT id FROM users WHERE department_id = 5 ORDER BY id LIMIT 1), COALESCE((SELECT id FROM users ORDER BY id LIMIT 1 OFFSET 5), @u1));

SET @v1 = (SELECT id FROM visitors ORDER BY id LIMIT 1 OFFSET 0);
SET @v2 = COALESCE((SELECT id FROM visitors ORDER BY id LIMIT 1 OFFSET 1), @v1);
SET @v3 = COALESCE((SELECT id FROM visitors ORDER BY id LIMIT 1 OFFSET 2), @v1);

SET @animal1 = COALESCE((SELECT id FROM animals ORDER BY id LIMIT 1 OFFSET 0), NULL);
SET @animal2 = COALESCE((SELECT id FROM animals ORDER BY id LIMIT 1 OFFSET 1), @animal1);
SET @mission1 = COALESCE((SELECT id FROM missions WHERE is_active = 1 ORDER BY id LIMIT 1 OFFSET 0), NULL);
SET @mission2 = COALESCE((SELECT id FROM missions WHERE is_active = 1 ORDER BY id LIMIT 1 OFFSET 1), @mission1);
SET @tp_adult = (SELECT id FROM ticket_prices WHERE ticket_type = 'adult' ORDER BY effective_at DESC, id DESC LIMIT 1);
SET @tp_child = (SELECT id FROM ticket_prices WHERE ticket_type = 'child' ORDER BY effective_at DESC, id DESC LIMIT 1);

-- OMITIDOS (ya tienen registros / seeders / datos previos): departments, users, visitors, roles/permisos, enclosures,
--   enclosure_qr_codes, species, animals, tickets, ticket_prices, news, events, achievements, missions,
--   visitor_collections, visitor_scans, visitor_point_entries, visitor_achievements
-- OMITIDOS (técnicos/infra/runtime o pivote sensible sin datos): cache, cache_locks, jobs, job_batches, failed_jobs,
--   sessions, migrations, tokens/códigos de auth, tablas Spatie, model_has_permissions, activity_log

-- 1) animal_departures (vacía)
INSERT INTO animal_departures (id, animal_id, departure_date, departure_time, departure_status) VALUES
(9001, @animal1, '2026-01-10', '09:00:00', 'transfer'),
(9002, COALESCE(@animal2, @animal1), '2026-02-05', '10:15:00', 'release'),
(9003, @animal1, '2026-03-12', '11:30:00', 'transfer'),
(9004, COALESCE(@animal2, @animal1), '2026-04-01', '08:45:00', 'release'),
(9005, @animal1, '2026-05-20', '13:00:00', 'transfer') AS new
ON DUPLICATE KEY UPDATE animal_id = new.animal_id, departure_date = new.departure_date, departure_status = new.departure_status;

-- 2) clinical_evaluations (vacía)
-- Nota: valores ajustados a constraints reales (evaluation_type, body_condition_score 1-5)
INSERT INTO clinical_evaluations (id, animal_id, veterinarian_id, evaluation_type, evaluation_reason, destination_ruling, assessment_reason, evaluation_date, start_time, end_time, temperature_c, heart_rate, respiratory_rate, capillary_refill_time, weight_kg, attitude, body_condition_score, presumptive_diagnosis, definitive_diagnosis, recommendations, is_fit_for_wild_release) VALUES
(9001, @animal1, @u6, 'Revision_Rapida', 'routine_check', 'stable', 'Revisión general sin hallazgos graves', '2026-10-01', '09:00:00', '09:40:00', 38.50, 80, 20, 2, 180.00, 'alert', '3', 'Ninguno', 'Clínicamente sano', 'Continuar dieta y observación', 0),
(9002, COALESCE(@animal2, @animal1), @u6, 'Revision_Rapida', 'routine_check', 'stable', 'Control general', '2026-10-02', '10:00:00', '10:25:00', 38.80, 90, 22, 2, 70.00, 'alert', '3', 'Ninguno', 'Clínicamente sano', 'Observación', 0),
(9003, @animal1, @u6, 'Historia_Clinica_Completa', 'skin_check', 'observation', 'Seguimiento', '2026-10-03', '11:00:00', '11:30:00', 38.20, 78, 20, 2, 179.00, 'alert', '3', 'Irritación leve', 'Dermatitis leve', 'Revisión en 15 días', 0),
(9004, COALESCE(@animal2, @animal1), @u6, 'Revision_Rapida', 'followup', 'stable', 'Evaluación de control', '2026-10-04', '12:00:00', '12:20:00', 38.60, 85, 21, 2, 71.00, 'alert', '3', 'Estrés leve', 'Sin enfermedad confirmada', 'Mantener manejo', 0),
(9005, @animal1, @u6, 'Historia_Clinica_Completa', 'post_rescue', 'rehabilitation', 'Valoración de ejemplo', '2026-10-05', '13:00:00', '13:50:00', 38.10, 75, 22, 2, 178.00, 'calm', '3', 'Ninguno', 'Bajo observación', 'Plan de seguimiento', 0) AS new
ON DUPLICATE KEY UPDATE animal_id = new.animal_id, evaluation_date = new.evaluation_date, evaluation_type = new.evaluation_type;

-- 3) clinical_evaluation_findings (vacía)
INSERT INTO clinical_evaluation_findings (id, clinical_evaluation_id, organ_system, status, description) VALUES
(9001, 9001, 'musculoskeletal', 'normal', 'Sin hallazgos anormales'),
(9002, 9002, 'integumentary', 'normal', 'Sin hallazgos anormales'),
(9003, 9003, 'integumentary', 'abnormal', 'Irritación leve en región dorsal'),
(9004, 9004, 'respiratory', 'normal', 'Sin hallazgos anormales'),
(9005, 9005, 'digestive', 'normal', 'Sin hallazgos anormales') AS new
ON DUPLICATE KEY UPDATE status = new.status, description = new.description;

-- 4) animal_restraints (vacía)
INSERT INTO animal_restraints (id, clinical_evaluation_id, mobilization_type, physical_method, drug, dose_mg_per_kg, dose_ml, administered_time, notes) VALUES
(9001, 9001, 'physical', 'Jaula de contención', NULL, NULL, NULL, '09:05:00', 'Contención breve sin incidentes'),
(9002, 9002, 'physical', 'Sujeción manual', NULL, NULL, NULL, '10:05:00', 'Manejo tranquilo'),
(9003, 9003, 'physical', 'Guantes y sujeción suave', NULL, NULL, NULL, '11:05:00', 'Sin estrés visible'),
(9004, 9004, 'physical', 'Contención estándar', NULL, NULL, NULL, '12:05:00', 'Manejo rápido'),
(9005, 9005, 'chemical', 'Dardo', 'Ketamina', 5.00, 2.50, '13:10:00', 'Sedación leve para valoración segura') AS new
ON DUPLICATE KEY UPDATE mobilization_type = new.mobilization_type, notes = new.notes;

-- 5) lab_samples (vacía)
INSERT INTO lab_samples (id, clinical_evaluation_id, sample_type, file_path, result_notes) VALUES
(9001, 9001, 'blood', 'labs/sample-9001.pdf', 'Hemograma dentro de parámetros'),
(9002, 9002, 'feces', 'labs/sample-9002.pdf', 'Sin parásitos detectados'),
(9003, 9003, 'skin_scraping', 'labs/sample-9003.pdf', 'Hallazgos compatibles con irritación leve'),
(9004, 9004, 'blood', 'labs/sample-9004.pdf', 'Parámetros aceptables'),
(9005, 9005, 'blood', 'labs/sample-9005.pdf', 'Seguimiento recomendado') AS new
ON DUPLICATE KEY UPDATE sample_type = new.sample_type, file_path = new.file_path, result_notes = new.result_notes;

-- 6) staff_notifications (vacía; referencia ticket_prices existentes)
INSERT INTO staff_notifications (id, user_id, type, payload, ticket_price_id, created_by, read_at, acknowledged_at, created_at, updated_at) VALUES
(9001, @u4, 'price-change', JSON_OBJECT('ticket_type','adult','amount',25.00,'effective_at','2026-11-07 22:35:31'), @tp_adult, @u1, NULL, NULL, '2026-11-07 22:40:00', '2026-11-07 22:40:00'),
(9002, @u5, 'price-change', JSON_OBJECT('ticket_type','child','amount',16.00,'effective_at','2026-11-07 22:35:31'), @tp_child, @u1, NULL, NULL, '2026-11-07 22:40:00', '2026-11-07 22:40:00'),
(9003, @u4, 'price-change', JSON_OBJECT('ticket_type','child','amount',16.00,'effective_at','2026-11-07 22:35:31'), @tp_child, @u1, '2026-11-08 08:00:00', NULL, '2026-11-07 22:40:00', '2026-11-08 08:00:00'),
(9004, @u1, 'price-change', JSON_OBJECT('ticket_type','adult','amount',25.00,'effective_at','2026-11-07 22:35:31'), @tp_adult, @u1, '2026-11-08 08:00:00', NULL, '2026-11-07 22:40:00', '2026-11-08 08:00:00'),
(9005, @u3, 'price-change', JSON_OBJECT('ticket_type','adult','amount',25.00,'effective_at','2026-11-07 22:35:31'), @tp_adult, @u1, NULL, NULL, '2026-11-07 22:40:00', '2026-11-07 22:40:00') AS new
ON DUPLICATE KEY UPDATE payload = new.payload, read_at = new.read_at, updated_at = new.updated_at;

-- 7) visitor_mission_completions (vacía; usa misiones/visitantes existentes)
INSERT INTO visitor_mission_completions (visitor_id, mission_id, completed_at) VALUES
(@v1, @mission1, '2026-11-10 10:05:01'),
(@v2, COALESCE(@mission2, @mission1), '2026-11-10 11:00:02'),
(@v3, @mission1, '2026-11-10 11:30:01') AS new
ON DUPLICATE KEY UPDATE completed_at = new.completed_at;

-- 8) visitor_memories (vacía; DBR-012)
INSERT INTO visitor_memories (id, visitor_id, status, opinion, image_path, image_sha256, published_image_path, consent_at, terms_version, rejection_reason, rejected_image, rejected_content, resubmitted_count, reviewed_by, reviewed_at, published_at, published_until, deleted_at, created_at, updated_at) VALUES
(9001, @v1, 'accepted', 'Me encantó ver al león.', 'memories/memory-9001.jpg', 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa', 'memories/memory-9001.jpg', '2026-11-08 10:00:00', 'v1', NULL, 0, 0, 0, @u1, '2026-11-08 12:00:00', '2026-11-08 12:00:00', '2026-12-08 12:00:00', NULL, '2026-11-08 10:00:00', '2026-11-08 12:00:00'),
(9002, @v2, 'submitted', NULL, 'memories/memory-9002.jpg', 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb', NULL, '2026-11-09 09:00:00', 'v1', NULL, 0, 0, 0, NULL, NULL, NULL, NULL, NULL, '2026-11-09 09:00:00', '2026-11-09 09:00:00'),
(9003, @v3, 'in_review', 'Una visita increíble.', 'memories/memory-9003.jpg', 'cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc', NULL, '2026-11-09 09:30:00', 'v1', NULL, 0, 0, 0, @u1, '2026-11-09 10:00:00', NULL, NULL, NULL, '2026-11-09 09:30:00', '2026-11-09 10:00:00'),
(9004, @v1, 'rejected', 'Foto borrosa', 'memories/memory-9004.jpg', 'dddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd', NULL, '2026-11-09 10:00:00', 'v1', 'La imagen no es clara.', 1, 0, 0, @u1, '2026-11-09 11:00:00', NULL, NULL, NULL, '2026-11-09 10:00:00', '2026-11-09 11:00:00'),
(9005, @v2, 'accepted', 'Una visita inolvidable.', 'memories/memory-9005.jpg', 'eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee', 'memories/memory-9005.jpg', '2026-11-09 11:30:00', 'v1', NULL, 0, 0, 0, @u1, '2026-11-09 13:00:00', '2026-11-09 13:00:00', '2026-12-09 13:00:00', NULL, '2026-11-09 11:30:00', '2026-11-09 13:00:00') AS new
ON DUPLICATE KEY UPDATE status = new.status, opinion = new.opinion, updated_at = new.updated_at;

-- 9) visitor_memory_reviews (vacía; DBR-012)
INSERT INTO visitor_memory_reviews (id, visitor_memory_id, decision, rejection_reason, rejected_image, rejected_content, reviewed_by, reviewed_at, deleted_at, created_at, updated_at) VALUES
(9001, 9001, 'accepted', NULL, 0, 0, @u1, '2026-11-08 12:00:00', NULL, '2026-11-08 12:00:00', '2026-11-08 12:00:00'),
(9002, 9003, 'accepted', NULL, 0, 0, @u1, '2026-11-09 10:00:00', NULL, '2026-11-09 10:00:00', '2026-11-09 10:00:00'),
(9003, 9004, 'rejected', 'La imagen no es clara.', 1, 0, @u1, '2026-11-09 11:00:00', NULL, '2026-11-09 11:00:00', '2026-11-09 11:00:00'),
(9004, 9005, 'accepted', NULL, 0, 0, @u1, '2026-11-09 13:00:00', NULL, '2026-11-09 13:00:00', '2026-11-09 13:00:00'),
(9005, 9002, 'rejected', 'Pendiente de corrección de ejemplo.', 0, 1, @u1, '2026-11-09 14:00:00', NULL, '2026-11-09 14:00:00', '2026-11-09 14:00:00') AS new
ON DUPLICATE KEY UPDATE decision = new.decision, rejection_reason = new.rejection_reason, updated_at = new.updated_at;

-- 10) species_publication_requests (vacía; DBR-013)
-- Nota: submitted_species_id es generado y único para status='submitted' (máx. 1 submitted por especie).
INSERT INTO species_publication_requests (id, species_id, request_type, scientific_name, habitat, origin, category, image_path, published_fields, status, rejection_reason, created_by, updated_by, reviewed_by, reviewed_at, deleted_at, created_at, updated_at) VALUES
(9001, 1, 'publish', 'Panthera onca', 'Selva tropical y bosques húmedos', 'Sureste de México y Centroamérica', 'mammal', 'species/jaguar.jpg', JSON_ARRAY('common_name','scientific_name','habitat','origin','category','image_path'), 'submitted', NULL, @u3, NULL, NULL, NULL, NULL, '2026-11-12 10:00:00', '2026-11-12 10:00:00'),
(9002, 2, 'update', 'Panthera leo', 'Sabana y pastizales abiertos', 'África subsahariana', 'mammal', 'species/lion.jpg', JSON_ARRAY('scientific_name','habitat','origin'), 'approved', NULL, @u3, @u1, @u1, '2026-11-12 11:00:00', NULL, '2026-11-11 09:00:00', '2026-11-12 11:00:00'),
(9003, 3, 'publish', 'Ara militaris', 'Cañones de selva seca y templada', 'Sierras y selvas de México', 'bird', 'species/macaw.jpg', JSON_ARRAY('common_name','scientific_name','habitat','origin','category','image_path'), 'rejected', 'Falta validar imagen de referencia.', @u3, @u3, @u1, '2026-11-12 12:00:00', NULL, '2026-11-10 09:00:00', '2026-11-12 12:00:00'),
(9004, 4, 'unpublish', NULL, NULL, NULL, NULL, NULL, JSON_ARRAY(), 'approved', NULL, @u3, @u1, @u1, '2026-11-12 13:00:00', NULL, '2026-11-12 08:00:00', '2026-11-12 13:00:00'),
(9005, 84, 'publish', 'tigre', NULL, NULL, NULL, NULL, JSON_ARRAY('common_name','scientific_name'), 'draft', NULL, @u3, @u3, NULL, NULL, NULL, '2026-11-12 14:00:00', '2026-11-12 14:00:00') AS new
ON DUPLICATE KEY UPDATE status = new.status, rejection_reason = new.rejection_reason, reviewed_by = new.reviewed_by, reviewed_at = new.reviewed_at, updated_at = new.updated_at;

COMMIT;

-- Fin. Verifica restricciones/FKs y datos existentes antes de ejecutar en arca_pruebas.
-- Tablas vacías omitidas por ser técnicas/runtime o pivote sensible: cache_locks, failed_jobs, job_batches, jobs, model_has_permissions.
-- Si alguna tabla/columna no existe en tu ambiente, comenta o ajusta el bloque correspondiente.
