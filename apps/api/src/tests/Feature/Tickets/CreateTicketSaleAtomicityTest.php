<?php

namespace Tests\Feature\Tickets;

use App\Actions\Admin\Tickets\IssueTicketQrTokenAction;
use App\Actions\Admin\Tickets\RenderTicketQrSvgAction;

class CreateTicketSaleAtomicityTest extends TicketFeatureTestCase
{
    public function test_ca07_ticket_sales_leaves_no_ticket_or_audit_when_svg_generation_fails(): void
    {
        $cashier = $this->createAccount('cashier', false);
        $this->setPrices($cashier);
        $tickets = $this->ticketCount();
        $logs = $this->activityCount('ticket-sold');

        $this->app->bind(RenderTicketQrSvgAction::class, fn () => new class extends RenderTicketQrSvgAction
        {
            public function execute(string $token): string
            {
                throw new \RuntimeException('fallo simulado del SVG');
            }
        });

        $this->actAs($cashier)->postJson('/api/v1/admin/tickets', ['adult_quantity' => 1, 'child_quantity' => 1])
            ->assertStatus(500);

        $this->assertSame($tickets, $this->ticketCount());
        $this->assertSame($logs, $this->activityCount('ticket-sold'));
    }

    public function test_ca52_ticket_sales_failure_on_third_of_four_rows_leaves_no_rows_or_events(): void
    {
        $cashier = $this->createAccount('cashier', false);
        $this->setPrices($cashier);
        $tickets = $this->ticketCount();
        $logs = $this->activityCount('ticket-sold');

        $this->app->bind(IssueTicketQrTokenAction::class, fn () => new class extends IssueTicketQrTokenAction
        {
            private int $calls = 0;

            public function execute(): string
            {
                if (++$this->calls === 3) {
                    throw new \RuntimeException('fallo simulado en la fila 3');
                }

                return parent::execute();
            }
        });

        $this->actAs($cashier)->postJson('/api/v1/admin/tickets', ['adult_quantity' => 1, 'child_quantity' => 3])
            ->assertStatus(500);

        $this->assertSame($tickets, $this->ticketCount());
        $this->assertSame($logs, $this->activityCount('ticket-sold'));
    }

    public function test_ca07_ticket_sales_leaves_no_ticket_or_audit_when_token_issue_fails(): void
    {
        $cashier = $this->createAccount('cashier', false);
        $this->setPrices($cashier);
        $tickets = $this->ticketCount();
        $logs = $this->activityCount('ticket-sold');

        $this->app->bind(IssueTicketQrTokenAction::class, fn () => new class extends IssueTicketQrTokenAction
        {
            public function execute(): string
            {
                throw new \RuntimeException('fallo simulado del token');
            }
        });

        $this->actAs($cashier)->postJson('/api/v1/admin/tickets', ['adult_quantity' => 1, 'child_quantity' => 0])
            ->assertStatus(500);

        $this->assertSame($tickets, $this->ticketCount());
        $this->assertSame($logs, $this->activityCount('ticket-sold'));
    }
}
