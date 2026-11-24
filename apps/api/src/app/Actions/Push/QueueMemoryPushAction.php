<?php

namespace App\Actions\Push;

use App\Jobs\SendPushJob;
use App\Models\PushDispatch;
use App\Models\VisitorMemory;
use App\Models\VisitorNotificationPreference;
use App\Models\VisitorPushToken;
use Illuminate\Database\UniqueConstraintViolationException;

class QueueMemoryPushAction
{
    public function execute(VisitorMemory $memory, string $outcome, int $reviewId): void
    {
        if (! in_array($outcome, ['accepted', 'rejected'], true)) {
            return;
        }

        try {
            $dispatch = PushDispatch::query()->create([
                'subject_type' => 'memory',
                'subject_id' => $memory->id,
                'transition_key' => (string) $reviewId,
                'status' => 'pending',
            ]);
        } catch (UniqueConstraintViolationException) {
            return;
        }

        $preference = VisitorNotificationPreference::query()->find($memory->visitor_id);
        $wants = (bool) ($preference->memory_status ?? true);
        $hasToken = VisitorPushToken::query()
            ->where('visitor_id', $memory->visitor_id)
            ->where('platform', 'android')
            ->exists();

        if (! $wants || ! $hasToken) {
            $dispatch->forceFill(['status' => 'sent'])->save();

            return;
        }

        SendPushJob::dispatch($dispatch->id);
    }
}
