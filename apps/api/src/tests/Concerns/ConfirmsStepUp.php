<?php

namespace Tests\Concerns;

use App\Models\User;
use App\Support\StepUp\StepUpWindow;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Auth;

/**
 * Apoyo de las pruebas de api-021. La ventana vive en la sesión, así que la petición debe ser «stateful»
 * (cabecera Origin de un dominio configurado). Dentro de una prueba la sesión en memoria persiste entre peticiones.
 */
trait ConfirmsStepUp
{
    protected const STEP_UP_ORIGIN = 'http://localhost:5174';

    /** Contraseña que usan todas las fixtures de createAccount() y createStaffUser(). */
    protected const STEP_UP_PASSWORD = 'SafePassphrase12!';

    private ?int $stepUpActorId = null;

    /**
     * Autentica con sesión de navegador y SIN ventana de confirmación nueva (una ventana abierta antes por el
     * mismo usuario en esta prueba se conserva). Al cambiar de usuario se vacía la sesión en memoria:
     * el middleware AuthenticateSession de Sanctum la invalidaría por el hash de contraseña del usuario anterior.
     */
    protected function actAsWithoutWindow(User $user): static
    {
        config(['sanctum.stateful' => ['localhost:5174']]);

        if ($this->stepUpActorId !== $user->id) {
            $this->flushSession();
            $this->stepUpActorId = $user->id;
        }

        Auth::forgetGuards();

        return $this->withHeader('Origin', self::STEP_UP_ORIGIN)->actingAs($user, 'web');
    }

    /** Autentica con sesión de navegador y una ventana vigente (`$seconds` restantes). */
    protected function actAsConfirmed(User $user, int $seconds = 600): static
    {
        return $this->actAsWithoutWindow($user)->withSession([
            StepUpWindow::KEY => Carbon::now()->getTimestamp() + $seconds,
            StepUpWindow::USER_KEY => $user->id,
        ]);
    }
}
