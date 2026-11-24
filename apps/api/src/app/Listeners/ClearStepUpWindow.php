<?php

namespace App\Listeners;

use App\Support\StepUp\StepUpWindow;

/**
 * Cierra la ventana de confirmación al iniciar o cerrar sesión (api-021 CA-10).
 * Se registra explícitamente en AppServiceProvider; `object` evita que el auto-descubrimiento de listeners
 * (que lee el tipo del parámetro) lo registre una segunda vez.
 */
class ClearStepUpWindow
{
    public function handle(object $event): void
    {
        $request = request();

        if ($request->hasSession()) {
            StepUpWindow::close($request->session());
        }
    }
}
