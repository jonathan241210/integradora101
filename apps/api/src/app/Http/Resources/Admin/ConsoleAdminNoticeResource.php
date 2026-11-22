<?php

namespace App\Http\Resources\Admin;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Aviso de cambio por consola (api-023 RN-10). No incluye usuario del sistema operativo ni servidor.
 * `action` llega ya en español legible; el dashboard lo muestra tal cual.
 */
class ConsoleAdminNoticeResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $payload = (array) $this->payload;

        return [
            'id' => $this->id,
            'action' => $payload['action'] ?? null,
            'account_email' => $payload['account_email'] ?? null,
            'origin' => $payload['origin'] ?? 'consola',
            'reason' => $payload['reason'] ?? null,
            'created_at' => $this->created_at?->toIso8601String(),
        ];
    }
}
