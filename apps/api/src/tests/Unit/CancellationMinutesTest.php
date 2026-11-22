<?php

namespace Tests\Unit;

use App\Actions\Admin\Reports\PresentCancelledTicketRow;
use Carbon\CarbonImmutable;
use PHPUnit\Framework\TestCase;

class CancellationMinutesTest extends TestCase
{
    /** CA-07 ticket-cancellation-report */
    public function test_ca07_minutes_are_floored_0m59s_is_0_and_2m05s_is_2(): void
    {
        $sale = CarbonImmutable::parse('2033-03-08 16:00:00', 'UTC');

        $this->assertSame(0, PresentCancelledTicketRow::minutesToCancel($sale, $sale->addSeconds(59)));
        $this->assertSame(2, PresentCancelledTicketRow::minutesToCancel($sale, $sale->addSeconds(125)));
    }
}
