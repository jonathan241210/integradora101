<?php

namespace App\Console\Commands;

use App\Actions\Staff\CleanupTestSpeciesAction;
use DomainException;
use Illuminate\Console\Command;

class CleanupTestSpeciesCommand extends Command
{
    protected $signature = 'species:cleanup-test {--apply} {--operator= : Nombre del operador autorizado}';

    protected $description = 'Previsualiza o aplica la baja lógica de Gordo y dfgh en arca_pruebas';

    public function handle(CleanupTestSpeciesAction $action): int
    {
        $apply = (bool) $this->option('apply');
        $operator = trim((string) $this->option('operator'));
        if ($apply && ($operator === '' || preg_match('/[\x00-\x1F\x7F]/', $operator))) {
            $this->error('Indica el nombre del operador autorizado con --operator.');

            return self::FAILURE;
        }

        try {
            $result = $action->execute([85 => 'Gordo', 86 => 'dfgh'], $apply);
        } catch (DomainException $exception) {
            $this->error($exception->getMessage());

            return self::FAILURE;
        }

        $this->table(['ID', 'Especie', 'Animales activos', 'Animales dados de baja', 'Solicitudes', 'Colecciones', 'Favoritos', 'Fecha de baja'], array_values($result['rows']));
        if ($result['blocked'] !== []) {
            $this->error('Lote bloqueado por especies ausentes, nombres distintos o animales activos. IDs: '.implode(', ', $result['blocked']));

            return self::FAILURE;
        }

        if ($apply) {
            $this->info(sprintf('Operador: %s | Autorización: api-030 | Bajas aplicadas: %d', $operator, count($result['changed'])));
        } else {
            $this->info('Previsualización completada sin cambios.');
        }

        return self::SUCCESS;
    }
}
