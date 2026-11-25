<?php

namespace Tests\Feature\SpeciesPublication;

use App\Enums\SpeciesRequestStatus;
use Illuminate\Support\Facades\Storage;

class AdminSpeciesRequestModel3dTest extends SpeciesPublicationTestCase
{
    /** CA-01 CA-02 */
    public function test_ca01_detail_includes_detected_model_3d_by_normalized_name(): void
    {
        config(['filesystems.media_scopes.public' => 'media']);
        Storage::fake('media', ['url' => 'http://localhost/media']);
        Storage::disk('media')->put('models/leon-africano.glb', 'glb');

        $admin = $this->zooAdmin();
        $vet = $this->veterinarian();
        $species = $this->makeSpecies(['common_name' => 'León Africano']);
        $request = $this->makeRequest($species, $vet, SpeciesRequestStatus::Submitted);

        $this->actAs($admin)
            ->getJson(self::ADMIN_REQUESTS.'/'.$request->id)
            ->assertOk()
            ->assertJsonPath('model_3d.status', 'detected')
            ->assertJsonPath('model_3d.detected_model_3d_path', 'models/leon-africano.glb');
    }

    /** CA-02 CA-03 */
    public function test_ca02_existing_valid_model_has_priority(): void
    {
        config(['filesystems.media_scopes.public' => 'media']);
        Storage::fake('media', ['url' => 'http://localhost/media']);
        Storage::disk('media')->put('models/custom.glb', 'glb');
        Storage::disk('media')->put('models/tortuga.glb', 'glb');

        $admin = $this->zooAdmin();
        $vet = $this->veterinarian();
        $species = $this->makeSpecies(['common_name' => 'Tortuga', 'model_3d_path' => 'models/custom.glb']);
        $request = $this->makeRequest($species, $vet, SpeciesRequestStatus::Submitted);

        $this->actAs($admin)
            ->getJson(self::ADMIN_REQUESTS.'/'.$request->id)
            ->assertOk()
            ->assertJsonPath('model_3d.status', 'assigned')
            ->assertJsonPath('model_3d.detected_model_3d_path', 'models/custom.glb');
    }

    /** CA-03 CA-05 */
    public function test_ca03_missing_model_does_not_block_accept(): void
    {
        config(['filesystems.media_scopes.public' => 'media']);
        Storage::fake('media', ['url' => 'http://localhost/media']);

        $admin = $this->zooAdmin();
        $vet = $this->veterinarian();
        $species = $this->makeSpecies(['common_name' => 'Rana', 'is_published' => 0]);
        $request = $this->makeRequest($species, $vet, SpeciesRequestStatus::Submitted);

        $this->actAs($admin)
            ->getJson(self::ADMIN_REQUESTS.'/'.$request->id)
            ->assertOk()
            ->assertJsonPath('model_3d.status', 'missing');

        $this->actAs($admin)
            ->postJson(self::ADMIN_REQUESTS.'/'.$request->id.'/accept', ['publish' => true])
            ->assertOk();

        $species->refresh();
        $this->assertNull($species->model_3d_path);
    }

    /** CA-04 */
    public function test_ca04_detected_model_is_auto_assigned_on_accept(): void
    {
        config(['filesystems.media_scopes.public' => 'media']);
        Storage::fake('media', ['url' => 'http://localhost/media']);
        Storage::disk('media')->put('models/oso.glb', 'glb');

        $admin = $this->zooAdmin();
        $vet = $this->veterinarian();
        $species = $this->makeSpecies(['common_name' => 'Oso', 'is_published' => 0, 'model_3d_path' => null]);
        $request = $this->makeRequest($species, $vet, SpeciesRequestStatus::Submitted);

        $this->actAs($admin)
            ->getJson(self::ADMIN_REQUESTS.'/'.$request->id)
            ->assertOk()
            ->assertJsonPath('model_3d.status', 'detected');

        $this->actAs($admin)
            ->postJson(self::ADMIN_REQUESTS.'/'.$request->id.'/accept', ['publish' => true])
            ->assertOk();

        $species->refresh();
        $this->assertSame('models/oso.glb', $species->model_3d_path);
    }
}
