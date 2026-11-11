<?php

namespace Tests\Feature\Tickets;

use App\Actions\Admin\Tickets\IssueTicketQrTokenAction;
use Illuminate\Support\Facades\DB;
use Spatie\Activitylog\Models\Activity;

class TicketQuoteNoSideEffectsTest extends TicketFeatureTestCase
{
    private function snapshot(): array
    {
        return [
            'tickets' => $this->ticketCount(),
            'activity' => Activity::query()->count(),
            'prices' => DB::table('ticket_prices')->orderBy('id')->get()->toArray(),
        ];
    }

    private function neverIssueTokens(): void
    {
        $spy = $this->mock(IssueTicketQrTokenAction::class);
        $spy->shouldNotReceive('execute');
    }

    public function test_ca49_ticket_sales_quote_creates_nothing(): void
    {
        $cashier = $this->createAccount('cashier', false);
        $this->setPrices($cashier);
        $before = $this->snapshot();
        $this->neverIssueTokens();

        $this->actAs($cashier)->postJson('/api/v1/admin/tickets/quote', ['adult_quantity' => 2, 'child_quantity' => 1])->assertStatus(200);
        $this->actAs($cashier)->postJson('/api/v1/admin/tickets/quote', ['adult_quantity' => 0, 'child_quantity' => 0])->assertStatus(422);
        $this->actAs($cashier)->postJson('/api/v1/admin/tickets/quote', ['adult_quantity' => 51, 'child_quantity' => 0])->assertStatus(422);

        $this->assertEquals($before, $this->snapshot());
    }

    public function test_ca49_ticket_sales_quote_422_and_403_create_nothing(): void
    {
        $cashier = $this->createAccount('cashier', false);
        $admin = $this->createAccount('admin');
        $this->neverIssueTokens();

        $this->setPrices($cashier, '25.00', '16.00', '2999-01-01 00:00:00');
        $before = $this->snapshot();
        $this->actAs($cashier)->postJson('/api/v1/admin/tickets/quote', ['adult_quantity' => 1, 'child_quantity' => 1])->assertStatus(422);
        $this->assertEquals($before, $this->snapshot());

        $this->setPrices($cashier, '20000.00', '16.00');
        $before = $this->snapshot();
        $this->actAs($cashier)->postJson('/api/v1/admin/tickets/quote', ['adult_quantity' => 50, 'child_quantity' => 0])->assertStatus(422);
        $this->actAs($admin)->postJson('/api/v1/admin/tickets/quote', ['adult_quantity' => 1, 'child_quantity' => 0])->assertForbidden();
        $this->assertEquals($before, $this->snapshot());
    }
}
