<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations (DBR-001: english-schema-normalization).
     */
    public function up(): void
    {
        $dropCheckIfExists = function (string $table, string $constraint) {
            $exists = DB::selectOne("
                SELECT 1 
                FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS 
                WHERE TABLE_SCHEMA = DATABASE() 
                  AND TABLE_NAME = ? 
                  AND CONSTRAINT_NAME = ? 
                  AND CONSTRAINT_TYPE = 'CHECK'
            ", [$table, $constraint]);

            if ($exists) {
                DB::statement("ALTER TABLE `{$table}` DROP CHECK `{$constraint}`");
            }
        };

        $addCheckIfNotExists = function (string $table, string $constraint, string $clause) {
            $exists = DB::selectOne("
                SELECT 1 
                FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS 
                WHERE TABLE_SCHEMA = DATABASE() 
                  AND TABLE_NAME = ? 
                  AND CONSTRAINT_NAME = ? 
                  AND CONSTRAINT_TYPE = 'CHECK'
            ", [$table, $constraint]);

            if (!$exists) {
                DB::statement("ALTER TABLE `{$table}` ADD CONSTRAINT `{$constraint}` CHECK ({$clause})");
            }
        };

        // 1. Rename tables (legacy Spanish -> normalized English)
        $tables = [
            'usuarios_admins' => 'users',
            'areas' => 'departments',
            'usuarios' => 'visitors',
            'usuarios_coleccion' => 'visitor_collections',
            'recintos' => 'enclosures',
            'recintos_qr' => 'enclosure_qr_codes',
            'especies' => 'species',
            'animales' => 'animals',
            'salida_animales' => 'animal_departures',
            'evaluaciones_clinicas' => 'clinical_evaluations',
            'evaluacion_sistemas_hallazgos' => 'clinical_evaluation_findings',
            'contencion_animal' => 'animal_restraints',
            'muestras_laboratorio' => 'lab_samples',
            'noticias' => 'news',
            'eventos' => 'events',
            'boleto' => 'tickets',
        ];

        foreach ($tables as $old => $new) {
            if (Schema::hasTable($old) && !Schema::hasTable($new)) {
                Schema::rename($old, $new);
            }
        }

        // 2. Rename columns in users
        if (Schema::hasTable('users')) {
            Schema::table('users', function (Blueprint $table) {
                if (Schema::hasColumn('users', 'id_empleado')) $table->renameColumn('id_empleado', 'id');
                if (Schema::hasColumn('users', 'nombre')) $table->renameColumn('nombre', 'first_name');
                if (Schema::hasColumn('users', 'primer_apellido')) $table->renameColumn('primer_apellido', 'last_name');
                if (Schema::hasColumn('users', 'segundo_apellido')) $table->renameColumn('segundo_apellido', 'second_last_name');
                if (Schema::hasColumn('users', 'id_area')) $table->renameColumn('id_area', 'department_id');
                if (Schema::hasColumn('users', 'ultimo_acceso')) $table->renameColumn('ultimo_acceso', 'last_login_at');
                if (Schema::hasColumn('users', 'contrasena_hash')) $table->renameColumn('contrasena_hash', 'password');
            });
        }

        // 3. Rename columns in departments
        if (Schema::hasTable('departments')) {
            Schema::table('departments', function (Blueprint $table) {
                if (Schema::hasColumn('departments', 'id_area')) $table->renameColumn('id_area', 'id');
                if (Schema::hasColumn('departments', 'nombre_area')) $table->renameColumn('nombre_area', 'name');
                if (Schema::hasColumn('departments', 'descripcion')) $table->renameColumn('descripcion', 'description');
            });
        }

        // 4. Rename columns in visitors
        if (Schema::hasTable('visitors')) {
            Schema::table('visitors', function (Blueprint $table) {
                if (Schema::hasColumn('visitors', 'id_usuario')) $table->renameColumn('id_usuario', 'id');
                if (Schema::hasColumn('visitors', 'correo_electronico')) $table->renameColumn('correo_electronico', 'email');
                if (Schema::hasColumn('visitors', 'nombre')) $table->renameColumn('nombre', 'first_name');
                if (Schema::hasColumn('visitors', 'primer_apellido')) $table->renameColumn('primer_apellido', 'last_name');
                if (Schema::hasColumn('visitors', 'segundo_apellido')) $table->renameColumn('segundo_apellido', 'second_last_name');
                if (Schema::hasColumn('visitors', 'contrasena_hash')) $table->renameColumn('contrasena_hash', 'password');
                if (Schema::hasColumn('visitors', 'estado_actividad')) $table->renameColumn('estado_actividad', 'is_active');
            });
        }

        // 5. Rename columns in visitor_collections
        if (Schema::hasTable('visitor_collections')) {
            Schema::table('visitor_collections', function (Blueprint $table) {
                if (Schema::hasColumn('visitor_collections', 'id_coleccion')) $table->renameColumn('id_coleccion', 'id');
                if (Schema::hasColumn('visitor_collections', 'fecha_desbloqueo')) $table->renameColumn('fecha_desbloqueo', 'unlocked_date');
                if (Schema::hasColumn('visitor_collections', 'id_recinto_qr')) $table->renameColumn('id_recinto_qr', 'enclosure_qr_code_id');
                if (Schema::hasColumn('visitor_collections', 'id_usuario')) $table->renameColumn('id_usuario', 'visitor_id');
            });
        }

        // 6. Rename columns in enclosures
        if (Schema::hasTable('enclosures')) {
            Schema::table('enclosures', function (Blueprint $table) {
                if (Schema::hasColumn('enclosures', 'id_recinto')) $table->renameColumn('id_recinto', 'id');
                if (Schema::hasColumn('enclosures', 'nombre_recinto')) $table->renameColumn('nombre_recinto', 'name');
            });
        }

        // 7. Rename columns in enclosure_qr_codes
        if (Schema::hasTable('enclosure_qr_codes')) {
            Schema::table('enclosure_qr_codes', function (Blueprint $table) {
                if (Schema::hasColumn('enclosure_qr_codes', 'id_recinto_qr')) $table->renameColumn('id_recinto_qr', 'id');
                if (Schema::hasColumn('enclosure_qr_codes', 'codigo')) $table->renameColumn('codigo', 'code');
                if (Schema::hasColumn('enclosure_qr_codes', 'activo')) $table->renameColumn('activo', 'is_active');
                if (Schema::hasColumn('enclosure_qr_codes', 'id_recinto')) $table->renameColumn('id_recinto', 'enclosure_id');
            });
        }

        // 8. Rename columns in species
        if (Schema::hasTable('species')) {
            Schema::table('species', function (Blueprint $table) {
                if (Schema::hasColumn('species', 'id_especie')) $table->renameColumn('id_especie', 'id');
                if (Schema::hasColumn('species', 'nombre_especie')) $table->renameColumn('nombre_especie', 'common_name');
                if (Schema::hasColumn('species', 'nombre_cientifico')) $table->renameColumn('nombre_cientifico', 'scientific_name');
                if (Schema::hasColumn('species', 'distribucion')) $table->renameColumn('distribucion', 'distribution');
                if (Schema::hasColumn('species', 'estatus_conservacion')) $table->renameColumn('estatus_conservacion', 'conservation_status');
                if (Schema::hasColumn('species', 'gestacion_periodo')) $table->renameColumn('gestacion_periodo', 'gestation_period');
                if (Schema::hasColumn('species', 'talla_cm')) $table->renameColumn('talla_cm', 'size_cm');
                if (Schema::hasColumn('species', 'modelo_3d_ruta')) $table->renameColumn('modelo_3d_ruta', 'model_3d_path');
            });
        }

        // 9. Rename columns in animals
        if (Schema::hasTable('animals')) {
            // Drop check constraints blocking column renaming
            $dropCheckIfExists('animals', 'chk_visitas');
            $dropCheckIfExists('animals', 'chk_estancia');

            Schema::table('animals', function (Blueprint $table) {
                if (Schema::hasColumn('animals', 'id_animal')) $table->renameColumn('id_animal', 'id');
                if (Schema::hasColumn('animals', 'no_marcaje')) $table->renameColumn('no_marcaje', 'tag_number');
                if (Schema::hasColumn('animals', 'id_empleado')) $table->renameColumn('id_empleado', 'responsible_id');
                if (Schema::hasColumn('animals', 'nombre_animal')) $table->renameColumn('nombre_animal', 'name');
                if (Schema::hasColumn('animals', 'sexo')) $table->renameColumn('sexo', 'sex');
                if (Schema::hasColumn('animals', 'edad')) $table->renameColumn('edad', 'age');
                if (Schema::hasColumn('animals', 'origen')) $table->renameColumn('origen', 'origin');
                if (Schema::hasColumn('animals', 'longevidad')) $table->renameColumn('longevidad', 'longevity');
                if (Schema::hasColumn('animals', 'reproduccion')) $table->renameColumn('reproduccion', 'reproduction');
                if (Schema::hasColumn('animals', 'dieta')) $table->renameColumn('dieta', 'diet');
                if (Schema::hasColumn('animals', 'caracteristicas')) $table->renameColumn('caracteristicas', 'characteristics');
                if (Schema::hasColumn('animals', 'ruta_fotografia')) $table->renameColumn('ruta_fotografia', 'photo_path');
                if (Schema::hasColumn('animals', 'fecha_entrada')) $table->renameColumn('fecha_entrada', 'entry_date');
                if (Schema::hasColumn('animals', 'hora_entrada')) $table->renameColumn('hora_entrada', 'entry_time');
                if (Schema::hasColumn('animals', 'id_recinto')) $table->renameColumn('id_recinto', 'enclosure_id');
                if (Schema::hasColumn('animals', 'id_especie')) $table->renameColumn('id_especie', 'species_id');
                if (Schema::hasColumn('animals', 'puede_recibir_visitas')) $table->renameColumn('puede_recibir_visitas', 'can_receive_visits');
                if (Schema::hasColumn('animals', 'estatus_estancia')) $table->renameColumn('estatus_estancia', 'stay_status');
            });

            // Re-add check constraints in English
            $addCheckIfNotExists('animals', 'chk_animals_can_receive_visits', '`can_receive_visits` in (0, 1)');
            $addCheckIfNotExists('animals', 'chk_animals_stay_status', "`stay_status` in ('Permanente', 'Cuarentena_Ingreso', 'Resguardo_Profepa', 'Liberado', 'Trasladado')");
        }

        // 10. Rename columns in animal_departures
        if (Schema::hasTable('animal_departures')) {
            Schema::table('animal_departures', function (Blueprint $table) {
                if (Schema::hasColumn('animal_departures', 'id_salida')) $table->renameColumn('id_salida', 'id');
                if (Schema::hasColumn('animal_departures', 'id_animal')) $table->renameColumn('id_animal', 'animal_id');
                if (Schema::hasColumn('animal_departures', 'fecha_salida')) $table->renameColumn('fecha_salida', 'departure_date');
                if (Schema::hasColumn('animal_departures', 'hora_salida')) $table->renameColumn('hora_salida', 'departure_time');
                if (Schema::hasColumn('animal_departures', 'estado_salida')) $table->renameColumn('estado_salida', 'departure_status');
            });
        }

        // 11. Rename columns in clinical_evaluations
        if (Schema::hasTable('clinical_evaluations')) {
            // Drop check constraints blocking column renaming
            $dropCheckIfExists('clinical_evaluations', 'chk_tipo_eval');
            $dropCheckIfExists('clinical_evaluations', 'chk_condicion');

            Schema::table('clinical_evaluations', function (Blueprint $table) {
                if (Schema::hasColumn('clinical_evaluations', 'id_evaluacion')) $table->renameColumn('id_evaluacion', 'id');
                if (Schema::hasColumn('clinical_evaluations', 'id_animal')) $table->renameColumn('id_animal', 'animal_id');
                if (Schema::hasColumn('clinical_evaluations', 'id_empleado_mvz')) $table->renameColumn('id_empleado_mvz', 'veterinarian_id');
                if (Schema::hasColumn('clinical_evaluations', 'tipo_evaluacion')) $table->renameColumn('tipo_evaluacion', 'evaluation_type');
                if (Schema::hasColumn('clinical_evaluations', 'motivo_evaluacion')) $table->renameColumn('motivo_evaluacion', 'evaluation_reason');
                if (Schema::hasColumn('clinical_evaluations', 'dictamen_destino')) $table->renameColumn('dictamen_destino', 'destination_ruling');
                if (Schema::hasColumn('clinical_evaluations', 'motivo_valoracion')) $table->renameColumn('motivo_valoracion', 'assessment_reason');
                if (Schema::hasColumn('clinical_evaluations', 'fecha')) $table->renameColumn('fecha', 'evaluation_date');
                if (Schema::hasColumn('clinical_evaluations', 'hora_entrada')) $table->renameColumn('hora_entrada', 'start_time');
                if (Schema::hasColumn('clinical_evaluations', 'hora_salida')) $table->renameColumn('hora_salida', 'end_time');
                if (Schema::hasColumn('clinical_evaluations', 'temperatura_c')) $table->renameColumn('temperatura_c', 'temperature_c');
                if (Schema::hasColumn('clinical_evaluations', 'frecuencia_cardiaca')) $table->renameColumn('frecuencia_cardiaca', 'heart_rate');
                if (Schema::hasColumn('clinical_evaluations', 'frecuencia_respiratoria')) $table->renameColumn('frecuencia_respiratoria', 'respiratory_rate');
                if (Schema::hasColumn('clinical_evaluations', 'tiempo_llenado_capilar')) $table->renameColumn('tiempo_llenado_capilar', 'capillary_refill_time');
                if (Schema::hasColumn('clinical_evaluations', 'peso_kg')) $table->renameColumn('peso_kg', 'weight_kg');
                if (Schema::hasColumn('clinical_evaluations', 'actitud')) $table->renameColumn('actitud', 'attitude');
                if (Schema::hasColumn('clinical_evaluations', 'condicion_corporal_puntaje')) $table->renameColumn('condicion_corporal_puntaje', 'body_condition_score');
                if (Schema::hasColumn('clinical_evaluations', 'diagnostico_presuntivo')) $table->renameColumn('diagnostico_presuntivo', 'presumptive_diagnosis');
                if (Schema::hasColumn('clinical_evaluations', 'diagnostico_definitivo')) $table->renameColumn('diagnostico_definitivo', 'definitive_diagnosis');
                if (Schema::hasColumn('clinical_evaluations', 'recomendaciones')) $table->renameColumn('recomendaciones', 'recommendations');
                if (Schema::hasColumn('clinical_evaluations', 'optimo_liberacion_silvestre')) $table->renameColumn('optimo_liberacion_silvestre', 'is_fit_for_wild_release');
            });

            // Re-add check constraints in English
            $addCheckIfNotExists('clinical_evaluations', 'chk_clinical_evaluations_evaluation_type', "`evaluation_type` in ('Revision_Rapida', 'Historia_Clinica_Completa')");
            $addCheckIfNotExists('clinical_evaluations', 'chk_clinical_evaluations_body_condition_score', '`body_condition_score` between 1 and 5');
        }

        // 12. Rename columns in clinical_evaluation_findings
        if (Schema::hasTable('clinical_evaluation_findings')) {
            Schema::table('clinical_evaluation_findings', function (Blueprint $table) {
                if (Schema::hasColumn('clinical_evaluation_findings', 'id_hallazgo')) $table->renameColumn('id_hallazgo', 'id');
                if (Schema::hasColumn('clinical_evaluation_findings', 'id_evaluacion')) $table->renameColumn('id_evaluacion', 'clinical_evaluation_id');
                if (Schema::hasColumn('clinical_evaluation_findings', 'sistema_organico')) $table->renameColumn('sistema_organico', 'organ_system');
                if (Schema::hasColumn('clinical_evaluation_findings', 'estado')) $table->renameColumn('estado', 'status');
                if (Schema::hasColumn('clinical_evaluation_findings', 'descripcion_hallazgo')) $table->renameColumn('descripcion_hallazgo', 'description');
            });
        }

        // 13. Rename columns in animal_restraints
        if (Schema::hasTable('animal_restraints')) {
            Schema::table('animal_restraints', function (Blueprint $table) {
                if (Schema::hasColumn('animal_restraints', 'id_contencion')) $table->renameColumn('id_contencion', 'id');
                if (Schema::hasColumn('animal_restraints', 'id_evaluacion')) $table->renameColumn('id_evaluacion', 'clinical_evaluation_id');
                if (Schema::hasColumn('animal_restraints', 'tipo_movilizacion')) $table->renameColumn('tipo_movilizacion', 'mobilization_type');
                if (Schema::hasColumn('animal_restraints', 'metodo_fisico')) $table->renameColumn('metodo_fisico', 'physical_method');
                if (Schema::hasColumn('animal_restraints', 'medicamento')) $table->renameColumn('medicamento', 'drug');
                if (Schema::hasColumn('animal_restraints', 'dosis_mg_kg')) $table->renameColumn('dosis_mg_kg', 'dose_mg_per_kg');
                if (Schema::hasColumn('animal_restraints', 'dosis_ml')) $table->renameColumn('dosis_ml', 'dose_ml');
                if (Schema::hasColumn('animal_restraints', 'hora_aplicacion')) $table->renameColumn('hora_aplicacion', 'administered_time');
                if (Schema::hasColumn('animal_restraints', 'observaciones')) $table->renameColumn('observaciones', 'notes');
            });
        }

        // 14. Rename columns in lab_samples
        if (Schema::hasTable('lab_samples')) {
            Schema::table('lab_samples', function (Blueprint $table) {
                if (Schema::hasColumn('lab_samples', 'id_muestra')) $table->renameColumn('id_muestra', 'id');
                if (Schema::hasColumn('lab_samples', 'id_evaluacion')) $table->renameColumn('id_evaluacion', 'clinical_evaluation_id');
                if (Schema::hasColumn('lab_samples', 'tipo_muestra')) $table->renameColumn('tipo_muestra', 'sample_type');
                if (Schema::hasColumn('lab_samples', 'ruta_archivo')) $table->renameColumn('ruta_archivo', 'file_path');
                if (Schema::hasColumn('lab_samples', 'resultado_observaciones')) $table->renameColumn('resultado_observaciones', 'result_notes');
            });
        }

        // 15. Rename columns in news
        if (Schema::hasTable('news')) {
            Schema::table('news', function (Blueprint $table) {
                if (Schema::hasColumn('news', 'id_noticia')) $table->renameColumn('id_noticia', 'id');
                if (Schema::hasColumn('news', 'titulo')) $table->renameColumn('titulo', 'title');
                if (Schema::hasColumn('news', 'descripcion')) $table->renameColumn('descripcion', 'description');
                if (Schema::hasColumn('news', 'contenido')) $table->renameColumn('contenido', 'content');
                if (Schema::hasColumn('news', 'ruta_imagen')) $table->renameColumn('ruta_imagen', 'image_path');
                if (Schema::hasColumn('news', 'fecha_publicacion')) $table->renameColumn('fecha_publicacion', 'published_date');
                if (Schema::hasColumn('news', 'fecha_inicio')) $table->renameColumn('fecha_inicio', 'start_date');
                if (Schema::hasColumn('news', 'fecha_fin')) $table->renameColumn('fecha_fin', 'end_date');
                if (Schema::hasColumn('news', 'categoria')) $table->renameColumn('categoria', 'category');
                if (Schema::hasColumn('news', 'estado')) $table->renameColumn('estado', 'is_active');
                if (Schema::hasColumn('news', 'id_empleado')) $table->renameColumn('id_empleado', 'author_id');
            });
        }

        // 16. Rename columns in events
        if (Schema::hasTable('events')) {
            Schema::table('events', function (Blueprint $table) {
                if (Schema::hasColumn('events', 'id_evento')) $table->renameColumn('id_evento', 'id');
                if (Schema::hasColumn('events', 'nombre_evento')) $table->renameColumn('nombre_evento', 'name');
                if (Schema::hasColumn('events', 'descripcion')) $table->renameColumn('descripcion', 'description');
                if (Schema::hasColumn('events', 'imagen_evento')) $table->renameColumn('imagen_evento', 'image_path');
                if (Schema::hasColumn('events', 'fecha_inicio')) $table->renameColumn('fecha_inicio', 'start_date');
                if (Schema::hasColumn('events', 'fecha_fin')) $table->renameColumn('fecha_fin', 'end_date');
                if (Schema::hasColumn('events', 'hora_inicio')) $table->renameColumn('hora_inicio', 'start_time');
                if (Schema::hasColumn('events', 'hora_fin')) $table->renameColumn('hora_fin', 'end_time');
                if (Schema::hasColumn('events', 'ubicacion')) $table->renameColumn('ubicacion', 'location');
                if (Schema::hasColumn('events', 'estado')) $table->renameColumn('estado', 'is_active');
                if (Schema::hasColumn('events', 'id_empleado')) $table->renameColumn('id_empleado', 'author_id');
            });
        }

        // 17. Rename columns in tickets
        if (Schema::hasTable('tickets')) {
            Schema::table('tickets', function (Blueprint $table) {
                if (Schema::hasColumn('tickets', 'no_folio')) $table->renameColumn('no_folio', 'id');
                if (Schema::hasColumn('tickets', 'boleto_adulto')) $table->renameColumn('boleto_adulto', 'adult_quantity');
                if (Schema::hasColumn('tickets', 'boleto_nino')) $table->renameColumn('boleto_nino', 'child_quantity');
                if (Schema::hasColumn('tickets', 'costo_total')) $table->renameColumn('costo_total', 'total_amount');
                if (Schema::hasColumn('tickets', 'fecha_compra')) $table->renameColumn('fecha_compra', 'purchased_at');
                if (Schema::hasColumn('tickets', 'codigo_qr')) $table->renameColumn('codigo_qr', 'qr_code');
                if (Schema::hasColumn('tickets', 'id_empleado')) $table->renameColumn('id_empleado', 'cashier_id');
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        $dropCheckIfExists = function (string $table, string $constraint) {
            $exists = DB::selectOne("
                SELECT 1 
                FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS 
                WHERE TABLE_SCHEMA = DATABASE() 
                  AND TABLE_NAME = ? 
                  AND CONSTRAINT_NAME = ? 
                  AND CONSTRAINT_TYPE = 'CHECK'
            ", [$table, $constraint]);

            if ($exists) {
                DB::statement("ALTER TABLE `{$table}` DROP CHECK `{$constraint}`");
            }
        };

        $addCheckIfNotExists = function (string $table, string $constraint, string $clause) {
            $exists = DB::selectOne("
                SELECT 1 
                FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS 
                WHERE TABLE_SCHEMA = DATABASE() 
                  AND TABLE_NAME = ? 
                  AND CONSTRAINT_NAME = ? 
                  AND CONSTRAINT_TYPE = 'CHECK'
            ", [$table, $constraint]);

            if (!$exists) {
                DB::statement("ALTER TABLE `{$table}` ADD CONSTRAINT `{$constraint}` CHECK ({$clause})");
            }
        };

        // Revert columns in clinical_evaluations
        if (Schema::hasTable('clinical_evaluations')) {
            $dropCheckIfExists('clinical_evaluations', 'chk_clinical_evaluations_evaluation_type');
            $dropCheckIfExists('clinical_evaluations', 'chk_clinical_evaluations_body_condition_score');

            Schema::table('clinical_evaluations', function (Blueprint $table) {
                if (Schema::hasColumn('clinical_evaluations', 'id')) $table->renameColumn('id', 'id_evaluacion');
                if (Schema::hasColumn('clinical_evaluations', 'animal_id')) $table->renameColumn('animal_id', 'id_animal');
                if (Schema::hasColumn('clinical_evaluations', 'veterinarian_id')) $table->renameColumn('veterinarian_id', 'id_empleado_mvz');
                if (Schema::hasColumn('clinical_evaluations', 'evaluation_type')) $table->renameColumn('evaluation_type', 'tipo_evaluacion');
                if (Schema::hasColumn('clinical_evaluations', 'evaluation_reason')) $table->renameColumn('evaluation_reason', 'motivo_evaluacion');
                if (Schema::hasColumn('clinical_evaluations', 'destination_ruling')) $table->renameColumn('destination_ruling', 'dictamen_destino');
                if (Schema::hasColumn('clinical_evaluations', 'assessment_reason')) $table->renameColumn('assessment_reason', 'motivo_valoracion');
                if (Schema::hasColumn('clinical_evaluations', 'evaluation_date')) $table->renameColumn('evaluation_date', 'fecha');
                if (Schema::hasColumn('clinical_evaluations', 'start_time')) $table->renameColumn('start_time', 'hora_entrada');
                if (Schema::hasColumn('clinical_evaluations', 'end_time')) $table->renameColumn('end_time', 'hora_salida');
                if (Schema::hasColumn('clinical_evaluations', 'temperature_c')) $table->renameColumn('temperature_c', 'temperatura_c');
                if (Schema::hasColumn('clinical_evaluations', 'heart_rate')) $table->renameColumn('heart_rate', 'frecuencia_cardiaca');
                if (Schema::hasColumn('clinical_evaluations', 'respiratory_rate')) $table->renameColumn('respiratory_rate', 'frecuencia_respiratoria');
                if (Schema::hasColumn('clinical_evaluations', 'capillary_refill_time')) $table->renameColumn('capillary_refill_time', 'tiempo_llenado_capilar');
                if (Schema::hasColumn('clinical_evaluations', 'weight_kg')) $table->renameColumn('weight_kg', 'peso_kg');
                if (Schema::hasColumn('clinical_evaluations', 'attitude')) $table->renameColumn('attitude', 'actitud');
                if (Schema::hasColumn('clinical_evaluations', 'body_condition_score')) $table->renameColumn('body_condition_score', 'condicion_corporal_puntaje');
                if (Schema::hasColumn('clinical_evaluations', 'presumptive_diagnosis')) $table->renameColumn('presumptive_diagnosis', 'diagnostico_presuntivo');
                if (Schema::hasColumn('clinical_evaluations', 'definitive_diagnosis')) $table->renameColumn('definitive_diagnosis', 'diagnostico_definitivo');
                if (Schema::hasColumn('clinical_evaluations', 'recommendations')) $table->renameColumn('recommendations', 'recomendaciones');
                if (Schema::hasColumn('clinical_evaluations', 'is_fit_for_wild_release')) $table->renameColumn('is_fit_for_wild_release', 'optimo_liberacion_silvestre');
            });

            $addCheckIfNotExists('clinical_evaluations', 'chk_tipo_eval', "`tipo_evaluacion` in ('Revision_Rapida', 'Historia_Clinica_Completa')");
            $addCheckIfNotExists('clinical_evaluations', 'chk_condicion', '`condicion_corporal_puntaje` between 1 and 5');
        }

        // Revert columns in animals
        if (Schema::hasTable('animals')) {
            $dropCheckIfExists('animals', 'chk_animals_can_receive_visits');
            $dropCheckIfExists('animals', 'chk_animals_stay_status');

            Schema::table('animals', function (Blueprint $table) {
                if (Schema::hasColumn('animals', 'id')) $table->renameColumn('id', 'id_animal');
                if (Schema::hasColumn('animals', 'tag_number')) $table->renameColumn('tag_number', 'no_marcaje');
                if (Schema::hasColumn('animals', 'responsible_id')) $table->renameColumn('responsible_id', 'id_empleado');
                if (Schema::hasColumn('animals', 'name')) $table->renameColumn('name', 'nombre_animal');
                if (Schema::hasColumn('animals', 'sex')) $table->renameColumn('sex', 'sexo');
                if (Schema::hasColumn('animals', 'age')) $table->renameColumn('age', 'edad');
                if (Schema::hasColumn('animals', 'origin')) $table->renameColumn('origin', 'origen');
                if (Schema::hasColumn('animals', 'longevity')) $table->renameColumn('longevity', 'longevidad');
                if (Schema::hasColumn('animals', 'reproduction')) $table->renameColumn('reproduction', 'reproduccion');
                if (Schema::hasColumn('animals', 'diet')) $table->renameColumn('diet', 'dieta');
                if (Schema::hasColumn('animals', 'characteristics')) $table->renameColumn('characteristics', 'caracteristicas');
                if (Schema::hasColumn('animals', 'photo_path')) $table->renameColumn('photo_path', 'ruta_fotografia');
                if (Schema::hasColumn('animals', 'entry_date')) $table->renameColumn('entry_date', 'fecha_entrada');
                if (Schema::hasColumn('animals', 'entry_time')) $table->renameColumn('entry_time', 'hora_entrada');
                if (Schema::hasColumn('animals', 'enclosure_id')) $table->renameColumn('enclosure_id', 'id_recinto');
                if (Schema::hasColumn('animals', 'species_id')) $table->renameColumn('species_id', 'id_especie');
                if (Schema::hasColumn('animals', 'can_receive_visits')) $table->renameColumn('can_receive_visits', 'puede_recibir_visitas');
                if (Schema::hasColumn('animals', 'stay_status')) $table->renameColumn('stay_status', 'estatus_estancia');
            });

            $addCheckIfNotExists('animals', 'chk_visitas', '`puede_recibir_visitas` in (0, 1)');
            $addCheckIfNotExists('animals', 'chk_estancia', "`estatus_estancia` in ('Permanente', 'Cuarentena_Ingreso', 'Resguardo_Profepa', 'Liberado', 'Trasladado')");
        }

        // Revert columns in users
        if (Schema::hasTable('users')) {
            Schema::table('users', function (Blueprint $table) {
                if (Schema::hasColumn('users', 'id')) $table->renameColumn('id', 'id_empleado');
                if (Schema::hasColumn('users', 'first_name')) $table->renameColumn('first_name', 'nombre');
                if (Schema::hasColumn('users', 'last_name')) $table->renameColumn('last_name', 'primer_apellido');
                if (Schema::hasColumn('users', 'second_last_name')) $table->renameColumn('second_last_name', 'segundo_apellido');
                if (Schema::hasColumn('users', 'department_id')) $table->renameColumn('department_id', 'id_area');
                if (Schema::hasColumn('users', 'last_login_at')) $table->renameColumn('last_login_at', 'ultimo_acceso');
                if (Schema::hasColumn('users', 'password')) $table->renameColumn('password', 'contrasena_hash');
            });
        }

        // Revert tables
        $tablesReversed = [
            'users' => 'usuarios_admins',
            'departments' => 'areas',
            'visitors' => 'usuarios',
            'visitor_collections' => 'usuarios_coleccion',
            'enclosures' => 'recintos',
            'enclosure_qr_codes' => 'recintos_qr',
            'species' => 'especies',
            'animals' => 'animales',
            'animal_departures' => 'salida_animales',
            'clinical_evaluations' => 'evaluaciones_clinicas',
            'clinical_evaluation_findings' => 'evaluacion_sistemas_hallazgos',
            'animal_restraints' => 'contencion_animal',
            'lab_samples' => 'muestras_laboratorio',
            'news' => 'noticias',
            'events' => 'eventos',
            'tickets' => 'boleto',
        ];

        foreach ($tablesReversed as $current => $original) {
            if (Schema::hasTable($current) && !Schema::hasTable($original)) {
                Schema::rename($current, $original);
            }
        }
    }
};
