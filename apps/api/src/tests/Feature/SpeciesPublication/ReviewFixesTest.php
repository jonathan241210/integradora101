<?php

namespace Tests\Feature\SpeciesPublication;

use App\Actions\SpeciesPublication\Media\CopySpeciesImageAction;
use App\Actions\SpeciesPublication\Media\DeleteManagedSpeciesImageAction;
use App\Actions\SpeciesPublication\Media\StoreSpeciesImageAction;
use App\Enums\SpeciesRequestStatus;
use App\Enums\SpeciesRequestType;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

/** Review fixes on api-013/api-014/api-012 (publication_status G-1..G-3, disks, EXIF, page overflow). */
class ReviewFixesTest extends SpeciesPublicationTestCase
{
    /** CA-05, CA-06 (G-1 a G-3) */
    public function test_ca05_ca06_unpublished_species_with_pending_request_reports_unpublished(): void
    {
        $admin = $this->zooAdmin();
        $species = $this->makeUnpublishedSpecies();
        $request = $this->makeRequest($species, $this->veterinarian(), SpeciesRequestStatus::Submitted, ['request_type' => SpeciesRequestType::Update]);

        $rows = $this->actAs($admin)->getJson(self::ADMIN_REQUESTS)->assertOk()->json('data');
        $row = collect($rows)->firstWhere('id', $request->id);
        $this->assertSame('unpublished', $row['publication_status']);

        $this->actAs($admin)->getJson(self::ADMIN_REQUESTS.'/'.$request->id)->assertOk()
            ->assertJsonPath('current.publication_status', 'unpublished');
    }

    /** CA-37 */
    public function test_ca37_published_fields_is_empty_list_for_species_without_sheet(): void
    {
        $admin = $this->zooAdmin();
        $species = $this->makeSpecies();

        $this->actAs($admin)->getJson(self::ADMIN_SPECIES.'/'.$species->id.'/publication')->assertOk()
            ->assertJsonPath('published_fields', []);
    }

    /** ADR 0026 (EXIF stripped), api-013 CA-02 (disk from ResolveMediaDiskAction) */
    public function test_adr0026_ca02_store_species_image_strips_exif_on_resolved_disk(): void
    {
        config(['filesystems.media_scopes.public' => 'media', 'filesystems.media_scopes.private' => 'media']);
        $secret = 'SECRET-GPS-40.0-98.3';
        $base = imagecreatetruecolor(8, 8);
        ob_start();
        imagejpeg($base);
        $jpeg = (string) ob_get_clean();
        $exif = "Exif\0\0MM\0*\0\0\0\x08".$secret;
        $bytes = "\xFF\xD8\xFF\xE1".pack('n', strlen($exif) + 2).$exif.substr($jpeg, 2);

        $path = tempnam(sys_get_temp_dir(), 'arca-sp-');
        file_put_contents($path, $bytes);
        $this->beforeApplicationDestroyed(fn () => @unlink($path));

        $stored = app(StoreSpeciesImageAction::class)->execute(new UploadedFile($path, 'a.jpg', 'image/jpeg', null, true));

        $content = (string) Storage::disk('media')->get($stored);
        $this->assertStringStartsWith('species-requests/', $stored);
        $this->assertStringNotContainsString($secret, $content);
        $this->assertStringNotContainsString('Exif', $content);
    }

    /** api-012 Q4 */
    public function test_q4_huge_page_returns_empty_lists_without_500(): void
    {
        $admin = $this->zooAdmin();
        $huge = '9223372036854775807';

        $this->getJson('/api/v1/memories?page='.$huge)->assertOk()->assertJsonPath('data', [])->assertJsonPath('meta.has_more', false);
        $this->actAs($admin)->getJson('/api/v1/admin/memories?page='.$huge)->assertOk()->assertJsonPath('data', []);
        $this->actAs($admin)->getJson(self::ADMIN_REQUESTS.'?page='.$huge)->assertOk()->assertJsonPath('data', []);
        $this->actAs($admin)->getJson(self::ADMIN_PUBLISHED.'?page='.$huge)->assertOk()->assertJsonPath('data', []);
        $this->actAs($this->veterinarian())->getJson(self::VET_REQUESTS.'?page='.$huge)->assertOk()->assertJsonPath('data', []);
    }

    /** api-013 CA-02: publishing copies from the private disk to the public one when they differ. */
    public function test_ca02_copy_species_image_crosses_disks_when_scopes_differ(): void
    {
        config(['filesystems.media_scopes.public' => 'media', 'filesystems.media_scopes.private' => 'media-private']);
        Storage::fake('media-private');
        $pending = 'species-requests/'.Str::uuid().'.jpg';
        Storage::disk('media-private')->put($pending, 'bin');

        $target = app(CopySpeciesImageAction::class)->execute($pending);

        Storage::disk('media')->assertExists($target);
        Storage::disk('media-private')->assertExists($pending);
        $this->assertTrue(app(DeleteManagedSpeciesImageAction::class)->execute($pending));
        Storage::disk('media-private')->assertMissing($pending);
        Storage::disk('media')->assertExists($target);
    }
}
