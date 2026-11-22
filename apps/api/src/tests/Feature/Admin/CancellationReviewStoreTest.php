<?php

namespace Tests\Feature\Admin;

use App\Actions\Admin\LogAdminActivityAction;
use App\Models\CancellationReview;
use Carbon\CarbonImmutable;
use Spatie\Activitylog\Models\Activity;

/** api-027: registro de revisiones. */
class CancellationReviewStoreTest extends CancellationReviewTestCase
{
    private const POST = '/api/v1/admin/reports/cancellations/reviews';

    private function body(object $cashier, array $override = []): array
    {
        return array_merge([
            'cashier_id' => $cashier->id,
            'business_date' => self::DAY,
            'status' => 'clarification_required',
            'note' => 'El cajero debe explicar las dos cancelaciones.',
        ], $override);
    }

    private function fixture(): array
    {
        $admin = $this->createAccount('admin', true, ['first_name' => 'Presidencia', 'last_name' => 'General']);
        $cashier = $this->createAccount('cashier', true, ['first_name' => 'Laura', 'last_name' => 'Cruz']);
        $this->wipe();
        $this->attentionDay($cashier, self::DAY);

        return [$admin, $cashier];
    }

    /** CA-17 cancellation-review-signals */
    public function test_ca17_admin_records_review_row(): void
    {
        [$admin, $cashier] = $this->fixture();
        $before = CancellationReview::count();

        $response = $this->actAs($admin)->postJson(self::POST, $this->body($cashier))->assertCreated();

        $data = $response->json('data');
        $this->assertSame(['id', 'status', 'status_label', 'note', 'reviewed_by_name', 'reviewed_at'], array_keys($data));
        $this->assertSame('clarification_required', $data['status']);
        $this->assertSame('Requiere aclaración', $data['status_label']);
        $this->assertSame('El cajero debe explicar las dos cancelaciones.', $data['note']);
        $this->assertSame('Presidencia General', $data['reviewed_by_name']);
        $this->assertNotNull($data['reviewed_at']);
        $this->assertSame($before + 1, CancellationReview::count());
        $this->assertDatabaseHas('cancellation_reviews', ['id' => $data['id'], 'cashier_id' => $cashier->id, 'business_date' => self::DAY, 'reviewed_by' => $admin->id]);
    }

    /** CA-18 cancellation-review-signals */
    public function test_ca18_invalid_review_returns_422_and_no_row(): void
    {
        [$admin, $cashier] = $this->fixture();
        $other = $this->createAccount('cashier', true, ['first_name' => 'Sin ventas']);
        $before = CancellationReview::withTrashed()->count();
        $tomorrow = CarbonImmutable::now(config('arca.timezone'))->addDay()->toDateString();

        $invalid = [
            'estado desconocido' => ['status' => 'approved'],
            'sin estado' => ['status' => null],
            'nota de 14 caracteres' => ['note' => '12345678901234'],
            'nota de solo espacios' => ['note' => str_repeat(' ', 30)],
            'nota de 256 caracteres' => ['note' => str_repeat('a', 256)],
            'nota corta tras recortar' => ['note' => '   corta   '],
            'cajero inexistente' => ['cashier_id' => 99999999],
            'usuario que no es cajero' => ['cashier_id' => $admin->id],
            'fecha mal formada' => ['business_date' => '06/03/2019'],
            'fecha futura' => ['business_date' => $tomorrow],
            'día sin actividad del cajero' => ['business_date' => '2019-03-07'],
        ];

        foreach ($invalid as $label => $override) {
            $response = $this->actAs($admin)->postJson(self::POST, $this->body($cashier, $override));
            $response->assertStatus(422);
            $this->assertNotSame('', (string) $response->json('message'), $label);
            $this->assertSame($before, CancellationReview::withTrashed()->count(), $label);
        }

        // Un cajero sin actividad ese día tampoco se puede revisar.
        $this->actAs($admin)->postJson(self::POST, $this->body($other))->assertStatus(422)->assertJsonValidationErrors('business_date');

        // Mensajes en español.
        $this->actAs($admin)->postJson(self::POST, $this->body($cashier, ['note' => 'corta']))
            ->assertStatus(422)->assertJsonPath('message', 'La nota debe tener al menos 15 caracteres.');

        // Una nota de exactamente 15 y otra de 255 caracteres sí se aceptan; las nuevas filas lo confirman.
        $this->actAs($admin)->postJson(self::POST, $this->body($cashier, ['note' => str_repeat('a', 15)]))->assertCreated();
        $this->actAs($admin)->postJson(self::POST, $this->body($cashier, ['note' => str_repeat('b', 255)]))->assertCreated();
        // La nota se guarda recortada.
        $response = $this->actAs($admin)->postJson(self::POST, $this->body($cashier, ['note' => '   Nota con espacios alrededor.   ']))->assertCreated();
        $this->assertSame('Nota con espacios alrededor.', $response->json('data.note'));
        $this->assertSame($before + 3, CancellationReview::withTrashed()->count());

        // Un cajero eliminado lógicamente sí se puede revisar y su nombre aparece (RN-09).
        $cashier->delete();
        $this->actAs($admin)->postJson(self::POST, $this->body($cashier, ['status' => 'reviewed_ok']))->assertCreated();
    }

