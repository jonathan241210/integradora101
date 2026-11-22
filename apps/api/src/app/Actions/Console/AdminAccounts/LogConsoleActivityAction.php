<?php

namespace App\Actions\Console\AdminAccounts;

use App\Models\User;

/**
 * Auditoría de un cambio hecho desde la consola (api-023 RN-09, CA-18). Sin causante de tipo usuario: la consola no
 * tiene sesión de aplicación. Propiedades en lista blanca; nunca contraseñas ni secretos de 2FA.
 */
class LogConsoleActivityAction
{
    public function execute(string $event, string $label, User $subject, string $reason, ?string $mode = null): void
    {
        activity('admin')
            ->causedByAnonymous()
            ->performedOn($subject)
            ->event($event)
            ->withProperties([
                'origin' => 'consola',
                'os_user' => $this->osUser(),
                'hostname' => (string) gethostname(),
                'reason' => $reason,
                'account_email' => $subject->email,
                'action' => $label,
            ] + ($mode !== null ? ['mode' => $mode] : []))
            ->log('Cambio por consola: '.mb_strtolower($label));
    }

    public function osUser(): string
    {
        if (function_exists('posix_getpwuid') && function_exists('posix_geteuid')) {
            $info = posix_getpwuid(posix_geteuid());
            if (is_array($info) && ($info['name'] ?? '') !== '') {
                return (string) $info['name'];
            }
        }

        return (string) (getenv('USER') ?: getenv('USERNAME') ?: 'desconocido');
    }
}
