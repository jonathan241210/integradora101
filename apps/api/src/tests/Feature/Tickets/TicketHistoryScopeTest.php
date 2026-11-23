<?php

namespace Tests\Feature\Tickets;

class TicketHistoryScopeTest extends TicketFeatureTestCase
{
    public function test_ca15_ticket_sales_cashier_sees_only_own_tickets_and_filters_cannot_widen_scope(): void
    {
        $mine = $this->createAccount('cashier');
        $theirs = $this->createAccount('cashier');
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
        $one = $this->createAccount('cashier');
        $two = $this->createAccount('cashier');
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

    /** CA-08 api-023: la lectura total depende del permiso `tickets.view-all`, no del nombre del rol. */
    public function test_ca08_view_all_permission_scope_for_history(): void
    {
        $one = $this->createAccount('cashier');
        $two = $this->createAccount('cashier');
        // Día lejano: arca_pruebas trae cientos de boletos demo recientes que desplazarían estos de la primera página.
        $a = $this->insertSale($one, '2036-01-01 15:00:00');
        $b = $this->insertSale($two, '2036-01-01 16:00:00');
        $folios = fn ($user) => array_column($this->actAs($user)->getJson('/api/v1/admin/tickets?per_page=100&from=2036-01-01&to=2036-01-01')->assertOk()->json('data'), 'folio');

        foreach (['admin', 'zoo-admin'] as $role) {
            $all = $folios($this->createAccount($role));
            $this->assertContains($a, $all, $role);
            $this->assertContains($b, $all, $role);
        }

        $own = $folios($one);
        $this->assertContains($a, $own);
        $this->assertNotContains($b, $own);

        foreach (['executive', 'communications', 'veterinarian'] as $role) {
            $this->actAs($this->createAccount($role))->getJson('/api/v1/admin/tickets')->assertForbidden();
        }

        // Una cuenta con `tickets.view` y el permiso nuevo ve todo aunque no tenga un rol de lectura total.
        $custom = $this->createAccount('cashier');
        $custom->givePermissionTo('tickets.view-all');
        $this->assertContains($b, $folios($custom));
    }
}
