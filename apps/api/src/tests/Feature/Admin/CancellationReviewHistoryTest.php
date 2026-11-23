<?php

namespace Tests\Feature\Admin;

use App\Models\CancellationReview;
use Illuminate\Support\Facades\DB;

/** api-027: historial append-only y revisión vigente en el semáforo. */
class CancellationReviewHistoryTest extends CancellationReviewTestCase
{
    private const REVIEWS = '/api/v1/admin/reports/cancellations/reviews';

    private function submit(object $admin, object $cashier, string $status, string $note): int
    {
        return $this->actAs($admin)->postJson(self::REVIEWS, [
            'cashier_id' => $cashier->id, 'business_date' => self::DAY, 'status' => $status, 'note' => $note,
        ])->assertCreated()->json('data.id');
    }

    private function history(object $admin, object $cashier, string $date = self::DAY): array
    {
        return $this->actAs($admin)->getJson(self::REVIEWS."?cashier_id={$cashier->id}&business_date={$date}")->assertOk()->json('data');
    }

    private function fixture(): array
    {
        $admin = $this->createAccount('admin', true, ['first_name' => 'Presidencia']);
        $cashier = $this->createAccount('cashier', true, ['first_name' => 'Laura']);
        $this->wipe();
        $this->attentionDay($cashier, self::DAY);

        return [$admin, $cashier];
    }

    /** CA-20 cancellation-review-signals: aclaración, luego nueva nota y luego «Todo en orden». */
    public function test_ca20_history_newest_first_and_no_row_changed(): void
    {
        [$admin, $cashier] = $this->fixture();

        $this->assertSame([], $this->history($admin, $cashier));

        $one = $this->submit($admin, $cashier, 'clarification_required', 'Pide explicar las dos cancelaciones «Otro».');
        $afterFirst = DB::table('cancellation_reviews')->where('id', $one)->first();
        $two = $this->submit($admin, $cashier, 'clarification_required', 'El cajero aún no responde; se insiste mañana.');
        $three = $this->submit($admin, $cashier, 'reviewed_ok', 'El cajero explicó y el dinero entregado coincide.');

        $history = $this->history($admin, $cashier);
        $this->assertSame([$three, $two, $one], array_column($history, 'id'));
        $this->assertSame(['reviewed_ok', 'clarification_required', 'clarification_required'], array_column($history, 'status'));
        $this->assertSame(['Revisado: todo en orden', 'Requiere aclaración', 'Requiere aclaración'], array_column($history, 'status_label'));

        // Las filas anteriores no cambian al crear una nueva.
        $this->assertEquals($afterFirst, DB::table('cancellation_reviews')->where('id', $one)->first());
        $this->assertSame(3, CancellationReview::where('cashier_id', $cashier->id)->count());

        // La historia es por cajero y día: otro día no la ve.
        $this->assertSame([], $this->history($admin, $cashier, '2019-03-07'));

        // El historial exige sus dos parámetros.
        $this->actAs($admin)->getJson(self::REVIEWS)->assertStatus(422);
    }

    /** CA-28 cancellation-review-signals */
    public function test_ca28_traffic_light_shows_current_review_or_null(): void
    {
        [$admin, $cashier] = $this->fixture();

        $this->assertNull($this->dayOf($admin, $cashier)['review']);

        $this->submit($admin, $cashier, 'clarification_required', 'Pide explicar las dos cancelaciones «Otro».');
        $review = $this->dayOf($admin, $cashier)['review'];
        $this->assertSame(['id', 'status', 'status_label', 'note', 'reviewed_by_name', 'reviewed_at'], array_keys($review));
        $this->assertSame('Requiere aclaración', $review['status_label']);
        $this->assertSame('Presidencia Prueba', $review['reviewed_by_name']);

        $this->submit($admin, $cashier, 'reviewed_ok', 'El cajero explicó y el dinero entregado coincide.');
        $review = $this->dayOf($admin, $cashier)['review'];
        $this->assertSame('reviewed_ok', $review['status']);
        $this->assertSame('Revisado: todo en orden', $review['status_label']);
        $this->assertSame('El cajero explicó y el dinero entregado coincide.', $review['note']);

        // La revisión no cambia el nivel del semáforo ni bloquea nada.
        $this->assertSame('attention', $this->dayOf($admin, $cashier)['traffic_light']);

        // Un día sin revisión sigue en null aunque otro día del mismo cajero tenga una.
        $this->normalDay($cashier, '2019-03-07');
        $this->assertNull($this->dayOf($admin, $cashier, '2019-03-07')['review']);
    }
}
