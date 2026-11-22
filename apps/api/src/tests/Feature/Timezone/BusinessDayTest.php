<?php

namespace Tests\Feature\Timezone;

use Tests\Concerns\BuildsSearchFixtures;
use Tests\Feature\Admin\AdminFeatureTestCase;

class BusinessDayTest extends AdminFeatureTestCase
{
    use BuildsSearchFixtures;

    /** CA-02 single-business-timezone */
    public function test_ca02_global_search_shows_business_date(): void
    {
        $cashier = $this->createAccount('cashier');
        $id = $this->makeTicket('completed', '2032-07-10 03:30:00'); // 9 jul 21:30 local

        $items = $this->groupsBySection($this->search($cashier, (string) $id))['ticket-history']['items'] ?? [];
        $row = collect($items)->firstWhere('id', $id);
        $this->assertNotNull($row);
        $this->assertStringContainsString('Comprado el 09/07/2032', $row['subtitle']);

        config(['arca.timezone' => 'UTC']);
        $items = $this->groupsBySection($this->search($cashier, (string) $id))['ticket-history']['items'] ?? [];
        $this->assertStringContainsString('Comprado el 10/07/2032', collect($items)->firstWhere('id', $id)['subtitle']);
    }
}
