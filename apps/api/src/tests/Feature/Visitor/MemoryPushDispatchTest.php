<?php

namespace Tests\Feature\Visitor;

use App\Actions\Memories\Review\AcceptMemoryAction;
use App\Actions\Memories\Review\RejectMemoryAction;
use App\Actions\Memories\Review\ShowMemoryForReviewAction;
use App\Jobs\SendPushJob;
use App\Models\PushDispatch;
use App\Models\VisitorMemory;

class MemoryPushDispatchTest extends PushFeatureTestCase
{
    /** CA-08 */
    public function test_ca08_accept_and_reject_send_the_spanish_texts(): void
    {
        $visitor = $this->verifiedVisitor();
        $this->registerPhone($visitor, 'ExponentPushToken[memory]');
        $account = $this->visitorModel($visitor);
        $disk = $this->fakeMemoryDisk();
        $accepted = $this->createMemoryWithFile($disk, ['visitor_id' => $account->id]);
        $rejected = $this->createMemoryWithFile($disk, ['visitor_id' => $account->id]);
        $staff = $this->createMemoryStaff();

        app(AcceptMemoryAction::class)->execute($staff, (string) $accepted->id);
        app(RejectMemoryAction::class)->execute($staff, (string) $rejected->id, 'La foto sale borrosa.', ['image']);

        $this->assertCount(2, $this->push->messages);
        $this->assertSame('Tu momento fue aceptado', $this->push->messages[0]['title']);
        $this->assertSame('Tu foto ya está en la galería del portal.', $this->push->messages[0]['body']);
        $this->assertSame('accepted', $this->push->messages[0]['data']['outcome']);
        $this->assertSame('memory', $this->push->messages[0]['data']['type']);
        $this->assertSame((string) $accepted->id, $this->push->messages[0]['data']['id']);
        $this->assertSame('memories', $this->push->messages[0]['channelId']);
        $this->assertSame('Tu momento no se publicó', $this->push->messages[1]['title']);
        $this->assertSame('Ábrelo en la app para ver qué corregir.', $this->push->messages[1]['body']);
        $this->assertSame('rejected', $this->push->messages[1]['data']['outcome']);
    }

    /** CA-09 */
    public function test_ca09_review_expiry_opt_out_and_missing_token_do_not_enqueue(): void
    {
        $visitor = $this->verifiedVisitor();
        $account = $this->visitorModel($visitor);
        $disk = $this->fakeMemoryDisk();
        $opened = $this->createMemoryWithFile($disk, ['visitor_id' => $account->id]);
        app(ShowMemoryForReviewAction::class)->execute((string) $opened->id);
        $this->assertSame('in_review', $opened->fresh()->status);
        $this->assertSame(0, PushDispatch::query()->where('subject_type', 'memory')->count());

        $waiting = $this->createMemoryWithFile($disk, ['visitor_id' => $account->id], 'submitted');
        $this->assertSame('submitted', $waiting->status);

        $this->setNewsPreference($visitor, false);
        $this->withVisitorToken($visitor['access_token'])
            ->patchJson('/api/v1/visitor/notification-preferences', ['memory_status' => false])
            ->assertOk();
        $this->registerPhone($visitor, 'ExponentPushToken[off]');
        $muted = $this->createMemoryWithFile($disk, ['visitor_id' => $account->id]);
        app(AcceptMemoryAction::class)->execute($this->createMemoryStaff(), (string) $muted->id);
        $this->assertSame('accepted', $muted->fresh()->status);
        $this->assertSame([], $this->push->messages);

        $silent = $this->verifiedVisitor();
        $silentAccount = $this->visitorModel($silent);
        $withoutPhone = $this->createMemoryWithFile($disk, ['visitor_id' => $silentAccount->id]);
        app(AcceptMemoryAction::class)->execute($this->createMemoryStaff(), (string) $withoutPhone->id);
        $this->assertSame('accepted', $withoutPhone->fresh()->status);
        $this->assertSame([], $this->push->messages);
    }

    /** CA-10 */
    public function test_ca10_a_second_rejection_sends_again_and_a_retry_does_not(): void
    {
        $visitor = $this->verifiedVisitor();
        $this->registerPhone($visitor);
        $account = $this->visitorModel($visitor);
        $disk = $this->fakeMemoryDisk();
        $memory = $this->createMemoryWithFile($disk, ['visitor_id' => $account->id]);
        $staff = $this->createMemoryStaff();

        app(RejectMemoryAction::class)->execute($staff, (string) $memory->id, 'Primera.', ['content']);
        VisitorMemory::query()->whereKey($memory->id)->update(['status' => 'submitted']);
        app(RejectMemoryAction::class)->execute($staff, (string) $memory->fresh()->id, 'Segunda.', ['content']);

        $this->assertCount(2, $this->push->messages);
        $this->assertSame(2, PushDispatch::query()->where('subject_type', 'memory')->where('subject_id', $memory->id)->count());

        $first = PushDispatch::query()->where('subject_type', 'memory')->orderBy('id')->firstOrFail();
        app(SendPushJob::class, ['dispatchId' => $first->id])->handle($this->push);
        $this->assertCount(2, $this->push->messages);
        $this->assertSame(2, PushDispatch::query()->where('subject_id', $memory->id)->count());
    }

    /** CA-11 y CA-14 */
    public function test_ca11_and_ca14_a_failed_review_push_keeps_the_memory_and_hides_private_fields(): void
    {
        $visitor = $this->verifiedVisitor();
        $this->registerPhone($visitor);
        $account = $this->visitorModel($visitor);
        $disk = $this->fakeMemoryDisk();
        $memory = $this->createMemoryWithFile($disk, [
            'visitor_id' => $account->id,
            'opinion' => 'Una opinión privada',
        ]);
        $staff = $this->createMemoryStaff();

        config(['queue.default' => 'sync']);
        app(RejectMemoryAction::class)->execute($staff, (string) $memory->id, 'No se ve el animal.', ['image']);
        $this->assertPayloadPrivate($this->push->messages[0]);
        $this->assertStringNotContainsString('No se ve el animal', json_encode($this->push->messages[0], JSON_THROW_ON_ERROR));
        $this->assertStringNotContainsString('Una opinión privada', json_encode($this->push->messages[0], JSON_THROW_ON_ERROR));

        config(['queue.default' => 'database']);
        $this->push->fail = true;
        $another = $this->createMemoryWithFile($disk, ['visitor_id' => $account->id]);
        app(AcceptMemoryAction::class)->execute($staff, (string) $another->id);
        $this->assertSame('accepted', $another->fresh()->status);

        $dispatch = PushDispatch::query()->where('subject_id', $another->id)->firstOrFail();
        try {
            app(SendPushJob::class, ['dispatchId' => $dispatch->id])->handle($this->push);
        } catch (\RuntimeException) {
            $this->assertSame('accepted', VisitorMemory::query()->find($another->id)?->status);
        }
    }
}
