<?php

namespace App\Actions\Visitor;

use App\Models\Visitor;
use App\Models\VisitorNotificationPreference;

class ShowNotificationPreferencesAction
{
    /**
     * @return array{news_and_events: bool, memory_status: bool}
     */
    public function execute(Visitor $visitor): array
    {
        $row = VisitorNotificationPreference::query()->find($visitor->id);

        return [
            'news_and_events' => (bool) ($row->news_and_events ?? false),
            'memory_status' => (bool) ($row->memory_status ?? true),
        ];
    }
}
