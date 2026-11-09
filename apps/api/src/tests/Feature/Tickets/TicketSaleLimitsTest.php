<?php

namespace Tests\Feature\Tickets;

use App\Models\Ticket;

class TicketSaleLimitsTest extends TicketFeatureTestCase
{
    public function test_ca42_ticket_sales_maximum_50_in_total(): void
    {
        $cashier = $this->createAccount('cashier', false);
        $this->setPrices($cashier);
        $max = (int) config('arca.ticket_sale_max_tickets');
        $this->assertSame(50, $max);
        $message = "No puedes vender más de {$max} boletos en una misma venta.";

        $this->actAs($cashier)->postJson('/api/v1/admin/tickets', ['adult_quantity' => 50, 'child_quantity' => 0])->assertCreated();
        $this->actAs($cashier)->postJson('/api/v1/admin/tickets', ['adult_quantity' => 29, 'child_quantity' => 21])->assertCreated();
        $tickets = $this->ticketCount();
        $logs = $this->activityCount('ticket-sold');

        foreach ([[51, 0], [0, 51], [30, 21], [100000, 100000]] as [$adults, $children]) {
            $this->actAs($cashier)->postJson('/api/v1/admin/tickets', ['adult_quantity' => $adults, 'child_quantity' => $children])
                ->assertStatus(422)
                ->assertJsonPath('errors.adult_quantity.0', $message);
        }

        // El valor sale de la configuración, no de un literal.
        config(['arca.ticket_sale_max_tickets' => 3]);
        $this->actAs($cashier)->postJson('/api/v1/admin/tickets', ['adult_quantity' => 2, 'child_quantity' => 2])
            ->assertStatus(422)->assertJsonPath('errors.adult_quantity.0', 'No puedes vender más de 3 boletos en una misma venta.');

        $this->assertSame($tickets, $this->ticketCount());
        $this->assertSame($logs, $this->activityCount('ticket-sold'));
    }

    public function test_ca02_ticket_sales_total_above_999999_99_is_422_without_side_effects(): void
    {
        $cashier = $this->createAccount('cashier', false);
        $this->setPrices($cashier, '20000.00', '16.00');
        $tickets = $this->ticketCount();
        $logs = $this->activityCount('ticket-sold');

        // 50 x 20,000.00 = 1,000,000.00 supera el tope de DECIMAL(8,2).
        $this->actAs($cashier)->postJson('/api/v1/admin/tickets', ['adult_quantity' => 50, 'child_quantity' => 0])
            ->assertStatus(422)
            ->assertJsonPath('errors.adult_quantity.0', 'El total de la venta excede el importe máximo permitido.');
        $this->assertSame($tickets, $this->ticketCount());
        $this->assertSame($logs, $this->activityCount('ticket-sold'));

        // Un total por debajo del tope (50 x 19,999.99 = 999,999.50) sigue admitiéndose.
        $this->setPrices($cashier, '19999.99', '1.00');
        $this->actAs($cashier)->postJson('/api/v1/admin/tickets', ['adult_quantity' => 50, 'child_quantity' => 0])
            ->assertCreated()
            ->assertJsonPath('data.total_amount', '999999.50');
    }

    public function test_ca43_ticket_sales_limit_of_60_per_minute(): void
    {
        $cashier = $this->createAccount('cashier', false);
        $this->setPrices($cashier);
        // Reloj congelado: con una base lenta las 60 peticiones podrían rebasar la ventana de un minuto.
        $this->freezeTime();

        $this->actAs($cashier)->postJson('/api/v1/admin/tickets', ['adult_quantity' => 1, 'child_quantity' => 0])->assertCreated();
        // Las solicitudes rechazadas por validación (422) también cuentan: 59 más completan las 60 del minuto.
        for ($i = 0; $i < 59; $i++) {
            $this->actAs($cashier)->postJson('/api/v1/admin/tickets', [])->assertStatus(422);
        }
        $tickets = $this->ticketCount();

        $response = $this->actAs($cashier)->postJson('/api/v1/admin/tickets', ['adult_quantity' => 1, 'child_quantity' => 0])
            ->assertStatus(429);
        $this->assertMatchesRegularExpression('/^Demasiados intentos\. Intenta de nuevo en \d+ segundos\.$/', $response->json('message'));
        $this->assertSame($tickets, $this->ticketCount());

        // La cuota es por usuario: otro cajero no queda limitado.
        $another = $this->createAccount('cashier', false);
        $this->actAs($another)->postJson('/api/v1/admin/tickets', ['adult_quantity' => 1, 'child_quantity' => 0])->assertCreated();

        // Tras el minuto, la cuota se renueva.
        $this->travel(61)->seconds();
        $this->actAs($cashier)->postJson('/api/v1/admin/tickets', ['adult_quantity' => 1, 'child_quantity' => 0])->assertCreated();
    }

    public function test_ca43_ticket_sales_a_403_does_not_consume_quota(): void
    {
        $admin = $this->createAccount('admin');
        for ($i = 0; $i < 65; $i++) {
            $this->actAs($admin)->postJson('/api/v1/admin/tickets', ['adult_quantity' => 1, 'child_quantity' => 0])->assertForbidden();
        }
        $this->assertSame(0, Ticket::query()->where('cashier_id', $admin->id)->count());
    }
}
