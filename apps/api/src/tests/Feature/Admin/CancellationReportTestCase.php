<?php

namespace Tests\Feature\Admin;

use App\Models\User;
use Illuminate\Support\Facades\DB;
use Tests\Feature\Tickets\TicketFeatureTestCase;

/** Apoyo de las pruebas de api-022: periodo lejano (2033) para no mezclarse con datos de arca_pruebas. */
abstract class CancellationReportTestCase extends TicketFeatureTestCase
{
    protected const WEEK = 'period=custom&from=2033-03-07&to=2033-03-13';

    protected const URL = '/api/v1/admin/reports/cancellations';

    /** Boleto cancelado `$minutes` minutos después de la venta (UTC). */
    protected function cancelledSale(User $cashier, string $purchasedUtc, int $minutes = 5, string $code = 'capture_error', ?string $comment = null, array $override = []): int
    {
        return $this->insertSale($cashier, $purchasedUtc, array_merge([
            'status' => 'cancelled',
            'cancelled_at' => date('Y-m-d H:i:s', strtotime($purchasedUtc.' UTC') + $minutes * 60),
            'cancelled_by' => $cashier->id,
            'cancellation_reason_code' => $code,
            'cancellation_reason' => $comment,
        ], $override));
    }

    /**
     * Borra los boletos de la ventana dada. Por defecto cubre marzo de 2033 y los 35 días previos (28 de histórico
     * propio + 7 de comparación con compañeros del semáforo, api-027), para que datos ajenos no alteren los niveles.
     */
    protected function clean(string $fromUtc = '2033-01-20 00:00:00', string $toUtc = '2033-03-31 00:00:00'): void
    {
        // Salvaguarda: el borrado físico solo es seguro dentro de la transacción de la prueba (se revierte al terminar).
        $this->assertGreaterThan(0, DB::transactionLevel(), 'clean() exige DatabaseTransactions: nunca borres fuera de la transacción.');

        DB::table('tickets')->whereBetween('purchased_at', [$fromUtc, $toUtc])->delete();
    }

    protected function report(User $admin, string $query = self::WEEK): array
    {
        return $this->actAs($admin)->getJson(self::URL.'?'.$query)->assertOk()->json('data');
    }
}
