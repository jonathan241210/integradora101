<?php

namespace App\Http\Requests\Admin;

use App\Actions\Admin\Users\FindManageableStaffAccountAction;
use App\Models\User;

/**
 * Resuelve la cuenta antes de validar el cuerpo: fuera de alcance siempre es 404.
 */
abstract class ManagedStaffAccountRequest extends AdminFormRequest
{
    private ?User $target = null;

    public function authorize(): bool
    {
        $this->target = app(FindManageableStaffAccountAction::class)
            ->execute($this->user(), (string) $this->route('user'));

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
