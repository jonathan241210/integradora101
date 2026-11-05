<?php

namespace Tests\Feature\Tickets;

use App\Models\Ticket;

class CancelTicketAccessTest extends TicketFeatureTestCase
{
    public function test_ca13_ticket_sales_roles_without_permission_get_403_and_foreign_ticket_gets_404(): void
    {
        $owner = $this->createAccount('cashier', false);
        $other = $this->createAccount('cashier', false);
        $this->setPrices($owner);
        $sale = $this->sell($owner);
        $url = "/api/v1/admin/tickets/{$sale['folio']}/cancel";

        foreach (['admin', 'zoo-admin', 'executive', 'veterinarian'] as $role) {
            $this->actAs($this->createAccount($role))->postJson($url, ['reason' => 'Intento'])->assertForbidden();
        }

        $this->actAs($other)->postJson($url, ['reason' => 'Ajeno'])
            ->assertNotFound()
            ->assertJsonPath('message', 'Boleto no encontrado.');
        // El 404 de alcance va antes que el 422 de motivo vacío (RN-16).
        $this->actAs($other)->postJson($url, [])->assertNotFound();
        $this->actAs($owner)->postJson('/api/v1/admin/tickets/999999999/cancel', ['reason' => 'X'])
            ->assertNotFound()
            ->assertJsonPath('message', 'Boleto no encontrado.');
        $this->actAs($owner)->postJson('/api/v1/admin/tickets/abc/cancel', ['reason' => 'X'])->assertNotFound();

        $this->assertSame('completed', Ticket::query()->findOrFail($sale['folio'])->status);
    }
}
