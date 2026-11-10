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

        $purchase = $this->sellPurchase($cashier, 2, 1);
        $sale = $purchase['tickets'][0];
        $this->actAs($cashier)->postJson("/api/v1/admin/tickets/{$sale['folio']}/cancel", ['reason' => 'Motivo auditado'])->assertOk();
        $this->actAs($admin)->postJson('/api/v1/admin/ticket-prices', ['adult_amount' => 30, 'child_amount' => 20, 'mode' => 'immediate'])->assertCreated();

        $sold = Activity::query()->where('event', 'ticket-sold')->where('causer_id', $cashier->id)->where('subject_id', $sale['folio'])->firstOrFail();
        $this->assertSame(Ticket::class, $sold->subject_type);
        $this->assertSame((int) $sale['folio'], (int) $sold->subject_id);
        $this->assertSame('25.00', $sold->properties['total_amount']);

        $cancelled = Activity::query()->where('event', 'ticket-cancelled')->where('causer_id', $cashier->id)->latest('id')->firstOrFail();
        $this->assertSame((int) $sale['folio'], (int) $cancelled->subject_id);
        $this->assertSame('Motivo auditado', $cancelled->properties['reason']);
        $this->assertSame('25.00', $cancelled->properties['total_amount']);

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

    public function test_ca53_ticket_sales_one_ticket_sold_event_per_ticket_without_qr(): void
    {
        $cashier = $this->createAccount('cashier', false);
        $this->setPrices($cashier, '25.00', '16.00');
        $logs = $this->activityCount('ticket-sold');

        $purchase = $this->sellPurchase($cashier, 1, 3);
        $folios = array_column($purchase['tickets'], 'folio');

        $this->assertSame($logs + 4, $this->activityCount('ticket-sold'));
        $events = Activity::query()->where('event', 'ticket-sold')->where('subject_type', Ticket::class)->whereIn('subject_id', $folios)->orderBy('subject_id')->get();
        $this->assertCount(4, $events);
        $this->assertSame(['adult', 'child', 'child', 'child'], $events->pluck('properties.ticket_type')->all());
        $this->assertSame(['25.00', '16.00', '16.00', '16.00'], $events->pluck('properties.unit_price')->all());
        $tokens = DB::table('tickets')->whereIn('id', $folios)->pluck('qr_code')->all();
        foreach ($events as $event) {
            $this->assertSame($cashier->id, (int) $event->causer_id);
            $json = json_encode($event->properties);
            foreach (['qr_code', 'qr_svg', '<svg', ...$tokens] as $forbidden) {
                $this->assertStringNotContainsString($forbidden, $json);
            }
        }
    }
}
