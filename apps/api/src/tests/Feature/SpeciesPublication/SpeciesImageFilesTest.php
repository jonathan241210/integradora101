<?php

namespace Tests\Feature\SpeciesPublication;

use App\Actions\Admin\SpeciesPublication\AcceptSpeciesPublicationRequestAction;
use App\Actions\Media\ResolveMediaDiskAction;
use App\Actions\SpeciesPublication\Audit\LogSpeciesPublicationAction;
use App\Actions\SpeciesPublication\Media\DeleteManagedSpeciesImageAction;
use App\Enums\SpeciesRequestStatus;
use Illuminate\Filesystem\FilesystemAdapter;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use RuntimeException;

class SpeciesImageFilesTest extends SpeciesPublicationTestCase
{
    /** CA-39 */
    public function test_ca39_files_removed_only_after_commit(): void
    {
        $admin = $this->zooAdmin();
        $vet = $this->veterinarian();

        // 1. A failing transaction keeps both originals and removes only the new copy.
        $previous = $this->putMedia('species');
        $pending = $this->putMedia('species-requests');
        $species = $this->makeUnpublishedSpecies(['image_path' => $previous]);
        $request = $this->makeRequest($species, $vet, SpeciesRequestStatus::Submitted, ['image_path' => $pending]);

        $this->mock(LogSpeciesPublicationAction::class, function ($mock): void {
            $mock->shouldReceive('execute')->andThrow(new RuntimeException('audit failed'));
        });

        try {
            app(AcceptSpeciesPublicationRequestAction::class)->execute($admin, $request->id, true);
            $this->fail('The action should rethrow the failure.');
        } catch (RuntimeException $e) {
            $this->assertSame('audit failed', $e->getMessage());
        }

        $this->assertEqualsCanonicalizing([$previous, $pending], $this->storedFiles());
        $this->assertSame($previous, $species->fresh()->image_path);
        $this->assertSame(SpeciesRequestStatus::Submitted, $request->fresh()->status);

        // 2. After a successful commit the originals are deleted, and only then.
        $this->app->forgetInstance(LogSpeciesPublicationAction::class);
        $this->app->offsetUnset(LogSpeciesPublicationAction::class);
        $baseline = DB::transactionLevel();
        $observed = [];
        $real = new DeleteManagedSpeciesImageAction(new ResolveMediaDiskAction);

        $this->app->instance(DeleteManagedSpeciesImageAction::class, new class($real, $request->id, $baseline, $observed) extends DeleteManagedSpeciesImageAction
        {
            public function __construct(private $real, private int $requestId, private int $baseline, private array &$observed) {}

            public function execute(?string $path): bool
            {
                $this->observed[] = [
                    'level' => DB::transactionLevel(),
                    'status' => DB::table('species_publication_requests')->where('id', $this->requestId)->value('status'),
                    'path' => $path,
                ];

                return $this->real->execute($path);
            }
        });

        $this->actAs($admin)->postJson(self::ADMIN_REQUESTS.'/'.$request->id.'/accept')->assertOk();

        $this->assertCount(2, $observed);
        foreach ($observed as $call) {
            $this->assertSame($baseline, $call['level'], 'Deletion ran inside the transaction.');
            $this->assertSame('accepted', $call['status']);
        }
        $this->assertEqualsCanonicalizing([$pending, $previous], array_column($observed, 'path'));
        Storage::disk('media')->assertMissing($previous);
        Storage::disk('media')->assertMissing($pending);
        $this->assertCount(1, $this->storedFiles());
        $this->assertSame($this->storedFiles()[0], $species->fresh()->image_path);
    }

    /** CA-39 */
    public function test_ca39_deletion_failure_after_commit_still_returns_200_with_warning(): void
    {
        $admin = $this->zooAdmin();
        $pending = $this->putMedia('species-requests');
        $request = $this->makeRequest($this->makeSpecies(), $this->veterinarian(), SpeciesRequestStatus::Submitted, ['image_path' => $pending]);

        $disk = \Mockery::mock(FilesystemAdapter::class);
        $disk->shouldReceive('exists')->andReturn(true);
        $disk->shouldReceive('delete')->andThrow(new RuntimeException('disk down'));
        Storage::set('media', $disk);
        Log::spy();

        $this->actAs($admin)->postJson(self::ADMIN_REQUESTS.'/'.$request->id.'/reject', ['rejection_reason' => 'Foto borrosa'])
            ->assertOk()->assertJsonPath('status', 'rejected');

        Log::shouldHaveReceived('warning')->once();
        $this->assertSame(SpeciesRequestStatus::Rejected, $request->fresh()->status);
    }
}
