<?php

namespace Tests\Feature\Tickets;

class TicketHistoryScopeTest extends TicketFeatureTestCase
{
    public function test_ca15_ticket_sales_cashier_sees_only_own_tickets_and_filters_cannot_widen_scope(): void
    {
        $mine = $this->createAccount('cashier', false);
        $theirs = $this->createAccount('cashier', false);
        $own = $this->insertSale($mine, '2026-11-01 15:00:00');
        $foreign = $this->insertSale($theirs, '2026-11-01 16:00:00');

        $folios = fn (string $query = '') => array_column($this->actAs($mine)->getJson('/api/v1/admin/tickets?per_page=100'.$query)->assertOk()->json('data'), 'folio');

        $this->assertContains($own, $folios());
        $this->assertNotContains($foreign, $folios());
        $this->assertNotContains($foreign, $folios("&cashier_id={$theirs->id}"));
        $this->assertNotContains($foreign, $folios("&folio={$foreign}"));
    }

    public function test_ca15_ticket_sales_admin_and_zoo_admin_read_all_tickets_and_other_roles_are_denied(): void
    {
        $one = $this->createAccount('cashier', false);
        $two = $this->createAccount('cashier', false);
        $a = $this->insertSale($one, '2026-11-01 15:00:00');
        $b = $this->insertSale($two, '2026-11-01 16:00:00');

        foreach (['admin', 'zoo-admin'] as $role) {
            $viewer = $this->createAccount($role);
            $this->assertSame([$a], array_column($this->actAs($viewer)->getJson("/api/v1/admin/tickets?folio={$a}")->assertOk()->json('data'), 'folio'), $role);
            $this->assertSame([$b], array_column($this->actAs($viewer)->getJson("/api/v1/admin/tickets?folio={$b}")->assertOk()->json('data'), 'folio'), $role);
        }
        foreach (['executive', 'veterinarian'] as $role) {
            $this->actAs($this->createAccount($role))->getJson('/api/v1/admin/tickets')->assertForbidden();
        }
    }
}
