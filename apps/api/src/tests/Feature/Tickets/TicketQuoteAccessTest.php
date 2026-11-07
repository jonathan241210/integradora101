<?php

namespace Tests\Feature\Tickets;

use Illuminate\Support\Facades\Auth;

class TicketQuoteAccessTest extends TicketFeatureTestCase
{
    public function test_ca47_ticket_sales_quote_requires_tickets_create(): void
    {
        $cashier = $this->createAccount('cashier', false);
        $this->setPrices($cashier);
        $payload = ['adult_quantity' => 1, 'child_quantity' => 0];

        $this->actAs($cashier)->postJson('/api/v1/admin/tickets/quote', $payload)->assertStatus(200);

        foreach (['admin', 'zoo-admin', 'executive', 'veterinarian'] as $role) {
            $response = $this->actAs($this->createAccount($role))->postJson('/api/v1/admin/tickets/quote', $payload)->assertForbidden();
            $response->assertJsonMissingPath('data');
            $response->assertJsonMissingPath('total_amount');
            $this->assertStringNotContainsString('total_amount', $response->getContent());
        }

        Auth::forgetGuards();
        $this->app['auth']->shouldUse('web');
        $response = $this->postJson('/api/v1/admin/tickets/quote', $payload)->assertUnauthorized();
        $response->assertJsonMissingPath('data');
        $this->assertStringNotContainsString('total_amount', $response->getContent());
    }

    public function test_ca47_ticket_sales_quote_403_does_not_consume_quota(): void
    {
        $admin = $this->createAccount('admin');
        for ($i = 0; $i < 125; $i++) {
            $this->actAs($admin)->postJson('/api/v1/admin/tickets/quote', ['adult_quantity' => 1, 'child_quantity' => 0])->assertForbidden();
        }
    }

    public function test_ca47_ticket_sales_quote_limit_of_120_per_minute(): void
    {
        $cashier = $this->createAccount('cashier', false);
        $this->setPrices($cashier);
        $payload = ['adult_quantity' => 1, 'child_quantity' => 0];
        // Reloj congelado: con una base lenta las 120 peticiones podrían rebasar la ventana de un minuto.
        $this->freezeTime();

        for ($i = 0; $i < 120; $i++) {
            $this->actAs($cashier)->postJson('/api/v1/admin/tickets/quote', $payload)->assertStatus(200);
        }
        $response = $this->actAs($cashier)->postJson('/api/v1/admin/tickets/quote', $payload)->assertStatus(429);
        $this->assertMatchesRegularExpression('/^Demasiados intentos\. Intenta de nuevo en \d+ segundos\.$/', $response->json('message'));

        // La cuota es por usuario y no depende de la de la venta.
        $another = $this->createAccount('cashier', false);
        $this->actAs($another)->postJson('/api/v1/admin/tickets/quote', $payload)->assertStatus(200);

        $this->travel(61)->seconds();
        $this->actAs($cashier)->postJson('/api/v1/admin/tickets/quote', $payload)->assertStatus(200);
    }

    public function test_ca47_ticket_sales_exhausting_quotes_does_not_limit_sales_for_same_cashier(): void
    {
        $cashier = $this->createAccount('cashier', false);
        $this->setPrices($cashier);
        $payload = ['adult_quantity' => 1, 'child_quantity' => 0];
        // Reloj congelado: con una base lenta las 120 peticiones podrían rebasar la ventana de un minuto.
        $this->freezeTime();

        for ($i = 0; $i < 120; $i++) {
            $this->actAs($cashier)->postJson('/api/v1/admin/tickets/quote', $payload)->assertStatus(200);
        }
        $this->actAs($cashier)->postJson('/api/v1/admin/tickets/quote', $payload)->assertStatus(429);

        // RN-33: la cuota de cotización es independiente de la de venta.
        $this->actAs($cashier)->postJson('/api/v1/admin/tickets', $payload)->assertCreated();
    }
}
