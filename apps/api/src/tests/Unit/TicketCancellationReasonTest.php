<?php

namespace Tests\Unit;

use App\Enums\TicketCancellationReason;
use PHPUnit\Framework\TestCase;

class TicketCancellationReasonTest extends TestCase
{
    /** CA-10 ticket-cancellation-report (RN-02) */
    public function test_ca10_five_cases_with_exact_labels_and_only_other_requires_comment(): void
    {
        $labels = [];
        foreach (TicketCancellationReason::cases() as $case) {
            $labels[$case->value] = $case->label();
            $this->assertSame($case === TicketCancellationReason::Other, $case->commentRequired());
        }

        $this->assertSame([
            'capture_error' => 'Error de captura',
            'duplicate_charge' => 'Cobro duplicado',
            'wrong_ticket_type' => 'Tipo de boleto equivocado',
            'visitor_withdrew' => 'El visitante desistió',
            'other' => 'Otro',
        ], $labels);
        $this->assertSame('Sin clasificar (anterior)', TicketCancellationReason::labelFor(null));
    }
}
