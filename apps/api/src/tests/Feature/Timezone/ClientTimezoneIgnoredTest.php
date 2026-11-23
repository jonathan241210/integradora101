<?php

namespace Tests\Feature\Timezone;

use Tests\Feature\Tickets\TicketFeatureTestCase;

class ClientTimezoneIgnoredTest extends TicketFeatureTestCase
{
    /** CA-10 single-business-timezone */
    public function test_ca10_the_client_timezone_parameter_is_ignored(): void
    {
        $admin = $this->createAccount('admin');
        $cashier = $this->createAccount('cashier');
        $this->setPrices($admin);
        $this->travelTo($this->at('2026-11-07 05:45:00'));
        $this->insertSale($cashier, '2026-11-07 05:30:00');

        $urls = [
            '/api/v1/admin/tickets?from=2026-11-06&to=2026-11-06',
            '/api/v1/admin/ticket-prices/current',
            '/api/v1/news',
            '/api/v1/events',
        ];
        foreach ($urls as $url) {
            $actor = str_contains($url, 'ticket-prices') ? $admin : $cashier;
            $glue = str_contains($url, '?') ? '&' : '?';
            $baseline = $this->actAs($actor)->getJson($url)->assertOk()->json();
            foreach (['Asia/Tokyo', 'Mars/Olympus', 'EST', '+05:00'] as $zone) {
                $this->assertSame($baseline, $this->actAs($actor)->getJson($url.$glue.'timezone='.urlencode($zone))->assertOk()->json(), "{$url} con {$zone}");
            }
        }

        // El cuerpo de la cancelación también la ignora (6 nov 23:30 local, intento 6 nov 23:45 local).
        foreach (['Asia/Tokyo', 'Mars/Olympus', 'EST', '+05:00'] as $zone) {
            $id = $this->insertSale($cashier, '2026-11-07 05:30:00');
            $this->actAs($cashier)->postJson("/api/v1/admin/tickets/{$id}/cancel", ['reason_code' => 'capture_error', 'reason' => 'Zona', 'timezone' => $zone])
                ->assertOk()->assertJsonPath('data.status', 'cancelled');
        }
    }
}
