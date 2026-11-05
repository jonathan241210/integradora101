<?php

namespace Tests\Feature\Tickets;

use Illuminate\Support\Facades\DB;

class TicketHistoryTest extends TicketFeatureTestCase
{
    public function test_ca14_ticket_sales_history_is_paginated_descending_with_cancelled_and_filters(): void
    {
        $cashier = $this->createAccount('cashier', false);
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
        $this->assertSame(['folio', 'purchased_at', 'adult_quantity', 'child_quantity', 'total_amount', 'status', 'cancelled_at', 'cancellation_reason', 'cashier_name', 'cancellable'], array_keys($rows[$newest]));

        $this->assertSame([$middle], array_column($this->actAs($cashier)->getJson('/api/v1/admin/tickets?status=cancelled')->json('data'), 'folio'));
        $this->assertSame([$oldest], array_column($this->actAs($cashier)->getJson("/api/v1/admin/tickets?folio={$oldest}")->json('data'), 'folio'));
        $this->assertSame([$middle], array_column($this->actAs($cashier)->getJson('/api/v1/admin/tickets?from=2026-10-10&to=2026-10-20&timezone=UTC')->json('data'), 'folio'));
        $this->actAs($cashier)->getJson('/api/v1/admin/tickets?status=otro')->assertStatus(422);
        $this->actAs($cashier)->getJson('/api/v1/admin/tickets?from=2026-10-20&to=2026-10-10')->assertStatus(422);
    }

    public function test_ca14_ticket_sales_history_computes_cancellable_on_the_server(): void
    {
        $cashier = $this->createAccount('cashier', false);
        $today = $this->insertSale($cashier, '2026-11-01 15:00:00');
        $yesterday = $this->insertSale($cashier, '2026-10-31 15:00:00');
        $cancelled = $this->insertSale($cashier, '2026-11-01 14:00:00', ['status' => 'cancelled']);
        $this->travelTo($this->at('2026-11-01 20:00:00'));

        $rows = collect($this->actAs($cashier)->getJson('/api/v1/admin/tickets?timezone=America/Mexico_City')->json('data'))->keyBy('folio');
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
        $cashier = $this->createAccount('cashier', false);
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
}
