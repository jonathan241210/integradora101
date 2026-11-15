<?php

namespace App\Exceptions;

use Illuminate\Http\JsonResponse;
use RuntimeException;

/** El visitante ya tiene una petición abierta (api-010 CA-24): responde 422 en errors.open_request. */
class OpenMemoryRequestException extends RuntimeException
{
    public const MESSAGE = 'Ya tienes una petición abierta. Espera la revisión o corrígela si fue rechazada.';

    public function __construct(public readonly int $openRequestId)
    {
        parent::__construct(self::MESSAGE);
    }

    public function render(): JsonResponse
    {
        return response()->json([
            'message' => self::MESSAGE,
            'errors' => ['open_request' => [self::MESSAGE]],
            'open_request_id' => $this->openRequestId,
        ], 422);
    }
}
