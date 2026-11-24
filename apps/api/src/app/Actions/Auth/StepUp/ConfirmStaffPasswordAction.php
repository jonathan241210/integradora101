<?php

namespace App\Actions\Auth\StepUp;

use App\Models\User;
use App\Support\StepUp\StepUpWindow;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;

/** Confirma la contraseña y abre la ventana de la sesión (api-021 CA-06). */
class ConfirmStaffPasswordAction
{
    public function __construct(private VerifyStaffPasswordAction $verify) {}

    /** @return Carbon instante en que termina la ventana (UTC) */
    public function execute(User $user, string $password, Request $request): Carbon
    {
        // La ventana vive en la sesión: un cliente sin sesión (token) no puede abrirla y no consume intentos.
        abort_unless($request->hasSession(), 422, 'La confirmación de contraseña requiere una sesión de navegador.');

        $this->verify->execute($user, $password, $request, 'confirmation');

        return Carbon::createFromTimestampUTC(StepUpWindow::open($request->session(), $user->id));
    }
}
