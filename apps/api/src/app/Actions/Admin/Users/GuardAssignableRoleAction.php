<?php

namespace App\Actions\Admin\Users;

use App\Actions\Admin\LogAdminActivityAction;
use App\Models\User;
use App\Support\Staff\StaffRoleCatalog;
use Symfony\Component\HttpKernel\Exception\HttpException;

/**
 * El rol admin no se asigna desde la API (api-023 RN-06, CA-12). El rechazo se audita (CA-29) con el correo
 * de la cuenta afectada y la ruta; nunca el cuerpo de la petición.
 */
class GuardAssignableRoleAction
{
    public const MESSAGE = 'No puedes asignar el rol de administrador desde la administración.';

    public function __construct(private LogAdminActivityAction $log) {}

    public function isRestricted(mixed $role): bool
    {
        return is_string($role) && in_array($role, StaffRoleCatalog::consoleManagedRoles(), true);
    }

    public function execute(mixed $role, ?User $target, mixed $email, ?string $routeName): void
    {
        if (! $this->isRestricted($role)) {
            return;
        }

        $this->log->execute('denied', 'Intento rechazado de asignar el rol de administrador', $target, [
            'route' => $routeName,
            'account_email' => $target?->email ?? (is_string($email) ? mb_substr($email, 0, 255) : null),
            'result' => 'denied',
            'reason' => 'admin-role-requested',
        ]);

        throw new HttpException(403, self::MESSAGE);
    }
}
