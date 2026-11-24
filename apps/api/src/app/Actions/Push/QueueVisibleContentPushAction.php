<?php

namespace App\Actions\Push;

use App\Jobs\SendPushJob;
use App\Models\PushDispatch;
use Illuminate\Database\UniqueConstraintViolationException;

class QueueVisibleContentPushAction
{
    public function execute(string $subjectType, int $subjectId): void
    {
        try {
            $dispatch = PushDispatch::query()->create([
                'subject_type' => $subjectType,
                'subject_id' => $subjectId,
                'transition_key' => 'published',
                'status' => 'pending',
            ]);
        } catch (UniqueConstraintViolationException) {
            return;
        }

        SendPushJob::dispatch($dispatch->id);
    }
}
