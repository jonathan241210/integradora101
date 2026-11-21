<?php

namespace Database\Seeders;

use App\Models\Mission;
use Illuminate\Database\Seeder;

class MissionSeeder extends Seeder
{
    public function run(): void
    {
        $rows = [
            ['code' => 'first-species', 'title' => 'Primer descubrimiento', 'description' => 'La misma meta que el logro de la primera especie.', 'objective' => 'Descubre tu primera especie.', 'icon' => 'pets', 'points' => 50, 'rule_type' => 'species_count', 'rule_target' => 1, 'rule_param' => null, 'sort_order' => 1],
            ['code' => 'safari-morning', 'title' => 'Safari Matutino', 'description' => 'Descubre cinco especies durante tu visita.', 'objective' => 'Descubre cinco especies durante tu visita.', 'icon' => 'pets', 'points' => 100, 'rule_type' => 'species_count', 'rule_target' => 5, 'rule_param' => null, 'sort_order' => 2],
            ['code' => 'three-habitats', 'title' => 'Explorador de hábitats', 'description' => 'La misma meta que el logro de tres recintos.', 'objective' => 'Descubre especies en tres recintos distintos.', 'icon' => 'explore', 'points' => 100, 'rule_type' => 'enclosure_count', 'rule_target' => 3, 'rule_param' => null, 'sort_order' => 3],
            ['code' => 'bird-watcher', 'title' => 'Observador de aves', 'description' => 'La misma meta que el logro de aves.', 'objective' => 'Descubre tres aves en el zoológico.', 'icon' => 'visibility', 'points' => 50, 'rule_type' => 'category_species_count', 'rule_target' => 3, 'rule_param' => 'bird', 'sort_order' => 4],
            ['code' => 'ten-species', 'title' => 'Mirada curiosa', 'description' => 'La misma meta que el logro de diez especies.', 'objective' => 'Descubre diez especies.', 'icon' => 'photo-camera', 'points' => 150, 'rule_type' => 'species_count', 'rule_target' => 10, 'rule_param' => null, 'sort_order' => 5],
            ['code' => 'mission-mono', 'title' => '¿El jefe de la rama?', 'description' => 'La misma meta que el logro del mono.', 'objective' => 'Escanea un mono.', 'icon' => 'pets', 'points' => 25, 'rule_type' => 'species_keyword', 'rule_target' => 1, 'rule_param' => 'mono', 'sort_order' => 20],
            ['code' => 'mission-ardilla', 'title' => '¿Ratatoskr?!', 'description' => 'La misma meta que el logro de la ardilla.', 'objective' => 'Escanea una ardilla.', 'icon' => 'pets', 'points' => 25, 'rule_type' => 'species_keyword', 'rule_target' => 1, 'rule_param' => 'ardilla', 'sort_order' => 21],
            ['code' => 'mission-pajaro', 'title' => 'Un puntito con alas', 'description' => 'La misma meta que el logro del pajarito.', 'objective' => 'Escanea un pajarito.', 'icon' => 'visibility', 'points' => 25, 'rule_type' => 'species_keyword', 'rule_target' => 1, 'rule_param' => 'pajaro,pajarito', 'sort_order' => 22],
            ['code' => 'mission-pato', 'title' => '¿Eso es un barco?', 'description' => 'La misma meta que el logro del pato.', 'objective' => 'Escanea un pato.', 'icon' => 'water', 'points' => 25, 'rule_type' => 'species_keyword', 'rule_target' => 1, 'rule_param' => 'pato', 'sort_order' => 23],
            ['code' => 'mission-ganso', 'title' => 'El del cuello largo y el mal genio', 'description' => 'La misma meta que el logro del ganso.', 'objective' => 'Escanea un ganso.', 'icon' => 'visibility', 'points' => 25, 'rule_type' => 'species_keyword', 'rule_target' => 1, 'rule_param' => 'ganso,ganzo', 'sort_order' => 24],
            ['code' => 'mission-burro', 'title' => '¿Quién rebuzna ahí?', 'description' => 'La misma meta que el logro del burro.', 'objective' => 'Escanea un burro.', 'icon' => 'pets', 'points' => 25, 'rule_type' => 'species_keyword', 'rule_target' => 1, 'rule_param' => 'burro', 'sort_order' => 25],
            ['code' => 'mission-llama', 'title' => 'Cuidado con el escupitajo', 'description' => 'La misma meta que el logro de la llama.', 'objective' => 'Escanea una llama.', 'icon' => 'pets', 'points' => 25, 'rule_type' => 'species_keyword', 'rule_target' => 1, 'rule_param' => 'llama', 'sort_order' => 26],
            ['code' => 'mission-tortuga', 'title' => 'Va con casa a cuestas', 'description' => 'La misma meta que el logro de la tortuga.', 'objective' => 'Escanea una tortuga.', 'icon' => 'pets', 'points' => 25, 'rule_type' => 'species_keyword', 'rule_target' => 1, 'rule_param' => 'tortuga', 'sort_order' => 27],
            ['code' => 'mission-tigre', 'title' => 'Un tigre... ¿poniendo un huevo?', 'description' => 'La misma meta que el logro del tigre.', 'objective' => 'Escanea un tigre.', 'icon' => 'pets', 'points' => 25, 'rule_type' => 'species_keyword', 'rule_target' => 1, 'rule_param' => 'tigre', 'sort_order' => 28],
            ['code' => 'mission-leon', 'title' => 'El de la melena, no el del camaleón', 'description' => 'La misma meta que el logro del león.', 'objective' => 'Escanea un león.', 'icon' => 'pets', 'points' => 25, 'rule_type' => 'species_keyword', 'rule_target' => 1, 'rule_param' => 'leon', 'sort_order' => 29],
            ['code' => 'mission-hipopotamo', 'title' => 'Una roca que bosteza', 'description' => 'La misma meta que el logro del hipopótamo.', 'objective' => 'Escanea un hipopótamo.', 'icon' => 'water', 'points' => 25, 'rule_type' => 'species_keyword', 'rule_target' => 1, 'rule_param' => 'hipopotamo', 'sort_order' => 30],
            ['code' => 'mission-avestruz', 'title' => '¿Eso es un pollo gigante?', 'description' => 'La misma meta que el logro del avestruz.', 'objective' => 'Escanea un avestruz.', 'icon' => 'visibility', 'points' => 25, 'rule_type' => 'species_keyword', 'rule_target' => 1, 'rule_param' => 'avestruz', 'sort_order' => 31],
            ['code' => 'mission-serpiente', 'title' => 'Una corbata con opinión', 'description' => 'La misma meta que el logro de la serpiente.', 'objective' => 'Escanea una serpiente.', 'icon' => 'pets', 'points' => 25, 'rule_type' => 'species_keyword', 'rule_target' => 1, 'rule_param' => 'serpiente', 'sort_order' => 32],
            ['code' => 'mission-zorro', 'title' => 'El del cuento, pero de verdad', 'description' => 'La misma meta que el logro del zorro.', 'objective' => 'Escanea un zorro.', 'icon' => 'pets', 'points' => 25, 'rule_type' => 'species_keyword', 'rule_target' => 1, 'rule_param' => 'zorro', 'sort_order' => 33],
            ['code' => 'mission-jaguar', 'title' => 'Manchas con motor', 'description' => 'La misma meta que el logro del jaguar.', 'objective' => 'Escanea un jaguar.', 'icon' => 'pets', 'points' => 25, 'rule_type' => 'species_keyword', 'rule_target' => 1, 'rule_param' => 'jaguar', 'sort_order' => 34],
            ['code' => 'mission-guacamaya', 'title' => 'Un semáforo que vuela', 'description' => 'La misma meta que el logro de la guacamaya.', 'objective' => 'Escanea una guacamaya.', 'icon' => 'visibility', 'points' => 25, 'rule_type' => 'species_keyword', 'rule_target' => 1, 'rule_param' => 'guacamaya', 'sort_order' => 35],
            ['code' => 'mission-oso', 'title' => 'El abrazo que no quieres', 'description' => 'La misma meta que el logro del oso.', 'objective' => 'Escanea un oso.', 'icon' => 'pets', 'points' => 25, 'rule_type' => 'species_keyword', 'rule_target' => 1, 'rule_param' => 'oso', 'sort_order' => 36],
            ['code' => 'mission-cocodrilo', 'title' => 'Sonrisa con muchas piezas', 'description' => 'La misma meta que el logro del cocodrilo.', 'objective' => 'Escanea un cocodrilo.', 'icon' => 'water', 'points' => 25, 'rule_type' => 'species_keyword', 'rule_target' => 1, 'rule_param' => 'cocodrilo', 'sort_order' => 37],
        ];

        foreach ($rows as $row) {
            Mission::query()->updateOrCreate(['code' => $row['code']], $row);
        }
    }
}
