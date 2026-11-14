<?php

namespace App\Actions\Memories\Review;

use App\Exceptions\MemoryConfigurationException;
use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\Log;

class ComputePublicationWindowAction
{
    /**
     * @return array{published_at: CarbonImmutable, published_until: CarbonImmutable}
     *
     * @throws MemoryConfigurationException cuando MEMORIES_PUBLICATION_DAYS no es un entero >= 1 (CA-30).
     */
    public function execute(): array
    {
        $days = $this->days(config('memories.publication_days'));

        $publishedAt = CarbonImmutable::now();

        return [
            'published_at' => $publishedAt,
            'published_until' => $publishedAt->addDays($days),
        ];
    }

    private function days(mixed $value): int
    {
        $valid = (is_int($value) && $value >= 1)
            || (is_string($value) && preg_match('/^[0-9]+$/', $value) === 1 && (int) $value >= 1);

        if (! $valid) {
            Log::error('Configuración inválida: memories.publication_days debe ser un entero mayor o igual que 1.');

            throw new MemoryConfigurationException('Configuración de publicación inválida.');
        }

        return (int) $value;
    }
}
