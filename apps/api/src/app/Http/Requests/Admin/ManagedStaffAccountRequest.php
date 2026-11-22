<?php

namespace App\Http\Requests\Admin;

use App\Actions\Admin\Users\FindManageableStaffAccountAction;
use App\Actions\Admin\Users\GuardConsoleManagedAccountAction;
use App\Models\User;

/**
 * Resuelve la cuenta antes de validar el cuerpo: fuera de alcance siempre es 404 (CA-14); después, una cuenta
 * admin responde 403 (CA-11). El middleware `console-managed-account` ya lo hace antes de `step-up`; aquí queda
 * como segunda línea para que ninguna ruta nueva olvide el control.
 */
abstract class ManagedStaffAccountRequest extends AdminFormRequest
{
    private ?User $target = null;

    public function authorize(): bool
    {
        $this->target = app(FindManageableStaffAccountAction::class)
            ->execute($this->user(), (string) $this->route('user'));

        app(GuardConsoleManagedAccountAction::class)->execute($this->target, $this->route()?->getName());

        return $this->authorizeTarget();
    }

    public function target(): User
    {
        return $this->target;
    }

    protected function authorizeTarget(): bool
    {
        return true;
    }
}
