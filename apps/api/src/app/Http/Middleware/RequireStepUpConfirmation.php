<?php

namespace App\Http\Middleware;

use App\Actions\Admin\StepUp\ResolveEnclosureQrRegenerateModeAction;
use App\Actions\Admin\StepUp\ResolveStaffAccountUpdateModeAction;
use App\Actions\Auth\StepUp\VerifyStaffPasswordAction;
use App\Support\StepUp\StepUpWindow;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Confirmación de contraseña por operación (api-021). Alias `step-up:<modo>[,<campo>]`.
 * Modos: none, window, always, staff-account-update y enclosure-qr-regenerate (estos dos delegan en una Action).
 * En `always` la contraseña viaja en `password`, salvo que la ruta indique otro campo.
 * La decisión vive aquí; el cliente solo reacciona al 403 `password_confirmation_required`.
 */
class RequireStepUpConfirmation
{
    public function __construct(private VerifyStaffPasswordAction $verify) {}

    public function handle(Request $request, Closure $next, string $mode = 'window', string $field = 'password'): Response
    {
        $mode = match ($mode) {
            'staff-account-update' => app(ResolveStaffAccountUpdateModeAction::class)->execute($request),
            'enclosure-qr-regenerate' => app(ResolveEnclosureQrRegenerateModeAction::class)->execute($request),
            default => $mode,
        };

        return match ($mode) {
            'none' => $next($request),
            'always' => $this->always($request, $next, $field),
            default => $this->window($request, $next),
        };
    }

    private function window(Request $request, Closure $next): Response
    {
        $session = $request->hasSession() ? $request->session() : null;

        return StepUpWindow::isOpen($session, (int) $request->user()->getAuthIdentifier())
            ? $next($request)
            : $this->required('window');
    }

    private function always(Request $request, Closure $next, string $field): Response
    {
        // Solo del cuerpo (JSON o formulario), nunca de la query: una URL con la contraseña quedaría en logs e historial.
        $password = ($request->isJson() ? $request->json() : $request->request)->get($field);

        // Sin contraseña no hay intento verificado: no se audita ni cuenta para el límite (CA-12, CA-29).
        if (! is_string($password) || $password === '') {
            return $this->required('always');
        }

        $this->verify->execute($request->user(), $password, $request, 'always');

        return $next($request);
    }

    private function required(string $mode): Response
    {
        return response()->json([
            'message' => 'Confirma tu contraseña para realizar esta acción.',
            'code' => 'password_confirmation_required',
            'mode' => $mode,
        ], Response::HTTP_FORBIDDEN);
    }
}
