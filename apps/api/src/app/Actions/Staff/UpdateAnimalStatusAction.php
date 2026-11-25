<?php

namespace App\Actions\Staff;

use App\Actions\Admin\LogAdminActivityAction;
use App\Models\Animal;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class UpdateAnimalStatusAction
{
    /** @var array<string, list<string>> */
    private const TRANSITIONS = [
        'Cuarentena_Ingreso' => ['Permanente', 'Resguardo_Profepa'],
        'Permanente' => ['Resguardo_Profepa', 'Trasladado', 'Liberado'],
        'Resguardo_Profepa' => ['Permanente', 'Trasladado', 'Liberado'],
        'Trasladado' => [],
        'Liberado' => [],
    ];

    /** @var list<string> */
    private const NON_VISITABLE_STATUSES = ['Resguardo_Profepa', 'Trasladado', 'Liberado'];

    public function __construct(private readonly LogAdminActivityAction $audit) {}

    /**
     * @param  array{stay_status?: string, can_receive_visits?: bool|int|string, reason?: string|null}  $data
     * @return array{animal: Animal, changed: bool}
     */
    public function execute(Animal $animal, array $data): array
    {
        $beforeStatus = $animal->stay_status;
        $beforeVisits = (int) $animal->can_receive_visits;

        $newStatus = array_key_exists('stay_status', $data) ? (string) $data['stay_status'] : $beforeStatus;
        $newVisits = array_key_exists('can_receive_visits', $data)
            ? (int) filter_var($data['can_receive_visits'], FILTER_VALIDATE_BOOLEAN, FILTER_NULL_ON_FAILURE)
            : $beforeVisits;

        if (array_key_exists('can_receive_visits', $data)) {
            $newVisits = filter_var($data['can_receive_visits'], FILTER_VALIDATE_BOOL) ? 1 : 0;
        }

        if (array_key_exists('stay_status', $data)) {
            $this->assertTransitionAllowed($beforeStatus, $newStatus);
        }

        if (in_array($newStatus, self::NON_VISITABLE_STATUSES, true)) {
            $newVisits = 0;
        }

        $changes = [];
        if ($newStatus !== $beforeStatus) {
            $changes['stay_status'] = $newStatus;
        }
        if ($newVisits !== $beforeVisits) {
            $changes['can_receive_visits'] = $newVisits;
        }

        if ($changes === []) {
            return ['animal' => $animal, 'changed' => false];
        }

        DB::transaction(function () use ($animal, $changes, $data, $beforeStatus, $beforeVisits, $newStatus, $newVisits): void {
            $animal->forceFill($changes);
            $animal->save();

            $properties = [
                'animal_id' => $animal->id,
                'before' => [
                    'stay_status' => $beforeStatus,
                    'can_receive_visits' => $beforeVisits,
                ],
                'after' => [
                    'stay_status' => $newStatus,
                    'can_receive_visits' => $newVisits,
                ],
            ];

            if (array_key_exists('stay_status', $data) && array_key_exists('reason', $data) && $data['reason'] !== null && $data['reason'] !== '') {
                $properties['reason'] = (string) $data['reason'];
            }

            $this->audit->execute(
                'animal_status_updated',
                'Estatus de estancia o permiso de visitas actualizado.',
                $animal,
                $properties,
            );
        });

        return ['animal' => $animal->fresh() ?? $animal, 'changed' => true];
    }

    private function assertTransitionAllowed(?string $from, string $to): void
    {
        if ($from === $to) {
            return;
        }

        $allowed = self::TRANSITIONS[$from] ?? [];

        if (! in_array($to, $allowed, true)) {
            throw ValidationException::withMessages([
                'stay_status' => ['No se puede cambiar el estatus de estancia de "'.($from ?? 'desconocido').'" a "'.$to.'".'],
            ]);
        }
    }
}