<?php

namespace Tests\Feature\Visitor;

use App\Actions\Admin\Content\SaveEventAction;
use App\Actions\Admin\Content\SaveNewsAction;
use App\Jobs\SendPushJob;
use App\Models\Event;
use App\Models\News;
use App\Models\PushDispatch;

class ContentPushDispatchTest extends PushFeatureTestCase
{
    /** CA-05 */
    public function test_ca05_a_visible_news_item_is_sent_once_only_to_who_asked(): void
    {
        $asked = $this->verifiedVisitor();
        $silent = $this->verifiedVisitor();
        $this->registerPhone($asked, 'ExponentPushToken[asked]');
        $this->registerPhone($silent, 'ExponentPushToken[silent]');
        $this->setNewsPreference($asked, true);

        $news = $this->saveNews(['title' => 'Llegó el jaguar']);
        $this->saveNewsModel($news, ['title' => 'Llegó el jaguar, de nuevo']);

        $this->assertCount(1, $this->push->messages);
        $this->assertSame('ExponentPushToken[asked]', $this->push->messages[0]['to']);
        $this->assertSame('Llegó el jaguar', $this->push->messages[0]['title']);
        $this->assertSame('Hay una noticia nueva.', $this->push->messages[0]['body']);
        $this->assertSame('news', $this->push->messages[0]['data']['type']);
        $this->assertSame((string) $news->id, $this->push->messages[0]['data']['id']);
        $this->assertSame('news-and-events', $this->push->messages[0]['channelId']);
        $this->assertSame(1, PushDispatch::query()->where('subject_type', 'news')->where('subject_id', $news->id)->count());
    }

    /** CA-06 */
    public function test_ca06_a_news_item_waits_until_it_is_visible(): void
    {
        $visitor = $this->verifiedVisitor();
        $this->registerPhone($visitor);
        $this->setNewsPreference($visitor, true);

        $future = $this->saveNews([
            'title' => 'Todavía no',
            'published_date' => '2099-01-01',
            'is_active' => false,
        ]);
        $this->assertSame([], $this->push->messages);

        $inactive = $this->saveNews(['title' => 'Oculta', 'is_active' => false]);
        $ended = $this->saveNews([
            'title' => 'Terminó',
            'end_date' => '2000-01-01',
        ]);
        $this->assertSame([], $this->push->messages);
        $inactive->delete();

        $future->forceFill([
            'is_active' => true,
            'published_date' => now('America/Mexico_City')->toDateString(),
            'end_date' => null,
        ])->save();

        $this->artisan('push:dispatch-visible-content')->assertOk();

        $aboutFuture = array_values(array_filter(
            $this->push->messages,
            fn (array $message) => $message['data']['id'] === (string) $future->id,
        ));
        $this->assertCount(1, $aboutFuture);
        $this->assertNull(PushDispatch::query()->where('subject_id', $ended->id)->first());
    }

    /** CA-07 */
    public function test_ca07_a_visible_event_is_sent_once_and_skips_who_opted_out(): void
    {
        $asked = $this->verifiedVisitor();
        $silent = $this->verifiedVisitor();
        $this->registerPhone($asked, 'ExponentPushToken[event]');
        $this->registerPhone($silent, 'ExponentPushToken[quiet]');
        $this->setNewsPreference($asked, true);

        $event = $this->saveEvent(['name' => 'Noche de luciérnagas']);
        $this->saveEventModel($event, ['name' => 'Noche de luciérnagas, repetida']);

        $this->assertCount(1, $this->push->messages);
        $this->assertSame('Noche de luciérnagas', $this->push->messages[0]['title']);
        $this->assertSame('Hay un evento nuevo.', $this->push->messages[0]['body']);
        $this->assertSame('event', $this->push->messages[0]['data']['type']);
        $this->assertSame((string) $event->id, $this->push->messages[0]['data']['id']);
        $this->assertSame('ExponentPushToken[event]', $this->push->messages[0]['to']);
    }

    /** CA-11 */
    public function test_ca11_a_push_failure_does_not_undo_the_news(): void
    {
        config(['queue.default' => 'database']);
        $visitor = $this->verifiedVisitor();
        $this->registerPhone($visitor);
        $this->setNewsPreference($visitor, true);
        $this->push->fail = true;

        $news = $this->saveNews(['title' => 'Se queda']);
        $this->assertNotNull($news->fresh());

        $dispatch = PushDispatch::query()->where('subject_type', 'news')->where('subject_id', $news->id)->first();
        $this->assertNotNull($dispatch);

        try {
            app(SendPushJob::class, ['dispatchId' => $dispatch->id])->handle($this->push);
            $this->fail('El doble debía fallar.');
        } catch (\RuntimeException) {
            $this->assertNotNull(News::query()->find($news->id));
        }
    }

    /** CA-14 */
    public function test_ca14_content_payload_has_no_personal_data(): void
    {
        $visitor = $this->verifiedVisitor();
        $this->registerPhone($visitor);
        $this->setNewsPreference($visitor, true);
        $this->saveNews(['title' => 'Aviso público']);
        $this->saveEvent(['name' => 'Evento público']);

        $this->assertCount(2, $this->push->messages);
        foreach ($this->push->messages as $message) {
            $this->assertPayloadPrivate($message);
        }
    }

    private function saveNews(array $override = []): News
    {
        $admin = $this->createAccount('admin');
        $today = now('America/Mexico_City')->toDateString();

        return app(SaveNewsAction::class)->execute($admin, null, array_merge([
            'title' => 'Aviso '.bin2hex(random_bytes(3)),
            'description' => 'Resumen',
            'content' => 'Contenido',
            'category' => 'Aviso',
            'published_date' => $today,
            'start_date' => $today,
        ], $override));
    }

    private function saveNewsModel(News $news, array $override): News
    {
        $admin = $this->createAccount('admin');

        return app(SaveNewsAction::class)->execute($admin, $news, array_merge([
            'title' => $news->title,
            'description' => $news->description,
            'content' => $news->content,
            'category' => $news->category,
            'published_date' => $news->published_date?->toDateString() ?? now('America/Mexico_City')->toDateString(),
            'start_date' => $today = now('America/Mexico_City')->toDateString(),
            'end_date' => null,
        ], $override));
    }

    private function saveEvent(array $override = []): Event
    {
        $admin = $this->createAccount('admin');
        $today = now('America/Mexico_City')->toDateString();

        return app(SaveEventAction::class)->execute($admin, null, array_merge([
            'name' => 'Evento '.bin2hex(random_bytes(3)),
            'description' => 'Descripción',
            'start_date' => $today,
            'end_date' => null,
            'start_time' => '10:00',
            'end_time' => '12:00',
            'location' => 'Plaza',
        ], $override));
    }

    private function saveEventModel(Event $event, array $override): Event
    {
        $admin = $this->createAccount('admin');
        $today = now('America/Mexico_City')->toDateString();

        return app(SaveEventAction::class)->execute($admin, $event, array_merge([
            'name' => $event->name,
            'description' => $event->description,
            'start_date' => $today,
            'end_date' => null,
            'start_time' => '10:00',
            'end_time' => '12:00',
            'location' => 'Plaza',
        ], $override));
    }
}
