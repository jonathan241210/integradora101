<?php

namespace App\Http\Resources\Visitor;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class NotificationPreferencesResource extends JsonResource
{
    /**
     * @return array{news_and_events: bool, memory_status: bool}
     */
    public function toArray(Request $request): array
    {
        return [
            'news_and_events' => (bool) $this->resource['news_and_events'],
            'memory_status' => (bool) $this->resource['memory_status'],
        ];
    }
}
