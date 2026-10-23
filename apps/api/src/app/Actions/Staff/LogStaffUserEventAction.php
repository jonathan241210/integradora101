<?php

namespace App\Actions\Staff;

use App\Models\User;
use Illuminate\Support\Facades\Auth;

class LogStaffUserEventAction
{
    /**
     * @param  array<string>  $changedFields
     */
    public function execute(string $event, User $staffUser, array $changedFields = []): void
    {
        activity('staff-users')
            ->causedBy(Auth::user())
            ->performedOn($staffUser)
            ->event($event)
            ->withProperties([
                'email' => $staffUser->email,
                'roles' => $staffUser->getRoleNames()->values()->all(),
                'changed_fields' => array_values($changedFields),
            ])
            ->log($this->descriptionFor($event));
    }

    private function descriptionFor(string $event): string
    {
        return match ($event) {
            'created' => 'Cuenta de personal creada',
            'updated' => 'Cuenta de personal actualizada',
            'deactivated' => 'Cuenta de personal desactivada',
            default => 'Evento de cuenta de personal',
        };
    }
}
