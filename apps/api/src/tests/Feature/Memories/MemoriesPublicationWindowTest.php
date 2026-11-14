<?php

namespace Tests\Feature\Memories;

use App\Actions\Memories\Review\ComputePublicationWindowAction;
use App\Exceptions\MemoryConfigurationException;
use App\Models\VisitorMemoryReview;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Log;
use Tests\Concerns\CreatesAdministrators;
use Tests\Concerns\CreatesMemoryFixtures;
use Tests\FeatureTestCase;

class MemoriesPublicationWindowTest extends FeatureTestCase
{
    use CreatesAdministrators;
    use CreatesMemoryFixtures;

    protected function tearDown(): void
    {
        Carbon::setTestNow();
        parent::tearDown();
    }

    /** CA-30 */
    public function test_ca30_published_until_is_published_at_plus_configured_days(): void
    {
        Carbon::setTestNow('2026-11-13 12:00:00');

        foreach ([[7, '2026-11-20 12:00:00'], ['3', '2026-11-16 12:00:00']] as [$days, $expected]) {
            config(['memories.publication_days' => $days]);
            $window = app(ComputePublicationWindowAction::class)->execute();

            $this->assertSame('2026-11-13 12:00:00', $window['published_at']->format('Y-m-d H:i:s'));
            $this->assertSame($expected, $window['published_until']->format('Y-m-d H:i:s'));
        }
    }

    /** CA-30 */
    public function test_ca30_changing_config_does_not_change_accepted_memories(): void
    {
        // El plazo se guarda al aceptar (published_until) y no se recalcula al leer.
        Carbon::setTestNow('2026-11-13 12:00:00');
        config(['memories.publication_days' => 7]);
        $window = app(ComputePublicationWindowAction::class)->execute();
        $memory = $this->createMemory([
            'published_at' => $window['published_at'],
            'published_until' => $window['published_until'],
        ], 'accepted');

        config(['memories.publication_days' => 30]);

        $this->assertSame('2026-11-20 12:00:00', $memory->fresh()->published_until->format('Y-m-d H:i:s'));
    }

    /** CA-30 */
    public function test_ca30_invalid_config_returns_500_and_changes_nothing(): void
    {
        // El cálculo lanza el error de configuración y lo registra; la aceptación real responde 500 sin cambiar nada.
        $memory = $this->createMemory();
        Log::spy();

        foreach ([0, -1, 'siete', 1.5, null, '1.5', '-3'] as $invalid) {
            config(['memories.publication_days' => $invalid]);

            try {
                app(ComputePublicationWindowAction::class)->execute();
                $this->fail('Se esperaba MemoryConfigurationException para '.var_export($invalid, true));
            } catch (MemoryConfigurationException) {
                $this->addToAssertionCount(1);
            }
        }

        Log::shouldHaveReceived('error')->times(7);
        $this->assertSame('submitted', $memory->fresh()->status);
    }

    /** CA-30 */
    public function test_ca30_invalid_config_on_real_accept_returns_500_and_changes_nothing(): void
    {
        $user = $this->createMemoryStaff();
        $disk = $this->fakeMemoryDisk();
        $memory = $this->createMemoryWithFile($disk);
        config(['memories.publication_days' => 0]);

        $this->actingAs($user, 'web')->postJson("/api/v1/admin/memories/{$memory->id}/accept")->assertStatus(500);

        $fresh = $memory->fresh();
        $this->assertSame('submitted', $fresh->status);
        $this->assertNull($fresh->published_until);
        $this->assertNull($fresh->published_image_path);
        $this->assertSame(0, VisitorMemoryReview::query()->where('visitor_memory_id', $memory->id)->count());
        $this->assertTrue($disk->exists($memory->image_path));
    }
}