    /** CA-19 cancellation-review-signals */
    public function test_ca19_same_status_repeated_creates_new_history_entry(): void
    {
        [$admin, $cashier] = $this->fixture();

        $first = $this->actAs($admin)->postJson(self::POST, $this->body($cashier))->assertCreated()->json('data.id');
        $second = $this->actAs($admin)->postJson(self::POST, $this->body($cashier, ['note' => 'Segunda nota, mismo estado.']))->assertCreated()->json('data.id');

        $this->assertGreaterThan($first, $second);
        $rows = CancellationReview::where('cashier_id', $cashier->id)->where('business_date', self::DAY)->orderBy('id')->get();
        $this->assertCount(2, $rows);
        $this->assertSame(['clarification_required', 'clarification_required'], $rows->map(fn ($r) => $r->status->value)->all());

        $day = $this->dayOf($admin, $cashier);
        $this->assertSame($second, $day['review']['id']);
        $this->assertSame('Segunda nota, mismo estado.', $day['review']['note']);
    }

    /** CA-21 cancellation-review-signals */
    public function test_ca21_review_is_audited_and_rolled_back_if_audit_fails(): void
    {
        [$admin, $cashier] = $this->fixture();

        $id = $this->actAs($admin)->postJson(self::POST, $this->body($cashier))->assertCreated()->json('data.id');

        $log = Activity::query()->where('event', 'cashier-day-reviewed')->latest('id')->first();
        $this->assertNotNull($log);
        $this->assertEquals($admin->id, $log->causer_id);
        $properties = $log->properties->toArray();
        $this->assertSame($cashier->id, $properties['cashier_id']);
        $this->assertSame(self::DAY, $properties['business_date']);
        $this->assertSame('clarification_required', $properties['status']);
        $this->assertSame('El cajero debe explicar las dos cancelaciones.', $properties['note']);
        $this->assertSame($id, $properties['review_id']);
        $this->assertArrayNotHasKey('password', $properties);

        // Si el registro de auditoría falla, la fila no se guarda y la respuesta no es 201.
        $before = CancellationReview::withTrashed()->count();
        $this->mock(LogAdminActivityAction::class, fn ($mock) => $mock->shouldReceive('execute')->andThrow(new \RuntimeException('falla de auditoría')));

        $response = $this->actAs($admin)->postJson(self::POST, $this->body($cashier, ['status' => 'reviewed_ok']));

        $this->assertNotSame(201, $response->getStatusCode());
        $response->assertStatus(500);
        $this->assertSame($before, CancellationReview::withTrashed()->count());
    }

    /** CA-22 cancellation-review-signals */
    public function test_ca22_review_post_throttled_20_per_minute(): void
    {
        [$admin, $cashier] = $this->fixture();

        for ($i = 1; $i <= 20; $i++) {
            $this->actAs($admin)->postJson(self::POST, $this->body($cashier, ['note' => "Nota de revisión número {$i}."]))->assertCreated();
        }

        $this->actAs($admin)->postJson(self::POST, $this->body($cashier))->assertStatus(429);
        $this->assertSame(20, CancellationReview::where('cashier_id', $cashier->id)->count());
    }
}
