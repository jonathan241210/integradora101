<?php

namespace App\Console\Commands;

use App\Actions\Staff\CleanupTestAnimalsAction;
use DomainException;
use Illuminate\Console\Command;

class CleanupTestAnimalsCommand extends Command
{
    protected $signature = 'animals:cleanup-test {--apply} {--operator= : Nombre del operador autorizado}';

    protected $description = 'Previsualiza o aplica la baja lógica del lote aprobado, conservando los animales de DBR-019';

    private const ANIMALS = [
        5 => ['Juan', 'TAG-JAG-01'],
        38 => ['jona', 'tic101'],
        39 => ['Tlalok', 'ja102'],
        40 => ['La cobra', 'queque'],
        41 => ['ghj', 'yuo'],
        46 => ['BUBU', '12345'],
        47 => ['gugu', '123458'],
        98 => ['Vic', 'vic101'],
        99 => ['yoo', 'yo101'],
        166 => ['diego_prueba', '1345'],
        167 => ['diego_prueba2', '12345678'],
        168 => ['fgtyhj', '144'],
        326 => ['toño', 'tigre 001'],
        327 => ['prueba', 'rtyui'],
    ];

    public function handle(CleanupTestAnimalsAction $action): int
    {
        $apply = (bool) $this->option('apply');
        $operator = trim((string) $this->option('operator'));
        if ($apply && ($operator === '' || preg_match('/[\x00-\x1F\x7F]/', $operator))) {
            $this->error('Indica el nombre del operador autorizado con --operator.');

            return self::FAILURE;
        }

        try {
            $result = $action->execute(self::ANIMALS, $apply, range(101, 163));
        } catch (DomainException $exception) {
            $this->error($exception->getMessage());

            return self::FAILURE;
        }

        $this->table(['ID', 'Nombre', 'Marcaje', 'Evaluaciones', 'Egresos', 'Fecha de baja'], array_values($result['rows']));

        if ($result['mismatches'] !== []) {
            $this->error('Lote bloqueado por registros ausentes, modificados o fuera del inventario aprobado. IDs: '.implode(', ', $result['mismatches']));

            return self::FAILURE;
        }

        $this->info('Se conservan los 63 animales de DBR-019.');
        if ($apply) {
            $this->info(sprintf('Operador: %s | Autorización: api-029 | Bajas aplicadas: %d', $operator, count($result['changed'])));
            foreach ($result['changed'] as $id => $deletedAt) {
                $this->line("ID {$id} | Baja: {$deletedAt}");
            }
        } else {
            $this->info('Previsualización completada sin cambios.');
        }

        return self::SUCCESS;
    }
}
