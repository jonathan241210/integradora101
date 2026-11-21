<?php

return [
    'points_per_species' => 100,

    'levels' => [
        ['level' => 1, 'rank' => 'Explorador novato', 'threshold' => 0],
        ['level' => 2, 'rank' => 'Explorador', 'threshold' => 500],
        ['level' => 3, 'rank' => 'Explorador avanzado', 'threshold' => 1500],
        ['level' => 4, 'rank' => 'Explorador experto', 'threshold' => 3000],
        // 18 especies × 100, más 850 de logros por cantidad, 900 de logros por animal y 900 de misiones.
        ['level' => 5, 'rank' => 'Guardián de la fauna', 'threshold' => 4450],
    ],
];
