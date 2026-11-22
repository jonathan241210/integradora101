<?php

namespace App\Http\Middleware;

use App\Actions\Admin\Users\GuardAssignableRoleAction;
use App\Actions\Admin\Users\GuardConsoleManagedAccountAction;
use App\Models\User;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Alias `console-managed-account` (api-023 CA-11, CA-12, CA-36, RN-21). Va después de `permission:users.manage`
 * y antes de `step-up:*` (api-021 CA-38): toda negativa por reglas de admin precede a pedir la contraseña y no
 * depende de la validación del cuerpo. Una cuenta inexistente pasa de largo y responde 404 más adelante (CA-14).
 */
class ConsoleManagedAccountGuard
{
    public function __construct(
        private GuardConsoleManagedAccountAction $account,
        private GuardAssignableRoleAction $role,
    ) {}

    public function handle(Request $request, Closure $next): Response
    {
        $routeName = $request->route()?->getName();
        $target = null;
        $id = $request->route('user');

        if ($id !== null) {
            $target = is_scalar($id) && ctype_digit((string) $id)
                ? User::query()->with('roles')->find((int) $id)
                : null;

            if ($target === null) {
                return $next($request);
            }

            $this->account->execute($target, $routeName);
        }

        // El rol pedido solo existe en el alta y en la edición.
        if (in_array($routeName, ['admin.users.store', 'admin.users.update'], true)) {
            $this->role->execute($request->input('role'), $target, $request->input('email'), $routeName);
        }

        return $next($request);
    }
}
