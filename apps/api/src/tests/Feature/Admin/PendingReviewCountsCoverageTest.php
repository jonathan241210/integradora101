<?php

namespace Tests\Feature\Admin;

use Illuminate\Foundation\Testing\DatabaseTransactions;
use Tests\FeatureTestCase;

class PendingReviewCountsCoverageTest extends PendingReviewTestCase
{
    /** CA-11 pending-review-counts */
    public function test_ca11_every_ca_is_named_and_suite_uses_database_transactions(): void
    {
        $files = glob(__DIR__.'/PendingReview*Test.php');
        $source = implode("\n", array_map('file_get_contents', $files));

        foreach (range(1, 12) as $n) {
            $this->assertMatchesRegularExpression(sprintf('/function test_ca%02d_/', $n), $source, "Falta test para CA-$n");
        }
        // Ningún archivo de la feature migra ni usa el trait de refresco de base (se busca el uso, no su mención).
        $this->assertStringNotContainsString('use Refresh'.'Database', $source);
        $this->assertStringNotContainsString('migrate:'.'fresh', $source);
        $this->assertContains(DatabaseTransactions::class, class_uses_recursive(FeatureTestCase::class));
    }
}
