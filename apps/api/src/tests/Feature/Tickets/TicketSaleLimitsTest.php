<?php

namespace Tests\Feature\Tickets;

use App\Models\Ticket;

class TicketSaleLimitsTest extends TicketFeatureTestCase
{
    private const MAX_MESSAGE = 'No puedes vender más de 100 boletos de cada tipo en una misma venta.';

    public function test_ca42_ticket_sales_maximo_100_por_tipo(): void
    {
        $cashier = $this->createAccount('cashier', false);
        $this->setPrices($cashier);

        $this->actAs($cashier)->postJson('/api/v1/admin/tickets', ['adult_quantity' => 100, 'child_quantity' => 0])->assertCreated();
        $this->actAs($cashier)->postJson('/api/v1/admin/tickets', ['adult_quantity' => 0, 'child_quantity' => 100])->assertCreated();
        $tickets = $this->ticketCount();
        $logs = $this->activityCount('ticket-sold');

        $this->actAs($cashier)->postJson('/api/v1/admin/tickets', ['adult_quantity' => 101, 'child_quantity' => 0])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['adult_quantity'], 'errors')
            ->assertJsonPath('errors.adult_quantity.0', self::MAX_MESSAGE);
        $this->actAs($cashier)->postJson('/api/v1/admin/tickets', ['adult_quantity' => 0, 'child_quantity' => 101])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['child_quantity'], 'errors')
            ->assertJsonPath('errors.child_quantity.0', self::MAX_MESSAGE);
        $this->actAs($cashier)->postJson('/api/v1/admin/tickets', ['adult_quantity' => 100000, 'child_quantity' => 100000])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['adult_quantity', 'child_quantity'], 'errors');

        $this->assertSame($tickets, $this->ticketCount());
        $this->assertSame($logs, $this->activityCount('ticket-sold'));
    }

    public function test_ca02_ticket_sales_total_above_999999_99_is_422_without_side_effects(): void
    {
        $cashier = $this->createAccount('cashier', false);
        $this->setPrices($cashier, '10000.00', '16.00');
        $tickets = $this->ticketCount();
        $logs = $this->activityCount('ticket-sold');

        // 100 x 10,000.00 = 1,000,000.00 supera el tope de DECIMAL(8,2).
        $this->actAs($cashier)->postJson('/api/v1/admin/tickets', ['adult_quantity' => 100, 'child_quantity' => 0])
            ->assertStatus(422)
            ->assertJsonPath('errors.adult_quantity.0', 'El total de la venta excede el importe máximo permitido.');
        $this->assertSame($tickets, $this->ticketCount());
        $this->assertSame($logs, $this->activityCount('ticket-sold'));

        // Un total por debajo del tope (100 x 9,999.99 = 999,999.00) sigue admitiéndose.
        $this->setPrices($cashier, '9999.99', '1.00');
        $this->actAs($cashier)->postJson('/api/v1/admin/tickets', ['adult_quantity' => 100, 'child_quantity' => 0])
            ->assertCreated()
            ->assertJsonPath('data.total_amount', '999999.00');
    }

    public function test_ca43_ticket_sales_limite_de_60_por_minuto(): void
    {
        $cashier = $this->createAccount('cashier', false);
        $this->setPrices($cashier);

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
