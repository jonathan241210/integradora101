<?php

namespace App\Exceptions;

use Carbon\CarbonInterface;
use Illuminate\Http\JsonResponse;
use RuntimeException;

/** Límite de un momento nuevo cada 7 días (api-010 CA-23): responde 429 con Retry-After. */
class WeeklyMemoryLimitException extends RuntimeException
{
    public function __construct(public readonly CarbonInterface $nextSubmissionAt)
    {
        parent::__construct(sprintf(
            'Solo puedes enviar un momento por semana. Podrás enviar otro a partir del %s.',
            $nextSubmissionAt->copy()->setTimezone(config('app.timezone'))->format('d/m/Y H:i'),
        ));
    }

    public function render(): JsonResponse
    {
        $retryAfter = max(1, (int) ceil(now()->diffInSeconds($this->nextSubmissionAt, false)));

        return response()->json([
            'message' => $this->getMessage(),
            'code' => 'weekly_limit_reached',
            'next_submission_at' => $this->nextSubmissionAt->copy()->utc()->toIso8601String(),
        ], 429, ['Retry-After' => (string) $retryAfter]);
    }
}
