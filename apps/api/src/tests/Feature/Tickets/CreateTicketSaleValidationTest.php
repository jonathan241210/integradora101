<?php

namespace Tests\Feature\Tickets;

class CreateTicketSaleValidationTest extends TicketFeatureTestCase
{
    public function test_ca03_ticket_sales_rejects_invalid_quantities_without_side_effects(): void
    {
        $cashier = $this->createAccount('cashier', false);
        $this->setPrices($cashier);
        $tickets = $this->ticketCount();
        $logs = $this->activityCount('ticket-sold');

        $cases = [
            'negative adults' => [['adult_quantity' => -1, 'child_quantity' => 1], 'adult_quantity'],
            'negative children' => [['adult_quantity' => 1, 'child_quantity' => -3], 'child_quantity'],
            'fractional' => [['adult_quantity' => 1.5, 'child_quantity' => 1], 'adult_quantity'],
            'text' => [['adult_quantity' => 'dos', 'child_quantity' => 1], 'adult_quantity'],
            'non-integer 2.0' => [['adult_quantity' => 1, 'child_quantity' => 2.0], 'child_quantity'],
            'missing adults' => [['child_quantity' => 1], 'adult_quantity'],
            'missing children' => [['adult_quantity' => 1], 'child_quantity'],
            'both missing' => [[], 'adult_quantity'],
            'both zero' => [['adult_quantity' => 0, 'child_quantity' => 0], 'adult_quantity'],
        ];

        foreach ($cases as $label => [$payload, $field]) {
            $response = $this->actAs($cashier)->postJson('/api/v1/admin/tickets', $payload, [], JSON_PRESERVE_ZERO_FRACTION)
                ->assertStatus(422)
                ->assertJsonValidationErrors([$field], 'errors');
            $this->assertNotSame('', (string) $response->json('message'), $label);
            $this->assertStringNotContainsString('field', (string) $response->json('message'), $label);
            $this->assertDoesNotMatchRegularExpression('/\bThe\b/', (string) $response->json('message'), $label);
        }

        $this->assertSame($tickets, $this->ticketCount());
        $this->assertSame($logs, $this->activityCount('ticket-sold'));
    }

    public function test_ca03_ticket_sales_booleanos_fracciones_y_cadenas_no_numericas(): void
    {
        $cashier = $this->createAccount('cashier', false);
        $this->setPrices($cashier);
        $tickets = $this->ticketCount();
        $logs = $this->activityCount('ticket-sold');

        // JSON_PRESERVE_ZERO_FRACTION envía 2.0 tal cual (json_encode lo reduciría a 2).
        // Solo enteros JSON reales (decisión por defecto de R1): "2" y 2.0 también se rechazan.
        foreach ([true, false, 1.5, 2.0, 'dos', '2', '', [], 1e30] as $bad) {
            foreach (['adult_quantity', 'child_quantity'] as $field) {
                $other = $field === 'adult_quantity' ? 'child_quantity' : 'adult_quantity';
                $response = $this->actAs($cashier)->postJson('/api/v1/admin/tickets', [$field => $bad, $other => 1], [], JSON_PRESERVE_ZERO_FRACTION)
                    ->assertStatus(422)
                    ->assertJsonValidationErrors([$field], 'errors');
                $this->assertDoesNotMatchRegularExpression('/\bThe\b|field/', json_encode($response->json('errors')), var_export($bad, true));
            }
        }

        $this->assertSame($tickets, $this->ticketCount());
        $this->assertSame($logs, $this->activityCount('ticket-sold'));

        // Un entero real sigue admitido.
        $this->actAs($cashier)->postJson('/api/v1/admin/tickets', ['adult_quantity' => 2, 'child_quantity' => 0])->assertCreated();
    }
}
