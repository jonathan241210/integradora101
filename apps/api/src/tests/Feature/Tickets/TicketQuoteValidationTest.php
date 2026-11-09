<?php

namespace Tests\Feature\Tickets;

use Illuminate\Support\Facades\DB;

class TicketQuoteValidationTest extends TicketFeatureTestCase
{
    private const MAX_MESSAGE = 'No puedes vender más de 50 boletos en una misma venta.';

    public function test_ca48_ticket_sales_quote_422_uses_same_messages(): void
    {
        $cashier = $this->createAccount('cashier', false);
        $this->setPrices($cashier);

        $cases = [
            [['adult_quantity' => -1, 'child_quantity' => 1], 'adult_quantity'],
            [['adult_quantity' => 1.5, 'child_quantity' => 1], 'adult_quantity'],
            [['adult_quantity' => 'dos', 'child_quantity' => 1], 'adult_quantity'],
            [['adult_quantity' => true, 'child_quantity' => 1], 'adult_quantity'],
            [['child_quantity' => 1], 'adult_quantity'],
            [['adult_quantity' => 1], 'child_quantity'],
            [['adult_quantity' => 0, 'child_quantity' => 0], 'adult_quantity'],
        ];

        foreach ($cases as [$payload, $field]) {
            $quote = $this->actAs($cashier)->postJson('/api/v1/admin/tickets/quote', $payload)
                ->assertStatus(422)->assertJsonValidationErrors([$field], 'errors')->json();
            $sale = $this->actAs($cashier)->postJson('/api/v1/admin/tickets', $payload)->assertStatus(422)->json();
            $this->assertSame($sale['message'], $quote['message']);
            $this->assertSame($sale['errors'], $quote['errors']);
        }

        $this->actAs($cashier)->postJson('/api/v1/admin/tickets/quote', ['adult_quantity' => 51, 'child_quantity' => 0])
            ->assertStatus(422)->assertJsonPath('errors.adult_quantity.0', self::MAX_MESSAGE);
        $this->actAs($cashier)->postJson('/api/v1/admin/tickets/quote', ['adult_quantity' => 30, 'child_quantity' => 21])
            ->assertStatus(422)->assertJsonPath('errors.adult_quantity.0', self::MAX_MESSAGE);
        $this->actAs($cashier)->postJson('/api/v1/admin/tickets/quote', ['adult_quantity' => 0, 'child_quantity' => 51])
            ->assertStatus(422)->assertJsonPath('errors.adult_quantity.0', self::MAX_MESSAGE);

        // Mismo mensaje que la venta (CA-48) y 50 en total sí se cotiza.
        $sale = $this->actAs($cashier)->postJson('/api/v1/admin/tickets', ['adult_quantity' => 30, 'child_quantity' => 21])->assertStatus(422)->json();
        $this->assertSame($sale['errors']['adult_quantity'], [self::MAX_MESSAGE]);
        $this->actAs($cashier)->postJson('/api/v1/admin/tickets/quote', ['adult_quantity' => 30, 'child_quantity' => 20])->assertStatus(200);
    }

    public function test_ca48_ticket_sales_quote_422_without_current_price(): void
    {
        $cashier = $this->createAccount('cashier', false);
        $this->setPrices($cashier, '25.00', '16.00', '2999-01-01 00:00:00');
        $payload = ['adult_quantity' => 1, 'child_quantity' => 1];

        $this->actAs($cashier)->postJson('/api/v1/admin/tickets/quote', $payload)
            ->assertStatus(422)
            ->assertJsonPath('errors.adult_quantity.0', 'No hay un precio vigente configurado para este tipo de boleto.');
    }

    public function test_ca48_ticket_sales_quote_422_over_maximum_amount(): void
    {
        $cashier = $this->createAccount('cashier', false);
        $this->setPrices($cashier, '20000.00', '16.00');

        $this->actAs($cashier)->postJson('/api/v1/admin/tickets/quote', ['adult_quantity' => 50, 'child_quantity' => 0])
            ->assertStatus(422)
            ->assertJsonPath('errors.adult_quantity.0', 'El total de la venta excede el importe máximo permitido.');
    }

    public function test_ca48_ticket_sales_quote_422_with_one_type_without_current_price(): void
    {
        $cashier = $this->createAccount('cashier', false);
        $this->setPrices($cashier);
        DB::table('ticket_prices')->where('ticket_type', 'child')->delete();
        $payload = ['adult_quantity' => 1, 'child_quantity' => 1];

        $sale = $this->actAs($cashier)->postJson('/api/v1/admin/tickets', $payload)->assertStatus(422)->json();
        $quote = $this->actAs($cashier)->postJson('/api/v1/admin/tickets/quote', $payload)
            ->assertStatus(422)->assertJsonValidationErrors(['child_quantity'], 'errors')->json();

        $this->assertArrayNotHasKey('adult_quantity', $quote['errors']);
        $this->assertSame($sale['errors'], $quote['errors']);
        $this->assertSame($sale['message'], $quote['message']);
    }
}
