<?php

namespace Tests\Feature\Tickets;

use Illuminate\Support\Facades\Auth;
use Spatie\Permission\Models\Role;

class CreateTicketSaleAccessTest extends TicketFeatureTestCase
{
    public function test_ca06_ticket_sales_only_cashier_may_sell(): void
    {
        $cashier = $this->createAccount('cashier', false);
        $this->setPrices($cashier);
        $tickets = $this->ticketCount();

        foreach (['admin', 'zoo-admin', 'executive', 'veterinarian'] as $role) {
            $this->actAs($this->createAccount($role))
                ->postJson('/api/v1/admin/tickets', ['adult_quantity' => 1, 'child_quantity' => 0])
                ->assertForbidden();
        }

        Auth::forgetGuards();
        $this->app['auth']->shouldUse('web');
        $this->postJson('/api/v1/admin/tickets', ['adult_quantity' => 1, 'child_quantity' => 0])->assertUnauthorized();

        $this->assertSame($tickets, $this->ticketCount());
    }

    public function test_ca06_ticket_sales_permission_matrix_matches_the_approved_roles(): void
    {
        $this->seedRoles();
        $has = fn (string $role, string $permission) => Role::findByName($role, 'web')->hasPermissionTo($permission);

        foreach (['tickets.create', 'tickets.cancel', 'tickets.view'] as $permission) {
            $this->assertTrue($has('cashier', $permission), "cashier sin {$permission}");
        }
        foreach (['admin', 'zoo-admin', 'executive', 'veterinarian'] as $role) {
            $this->assertFalse($has($role, 'tickets.create'), "{$role} no debe vender");
            $this->assertFalse($has($role, 'tickets.cancel'), "{$role} no debe cancelar");
        }
        $this->assertTrue($has('admin', 'ticket-prices.manage'));
        foreach (['cashier', 'zoo-admin', 'executive', 'veterinarian'] as $role) {
            $this->assertFalse($has($role, 'ticket-prices.manage'), "{$role} no debe cambiar precios");
        }
        $this->assertTrue($has('admin', 'tickets.view'));
        $this->assertTrue($has('zoo-admin', 'tickets.view'));
    }
}
