<?php

namespace Tests\Feature\Tickets;

use App\Models\Ticket;
use App\Models\TicketPrice;
use Illuminate\Support\Facades\DB;
use Spatie\Activitylog\Models\Activity;

class TicketAuditTest extends TicketFeatureTestCase
{
    public function test_ca28_ticket_sales_audits_sale_cancellation_and_price_change_without_secrets(): void
    {
        $admin = $this->createAccount('admin');
        $cashier = $this->createAccount('cashier', false);
        $this->setPrices($admin, '25.00', '16.00');

        $sale = $this->sell($cashier, 2, 1);
        $this->actAs($cashier)->postJson("/api/v1/admin/tickets/{$sale['folio']}/cancel", ['reason' => 'Motivo auditado'])->assertOk();
        $this->actAs($admin)->postJson('/api/v1/admin/ticket-prices', ['adult_amount' => 30, 'child_amount' => 20, 'mode' => 'immediate'])->assertCreated();

        $sold = Activity::query()->where('event', 'ticket-sold')->where('causer_id', $cashier->id)->latest('id')->firstOrFail();
        $this->assertSame(Ticket::class, $sold->subject_type);
        $this->assertSame((int) $sale['folio'], (int) $sold->subject_id);
        $this->assertSame('66.00', $sold->properties['total_amount']);

        $cancelled = Activity::query()->where('event', 'ticket-cancelled')->where('causer_id', $cashier->id)->latest('id')->firstOrFail();
        $this->assertSame((int) $sale['folio'], (int) $cancelled->subject_id);
        $this->assertSame('Motivo auditado', $cancelled->properties['reason']);
        $this->assertSame('66.00', $cancelled->properties['total_amount']);

        $changes = Activity::query()->where('event', 'ticket-price-changed')->where('causer_id', $admin->id)->get();
        $this->assertCount(2, $changes);
        $this->assertSame(TicketPrice::class, $changes[0]->subject_type);
        $this->assertEqualsCanonicalizing(['30.00', '20.00'], $changes->pluck('properties.amount')->all());

        $token = DB::table('tickets')->where('id', $sale['folio'])->value('qr_code');
        foreach ([$sold, $cancelled, ...$changes] as $activity) {
            $json = json_encode($activity->properties);
            foreach (['password', 'qr_code', 'qr_svg', '<svg', $token] as $forbidden) {
                $this->assertStringNotContainsString($forbidden, $json);
            }
        }
    }
}
