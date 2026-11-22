<?php

namespace Tests\Feature\Timezone;

use Tests\Feature\Tickets\TicketFeatureTestCase;

class ScheduledPriceTimezoneTest extends TicketFeatureTestCase
{
    private function schedule($admin, string $effectiveAt)
    {
        return $this->actAs($admin)->postJson('/api/v1/admin/ticket-prices', [
            'adult_amount' => 30, 'child_amount' => 20, 'password' => self::STEP_UP_PASSWORD,
            'mode' => 'scheduled', 'effective_at' => $effectiveAt,
        ]);
    }

    /** CA-16 single-business-timezone */
    public function test_ca16_effective_at_without_offset_is_read_in_arca_timezone(): void
    {
        $admin = $this->createAccount('admin');
        $this->setPrices($admin);
        $this->travelTo($this->at('2026-11-02 12:00:00'));

        config(['arca.timezone' => 'America/Mexico_City']);
        $this->assertSame('2026-11-07T06:00:00Z', $this->schedule($admin, '2026-11-07T00:00:00')->assertCreated()->json('data.prices.0.effective_at'));

        config(['arca.timezone' => 'UTC']);
        $this->assertSame('2026-11-07T00:00:00Z', $this->schedule($admin, '2026-11-07T00:00:00')->assertCreated()->json('data.prices.0.effective_at'));

        // Con desfase explícito se respeta el instante indicado (decisión de coordinación P-03b).
        config(['arca.timezone' => 'America/Mexico_City']);
        $this->assertSame('2026-11-07T00:00:00Z', $this->schedule($admin, '2026-11-07T05:00:00+05:00')->assertCreated()->json('data.prices.0.effective_at'));
    }
}
