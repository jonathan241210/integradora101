<?php

namespace App\Actions\Visitor;

use App\Models\Visitor;
use App\Models\VisitorNotificationPreference;

class UpdateNotificationPreferencesAction
{
    /**
     * @param  array{news_and_events?: bool, memory_status?: bool}  $patch
     * @return array{news_and_events: bool, memory_status: bool}
     */
    public function execute(Visitor $visitor, array $patch): array
    {
        $current = (new ShowNotificationPreferencesAction)->execute($visitor);
        $next = array_merge($current, $patch);

        VisitorNotificationPreference::query()->updateOrCreate(
            ['visitor_id' => $visitor->id],
            [
                'news_and_events' => $next['news_and_events'],
                'memory_status' => $next['memory_status'],
            ],
        );

        return $next;
    }
}
