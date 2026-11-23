<?php

namespace App\Actions\Admin\StepUp;

use App\Actions\Admin\Users\FindManageableStaffAccountAction;
use Illuminate\Http\Request;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;

/**
 * Modo de `PATCH admin/users/{user}` (api-021 CA-18, CA-36): «Siempre» si cambia el rol, «Ventana» si no.
 * Reutiliza la búsqueda de cuentas gestionables: una cuenta inexistente o fuera de alcance da `none`, así la ruta
 * responde 404 sin pedir contraseña, sin gastar intentos y sin auditoría.
 */
class ResolveStaffAccountUpdateModeAction
{
    public function __construct(private FindManageableStaffAccountAction $find) {}

    public function execute(Request $request): string
    {
        try {
            $target = $this->find->execute($request->user(), (string) $request->route('user'));
        } catch (NotFoundHttpException) {
            return 'none';
        }

        if (! $request->has('role')) {
            return 'window';
        }

        $role = $request->input('role');

        // getRoleNames() compara el nombre exacto; hasRole() interpretaría `|` como lista de roles.
        return is_string($role) && $target->getRoleNames()->contains($role) ? 'window' : 'always';
    }
}
