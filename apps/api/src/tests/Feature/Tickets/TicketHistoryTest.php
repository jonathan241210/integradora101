<?php

namespace Tests\Feature\Tickets;

use Illuminate\Support\Facades\DB;

class TicketHistoryTest extends TicketFeatureTestCase
{
    public function test_ca14_ticket_sales_history_is_paginated_descending_with_cancelled_and_filters(): void
    {
        $cashier = $this->createAccount('cashier');
        DB::table('tickets')->where('cashier_id', $cashier->id)->delete();
        $oldest = $this->insertSale($cashier, '2026-10-01 15:00:00');
        $middle = $this->insertSale($cashier, '2026-10-15 15:00:00', ['status' => 'cancelled', 'cancelled_at' => '2026-10-15 16:00:00', 'cancelled_by' => $cashier->id, 'cancellation_reason' => 'Motivo X']);
        $newest = $this->insertSale($cashier, '2026-11-01 15:00:00');
        $this->travelTo($this->at('2026-11-01 20:00:00'));

        $response = $this->actAs($cashier)->getJson('/api/v1/admin/tickets?per_page=2')->assertOk();
        $this->assertSame([$newest, $middle], array_column($response->json('data'), 'folio'));
        $this->assertSame(3, $response->json('meta.total'));
        $this->assertSame(2, $response->json('meta.per_page'));

        $rows = collect($this->actAs($cashier)->getJson('/api/v1/admin/tickets')->json('data'))->keyBy('folio');
        $this->assertSame('cancelled', $rows[$middle]['status']);
        $this->assertSame('Motivo X', $rows[$middle]['cancellation_reason']);
        $this->assertSame('2026-10-15T16:00:00Z', $rows[$middle]['cancelled_at']);
        $this->assertSame(['folio', 'purchased_at', 'adult_quantity', 'child_quantity', 'total_amount', 'status', 'cancelled_at', 'cancellation_reason_code', 'cancellation_reason_label', 'cancellation_reason', 'cashier_name', 'cancellable'], array_keys($rows[$newest]));

        $this->assertSame([$middle], array_column($this->actAs($cashier)->getJson('/api/v1/admin/tickets?status=cancelled')->json('data'), 'folio'));
        $this->assertSame([$oldest], array_column($this->actAs($cashier)->getJson("/api/v1/admin/tickets?folio={$oldest}")->json('data'), 'folio'));
        $this->assertSame([$middle], array_column($this->actAs($cashier)->getJson('/api/v1/admin/tickets?from=2026-10-10&to=2026-10-20')->json('data'), 'folio'));
        $this->actAs($cashier)->getJson('/api/v1/admin/tickets?status=otro')->assertStatus(422);
        $this->actAs($cashier)->getJson('/api/v1/admin/tickets?from=2026-10-20&to=2026-10-10')->assertStatus(422);
    }

    /** CA-26 ticket-cancellation-report: el historial muestra etiqueta y comentario; sin código, «Sin clasificar (anterior)». */
    public function test_ca26_history_shows_label_and_comment(): void
    {
        $cashier = $this->createAccount('cashier');
        DB::table('tickets')->where('cashier_id', $cashier->id)->delete();
        $coded = $this->insertSale($cashier, '2026-10-15 15:00:00', ['status' => 'cancelled', 'cancelled_at' => '2026-10-15 16:00:00', 'cancelled_by' => $cashier->id, 'cancellation_reason_code' => 'duplicate_charge', 'cancellation_reason' => 'Cobro repetido']);
        $legacy = $this->insertSale($cashier, '2026-10-16 15:00:00', ['status' => 'cancelled', 'cancelled_at' => '2026-10-16 16:00:00', 'cancelled_by' => $cashier->id, 'cancellation_reason' => 'Texto anterior']);
        $done = $this->insertSale($cashier, '2026-10-17 15:00:00');
        $this->travelTo($this->at('2026-11-01 20:00:00'));

        $rows = collect($this->actAs($cashier)->getJson('/api/v1/admin/tickets')->assertOk()->json('data'))->keyBy('folio');

        $this->assertSame('duplicate_charge', $rows[$coded]['cancellation_reason_code']);
        $this->assertSame('Cobro duplicado', $rows[$coded]['cancellation_reason_label']);
        $this->assertSame('Cobro repetido', $rows[$coded]['cancellation_reason']);
        $this->assertNull($rows[$legacy]['cancellation_reason_code']);
        $this->assertSame('Sin clasificar (anterior)', $rows[$legacy]['cancellation_reason_label']);
        $this->assertSame('Texto anterior', $rows[$legacy]['cancellation_reason']);
        $this->assertNull($rows[$done]['cancellation_reason_label']);
    }

