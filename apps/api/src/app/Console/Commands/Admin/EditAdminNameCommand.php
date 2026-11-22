<?php

namespace App\Console\Commands\Admin;

use function Laravel\Prompts\text;

/**
 * Nivel bajo (api-023, revisión 2026-11-21): motivo y confirmación.
 */
class EditAdminNameCommand extends ConsoleAdminCommand
{
    /** Nivel de seguridad: lo lee `arca:admin:help` (api-023, revisión 2026-11-21 b). */
    public const LEVEL = 'bajo';

    protected $signature = 'arca:admin:edit-name {email : Correo de la cuenta} {--first-name= : Nombre} {--last-name= : Primer apellido} {--second-last-name= : Segundo apellido (usa "-" para quitarlo)} {--r|reason= : Motivo del cambio (mínimo 10 caracteres)} {--y|yes : Confirma sin preguntar}';

    protected $description = 'Cambia el nombre de una cuenta de administrador (nivel bajo: motivo y confirmación)';

    public function handle(): int
    {
        $reason = $this->askReason();

        if ($reason === null) {
            return self::FAILURE;
        }

        $user = $this->findAdminAccount((string) $this->argument('email'));

        if ($user === null) {
            return self::FAILURE;
        }

        $interactive = $this->input->isInteractive();
        $first = trim((string) ($this->option('first-name') ?: ($interactive ? text('Nombre', default: $user->first_name, required: true) : $user->first_name)));
        $last = trim((string) ($this->option('last-name') ?: ($interactive ? text('Primer apellido', default: $user->last_name, required: true) : $user->last_name)));
        $secondOption = $this->option('second-last-name');
        $second = $secondOption !== null
            ? ($secondOption === '-' ? '' : trim((string) $secondOption))
            : ($interactive ? trim(text('Segundo apellido', default: (string) $user->second_last_name)) : (string) $user->second_last_name);

        if ($first === '' || $last === '' || mb_strlen($first) > 100 || mb_strlen($last) > 100 || mb_strlen($second) > 100) {
            $this->error('Nombre y primer apellido son obligatorios y de máximo 100 caracteres.');

            return self::FAILURE;
        }

        if ($first === $user->first_name && $last === $user->last_name && $second === (string) $user->second_last_name) {
            $this->error('El nombre no cambió.');

            return self::FAILURE;
        }

        $confirmed = $this->confirmChange([
            'Operación' => 'Cambiar nombre de administrador',
            'Cuenta' => $user->email,
            'Nombre actual' => $user->full_name,
            'Nombre nuevo' => trim("$first $last $second"),
            'Motivo' => $reason,
        ]);

        if (! $confirmed) {
            return self::SUCCESS;
        }

        return $this->applyChange('console-name-edited', 'Nombre actualizado', $reason, function () use ($user, $first, $last, $second) {
            $user->forceFill(['first_name' => $first, 'last_name' => $last, 'second_last_name' => $second !== '' ? $second : null])->save();

            return $user;
        }, 'Nombre de %s actualizado.');
    }
}
