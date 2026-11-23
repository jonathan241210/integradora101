<?php

namespace App\Actions\Admin\Users;

use App\Actions\Admin\LogAdminActivityAction;
use App\Models\User;
use App\Support\Staff\StaffRoleCatalog;
use Symfony\Component\HttpKernel\Exception\HttpException;

/**
 * Las cuentas admin solo se gestionan desde la consola del servidor (api-023 RN-06, CA-11).
 * El rechazo se audita (CA-29, RN-17) sin cuerpo de la petición ni contraseñas.
 */
class GuardConsoleManagedAccountAction
{
    public const MESSAGE = 'Las cuentas de administrador solo se gestionan desde la consola del servidor.';

    public function __construct(private LogAdminActivityAction $log) {}

    public function isConsoleManaged(User $target): bool
    {
        return StaffRoleCatalog::isConsoleManaged($target->getRoleNames());
    }

    public function execute(User $target, ?string $routeName): void
    {
        if (! $this->isConsoleManaged($target)) {
            return;
        }

        $this->log->execute('denied', 'Intento rechazado sobre una cuenta de administrador', $target, [
            'route' => $routeName,
            'account_email' => $target->email,
            'result' => 'denied',
            'reason' => 'console-managed',
        ]);

        throw new HttpException(403, self::MESSAGE);
    }
}