    public function test_ca14_ticket_sales_history_computes_cancellable_on_the_server(): void
    {
        $cashier = $this->createAccount('cashier');
        $today = $this->insertSale($cashier, '2026-11-01 15:00:00');
        $yesterday = $this->insertSale($cashier, '2026-10-31 15:00:00');
        $cancelled = $this->insertSale($cashier, '2026-11-01 14:00:00', ['status' => 'cancelled']);
        $this->travelTo($this->at('2026-11-01 20:00:00'));

        $rows = collect($this->actAs($cashier)->getJson('/api/v1/admin/tickets')->json('data'))->keyBy('folio');
        $this->assertTrue($rows[$today]['cancellable']);
        $this->assertFalse($rows[$yesterday]['cancellable']);
        $this->assertFalse($rows[$cancelled]['cancellable']);

        // Un admin ve el boleto del día pero no puede cancelarlo.
        $admin = $this->createAccount('admin');
        $adminRow = $this->actAs($admin)->getJson("/api/v1/admin/tickets?folio={$today}")->json('data.0');
        $this->assertSame($today, $adminRow['folio']);
        $this->assertFalse($adminRow['cancellable']);
    }

    public function test_ca16_ticket_sales_history_never_exposes_qr_code_or_svg(): void
    {
        $cashier = $this->createAccount('cashier');
        $this->setPrices($cashier);
        $this->sell($cashier);
        $this->insertSale($cashier, '2026-10-01 15:00:00', ['qr_code' => 'SECRET-TOKEN-VALUE']);

        $response = $this->actAs($cashier)->getJson('/api/v1/admin/tickets')->assertOk();
        $this->assertNotEmpty($response->json('data'));
        foreach ($response->json('data') as $row) {
            $this->assertArrayNotHasKey('qr_code', $row);
            $this->assertArrayNotHasKey('qr_svg', $row);
        }
        $this->assertStringNotContainsString('SECRET-TOKEN-VALUE', $response->getContent());
        $this->assertStringNotContainsString('<svg', $response->getContent());
    }

    /** CA-06 single-business-timezone */
    public function test_ca06_history_filters_by_business_day(): void
    {
        $cashier = $this->createAccount('cashier');
        $folio = $this->insertSale($cashier, '2026-11-07 05:30:00'); // 6 nov 23:30 local
        $this->travelTo($this->at('2026-11-07 05:45:00'));

        foreach ([null, 'UTC', 'Asia/Tokyo'] as $zone) {
            $extra = $zone === null ? '' : '&timezone='.urlencode($zone);
            $day6 = $this->actAs($cashier)->getJson("/api/v1/admin/tickets?folio={$folio}&from=2026-11-06&to=2026-11-06{$extra}")->assertOk();
            $this->assertSame([$folio], array_column($day6->json('data'), 'folio'));
            $day7 = $this->actAs($cashier)->getJson("/api/v1/admin/tickets?folio={$folio}&from=2026-11-07&to=2026-11-07{$extra}")->assertOk();
            $this->assertSame([], $day7->json('data'));
        }
    }

    /** CA-12 single-business-timezone */
    public function test_ca12_history_exposes_timezone(): void
    {
        $cashier = $this->createAccount('cashier');
        $this->actAs($cashier)->getJson('/api/v1/admin/tickets')->assertOk()->assertJsonPath('timezone', 'America/Mexico_City');

        config(['arca.timezone' => 'UTC']);
        $this->actAs($cashier)->getJson('/api/v1/admin/tickets')->assertOk()->assertJsonPath('timezone', 'UTC');
    }
}
