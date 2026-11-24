<?php

namespace Database\Seeders;

use App\Models\Achievement;
use Illuminate\Database\Seeder;

class AchievementSeeder extends Seeder
{
    public function run(): void
    {
        $rows = [
            ['code' => 'first-discovery', 'title' => 'Primer descubrimiento', 'description' => 'Tu primera gran aventura comienza con un descubrimiento.', 'icon' => 'pets', 'points' => 100, 'rule_type' => 'species_count', 'rule_target' => 1, 'rule_param' => null, 'sort_order' => 1],
            ['code' => 'habitat-explorer', 'title' => 'Explorador de hábitats', 'description' => 'Visitaste distintos rincones del zoológico.', 'icon' => 'explore', 'points' => 250, 'rule_type' => 'enclosure_count', 'rule_target' => 3, 'rule_param' => null, 'sort_order' => 2],
            ['code' => 'mission-starter', 'title' => 'Misión cumplida', 'description' => 'Completaste tu primera misión de exploración.', 'icon' => 'emoji-events', 'points' => 150, 'rule_type' => 'missions_completed', 'rule_target' => 1, 'rule_param' => null, 'sort_order' => 3],
            ['code' => 'bird-watcher', 'title' => 'Observador de aves', 'description' => 'Demuestra atención a las especies emplumadas.', 'icon' => 'visibility', 'points' => 200, 'rule_type' => 'category_species_count', 'rule_target' => 3, 'rule_param' => 'bird', 'sort_order' => 4],
            ['code' => 'zoo-photographer', 'title' => 'Mirada curiosa', 'description' => 'Recorre el zoológico y descubre nuevas especies.', 'icon' => 'photo-camera', 'points' => 300, 'rule_type' => 'species_count', 'rule_target' => 10, 'rule_param' => null, 'sort_order' => 5],
            ['code' => 'mission-master', 'title' => 'Maestro de misiones', 'description' => 'Completa desafíos y conviértete en referente de exploración.', 'icon' => 'military-tech', 'points' => 500, 'rule_type' => 'missions_completed', 'rule_target' => 5, 'rule_param' => null, 'sort_order' => 6],
            ['code' => 'comic-mono', 'title' => '¿El jefe de la rama?', 'description' => 'Escanea un mono.', 'icon' => 'pets', 'points' => 50, 'rule_type' => 'species_keyword', 'rule_target' => 1, 'rule_param' => 'mono', 'sort_order' => 20],
            ['code' => 'comic-ardilla', 'title' => '¿Ratatoskr?!', 'description' => 'Escanea una ardilla.', 'icon' => 'pets', 'points' => 50, 'rule_type' => 'species_keyword', 'rule_target' => 1, 'rule_param' => 'ardilla', 'sort_order' => 21],
            ['code' => 'comic-pajaro', 'title' => 'Un puntito con alas', 'description' => 'Escanea un pajarito.', 'icon' => 'visibility', 'points' => 50, 'rule_type' => 'species_keyword', 'rule_target' => 1, 'rule_param' => 'pajaro,pajarito', 'sort_order' => 22],
            ['code' => 'comic-pato', 'title' => '¿Eso es un barco?', 'description' => 'Escanea un pato.', 'icon' => 'water', 'points' => 50, 'rule_type' => 'species_keyword', 'rule_target' => 1, 'rule_param' => 'pato', 'sort_order' => 23],
            ['code' => 'comic-ganso', 'title' => 'El del cuello largo y el mal genio', 'description' => 'Escanea un ganso.', 'icon' => 'visibility', 'points' => 50, 'rule_type' => 'species_keyword', 'rule_target' => 1, 'rule_param' => 'ganso,ganzo', 'sort_order' => 24],
            ['code' => 'comic-burro', 'title' => '¿Quién rebuzna ahí?', 'description' => 'Escanea un burro.', 'icon' => 'pets', 'points' => 50, 'rule_type' => 'species_keyword', 'rule_target' => 1, 'rule_param' => 'burro', 'sort_order' => 25],
            ['code' => 'comic-llama', 'title' => 'Cuidado con el escupitajo', 'description' => 'Escanea una llama.', 'icon' => 'pets', 'points' => 50, 'rule_type' => 'species_keyword', 'rule_target' => 1, 'rule_param' => 'llama', 'sort_order' => 26],
            ['code' => 'comic-tortuga', 'title' => 'Va con casa a cuestas', 'description' => 'Escanea una tortuga.', 'icon' => 'pets', 'points' => 50, 'rule_type' => 'species_keyword', 'rule_target' => 1, 'rule_param' => 'tortuga', 'sort_order' => 27],
            ['code' => 'comic-tigre', 'title' => 'Un tigre... ¿poniendo un huevo?', 'description' => 'Escanea un tigre.', 'icon' => 'pets', 'points' => 50, 'rule_type' => 'species_keyword', 'rule_target' => 1, 'rule_param' => 'tigre', 'sort_order' => 28],
            ['code' => 'comic-leon', 'title' => 'El de la melena, no el del camaleón', 'description' => 'Escanea un león.', 'icon' => 'pets', 'points' => 50, 'rule_type' => 'species_keyword', 'rule_target' => 1, 'rule_param' => 'leon', 'sort_order' => 29],
            ['code' => 'comic-hipopotamo', 'title' => 'Una roca que bosteza', 'description' => 'Escanea un hipopótamo.', 'icon' => 'water', 'points' => 50, 'rule_type' => 'species_keyword', 'rule_target' => 1, 'rule_param' => 'hipopotamo', 'sort_order' => 30],
            ['code' => 'comic-avestruz', 'title' => '¿Eso es un pollo gigante?', 'description' => 'Escanea un avestruz.', 'icon' => 'visibility', 'points' => 50, 'rule_type' => 'species_keyword', 'rule_target' => 1, 'rule_param' => 'avestruz', 'sort_order' => 31],
            ['code' => 'comic-serpiente', 'title' => 'Una corbata con opinión', 'description' => 'Escanea una serpiente.', 'icon' => 'pets', 'points' => 50, 'rule_type' => 'species_keyword', 'rule_target' => 1, 'rule_param' => 'serpiente', 'sort_order' => 32],
            ['code' => 'comic-zorro', 'title' => 'El del cuento, pero de verdad', 'description' => 'Escanea un zorro.', 'icon' => 'pets', 'points' => 50, 'rule_type' => 'species_keyword', 'rule_target' => 1, 'rule_param' => 'zorro', 'sort_order' => 33],
            ['code' => 'comic-jaguar', 'title' => 'Manchas con motor', 'description' => 'Escanea un jaguar.', 'icon' => 'pets', 'points' => 50, 'rule_type' => 'species_keyword', 'rule_target' => 1, 'rule_param' => 'jaguar', 'sort_order' => 34],
            ['code' => 'comic-guacamaya', 'title' => 'Un semáforo que vuela', 'description' => 'Escanea una guacamaya.', 'icon' => 'visibility', 'points' => 50, 'rule_type' => 'species_keyword', 'rule_target' => 1, 'rule_param' => 'guacamaya', 'sort_order' => 35],
            ['code' => 'comic-oso', 'title' => 'El abrazo que no quieres', 'description' => 'Escanea un oso.', 'icon' => 'pets', 'points' => 50, 'rule_type' => 'species_keyword', 'rule_target' => 1, 'rule_param' => 'oso', 'sort_order' => 36],
            ['code' => 'comic-cocodrilo', 'title' => 'Sonrisa con muchas piezas', 'description' => 'Escanea un cocodrilo.', 'icon' => 'water', 'points' => 50, 'rule_type' => 'species_keyword', 'rule_target' => 1, 'rule_param' => 'cocodrilo', 'sort_order' => 37],
        ];

        foreach ($rows as $row) {
            Achievement::query()->updateOrCreate(['code' => $row['code']], $row + ['is_active' => true]);
        }
    }
}
