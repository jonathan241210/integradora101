<?php

namespace App\Actions\Admin\StepUp;

use App\Models\Enclosure;
use App\Models\EnclosureQrCode;
use Illuminate\Http\Request;

/**
 * Modo de `POST admin/enclosures/{enclosure}/qr/regenerate` (api-021 CA-20, CA-39): «Ventana» si el recinto ya
 * tiene QR activo; sin QR activo es primera generación y no pide contraseña. Recinto inexistente: `none` (404).
 */
class ResolveEnclosureQrRegenerateModeAction
{
    public function execute(Request $request): string
    {
        $enclosure = Enclosure::query()->find((string) $request->route('enclosure'));

        if ($enclosure === null) {
            return 'none';
        }

        $hasActiveQr = EnclosureQrCode::query()
            ->where('enclosure_id', $enclosure->id)
            ->where('is_active', true)
            ->exists();

        return $hasActiveQr ? 'window' : 'none';
    }
}
