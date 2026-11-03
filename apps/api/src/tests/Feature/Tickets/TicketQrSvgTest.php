<?php

namespace Tests\Feature\Tickets;

use App\Actions\Admin\Tickets\RenderTicketQrSvgAction;
use Illuminate\Support\Facades\DB;

class TicketQrSvgTest extends TicketFeatureTestCase
{
    public function test_ca09_ticket_sales_response_contains_a_valid_svg_made_from_the_token(): void
    {
        $cashier = $this->createAccount('cashier', false);
        $this->setPrices($cashier);

        $data = $this->sell($cashier);

        $this->assertStringContainsString('<svg', $data['qr_svg']);
        $document = new \DOMDocument;
        $this->assertTrue($document->loadXML($data['qr_svg']), 'El SVG debe ser XML bien formado.');
        $this->assertSame('svg', $document->documentElement->nodeName);

        $token = DB::table('tickets')->where('id', $data['folio'])->value('qr_code');
        $this->assertSame($data['qr_svg'], (new RenderTicketQrSvgAction)->execute($token));
    }

    public function test_ca09_ticket_sales_different_tokens_produce_different_svg_and_svg_is_not_persisted(): void
    {
        $action = new RenderTicketQrSvgAction;
        $this->assertNotSame($action->execute('token-uno'), $action->execute('token-dos'));

        $cashier = $this->createAccount('cashier', false);
        $this->setPrices($cashier);
        $data = $this->sell($cashier);

        $row = (array) DB::table('tickets')->where('id', $data['folio'])->first();
        foreach ($row as $column => $value) {
            $this->assertStringNotContainsString('<svg', (string) $value, "La columna {$column} no debe guardar el SVG.");
        }
    }
}
