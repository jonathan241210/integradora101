<?php

namespace Tests\Feature\Tickets;

use App\Models\Ticket;
use App\Models\User;
use Carbon\CarbonImmutable;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Spatie\Activitylog\Models\Activity;
use Tests\Concerns\CreatesAdministrators;
use Tests\FeatureTestCase;

abstract class TicketFeatureTestCase extends FeatureTestCase
{
    use CreatesAdministrators;

    protected function tearDown(): void
    {
        CarbonImmutable::setTestNow();
        Carbon::setTestNow();
        parent::tearDown();
    }

    protected function actAs(User $user): static
    {
        Auth::forgetGuards();

        return $this->actingAs($user, 'web');
    }

    /** Sustituye los precios dentro de la transacción de la prueba (se revierte al terminar). */
    protected function setPrices(User $creator, string $adult = '25.00', string $child = '16.00', string $effectiveAt = '2020-01-01 00:00:00'): void
    {
        // Salvaguarda: el borrado solo es válido dentro de la transacción de DatabaseTransactions,
        // que lo revierte al terminar la prueba; fuera de ella borraría precios reales de arca_pruebas.
        $this->assertGreaterThan(0, DB::transactionLevel(), 'setPrices debe ejecutarse dentro de la transacción de la prueba.');
        DB::table('ticket_prices')->delete();
        $this->addPrice($creator, 'adult', $adult, $effectiveAt);
        $this->addPrice($creator, 'child', $child, $effectiveAt);
    }

    protected function addPrice(User $creator, string $type, string $amount, string $effectiveAt): int
    {
        return DB::table('ticket_prices')->insertGetId([
            'ticket_type' => $type,
            'amount' => $amount,
            'effective_at' => $effectiveAt,
            'created_by' => $creator->id,
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    }

    protected function sell(User $cashier, int $adults = 1, int $children = 0): array
    {
        return $this->actAs($cashier)->postJson('/api/v1/admin/tickets', [
            'adult_quantity' => $adults,
            'child_quantity' => $children,
        ])->assertCreated()->json('data');
    }

    /** Inserta un boleto completado (purchased_at en UTC). */
    protected function insertSale(?User $cashier, string $purchasedAtUtc, array $override = []): int
    {
        return DB::table('tickets')->insertGetId(array_merge([
            'adult_quantity' => 1,
            'child_quantity' => 0,
            'status' => 'completed',
            'payment_method' => 'cash',
            'adult_unit_price' => '25.00',
            'child_unit_price' => '16.00',
            'total_amount' => '25.00',
            'purchased_at' => $purchasedAtUtc,
            'qr_code' => 'QR-'.bin2hex(random_bytes(10)),
            'cashier_id' => $cashier?->id,
        ], $override));
    }

    protected function ticketCount(): int
    {
        return Ticket::withTrashed()->count();
    }

    protected function activityCount(string $event): int
    {
        return Activity::query()->where('log_name', 'admin')->where('event', $event)->count();
    }

    protected function at(string $utc): CarbonImmutable
    {
        return CarbonImmutable::parse($utc, 'UTC');
    }
}
