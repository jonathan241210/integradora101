<?php

namespace App\Jobs;

use App\Models\Event;
use App\Models\News;
use App\Models\PushDispatch;
use App\Models\VisitorMemory;
use App\Models\VisitorMemoryReview;
use App\Models\VisitorNotificationPreference;
use App\Models\VisitorPushToken;
use App\Push\PushGateway;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Throwable;

class SendPushJob implements ShouldQueue
{
    use Queueable;

    public int $tries = 3;

    public function __construct(public int $dispatchId) {}

    public function handle(PushGateway $gateway): void
    {
        $dispatch = PushDispatch::query()->find($this->dispatchId);
        if ($dispatch === null || $dispatch->status === 'sent') {
            return;
        }

        if (! config('push.enabled')) {
            $dispatch->forceFill(['status' => 'sent'])->save();

            return;
        }

        $messages = $this->messages($dispatch);
        if ($messages !== []) {
            $gateway->send($messages);
        }

        $dispatch->forceFill(['status' => 'sent'])->save();
    }

    public function failed(?Throwable $exception): void
    {
        PushDispatch::query()
            ->whereKey($this->dispatchId)
            ->where('status', 'pending')
            ->update(['status' => 'failed']);
    }

    /**
     * @return list<array<string, mixed>>
     */
    private function messages(PushDispatch $dispatch): array
    {
        return match ($dispatch->subject_type) {
            'news' => $this->contentMessages($dispatch, 'news'),
            'event' => $this->contentMessages($dispatch, 'event'),
            'memory' => $this->memoryMessages($dispatch),
            default => [],
        };
    }

    /**
     * @return list<array<string, mixed>>
     */
    private function contentMessages(PushDispatch $dispatch, string $type): array
    {
        if ($type === 'news') {
            $row = News::query()->find($dispatch->subject_id);
            if ($row === null) {
                return [];
            }
            $title = (string) $row->title;
            $body = 'Hay una noticia nueva.';
        } else {
            $row = Event::query()->find($dispatch->subject_id);
            if ($row === null) {
                return [];
            }
            $title = (string) $row->name;
            $body = 'Hay un evento nuevo.';
        }

        $visitorIds = VisitorNotificationPreference::query()
            ->where('news_and_events', true)
            ->pluck('visitor_id');

        return $this->pack($visitorIds->all(), $title, $body, [
            'type' => $type,
            'id' => (string) $dispatch->subject_id,
        ], 'news-and-events');
    }

    /**
     * @return list<array<string, mixed>>
     */
    private function memoryMessages(PushDispatch $dispatch): array
    {
        $memory = VisitorMemory::query()->find($dispatch->subject_id);
        if ($memory === null) {
            return [];
        }

        $preference = VisitorNotificationPreference::query()->find($memory->visitor_id);
        if (! (bool) ($preference->memory_status ?? true)) {
            return [];
        }

        $review = VisitorMemoryReview::query()->find((int) $dispatch->transition_key);
        $accepted = ($review->decision ?? $memory->status) === 'accepted';

        return $this->pack([(int) $memory->visitor_id], $accepted
            ? 'Tu momento fue aceptado'
            : 'Tu momento no se publicó', $accepted
            ? 'Tu foto ya está en la galería del portal.'
            : 'Ábrelo en la app para ver qué corregir.', [
                'type' => 'memory',
                'id' => (string) $memory->id,
                'outcome' => $accepted ? 'accepted' : 'rejected',
            ], 'memories');
    }

    /**
     * @param  list<int>  $visitorIds
     * @param  array<string, string>  $data
     * @return list<array<string, mixed>>
     */
    private function pack(array $visitorIds, string $title, string $body, array $data, string $channelId): array
    {
        if ($visitorIds === []) {
            return [];
        }

        return VisitorPushToken::query()
            ->whereIn('visitor_id', $visitorIds)
            ->where('platform', 'android')
            ->pluck('token')
            ->map(fn (string $token) => [
                'to' => $token,
                'title' => $title,
                'body' => $body,
                'data' => $data,
                'channelId' => $channelId,
            ])
            ->values()
            ->all();
    }
}
