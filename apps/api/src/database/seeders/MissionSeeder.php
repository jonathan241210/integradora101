<?php

namespace Database\Seeders;

use App\Models\Mission;
use Illuminate\Database\Seeder;

class MissionSeeder extends Seeder
{
    public function run(): void
    {
        $rows = [
            ['code' => 'safari-morning', 'title' => 'Safari Matutino', 'description' => 'Descubre cinco especies durante tu visita.', 'objective' => 'Descubre cinco animales de la sabana durante tu visita.', 'icon' => 'pets', 'points' => 100, 'rule_type' => 'species_count', 'rule_target' => 5, 'rule_param' => null, 'sort_order' => 1],
            ['code' => 'bird-watcher', 'title' => 'Observador de Aves', 'description' => 'El certificado de demostración pasa a puntos.', 'objective' => 'Encuentra y descubre un ave en el zoológico.', 'icon' => 'visibility', 'points' => 50, 'rule_type' => 'category_species_count', 'rule_target' => 1, 'rule_param' => 'bird', 'sort_order' => 2],
        ];

        foreach ($rows as $row) {
            Mission::query()->updateOrCreate(['code' => $row['code']], $row);
        }
    }
}
