<?php

namespace App\Console\Commands;

use App\Actions\Push\QueueVisibleContentPushAction;
use App\Models\Event;
use App\Models\News;
use Illuminate\Console\Command;

class DispatchVisibleContentPushCommand extends Command
{
    protected $signature = 'push:dispatch-visible-content';

    protected $description = 'Encola el aviso único de las noticias y eventos que ya son visibles';

    public function handle(QueueVisibleContentPushAction $queue): int
    {
        News::query()->publicVisible()->orderBy('id')->each(
            fn (News $news) => $queue->execute('news', (int) $news->id)
        );

        Event::query()->publicVisible()->orderBy('id')->each(
            fn (Event $event) => $queue->execute('event', (int) $event->id)
        );

        return self::SUCCESS;
    }
}
