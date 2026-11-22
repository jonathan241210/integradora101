<?php

namespace Tests\Feature\Admin;

use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Route;
use Tests\FeatureTestCase;

class StepUpClassificationTest extends FeatureTestCase
{
    /** RN-01 staff-step-up-confirmation */
    public function test_rn01_every_admin_write_declares_a_step_up_mode(): void
    {
        $missing = [];
        $modes = ['none', 'window', 'always', 'staff-account-update', 'enclosure-qr-regenerate'];

        foreach (Route::getRoutes() as $route) {
            $name = (string) $route->getName();

            if (! str_starts_with($name, 'admin.') || $name === 'admin.password-confirmation.store') {
                continue;
            }

            if (array_intersect($route->methods(), ['POST', 'PUT', 'PATCH', 'DELETE']) === []) {
                continue;
            }

            $declared = collect($route->gatherMiddleware())
                ->filter(fn ($m) => is_string($m) && str_starts_with($m, 'step-up:'))
                ->map(fn (string $m) => explode(',', substr($m, 8))[0]);

            if ($declared->count() !== 1 || ! in_array($declared->first(), $modes, true)) {
                $missing[] = $name;
            }
        }

        $this->assertSame([], $missing, 'Escrituras admin sin modo step-up: '.implode(', ', $missing));
    }

    /** CA-32 staff-step-up-confirmation */
    public function test_ca32_every_criterion_has_at_least_one_test(): void
    {
        $sources = collect(File::allFiles(base_path('tests/Feature')))
            ->map(fn ($file) => $file->getContents())
            ->implode("\n");

        // CA-33 queda fuera de alcance por la decisión B-5 (2026-11-20): sin test.
        // Cada test de api-021 lleva el docblock «CA-NN staff-step-up-confirmation» justo antes de su método
        // test_caNN_*; los tests de otras specs no lo cumplen, así que borrar uno de api-021 hace fallar este test.
        $missing = [];
        foreach (range(1, 42) as $n) {
            if ($n === 33) {
                continue;
            }

            $pattern = sprintf('/CA-%1$02d staff-step-up-confirmation(?:(?!\*\/).)*\*\/\s*public function test_ca%1$02d_/s', $n);

            if (! preg_match($pattern, $sources)) {
                $missing[] = sprintf('CA-%02d', $n);
            }
        }

        $this->assertSame([], $missing, 'CA sin test de api-021: '.implode(', ', $missing));
    }

    /** CA-32 staff-step-up-confirmation: la suite corre solo contra arca_pruebas con DatabaseTransactions. */
    public function test_ca32_suite_runs_against_arca_pruebas_with_transactions(): void
    {
        $this->assertSame('arca_pruebas', DB::getDatabaseName());
        $this->assertContains(DatabaseTransactions::class, class_uses_recursive(static::class));
    }
}
