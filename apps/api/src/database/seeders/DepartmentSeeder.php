<?php

namespace Database\Seeders;

use App\Models\Department;
use Illuminate\Database\Seeder;

class DepartmentSeeder extends Seeder
{
    public function run(): void
    {
        foreach ([
            ['code' => 'presidency', 'name' => 'Presidencia', 'description' => 'Administración general'],
            ['code' => 'information-technology', 'name' => 'Informática', 'description' => 'Tecnologías de información'],
            ['code' => 'management', 'name' => 'Dirección', 'description' => 'Dirección del zoológico'],
            ['code' => 'box-office', 'name' => 'Taquilla', 'description' => 'Venta y control de boletos'],
            ['code' => 'veterinary', 'name' => 'Servicios veterinarios', 'description' => 'Atención médico-veterinaria'],
        ] as $department) {
            Department::updateOrCreate(
                ['code' => $department['code']],
                [...$department, 'is_active' => true],
            );
        }
    }
}
