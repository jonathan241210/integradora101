<?php

namespace Tests\Unit;

use App\Enums\CancellationReviewLevel;
use PHPUnit\Framework\TestCase;

class CancellationReviewLevelTest extends TestCase
{
    /** CA-11 cancellation-review-signals: 0 Normal, 1 Revisar, 2 o más Atención. */
    public function test_ca11_signal_count_maps_to_level(): void
    {
        $this->assertSame(CancellationReviewLevel::Normal, CancellationReviewLevel::fromSignalCount(0, 2));
        $this->assertSame(CancellationReviewLevel::Review, CancellationReviewLevel::fromSignalCount(1, 2));
        $this->assertSame(CancellationReviewLevel::Attention, CancellationReviewLevel::fromSignalCount(2, 2));
        $this->assertSame(CancellationReviewLevel::Attention, CancellationReviewLevel::fromSignalCount(7, 2));
        $this->assertSame(CancellationReviewLevel::Review, CancellationReviewLevel::fromSignalCount(2, 3));
    }

    /** CA-14 cancellation-review-signals */
    public function test_ca14_labels_and_actions_are_in_spanish(): void
    {
        $this->assertSame(['Normal', 'Revisar', 'Atención'], array_map(fn ($l) => $l->label(), CancellationReviewLevel::cases()));
        foreach (CancellationReviewLevel::cases() as $level) {
            $this->assertStringNotContainsStringIgnoringCase('físic', $level->action());
        }
    }
}
