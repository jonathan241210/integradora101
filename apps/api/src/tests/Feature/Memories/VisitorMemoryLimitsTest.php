<?php

namespace Tests\Feature\Memories;

use App\Models\VisitorMemory;
use Illuminate\Support\Carbon;
use Tests\Concerns\CreatesMemoryFixtures;
use Tests\Concerns\InteractsWithVisitorMemories;
use Tests\Feature\Visitor\VisitorFeatureTestCase;

class VisitorMemoryLimitsTest extends VisitorFeatureTestCase
{
    use CreatesMemoryFixtures;
    use InteractsWithVisitorMemories;

    /** CA-24 */
    public function test_ca24_open_request_returns_422_with_open_request_id(): void
    {
        [$token, $visitor] = $this->memoryVisitor();
        $disk = $this->fakeMemoryDisk();

        foreach (['submitted', 'in_review', 'rejected'] as $status) {
            $open = $this->memoryOf($visitor, $status, [], now()->subDays(30));

            $this->submitMemory($token)
                ->assertStatus(422)
                ->assertJsonPath('errors.open_request.0', 'Ya tienes una petición abierta. Espera la revisión o corrígela si fue rechazada.')
                ->assertJsonPath('open_request_id', $open->id);

            $open->forceDelete();
        }

        $this->assertSame([], $disk->allFiles());
        $this->assertSame(0, VisitorMemory::withTrashed()->where('visitor_id', $visitor->id)->count());
    }

    /** CA-24: orden sesión, campos, abierta, semanal. */
    public function test_ca24_check_order_is_fields_then_open_request_then_weekly_limit(): void
    {
        [$token, $visitor] = $this->memoryVisitor();
        $this->fakeMemoryDisk();
        $open = $this->memoryOf($visitor, 'submitted'); // creada ahora: también dentro de la ventana semanal

        $this->submitMemory($token, ['consent' => null])->assertStatus(422)->assertJsonValidationErrors('consent');
        $this->submitMemory($token)->assertStatus(422)->assertJsonPath('open_request_id', $open->id);

        $open->forceFill(['status' => 'accepted'])->save();
        $this->submitMemory($token)->assertStatus(429)->assertJsonPath('code', 'weekly_limit_reached');
    }

    /** CA-23 */
    public function test_ca23_weekly_limit_returns_429_with_next_submission_at(): void
    {
        [$token, $visitor] = $this->memoryVisitor();
        $disk = $this->fakeMemoryDisk();
        $now = Carbon::now()->startOfSecond();
        Carbon::setTestNow($now);
        config(['app.timezone' => 'America/Mexico_City']);

        $created = $now->copy()->subDay();
        $this->memoryOf($visitor, 'accepted', [], $created);
        $next = $created->copy()->addDays(7);

        $response = $this->submitMemory($token)
            ->assertStatus(429)
            ->assertJsonPath('code', 'weekly_limit_reached')
            ->assertJsonPath('next_submission_at', $next->copy()->utc()->toIso8601String())
            ->assertHeader('Retry-After', (string) (6 * 86400));

        $this->assertSame(
            'Solo puedes enviar un momento por semana. Podrás enviar otro a partir del '.$next->copy()->setTimezone('America/Mexico_City')->format('d/m/Y H:i').'.',
            $response->json('message'),
        );
        $this->assertSame([], $disk->allFiles());
        $this->assertSame(1, VisitorMemory::withTrashed()->where('visitor_id', $visitor->id)->count());
    }

    /** CA-23: también cuentan las rechazadas ya corregidas y las eliminadas lógicamente. */
    public function test_ca23_soft_deleted_requests_still_count_for_the_window(): void
    {
        [$token, $visitor] = $this->memoryVisitor();
        $this->fakeMemoryDisk();
        $memory = $this->memoryOf($visitor, 'accepted', [], now()->subDays(2));
        $memory->delete();

        $this->submitMemory($token)->assertStatus(429)->assertJsonPath('code', 'weekly_limit_reached');
    }

    /** CA-23 */
    public function test_ca23_exactly_seven_days_allows_submit(): void
    {
        [$token, $visitor] = $this->memoryVisitor();
        $this->fakeMemoryDisk();
        $now = Carbon::now()->startOfSecond();
        Carbon::setTestNow($now);

        $memory = $this->memoryOf($visitor, 'accepted', [], $now->copy()->subDays(7)->addSecond());
        $this->submitMemory($token)->assertStatus(429);

        VisitorMemory::query()->whereKey($memory->id)->update(['created_at' => $now->copy()->subDays(7)]);
        $this->submitMemory($token)->assertCreated();
    }

    /** CA-25 (secuencial, R5 del plan) */
    public function test_ca25_second_submit_after_first_is_blocked_by_open_request(): void
    {
        [$token, $visitor] = $this->memoryVisitor();
        $disk = $this->fakeMemoryDisk();

        $first = $this->submitMemory($token)->assertCreated();
        $this->submitMemory($token)
            ->assertStatus(422)
            ->assertJsonPath('open_request_id', $first->json('data.id'));

        VisitorMemory::query()->whereKey($first->json('data.id'))->update(['status' => 'accepted']);
        $this->submitMemory($token)->assertStatus(429);

        $this->assertSame(1, VisitorMemory::withTrashed()->where('visitor_id', $visitor->id)->count());
        $this->assertCount(1, $disk->allFiles());
    }

    /** CA-24: la petición de otro visitante no bloquea. */
    public function test_ca24_another_visitors_request_does_not_block(): void
    {
        [$token] = $this->memoryVisitor();
        [, $other] = $this->memoryVisitor();
        $this->fakeMemoryDisk();
        $this->memoryOf($other, 'submitted');

        $this->submitMemory($token)->assertCreated();
    }
}
