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
        ];

        foreach ($rows as $row) {
            Achievement::query()->updateOrCreate(['code' => $row['code']], $row);
        }
    }
}
