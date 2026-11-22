<?php

namespace Tests\Unit;

use App\Enums\CancellationReviewStatus;
use PHPUnit\Framework\TestCase;

class CancellationReviewStatusTest extends TestCase
{
    /** CA-17 cancellation-review-signals */
    public function test_ca17_status_values_and_labels(): void
    {
        $this->assertSame('Revisado: todo en orden', CancellationReviewStatus::ReviewedOk->label());
        $this->assertSame('Requiere aclaración', CancellationReviewStatus::ClarificationRequired->label());
        $this->assertSame(['reviewed_ok', 'clarification_required'], array_column(CancellationReviewStatus::cases(), 'value'));
    }
}
