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
        ];

        foreach ($rows as $row) {
            Mission::query()->updateOrCreate(['code' => $row['code']], $row);
        }
    }
}
